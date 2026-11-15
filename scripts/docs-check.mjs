#!/usr/bin/env node
// 文档门禁：索引覆盖 + 链接可解析 + 生成物一致。
//   1) docs/*.md 每份都必须在 docs/INDEX.md 里登记（孤儿文档 = FAIL）
//   2) docs/ 与 README 里的相对链接目标必须存在（死链 = FAIL）
//   3) docs/CODE-INDEX.md、docs/STATE.md 必须与代码现状一致（调 docs-index --check）
//   4) 每份文档前 15 行必须有「读这份当」（入口约定 = FAIL）
//   5) 超过 400 行的文档必须有「按章读」表（控制单次上下文 = FAIL）
//   6) 已废弃文档不得复活（= FAIL）
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const docsDir = path.join(root, 'docs');
const errors = [];
const warn = [];

const docs = fs.readdirSync(docsDir).filter((f) => f.endsWith('.md')).sort();
const indexText = fs.readFileSync(path.join(docsDir, 'INDEX.md'), 'utf8');

// 1) 索引覆盖
for (const f of docs) {
  if (f === 'INDEX.md') continue;
  if (!indexText.includes(f)) errors.push(`孤儿文档：docs/${f} 未在 docs/INDEX.md 登记`);
}

// 2) 链接可解析（只查相对路径，跳过 http/mailto/纯锚点）
const files = [...docs.map((f) => `docs/${f}`), 'README.md', 'AGENTS.md'];
const linkRe = /\[[^\]]*\]\(([^)\s]+)\)/g;
for (const rel of files) {
  const abs = path.join(root, rel);
  if (!fs.existsSync(abs)) continue;
  const text = fs.readFileSync(abs, 'utf8');
  for (const m of text.matchAll(linkRe)) {
    let target = m[1];
    if (/^(https?:|mailto:|#)/.test(target)) continue;
    target = target.split('#')[0];
    if (!target) continue;
    const resolved = path.resolve(path.dirname(abs), target);
    if (!fs.existsSync(resolved)) errors.push(`死链：${rel} → ${m[1]}`);
  }
}

// 3) 生成物一致
const gen = spawnSync(process.execPath, [path.join(root, 'scripts/docs-index.mjs'), '--check'], { encoding: 'utf8' });
if (gen.status !== 0) {
  const detail = (gen.stdout || '').split('\n').filter((l) => l.startsWith('FAIL')).join('；');
  errors.push(`生成物过期：${detail || 'docs-index --check 失败'}（跑 node scripts/docs-index.mjs --write）`);
}

// 4) 已废弃文档不得复活
for (const dead of ['UI-ACCEPTANCE.md', 'USABILITY-GATE.md', 'CODE-MAP.md', 'MEMORY.md', 'FORM-FIELDS.md', 'CONTEXTOS-SUMMARY.md']) {
  if (docs.includes(dead)) errors.push(`已合并删除的文档又出现了：docs/${dead}（内容归 ACCEPTANCE.md §12/§13）`);
}

// 4) 入口约定：前 15 行必须有「读这份当」
for (const f of docs) {
  const head = fs.readFileSync(path.join(docsDir, f), 'utf8').split('\n').slice(0, 15).join('\n');
  if (!head.includes('读这份当')) errors.push(`缺少入口约定：docs/${f} 前 15 行没有「读这份当：…」（照 INDEX.md 的写法补两行）`);
}

// 5) 大文档必须可按章读
for (const f of docs) {
  const text = fs.readFileSync(path.join(docsDir, f), 'utf8');
  const n = text.split('\n').length;
  if (n > 400 && !text.includes('按章读')) errors.push(`大文档缺按章读：docs/${f} ${n} 行，需在开头加「按章读」表或收窄到 400 行内`);
}

// 6) INDEX 里的行数必须与文件一致（防止「文档里写着 3000 行、其实 345 行」）
for (const m of indexText.matchAll(/\|\s*`([A-Za-z0-9._-]+\.md)`\s*\|\s*(\d+)\s*\|/g)) {
  const [, f, n] = m;
  const abs = path.join(docsDir, f);
  if (!fs.existsSync(abs)) continue;
  const real = fs.readFileSync(abs, 'utf8').split('\n').length;
  if (Number(n) !== real) errors.push(`行数过期：docs/INDEX.md 写 ${f} ${n} 行，实际 ${real} 行`);
}

// 7) 已废弃文档不得复活（见下）
if (errors.length) {
  for (const e of errors) console.log(`FAIL  ${e}`);
  console.error(`docs-check: ${errors.length} failed`);
  process.exit(1);
}
console.log(`PASS  文档索引 ${docs.length} 份 · 链接可解析 · 入口约定齐全 · 大文档可按章读 · 生成物一致`);
