// 对 ContextOS 节点的 HTTP 访问：统一注入 user.uid、记录调试请求、探活与端口探测。
import net from 'node:net';
import { AsyncLocalStorage } from 'node:async_hooks';

export const USER_CACHE = new Map();
export const HTTP_DEBUG = new AsyncLocalStorage();

export function baseUrl(port) {
  return `http://127.0.0.1:${port}`;
}

export function encode(v) {
  return encodeURIComponent(String(v));
}

/** ContextOS answers with plain text tables or a JSON status envelope. */
export function envelopeRows(text) {
  try {
    const env = JSON.parse(text);
    const columns = Array.isArray(env.append) ? env.append : [];
    const height = columns.length && Array.isArray(env[columns[0]]) ? env[columns[0]].length : 0;
    return { columns, rows: Array.from({ length: height }, (_, i) => Object.fromEntries(columns.map((c) => [c, Array.isArray(env[c]) ? env[c][i] : '']))) };
  } catch {
    return { columns: [], rows: [] };
  }
}

/** 返回数据只有两种形态：列表（append + 列数组）与详情（option 单条记录）。 */
export function envelopeShape(text) {
  let env;
  try { env = JSON.parse(text); } catch { return { kind: 'text', raw: String(text || '') }; }
  if (!env || typeof env !== 'object' || Array.isArray(env)) return { kind: 'text', raw: String(text || '') };
  const columns = Array.isArray(env.append) ? env.append : [];
  if (columns.length) {
    const height = Array.isArray(env[columns[0]]) ? env[columns[0]].length : 0;
    const rows = Array.from({ length: height }, (_, i) => Object.fromEntries(columns.map((c) => [c, Array.isArray(env[c]) ? env[c][i] : ''])));
    return { kind: 'list', columns, rows, env };
  }
  if (env.option && typeof env.option === 'object' && !Array.isArray(env.option) && Object.keys(env.option).length) {
    return { kind: 'detail', fields: env.option, env };
  }
  if (Array.isArray(env.detail) && env.detail.length) {
    const fields = {};
    for (const k of env.detail) fields[k] = env.option?.[k] ?? env[k] ?? '';
    return { kind: 'detail', fields, env };
  }
  return { kind: 'empty', env };
}

export async function http(port, pathname, { method = 'GET', timeout = 15000, headers = {}, auth = true, redirect = 'follow', token = '', sessid = '', cookie = '' } = {}) {
  // cookie：平台级会话的完整值 space <pod> <command> check <sessid>
  if (cookie) headers = { ...headers, Cookie: `sessid=${cookie}` };
  // 远程 / 容器节点：身份来自 token 或 sessid（由 /c/web.token/create 或 /c/aaa.sess/create 取得）
  if (sessid) pathname += (pathname.includes('?') ? '&' : '?') + 'sessid=' + encode(sessid);
  else if (token) pathname += (pathname.includes('?') ? '&' : '?') + 'token=' + encode(token);
  const cached = USER_CACHE.get(Number(port));
  // 本机访问免登录、全 root，可以任意指定 user.uid；但那只对「应用级」命令有意义
  // （/s/<pod>/c/web.team.<mod>.portal 及其子命令）。系统级命令不认它，别往日志里塞。
  const appLevel = /^\/s\/[^/]+\/c\/web\.team\./.test(pathname);
  if (auth && appLevel && cached?.uid && !/(?:\?|&)(?:user\.uid|sessid)=/.test(pathname)) {
    pathname += (pathname.includes('?') ? '&' : '?') + 'user.uid=' + encode(cached.uid);
  }
  const fullUrl = baseUrl(port) + pathname;
  const requestHeaders = { accept: 'text/plain, application/json', ...headers };
  const started = Date.now();
  const res = await fetch(fullUrl, {
    method,
    signal: AbortSignal.timeout(timeout),
    headers: requestHeaders,
    redirect,
  });
  const text = await res.text();
  const responseHeaders = Object.fromEntries(res.headers.entries());
  const logId = responseHeaders['log-id'] || responseHeaders['x-log-id'] || '';
  const entry = { method, url: fullUrl, requestHeaders, responseHeaders, status: res.status, size: Buffer.byteLength(text), ms: Date.now() - started, logId, body: text.slice(0, 200000) };
  if (!/\/c\/version(?:\?|$)/.test(fullUrl) && !/\/v\/index\.css/.test(fullUrl)) HTTP_DEBUG.getStore()?.push(entry);
  return { status: res.status, size: entry.size, text, headers: responseHeaders, logId, ms: entry.ms, requestHeaders };
}

/** 文件上传：系统级命令统一走 <cmd>/action/upload（multipart/form-data）。 */
export async function upload(port, pathname, { name = 'file', filename = 'upload.bin', data, fields = {}, timeout = 60000 } = {}) {
  const form = new FormData();
  for (const [k, v] of Object.entries(fields || {})) form.append(k, String(v));
  const bytes = typeof data === 'string' ? Buffer.from(data) : data;
  form.append(name, new Blob([bytes]), filename);
  const started = Date.now();
  const res = await fetch(baseUrl(port) + pathname, { method: 'POST', body: form, signal: AbortSignal.timeout(timeout) });
  const text = await res.text();
  const responseHeaders = Object.fromEntries(res.headers.entries());
  const entry = { method: 'POST', url: baseUrl(port) + pathname, requestHeaders: {}, responseHeaders, status: res.status, size: Buffer.byteLength(text), ms: Date.now() - started, logId: responseHeaders['log-id'] || '', body: text.slice(0, 200000) };
  HTTP_DEBUG.getStore()?.push(entry);
  return { status: res.status, size: entry.size, text, headers: responseHeaders, ms: entry.ms };
}

/** Iron law 4: status + length + a known field, never status alone. */
/** 运行时信息：/c/runtime 一次拿到版本、编译时间、程序大小 */
export function parseRuntime(text) {
  try {
    const d = JSON.parse(text);
    const boot = d.boot || {};
    const make = d.make || {};
    const hash = String(make.hash || '');
    const ver = [make.version, make.forword, hash.slice(0, 6)].filter(Boolean).join('-');
    return {
      ok: !!(boot && make && (boot.bin || boot.pathname)),
      boot, make,
      version: ver,                       // v3.2.5-2458-d3a68b
      builtAt: String(make.time || boot.time || ''),
      sizeText: String(boot.size || ''),
      hash, node: d.node || {}, host: d.host || {},
    };
  } catch { return { ok: false }; }
}

export async function probe(port, timeout = 3000) {
  try {
    const v = await http(port, '/c/runtime', { timeout });
    const rt = parseRuntime(v.text);
    const css = await http(port, '/v/index.css', { timeout });
    return {
      live: v.status === 200 && rt.ok && css.size > 10000,
      port,
      runtime: rt,
      version: rt.version || '',
      builtAt: rt.builtAt || '',
      cssBytes: css.size,
    };
  } catch (error) {
    return { live: false, port, error: String(error?.message || error) };
  }
}

export async function portFree(port) {
  return new Promise((resolve) => {
    const s = net.createServer();
    s.once('error', () => resolve(false));
    s.once('listening', () => s.close(() => resolve(true)));
    s.listen(port, '127.0.0.1');
  });
}
