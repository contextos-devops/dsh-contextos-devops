// 远程 / 容器节点的访问凭证。
//
// 本机节点（127.0.0.1:<port>）免登录、等同 root，不需要凭证；
// 远程节点与容器节点必须拿到 token 或 sessid 才能调用它的接口：
//   PUT /c/web.token/action/create            → token
//   PUT /c/aaa.sess/action/create/<username>  → sessid
// 两者都缓存在 state 目录，过期后自动重新获取。
import fs from 'node:fs';
import path from 'node:path';
import { stateDir } from '../base/env.js';
import { http, encode } from '../base/http.js';

const TTL = 30 * 60 * 1000;
// 平台级 sessid 的 cookie 值：space <pod> <command> check <sessid>
export const APP_COOKIE = new Map();
const FILE = () => path.join(stateDir(), 'node-auth.json');

function readAll() { try { return JSON.parse(fs.readFileSync(FILE(), 'utf8')) || {}; } catch { return {}; } }
function writeAll(v) { try { fs.mkdirSync(stateDir(), { recursive: true }); fs.writeFileSync(FILE(), JSON.stringify(v, null, 2)); } catch {} }

/**
 * 工具令牌：web.token create（可简写 token）。
 * 用途：第三方工具、git 推送、服务节点之间的互连认证。
 * 它代表「一个工具/节点」，不解析成某个用户。
 */
export async function toolToken({ node }) {
  for (const path of ['/c/web.token/action/create', '/c/token/action/create']) {
    const r = await http(node, path, { method: 'PUT', timeout: 10000, auth: false });
    const token = String(r.text || '').trim();
    if (r.status === 200 && /^[0-9a-f]{16,}$/i.test(token)) return token;
  }
  throw new Error('web.token create failed');
}

/** 兼容旧名 */
export const nodeToken = toolToken;

/**
 * 管理员 sessid：aaa.sess create <username>。
 * 用途：系统管理员登录网页，可以执行更多系统级操作。
 */
export async function adminSessid({ node, username }) {
  const who = String(username || '').trim();
  if (!who) throw new Error('admin sessid needs a username');
  const r = await http(node, `/c/aaa.sess/action/create/${encode(who)}`, { method: 'PUT', timeout: 10000, auth: false });
  const sessid = String(r.text || '').trim();
  if (r.status !== 200 || !/^[0-9a-f]{16,}$/i.test(sessid)) throw new Error(`aaa.sess create failed: HTTP ${r.status}`);
  return sessid;
}


/**
 * 应用级 sessid：云社区的会话命令
 *   PUT /s/<space>/c/web.team.gonganxitong.sess/action/create/user_uid/<uid>
 * 回执里 result[0]（或 _arg[0]==='sessid' 时的值）就是 sessid；
 * _process=['_cookie'] 表示它同时会被写进 cookie。
 */
export async function appSession({ node, space = '20240724-community', userUid }) {
  const sessid = await appSessid({ node, space, userUid });
  return { sessid, cookie: APP_COOKIE.get(Number(node)) || `space ${space} web.team.gonganxitong.sess check ${sessid}` };
}

export async function appSessid({ node, space = '20240724-community', userUid }) {
  const uid = String(userUid || '').trim();
  if (!uid) throw new Error('app sessid needs user_uid');
  const q = `?user.uid=${encode(uid)}&user_uid=${encode(uid)}`;
  const r = await http(node, `/s/${encode(space)}/c/web.team.gonganxitong.sess/action/create/user_uid/${encode(uid)}${q}`, { method: 'PUT', timeout: 12000, auth: false });
  let sid = '', cookie = '';
  try {
    const env = JSON.parse(r.text);
    sid = (env.result && env.result[0]) || '';
    if (!sid && Array.isArray(env._arg) && env._arg[0] === 'sessid') sid = env._arg[1] || '';
    // _arg[1] 是完整 cookie 值：space <pod> <command> check <sessid>
    if (Array.isArray(env._arg) && env._arg[0] === 'sessid' && /\scheck\s/.test(String(env._arg[1] || ''))) cookie = String(env._arg[1]);
  } catch { sid = String(r.text || '').trim(); }
  if (!cookie && sid) cookie = `space ${space} web.team.gonganxitong.sess check ${sid}`;
  try { APP_COOKIE.set(Number(node), cookie); } catch {}
  if (r.status !== 200 || !/^[0-9a-f]{16,}$/i.test(String(sid))) throw new Error(`app sess create failed: HTTP ${r.status} ${String(r.text).slice(0, 120)}`);
  return String(sid);
}

/** 读取缓存凭证（不主动获取）。 */
export function peekNodeAuth({ node }) {
  const all = readAll();
  const row = all[String(node)] || null;
  if (!row) return null;
  const fresh = Date.now() - Number(row.at || 0) < TTL;
  return { ...row, fresh };
}

/** 获取（必要时刷新）凭证。本机节点返回 { local: true }，不取凭证。 */
export async function ensureNodeAuth({ node, username = '', force = false } = {}) {
  const cached = peekNodeAuth({ node });
  if (!force && cached && cached.fresh) return cached;
  if (cached && cached.fresh === false && cached.sessid) return cached;   // 过期也先复用，失败了再换
  try {
    const token = await toolToken({ node });
    const row = { node: Number(node), token, sessid: cached?.sessid || '', username: cached?.username || username, at: Date.now() };
    const all = readAll(); all[String(node)] = row; writeAll(all);
    return row;
  } catch (e) {
    if (!username) throw e;
    const sessid = await adminSessid({ node, username });
    const row = { node: Number(node), token: cached?.token || '', sessid, username, at: Date.now() };
    const all = readAll(); all[String(node)] = row; writeAll(all);
    return row;
  }
}

export const AUTH_TTL = TTL;
