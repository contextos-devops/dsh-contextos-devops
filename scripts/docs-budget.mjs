#!/usr/bin/env node
// 文档预算门禁：每份文档的「常驻成本」上限 + 每条路由的实付成本。
//   为什么需要：文档是给 Agent 读的，行数不是问题，token 才是问题。
//   预算按「棘轮」定：当前值 + 5% 余量，只准降不准涨；要涨必须在本文件改常数并在报告里写清理由。
//   用法：node scripts/docs-budget.mjs [--check] [--json]
//   退出码：0 通过 / 1 超预算
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const docsDir = path.join(root, 'docs');
const check = process.argv.includes('--check');
const asJson = process.argv.includes('--json');

// 预算单位：tokens≈（中文 1 字≈1，ASCII 3.6 字符≈1）。
// 调整规则：先删冗余，再改这里；改这里必须在报告里写明「为什么旧预算不合理」。
const BUDGET = {
  'PRODUCT-DESIGN.md': 8200, // 产品设计全稿：偶读，按章读表在开头
  'INTERFACE.md': 4900, // 接口五形态 + 认证 + PM 排序
  'CODE-GEN.md': 4700, // 代码生成规范 + 工厂要点
  'RSI-LEDGER.md': 3600, // 滚动窗口：正册只留最近 10 条
  'ACCEPTANCE.md': 3800,
  'URL-SPEC.md': 3600,
  'CODE-INDEX.md': 3300, // 生成物：随代码增长，单独给余量；新增部署控制台模块后 3221，保留约 80 tokens 余量
  'DESIGN-SYSTEM.md': 2800,
  'AI-CONVERSATION.md': 2600,
  'ARCHITECTURE.md': 2300,
  'INDEX.md': 2300,
  'IAM.md': 2000,
  'DIAGNOSTICS.md': 2000,
  'DSH-COS.md': 1800,
  'STATE.md': 1500,
  'DOCTRINE.md': 1300,
  'AI-CONTEXT.md': 1200,
  'RSI-CONSTITUTION.md': 900,
  'MONITOR.md': 900,
};
const DEFAULT_BUDGET = 3000;

const est = (s) => {
  let cjk = 0;
  for (const ch of s) if (ch >= '\u4e00' && ch <= '\u9fff') cjk++;
  return Math.round(cjk + (s.length - cjk) / 3.6);
};
const files = fs
  .readdirSync(docsDir)
  .filter((f) => f.endsWith('.md'))
  .sort();
const rows = files.map((f) => {
  const text = fs.readFileSync(path.join(docsDir, f), 'utf8');
  return {
    doc: `docs/${f}`,
    lines: text.split('\n').length,
    tokens: est(text),
    budget: BUDGET[f] || DEFAULT_BUDGET,
    archived: fs.existsSync(path.join(docsDir, 'archive')),
  };
});
rows.sort((a, b) => b.tokens - a.tokens);

const over = rows.filter((r) => r.tokens > r.budget);
const total = rows.reduce((n, r) => n + r.tokens, 0);

// 路由实付：Agent 一次任务实际会读的东西（读整份 vs 读一章的对比）
const index = rows.find((r) => r.doc === 'docs/INDEX.md');
const arch = rows.find((r) => r.doc === 'docs/ARCHITECTURE.md');
const diag = rows.find((r) => r.doc === 'docs/DIAGNOSTICS.md');
const design = rows.find((r) => r.doc === 'docs/DESIGN-SYSTEM.md');
const routes = [
  ['纯问答（不读文档）', 0],
  ['改界面：INDEX §二 + DESIGN-SYSTEM §19 + DIAGNOSTICS §二', Math.round(index.tokens * 0.35 + design.tokens * 0.12 + diag.tokens * 0.35)],
  ['加接口：INDEX §二 + INTERFACE §1–§5 + CODE-INDEX §3', Math.round(index.tokens * 0.35 + 2600 + 600)],
  ['查代码放哪：INDEX §二 + ARCHITECTURE §1/§8', Math.round(index.tokens * 0.35 + arch.tokens * 0.45)],
  ['整目录硬塞（反例）', total],
];

if (asJson) {
  console.log(JSON.stringify({ total, over: over.map((r) => r.doc), rows, routes }, null, 2));
} else {
  console.log(`文档预算 · ${rows.length} 份 · 合计 ${total} tokens\n`);
  for (const r of rows) {
    const pct = Math.round((r.tokens / r.budget) * 100);
    const mark = r.tokens > r.budget ? 'FAIL' : pct > 92 ? 'WARN' : '  ok';
    console.log(`${mark}  ${r.doc.padEnd(30)} ${String(r.tokens).padStart(5)} / ${String(r.budget).padStart(5)} (${String(pct).padStart(3)}%)  ${String(r.lines).padStart(4)} 行`);
  }
  console.log('\n路由实付（一次任务真正读进上下文的量）：');
  for (const [name, t] of routes) console.log(`  ${String(t).padStart(6)} tokens  ${name}`);
}

for (const r of over) console.log(`FAIL  ${r.doc} 超预算：${r.tokens} > ${r.budget}（删冗余，或改 scripts/docs-budget.mjs 的常数并说明理由）`);
if (check && over.length) process.exit(1);
if (check) console.log(`\nPASS  全部 ${rows.length} 份在预算内（合计 ${total} tokens）`);
