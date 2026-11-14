// 框架通用词表：字段名与操作名只用这些，不自定义。
// 来源：usr/icebergs/base/mdb/mdb.go、usr/icebergs/base/aaa/aaa.go、平台 model。
export const FIELDS = {
  uid: '记录主键', id: '自增编号', time: '时间', name: '名称', title: '标题', text: '文本',
  content: '内容', type: '类型', status: '状态', order: '排序', score: '分数', group: '分组',
  valid: '有效', enable: '启用', member: '成员', expire: '过期', icon: '图标', help: '说明',
  user_uid: '用户', place_uid: '实例', project_uid: '项目', target_uid: '目标', plan_uid: '计划',
  task_uid: '任务', report_uid: '报告', feedback_uid: '反馈', image: '图片', link: '链接',
  begin_time: '开始时间', end_time: '结束时间', process_time: '处理时间', finished_time: '完成时间',
};

export const ACTIONS = {
  create: '创建', insert: '插入', modify: '修改', update: '更新', remove: '删除', delete: '删除',
  select: '查询', list: '列表', detail: '详情', export: '导出', import: '导入', enable: '启用',
  disable: '停用', prunes: '清理',
};

// 中文 → 框架字段名
export const FIELD_ALIAS = {
  名称: 'name', 名字: 'name', 标题: 'title', 内容: 'content', 说明: 'text', 备注: 'text', 描述: 'text',
  类型: 'type', 状态: 'status', 顺序: 'order', 排序: 'order', 分数: 'score', 分组: 'group',
  用户: 'user_uid', 成员: 'member', 时间: 'time', 图片: 'image', 链接: 'link',
};

// 中文动作 → 框架动作名
export const ACTION_ALIAS = {
  创建: 'create', 新建: 'create', 新增: 'create', 添加: 'create',
  修改: 'modify', 编辑: 'modify', 更新: 'update',
  删除: 'remove', 移除: 'remove',
  查询: 'select', 查看: 'select', 列表: 'list', 详情: 'detail',
  导出: 'export', 导入: 'import', 启用: 'enable', 停用: 'disable',
};

export const ROLES = {
  root: '系统角色', tech: '技术人员', void: '普通', creator: '创建人', leader: '负责人',
  worker: '执行人', member: '成员', visitor: '访客', server: '服务',
};

export const STYLES = ['guiding', 'notice', 'danger', 'primary', 'success', 'warning'];

export function fieldOf(zh) {
  const k = String(zh || '').trim();
  return FIELD_ALIAS[k] || (FIELDS[k] ? k : '');
}

export function actionOf(zh) {
  const k = String(zh || '').trim();
  return ACTION_ALIAS[k] || (ACTIONS[k] ? k : '');
}

export function checkField(name) {
  const n = String(name || '').trim();
  if (FIELDS[n]) return { ok: true, name: n, help: FIELDS[n] };
  const alt = fieldOf(n);
  if (alt) return { ok: true, name: alt, help: FIELDS[alt], renamed: alt !== n };
  return { ok: false, name: n, suggest: Object.keys(FIELDS).join(', ') };
}

export function checkAction(name) {
  const n = String(name || '').trim().toLowerCase();
  if (ACTIONS[n]) return { ok: true, name: n, label: ACTIONS[n] };
  const alt = actionOf(n);
  if (alt) return { ok: true, name: alt, label: ACTIONS[alt], renamed: alt !== n };
  return { ok: false, name: n, suggest: Object.keys(ACTIONS).join(', ') };
}

// 生成声明标签：name / help / icon / role / style
export function declAttrs({ name = '', params = '', help = '', icon = '', role = '', style = '' } = {}) {
  const out = [];
  out.push(`name:"${[name, params].filter(Boolean).join(' ')}"`);
  if (help) out.push(`help:"${help}"`);
  if (icon) out.push(`icon:"${icon}"`);
  if (role) out.push(`role:"${role}"`);
  if (style) out.push(`style:"${style}"`);
  return out.join(' ');
}

// 参数声明文法（usr/icebergs/info.go SplitCmd）：
//   name*(:text|textarea|select|button|password)=value@action
//   - name 后跟 * 表示必填（need:must）
//   - :type 指定类型；select 的候选值用逗号分隔写进 =value
//   - @action 绑定按钮动作（create/modify/remove/img/date…）
//   - 后缀自动推导：_info/_content → textarea；_uid/_type/_status、type/status → select；
//     _image → text+img；_time → select+date
export const PARAM_TYPES = ['text', 'textarea', 'select', 'button', 'password', 'img', 'video', 'date'];

export function autoType(name) {
  const n = String(name || '');
  if (/_info$|_content$|^content$|^text$/.test(n)) return 'textarea';
  if (/_uid$|_type$|_status$|^type$|^status$/.test(n)) return 'select';
  if (/_image$|^image$/.test(n)) return 'img';
  if (/_time$/.test(n)) return 'date';
  return 'text';
}

export function paramOf({ name, type = '', required = false, value = '', action = '' } = {}) {
  const n = String(name || '').trim();
  if (!n) return '';
  const t = type || autoType(n);
  let s = n + (required ? '*' : '');
  if (t && t !== 'text') s += `:${t}`;
  if (value) s += `=${value}`;
  if (action) s += `@${action}`;
  return s;
}

export function paramSpec(list = []) {
  return list.map((x) => (typeof x === 'string' ? paramOf({ name: x, required: /^[a-z_]+$/.test(x) && x !== 'content' }) : paramOf(x))).join(' ');
}

// 模块常用函数（框架约定，顺序固定）
export const MODULE_FUNCS = [
  { name: 'Init', sig: 'func (s %s) Init(m *ice.Message, arg ...string) { s.Hash.Init(m, arg...) }', rank: 0, help: '启动时加载（注册数据、初始化缓存）' },
  { name: 'Exit', sig: 'func (s %s) Exit(m *ice.Message, arg ...string) { s.Hash.Exit(m, arg...) }', rank: 1, help: '停止时卸载（关闭句柄、落盘）' },
  { name: 'Inputs', sig: 'func (s %s) Inputs(m *ice.Message, arg ...string) { s.Hash.Inputs(m, arg...) }', rank: 2, help: '参数补全（前端联动取值）' },
  { name: 'Create', sig: 'func (s %s) Create(m *ice.Message, arg ...string) { s.ValueCreate(m, arg...) }', rank: 3, help: '新增' },
  { name: 'Modify', sig: 'func (s %s) Modify(m *ice.Message, arg ...string) { s.ValueModify(m, arg...) }', rank: 4, help: '修改' },
  { name: 'Remove', sig: 'func (s %s) Remove(m *ice.Message, arg ...string) { s.ValueRemove(m, arg...) }', rank: 5, help: '删除' },
  { name: 'List', sig: 'func (s %s) List(m *ice.Message, arg ...string) *ice.Message { s.Select(m, arg...); return m }', rank: 7, help: '列表' },
];

// 自定义动作落在 Remove 之后、List 之前
export function funcRank(name) {
  const hit = MODULE_FUNCS.find((f) => f.name === String(name));
  return hit ? hit.rank : 6;
}

export function moduleSkeleton(mod = 'note', cls = 'system') {
  const base = cls === 'platform' ? 'Table' : 'Hash';
  const body = MODULE_FUNCS.map((f) => f.sig.replace('%s', mod).replace(/s\.Hash\./g, `s.${base}.`)).join('\n');
  return `${body}\n`;
}

// 权限检查：接口声明 role 之外，函数内还可自查
// 系统角色：m.IsTech()（tech/root，等价 aaa.IsTechOrRoot(m)）
// 成员角色：s.IsCreator / s.IsLeader / s.IsWorker（model.USER_ROLE 0..3）
export const ROLE_LEVEL = { visitor: 0, creator: 1, leader: 2, worker: 3 };

export function guardOf(role) {
  const r = String(role || '').trim();
  if (!r) return '';
  if (r === 'root' || r === 'tech') return 'if m.WarnNotRight(!m.IsTech()) { return }';
  if (r === 'creator') return 'if m.WarnNotRight(!s.IsCreator(m)) { return }';
  if (r === 'leader') return 'if m.WarnNotRight(!s.IsLeader(m)) { return }';
  if (r === 'worker') return 'if m.WarnNotRight(!s.IsWorker(m)) { return }';
  if (r === 'member' || r === 'visitor') return 'if m.WarnNotRight(!s.IsWorker(m)) { return }';
  return '';
}

// 从中文里识别角色
export function roleOf(text = '') {
  const t = String(text);
  if (/(系统管理员|管理员|运维|技术)/.test(t)) return 'tech';
  if (/(负责人|主管|经理|领导)/.test(t)) return 'leader';
  if (/(创建人|发起人)/.test(t)) return 'creator';
  if (/(执行人|员工|经办人|操作员)/.test(t)) return 'worker';
  return '';
}
