// 核心业务：项目管理（target/plan/task/report/feedback，SQLite 直读 + 翻译缓存）。
import path from 'node:path';
import net from 'node:net';
import { http, encode, envelopeRows } from '../base/http.js';
import { listNodes } from '../base/registry.js';
import { runShell } from '../misc/shell.js';
import { listAvatars } from './avatar.js';
import { pmCreate, pmAction } from './copilot.js';

const PLAN_STATUS = ['created', 'submited', 'approved', 'process', 'finished', 'canceled', 'rejected'];const PM_STATUS_ORDER = ['created', 'submited', 'approved', 'process', 'finished', 'canceled', 'rejected'];
function sortPmItems(items) {
  const rank = new Map(PM_STATUS_ORDER.map((name, i) => [name, i]));
  return (items || []).slice().sort((a, b) => {
    const ra = rank.has(a.status_name) ? rank.get(a.status_name) : 99;
    const rb = rank.has(b.status_name) ? rank.get(b.status_name) : 99;
    if (ra !== rb) return ra - rb;
    return String(b.created_at || b.updated_at || '').localeCompare(String(a.created_at || a.updated_at || ''));
  });
}

const TASK_STATUS = ['created', 'submited', 'approved', 'process', 'finished', 'canceled', 'rejected'];
const FB_STATUS = ['canFinish', 'shouldImprove'];
const REPORT_TYPE = ['issue', 'daily', 'weekly', 'monthly', 'quarterly', 'annual'];
const PM_KIND_TEXT = { target: ['目标', 'TARGET'], plan: ['计划', 'PLAN'], task: ['任务', 'TASK'], report: ['报告', 'REPORT'], feedback: ['反馈', 'FEEDBACK'] };
const STATUS_ZH = { created: '待提交', submited: '待审批', approved: '待开始', process: '进行中', finished: '已完成', canceled: '已取消', rejected: '已驳回' };
const FEEDBACK_ZH = { canFinish: '可完成', shouldImprove: '待改进' };
const REPORT_TYPE_ZH = { issue: '问题', daily: '日报', weekly: '周报', monthly: '月报', quarterly: '季报', annual: '年报' };
const FIELD_ZH = { title: '标题', content: '内容', begin_time: '开始时间', end_time: '结束时间', report_type: '报告类型', feedback_status: '反馈状态', score: '评分' };
const UID_RE = /^[0-9a-f]{32}$/i;
const UID_ALIASES = {
  targetUID: 'target_uid', targetId: 'target_uid', target_uid: 'target_uid',
  planUID: 'plan_uid', planId: 'plan_uid', plan_uid: 'plan_uid',
  taskUID: 'task_uid', taskId: 'task_uid', task_uid: 'task_uid',
  reportUID: 'report_uid', reportId: 'report_uid', report_uid: 'report_uid',
  feedbackUID: 'feedback_uid', feedbackId: 'feedback_uid', feedback_uid: 'feedback_uid',
};
function normalizeUidOptions(input = {}) {
  const out = {};
  for (const [key, value] of Object.entries(input || {})) {
    const canonical = UID_ALIASES[key];
    if (!canonical || !value) continue;
    if (!UID_RE.test(String(value))) throw new Error(`invalid ${canonical}: expected 32-char hash`);
    out[canonical] = String(value);
  }
  return out;
}

function pmActionNames(kind, item, ctx = {}) {
  const status = item.status_name || (STATUS_ZH[item.status] ? item.status : PLAN_STATUS[Number(item.status)]) || String(item.status || '');
  if (kind === 'target') return ['planCreate', 'modify', ...((ctx.plans || []).length ? [] : ['remove'])];
  if (kind === 'plan') {
    if (status === 'created') return ['submit', 'modify', 'remove'];
    if (status === 'submited') return ['approve', 'reject'];
    if (status === 'approved') return ['process', 'modify', 'remove'];
    if (status === 'process') {
      const actions = ['taskCreate'];
      if (!(ctx.tasks || []).some((t) => t.status_name === 'process')) actions.push('finish', 'cancel');
      return actions;
    }
    return [];
  }
  if (kind === 'task') {
    if (status === 'created') return ['process', 'handover', 'modify', 'remove'];
    if (status === 'process') {
      const actions = ['reportCreate', 'handover', 'cancel'];
      if (item.can_finish) actions.push('finish');
      return actions;
    }
    return [];
  }
  if (kind === 'report') {
    const taskStatus = (ctx.task || {}).status_name || '';
    const taskProcess = taskStatus === 'process';
    // 任务完成/取消后，报告不能再创建反馈
    const actions = taskProcess ? ['feedbackCreate'] : [];
    if (item.link) actions.push('open');
    if (taskProcess && !(ctx.feedbacks || []).length) actions.push('modify', 'remove');
    return actions;
  }
  if (kind === 'feedback') return (ctx.task || {}).status_name === 'process' ? ['modify', 'remove'] : [];
  return [];
}

export async function fieldOptions({ node, space = '', command = '', field = '', projectUid = '', uid = '', sessid = '' } = {}) {
  if (!space || !command || !field) throw new Error('space/command/field are required');
  const q = new URLSearchParams({ 'user.uid': uid });
  if (projectUid) q.set('project_uid', projectUid);
  const r = await http(node, `/s/${encode(space)}/c/web.team.xiangmuguanli.portal/action/run/${command}/action/inputs/${encode(field)}?${q}`, { timeout: 12000 });
  let env = {};
  try { env = JSON.parse(r.text); } catch { throw new Error(`inputs ${field} returned non-JSON`); }
  const values = Array.isArray(env[field]) ? env[field].map(String) : [];
  const names = Array.isArray(env.name) ? env.name.map(String) : [];
  const fieldLabel = FIELD_ZH[field] || field;
  const valueTrans = field === 'report_type' ? REPORT_TYPE_ZH : field === 'feedback_status' ? FEEDBACK_ZH : {};
  const options = values.map((value, i) => {
    const name = names[i] || value;
    return { value, name, label: valueTrans[name] || valueTrans[value] || name };
  });
  return { field, field_label: fieldLabel, values, names, options };
}

function grabTransMap(text, key) {
  const source = String(text || '').replace(/\\"/g, '"');
  const marker = `"${key}":{`;
  const start = source.indexOf(marker);
  if (start < 0) return {};
  let depth = 0, end = -1;
  for (let i = start + marker.length - 1; i < source.length; i++) {
    if (source[i] === '{') depth++;
    else if (source[i] === '}') { depth--; if (depth === 0) { end = i; break; } }
  }
  if (end < 0) return {};
  try { return JSON.parse(source.slice(start + marker.length - 1, end + 1)); } catch { return {}; }
}
async function pmApiRows({ node, space, projectUid, command, uid, sessid = '', extra = '' }) {
  const q = new URLSearchParams({ project_uid: projectUid, 'user.uid': uid });
  if (sessid) q.set('sessid', sessid);
  const url = `/s/${encode(space)}/c/web.team.xiangmuguanli.portal/action/run/web.team.xiangmuguanli.${command}/${encode(projectUid)}?${q}${extra ? `&${extra}` : ''}`;
  const r = await http(node, url, { timeout: 20000 });
  return envelopeRows(r.text).rows;
}

async function pmActionRows({ node, space, projectUid, command, action, parentUid, uid }) {
  const q = new URLSearchParams({ project_uid: projectUid, 'user.uid': uid });
  if (parentUid) q.set('uid', parentUid);
  const base = `/s/${encode(space)}/c/web.team.xiangmuguanli.portal/action/run/web.team.xiangmuguanli.${command}`;
  const r = await http(node, `${base}/action/${action}?${q}`, { timeout: 20000 });
  return envelopeRows(r.text).rows;
}

async function pmTranslations() {
  return { status: STATUS_ZH, feedback_status: FEEDBACK_ZH, report_type: REPORT_TYPE_ZH };
}

export async function pmList({ node, avatarUid = '', lang = 'zh', targetUid = '', planUid = '', taskUid = '', reportUid = '', scope = 'target' } = {}) {
  const avatars = await listAvatars({ node });
  const avatar = (avatars.items || []).find((x) => x.uid === (avatarUid || avatars.active));
  if (!avatar) throw new Error('avatar not found');
  const project = avatar.project;
  if (!project?.place_uid) return { avatar, project: null, targets: [], plans: [], tasks: [], reports: [], feedbacks: [] };
  const projectUid = project.place_uid;
  const sessid = '';
  const trans = lang === 'zh' ? await pmTranslations({ node, space: project.space, projectUid, uid: avatar.uid }).catch(() => ({ status: {}, feedback_status: {}, report_type: {} })) : { status: {}, feedback_status: {}, report_type: {} };
  const base = { node, space: project.space, projectUid, uid: avatar.uid, sessid };
  const order = ['target', 'plan', 'task', 'report', 'feedback'];
  const at = order.indexOf(scope) >= 0 ? order.indexOf(scope) : 0;
  // Always resolve planList's uid from the target list. A stale/foreign target_uid
  // from localStorage or a plan selection must never be sent as planList uid.
  const targetRows = (at === 0 || targetUid) ? await pmApiRows({ ...base, command: 'target' }) : [];
  const targets = at === 0 ? targetRows.filter((x) => String(x.title || '').trim()) : [];
  const targetHit = targetRows.find((x) => x.uid === targetUid && String(x.title || '').trim());
  const selectedTarget = targetHit?.uid || targets[0]?.uid || '';
  const plans = at <= 1 && selectedTarget ? await pmActionRows({ ...base, command: 'target', action: 'planList', parentUid: selectedTarget }) : [];
  const planHit = plans.find((x) => x.uid === planUid);
  const selectedPlan = planHit?.uid || plans[0]?.uid || '';
  const tasks = at <= 2 && selectedPlan ? await pmActionRows({ ...base, command: 'plan', action: 'taskList', parentUid: selectedPlan }) : [];
  const taskHit = tasks.find((x) => x.uid === taskUid);
  const selectedTask = taskHit?.uid || tasks[0]?.uid || '';
  const reports = at <= 3 && selectedTask ? await pmActionRows({ ...base, command: 'task', action: 'reportList', parentUid: selectedTask }) : [];
  const reportHit = reports.find((x) => x.uid === reportUid);
  const selectedReport = reportHit?.uid || reports[0]?.uid || '';
  const feedbacks = at <= 4 && selectedReport ? await pmActionRows({ ...base, command: 'report', action: 'feedbackList', parentUid: selectedReport }) : [];
  for (const p of plans) p.status_name = PLAN_STATUS[Number(p.status)] || String(p.status);
  for (const t of tasks) t.status_name = TASK_STATUS[Number(t.status)] || String(t.status);
  for (const f of feedbacks) {
    f.status = f.feedback_status;
    const raw = String(f.feedback_status ?? '');
    f.status_name = /^\d+$/.test(raw) ? (FB_STATUS[Number(raw)] || raw) : raw;
  }
  for (const r of reports) { r.type = r.report_type; r.type_name = REPORT_TYPE[Number(r.report_type)] || String(r.report_type || ''); }
  for (const p of plans) p.status_label = lang === 'zh' ? (trans.status[p.status_name] || p.status_name) : p.status_name;
  for (const k of tasks) k.status_label = lang === 'zh' ? (trans.status[k.status_name] || k.status_name) : k.status_name;
  for (const f of feedbacks) f.status_label = lang === 'zh' ? (trans.feedback_status[f.status_name] || f.status_name) : f.status_name;
  for (const r of reports) r.type_label = lang === 'zh' ? (trans.report_type[r.type_name] || r.type_name) : r.type_name;
  for (const r of reports) r.status_label = r.type_label;
  for (const [kind, list] of Object.entries({ target: targets, plan: plans, task: tasks, report: reports, feedback: feedbacks })) {
    const text = PM_KIND_TEXT[kind] || [kind, kind.toUpperCase()];
    for (const item of list) { item.kind = kind; item.kind_label = lang === 'zh' ? text[0] : text[1]; }
  }
  for (const r of reports) r.feedbacks = feedbacks.filter((f) => f.report_uid === r.uid);
  for (const t of tasks) t.reports = reports.filter((r) => r.task_uid === t.uid);
  for (const p of plans) p.tasks = tasks.filter((t) => t.plan_uid === p.uid);
  for (const t of targets) t.plans = plans.filter((p) => p.target_uid === t.uid);
  for (const t of tasks) t.can_finish = (t.reports || []).some((r) => (r.feedbacks || []).some((f) => f.status_name === 'canFinish'));
  for (const t of targets) t.actions = pmActionNames('target', t, { plans: t.plans || [] });
  for (const p of plans) p.actions = pmActionNames('plan', p, { tasks: p.tasks || [] });
  for (const t of tasks) t.actions = pmActionNames('task', t, { reports: t.reports || [] });
  for (const r of reports) r.actions = pmActionNames('report', r, { task: tasks.find((t) => t.uid === r.task_uid), feedbacks: r.feedbacks || [] });
  for (const f of feedbacks) f.actions = pmActionNames('feedback', f, { task: tasks.find((t) => t.uid === (reports.find((r) => r.uid === f.report_uid) || {}).task_uid) });
  const sortedPlans = sortPmItems(plans);
  const sortedTasks = sortPmItems(tasks);
  for (const p of plans) p.tasks = sortPmItems(p.tasks || []);
  for (const t of targets) t.plans = sortPmItems(t.plans || []);
  return { avatar, project, scope, targets, plans: sortedPlans, tasks: sortedTasks, reports, feedbacks };
}

// 表单取值规范：枚举字段一律提交后台返回的 value（数字/编码），不要提交 name/label
const OPTION_CACHE = new Map();
export async function optionValue({ node, space, command, field, raw, projectUid = '', uid = '', sessid = '' }) {
  if (raw === '' || raw === undefined || raw === null) return raw;
  const key = `${node}|${space}|${command}|${field}`;
  let opts = OPTION_CACHE.get(key);
  if (!opts) {
    try { const d = await fieldOptions({ node, space, command, field, projectUid, uid, sessid }); opts = d.options || []; }
    catch { opts = []; }
    OPTION_CACHE.set(key, opts);
  }
  const hit = opts.find((o) => String(o.value) === String(raw) || String(o.name) === String(raw) || String(o.label) === String(raw));
  return hit ? String(hit.value) : String(raw);
}

export async function pmCreateItem({ node, avatarUid = '', kind = '', title = '', content = '', targetUid = '', planUid = '', taskUid = '', reportUid = '', beginTime = '', endTime = '', reportType = 'daily', score = '5', feedbackStatus = 'canFinish', uidOptions = {} } = {}) {
  const avatars = await listAvatars({ node });
  const avatar = (avatars.items || []).find((x) => x.uid === (avatarUid || avatars.active));
  if (!avatar?.project?.space) throw new Error('avatar has no project');
  const project = avatar.project;
  const base = { node, space: project.space, projectUid: project.place_uid, actorUid: avatar.uid, sessid: '' };
  const uidFields = normalizeUidOptions(uidOptions);
  const send = (command, action, uid, fields = {}, extra = {}) => pmAction({ ...base, command: `web.team.xiangmuguanli.${command}`, action, uid, fields, method: 'PUT', extra });
  if (kind === 'target') {
    const uid = await pmCreate({ ...base, uid: avatar.uid, command: 'web.team.xiangmuguanli.target', fields: { title: title || '新目标', content } });
    if (!uid) throw new Error('target create returned no uid');
    return { kind, uid };
  }
  if (kind === 'plan') {
    if (!targetUid) throw new Error('plan needs a target');
    await send('target', 'planCreate', targetUid, { title: title || '新计划', content, begin_time: beginTime || new Date().toISOString().slice(0, 10), end_time: endTime || new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10) }, uidFields);
    const rows = await pmActionRows({ node, space: project.space, projectUid: project.place_uid, command: 'target', action: 'planList', parentUid: targetUid, uid: avatar.uid });
    const created = (rows || []).find((x) => x.title === (title || '新计划')) || (rows || [])[0];
    return { kind, uid: created?.uid || '' };
  }
  if (kind === 'task') {
    if (!planUid) throw new Error('task needs a plan');
    await send('plan', 'taskCreate', planUid, { title: title || '新任务', content }, uidFields);
    const rows = await pmActionRows({ node, space: project.space, projectUid: project.place_uid, command: 'plan', action: 'taskList', parentUid: planUid, uid: avatar.uid });
    const created = (rows || []).find((x) => x.title === (title || '新任务')) || (rows || [])[0];
    return { kind, uid: created?.uid || '' };
  }
  if (kind === 'report') {
    if (!taskUid) throw new Error('report needs a task');
    const rt = await optionValue({ node, space: project.space, command: 'web.team.xiangmuguanli.report', field: 'report_type', raw: reportType, projectUid: project.place_uid, uid: avatar.uid });
    await send('task', 'reportCreate', taskUid, { report_type: rt, title: title || '进度报告', content }, uidFields);
    const rows = await pmActionRows({ node, space: project.space, projectUid: project.place_uid, command: 'task', action: 'reportList', parentUid: taskUid, uid: avatar.uid });
    const created = (rows || []).find((x) => x.title === (title || '进度报告')) || (rows || [])[0];
    return { kind, uid: created?.uid || '' };
  }
  if (kind === 'feedback') {
    if (!reportUid) throw new Error('feedback needs a report');
    // 任务已结束（完成/取消）时禁止再建反馈
    try {
      const tree = await pmList({ node, avatarUid });
      const taskUidOfReport = ((tree.reports || []).find((r) => r.uid === reportUid) || {}).task_uid;
      const taskItem = (tree.tasks || []).find((t) => t.uid === taskUidOfReport) || {};
      if (['finished', 'canceled'].includes(taskItem.status_name)) throw new Error('任务已结束，不能再创建反馈');
    } catch (e) { if (String(e.message).includes('任务已结束')) throw e; }
    const fs = await optionValue({ node, space: project.space, command: 'web.team.xiangmuguanli.feedback', field: 'feedback_status', raw: feedbackStatus, projectUid: project.place_uid, uid: avatar.uid });
    const sc = await optionValue({ node, space: project.space, command: 'web.team.xiangmuguanli.feedback', field: 'score', raw: score, projectUid: project.place_uid, uid: avatar.uid });
    await send('report', 'feedbackCreate', reportUid, { title: title || '反馈', content, score: sc, feedback_status: fs }, uidFields);
    const rows = await pmActionRows({ node, space: project.space, projectUid: project.place_uid, command: 'report', action: 'feedbackList', parentUid: reportUid, uid: avatar.uid });
    const created = (rows || []).find((x) => x.title === (title || '反馈')) || (rows || [])[0];
    return { kind, uid: created?.uid || '' };
  }
  throw new Error('kind must be target/plan/task/report/feedback');
}

export async function pmLog({ node, space = '', logId = '' } = {}) {
  if (!/^[0-9a-zA-Z_-]+$/.test(String(logId || ''))) throw new Error('bad log id');
  const n = (await listNodes()).find((x) => x.port === Number(node));
  if (!n?.dir || !space) throw new Error('node/space required');
  const file = path.join(n.dir, 'usr', 'local', 'work', space, 'var', 'log', 'bench.log');
  const r = await runShell(`grep -F ${JSON.stringify(String(logId))} ${JSON.stringify(file)} | tail -n 200`, process.cwd(), { timeoutMs: 5000 }).catch(() => null);
  return { file, logId, text: String(r?.out || '') || `未找到日志：${logId}` };
}


// 每类对象只允许提交自己的表单字段，防止 plan 修改带上 report/feedback 的字段
export const PM_FIELDS = {
  target: ['title', 'content'],
  plan: ['title', 'content', 'begin_time', 'end_time'],
  task: ['title', 'content'],
  report: ['title', 'content', 'report_type'],
  feedback: ['title', 'content', 'score', 'feedback_status'],
};

export function pmFieldsFor(kind, src = {}) {
  const keys = PM_FIELDS[kind] || ['title', 'content'];
  const out = {};
  for (const k of keys) {
    const v = src[k];
    if (v === undefined || v === null || String(v) === '') continue;
    out[k] = v;
  }
  return out;
}

export async function pmModifyItem({ node, avatarUid = '', kind = '', uid = '', title = '', content = '', beginTime = '', endTime = '', reportType = '', score = '', feedbackStatus = '', uidOptions = {} } = {}) {
  const tree = await pmList({ node, avatarUid });
  if (!tree.project?.space) throw new Error('avatar has no project');
  const commands = { target: 'target', plan: 'plan', task: 'task', report: 'report', feedback: 'feedback' };
  const command = commands[kind];
  if (!command || !uid) throw new Error('kind and uid are required');
  const space = tree.project.space;
  const resolve = (field, raw) => optionValue({ node, space, command: `web.team.xiangmuguanli.${command}`, field, raw, projectUid: tree.project.place_uid, uid: tree.avatar?.uid || '' });
  const fields = pmFieldsFor(kind, {
    title, content,
    begin_time: beginTime, end_time: endTime,
    report_type: reportType ? await resolve('report_type', reportType) : '',
    score: score ? await resolve('score', score) : '',
    feedback_status: feedbackStatus ? await resolve('feedback_status', feedbackStatus) : '',
  });
  if (!Object.keys(fields).length) throw new Error('no fields to update');
  const sessid = '';
  const item = (tree[kind + 's'] || []).find((x) => x.uid === uid) || {};
  await pmAction({ node, space: tree.project.space, command: `web.team.xiangmuguanli.${command}`, action: 'modify', uid, fields, projectUid: tree.project.place_uid, actorUid: tree.avatar.uid, sessid, extra: { ...normalizeUidOptions(item), ...normalizeUidOptions(uidOptions) } });
  return { kind, uid, fields };
}

export async function pmRemoveItem({ node, avatarUid = '', kind = '', uid = '', uidOptions = {} } = {}) {
  const tree = await pmList({ node, avatarUid });
  if (!tree.project?.space) throw new Error('avatar has no project');
  const commands = { target: 'target', plan: 'plan', task: 'task', report: 'report', feedback: 'feedback' };
  const command = commands[kind];
  if (!command || !uid) throw new Error('kind and uid are required');
  const sessid = '';
  const item = (tree[kind + 's'] || []).find((x) => x.uid === uid) || {};
  await pmAction({ node, space: tree.project.space, command: `web.team.xiangmuguanli.${command}`, action: 'remove', uid, projectUid: tree.project.place_uid, actorUid: tree.avatar.uid, sessid, method: 'DELETE', extra: { ...normalizeUidOptions(item), ...normalizeUidOptions(uidOptions) } });
  return { kind, uid, deleted: true };
}

export async function pmActItem({ node, avatarUid = '', kind = '', uid = '', action = '', uidOptions = {} } = {}) {
  const tree = await pmList({ node, avatarUid });
  if (!tree.project?.space) throw new Error('avatar has no project');
  const commands = { target: 'target', plan: 'plan', task: 'task', report: 'report', feedback: 'feedback' };
  const command = commands[kind];
  if (!command || !uid || !action) throw new Error('kind/uid/action are required');
  const sessid = '';
  const item = tree[kind + 's']?.find((x) => x.uid === uid) || {};
  await pmAction({ node, space: tree.project.space, command: `web.team.xiangmuguanli.${command}`, action, uid, projectUid: tree.project.place_uid, actorUid: tree.avatar.uid, sessid, extra: { ...normalizeUidOptions(item), ...normalizeUidOptions(uidOptions) } });
  return { kind, uid, action };
}

export async function freePort({ node = 0, start = 9188 } = {}) {
  const used = new Set((await listNodes()).map((n) => Number(n.port)));
  const listen = (p) => new Promise((resolve) => {
    const srv = net.createServer();
    srv.once('error', () => resolve(false));
    srv.once('listening', () => srv.close(() => resolve(true)));
    srv.listen(p, '127.0.0.1');
  });
  const base = Math.max(1, Math.min(65535, Number(start) || 9188));
  for (let p = base; p < Math.min(65535, base + 200); p++) {
    if (used.has(p)) continue;
    if (await listen(p)) return { port: p, dir: `~/ContextOS-${p}` };
  }
  throw new Error(`no free port after ${base}`);
}

export async function seedProject({ node, avatarUid = '' } = {}) {
  const before = await pmList({ node, avatarUid, lang: 'zh' });
  if (!before.project?.space) throw new Error('avatar has no project');
  if ((before.targets || []).length) return { skipped: true, targets: before.targets.length };
  const make = async (kind, title, content, extra = {}) => pmCreateItem({ node, avatarUid, kind, title, content, ...extra });
  const t1 = await make('target', '个人效率与日常任务', '用数字分身管理每周目标、计划、任务、报告和反馈，形成可复盘的个人工作流。');
  const p1 = await make('plan', '本周执行计划', '完成日常任务并提交日报，周内复盘。', { targetUid: t1.uid, beginTime: new Date().toISOString().slice(0, 10), endTime: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10) });
  const k1 = await make('task', '梳理本周任务清单', '列出本周 5 个关键任务并排优先级。', { planUid: p1.uid });
  const r1 = await make('report', '本周任务清单报告', '任务清单、优先级和完成情况。', { taskUid: k1.uid });
  await make('feedback', '清单反馈', '任务数量合理，建议补充验收标准。', { reportUid: r1.uid, score: '5', feedbackStatus: 'canFinish' });
  const k2 = await make('task', '完成两次深度工作', '每天安排一次 90 分钟深度工作。', { planUid: p1.uid });
  const r2 = await make('report', '深度工作日报', '记录两次深度工作的产出和中断点。', { taskUid: k2.uid });
  await make('feedback', '深度工作反馈', '继续保持，减少会议打断。', { reportUid: r2.uid, score: '4', feedbackStatus: 'canFinish' });
  const t2 = await make('target', 'ContextOS 产品发布', '完成产品演示、交付文档和发布验收。');
  const p2 = await make('plan', '发布准备计划', '准备演示、文档和发布检查清单。', { targetUid: t2.uid, beginTime: new Date().toISOString().slice(0, 10), endTime: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10) });
  const k3 = await make('task', '准备产品演示', '整理 10 分钟演示脚本与数据。', { planUid: p2.uid });
  const r3 = await make('report', '演示脚本报告', '脚本、截图和演示环境说明。', { taskUid: k3.uid });
  await make('feedback', '演示反馈', '演示路径清晰，补充异常场景。', { reportUid: r3.uid, score: '5', feedbackStatus: 'canFinish' });
  const t3 = await make('target', '赛博世界场景验证', '验证场景切换、背景与设备发现联动。');
  const p3 = await make('plan', '设备接入验证', '检查 WiFi、蓝牙和 ContextOS 节点发现。', { targetUid: t3.uid, beginTime: new Date().toISOString().slice(0, 10), endTime: new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10) });
  const k4 = await make('task', '发现周边设备', '记录设备清单与连接方式。', { planUid: p3.uid });
  const r4 = await make('report', '设备发现报告', '设备类型、数量和可控性说明。', { taskUid: k4.uid });
  await make('feedback', '设备发现反馈', '发现能力可用，控制能力待补齐。', { reportUid: r4.uid, score: '4', feedbackStatus: 'shouldImprove' });
  const t4 = await make('target', '客户交付与验收', '把交付、验收、整改串成一条可追溯的链路。');
  const p4 = await make('plan', '交付准备', '清单、环境、演示脚本一次备齐。', { targetUid: t4.uid, beginTime: new Date().toISOString().slice(0, 10), endTime: new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10) });
  const k5 = await make('task', '整理交付清单', '列出交付物、责任人和验收标准。', { planUid: p4.uid });
  const r5 = await make('report', '交付清单周报', '本周完成 8 项交付物梳理，2 项待确认。', { taskUid: k5.uid, reportType: 'weekly' });
  await make('feedback', '交付清单反馈', '清单完整，验收标准需量化。', { reportUid: r5.uid, score: '5', feedbackStatus: 'canFinish' });
  const k6 = await make('task', '客户验收演示', '10 分钟演示脚本与现场问答。', { planUid: p4.uid });
  const r6 = await make('report', '验收演示季报', '演示通过，客户提出 3 条整改意见。', { taskUid: k6.uid, reportType: 'quarterly' });
  await make('feedback', '演示反馈', '节奏偏快，异常场景要补。', { reportUid: r6.uid, score: '3', feedbackStatus: 'shouldImprove' });
  return { skipped: false, targets: 4, plans: 4, tasks: 6, reports: 6, feedbacks: 6 };
}

export async function projectStatus({ node, avatarUid = '' } = {}) {
  const tree = await pmList({ node, avatarUid, lang: 'zh' });
  if (!tree.avatar) throw new Error('avatar not found');
  return {
    avatar: tree.avatar,
    project: tree.project,
    counts: { target: String(tree.targets.length), plan: String(tree.plans.length), task: String(tree.tasks.length), report: String(tree.reports.length), feedback: String(tree.feedbacks.length) },
  };
}
