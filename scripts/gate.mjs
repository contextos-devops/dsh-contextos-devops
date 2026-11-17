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
// 片段列表唯一来源 = src/client/parts 目录（与 build/client.mjs 同规则）。
// 硬编码列表曾漏掉 08-store.js / 49-msg.js，产物缺代码 → 插件加载失败。
const parts = fs.readdirSync(path.join(root, 'src/client/parts'))
  .filter((f) => f.endsWith('.js'))
  .sort((a, b) => a.localeCompare(b, 'en'));
const ERR = [], WARN = [];
const err = (m) => ERR.push(m);
const warn = (m) => WARN.push(m);

// 1) client.js 必须与 parts + styles + version 一致（防止直接改产物）
const hashInputs = [
  pkg.version,
  ...parts.map((p) => read(`src/client/parts/${p}`)),
  read('src/client/styles/tokens.css').trimEnd(),
  read('src/client/styles/base.css').trimEnd(),
  read('src/client/styles/layout.css').trimEnd(),
  read('src/client/styles/kit.css').trimEnd(),
  read('src/client/styles/main.css').trimEnd(),
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

// 7) URL 规范（docs/URL-SPEC.md）：两类 URL 只许走 lib/base/url.js / cxWebUrl
const srcCode = parts.map((f) => read(`src/client/parts/${f}`)).join('\n');
const libCode = fs.readdirSync(path.join(root, 'lib/base'))
  .filter((f) => f.endsWith('.js'))
  .map((f) => read(`lib/base/${f}`)).join('\n');
if (/space_uid|space\['uid'\]/.test(srcCode + libCode)) err('URL 规范：禁止使用空间 uid，空间只用 pod 名称');
if (!/apiPath/.test(read('lib/core/data.js'))) err('URL 规范：lib/core/data.js 必须用 apiPath 构造接口 URL');
if (/debug=true&system_uid=/.test(srcCode)) err('URL 规范：禁止手拼网页 URL，请用 cxWebUrl');
if (!/cxWebUrl/.test(srcCode)) err('URL 规范：客户端必须提供 cxWebUrl');
if (!/URL-SPEC/.test(read('docs/URL-SPEC.md'))) err('URL 规范：docs/URL-SPEC.md 缺失');
// 7b) user.uid 只能发给应用级命令（/s/<pod>/c/web.team.*.portal…），系统命令不带
{
  const page = read('src/client/parts/60-page.js');
  if (!page.includes('appLevel')) err('URL 规范：withActor 缺少 appLevel 判断（user.uid 不得发给 /c/dream 等系统命令）');
  const spec = read('docs/URL-SPEC.md');
  if (!/仅应用级命令/.test(spec) || !/全局通用/.test(spec)) err('URL 规范：docs/URL-SPEC.md 未写明 debug / user.uid 的作用范围');
  const httpSrc = read('lib/base/http.js');
  if (!/const appLevel = /.test(httpSrc)) err('URL 规范：宿主 http() 必须只在应用级路径自动附加 user.uid');
  if (!/本机免登录/.test(spec)) err('URL 规范：docs/URL-SPEC.md 未写明本机免登录 / 远程必须 sessid');
  if (!/一切皆/.test(read('docs/INTERFACE.md'))) err('接口规范：docs/INTERFACE.md 缺失或未写明「一切皆命令」');
  const iface = read('docs/INTERFACE.md');
  if (!/方法语义/.test(read('docs/INTERFACE.md'))) err('接口规范：docs/INTERFACE.md 未写明 GET/PUT/POST/DELETE 方法语义');
  if (!/列表与详情/.test(read('docs/INTERFACE.md'))) err('接口规范：docs/INTERFACE.md 未写明返回数据只有列表与详情两种形态');
  if (!/_process/.test(read('docs/INTERFACE.md')) || !/响应报文/.test(read('docs/INTERFACE.md'))) err('接口规范：docs/INTERFACE.md 未写明响应报文（append/option/detail/result/_process）');
  if (!/usr\/intshell/.test(read('docs/INTERFACE.md')) || !/usr\/volcanos/.test(read('docs/INTERFACE.md'))) err('接口规范：docs/INTERFACE.md 未写明两个调用方（usr/intshell、usr/volcanos）');
  if (!/action\/upload/.test(read('docs/INTERFACE.md'))) err('接口规范：docs/INTERFACE.md 未写明文件上传接口（<cmd>/action/upload）');
  if (!/20240903-operation/.test(read('docs/INTERFACE.md'))) err('接口规范：docs/INTERFACE.md 未写明文件存储依赖云研发空间（20240903-operation）');
  if (!/面板可加/.test(read('docs/MONITOR.md'))) err('监控规范：docs/MONITOR.md 缺失或未写「面板可加，数据源可配」');
  if (!/monitorQuery/.test(read('lib/core/ops.js'))) err('监控规范：lib/core/ops.js 缺少 monitorQuery 取数入口');
  if (!/web\.chat\.action/.test(read('docs/INTERFACE.md')) || !/sess\.daemon/.test(read('docs/INTERFACE.md'))) err('接口规范：docs/INTERFACE.md 未写明 web.chat.action 转发与 sess.daemon 网页空间');
  if (!/export async function upload/.test(read('lib/base/http.js'))) err('接口规范：lib/base/http.js 缺少 upload()');
  if (!/export function envelopeShape/.test(read('lib/base/http.js'))) err('接口规范：lib/base/http.js 缺少 envelopeShape');
  if (!/m\.Push\(\)/.test(iface) || !/m\.Option\(\)/.test(iface)) err('接口规范：docs/INTERFACE.md 未写明命令契约（arg / m.Option / m.Push / m.Echo）');
  const urlSrc = read('lib/base/url.js');
  for (const fn of ['systemUrl', 'spaceUrl', 'platformUrl', 'commandForms']) {
    if (!new RegExp('export function ' + fn).test(urlSrc)) err('接口规范：lib/base/url.js 缺少 ' + fn);
  }
}


// 9) 平台数据接口只认三条 URL：dataPath 必须存在，文档必须写清楚
{
  const url = read('lib/base/url.js');
  if (!/export function dataPath\s*\(/.test(url)) err('lib/base/url.js: missing dataPath()');
  const doc = read('docs/URL-SPEC.md');
  for (const s of ['action/run/<index_cmd>/action/create', 'action/run/<index_cmd>/<place_uid>', 'action/run/<index_cmd>/<place_uid>/<uid>']) {
    if (!doc.includes(s)) err(`docs/URL-SPEC.md: missing data url form ${s}`);
  }
}

// 9b) 修改 modify(POST) / 删除 remove(DELETE)
{
  const doc = read('docs/URL-SPEC.md');
  for (const s of ['action/modify/<k0>', 'DELETE /s/<pod>/c/<portal>/action/run/<index_cmd>/action/remove']) {
    if (!doc.includes(s)) err(`docs/URL-SPEC.md: missing modify/remove form ${s}`);
  }
  const data = read('lib/core/data.js');
  if (!/method:\s*'DELETE'/.test(data)) err('lib/core/data.js: removeData must use DELETE');
}

// 9c) 三纲五常：理念必须落成文档与提示词
{
  const doc = read('docs/DOCTRINE.md');
  for (const k of ['三纲', '五常', '四件套', '抽象递减']) {
    if (!doc.includes(k)) err(`docs/DOCTRINE.md: missing ${k}`);
  }
  const agents = read('AGENTS.md');
  for (const k of ['三纲', '五常', '四件套']) {
    if (!agents.includes(k)) err(`AGENTS.md: missing ${k}`);
  }
  const copilot = read('lib/core/copilot.js');
  if (!copilot.includes('三纲五常')) err('lib/core/copilot.js: doctrine not injected into prompt');
}

// 10) AGENTS 契约：工作流程 + 对话流程必须写清楚
{
  const t = read('AGENTS.md');
  for (const k of ['铁律', '工作流程', '归纳总结', '对话流程', 'npm run build:client', 'plugin_manager', 'usr/local/WorkBuddy/dsh-reports']) {
    if (!t.includes(k)) err(`AGENTS.md: missing ${k}`);
  }
}

// 11) README 必须能当「快速了解项目」的入口：结构齐全 + 版本不写死过期值
{
  const readme = read('README.md');
  // 断言的是「README 是否回答了这几个问题」，不是某一种措辞（多种等价写法都算过）。
  const need = [
    ['上手路径', /60 秒上手|快速开始|Quick start/],
    ['能力清单', /能力矩阵|^##+ 功能|^##+ 能力|^##+ Capabilit(y|ies)/m],
    ['智能体契约入口', /智能体|AGENTS\.md/],
    ['RSI 循环', /RSI/],
    ['文档入口', /docs\/INDEX\.md/],
    ['构建命令', /npm run build:client/],
  ];
  for (const [k, re] of need) if (!re.test(readme)) err(`README.md: missing ${k}`);
  if (readme.split('\n').length > 400) err('README.md: 超过 400 行，概览应拆分到 docs/PRODUCT-DESIGN.md');
  const pkg = JSON.parse(read('package.json'));
  const claimed = /\|\s*(?:版本|Version)\s*\|[^\n]*?(\d+\.\d+\.\d+)/.exec(readme);
  if (claimed && claimed[1] !== pkg.version) err(`README.md: 版本 ${claimed[1]} 与 package.json ${pkg.version} 不一致`);
}

// 13) 工具链：go 必须可自举（git 由 ContextOS 自带）
{
  const tc = read('lib/core/toolchain.js');
  for (const k of ['export async function ensureGo', 'export function goEnv', 'export async function envDoctor', 'findGo']) {
    if (!tc.includes(k)) err(`lib/core/toolchain.js: missing ${k}（go 无法按需安装）`);
  }
  const gb = read('lib/core/gobuild.js');
  if (!/ensureGo\(/.test(gb)) err('lib/core/gobuild.js: 编译前必须 ensureGo（首编自动装 go）');
  const doc = read('docs/CODE-GEN.md');
  for (const k of ['git 自带', '按需下载', 'usr/local/go']) if (!doc.includes(k)) err(`docs/CODE-GEN.md: missing ${k}`);
  const ops = read('lib/core/ops.js');
  for (const k of ['envDoctor:', 'goEnsure:']) if (!ops.includes(k)) err(`lib/core/ops.js: missing ${k}`);
}

// 12) 样式不得污染宿主：:root 只能声明 --cx- 前缀令牌，顶层选择器必须带 cx
{
  const css = read('assets/client.css').replace(/\/\*[\s\S]*?\*\//g, '');
  for (const m of css.matchAll(/:root\s*\{([^}]*)\}/g)) {
    for (const d of m[1].matchAll(/(--[\w-]+)\s*:/g)) {
      if (!d[1].startsWith('--cx-')) err(`assets/client.css: :root 泄漏宿主令牌 ${d[1]}（必须 --cx- 前缀）`);
    }
  }
  let depth = 0, buf = '';
  for (const ch of css) {
    if (ch === '{') {
      if (depth === 0) {
        const sel = buf.trim();
        if (sel && !sel.startsWith('@') && sel !== ':root' && !/cx/.test(sel)) err(`assets/client.css: 顶层选择器未限定在 .cx- 作用域：${sel.slice(0, 60)}`);
      }
      depth++;
      buf = '';
    } else if (ch === '}') { depth = Math.max(0, depth - 1); buf = ''; }
    else if (depth === 0) buf += ch;
  }
}

const ok = ERR.length === 0;
console.log(`gate: ${ok ? 'PASS' : 'FAIL'}  ERR=${ERR.length} WARN=${WARN.length}`);
for (const e of ERR) console.log(`  ERR  ${e}`);
for (const w of WARN) console.log(`  WARN ${w}`);
process.exit(ok ? 0 : 1);
