#!/usr/bin/env node
// 生成 docs/CODE-INDEX.md 与 docs/STATE.md。
// 用法：node scripts/docs-index.mjs [--check]
//   --check：只比对，不写盘；与现存文件不一致时退出码 1（用于门禁）。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const check = process.argv.includes('--check');
const rel = (p) => path.relative(root, p);
const lines = (f) => fs.readFileSync(path.join(root, f), 'utf8').split('\n').length;
const walk = (dir, ext, out = []) => {
  for (const e of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, ext, out);
    else if (p.endsWith(ext)) out.push(p);
  }
  return out;
};
const exportsOf = (f) => {
  const t = fs.readFileSync(path.join(root, f), 'utf8');
  const names = new Set();
  for (const m of t.matchAll(/export (?:async )?function ([A-Za-z0-9_]+)/g)) names.add(`${m[1]}()`);
  for (const m of t.matchAll(/export const ([A-Za-z0-9_]+)/g)) names.add(m[1]);
  return [...names];
};

// ── 存储 schema（从 08-store.js 求值，避免文档与代码各写一份）
const storeSrc = fs.readFileSync(path.join(root, 'src/client/parts/08-store.js'), 'utf8');
const schemaText = /const CX_STORE_SCHEMA = (\{[\s\S]*?\n\});/.exec(storeSrc)[1];
// eslint-disable-next-line no-new-func
const SCHEMA = new Function(`return (${schemaText});`)();
const schemaRows = Object.entries(SCHEMA);

// ── OPS 注册表
const { OPS } = await import(path.join(root, 'lib/core/ops.js'));
const ops = Object.entries(OPS);
const parts = walk('src/client/parts', '.js').sort();
const clientOps = new Set();
for (const f of parts) {
  for (const m of fs.readFileSync(path.join(root, f), 'utf8').matchAll(/\bapi\(\s*'([A-Za-z0-9_]+)'/g)) clientOps.add(m[1]);
}
const serverOnly = ops.map(([k]) => k).filter((k) => !clientOps.has(k));

const now = new Date().toISOString().slice(0, 10);
const head = (title, what) => `# ${title}\n\n> 生成物：\`node scripts/docs-index.mjs --write\`（${now}）· ${what}\n> 手改会被下一次生成覆盖；要改内容改代码里的源头。\n`;

// ── CODE-INDEX.md
let code = head('代码索引 / CODE INDEX', '源：`src/client/parts/*.js`、`lib/**/*.js`、`scripts/*.mjs`、`docs/*.md`');
code += `\n## 1. 服务端（宿主进程）\n\n| 文件 | 行数 | 导出 |\n| --- | ---: | --- |\n`;
code += `| \`index.js\` | ${lines('index.js')} | \`apply()\`、\`inject\`；路由只做 \`OPS\` 分发 |\n`;
for (const f of walk('lib', '.js').sort()) {
  const ex = exportsOf(f);
  code += `| \`${f}\` | ${lines(f)} | ${ex.length ? ex.slice(0, 8).map((x) => `\`${x}\``).join(' ') + (ex.length > 8 ? ` …${ex.length} 个` : '') : '—'} |\n`;
}
code += `\n## 2. 客户端片段（构建顺序 = 文件名顺序）\n\n| 片段 | 行数 | 主要定义 |\n| --- | ---: | --- |\n`;
for (const f of parts) {
  const t = fs.readFileSync(path.join(root, f), 'utf8');
  const defs = [...t.matchAll(/^ {2,6}(?:function|class|const) ([A-Za-z0-9_]+)/gm)].map((m) => m[1]);
  const keep = defs.filter((d) => /^[A-Z]/.test(d) || /^(cx|use|api|term|T)/.test(d)).slice(0, 10);
  code += `| \`${f}\` | ${lines(f)} | ${keep.length ? keep.map((x) => `\`${x}\``).join(' ') : '—'} |\n`;
}
code += `\n## 3. 接口契约\n\n- 注册表：\`lib/core/ops.js\` — **${ops.length}** 个 op（GET 查询 / PUT 仅 pmCreate / POST 其余）。\n`;
code += `- 客户端调用 **${clientOps.size}** 个；仅服务端 **${serverOnly.length}** 个：${serverOnly.map((x) => `\`${x}\``).join(' ')}。\n`;
code += `- 门禁：\`scripts/op-check.mjs\`（缺 op、方法不一致、路由层残留业务分支都会红）。\n`;
code += `\n## 4. 持久化\n\n- 唯一出口：\`src/client/parts/08-store.js\`；**${schemaRows.length}** 个登记键，明细见 \`docs/STATE.md\`。\n`;
code += `- 门禁：\`scripts/store-check.mjs\`（直连 localStorage 只减不增，新键必须进 schema）。\n`;
code += `\n## 5. 脚本与门禁\n\n| 脚本 | 作用 |\n| --- | --- |\n`;
const scripts = fs.readdirSync(path.join(root, 'scripts')).filter((f) => f.endsWith('.mjs')).sort();
const purpose = {
  'gate.mjs': '构建门禁：产物哈希/语法/CSS 版本/规范断言',
  'op-check.mjs': 'OPS ↔ 客户端 api() 契约',
  'store-check.mjs': '持久化唯一出口 + schema 登记',
  'hook-order-check.mjs': 'hook 依赖数组的 TDZ',
  'ui-check.mjs': 'UI 结构与组件复用断言',
  'i18n-check.mjs': '中英文案键与大小写',
  'context-check.mjs': 'AI 上下文包与硬规则仍在',
  'docs-check.mjs': '文档索引、链接、生成物一致',
  'ui-verify.mjs': '真浏览器验收（Edge CDP 9223）',
  'edge-refresh.mjs': 'CDP 刷新页面',
  'accept-factory.mjs': '一次性空间跑通软件工厂',
};
for (const f of scripts) code += `| \`scripts/${f}\` | ${purpose[f] || '—'} |\n`;
code += `\n## 6. 文档\n\n| 文档 | 行数 | 性质 |\n| --- | ---: | --- |\n`;
const generated = new Set(['docs/CODE-INDEX.md', 'docs/STATE.md']);
for (const f of walk('docs', '.md').sort()) {
  const kind = generated.has(f) ? '生成' : (f === 'docs/INDEX.md' ? '索引' : '人写');
  // 生成物列自己的行数会自我指涉、每次都不一致，所以不写
  code += `| \`${f}\` | ${generated.has(f) ? '—' : lines(f)} | ${kind} |\n`;
}

// ── STATE.md
let state = head('状态索引 / STATE', '源：`src/client/parts/08-store.js` 的 `CX_STORE_SCHEMA`');
state += `\n## 1. 浏览器侧（localStorage，前缀 \`contextos-devops-dsh:\`）\n\n| 键 | 类型 | 默认值 | 说明 |\n| --- | --- | --- | --- |\n`;
for (const [key, spec] of schemaRows) {
  const def = spec.kind === 'text' ? `\`${spec.def}\`` : `\`${JSON.stringify(spec.def)}\``;
  state += `| \`${key}\` | ${spec.kind === 'text' ? '文本' : 'JSON'} | ${def} | ${spec.zh}${spec.note ? '：' + spec.note : ''} |\n`;
}
state += `\n## 2. 服务端（\`~/.dsh/contextos-devops-dsh/state.json\`）\n\n| 名称 | 写入方 | 用途 |\n| --- | --- | --- |\n`;
state += `| \`prefs\` | \`stateSet\` | 主题/语言/视图/工作模式（跨端口恢复） |\n`;
state += `| \`clientCheck\` | \`stateSet\` | 真实 DOM 字号/bundle 版本回报 |\n`;
state += `| \`reqlog\` | \`stateSet\` | 最近 50 条请求（控制台 REQUEST 页） |\n`;
state += `| \`selMap\` | \`stateSet\` | 每节点选中的空间/应用 |\n`;
state += `| \`chat:<分身>:<计划>\` | \`stateSet\` | 会话消息（最多 100 条） |\n`;
state += `| \`termBuf\` | \`stateSet\` | 终端滚动缓冲 |\n`;
state += `| \`nodesCache\` | \`stateSet\` | 节点列表缓存（打开插件先渲染） |\n`;
state += `| \`ideOpen\` | \`stateSet\` | 编辑器已开文件 |\n`;
state += `\n> 规则：浏览器键只经 \`cxRead/cxWrite\`；跨端口必须恢复的状态走服务端 \`stateSet\`（DSH 每次重启换端口，localStorage 会按 origin 隔离）。\n`;

const write = (f, text) => {
  const abs = path.join(root, f);
  if (check) {
    const old = fs.existsSync(abs) ? fs.readFileSync(abs, 'utf8') : '';
    const strip = (s) => s.replace(/（\d{4}-\d\d-\d\d）/g, '');
    if (strip(old) !== strip(text)) { console.log(`FAIL  ${f} 与生成结果不一致：跑 node scripts/docs-index.mjs --write`); return false; }
    console.log(`PASS  ${f} 与生成结果一致`);
    return true;
  }
  fs.writeFileSync(abs, text);
  console.log(`wrote ${f} (${text.split('\n').length} lines)`);
  return true;
};
const ok1 = write('docs/CODE-INDEX.md', code);
const ok2 = write('docs/STATE.md', state);
if (check && !(ok1 && ok2)) process.exit(1);
