    // ── ContextOS 配置中心：全局 / 会话（node space app avatar scene mode） ──
    const CTX_CFG_KEYS = ['node', 'space', 'app', 'avatar', 'scene', 'mode'];
    const CTX_CFG_DEFAULT = { node: null, space: '', app: '', avatar: '', scene: '', mode: 'factory', recent: [] };
    const CTX_CFG_NS = 'dsh-contextos-devops:cfg';
    const CTX_CALLS_NS = 'dsh-contextos-devops:calls';
    const CTX_UI = { open: false, tab: 'global', sessionId: '', subs: new Set() };
    const CTX_DATA = { nodes: [], spaces: {}, apps: {}, commands: {}, avatars: [], scenes: [], loading: false };
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
      if (!Array.isArray(d.recent)) d.recent = [];
      d.dev = { space: '', zone: 'devops', template: 'Hash', compile: true, registerAsTool: true, fallback: '', namePrefix: 'cx_tool', timeout: 120, allowNetwork: false, prompt: '', ...(d.dev || {}) };
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
    async function ctxLoadCommands(node, space) {
      if (!node) return;
      const key = `${node}:${space || ''}`;
      CTX_DATA.loading = true; ctxCfgEmit();
      try { const d = await api('scanCommands', { node, space: space || '' }); CTX_DATA.commands[key] = d.items || []; }
      catch { CTX_DATA.commands[key] = []; }
      finally { CTX_DATA.loading = false; ctxCfgEmit(); }
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

    function setSession(sid, k, v) { if (sid) ctxCfgSetSession(sid, k, v); else ctxCfgSetGlobal(k, v); }
    function pushRecent(node, space, app, title) {
      const list = Array.isArray(CTX_CFG.recent) ? CTX_CFG.recent : [];
      const key = `${node}:${space || ''}:${app || ''}`;
      const next = [{ node, space: space || '', app: app || '', title: title || '', t: Date.now() }, ...list.filter((r) => `${r.node}:${r.space || ''}:${r.app || ''}` !== key)];
      CTX_CFG.recent = next.slice(0, 20); ctxCfgSave();
    }
    // 输入框里的多级列表：服务节点 → 项目空间 → 最近应用
    function CtxCascade({ sessionId, onClose, onOpenConfig }) {
      ctxCfgUse();
      const sid = sessionId || '';
      const eff = ctxCfgResolve(sid);
      const node = Number(eff.node) || null;
      const spaces = node ? (CTX_DATA.spaces[node] || []) : [];
      const apps = node ? (CTX_DATA.apps[`${node}:${eff.space || ''}`] || []) : [];
      const recent = (Array.isArray(CTX_CFG.recent) ? CTX_CFG.recent : []).filter((r) => !node || Number(r.node) === node);
      useEffect(() => {
        (async () => {
          if (!CTX_DATA.nodes.length) await ctxLoadNodes();
          if (node) await ctxLoadSpaces(node);
          if (node) await ctxLoadApps(node, eff.space);
        })();
      }, [node, eff.space]);
      useEffect(() => {
        const onKey = (e) => { if (e.key === 'Escape') onClose && onClose(); };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
      }, []);
      const pickNode = (p) => {
        setSession(sid, 'node', p);
        setSession(sid, 'space', '');
        setSession(sid, 'app', '');
        ctxLoadSpaces(p);
      };
      const pickSpace = (name) => {
        setSession(sid, 'space', name);
        setSession(sid, 'app', '');
        ctxLoadApps(node, name);
      };
      const pickApp = (a) => {
        const cmd = a.command || a.name || '';
        setSession(sid, 'app', cmd);
        pushRecent(node, eff.space || '', cmd, a.title || a.name || cmd);
        onClose && onClose();
      };
      const col = (title, rows, empty, onPick, active) => h('div', { className: 'cx-cascade-col' },
        h('div', { className: 'cx-cascade-h' }, title),
        h('div', { className: 'cx-cascade-list' },
          rows.length ? rows.map((r, i) => h('button', {
            key: `${i}-${r.key}`, className: `cx-cascade-item${r.key === active ? ' on' : ''}`, title: r.title || r.label,
            onClick: () => onPick(r),
          }, h('span', { className: 'nm' }, r.label), r.sub ? h('span', { className: 'sub' }, r.sub) : null))
            : h('div', { className: 'cx-cascade-empty' }, empty)));
      const nodeRows = (CTX_DATA.nodes || []).map((n) => ({ key: String(n.port), label: `:${n.port}`, sub: n.name || (n.state === 'running' ? 'running' : 'offline'), raw: n }));
      const spaceRows = spaces.map((sp) => ({ key: String(sp.name), label: sp.name, sub: sp.status || '', raw: sp }));
      const appRows = (recent.length ? recent.map((r) => ({ key: `r-${r.app}`, label: r.title || r.app, sub: `最近 · ${r.app}`, raw: { command: r.app, title: r.title } })) : [])
        .concat(apps.map((a) => ({ key: `a-${a.command || a.name}`, label: a.title || a.command || a.name, sub: a.command || a.name, raw: a })));
      return h('div', { className: 'cx-cascade', onMouseDown: (e) => e.stopPropagation() },
        h('div', { className: 'cx-cascade-body' },
          col('服务节点 / NODE', nodeRows, T('暂无节点'), (r) => pickNode(Number(r.key)), node ? String(node) : ''),
          col('项目空间 / SPACE', spaceRows, node ? T('暂无空间') : T('先选节点'), (r) => pickSpace(r.key), eff.space || ''),
          col('最近应用 / APP', appRows, node && eff.space ? T('暂无应用') : T('先选空间'), (r) => pickApp(r.raw || {}), eff.app || '')),
        h('div', { className: 'cx-cascade-f' },
          h('span', { className: 'cx-cascade-cur' }, [node ? `:${node}` : T('未绑定节点'), eff.space || T('未选空间'), eff.app || T('未选应用')].join(' · ')),
          h('button', { className: 'cx-btn xs', onClick: () => { onOpenConfig && onOpenConfig(); } }, T('全部配置'))));
    }

    function CtxChip({ sessionId, selectView }) {
      ctxCfgUse();
      const [open, setOpen] = useState(false);
      const [cfg, setCfg] = useState(false);
      const eff = ctxCfgResolve(sessionId);
      const openCfg = () => {
        setOpen(false);
        try { if (typeof selectView === 'function') { selectView('contextos'); return; } } catch {}
        try {
          if (CX_LAYOUT && typeof CX_LAYOUT.selectView === 'function') { CX_LAYOUT.selectView('contextos'); return; }
          if (CX_LAYOUT && typeof CX_LAYOUT.openView === 'function') { CX_LAYOUT.openView('contextos'); return; }
        } catch {}
        // Last resort: click the existing conversation tab instead of opening a drawer.
        try {
          const tab = Array.from(document.querySelectorAll('button,[role=tab]')).find((el) => String(el.textContent || '').trim() === 'ContextOS');
          if (tab) { tab.click(); return; }
        } catch {}
        setCfg(true);
      };
      useEffect(() => {
        if (!open) return;
        const onDoc = (e) => { if (!e.target.closest || !e.target.closest('.cx-ctx-chipwrap')) setOpen(false); };
        document.addEventListener('mousedown', onDoc);
        return () => document.removeEventListener('mousedown', onDoc);
      }, [open]);
      return h('div', { className: 'cx-ctx-chipwrap' },
        h('button', {
          className: 'cx-ctx-chip', title: '选择服务节点 / 项目空间 / 最近应用',
          onPointerDown: (e) => { e.stopPropagation(); },
          onClick: (e) => { e.stopPropagation(); setOpen((v) => !v); },
        },
          h('span', { className: 'cx-ctx-chip-k' }, 'ContextOS'),
          h('span', { className: 'cx-ctx-chip-v' }, eff.node ? `:${eff.node}` : T('未绑定')),
          eff.space ? h('span', { className: 'cx-ctx-chip-s' }, eff.space) : null),
        open ? h(CtxCascade, { sessionId: sessionId || '', onClose: () => setOpen(false), onOpenConfig: openCfg }) : null,
        cfg ? h(CtxCenter, { sessionId: sessionId || '', onClose: () => setCfg(false) }) : null);
    }

    function CtxField({ label, children }) { return h('label', { className: 'cx-field' }, label, children); }
    function CtxSelect({ label, value, options, onChange, placeholder, inherit }) {
      return h(CtxField, { label },
        h('select', { className: 'cx-input', value: value == null ? '' : String(value), onChange: (e) => onChange(e.target.value) },
          h('option', { value: '' }, inherit ? '使用全局配置' : (placeholder || '—')),
          (options || []).map((o) => h('option', { key: String(o.value), value: String(o.value) }, o.label))));
    }

    function CtxConfigForm({ scope, sessionId }) {
      const eff = scope === 'global' ? CTX_CFG.global : ctxCfgResolve(sessionId);
      const raw = scope === 'global' ? CTX_CFG.global : ctxCfgSession(sessionId || '');
      const val = (k) => (raw[k] == null ? '' : raw[k]);
      const set = (k, v) => {
        if (scope === 'global') { ctxCfgSetGlobal(k, v); return; }
        const sid = sessionId || '';
        if (!sid) return;
        if (v === '' || v == null) delete CTX_CFG.sessions[sid][k];
        else CTX_CFG.sessions[sid] = { ...ctxCfgSession(sid), [k]: v };
        ctxCfgSave();
      };
      const node = Number(eff.node) || null;
      const spaces = (CTX_DATA.spaces[node] || []).map((s) => ({ value: s.name, label: s.name }));
      const apps = (CTX_DATA.apps[`${node}:${eff.space || ''}`] || []).map((a) => ({ value: a.command || a.name, label: a.title || a.command || a.name }));
      const avatars = (CTX_DATA.avatars || []).map((a) => ({ value: a.uid, label: a.name || a.uid }));
      const scenes = (CTX_DATA.scenes || []).map((b) => ({ value: b.id, label: b.name || b.id }));
      const inherit = scope === 'session';
      return h('div', { className: 'cx-ctx-form' },
        h(CtxSelect, { label: 'node', value: val('node'), inherit, placeholder: T('选择节点'), options: (CTX_DATA.nodes || []).map((n) => ({ value: n.port, label: `:${n.port} · ${n.name || (n.state === 'running' ? 'running' : 'offline')}` })), onChange: (v) => { set('node', v ? Number(v) : ''); set('space', ''); set('app', ''); ctxLoadSpaces(v ? Number(v) : node); } }),
        h(CtxSelect, { label: 'space', value: val('space'), inherit, placeholder: T('选择空间'), options: spaces, onChange: (v) => { set('space', v); set('app', ''); ctxLoadApps(node, v); } }),
        h(CtxSelect, { label: 'app', value: val('app'), inherit, placeholder: T('选择应用'), options: apps, onChange: (v) => set('app', v) }),
        h(CtxSelect, { label: 'avatar', value: val('avatar'), inherit, placeholder: T('选择分身'), options: avatars, onChange: (v) => set('avatar', v) }),
        h(CtxSelect, { label: 'scene', value: val('scene'), inherit, placeholder: T('选择场景'), options: scenes, onChange: (v) => set('scene', v) }),
        h(CtxSelect, { label: 'mode', value: val('mode'), inherit, placeholder: '—', options: [{ value: 'factory', label: 'factory' }, { value: 'avatar', label: 'avatar' }, { value: 'iot', label: 'iot' }], onChange: (v) => set('mode', v) }),
        scope === 'session' ? h(CtxField, { label: 'project' }, h('input', { className: 'cx-input', value: ctxCfgSession(sessionId || '').project || '', placeholder: '项目管理 place_uid', onChange: (e) => set('project', e.target.value) })) : null,
        h('div', { className: 'cx-ctx-actions' },
          h('button', { className: 'cx-btn', onClick: () => { if (scope === 'session' && sessionId) { delete CTX_CFG.sessions[sessionId]; ctxCfgSave(); } else { CTX_CFG.global = { ...CTX_CFG_DEFAULT }; ctxCfgSave(); } } }, T('重置')),
          h('button', { className: 'cx-btn pri', onClick: () => { ctxCfgSave(); ctxCallLog({ op: 'config.save', scope, node: eff.node, space: eff.space }); } }, T('保存'))));
    }

    function CtxCommands({ node, space, sessionId }) {
      const key = `${node}:${space || ''}`;
      const commands = CTX_DATA.commands[key] || [];
      const map = (sessionId && CTX_CFG.commands[sessionId]) || {};
      const [scanning, setScanning] = useState(false);
      const setCmd = (cmd, patch) => { if (!sessionId) return; CTX_CFG.commands[sessionId] = { ...map, [cmd]: { ...(map[cmd] || {}), ...patch } }; ctxCfgSave(); };
      const scan = async () => {
        if (!node || scanning) return;
        setScanning(true);
        await ctxLoadCommands(node, space);
        setScanning(false);
      };
      useEffect(() => { if (node) scan(); }, [key]);
      if (!node) return h('div', { className: 'cx-ctx-empty' }, T('先绑定节点'));
      return h('div', { className: 'cx-ctx-list' },
        h('div', { className: 'cx-ctx-actions' },
          h('span', { className: 'cx-ctx-hint' }, `${commands.length} 个命令 · 自动扫描自 :${node}${space ? ` / ${space}` : ''}`),
          h('button', { className: 'cx-btn xs', disabled: scanning, onClick: scan }, scanning ? T('扫描中…') : T('重新扫描'))),
        commands.length ? commands.map((a) => {
          const cmd = a.command || a.name;
          const st = map[cmd] || { enabled: true, purpose: a.title || a.help || '' };
          return h('div', { key: cmd, className: 'cx-ctx-cmd' },
            h('input', { type: 'checkbox', checked: st.enabled !== false, onChange: (e) => setCmd(cmd, { enabled: e.target.checked }) }),
            h('span', { className: 'nm' }, cmd),
            h('span', { className: 'cx-ctx-cmd-meta' }, a.title || a.space || ''),
            h('input', { className: 'cx-input', value: st.purpose || '', placeholder: '这个命令用来做什么', onChange: (e) => setCmd(cmd, { purpose: e.target.value }) }));
        }) : h('div', { className: 'cx-ctx-empty' }, scanning ? T('正在扫描命令…') : T('该节点/空间暂无命令，点“重新扫描”'))
      );
    }

    function CtxDev() {
      const dev = CTX_CFG.dev;
      const set = (k, v) => { CTX_CFG.dev[k] = v; ctxCfgSave(); };
      return h('div', { className: 'cx-ctx-form' },
        h('div', { className: 'cx-ctx-hint' }, '这些参数会注入 AI 造工具时的生成上下文，不需要每次在对话里重复。'),
        h(CtxField, { label: '生成空间' }, h('input', { className: 'cx-input', value: dev.space || '', placeholder: '留空则用会话空间', onChange: (e) => set('space', e.target.value) })),
        h(CtxField, { label: 'zone' }, h('input', { className: 'cx-input', value: dev.zone || '', onChange: (e) => set('zone', e.target.value) })),
        h(CtxField, { label: 'template' }, h('input', { className: 'cx-input', value: dev.template || '', onChange: (e) => set('template', e.target.value) })),
        h(CtxField, { label: '工具名前缀' }, h('input', { className: 'cx-input', value: dev.namePrefix || '', placeholder: 'cx_tool', onChange: (e) => set('namePrefix', e.target.value) })),
        h(CtxField, { label: '生成超时（秒）' }, h('input', { className: 'cx-input', type: 'number', min: '10', value: dev.timeout || 120, onChange: (e) => set('timeout', Number(e.target.value) || 120) })),
        h(CtxField, { label: '自动编译' }, h('input', { type: 'checkbox', checked: !!dev.compile, onChange: (e) => set('compile', e.target.checked) })),
        h(CtxField, { label: '注册为工具' }, h('input', { type: 'checkbox', checked: !!dev.registerAsTool, onChange: (e) => set('registerAsTool', e.target.checked) })),
        h(CtxField, { label: '允许联网' }, h('input', { type: 'checkbox', checked: !!dev.allowNetwork, onChange: (e) => set('allowNetwork', e.target.checked) })),
        h(CtxField, { label: '额外生成规范' }, h('textarea', { className: 'cx-input', rows: 4, value: dev.prompt || '', placeholder: '例如：必须使用 mdb；禁止手写 SQL；必须提供列表/创建/修改/删除…', onChange: (e) => set('prompt', e.target.value) })),
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

    function CtxCenter({ sessionId, onClose, inline }) {
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
      const head = h('div', { className: 'cx-ctx-head' },
            h('div', { className: 'cx-ctx-logo' }, 'CTX'),
            h('div', { className: 'cx-ctx-titles' },
              h('div', { className: 'cx-ctx-title' }, 'CONTEXTOS'),
              h('div', { className: 'cx-ctx-sub' }, `${T('控制台')} · v__CLIENT_CSS_VERSION__`)),
            h('div', { className: 'cx-ctx-acts' },
              h('button', { className: 'cx-icon-btn', title: T('刷新'), onClick: () => { ctxLoadNodes(); if (node) { ctxLoadSpaces(node); ctxLoadApps(node, eff.space); } } }, '↻'),
              inline ? null : h('button', { className: 'cx-ctx-x', title: T('关闭'), onClick: close }, '✕')));
      const content = h(React.Fragment, null,
        head,
        h('div', { className: 'cx-ctx-sum' },
          h('span', { className: `cx-ctx-pill${eff.node ? ' on' : ''}` }, eff.node ? `:${eff.node}` : T('未绑定节点')),
          h('span', { className: 'cx-ctx-pill' }, eff.space || T('未选空间')),
          h('span', { className: 'cx-ctx-pill' }, eff.mode || 'factory'),
          h('span', { className: 'cx-ctx-pill dim' }, eff.app || T('未选应用'))),
        h('div', { className: 'cx-ctx-tabs' }, tabs.map(([k, n]) => h('button', { key: k, className: `cx-ctx-tab${tab === k ? ' on' : ''}`, onClick: () => setTab(k) }, T(n)))),
        msg ? h('div', { className: 'cx-ctx-msg' }, msg) : null,
        h('div', { className: 'cx-ctx-body' }, body));
      // 标签态：铺满内容区，不做浮层、不显示关闭按钮
      if (inline) return h('div', { className: 'cx-ctx-inline' }, content);
      return h('div', { className: 'cx-ctx-drawer', onMouseDown: (e) => { if (e.target === e.currentTarget) close(); } },
        h('div', { className: 'cx-ctx-panel' }, content));
    }
