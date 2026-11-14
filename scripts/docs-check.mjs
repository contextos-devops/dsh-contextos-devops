#!/usr/bin/env node
// 文档门禁：索引覆盖 + 链接可解析 + 生成物一致。
//   1) docs/*.md 每份都必须在 docs/INDEX.md 里登记（孤儿文档 = FAIL）
//   2) docs/ 与 README 里的相对链接目标必须存在（死链 = FAIL）
//   3) docs/CODE-INDEX.md、docs/STATE.md 必须与代码现状一致（调 docs-index --check）
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
for (const dead of ['UI-ACCEPTANCE.md', 'USABILITY-GATE.md']) {
  if (docs.includes(dead)) errors.push(`已合并删除的文档又出现了：docs/${dead}（内容归 ACCEPTANCE.md §12/§13）`);
}

for (const w of warn) console.log(`WARN  ${w}`);
if (errors.length) {
  for (const e of errors) console.log(`FAIL  ${e}`);
  console.error(`docs-check: ${errors.length} failed`);
  process.exit(1);
}
console.log(`PASS  文档索引 ${docs.length} 份、链接可解析、生成物一致`);
