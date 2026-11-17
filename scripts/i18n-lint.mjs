#!/usr/bin/env node
// 文案门禁（铁律：界面文案英文优先）：
//   A 每个 T('…') / TT('…') 的 key 必须有词条（中文 key → EN_TEXT；英文 key → ZH_TEXT）
//   B 直接写进 title/label/placeholder/desc 的中文与 JSX 文本节点，只减不增（棘轮基线）
//   node scripts/i18n-lint.mjs [--list] [--update]
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const has = (n) => process.argv.includes(n);
const BASELINE = path.join(root, 'scripts/i18n-baseline.json');
const CJK = /[\u3400-\u9FFF]/;
const TEXT_PROPS = ['title', 'label', 'placeholder', 'desc', 'aria-label'];

const partsDir = path.join(root, 'src/client/parts');
const files = fs.readdirSync(partsDir).filter((f) => f.endsWith('.js')).sort();
const prelude = fs.readFileSync(path.join(partsDir, '00-prelude.js'), 'utf8');

function dict(name) {
  const i = prelude.indexOf(`const ${name} = {`);
  if (i < 0) return new Set();
  const end = prelude.indexOf('\n    };', i);
  const body = prelude.slice(i, end < 0 ? undefined : end);
  const set = new Set();
  for (const m of body.matchAll(/'((?:\\.|[^'\\])*)'\s*:/g)) set.add(m[1].replace(/\\'/g, "'"));
  return set;
}
const EN = dict('EN_TEXT');
const ZH = dict('ZH_TEXT');

const problems = [];   // 硬失败
const untranslated = []; // 棘轮计数

for (const f of files) {
  const src = fs.readFileSync(path.join(partsDir, f), 'utf8');
  const lines = src.split('\n');

  // A：T/TT 的 key 必须有词条
  for (let n = 0; n < lines.length; n++) {
    const line = lines[n];
    for (const m of line.matchAll(/\b(T|TT)\(\s*'((?:\\.|[^'\\])*)'/g)) {
      const key = m[2].replace(/\\'/g, "'");
      if (f === '00-prelude.js') continue;
      const isCjk = CJK.test(key);
      if (isCjk && !EN.has(key)) problems.push(`${f}:${n + 1}  T('${key}') 缺英文词条（EN_TEXT）`);
      if (!isCjk && !ZH.has(key)) problems.push(`${f}:${n + 1}  T('${key}') 缺中文词条（ZH_TEXT）`);
    }
  }

  // B：文本属性里直接写中文（未走 T）→ 只减不增
  for (let n = 0; n < lines.length; n++) {
    const line = lines[n];
    if (/\b(T|TT)\(/.test(line) && !new RegExp(`(${TEXT_PROPS.join('|')}):\\s*'[^']*'`).test(line)) continue;
    for (const prop of TEXT_PROPS) {
      const re = new RegExp(`\\b${prop}:\\s*'((?:\\\\.|[^'\\\\])*)'`, 'g');
      for (const m of line.matchAll(re)) {
        const v = m[1];
        if (!CJK.test(v)) continue;
        if (EN.has(v) && new RegExp(`T\\(\\s*'`).test(line)) continue; // 已通过 T 调用
        untranslated.push(`${f}:${n + 1}  ${prop}: '${v.slice(0, 32)}'`);
      }
    }
  }
}

const baseline = fs.existsSync(BASELINE) ? JSON.parse(fs.readFileSync(BASELINE, 'utf8')) : { untranslated: untranslated.length };
if (has('--update')) {
  fs.writeFileSync(BASELINE, JSON.stringify({ untranslated: untranslated.length, at: new Date().toISOString().slice(0, 10) }, null, 2) + '\n');
  console.log(`[i18n-lint] 基线已更新：untranslated=${untranslated.length}`);
  process.exit(problems.length ? 1 : 0);
}
if (has('--keys')) {
  const uniq = [...new Set(problems.map((p) => p.split('T(')[1]?.split("')")[0]))].sort();
  console.log(uniq.join('\n'));
  console.log(`# ${uniq.length} keys`);
  process.exit(0);
}
if (has('--list')) {
  for (const p of problems) console.log(`MISSING  ${p}`);
  for (const u of untranslated) console.log(`RAW      ${u}`);
}

const limit = baseline.untranslated ?? 0;
const ok = problems.length === 0 && untranslated.length <= limit;
console.log(`[i18n-lint] 缺词条 ${problems.length} 条 · 直写中文 ${untranslated.length} 处（基线 ${limit}）`);
for (const p of problems.slice(0, 12)) console.log(`  FAIL  ${p}`);
process.exit(ok ? 0 : 1);
