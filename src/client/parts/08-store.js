// 08-store.js — 客户端持久化唯一出口。
// 约定：localStorage 只能在这里出现（scripts/store-check.mjs 棘轮门禁）；
// 新状态一律走 cxRead/cxWrite（JSON）或 cxReadText/cxWriteText（原样字符串），
// 键名先进 CX_STORE_SCHEMA，顺带成为 docs/STATE.md 与「控制台 → STATE」页的索引。
const CX_STORE_PREFIX = 'contextos-devops-dsh:';
const CX_STORE_SCHEMA = {
  theme: { kind: 'text', def: 'system', zh: '主题', note: 'system / dark / light' },
  lang: { kind: 'text', def: 'system', zh: '语言', note: 'system / zh / en' },
  view: { kind: 'text', def: 'chat', zh: '视图模式', note: 'chat / manage / dev' },
  'work-mode': { kind: 'text', def: 'avatar', zh: '工作模式', note: 'avatar / factory / iot' },
  chatfull: { kind: 'text', def: '1', zh: '对话全屏', note: '1 全屏 / 0 分栏' },
  actor: { kind: 'text', def: '', zh: '当前分身', note: 'user.uid' },
  nodes: { kind: 'json', def: [], zh: '节点缓存', note: '进入插件先渲染，↻ 才刷新' },
  sel: { kind: 'json', def: {}, zh: '本次选择', note: '节点/空间/应用启动引导' },
  'sel-map': { kind: 'json', def: {}, zh: '按节点记忆选择', note: '{ node: [space, app] }' },
  console: { kind: 'json', def: {}, zh: '控制台', note: 'open / tab / height / sort' },
  reqlog: { kind: 'json', def: [], zh: '请求记录', note: '最近 50 条，服务端另有 state.reqlog' },
  fx: { kind: 'json', def: { sound: 'soft', light: 'high', color: 'cyan', style: 'tech' }, zh: '特效', note: '声音/光效/配色/风格' },
  webtabs: { kind: 'json', def: null, zh: '网页页签', note: '{ tabs, active }' },
  panels: { kind: 'json', def: {}, zh: '面板宽度', note: '左右栏拖拽结果' },
  folds: { kind: 'json', def: {}, zh: '面板折叠', note: 'PM 卡片/控制台折叠' },
  'tree-folds': { kind: 'json', def: {}, zh: '编辑器折叠', note: '按项目记 WORKSPACE/GIT 分区' },
  ide: { kind: 'json', def: null, zh: '编辑器页签', note: '{ tabs, active }' },
  'ide-open': { kind: 'json', def: {}, zh: '编辑器已开文件', note: '按项目记文件树展开' },
  'ide-active': { kind: 'json', def: {}, zh: '编辑器当前文件', note: '按项目记 active' },
  'ide-panes': { kind: 'json', def: {}, zh: '编辑器分栏', note: '分栏与比例' },
  'preview-w': { kind: 'json', def: null, zh: '预览宽度', note: '网页预览分栏' },
  pm: { kind: 'json', def: {}, zh: '项目管理选择', note: 'target/plan/task 选中态' },
  cal: { kind: 'json', def: {}, zh: '日历', note: '周期/锚点日期' },
  map: { kind: 'json', def: {}, zh: '地图', note: '中心点/缩放' },
  init: { kind: 'json', def: {}, zh: '初始化向导', note: '上次填写与步骤' },
  'term-buf': { kind: 'json', def: {}, zh: '终端缓冲', note: '与服务端 state.termBuf 同步' },
  draft: { kind: 'json', def: {}, zh: '输入草稿', note: '按会话记未发送文本' },
  scroll: { kind: 'json', def: {}, zh: '滚动位置', note: '按视图记位置' },
  formstate: { kind: 'json', def: {}, zh: '表单状态', note: '按表单记未提交字段' },
  calls: { kind: 'json', def: [], zh: '调用记录', note: '工具调用摘要' },
  cfg: { kind: 'json', def: {}, zh: '配置草稿', note: '配置视图未保存项' },
  'filter-node': { kind: 'json', def: null, zh: '节点过滤', note: '状态筛选' },
  'filter-space': { kind: 'json', def: null, zh: '空间过滤', note: '状态筛选' },
  'filter-app': { kind: 'json', def: null, zh: '应用过滤', note: '按空间筛' },
  'filter-store': { kind: 'json', def: null, zh: '商店过滤', note: '按空间筛' },
  'monitor-panels': { kind: 'json', def: {}, zh: '监控面板', note: '面板开关/顺序' },
  session: { kind: 'json', def: null, zh: '会话', note: '{ v, 会话键: 消息 }' },
  chat: { kind: 'json', def: [], zh: '消息缓存', note: '旧版单键；现按 chat:<分身>:<计划> 分键' },
};

// 允许调用方传完整键（旧常量带前缀）或裸键，统一归一。
const cxKey = (key) => (String(key).startsWith(CX_STORE_PREFIX) ? String(key) : CX_STORE_PREFIX + String(key));

// 读 JSON 值；缺失/解析失败/显式 null 都回落到 def。第三个参数 truthy=true 时，解析出的假值也回落。
function cxRead(key, def, truthy = false) {
  try {
    const raw = localStorage.getItem(cxKey(key));
    if (raw == null) return def;
    const v = JSON.parse(raw);
    if (v == null || (truthy && !v)) return def;
    return v;
  } catch { return def; }
}
function cxWrite(key, val) {
  try { localStorage.setItem(cxKey(key), JSON.stringify(val)); } catch {}
}
function cxReadText(key, def) {
  try { const raw = localStorage.getItem(cxKey(key)); return raw == null ? def : raw; } catch { return def; }
}
function cxWriteText(key, val) {
  try { localStorage.setItem(cxKey(key), String(val == null ? '' : val)); } catch {}
}
function cxRemove(key) { try { localStorage.removeItem(cxKey(key)); } catch {} }
function cxStoreDef(key) { return (CX_STORE_SCHEMA[key] || { kind: 'json', def: null }).def; }
// 一个键 = 一个持久状态：读取用 schema 默认值，写入由 effect 自动落盘。
function cxPref(key) {
  const spec = CX_STORE_SCHEMA[key] || { kind: 'json', def: null };
  const [value, setValue] = useState(() => (spec.kind === 'text' ? cxReadText(key, spec.def) : cxRead(key, spec.def)));
  useEffect(() => { if (spec.kind === 'text') cxWriteText(key, value); else cxWrite(key, value); }, [value]);
  return [value, setValue];
}
// 控制台 STATE 页与文档索引共用：schema + 当前值 + 占用字符数。
function cxStoreDump() {
  return Object.keys(CX_STORE_SCHEMA).map((key) => {
    const spec = CX_STORE_SCHEMA[key];
    const raw = (() => { try { return localStorage.getItem(cxKey(key)); } catch { return null; } })();
    return { key, kind: spec.kind, zh: spec.zh, note: spec.note, size: raw == null ? 0 : raw.length, value: raw };
  });
}
