#!/usr/bin/env node
// 调试用：在 Edge（9223 端口）里刷新 DSH 页面并进入插件，打印当前版本。
// 前置：Edge 已用 --remote-debugging-port=9223 打开 DSH GUI。
const PORT = process.env.EDGE_DEBUG_PORT || 9223;
const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
const page = list.find((t) => t.type === 'page' && /^http:\/\/127\.0\.0\.1/.test(t.url));
if (!page) { console.log('no DSH page in Edge'); process.exit(1); }
const ws = new WebSocket(page.webSocketDebuggerUrl);
let id = 0; const pending = new Map();
const send = (m, p = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id); } };
await new Promise((r) => (ws.onopen = r));
const ev = async (x) => (await send('Runtime.evaluate', { expression: x, returnByValue: true, awaitPromise: true })).result?.value;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await send('Page.enable');
await send('Page.reload', { ignoreCache: true });
await sleep(6000);
for (let i = 0; i < 8; i++) {
  await ev(`(() => { const els = Array.from(document.querySelectorAll('*')); const t = els.find(e => e.children.length === 0 && /ContextOS DevOps/.test((e.innerText||'').trim())); if (t) (t.closest('button,a,[role=button],li') || t).click(); })()`);
  await sleep(1200);
  if (await ev(`!!document.querySelector('.cx-shell')`)) break;
}
await ev(`(()=>{const b=Array.from(document.querySelectorAll('button')).find(x=>/关闭|Close/.test((x.innerText||'').trim()) && x.offsetParent); if(b) b.click();})()`);
await sleep(500);
console.log('version:', await ev(`document.querySelector('.cx-sub')?.innerText || '(no plugin page)'`));
ws.close();
