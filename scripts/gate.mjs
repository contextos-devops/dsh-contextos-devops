#!/usr/bin/env node
// 门禁：构建一致性 / 语法 / CSS 版本 / 全窗口最大化回归 / 危险写法
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
const exists = (f) => fs.existsSync(path.join(root, f));
const pkg = JSON.parse(read('package.json'));
const parts = [
  '00-prelude.js','05-bootstrap.js','10-ui.js','12-debug.js','15-layout.js','20-devworkspace.js',
  '25-editor-ui.js','30-modals.js','32-cards.js','34-forms.js','36-data.js','40-project.js',
  '45-map.js','46-pm.js','47-three.js','50-chat.js','51-pmselection.js','52-pmdata.js',
  '55-pm.js','58-config.js','59-monitor.js','60-page.js',
];
const ERR = [], WARN = [];
const err = (m) => ERR.push(m);
const warn = (m) => WARN.push(m);

// 1) client.js 必须与 parts + styles + version 一致（防止直接改产物）
const hashInputs = [
  pkg.version,
  ...parts.map((p) => read(`src/client/parts/${p}`)),
  read('src/client/styles/tokens.css').trimEnd(),
  read('src/client/styles/main.css').trimEnd(),
  read('src/client/styles/kit.css').trimEnd(),
].join('\n---\n');
const expect = crypto.createHash('sha1').update(hashInputs).digest('hex').slice(0, 12);
const built = read('client.js');
const m = /@build-hash ([0-9a-f]{12})/.exec(built);
if (!m) err('client.js 缺少 @build-hash，先运行 npm run build:client');
else if (m[1] !== expect) err(`client.js 与源码不一致（源码 ${expect} ≠ 产物 ${m[1]}）：改的是产物或没重新构建，请只改 src/client/parts 后 npm run build:client`);

// 2) 语法
for (const f of ['client.js', 'index.js', ...fs.readdirSync(path.join(root, 'lib/core')).filter((x) => x.endsWith('.js')).map((x) => `lib/core/${x}`)]) {
  if (!exists(f)) continue;
  try { execFileSync(process.execPath, ['--check', f], { stdio: 'pipe' }); } catch (e) { err(`语法错误 ${f}: ${String(e.stderr || e.message).split('\n')[0]}`); }
}

// 3) CSS 版本号必须是当前版本
if (!built.includes(`client.css?v=${pkg.version}`)) err(`client.js 里 CSS 版本不是 ${pkg.version}（缓存不会失效）`);

// 4) 全窗口最大化回归：.max/.full 选择器里出现 100vw/100vh 一律拦下
const css = read('assets/client.css');
for (const line of css.split('\n')) {
  if (!/(\.max|\.full)\b/.test(line)) continue;
  if (/:before|:after/.test(line)) continue;            // 装饰层不管
  if (/^\.cx-chat-host/.test(line.trim())) continue;    // 宿主容器：相对 shell 伸展，合法
  if (/--cx-shell-/.test(line)) continue;               // 已按插件矩形定位，合法
  if (/100vw|100vh|inset:\s*0/.test(line)) err(`最大化/全屏规则铺满整窗（应改用 --cx-shell-*）：${line.slice(0, 110)}`);
}

// 5) 已废弃写法：地图不得再加 .full 类（会盖住自己的标题栏）
if (/cx-taskmap\$\{[^}]*' full'/.test(built)) err('TaskMap 又用上了 `.full` 类（会 fixed 全窗口盖住标题栏），改由 .cx-mapsec 承载最大化');

// 6) 定位实现必须唯一：不允许再出现第二套「量 shell 写 style」的实现
const maxImpl = (built.match(/function cxMaxApply/g) || []).length;
if (maxImpl !== 1) err(`cxMaxApply 应只有 1 处实现，当前 ${maxImpl}`);

const ok = ERR.length === 0;
console.log(`gate: ${ok ? 'PASS' : 'FAIL'}  ERR=${ERR.length} WARN=${WARN.length}`);
for (const e of ERR) console.log(`  ERR  ${e}`);
for (const w of WARN) console.log(`  WARN ${w}`);
process.exit(ok ? 0 : 1);
