#!/usr/bin/env node
// 可用性门禁：必须真的把插件打开、渲染出来、量到数、截到图，才算通过。
// 用法：npm run verify:ui      （依赖已在 9223 端口打开的 Edge）
// 退出码：0 通过 / 1 不通过 / 2 无法验证（没有浏览器）
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DEBUG_PORT = Number(process.env.EDGE_DEBUG_PORT || 9223);
const OUT_PNG = process.env.UI_VERIFY_PNG || '/tmp/ui-verify.png';
const BASE = path.join(root, 'scripts', 'ui-baseline.json');

const fail = [];
const warn = [];
const info = [];
const ok = (cond, msg, detail = '') => { if (cond) info.push(`  OK   ${msg}${detail ? ' · ' + detail : ''}`); else fail.push(`${msg}${detail ? ' · ' + detail : ''}`); };

async function targets() {
  const res = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/list`, { signal: AbortSignal.timeout(2500) });
  return res.json();
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let list;
try { list = await targets(); } catch {
  console.error(`[ui-verify] 无法连接 Edge 调试端口 ${DEBUG_PORT}。先打开浏览器再验证：`);
  console.error(`  "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge" --user-data-dir=/tmp/edge-ui --remote-debugging-port=${DEBUG_PORT} about:blank`);
  process.exit(2);
}
const pages = list.filter((t) => t.type === 'page' && /^http:\/\/127\.0\.0\.1/.test(t.url));
const page = pages[pages.length - 1] || list.find((t) => t.type === 'page');
if (!page) { console.error('[ui-verify] Edge 里没有可用页面'); process.exit(2); }

// 复用之前注入过的鉴权 cookie（/tmp/cookieUI.txt: port/name/value）
let cookie = null;
try {
  const parts = fs.readFileSync('/tmp/cookieUI.txt', 'utf8').trim().split('\n');
  if (parts.length >= 3) cookie = { port: parts[0], name: parts[1], value: parts[2] };
} catch {}
const origin = cookie ? `http://127.0.0.1:${cookie.port}` : (() => { try { return new URL(page.url).origin; } catch { return ''; } })();
const ws = new WebSocket(page.webSocketDebuggerUrl);
let id = 0; const pending = new Map(); const consoleErrors = [];
const send = (m, p = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') consoleErrors.push(String(m.params.args?.[0]?.value || '').slice(0, 160));
  if (m.method === 'Runtime.exceptionThrown') consoleErrors.push(String(m.params.exceptionDetails?.text || '').slice(0, 160));
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id); }
};
await new Promise((r) => (ws.onopen = r));
const ev = async (x) => (await send('Runtime.evaluate', { expression: x, returnByValue: true, awaitPromise: true })).result?.value;
await send('Page.enable'); await send('Runtime.enable'); await send('Log.enable');
await send('Network.enable');
if (cookie) { try { await send('Network.setCookie', { name: cookie.name, value: cookie.value, domain: '127.0.0.1', path: '/' }); } catch {} }

// 打开/刷新 -> 进入插件
await send('Page.navigate', { url: origin + '/' });
await sleep(6500);
// 先开一个会话，否则点插件项不会挂载
await ev("(() => { const b = [...document.querySelectorAll('*')].find(e => (e.innerText||'').trim() === 'New Session' && e.offsetParent); if (b) (b.closest('button,a,[role=button]') || b).click(); })()");
await sleep(2500);
let entered = false;
for (let i = 0; i < 20 && !entered; i++) {
  await ev("(() => { const all = [...document.querySelectorAll('*')].filter(e => /^ContextOS\\s+DevOps$/.test((e.innerText||'').trim())); const el = all[all.length - 1]; if (el) (el.closest('button,a,[role=button],li') || el).click(); })()");
  await sleep(1500);
  entered = !!(await ev("!!document.querySelector('.cx-shell')"));
  if (process.env.DEBUG_ENTER) console.log('[enter]', i, entered, (await ev('location.href')).slice(0, 40), String(await ev("(document.body.innerText||'').slice(0,40).replace(/\\n/g,' ')")).slice(0, 40));
}
ok(entered, '插件页已打开（.cx-shell 存在）');
if (!entered) { console.log(fail.map((f) => '  FAIL ' + f).join('\n')); ws.close(); process.exit(1); }
await ev("(() => { const b = [...document.querySelectorAll('button')].find(x => /关闭|Close/.test((x.innerText||'').trim()) && x.offsetParent); if (b) b.click(); })()");
await sleep(800);

// 结构必须齐
for (const [sel, name] of [
  ['.cx-header', '顶栏'], ['.cx-pipe', '流程条'], ['.cx-compose', '输入框'],
  ['.cx-pm-side.right', '右栏'], ['.cx-view', '模式切换'],
]) ok(await ev(`!!document.querySelector('${sel}')`), `${name} 存在`);

// 不能是报错页
const errText = await ev("(() => { const el = document.querySelector('.cx-error-pane'); return el ? (el.innerText||'').slice(0,120) : ''; })()");
ok(!errText, '没有错误面板', errText || '');

// 关键尺寸
const m = await ev(`(() => {
  const g = (sel, prop) => { const el = document.querySelector(sel); return el ? getComputedStyle(el)[prop] : ''; };
  const h = (sel) => { const el = document.querySelector(sel); return el ? Math.round(el.getBoundingClientRect().height) : 0; };
  return JSON.stringify({
    headerPad: parseFloat(g('.cx-header','paddingLeft')) || 0,
    viewH: h('.cx-view'), chipH: h('.cx-pipe .cx-stage'),
    pmH: h('.cx-pm-h'),
    titleFs: parseFloat(g('.cx-entity-name','fontSize')) || 0,
    bodyFs: parseFloat(g('.cx-pm-content','fontSize')) || 0,
    ctrlFs: parseFloat(g('.cx-btn','fontSize')) || 0,
    iconW: Math.round(document.querySelector('.cx-btn svg')?.getBoundingClientRect().width || 0),
  });
})()`);
const mm = JSON.parse(m || '{}');
info.push('  metrics ' + JSON.stringify(mm));
ok(mm.headerPad === 20, '顶栏左右内边距 = 20px', `实际 ${mm.headerPad}`);
ok(mm.viewH === 28, '控件高度 = 28px', `实际 ${mm.viewH}`);
ok(mm.chipH === 28, '流程 chip 高度 = 28px', `实际 ${mm.chipH}`);
ok([10, 12, 14].includes(mm.ctrlFs), '控件字号 ∈ {10,12,14}', `实际 ${mm.ctrlFs}`);
ok([14, 18].includes(mm.iconW), '图标宽度 ∈ {14,18}', `实际 ${mm.iconW}`);
ok(mm.titleFs === 14 || mm.titleFs === 0, '标题字号 = 14px', `实际 ${mm.titleFs}`);
if (mm.bodyFs && mm.bodyFs !== 10) warn.push(`正文字号 ${mm.bodyFs}（期望 10）`);

// 流程条点击下拉必须能用
const menu = await (async () => {
  const clicked = await ev("(() => { const c = document.querySelector('.cx-pipe .cx-stage'); if (!c) return false; c.click(); return true; })()");
  if (!clicked) return { ok: false, msg: '流程条没有可点击的 chip' };
  await sleep(400);
  const open = await ev("!!document.querySelector('.cx-pipe-menu-fixed')");
  const items = await ev("document.querySelectorAll('.cx-pipe-menu-fixed .cx-menu-item').length");
  const iconOk = await ev("(() => { const it = document.querySelector('.cx-pipe-menu-fixed .cx-menu-item'); if (!it) return false; const p = it.querySelector('svg path'); return !!(p && (p.getAttribute('d') || '').length > 6); })()");
  await sleep(100);
  const hintBottom = await ev("!!document.querySelector('.cx-menu-hint.bottom')");
  await ev("(() => { const sc = document.querySelector('.cx-menu-scroll'); if (sc) { sc.scrollTop = sc.scrollHeight; sc.dispatchEvent(new Event('scroll')); } })()");
  await sleep(250);
  const hintTop = await ev("!!document.querySelector('.cx-menu-hint.top')");
  await ev("document.body.click()");
  return { ok: open && items > 0 && iconOk && hintBottom && hintTop, msg: `menu=${open} items=${items} icon=${iconOk} hints=${hintBottom}/${hintTop}` };
})();
ok(menu.ok, '流程条点击可展开下拉', menu.msg);

// 右侧四个 chip 也必须能下拉
let chipsOk = true; const chipsMsg = [];
for (let i = 0; i < 4; i++) {
  await ev(`(() => { const c = document.querySelectorAll('.cx-chips .cx-chip')[${i}]; if (c) c.click(); })()`);
  await sleep(250);
  const n = await ev("document.querySelectorAll('.cx-pipe-menu-fixed .cx-menu-item').length");
  chipsMsg.push(n);
  if (!n) chipsOk = false;
  await ev("document.body.click()");
  await sleep(150);
}
ok(chipsOk, '右侧四个 chip 可下拉', 'items=' + chipsMsg.join(','));
// 工作模式选项必须是可读名称，不能是 avatar/factory/iot 这种 id
const modeItem = await (async () => {
  await ev("(() => { const c = document.querySelectorAll('.cx-chips .cx-chip')[2]; if (c) c.click(); })()");
  await sleep(250);
  const t = await ev("(() => { const m = document.querySelector('.cx-pipe-menu-fixed .cx-menu-item .cx-menu-lbl'); return m ? (m.innerText||'').trim() : ''; })()");
  await ev("document.body.click()");
  return t;
})();
ok(!!modeItem && !['avatar', 'factory', 'iot'].includes(modeItem), '工作模式选项已本地化', `首项 "${modeItem}"`);

// 顶部特效下拉：与 chip 左对齐、三列
const hdrDrop = await (async () => {
  await ev("(() => { const b = document.querySelector('.cx-actions .cx-drop-btn'); if (b) b.click(); })()");
  await sleep(250);
  const r = await ev("(() => { const chip = document.querySelector('.cx-actions .cx-drop'); const pop = document.querySelector('.cx-drop-pop'); if (!chip || !pop) return null; const cr = chip.getBoundingClientRect(), pr = pop.getBoundingClientRect(); const it = pop.querySelector('.cx-menu-3col'); return { diff: Math.round(pr.left - cr.left), items: pop.querySelectorAll('.cx-menu-3col').length, grid: it ? getComputedStyle(it).gridTemplateColumns : '' }; })()");
  await ev("document.body.click()");
  return r;
})();
ok(!!hdrDrop && Math.abs(hdrDrop.diff) <= 1, '特效下拉与 chip 左对齐', hdrDrop ? `diff=${hdrDrop.diff}` : 'no popup');
ok(!!hdrDrop && hdrDrop.items > 0 && /^18px .* 18px$/.test(hdrDrop.grid), '特效下拉三列', hdrDrop ? `grid=${hdrDrop.grid} items=${hdrDrop.items}` : '');

// 浅色主题不应出现开场过场（初始化完成后的 READY 除外，此处只查进入时）
const themeNow = await ev("document.querySelector('.cx-shell')?.dataset.theme || ''");
if (themeNow === 'light') {
  const introShown = await ev("(() => { const e = document.querySelector('.cx-shell[data-theme=\"light\"] .cx-intro:not(.cx-welcome) .cx-intro-m'); return !!(e && e.offsetParent && getComputedStyle(e).display !== 'none'); })()");
  ok(!introShown, '浅色主题不播开场过场', `theme=${themeNow} intro=${introShown}`);
}

// 控制台报错
info.push(`  console errors: ${consoleErrors.length}`);
ok(consoleErrors.length === 0, '运行时无 console 报错', consoleErrors.slice(0, 2).join(' | '));

// 截图 + 基线
const shot = await send('Page.captureScreenshot', { format: 'png' });
fs.writeFileSync(OUT_PNG, Buffer.from(shot.data, 'base64'));
if (!fs.existsSync(BASE)) {
  fs.writeFileSync(BASE, JSON.stringify({ metrics: mm, at: new Date().toISOString() }, null, 2));
  info.push(`  baseline 已写入 ${path.relative(root, BASE)}`);
} else {
  const base = JSON.parse(fs.readFileSync(BASE, 'utf8'));
  for (const k of ['headerPad', 'viewH', 'chipH', 'ctrlFs', 'iconW']) {
    if (base.metrics?.[k] !== undefined && base.metrics[k] !== mm[k]) warn.push(`基线偏差 ${k}: ${base.metrics[k]} → ${mm[k]}`);
  }
  info.push('  基线对比完成');
}

console.log(info.join('\n'));
if (warn.length) console.log(warn.map((w) => '  WARN ' + w).join('\n'));
if (fail.length) { console.log(fail.map((f) => '  FAIL ' + f).join('\n')); console.log(`ui-verify: FAIL (${fail.length})`); ws.close(); process.exit(1); }
console.log(`ui-verify: PASS  截图 ${OUT_PNG}`);
ws.close();
