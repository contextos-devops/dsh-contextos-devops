// 代码生成：把「加动作 / 加条件按键 / 加字段 / 新写功能」写成模板，按用户需求渲染并落盘。
// 规范真源见 docs/CODE-GEN.md；本文件只做参数替换与文件写入，不发明新写法。
import fs from 'node:fs/promises';
import { moduleSkeleton, guardOf } from './vocab.js';
import path from 'node:path';

const IDENT = /^[a-zA-Z][a-zA-Z0-9_]*$/;
const ZONE = /^[a-z][a-z0-9_]*$/;

// 条件表达式：eq/ne/gt/lt/nonempty/empty
const OPS = {
  eq: (a, b) => `${a} == "${b}"`,
  ne: (a, b) => `${a} != "${b}"`,
  gt: (a, b) => `${a} > "${b}"`,
  lt: (a, b) => `${a} < "${b}"`,
  nonempty: (a) => `${a} != ""`,
  empty: (a) => `${a} == ""`,
};

export function codegenCond({ scope, field = 'status', op = 'eq', value = '' } = {}) {
  const expr = scope === 'toolbar' ? `m.Option("${field}")` : `value["${field}"]`;
  return (OPS[op] || OPS.eq)(expr, value);
}

const decl = (v) => {
  const attrs = [`name:"${v.action} ${v.params || 'title*:text content:textarea'}"`];
  const help = v.help || v.label || v.Action;
  if (help) attrs.push(`help:"${help}"`);
  if (v.icon) attrs.push(`icon:"${v.icon}"`);
  if (v.role) attrs.push(`role:"${v.role}"`);
  if (v.style) attrs.push(`style:"${v.style}"`);
  return `\t${v.action}   string \`${attrs.join(' ')}\`\n`;
};
const actionFn = (v) => {
  // 系统级模块没有成员角色（没有 Table），成员级检查只能靠声明上的 role
  const memberRole = ['creator', 'leader', 'worker', 'member', 'visitor'].includes(String(v.role || ''));
  const guard = (v.class === 'system' && memberRole) ? '' : guardOf(v.role);
  return `
func (s ${v.module}) ${v.Action}(m *ice.Message, arg ...string) {
${guard ? '\t' + guard + '\n' : ''}\ts.Create(m, arg...)
\ts.List(m)
}
`;
};

const T = [
  {
    key: 'action',
    title: '给功能加一个动作',
    vars: ['zone', 'module', 'Action', 'action', 'params'],
    file: (v) => `${v.zone}/${v.module}.go`,
    body: decl,
    actionMethod: actionFn,
    note: '结构体加一行声明 + 一个方法；再在 List 里挂按钮',
  },
  {
    key: 'field',
    title: '给功能加一个字段',
    vars: ['zone', 'module', 'field', 'type'],
    file: (v) => `${v.zone}/${v.module}.go`,
    body: (v) => `\t${v.field} string \`name:"${v.field}" help:"${v.field}"\`\n`,
    note: '字段加进 field data 标签，同时加进 create/modify 的 name 标签',
  },
  {
    key: 'function',
    title: '新建一个功能（模块文件）',
    vars: ['zone', 'module'],
    file: (v) => `${v.zone}/${v.module}.go`,
    whole: (v) => `package ${v.zone}

import "shylinux.com/x/ice"

type ${v.module} struct {
\tice.Hash
\tshort  string \`data:"index,title"\`
\tfield  string \`data:"time,index,title,content,user_uid"\`
\tcreate string \`name:"create title* content* user_uid"\`
\tlist   string \`name:"list index auto"\`
}

func init() { ice.Cmd("web.${v.zone}.${v.module}", ${v.module}{}) }
`,
    note: '文件名 = 模块名；init 里注册命令 web.<zone>.<module>',
  },
  {
    key: 'module',
    title: '新建模块（含 Init/Exit/Inputs/Create/Modify/Remove/List）',
    vars: ['zone', 'module'],
    file: (v) => `${v.zone}/${v.module}.go`,
    whole: (v) => `package ${v.zone}

import "shylinux.com/x/ice"

type ${v.module} struct {
\tice.Hash
\tshort  string \`data:"index,title"\`
\tfield  string \`data:"time,index,title,content,user_uid"\`
\tcreate string \`name:"create title*:text content:textarea user_uid"\`
\tlist   string \`name:"list index auto"\`
}

func init() { ice.Cmd("web.${v.zone}.${v.module}", ${v.module}{}) }
${moduleSkeleton(v.module)}
`,
    note: '七个常用函数按 Init→Exit→Inputs→Create→Modify→Remove→List 排列；已有同名文件拒绝覆盖',
  },
  {
    key: 'buttons',
    title: '列表每行挂操作按钮',
    vars: ['module', 'Action', 'action'],
    file: null,
    method: (v) => `
func (s ${v.module}) List(m *ice.Message, arg ...string) *ice.Message {
\ts.Select(m, arg...)
\tm.Action(s.Create, s.${v.Action})
\tm.Table(func(value ice.Maps) {
\t\tm.PushButton(s.${v.Action}, s.Modify, s.Remove)
\t})
\treturn m
}
`,
    note: 'PushButton 只在浏览器 UA 下渲染；curl 拿到的是数据',
  },
  {
    key: 'toolbarButton',
    title: '工具栏加条件按键',
    vars: ['zone', 'module', 'Action', 'action', 'label', 'field', 'op', 'value', 'params'],
    file: (v) => `${v.zone}/${v.module}.go`,
    body: decl,
    actionMethod: actionFn,
    method: (v) => `
func (s ${v.module}) List(m *ice.Message, arg ...string) *ice.Message {
\ts.Select(m, arg...)
\tm.Action(s.Create)
\tif ${codegenCond({ ...v, scope: 'toolbar' })} {
\t\tm.Action(s.${v.Action})
\t}
\tm.Table(func(value ice.Maps) {
\t\tm.PushButton(s.Modify, s.Remove)
\t})
\treturn m
}
`,
    note: '条件成立才显示工具栏按键；条件读 m.Option',
  },
  {
    key: 'rowButton',
    title: '行内加条件按键',
    vars: ['zone', 'module', 'Action', 'action', 'label', 'field', 'op', 'value', 'params'],
    file: (v) => `${v.zone}/${v.module}.go`,
    body: decl,
    actionMethod: actionFn,
    method: (v) => `
func (s ${v.module}) List(m *ice.Message, arg ...string) *ice.Message {
\ts.Select(m, arg...)
\tm.Action(s.Create)
\tm.Table(func(value ice.Maps) {
\t\tif ${codegenCond({ ...v, scope: 'row' })} {
\t\t\tm.PushButton(s.${v.Action}, s.Modify, s.Remove)
\t\t} else {
\t\t\tm.PushButton(s.Modify, s.Remove)
\t\t}
\t})
\treturn m
}
`,
    note: '条件读每行的 value，成立才显示该按钮',
  },
];

export function codegenList() {
  return T.map((t) => ({ key: t.key, title: t.title, vars: t.vars, note: t.note }));
}

export function codegenRender({ template, vars = {} } = {}) {
  const t = T.find((x) => x.key === template);
  if (!t) throw new Error(`unknown template: ${template}`);
  const v = { ...vars };
  for (const k of t.vars) if (!v[k]) throw new Error(`missing var: ${k}`);
  for (const k of ['zone', 'module', 'Action', 'action']) if (v[k] && !IDENT.test(v[k])) throw new Error(`bad ${k}: ${v[k]}`);
  if (v.zone && !ZONE.test(v.zone)) throw new Error(`bad zone: ${v.zone}`);
  if (v.field && !IDENT.test(v.field)) throw new Error(`bad field: ${v.field}`);
  return {
    template: t.key,
    file: t.file ? t.file(v) : null,
    body: t.whole ? t.whole(v) : (t.body ? t.body(v) : ''),
    actionMethod: t.actionMethod ? t.actionMethod(v) : '',
    method: t.method ? t.method(v) : '',
    note: t.note,
  };
}

// 把声明插进结构体、把方法追加到文件末尾（不覆盖已有内容）
export function codegenMerge({ existing = '', decl = '', methods = '' } = {}) {
  let out = String(existing);
  const d = String(decl || '').trimEnd();
  if (d) {
    const head = (d.trim().match(/^(\w+)/) || [])[1] || '';
    const dup = head ? new RegExp('^\\s*' + head + '\\s+string\\s+\\x60[^\\x60]*\\x60[^\\n]*$', 'm') : null;
    if (d.trim() && out.includes(d.trim())) {
      // 已声明且完全一致，跳过
    } else if (dup && dup.test(out)) {
      out = dedupeDecl(out, head, d.trim());       // 同名声明：保留一行并补 role/help/style
    } else {
      const m = out.match(/^\s*(\w+)\s+string\s+`(?:name|data):"[^"]*"`\s*$/m);
      if (m) {
        const i = out.indexOf(m[0]) + m[0].length;
        out = out.slice(0, i) + '\n' + d + out.slice(i);
      } else {
        out = out.replace(/(type\s+\w+\s+struct\s*\{\n)/, `$1${d}\n`);
      }
    }
  }
  const mo = String(methods || '').trim();
  if (!mo) return out;
  for (const fn of splitFuncs(mo)) {
    if (out.includes(fn.text)) continue;
    if (new RegExp(`func \\(s \\w+\\) ${fn.name}\\(`).test(out)) {
      out = removeFunc(out, fn.name);              // 同名方法：删掉全部旧实现
    }
    out = insertFunc(out, fn.name, fn.text);
  }
  return out;
}

function removeFunc(src, name) {
  const re = new RegExp(`func \\(s \\w+\\) ${name}\\(`);
  let out = src;
  for (let guard = 0; guard < 20; guard++) {
    const m = out.match(re);
    if (!m) break;
    const start = m.index;
    const rest = out.slice(start + 1);
    const nx = rest.search(/\nfunc \(s \w+\) /);
    const end = nx >= 0 ? start + 1 + nx + 1 : out.length;
    out = out.slice(0, start) + out.slice(end);
  }
  return out.replace(/\n{3,}/g, '\n\n');
}

// 同名声明只留一行
function dedupeDecl(src, head, line) {
  const re = new RegExp('^\\s*' + head + '\\s+string\\s+\\x60[^\\x60]*\\x60[^\\n]*$', 'gm');
  const hits = src.match(re) || [];
  if (!hits.length) return src;
  let first = true;
  return src.replace(re, () => {
    if (first) { first = false; return line; }
    return '\u0000';
  }).replace(/\n\u0000/g, '').replace(/\u0000\n/g, '');
}

function splitFuncs(src) {
  const parts = [];
  const re = /func \(s \w+\) (\w+)\(/g;
  const idx = [];
  let m;
  while ((m = re.exec(src))) idx.push({ at: m.index, name: m[1] });
  idx.forEach((cur, i) => {
    const end = i + 1 < idx.length ? idx[i + 1].at : src.length;
    parts.push({ name: cur.name, text: src.slice(cur.at, end).trim() + '\n' });
  });
  return parts;
}

// 按 Init → Exit → Inputs → Create → Modify → Remove → 自定义 → List 插入
function insertFunc(src, name, text) {
  const re = /func \(s \w+\) (\w+)\(/g;
  const rank = funcRankOf(name);
  let m;
  while ((m = re.exec(src))) {
    if (funcRankOf(m[1]) > rank) {
      return src.slice(0, m.index) + text + '\n' + src.slice(m.index);
    }
  }
  return src.replace(/\s*$/, '\n') + text + '\n';
}

const ORDER = { Init: 0, Exit: 1, Inputs: 2, Create: 3, Modify: 4, Remove: 5, List: 7 };
function funcRankOf(name) {
  return Object.prototype.hasOwnProperty.call(ORDER, name) ? ORDER[name] : 6;
}

// 只允许写进 <space>/src/<zone>/<file>
export function codegenPath({ root, space, file }) {
  if (!/^[a-z][a-z0-9_]*\/[a-zA-Z][a-zA-Z0-9_]*\.go$/.test(file)) throw new Error(`bad file path: ${file}`);
  const base = path.join(root, 'usr', 'local', 'work', space, 'src');
  const target = path.join(base, file);
  if (!target.startsWith(base + path.sep)) throw new Error('path escapes src');
  return target;
}

export async function codegenWrite({ root, space, file, content }) {
  const target = codegenPath({ root, space, file });
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, content, 'utf8');
  const st = await fs.stat(target);
  return { file, bytes: st.size, target };
}

// ---- 模块分类与字段插入 ----
// 系统级：ice.Hash（内存库，field 指定字段，short 指定索引）
// 平台级：db.Table（SQLite/MySQL，fields 指定字段，model/model.go 定义模型）
export function detectClass(src = '') {
  if (/\bdb\.Table\b/.test(src)) return 'platform';
  if (/\bfields\s+string\s+`(?:data|fields):/.test(src)) return 'platform';
  if (/^\s*Table\s*$/m.test(src) && /\bmodel\./.test(src)) return 'platform';
  if (/\bice\.Hash\b/.test(src)) return 'system';
  return 'system';
}

function readDataTag(src, keys) {
  for (const k of keys) {
    const re = new RegExp(`\\b${k}\\s+string\\s+\`(?:data|fields):"([^"]*)"\``);
    const m = src.match(re);
    if (m) return { key: k, list: m[1].split(',').map((x) => x.trim()).filter(Boolean), raw: m[0] };
  }
  return null;
}

export function moduleInfo(src = '') {
  const cls = detectClass(src);
  const fieldKey = cls === 'platform' ? ['fields', 'field'] : ['field'];
  const f = readDataTag(src, fieldKey);
  const sh = readDataTag(src, ['short']);
  const acts = [...src.matchAll(/^\s*(\w+)\s+string\s+`name:"([^"]*)"/gm)].map((m) => ({ name: m[1], decl: m[2] }));
  return { class: cls, fields: f ? f.list : [], fieldKey: f ? f.key : fieldKey[0], short: sh ? sh.list : [], actions: acts };
}

// 按逻辑顺序插入：user_uid 之前，time 之后；没有锚点就追加
export function insertField(list, field) {
  const l = list.filter(Boolean);
  if (l.includes(field)) return l;
  const at = l.indexOf('user_uid');
  if (at >= 0) l.splice(at, 0, field);
  else l.push(field);
  return l;
}

export function renderFields(src, field, cls = detectClass(src)) {
  const keys = cls === 'platform' ? ['fields', 'field'] : ['field'];
  const hit = readDataTag(src, keys);
  if (!hit) throw new Error(`module has no ${keys[0]} tag`);
  const next = insertField(hit.list, field).join(',');
  const replaced = hit.raw.replace(/"([^"]*)"/, `"${next}"`);
  const at = src.indexOf(hit.raw);
  return src.slice(0, at) + replaced + src.slice(at + hit.raw.length);
}

// 平台级：model/model.go —— 常量 + 同名结构体字段（两处都要加）
export function renderModel(modelSrc, field, type = 'string', mod = '') {
  if (!modelSrc) return modelSrc;
  let out = modelSrc;
  const name = String(field).toUpperCase();
  if (!new RegExp(`\\b${name}\\s*=`).test(out)) {
    const m = out.match(/const\s*\(\n([\s\S]*?)\n\)/);
    if (m) {
      const lines = m[1].split('\n');
      lines.push(`\t${(name + ' '.repeat(Math.max(1, 18 - name.length))).trimEnd()} = "${field}"`);
      out = out.slice(0, m.index) + `const (\n${lines.join('\n')}\n)` + out.slice(m.index + m[0].length);
    }
  }
  if (mod) {
    const st = capitalize(mod);
    const re = new RegExp(`(type\\s+${st}\\s+struct\\s*\\{)([\\s\\S]*?)(\\n\\})`);
    const m2 = out.match(re);
    if (m2) {
      const body = m2[2];
      if (!new RegExp(`\\n\\s*${capitalize(field)}\\s`).test(body)) {
        const lines = body.split('\n');
        lines.push(`\t${capitalize(field)} ${type === 'string' ? 'string' : type}`);
        out = out.slice(0, m2.index) + m2[1] + lines.join('\n') + m2[3] + out.slice(m2.index + m2[0].length);
      }
    }
  }
  return out;
}

function capitalize(s) { return String(s || '').replace(/^./, (c) => c.toUpperCase()); }


// model.go 的常量字段
export function modelFields(modelSrc = '') {
  const m = modelSrc.match(/const\s*\(\n([\s\S]*?)\n\)/);
  if (!m) return [];
  return m[1].split('\n').map((l) => {
    const x = l.match(/^\s*(\w+)\s*=\s*"([^"]+)"/);
    return x ? x[2] : '';
  }).filter(Boolean);
}

// model.go 里同名结构体的字段（导出名 → 列名）
export function modelStructFields(modelSrc = '', mod = '') {
  const st = String(mod || '').replace(/^./, (c) => c.toUpperCase());
  const m = modelSrc.match(new RegExp('type\\s+' + st + '\\s+struct\\s*\\{([\\s\\S]*?)\\n\\}'));
  if (!m) return [];
  return m[1].split('\n').map((l) => {
    const x = l.match(/^\s*(\w+)\s+[\w.\[\]]+/);
    return x ? x[1] : '';
  }).filter(Boolean);
}
