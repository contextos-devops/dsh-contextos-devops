// 核心业务：AI Copilot（模型解析、对话、动作提取、目标拆解）。
import path from 'node:path';
import { http, encode } from '../base/http.js';
import { fieldSegments, splitFields } from '../base/field.js';
import { listAvatars } from './avatar.js';

let dshLlm = null;
export function setLlm(v) { dshLlm = v; }
export function getLlm() { return dshLlm; }

export function chatProviders() {
  try { return dshLlm?.listProviders?.() || []; } catch { return []; }
}

const HISTORY_TURNS = 6;
const HISTORY_CHARS = 600;
const MESSAGE_CHARS = 1200;

// Compact the client context down to what an action actually needs: drop
// empties, drop duplicated aliases (scene/background), cap lists, and only
// carry file contents when the turn is about the file.
export function compactContext(context = {}, message = '') {
  const c = context && typeof context === 'object' ? context : {};
  const pick = (v, keys) => {
    if (!v || typeof v !== 'object') return null;
    const out = {};
    for (const k of keys) if (v[k] !== undefined && v[k] !== null && v[k] !== '') out[k] = v[k];
    return Object.keys(out).length ? out : null;
  };
  const out = {};
  const node = c.node ?? c.serve;
  if (node) out.node = node;
  const space = c.space ?? c.pod;
  if (space) out.space = space;
  const app = pick(c.app ?? c.place, ['name', 'title', 'command', 'place', 'space']);
  if (app) out.app = app;
  const avatar = pick(c.avatar, ['uid', 'name', 'city', 'company']);
  if (avatar) out.avatar = avatar;
  const scene = pick(c.scene ?? c.background, ['name', 'theme', 'language', 'timezone', 'location']);
  if (scene) out.scene = scene;
  if (c.mode) out.mode = c.mode;
  if (c.view) out.view = c.view;
  const web = pick(c.web, ['url', 'title']);
  if (web) out.web = web;
  const wantsFile = /文件|代码|这个文件|this file|the file|editor/i.test(String(message || ''));
  const editor = pick(c.editor, wantsFile ? ['path', 'language', 'dirty', 'content'] : ['path', 'language', 'dirty']);
  if (editor) {
    if (typeof editor.content === 'string') editor.content = editor.content.slice(0, 1500);
    out.editor = editor;
  }
  if (Array.isArray(c.functions)) out.functions = c.functions.slice(0, 5)
    .map((f) => pick(f, ['kind', 'uid', 'title', 'status']))
    .filter(Boolean);
  else if (c.functions && typeof c.functions === 'object') {
    const fns = {};
    for (const [k, v] of Object.entries(c.functions).slice(0, 5)) {
      const one = pick(v, ['uid', 'title', 'status']);
      if (one) fns[k] = one;
    }
    if (Object.keys(fns).length) out.functions = fns;
  }
  if (Array.isArray(c.apps)) {
    // 最近应用 = 工具索引 + 存储索引：name/command 是「在哪」，fns 是「能调什么」，
    // place_uid 是「数据挂在哪个实例」。缺了 fns/place_uid 模型只能猜功能名。
    const apps = [];
    const seen = new Set();
    for (const a of c.apps) {
      if (!a || typeof a !== 'object') continue;
      const one = pick(a, ['name', 'title', 'command', 'space', 'place_uid', 'place', 'pri']);
      if (!one || !one.command) continue;
      const key = `${one.space || ''}|${one.command || ''}|${one.place_uid || one.name || ''}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const fns = (Array.isArray(a.fns) ? a.fns : String(a.fns || a.functions || '').split(','))
        .map((x) => String(x || '').trim()).filter(Boolean);
      if (fns.length) one.fns = fns.slice(0, 8).join(',');
      apps.push(one);
      if (apps.length >= 8) break;
    }
    if (apps.length) out.apps = apps;
  }
  if (c.project && typeof c.project === 'object') {
    const project = pick(c.project, ['counts', 'stage', 'next', 'kind', 'action', 'item_uid', 'title']);
    if (project) out.project = project;
  }
  if (Array.isArray(c.nodes)) out.nodes = c.nodes.length;
  const dev = pick(c.dev, ['space', 'zone', 'template', 'compile', 'registerAsTool', 'fallback', 'namePrefix', 'timeout', 'allowNetwork', 'prompt']);
  if (dev) out.dev = dev;
  if (Array.isArray(c.spaces)) out.spaces = c.spaces.length;
  return out;
}

const MODEL_CACHE = new Map();
const MODEL_TTL = 300000;
// Utility calls (extraction, planning) do not need deep reasoning; the profile
// default is "high", which turns a 0.4s extraction into a 5s one.
const UTIL_EFFORT = process.env.CX_UTIL_EFFORT || 'low';
const CHAT_EFFORT = process.env.CX_CHAT_EFFORT || 'low';
const CHAT_MAX_TOKENS = Number(process.env.CX_CHAT_MAX_TOKENS || 900);

let LAST_EFFORT = 'default';
async function* streamWithEffort(options, effort) {
  LAST_EFFORT = effort || 'default';
  if (!effort) { yield* dshLlm.stream(options); return; }
  try {
    yield* dshLlm.stream({ ...options, reasoningEffort: effort });
  } catch (e) {
    // An adapter may reject an unknown effort id: fall back to route default.
    if (!/effort|reasoning/i.test(String(e && e.message))) throw e;
    LAST_EFFORT = 'default(fallback)';
    yield* dshLlm.stream(options);
  }
}
export function lastEffort() { return LAST_EFFORT; }

async function resolveChatModel({ provider, model } = {}) {
  if (!dshLlm) throw new Error('DSH llm service is not mounted');
  const cacheKey = `${provider || ''}|${model || ''}`;
  const hit = MODEL_CACHE.get(cacheKey);
  if (hit && Date.now() - hit.at < MODEL_TTL) return hit.choice;
  const providers = chatProviders();
  const ordered = provider
    ? providers.filter((p) => String(p.id) === String(provider))
    : providers.slice().sort((a, b) => (/deepseek/i.test(String(a.id)) ? -1 : 0) - (/deepseek/i.test(String(b.id)) ? -1 : 0));
  let chosen = null;
  let models = [];
  for (const p of ordered) {
    let list = [];
    try { list = await dshLlm.listModels(p.id); } catch { /* catalog-less adapter */ }
    if (list.length || (provider && String(p.id) === String(provider))) { chosen = p; models = list; break; }
  }
  if (!chosen) {
    chosen = providers.find((p) => /deepseek/i.test(String(p.id))) || providers[0];
    if (!chosen) throw new Error('DSH has no llm provider mounted');
    try { models = await dshLlm.listModels(chosen.id); } catch { models = []; }
  }
  const modelId = model || models.find((m) => /flash/i.test(String(m.id)))?.id || models[0]?.id || 'deepseek-v4-flash';
  const choice = { provider: chosen.id, model: modelId };
  MODEL_CACHE.set(cacheKey, { choice, at: Date.now() });
  return choice;
}

function extractAction(text) {
  const raw = String(text || '').trim();
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    const parsed = JSON.parse(raw.slice(start, end + 1));
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

// 模型偶尔只回散文不落动作（实测「继续下一步」→「好的，现在开始执行」但 actions=[]）。
// 上下文里已有唯一下一步时，用封闭动词表补一个确定性动作；只兜底，不覆盖模型输出。
const PM_VERB = {
  process: /(开始|启动|推进|执行|开工|动工|继续|下一步|然后呢|接下来|该做什么)/,
  submit: /(提交|上报|申报|报批|送审)/,
  approve: /(批准|审批|通过|同意)/,
  finish: /(完成|结束|收尾|结项|关闭|归档)/,
};
const PM_QUESTION = /[?？]\s*$|^(为什么|怎么|如何|能否|是否|什么|哪些|多少|谁|何时)/;

export function inferAction({ message = '', context = {}, mode = 'avatar' } = {}) {
  if (mode !== 'avatar') return null;
  const p = context.project || {};
  // 新建类下一步要出表单，交给客户端 pmCreate；这里只补生命周期动作。
  if (!p.kind || !p.action || !p.item_uid || p.kind === 'target' || p.action === 'create') return null;
  const text = String(message || '').trim();
  if (!text || PM_QUESTION.test(text)) return null;
  const verb = PM_VERB[p.action];
  if (!verb || !verb.test(text)) return null;
  return { op: 'pmAct', args: { kind: p.kind, uid: String(p.item_uid), action: p.action, title: String(p.title || '') } };
}

const MODE_ACTIONS = {
  avatar: ['createInstance', 'createStoreInstance', 'createApp', 'autogenApp', 'readData', 'writeData', 'listApps', 'storeApps', 'projectStatus', 'pmList', 'pmCreate', 'pmModify', 'pmRemove', 'pmAct', 'planProject', 'createAvatar', 'openApp'],
  factory: ['deploy', 'start', 'stop', 'delete', 'createSpace', 'officialSpaces', 'initSpace', 'spaceStart', 'spaceStop', 'spaceBuild', 'autogenApp', 'createApp', 'generateAppCode', 'code', 'buildSpace', 'compile', 'dockerDeploy', 'remoteDeploy', 'remoteLogin', 'createInstance', 'createStoreInstance', 'listApps', 'storeApps'],
  iot: ['devices', 'sshHosts', 'sysControl', 'updateBackground', 'createBackground', 'openApp', 'openNode', 'listApps', 'projectStatus', 'pmList'],
};

export function buildChatPrompt({ mode = 'factory', context = {}, history = [], message = '' } = {}) {
  const system = [
    'RSI IRON LAW (highest priority; applies to every reply):',
    'GOAL → PLAN(time/cost/risk) → ANALYZE/DECIDE → TASKS → EXECUTE → REPORT(what/how/result) → FEEDBACK(lesson/gate).',
    'No goal, no action. No report, not done. No feedback, not closed.',
    'Prefer existing code/specs/flows; abstract duplicates; sediment lessons into code/docs/memory; never repeat a known error.',
    'For non-trivial work reply with 目标/计划/分析与决策/任务/执行/报告/反馈. Simple Q&A may stay concise but must not invent results.',
    'If goal or acceptance criteria is missing, ask before changing code. After changes verify API read-back and rendered UI; add a gate for every recurring bug.',
    'CONTEXTOS DOCTRINE (三纲五常): three guides are cluster deployment (all devices connected), modular development (all code generated), automated applications (all data flowing); five constants are code, docs, conversation, team, market.',
    'Every finished round leaves four artifacts: runnable code, updated docs, a strengthened gate, and a written rule. Prefer abstraction so the next similar feature needs less code.',
    'You are ContextOS DevOps Copilot inside DeepSeek Harness.',
    'Turn the user request into exactly one JSON object, no markdown:',
    '{"reply":"short Chinese answer","action":null} or {"reply":"..","action":{"op":"..","args":{..}}} or {"reply":"..","actions":[{..},{..}]}.',
    'ACTION OPS (closed set): deploy|createSpace|officialSpaces|initSpace|autogenApp|createApp|generateAppCode|createInstance|storeApps|createStoreInstance|createAvatar|projectStatus|planProject|pmList|pmCreate|pmModify|pmRemove|pmAct|buildSpace|openApp|openNode|code|listApps|devices|data.',
    'Rules: only use ops valid in the current mode; ask for a missing node/space/name instead of inventing one.',
    ...(mode === 'factory' ? [
      '- factory args: deploy{port}; createSpace{name}; initSpace{space}; officialSpaces{keys:[standard key|Chinese name]}; autogenApp{name,help,place,value,trans}; createInstance{space,command,place,name,city,company}; buildSpace{space}; createApp/generateAppCode{name,zone?,help?}; openApp{space,name}; openNode{port}; code{name}; listApps{}.',
    ] : []),
    ...(mode === 'avatar' ? [
      '- avatar data args: {space,command,text}; command=<app.command minus .portal>.<fn>, space from that app, text=user words. All three are required; fill them from context.apps, ask only if no app matches.',
    ] : []),
    '- Six capabilities, in order: deploy node, create workspace, generate app template, edit app code, create app instance, add app data.',
    '- NEVER answer a data-write request with prose only: always attach the data action with its three args. If you cannot fill them, still return the action and say what is missing in reply.',
    ...(mode === 'factory' ? [
      '- FACTORY CODE RULES (must follow ContextOS SPEC-CODE.md and USER-CODE.md):',
      '  * Go commands live under the app module src/<module>/; use icebergs ice.*, mdb/nfs/aaa helpers. Never write raw SQL, never open var/db/*.db directly.',
      '  * Frontend uses Volcanos can.page/can.onimport and $output-scoped CSS. Never use document.createElement/innerHTML or unscoped global CSS.',
      '  * API methods: create/insert=PUT, remove/delete=DELETE, other actions=POST; GET /action/ is only for login/run/command.',
      '  * Parse ContextOS envelopes via option/append/key,value; 200 + count:0x0 is not success; always read back.',
      '  * Entity ids are 32-char hashes; use target_uid/plan_uid/task_uid/report_uid/feedback_uid naming.',
      '  * autogenApp value is a comma-separated ASCII Go identifier list (profile,position,...); Chinese display labels belong only in trans.',
      '  * After Go/JS/CSS changes: compile via vimer/action/compile, inspect warn/catch/error, verify bin/ice.bin mtime, then read back.',
      '  * Generated UI must use the project design tokens/UI kit (USER-VIEW.md); no ad-hoc duplicate card/table/empty markup.',
      '  * Never commit secrets or hard-code /Users/<name>; derive paths from CTX_ROOT.',
      '  * Project ops: pmCreate/pmAct only; never write web.team.xiangmuguanli.* via writeData. Host fills parent uid.',
    ] : []),
    `MODE: ${mode}.`,
    'MODE BEHAVIOUR:',
    '- avatar（数字分身）: only create app instances and add data; never deploy nodes, create project spaces or generate app code.',
    '- avatar「创建/生成 <X> 应用」= storeApps to find the closest service template, then createStoreInstance (name=X, city/company/uid from context.avatar). This is allowed: do not refuse, do not say "switch to factory mode", never createApp.',
    '- avatar「给 <X> 添加/录入 <Y>」= pick X from context.apps by name, then pick fn by verb: 定义/创建流程→flow; 发起/提交/送审/报批→request; 申请→apply; 审批/通过→allow; 通知→notice; 事件→event; 成员→member; 设置→setting. flow creates a process definition, request starts one; never mix. Return data {space,command,text}.',
    '- factory（软件工厂）: deploy nodes, create spaces, generate templates/code, compile, instantiate. No data op and no recent apps: 「创建空间」=createSpace, 「生成应用」=createApp/autogenApp.',
    '- iot（赛博世界）: only scan/connect/control devices; no spaces, no code, no data.',
    `ALLOWED ACTIONS IN ${String(mode).toUpperCase()} MODE: ${(MODE_ACTIONS[mode] || []).join(', ')}.`,
    '- Refuse any action outside the allowlist with one short Chinese sentence; do not invent extra capabilities.',
    ...(mode === 'avatar' ? [
      '- storeApps args: {}; createStoreInstance args: {name?,city?,company?,command?}; createAvatar args: {name,city,company,persona,preferences,style}; projectStatus args: {}; planProject args: {goal}; pmList args: {};',
      '  pmCreate args: {kind,target_uid?,plan_uid?,task_uid?,report_uid?,title?,content?,begin_time?,end_time?,report_type?,score?,feedback_status?}; pmAct args: {kind,item_uid,action}; pmModify args: {kind,item_uid,title?,content?,begin_time?,end_time?,report_type?,score?,feedback_status?}; pmRemove args: {kind,item_uid}; devices args: {}.',
    ] : []),
    'APP ROUTING (3 levels, strict order; context.apps = tool index + storage index):',
    '- L1 RECENT APPS (always first): each item {name,title,command,space,place_uid,place,fns,pri}. Pick app → fn → op (pm* for the project app, data for other apps). args: space=app.space, command=<app.command minus .portal>.<fn>. If context.apps has a match, never ask which app/function.',
    '- L2 APP STORE (only when L1 has no app or fn for the need): storeApps {} → pick the template whose title/command/help matches the need → createStoreInstance {command,name?,city?,company?}. NEVER pick a template just because it is listed first; no match → L3.',
    '- L3 SOFTWARE FACTORY (only when L2 has no matching template): createApp/autogenApp in the selected space, then createInstance. The host runs the same ladder in avatar mode.',
    '- State the level when you escalate (最近应用没有 → 已到应用商店 / 软件工厂); never pretend an app exists, never invent an app/fn outside context.apps.',
    '- 创建 X 应用: L1 match → createInstance; else L2 createStoreInstance; else L3 createApp.',
    '- The project app has pri:1 and is always first: app=xiangmuguanli, fns=target,plan,task,report,feedback.',
    'PROJECT LOOP (highest priority; state in context.project):',
    '- Chain: target → plan(created→submit→approve→process) → task(created→process) → report → feedback(canFinish|shouldImprove).',
    '- canFinish ⇒ task finish is allowed; shouldImprove ⇒ create an improvement task. plan finish needs no running task.',
    '- context.project = {counts:[t,p,k,r,f], stage, next, kind, action, item_uid, title} is the live next step.',
    '- When the user says 继续/下一步/该做什么/然后呢, execute that next step (pmCreate/pmAct with kind+action, item_uid=next.item_uid); do not ask what to do.',
    '- After a plan is finished propose a new plan; with no target propose a new target. Use only pmCreate/pmModify/pmRemove/pmAct for project data; never data.',
    '- For MULTIPLE items (多个/三个…), return one actions array with one pmCreate per item; parent uids stay empty, the host fills them from the previous step.',
    '- LIFECYCLE: plan created→submit→approve→process; task created→process; task finish needs a report whose feedback is canFinish; plan finish/cancel needs no running task.',
    '- 查看/列表/统计 → pmList; 新增 → pmCreate; 修改 → pmModify; 删除 → pmRemove.',
    '- CURRENT SELECTION is authoritative: context.node/space/app/avatar are the active node/workspace/app instance; use them directly, do not ask again.',
    '- context.functions {target,plan,task,report,feedback} are the selected project entities; use uid/title/status as defaults for pmCreate/pmAct and never ask for a uid that is present.',
    '- context.avatar: uid/city/company/persona/preferences/style — always pass uid/city/company when creating an instance.',
    '- context.scene: theme/language/timezone/location (user environment). context.web: current page url/title. context.editor: open file path/language/dirty/content (content only when the turn mentions a file/code).',
    '- Aliases: 节点/serve→node; 空间/pod→space; 应用实例/place→app; 赛博世界→scene; 视图→view; 网页→web; 文件/代码→editor.',
    '- When the user gives a goal for daily work, call planProject {goal}; ask only for missing goal details.',
    ...(mode === 'iot' ? [
      '- sshHosts args: {}; lists ~/.ssh/host/*.json services (name, username, host, port, init — the user\'s SSH services), ~/.ssh/known_hosts hosts, ~/.ssh/config entries and shell history ssh commands. Prefer sshHosts.services for questions about their services.',
      '- sysControl args: {action, value}. actions: volume (0-100, empty=read), mute (on/off), clipboard (empty=read, text=write), screenshot, open (http(s)/absolute path), wifi (on/off/empty=status), sleep, lock, wallpaper (absolute path), shortcut (name), shortcuts (list), info (battery/disk/displays). Only in iot mode; ask before sleep/lock.',
    ] : []),
    '- createSpace name regex [a-zA-Z][a-zA-Z0-9_]*; autogen name/place same regex.',
    ...(mode === 'factory' ? [
      '- Standard spaces: community=云社区, enterprise=云办公, operation=云研发, knowledge=云知识, education=云教育, healthy=云健康, tourism=云文旅, charity=云公益, industry=云工业, agriculture=云农业.',
      '- If the user asks to create/deploy any standard space by Chinese name, use officialSpaces {keys:[...]}; multiple names at once. Do not use createSpace for these ten.',
    ] : []),
    '- Do not claim success; the host executes the action and reports the real result.',
    '- reply must be concise Chinese, 1-3 sentences. Translate every label, status, field name and entity type into Chinese; do not leave English enum values or raw field names in reply.',
  ];
  const systemText = system.join('\n');
  const historyText = (history || []).slice(-HISTORY_TURNS)
    .filter((h) => h && h.text && (h.role === 'user' || h.role === 'ai' || h.role === 'assistant'))
    .map((h) => `${h.role === 'user' ? 'USER' : 'ASSISTANT'}: ${String(h.text).slice(0, HISTORY_CHARS)}`)
    .join('\n');
  const contextText = JSON.stringify(compactContext(context, message));
  const userText = `CONTEXT: ${contextText}\n\nHISTORY:\n${historyText || '(none)'}\n\nUSER: ${String(message).slice(0, MESSAGE_CHARS)}`;
  return { systemText, userText, historyText, contextText };
}

export async function chatWithDSH({ message, history = [], context = {}, provider = '', model = '', mode = 'factory' } = {}) {
  if (!String(message || '').trim()) throw new Error('empty message');
  const choice = await resolveChatModel({ provider, model });
  // Cache-friendly split: the rule block is byte-identical across turns (and
  // across modes it only differs in the mode section), while everything that
  // changes per turn rides in the user message after it. Providers key their
  // prefix cache on the leading bytes, so this is what turns a 3.2k-token
  // re-charge into a cache hit.
  const built = buildChatPrompt({ mode, context, history, message });
  const { systemText, userText } = built;
  const historyText = built.historyText;
  const contextText = built.contextText;
  const prompt = `${systemText}\n\n${userText}`;
  const messages = [
    { role: 'system', content: [{ type: 'text', text: systemText }] },
    { role: 'user', content: [{ type: 'text', text: userText }] },
  ];

  let output = '';
  let failure = '';
  let usage = null;
  const startedAt = Date.now();
  for await (const chunk of streamWithEffort({ provider: choice.provider, model: choice.model, messages, maxTokens: CHAT_MAX_TOKENS }, CHAT_EFFORT)) {
    if (chunk?.type === 'text-delta' && chunk.text) output += chunk.text;
    if (chunk?.type === 'usage' && chunk.usage) usage = chunk.usage;
    if (chunk?.usage) usage = chunk.usage;
    if (chunk?.type === 'finish' && chunk.reason?.kind === 'error') {
      failure = chunk.reason.failure?.message || chunk.reason.failure?.code || 'model call failed';
    }
    if (chunk?.type === 'finish' && chunk.reason?.kind === 'aborted') failure = 'model call aborted';
  }
  if (failure) throw new Error(`DSH model: ${failure}`);
  const elapsedMs = Date.now() - startedAt;
  const parsed = extractAction(output);
  const actions = Array.isArray(parsed?.actions) ? parsed.actions.filter((a) => a && typeof a === 'object') : [];
  let action = parsed?.action && typeof parsed.action === 'object' ? parsed.action : null;
  if (!action && !actions.length) {
    const guessed = inferAction({ message, context, mode });
    if (guessed) { action = guessed; actions.push(guessed); }
  }
  return {
    reply: String(parsed?.reply || output || '已理解，但没有生成可执行动作。').trim(),
    action,
    actions,
    inferred: Boolean(action && !parsed?.action && !(parsed?.actions || []).length),
    provider: choice.provider,
    model: choice.model,
    raw: parsed ? undefined : output.slice(0, 800),
    ms: elapsedMs,
    usage: usage || null,
    promptBytes: Buffer.byteLength(prompt, 'utf8'),
    outputBytes: Buffer.byteLength(output, 'utf8'),
    prompt: {
      systemBytes: Buffer.byteLength(systemText, 'utf8'),
      userBytes: Buffer.byteLength(userText, 'utf8'),
      contextBytes: Buffer.byteLength(contextText, 'utf8'),
      historyBytes: Buffer.byteLength(historyText, 'utf8'),
      cachedTokens: Number(usage?.cacheReadTokens) || 0,
      effort: LAST_EFFORT,
      maxTokens: CHAT_MAX_TOKENS,
    },
  };
}


export async function llmJson({ prompt, provider = '', model = '' } = {}) {
  const choice = await resolveChatModel({ provider, model });
  const messages = [{ role: 'user', content: [{ type: 'text', text: prompt }] }];
  let output = '';
  let failure = '';
  for await (const chunk of streamWithEffort({ provider: choice.provider, model: choice.model, messages, maxTokens: 600 }, UTIL_EFFORT)) {
    if (chunk?.type === 'text-delta' && chunk.text) output += chunk.text;
    if (chunk?.type === 'finish' && chunk.reason?.kind === 'error') failure = chunk.reason.failure?.message || 'model failed';
  }
  if (failure) throw new Error(failure);
  const start = output.indexOf('{');
  const end = output.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('model returned no JSON');
  return JSON.parse(output.slice(start, end + 1));
}


// 生成应用前先调研：按用户需求 + 同类产品（钉钉/飞书/传统 SaaS）的常见做法，
// 定出这个应用的五个核心功能及其依赖关系。返回值直接进确认表单。
export async function appFunctionPlan({ name = '', help = '', text = '' } = {}) {
  const prompt = [
    '你是企业应用架构师。请为一个业务应用设计「五个核心功能」，并给出依赖关系。',
    `应用：${help || name || '未命名应用'}`,
    `用户原话/需求：${String(text || help || name).slice(0, 400)}`,
    '',
    '要求：',
    '1. 恰好五个功能，按业务先后依赖排序（后面的依赖前面的）。',
    '2. 参考同类产品（钉钉、飞书、用友、金蝶、Salesforce 等）在该业务领域的标准模块，但要用中文命名。',
    '3. 每个功能给出：name（小写字母，用于代码标识）、label（中文名）、depends（依赖的功能 name，数组，第一个为空）、why（一句话说明为什么需要它）。',
    '4. 只输出 JSON，不要解释，格式：',
    '{"functions":[{"name":"target","label":"目标","depends":[],"why":"..."}]}',
  ].join('\n');
  const out = await llmJson({ prompt });
  const list = Array.isArray(out?.functions) ? out.functions : [];
  const clean = list.map((f) => ({
    name: String(f?.name || '').toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 24),
    label: String(f?.label || '').trim().slice(0, 12),
    depends: Array.isArray(f?.depends) ? f.depends.map((x) => String(x).toLowerCase()) : [],
    why: String(f?.why || '').slice(0, 80),
  })).filter((f) => /^[a-z][a-z0-9_]*$/.test(f.name) && f.label);
  if (clean.length !== 5) throw new Error(`model returned ${clean.length} functions, expected 5`);
  return { name, help: help || name, functions: clean };
}

// 把「给某个应用写数据」拆成：选应用 → 选功能 → 抽字段值。
// 应用池来自最近应用；功能名必须来自该应用的 functions。
// 代码生成意图：把「工具栏加个驳回键」「当状态=待审时显示通过键」解析成模板 + 变量
export async function codegenPlan({ text = '', module: mod = '', fields = [] } = {}) {
  const t = String(text || '').trim();
  const prompt = [
    'You turn a user request into a ContextOS code plan. Output ONLY JSON:',
    '{"scope":"toolbar|row","action":"Reject","label":"驳回","field":"status","op":"eq|ne|gt|lt|nonempty|empty","value":"created","why":"..."}',
    'Rules:',
    '- scope=toolbar when the button belongs to the toolbar (工具栏/工具条/页面上方).',
    '- scope=row when it depends on a record (当…时/如果…就/某条数据…).',
    '- action is a Go identifier in PascalCase derived from the Chinese label.',
    '- field must be one of the module fields if provided; op defaults to eq; value is the literal compared.',
    `- module: ${mod || '(unknown)'}; fields: ${(fields || []).join(', ') || '(unknown)'}`,
    `Request: ${t}`,
  ].join('\n');
  let out = null;
  try {
    out = await llmJson({ prompt });
  } catch (e) {
    out = null;
  }
  const isToolbar = /(工具栏|工具条|页面上方|顶部|导航栏)/.test(t);
  const scope = out ? (out.scope === 'toolbar' ? 'toolbar' : 'row') : (isToolbar ? 'toolbar' : 'row');
  const label = (out && out.label) || (t.match(/[「"]([^」"]{1,8})[」"]/) || [])[1] || '';
  const action = (out && out.action) || labelToIdent(label || t);
  // 兜底：从「状态=待审」「status 为 approved」「金额大于 100」里抽字段/比较/值
  const hit = t.match(/([a-z_]{2,20})\s*(?:=|==|为|是)\s*([^\s，。;；]{1,20})/i);
  let field = (out && out.field) || (hit ? hit[1] : 'status');
  let value = (out && out.value) || (hit ? hit[2] : '');
  let op = (out && out.op) || 'eq';
  if (!out) {
    if (/(不为空|有值|非空)/.test(t)) { op = 'nonempty'; value = ''; }
    else if (/(为空|没有值)/.test(t)) { op = 'empty'; value = ''; }
    else if (/(不等于|不为|不是)/.test(t)) op = 'ne';
    else if (/(大于|超过|高于)/.test(t)) op = 'gt';
    else if (/(小于|低于|少于)/.test(t)) op = 'lt';
  }
  // 意图分类：加字段 / 加操作（按钮）/ 新建功能
  const wantField = /(字段|一列|列名|column)/i.test(t) && !/(按钮|按键|操作|动作)/.test(t);
  const wantAction = /(操作|动作|按键|按钮|功能)/.test(t);
  if (wantField) {
    const f = (t.match(/[「"]([a-z_]{2,20})[」"]/i) || [])[1] || (t.match(/(?:添加|新增|增加|加)(?:一个|个)?\s*([a-z_]{2,20})\s*(?:字段|列)/i) || [])[1] || '';
    return {
      scope: 'field', template: 'field', action: '', label: '', field: f,
      op: '', value: '', why: '在模块里增加一个字段（系统级改 field，平台级改 fields + model 常量）', source: out ? 'llm' : 'fallback',
    };
  }
  if (!wantAction) {
    return {
      scope: 'action', template: 'action', action, label: label || action, field: '', op: '', value: '',
      params: 'title* content*', why: '给模块加一个动作（声明 + 方法 + 按钮）', source: out ? 'llm' : 'fallback',
    };
  }
  return {
    scope,
    template: scope === 'toolbar' ? 'toolbarButton' : 'rowButton',
    action,
    label: label || action,
    field,
    op,
    value,
    params: 'title* content*',
    why: (out && out.why) || '',
    source: out ? 'llm' : 'fallback',
  };
}

function labelToIdent(s) {
  const map = { 驳回: 'Reject', 通过: 'Approve', 审批: 'Approve', 提交: 'Submit', 完成: 'Finish', 取消: 'Cancel', 删除: 'Remove', 归档: 'Archive', 提醒: 'Notify', 确认: 'Confirm', 退回: 'SendBack', 撤回: 'Withdraw' };
  for (const k of Object.keys(map)) if (String(s).includes(k)) return map[k];
  return 'Custom';
}

export async function resolveWrite({ text = '', apps = [], mode = 'write' } = {}) {
  const list = (Array.isArray(apps) ? apps : []).slice(0, 12).map((a, i) => ({
    i,
    title: a.title || a.name || '',
    space: a.space || '',
    command: a.command || '',
    functions: String(a.functions || '').slice(0, 200),
  }));
  if (!list.length) throw new Error('no recent app');
  const prompt = [
    mode === 'read'
      ? '你是 ContextOS 的应用操作解析器。用户想【查询/查看】某个应用里的数据。'
      : '你是 ContextOS 的应用操作解析器。用户在描述一次【往应用里写数据】的操作。',
    '把应用当成目录、把功能当成目录里的文件：先选应用（目录），再选功能（文件）。',
    `用户原话：${String(text).slice(0, 500)}`,
    '可用的应用实例（functions 是逗号分隔的功能名）：',
    JSON.stringify(list),
    '',
    '任务：',
    '1. 选出最匹配的一个应用，用 i 表示它的下标。',
    '2. 从该应用的 functions 里选出要调用的功能名（如 supplier / flow / request）。',
    mode === 'read'
      ? '3. 不需要抽取字段值，values 输出 {}。'
      : '3. 只抽取原话里明确出现的字段值，抽不到就留空，不要编造。',
    '只输出 JSON：{"i":0,"fn":"supplier","values":{"title":"中艾科技"},"why":"一句话"}',
  ].join('\n');
  const out = await llmJson({ prompt });
  const i = Number(out?.i);
  const app = list.find((x) => x.i === i) || null;
  if (!app) throw new Error('model picked no app');
  const fn = String(out?.fn || '').toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 24);
  const values = {};
  if (out && out.values && typeof out.values === 'object') {
    for (const [k, v] of Object.entries(out.values)) {
      const key = String(k).replace(/[^a-z0-9_]/gi, '');
      if (key && v != null && String(v).trim()) values[key] = String(v).slice(0, 200);
    }
  }
  return { space: app.space, command: app.command, fn, values, mode, title: app.title, why: String(out?.why || '').slice(0, 120) };
}

export async function avatarSession(node, avatar) {
  const r = await http(node, `/c/aaa.sess/action/create/${encode(avatar.username)}`, { method: 'PUT', timeout: 12000 });
  const sid = r.text.trim();
  if (r.status !== 200 || !sid) throw new Error(`avatar session failed: HTTP ${r.status}`);
  return sid;
}

export async function pmCreate({ node, space, command, fields, uid, projectUid, sessid = '' }) {
  const parts = splitFields(fields);
  const seg = fieldSegments(parts.path);
  const q = new URLSearchParams({ project_uid: projectUid, 'user.uid': uid });
  if (sessid) q.set('sessid', sessid);
  for (const [k, v] of Object.entries(parts.query)) q.set(k, v);
  const r = await http(node, `/s/${encode(space)}/c/web.team.xiangmuguanli.portal/action/run/${command}/action/create/${seg}?${q}`, { method: 'PUT', timeout: 20000 });
  try {
    const env = JSON.parse(r.text);
    return env.value_uid?.[0] || env.uid?.[0] || '';
  } catch { return ''; }
}

export async function pmAction({ node, space, command, action, uid = '', fields = {}, projectUid, actorUid, sessid = '', method = '', taskUid = '', reportUid = '', extra = {} }) {
  const verb = method || (/Create$/.test(action) ? 'PUT' : /Remove$/.test(action) ? 'DELETE' : /List$/.test(action) ? 'GET' : 'POST');
  const parts = splitFields(fields || {});
  const seg = fieldSegments(parts.path);
  const q = new URLSearchParams({ project_uid: projectUid, 'user.uid': actorUid });
  for (const [k, v] of Object.entries(parts.query)) q.set(k, v);
  if (sessid) q.set('sessid', sessid);
  if (uid) q.set('uid', uid);
  if (taskUid) q.set('task_uid', taskUid);
  if (reportUid) q.set('report_uid', reportUid);
  for (const [k, v] of Object.entries(extra || {})) if (/_uid$/.test(k) && k !== 'uid' && k !== 'user_uid' && v) q.set(k, String(v));
  const r = await http(node, `/s/${encode(space)}/c/web.team.xiangmuguanli.portal/action/run/${command}/action/${action}${seg ? '/' + seg : ''}?${q}`, { method: verb, timeout: 20000 });
  let valueUid = '';
  try { const env = JSON.parse(r.text); valueUid = env.value_uid?.[0] || ''; } catch { /* redirect */ }
  return { status: r.status, uid: valueUid, text: r.text };
}

export async function planProject({ node, avatarUid = '', goal = '' } = {}) {
  const avatars = await listAvatars({ node });
  const avatar = (avatars.items || []).find((x) => x.uid === (avatarUid || avatars.active));
  if (!avatar?.project?.space || !avatar.project.place_uid) throw new Error('avatar has no project');
  const project = avatar.project;
  let sessid = '';
  try { sessid = await avatarSession(node, avatar); } catch { /* fall back to query uid */ }
  const targetText = String(goal || '日常目标').slice(0, 200);
  let plan = null;
  try {
    plan = await llmJson({ prompt: `你是项目管理助手。把目标拆成 JSON，只输出 JSON：\n{"target":{"title":"...","content":"..."},"plans":[{"title":"...","content":"...","begin_time":"YYYY-MM-DD","end_time":"YYYY-MM-DD","tasks":[{"title":"...","content":"...","report":{"title":"...","content":"..."},"feedback":{"title":"...","content":"...","score":"5","feedback_status":"canFinish"}}]}]}\n目标：${targetText}\n当前日期：${new Date().toISOString().slice(0, 10)}` });
  } catch {
    plan = { target: { title: targetText, content: `AI 拆解：${targetText}` }, plans: [{ title: '执行计划', content: `完成：${targetText}`, begin_time: new Date().toISOString().slice(0, 10), end_time: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10), tasks: [{ title: '第一步', content: targetText, report: { title: '进度报告', content: '待填写' }, feedback: { title: '反馈', content: '待填写', score: '5', feedback_status: 'canFinish' } }] }] };
  }
  const warnings = [];
  const target = plan.target || { title: targetText, content: targetText };
  const targetUid = await pmCreate({ node, space: project.space, command: 'web.team.xiangmuguanli.target', fields: { title: target.title || targetText, content: target.content || targetText }, uid: avatar.uid, projectUid: project.place_uid, sessid });
  let plans = 0, tasks = 0, reports = 0, feedbacks = 0;
  for (const p of plan.plans || []) {
    let planUid = '';
    try {
      const r = await pmAction({ node, space: project.space, command: 'web.team.xiangmuguanli.target', action: 'planCreate', uid: targetUid, fields: { title: p.title || '计划', content: p.content || '', begin_time: p.begin_time || new Date().toISOString().slice(0, 10), end_time: p.end_time || new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10) }, projectUid: project.place_uid, actorUid: avatar.uid, sessid });
      planUid = r.uid;
      plans++;
    } catch (e) { warnings.push(`plan: ${String(e.message || e)}`); continue; }
    // State machine: created → submitted → approved → process.
    for (const action of ['submit', 'approve', 'process']) {
      try { await pmAction({ node, space: project.space, command: 'web.team.xiangmuguanli.plan', action, uid: planUid, projectUid: project.place_uid, actorUid: avatar.uid, sessid }); }
      catch { /* role may skip a transition; taskCreate below is the real gate */ }
    }
    for (const k of p.tasks || []) {
      let taskUid = '';
      try {
        const r = await pmAction({ node, space: project.space, command: 'web.team.xiangmuguanli.plan', action: 'taskCreate', uid: planUid, fields: { title: k.title || '任务', content: k.content || '' }, projectUid: project.place_uid, actorUid: avatar.uid, sessid });
        taskUid = r.uid; tasks++;
      } catch (e) { warnings.push(`task: ${String(e.message || e)}`); continue; }
      try { await pmAction({ node, space: project.space, command: 'web.team.xiangmuguanli.task', action: 'process', uid: taskUid, projectUid: project.place_uid, actorUid: avatar.uid, sessid }); } catch (e) { warnings.push(`task process: ${String(e.message || e)}`); }
      let reportUid = '';
      try {
        const r = await pmAction({ node, space: project.space, command: 'web.team.xiangmuguanli.task', action: 'reportCreate', uid: taskUid, fields: { report_type: 'daily', title: k.report?.title || '进度报告', content: k.report?.content || '待填写' }, projectUid: project.place_uid, actorUid: avatar.uid, sessid });
        reportUid = r.uid; reports++;
      } catch (e) { warnings.push(`report: ${String(e.message || e)}`); continue; }
      try {
        await pmAction({ node, space: project.space, command: 'web.team.xiangmuguanli.report', action: 'feedbackCreate', uid: reportUid, fields: { title: k.feedback?.title || '反馈', content: k.feedback?.content || '待填写', score: k.feedback?.score || '5', feedback_status: k.feedback?.feedback_status || 'canFinish' }, projectUid: project.place_uid, actorUid: avatar.uid, sessid, taskUid });
        feedbacks++;
      } catch (e) { warnings.push(`feedback: ${String(e.message || e)}`); }
    }
  }
  return { avatar, project, target_uid: targetUid, plans, tasks, reports, feedbacks, warnings };
}
