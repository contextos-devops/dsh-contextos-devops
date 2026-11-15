// 部署控制台日志：只使用临时文件，不碰节点/空间的业务日志。
// 前端在 deploy 请求未返回时轮询 deployLog，因此这里必须允许并发读写。
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const queues = new Map();
const traceUntil = new Map();
const TRACE_MS = 30 * 60 * 1000;

function stamp() {
  const d = new Date();
  return d.toTimeString().slice(0, 8) + '.' + String(d.getMilliseconds()).padStart(3, '0');
}

function tracing(port) {
  const p = Number(port) || 0;
  const until = traceUntil.get(p) || 0;
  if (until && until >= Date.now()) return true;
  if (until) traceUntil.delete(p);
  return false;
}

function apiPath(pathname) {
  return /(?:^|\/)c\//.test(pathname) || /(?:^|\/)s\//.test(pathname);
}

export function deployLogPath(port) {
  return path.join(os.tmpdir(), `contextos-deploy-${Number(port) || 0}.log`);
}

export async function resetDeployLog(port) {
  const file = deployLogPath(port);
  queues.delete(file);
  traceUntil.set(Number(port) || 0, Date.now() + TRACE_MS);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, '', 'utf8');
  return file;
}

/** 部署控制台里的 ContextOS 原始 HTTP 请求：进入前先写请求行。 */
export function traceDeployRequest(port, method, url) {
  if (!tracing(port)) return;
  let pathname = '';
  try { pathname = new URL(url).pathname; } catch { pathname = String(url || ''); }
  if (!apiPath(pathname)) return;
  void appendDeployLog(port, `[${stamp()}] → ${method} ${url}\n`);
}

/** 响应行 + 完整响应体；错误也落到同一个控制台。 */
export function traceDeployResponse(port, { method, url, status, ms, size, text, error }) {
  if (!tracing(port)) return;
  let pathname = '';
  try { pathname = new URL(url).pathname; } catch { pathname = String(url || ''); }
  if (!apiPath(pathname)) return;
  if (error) {
    void appendDeployLog(port, `[${stamp()}] ← ${method} ${url} ERROR ${error}\n\n`);
    return;
  }
  const body = String(text || '');
  const truncated = body.length > 200000 ? `${body.slice(0, 200000)}\n[... ${body.length - 200000} chars truncated ...]` : body;
  void appendDeployLog(port, `[${stamp()}] ← ${status} ${size || 0}B ${ms || 0}ms\n${truncated}${body ? '\n' : ''}\n`);
}

export function appendDeployLog(port, text) {
  if (!text) return Promise.resolve();
  const file = deployLogPath(port);
  const prev = queues.get(file) || Promise.resolve();
  const next = prev
    .then(() => fs.appendFile(file, String(text), 'utf8'))
    .catch(() => {});
  queues.set(file, next);
  return next;
}

export async function readDeployLog(port) {
  const file = deployLogPath(port);
  try {
    return { port: Number(port) || 0, path: file, text: await fs.readFile(file, 'utf8') };
  } catch {
    return { port: Number(port) || 0, path: file, text: '' };
  }
}
