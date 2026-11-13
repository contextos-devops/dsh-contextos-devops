#!/usr/bin/env node
// 静态门禁：hook 依赖数组里引用的变量，必须在同一文件里先声明后使用。
// 这一条专门拦 "Cannot access 'x' before initialization" 这类渲染期 TDZ：
// 静态构建/UI 检查都发现不了，只有真的渲染才炸。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const partsDir = path.join(root, 'src/client/parts');
const HOOKS = ['useEffect', 'useLayoutEffect', 'useCallback', 'useMemo'];
const errs = [];

function findCallEnd(src, open) {
  let depth = 1;
  for (let i = open + 1; i < src.length; i += 1) {
    const c = src[i];
    if (c === '(') depth += 1;
    else if (c === ')') { depth -= 1; if (depth === 0) return i; }
  }
  return -1;
}

for (const file of fs.readdirSync(partsDir).filter((f) => f.endsWith('.js')).sort()) {
  const src = fs.readFileSync(path.join(partsDir, file), 'utf8');
  const lines = src.split('\n');
  const lineOf = (idx) => src.slice(0, idx).split('\n').length;

  // 本文件里所有顶层 const 声明（useState 解构与普通 const）
  const decls = [];
  // 函数参数（含解构 props）视为在函数体之前已声明
  const fnRe = /function\s+[A-Za-z_$][\w$]*\s*\(\s*(?:\{([^}]*)\}|([^)]*))\)/g;
  let fm;
  while ((fm = fnRe.exec(src))) {
    const raw = fm[1] != null ? fm[1] : fm[2];
    const line = lineOf(fm.index);
    for (const piece of raw.split(',')) {
      const name = piece.split('=')[0].split(':')[0].trim();
      if (/^[A-Za-z_$][\w$]*$/.test(name)) decls.push({ name, line });
    }
  }
  const re = /\bconst\s+(?:\[([^\]]+)\]|([A-Za-z_$][\w$]*))\s*=/g;
  let m;
  while ((m = re.exec(src))) {
    const names = m[1] ? m[1].split(',').map((x) => x.trim().split('=')[0].trim()) : [m[2]];
    for (const n of names) if (/^[A-Za-z_$][\w$]*$/.test(n)) decls.push({ name: n, line: lineOf(m.index) });
  }

  for (const hook of HOOKS) {
    const needle = `${hook}(`;
    let at = src.indexOf(needle);
    while (at >= 0) {
      const open = at + needle.length - 1;
      const close = findCallEnd(src, open);
      if (close < 0) break;
      const call = src.slice(open, close + 1);
      // 取调用参数的最后一个顶层数组字面量作为依赖
      let depth = 0, arrStart = -1, arrEnd = -1;
      for (let i = call.length - 1; i >= 0; i -= 1) {
        const c = call[i];
        if (c === ']') { depth += 1; if (arrEnd < 0) arrEnd = i; }
        else if (c === '[') { depth -= 1; if (depth === 0) { arrStart = i; break; } }
        else if (c === ')' && depth === 0) { /* ignore */ }
      }
      if (arrStart >= 0 && arrEnd > arrStart) {
        const deps = call.slice(arrStart + 1, arrEnd).split(',').map((x) => x.trim()).filter(Boolean);
        const hookLine = lineOf(at);
        for (const dep of deps) {
          if (!/^[A-Za-z_$][\w$]*$/.test(dep)) continue;
          const decl = decls.find((d) => d.name === dep);
          if (decl && decl.line > hookLine) {
            errs.push(`${file}:${hookLine} ${hook}(...) 的依赖 "${dep}" 在 ${decl.line} 行才声明（渲染期会 TDZ 崩溃）`);
          }
        }
      }
      at = src.indexOf(needle, close + 1);
    }
  }
}

if (errs.length) {
  console.error('hook-order-check: FAILED');
  for (const e of errs) console.error('  ' + e);
  process.exit(1);
}
console.log('hook-order-check: passed');
