#!/usr/bin/env node
// Translation gate. It cannot prove every sentence is translated, but it blocks
// the exact regressions we shipped: missing init labels and wrong Cyber World case.
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const files = ['00-prelude.js', '40-project.js', '60-page.js'].map((f) => fs.readFileSync(path.join(root, 'src/client/parts', f), 'utf8')).join('\n');
const prelude = fs.readFileSync(path.join(root, 'src/client/parts/00-prelude.js'), 'utf8');
const enText = prelude.slice(prelude.indexOf('const EN_TEXT'), prelude.indexOf('const T ='));
const required = [
  '目标描述', '计划描述', '探测端口', '探测中…', '重试当前步骤', '执行过程',
  '时间', '耗时', '操作', '影响 / 接口', '标准空间', '展开日志', '收起日志', '创建目标', '创建计划', '创建任务', '创建报告', '创建反馈', '创建数字分身', '创建赛博世界',
];
let failed = 0;
const check = (ok, label) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}`); if (!ok) failed++; };
for (const key of required) check(enText.includes(`'${key}':`), `EN_TEXT key ${key}`);
check(!/Cyber world/.test(files), 'Cyber World is title-cased');
check(files.includes('Digital Avatar & Cyber World'), 'standard Digital Avatar & Cyber World term');
check(files.includes('Goal description') && files.includes('Plan description'), 'init goal/plan translations');
if (failed) { console.error(`i18n-check: ${failed} failed`); process.exit(1); }
console.log('i18n-check: passed');
