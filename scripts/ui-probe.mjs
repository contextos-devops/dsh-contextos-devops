#!/usr/bin/env node
// 布局取证门禁（离线）：用真实 assets/client.css 在无头浏览器里渲染 fixture，
// 量出盒子与计算样式，对「布局不变量」断言。这是把「先量后改」从手工动作变成一条命令。
//
// 用法:
//   node scripts/ui-probe.mjs                  # 跑全部用例
//   node scripts/ui-probe.mjs --case msg-card  # 只跑一个
//   node scripts/ui-probe.mjs --png /tmp/out   # 顺手存截图给人工看
//   node scripts/ui-probe.mjs --css /dev/null  # 自测：故意换错样式表，应当 FAIL
//   node scripts/ui-probe.mjs --verbose        # 打印量到的每个盒子
//
// 退出码: 0 全过 / 1 断言失败 / 2 没有可用浏览器（跳过，不算完成）
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const arg = (name, def) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? def : args[i + 1] ?? true;
};
const only = arg('case', '');
const soft = args.includes('--soft'); // 构建链里用：没有浏览器时降级为 SKIP，不算失败（但会打印提示）
const pngDir = arg('png', '');
const cssPath = path.resolve(root, arg('css', 'assets/client.css'));
const verbose = args.includes('--verbose');

const BROWSERS = [
  process.env.EDGE_BIN,
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].filter(Boolean);
const browser = BROWSERS.find((p) => fs.existsSync(p));
if (!browser) {
  console.log('[ui-probe] SKIP 找不到 Edge/Chrome，无法做离线渲染取证（不算通过，请装浏览器或设 EDGE_BIN）');
  process.exit(soft ? 0 : 2);
}
if (!fs.existsSync(cssPath)) {
  console.error(`[ui-probe] FAIL 样式表不存在: ${cssPath}`);
  process.exit(1);
}

// ── 布局不变量：每条都对应一个真实回归 ───────────────────────────────
// 断言函数拿到 measurements: { '.sel': {x,y,w,h,right,display,flexDirection,marginLeft,opacity,fontSize,lineHeight} }
const CASES = [
  {
    name: 'msg-card',
    fixture: 'scripts/fixtures/msg-card.html',
    window: '920,420',
    sels: ['.cx-msg.ai', '.cx-msg.ai .cx-msg-main', '.cx-msg.ai .cx-msg-meta', '.cx-msg.ai .cx-msg-tools', '.cx-msg.ai .cx-msg-body'],
    assert: (m) => {
      const card = m['.cx-msg.ai'];
      const main = m['.cx-msg.ai .cx-msg-main'];
      const meta = m['.cx-msg.ai .cx-msg-meta'];
      const tools = m['.cx-msg.ai .cx-msg-tools'];
      const body = m['.cx-msg.ai .cx-msg-body'];
      const gap = Math.abs(tools.right - meta.right);
      return [
        [!!main && main.display === 'flex', '正文容器是 flex'],
        [!!main && main.flexDirection === 'column', '状态行与正文竖排（不是两栏）'],
        [gap <= 2, '工具条贴在状态行右端', `间隙 ${gap.toFixed(1)}px`],
        [!!body && !!card && body.w / card.w >= 0.85, '正文占卡片宽度 ≥85%', `${((body?.w || 0) / (card?.w || 1) * 100).toFixed(0)}%`],
        [!!tools && tools.fontSize === meta.fontSize, '工具条字号继承状态行', `${tools?.fontSize} vs ${meta?.fontSize}`],
        [!!tools && tools.lineHeight === meta.lineHeight, '工具条行高继承状态行', `${tools?.lineHeight} vs ${meta?.lineHeight}`],
      ];
    },
  },
  {
    name: 'pm-folded',
    fixture: 'scripts/fixtures/pm-folded.html',
    window: '720,700',
    sels: ['#gantt', '#map', '#gantt-open'],
    assert: (m) => {
      const g = m['#gantt'];
      const mp = m['#map'];
      const go = m['#gantt-open'];
      return [
        [!!g && g.h <= 60, '折叠后进度卡片收缩到标题条', `高 ${g?.h}px`],
        [!!mp && mp.h <= 60, '折叠后地图卡片收缩到标题条', `高 ${mp?.h}px`],
        [!!go && go.h >= 200, '展开态仍是 218px 等高（规则没被折叠例外连坐）', `高 ${go?.h}px`],
      ];
    },
  },
  {
    name: 'modal-scope',
    fixture: 'scripts/fixtures/modal-scope.html',
    window: '1200,600',
    sels: ['#shell', '#host-side', '.cx-modal', '.cx-modal .cx-card'],
    assert: (m) => {
      const shell = m['#shell'], side = m['#host-side'], modal = m['.cx-modal'], card = m['.cx-modal .cx-card'];
      const dx = Math.abs((modal?.x || 0) - (shell?.x || 0));
      const dw = Math.abs((modal?.w || 0) - (shell?.w || 0));
      return [
        [!!modal && modal.position === 'absolute', '遮罩绝对定位（不再 fixed 盖住宿主）', modal?.position],
        [dx <= 1, '遮罩左边界与插件区域对齐（不压住宿主侧边栏）', `差 ${dx.toFixed(1)}px`],
        [dw <= 1, '遮罩宽度等于插件区域宽度', `${(modal?.w || 0).toFixed(0)}px vs ${(shell?.w || 0).toFixed(0)}px`],
        [!!side && !!modal && (modal.x || 0) >= (side.right || 0) - 1, '宿主侧边栏未被遮罩覆盖', `遮罩左 ${(modal?.x || 0).toFixed(0)}px ≥ 侧栏右 ${side?.right || 0}px`],
        [!!card && card.w <= (shell?.w || 0), '弹窗卡片不超出插件区域', `${(card?.w || 0).toFixed(0)}px`],
      ];
    },
  },
  {
    name: 'seg',
    fixture: 'scripts/fixtures/seg.html',
    window: '420,120',
    sels: ['#segTheme', '#segTheme .cx-seg-btn', '#segLang', '#segLang .cx-seg-txt'],
    assert: (m) => {
      const seg = m['#segTheme'], btn = m['#segTheme .cx-seg-btn'], lang = m['#segLang'], txt = m['#segLang .cx-seg-txt'];
      return [
        [!!btn && btn.h >= 24, '分段按钮有可点高度', `${btn?.h}px`],
        [!!seg && !!btn && btn.h <= seg.h + 1, '按钮不越出分段容器（不被裁切）', `${btn?.h} ≤ ${seg?.h}`],
        [!!txt && txt.h >= 9 && txt.h <= 14, '文字档位不裁切', `${txt?.h}px`],
        [!!lang && lang.h <= 30, '语言分段高度与控件一致', `${lang?.h}px`],
      ];
    },
  },
  {
    name: 'pm-card-actions',
    fixture: 'scripts/fixtures/pm-card-actions.html',
    window: '340,200',
    sels: ['#card', '#acts', '#acts .cx-pm-act', '#more'],
    assert: (m) => {
      const card = m['#card'], acts = m['#acts'], btn = m['#acts .cx-pm-act'], more = m['#more'];
      return [
        [!!btn && !!card && btn.x - card.x <= 16, '卡片按钮靠左（不贴右）', `按钮左 ${btn?.x} / 卡片左 ${card?.x}`],
        [!!more && !!acts && more.x >= acts.x - 1, '⋯ 图标始终存在且在按钮区', `${more?.x}`],
        [!!more && !!btn && more.x >= btn.x, '⋯ 排在按钮之后', `${more?.x} ≥ ${btn?.x}`],
      ];
    },
  },
  {
    name: 'pm-sticky',
    fixture: 'scripts/fixtures/pm-sticky.html',
    window: '360,420',
    sels: ['.cx-pm-sticky', '.cx-pm-pin', '.cx-pm-pin .cx-pm-pin-t', '.cx-pm-scroll'],
    assert: (m) => {
      const stack = m['.cx-pm-sticky'], side = m['.cx-pm-scroll'], pin = m['.cx-pm-pin'];
      return [
        [!!stack && Math.abs(stack.y - side.y) <= 12, '滚动后上下文栈仍贴在滚动区顶端', `stack ${stack?.y} / scroll ${side?.y}`],
        [!!pin && !!stack && pin.y >= stack.y - 1 && pin.y <= stack.y + stack.h, '第一行在栈内（不越界）', `${pin?.y}`],
        [!!stack && stack.h >= 36, '两层各一行、不塌缩', `${stack?.h}px`],
        [!!m['.cx-pm-pin .cx-pm-pin-t'], '当前项标题可读（有省略号容器）', m['.cx-pm-pin .cx-pm-pin-t']?.w + 'px'],
      ];
    },
  },
  {
    name: 'status-tones',
    fixture: 'scripts/fixtures/status-tones.html',
    window: '560,200',
    sels: ['#t-idle', '#t-review', '#t-ready', '#t-active', '#t-done', '#t-halted', '#t-failed', '#t-type'],
    assert: (m) => {
      // 浏览器可能回 rgb() 也可能回 color(srgb r g b)（color-mix 的结果），两种都解析成 0-255。
      const parse = (sel) => {
        const raw = String(m[sel]?.color || '');
        const nums = (raw.match(/-?[\d.]+/g) || []).map(Number);
        if (raw.startsWith('color(')) return nums.slice(0, 3).map((x) => Math.round(x * 255));
        return nums.slice(0, 3);
      };
      const sat = ([a, b, c]) => Math.max(a, b, c) - Math.min(a, b, c);
      const lum = ([a, b, c]) => 0.2126 * a + 0.7152 * b + 0.0722 * c;
      const C = {};
      for (const id of ['idle', 'review', 'ready', 'active', 'done', 'halted', 'failed']) C[id] = parse('#t-' + id);
      const uniq = new Set(Object.values(C).map((x) => x.join(',')));
      const [ir, ig, ib] = C.idle, [er, eg, eb] = C.review, [rr, rg, rb] = C.ready;
      const [ar, ag, ab] = C.active, [hr, hg, hb] = C.halted, [fr, fg, fb] = C.failed;
      return [
        [uniq.size === 7, '七个状态档颜色互不相同', `${uniq.size} 种`],
        [ag > ar && ag > ab, '进行中是绿色（活着）', m['#t-active'].color],
        [sat(C.done) <= 40 && lum(C.done) > 100, '已完成是安静的灰（已落定）', m['#t-done'].color],
        [fr > fg && fr > fb, '已驳回是亮红（失败）', m['#t-failed'].color],
        [hr > hg && hr > hb && sat(C.halted) < sat(C.failed), '已取消是暗红（终止，弱于驳回）', m['#t-halted'].color],
        [er > eb && eg > eb, '待审批是琥珀（等你处理）', m['#t-review'].color],
        [rb >= rr, '待开始偏蓝（已就绪）', m['#t-ready'].color],
        [sat(C.idle) <= 56, '待提交是中性（不需要注意）', m['#t-idle'].color],
        [sat(parse('#t-type')) <= 64, '类型标签安静，不与状态抢注意力', m['#t-type'].color],
      ];
    },
  },
  {
    name: 'filter-count',
    fixture: 'scripts/fixtures/filter-count.html',
    window: '420,300',
    sels: ['.cx-filter-item', '.cx-filter-item .cx-filter-text', '.cx-filter-item .cx-filter-n'],
    assert: (m) => {
      const item = m['.cx-filter-item'], text = m['.cx-filter-item .cx-filter-text'], n = m['.cx-filter-item .cx-filter-n'];
      return [
        [!!n && n.w >= 16, '筛选项里有计数徽标', `宽 ${n?.w}px`],
        [!!n && !!text && n.x >= text.right - 1, '计数在文字右侧（不挤在文字里）', `文字右 ${text?.right} / 计数左 ${n?.x}`],
        [!!n && !!item && n.right <= item.right - 2, '计数不越出下拉项', `${n?.right} ≤ ${item?.right}`],
      ];
    },
  },
  {
    name: 'form-controls',
    fixture: 'scripts/fixtures/form-controls.html',
    window: '760,420',
    sels: ['#ta', '#sel', '#inp'],
    assert: (m) => {
      const ta = m['#ta'], sel = m['#sel'], inp = m['#inp'];
      const lh = parseFloat(ta?.lineHeight || '0');
      return [
        [!!ta && ta.h >= lh * 3, '多行输入至少三行高', `${ta?.h}px ≥ ${(lh * 3).toFixed(1)}px`],
        [!!ta && ta.sh <= ta.ch + 2, '多行输入内容不被裁切', `scroll ${ta?.sh} / client ${ta?.ch}`],
        [!!sel && sel.sh <= sel.ch + 2, '下拉文字完整显示（不再被切一半）', `scroll ${sel?.sh} / client ${sel?.ch}`],
        [!!sel && sel.paddingTop === '0px', '下拉垂直内边距为 0（固定高度靠居中）', sel?.paddingTop],
        [!!inp && inp.h <= (ta?.h || 0), '单行输入仍是一行高', `${inp?.h}px`],
      ];
    },
  },
  {
    name: 'anim',
    fixture: 'scripts/fixtures/anim.html',
    window: '520,320',
    sels: ['.cx-modal', '.cx-cascade', '.cx-toast', '.cx-anim-pop'],
    assert: (m) => {
      const modal = m['.cx-modal'], casc = m['.cx-cascade'], toast = m['.cx-toast'], pop = m['.cx-anim-pop'];
      return [
        [!!modal && modal.animationName === 'cx-fade', '弹窗遮罩淡入', modal?.animationName],
        [!!modal && modal.animationDuration === '0.12s', '弹窗时长走 --cx-dur-fast', modal?.animationDuration],
        [!!casc && casc.animationName === 'cx-rise', '多级列表上浮', casc?.animationName],
        [!!toast && toast.animationName === 'cx-fade', 'Toast 淡入（已收敛到 motion.css）', toast?.animationName],
        [!!pop && pop.animationName === 'cx-pop', '动效工具类可用', pop?.animationName],
      ];
    },
  },
];

const MEASURE = `<script>
window.__PROBE_SELS__ = __SELS__;
(function () {
  function measure() {
    var out = {};
    (window.__PROBE_SELS__ || []).forEach(function (sel) {
      var n = document.querySelector(sel);
      if (!n) { out[sel] = null; return; }
      var r = n.getBoundingClientRect();
      var c = getComputedStyle(n);
      var off = n.offsetParent ? n.offsetParent.getBoundingClientRect() : null;
      out[sel] = {
        x: +r.x.toFixed(1), y: +r.y.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1), right: +r.right.toFixed(1),
        display: c.display, flexDirection: c.flexDirection, marginLeft: c.marginLeft, opacity: c.opacity,
        fontSize: c.fontSize, lineHeight: c.lineHeight, position: c.position,
        left: +(off ? r.left - off.left : r.left).toFixed(1),
        animationName: c.animationName, animationDuration: c.animationDuration,
        sh: n.scrollHeight, ch: n.clientHeight, paddingTop: c.paddingTop,
        color: c.color, bg: c.backgroundColor
      };
    });
    document.title = 'PROBE:' + JSON.stringify(out);
  }
  window.addEventListener('load', function () { setTimeout(measure, 200); });
})();
</script>`;

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cx-probe-'));
let failed = 0;

for (const c of CASES) {
  if (only && c.name !== only) continue;
  const fixture = path.join(root, c.fixture);
  if (!fs.existsSync(fixture)) {
    console.error(`[ui-probe] FAIL 缺 fixture: ${c.fixture}`);
    failed += 1;
    continue;
  }
  const html = fs.readFileSync(fixture, 'utf8')
    .replace('{{CSS}}', `file://${cssPath}`)
    .replace('</body>', MEASURE.replace('__SELS__', JSON.stringify(c.sels)) + '\n</body>');
  const file = path.join(tmp, `${c.name}.html`);
  fs.writeFileSync(file, html);

  const profile = path.join(tmp, `profile-${c.name}`);
  const common = ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    `--user-data-dir=${profile}`, '--virtual-time-budget=1500', `--window-size=${c.window}`];
  let dom = '';
  try {
    dom = execFileSync(browser, [...common, '--dump-dom', `file://${file}`], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  } catch (e) {
    dom = String(e.stdout || '');
  }
  if (pngDir) {
    fs.mkdirSync(pngDir, { recursive: true });
    try {
      execFileSync(browser, [...common, `--screenshot=${path.join(pngDir, c.name + '.png')}`, `file://${file}`], { stdio: 'ignore' });
    } catch {}
  }

  const hit = dom.match(/<title>PROBE:(.*?)<\/title>/s);
  if (!hit) {
    console.error(`[ui-probe] FAIL ${c.name} 页面没有回报测量值（fixture 脚本没跑起来？）`);
    failed += 1;
    continue;
  }
  let measured;
  try { measured = JSON.parse(hit[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&')); } catch (e) {
    console.error(`[ui-probe] FAIL ${c.name} 测量值解析失败: ${e.message}`);
    failed += 1;
    continue;
  }

  const results = c.assert(measured);
  const bad = results.filter(([ok]) => !ok);
  console.log(`[ui-probe] ${c.name}: ${results.length - bad.length}/${results.length} 通过`);
  for (const [ok, label, detail] of results) {
    console.log(`  ${ok ? 'OK  ' : 'FAIL'} ${label}${detail ? ' · ' + detail : ''}`);
  }
  if (verbose) {
    for (const sel of c.sels) console.log(`  · ${sel} ${JSON.stringify(measured[sel])}`);
  }
  failed += bad.length;
}

fs.rmSync(tmp, { recursive: true, force: true });
if (failed) {
  console.error(`[ui-probe] FAIL ${failed} 条布局不变量不成立`);
  process.exit(1);
}
console.log('[ui-probe] PASS 布局不变量全部成立');
