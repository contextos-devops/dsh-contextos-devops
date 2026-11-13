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

export async function http(port, pathname, { method = 'GET', timeout = 15000, headers = {} } = {}) {
  const cached = USER_CACHE.get(Number(port));
  if (cached?.uid && !/(?:\?|&)(?:user\.uid|sessid)=/.test(pathname)) {
    pathname += (pathname.includes('?') ? '&' : '?') + 'user.uid=' + encode(cached.uid);
  }
  const fullUrl = baseUrl(port) + pathname;
  const requestHeaders = { accept: 'text/plain, application/json', ...headers };
  const started = Date.now();
  const res = await fetch(fullUrl, {
    method,
    signal: AbortSignal.timeout(timeout),
    headers: requestHeaders,
  });
  const text = await res.text();
  const responseHeaders = Object.fromEntries(res.headers.entries());
  const logId = responseHeaders['log-id'] || responseHeaders['x-log-id'] || '';
  const entry = { method, url: fullUrl, requestHeaders, responseHeaders, status: res.status, size: Buffer.byteLength(text), ms: Date.now() - started, logId, body: text.slice(0, 200000) };
  if (!/\/c\/version(?:\?|$)/.test(fullUrl) && !/\/v\/index\.css/.test(fullUrl)) HTTP_DEBUG.getStore()?.push(entry);
  return { status: res.status, size: entry.size, text, headers: responseHeaders, logId, ms: entry.ms, requestHeaders };
}

/** Iron law 4: status + length + a known field, never status alone. */
export async function probe(port, timeout = 3000) {
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

export async function portFree(port) {
  return new Promise((resolve) => {
    const s = net.createServer();
    s.once('error', () => resolve(false));
    s.once('listening', () => s.close(() => resolve(true)));
    s.listen(port, '127.0.0.1');
  });
}
