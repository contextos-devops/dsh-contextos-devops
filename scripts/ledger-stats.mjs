#!/usr/bin/env node
// 归纳总结的计数口径：见 AGENTS.md §八。
// 用法：node scripts/ledger-stats.mjs [--check] [--json] [--limit 10]
// 退出码：0 正常；1 距上次全面归纳的条目数 >= limit（先归纳再开新功能）；2 文件缺失。
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const file = path.join(root, 'docs/RSI-LEDGER.md');
const args = process.argv.slice(2);
const json = args.includes('--json');
const check = args.includes('--check');
const li = args.indexOf('--limit');
const limit = li >= 0 ? Number(args[li + 1] || 10) : 10;
const si = args.indexOf('--since');
// 「缺根因/固化」只对规则生效日之后的条目计（老条目是历史，不追罚）。
const sinceDate = si >= 0 ? args[si + 1] : '2026-11-15';

if (!fs.existsSync(file)) {
  console.error(`FAIL  ${path.relative(root, file)} 不存在（AGENTS.md §八 要求每次会话后写条目）`);
  process.exit(2);
}

const text = fs.readFileSync(file, 'utf8');
const lines = text.split('\n');

// 条目 = "## <日期或标记> ..."；全面归纳标记 = 标题含「全面归纳」或「retro」。
const entries = [];
let current = null;
for (const line of lines) {
  if (/^##\s+/.test(line)) {
    if (current) entries.push(current);
    current = { head: line.replace(/^##\s+/, '').trim(), body: [] };
  } else if (current) {
    current.body.push(line);
  }
}
if (current) entries.push(current);

const isRetro = (e) => /全面归纳|归纳报告|\bretro\b/i.test(e.head);
const real = entries.filter((e) => /^20\d\d-\d\d-\d\d/.test(e.head));
const retroIdx = entries.reduce((acc, e, i) => (isRetro(e) ? i : acc), -1);
const since = retroIdx < 0 ? real.length : entries.slice(retroIdx + 1).filter((e) => /^20\d\d-\d\d-\d\d/.test(e.head)).length;

const has = (e, re) => re.test(e.body.join('\n'));
const missing = real
  .filter((e) => e.head.slice(0, 10) >= sinceDate)
  .filter((e) => !(has(e, /根因|root cause|Lesson/i) && has(e, /固化|Gate|Verification/i)));

const out = {
  file: path.relative(root, file),
  entries: real.length,
  lastEntry: real.length ? real.map((e) => e.head.slice(0, 10)).sort().at(-1) : null,
  lastRetro: retroIdx >= 0 ? entries[retroIdx].head : null,
  sinceLastRetro: since,
  missingFields: missing.map((e) => e.head),
};

if (json) {
  console.log(JSON.stringify(out, null, 2));
} else {
  console.log(`LEDGER  ${out.file}`);
  console.log(`  条目        ${out.entries} 条（最近 ${out.lastEntry || '-'}）`);
  console.log(`  上次归纳    ${out.lastRetro || '无'}`);
  console.log(`  待归纳      ${out.sinceLastRetro} 条（阈值 ${limit}）`);
  if (out.missingFields.length) console.log(`  WARN 缺「根因/固化」  ${out.missingFields.length} 条：${out.missingFields.slice(0, 3).join(' | ')}${out.missingFields.length > 3 ? ' …' : ''}`);
  if (out.sinceLastRetro >= limit) {
    console.log(`  提示  已到阈值：按 AGENTS.md §8.2 做一次全面归纳（聚类 → 升级门禁 → 补症状表 → 写 retro 报告）`);
  }
}

out.sinceDate = sinceDate;

if (check) {
  const bad = [];
  if (out.sinceLastRetro >= limit) bad.push(`距上次全面归纳已 ${out.sinceLastRetro} 条（阈值 ${limit}）`);
  if (missing.length) bad.push(`${missing.length} 条新条目缺「根因/固化」（${sinceDate} 起）`);
  if (bad.length) {
    for (const b of bad) console.error(`FAIL  ${b}`);
    console.error('      按 AGENTS.md §8.2 先归纳：聚类 → 升级门禁 → 补症状表 → 写 retro 报告');
    process.exit(1);
  }
}
