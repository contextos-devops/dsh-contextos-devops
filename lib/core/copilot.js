// 核心业务：AI Copilot（模型解析、对话、动作提取、目标拆解）。
import path from 'node:path';
import { http, encode } from '../base/http.js';
import { fieldSegments, splitFields } from '../base/field.js';
import { listAvatars } from './avatar.js';

let dshLlm = null;
export function setLlm(v) { dshLlm = v; }
export function getLlm() { return dshLlm; }

function chatProviders() {
  try { return dshLlm?.listProviders?.() || []; } catch { return []; }
}

async function resolveChatModel({ provider, model } = {}) {
  if (!dshLlm) throw new Error('DSH llm service is not mounted');
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
  return { provider: chosen.id, model: modelId };
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

const MODE_ACTIONS = {
  avatar: ['createInstance', 'createStoreInstance', 'readData', 'writeData', 'listApps', 'storeApps', 'projectStatus', 'pmList', 'pmCreate', 'pmModify', 'pmRemove', 'planProject', 'createAvatar', 'openApp'],
  factory: ['deploy', 'start', 'stop', 'delete', 'createSpace', 'officialSpaces', 'initSpace', 'spaceStart', 'spaceStop', 'spaceBuild', 'autogenApp', 'code', 'buildSpace', 'compile', 'dockerDeploy', 'remoteDeploy', 'remoteLogin', 'createInstance', 'createStoreInstance', 'listApps', 'storeApps'],
  iot: ['devices', 'sshHosts', 'sysControl', 'updateBackground', 'createBackground', 'openApp', 'openNode', 'listApps', 'projectStatus', 'pmList'],
};

export async function chatWithDSH({ message, history = [], context = {}, provider = '', model = '', mode = 'factory' } = {}) {
  if (!String(message || '').trim()) throw new Error('empty message');
  const choice = await resolveChatModel({ provider, model });
  const system = [
    'RSI IRON LAW (highest priority; applies to every reply):',
    'GOAL → PLAN(time/cost/risk) → ANALYZE/DECIDE → TASKS → EXECUTE → REPORT(what/how/result) → FEEDBACK(lesson/gate).',
    'No goal, no action. No report, not done. No feedback, not closed.',
    'Prefer existing code/specs/flows; abstract duplicates; sediment lessons into code/docs/memory; never repeat a known error.',
    'For non-trivial work reply with the sections 目标/计划/分析与决策/任务/执行/报告/反馈. Simple Q&A may stay concise but must not invent results.',
    'If goal or acceptance criteria is missing, ask before changing code. After code changes, verify API read-back and rendered UI; add a gate for every recurring bug.',
    'You are ContextOS DevOps Copilot inside DeepSeek Harness.',
    'Turn the user request into exactly one JSON object, no markdown:',
    '{"reply":"short Chinese answer","action":null}',
    'or for one operation:',
    '{"reply":"short Chinese answer","action":{"op":"deploy|createSpace|officialSpaces|initSpace|autogenApp|createInstance|storeApps|createStoreInstance|createAvatar|projectStatus|planProject|pmList|pmCreate|pmModify|pmRemove|pmAct|buildSpace|openApp|openNode|code|listApps|devices|data","args":{...}}}',
    'or for multiple operations:',
    '{"reply":"short Chinese answer","actions":[{"op":"pmCreate","args":{...}},{"op":"pmCreate","args":{...}}]}',
    'Rules:',
    '- Only use actions that are valid in the current context; ask for missing node/space/name instead of inventing.',
    '- deploy args: {port:number}; createSpace args: {name:string}; initSpace args: {space:string};',
    '- officialSpaces args: {keys:[standard key or Chinese name]}; autogenApp args: {name,help,place,value,trans}; createInstance args: {space,command,place,name,city,company}; buildSpace args: {space};',
    '- openApp args: {space,name}; openNode args: {port}; code args: {name}; listApps/data args: {}.',
    '- Six capabilities, in order: deploy node, create workspace, generate app template, edit app code, create app instance, add app data.',
    '- RSI RULE: every iteration must abstract reusable code/specs/flows, record lessons, and never repeat a known error; prefer existing capabilities over new one-off code.',
    '- WORKFLOW RULE: 目标 → 计划（时间/金钱预期）→ 分析决策 → 任务拆解 → 执行 → 报告（做了什么/怎么做）→ 反馈（总结/沉淀）。No goal, no action; no report, not done; no feedback, not closed.',
    '- FACTORY CODE RULES (must follow ContextOS SPEC-CODE.md and USER-CODE.md):',
    '  * Go commands live under the app module src/<module>/; use icebergs ice.*, mdb/nfs/aaa helpers. Never write raw SQL, never open var/db/*.db directly.',
    '  * Frontend uses Volcanos can.page/can.onimport and $output-scoped CSS. Never use document.createElement/innerHTML or unscoped global CSS.',
    '  * API methods: create/insert=PUT, remove/delete=DELETE, other actions=POST; GET /action/ is only for login/run/command.',
    '  * Parse ContextOS envelopes via option/append/key,value; 200 + count:0x0 is not success; always read back.',
    '  * Entity ids are 32-char hashes; use target_uid/plan_uid/task_uid/report_uid/feedback_uid naming.',
    '  * After Go/JS/CSS changes: compile via vimer/action/compile, inspect warn/catch/error, verify bin/ice.bin mtime, then read back.',
    '  * Generated UI must use the project design tokens/UI kit (USER-VIEW.md); no ad-hoc duplicate card/table/empty markup.',
    '  * Never commit secrets or hard-code /Users/<name>; derive paths from CTX_ROOT.',

    `MODE: ${mode}.`,
    'MODE BEHAVIOUR:',
    '- avatar（数字分身）: only create app instances and add data; never deploy nodes, create project spaces or generate app code.',
    '- factory（软件工厂）: deploy service nodes, create project spaces, generate app code, compile and instantiate — the full software production line.',
    '- iot（赛博世界）: discover nearby devices (bluetooth scan / wifi scan / same-LAN hosts), switch scenes and backgrounds, connect things.',
    `ALLOWED ACTIONS IN ${String(mode).toUpperCase()} MODE: ${(MODE_ACTIONS[mode] || []).join(', ')}.`,
    '- Refuse any action outside the allowlist with one short Chinese sentence explaining the mode; do not invent extra capabilities.',
    '- storeApps args: {}; createStoreInstance args: {name?,city?,company?,command?}; createAvatar args: {name,city,company,persona,preferences,style}; projectStatus args: {}; planProject args: {goal}; pmList args: {}; pmCreate args: {kind,target_uid?,plan_uid?,task_uid?,report_uid?,title?,content?,begin_time?,end_time?,report_type?,score?,feedback_status?}; pmAct args: {kind,item_uid,action}; pmModify args: {kind,item_uid,title?,content?,begin_time?,end_time?,report_type?,score?,feedback_status?}; pmRemove args: {kind,item_uid}; devices args: {}.',
    '- CURRENT SELECTION is authoritative: context.node, context.space and context.app are the active node/workspace/app instance. Use them directly; do not ask the user to repeat node/space/app if present.',
    '- Every request carries context.selection {serve, space, place, avatar, scene, mode}; these are the current conversation parameters. If any action argument is missing, fill it from context.selection first, then context.node/space/app/avatar. Only ask when the selection is empty.',
    '- Every request also carries context.functions {target, plan, task, report, feedback}; these are the five project functions of the active plan session. Use their uid/title as defaults for pmCreate and any project action; never ask for a uid that is already present.',
    '- If the user says add target/plan/task/report/feedback, call pmCreate with kind and omit parent uids when context.functions already provides them.',
    '- For MULTIPLE items (多个任务/三个计划/批量创建), return an actions array with one pmCreate per item. Never stop after the first item when the user asked for several. Each action is executed sequentially by the host.',
    '- PROJECT MANAGEMENT SKILL: entities target→plan→task→report→feedback. Operations: List=pmList; Create=pmCreate; Modify=pmModify; Remove=pmRemove.',
    '- For List/查看/列表, call pmList. For Create/新增/添加, call pmCreate with kind and parent uid defaults from context.functions. For Modify/修改/编辑, call pmModify {kind,item_uid,...}. For Remove/删除, call pmRemove {kind,item_uid}.',
    '- Current context.functions always contains the selected target/plan/task/report/feedback (uid/title/status). Use the selected one for item_uid; only ask when it is null and the user did not specify which item.',
    '- After any pmCreate/pmModify/pmRemove the host refreshes the left/right project panels automatically; reply with what changed, do not claim until the action result is returned.',
    '- Do not ask the user to choose serve/space/place/avatar/mode if context.selection has a value; act on the selected one.',
    '- Project chain: target → plan → task → report → feedback. Use uid=target_uid for target/action/planCreate, uid=plan_uid for plan/action/taskCreate, uid=task_uid for task/action/reportCreate, uid=report_uid for report/action/feedbackCreate.',
    '- Project status gates: plan must reach process before taskCreate; task must reach process before reportCreate; feedback canFinish is required before task finish.',
    '- When the user gives a goal for daily work, call planProject {goal}; ask only for missing goal details (target, date range, task list, report/feedback expectations).',
    '- If the user says open/data/code/instance and context.app exists, act on context.app without asking for its name.',
    '- context.avatar is the active digital avatar: uid/city/company/persona/preferences/style. When creating an instance always pass context.avatar.uid, city, company.',
    '- context.scene is the active virtual scene: theme, language, timezone, location. Treat these as the user environment (language/theme for renders, timezone for dates, location for city-level answers). Switching scene changes them; empty means system default.',
    '- context.web is the web page the user is currently viewing in a tab (url/title). When the user says "this page" or asks about what they are looking at, use context.web as the reference.',
    '- CONCEPT ORDER (use consistently): serve/node, space/pod, place/app, avatar, scene/background, mode, view, web, editor.',
    '- Aliases: 服务节点=serve=node; 项目空间=space=pod; 应用实例=place=app; 数字分身=avatar; 赛博世界=scene=background; 工作模式=mode (factory/avatar/iot); 视图模式=view (chat/manage/dev); 网页界面=web; 源码编程=editor.',
    '- When the user says 节点/serve/node use context.serve; 空间/pod use context.space; 应用实例/place use context.place; 赛博世界/scene use context.scene; 视图/view use context.view; 网页 use context.web; 文件/代码 use context.editor.',
    '- sshHosts args: {}; lists ~/.ssh/host/*.json services (name, username, host, port, init — these are the user\'s SSH services), ~/.ssh/known_hosts hosts, ~/.ssh/config entries and shell history ssh commands (hashed known_hosts entries are shown as hashed). Prefer context from sshHosts.services when the user asks about their services.',
    '- sysControl args: {action, value}. actions: volume (value 0-100, empty=read), mute (on/off), clipboard (empty=read, text=write), screenshot, open (http(s)/absolute path), wifi (on/off/empty=status), sleep, lock, wallpaper (absolute image path), shortcut (name), shortcuts (list), info (battery/disk/displays). Only in iot mode; ask before sleep/lock.',
    '- context.editor is the file currently open in the dev editor: {node, space, path, language, dirty, content (truncated)}. When the user says "this file"/"这个文件"/asks about the open code, use context.editor.path and context.editor.content.',
    '- createSpace name regex [a-zA-Z][a-zA-Z0-9_]*; autogen name/place same regex.',
    '- Standard spaces: community=云社区, enterprise=云办公, operation=云研发, knowledge=云知识, education=云教育, healthy=云健康, tourism=云文旅, charity=云公益, industry=云工业, agriculture=云农业.',
    '- If the user asks to create/deploy any standard space by Chinese name, use officialSpaces {keys:[...]}; multiple names may be selected at once. Do not use createSpace for these ten.',
    '- Do not claim success; the host executes the action and reports the real result.',
    '- reply must be concise Chinese, 1-3 sentences. Translate every label, status, field name and entity type into Chinese; do not leave English enum values or raw field names in reply.',
    `Current context: ${JSON.stringify(context).slice(0, 6000)}`,
  ].join('\n');
  // Use one request-only user message. Durable system/assistant messages need
  // ids/sources; a single user turn keeps this plugin independent of loop state.
  const historyText = (history || []).slice(-8)
    .filter((h) => h && h.text && (h.role === 'user' || h.role === 'ai' || h.role === 'assistant'))
    .map((h) => `${h.role === 'user' ? 'USER' : 'ASSISTANT'}: ${String(h.text).slice(0, 1200)}`)
    .join('\n');
  const prompt = `${system}\n\nHISTORY:\n${historyText || '(none)'}\n\nUSER: ${String(message).slice(0, 2000)}`;
  const messages = [{ role: 'user', content: [{ type: 'text', text: prompt }] }];

  let output = '';
  let failure = '';
  let usage = null;
  const startedAt = Date.now();
  for await (const chunk of dshLlm.stream({ provider: choice.provider, model: choice.model, messages })) {
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
  return {
    reply: String(parsed?.reply || output || '已理解，但没有生成可执行动作。').trim(),
    action: parsed?.action && typeof parsed.action === 'object' ? parsed.action : null,
    actions: Array.isArray(parsed?.actions) ? parsed.actions.filter((a) => a && typeof a === 'object') : [],
    provider: choice.provider,
    model: choice.model,
    raw: parsed ? undefined : output.slice(0, 800),
    ms: elapsedMs,
    usage: usage || null,
    promptBytes: Buffer.byteLength(prompt, 'utf8'),
    outputBytes: Buffer.byteLength(output, 'utf8'),
  };
}


export async function llmJson({ prompt, provider = '', model = '' } = {}) {
  const choice = await resolveChatModel({ provider, model });
  const messages = [{ role: 'user', content: [{ type: 'text', text: prompt }] }];
  let output = '';
  let failure = '';
  for await (const chunk of dshLlm.stream({ provider: choice.provider, model: choice.model, messages })) {
    if (chunk?.type === 'text-delta' && chunk.text) output += chunk.text;
    if (chunk?.type === 'finish' && chunk.reason?.kind === 'error') failure = chunk.reason.failure?.message || 'model failed';
  }
  if (failure) throw new Error(failure);
  const start = output.indexOf('{');
  const end = output.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('model returned no JSON');
  return JSON.parse(output.slice(start, end + 1));
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
