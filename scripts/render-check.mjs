#!/usr/bin/env node
// 组件渲染冒烟：把关键组件从片段里取出来，用桩 hooks 真跑一遍 render。
// 目的：拦住「factory 能加载、但一渲染就 ReferenceError」这类只有打开界面才暴露的错误。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const parts = fs.readdirSync(path.join(root, 'src/client/parts')).filter((f) => f.endsWith('.js')).sort();
const src = parts.map((f) => fs.readFileSync(path.join(root, 'src/client/parts', f), 'utf8')).join('\n');

function grab(name) {
  const a = src.indexOf(`function ${name}(`);
  if (a < 0) throw new Error(`组件 ${name} 未找到`);
  // 先跳过参数表（解构参数里也有花括号），再对身体做花括号配对
  let i = src.indexOf('(', a);
  let pd = 0;
  for (; i < src.length; i++) {
    if (src[i] === '(') pd++;
    else if (src[i] === ')') { pd--; if (pd === 0) break; }
  }
  let depth = 0;
  for (let j = src.indexOf('{', i); j < src.length; j++) {
    if (src[j] === '{') depth++;
    else if (src[j] === '}') { depth--; if (depth === 0) return src.slice(a, j + 1); }
  }
  throw new Error(`组件 ${name} 花括号不配对`);
}

const NAMES = ['CxPopover', 'CxCombo', 'CxDateTime', 'CxConfirmHost', 'UpdateModal'];
const HELPER_NAMES = ['cxPopFlip'];
const code = [...HELPER_NAMES, ...NAMES].map(grab).join('\n');

const stubs = {
  h: (type, props, ...children) => ({ type, props: props || {}, children }),
  T: (s) => s,
  TT: (s) => s,
  UiIcon: (p) => ({ type: 'icon', props: p || {} }),
  cxCx: (...a) => a.filter(Boolean).join(' '),
  cxStars: (n) => '★'.repeat(n || 0),
  cxPopStyle: () => ({}),
  cxAsk: () => Promise.resolve(false),
  cxReveal: () => {},
  cxParseWhen: () => ({ y: 2026, mo: 1, d: 1, hh: 0, mm: 0, ss: 0 }),
  cxWhenText: () => '2026-01-01 00:00:00',
  useState: (v) => [typeof v === 'function' ? v() : v, () => {}],
  useEffect: () => {},
  useRef: (v) => ({ current: v === undefined ? null : v }),
  useCallback: (f) => f,
  cxPad: (n) => String(n).padStart(2, '0'),
};

const factory = new Function(...Object.keys(stubs), `${code}\nreturn { ${[...HELPER_NAMES, ...NAMES].join(', ')} };`);
const mod = factory(...Object.values(stubs));

const cases = [
  ['CxPopover(closed)', () => mod.CxPopover({ open: false })],
  ['CxPopover(open)', () => mod.CxPopover({ open: true, children: [] })],
  ['CxCombo', () => mod.CxCombo({ value: '', onChange: () => {}, options: [{ value: 'a', label: 'A' }] })],
  ['CxDateTime', () => mod.CxDateTime({ value: '2026-11-18 00:00:00', onChange: () => {} })],
];

// 回归用例：下方空间不足时上翻，且只翻转、不算坐标（坐标法已废弃）
{
  const mod = factory(...Object.values(stubs));
  const low = { getBoundingClientRect: () => ({ left: 200, top: 700, bottom: 728, width: 300 }) };
  const high = { getBoundingClientRect: () => ({ left: 200, top: 100, bottom: 128, width: 300 }) };
  const a = mod.cxPopFlip(low, 320);
  const b = mod.cxPopFlip(high, 320);
  if (a === true && b === false) console.log('PASS  cxPopFlip 在底部空间不足时上翻，上方空间充足时向下');
  else { console.log(`FAIL  cxPopFlip: low=${a} high=${b}`); process.exitCode = 1; }
}

let failed = 0;
for (const [name, run] of cases) {
  try {
    const el = run();
    if (el === undefined) throw new Error('render 返回 undefined');
    console.log(`PASS  ${name}`);
  } catch (e) {
    failed++;
    console.log(`FAIL  ${name}: ${e && e.message}`);
  }
}
if (failed) { console.log(`[render-check] ${failed} 个组件渲染失败`); process.exit(1); }
console.log(`[render-check] ${cases.length} 个组件渲染通过`);
