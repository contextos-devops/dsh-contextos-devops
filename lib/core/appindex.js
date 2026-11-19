// 应用路由（三级）：最近应用 = 工具索引 + 存储索引 → 应用商店 = 模板 → 软件工厂 = 生成。
//
// 为什么不用模型：旧链路每轮都让模型 resolveWrite（一次 llmJson），模型慢/挂起就整轮卡死，
// 而且同一句话两次可能落到不同应用。这里改成确定性打分：
//   ① 最近应用里按「应用标题 / 功能标签 / 同义词」挑应用与功能；
//   ② 没有 → 应用商店按模板标题/命令挑模板，建新实例；
//   ③ 还没有 → 交给软件工厂（客户端 askAppPlan → autogenApp）生成模板。
// 所有落点都返回可执行的 op + args，客户端只负责出表单/执行，不再做二次猜测。
import { http, encode, envelopeRows } from '../base/http.js';
import { listApps, storeApps } from './apps.js';
import { resolveActorUid } from './identity.js';

// 功能名 → 用户口语。命中即加分：说「安排」要落到 plan，说「开会」要落到 meeting。
const FN_SYN = {
  target: ['目标', 'okr', '目的', '方向', '季度'],
  plan: ['计划', '规划', '排期', '方案', '安排'],
  task: ['任务', '待办', '工作项', 'todo', '事项', '派活'],
  report: ['报告', '汇报', '日报', '周报', '总结', '进展'],
  feedback: ['反馈', '评价', '打分', '意见', '复盘', '改进'],
  flow: ['流程', '审批流', '工作流', '流转'],
  request: ['申请', '提交', '发起', '送审', '报批'],
  approval: ['审批', '审核', '批准', '同意'],
  supplier: ['供应商', '采购', '供货', '进货'],
  customer: ['客户', '拜访', '商机', '跟进'],
  meeting: ['会议', '开会', '议程', '纪要', '预约', '评审会', '研讨会', '发布会', '例会', '周会', '晨会'],
  ticket: ['工单', '报修', '故障', '派单', '维修'],
  order: ['订单', '下单', '发货', '收货'],
  contract: ['合同', '签约', '续签'],
  expense: ['报销', '费用', '发票', '差旅'],
  asset: ['资产', '设备', '盘点', '领用'],
  knowledge: ['知识', '文档', '词条', '百科'],
  member: ['成员', '人员', '员工', '组织'],
};

// 商店模板名 → 业务词。商店行的 command 是拼音（kehu/shenpi），中文原话永远匹配不上，
// 所以用一张业务词表把「审批/客户/工单…」映射到模板的命令与标题。
const STORE_SYN = {
  审批: ['shenpi', '审批', 'approval', 'approve'],
  客户: ['kehu', '客户', 'customer', 'crm'],
  项目: ['xiangmu', '项目', 'project'],
  会议: ['huiyi', '会议', 'meeting'],
  工单: ['gongdan', '工单', 'ticket'],
  报销: ['baoxiao', '报销', 'expense'],
  招聘: ['zhaopin', '招聘', 'recruit', 'hr'],
  知识: ['zhishi', '知识', 'knowledge', 'wiki'],
  合同: ['hetong', '合同', 'contract'],
  订单: ['dingdan', '订单', 'order'],
  库存: ['kucun', '库存', 'inventory', 'stock'],
  设备: ['shebei', '设备', 'device', 'asset'],
  日程: ['richeng', '日程', 'calendar', 'schedule'],
  任务: ['renwu', '任务', 'task', 'todo'],
  流程: ['liucheng', '流程', 'flow', 'workflow'],
  文档: ['wendang', '文档', 'doc', 'document'],
  培训: ['peixun', '培训', 'training'],
  考试: ['kaoshi', '考试', 'exam'],
  会员: ['huiyuan', '会员', 'member'],
  门店: ['mendian', '门店', 'store', 'shop'],
  采购: ['caigou', '采购', 'purchase'],
  物流: ['wuliu', '物流', 'logistics'],
};

// 软件工厂命名提示：没有模型时也能给出语义化模块名（非法时客户端会兜底 app+时间戳）。
const NAME_HINT = [
  ['客户', 'customer'], ['会议', 'meeting'], ['工单', 'ticket'], ['报销', 'expense'],
  ['审批', 'approval'], ['项目', 'project'], ['任务', 'task'], ['知识', 'knowledge'],
  ['招聘', 'recruit'], ['合同', 'contract'], ['订单', 'order'], ['库存', 'inventory'],
  ['设备', 'device'], ['资产', 'asset'], ['巡检', 'inspect'], ['日程', 'calendar'],
  ['档案', 'archive'], ['培训', 'training'], ['考试', 'exam'], ['会员', 'member'],
  ['门店', 'store'], ['采购', 'purchase'], ['物流', 'logistics'], ['课程', 'course'],
];

// 结构性功能名（应用/功能/数据/配置…）是平台入口，不是业务功能：
// 否则「做一个客户管理应用」会因为 place1 的标签是「应用」而误命中系统运维。
const FN_STOP = new Set([
  '应用', '功能', '系统', '平台', '工具', '管理', '数据', '内容', '信息', '配置', '文件', '日志',
  '门户', '首页', '入口', '详情', '列表', '节点', '连线', '输入', '输出', '服务', '机器', '集群',
  '迁移', '源码', '领域', '实体', '关系', '属性', '推理', '事件', '记录', '人员', '状态', '地址',
]);

const CREATE_RE = /(创建|新建|搭建|建一个|做一个|生成|来一个|帮我做|造一个|开发|上线)[^。！？]{0,16}(应用|系统|平台|工具|小程序|app|App|APP)/;
const READ_RE = /(查看|看看|看一下|列出|列表|有哪些|多少|统计|查询|展示|详情|打开|进入)/;
const INSTANCE_RE = /(实例|分身|复制一个|再建一个)/;

const CACHE_TTL = 60 * 1000;
const fnCache = new Map();

const norm = (s) => String(s || '').toLowerCase().replace(/[\s，。！？、；：,.!?;:()（）\[\]【】"'“”‘’]/g, '');

/** 最长公共子串：中文没有空格，这是「原话 vs 标题/标签」最稳的相似度。 */
export function commonRun(a, b) {
  const s = norm(a), t = norm(b);
  if (!s || !t) return 0;
  let best = 0;
  let prev = new Array(t.length + 1).fill(0);
  for (let i = 1; i <= s.length; i++) {
    const cur = new Array(t.length + 1).fill(0);
    for (let j = 1; j <= t.length; j++) {
      if (s[i - 1] === t[j - 1]) {
        cur[j] = prev[j - 1] + 1;
        if (cur[j] > best) best = cur[j];
      }
    }
    prev = cur;
  }
  return best;
}

/** 功能列表：order 0～400 才是可用业务功能（401+ 是配置/权限/广场等入口）。 */
export function usableFunctions(rows = []) {
  const out = [];
  const seen = new Set();
  for (const row of rows) {
    const order = Number(row.order);
    if (!(order > 0 && order <= 400)) continue;
    const command = String(row.index || '');
    const fn = command.split('.').pop() || '';
    if (!fn || fn === 'portal' || seen.has(fn)) continue;
    seen.add(fn);
    out.push({ name: fn, label: String(row.name || fn), order, command, portal: String(row.portal) === 'true' });
  }
  return out.sort((a, b) => a.order - b.order);
}

export async function appFunctions({ node, uid = '', space = '', command = '', placeUid = '' } = {}) {
  const portal = String(command || '').replace(/\.portal$/, '');
  const mod = portal.split('.').pop();
  if (!node || !space || !mod || !placeUid) return [];
  const key = `${node}|${space}|${mod}|${placeUid}`;
  const hit = fnCache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL) return hit.fns;
  const url = `/s/${encode(space)}/c/${encode(portal)}.portal/${encode(placeUid)}?user.uid=${encode(uid)}`;
  const r = await http(node, url, { timeout: 8000 });
  if (r.status !== 200) return [];
  const { rows } = envelopeRows(r.text);
  const fns = usableFunctions(rows);
  fnCache.set(key, { at: Date.now(), fns });
  return fns;
}

/** 在某个应用的功能表里挑最匹配的一个；返回空 fn 表示「这个应用不对口」。 */
export function pickFunction(text, fns = []) {
  const t = norm(text);
  let best = { fn: '', label: '', score: 0 };
  for (const f of fns) {
    if (!f || !f.name) continue;
    const label = String(f.label || f.name);
    if (FN_STOP.has(label)) continue;
    let score = Math.max(commonRun(t, label), commonRun(t, f.name));
    const syn = FN_SYN[f.name] || [];
    if (syn.some((w) => w.length >= 2 && t.includes(norm(w)))) score += 2;
    if (norm(label).length >= 2 && t.includes(norm(label))) score += 1;
    if (score > best.score) best = { fn: f.name, label, score };
  }
  return best.score >= 2 ? best : { fn: '', label: '', score: 0 };
}

/** 在最近应用里挑「应用 + 功能」；应用名命中优先于功能命中。 */
export function pickApp(text, apps = [], fnMap = {}) {
  const t = norm(text);
  let best = null;
  for (const app of apps) {
    if (!app || !app.command) continue;
    const fns = fnMap[app.command] || (app.functions || []).map((name) => ({ name, label: name }));
    const win = pickFunction(text, fns);
    const nameScore = Math.max(commonRun(t, app.title), commonRun(t, app.name), commonRun(t, app.space));
    const score = Math.max(nameScore, win.score ? win.score + 1 : 0);
    const cand = { app, fns, fn: win.fn, fnLabel: win.label, score, nameScore };
    if (!best || cand.score > best.score || (cand.score === best.score && cand.nameScore > best.nameScore)) best = cand;
  }
  return best;
}

/** 应用商店里挑模板：标题/命令/帮助 + 业务词表；挑不到就返回 null（绝不 list[0] 盲选）。 */
export function pickStore(text, list = []) {
  const t = norm(text);
  let best = null;
  for (const tpl of list) {
    const hay = norm(`${tpl.title || ''}${tpl.name || ''}${tpl.command || ''}${tpl.help || ''}${tpl.module || ''}`);
    if (!hay) continue;
    let score = Math.max(commonRun(t, tpl.title), commonRun(t, tpl.name));
    for (const [word, syns] of Object.entries(STORE_SYN)) {
      if (!t.includes(norm(word))) continue;
      if (syns.some((s) => hay.includes(norm(s)))) score += 4;
    }
    if (score <= 0) continue;
    if (!best || score > best.score) best = { tpl, score };
  }
  return best && best.score >= 4 ? best : null;
}

export function detectIntent(text) {
  const t = String(text || '');
  if (CREATE_RE.test(t) && INSTANCE_RE.test(t) === false) return 'create';
  if (CREATE_RE.test(t)) return 'instance';
  if (READ_RE.test(t)) return 'read';
  return 'write';
}

function hash36(s) {
  let h = 0;
  for (const ch of String(s || '')) h = (h * 31 + ch.codePointAt(0)) >>> 0;
  return h.toString(36).slice(-4).padStart(3, '0');
}

export function factoryName(text) {
  const t = String(text || '');
  for (const [word, name] of NAME_HINT) if (t.includes(word)) return name;
  return `app${hash36(t)}`;
}

export function factoryHelp(text) {
  const s = String(text || '').replace(/\s+/g, ' ').trim();
  return s.length <= 20 && !/[，。；、]/.test(s) ? s : s.slice(0, 18);
}

const WEEK_INDEX = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 日: 0, 天: 0 };
const CN_NUM = { 零: 0, 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };
const pad2 = (n) => String(n).padStart(2, '0');
const fmtMinute = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;

function cnNumber(s) {
  if (/^\d+$/.test(s)) return Number(s);
  if (s.includes('十')) {
    const [a, b] = s.split('十');
    return (a ? (CN_NUM[a] || 0) : 1) * 10 + (b ? (CN_NUM[b] || 0) : 0);
  }
  return CN_NUM[s] || 0;
}

const CLOCK_RE = /(凌晨|早上|早晨|上午|中午|下午|傍晚|晚上|夜里|晚间)?\s*(\d{1,2}|[一二三四五六七八九十]{1,3})\s*(?:[:：]\s*(\d{2})|点\s*(半|(\d{1,2})\s*分?)?)/;

function parseClock(s) {
  const m = String(s || '').match(CLOCK_RE);
  if (!m) return null;
  let hh = cnNumber(m[2]);
  const mm = m[3] !== undefined ? Number(m[3]) : (m[4] === '半' ? 30 : Number(m[5] || 0));
  const period = m[1] || '';
  if ((period === '下午' || period === '傍晚' || period === '晚上' || period === '夜里' || period === '晚间' || period === '中午') && hh < 12) hh += 12;
  else if (period === '凌晨' && hh === 12) hh = 0;
  // 没有时段词时，1~6 点按下午理解：说「三点半开会」不会真排到凌晨 3 点。
  else if (!period && hh >= 1 && hh <= 6) hh += 12;
  if (hh > 23 || mm > 59) return null;
  return { hh, mm, hit: m[0], period };
}

/**
 * 把「明天下午三点半 / 下周一 10:00 / 12月5日」解析成起止时间。
 * 纯函数（now 可注入），门禁可离线断言；解析不出返回 null，绝不猜时间。
 * 有日期没钟点 → 默认 09:00（会议/拜访语义），结束默认 +1 小时。
 */
export function parseWhen(text, now = new Date()) {
  const t = String(text || '');
  const base = new Date(now.getTime());
  const spans = [];
  let day = null;
  let m;
  if ((m = t.match(/(\d{4})\s*[-\/年]\s*(\d{1,2})\s*[-\/月]\s*(\d{1,2})\s*[日号]?/))) {
    day = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    spans.push(m[0]);
  } else if ((m = t.match(/(\d{1,2})\s*月\s*(\d{1,2})\s*[日号]?/))) {
    day = new Date(base.getFullYear(), Number(m[1]) - 1, Number(m[2]));
    if (day.getTime() + 86400000 < base.getTime()) day.setFullYear(day.getFullYear() + 1);
    spans.push(m[0]);
  } else if ((m = t.match(/(大后天|后天|明天|明日|今天|今日|昨天)/))) {
    const delta = { 大后天: 3, 后天: 2, 明天: 1, 明日: 1, 今天: 0, 今日: 0, 昨天: -1 }[m[1]];
    day = new Date(base.getFullYear(), base.getMonth(), base.getDate() + delta);
    spans.push(m[1]);
  } else if ((m = t.match(/(下|这|本)?\s*(?:周|星期|礼拜)\s*([一二三四五六日天])/))) {
    let delta = (WEEK_INDEX[m[2]] - base.getDay() + 7) % 7;
    if (m[1] === '下' && delta === 0) delta = 7;
    day = new Date(base.getFullYear(), base.getMonth(), base.getDate() + delta);
    spans.push(m[0]);
  }
  const clock = parseClock(t);
  if (!day && !clock) return null;
  const begin = day ? new Date(day.getTime()) : new Date(base.getTime());
  if (clock) {
    begin.setHours(clock.hh, clock.mm, 0, 0);
    spans.push(clock.hit);
    if (!day && begin.getTime() <= base.getTime()) begin.setDate(begin.getDate() + 1);
  } else begin.setHours(9, 0, 0, 0);
  // 显式区间「3点到5点」：第二个钟点只在有连接词时才算结束时间
  let end = new Date(begin.getTime() + 60 * 60 * 1000);
  if (clock) {
    const tail = t.slice(t.indexOf(clock.hit) + clock.hit.length);
    const range = tail.match(/^\s*(?:到|至|~|～|—|-)\s*(.+)$/);
    if (range) {
      const second = parseClock(range[1]);
      if (second) {
        const e = new Date(begin.getTime());
        e.setHours(second.hh, second.mm, 0, 0);
        if (e.getTime() > begin.getTime()) { end = e; spans.push(range[0]); }
      }
    }
  }
  return { begin, end, spans };
}

function stripRequest(t) {
  // 「明天见投资人，帮我创建一个会议安排」→「明天见投资人」
  return String(t || '').replace(/[，,；;]\s*(?:帮我|帮忙|请|麻烦)?\s*(?:创建|新建|安排|添加|记录|预约|建立|发起|做一个|搞一个|加一个)[\s\S]*$/, '').trim();
}

function titleOf(t, when) {
  const quoted = t.match(/[「"“']([^」"”']{2,40})[」"”']/);
  if (quoted) return quoted[1].trim();
  const named = t.match(/(?:标题|主题|名字|名称|名为|叫作|叫)\s*[:：]?\s*([^\s，。,.!?！？]{2,24})/);
  if (named) return named[1].trim();
  let s = stripRequest(t);
  for (const span of (when && when.spans) || []) if (span) s = s.split(span).join('');
  s = s.replace(/^(?:帮我|帮忙|请|麻烦)?\s*(?:创建|新建|安排|添加|记录|预约|建立|发起|做一个|搞一个)\s*(?:一个|个|一下)?\s*/, '');
  s = s.replace(/^在[^，。；,.!?！？]{1,16}?(?:开会|见面)[，,；;]?/, '');
  s = s.replace(/^[，,；;。\s]+|[，,；;。\s]+$/g, '').trim();
  // 长句取最后一段：「在会议室A开会，讨论Q4预算」的标题是「讨论Q4预算」
  if (s.length > 16 && /[，,；;]/.test(s)) s = s.split(/[，,；;]/).filter(Boolean).pop().trim();
  return (s || t).slice(0, 24);
}

/**
 * 从一句话里抽表单值：找到应用与功能之后先替用户填好，减少输入。
 * 只抽「说得出依据」的字段：标题、内容、起止时间、地点、链接、分值；没有就不填。
 */
export function extractValues(text, now = new Date()) {
  const t = String(text || '').trim();
  const v = {};
  if (!t) return v;
  const when = parseWhen(t, now);
  if (when) {
    v.begin_time = fmtMinute(when.begin);
    v.end_time = fmtMinute(when.end);
  }
  v.title = titleOf(t, when);
  const body = t.match(/(?:内容|备注|说明)\s*[:：]\s*(.+)$/);
  v.content = (body ? body[1] : stripRequest(t)).trim().slice(0, 200);
  const addr = t.match(/(?:地点|地址|位置)\s*[:：]?\s*([^，。；,.!?！？]{2,20})/)
    || t.match(/在\s*([^，。；,.!?！？]{2,16}?)\s*(?:开会|见面|举行|进行|开个会)/);
  if (addr) v.address = addr[1].trim();
  const link = t.match(/https?:\/\/[^\s，。；]+/);
  if (link) v.link = link[0];
  const score = t.match(/(\d+(?:\.\d+)?)\s*分/);
  if (score) v.score = score[1];
  return v;
}

const valuesOf = extractValues;

/**
 * 纯函数版路由：给定应用/功能表/商店，返回可直接执行的计划。
 * 独立出来是为了让门禁脚本能离线断言（不连节点、不调模型）。
 */
export function planRoute({ text = '', mode = 'write', apps = [], fnMap = {}, store = [], now = new Date() } = {}) {
  const t = String(text || '');
  const vals = extractValues(t, now);
  const intent = mode === 'read' ? 'read' : detectIntent(t);
  const picked = pickApp(t, apps, fnMap);
  // 阈值 4：同义词单命中（只出现「安排」没出现「计划/meeting」）不算命中，避免硬凑到不相干应用。
  // 「做一个 X 应用」只认应用名（标题/模块名），不能用功能标签凑分——"应用"两个字不是功能。
  const wanted = (intent === 'create' || intent === 'instance') ? (picked && picked.nameScore >= 4) : (picked && picked.score >= 4);
  const appHit = wanted ? picked : null;

  // ① 最近应用：直接给出「应用 + 功能 + 操作 + 参数」
  if (appHit) {
    const app = appHit.app;
    const wantCreate = intent === 'create' || intent === 'instance';
    const fn = wantCreate ? '' : (appHit.fn || (appHit.fns[0] && appHit.fns[0].name) || '');
    const command = fn ? `${String(app.command).replace(/\.portal$/, '')}.${fn}` : app.command;
    const pm = ['target', 'plan', 'task', 'report', 'feedback'].includes(fn);
    const op = (intent === 'create' || intent === 'instance') ? 'createInstance'
      : pm ? (intent === 'read' ? 'pmList' : 'pmCreate')
        : (intent === 'read' ? 'readData' : 'writeData');
    const args = { space: app.space, command, name: app.name, place: app.place || 'system', place_uid: app.place_uid || '' };
    if (op === 'pmCreate' || op === 'pmList') args.kind = fn;
    if (op === 'pmCreate') Object.assign(args, vals);
    return {
      tier: 'app', intent, op, fn: pm ? fn : fn, fnLabel: appHit.fnLabel || (appHit.fns.find((f) => f.name === fn) || {}).label || fn,
      command: op === 'createInstance' ? app.command : command,
      app: {
        name: app.name, title: app.title, command: app.command, space: app.space,
        place: app.place || '', place_uid: app.place_uid || '',
        fns: (appHit.fns || []).map((f) => ({ name: f.name, label: f.label || f.name })),
      },
      args, values: vals, score: appHit.score, store: null, factory: null,
      steps: [
        `① 最近应用（工具索引）：命中「${app.title || app.name}」，功能「${appHit.fnLabel || fn}」`,
        `② 组装参数：${command}`,
        `③ 执行操作：${op}`,
      ],
    };
  }

  // ② 应用商店：最近应用没有 → 找模板建新实例
  const storeHit = pickStore(t, store);
  if (storeHit) {
    const tpl = storeHit.tpl;
    const nm = vals.title || String(tpl.title || tpl.name || '').split(/\s+/)[0] || '我的应用';
    return {
      tier: 'store', intent, op: 'createStoreInstance', fn: '', fnLabel: '',
      command: tpl.command, app: null,
      store: { uid: tpl.uid || '', name: tpl.name || '', title: tpl.title || tpl.name || '', command: tpl.command || '', space: tpl.space || '', place: tpl.place || '', module: tpl.module || '' },
      factory: null, args: { name: nm, command: tpl.command, space: tpl.space }, values: { name: nm }, score: storeHit.score,
      steps: [
        '① 最近应用：没有匹配的应用/功能',
        `② 应用商店：命中模板「${tpl.title || tpl.name}」`,
        `③ 创建实例：${nm}`,
      ],
    };
  }

  // ③ 软件工厂：只有「明确要造应用」才生成；普通读写没有落点时返回 none，让用户说清楚，
  //    否则「加一条记录」这种话也会被当成需求去生成一个应用。
  if (intent === 'create' || intent === 'instance') {
    return {
      tier: 'factory', intent, op: 'createApp', fn: '', fnLabel: '',
      command: '', app: null, store: null,
      factory: { name: factoryName(t), help: factoryHelp(t) },
      args: { name: factoryName(t), help: factoryHelp(t) },
      values: {}, score: 0,
      steps: [
        '① 最近应用：没有匹配的应用/功能',
        '② 应用商店：没有匹配的模板',
        '③ 软件工厂：生成新应用模板',
      ],
    };
  }
  const candidates = (apps || []).map((app) => {
    const fns = fnMap[app.command] || (app.functions || []).map((name) => ({ name, label: name }));
    const win = pickFunction(t, fns);
    return { title: app.title || app.name, fnLabel: win.label || '', command: app.command, score: win.score };
  }).filter((x) => x.score > 0).sort((a, b) => b.score - a.score).slice(0, 3);
  return {
    tier: 'none', intent, op: '', fn: '', fnLabel: '', command: '', app: null, store: null, factory: null,
    args: {}, values: {}, score: 0, candidates,
    steps: [
      '① 最近应用：没有匹配的应用/功能',
      '② 应用商店：没有足够确定的模板（不盲选）',
      '③ 请补充要操作的应用或功能',
    ],
  };
}

/** IO 版：读最近应用 + 每个应用的功能表（order≤400），必要时读商店，再走纯函数路由。 */
export async function appRoute({ node, uid = '', text = '', mode = 'write', space = '', apps: given = null } = {}) {
  const apps = Array.isArray(given) && given.length ? given : await listApps({ node, space, avatarUid: uid });
  const who = uid || await resolveActorUid(node);
  const fnMap = {};
  if (apps.length) {
    await Promise.all(apps.slice(0, 12).map(async (app) => {
      try {
        fnMap[app.command] = await appFunctions({ node, uid: who, space: app.space, command: app.command, placeUid: app.place_uid });
      } catch {
        fnMap[app.command] = (app.functions || []).map((name, i) => ({ name, label: name, order: i + 1 }));
      }
      if (!fnMap[app.command] || !fnMap[app.command].length) {
        fnMap[app.command] = (app.functions || []).map((name, i) => ({ name, label: name, order: i + 1 }));
      }
    }));
  }
  let plan = planRoute({ text, mode, apps, fnMap });
  if (plan.tier !== 'app') {
    let store = [];
    try { store = await storeApps({ node }); } catch { store = []; }
    plan = planRoute({ text, mode, apps, fnMap, store });
  }
  return plan;
}
