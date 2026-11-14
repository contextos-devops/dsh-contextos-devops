#!/usr/bin/env node
// 门禁：服务端 OPS 注册表 ↔ 客户端 api() 调用契约。
// 抓过的事故：seedProject 客户端调了、服务端没路由，静默 404（auto-seed 一直不生效）；
// llmInfo 引用了未导出的 chatProviders，必抛 ReferenceError。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
const ERR = [], INFO = [];
const err = (m) => ERR.push(m);

// 1) 注册表本身
const { OPS } = await import(path.join(root, 'lib/core/ops.js'));
const ops = new Map(Object.entries(OPS));
if (ops.size < 50) err(`OPS 只有 ${ops.size} 条，像是没加载或注册表被截断`);
for (const [op, entry] of ops) {
  if (!['GET', 'PUT', 'POST', 'DELETE'].includes(entry.method)) err(`OPS.${op} method 非法：${entry.method}`);
  if (typeof entry.run !== 'function') err(`OPS.${op} 缺少 run()`);
}

// 2) 客户端调用的 op 必须存在
const parts = fs.readdirSync(path.join(root, 'src/client/parts')).filter((f) => f.endsWith('.js'));
const clientOps = new Set();
for (const f of parts) {
  for (const m of read(`src/client/parts/${f}`).matchAll(/\bapi\(\s*'([A-Za-z0-9_]+)'/g)) clientOps.add(m[1]);
}
const ROUTER_SPECIAL = new Set(['origin']); // 在 index.js 路由层处理（要读 req/连接地址）
for (const op of clientOps) {
  if (!ops.has(op) && !ROUTER_SPECIAL.has(op)) err(`客户端调用 api('${op}')，服务端 OPS 没有这个 op（会 404）`);
}

// 3) 传输方法必须两端一致
const bootstrap = read('src/client/parts/05-bootstrap.js');
const queryMatch = /const QUERY_OPS = new Set\(\[([\s\S]*?)\]\)/.exec(bootstrap);
if (!queryMatch) err('05-bootstrap.js 里找不到 QUERY_OPS（api() 的方法判定被改了？）');
else {
  const query = new Set([...queryMatch[1].matchAll(/'([A-Za-z0-9_]+)'/g)].map((m) => m[1]));
  for (const op of clientOps) {
    const entry = ops.get(op);
    if (!entry) continue;
    const want = query.has(op) ? 'GET' : (op === 'pmCreate' ? 'PUT' : 'POST');
    if (entry.method !== want) err(`方法不一致：${op} 客户端用 ${want}，OPS 登记 ${entry.method}`);
  }
}

// 4) 路由层不许再写业务分支（origin 是唯一例外）
const index = read('index.js');
const branches = [...index.matchAll(/if \(op === '([A-Za-z0-9_]+)'/g)].map((m) => m[1]);
for (const op of branches) if (op !== 'origin') err(`index.js 仍有 op 分支：${op}（应搬进 lib/core/ops.js）`);
if (!/from '\.\/lib\/core\/ops\.js'/.test(index)) err('index.js 没有从 lib/core/ops.js 导入 OPS');

// 5) 只服务端使用的 op 不算错，列出来便于索引
for (const op of ops.keys()) if (!clientOps.has(op)) INFO.push(op);

console.log(`OPS ${ops.size} 条 · 客户端调用 ${clientOps.size} 个 · 仅服务端 ${INFO.length} 个`);
if (INFO.length) console.log(`INFO  仅服务端：${INFO.join(' ')}`);
for (const e of ERR) console.log(`FAIL  ${e}`);
if (!ERR.length) console.log('PASS  ops registry matches client calls');
else { console.error(`op-check: ${ERR.length} failed`); process.exit(1); }
