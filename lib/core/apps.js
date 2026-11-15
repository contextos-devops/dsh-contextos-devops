// 核心业务：应用（模板生成/代码/实例/商店/最近应用）。
import fs from 'node:fs/promises';
import fsp from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { http, encode, baseUrl, envelopeRows } from '../base/http.js';
import { listNodes } from '../base/registry.js';
import { ctxRoot } from '../base/env.js';
import { DatabaseSync } from 'node:sqlite';
import { fieldSegments } from '../base/field.js';
import { waitFor } from '../misc/async.js';
import { initSpace, buildSpace, ensureSpaceProcess, startSpace } from './spaces.js';
import { goBinary } from './gobuild.js';
import { resolveActorUid } from './identity.js';
import { ensureUser } from './users.js';

export async function storeApps({ node, lang = 'zh' } = {}) {
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

export async function storeAction({ node, space = '20240724-community', serviceUid = '', action = '' } = {}) {
  if (!/^(online|offline|code|conf|data)$/.test(action)) throw new Error('unsupported store action');
  const uid = await ensureUser(node);
  const r = await http(node, `/s/${encode(space)}/c/web.team.gonganxitong.service/action/${action}?uid=${encode(serviceUid)}&user.uid=${encode(uid)}`, { method: 'POST', timeout: 20000 });
  if (r.status !== 200) throw new Error(`store ${action} failed: HTTP ${r.status}`);
  return { action, serviceUid, status: r.status };
}

export async function createStoreInstance({ node, service = {}, name = '', city = '深圳市', company = '云轩领航', uid = '' } = {}) {
  if (!service.space || !service.command) throw new Error('service space/command is required');
  const title = name || String(service.name || '').split(/\s+/)[0] || '我的应用';
  const r = await createInstance({ node, space: service.space, command: service.command, place: service.place || '', name: title, city, company, serviceUid: service.uid, uid });
  return { ...r, service };
}

export async function listApps({ node, space, avatarUid = '' } = {}) {
  const n = (await listNodes()).find((x) => x.port === Number(node));
  if (!n) throw new Error(`node ${node} not found`);
  // One identity per node: an explicit avatar wins, otherwise the node's own
  // account — never "no identity", so create/list/visit always agree.
  const uid = await resolveActorUid(node, avatarUid);
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

export async function scanApps({ node, space } = {}) {
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

// The community autogen action writes model/portal/common but (on the current
// node build) omits the per-value files that portal.go instantiates. Generate
// them locally before compiling so a generated app is not a half-written tree.
function ensureAutogenValues(dir, name, place, values) {
  const appDir = path.join(dir, 'src', name);
  fsp.mkdirSync(appDir, { recursive: true });
  values.forEach((value, index) => {
    const file = path.join(appDir, `${value}.go`);
    if (fsp.existsSync(file)) return;
    const source = `package ${name}

import "shylinux.com/x/ice"

type ${value} struct {
\tTable
\torder  string \`data:"${index + 1}"\`
\tfields string \`data:"title,content,user_uid"\`
\tcreate string \`name:"create title* content" role:"worker"\`
\tlist   string \`name:"list ${place}_uid uid auto" role:"worker"\`
}

func (s ${value}) Remove(m *ice.Message, arg ...string) {
\ts.ValueRemove(m, arg...)
}
func (s ${value}) List(m *ice.Message, arg ...string) {
\ts.ValueList(m, arg)
\ts.TableButton(m, func(value ice.Maps) (button []ice.Any) {
\t\treturn append(button, s.Modify, s.Remove)
\t})
}

func init() { ice.TeamCtxCmd(${value}{}) }
`;
    fsp.writeFileSync(file, source);
  });
}


// 生成应用模板：调云社区服务 service/action/autogen（name/help/place/value/trans/space）。
const APP_CHAIN = 'target,plan,task,report,feedback';
const APP_CHAIN_CN = '目标,计划,任务,报告,反馈';

// service autogen 的参数表直接读命令自省接口里的 meta.autogen，
// 不在客户端另写一份参数清单。
// 应用模板名不能和云社区 service 列表、目标空间已有模块重名。
// 返回一个可用名字（重名时自动加序号），客户端把它填进表单。
export async function uniqueAppName({ node, space = '', name = '' } = {}) {
  if (!node) throw new Error('node is required');
  const base = String(name || '').trim();
  if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(base)) throw new Error('app name must match [a-zA-Z][a-zA-Z0-9_]*');
  const used = new Set();
  try {
    for (const s of await storeApps({ node })) {
      const m = /^web\.team\.([a-zA-Z0-9_]+)\./i.exec(String(s.command || ''));
      if (m) used.add(m[1].toLowerCase());
    }
  } catch { /* service 列表拿不到时只按本地模块判断 */ }
  const n = (await listNodes()).find((x) => x.port === Number(node));
  if (n && space) {
    const dir = path.join(n.dir, 'usr', 'local', 'work', space, 'src');
    try {
      for (const e of await fs.readdir(dir, { withFileTypes: true })) {
        if (e.isDirectory()) used.add(e.name.toLowerCase());
      }
    } catch { /* 空间还没克隆源码 */ }
  }
  let out = base;
  let i = 2;
  while (used.has(out.toLowerCase())) out = `${base}${i++}`;
  return { name: out, base, renamed: out !== base, used: [...used].sort() };
}

export async function autogenSpec({ node } = {}) {
  if (!node) throw new Error('node is required');
  const r = await http(node, '/s/20240724-community/c/command/web.team.gonganxitong.service', { method: 'GET', timeout: 12000 });
  if (r.status !== 200) throw new Error(`autogen spec failed: HTTP ${r.status}`);
  const env = JSON.parse(r.text);
  const meta = JSON.parse((Array.isArray(env.meta) ? env.meta[0] : env.meta) || '{}');
  const list = Array.isArray(meta.autogen) ? meta.autogen : [];
  if (!list.length) throw new Error('service autogen meta is empty');
  const trans = (meta._trans && meta._trans.input) || {};
  const fields = list.map((f) => ({
    name: String(f.name || ''),
    label: trans[f.name] || String(f.name || ''),
    required: f.need === 'must',
    type: f.type || 'text',
  })).filter((f) => f.name);
  return { fields, source: 'service.meta.autogen', raw: list };
}

export async function autogenService({ node, space, name, help = '', place = '', value = APP_CHAIN, trans = APP_CHAIN_CN } = {}) {
  if (!node || !space) throw new Error('node and space are required');
  if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(name || '')) throw new Error('app name must match [a-zA-Z][a-zA-Z0-9_]*');
  const uid = await ensureUser(node);
  const { valueText, transText } = normalizeValueTrans(value || APP_CHAIN, trans || APP_CHAIN_CN);
  const seg = fieldSegments({ name, help: help || name, place, value: valueText, trans: transText, space });
  const r = await http(node, `/s/20240724-community/c/web.team.gonganxitong.service/action/autogen/${seg}?user.uid=${encode(uid)}`, { method: 'POST', timeout: 180000 });
  if (r.status !== 200) throw new Error(`autogen failed: HTTP ${r.status}`);
  const n = (await listNodes()).find((x) => x.port === Number(node));
  const dir = n ? path.join(n.dir, 'usr', 'local', 'work', space, 'src', name) : '';
  const made = dir ? fsp.existsSync(dir) : false;
  // 生成后必须编译空间，模板才能在应用商店里被创建（未编译时实例会 404）。
  let built = false;
  let buildNote = '';
  let warm = false;
  if (made) {
    try {
      const b = await buildSpace({ node, space });
      built = !!(b && b.rebuilt);
      // 编译会重启空间；重启后有一段时间所有动作只回 echo 回执。
      // 不把这段时间等掉，用户第一次点「创建实例」必然失败。
      // 只探一次，不等待：界面用 spaceReady 轮询显示「编译中/已就绪」
      warm = await isCommandReady({ node, space, command: `web.team.${name}.portal` });
    } catch (e) {
      buildNote = e.message || String(e);
    }
  }
  return { space, name, dir, created: made, built, warm, buildNote, via: 'service' };
}

// value/trans 成对归一：value 用英文逗号，trans 用中文顿号，
// 数量不一致时按 value 补齐（缺失的中文名退回英文名，绝不丢项）。
export function normalizeValueTrans(value, trans) {
  const names = String(value || '').split(/[,，、;；\s]+/).filter(Boolean);
  const labels = String(trans || '').split(/[,，、;；]+/).map((x) => x.trim()).filter(Boolean);
  const fixed = names.map((n, i) => (labels[i] || n).replace(/[,，、;；]/g, ''));
  return { valueText: names.join(','), transText: fixed.join('、') };
}

export async function autogenApp({ node, space, name, help = '', place = 'profile', value = 'profile', trans = '' } = {}) {
  if (!goBinary()) throw new Error('Go toolchain not found; install usr/local/go or set GO');
  if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(name || '')) throw new Error('app name must match [a-zA-Z][a-zA-Z0-9_]*');
  if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(place || '')) throw new Error('place must match [a-zA-Z][a-zA-Z0-9_]*');
  const values = String(value || '').split(/[,，、]/).map((x) => x.trim()).filter(Boolean);
  if (!values.length || values.some((x) => !/^[a-zA-Z][a-zA-Z0-9_]*$/.test(x))) {
    throw new Error('value must be comma-separated ASCII field names; put Chinese labels in trans');
  }
  const n = (await listNodes()).find((x) => x.port === Number(node));
  if (!n) throw new Error(`node ${node} not found`);
  const dir = path.join(n.dir, 'usr', 'local', 'work', space);
  if (!fsp.existsSync(path.join(dir, '.git'))) await initSpace({ node, space });
  const title = help || name;
  // service/autogen 按中文顿号「、」切分 trans；统一把所有分隔符归一为「、」，
  // 保证每个 value 都有对应的中文名（少一个就会渲染成空标题）。
  const { valueText, transText } = normalizeValueTrans(value, trans);
  const q = new URLSearchParams({ name, help: title, place, value: valueText, trans: transText, space });
  const r = await http(node, `/s/20240724-community/c/web.team.gonganxitong.service/action/autogen?${q}`, {
    method: 'POST',
    timeout: 60000,
  });
  if (r.status !== 200) throw new Error(`autogen failed: HTTP ${r.status}`);
  const portalFile = path.join(dir, 'src', name, 'portal.json');
  await waitFor(async () => fsp.existsSync(portalFile), { timeout: 20000, interval: 500, label: `app ${name}/portal.json` });
  const work = await ensureGoWork(dir).catch((e) => ({ used: false, error: String(e?.message || e) }));
  // The autogen template imports ice/devops, community, enterprise and
  // mysql-story. Without the root ice requirement Go tries to fetch each
  // subpackage as its own module and fails with "declares its path as ice".
  const module = await modulePath(space, n.dir);
  await ensureGoMod({ node, space, dir: n.dir, module });
  ensureAutogenValues(dir, name, place, values);
  await buildSpace({ node, space });
  return {
    node: Number(node),
    space,
    name,
    help: title,
    place,
    command: `web.team.${name}.portal`,
    path: `src/${name}/portal.json`,
    built: true,
    warning: '',
    goWork: work,
  };
}

// 空间重启期间所有动作只回 echo 回执（body 只有 detail），此时创建实例必然失败。
// 这里只做「一次性问一下」，供界面轮询，不阻塞任何请求。
export async function isCommandReady({ node, space, command } = {}) {
  try {
    const r = await http(node, `/s/${encode(space)}/c/${command}`, { timeout: 6000 });
    const txt = String(r.text || '');
    if (r.status !== 200) return false;
    // 命令已注册时回执里有 index/help/list/meta；未注册时是 echo：
    // {"detail":[...], "_handle":["true"], "_process":["_cookie"]}
    if (/"detail"\s*:/.test(txt) || /"_handle"\s*:\s*\["true"\]/.test(txt)) return false;
    return /"index"\s*:/.test(txt) && /"meta"\s*:/.test(txt);
  } catch {
    return false;
  }
}

export async function createInstance({ node, space, command, place = '', name = '我的应用', city = '深圳市', company = '云轩领航', serviceUid = '', uid = '' } = {}) {
  if (!space || !command) throw new Error('space and command are required');
  const actorUid = await resolveActorUid(node, uid);
  // 固定三个参数，按声明顺序：city_name / company_name / system_name（应用名）
  const placeKey = /_name$/.test(place) ? place : `${place || 'system'}_name`;
  const fields = { city_name: city, company_name: company, [placeKey]: name };
  const seg = fieldSegments(fields);
  const extra = serviceUid ? `&service_uid=${encode(serviceUid)}` : '';
  const placeUrl = `/s/${encode(space)}/c/${command}/action/placeCreate/${seg}?user.uid=${encode(actorUid)}${extra}`;
  let r = await http(node, placeUrl, { method: 'PUT', timeout: 30000, redirect: 'manual', headers: { accept: 'application/json' } });
  let body = String(r.text || '');
  let status = Number(r.status);
  if (status !== 200 && status !== 201) throw new Error(`placeCreate failed: HTTP ${status} ${body.slice(0, 120)}`);
  // 空回执通常是空间正在重启（echo）。只再试一次，然后明确报错，绝不长等。
  if (!/place_uid|_process|project_uid|system_uid|warn:/.test(body)) {
    await new Promise((ok) => setTimeout(ok, 1500));
    r = await http(node, placeUrl, { method: 'PUT', timeout: 30000, redirect: 'manual', headers: { accept: 'application/json' } });
    body = String(r.text || '');
    status = Number(r.status);
    if (status !== 200 && status !== 201) throw new Error(`placeCreate failed: HTTP ${status} ${body.slice(0, 120)}`);
    if (!/place_uid|_process|project_uid|system_uid|warn:/.test(body)) {
      throw new Error('空间正在编译/重启（命令尚未注册），请等提示「模板已就绪」后再创建实例');
    }
  }
  let env = {};
  try { env = JSON.parse(body); } catch { /* plain text reply */ }
  // `_process: ["_open"]` means "open this URL next": `_arg[0]` is the new
  // instance URL and its query already carries the place uid (`project_uid`,
  // `system_uid`, …). Opening it is also what registers 最近应用.
  const process = env._process?.[0] || env._process || '';
  const openUrl = String((Array.isArray(env._arg) ? env._arg[0] : env._arg) || '');
  let opened = '';
  let placeUid = '';
  let visited = false;
  let tried = '';
  if (process === '_open' && openUrl) {
    let pathname = openUrl;
    try { const u = new URL(openUrl); pathname = u.pathname + u.search; } catch { /* already a path */ }
    const q = pathname.includes('?') ? pathname.slice(pathname.indexOf('?') + 1) : '';
    const params = new URLSearchParams(q);
    placeUid = params.get('project_uid') || params.get('system_uid') || params.get('place_uid') || params.get('target_uid') || params.get('app_uid') || '';
    if (!placeUid) placeUid = (pathname.match(/\/c\/[^/?]+\/([0-9a-f]{32})/) || [])[1] || '';
    const visit = pathname.replace(/([?&])debug=true&?/, '$1').replace(/[?&]$/, '');
    const withUser = /(?:\?|&)user\.uid=/.test(visit) ? visit : `${visit}${visit.includes('?') ? '&' : '?'}user.uid=${encode(actorUid)}&user_uid=${encode(actorUid)}`;
    // 最近应用 is written by the portal's `arg[0]` (place uid in the path); the
    // `_open` URL carries it as a query option, so visit the path form as well.
    const pathVisit = `/s/${encode(space)}/c/${command}/${encode(placeUid)}?user.uid=${encode(actorUid)}&user_uid=${encode(actorUid)}${extra}`;
    tried = pathVisit;
    try {
      const page = await http(node, pathVisit, { timeout: 20000 });
      visited = page.status === 200;
    } catch { /* best effort */ }
    opened = withUser;
    try { await http(node, withUser, { timeout: 20000 }); } catch { /* open as instructed */ }
  }
  // Older replies only carry `warn: not allow: <user_place_uid>` or a redirect.
  const warnUid = (/^warn:\s*not allow:\s*([0-9a-f]{32})\s*$/i.exec(body.trim()) || [])[1] || '';
  if (!placeUid && !warnUid && /^warn:/i.test(body.trim())) throw new Error(`placeCreate rejected: ${body.trim().slice(0, 200)}`);
  let userPlaceUid = warnUid || (env.uid?.[0] || '');
  if (!placeUid && !userPlaceUid) {
    const location = String(r.headers?.location || '');
    userPlaceUid = (location.match(/\/c\/[^/?]+\/([0-9a-f]{32})/) || [])[1] || '';
  }
  if (!placeUid) {
    // Derive the place uid from the reply uid / portal list / space sqlite, then
    // visit until the portal resolves the place (it answers with `_place_name`).
    let rows = [];
    try {
      const page = await http(node, `/s/${encode(space)}/c/${command}?user.uid=${encode(actorUid)}${extra}`, { timeout: 12000 });
      rows = envelopeRows(page.text).rows;
    } catch { /* list may be inaccessible */ }
    const row = rows.find((x) => x.uid === userPlaceUid)
      || rows.filter((x) => !serviceUid || String(x.service_uid || '') === String(serviceUid)).reverse()
        .find((x) => String(x[placeKey] || x.name || x.title || '') === name);
    const skip = /^(uid|user_uid|company_uid|auth_uid|city_uid|street_uid|service_uid|avatar_uid|place_uid)$/;
    const queue = [];
    const push = (key, value) => { if (value && /^[0-9a-f]{32}$/.test(value) && !queue.some((c) => c.uid === value)) queue.push({ key, uid: value }); };
    if (row) for (const [k, v] of Object.entries(row)) if (/_uid$/.test(k) && !skip.test(k) && typeof v === 'string') push(k, v);
    push('reply', userPlaceUid);
    if (!queue.length) push('db', await findPlaceUidByDb({ node, space, command, name }));
    for (const c of queue.slice(0, 3)) {
      const path = `/s/${encode(space)}/c/${command}/${encode(c.uid)}?user.uid=${encode(actorUid)}&user_uid=${encode(actorUid)}${extra}`;
      try {
        const page = await http(node, path, { timeout: 20000 });
        let resolved = false;
        try { resolved = Boolean(JSON.parse(page.text)._place_name?.[0]); } catch { /* html portal */ }
        tried = path;
        if (resolved) { placeUid = c.uid; visited = true; break; }
      } catch { tried = path; }
    }
  }
  try {
    const recent = await listApps({ node, avatarUid: actorUid });
    if (placeUid) visited = recent.some((a) => a.place_uid === placeUid) || visited;
  } catch { /* recent is best effort */ }
  return { node: Number(node), space, command, place: placeKey, name, city, company, uid: actorUid, place_uid: placeUid, result: placeUid, user_place_uid: userPlaceUid, service_uid: serviceUid, created: true, visited, opened, tried, process, hint: placeUid ? '' : body.slice(0, 200) };
}

// The portal list is the normal way to learn a place uid, but some portals
// (审批系统: `systems`, role void) keep the new place out of the caller's list.
// Fall back to the space's own sqlite file: the place table is the plural of the
// `<x>_name` field used by placeCreate.
export async function findPlaceUidByDb({ node, space, command, name = '' }) {
  const n = (await listNodes()).find((x) => x.port === Number(node));
  if (!n || !space) return '';
  const module = String(command || '').split('.')[2] || '';
  if (!/^[A-Za-z0-9_]+$/.test(module)) return '';
  const dir = path.join(n.dir, 'usr', 'local', 'work', space, 'var', 'db', `${module}.db`);
  let db;
  try { db = new DatabaseSync(dir, { readOnly: true }); } catch { return ''; }
  try {
    const tables = db.prepare("select name from sqlite_master where type='table'").all().map((r) => r.name);
    const wanted = [module, module.replace(/xitong$/, ''), 'places', 'systems', 'projects', 'apps'];
    const picks = tables.filter((t) => wanted.includes(t) || /^(systems|projects|places|apps)$/.test(t));
    for (const t of picks) {
      try {
        const cols = db.prepare(`pragma table_info(${t})`).all().map((c) => c.name);
        if (!cols.includes('uid') || !cols.includes('name')) continue;
        const q = name ? `select uid from ${t} where name = ? order by id desc limit 1` : `select uid from ${t} order by id desc limit 1`;
        const row = name ? db.prepare(q).get(name) : db.prepare(q).get();
        if (row?.uid) return String(row.uid);
      } catch { /* table shape differs */ }
    }
    return '';
  } finally { try { db.close(); } catch { /* ignore */ } }
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

async function modulePath(space, dir) {
  try {
    const goMod = await fs.readFile(path.join(dir, 'usr', 'local', 'work', space, 'go.mod'), 'utf8');
    return /^module\s+(\S+)/m.exec(goMod)?.[1] || space.replace(/^\d{8}-/, '');
  } catch {
    return space.replace(/^\d{8}-/, '');
  }
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

export async function createApp({ node, space, name, zone = 'devops', help = '' }) {
  if (!goBinary()) throw new Error('Go toolchain not found; install usr/local/go or set GO');
  if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(name || '')) throw new Error('app name must match [a-zA-Z][a-zA-Z0-9_]*');
  if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(zone)) throw new Error('zone must match [a-zA-Z][a-zA-Z0-9_]*');
  const pod = encode(space);
  const short = space.replace(/^\d{8}-/, '');
  const init = await http(
    node,
    `/s/${pod}/c/web.code.git.status/action/init?remote=${encode(`https://shylinux.com/x/${short}`)}&space.noecho=true`,
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

  // Build in-process with the local Go toolchain and restart the space so the
  // daemon loads the new binary; the host PATH may not contain go.
  await buildSpace({ node, space });

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

// 应用功能的创建表单：直接读模块的 portal.json（input 给字段，value 给选项）
// 从框架的命令自省接口读操作参数：
//   GET /s/<space>/c/command/<command>
//   meta = { create: [{name,type,need}], _trans: { input: {字段: 中文名} }, … }
async function commandFields({ node, space, command, action = 'create' }) {
  const r = await http(node, `/s/${encode(space)}/c/command/${command}`, { timeout: 12000, headers: { accept: 'application/json' } });
  if (r.status !== 200) return [];
  let env = {};
  try { env = JSON.parse(r.text); } catch { return []; }
  let meta = {};
  try { meta = JSON.parse(env.meta?.[0] || '{}'); } catch { meta = {}; }
  const labels = (meta._trans && meta._trans.input) || {};
  const LABEL_EN = { title: 'Title', content: 'Content', name: 'Name', system_uid: 'System', uid: 'ID', index: 'Index', begin_time: 'Begin', end_time: 'End', status: 'Status', remark: 'Remark', desc: 'Description', phone: 'Phone', email: 'Email', address: 'Address', city_name: 'City', company_name: 'Company', project_name: 'Project' };
  const spec = Array.isArray(meta[action]) ? meta[action] : [];
  const fields = [];
  for (const it of spec) {
    const name = String(it.name || '');
    if (!name) continue;
    fields.push({
      name,
      key: name.replace(/_uid$/, ''),
      label: String(labels[name] || it.title || name),
      labelEn: String(LABEL_EN[name] || name),
      type: it.type === 'select' || it.type === 'checkbox' || it.type === 'radio' ? 'select' : 'text',
      options: Array.isArray(it.options) ? it.options : [],
      required: it.need === 'must',
    });
  }
  if (fields.length) return fields;
  // meta 没给该动作的参数时，退回 list 的描述
  let list = [];
  try { list = JSON.parse(env.list?.[0] || '[]'); } catch { list = []; }
  const SKIP = new Set(['uid', 'list', 'back', 'refresh', 'open', 'delete', 'remove']);
  for (const it of list) {
    const name = String(it.name || '');
    if (!name || SKIP.has(name) || it.action || it.type === 'button') continue;
    fields.push({
      name,
      key: name.replace(/_uid$/, ''),
      label: String(labels[name] || it.title || it.label || name),
      type: it.type === 'select' && Array.isArray(it.options) && it.options.length ? 'select' : 'text',
      options: Array.isArray(it.options) ? it.options : [],
      required: Boolean(it.required),
    });
  }
  return fields;
}

export async function appFields({ node, space, command = '' } = {}) {
  const n = (await listNodes()).find((x) => x.port === Number(node));
  if (!n) throw new Error(`node ${node} not found`);
  const mod = String(command).split('.')[2] || '';
  if (!space || !mod) throw new Error('space and command are required');
  // 空间没启动时自省会回 echo，先确保空间在跑
  const raw = await http(node, `/s/${encode(space)}/c/${command}`, { timeout: 6000 }).catch(() => null);
  if (raw && /"detail"\s*:/.test(String(raw.text || ''))) {
    try { await startSpace({ node, space }); } catch { /* 起不来就按下面的兜底走 */ }
    await new Promise((r) => setTimeout(r, 2500));
  }
  // 首选：直接问命令本身要「创建」的参数（/c/<command>?action=create）
  const asked = await commandFields({ node, space, command }).catch(() => []);
  if (asked.length) return asked.slice(0, 8);
  const file = path.join(n.dir, 'usr', 'local', 'work', space, 'src', mod, 'portal.json');
  let portal = {};
  try { portal = JSON.parse(await fs.readFile(file, 'utf8')); } catch { return []; }
  const input = portal.input || {};
  const value = portal.value || {};
  const out = [];
  for (const [name, label] of Object.entries(input)) {
    if (/^My /.test(name)) continue;
    if (/(_count|_space|_role)$/.test(name)) continue;
    const key = name.replace(/_uid$/, '');
    const opts = value[key] || value[name];
    const options = opts && typeof opts === 'object'
      ? Object.entries(opts).filter(([k]) => k !== 'style').map(([k, v]) => ({ value: k, label: String(v) }))
      : [];
    out.push({ name, key, label: String(label), type: options.length ? 'select' : 'text', options, required: /_uid$/.test(name) });
  }
  // 去掉引用型噪声：有 xxx_title/xxx_name 时就不再单独要 xxx_uid；状态由服务端算
  const titles = new Set(out.filter((f) => /_(title|name)$/.test(f.name)).map((f) => f.name.replace(/_(title|name)$/, '')));
  const kept = out.filter((f) => {
    if (/_status$/.test(f.name)) return false;
    const root = f.name.replace(/_uid$/, '');
    if (/_uid$/.test(f.name) && titles.has(root)) return false;
    return true;
  });
  return kept.slice(0, 8);
}
