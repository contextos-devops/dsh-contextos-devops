#!/usr/bin/env node
// 扩展脚手架：加一个页面 / 组件 / 状态 / 接口 / 样式 / 动效时，先生成骨架，再按打印的清单补齐。
//
// 用法:
//   node scripts/scaffold.mjs component CxBadge       # 组件（07-kit + kit.css）
//   node scripts/scaffold.mjs page      InsightsView  # 页面（新片段 56-<slug>.js + 60-page 三处接线清单）
//   node scripts/scaffold.mjs state     last-view     # 持久化状态（08-store 的 CX_STORE_SCHEMA）
//   node scripts/scaffold.mjs op        nodeUptime    # 接口（lib/core/ops.js 的 OPS 表）
//   node scripts/scaffold.mjs style     cx-badge      # 样式（kit.css 变体块）
//   node scripts/scaffold.mjs motion    flash         # 动效（motion.css 的 keyframes + 工具类）
//   node scripts/scaffold.mjs --check                 # 只做约定自检（不写文件）
//
// 设计原则：能安全自动写的地方就写（schema/ops/kit.css/motion.css/新片段），
// 需要人判断的地方不猜（JSX 里的接线），只打印「改哪个文件第几行、复制什么」。
// 幂等：同名已存在则跳过，不会重复插入。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const write = (p, s) => fs.writeFileSync(path.join(root, p), s);
const rel = (p) => path.relative(root, p);

const args = process.argv.slice(2).filter((a) => a !== '--check');
const checkOnly = process.argv.includes('--check');
const kind = args[0] || '';
const raw = args[1] || '';

const die = (msg) => { console.error(`[scaffold] FAIL ${msg}`); process.exit(1); };
const info = (msg) => console.log(`  ${msg}`);

const KINDS = {
  component: {
    what: '组件',
    name: (s) => (/^Cx[A-Z]/.test(s) ? s : `Cx${pascal(s)}`),
    hint: '组件只写结构，样式走 kit.css 变体或复用现有类',
  },
  page: {
    what: '页面',
    name: (s) => (/^Cx[A-Z]/.test(s) ? s : `Cx${pascal(s)}`),
    hint: '页面 = 60-page.js 的 viewMode 分支 + 一个片段文件',
  },
  state: { what: '状态', name: (s) => kebab(s), hint: '状态必须登记 schema，否则 store-check 会红' },
  op: { what: '接口', name: (s) => camel(s), hint: '接口先进 OPS 表，客户端只用 api(op)' },
  style: { what: '样式', name: (s) => (s.startsWith('cx-') ? s : `cx-${kebab(s)}`), hint: '样式优先做成 kit.css 变体' },
  motion: { what: '动效', name: (s) => kebab(s), hint: '动效只用 --cx-dur*/--cx-ease* 令牌' },
};

function pascal(s) { return String(s).replace(/[-_\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : '')).replace(/^(.)/, (c) => c.toUpperCase()); }
function camel(s) { const p = pascal(s); return p.charAt(0).toLowerCase() + p.slice(1); }
function kebab(s) { return String(s).replace(/([a-z0-9])([A-Z])/g, '$1-$2').replace(/[\s_]+/g, '-').toLowerCase(); }

/** 在「锚点之前」插入内容；已存在同名字符串则跳过。 */
function insertBefore(file, anchor, block, guard) {
  const src = read(file);
  if (guard && src.includes(guard)) { info(`${file} 已存在 ${guard}，跳过`); return false; }
  const at = src.lastIndexOf(anchor);
  if (at === -1) die(`${file} 找不到锚点 ${JSON.stringify(anchor)}（文件结构变了？）`);
  write(file, src.slice(0, at) + block + src.slice(at));
  info(`写入 ${file}`);
  return true;
}

function appendTo(file, block, guard) {
  const src = read(file);
  if (guard && src.includes(guard)) { info(`${file} 已存在 ${guard}，跳过`); return false; }
  write(file, src.replace(/\s*$/, '\n') + '\n' + block);
  info(`追加 ${file}`);
  return true;
}

const checklist = (items) => {
  console.log('\n下一步（照做即可，做完跑最后一条命令）：');
  items.forEach((s, i) => console.log(`  ${i + 1}. ${s}`));
};

if (checkOnly) {
  // 约定自检：文件存在、层级不许越界、组件命名前缀
  const fails = [];
  const need = ['tokens.css', 'base.css', 'layout.css', 'kit.css', 'motion.css', 'main.css'];
  for (const f of need) if (!fs.existsSync(path.join(root, 'src/client/styles', f))) fails.push(`缺样式层 ${f}`);
  const kit = read('src/client/parts/07-kit.js');
  for (const m of kit.matchAll(/function (Cx\w+)/g)) if (!/^Cx[A-Z]/.test(m[1])) fails.push(`组件命名不合规：${m[1]}`);
  if (!/CX_STORE_SCHEMA/.test(read('src/client/parts/08-store.js'))) fails.push('08-store.js 缺 schema');
  if (!/export const OPS/.test(read('lib/core/ops.js'))) fails.push('ops.js 缺 OPS');
  if (fails.length) { console.error('[scaffold] FAIL\n  - ' + fails.join('\n  - ')); process.exit(1); }
  console.log('[scaffold] PASS 分层/命名/注册表约定正常（6 类扩展都有落脚点）');
  process.exit(0);
}

if (!KINDS[kind]) die(`未知类型 "${kind}"，可选：${Object.keys(KINDS).join(' / ')}`);
if (!raw) die(`缺少名字，例如：node scripts/scaffold.mjs ${kind} ${kind === 'op' ? 'nodeUptime' : 'Demo'}`);
const name = KINDS[kind].name(raw);

console.log(`[scaffold] ${KINDS[kind].what} ${name} —— ${KINDS[kind].hint}\n`);

if (kind === 'component') {
  appendTo('src/client/parts/07-kit.js', `
  // @scaffold:component ${name} —— 只写结构，样式见 kit.css 的 .cx-${kebab(name)} 变体
  function ${name}({ className, children, ...rest }) {
    return h('div', { ...rest, className: cxCx('cx-${kebab(name)}', className) }, children);
  }
`, `@scaffold:component ${name}`);
  appendTo('src/client/styles/kit.css', `
/* @scaffold:component ${name} */
.cx-${kebab(name)} { display: flex; align-items: center; gap: var(--cx-sp-2); color: var(--cx-text); font-size: var(--cx-fs-body) }
`, `@scaffold:component ${name}`);
  checklist([
    '在 docs/DESIGN-SYSTEM.md §20.2 的原语表加一行（名称 + 用途 + 变体）',
    `用 ${name} 的地方只传结构（不要写 font-size/color/间距字面量）`,
    'node scripts/css-check.mjs',
    'npm run build:client',
  ]);
}

if (kind === 'page') {
  const file = `src/client/parts/56-${kebab(name.replace(/^Cx/, ''))}.js`;
  if (!fs.existsSync(path.join(root, file))) {
    write(file, `// ${path.basename(file)} —— ${name}（页面片段：只负责这一屏的结构，状态从 props 进）
function ${name}({ locale, node, space, busy, onRefresh }) {
  return h(CxSection, { className: 'cx-page-${kebab(name.replace(/^Cx/, ''))}' },
    h(CxRow, { className: 'cx-sec-hd' },
      h('span', { className: 'cx-sec-t' }, T('${name}')),
      h(CxBtn, { size: 'sm', onClick: onRefresh, disabled: !!busy }, T('刷新'))),
    h('div', { className: 'cx-sec-bd' }, busy ? h('div', { className: 'cx-loading' }, T('加载中…')) : null));
}
`);
    info(`新建 ${file}`);
  } else info(`${file} 已存在，跳过`);
  checklist([
    'src/client/parts/60-page.js：viewMode 的合法值加一个分支（搜 `viewMode === \'monitor\'` 附近）',
    `在 60-page.js 的渲染区加：${name} 的渲染分支（viewMode === '<新值>' ? h(${name}, {...}) : null）`,
    '在头部视图切换按钮数组里加一项（图标 + 中英文 + 快捷键）',
    'src/client/parts/00-prelude.js：EN_TEXT 加英文词条；中文直接写字面量',
    'scripts/ui-check.mjs：加一条断言（新视图必须在渲染分支里出现）',
    'npm run build:client',
  ]);
}

if (kind === 'state') {
  const block = `\n  '${name}': { kind: 'json', def: null, zh: '${name}', note: 'TODO 说明这个状态存什么' },`;
  insertBefore('src/client/parts/08-store.js', '\n};\n\n// 允许调用方传完整键', block, `'${name}':`);
  checklist([
    `读取：const [v, setV] = useState(() => cxRead('${name}', null))`,
    `写入：cxWrite('${name}', v)（在 useEffect 里，别在渲染期写）`,
    'node scripts/docs-index.mjs --write   # 同步 docs/STATE.md',
    'node scripts/store-check.mjs',
  ]);
}

if (kind === 'op') {
  const block = `\n  ${name}: { method: 'POST', noUser: false, run: async (b, c) => {\n    // TODO 实现：b 是请求体，c 是 { node, space }\n    return {};\n  } },`;
  insertBefore('lib/core/ops.js', '\n};\n\n/** 供 UI/索引使用', block, `  ${name}: {`);
  checklist([
    `客户端调用：await api('${name}', { ... })（api 是唯一出口，不要 fetch）`,
    "若只读：method 改 'GET'，并把 op 名加进 src/client/parts/05-bootstrap.js 的 QUERY_OPS",
    '复杂逻辑放 lib/core/<域>.js，OPS 里只做参数归一 + 一行调用',
    'docs/INTERFACE.md 补一行（op / 方法 / 入参 / 返回 / 用途）',
    'node scripts/op-check.mjs',
  ]);
}

if (kind === 'style') {
  appendTo('src/client/styles/kit.css', `
/* @scaffold:style ${name} */
.${name} { display: flex; align-items: center; gap: var(--cx-sp-2); padding: var(--cx-sp-2) var(--cx-sp-3); border: 1px solid var(--cx-border); border-radius: var(--cx-r-sm); background: var(--cx-surface-2); color: var(--cx-text); font-size: var(--cx-fs-body) }
.${name}:hover { border-color: var(--cx-border-strong); background: var(--cx-surface-3) }
`, `@scaffold:style ${name}`);
  checklist([
    '只准用 --cx-* 令牌；需要新令牌先加到 tokens.css',
    '状态用变体类（.on / .pri / .danger），不要复制整块规则',
    'node scripts/css-check.mjs',
  ]);
}

if (kind === 'motion') {
  appendTo('src/client/styles/motion.css', `
/* @scaffold:motion ${name} */
@keyframes cx-${name} { from { opacity: 0; transform: translateY(4px) } to { opacity: 1; transform: translateY(0) } }
.cx-anim-${name} { animation: cx-${name} var(--cx-dur) var(--cx-ease-out) both }
`, `@scaffold:motion ${name}`);
  checklist([
    '时长/缓动只用 --cx-dur*/--cx-ease*；不要写字面量',
    'prefers-reduced-motion 已由 motion.css 统一关闭，新动效不要再写一份',
    '需要交错出现时加 .cx-anim-stagger 并设置 --cx-i',
    'node scripts/css-check.mjs && node scripts/ui-probe.mjs --case anim',
  ]);
}

console.log(`\n[scaffold] 完成：${KINDS[kind].what} ${name}`);
