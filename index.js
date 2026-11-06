import fs from 'node:fs/promises';
import fsp from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import { AsyncLocalStorage } from 'node:async_hooks';
import { fileURLToPath } from 'node:url';

/**
 * ContextOS DevOps core.
 *
 * Every mutation goes through ContextOS' own HTTP API (SPEC-CICD.md §0.2,
 * USER-API.md §7/§8) or through the documented node bootstrap
 * (`bin/ice.bin serve start`, SPEC-CICD.md §2). No shell wrapping, no private
 * storage formats; node directories stay siblings of the main checkout.
 */

const DAY = /\d{8}/;

function ctxRoot() {
  return process.env.CTX_ROOT || path.join(os.homedir(), 'ContextOS');
}

function stateDir() {
  return process.env.CTX_DEVOPS_STATE || path.join(process.env.DSH_HOME || path.join(os.homedir(), '.dsh'), 'contextos-devops-dsh');
}


/** 插件用到的数据文件（JSON）清单。 */
async function listDataFiles() {
  const dir = stateDir();
  const out = [];
  try {
    const names = await fs.readdir(dir);
    for (const name of names) {
      try {
        const st = await fs.stat(path.join(dir, name));
        out.push({ name, size: st.size, mtime: st.mtime.toISOString() });
      } catch { /* skip */ }
    }
  } catch { /* dir missing */ }
  out.sort((a, b) => a.name.localeCompare(b.name));
  return { dir, files: out };
}

/** 读取插件数据文件内容（仅限 state 目录内、单文件 512KB 以内）。 */
async function readDataFile({ name = '' } = {}) {
  const safe = path.basename(String(name));
  if (!safe || safe !== String(name) || !/^[A-Za-z0-9._-]+$/.test(safe)) throw new Error('invalid file name');
  const full = path.join(stateDir(), safe);
  const st = await fs.stat(full);
  if (!st.isFile()) throw new Error('not a file');
  if (st.size > 512 * 1024) throw new Error('file too large');
  return { name: safe, size: st.size, content: await fs.readFile(full, 'utf8') };
}

/** 把旧版状态目录迁移到新目录（一次性）。 */
let STATE_MIGRATED = false;
async function migrateStateOnce() {
  if (STATE_MIGRATED) return;
  STATE_MIGRATED = true;
  try {
    const dir = stateDir();
    const home = process.env.DSH_HOME || path.join(os.homedir(), '.dsh');
    const old = path.join(home, 'contextos-devops');
    if (old !== dir && fsp.existsSync(old) && !fsp.existsSync(dir)) await fs.rename(old, dir);
  } catch { /* keep old */ }
}

const USER_CACHE = new Map();
let USERS_LOADED = false;

function usersFile() {
  return path.join(stateDir(), 'users.json');
}

async function loadUsers() {
  if (USERS_LOADED) return;
  USERS_LOADED = true;
  try {
    const raw = JSON.parse(await fs.readFile(usersFile(), 'utf8'));
    for (const [port, value] of Object.entries(raw || {})) {
      if (value && value.uid) USER_CACHE.set(Number(port), value);
    }
  } catch { /* first run */ }
}

async function saveUsers() {
  await fs.mkdir(stateDir(), { recursive: true });
  const out = {};
  for (const [port, value] of USER_CACHE.entries()) out[String(port)] = value;
  await fs.writeFile(usersFile(), JSON.stringify(out, null, 2));
}
function avatarsFile() {
  return path.join(stateDir(), 'avatars.json');
}

async function readAvatars() {
  try { return JSON.parse(await fs.readFile(avatarsFile(), 'utf8')) || {}; } catch { return {}; }
}

async function writeAvatars(state) {
  await fs.mkdir(stateDir(), { recursive: true });
  await fs.writeFile(avatarsFile(), JSON.stringify(state, null, 2));
}

async function defaultAvatar(node) {
  const uid = await ensureUser(node);
  return {
    id: uid,
    uid,
    username: `dsh_copilot_${node}`,
    name: '我的分身',
    city: '深圳市',
    company: '云轩领航',
    persona: '专业、稳重、直接',
    preferences: '技术、产品、效率',
    style: '简洁、结构化',
    bio: '',
    created: new Date().toISOString(),
  };
}

async function listAvatars({ node } = {}) {
  const port = String(Number(node));
  const state = await readAvatars();
  let bucket = state[port];
  if (!bucket || !Array.isArray(bucket.items) || !bucket.items.length) {
    const first = await defaultAvatar(node);
    bucket = { active: first.uid, items: [first] };
    state[port] = bucket;
    await writeAvatars(state);
  }
  let changed = false;
  for (const item of bucket.items) {
    if (!item.persona) { item.persona = '专业、稳重、直接'; changed = true; }
    if (!item.preferences) { item.preferences = '技术、产品、效率'; changed = true; }
    if (!item.style) { item.style = '简洁、结构化'; changed = true; }
  }
  const activeItem = bucket.items.find((x) => x.uid === bucket.active) || bucket.items[0];
  if (activeItem && (!activeItem.project || !activeItem.project.place_uid) && !activeItem.project?.error) {
    try {
      activeItem.project = await createProjectForAvatar(node, activeItem);
    } catch (e) {
      activeItem.project = { error: String(e?.message || e) };
    }
    changed = true;
  }
  if (changed) await writeAvatars(state);
  return { active: bucket.active || bucket.items[0]?.uid || '', items: bucket.items };
}

async function createProjectForAvatar(node, avatar) {
  const spaces = await listSpaces({ node });
  const space = spaces.find((s) => s.name === '20240724-enterprise')
    || spaces.find((s) => s.name.endsWith('-enterprise'))
    || spaces.find((s) => s.status === 'start');
  if (!space) return { error: 'no enterprise/space available' };
  await warmSpace({ node, space: space.name });
  const r = await createInstance({
    node,
    space: space.name,
    command: 'web.team.xiangmuguanli.portal',
    place: 'project_name',
    name: `${avatar.name} 的项目管理`,
    city: avatar.city || '深圳市',
    company: avatar.company || '云轩领航',
    uid: avatar.uid,
  });
  return { space: r.space, command: r.command, place_uid: r.place_uid, name: r.name, created: true };
}

async function pmDbPath(node, project) {
  const n = (await listNodes()).find((x) => x.port === Number(node));
  return n ? path.join(n.dir, 'usr', 'local', 'work', project.space, 'var', 'db', 'xiangmuguanli.db') : '';
}

async function pmRows(db, sql) {
  if (!db || !fsp.existsSync(db)) return [];
  const r = await runShell(`/usr/bin/sqlite3 -json ${JSON.stringify(db)} ${JSON.stringify(sql)}`, process.cwd(), { timeoutMs: 5000 }).catch(() => null);
  if (!r || r.code !== 0 || !String(r.out || '').trim()) return [];
  try { return JSON.parse(r.out); } catch { return []; }
}

const PLAN_STATUS = ['created', 'submited', 'approved', 'process', 'finished', 'canceled', 'rejected'];
const TASK_STATUS = ['created', 'process', 'finished', 'canceled'];
const FB_STATUS = ['canFinish', 'shouldImprove'];
const REPORT_TYPE = ['issue', 'daily', 'weekly', 'monthly', 'quarterly', 'annual'];

function pmActionNamesBase(kind, item) {
  if (kind === 'target') return ['planCreate', 'modify', 'remove'];
  if (kind === 'plan') {
    switch (Number(item.status)) {
      case 0: return ['submit', 'modify', 'remove'];
      case 1: return ['approve', 'reject'];
      case 2: return ['process'];
      case 3: return ['taskCreate', 'finish', 'cancel'];
      default: return [];
    }
  }
  if (kind === 'task') {
    switch (Number(item.status)) {
      case 0: return ['process', 'handover', 'modify', 'remove'];
      case 1: return ['reportCreate', 'handover', 'finish', 'cancel'];
      default: return [];
    }
  }
  if (kind === 'report') return ['feedbackCreate', 'modify', 'remove'];
  if (kind === 'feedback') return ['modify', 'remove'];
  return [];
}

function pmActionNames(kind, item) {
  const actions = pmActionNamesBase(kind, item) || [];
  for (const action of ['modify', 'remove']) if (!actions.includes(action)) actions.push(action);
  return actions;
}

const PM_TRANS_CACHE = new Map();
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
async function pmTranslations({ node, space, projectUid, uid }) {
  const key = `${node}:${space}`;
  const hit = PM_TRANS_CACHE.get(key);
  if (hit && Date.now() - hit.at < 60000) return hit.data;
  const r = await http(node, `/s/${encode(space)}/c/web.team.xiangmuguanli.target?project_uid=${encode(projectUid)}&user.uid=${encode(uid)}`, { timeout: 12000, headers: { accept: 'text/html', 'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/131.0 Safari/537.36' } });
  const data = { status: grabTransMap(r.text, 'status'), feedback_status: grabTransMap(r.text, 'feedback_status'), report_type: grabTransMap(r.text, 'report_type') };
  PM_TRANS_CACHE.set(key, { at: Date.now(), data });
  return data;
}

async function pmList({ node, avatarUid = '', lang = 'zh' } = {}) {
  const avatars = await listAvatars({ node });
  const avatar = (avatars.items || []).find((x) => x.uid === (avatarUid || avatars.active));
  if (!avatar) throw new Error('avatar not found');
  const project = avatar.project;
  if (!project?.place_uid) return { avatar, project: null, targets: [], plans: [], tasks: [], reports: [], feedbacks: [] };
  const db = await pmDbPath(node, project);
  const projectUid = project.place_uid;
  const trans = lang === 'zh' ? await pmTranslations({ node, space: project.space, projectUid, uid: avatar.uid }).catch(() => ({ status: {}, feedback_status: {}, report_type: {} })) : { status: {}, feedback_status: {}, report_type: {} };
  const targets = await pmRows(db, `select uid,title,content,created_at from targets where project_uid='${projectUid}' order by id desc`);
  const plans = await pmRows(db, `select uid,title,content,status,begin_time,end_time,target_uid,created_at from plans where project_uid='${projectUid}' order by id desc`);
  const tasks = await pmRows(db, `select uid,title,content,status,plan_uid,created_at from tasks where project_uid='${projectUid}' order by id desc`);
  const reports = await pmRows(db, `select uid,title,content,type,task_uid,address,latitude,longitude,created_at from reports where project_uid='${projectUid}' order by id desc`);
  const feedbacks = await pmRows(db, `select uid,title,content,status,score,report_uid,created_at from feedbacks where project_uid='${projectUid}' order by id desc`);
  for (const p of plans) p.status_name = PLAN_STATUS[p.status] || String(p.status);
  for (const t of tasks) t.status_name = TASK_STATUS[t.status] || String(t.status);
  for (const f of feedbacks) f.status_name = FB_STATUS[f.status] || String(f.status);
  for (const r of reports) r.type_name = REPORT_TYPE[r.type] || String(r.type);
  for (const p of plans) p.status_label = lang === 'zh' ? (trans.status[p.status_name] || p.status_name) : p.status_name;
  for (const k of tasks) k.status_label = lang === 'zh' ? (trans.status[k.status_name] || k.status_name) : k.status_name;
  for (const f of feedbacks) f.status_label = lang === 'zh' ? (trans.feedback_status[f.status_name] || f.status_name) : f.status_name;
  for (const r of reports) r.type_label = lang === 'zh' ? (trans.report_type[r.type_name] || r.type_name) : r.type_name;
  for (const f of feedbacks) f.actions = pmActionNames('feedback', f);
  for (const r of reports) r.actions = pmActionNames('report', r);
  for (const t of tasks) t.actions = pmActionNames('task', t);
  for (const p of plans) p.actions = pmActionNames('plan', p);
  for (const t of targets) t.actions = pmActionNames('target', t);
  for (const f of feedbacks) f.reports = undefined;
  for (const r of reports) r.feedbacks = feedbacks.filter((f) => f.report_uid === r.uid);
  for (const t of tasks) t.reports = reports.filter((r) => r.task_uid === t.uid);
  for (const p of plans) p.tasks = tasks.filter((t) => t.plan_uid === p.uid);
  for (const t of targets) t.plans = plans.filter((p) => p.target_uid === t.uid);
  return { avatar, project, targets, plans, tasks, reports, feedbacks };
}

async function pmCreateItem({ node, avatarUid = '', kind = '', title = '', content = '', targetUid = '', planUid = '', taskUid = '', reportUid = '', beginTime = '', endTime = '', reportType = 'daily', score = '5', feedbackStatus = 'canFinish' } = {}) {
  const tree = await pmList({ node, avatarUid });
  if (!tree.project?.space) throw new Error('avatar has no project');
  const project = tree.project;
  const avatar = tree.avatar;
  let sessid = '';
  try { sessid = await avatarSession(node, avatar); } catch { /* optional */ }
  const base = { node, space: project.space, projectUid: project.place_uid, actorUid: avatar.uid, sessid };
  const tid = targetUid || tree.targets[0]?.uid || '';
  const pid = planUid || tree.plans[0]?.uid || '';
  const kid = taskUid || tree.tasks[0]?.uid || '';
  const rid = reportUid || tree.reports[0]?.uid || '';
  if (kind === 'target') {
    const uid = await pmCreate({ ...base, command: 'web.team.xiangmuguanli.target', fields: { title: title || '新目标', content }, uid: avatar.uid });
    return { kind, uid };
  }
  if (kind === 'plan') {
    if (!tid) throw new Error('plan needs a target');
    await pmAction({ ...base, command: 'web.team.xiangmuguanli.target', action: 'planCreate', uid: tid, fields: { title: title || '新计划', content, begin_time: beginTime || new Date().toISOString().slice(0, 10), end_time: endTime || new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10) } });
    const after = await pmList({ node, avatarUid: avatar.uid });
    const created = (after.plans || []).find((p) => p.target_uid === tid && p.title === (title || '新计划')) || (after.plans || []).find((p) => p.target_uid === tid);
    return { kind, uid: created?.uid || '' };
  }
  if (kind === 'task') {
    if (!pid) throw new Error('task needs a plan');
    for (const action of ['submit', 'approve', 'process']) {
      try { await pmAction({ ...base, command: 'web.team.xiangmuguanli.plan', action, uid: pid }); } catch { /* gate checked server-side */ }
    }
    await pmAction({ ...base, command: 'web.team.xiangmuguanli.plan', action: 'taskCreate', uid: pid, fields: { title: title || '新任务', content } });
    const after = await pmList({ node, avatarUid: avatar.uid });
    const created = (after.tasks || []).find((t) => t.plan_uid === pid && t.title === (title || '新任务')) || (after.tasks || []).find((t) => t.plan_uid === pid);
    return { kind, uid: created?.uid || '' };
  }
  if (kind === 'report') {
    if (!kid) throw new Error('report needs a task');
    const parentPlan = tree.tasks.find((t) => t.uid === kid)?.plan_uid || '';
    try { await pmAction({ ...base, command: 'web.team.xiangmuguanli.task', action: 'process', uid: kid, planUid: parentPlan }); } catch { /* gate checked server-side */ }
    await pmAction({ ...base, command: 'web.team.xiangmuguanli.task', action: 'reportCreate', uid: kid, fields: { report_type: reportType, title: title || '进度报告', content }, planUid: parentPlan, taskUid: kid });
    const after = await pmList({ node, avatarUid: avatar.uid });
    const created = (after.reports || []).find((r) => r.task_uid === kid && r.title === (title || '进度报告')) || (after.reports || []).find((r) => r.task_uid === kid);
    return { kind, uid: created?.uid || '' };
  }
  if (kind === 'feedback') {
    if (!rid) throw new Error('feedback needs a report');
    const parentTask = tree.reports.find((r) => r.uid === rid)?.task_uid || '';
    await pmAction({ ...base, command: 'web.team.xiangmuguanli.report', action: 'feedbackCreate', uid: rid, fields: { title: title || '反馈', content, score, feedback_status: feedbackStatus }, taskUid: parentTask });
    const after = await pmList({ node, avatarUid: avatar.uid });
    const created = (after.feedbacks || []).find((f) => f.report_uid === rid) || (after.feedbacks || [])[0];
    return { kind, uid: created?.uid || '' };
  }
  throw new Error('kind must be target/plan/task/report/feedback');
}

async function pmModifyItem({ node, avatarUid = '', kind = '', uid = '', title = '', content = '', beginTime = '', endTime = '', reportType = '', score = '', feedbackStatus = '' } = {}) {
  const tree = await pmList({ node, avatarUid });
  if (!tree.project?.space) throw new Error('avatar has no project');
  const commands = { target: 'target', plan: 'plan', task: 'task', report: 'report', feedback: 'feedback' };
  const command = commands[kind];
  if (!command || !uid) throw new Error('kind and uid are required');
  const fields = {};
  if (title) fields.title = title;
  if (content) fields.content = content;
  if (beginTime) fields.begin_time = beginTime;
  if (endTime) fields.end_time = endTime;
  if (reportType) fields.report_type = reportType;
  if (score) fields.score = score;
  if (feedbackStatus) fields.feedback_status = feedbackStatus;
  if (!Object.keys(fields).length) throw new Error('no fields to update');
  let sessid = '';
  try { sessid = await avatarSession(node, tree.avatar); } catch { /* optional */ }
  await pmAction({ node, space: tree.project.space, command: `web.team.xiangmuguanli.${command}`, action: 'modify', uid, fields, projectUid: tree.project.place_uid, actorUid: tree.avatar.uid, sessid });
  return { kind, uid, fields };
}

async function pmRemoveItem({ node, avatarUid = '', kind = '', uid = '' } = {}) {
  const tree = await pmList({ node, avatarUid });
  if (!tree.project?.space) throw new Error('avatar has no project');
  const commands = { target: 'target', plan: 'plan', task: 'task', report: 'report', feedback: 'feedback' };
  const command = commands[kind];
  if (!command || !uid) throw new Error('kind and uid are required');
  let sessid = '';
  try { sessid = await avatarSession(node, tree.avatar); } catch { /* optional */ }
  await pmAction({ node, space: tree.project.space, command: `web.team.xiangmuguanli.${command}`, action: 'remove', uid, projectUid: tree.project.place_uid, actorUid: tree.avatar.uid, sessid, method: 'DELETE' });
  return { kind, uid, deleted: true };
}

async function pmActItem({ node, avatarUid = '', kind = '', uid = '', action = '' } = {}) {
  const tree = await pmList({ node, avatarUid });
  if (!tree.project?.space) throw new Error('avatar has no project');
  const commands = { target: 'target', plan: 'plan', task: 'task', report: 'report', feedback: 'feedback' };
  const command = commands[kind];
  if (!command || !uid || !action) throw new Error('kind/uid/action are required');
  let sessid = '';
  try { sessid = await avatarSession(node, tree.avatar); } catch { /* optional */ }
  const item = tree[kind + 's']?.find((x) => x.uid === uid) || {};
  await pmAction({ node, space: tree.project.space, command: `web.team.xiangmuguanli.${command}`, action, uid, projectUid: tree.project.place_uid, actorUid: tree.avatar.uid, sessid, planUid: item.plan_uid || '', taskUid: item.task_uid || '' });
  return { kind, uid, action };
}

async function seedProject({ node, avatarUid = '' } = {}) {
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

async function projectStatus({ node, avatarUid = '' } = {}) {
  const avatars = await listAvatars({ node });
  const avatar = (avatars.items || []).find((x) => x.uid === (avatarUid || avatars.active));
  if (!avatar) throw new Error('avatar not found');
  const project = avatar.project;
  let sessid = '';
  try { sessid = await avatarSession(node, avatar); } catch { /* optional */ }
  if (!project?.space || !project?.place_uid) return { avatar, project: null, counts: {}, message: '该分身还没有项目管理实例' };
  const base = `web.team.xiangmuguanli.`;
  const commands = ['target', 'plan', 'task', 'report', 'feedback'];
  const counts = {};
  for (const cmd of commands) {
    const r = await http(node, `/s/${encode(project.space)}/c/${base}${cmd}?project_uid=${encode(project.place_uid)}&user.uid=${encode(avatar.uid)}${sessid ? `&sessid=${encode(sessid)}` : ''}`, { timeout: 12000 });
    let count = '';
    try {
      const env = JSON.parse(r.text);
      const status = JSON.parse(env._status?.[0] || '[]');
      count = status.find((x) => x.name === 'count')?.value || '';
    } catch { /* table */ }
    counts[cmd] = count;
  }
  // App list endpoints filter by the logged-in MSG_USERUID, not the query uid;
  // when a non-login avatar gets 0x0, count its project rows in the space DB.
  if (commands.every((cmd) => /^0x0$/.test(counts[cmd] || ''))) {
    const n = (await listNodes()).find((x) => x.port === Number(node));
    const db = n ? path.join(n.dir, 'usr', 'local', 'work', project.space, 'var', 'db', 'xiangmuguanli.db') : '';
    if (db && fsp.existsSync(db)) {
      const tables = { target: 'targets', plan: 'plans', task: 'tasks', report: 'reports', feedback: 'feedbacks' };
      for (const [key, table] of Object.entries(tables)) {
        const r = await runShell(`/usr/bin/sqlite3 ${JSON.stringify(db)} "select count(*) from ${table} where project_uid='${project.place_uid}'"`, process.cwd(), { timeoutMs: 4000 }).catch(() => null);
        if (r && r.code === 0) counts[key] = String((r.out || '0').trim() || 0);
      }
    }
  }
  return { avatar, project, counts };
}

async function createAvatar({ node, name = '', city = '深圳市', company = '云轩领航', persona = '', preferences = '', style = '', bio = '' } = {}) {
  const port = String(Number(node));
  const state = await readAvatars();
  const bucket = state[port] || (state[port] = { active: '', items: [] });
  const username = `dsh_avatar_${port}_${Date.now().toString(36)}`;
  const r = await http(node, `/c/aaa.user/action/create/userrole/tech/username/${encode(username)}/usernick/${encode(name || '我的分身')}`, { method: 'PUT', timeout: 15000 });
  if (r.status !== 200) throw new Error(`create avatar user failed: HTTP ${r.status}`);
  const uid = r.text.trim();
  if (!/^[0-9a-f]{32}$/i.test(uid)) throw new Error(`create avatar returned no uid: ${r.text.slice(0, 120)}`);
  const item = {
    id: uid, uid, username,
    name: name || `分身 ${bucket.items.length + 1}`,
    city: city || '深圳市', company: company || '云轩领航',
    persona: persona || '专业、亲和',
    preferences: preferences || '', style: style || '简洁、直接', bio: bio || '',
    created: new Date().toISOString(),
  };
  bucket.items.push(item);
  if (!bucket.active) bucket.active = uid;
  state[port] = bucket;
  await writeAvatars(state);
  try {
    item.project = await createProjectForAvatar(node, item);
    await writeAvatars(state);
  } catch (e) {
    item.project = { error: String(e?.message || e) };
    await writeAvatars(state);
  }
  return item;
}

async function setAvatar({ node, uid } = {}) {
  const port = String(Number(node));
  const state = await readAvatars();
  const bucket = state[port];
  if (!bucket || !bucket.items.some((x) => x.uid === uid)) throw new Error('avatar not found');
  bucket.active = uid;
  await writeAvatars(state);
  return bucket;
}

async function updateAvatar({ node, uid, patch = {} } = {}) {
  const port = String(Number(node));
  const state = await readAvatars();
  const bucket = state[port];
  const item = bucket?.items?.find((x) => x.uid === uid);
  if (!item) throw new Error('avatar not found');
  for (const key of ['name', 'city', 'company', 'persona', 'preferences', 'style', 'bio', 'image']) {
    if (typeof patch[key] === 'string' && patch[key].trim()) item[key] = patch[key].trim();
  }
  if (Array.isArray(patch.skills)) item.skills = patch.skills.filter((x) => typeof x === 'string' && x.trim()).slice(0, 20);
  await writeAvatars(state);
  return item;
}

async function deleteAvatar({ node, uid } = {}) {
  const port = String(Number(node));
  const state = await readAvatars();
  const bucket = state[port];
  if (!bucket) return { deleted: false };
  bucket.items = bucket.items.filter((x) => x.uid !== uid);
  if (!bucket.items.length) {
    const first = await defaultAvatar(node);
    bucket.items = [first];
    bucket.active = first.uid;
  } else if (bucket.active === uid) {
    bucket.active = bucket.items[0].uid;
  }
  await writeAvatars(state);
  return bucket;
}

/* ── 我的背景：每个用户可以建任意多个背景，每个背景可上传一张照片作为赛博世界 ── */
function backgroundsFile() {
  return path.join(stateDir(), 'backgrounds.json');
}
async function readBackgrounds() {
  try { return JSON.parse(await fs.readFile(backgroundsFile(), 'utf8')) || {}; } catch { return {}; }
}
async function writeBackgrounds(state) {
  await fs.mkdir(stateDir(), { recursive: true });
  await fs.writeFile(backgroundsFile(), JSON.stringify(state, null, 2));
}
const DEFAULT_BACKGROUND = { id: 'default', name: '默认赛博世界', image: '', builtin: true };

async function listBackgrounds({ node } = {}) {
  const port = String(Number(node));
  const state = await readBackgrounds();
  let bucket = state[port];
  if (!bucket || !Array.isArray(bucket.items) || !bucket.items.length) {
    bucket = { active: DEFAULT_BACKGROUND.id, items: [{ ...DEFAULT_BACKGROUND }] };
    state[port] = bucket;
    await writeBackgrounds(state);
  }
  return { active: bucket.active || bucket.items[0].id, items: bucket.items };
}
async function createBackground({ node, name = '' } = {}) {
  const port = String(Number(node));
  const state = await readBackgrounds();
  const bucket = state[port] || (state[port] = { active: '', items: [] });
  const item = { id: `bg_${Date.now().toString(36)}`, name: name || `背景 ${bucket.items.length + 1}`, image: '', params: {}, created: new Date().toISOString() };
  bucket.items.push(item);
  bucket.active = item.id;
  await writeBackgrounds(state);
  return { active: bucket.active, items: bucket.items, created: item };
}
async function setBackground({ node, id } = {}) {
  const port = String(Number(node));
  const state = await readBackgrounds();
  const bucket = state[port];
  if (!bucket || !bucket.items.some((x) => x.id === id)) throw new Error('background not found');
  bucket.active = id;
  await writeBackgrounds(state);
  return bucket;
}
async function updateBackground({ node, id, patch = {} } = {}) {
  const port = String(Number(node));
  const state = await readBackgrounds();
  const bucket = state[port];
  const item = bucket?.items?.find((x) => x.id === id);
  if (!item) throw new Error('background not found');
  for (const k of ['name', 'image']) if (patch[k] !== undefined) item[k] = patch[k];
  if (patch.params && typeof patch.params === 'object') {
    const p = item.params || (item.params = {});
    for (const k of ['theme', 'lang', 'timezone', 'location']) {
      if (patch.params[k] !== undefined) p[k] = String(patch.params[k] || '');
    }
  }
  await writeBackgrounds(state);
  return bucket;
}
async function deleteBackground({ node, id } = {}) {
  const port = String(Number(node));
  const state = await readBackgrounds();
  const bucket = state[port];
  if (!bucket) return { deleted: false };
  bucket.items = bucket.items.filter((x) => x.id !== id);
  if (!bucket.items.length) bucket.items = [{ ...DEFAULT_BACKGROUND }];
  if (bucket.active === id || !bucket.items.some((x) => x.id === bucket.active)) bucket.active = bucket.items[0].id;
  await writeBackgrounds(state);
  return bucket;
}


/** 把头像/背景图落到节点磁盘，并写入 web.team.gonganxitong.user（avatar/background 列）。 */
async function saveUserMedia({ node, uid = '', kind = 'avatar', dataUrl = '', name = '' } = {}) {
  if (!uid) throw new Error('uid is required');
  const m = /^data:image\/([a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=\s]+)$/.exec(String(dataUrl || ''));
  if (!m) throw new Error('invalid image data url');
  const ext = m[1] === 'jpeg' ? 'jpg' : m[1].replace(/[^a-zA-Z0-9]/g, '') || 'jpg';
  const nodes = await listNodes();
  const n = nodes.find((x) => Number(x.port) === Number(node));
  if (!n?.dir) throw new Error('node not found');
  const dir = path.join(n.dir, 'var', 'media');
  await fs.mkdir(dir, { recursive: true });
  const file = `${uid}-${kind}.${ext}`;
  await fs.writeFile(path.join(dir, file), Buffer.from(m[2].replace(/\s/g, ''), 'base64'));
  const rel = `var/media/${file}`;
  const field = kind === 'background' ? 'background' : 'avatar';
  let updated = false;
  try {
    const spaces = await listSpaces({ node });
    const space = spaces.find((x) => /-community$/.test(x.name)) || spaces[0];
    if (space?.name) {
      const base = `/s/${space.name}/c/web.team.gonganxitong.user/action`;
      // upsert 档案行（open_id = 分身 uid），再补 background/avatar
      await http(node, `${base}/create?open_id=${encode(uid)}&avatar=${encode(rel)}&usernick=${encode(name || '我的数字分身')}`, { method: 'PUT', timeout: 12000 }).catch(() => null);
      const r = await http(node, `${base}/modify?user_uid=${encode(uid)}&name=${encode(name || '我的数字分身')}&${field}=${encode(rel)}`, { method: 'POST', timeout: 12000 }).catch(() => null);
      updated = !!r && r.status === 200;
    }
  } catch { /* 平台不可用时只落盘 */ }
  return { path: rel, url: `http://127.0.0.1:${node}/p/${rel}`, updated };
}

/** One persistent DSH user per node; created on first request and reused. */
async function ensureUser(node) {
  const port = Number(node);
  if (!port) throw new Error('node is required');
  await loadUsers();
  const found = USER_CACHE.get(port);
  if (found?.uid) return found.uid;
  const username = `dsh_copilot_${port}`;
  const r = await http(port, `/c/aaa.user/action/create/userrole/tech/username/${encode(username)}/usernick/${encode('DSH Copilot')}`, { method: 'PUT', timeout: 15000 });
  if (r.status !== 200) throw new Error(`create user failed: HTTP ${r.status}`);
  const uid = r.text.trim();
  if (!/^[0-9a-f]{32}$/i.test(uid)) throw new Error(`create user returned no uid: ${r.text.slice(0, 120)}`);
  USER_CACHE.set(port, { uid, username, created: new Date().toISOString() });
  await saveUsers();
  return uid;
}

function envelopeRows(text) {
  try {
    const env = JSON.parse(text);
    const columns = Array.isArray(env.append) ? env.append : [];
    const height = columns.length && Array.isArray(env[columns[0]]) ? env[columns[0]].length : 0;
    return { columns, rows: Array.from({ length: height }, (_, i) => Object.fromEntries(columns.map((c) => [c, Array.isArray(env[c]) ? env[c][i] : '']))) };
  } catch {
    return { columns: [], rows: [] };
  }
}

const HOME = () => os.homedir();
const HTTP_DEBUG = new AsyncLocalStorage();

// 节点台账与 macOS 客户端共用一份：~/.contextos/nodes.json（数组格式，字段对齐
// CtxNodeRegistry 的 dictionaryValue：dir/name/port/parent/platform/source/container/image/resident/env）。
function registryPath() {
  return process.env.CTX_NODES_FILE || path.join(HOME(), '.contextos', 'nodes.json');
}

async function readRegistry() {
  let list = [];
  try {
    const d = JSON.parse(await fs.readFile(registryPath(), 'utf8'));
    list = Array.isArray(d) ? d : Array.isArray(d.nodes) ? d.nodes : [];
  } catch {
    /* no registry yet */
  }
  if (list.length) return list;
  // 老版本插件的台账迁移一次
  try {
    const d = JSON.parse(await fs.readFile(path.join(stateDir(), 'nodes.json'), 'utf8'));
    const old = Array.isArray(d.nodes) ? d.nodes : [];
    list = old.map((n) => ({ dir: n.dir, name: n.name, port: n.port, source: 'record', createdAt: n.createdAt }));
  } catch {
    /* nothing to migrate */
  }
  return list;
}

async function writeRegistry(nodes) {
  await fs.mkdir(path.dirname(registryPath()), { recursive: true });
  await fs.writeFile(registryPath(), JSON.stringify(nodes, null, 2));
}

function platformName() {
  const osName = process.platform === 'darwin' ? 'darwin' : process.platform === 'win32' ? 'windows' : 'linux';
  const arch = process.arch === 'arm64' ? 'arm64' : process.arch === 'ia32' ? '386' : 'amd64';
  return `${osName}.${arch}`;
}

/** 从目录名 / ContextOS-<port> 尾部推端口；读 var/log/ice.port 优先。 */
async function portOnDisk(dir) {
  try {
    const p = Number((await fs.readFile(path.join(dir, 'var', 'log', 'ice.port'), 'utf8')).trim());
    if (p > 0 && p <= 65535) return p;
  } catch {
    /* fall through */
  }
  const m = /(\d+)$/.exec(path.basename(dir));
  return m ? Number(m[1]) : 0;
}

/** 磁盘扫描：任何含 bin/ice.bin 的 ~/ContextOS* 目录都是一个节点（对齐 CtxDeployer.scanLocalInstalls）。 */
async function scanLocalNodes() {
  const out = [];
  let subs = [];
  try {
    subs = await fs.readdir(HOME());
  } catch {
    return out;
  }
  for (const sub of subs) {
    if (!/^ContextOS/.test(sub)) continue;
    const dir = path.join(HOME(), sub);
    let st;
    try {
      st = await fs.stat(path.join(dir, 'bin', 'ice.bin'));
      if (!st.isFile()) continue;
    } catch {
      continue;
    }
    out.push({
      dir,
      bin: path.join(dir, 'bin', 'ice.bin'),
      name: sub,
      port: (await portOnDisk(dir)) || 9020,
      source: 'scan',
      platform: platformName(),
      size: st.size,
    });
  }
  return out;
}

async function binExists(node) {
  try {
    return (await fs.stat(node.bin || path.join(node.dir, 'bin', 'ice.bin'))).isFile();
  } catch {
    return false;
  }
}async function pidAlive(dir) {
  try {
    const pid = Number((await fs.readFile(path.join(dir, 'var', 'log', 'ice.pid'), 'utf8')).trim());
    if (!(pid > 1)) return { alive: false, pid: 0 };
    process.kill(pid, 0);
    return { alive: true, pid };
  } catch (e) {
    return { alive: false, pid: 0 };
  }
}


const DEVICE_ADAPTERS = [
  { kind: 'contextos', label: 'ContextOS 节点', supported: true, reason: '' },
  { kind: 'wifi', label: 'WiFi / 局域网', supported: process.platform === 'darwin' || process.platform === 'linux', reason: '' },
  { kind: 'bluetooth', label: '蓝牙', supported: process.platform === 'darwin' || process.platform === 'linux', reason: '' },
  { kind: 'infrared', label: '红外', supported: false, reason: '当前宿主无红外适配器；预留 IR 适配层' },
];

function walkBluetooth(value, out) {
  if (!value || typeof value !== 'object') return;
  if (Array.isArray(value)) { for (const x of value) walkBluetooth(x, out); return; }
  const keys = Object.keys(value);
  const name = value.device_name || value._name || value.name || value.device_title;
  const addr = value.device_address || value.address || value.device_addr;
  if (name || addr) out.push({ name: String(name || addr), address: String(addr || ''), raw: value });
  for (const k of keys) {
    if (typeof value[k] === 'object') walkBluetooth(value[k], out);
  }
}

async function scanWifiNetworks() {
  const candidates = [
    '/System/Library/PrivateFrameworks/Apple80211.framework/Versions/Current/Resources/airport -s 2>/dev/null',
    'airport -s 2>/dev/null',
  ];
  for (const cmd of candidates) {
    const r = await runShell(cmd, process.cwd(), { timeoutMs: 8000 }).catch(() => null);
    if (!r || r.code !== 0 || !String(r.out || '').trim()) continue;
    const rows = [];
    for (const line of r.out.split('\n').slice(1)) {
      const t = line.trim();
      if (!t) continue;
      const m = /^(.*?)\s+([0-9a-f:]{17})\s+(-?\d+)\s+(\d+)(?:\s+.*)?$/i.exec(t);
      if (m) rows.push({ ssid: m[1].trim(), bssid: m[2].toLowerCase(), rssi: Number(m[3]), channel: Number(m[4]) });
    }
    if (rows.length) return rows;
  }
  // 新版 macOS 无 airport：从 system_profiler 的 “Other Local Wi-Fi Networks” 解析
  const prof = await runShell('/usr/sbin/system_profiler SPAirPortDataType 2>/dev/null', process.cwd(), { timeoutMs: 10000 }).catch(() => null);
  if (prof && prof.code === 0) {
    const lines = String(prof.out || '').split('\n');
    const start = lines.findIndex((l) => /Other Local Wi-Fi Networks:/i.test(l));
    const rows = [];
    let cur = null;
    for (let i = start + 1; start >= 0 && i < lines.length; i += 1) {
      const raw = lines[i];
      const t = raw.trim();
      if (!t) continue;
      if (/^[a-z]+\d+:$/.test(t)) break;
      if (/^[A-Za-z].*:$/.test(t) && /^(Interfaces|Current Network|Other Local|Software|AirPort|Wake|AirDrop|Auto|Status)/i.test(t)) break;
      if (/^<redacted>:$/.test(t) || /^.+:$/.test(t) && !/^([A-Z][A-Za-z /]+):/.test(t)) {
        if (cur) rows.push(cur);
        cur = { ssid: /<redacted>/.test(t) ? `网络 ${rows.length + 1}` : t.replace(/:$/, ''), bssid: '', rssi: null, channel: null };
        continue;
      }
      if (!cur) continue;
      const ch = /Channel:\s*(\d+)/i.exec(t); if (ch) cur.channel = Number(ch[1]);
      const sg = /Signal \/ Noise:\s*(-?\d+)/i.exec(t); if (sg) cur.rssi = Number(sg[1]);
    }
    if (cur) rows.push(cur);
    if (rows.length) return rows;
  }
  return [];
}

async function scanBluetoothNearby() {
  const r = await runShell('blueutil --inquiry 5 --format json 2>/dev/null', process.cwd(), { timeoutMs: 12000 }).catch(() => null);
  if (r && r.code === 0 && String(r.out || '').trim()) {
    try {
      const arr = JSON.parse(r.out);
      if (Array.isArray(arr)) return arr.map((d) => ({ name: d.name || d.address || 'BLE', address: d.address || '', rssi: d.rssi ?? null, nearby: true }));
    } catch { /* fall through */ }
  }
  return [];
}

async function scanLanHosts() {
  const r = await runShell('/usr/sbin/arp -a 2>/dev/null', process.cwd(), { timeoutMs: 4000 }).catch(() => null);
  const hosts = [];
  if (r && r.code === 0) {
    for (const line of String(r.out || '').split('\n')) {
      const m = /^(\S+)\s+\(([^)]+)\)\s+at\s+([0-9a-f:]+)/i.exec(line.trim());
      if (!m) continue;
      hosts.push({ ip: m[2], mac: m[3], name: m[1] === '?' ? '' : m[1] });
    }
  }
  return hosts;
}

async function discoverDevices({ node } = {}) {
  const devices = [];
  const adapters = DEVICE_ADAPTERS.map((x) => ({ ...x }));
  const nodes = await listNodes();
  for (const n of nodes) {
    devices.push({
      id: `contextos:${n.port}`,
      name: n.name || `ContextOS-${n.port}`,
      kind: 'contextos',
      address: `127.0.0.1:${n.port}`,
      status: n.state,
      controllable: true,
      meta: { dir: n.dir, env: n.env || '', version: n.version || '' },
    });
  }
  const wifi = await runShell('/usr/sbin/arp -a 2>/dev/null', process.cwd(), { timeoutMs: 4000 }).catch(() => null);
  if (wifi && wifi.code === 0) {
    for (const line of wifi.out.split('\n')) {
      const m = /^(\S+)\s+\(([^)]+)\)\s+at\s+([0-9a-f:]+)/i.exec(line.trim());
      if (!m) continue;
      devices.push({ id: `wifi:${m[2]}:${m[3]}`, name: m[1] === '?' ? `WiFi ${m[2]}` : m[1], kind: 'wifi', address: m[2], status: 'online', controllable: false, meta: { mac: m[3], raw: line.trim() } });
    }
  } else {
    const a = adapters.find((x) => x.kind === 'wifi');
    if (a) { a.supported = false; a.reason = 'arp 不可用或超时'; }
  }
  const bt = await runShell(process.platform === 'darwin' ? 'system_profiler SPBluetoothDataType -json 2>/dev/null' : 'bluetoothctl devices 2>/dev/null', process.cwd(), { timeoutMs: 8000 }).catch(() => null);
  if (bt && bt.code === 0 && bt.out.trim()) {
    let found = [];
    try {
      const json = JSON.parse(bt.out);
      walkBluetooth(json, found);
    } catch {
      for (const line of bt.out.split('\n')) {
        const m = /Device\s+([0-9A-F:]{17})\s+(.+)$/i.exec(line.trim());
        if (m) found.push({ name: m[2], address: m[1] });
      }
    }
    const seen = new Set();
    for (const d of found) {
      const key = `${d.address}:${d.name}`;
      if (seen.has(key)) continue;
      seen.add(key);
      devices.push({ id: `bluetooth:${d.address || d.name}`, name: d.name, kind: 'bluetooth', address: d.address || '', status: 'paired', controllable: false, meta: {} });
    }
  } else {
    const a = adapters.find((x) => x.kind === 'bluetooth');
    if (a) { a.reason = bt ? '蓝牙不可用或超时' : '蓝牙扫描失败'; }
  }
  const [wifiNetworks, btNearby, lanHosts] = await Promise.all([scanWifiNetworks(), scanBluetoothNearby(), scanLanHosts()]);
  return {
    adapters, devices, wifiNetworks, bluetoothNearby: btNearby, lanHosts,
    scannedAt: new Date().toISOString(),
    note: 'macOS 会隐藏未授权的 Wi-Fi 名称（显示为 网络 N）；附近蓝牙需要安装 blueutil；局域网来自 arp 邻居表；ContextOS 节点可控制。',
  };
}

function baseUrl(port) {
  return `http://127.0.0.1:${port}`;
}

function encode(v) {
  return encodeURIComponent(String(v));
}

/** ContextOS answers with plain text tables or a JSON status envelope. */
function parseTable(text) {
  const lines = String(text || '').split('\n').filter((l) => l.trim() !== '');
  if (lines.length === 0) return { columns: [], rows: [] };
  const cut = (line) => line.trim().split(/\s{2,}/);
  const columns = cut(lines[0]);
  const rows = lines.slice(1).map((line) => {
    const cells = cut(line);
    const row = {};
    columns.forEach((c, i) => {
      row[c] = decodeCell(cells[i] ?? '');
    });
    return row;
  });
  return { columns, rows };
}

/** Fixed-width table: use header column offsets, not a 2+ space split. */
function parseFixedTable(text) {
  const lines = String(text || '').split('\n').filter((l) => l.trim() !== '');
  if (lines.length < 1) return { columns: [], rows: [] };
  const header = lines[0];
  const heads = [];
  const starts = [];
  for (const m of header.matchAll(/\S+/g)) {
    heads.push(m[0]);
    starts.push(m.index);
  }
  const rows = lines.slice(1).map((line) => {
    const row = {};
    heads.forEach((head, i) => {
      const start = starts[i];
      const end = i + 1 < starts.length ? starts[i + 1] : line.length;
      row[head] = decodeCell(String(line.slice(start, end)).trim());
    });
    return row;
  });
  return { columns: heads, rows };
}

function decodeCell(v) {
  if (typeof v !== 'string' || !v.includes('%')) return v;
  try {
    return decodeURIComponent(v.replace(/\+/g, ' '));
  } catch {
    return v;
  }
}

async function http(port, pathname, { method = 'GET', timeout = 15000, headers = {} } = {}) {
  const cached = USER_CACHE.get(Number(port));
  if (cached?.uid && !/(?:\?|&)(?:user\.uid|sessid)=/.test(pathname)) {
    pathname += (pathname.includes('?') ? '&' : '?') + 'user.uid=' + encode(cached.uid);
  }
  const fullUrl = baseUrl(port) + pathname;
  HTTP_DEBUG.getStore()?.push({ method, url: fullUrl });
  const res = await fetch(fullUrl, {
    method,
    signal: AbortSignal.timeout(timeout),
    headers: { accept: 'text/plain, application/json', ...headers },
  });
  const text = await res.text();
  return { status: res.status, size: Buffer.byteLength(text), text };
}

/** Iron law 4: status + length + a known field, never status alone. */
async function probe(port, timeout = 3000) {
  try {
    const v = await http(port, '/c/version', { timeout });
    const css = await http(port, '/v/index.css', { timeout });
    return {
      live: v.status === 200 && v.text.includes(`ContextOS-${port}`) && css.size > 10000,
      port,
      version: v.text.replace(/\s+/g, ' ').trim(),
      cssBytes: css.size,
    };
  } catch (error) {
    return { live: false, port, error: String(error?.message || error) };
  }
}

async function portFree(port) {
  return new Promise((resolve) => {
    const s = net.createServer();
    s.once('error', () => resolve(false));
    s.once('listening', () => s.close(() => resolve(true)));
    s.listen(port, '127.0.0.1');
  });
}

function binaryName() {
  const osName = process.platform === 'darwin' ? 'darwin' : process.platform === 'win32' ? 'windows' : 'linux';
  const arch = process.arch === 'arm64' ? 'arm64' : process.arch === 'ia32' ? '386' : 'amd64';
  return `ice.${osName}.${arch}`;
}

async function findBinary(root) {
  const candidates = [
    process.env.CTX_DEVOPS_BINARY,
    path.join(root, 'usr', 'publish', binaryName()),
    path.join(root, 'bin', 'ice.bin'),
  ].filter(Boolean);
  for (const candidate of candidates) {
    try {
      const st = await fs.stat(candidate);
      if (st.isFile() && st.size > 5 * 1024 * 1024) return candidate;
    } catch {
      /* keep looking */
    }
  }
  throw new Error(`no usable ice.bin; expected ${path.join(root, 'usr', 'publish', binaryName())}`);
}

async function waitFor(fn, { timeout = 40000, interval = 700, label = 'condition' } = {}) {
  const started = Date.now();
  let last;
  while (Date.now() - started < timeout) {
    try {
      last = await fn();
      if (last) return last;
    } catch (error) {
      last = error;
    }
    await new Promise((r) => setTimeout(r, interval));
  }
  throw new Error(`timeout waiting for ${label}`);
}

async function listNodes() {
  const registry = await readRegistry();
  const scanned = await scanLocalNodes();

  const byDir = new Map();
  for (const sc of scanned) byDir.set(sc.dir, { ...sc });

  for (const rec of registry) {
    if (!rec.dir) continue;
    const base = byDir.get(rec.dir) || {
      dir: rec.dir,
      bin: path.join(rec.dir, 'bin', 'ice.bin'),
      name: path.basename(rec.dir),
      port: rec.port || 9020,
      source: 'record',
      platform: rec.platform || platformName(),
    };
    for (const k of ['name', 'port', 'parent', 'platform', 'source', 'container', 'image', 'resident', 'env', 'createdAt']) {
      if (rec[k] !== undefined && rec[k] !== null && rec[k] !== '') base[k] = rec[k];
    }
    if (rec.source) base.source = rec.source;
    if (!base.port) base.port = (await portOnDisk(rec.dir)) || 9020;
    byDir.set(rec.dir, base);
  }

  const nodes = [...byDir.values()];
  const out = await Promise.all(
    nodes.map(async (n) => {
      const st = await probe(n.port, 1500);
      const isContainer = !!n.container;
      const hasBin = isContainer ? true : await binExists(n);
      const pid = await pidAlive(n.dir);
      // pid is authoritative for local nodes: a stale /c/version from another
      // process on the same port must not make a stopped node look running.
      const running = isContainer ? st.live : pid.pid > 1 ? pid.alive : st.live;
      return {
        ...n,
        ...st,
        hasBin,
        pid: pid.pid,
        pidAlive: pid.alive,
        url: `http://localhost:${n.port}/`,
        state: running ? 'running' : isContainer || hasBin ? 'stopped' : 'missing',
      };
    }),
  );
  out.sort((a, b) => {
    const ar = a.state === 'running', br = b.state === 'running';
    return ar === br ? a.port - b.port : ar ? -1 : 1;
  });
  return out;
}

function launchArgs(port, parent) {
  const a = ['forever', 'start'];
  if (parent) a.push('dev', parent);
  a.push('port', String(port));
  return a;
}

async function writeLauncherMeta(node, source) {
  await fs.mkdir(path.join(node.dir, 'var', 'log'), { recursive: true });
  const cmd = ['./bin/ice.bin', ...launchArgs(node.port, node.parent || '')].join(' ');
  const meta = {
    installDir: node.dir,
    port: node.port,
    parentURL: node.parent || '',
    platform: platformName(),
    source,
    command: cmd,
    createdAt: new Date().toISOString(),
  };
  await fs.writeFile(path.join(node.dir, '.ctx-deploy.json'), JSON.stringify(meta, null, 2));
  await fs.writeFile(
    path.join(node.dir, 'start.sh'),
    `#!/bin/sh\ncd "$(dirname "$0")" || exit 1\nexec ${cmd}\n`,
    { mode: 0o755 },
  );
  await fs.writeFile(
    path.join(node.dir, 'stop.sh'),
    `#!/bin/sh\nPORT=$(cat var/log/ice.port 2>/dev/null)\n[ -z "$PORT" ] && PORT="${node.port}"\ncurl -s -m 5 "http://localhost:$PORT/c/quit"\necho\n`,
    { mode: 0o755 },
  );
}

async function saveRecord(node, source) {
  const registry = await readRegistry();
  const idx = registry.findIndex((r) => r.dir === node.dir);
  const rec = {
    dir: node.dir,
    name: node.name || path.basename(node.dir),
    port: node.port,
    parent: node.parent || '',
    platform: node.platform || platformName(),
    source,
    createdAt: new Date().toISOString(),
  };
  if (idx >= 0) registry[idx] = rec;
  else registry.push(rec);
  await writeRegistry(registry);
}

function runShell(script, cwd, { timeoutMs = 900000 } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn('/bin/sh', ['-c', script], { cwd, env: { ...process.env }, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    let err = '';
    child.stdout.on('data', (d) => { out += d; if (out.length > 65536) out = out.slice(-32768); });
    child.stderr.on('data', (d) => { err += d; if (err.length > 65536) err = err.slice(-32768); });
    const t = setTimeout(() => { try { child.kill('SIGKILL'); } catch {} reject(new Error('shell timeout')); }, timeoutMs);
    child.on('error', (e) => { clearTimeout(t); reject(e); });
    child.on('close', (code) => { clearTimeout(t); resolve({ code, out, err }); });
  });
}

async function targetOfBinary(file) {
  const fh = await fsp.openSync(file, 'r');
  const head = Buffer.alloc(4096);
  const n = fsp.readSync(head, 0, 4096, 0);
  fsp.closeSync(fh);
  const b = head.subarray(0, n);
  if (n < 20) return null;
  if (b[0] === 0x7f && b[1] === 0x45 && b[2] === 0x4c && b[3] === 0x46) {
    const machine = b.readUInt16LE(18);
    const arch = { 0xb7: 'arm64', 0x3e: 'amd64', 0x28: 'arm', 0x03: '386' }[machine] || 'unknown';
    return `linux.${arch}`;
  }
  const le32 = b.readUInt32LE(0);
  const be32 = b.readUInt32BE(0);
  if (le32 === 0xfeedfacf || le32 === 0xfeedface || be32 === 0xfeedfacf || be32 === 0xfeedface) {
    const cpu = le32 === 0xfeedfacf || le32 === 0xfeedface ? b.readUInt32LE(4) : b.readUInt32BE(4);
    const arch = { 0x0100000c: 'arm64', 0x01000007: 'amd64', 12: 'arm', 7: '386' }[cpu] || 'unknown';
    return `darwin.${arch}`;
  }
  if (be32 === 0xcafebabe || le32 === 0xcafebabe) return 'darwin.universal';
  return null;
}

async function downloadBinary(dir, parent) {
  const file = binaryName();
  const bases = [parent, 'https://shylinux.com'].map((u) => (u || '').replace(/\/$/, '')).filter(Boolean);
  const urls = [...new Set(bases.map((b) => `${b}/publish/${file}`))];
  let last;
  for (const url of urls) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(60000) });
      if (!res.ok) { last = `HTTP ${res.status}`; continue; }
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length < 1024 * 1024) { last = `too small (${buf.length}B)`; continue; }
      await fs.writeFile(path.join(dir, 'bin', 'ice.bin'), buf, { mode: 0o755 });
      return { url, size: buf.length };
    } catch (e) {
      last = String(e?.message || e);
    }
  }
  throw new Error(`download failed (${last}); tried ${urls.join(', ')}`);
}

async function deployNode({ port = 9188, name = '', mode = 'copy', parent = '', repo = '', sourceBin = '', dir: installDir = '' } = {}) {
  port = Number(port);
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('port must be 1024..65535');
  if (!(await portFree(port))) throw new Error(`port ${port} is already in use`);

  const root = ctxRoot();
  const dir = installDir
    ? path.resolve(String(installDir).replace(/^~(?=$|\/)/, HOME()))
    : path.join(path.dirname(root), `${path.basename(root)}-${port}`);
  if (path.resolve(dir) === path.resolve(root)) throw new Error('refuse to deploy over the running root');
  const existing = (await listNodes()).find((n) => n.port === port && n.dir === dir);
  if (existing?.live) return { ...existing, reused: true };
  if (fsp.existsSync(path.join(dir, 'bin', 'ice.bin'))) {
    throw new Error(`directory ${dir} already has bin/ice.bin; choose another port or remove it yourself`);
  }

  let sourceTag;
  if (mode === 'source') {
    if (!repo) throw new Error('source mode needs a repo URL');
    if (fsp.existsSync(dir)) throw new Error(`directory ${dir} already exists (source clone needs an empty target)`);
    const r = await runShell(`git clone --progress '${repo.replace(/'/g, "'\\''")}' '${dir}'`, path.dirname(dir));
    if (r.code !== 0) throw new Error(`git clone failed (${r.code}): ${r.err.slice(-400)}`);
    if (!fsp.existsSync(path.join(dir, 'etc', 'miss.sh'))) throw new Error('clone done but etc/miss.sh missing — not a ContextOS repo');
    const b = await runShell('source ./etc/miss.sh', dir);
    if (b.code !== 0) throw new Error(`build failed (${b.code}): ${b.err.slice(-500)}`);
    if (!fsp.existsSync(path.join(dir, 'bin', 'ice.bin'))) throw new Error('build produced no bin/ice.bin');
    sourceTag = `git:${repo}`;
  } else if (mode === 'download') {
    await fs.mkdir(path.join(dir, 'bin'), { recursive: true });
    const dl = await downloadBinary(dir, parent);
    const actual = await targetOfBinary(path.join(dir, 'bin', 'ice.bin'));
    if (actual && !actual.endsWith('.universal') && actual !== platformName()) {
      throw new Error(`platform mismatch: want ${platformName()}, got ${actual}`);
    }
    sourceTag = `download:${dl.url}`;
  } else {
    await fs.mkdir(path.join(dir, 'bin'), { recursive: true });
    const source = sourceBin || (await findBinary(root));
    await fs.copyFile(source, path.join(dir, 'bin', 'ice.bin'));
    await fs.chmod(path.join(dir, 'bin', 'ice.bin'), 0o755);
    sourceTag = `copy:${source}`;
  }

  const nodeName = name ? (/^ContextOS/i.test(name) ? name : `ContextOS-${name}`) : `ContextOS-${port}`;
  const node = { dir, bin: path.join(dir, 'bin', 'ice.bin'), name: nodeName, port, parent };
  await writeLauncherMeta(node, sourceTag);
  const started = await startNode({ port });
  await saveRecord(node, sourceTag);
  return { ...node, ...started, source: sourceTag, mode };
}

async function startNode({ port } = {}) {
  const node = (await listNodes()).find((n) => n.port === Number(port));
  if (!node) throw new Error(`node ${port} not found (deploy or register it first)`);
  if (node.state === 'running') return { port: node.port, state: 'running', note: 'already running' };
  if (!node.hasBin && !(await binExists(node))) throw new Error('no bin/ice.bin — deploy first');

  await fs.mkdir(path.join(node.dir, 'var', 'log'), { recursive: true });
  const logPath = path.join(node.dir, 'var', 'log', 'deploy.log');
  const out = fsp.openSync(logPath, 'a');
  const child = spawn(path.join(node.dir, 'bin', 'ice.bin'), launchArgs(node.port, node.parent), {
    cwd: node.dir,
    detached: true,
    stdio: ['ignore', out, out],
    env: { ...process.env },
  });
  child.unref();
  fsp.closeSync(out);

  try {
    await waitFor(async () => (await probe(node.port, 1000)).live, { timeout: 75000, interval: 1000, label: `node ${node.port} up` });
  } catch (e) {
    throw new Error(`node ${node.port} not ready: ${String(e?.message || e)} — log ${logPath}`);
  }
  return { port: node.port, state: 'running', dir: node.dir, url: `http://localhost:${node.port}/`, pid: child.pid };
}

async function stopNode({ port } = {}) {
  const node = (await listNodes()).find((n) => n.port === Number(port));
  if (!node) throw new Error(`node ${port} not found`);
  if (node.state !== 'running') return { port: Number(port), state: 'stopped', note: 'already stopped' };
  try {
    await http(Number(port), '/c/quit', { timeout: 3000 });
  } catch {
    /* quit endpoint may 405/close; fall through to pid */
  }
  try {
    await waitFor(async () => !(await probe(Number(port), 1000)).live, { timeout: 20000, interval: 500, label: `node ${port} down` });
  } catch {
    const pid = Number((await fs.readFile(path.join(node.dir, 'var', 'log', 'ice.pid'), 'utf8')).trim());
    if (pid > 1) { try { process.kill(pid, 'SIGTERM'); } catch {} }
    await waitFor(async () => !(await probe(Number(port), 1000)).live, { timeout: 15000, interval: 500, label: `node ${port} down (pid)` });
  }
  return { port: Number(port), state: 'stopped' };
}

async function openNode({ port } = {}) {
  const node = (await listNodes()).find((n) => n.port === Number(port));
  if (!node) throw new Error(`node ${port} not found`);
  spawn('open', [`http://localhost:${node.port}/`], { detached: true, stdio: 'ignore' }).unref();
  return { opened: `http://localhost:${node.port}/` };
}

async function openSpace({ node, space } = {}) {
  spawn('open', [`http://localhost:${Number(node)}/s/${encodeURIComponent(space)}/`], { detached: true, stdio: 'ignore' }).unref();
  return { opened: `http://localhost:${Number(node)}/s/${space}/` };
}

async function openTerminalAt(dir) {
  const target = fsp.existsSync(dir) ? dir : path.join(dir);
  spawn('open', ['-a', 'Terminal', target], { detached: true, stdio: 'ignore' }).unref();
  return { opened: target };
}

async function nodeTerminal({ port } = {}) {
  const node = (await listNodes()).find((n) => n.port === Number(port));
  if (!node) throw new Error(`node ${port} not found`);
  return openTerminalAt(node.dir);
}

async function spaceTerminal({ node, space } = {}) {
  const n = (await listNodes()).find((x) => x.port === Number(node));
  if (!n) throw new Error(`node ${node} not found`);
  return openTerminalAt(path.join(n.dir, 'usr', 'local', 'work', space));
}

async function startSpace({ node, space } = {}) {
  await http(Number(node), `/c/dream/action/start?name=${encode(space)}&space.noecho=true`, { method: 'POST', timeout: 60000 });
  return { node: Number(node), space, state: 'start' };
}

async function stopSpace({ node, space } = {}) {
  await http(Number(node), `/c/dream/action/stop?name=${encode(space)}&space.noecho=true`, { method: 'POST', timeout: 60000 });
  return { node: Number(node), space, state: 'stop' };
}

async function deleteNode({ port } = {}) {
  const n = (await listNodes()).find((x) => x.port === Number(port));
  if (!n) throw new Error(`node ${port} not found`);
  const root = path.resolve(ctxRoot());
  const dir = path.resolve(n.dir);
  if (dir === root || !dir.startsWith(path.dirname(root) + path.sep)) {
    throw new Error(`refuse to delete ${dir}: not a sibling node directory`);
  }
  try { await stopNode({ port: n.port }); } catch { /* already stopped */ }
  await fs.rm(dir, { recursive: true, force: true });
  const registry = (await readRegistry()).filter((x) => path.resolve(x.dir || '') !== dir && Number(x.port) !== n.port);
  await writeRegistry(registry);
  return { port: n.port, dir, deleted: true };
}

async function deleteSpace({ node, space } = {}) {
  const n = (await listNodes()).find((x) => x.port === Number(node));
  if (!n) throw new Error(`node ${node} not found`);
  const base = path.resolve(n.dir, 'usr', 'local', 'work');
  const dir = path.resolve(base, space);
  if (!dir.startsWith(base + path.sep)) throw new Error('space path escapes work dir');
  try { await stopSpace({ node, space }); } catch { /* already stopped */ }
  await http(node, `/c/dream/action/remove?name=${encode(space)}`, { method: 'DELETE', timeout: 30000 });
  await fs.rm(dir, { recursive: true, force: true });
  return { node: Number(node), space, dir, deleted: true };
}

const OFFICIAL_SPACES = [
  { key: 'community', name: '云社区', prefix: '20240724', repo: 'https://shylinux.com/x/community' },
  { key: 'enterprise', name: '云办公', prefix: '20240724', repo: 'https://shylinux.com/x/enterprise' },
  { key: 'operation', name: '云研发', prefix: '20240903', repo: 'https://shylinux.com/x/operation' },
  { key: 'knowledge', name: '云知识', prefix: '20250520', repo: 'https://shylinux.com/x/knowledge' },
  { key: 'education', name: '云教育', prefix: '20240724', repo: 'https://shylinux.com/x/education' },
  { key: 'healthy', name: '云健康', prefix: '20250520', repo: 'https://shylinux.com/x/healthy' },
  { key: 'tourism', name: '云文旅', prefix: '20250520', repo: 'https://shylinux.com/x/tourism' },
  { key: 'charity', name: '云公益', prefix: '20250520', repo: 'https://shylinux.com/x/charity' },
  { key: 'industry', name: '云工业', prefix: '20250520', repo: 'https://shylinux.com/x/industry' },
  { key: 'agriculture', name: '云农业', prefix: '20250520', repo: 'https://shylinux.com/x/agriculture' },
];

function officialKey(value) {
  const text = String(value || '').trim();
  const found = OFFICIAL_SPACES.find((x) => x.key === text || x.name === text);
  return found?.key || '';
}

async function warmSpace({ node, space } = {}) {
  // Opening the space homepage runs its init/DB bootstrap; without this the
  // service/store tables can still be empty right after create/build.
  try {
    const r = await http(node, `/s/${encode(space)}/`, { timeout: 15000, headers: { accept: 'text/html', 'user-agent': 'Mozilla/5.0' } });
    return { status: r.status, bytes: r.size };
  } catch (e) {
    return { error: String(e?.message || e) };
  }
}

async function deployOfficialSpaces({ node, keys = [] } = {}) {
  const wanted = new Set((keys || []).map(officialKey).filter(Boolean));
  if (!wanted.size) throw new Error('choose at least one official space');
  const existing = await listSpaces({ node });
  const out = [];
  for (const item of OFFICIAL_SPACES.filter((x) => wanted.has(x.key))) {
    // Standard spaces keep their canonical date prefix (20240724/20240903/20250520),
    // not today's date; reuse only the exact prefixed name.
    const fullName = `${item.prefix}-${item.key}`;
    const found = existing.find((s) => s.name === fullName);
    if (found) {
      const warm = await warmSpace({ node, space: found.name });
      out.push({ ...item, space: found.name, reused: true, warm });
      continue;
    }
    try {
      const created = await createSpace({ node, name: fullName, repos: item.repo });
      let built = false;
      let warning = '';
      try { await buildSpace({ node, space: created.name }); built = true; }
      catch (e) { warning = String(e?.message || e); }
      const warm = await warmSpace({ node, space: created.name });
      out.push({ ...item, space: created.name, reused: false, built, warning, warm });
    } catch (e) {
      out.push({ ...item, error: String(e?.message || e) });
    }
  }
  return out;
}

async function storeApps({ node, lang = 'zh' } = {}) {
  const uid = await ensureUser(node);
  const r = await http(node, `/s/20240724-community/c/web.team.gonganxitong.service?user.uid=${encode(uid)}`, { timeout: 15000 });
  if (r.status !== 200) throw new Error(`service store failed: HTTP ${r.status}`);
  const { rows } = envelopeRows(r.text);
  return rows.map((row) => {
    const status = row.service_status || 'offline';
    const actions = ['create', 'code', 'conf', 'data', ...(status === 'online' ? ['offline'] : ['online'])];
    return {
      uid: row.uid || '',
      name: row.name || '',
      title: row.name || '',
      space: row.space || '',
      command: row.index || '',
      place: row.place_key || '',
      module: row.module || '',
      version: row.version || '',
      icon: row.icon || '',
      status,
      status_label: status === 'online' ? (lang === 'zh' ? '已上架' : 'online') : (lang === 'zh' ? '待上架' : 'offline'),
      actions,
    };
  }).filter((x) => x.name && x.command);
}

async function storeAction({ node, space = '20240724-community', serviceUid = '', action = '' } = {}) {
  if (!/^(online|offline|code|conf|data)$/.test(action)) throw new Error('unsupported store action');
  const uid = await ensureUser(node);
  const r = await http(node, `/s/${encode(space)}/c/web.team.gonganxitong.service/action/${action}?uid=${encode(serviceUid)}&user.uid=${encode(uid)}`, { method: 'POST', timeout: 20000 });
  if (r.status !== 200) throw new Error(`store ${action} failed: HTTP ${r.status}`);
  return { action, serviceUid, status: r.status };
}

async function createStoreInstance({ node, service = {}, name = '', city = '深圳市', company = '云轩领航', uid = '' } = {}) {
  if (!service.space || !service.command) throw new Error('service space/command is required');
  const title = name || String(service.name || '').split(/\s+/)[0] || '我的应用';
  const r = await createInstance({ node, space: service.space, command: service.command, place: service.place || '', name: title, city, company, serviceUid: service.uid, uid });
  return { ...r, service };
}

async function listDir({ node, space, path: sub = '' } = {}) {
  const n = (await listNodes()).find((x) => x.port === Number(node));
  if (!n) throw new Error(`node ${node} not found`);
  const base = path.join(n.dir, 'usr', 'local', 'work', space);
  const dir = sub ? path.join(base, ...sub.split('/').filter(Boolean)) : base;
  if (dir !== base && !dir.startsWith(base + path.sep)) throw new Error('path escapes the space');
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch (e) {
    throw new Error(`cannot read ${dir}: ${String(e?.message || e)}`);
  }
  const out = [];
  for (const ent of entries) {
    if (ent.name === '.git') continue;
    const p = path.join(dir, ent.name);
    let st = null;
    try { st = await fs.stat(p); } catch {}
    out.push({
      name: ent.name,
      type: ent.isDirectory() ? 'dir' : 'file',
      size: st?.size ?? 0,
      mtime: st ? st.mtime.toISOString() : '',
      path: sub ? `${sub}/${ent.name}` : ent.name,
    });
  }
  const ORDER = ['src', 'etc', 'bin', 'var', 'usr'];
  const rank = (e) => { const i = ORDER.indexOf(e.name); return i < 0 ? 99 : i; };
  out.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
    if (a.type === 'dir') {
      const ra = rank(a), rb = rank(b);
      if (ra !== rb) return ra - rb;
    }
    return a.name.localeCompare(b.name);
  });
  return { node: Number(node), space, path: sub || '', entries: out.filter((e) => !e.name.startsWith('.')) };
}

async function readFile({ node, space, path: p } = {}) {
  const n = (await listNodes()).find((x) => x.port === Number(node));
  if (!n) throw new Error(`node ${node} not found`);
  const base = baseDirOf(n, space);
  const file = path.join(base, ...String(p || '').replace(/^\/+/, '').split('/').filter(Boolean));
  if (file !== base && !file.startsWith(base + path.sep)) throw new Error('path escapes the space');
  let content;
  try {
    content = await fs.readFile(file, 'utf8');
  } catch (e) {
    throw new Error(`cannot read ${file}: ${String(e?.message || e)}`);
  }
  return { node: Number(node), space, path: p || '', content };
}

async function writeFile({ node, space, path: p, content = '' } = {}) {
  const n = (await listNodes()).find((x) => x.port === Number(node));
  if (!n) throw new Error(`node ${node} not found`);
  const base = baseDirOf(n, space);
  const file = path.join(base, ...String(p || '').replace(/^\/+/, '').split('/').filter(Boolean));
  if (file !== base && !file.startsWith(base + path.sep)) throw new Error('path escapes the space');
  await fs.writeFile(file, content, 'utf8');
  return { node: Number(node), space, path: p || '', saved: true };
}

/** 列出项目空间内的目录项（IDE 文件树用）。 */
function baseDirOf(n, space) {
  return space ? path.join(n.dir, 'usr', 'local', 'work', space) : n.dir;
}

async function listTree({ node, space, path: p = '' } = {}) {
  const n = (await listNodes()).find((x) => x.port === Number(node));
  if (!n) throw new Error(`node ${node} not found`);
  const base = baseDirOf(n, space);
  const dir = path.join(base, ...String(p || '').replace(/^\/+/, '').split('/').filter(Boolean));
  if (dir !== base && !dir.startsWith(base + path.sep)) throw new Error('path escapes the space');
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const skip = new Set(['.git', 'var', 'bin', 'node_modules']);
  return entries
    .filter((e) => !skip.has(e.name))
    .map((e) => ({ name: e.name, type: e.isDirectory() ? 'dir' : 'file', path: [p, e.name].filter(Boolean).join('/') }))
    .sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === 'dir' ? -1 : 1));
}

/** 项目空间内路径解析（防越界）。 */
async function spaceBase({ node, space }) {
  const n = (await listNodes()).find((x) => x.port === Number(node));
  if (!n) throw new Error(`node ${node} not found`);
  return baseDirOf(n, space);
}
function resolveIn(base, p) {
  const full = path.join(base, ...String(p || '').split('/').filter(Boolean));
  if (full !== base && !full.startsWith(base + path.sep)) throw new Error('path escapes the space');
  return full;
}
async function makeDir({ node, space, path: p = '' } = {}) {
  const base = await spaceBase({ node, space });
  await fs.mkdir(resolveIn(base, p), { recursive: true });
  return { path: p, created: true };
}
async function renamePath({ node, space, from = '', to = '' } = {}) {
  const base = await spaceBase({ node, space });
  if (!from || !to) throw new Error('from/to are required');
  await fs.rename(resolveIn(base, from), resolveIn(base, to));
  return { from, to, renamed: true };
}
async function removePath({ node, space, path: p = '' } = {}) {
  const base = await spaceBase({ node, space });
  if (!p) throw new Error('path is required');
  await fs.rm(resolveIn(base, p), { recursive: true, force: true });
  return { path: p, removed: true };
}
async function gitStatus({ node, space } = {}) {
  const base = await spaceBase({ node, space });
  const run = (args) => new Promise((resolve) => {
    const child = spawn('git', ['-C', base, ...args], { stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    child.stdout.on('data', (d) => { out += d; });
    child.stderr.on('data', (d) => { out += d; });
    child.on('close', (code) => resolve({ code, out }));
    child.on('error', () => resolve({ code: -1, out: '' }));
  });
  const st = await run(['status', '--porcelain=v1', '-b']);
  if (st.code !== 0) return { branch: '', ahead: 0, behind: 0, files: {}, changed: 0, commits: 0, error: st.out.slice(0, 200) };
  const files = {};
  let branch = '', ahead = 0, behind = 0;
  st.out.split('\n').forEach((line) => {
    if (!line) return;
    if (line.startsWith('## ')) {
      const head = line.slice(3);
      const m = head.match(/^[^.\s]+/);
      branch = m ? m[0] : '';
      const a = head.match(/ahead (\d+)/); if (a) ahead = Number(a[1]);
      const b = head.match(/behind (\d+)/); if (b) behind = Number(b[1]);
      return;
    }
    const xy = line.slice(0, 2).trim();
    let file = line.slice(3);
    if (file.includes(' -> ')) file = file.split(' -> ').pop();
    if (xy) files[file] = xy;
  });
  const hist = await run(['rev-list', '--count', 'HEAD']);
  const log = await run(['log', '-n', '40', '--pretty=format:%h%x1f%s%x1f%an%x1f%ar']);
  const history = log.code === 0
    ? log.out.split('\n').filter(Boolean).map((line) => { const [hash, subject, author, when] = line.split('\x1f'); return { hash, subject, author, when }; })
    : [];
  return { branch, ahead, behind, files, changed: Object.keys(files).length, commits: Number((hist.out || '').trim()) || 0, history };
}

async function compileSpace({ node, space } = {}) {
  const r = await http(node, `/s/${encode(space)}/c/vimer/action/compile`, { method: 'POST', timeout: 120000 });
  return { status: r.status, out: String(r.text || '').slice(0, 4000) };
}

/** 项目空间的绝对路径（终端 cwd 用）。 */
async function spaceDir({ node, space } = {}) {
  const n = (await listNodes()).find((x) => x.port === Number(node));
  if (!n) throw new Error(`node ${node} not found`);
  return { dir: baseDirOf(n, space) };
}

async function listSpaces({ node } = {}) {
  const r = await http(node, '/c/dream', { timeout: 10000 });
  const table = parseFixedTable(r.text);
  return table.rows
    .filter((row) => /^\d{8}-[A-Za-z0-9_-]+$/.test(row.name || ''))
    .map((row) => ({
      name: row.name,
      help: (() => { try { return decodeURIComponent(row.help || ''); } catch { return row.help || ''; } })(),
      type: row.type || '',
      status: row.status === 'start' ? 'start' : row.status === 'stop' ? 'stop' : row.status || '',
      running: row.status === 'start',
      version: row.version || '',
      size: row.size || '',
      type: row.type || '',
      dreamStatus: row.status || '',
      icons: (() => { try { return decodeURIComponent(row.icons || ''); } catch { return row.icons || ''; } })(),
    }));
}

/** Node-level recent apps: gonganxitong.recent for the persistent DSH user. */
async function listApps({ node, space, avatarUid = '' } = {}) {
  const n = (await listNodes()).find((x) => x.port === Number(node));
  if (!n) throw new Error(`node ${node} not found`);
  const uid = avatarUid || await ensureUser(node);
  const r = await http(node, `/s/20240724-community/c/web.team.gonganxitong.portal/action/run/web.team.gonganxitong.recent?user.uid=${encode(uid)}`, { timeout: 12000 });
  if (r.status !== 200) {
    // A node without the community space still gets a filesystem view.
    return scanApps({ node, space });
  }
  const { rows } = envelopeRows(r.text);
  const seen = new Set();
  const apps = [];
  for (const row of rows) {
    const command = String(row.index || '');
    if (!command) continue;
    const name = command.split('.')[2] || '';
    const key = `${row.space}|${command}|${row.place_uid}`;
    if (seen.has(key)) continue;
    seen.add(key);
    let place = '';
    let functions = [];
    if (name && row.space) {
      try {
        const portal = JSON.parse(await fs.readFile(path.join(n.dir, 'usr', 'local', 'work', row.space, 'src', name, 'portal.json'), 'utf8'));
        place = Object.keys(portal.input || {}).find((k) => /_name$/.test(k)) || '';
        functions = Object.keys(portal).filter((k) => !['portal', 'input', 'value'].includes(k));
      } catch { /* app may not be on this disk */ }
    }
    apps.push({
      name,
      title: row.place_name || row.service_name || name,
      service: row.service_name || '',
      service_name: row.service_name || '',
      city_name: row.city_name || '',
      company_name: row.company_name || row.street_name || '',
      command,
      space: row.space || space || '',
      place_uid: row.place_uid || '',
      user_uid: uid,
      updated: row.updated_at || '',
      icon: row.place_avatar || row.service_icon || '',
      place_avatar: row.place_avatar || '',
      path: name ? `src/${name}/portal.json` : '',
      place,
      functions,
      recent: true,
    });
  }
  return apps;
}

/** Filesystem fallback: every src/<name>/portal.json is one app. */
async function scanApps({ node, space } = {}) {
  const n = (await listNodes()).find((x) => x.port === Number(node));
  if (!n) throw new Error(`node ${node} not found`);
  if (!/^[A-Za-z0-9_-]+$/.test(space || '')) throw new Error('bad space name');
  const src = path.join(n.dir, 'usr', 'local', 'work', space, 'src');
  let entries = [];
  try { entries = await fs.readdir(src, { withFileTypes: true }); } catch { return []; }
  const apps = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const portalPath = path.join(src, entry.name, 'portal.json');
    let portal;
    try { portal = JSON.parse(await fs.readFile(portalPath, 'utf8')); } catch { continue; }
    const stat = await fs.stat(portalPath);
    apps.push({
      name: entry.name,
      title: portal.portal || entry.name,
      command: `web.team.${entry.name}.portal`,
      path: `src/${entry.name}/portal.json`,
      port: Number(node),
      space,
      updated: stat.mtime.toISOString(),
      functions: Object.keys(portal).filter((k) => !['portal', 'input', 'value'].includes(k)),
      place: Object.keys(portal.input || {}).find((k) => /_name$/.test(k)) || '',
    });
  }
  return apps.sort((a, b) => String(b.updated).localeCompare(String(a.updated)));
}

/** git init after dream create: required remote, otherwise no skeleton is written. */
async function initSpace({ node, space } = {}) {
  const n = (await listNodes()).find((x) => x.port === Number(node));
  if (!n) throw new Error(`node ${node} not found`);
  if (!/^[A-Za-z0-9_-]+$/.test(space || '')) throw new Error('bad space name');
  const short = space.replace(/^\d{8}-/, '');
  const remote = `${baseUrl(node)}/x/${short}`;
  const r = await http(node, `/s/${encode(space)}/c/web.code.git.status/action/init?remote=${encode(remote)}&space.noecho=true`, {
    method: 'POST',
    timeout: 60000,
  });
  if (r.status !== 200) throw new Error(`init failed: HTTP ${r.status}`);
  const dir = path.join(n.dir, 'usr', 'local', 'work', space);
  await waitFor(async () => fsp.existsSync(path.join(dir, '.git')) && fsp.existsSync(path.join(dir, 'src', 'main.go')), {
    timeout: 20000,
    interval: 600,
    label: `skeleton in ${space}`,
  });
  return { node: Number(node), space, dir, remote, initialized: true };
}

async function ensureGoWork(dir) {
  const work = path.join(ctxRoot(), 'go.work');
  if (!fsp.existsSync(work)) return { used: false, reason: 'no go.work' };
  const code = await new Promise((resolve) => {
    const child = spawn('go', ['work', 'use', dir], { cwd: ctxRoot(), stdio: ['ignore', 'pipe', 'pipe'] });
    let err = '';
    child.stderr.on('data', (d) => { err += String(d); });
    child.on('close', (c) => resolve({ code: c, err }));
    child.on('error', (e) => resolve({ code: -1, err: String(e) }));
  });
  return { used: code.code === 0, code: code.code, error: code.err.trim() };
}

/** Platform-style app: service/autogen, then compile + verify portal. */
async function autogenApp({ node, space, name, help = '', place = 'profile', value = 'profile', trans = '' } = {}) {
  if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(name || '')) throw new Error('app name must match [a-zA-Z][a-zA-Z0-9_]*');
  if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(place || '')) throw new Error('place must match [a-zA-Z][a-zA-Z0-9_]*');
  const n = (await listNodes()).find((x) => x.port === Number(node));
  if (!n) throw new Error(`node ${node} not found`);
  const dir = path.join(n.dir, 'usr', 'local', 'work', space);
  if (!fsp.existsSync(path.join(dir, '.git'))) await initSpace({ node, space });
  const title = help || name;
  // service/autogen splits trans on Chinese ，、; normalize ASCII commas so a
  // 6-value app with 6 Chinese names never renders an out-of-range index.
  const transText = String(trans || value).replace(/,/g, '，');
  const q = new URLSearchParams({ name, help: title, place, value, trans: transText, space });
  const r = await http(node, `/s/20240724-community/c/web.team.gonganxitong.service/action/autogen?${q}`, {
    method: 'POST',
    timeout: 60000,
  });
  if (r.status !== 200) throw new Error(`autogen failed: HTTP ${r.status}`);
  const portalFile = path.join(dir, 'src', name, 'portal.json');
  await waitFor(async () => fsp.existsSync(portalFile), { timeout: 20000, interval: 500, label: `app ${name}/portal.json` });
  const work = await ensureGoWork(dir).catch((e) => ({ used: false, error: String(e?.message || e) }));
  let built = false;
  let warning = '';
  try {
    await buildSpace({ node, space });
    built = true;
  } catch (e) {
    warning = String(e?.message || e);
  }
  return {
    node: Number(node),
    space,
    name,
    help: title,
    place,
    command: `web.team.${name}.portal`,
    path: `src/${name}/portal.json`,
    built,
    warning,
    goWork: work,
  };
}

async function createInstance({ node, space, command, place = '', name = '我的应用', city = '深圳市', company = '云轩领航', serviceUid = '', uid = '' } = {}) {
  if (!space || !command) throw new Error('space and command are required');
  const actorUid = uid || await ensureUser(node);
  const placeKey = /_name$/.test(place) ? place : `${place || 'place'}_name`;
  const fields = { city_name: city, company_name: company, [placeKey]: name };
  const seg = fieldSegments(fields);
  const extra = serviceUid ? `&service_uid=${encode(serviceUid)}` : '';
  const r = await http(node, `/s/${encode(space)}/c/${command}/action/placeCreate/${seg}?user.uid=${encode(actorUid)}&user_uid=${encode(actorUid)}${extra}`, { method: 'POST', timeout: 30000 });
  if (r.status !== 200) throw new Error(`placeCreate failed: HTTP ${r.status}`);
  let placeUid = '';
  try {
    const env = JSON.parse(r.text);
    placeUid = env.place_uid?.[0] || env._place_uid?.[0] || '';
  } catch { /* redirect/html response */ }
  if (!placeUid) {
    try {
      const recent = await listApps({ node, avatarUid: actorUid });
      placeUid = recent.find((a) => a.command === command && a.space === space && a.title === name)?.place_uid || '';
    } catch { /* recent is best effort */ }
  }
  // A fresh user has no recent row until it is created explicitly; read
  // service_uid from the instance portal, then add the row for this user.
  let foundServiceUid = '';
  if (placeUid) {
    try {
      const page = await http(node, `/s/${encode(space)}/c/${command}/${encode(placeUid)}?user.uid=${encode(actorUid)}`, { timeout: 12000 });
      const env = JSON.parse(page.text);
      foundServiceUid = env.service_uid?.[0] || '';
    } catch { /* portal may be html */ }
  }
  if (placeUid && foundServiceUid) {
    try {
      await http(node, `/s/20240724-community/c/web.team.gonganxitong.recent/action/create/place_uid/${encode(placeUid)}/service_uid/${encode(foundServiceUid)}?user.uid=${encode(actorUid)}&user_uid=${encode(actorUid)}`, { method: 'PUT', timeout: 12000 });
    } catch { /* recent is best effort */ }
  }
  return { node: Number(node), space, command, place: placeKey, name, city, company, uid: actorUid, place_uid: placeUid, service_uid: foundServiceUid || serviceUid, created: true };
}

async function createSpace({ node, name, repos = '' }) {
  if (!/^\d{8}-[A-Za-z0-9_]+$/.test(name || '') && !/^[a-zA-Z0-9_]+$/.test(name || '')) {
    throw new Error('space name must be short (letters/digits/_) or date-prefixed (YYYYMMDD-name)');
  }
  const fullName = /^\d{8}-[A-Za-z0-9_]+$/.test(name) ? name : `${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${name}`;
  const query = new URLSearchParams({ name: fullName, 'space.noecho': 'true' });
  if (repos) query.set('repos', repos);
  // Always point the space at this node's own ice.bin. Without it a freshly
  // deployed download-binary node starts the daemon but never materializes
  // src/bin, leaving the row in `begin`.
  const nodeDir = (await listNodes()).find((n) => n.port === Number(node))?.dir;
  const binary = nodeDir ? path.join(nodeDir, 'bin', 'ice.bin') : '';
  if (binary && fsp.existsSync(binary)) query.set('binary', binary);
  const full = fullName;
  let status = '';
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt) await new Promise((r) => setTimeout(r, 3000));
    await http(node, `/c/dream/action/create?${query}`, { method: 'PUT', timeout: 30000 });
    try {
      // The space registers its HTTP surface before the dream row flips from
      // `begin` to `start`; waiting for the pod avoids a 60s stall.
      await waitFor(async () => (await http(node, `/s/${encode(full)}/c/version`, { timeout: 4000 })).status === 200, {
        timeout: 12000,
        interval: 800,
        label: `space ${full} serving`,
      });
      const row = (await listSpaces({ node })).find((s) => s.name === full);
      status = row?.status || '';
      break;
    } catch {
      /* retry create once more */
    }
  }
  if (!status) throw new Error(`space ${name} did not answer /c/version`);
  return { node, name: full, short: name, status };
}

async function buildSpace({ node, space }) {
  const n = (await listNodes()).find((x) => x.port === Number(node));
  if (!n) throw new Error(`node ${node} not found`);
  const dir = path.join(n.dir, 'usr', 'local', 'work', space);
  // vimer compile is the real build; dream/build is a wrapper that can return
  // before a freshly added module is pulled back by the daemon.
  const compile = await http(node, `/s/${encode(space)}/c/vimer/action/compile?space.noecho=true`, { method: 'POST', timeout: 240000 });
  if (compile.status !== 200) throw new Error(`compile failed: HTTP ${compile.status}`);
  await ensureSpaceProcess({ node, space, dir: n.dir });
  await waitFor(async () => (await http(node, `/s/${encode(space)}/c/version`, { timeout: 4000 })).status === 200, {
    timeout: 60000,
    interval: 800,
    label: `space ${space} back online`,
  });
  return { space, rebuilt: true };
}

function moduleSource({ zone, name }) {
  const type = name.replace(/[^a-zA-Z0-9_]/g, '');
  return `package ${zone}

import "shylinux.com/x/ice"

type ${type} struct {
\tice.Hash
\tshort  string \`data:"index,title"\`
\tfield  string \`data:"time,index,title,content,user_uid"\`
\tcreate string \`name:"create title* content* user_uid"\`
\tlist   string \`name:"list index auto"\`
}

func init() { ice.Cmd("web.chat.${zone}.${type}", ${type}{}) }
`;
}

/** Create a real ContextOS app: git init + vimer module + code save + compile. */
async function modulePath(space, dir) {
  try {
    const goMod = await fs.readFile(path.join(dir, 'usr', 'local', 'work', space, 'go.mod'), 'utf8');
    return /^module\s+(\S+)/m.exec(goMod)?.[1] || space.replace(/^\d{8}-/, '');
  } catch {
    return space.replace(/^\d{8}-/, '');
  }
}

async function ensureMainImport({ node, space, dir, module, zone }) {
  const mainPath = path.join(dir, 'usr', 'local', 'work', space, 'src', 'main.go');
  let current = '';
  try {
    current = await fs.readFile(mainPath, 'utf8');
  } catch {
    /* template missing; write the canonical bootstrap */
  }
  const imports = new Set([`${module}/src/${zone}`]);
  for (const match of current.matchAll(/^\s*_\s+"([^"]+)"/gm)) imports.add(match[1]);
  const body = `package main\n\nimport (\n${[...imports].map((i) => `\t_ "${i}"`).join('\n')}\n\n\t"shylinux.com/x/ice"\n)\n\nfunc main() { print(ice.Run()) }\n`;
  if (body === current) return;
  const pod = encode(space);
  const saved = await http(
    node,
    `/s/${pod}/c/web.code.vimer/action/save?path=${encode('src/')}&file=main.go&content=${encode(body)}&space.noecho=true`,
    { method: 'POST', timeout: 30000 },
  );
  if (saved.status !== 200) throw new Error(`main.go save failed: HTTP ${saved.status}`);
}

async function ensureGoMod({ node, space, dir, module }) {
  const goModPath = path.join(dir, 'usr', 'local', 'work', space, 'go.mod');
  let current = '';
  try {
    current = await fs.readFile(goModPath, 'utf8');
  } catch {
    /* create it */
  }
  if (/shylinux\.com\/x\/ice\s+v/.test(current)) return;
  const body = `module ${module}\n\ngo 1.13\n\nrequire shylinux.com/x/ice v1.6.6\n`;
  const saved = await http(
    node,
    `/s/${encode(space)}/c/web.code.vimer/action/save?path=&file=go.mod&content=${encode(body)}&space.noecho=true`,
    { method: 'POST', timeout: 30000 },
  );
  if (saved.status !== 200) throw new Error(`go.mod save failed: HTTP ${saved.status}`);
}

async function ensureSpaceProcess({ node, space, dir }) {
  const pidFile = path.join(dir, 'usr', 'local', 'work', space, 'var', 'log', 'ice.pid');
  const alive = async () => {
    try {
      const pid = Number((await fs.readFile(pidFile, 'utf8')).trim());
      if (!(pid > 1)) return false;
      process.kill(pid, 0);
      return true;
    } catch {
      return false;
    }
  };
  if (await alive()) return;
  await http(node, `/c/dream/action/start?name=${encode(space)}&space.noecho=true`, { method: 'POST', timeout: 60000 });
  await waitFor(alive, { timeout: 20000, interval: 700, label: `space ${space} process` });
}

async function createApp({ node, space, name, zone = 'devops', help = '' }) {
  if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(name || '')) throw new Error('app name must match [a-zA-Z][a-zA-Z0-9_]*');
  if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(zone)) throw new Error('zone must match [a-zA-Z][a-zA-Z0-9_]*');
  const pod = encode(space);
  const short = space.replace(/^\d{8}-/, '');
  const init = await http(
    node,
    `/s/${pod}/c/web.code.git.status/action/init?remote=${encode(`${baseUrl(node)}/x/${short}`)}&space.noecho=true`,
    { method: 'POST', timeout: 30000 },
  );
  if (init.status !== 200) throw new Error(`git init failed: HTTP ${init.status}`);

  const mod = await http(
    node,
    `/s/${pod}/c/web.code.vimer/action/module?name=${encode(name)}&zone=${encode(zone)}&type=Hash&help=${encode(help || name)}&space.noecho=true`,
    { method: 'POST', timeout: 30000 },
  );
  if (mod.status !== 200) throw new Error(`module scaffold failed: HTTP ${mod.status}`);

  const save = await http(
    node,
    `/s/${pod}/c/web.code.vimer/action/save?path=${encode(`src/${zone}/`)}&file=${encode(`${name}.go`)}&content=${encode(moduleSource({ zone, name }))}&space.noecho=true`,
    { method: 'POST', timeout: 30000 },
  );
  if (save.status !== 200) throw new Error(`save failed: HTTP ${save.status}`);

  const nodeDir = (await listNodes()).find((n) => n.port === Number(node))?.dir || path.join(path.dirname(ctxRoot()), `${path.basename(ctxRoot())}-${node}`);
  const module = await modulePath(space, nodeDir);
  await ensureGoMod({ node, space, dir: nodeDir, module });
  await ensureMainImport({ node, space, dir: nodeDir, module, zone });

  // vimer compile builds bin/ice.bin; the process then exits for the daemon to
  // pull it back. On a fresh download-binary space that pull does not always
  // happen, so start it explicitly and verify the pid.
  await http(node, `/s/${pod}/c/web.code.vimer/action/compile?space.noecho=true`, { method: 'POST', timeout: 120000 });
  await ensureSpaceProcess({ node, space, dir: nodeDir });

  const command = `web.chat.${zone}.${name}`;
  const reachable = async () => {
    const r = await http(node, `/s/${pod}/c/${command}`, { timeout: 5000 });
    // A restarting space answers 200 with a `space.dial` envelope; that is not
    // the app answering yet.
    return r.status === 200 && r.text.includes(command) && !r.text.includes('space.dial') && !r.text.includes('from.space');
  };
  try {
    await waitFor(reachable, { timeout: 40000, interval: 1000, label: `app ${command}` });
  } catch {
    // compile exits the process for the daemon to pull back; if that did not
    // happen, start the space explicitly and wait once more.
    await ensureSpaceProcess({ node, space, dir: nodeDir });
    await waitFor(reachable, { timeout: 25000, interval: 1000, label: `app ${command}` });
  }
  await new Promise((r) => setTimeout(r, 1200));
  return { node, space, name, zone, command, path: `src/${zone}/${name}.go` };
}

function fieldSegments(fields) {
  const out = [];
  for (const [key, value] of Object.entries(fields || {})) {
    if (!/^[a-zA-Z_][a-zA-Z0-9_.]*$/.test(key)) throw new Error(`bad field name: ${key}`);
    if (String(value).includes('/')) throw new Error(`field ${key}: ContextOS splits URL paths on "/", use a full-width ／ instead`);
    out.push(`${encode(key)}/${encode(value)}`);
  }
  return out.join('/');
}

async function writeData({ node, space, command, fields = {}, action = 'create', uid = '' }) {
  const base = `/s/${encode(space)}/c/${command}/action/${action}`;
  const seg = fieldSegments(fields);
  const query = new URLSearchParams({ 'space.noecho': 'true' });
  if (uid) query.set('uid', uid);
  let after;
  for (let attempt = 0; attempt < 2 && !after; attempt++) {
    if (attempt) await new Promise((r) => setTimeout(r, 3000));
    await http(node, `${base}${seg ? '/' + seg : ''}?${query}`, { method: 'PUT', timeout: 30000 });
    try {
      after = await waitFor(async () => {
        const data = await readData({ node, space, command });
        return data.count && !/^0x/.test(data.count) ? data : undefined;
      }, { timeout: 15000, interval: 700, label: `record in ${command}` });
    } catch {
      /* the space may still be restarting after compile; retry the write once */
    }
  }
  if (!after) throw new Error(`record in ${command} did not appear; the space may still be restarting`);
  return { ...after, write: { action, fields } };
}

async function readData({ node, space, command }) {
  const r = await http(node, `/s/${encode(space)}/c/${command}`, { timeout: 10000 });
  let count = '';
  let columns = [];
  let rows = [];
  try {
    const envelope = JSON.parse(r.text);
    if (envelope && !Array.isArray(envelope)) {
      try {
        const status = JSON.parse(envelope._status?.[0] || '[]');
        count = status.find((row) => row.name === 'count')?.value || '';
      } catch {
        /* count stays empty */
      }
      columns = Array.isArray(envelope.append) ? envelope.append : [];
      const height = Array.isArray(envelope[columns[0]]) ? envelope[columns[0]].length : 0;
      rows = Array.from({ length: height }, (_, i) => {
        const row = {};
        for (const c of columns) row[c] = Array.isArray(envelope[c]) ? envelope[c][i] : '';
        return row;
      });
    }
  } catch {
    const table = parseTable(r.text);
    columns = table.columns;
    rows = table.rows;
  }
  return { node, space, command, status: r.status, columns, rows, count, raw: r.text.slice(0, 4000) };
}

async function removeData({ node, space, command, uid, fields = {} }) {
  const seg = fieldSegments(fields);
  const query = new URLSearchParams({ 'space.noecho': 'true', uid });
  const r = await http(node, `/s/${encode(space)}/c/${command}/action/remove${seg ? '/' + seg : ''}?${query}`, {
    method: 'DELETE',
    timeout: 30000,
  });
  return { status: r.status, removed: r.text.slice(0, 500) };
}

/** End-to-end pipeline: node -> space -> app -> record -> read-back. */
/** 容器部署：docker run 一个 ContextOS 节点，端口映射后等待 /c/version。 */
async function dockerDeploy({ port = 9188, dir = '', image = '', name = '' } = {}) {
  const p = Number(port) || 9188;
  const img = String(image || 'shylinux/contextos:latest');
  const check = await runShell('docker version --format "{{.Server.Version}}"', undefined, { timeoutMs: 15000 });
  if (check.code !== 0) throw new Error(`Docker 不可用：${(check.err || check.out || '').trim().slice(0, 160)}`);
  const cname = String(name || `contextos-${p}`);
  await runShell(`docker rm -f ${cname}`, undefined, { timeoutMs: 30000 });
  const hostDir = dir ? `-v ${JSON.stringify(String(dir))}:/data` : '';
  const r = await runShell(`docker run -d --name ${cname} -p ${p}:${p} ${hostDir} ${JSON.stringify(img)}`, undefined, { timeoutMs: 300000 });
  if (r.code !== 0) throw new Error(`容器启动失败：${(r.err || r.out || '').trim().slice(0, 240)}`);
  const id = (r.out || '').trim().split('\n').pop();
  const deadline = Date.now() + 60000;
  let ok = false;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`http://127.0.0.1:${p}/c/version`, { signal: AbortSignal.timeout(3000) });
      if (res.ok) { ok = true; break; }
    } catch { /* retry */ }
    await new Promise((x) => setTimeout(x, 1500));
  }
  if (!ok) throw new Error(`容器已启动（${id.slice(0, 12)}），但 :${p} 的 /c/version 未就绪，请检查镜像入口`);
  return { container: cname, id, port: p, image: img };
}

/** 远程部署：通过 ssh 在远端执行 docker run。 */
async function remoteDeploy({ host = '', user = '', sshPort = 22, port = 9188, dir = '', image = '' } = {}) {
  if (!host) throw new Error('远程主机不能为空');
  const p = Number(port) || 9188;
  const img = String(image || 'shylinux/contextos:latest');
  const target = `${user ? `${user}@` : ''}${host}`;
  const script = `docker rm -f contextos-${p} >/dev/null 2>&1; docker run -d --name contextos-${p} -p ${p}:${p} ${dir ? `-v ${JSON.stringify(String(dir))}:/data` : ''} ${JSON.stringify(img)}`;
  const ssh = `ssh -p ${Number(sshPort) || 22} -o BatchMode=yes -o StrictHostKeyChecking=no -o ConnectTimeout=8 ${JSON.stringify(target)} ${JSON.stringify(script)}`;
  const r = await runShell(ssh, undefined, { timeoutMs: 120000 });
  if (r.code !== 0) throw new Error(`远程部署失败：${(r.err || r.out || '').trim().slice(0, 240)}`);
  return { host, port: p, target, id: (r.out || '').trim() };
}

/** 远程连接：登录远端节点换 sessid。 */
async function remoteLogin({ url = '', user = '', pass = '' } = {}) {
  const base = String(url || '').trim().replace(/\/+$/, '');
  if (!/^https?:\/\//.test(base)) throw new Error('远程地址必须以 http:// 或 https:// 开头');
  const attempts = [];
  const pick = (headers, text) => {
    const cookie = headers.get('set-cookie') || '';
    const m = /sessid=([^;]+)/.exec(cookie);
    if (m) return m[1];
    try { const j = JSON.parse(text); return j.sessid || (j.data && j.data.sessid) || ''; } catch { return ''; }
  };
  try {
    const r = await fetch(`${base}/c/aaa.user/action/login?name=${encodeURIComponent(user)}&pass=${encodeURIComponent(pass)}`, { method: 'POST', redirect: 'manual', signal: AbortSignal.timeout(12000) });
    const text = await r.text();
    const sid = pick(r.headers, text);
    if (sid) return { url: base, sessid: sid, user, via: 'login' };
    attempts.push(`login HTTP ${r.status}`);
  } catch (e) { attempts.push(`login ${e.message}`); }
  try {
    const r = await fetch(`${base}/c/aaa.sess/action/create/${encodeURIComponent(user || 'shy')}`, { method: 'PUT', signal: AbortSignal.timeout(12000) });
    const text = await r.text();
    const sid = pick(r.headers, text) || String(text || '').trim().split('\n').pop();
    if (sid && sid.length > 8) return { url: base, sessid: sid, user, via: 'sess' };
    attempts.push(`sess HTTP ${r.status}`);
  } catch (e) { attempts.push(`sess ${e.message}`); }
  throw new Error(`登录失败：${attempts.join(' / ')}`);
}

async function runPipeline({ port = 9188, space = 'devops_demo', app = 'note' } = {}) {
  const steps = [];
  const step = async (name, fn) => {
    const started = Date.now();
    try {
      const value = await fn();
      steps.push({ step: name, ok: true, ms: Date.now() - started, value });
      return value;
    } catch (error) {
      steps.push({ step: name, ok: false, ms: Date.now() - started, error: String(error?.message || error) });
      throw Object.assign(new Error(`${name}: ${error?.message || error}`), { steps });
    }
  };

  const node = await step('deploy-node', () => deployNode({ port }));
  const created = await step('create-space', () => createSpace({ node: port, name: space }));
  const createdApp = await step('create-app', () => createApp({ node: port, space: created.name, name: app }));
  const written = await step('write-data', () =>
    writeData({
      node: port,
      space: created.name,
      command: createdApp.command,
      fields: { user_uid: 'root', title: 'ContextOS DevOps', content: `pipeline ${new Date().toISOString()}` },
    }),
  );
  await step('read-back', async () => {
    const data = await readData({ node: port, space: created.name, command: createdApp.command });
    const titles = data.rows.map((row) => row.title || '').join(' ');
    if (!data.rows.length || !/ContextOS DevOps/.test(titles)) {
      throw new Error(`read-back did not contain the written record (count ${data.count || 'empty'})`);
    }
    return data;
  });
  return {
    ok: true,
    node: port,
    space: created.name,
    app: createdApp,
    count: written.count,
    steps,
  };
}



// ── DSH intent layer ─────────────────────────────────────────────
// The chat op is a thin intent parser: DSH llm.stream turns one natural
// language line into {reply, action}; execution stays in the explicit ops.
let dshLlm = null;

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
  iot: ['devices', 'updateBackground', 'createBackground', 'openApp', 'openNode', 'listApps', 'projectStatus', 'pmList'],
};

async function chatWithDSH({ message, history = [], context = {}, provider = '', model = '', mode = 'factory' } = {}) {
  if (!String(message || '').trim()) throw new Error('empty message');
  const choice = await resolveChatModel({ provider, model });
  const system = [
    'You are ContextOS DevOps Copilot inside DeepSeek Harness.',
    'Turn the user request into exactly one JSON object, no markdown:',
    '{"reply":"short Chinese answer","action":null}',
    'or',
    '{"reply":"short Chinese answer","action":{"op":"deploy|createSpace|officialSpaces|initSpace|autogenApp|createInstance|storeApps|createStoreInstance|createAvatar|projectStatus|planProject|pmList|pmCreate|pmModify|pmRemove|pmAct|buildSpace|openApp|openNode|code|listApps|devices|data","args":{...}}}',
    'Rules:',
    '- Only use actions that are valid in the current context; ask for missing node/space/name instead of inventing.',
    '- deploy args: {port:number}; createSpace args: {name:string}; initSpace args: {space:string};',
    '- officialSpaces args: {keys:[standard key or Chinese name]}; autogenApp args: {name,help,place,value,trans}; createInstance args: {space,command,place,name,city,company}; buildSpace args: {space};',
    '- openApp args: {space,name}; openNode args: {port}; code args: {name}; listApps/data args: {}.',
    '- Six capabilities, in order: deploy node, create workspace, generate app template, edit app code, create app instance, add app data.',
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
    '- context.editor is the file currently open in the dev editor: {node, space, path, language, dirty, content (truncated)}. When the user says "this file"/"这个文件"/asks about the open code, use context.editor.path and context.editor.content.',
    '- createSpace name regex [a-zA-Z][a-zA-Z0-9_]*; autogen name/place same regex.',
    '- Standard spaces: community=云社区, enterprise=云办公, operation=云研发, knowledge=云知识, education=云教育, healthy=云健康, tourism=云文旅, charity=云公益, industry=云工业, agriculture=云农业.',
    '- If the user asks to create/deploy any standard space by Chinese name, use officialSpaces {keys:[...]}; multiple names may be selected at once. Do not use createSpace for these ten.',
    '- Do not claim success; the host executes the action and reports the real result.',
    '- reply must be concise Chinese, 1-3 sentences.',
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
    provider: choice.provider,
    model: choice.model,
    raw: parsed ? undefined : output.slice(0, 800),
    ms: elapsedMs,
    usage: usage || null,
    promptBytes: Buffer.byteLength(prompt, 'utf8'),
    outputBytes: Buffer.byteLength(output, 'utf8'),
  };
}


async function llmJson({ prompt, provider = '', model = '' } = {}) {
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

async function avatarSession(node, avatar) {
  const r = await http(node, `/c/aaa.sess/action/create/${encode(avatar.username)}`, { method: 'PUT', timeout: 12000 });
  const sid = r.text.trim();
  if (r.status !== 200 || !sid) throw new Error(`avatar session failed: HTTP ${r.status}`);
  return sid;
}

async function pmCreate({ node, space, command, fields, uid, projectUid, sessid = '' }) {
  const seg = fieldSegments(fields);
  const q = new URLSearchParams({ project_uid: projectUid, _place_uid: 'project_uid', 'user.uid': uid, user_uid: uid, 'user_role': '1', 'user.role': '1' });
  if (sessid) q.set('sessid', sessid);
  const r = await http(node, `/s/${encode(space)}/c/${command}/action/create/${seg}?${q}`, { method: 'PUT', timeout: 20000 });
  if (r.status !== 200) throw new Error(`${command} create failed: HTTP ${r.status}`);
  try {
    const env = JSON.parse(r.text);
    return env.value_uid?.[0] || env.uid?.[0] || '';
  } catch { return ''; }
}

async function pmAction({ node, space, command, action, uid = '', fields = {}, projectUid, actorUid, sessid = '', method = 'POST', planUid = '', taskUid = '' }) {
  const seg = fieldSegments(fields || {});
  const q = new URLSearchParams({ project_uid: projectUid, _place_uid: 'project_uid', 'user.uid': actorUid, user_uid: actorUid, 'user_role': '1', 'user.role': '1' });
  if (sessid) q.set('sessid', sessid);
  if (uid) q.set('uid', uid);
  if (planUid) q.set('plan_uid', planUid);
  if (taskUid) q.set('task_uid', taskUid);
  const r = await http(node, `/s/${encode(space)}/c/${command}/action/${action}${seg ? '/' + seg : ''}?${q}`, { method, timeout: 20000 });
  let valueUid = '';
  try { const env = JSON.parse(r.text); valueUid = env.value_uid?.[0] || ''; } catch { /* redirect */ }
  if (r.status !== 200) throw new Error(`${command}/${action} HTTP ${r.status}: ${r.text.slice(0, 160)}`);
  return { status: r.status, uid: valueUid, text: r.text };
}

async function planProject({ node, avatarUid = '', goal = '' } = {}) {
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
      try { await pmAction({ node, space: project.space, command: 'web.team.xiangmuguanli.task', action: 'process', uid: taskUid, projectUid: project.place_uid, actorUid: avatar.uid, sessid, planUid }); } catch (e) { warnings.push(`task process: ${String(e.message || e)}`); }
      let reportUid = '';
      try {
        const r = await pmAction({ node, space: project.space, command: 'web.team.xiangmuguanli.task', action: 'reportCreate', uid: taskUid, fields: { report_type: 'daily', title: k.report?.title || '进度报告', content: k.report?.content || '待填写' }, projectUid: project.place_uid, actorUid: avatar.uid, sessid, planUid });
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


const ROUTE = '/contextos-devops-dsh/api';

const text = (value) => [{ type: 'text', text: JSON.stringify(value, null, 2) }];
const output = {
  schema: { type: 'object', properties: {}, additionalProperties: true },
  render: (_args, value) => text(value),
};

const tools = [
  {
    name: 'contextos_deploy_node',
    description:
      'Deploy a local ContextOS service node. mode=copy (default, copy a local bin/ice.bin), mode=download (fetch ice.<os>.<arch> from a /publish source), mode=source (git clone + source etc/miss.sh build). Then bin/ice.bin forever start port <p>, and verify /c/version + /v/index.css.',
    parameters: {
      type: 'object',
      properties: {
        port: { type: 'number', description: 'TCP port for the new node (default 9188).' },
        name: { type: 'string', description: 'Optional label for the node registry.' },
        mode: { type: 'string', description: "Deploy mode: 'copy' | 'download' | 'source' (default copy)." },
        parent: { type: 'string', description: "Parent node URL for download source and 'dev <parent>' launch." },
        repo: { type: 'string', description: 'Git repo URL for source mode.' },
        sourceBin: { type: 'string', description: 'Local bin/ice.bin path for copy mode.' },
      },
    },
    async execute(args) {
      return deployNode({
        port: args?.port ?? 9188,
        name: args?.name ?? '',
        mode: args?.mode ?? 'copy',
        parent: args?.parent ?? '',
        repo: args?.repo ?? '',
        sourceBin: args?.sourceBin ?? '',
      });
    },
  },
  {
    name: 'contextos_list_nodes',
    description: 'List ContextOS nodes managed by this plugin with live health (process/HTTP/static assets) and their version.',
    parameters: { type: 'object', properties: {} },
    async execute() {
      return { ctxRoot: ctxRoot(), nodes: await listNodes() };
    },
  },
  {
    name: 'contextos_stop_node',
    description: 'Stop a ContextOS node managed by this plugin by its own var/log/ice.pid; never kills other processes.',
    parameters: {
      type: 'object',
      properties: { port: { type: 'number', description: 'Port of the managed node.' } },
      required: ['port'],
    },
    async execute(args) {
      return stopNode({ port: args.port });
    },
  },
  {
    name: 'contextos_start_node',
    description: "Start a stopped ContextOS node: ./bin/ice.bin forever start port <p> in its directory, then wait for /c/version.",
    parameters: { type: 'object', properties: { port: { type: 'number', description: 'Node port.' } }, required: ['port'] },
    async execute(args) { return startNode({ port: args.port }); },
  },
  {
    name: 'contextos_open_node',
    description: "Open a node's home page (http://localhost:<port>/) in the system browser.",
    parameters: { type: 'object', properties: { port: { type: 'number', description: 'Node port.' } }, required: ['port'] },
    async execute(args) { return openNode({ port: args.port }); },
  },
  {
    name: 'contextos_node_terminal',
    description: "Open a macOS Terminal window at the node's directory.",
    parameters: { type: 'object', properties: { port: { type: 'number', description: 'Node port.' } }, required: ['port'] },
    async execute(args) { return nodeTerminal({ port: args.port }); },
  },
  {
    name: 'contextos_space_start',
    description: 'Start a project space: POST /c/dream/action/start?name=<space>.',
    parameters: { type: 'object', properties: { node: { type: 'number' }, space: { type: 'string' } }, required: ['node', 'space'] },
    async execute(args) { return startSpace({ node: args.node, space: args.space }); },
  },
  {
    name: 'contextos_space_stop',
    description: 'Stop a project space: POST /c/dream/action/stop?name=<space>.',
    parameters: { type: 'object', properties: { node: { type: 'number' }, space: { type: 'string' } }, required: ['node', 'space'] },
    async execute(args) { return stopSpace({ node: args.node, space: args.space }); },
  },
  {
    name: 'contextos_space_open',
    description: "Open a project space's home page (http://localhost:<node>/s/<space>/) in the system browser.",
    parameters: { type: 'object', properties: { node: { type: 'number' }, space: { type: 'string' } }, required: ['node', 'space'] },
    async execute(args) { return openSpace({ node: args.node, space: args.space }); },
  },
  {
    name: 'contextos_space_terminal',
    description: "Open a macOS Terminal window at the space's directory (<node>/usr/local/work/<space>).",
    parameters: { type: 'object', properties: { node: { type: 'number' }, space: { type: 'string' } }, required: ['node', 'space'] },
    async execute(args) { return spaceTerminal({ node: args.node, space: args.space }); },
  },
  {
    name: 'contextos_list_spaces',
    description: 'List project spaces on a node (GET /c/dream): full dated name, status, module, version.',
    parameters: {
      type: 'object',
      properties: { node: { type: 'number', description: 'Node port.' } },
      required: ['node'],
    },
    async execute(args) {
      return { node: args.node, spaces: await listSpaces({ node: args.node }) };
    },
  },
  {
    name: 'contextos_create_space',
    description:
      'Create a project space with PUT /c/dream/action/create, wait for the dated name to appear in /c/dream, and wait until the space serves /c/version.',
    parameters: {
      type: 'object',
      properties: {
        node: { type: 'number', description: 'Node port.' },
        name: { type: 'string', description: 'Short space name, [a-zA-Z0-9_-]+.' },
        repos: { type: 'string', description: 'Optional git repository URL (sync clone).' },
      },
      required: ['node', 'name'],
    },
    async execute(args) {
      return createSpace({ node: args.node, name: args.name, repos: args.repos ?? '' });
    },
  },
  {
    name: 'contextos_create_app',
    description:
      'Create a real ContextOS app inside a space: git init, vimer module scaffold (Hash), save a CRUD command, compile, and verify the command answers. Returns the command path used for data.',
    parameters: {
      type: 'object',
      properties: {
        node: { type: 'number', description: 'Node port.' },
        space: { type: 'string', description: 'Full dated space name (see contextos_list_spaces).' },
        name: { type: 'string', description: 'App name, [a-zA-Z][a-zA-Z0-9_]*.' },
        zone: { type: 'string', description: 'Module zone / package directory (default devops).' },
        help: { type: 'string', description: 'Command help text.' },
      },
      required: ['node', 'space', 'name'],
    },
    async execute(args) {
      return createApp({
        node: args.node,
        space: args.space,
        name: args.name,
        zone: args.zone ?? 'devops',
        help: args.help ?? '',
      });
    },
  },
  {
    name: 'contextos_write_data',
    description:
      'Write one record through a ContextOS app command with PUT /action/create. Field values must not contain "/" (the URL path separator). Reads the table back and returns the rows.',
    parameters: {
      type: 'object',
      properties: {
        node: { type: 'number', description: 'Node port.' },
        space: { type: 'string', description: 'Full dated space name.' },
        command: { type: 'string', description: 'Command name, e.g. web.chat.devops.note.' },
        fields: { type: 'object', description: 'Field/value pairs, for example {title, content, user_uid}.' },
      },
      required: ['node', 'space', 'command', 'fields'],
    },
    async execute(args) {
      return writeData({ node: args.node, space: args.space, command: args.command, fields: args.fields ?? {} });
    },
  },
  {
    name: 'contextos_read_data',
    description: 'List records of a ContextOS app command (GET /s/<space>/c/<command>) and return the parsed table plus the row count.',
    parameters: {
      type: 'object',
      properties: {
        node: { type: 'number', description: 'Node port.' },
        space: { type: 'string', description: 'Full dated space name.' },
        command: { type: 'string', description: 'Command name.' },
      },
      required: ['node', 'space', 'command'],
    },
    async execute(args) {
      return readData({ node: args.node, space: args.space, command: args.command });
    },
  },
  {
    name: 'contextos_pipeline',
    description:
      'Run the end-to-end CI/CD loop: deploy node -> create space -> create app -> write a record -> read it back. Returns each step with status and elapsed time.',
    parameters: {
      type: 'object',
      properties: {
        port: { type: 'number', description: 'Node port (default 9188).' },
        space: { type: 'string', description: 'Short space name (default devops_demo; no "-").' },
        app: { type: 'string', description: 'App name (default note).' },
      },
    },
    async execute(args) {
      return runPipeline({ port: args?.port ?? 9188, space: args?.space ?? 'devops_demo', app: args?.app ?? 'note' });
    },
  },
];

async function readBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 2 * 1024 * 1024) throw new Error('request body too large');
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

function send(res, status, payload) {
  const calls = HTTP_DEBUG.getStore();
  if (calls && calls.length) payload = { ...payload, debug: calls.slice(-80) };
  const body = JSON.stringify(payload);
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  res.end(body);
}

async function route(req, res) {
  try {
    await migrateStateOnce();
    const body = await readBody(req);
    const op = String(body.op || 'health');
    const node = Number(body.node);
    if (op === 'health' || op === 'nodes') {
      return send(res, 200, { ok: true, data: { ctxRoot: ctxRoot(), nodes: await listNodes() } });
    }
    if (op === 'git') return send(res, 200, { ok: true, data: await gitStatus({ node, space: body.space }) });
    if (op === 'origin') {
      let host = '';
      try { const a = server && server.address && server.address(); if (a && a.port) host = `${!a.address || a.address === '::' || a.address === '::1' ? '127.0.0.1' : a.address}:${a.port}`; } catch {}
      if (!host) { try { host = String(req.headers.host || ''); } catch {} }
      return send(res, 200, { ok: true, data: { host } });
    }
    if (op === 'stateGet') {
      try { return send(res, 200, { ok: true, data: JSON.parse(await fs.readFile(path.join(stateDir(), 'state.json'), 'utf8')) }); }
      catch { return send(res, 200, { ok: true, data: {} }); }
    }
    if (op === 'stateSet') {
      const name = String(body.name || '');
      if (!name) throw new Error('name is required');
      const file = path.join(stateDir(), 'state.json');
      let data = {};
      try { data = JSON.parse(await fs.readFile(file, 'utf8')); } catch {}
      data[name] = body.value;
      await fs.mkdir(path.dirname(file), { recursive: true });
      await fs.writeFile(file, JSON.stringify(data));
      return send(res, 200, { ok: true, data: { saved: name } });
    }
    if (op === 'deploy') {
      return send(res, 200, {
        ok: true,
        data: await deployNode({ port: body.port, name: body.name, mode: body.mode || 'copy', parent: body.parent || '', repo: body.repo || '', sourceBin: body.sourceBin || '', dir: body.dir || '' }),
      });
    }
    if (op === 'start') return send(res, 200, { ok: true, data: await startNode({ port: body.port }) });
    if (op === 'stop') return send(res, 200, { ok: true, data: await stopNode({ port: body.port }) });
    if (op === 'openNode') return send(res, 200, { ok: true, data: await openNode({ port: body.port }) });
    if (op === 'nodeTerminal') return send(res, 200, { ok: true, data: await nodeTerminal({ port: body.port }) });
    if (op === 'spaceStart') return send(res, 200, { ok: true, data: await startSpace({ node, space: body.space }) });
    if (op === 'spaceStop') return send(res, 200, { ok: true, data: await stopSpace({ node, space: body.space }) });
    if (op === 'spaceOpen') return send(res, 200, { ok: true, data: await openSpace({ node, space: body.space }) });
    if (op === 'spaceTerminal') return send(res, 200, { ok: true, data: await spaceTerminal({ node, space: body.space }) });
    if (op === 'listDir') return send(res, 200, { ok: true, data: await listDir({ node, space: body.space, path: body.path || '' }) });
    if (op === 'mkdir') return send(res, 200, { ok: true, data: await makeDir({ node, space: body.space, path: body.path || '' }) });
    if (op === 'renamePath') return send(res, 200, { ok: true, data: await renamePath({ node, space: body.space, from: body.from || '', to: body.to || '' }) });
    if (op === 'removePath') return send(res, 200, { ok: true, data: await removePath({ node, space: body.space, path: body.path || '' }) });
    if (op === 'compile') return send(res, 200, { ok: true, data: await compileSpace({ node, space: body.space }) });
    if (op === 'tree') return send(res, 200, { ok: true, data: await listTree({ node, space: body.space, path: body.path || '' }) });
    if (op === 'spaceDir') return send(res, 200, { ok: true, data: await spaceDir({ node, space: body.space }) });
    if (op === 'readFile') return send(res, 200, { ok: true, data: await readFile({ node, space: body.space, path: body.path || '' }) });
    if (op === 'writeFile') return send(res, 200, { ok: true, data: await writeFile({ node, space: body.space, path: body.path, content: body.content || '' }) });
    if (op === 'clientError') {
      try {
        await fs.appendFile(path.join(stateDir(), 'client-errors.log'), `[${new Date().toISOString()}] ${String(body.error || '')}\n`);
      } catch {}
      return send(res, 200, { ok: true, data: { logged: true } });
    }
    if (node) await ensureUser(node).catch(() => {});
    if (op === 'spaces') return send(res, 200, { ok: true, data: await listSpaces({ node }) });
    if (op === 'llmInfo') {
      const providers = chatProviders();
      const info = [];
      for (const p of providers) {
        let models = [];
        try { models = await dshLlm.listModels(p.id); } catch {}
        info.push({ id: p.id, name: p.name, models: models.slice(0, 8).map((m) => m.id) });
      }
      return send(res, 200, { ok: true, data: { mounted: !!dshLlm, providers: info } });
    }
    if (op === 'chat') {
      return send(res, 200, {
        ok: true,
        data: await chatWithDSH({ message: body.message, history: body.history || [], context: body.context || {}, provider: body.provider || '', model: body.model || '', mode: body.mode || 'factory' }),
      });
    }
    if (op === 'avatars') return send(res, 200, { ok: true, data: await listAvatars({ node }) });
    if (op === 'createAvatar') return send(res, 200, { ok: true, data: await createAvatar({ node, name: body.name || '', city: body.city || '深圳市', company: body.company || '云轩领航' }) });
    if (op === 'setAvatar') return send(res, 200, { ok: true, data: await setAvatar({ node, uid: body.uid }) });
    if (op === 'updateAvatar') return send(res, 200, { ok: true, data: await updateAvatar({ node, uid: body.uid, patch: body.patch || {} }) });
    if (op === 'projectStatus') return send(res, 200, { ok: true, data: await projectStatus({ node, avatarUid: body.uid || '' }) });
    if (op === 'pmList' || op === 'pmTree') return send(res, 200, { ok: true, data: await pmList({ node, avatarUid: body.uid || '', lang: body.lang || 'zh' }) });
    if (op === 'pmCreate') return send(res, 200, { ok: true, data: await pmCreateItem({ node, avatarUid: body.uid || '', kind: body.kind || '', title: body.title || '', content: body.content || '', targetUid: body.target_uid || '', planUid: body.plan_uid || '', taskUid: body.task_uid || '', reportUid: body.report_uid || '', beginTime: body.begin_time || '', endTime: body.end_time || '', reportType: body.report_type || 'daily', score: body.score || '5', feedbackStatus: body.feedback_status || 'canFinish' }) });
    if (op === 'pmModify' || op === 'pmUpdate') return send(res, 200, { ok: true, data: await pmModifyItem({ node, avatarUid: body.uid || '', kind: body.kind || '', uid: body.item_uid || '', title: body.title || '', content: body.content || '', beginTime: body.begin_time || '', endTime: body.end_time || '', reportType: body.report_type || '', score: body.score || '', feedbackStatus: body.feedback_status || '' }) });
    if (op === 'pmDelete' || op === 'pmRemove') return send(res, 200, { ok: true, data: await pmRemoveItem({ node, avatarUid: body.uid || '', kind: body.kind || '', uid: body.item_uid || '' }) });
    if (op === 'pmAct') return send(res, 200, { ok: true, data: await pmActItem({ node, avatarUid: body.uid || '', kind: body.kind || '', uid: body.item_uid || '', action: body.action || '' }) });
    if (op === 'planProject') return send(res, 200, { ok: true, data: await planProject({ node, avatarUid: body.uid || '', goal: body.goal || '' }) });
    if (op === 'deleteAvatar') return send(res, 200, { ok: true, data: await deleteAvatar({ node, uid: body.uid }) });
    if (op === 'backgrounds') return send(res, 200, { ok: true, data: await listBackgrounds({ node }) });
    if (op === 'createBackground') return send(res, 200, { ok: true, data: await createBackground({ node, name: body.name || '' }) });
    if (op === 'setBackground') return send(res, 200, { ok: true, data: await setBackground({ node, id: body.id || '' }) });
    if (op === 'updateBackground') return send(res, 200, { ok: true, data: await updateBackground({ node, id: body.id || '', patch: body.patch || {} }) });
    if (op === 'deleteBackground') return send(res, 200, { ok: true, data: await deleteBackground({ node, id: body.id || '' }) });
    if (op === 'dockerDeploy') return send(res, 200, { ok: true, data: await dockerDeploy({ port: body.port, dir: body.dir || '', image: body.image || '', name: body.name || '' }) });
    if (op === 'remoteDeploy') return send(res, 200, { ok: true, data: await remoteDeploy({ host: body.host || '', user: body.user || '', sshPort: body.ssh_port || 22, port: body.port, dir: body.dir || '', image: body.image || '' }) });
    if (op === 'remoteLogin') return send(res, 200, { ok: true, data: await remoteLogin({ url: body.url || '', user: body.user || '', pass: body.pass || '' }) });
    if (op === 'files') return send(res, 200, { ok: true, data: await listDataFiles() });
    if (op === 'file') return send(res, 200, { ok: true, data: await readDataFile({ name: body.name || '' }) });
    if (op === 'saveUserMedia') return send(res, 200, { ok: true, data: await saveUserMedia({ node, uid: body.uid || '', kind: body.kind || 'avatar', dataUrl: body.dataUrl || '', name: body.name || '' }) });
    if (op === 'devices') return send(res, 200, { ok: true, data: await discoverDevices({ node }) });
    if (op === 'apps') return send(res, 200, { ok: true, data: await listApps({ node, space: body.space, avatarUid: body.uid || '' }) });
    if (op === 'createInstance') {
      return send(res, 200, {
        ok: true,
        data: await createInstance({ node, space: body.space, command: body.command, place: body.place || '', name: body.name || '我的应用', city: body.city || '深圳市', company: body.company || '云轩领航', uid: body.uid || '' }),
      });
    }
    if (op === 'initSpace') return send(res, 200, { ok: true, data: await initSpace({ node, space: body.space }) });
    if (op === 'autogenApp') {
      return send(res, 200, {
        ok: true,
        data: await autogenApp({ node, space: body.space, name: body.name, help: body.help || '', place: body.place || 'profile', value: body.value || 'profile', trans: body.trans || '' }),
      });
    }
    if (op === 'deleteNode') return send(res, 200, { ok: true, data: await deleteNode({ port: body.port }) });
    if (op === 'deleteSpace') return send(res, 200, { ok: true, data: await deleteSpace({ node, space: body.space }) });
    if (op === 'officialSpaces') return send(res, 200, { ok: true, data: await deployOfficialSpaces({ node, keys: body.keys || [] }) });
    if (op === 'storeAction') return send(res, 200, { ok: true, data: await storeAction({ node, space: body.space || '20240724-community', serviceUid: body.service_uid || '', action: body.action || '' }) });
    if (op === 'storeApps') return send(res, 200, { ok: true, data: await storeApps({ node, lang: body.lang || 'zh' }) });
    if (op === 'createStoreInstance') return send(res, 200, { ok: true, data: await createStoreInstance({ node, service: body.service || {}, name: body.name || '', city: body.city || '深圳市', company: body.company || '云轩领航' }) });
    if (op === 'createSpace') {
      return send(res, 200, { ok: true, data: await createSpace({ node, name: body.name, repos: body.repos || '' }) });
    }
    if (op === 'buildSpace') return send(res, 200, { ok: true, data: await buildSpace({ node, space: body.space }) });
    if (op === 'createApp') {
      return send(res, 200, {
        ok: true,
        data: await createApp({ node, space: body.space, name: body.name, zone: body.zone || 'devops', help: body.help || '' }),
      });
    }
    if (op === 'readData') {
      return send(res, 200, { ok: true, data: await readData({ node, space: body.space, command: body.command }) });
    }
    if (op === 'writeData') {
      return send(res, 200, {
        ok: true,
        data: await writeData({ node, space: body.space, command: body.command, fields: body.fields || {} }),
      });
    }
    if (op === 'removeData') return send(res, 200, { ok: true, data: await removeData(body) });
    if (op === 'pipeline') {
      return send(res, 200, {
        ok: true,
        data: await runPipeline({ port: Number(body.port) || 9188, space: body.space || 'devops_demo', app: body.app || 'note' }),
      });
    }
    return send(res, 404, { ok: false, error: `unknown op ${op}` });
  } catch (error) {
    return send(res, 200, { ok: false, error: String(error?.message || error), steps: error?.steps });
  }
}

// webServer must be ready before apply, otherwise the plugin registers its
// tools but silently loses the HTTP route the Web page calls.
export const inject = ['tools', 'webServer', 'llm'];

export function apply(ctx) {
  dshLlm = ctx.llm || (ctx.get && ctx.get('llm')) || null;
  for (const tool of tools) {
    ctx.effect(() =>
      ctx.tools.register({
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
        output,
        execute: tool.execute,
        isConcurrencySafe: () => false,
      }),
    );
  }

  const STATIC_MIME = {
    '.js': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.ttf': 'font/ttf',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.svg': 'image/svg+xml',
    '.map': 'application/json',
    '.html': 'text/html; charset=utf-8',
    '.png': 'image/png',
  };
  const makeStatic = (prefix, root) => (req, res) => {
    try {
      const pathname = decodeURIComponent(new URL(req.url || '/', 'http://x').pathname);
      const rel = pathname.slice(prefix.length).replace(/^\/+/, '');
      const file = path.normalize(path.join(root, rel));
      if (file !== root && !file.startsWith(root + path.sep)) { res.writeHead(403); res.end(); return; }
      const data = fsp.readFileSync(file);
      const ext = path.extname(file).toLowerCase();
      res.writeHead(200, { 'content-type': STATIC_MIME[ext] || 'application/octet-stream', 'cache-control': 'public, max-age=3600' });
      res.end(data);
    } catch {
      res.writeHead(404);
      res.end();
    }
  };
  const pluginDir = path.dirname(fileURLToPath(import.meta.url));
  const monacoRoot = process.env.CTX_MONACO_DIR || path.join(ctxRoot(), 'usr', 'macos-app', 'Resources', 'monaco');
  const xtermRoot = path.join(pluginDir, 'vendor', 'xterm');
  const threeRoot = path.join(pluginDir, 'vendor', 'three');
  const leafletRoot = path.join(pluginDir, 'vendor', 'leaflet');

  // ---- embedded terminal (WebSocket + PTY via /usr/bin/script) ----
  function wsAccept(key) {
    return crypto.createHash('sha1').update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
  }
  function wsFrame(data) {
    const payload = Buffer.isBuffer(data) ? data : Buffer.from(String(data), 'utf8');
    const len = payload.length;
    let header;
    if (len < 126) header = Buffer.from([0x81, len]);
    else if (len < 65536) header = Buffer.from([0x81, 126, (len >> 8) & 0xff, len & 0xff]);
    else {
      header = Buffer.alloc(10);
      header[0] = 0x81; header[1] = 127;
      header.writeBigUInt64BE(BigInt(len), 2);
    }
    return Buffer.concat([header, payload]);
  }
  const PTY_HELPER = `
import os, sys, pty, select, fcntl, termios, struct, signal
def main():
    cwd = sys.argv[1]
    shell = sys.argv[2] if len(sys.argv) > 2 else (os.environ.get('SHELL') or '/bin/zsh')
    os.chdir(cwd)
    pid, fd = pty.fork()
    if pid == 0:
        os.environ['TERM'] = 'xterm-256color'
        os.execvp(shell, [shell])
    def nonblock(f):
        fcntl.fcntl(f, fcntl.F_SETFL, fcntl.fcntl(f, fcntl.F_GETFL) | os.O_NONBLOCK)
    nonblock(fd); nonblock(0)
    while True:
        r, _, _ = select.select([fd, 0], [], [])
        if fd in r:
            try:
                data = os.read(fd, 65536)
                if not data: break
                os.write(1, data)
            except OSError:
                pass
        if 0 in r:
            try:
                data = os.read(0, 65536)
                if not data: break
                if data.startswith(b'\\x00CTX_RESIZE '):
                    try:
                        cols, rows = data.decode().strip().split(' ')[1:3]
                        fcntl.ioctl(fd, termios.TIOCSWINSZ, struct.pack('HHHH', int(rows), int(cols), 0, 0))
                        os.kill(pid, signal.SIGWINCH)
                    except Exception:
                        pass
                else:
                    os.write(fd, data)
            except OSError:
                pass
main()
`;

  function terminalUpgrade(req, socket, head) {
    const key = req.headers['sec-websocket-key'];
    if (!key) { socket.destroy(); return; }
    socket.write(
      'HTTP/1.1 101 Switching Protocols\r\n' +
      'Upgrade: websocket\r\n' +
      'Connection: Upgrade\r\n' +
      `Sec-WebSocket-Accept: ${wsAccept(key)}\r\n\r\n`,
    );
    let cwd = os.homedir();
    try {
      const p = new URL(req.url || '/', 'http://x').searchParams.get('cwd');
      if (p) cwd = decodeURIComponent(p);
    } catch { /* keep home */ }
    if (!fsp.existsSync(cwd)) cwd = os.homedir();

    const shell = process.env.SHELL || '/bin/zsh';
    const python = process.env.PYTHON || 'python3';
    const child = spawn(python, ['-c', PTY_HELPER, cwd, shell], {
      env: { ...process.env }, stdio: ['pipe', 'pipe', 'pipe'],
    });

    let buf = Buffer.alloc(0);
    const feed = (chunk) => {
      buf = Buffer.concat([buf, chunk]);
      while (buf.length >= 2) {
        const b0 = buf[0], b1 = buf[1];
        const opcode = b0 & 0x0f;
        const masked = (b1 & 0x80) !== 0;
        let len = b1 & 0x7f, off = 2;
        if (len === 126) { if (buf.length < 4) return; len = buf.readUInt16BE(2); off = 4; }
        else if (len === 127) { if (buf.length < 10) return; len = Number(buf.readBigUInt64BE(2)); off = 10; }
        let mask;
        if (masked) { if (buf.length < off + 4) return; mask = buf.subarray(off, off + 4); off += 4; }
        if (buf.length < off + len) return;
        const payload = Buffer.from(buf.subarray(off, off + len));
        buf = buf.subarray(off + len);
        if (masked) for (let i = 0; i < payload.length; i++) payload[i] ^= mask[i & 3];
        if (opcode === 0x8) { try { child.kill(); } catch {} return; }
        if (opcode === 0x9) { socket.write(wsFrame(Buffer.concat([Buffer.from([0x8a, 0]), payload]))); continue; }
        if (opcode === 0x2 || opcode === 0x1) { try { child.stdin.write(payload); } catch {} }
      }
    };
    child.stdout.on('data', (d) => { try { socket.write(wsFrame(d)); } catch {} });
    child.stderr.on('data', (d) => { try { socket.write(wsFrame(d)); } catch {} });
    child.on('exit', () => { try { socket.end(); } catch {} });
    socket.on('data', feed);
    socket.on('error', () => { try { child.kill(); } catch {} });
    socket.on('close', () => { try { child.kill(); } catch {} });
    if (head && head.length) feed(head);
  }

  const server = ctx.webServer || ctx.get('webServer');
  if (server) {
    ctx.effect(() => server.registerUpgrade({ path: '/contextos-devops-dsh/terminal', handler: terminalUpgrade }));
    ctx.effect(() =>
      server.register({
        kind: 'exact',
        path: ROUTE,
        handler: (req, res) => {
          HTTP_DEBUG.run([], () => {
            route(req, res).catch((error) => send(res, 200, { ok: false, error: String(error?.message || error) }));
          });
        },
      }),
    );
    ctx.effect(() => server.register({ kind: 'prefix', path: '/contextos-devops-dsh/monaco', handler: makeStatic('/contextos-devops-dsh/monaco', monacoRoot) }));
    ctx.effect(() => server.register({ kind: 'prefix', path: '/contextos-devops-dsh/xterm', handler: makeStatic('/contextos-devops-dsh/xterm', xtermRoot) }));
    ctx.effect(() => server.register({ kind: 'prefix', path: '/contextos-devops-dsh/three', handler: makeStatic('/contextos-devops-dsh/three', threeRoot) }));
    ctx.effect(() => server.register({ kind: 'prefix', path: '/contextos-devops-dsh/leaflet', handler: makeStatic('/contextos-devops-dsh/leaflet', leafletRoot) }));
  }
}
