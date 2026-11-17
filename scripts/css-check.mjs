#!/usr/bin/env node
// CSS 分层与重复度门禁（棘轮：只降不升）
// 1) tokens.css 只准声明令牌（:root / .cx-shell / @media），不许出现组件类
// 2) main.css 的 字面量色 / rgba() / !important / 重复声明率 / 行数 不得超过基线
// 3) var(--cx-*) 必须已定义，或自带 fallback，或是 JS 写入的运行时令牌
// 4) 死类只报 WARN（可能是动态拼接的类名）
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const styles = path.join(root, 'src/client/styles');
const read = (f) => fs.readFileSync(path.join(styles, f), 'utf8');
const tokens = read('tokens.css');
const main = read('main.css');
const kit = read('kit.css');
const layout = read('layout.css');
const parts = fs.readdirSync(path.join(root, 'src/client/parts')).filter((f) => f.endsWith('.js'))
  .map((f) => fs.readFileSync(path.join(root, 'src/client/parts', f), 'utf8')).join('\n');

// 基线：2026-11-17 实测。只许往下调；调高必须在报告里写出原因。
const BASE = { hex: 562, rgba: 302, important: 689, dupRatio: 0.728, lines: 3400 };
const RUNTIME = /^--cx-(a|b|host|host-|shell|shell-|hue-rgb|pane-|scroll-|preview-w|surface-)/;

const fails = [], warns = [], notes = [];
const ok = (cond, label) => { if (!cond) fails.push(label); };

// 1) tokens.css 只声明令牌
const tokensBare = tokens.replace(/\/\*[\s\S]*?\*\//g, '');
const selectors = [...tokensBare.matchAll(/(?:^|\})\s*([^{}@]+)\{/g)].map((m) => m[1].replace(/\s+/g, ' ').trim()).filter(Boolean);
const badSel = selectors.filter((s) => !/^(:root|\.cx-shell)/.test(s));
ok(badSel.length === 0, `tokens.css 只准声明 :root / .cx-shell，发现：${badSel.slice(0, 3).join(' , ')}`);

// 2) main.css 指标
const hex = (main.match(/#[0-9a-fA-F]{3,8}\b/g) || []).length;
const rgba = (main.match(/rgba?\((?!var)/g) || []).length;
const important = (main.match(/!important/g) || []).length;
const decls = [...main.matchAll(/\{([^{}]*)\}/g)].flatMap((m) => m[1].split(';').map((s) => s.trim()).filter(Boolean));
const uniq = new Set(decls).size;
const dupRatio = +(1 - uniq / decls.length).toFixed(3);
const lines = main.split('\n').length;
for (const key of ['hex', 'rgba', 'important', 'dupRatio', 'lines']) {
  const val = { hex, rgba, important, dupRatio, lines }[key];
  ok(val <= BASE[key], `main.css ${key} 超基线：${val} > ${BASE[key]}（可降低，不可升高）`);
}
notes.push(`main.css ${lines} 行 · 字面量色 ${hex} · rgba ${rgba} · !important ${important} · 重复率 ${(dupRatio * 100).toFixed(1)}%`);

// 3) 令牌已定义 / 有 fallback / 运行时
const defined = new Set([...tokens.matchAll(/(--cx-[\w-]+)\s*:/g)].map((m) => m[1]));
for (const m of main.matchAll(/(--cx-[\w-]+)\s*:/g)) defined.add(m[1]);
const missing = [];
for (const m of main.matchAll(/var\(\s*(--cx-[\w-]+)(\s*,)?/g)) {
  const name = m[1];
  if (defined.has(name) || RUNTIME.test(name) || m[2]) continue;
  missing.push(name);
}
ok(missing.length === 0, `未定义且无 fallback 的令牌：${[...new Set(missing)].slice(0, 6).join(', ')}`);

// 4) 死类 WARN
const classes = [...main.matchAll(/^\.([a-z][\w-]*)/gm)].map((m) => m[1]);
const dead = [...new Set(classes)].filter((c) => !parts.includes(c) && !kit.includes(c) && !layout.includes(c));
if (dead.length) warns.push(`疑似死类 ${dead.length} 个：${dead.slice(0, 8).join(', ')}`);

if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ fails, warns, notes, metrics: { hex, rgba, important, dupRatio, lines } }, null, 2));
} else {
  notes.forEach((n) => console.log(`CSS ${n}`));
  warns.forEach((w) => console.log(`WARN ${w}`));
  fails.forEach((f) => console.log(`FAIL ${f}`));
  console.log(fails.length ? `css-check: ${fails.length} failed` : 'css-check: passed');
}
process.exit(fails.length ? 1 : 0);
