#!/usr/bin/env node
// 复制粘贴门禁：同一段 6 行以上代码出现在两个文件里，就会在这里被点名。
//
// 为什么需要它：本次「逐行优化」前，`lib/` 与 `parts/` 里有 127 处跨文件重复窗口
// （典型：terminal.js 与 terminal2.js 整文件重复、apps.js 与 codegen.js 各写一份模块模板、
// 36-data.js 与 40-project.js 各写一份 FileReader 缩放）。靠人眼是发现不了的。
//
// 判据：跨文件重复窗口数 > 基线即 FAIL；新增重复必须先用公共函数消除，或说明为什么必须保留。
// 基线在 scripts/dup-baseline.json，收紧用 `node scripts/dup-check.mjs --update`。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const WINDOW = 6;
const BASELINE_FILE = path.join(ROOT, 'scripts/dup-baseline.json');
const args = process.argv.slice(2);
const update = args.includes('--update');
const json = args.includes('--json');

const TARGETS = [
  { dir: 'lib', label: '服务端' },
  { dir: 'src/client/parts', label: '客户端' },
];

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'vendor') continue;
      walk(full, out);
    } else if (entry.name.endsWith('.js')) out.push(full);
  }
  return out;
}

function significant(line) {
  const text = line.trim();
  if (!text || text.startsWith('//') || text.startsWith('*') || text.startsWith('/*') || text === '*/') return '';
  return text;
}

function windowsOf(file) {
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  const sig = lines.map(significant);
  const out = [];
  for (let i = 0; i + WINDOW <= sig.length; i += 1) {
    const slice = sig.slice(i, i + WINDOW);
    if (slice.some((line) => !line)) continue;
    const key = slice.join('\n');
    // 纯符号/极短窗口不算复制：过滤掉信息量低的
    if (key.replace(/[^A-Za-z0-9_$\u4e00-\u9fa5]/g, '').length < 60) continue;
    out.push({ key, line: i + 1 });
  }
  return out;
}

const results = [];
let crossTotal = 0;
for (const target of TARGETS) {
  const dir = path.join(ROOT, target.dir);
  if (!fs.existsSync(dir)) continue;
  const files = walk(dir);
  const map = new Map();
  for (const file of files) {
    for (const w of windowsOf(file)) {
      const list = map.get(w.key) || [];
      list.push({ file: path.relative(ROOT, file), line: w.line });
      map.set(w.key, list);
    }
  }
  let cross = 0;
  const samples = [];
  for (const list of map.values()) {
    const files2 = new Set(list.map((x) => x.file));
    if (files2.size < 2) continue;
    cross += 1;
    if (samples.length < 5) samples.push(list.slice(0, 3));
  }
  crossTotal += cross;
  results.push({ scope: target.label, files: files.length, cross, samples });
}

const baseline = fs.existsSync(BASELINE_FILE) ? JSON.parse(fs.readFileSync(BASELINE_FILE, 'utf8')) : null;

if (update) {
  fs.writeFileSync(BASELINE_FILE, `${JSON.stringify({ window: WINDOW, cross: crossTotal, at: new Date().toISOString().slice(0, 10) }, null, 2)}\n`);
  console.log(`基线已写入 scripts/dup-baseline.json：跨文件重复窗口 ${crossTotal}`);
  process.exit(0);
}

const limit = baseline?.cross ?? 0;
if (json) {
  console.log(JSON.stringify({ window: WINDOW, cross: crossTotal, limit, scopes: results }, null, 2));
} else {
  for (const r of results) {
    console.log(`${r.scope}: ${r.files} 个文件 · 跨文件重复窗口 ${r.cross}`);
    for (const s of r.samples) console.log(`  例: ${s.map((x) => `${x.file}:${x.line}`).join(' | ')}`);
  }
}

if (!baseline) {
  console.log(`WARN  没有 scripts/dup-baseline.json；先跑 node scripts/dup-check.mjs --update 记录基线（当前 ${crossTotal}）`);
  process.exit(2);
}
if (crossTotal > limit) {
  console.log(`FAIL  跨文件重复窗口 ${crossTotal} > 基线 ${limit}：先抽公共函数，再 --update 收紧基线`);
  process.exit(1);
}
console.log(`PASS  跨文件重复窗口 ${crossTotal} ≤ 基线 ${limit}（窗口 ${WINDOW} 行）`);
process.exit(0);
