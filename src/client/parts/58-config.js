    // ── ContextOS 配置中心：全局 / 会话（node space app avatar scene mode） ──
    const CTX_CFG_KEYS = ['node', 'space', 'app', 'avatar', 'scene', 'mode'];
    const CTX_CFG_DEFAULT = { node: null, space: '', app: '', avatar: '', scene: '', mode: 'factory' };
    const CTX_CFG_NS = 'contextos-devops-dsh:cfg';
    const CTX_CALLS_NS = 'contextos-devops-dsh:calls';
    const CTX_UI = { open: false, tab: 'global', sessionId: '', subs: new Set() };
    const CTX_DATA = { nodes: [], spaces: {}, apps: {}, avatars: [], scenes: [], loading: false };
    function ctxCfgEmit() { CTX_UI.subs.forEach((f) => { try { f(); } catch {} }); }
    function ctxCfgUse() {
      const [, set] = useState(0);
      useEffect(() => { const f = () => set((x) => x + 1); CTX_UI.subs.add(f); return () => CTX_UI.subs.delete(f); }, []);
    }
    function ctxCfgLoad() {
      let d = null;
      d = cxRead(CTX_CFG_NS, null);
      if (!d || typeof d !== 'object') d = {};
      d.global = { ...CTX_CFG_DEFAULT, ...(d.global || {}) };
      d.sessions = d.sessions || {};
      d.commands = d.commands || {};
      d.dev = { space: '', zone: 'devops', template: 'Hash', compile: true, registerAsTool: true, fallback: '', ...(d.dev || {}) };
      return d;
    }
    let CTX_CFG = ctxCfgLoad();
    function ctxCfgSave() {
      cxWrite(CTX_CFG_NS, CTX_CFG);
      try { api('stateSet', { name: 'contextos-config', value: CTX_CFG }).catch(() => {}); } catch {}
      ctxCfgEmit();
    }
    function ctxCfgResolve(sessionId) { return { ...CTX_CFG.global, ...((sessionId && CTX_CFG.sessions[sessionId]) || {}) }; }
    function ctxCfgSession(sessionId) { return (sessionId && CTX_CFG.sessions[sessionId]) || {}; }
    function ctxCfgSetGlobal(k, v) { CTX_CFG.global[k] = v; ctxCfgSave(); }
    function ctxCfgSetSession(sid, k, v) { if (!sid) return; CTX_CFG.sessions[sid] = { ...ctxCfgSession(sid), [k]: v }; ctxCfgSave(); }
    function ctxCallsLoad() { return cxRead(CTX_CALLS_NS, []); }
    function ctxCallLog(entry) {
      const list = ctxCallsLoad();
      list.unshift({ t: new Date().toISOString(), ...entry });
      cxWrite(CTX_CALLS_NS, list.slice(0, 500));
      try { api('stateSet', { name: 'contextos-calls', value: list.slice(0, 500) }).catch(() => {}); } catch {}
      ctxCfgEmit();
    }
    async function ctxLoadNodes() {
      try { const d = await api('nodes'); CTX_DATA.nodes = d.nodes || []; } catch { CTX_DATA.nodes = []; }
      ctxCfgEmit();
    }
    async function ctxLoadSpaces(node) {
      if (!node) return;
      try { const d = await api('spaces', { node }); CTX_DATA.spaces[node] = d || []; } catch { CTX_DATA.spaces[node] = []; }
      ctxCfgEmit();
    }
    async function ctxLoadApps(node, space) {
      if (!node) return;
      const key = `${node}:${space || ''}`;
      try { const d = await api('apps', { node, space: space || '', uid: '' }); CTX_DATA.apps[key] = d || []; } catch { CTX_DATA.apps[key] = []; }
      ctxCfgEmit();
    }
    async function ctxLoadAvatars(node) {
      if (!node) return;
      try { const d = await api('avatars', { node }); CTX_DATA.avatars = d.items || []; } catch { CTX_DATA.avatars = []; }
      ctxCfgEmit();
    }
    async function ctxLoadScenes(node) {
      if (!node) return;
      try { const d = await api('backgrounds', { node }); CTX_DATA.scenes = d.items || []; } catch { CTX_DATA.scenes = []; }
      ctxCfgEmit();
    }

    // 首次进入某个模式时的「开门」过场
    const MODE_INTRO_SEEN = new Set();
    function ModeIntro({ mode, onDone }) {
      const label = mode === 'chat' ? 'CONVERSATION' : mode === 'manage' ? 'MANAGEMENT' : mode === 'monitor' ? 'MONITORING' : 'DEVELOPMENT';
      useEffect(() => { const t = setTimeout(onDone, 3200); return () => clearTimeout(t); }, []);
      return h('div', { className: `cx-intro cx-intro-${mode}` },
        h('div', { className: 'cx-intro-doors' }, Array.from({ length: 5 }, (_, i) => h('i', { key: i, style: { animationDelay: `${i * 0.09}s` } }))),
        h('div', { className: 'cx-intro-txt' },
          h('div', { className: 'cx-intro-w' }, 'WELCOME TO'),
          h('div', { className: 'cx-intro-m' }, label),
          h('div', { className: 'cx-intro-s' }, 'CONTEXTOS · ' + mode.toUpperCase() + ' MODE')));
    }

    // 进入/离开初始化时的欢迎过场
    function WelcomeBurst({ title, sub, onDone }) {
      useEffect(() => { const t = setTimeout(onDone, 1800); return () => clearTimeout(t); }, []);
      return h('div', { className: 'cx-intro cx-welcome', 'data-ready': String(title === 'READY') },
        h('div', { className: 'cx-intro-doors' }, Array.from({ length: 5 }, (_, i) => h('i', { key: i, style: { animationDelay: `${i * 0.07}s` } }))),
        h('div', { className: 'cx-intro-txt' },
          h('div', { className: 'cx-intro-w' }, 'WELCOME TO'),
          h('div', { className: 'cx-intro-m' }, title),
          h('div', { className: 'cx-intro-s' }, sub)));
    }

    // 鼠标彗星拖尾（canvas）
    function CursorComet() {
      const ref = useRef(null);
      useEffect(() => {
        const canvas = ref.current;
        const host = canvas && canvas.parentElement;
        if (!canvas || !host) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        let raf = 0, w = 0, h = 0;
        const parts = [];
        const ripples = [];
        const slow = [];
        let lastPos = { x: 0, y: 0 }, lastMoveAt = Date.now();
        const resize = () => { const r = host.getBoundingClientRect(); w = canvas.width = Math.max(1, Math.round(r.width)); h = canvas.height = Math.max(1, Math.round(r.height)); };
        resize();
        const ro = new ResizeObserver(resize); ro.observe(host);
        let last = { x: 0, y: 0 };
        const onMove = (e) => {
          const r = host.getBoundingClientRect();
          const x = e.clientX - r.left, y = e.clientY - r.top;
          const vx = x - last.x, vy = y - last.y; last = { x, y };
          lastPos = { x, y }; lastMoveAt = Date.now(); schedule();
          const steps = Math.min(4, 1 + Math.round(Math.hypot(vx, vy) / 18));
          for (let i = 0; i < steps; i++) {
            parts.push({ x: x - vx * (i / steps), y: y - vy * (i / steps), vx: -vx * 0.02 + (Math.random() - 0.5) * 0.5, vy: -vy * 0.02 + (Math.random() - 0.5) * 0.5, life: 1, size: 3 + Math.random() * 6 });
          }
          if (parts.length > 120) parts.splice(0, parts.length - 120);
        };
        host.addEventListener('pointermove', onMove, { passive: true });
        const onDown = (e) => {
          const r = host.getBoundingClientRect();
          ripples.push({ x: e.clientX - r.left, y: e.clientY - r.top, r: 6, life: 1 });
          if (ripples.length > 8) ripples.shift();
          schedule();
        };
        host.addEventListener('pointerdown', onDown, true);
        const slowTimer = setInterval(() => {
          if (Date.now() - lastMoveAt < 55000) return;
          slow.push({ x: lastPos.x, y: lastPos.y, r: 10, life: 1 });
          if (slow.length > 2) slow.shift();
        }, 60000);
        window.__cxSlowRipple = () => { slow.push({ x: lastPos.x, y: lastPos.y, r: 10, life: 1 }); if (slow.length > 2) slow.shift(); schedule(); };
        let frame = 0;
        const schedule = () => {
          if (raf || document.hidden) return;
          raf = requestAnimationFrame(tick);
        };
        const tick = () => {
          raf = 0;
          /* 空闲 2.5s 且无粒子时停帧，等输入再唤醒 */
          const idleNow = Date.now() - lastMoveAt > 2500 && !parts.length && !ripples.length && !slow.length;
          if (idleNow) return;
          raf = requestAnimationFrame(tick);
          frame++;
          if (document.hidden) return;   /* 后台不绘制，省电 */
          const shell = host.closest('.cx-shell');
          if (shell && shell.dataset.view === 'dev') return;  /* 开发模式不画拖尾 */
          if (frame % 2) return;          /* 降到 ~30fps */
          ctx.clearRect(0, 0, w, h);
          ctx.globalCompositeOperation = 'lighter';
          for (let i = slow.length - 1; i >= 0; i--) {
            const s2 = slow[i];
            s2.life -= 0.0035;
            s2.r += 1.7;
            if (s2.life <= 0) { slow.splice(i, 1); continue; }
            ctx.globalCompositeOperation = 'lighter';
            ctx.lineWidth = 6 * s2.life + 1;
            ctx.strokeStyle = `rgba(120,240,255,${0.32 * s2.life})`;
            ctx.shadowBlur = 40 * s2.life;
            ctx.shadowColor = 'rgba(62,231,255,.55)';
            ctx.beginPath(); ctx.arc(s2.x, s2.y, s2.r, 0, Math.PI * 2); ctx.stroke();
            ctx.shadowBlur = 0;
            ctx.strokeStyle = `rgba(170,255,240,${0.16 * s2.life})`;
            ctx.beginPath(); ctx.arc(s2.x, s2.y, s2.r * 0.6, 0, Math.PI * 2); ctx.stroke();
          }
          for (let i = ripples.length - 1; i >= 0; i--) {
            const rp = ripples[i];
            rp.life -= 0.022;
            rp.r += 9;
            if (rp.life <= 0) { ripples.splice(i, 1); continue; }
            ctx.globalCompositeOperation = 'lighter';
            ctx.lineWidth = 2.5 * rp.life + 0.5;
            ctx.strokeStyle = `rgba(120,240,255,${0.75 * rp.life})`;
            ctx.shadowBlur = 18 * rp.life;
            ctx.shadowColor = 'rgba(62,231,255,.8)';
            ctx.beginPath(); ctx.arc(rp.x, rp.y, rp.r, 0, Math.PI * 2); ctx.stroke();
            ctx.shadowBlur = 0;
            ctx.strokeStyle = `rgba(255,255,255,${0.35 * rp.life})`;
            ctx.beginPath(); ctx.arc(rp.x, rp.y, rp.r * 0.72, 0, Math.PI * 2); ctx.stroke();
          }
          for (let i = parts.length - 1; i >= 0; i--) {
            const p = parts[i];
            p.life -= 0.018;
            if (p.life <= 0) { parts.splice(i, 1); continue; }
            p.x += p.vx; p.y += p.vy;
            const R = p.size * 2.6;
            const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, R);
            g.addColorStop(0, `rgba(220,255,255,${0.45 * p.life})`);
            g.addColorStop(0.3, `rgba(62,231,255,${0.32 * p.life})`);
            g.addColorStop(1, 'rgba(62,231,255,0)');
            ctx.fillStyle = g;
            ctx.beginPath(); ctx.arc(p.x, p.y, R, 0, Math.PI * 2); ctx.fill();
          }
        };
        tick();
        return () => { cancelAnimationFrame(raf); clearInterval(slowTimer); try { delete window.__cxSlowRipple; } catch {} host.removeEventListener('pointermove', onMove); host.removeEventListener('pointerdown', onDown, true); ro.disconnect(); };
      }, []);
      return h('canvas', { className: 'cx-comet', ref, 'aria-hidden': 'true' });
    }

    function CtxChip({ sessionId }) {
      ctxCfgUse();
      const [open, setOpen] = useState(false);
      const eff = ctxCfgResolve(sessionId);
      return h(React.Fragment, null,
        h('button', {
          className: 'cx-ctx-chip', title: 'ContextOS 控制台',
          onPointerDown: (e) => { e.stopPropagation(); },
          onClick: (e) => { e.stopPropagation(); setOpen(true); },
        },
          h('span', { className: 'cx-ctx-chip-k' }, 'ContextOS'),
          h('span', { className: 'cx-ctx-chip-v' }, eff.node ? `:${eff.node}` : T('未绑定')),
          eff.space ? h('span', { className: 'cx-ctx-chip-s' }, eff.space) : null),
        open ? h(CtxCenter, { sessionId: sessionId || '', onClose: () => setOpen(false) }) : null);
    }

    function CtxHeaderButton({ sessionId }) {
      ctxCfgUse();
      const [open, setOpen] = useState(false);
      const eff = ctxCfgResolve(sessionId);
      return h(React.Fragment, null,
        h('button', {
          className: 'cx-ctx-hbtn', title: `ContextOS ${eff.node ? ':' + eff.node : ''}`,
          onPointerDown: (e) => { e.stopPropagation(); },
          onClick: (e) => { e.stopPropagation(); setOpen(true); },
        }, h('span', { className: 'cx-ctx-hdot' }), 'ContextOS'),
        open ? h(CtxCenter, { sessionId: sessionId || '', onClose: () => setOpen(false) }) : null);
    }

    function CtxField({ label, children }) { return h('label', { className: 'cx-field' }, label, children); }
    function CtxSelect({ label, value, options, onChange, placeholder }) {
      return h(CtxField, { label },
        h('select', { className: 'cx-input', value: value == null ? '' : String(value), onChange: (e) => onChange(e.target.value) },
          h('option', { value: '' }, placeholder || '—'),
          (options || []).map((o) => h('option', { key: String(o.value), value: String(o.value) }, o.label))));
    }

    function CtxConfigForm({ scope, sessionId }) {
      const eff = scope === 'global' ? CTX_CFG.global : ctxCfgResolve(sessionId);
      const set = (k, v) => (scope === 'global' ? ctxCfgSetGlobal(k, v) : ctxCfgSetSession(sessionId || '', k, v));
      const node = Number(eff.node) || null;
      const spaces = (CTX_DATA.spaces[node] || []).map((s) => ({ value: s.name, label: s.name }));
      const apps = (CTX_DATA.apps[`${node}:${eff.space || ''}`] || []).map((a) => ({ value: a.command || a.name, label: a.title || a.command || a.name }));
      const avatars = (CTX_DATA.avatars || []).map((a) => ({ value: a.uid, label: a.name || a.uid }));
      const scenes = (CTX_DATA.scenes || []).map((b) => ({ value: b.id, label: b.name || b.id }));
      return h('div', { className: 'cx-ctx-form' },
        h(CtxSelect, { label: 'node', value: eff.node, placeholder: T('选择节点'), options: (CTX_DATA.nodes || []).map((n) => ({ value: n.port, label: `:${n.port} · ${n.name || (n.state === 'running' ? 'running' : 'offline')}` })), onChange: (v) => { set('node', Number(v) || null); ctxLoadSpaces(Number(v) || null); } }),
        h(CtxSelect, { label: 'space', value: eff.space, placeholder: T('选择空间'), options: spaces, onChange: (v) => { set('space', v); ctxLoadApps(node, v); } }),
        h(CtxSelect, { label: 'app', value: eff.app, placeholder: T('选择应用'), options: apps, onChange: (v) => set('app', v) }),
        h(CtxSelect, { label: 'avatar', value: eff.avatar, placeholder: T('选择分身'), options: avatars, onChange: (v) => set('avatar', v) }),
        h(CtxSelect, { label: 'scene', value: eff.scene, placeholder: T('选择场景'), options: scenes, onChange: (v) => set('scene', v) }),
        h(CtxSelect, { label: 'mode', value: eff.mode, placeholder: 'factory', options: [{ value: 'factory', label: 'factory' }, { value: 'avatar', label: 'avatar' }, { value: 'iot', label: 'iot' }], onChange: (v) => set('mode', v) }),
        scope === 'session' ? h(CtxField, { label: 'project' }, h('input', { className: 'cx-input', value: ctxCfgSession(sessionId || '').project || '', placeholder: '项目管理 place_uid', onChange: (e) => ctxCfgSetSession(sessionId || '', 'project', e.target.value) })) : null,
        h('div', { className: 'cx-ctx-actions' },
          h('button', { className: 'cx-btn', onClick: () => { if (scope === 'session' && sessionId) { delete CTX_CFG.sessions[sessionId]; ctxCfgSave(); } else { CTX_CFG.global = { ...CTX_CFG_DEFAULT }; ctxCfgSave(); } } }, T('重置')),
          h('button', { className: 'cx-btn pri', onClick: () => { ctxCfgSave(); ctxCallLog({ op: 'config.save', scope, node: eff.node, space: eff.space }); } }, T('保存'))));
    }

    function CtxCommands({ node, space, sessionId }) {
      const key = `${node}:${space || ''}`;
      const apps = CTX_DATA.apps[key] || [];
      const map = (sessionId && CTX_CFG.commands[sessionId]) || {};
      const setCmd = (cmd, patch) => { if (!sessionId) return; CTX_CFG.commands[sessionId] = { ...map, [cmd]: { ...(map[cmd] || {}), ...patch } }; ctxCfgSave(); };
      if (!node) return h('div', { className: 'cx-ctx-empty' }, T('先绑定节点'));
      if (!apps.length) return h('div', { className: 'cx-ctx-empty' }, T('该节点/空间暂无命令，点右上角刷新'));
      return h('div', { className: 'cx-ctx-list' },
        apps.map((a) => {
          const cmd = a.command || a.name;
          const st = map[cmd] || { enabled: true, purpose: a.title || a.help || '' };
          return h('div', { key: cmd, className: 'cx-ctx-cmd' },
            h('input', { type: 'checkbox', checked: st.enabled !== false, onChange: (e) => setCmd(cmd, { enabled: e.target.checked }) }),
            h('span', { className: 'nm' }, cmd),
            h('input', { className: 'cx-input', value: st.purpose || '', placeholder: '这个命令用来做什么', onChange: (e) => setCmd(cmd, { purpose: e.target.value }) }));
        }));
    }

    function CtxDev() {
      const dev = CTX_CFG.dev;
      const set = (k, v) => { CTX_CFG.dev[k] = v; ctxCfgSave(); };
      return h('div', { className: 'cx-ctx-form' },
        h(CtxField, { label: '生成空间' }, h('input', { className: 'cx-input', value: dev.space || '', placeholder: '留空则用会话空间', onChange: (e) => set('space', e.target.value) })),
        h(CtxField, { label: 'zone' }, h('input', { className: 'cx-input', value: dev.zone || '', onChange: (e) => set('zone', e.target.value) })),
        h(CtxField, { label: 'template' }, h('input', { className: 'cx-input', value: dev.template || '', onChange: (e) => set('template', e.target.value) })),
        h(CtxField, { label: '自动编译' }, h('input', { type: 'checkbox', checked: !!dev.compile, onChange: (e) => set('compile', e.target.checked) })),
        h(CtxField, { label: '注册为工具' }, h('input', { type: 'checkbox', checked: !!dev.registerAsTool, onChange: (e) => set('registerAsTool', e.target.checked) })),
        h(CtxField, { label: '失败回退' }, h('input', { className: 'cx-input', value: dev.fallback || '', onChange: (e) => set('fallback', e.target.value) })));
    }

    function CtxApps({ node, space }) {
      const apps = CTX_DATA.apps[`${node}:${space || ''}`] || [];
      if (!node) return h('div', { className: 'cx-ctx-empty' }, T('先绑定节点'));
      if (!apps.length) return h('div', { className: 'cx-ctx-empty' }, T('暂无应用'));
      return h('table', { className: 'cx-console-table' },
        h('thead', null, h('tr', null, ['command', 'title', 'space', 'place'].map((k) => h('th', { key: k }, k)))),
        h('tbody', null, apps.map((a, i) => h('tr', { key: i },
          h('td', null, a.command || a.name || ''),
          h('td', null, a.title || a.help || ''),
          h('td', null, a.space || ''),
          h('td', null, a.place_uid || '')))));
    }

    function ctxEsc(v) { return String(v == null ? '' : v).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
    function ctxConsoleHtml(eff, apps, calls) {
      const tr = (cells) => `<tr>${cells.map((c) => `<td>${ctxEsc(c)}</td>`).join('')}</tr>`;
      const cfg = ['node', 'space', 'app', 'avatar', 'scene', 'mode'].map((k) => tr([k, eff[k]])).join('');
      const appRows = (apps || []).map((a) => tr([a.command || a.name, a.title || a.help, a.space, a.place_uid])).join('');
      const logRows = (calls || []).slice(0, 100).map((c) => tr([String(c.t || '').slice(11, 19), c.op, c.node, c.space, c.ok === false ? 'ERR' : 'OK'])).join('');
      const ok = (calls || []).filter((c) => c.ok !== false).length;
      return `<!doctype html><html lang="zh"><head><meta charset="utf-8"><title>ContextOS 控制台</title><style>
body{margin:0;padding:20px 24px;background:#050a12;color:#d9f4ff;font:12px/1.6 ui-monospace,Menlo,monospace}
h1{font-size:15px;letter-spacing:.18em;color:#3ee7ff;margin:0 0 4px}
.meta{color:#6f9bb3;margin-bottom:16px}
h2{font-size:11px;letter-spacing:.12em;color:#3ee7ff;margin:18px 0 6px;border-bottom:1px solid #16384d;padding-bottom:4px}
table{border-collapse:collapse;width:100%;font-size:11px}
td,th{border:1px solid #16384d;padding:4px 8px;text-align:left}
th{color:#8fb8c9;background:#08131f}
.stat{display:inline-block;min-width:110px;margin-right:10px;padding:8px 12px;border:1px solid #16384d;border-radius:4px}
.stat b{display:block;font-size:18px;color:#3ee7ff}
</style></head><body>
<h1>CONTEXTOS · 控制台</h1>
<div class="meta">节点 ${ctxEsc(eff.node)} · 空间 ${ctxEsc(eff.space)} · v__CLIENT_CSS_VERSION__</div>
<h2>配置</h2><table><tbody>${cfg}</tbody></table>
<h2>调用统计</h2>
<div><span class="stat"><b>${(calls || []).length}</b>调用</span><span class="stat"><b>${ok}</b>成功</span><span class="stat"><b>${(calls || []).length - ok}</b>失败</span></div>
<h2>应用</h2><table><thead><tr><th>command</th><th>title</th><th>space</th><th>place</th></tr></thead><tbody>${appRows || '<tr><td colspan="4">暂无</td></tr>'}</tbody></table>
<h2>调用日志</h2><table><thead><tr><th>时间</th><th>操作</th><th>节点</th><th>空间</th><th>结果</th></tr></thead><tbody>${logRows || '<tr><td colspan="5">暂无</td></tr>'}</tbody></table>
</body></html>`;
    }

    function CtxCenter({ sessionId, onClose }) {
      ctxCfgUse();
      const [tab, setTab] = useState('global');
      const [msg, setMsg] = useState('');
      const sid = sessionId || '';
      const close = () => { try { onClose && onClose(); } catch {} };
      const eff = ctxCfgResolve(sid);
      const node = Number(eff.node) || null;
      useEffect(() => {
        let alive = true;
        (async () => {
          if (!CTX_DATA.nodes.length) await ctxLoadNodes();
          if (node) { await ctxLoadSpaces(node); await ctxLoadAvatars(node); await ctxLoadScenes(node); await ctxLoadApps(node, eff.space); }
        })();
        return () => { alive = false; };
      }, [node, eff.space]);
      const calls = ctxCallsLoad();
      const tabs = [['global', '全局配置'], ['session', '会话配置'], ['commands', '命令配置'], ['dev', '开发配置'], ['apps', '应用列表'], ['stats', '调用统计'], ['logs', '调用日志']];
      const body =
        tab === 'global' ? h(CtxConfigForm, { scope: 'global' }) :
        tab === 'session' ? h(CtxConfigForm, { scope: 'session', sessionId: sid }) :
        tab === 'commands' ? h(CtxCommands, { node, space: eff.space, sessionId: sid }) :
        tab === 'dev' ? h(CtxDev) :
        tab === 'apps' ? h(CtxApps, { node, space: eff.space }) :
        tab === 'stats' ? h('div', { className: 'cx-ctx-stats' },
          [['调用次数', calls.length], ['成功', calls.filter((c) => c.ok !== false).length], ['失败', calls.filter((c) => c.ok === false).length], ['节点', new Set(calls.map((c) => c.node).filter(Boolean)).size], ['空间', new Set(calls.map((c) => c.space).filter(Boolean)).size]].map(([k, v]) => h('div', { key: k, className: 'cx-ctx-stat' }, h('b', null, String(v)), h('span', null, k)))) :
        h('div', { className: 'cx-ctx-list' },
          h('div', { className: 'cx-ctx-actions' }, h('button', { className: 'cx-btn', onClick: () => { cxRemove(CTX_CALLS_NS); ctxCfgEmit(); } }, T('清空'))),
          calls.length ? h('table', { className: 'cx-console-table' },
            h('thead', null, h('tr', null, ['时间', '操作', '节点', '空间', '结果'].map((k) => h('th', { key: k }, k)))),
            h('tbody', null, calls.slice(0, 100).map((c, i) => h('tr', { key: i }, h('td', null, String(c.t || '').slice(11, 19)), h('td', null, c.op || ''), h('td', null, c.node || ''), h('td', null, c.space || ''), h('td', null, c.ok === false ? 'ERR' : 'OK'))))) : h('div', { className: 'cx-ctx-empty' }, T('暂无调用')));
      return h('div', { className: 'cx-ctx-drawer', onMouseDown: (e) => { if (e.target === e.currentTarget) close(); } },
        h('div', { className: 'cx-ctx-panel' },
          h('div', { className: 'cx-ctx-head' },
            h('div', { className: 'cx-ctx-logo' }, 'CTX'),
            h('div', { className: 'cx-ctx-titles' },
              h('div', { className: 'cx-ctx-title' }, 'CONTEXTOS'),
              h('div', { className: 'cx-ctx-sub' }, `${T('控制台')} · v__CLIENT_CSS_VERSION__`)),
            h('div', { className: 'cx-ctx-acts' },
              h('button', { className: 'cx-icon-btn', title: T('刷新'), onClick: () => { ctxLoadNodes(); if (node) { ctxLoadSpaces(node); ctxLoadApps(node, eff.space); } } }, '↻'),
              h('button', { className: 'cx-ctx-x', title: T('关闭'), onClick: close }, '✕'))),
          h('div', { className: 'cx-ctx-sum' },
            h('span', { className: `cx-ctx-pill${eff.node ? ' on' : ''}` }, eff.node ? `:${eff.node}` : T('未绑定节点')),
            h('span', { className: 'cx-ctx-pill' }, eff.space || T('未选空间')),
            h('span', { className: 'cx-ctx-pill' }, eff.mode || 'factory'),
            h('span', { className: 'cx-ctx-pill dim' }, eff.app || T('未选应用'))),
          h('div', { className: 'cx-ctx-tabs' }, tabs.map(([k, n]) => h('button', { key: k, className: `cx-ctx-tab${tab === k ? ' on' : ''}`, onClick: () => setTab(k) }, T(n)))),
          msg ? h('div', { className: 'cx-ctx-msg' }, msg) : null,
          h('div', { className: 'cx-ctx-body' }, body)));
    }
