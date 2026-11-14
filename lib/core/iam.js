// 用户 / 会话 / 权限的统一入口。
//
// 系统级（节点自身）   用户 aaa.user   会话 aaa.sess   权限 aaa.role
// 平台级（云社区）     用户 web.team.gonganxitong.user   会话 web.team.gonganxitong.sess
// 应用级（每个实例）   成员 web.team.<mod>.member   申请 web.team.<mod>.apply   审批 web.team.<mod>.allow
import { http, encode, envelopeRows } from '../base/http.js';
import { parseTextTable } from '../base/texttable.js';
import { fieldSegments } from '../base/field.js';

// 系统级命令在 ice 里注册了短名：user / sess / role（aaa.* 是完整名，两者等价）
export const IAM = {
  system: { user: 'user', sess: 'sess', role: 'role' },
  platform: { user: 'web.team.gonganxitong.user', sess: 'web.team.gonganxitong.sess' },
  instance: { member: 'web.team.<mod>.member', apply: 'web.team.<mod>.apply', allow: 'web.team.<mod>.allow' },
};

export function iamCommand({ level = 'system', kind = 'user', mod = '' }) {
  const table = IAM[level];
  if (!table) throw new Error(`unknown level: ${level}`);
  const tpl = table[kind];
  if (!tpl) throw new Error(`unknown kind: ${level}.${kind}`);
  if (!mod) return tpl;
  return tpl.replace('<mod>', mod);
}

function iamPath({ level, node, space, command, uid = '' }) {
  if (level === 'system') return `/c/${command}${uid ? `?user.uid=${encode(uid)}` : ''}`;
  if (!space) throw new Error(`${level} commands need a space`);
  return `/s/${encode(space)}/c/${command}${uid ? `?user.uid=${encode(uid)}` : ''}`;
}

/** 列表：系统级是文本表，平台/应用级是 JSON 信封，两者统一成 {columns, rows, url}。 */
export async function iamList({ node, level = 'system', kind = 'user', space = '', mod = '', uid = '' }) {
  const command = iamCommand({ level, kind, mod });
  const path = iamPath({ level, node, space, command, uid });
  const r = await http(node, path, { timeout: 15000, auth: !uid });
  const url = `http://127.0.0.1:${node}${path}`;
  if (level === 'system') {
    const t = parseTextTable(r.text);
    return { ...t, command, url, status: r.status, empty: t.rows.length === 0 };
  }
  let env = null;
  try { env = JSON.parse(r.text); } catch { env = null; }
  if (env && Array.isArray(env.append) && env.append.length) {
    const { columns, rows } = envelopeRows(r.text);
    return { columns, rows, command, url, status: r.status, empty: rows.length === 0 };
  }
  // 没有行：把回执摘要带回去，界面据此提示「需要实例上下文 / 暂无可管理数据」
  const status = (() => { try { return JSON.parse((env && env._status) ? env._status[0] : '[]'); } catch { return []; } })();
  return { columns: [], rows: [], command, url, status: r.status, empty: true, raw: status };
}

/** 通用动作：create / modify / remove / allow / apply …（PUT，字段走路径段）。 */
export async function iamCall({ node, level = 'system', kind = 'user', space = '', mod = '', action = 'create', fields = {}, args = [], uid = '' }) {
  const command = iamCommand({ level, kind, mod });
  const base = iamPath({ level, node, space, command, uid: '' });
  // 系统级命令多是位置参数（role create <name>），平台/应用级多是 k/v 段
  const seg = args && args.length
    ? args.map((v) => encode(v)).join('/')
    : fieldSegments(fields || {});
  const q = new URLSearchParams();
  if (uid) q.set('user.uid', uid);
  if (level === 'system' && !space) { /* 系统级不需要 pod */ }
  const path = `${base}/action/${action}${seg ? '/' + seg : ''}${q.toString() ? '?' + q : ''}`;
  const r = await http(node, path, { method: 'PUT', timeout: 20000, headers: { accept: 'application/json' } });
  let env = null;
  try { env = JSON.parse(r.text); } catch { env = null; }
  const status = (() => { try { return JSON.parse((env && env._status) ? env._status[0] : '[]'); } catch { return []; } })();
  const count = (status.find((x) => x.name === 'count') || {}).value || '';
  const result = (env && env.result) || [];
  const ok = r.status === 200 && !!env && count !== '0x0' ? true : r.status === 200 && !env;
  return { ok, status: r.status, count, result, command, url: `http://127.0.0.1:${node}${path}`, text: env ? '' : String(r.text || '').slice(0, 200) };
}

/**
 * 平台主体：一个平台里固定五类主体。
 * 平台 / 城市 / 公司（街道、学校、医院等组织） / 服务（应用实例） / 个人。
 */
export const SUBJECTS = [
  { type: 'platform', label: '平台', command: 'web.team.gonganxitong.place' },
  { type: 'city', label: '城市', command: 'web.team.gonganxitong.city' },
  { type: 'org', label: '公司/组织', command: 'web.team.gonganxitong.street' },
  { type: 'service', label: '服务', command: 'web.team.gonganxitong.service' },
  { type: 'user', label: '个人', command: 'web.team.gonganxitong.user' },
];

/** 资金与交易：现在存在的是经费 / 广场 / 名片，订单与账单尚未实现。 */
export const FUND = [
  { type: 'fund', label: '经费', command: 'web.team.gonganxitong.fund', ready: true },
  { type: 'market', label: '人民广场', command: 'web.team.gonganxitong.market', ready: true },
  { type: 'credit', label: '服务名片', command: 'web.team.gonganxitong.credit', ready: true },
  { type: 'order', label: '订单', command: 'web.team.gonganxitong.order', ready: false },
  { type: 'bill', label: '账单', command: 'web.team.gonganxitong.bill', ready: false },
  { type: 'account', label: '资金账户', command: 'web.team.gonganxitong.account', ready: false },
];

/** 命令是否存在：真命令才有 index / help / list；不存在的命令只是回声信封。 */
export async function commandExists({ node, space, command }) {
  const r = await http(node, `/s/${encode(space)}/c/command/${command}`, { timeout: 10000 });
  try {
    const env = JSON.parse(r.text);
    return !!(env.index || env.help || env.list || env.meta);
  } catch { return false; }
}

export async function subjectEndpoints({ node, space = '20240724-community' }) {
  const host = `http://127.0.0.1:${node}/s/${space}/c/`;
  return SUBJECTS.map((x) => ({ ...x, url: host + x.command }));
}

/** 管理矩阵：把三层入口列出来，界面可以直接打开对应页面。 */
export function iamEndpoints({ node, space = '20240724-community', mod = '' }) {
  const host = `http://127.0.0.1:${node}`;
  const out = [];
  for (const [kind, command] of Object.entries(IAM.system)) out.push({ level: 'system', kind, command, url: `${host}/c/${command}` });
  for (const [kind, command] of Object.entries(IAM.platform)) out.push({ level: 'platform', kind, command, url: `${host}/s/${space}/c/${command}` });
  if (mod) for (const [kind, tpl] of Object.entries(IAM.instance)) {
    const command = tpl.replace('<mod>', mod);
    out.push({ level: 'instance', kind, command, url: `${host}/s/${space}/c/${command}` });
  }
  return out;
}
