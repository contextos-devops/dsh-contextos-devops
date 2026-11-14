#!/usr/bin/env node
// 门禁：客户端持久化必须走 08-store.js，且键必须有 schema 登记（= docs/STATE.md 的来源）。
// 棘轮：每个文件的 localStorage 出现次数只能减不能增；新增文件默认不许出现。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.join(root, 'src/client/parts');
const ERR = [];
const err = (m) => ERR.push(m);

// 允许直连 localStorage 的例外：store 自身 + 模块加载期/一次性迁移（已在源码注明）
// 00-prelude：旧键迁移枚举（store-migration）+ 模块加载期语言（store-runtime），共 6 处
const ALLOWED = { '00-prelude.js': 6, '08-store.js': 7 };

const files = fs.readdirSync(dir).filter((f) => f.endsWith('.js'));
const store = fs.readFileSync(path.join(dir, '08-store.js'), 'utf8');
const schemaKeys = new Set([...store.matchAll(/^ {2}'?([A-Za-z0-9:_-]+)'?: \{/gm)].map((m) => m[1]));
if (schemaKeys.size < 20) err(`CX_STORE_SCHEMA 只解析到 ${schemaKeys.size} 个键，像是格式变了`);

let total = 0;
for (const f of files) {
  const text = fs.readFileSync(path.join(dir, f), 'utf8');
  const n = (text.match(/localStorage/g) || []).length;
  total += n;
  const allowed = ALLOWED[f] || 0;
  if (n > allowed) err(`${f} 直接用了 localStorage ${n} 次（上限 ${allowed}）：改走 cxRead/cxWrite`);
}

// 字面量键必须登记进 schema
const literal = new Map();
for (const f of files) {
  const text = fs.readFileSync(path.join(dir, f), 'utf8');
  for (const m of text.matchAll(/\bcx(?:Read|ReadText|Write|WriteText|Remove|Pref)\(\s*'([^']+)'/g)) {
    literal.set(m[1], f);
  }
}
for (const [key, f] of literal) {
  if (!schemaKeys.has(key)) err(`${f} 用到未登记的存储键 '${key}'（先在 08-store.js 的 CX_STORE_SCHEMA 登记）`);
}

const used = files.filter((f) => f !== '08-store.js' && (fs.readFileSync(path.join(dir, f), 'utf8').includes('cxWrite') || fs.readFileSync(path.join(dir, f), 'utf8').includes('cxRead'))).length;
console.log(`本地存储：${files.length} 个片段中 ${used} 个经 store 读写 · 直连 localStorage ${total} 处（例外 ${Object.values(ALLOWED).reduce((a, b) => a + b, 0)}）· schema ${schemaKeys.size} 键 · 字面量键 ${literal.size} 个`);
for (const e of ERR) console.log(`FAIL  ${e}`);
if (!ERR.length) console.log('PASS  storage goes through 08-store.js');
else { console.error(`store-check: ${ERR.length} failed`); process.exit(1); }
