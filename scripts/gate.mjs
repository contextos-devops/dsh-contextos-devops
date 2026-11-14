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

// 10) AGENTS 契约：DSH 工作流 + 对话流程必须写清楚
{
  const t = read('AGENTS.md');
  for (const k of ['铁律', 'DSH 工作流', '对话流程', 'npm run build:client', 'plugin_manager', 'usr/local/WorkBuddy/dsh-reports']) {
    if (!t.includes(k)) err(`AGENTS.md: missing ${k}`);
  }
}

const ok = ERR.length === 0;
console.log(`gate: ${ok ? 'PASS' : 'FAIL'}  ERR=${ERR.length} WARN=${WARN.length}`);
for (const e of ERR) console.log(`  ERR  ${e}`);
for (const w of WARN) console.log(`  WARN ${w}`);
process.exit(ok ? 0 : 1);
