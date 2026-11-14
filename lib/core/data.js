// 核心业务：应用数据读写（create/modify/remove + 回读）。
import { http, encode, envelopeShape } from '../base/http.js';
import { parseTable } from '../base/table.js';
import { fieldSegments, splitFields } from '../base/field.js';
import { waitFor } from '../misc/async.js';
import { apiPath, dataPath, portalOf, placeUidKey, methodOf } from '../base/url.js';

// URL 形状统一在 lib/base/url.js（接口 URL / 网页 URL 两套，见 docs/URL-SPEC.md）
const portalPath = portalOf;

// 空间没启动时，任何请求都只回 echo（body 只有 detail），写数据自然不生效。
async function reviveSpace(node, space) {
  try { await http(node, `/c/dream/action/start?name=${encode(space)}`, { method: 'POST', timeout: 60000 }); } catch { /* ignore */ }
  await new Promise((r) => setTimeout(r, 2500));
}

// 内核没有并发控制：同一个 (节点, 空间, 命令, 实例) 上的写操作串行化，
// 避免两个对话同时提交造成重复创建 / 覆盖。
const WRITE_QUEUE = new Map();
function serialize(key, fn) {
  const prev = WRITE_QUEUE.get(key) || Promise.resolve();
  const run = prev.then(fn, fn);
  WRITE_QUEUE.set(key, run.catch(() => {}));
  return run;
}

async function writeDataRaw({ node, space, command, fields = {}, action = 'create', uid = '', scope = {} }) {
  // 实例条件就是 <place>_uid（place 是表名，默认 system），不存在通用的 system_uid
  const systemUid = String((scope && (scope['system_uid'] || scope['project_uid'] || Object.entries(scope).find(([k, v]) => /_uid$/.test(k) && k !== 'user_uid' && v)?.[1])) || '');
  const portal = systemUid ? portalPath(command) : '';
  const parts = splitFields(fields);
  const seg = fieldSegments(parts.path);
  // 门户转发要拿回执（判断是否真的写入），不再用 noecho
  const query = new URLSearchParams(portal ? {} : { 'space.noecho': 'true' });
  const actor = String(uid || scope.user_uid || scope['user.uid'] || '');
  if (uid) query.set('uid', uid);
  if (actor) { query.set('user.uid', actor); query.set('user_uid', actor); }
  for (const [k, v] of Object.entries(parts.query)) query.set(k, v);
  for (const [k, v] of Object.entries(scope || {})) if (v) query.set(k, v);
  let after;
  for (let attempt = 0; attempt < 3 && !after; attempt++) {
    if (attempt) await new Promise((r) => setTimeout(r, attempt * 2500));
    const q = Object.fromEntries(query.entries());
    // 写：/action/run/<cmd>/action/<action>/<k>/<v>…?user.uid=&<place>_uid=
    const path = portal ? dataPath({ pod: space, command, action, seg, portal, scope: q }) : apiPath({ pod: space, command, action, seg, scope: q, portal });
    const wrote = await http(node, path, { method: methodOf({ action }), timeout: 30000 });
    if (/"detail"\s*:/.test(String(wrote.text || ''))) {
      // 空间未启动/重启中：先把空间拉起来再重试
      await reviveSpace(node, space);
      continue;
    }
    let wroteCount = '';
    try {
      const st = JSON.parse(JSON.parse(wrote.text)._status?.[0] || '[]');
      wroteCount = String(st.find((x) => x.name === 'count')?.value || '');
    } catch { wroteCount = ''; }
    if (wroteCount && !/^0x0$/.test(wroteCount)) {
      // 创建回执本身就是新行：直接从中取 uid，供详情链接使用
      let columns = [];
      let rows = [];
      let newUid = '';
      try {
        const env0 = JSON.parse(wrote.text);
        const raw0 = env0.result ?? env0._result ?? env0.uid ?? '';
        const first0 = Array.isArray(raw0) ? raw0[0] : raw0;
        newUid = /^[0-9a-f]{24,64}$/i.test(String(first0 || '')) ? String(first0) : '';
      } catch { /* 无 result 时留空 */ }
      try {
        const env = JSON.parse(wrote.text);
        columns = Array.isArray(env.append) ? env.append : [];
        const height = columns.length && Array.isArray(env[columns[0]]) ? env[columns[0]].length : 0;
        rows = Array.from({ length: height }, (_, i) => {
          const row = {};
          for (const c of columns) row[c] = Array.isArray(env[c]) ? env[c][i] : '';
          return row;
        });
      } catch { /* 回执不是表格结构时忽略 */ }
      return { node, space, command, count: wroteCount, columns, rows, uid: newUid || rows[0]?.uid || '', write: { action, fields }, via: portal ? 'portal' : 'direct' };
    }
    try {
      after = await waitFor(async () => {
        const data = await readData({ node, space, command, query: scope });
        return data.count && !/^0x/.test(data.count) ? data : undefined;
      }, { timeout: 6000, interval: 600, label: `record in ${command}` });
    } catch {
      /* the space may still be restarting after compile; retry the write once */
    }
  }
  if (!after) throw new Error(`写入未生效：空间可能正在编译/重启，请等「模板已就绪」后再提交（${command}）`);
  return { ...after, write: { action, fields } };
}

export function writeData(args = {}) {
  const { node, space, command, scope = {}, uid = '' } = args;
  const inst = scope?.system_uid || scope?.project_uid || Object.entries(scope || {}).find(([k, v]) => /_uid$/.test(k) && k !== 'user_uid' && v)?.[1] || '';
  const key = `${node}|${space}|${command}|${inst}|${uid}`;
  return serialize(key, () => writeDataRaw(args));
}

export async function readData({ node, space, command, query = {}, inst = '', record = '' }) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(query || {})) if (v) qs.set(k, v);
  // 读：列表 /action/run/<cmd>/<place_uid>?user.uid=
  //     详情 /action/run/<cmd>/<place_uid>/<uid>?user.uid=
  const portal = portalOf(command);
  const path = portal && inst
    ? dataPath({ pod: space, command, action: '', inst, record, portal, scope: Object.fromEntries(qs.entries()) })
    : `/s/${encode(space)}/c/${command}${qs.toString() ? '?' + qs : ''}`;
  const r = await http(node, path, { timeout: 10000 });
  let count = '';
  let columns = [];
  let rows = [];
  let shape = 'list';
  let fields = null;
  try {
    const envelope = JSON.parse(r.text);
    const parsed = envelopeShape(r.text);
    if (parsed.kind === 'detail') { shape = 'detail'; fields = parsed.fields; }
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
  return { node, space, command, status: r.status, shape, columns, rows, fields, count, raw: r.text.slice(0, 4000) };
}

// 删除：DELETE /action/run/<cmd>/action/remove?user.uid=&<place>_uid=&uid=
// 修改用 modify(POST)，删除用 remove(DELETE)，动作名不同，别混。
export async function removeData({ node, space, command, uid = '', scope = {} }) {
  const actor = String(scope['user.uid'] || scope.user_uid || '');
  const inst = String(scope.inst || scope.system_uid || scope.project_uid || Object.entries(scope).find(([k, v]) => /_uid$/.test(k) && k !== 'user_uid' && v)?.[1] || '');
  const portal = portalOf(command);
  const q = {};
  if (actor) q['user.uid'] = actor;
  if (inst) q[placeUidKey(String(scope.place || 'system'))] = inst;
  if (uid) q.uid = uid;
  const path = portal
    ? dataPath({ pod: space, command, action: 'remove', seg: '', portal, scope: q })
    : `/s/${encode(space)}/c/${command}/action/remove${new URLSearchParams(q).toString() ? '?' + new URLSearchParams(q) : ''}`;
  const r = await http(node, path, { method: 'DELETE', timeout: 30000 });
  return { status: r.status, removed: r.text.slice(0, 500), url: path };
}
