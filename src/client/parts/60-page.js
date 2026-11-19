    function PipeSelect({ icon, zh, value, options, onChange, title }) {
      const [open, setOpen] = useState(false);
      useEffect(() => {
        if (!open) return;
        const close = () => setOpen(false);
        const t = setTimeout(() => window.addEventListener('click', close, { once: true }), 0);
        return () => { clearTimeout(t); window.removeEventListener('click', close); };
      }, [open]);
      const opts = options || [];
      return h('div', { className: 'cx-pipe-sel' },
        h('button', {
          type: 'button', className: 'cx-stage cx-stage-title cx-stage-btn', title: title || zh,
          onClick: (e) => { e.stopPropagation(); setOpen((v) => !v); },
        },
          h(Ico, { name: icon, size: 18 }),
          h('span', { className: 'cx-aff-zh' }, zh),
          h('span', { className: 'cx-aff-value' }, value),
          h('span', { className: 'cx-pipe-caret' }, '⌄')),
        open ? h('div', { className: 'cx-pipe-menu' }, opts.length ? opts.map((o) => h('button', {
          key: String(o.value), type: 'button', className: `cx-menu-item${o.on ? ' on' : ''}`,
          onClick: (e) => { e.stopPropagation(); onChange(o.value); setOpen(false); },
        }, o.label)) : h('div', { className: 'cx-menu-item empty' }, '—')) : null);
    }

    function Page() {
      const [toast, setToast] = useState(null);
      const [dataPulse, setDataPulse] = useState(0);
      const bootSelRef = useRef(null);
      if (bootSelRef.current === null) bootSelRef.current = cxRead('sel', {});
      // 上次退出时的整套状态：节点/空间/实例/工作模式/视图/网页标签
      const bootRef = useRef(null);
      if (bootRef.current === null) bootRef.current = cxSessionGet() || {};
      const boot = bootRef.current;
      const restored = !!boot.view;
      const nodeFresh = (x) => !!x && !!(x.builtAt || x.sizeText || (x.runtime && x.runtime.builtAt));
      const [nodes, setNodes] = useState(() => cxRead('nodes', []).filter(nodeFresh));
      const nodesRef = useRef(nodes); nodesRef.current = nodes;
      const bootedRef = useRef(false);
      const [selMap, setSelMap] = useState(() => cxRead('sel-map', {}));
      const selMapRef = useRef(selMap); selMapRef.current = selMap;
      useEffect(() => cxWrite('sel-map', selMap), [selMap]);
      const rememberSel = (port, patch) => { if (!port) return; setSelMap((m) => ({ ...m, [port]: { ...(m[port] || {}), ...patch } })); };
      const appKeyOf = (a) => (a ? `${a.space || ''}:${a.command || ''}:${a.place_uid || a.name || ''}` : '');
      const [node, setNode] = useState(() => boot.node ?? bootSelRef.current?.node ?? null);
      const [spaces, setSpaces] = useState([]);
      const [space, setSpace] = useState(() => boot.space ?? bootSelRef.current?.space ?? null);
      const [apps, setApps] = useState([]);
      const [app, setApp] = useState(() => boot.app ?? bootSelRef.current?.app ?? null);
      const [modal, setModal] = useState(null);
      // 消息列表里的数据表单请求（替代 DATA 弹窗）
      const [formReq, setFormReq] = useState(null);
      const [appMode, setAppMode] = useState('recent');
      const [store, setStore] = useState([]);
      const [storeService, setStoreService] = useState(null);
      const [webTabs, setWebTabs] = useState(() => {
        try {
          const saved = Array.isArray(boot.tabs) && boot.tabs.length ? { tabs: boot.tabs, active: boot.active } : cxRead('webtabs', null);
          if (!saved || !Array.isArray(saved.tabs)) return [];
          return saved.tabs.filter((t) => t && (t.base || t.url)).slice(0, 8).map((t, i) => ({
            id: t.id || `w${Date.now().toString(36)}${i}`,
            base: t.base || t.url, url: t.base || t.url,
            title: t.title || t.base || t.url,
            reload: 0, app: t.app || null,
          }));
        } catch { return []; }
      });
      const [webLoaded, setWebLoaded] = useState({});
      const [webMenu, setWebMenu] = useState(null);
      useEffect(() => { if (!webMenu) return; const close = () => setWebMenu(null); window.addEventListener('mousedown', close); return () => window.removeEventListener('mousedown', close); }, [webMenu]);
      const [activeWeb, setActiveWeb] = useState(() => {
        if (boot.active) return boot.active;
        return cxRead('webtabs', null)?.active || null;
      });
      const [viewMode, setViewMode] = useState(() => boot.view || 'chat');
      const [intro, setIntro] = useState(null);
      const [devMounted, setDevMounted] = useState(viewMode === 'dev');
      useEffect(() => {
        if (viewMode !== 'dev' || devMounted) return;
        const t = setTimeout(() => setDevMounted(true), 160);   /* 先出过场，再挂载重型编辑器 */
        return () => clearTimeout(t);
      }, [viewMode, devMounted]);
      const [workMode, setWorkMode] = useState(() => boot.mode || cxReadText('work-mode', 'avatar'));
      useEffect(() => cxWriteText('work-mode', workMode), [workMode]);
      const [chatFull, setChatFull] = useState(() => cxReadText('chatfull', '1') === '1');
      const [themeMode, setThemeMode] = useState(() => cxReadText('theme', 'system'));

      const [opFx, setOpFx] = useState(null);
      // 版本检查：只展示结果，不在客户端发 npm 请求（服务端 4s 超时 + 30 分钟缓存）
      const [upd, setUpd] = useState(null);
      const [updOpen, setUpdOpen] = useState(false);
      const [updBusy, setUpdBusy] = useState(false);
      const checkUpd = (force) => {
        setUpdBusy(true);
        api('checkUpdate', force ? { force: true } : {})
          .then((r) => setUpd(r && r.local ? r : null))
          .catch(() => {})
          .finally(() => setUpdBusy(false));
      };
      const [pipeMenu, setPipeMenu] = useState(null);
      const [hdrCfg, setPipeCfg] = useState(false);
      const [sidebarHidden, setSidebarHidden] = useState(false);
      useEffect(() => {
        const el = shellRef.current;
        if (!el) return;
        const update = () => setSidebarHidden(el.getBoundingClientRect().left < 120);
        update();
        const ro = new ResizeObserver(update); ro.observe(el);
        const iv = setInterval(update, 2000);
        window.addEventListener('resize', update);
        return () => { ro.disconnect(); clearInterval(iv); window.removeEventListener('resize', update); };
      }, []);
      // 打开界面 1.5s 后自动查一次（避开首屏渲染），失败静默
      useEffect(() => {
        const t = setTimeout(() => checkUpd(false), 1500);
        return () => clearTimeout(t);
      }, []);
      const pipeModeLabel = (id) => {
        const m = CHAT_MODES.find((x) => x.id === id);
        if (!m) return id;
        return locale === 'zh' ? m.name : ({ avatar: 'Digital Avatar', factory: 'Software Factory', iot: 'Cyber World' }[m.id] || m.id);
      };
      const pipeViewLabel = (id) => (locale === 'zh' ? ({ chat: '对话', manage: '管理', dev: '开发', monitor: '监控', ecom: '电商' }[id] || id) : String(id || '').toUpperCase());
      const openPipe = (e, title, items, icon) => {
        try { e.stopPropagation(); e.preventDefault(); } catch {}
        const r = e.currentTarget.getBoundingClientRect();
        const top = Math.min(r.bottom + 4, Math.max(80, (window.innerHeight || 800) - 340));
        setPipeMenu({ x: Math.round(r.left), y: Math.round(top), title, items, icon });
      };
      useEffect(() => {
        const onFloat = (e) => { const d = e && e.detail; if (!d) return; setPipeMenu({ x: d.x, right: d.right, y: d.y, title: d.title, items: d.items, icon: d.icon }); };
        window.addEventListener('cx-float-menu', onFloat);
        return () => window.removeEventListener('cx-float-menu', onFloat);
      }, []);
      useEffect(() => {
        if (!pipeMenu) return;
        const close = () => setPipeMenu(null);
        const t = setTimeout(() => window.addEventListener('click', close, { once: true }), 0);
        return () => { clearTimeout(t); window.removeEventListener('click', close); };
      }, [pipeMenu]);
      // 鼠标跟随光效：--mx/--my 驱动光晕与光标环
      useEffect(() => {
        const el = shellRef.current;
        if (!el) return;
        let raf = 0;
        const onMove = (e) => {
          if (raf) return;
          raf = requestAnimationFrame(() => {
            raf = 0;
            const r = el.getBoundingClientRect();
            el.style.setProperty('--mx', `${Math.round(e.clientX - r.left)}px`);
            el.style.setProperty('--my', `${Math.round(e.clientY - r.top)}px`);
            el.style.setProperty('--cx-cursor', '1');
          });
        };
        const onLeave = () => { try { el.style.setProperty('--cx-cursor', '0'); } catch {} };
        el.addEventListener('pointermove', onMove, { passive: true });
        el.addEventListener('pointerleave', onLeave);
        return () => { el.removeEventListener('pointermove', onMove); el.removeEventListener('pointerleave', onLeave); cancelAnimationFrame(raf); };
      }, []);
      useEffect(() => {
        const onOp = (e) => {
          const kind = e?.detail?.kind;
          if (!kind) return;
          setOpFx({ kind, key: Date.now() });
          try { window.__cxOpSfx && window.__cxOpSfx(kind); } catch {}
        };
        window.addEventListener('cx-data-op', onOp);
        return () => window.removeEventListener('cx-data-op', onOp);
      }, []);
      const [fx, setFx] = useState(() => ({ ...cxStoreDef('fx'), ...cxRead('fx', {}) }));
      useEffect(() => cxWrite('fx', fx), [fx]);
      const fxSet = (k, v) => setFx((x) => ({ ...x, [k]: v }));
      const [theme, setTheme] = useState(() => { const sys = (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) ? 'light' : 'dark'; const m = cxReadText('theme', 'system'); return m === 'system' ? sys : m; });
      const lightTheme = themeMode === 'light' || theme === 'light';
      const [langMode, setLangMode] = useState(() => cxReadText('lang', 'system'));
      const prefsReadyRef = useRef(false);
      useEffect(() => {
        (async () => {
          try {
            const st = await api('stateGet');
            const p = st && st.prefs;
            if (p && typeof p === 'object') {
              if (p.theme) { setThemeMode(p.theme); cxWriteText('theme', p.theme); }
              if (p.lang) { setLangMode(p.lang); cxWriteText('lang', p.lang); }
              if (p.view) setViewMode(p.view);
              if (p.work) setWorkMode(p.work);
            }
          } catch {}
          prefsReadyRef.current = true;
        })();
      }, []);
      useEffect(() => {
        if (!prefsReadyRef.current) return;
        const tmr = setTimeout(() => { try { api('stateSet', { name: 'prefs', value: { theme: themeMode, lang: langMode, view: viewMode, work: workMode } }).catch(() => {}); } catch {} }, 800);
        return () => clearTimeout(tmr);
      }, [themeMode, langMode, viewMode, workMode]);

      useEffect(() => {
        /* 实测回报：把真实 DOM 的计算字号与 bundle 版本写入服务端，便于核对 */
        let tries = 0;
        const timer = setInterval(() => {
          tries += 1;
          const el = document.querySelector('.cx-compose-input');
          if (!el && tries < 10) return;
          clearInterval(timer);
          try {
            const cs = el ? window.getComputedStyle(el) : null;
            api('stateSet', { name: 'clientCheck', value: {
              at: new Date().toISOString(),
              version: String(CLIENT_CSS).split('?v=')[1] || '',
              found: !!el,
              count: document.querySelectorAll('.cx-compose-input').length,
              fontSize: cs ? cs.fontSize : '',
              lineHeight: cs ? cs.lineHeight : '',
              inline: el ? (el.style.getPropertyValue('font-size') || '') : '',
              dpr: window.devicePixelRatio || 1,
              build: CLIENT_BUILD,
              /* 浮层定位诊断：最近 6 次锚点/实际/写入坐标，定位「面板跑偏」不用再靠截图 */
              pops: (typeof CX_POP_LOG === 'undefined' ? [] : CX_POP_LOG.slice(-6)),
              css: Array.from(document.querySelectorAll('link[data-cx-client-css]')).map((l) => String(l.getAttribute('href') || '')),
              /* 布局自检：新 JS 配旧 CSS 时，下面几项会立刻暴露（如 main=flex/row、tools 无边距） */
              layout: (() => {
                try {
                  const m = document.querySelector('.cx-msg');
                  if (!m) return 'no-message';
                  const pick = (sel) => { const n = m.querySelector(sel); if (!n) return '-'; const c = window.getComputedStyle(n); return `${c.display}/${c.flexDirection}/${c.marginLeft}/${c.opacity}`; };
                  return `main=${pick('.cx-msg-main')} meta=${pick('.cx-msg-meta')} tools=${pick('.cx-msg-tools')}`;
                } catch { return 'err'; }
              })(),
              /* 几何自检：正文占比与工具栏右边距，比字符串更能证明「看起来对不对」 */
              geo: (() => {
                try {
                  const m = document.querySelector('.cx-msg.ai') || document.querySelector('.cx-msg');
                  if (!m) return null;
                  const r = m.getBoundingClientRect();
                  const t = m.querySelector('.cx-msg-tools');
                  const b = m.querySelector('.cx-msg-body');
                  const tr = t ? t.getBoundingClientRect() : null;
                  const br = b ? b.getBoundingClientRect() : null;
                  return {
                    card: [Math.round(r.width), Math.round(r.height)],
                    toolsRightGap: tr ? Math.round(r.right - tr.right) : null,
                    bodyRatio: br && r.width ? Number((br.width / r.width).toFixed(2)) : null,
                  };
                } catch { return null; }
              })(),
              /* DOM 取证：把第一条消息的真实结构与每层盒模型抄回来，无需再截图 */
              dom: (() => {
                try {
                  const m = document.querySelector('.cx-msg.ai') || document.querySelector('.cx-msg');
                  if (!m) return null;
                  const box = (sel) => {
                    const n = sel ? m.querySelector(sel) : m;
                    if (!n) return null;
                    const r = n.getBoundingClientRect(); const c = window.getComputedStyle(n);
                    return { w: Math.round(r.width), h: Math.round(r.height), x: Math.round(r.x),
                      d: c.display, fd: c.flexDirection, fg: c.flexGrow, ml: c.marginLeft, wd: c.width };
                  };
                  return { html: String(m.outerHTML || '').slice(0, 500),
                    card: box(null), main: box('.cx-msg-main'), meta: box('.cx-msg-meta'), tools: box('.cx-msg-tools'), body: box('.cx-msg-body') };
                } catch { return null; }
              })(),
              /* 吸顶自检：每节的标题/当前卡片的实际高度与写进 CSS 变量的偏移，逐对核对 */
              pins: (() => {
                try {
                  const out = [];
                  document.querySelectorAll('.cx-pm-side .cx-pm-sec').forEach((sec) => {
                    const h = sec.querySelector('.cx-pm-h');
                    const c = sec.querySelector('.cx-pm-card.on');
                    if (!h) return;
                    out.push({
                      k: String(h.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 14),
                      top: h.style.getPropertyValue('--pm-top'),
                      headH: h.offsetHeight,
                      cardTop: c ? c.style.getPropertyValue('--pm-card-top') : '',
                      cardH: c ? c.offsetHeight : null,
                    });
                  });
                  return out.slice(0, 8);
                } catch { return null; }
              })(),
            } }).catch(() => {});
          } catch {}
        }, 400);
        return () => clearInterval(timer);
      }, []);
      const [locale, setLocale] = useState(() => { const m = cxReadText('lang', 'system'); return m === 'system' ? browserLang() : m; });
      CURRENT_LANG = locale === 'zh' ? 'zh' : 'en';
      const bootConsole = cxRead('console', {});
      const [consoleOpen, setConsoleOpen] = useState(bootConsole.open === true);
      const [consoleMax, setConsoleMax] = useState(false);
      const consoleBoxRef = useRef(null);
      useEffect(() => { if (!consoleMax) return; return cxMaxApply(consoleBoxRef.current, { offsetTop: 44 }); }, [consoleMax]);
      const [consoleTab, setConsoleTab] = useState(bootConsole.tab || 'activity');
      const [termSplit, setTermSplit] = useState(false);
      const consoleOpenRef = useRef(consoleOpen); consoleOpenRef.current = consoleOpen;
      const viewModeRef = useRef(viewMode); viewModeRef.current = viewMode;
      const initialReqLog = cxRead('reqlog', []);
      const reqLogRef = useRef(initialReqLog);
      const [reqLog, setReqLog] = useState(initialReqLog);
      useEffect(() => cxWrite('reqlog', reqLog.slice(-50)), [reqLog]);
      const pushReq = (e) => {
        try {
          reqLogRef.current = [...reqLogRef.current, e].slice(-50);
          if (consoleOpenRef.current) setReqLog(reqLogRef.current);
        } catch {}
      };
      const saveRemote = (name, value) => { try { api('stateSet', { name, value }).catch(() => {}); } catch {} };
      useEffect(() => { const t = setTimeout(() => { if (reqLog.length) saveRemote('reqlog', reqLog); }, 900); return () => clearTimeout(t); }, [reqLog]);
      useEffect(() => { const t = setTimeout(() => { if (Object.keys(selMap).length) saveRemote('selMap', selMap); }, 900); return () => clearTimeout(t); }, [selMap]);
      useEffect(() => {
        (async () => {
          try {
            const st = await api('stateGet');
            if (!st) return;
            if (Array.isArray(st.reqlog) && st.reqlog.length) { reqLogRef.current = st.reqlog.slice(-50); setReqLog((cur) => (cur.length >= st.reqlog.length ? cur : reqLogRef.current)); }
            if (st.selMap && typeof st.selMap === 'object') setSelMap((cur) => (Object.keys(cur).length ? cur : st.selMap));
          } catch {}
        })();
      }, []);
      const [consoleHeight, setConsoleHeight] = useState(Number(bootConsole.height) || 190);
      const [events, setEvents] = useState([]);
      const [sort, setSort] = useState(() => { const v = cxRead('console', {}); return v.sort && v.sort.key ? v.sort : { key: '', dir: 1 }; });
      const [detail, setDetail] = useState(null);
      const parseDebug = (m) => {
        const text = String(m || '').trim().replace(/^↳\s*/, '');
        const mm = /^(GET|POST|PUT|DELETE|PATCH)\s+(\S+)([\s\S]*)$/i.exec(text);
        return mm ? { method: mm[1].toUpperCase(), url: mm[2], rest: mm[3], raw: text } : { method: '', url: text, rest: '', raw: text };
      };
      const [files, setFiles] = useState(null);
      useEffect(() => cxWrite('console', { open: consoleOpen, tab: consoleTab, height: consoleHeight, sort }), [consoleOpen, consoleTab, consoleHeight, sort]);
      useEffect(() => {
        const onToast = (e) => setToast({ id: Date.now(), text: String(e?.detail?.text || ''), kind: e?.detail?.kind || 'ok' });
        window.addEventListener('cx-toast', onToast);
        return () => window.removeEventListener('cx-toast', onToast);
      }, []);
      useEffect(() => {
        if (!toast) return;
        const t = setTimeout(() => setToast(null), toast.kind === 'err' ? 4200 : 2600);
        return () => clearTimeout(t);
      }, [toast]);
      const loadPref = (k, d) => cxRead(k, d);
      const [nodeStatusFilter, setNodeStatusFilter] = useState(() => [...new Set((loadPref('filter-node', []) || []).map((v) => (v === 'running' ? 'running' : 'offline')))]);
      const [spaceStatusFilter, setSpaceStatusFilter] = useState(() => [...new Set((loadPref('filter-space', []) || []).map((v) => (v === 'running' || v === 'start' ? 'running' : 'stopped')))]);
      const [appSpaceFilter, setAppSpaceFilter] = useState(() => loadPref('filter-app', []));
      const [storeSpaceFilter, setStoreSpaceFilter] = useState(() => loadPref('filter-store', []));
      useEffect(() => cxWrite('filter-node', nodeStatusFilter), [nodeStatusFilter]);
      useEffect(() => cxWrite('filter-space', spaceStatusFilter), [spaceStatusFilter]);
      useEffect(() => cxWrite('filter-app', appSpaceFilter), [appSpaceFilter]);
      useEffect(() => cxWrite('filter-store', storeSpaceFilter), [storeSpaceFilter]);
      const t = useCallback((key) => term(locale, key), [locale]);
      const tp = useCallback((key) => locale === 'zh' ? `${term('zh', key)} / ${term('en', key)}` : term('en', key), [locale]);
      useEffect(() => {
        const mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: light)') : null;
        const apply = () => setTheme(themeMode === 'system' ? (mq && mq.matches ? 'light' : 'dark') : themeMode);
        apply();
        if (!mq) return;
        mq.addEventListener?.('change', apply);
        return () => mq.removeEventListener?.('change', apply);
      }, [themeMode]);
      useEffect(() => {
        const apply = () => setLocale(langMode === 'system' ? browserLang() : langMode);
        apply();
        window.addEventListener?.('languagechange', apply);
        return () => window.removeEventListener?.('languagechange', apply);
      }, [langMode]);
      useEffect(() => cxWriteText('theme', themeMode), [themeMode]);
      const restoredRef = useRef(restored);
      useEffect(() => {
        if (lightTheme) return;                   /* 浅色主题不播过场 */
        if (restoredRef.current) { restoredRef.current = false; return; }   /* 从快照恢复：直接进界面，不播过场 */
        if (MODE_INTRO_SEEN.has(viewMode)) return;
        MODE_INTRO_SEEN.add(viewMode);
        setIntro(viewMode);
      }, [viewMode, lightTheme]);

      useEffect(() => cxWriteText('lang', langMode), [langMode]);
      useEffect(() => cxWriteText('view', viewMode), [viewMode]);
      useEffect(() => cxWriteText('chatfull', chatFull ? '1' : '0'), [chatFull]);
      const shellRef = useRef(null);
      useEffect(() => {
        if (fx.sound === 'off') return;
        let ac = null;
        const ctx = () => { ac = ac || new (window.AudioContext || window.webkitAudioContext)(); return ac; };
        const tone = (freq, dur, gain, type = 'sine', slide) => {
          try {
            const a = ctx();
            const o = a.createOscillator(); const g = a.createGain();
            o.type = type; o.frequency.value = freq;
            if (slide) o.frequency.exponentialRampToValueAtTime(slide, a.currentTime + dur);
            g.gain.value = gain; o.connect(g); g.connect(a.destination);
            const t0 = a.currentTime; g.gain.setValueAtTime(gain, t0);
            g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
            o.start(t0); o.stop(t0 + dur);
          } catch {}
        };
        const noise = (dur, gain) => {
          try {
            const a = ctx();
            const b = a.createBuffer(1, Math.max(1, Math.floor(a.sampleRate * dur)), a.sampleRate);
            const d = b.getChannelData(0);
            for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
            const src = a.createBufferSource(); src.buffer = b;
            const f = a.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 2600;
            const g = a.createGain(); g.gain.value = gain;
            src.connect(f); f.connect(g); g.connect(a.destination); src.start();
          } catch {}
        };
        const play = (kind) => {
          if (kind === 'key') {
            if (fx.sound === 'cs') { noise(0.015, 0.03); return; }
            if (fx.sound === 'ra' || fx.sound === 'sc2') { tone(1200, 0.015, 0.02, 'square'); return; }
            if (fx.sound === 'wow') { tone(620, 0.02, 0.018, 'triangle'); return; }
            if (fx.sound === 'chip') { tone(880, 0.015, 0.02, 'square'); return; }
            tone(980, 0.018, 0.018);
            return;
          }
          if (fx.sound === 'cs') {
            if (kind === 'click') { noise(0.07, 0.16); tone(150, 0.06, 0.05, 'square', 80); }
            else noise(0.02, 0.05);
          } else if (fx.sound === 'ra') {
            if (kind === 'click') { tone(540, 0.06, 0.05, 'square'); setTimeout(() => tone(780, 0.07, 0.05, 'square'), 60); }
            else tone(1400, 0.02, 0.02, 'square');
          } else if (fx.sound === 'wow') {
            if (kind === 'click') { tone(196, 0.16, 0.06, 'sawtooth', 147); setTimeout(() => tone(294, 0.18, 0.05, 'triangle'), 90); }
            else tone(392, 0.04, 0.02, 'triangle');
          } else if (fx.sound === 'sc2') {
            if (kind === 'click') { tone(1568, 0.05, 0.04, 'square'); setTimeout(() => tone(2093, 0.05, 0.035, 'square'), 55); }
            else tone(2093, 0.02, 0.02, 'square');
          } else if (fx.sound === 'chip') {
            if (kind === 'click') { [660, 880, 1320].forEach((f, i) => setTimeout(() => tone(f, 0.06, 0.04, 'square'), i * 55)); }
            else tone(1760, 0.02, 0.02, 'square');
          } else {
            if (kind === 'click') tone(880, 0.07, 0.05);
            else tone(1320, 0.03, 0.02);
          }
        };
        const opSound = (k) => {
          if (fx.sound === 'off') return;
          const seq = { create: [[523, 0.06], [659, 0.06], [784, 0.09]], update: [[880, 0.05], [1174, 0.06]], delete: [[330, 0.07], [196, 0.1]], refresh: [[1400, 0.04], [1800, 0.03]] }[k] || [];
          if (fx.sound === 'cs') {
            if (k === 'create') { noise(0.05, 0.12); setTimeout(() => noise(0.05, 0.12), 80); }
            else if (k === 'update') noise(0.05, 0.1);
            else if (k === 'delete') tone(120, 0.12, 0.08, 'square', 70);
            else noise(0.03, 0.06);
            return;
          }
          const type = fx.sound === 'ra' || fx.sound === 'chip' ? 'square' : fx.sound === 'wow' ? 'sawtooth' : 'sine';
          seq.forEach(([f, d], i) => setTimeout(() => tone(f, d, 0.05, type), i * 70));
        };
        window.__cxOpSfx = opSound;
        const onClick = () => play('click');
        const onOver = (e) => { if (e.target.closest('.cx-btn, .cx-sel-btn, .cx-drop, .cx-compose-plus, .cx-compose-send')) play('hover'); };
        const el = shellRef.current;
        if (!el) return;
        const onKey = (e) => {
          if (e.ctrlKey || e.metaKey || e.altKey) return;
          if (e.key.length === 1 || e.key === 'Backspace' || e.key === 'Enter') play('key');
        };
        el.addEventListener('click', onClick, true);
        el.addEventListener('pointerover', onOver, true);
        el.addEventListener('keydown', onKey, true);
        return () => { el.removeEventListener('click', onClick, true); el.removeEventListener('pointerover', onOver, true); el.removeEventListener('keydown', onKey, true); try { delete window.__cxOpSfx; } catch {} };
      }, [fx.sound]);
      // 切换管理模式/对话模式时，让当前选中的卡片闪一下
      useEffect(() => {
        const el = shellRef.current;
        if (!el) return;
        el.classList.remove('cx-view-flash');
        void el.offsetWidth;
        el.classList.add('cx-view-flash');
        const t = setTimeout(() => { try { el.classList.remove('cx-view-flash'); } catch {} }, 1500);
        return () => clearTimeout(t);
      }, [viewMode]);
      React.useLayoutEffect(() => {
        const el = shellRef.current; if (!el) return;
        const check = () => {
          try {
            const rect = el.getBoundingClientRect();
            el.style.setProperty('--cx-shell-left', rect.left + 'px');
            el.style.setProperty('--cx-shell-top', rect.top + 'px');
            el.style.setProperty('--cx-shell-width', rect.width + 'px');
            el.style.setProperty('--cx-shell-height', rect.height + 'px');
            const left = rect.left;
            const target = parseFloat(getComputedStyle(el).getPropertyValue('--cx-host-left')) || 168;
            const pad = left < 120 ? Math.max(0, target - 16 - left) : 0;
            el.style.setProperty('--cx-host-left-pad', pad + 'px');
            el.classList.toggle('host-chrome', pad > 0);
          } catch {}
        };
        check();
        const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(check) : null;
        if (ro) { ro.observe(el); ro.observe(document.documentElement); }
        window.addEventListener('resize', check);
        const t = setTimeout(check, 400);
        return () => { if (ro) ro.disconnect(); window.removeEventListener('resize', check); clearTimeout(t); };
      }, []);
      const [initState, setInitState] = useState(null);
      const [welcome, setWelcome] = useState(null);
      const prevInit = useRef(null);
      useEffect(() => {
        const now = !!initState;
        const was = !!prevInit.current;
        prevInit.current = now;
        if (now === was) return;
        /* 浅色主题：进入初始化时不播，初始化完成后的 READY 保留 */
        if (now && lightTheme) { setWelcome(null); return; }
        setWelcome(now ? { title: 'INITIALIZE', sub: 'CONTEXTOS · SETUP' } : { title: 'READY', sub: 'CONTEXTOS · ONLINE' });
      }, [initState]);

      const [nodesLoaded, setNodesLoaded] = useState(() => cxRead('nodes', []).length > 0);
      const autoInitRef = useRef(false);
      const initBusyRef = useRef(false);
      const [showDevices, setShowDevices] = useState(false);
      const [avatarData, setAvatarData] = useState({ active: '', items: [] });
      const [bgData, setBgData] = useState({ active: '', items: [] });
      const [bg, setBg] = useState(null);
      const [avatar, setAvatar] = useState(null);
      // 任一状态变化都写回整份快照（节流 400ms，pagehide 兜底 flush）
      useEffect(() => {
        cxSessionSave({
          node, space, app, view: viewMode, mode: workMode,
          tabs: webTabs.map((t) => ({ base: t.base || t.url, title: t.title, app: t.app || null })),
          active: activeWeb,
          avatar: avatar?.uid || '', world: bg?.id || '',
          chatFull, console: { open: consoleOpen, tab: consoleTab, height: consoleHeight },
        });
      }, [node, space, app, viewMode, workMode, webTabs, activeWeb, avatar, bg, chatFull, consoleOpen, consoleTab, consoleHeight]);
      const [showAvatars, setShowAvatars] = useState(false);
      const [busy, setBusy] = useState('');
      const [error, setError] = useState('');
      const initialLogs = [{ t: new Date().toLocaleTimeString(), m: 'CONTROL PLANE READY · 选择节点开始', k: 'ok' }];
      const logsRef = useRef(initialLogs);
      const [logs, setLogs] = useState(initialLogs);
      const [debug, setDebug] = useState([]);
      const logRef = useRef(null);
      const log = useCallback((m, k = '') => {
        if (ACTIVITY.fn !== log) { ACTIVITY.fn = log; const buf = ACTIVITY.buf.splice(0); buf.forEach((x) => log(x.m, x.k)); }
        const entry = { t: new Date().toLocaleTimeString(), m, k, el: LOCATE.last || '' };
        logsRef.current = [...logsRef.current.slice(-80), entry];
        if (consoleOpenRef.current) setLogs(logsRef.current);
        setTimeout(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; }, 30);
      }, []);
      useEffect(() => {
        const onDown = (e) => { LOCATE.last = locatable(e.target); };
        document.addEventListener('pointerdown', onDown, true);
        return () => document.removeEventListener('pointerdown', onDown, true);
      }, []);
      useEffect(() => {
        if (!consoleOpen) return;
        setLogs(logsRef.current);
        setReqLog(reqLogRef.current);
      }, [consoleOpen]);
      useEffect(() => {
        const buf = [];
        let timer = 0;
        const flush = () => {
          timer = 0;
          if (!buf.length) return;
          const batch = buf.splice(0);
          setDebug((ds) => [...ds.slice(-200), ...batch].slice(-200));
        };
        const onDebug = (e) => {
          if (!consoleOpenRef.current && viewModeRef.current !== 'dev') return;
          const text = String(e?.detail?.text || '');
          if (!text) return;
          buf.push({ t: new Date().toLocaleTimeString(), m: text, method: String(e?.detail?.method || ''), url: String(e?.detail?.url || ''), request: e?.detail?.request || null, requestHeaders: e?.detail?.requestHeaders || {}, response: e?.detail?.response || null, responseHeaders: e?.detail?.responseHeaders || {}, status: e?.detail?.status || 0, size: e?.detail?.size || 0, ms: e?.detail?.ms || 0, logId: String(e?.detail?.logId || ''), el: LOCATE.last || '' });
          if (!timer) timer = setTimeout(flush, 80);
        };
        window.addEventListener('cx-debug', onDebug);
        return () => { clearTimeout(timer); window.removeEventListener('cx-debug', onDebug); };
      }, []);
      useEffect(() => {
        const buf = [];
        let timer = 0;
        const flush = () => {
          timer = 0;
          if (!buf.length) return;
          const batch = buf.splice(0);
          setEvents((xs) => [...xs.slice(-399), ...batch].slice(-400));
        };
        const push = (entry) => {
          buf.push(entry);
          if (!timer) timer = setTimeout(flush, 80);
        };
        const onEvent = (e) => {
          if (!consoleOpenRef.current && viewModeRef.current !== 'dev') return;
          const d = e?.detail || {};
          const at = new Date().toISOString().slice(11, 23);
          push({ id: `${at}-${Math.random().toString(36).slice(2, 6)}`, at, kind: d.kind || 'event', text: String(d.text || ''), ok: d.ok !== false, ms: d.ms, error: String(d.error || ''), el: LOCATE.last || '' });
        };
        const onClick = (e) => {
          if (!consoleOpenRef.current && viewModeRef.current !== 'dev') return;
          const btn = e.target && e.target.closest ? e.target.closest('button, .cx-menu-item, .cx-pm-card, .cx-chip, [role="button"]') : null;
          if (!btn) return;
          const label = String(btn.getAttribute('title') || btn.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 40);
          const cls = String(btn.className || '').split(' ').slice(0, 2).join('.');
          const at = new Date().toISOString().slice(11, 23);
          push({ id: `${at}-${Math.random().toString(36).slice(2, 6)}`, at, kind: 'click', text: `${cls} · ${label}`, ok: true, el: locatable(btn) });
        };
        window.addEventListener('cx-event', onEvent);
        document.addEventListener('click', onClick, true);
        return () => { clearTimeout(timer); window.removeEventListener('cx-event', onEvent); document.removeEventListener('click', onClick, true); };
      }, []);
      useEffect(() => { setSort({ key: '', dir: 1 }); setDetail(null); }, [consoleTab]);
      useEffect(() => { if (consoleTab !== 'files') return; api('files').then(setFiles).catch(() => setFiles({ error: 'files 接口不可用（重启 DSH 后生效）', files: [] })); }, [consoleTab]);
      useEffect(() => {
        const el = logRef.current;
        if (!el) return;
        setTimeout(() => { if (el) el.scrollTop = el.scrollHeight; }, 30);
      }, [logs, debug, events, files, consoleTab]);
      const stateRows = (() => {
        if (consoleTab !== 'state') return [];
        const liveRows = [
          { k: '', t: 'LIVE node', m: String(node ?? '') },
          { k: '', t: 'LIVE space', m: space || '' },
          { k: '', t: 'LIVE app', m: app?.name || '' },
          { k: '', t: 'LIVE avatar', m: avatar?.name || '' },
          { k: '', t: 'LIVE scene', m: bg?.name || '' },
          { k: '', t: 'LIVE view', m: viewMode },
          { k: '', t: 'LIVE locale', m: locale },
        ];
        try {
          return [...liveRows, ...cxStoreDump().map((x) => ({ k: 'ok', t: x.key, m: String(x.value || '').slice(0, 260) }))];
        } catch { return liveRows; }
      })();
      const prettyJson = (v) => { try { return JSON.stringify(JSON.parse(v), null, 2); } catch { return String(v ?? ''); } };
      const rowKey = (r) => `${r.t}|${r.req || r.text || r.m || ''}`;
      const locate = useCallback((id) => {
        if (!id) return;
        const el = document.querySelector('[data-cx-id="' + String(id).replace(/"/g, '') + '"]');
        if (!el) { log(`定位失败：控件 ${id} 不在当前视图`, 'err'); return; }
        try { el.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch { el.scrollIntoView(); }
        el.classList.remove('cx-locate-flash');
        void el.offsetWidth;
        el.classList.add('cx-locate-flash');
        setTimeout(() => { try { el.classList.remove('cx-locate-flash'); } catch {} }, 1800);
        log(`定位到控件 ${id}`, 'info');
      }, [log]);
      const openDetail = (r) => {
        if (r && r.el) locate(r.el);
        const key = rowKey(r);
        if (consoleTab === 'request') {
          const it = r.raw || {};
          const u = it.usage || {};
          const cost = (() => { const c = u.cost ?? u.total_cost ?? u.total_price; if (c !== undefined && c !== null) return String(c); const i = Number(u.input_tokens || u.prompt_tokens || 0); const o = Number(u.output_tokens || u.completion_tokens || 0); return (i || o) ? `≈¥${((i * 0.000002) + (o * 0.000008)).toFixed(6)}` : '—'; })();
          setDetail({
            key, row: r, title: '',
            fields: [['TIME', new Date(it.at).toLocaleString()], ['MS', it.ms], ['BYTES', `↑${it.reqBytes || 0} ↓${it.resBytes || 0}`], ['TOKENS', it.tokens], ['COST', cost], ['MODE/VIEW', `${it.mode || '-'} / ${(it.context && it.context.view) || '-'}`]],
            body: `REQUEST:\n${it.message || ''}\n\nPARAMS:\n${JSON.stringify(it.context || {}, null, 2)}\n\nRESPONSE:\n${it.reply || ''}${it.action ? `\n\nACTION:\n${JSON.stringify(it.action, null, 2)}` : ''}`,
          });
          return;
        }
        if (consoleTab === 'activity') { setDetail({ key, row: r, title: 'ACTIVITY', fields: [['TIME', r.t], ['TYPE', r.k || '—'], ['MESSAGE', r.m]] }); return; }
        if (consoleTab === 'events') { setDetail({ key, row: r, title: 'EVENT', fields: [['TIME', r.t], ['KIND', r.kind], ['RESULT', r.ok], ['MS', r.ms ?? '—']], body: r.text }); return; }
        if (consoleTab === 'debug') { traceDebugRow(r); setDetail({ key, row: r, node, space, title: '', fields: [['TIME', r.t], ['LOG.ID', r.logId || '—'], ['STATUS', r.status || '—'], ['MS', `${r.ms || 0} ms`], ['BYTES', `${r.size || 0} B`], ['METHOD', r.method], ['CMD', debugCmdOf(r.req)], ['ACTION', debugActionOf(r.req)], ['URL', r.req], ...debugMetaFields(r)], requestHeaders: r.requestHeaders || {}, responseHeaders: r.responseHeaders || {}, body: r.response ? JSON.stringify(r.response, null, 2) : (typeof r.raw === 'string' ? r.raw : ''), table: debugResponseTable(r), params: debugParamsOf(r) }); return; }
        if (consoleTab === 'state') { setDetail({ key, row: r, title: 'STATE', fields: [['KEY', r.t]], body: prettyJson(r.m) }); return; }
        if (consoleTab === 'files') {
          setDetail({ key, row: r, title: 'FILE', fields: [['NAME', r.t], ['SIZE', r.m], ['MODIFIED', r.x]], body: '加载中…' });
          if (r.t && r.t !== 'DIR') {
            api('file', { name: r.t }).then((d) => setDetail((cur) => (cur && cur.key === key ? { ...cur, body: d.content } : cur)))
              .catch((e) => setDetail((cur) => (cur && cur.key === key ? { ...cur, body: String(e?.message || e) } : cur)));
          }
        }
      };
      const consoleTable = (() => {
        if (consoleTab === 'activity') return { cols: [{ k: 't', label: 'TIME' }, { k: 'k', label: 'TYPE' }, { k: 'm', label: 'MESSAGE' }, { k: 'loc', label: '' }], rows: logs.map((l) => ({ ...l, loc: l.el ? '⌖' : '' })) };
        if (consoleTab === 'request') return { cols: [{ k: 't', label: 'TIME' }, { k: 'ms', label: 'MS' }, { k: 'tokens', label: 'TOKENS' }, { k: 'msg', label: 'MESSAGE' }], rows: (reqLog || []).map((r) => ({ t: new Date(r.at).toLocaleTimeString(), ms: r.ms, tokens: r.tokens, msg: String(r.message || '').replace(/\s+/g, ' ').slice(0, 120), raw: r })) };
        if (consoleTab === 'events') return { cols: [{ k: 't', label: 'TIME' }, { k: 'kind', label: 'KIND' }, { k: 'text', label: 'DETAIL' }, { k: 'ms', label: 'MS' }, { k: 'ok', label: 'RESULT' }], rows: events.map((e) => ({ t: e.at, kind: String(e.kind || '').toUpperCase(), text: `${e.text}${e.error ? ` · ${e.error}` : ''}`, ms: e.ms ?? '', ok: e.ok === false ? 'ERR' : 'OK', el: e.el, loc: e.el ? '⌖' : '' })) };
        if (consoleTab === 'debug') return { cols: [{ k: 't', label: 'TIME' }, { k: 'status', label: 'STATUS' }, { k: 'ms', label: 'MS' }, { k: 'method', label: 'METHOD' }, { k: 'cmd', label: 'CMD' }, { k: 'action', label: 'ACTION' }, { k: 'req', label: 'URL' }, { k: 'loc', label: '' }], rows: debug.map((l) => { const p = parseDebug(l.m); const url = l.url || p.url; return { t: l.t, status: l.status || '', ms: l.ms || '', method: l.method || p.method || '—', cmd: debugCmdOf(url), action: debugActionOf(url), req: url, rest: p.rest, raw: l.response ? l : p.raw, response: l.response, requestHeaders: l.requestHeaders, responseHeaders: l.responseHeaders, logId: l.logId, size: l.size, request: l.request, el: l.el, loc: l.el ? '⌖' : '' }; }) };
        if (consoleTab === 'state') return { cols: [{ k: 't', label: 'KEY' }, { k: 'm', label: 'VALUE' }], rows: stateRows };
        if (consoleTab === 'files') {
          if (files?.error) return { cols: [{ k: 't', label: 'ERROR' }], rows: [{ t: files.error }] };
          const rows = (files?.files || []).map((f) => ({ t: f.name, m: f.size, x: f.mtime }));
          if (files?.dir) rows.unshift({ t: 'DIR', m: '', x: files.dir });
          return { cols: [{ k: 't', label: 'FILE' }, { k: 'm', label: 'SIZE' }, { k: 'x', label: 'MODIFIED' }], rows };
        }
        return { cols: [], rows: [] };
      })();
      const sortKey = sort.key && consoleTable.cols.some((c) => c.k === sort.key) ? sort.key : (consoleTable.cols[0]?.k || '');
      const sortedRows = (() => {
        const dir = sort.dir || 1;
        return [...consoleTable.rows].sort((a, b) => {
          const va = a[sortKey], vb = b[sortKey];
          const na = Number(va), nb = Number(vb);
          if (String(va ?? '').trim() !== '' && String(vb ?? '').trim() !== '' && !Number.isNaN(na) && !Number.isNaN(nb)) return (na - nb) * dir;
          return String(va ?? '').localeCompare(String(vb ?? '')) * dir;
        });
      })();
      const showToast = (text, kind = 'ok') => { try { window.dispatchEvent(new CustomEvent('cx-toast', { detail: { text, kind } })); } catch {} };
      const act = useCallback(async (label, fn) => {
        setBusy(label); setError('');
        log(`→ ${label}`, 'run');
        try { const r = await fn(); log(`✓ ${label}`, 'ok'); if (!/^LOAD /i.test(label)) { showToast(label, 'ok'); setDataPulse((x) => x + 1); } return r; }
        catch (e) { const m = String(e?.message || e); setError(m); log(`✗ ${label}: ${m}`, 'err'); showToast(`${label}: ${m}`, 'err'); return undefined; }
        finally { setBusy(''); }
      }, [log]);

      const loadNodes = useCallback(async () => {
        const d = await api('nodes');
        const list = d.nodes || [];
        setNodes(list);
        setNodesLoaded(true);
        activity(`加载节点 ${list.length} 个（${list.filter((n) => n.state === 'running').length} 运行中）`, 'ok');
        cxWrite('nodes', list);
        try { api('stateSet', { name: 'nodesCache', value: list }).catch(() => {}); } catch {}
        setNode((cur) => cur != null ? (list.some((n) => n.port === cur) ? cur : list[0]?.port ?? null) : (list.find((n) => n.state === 'running')?.port ?? list[0]?.port ?? null));
        return list;
      }, []);
      const spacesSeqRef = useRef(0);
      const loadSpaces = useCallback(async (port) => {
        const seq = ++spacesSeqRef.current;
        if (!port) { setSpaces([]); return []; }
        try { const d = await api('spaces', { node: port }); if (seq === spacesSeqRef.current) setSpaces(d || []); activity(`加载空间 ${(d || []).length} 个（节点 ${port}）`, 'ok'); return d || []; } catch { if (seq === spacesSeqRef.current) setSpaces([]); return []; }
      }, []);
      const appsSeqRef = useRef(0);
      const appsCacheRef = useRef({ key: '', at: 0, data: null, promise: null });
      const actorUid = avatar?.uid || '';
      const actorRef = useRef('');
      actorRef.current = actorUid;
      const loadApps = useCallback(async (port, sp, uid = '') => {
        const who = uid || actorRef.current;
        if (!port || !who) { setApps([]); return []; }
        uid = who;
        const key = `${port}:${sp || ''}:${uid || ''}`;
        const cache = appsCacheRef.current;
        if (cache.key === key && cache.promise) return cache.promise;
        if (cache.key === key && Date.now() - cache.at < 600 && cache.data) return cache.data;
        const seq = ++appsSeqRef.current;
        const promise = (async () => {
          try { const d = await api('apps', { node: port, space: sp || '', uid }); if (seq === appsSeqRef.current) setApps(d || []); activity(`加载应用 ${(d || []).length} 个（${sp || '全部空间'}）`, 'ok'); appsCacheRef.current = { key, at: Date.now(), data: d || [], promise: null }; return d || []; }
          catch (e) {
            if (/unknown op|unknown op apps/i.test(String(e?.message || e))) {
              const d = await fallbackApps(port, sp); if (seq === appsSeqRef.current) setApps(d); appsCacheRef.current = { key, at: Date.now(), data: d, promise: null }; return d;
            }
            if (seq === appsSeqRef.current) setApps([]); appsCacheRef.current = { key, at: Date.now(), data: [], promise: null }; return [];
          }
        })();
        appsCacheRef.current = { ...cache, key, at: cache.at, data: cache.data, promise };
        return promise;
      }, []);
      const loadAvatars = useCallback(async (port) => {
        if (!port) { setAvatarData({ active: '', items: [] }); setAvatar(null); return null; }
        try {
          const d = await api('avatars', { node: port });
          setAvatarData(d || { active: '', items: [] });
          activity(`加载数字分身 ${(d?.items || []).length} 个`, 'ok');
          const want = (cxSessionGet() || {}).avatar || '';
          const a = (d?.items || []).find((x) => x.uid === want) || (d?.items || []).find((x) => x.uid === d?.active) || d?.items?.[0] || null;
          setAvatar(a);
          return a;
        } catch { setAvatarData({ active: '', items: [] }); setAvatar(null); return null; }
      }, []);
      const applyScene = useCallback((b) => {
        const p = b?.params || {};
        setThemeMode(p.theme || 'system');
        setLangMode(p.lang || 'system');
      }, []);
      const loadBackgrounds = useCallback(async (port) => {
        if (!port) { setBgData({ active: '', items: [] }); setBg(null); return null; }
        try {
          const d = await api('backgrounds', { node: port });
          setBgData(d || { active: '', items: [] });
          activity(`加载赛博场景 ${(d?.items || []).length} 个`, 'ok');
          const wantBg = (cxSessionGet() || {}).world || '';
          const b = (d?.items || []).find((x) => x.id === wantBg) || (d?.items || []).find((x) => x.id === d?.active) || d?.items?.[0] || null;
          setBg(b);
          applyScene(b);
          return b;
        } catch { setBgData({ active: '', items: [] }); setBg(null); return null; }
      }, [applyScene]);
      const openInit = useCallback(() => {
        setInitState({ phase: 'setup', running: false, done: false, error: '', params: { ...INIT_DEFAULTS }, steps: INIT_STEPS.map((x) => ({ ...x, status: 'wait', detail: '' })), logs: [], console: '', apiConsole: '', spaceProgress: null });
      }, []);
      const runInit = useCallback(async (params = {}) => {
        if (initBusyRef.current) return;
        initBusyRef.current = true;
        const cfg = { ...INIT_DEFAULTS, ...params, avatar: { ...(params.avatar || {}) }, scene: { ...(params.scene || {}) }, project: { ...(params.project || {}) } };
        const steps = INIT_STEPS.map((x) => ({ ...x, status: 'wait', detail: '' }));
        setInitState({ phase: 'running', running: true, done: false, error: '', params: cfg, steps, logs: [], console: '', apiConsole: '', spaceProgress: null });
        const trace = (entry) => setInitState((prev) => {
          if (!prev) return prev;
          const logs = [...(prev.logs || [])];
          const i = entry.id ? logs.findIndex((x) => x.id === entry.id) : -1;
          if (i >= 0) logs[i] = { ...logs[i], ...entry };
          else logs.push({ id: entry.id || `${Date.now()}-${logs.length}`, t: entry.t || new Date().toLocaleTimeString(), ms: entry.ms || 0, op: entry.op || '', impact: entry.impact || '', status: entry.status || 'run' });
          return { ...prev, logs };
        });
        const brief = (v) => { try { const raw = JSON.stringify(v || {}); return raw.length > 360 ? raw.slice(0, 360) + '…' : raw; } catch { return ''; } };
        const consoleArgs = (v) => { try { const copy = JSON.parse(JSON.stringify(v || {})); const walk = (x) => { if (!x || typeof x !== 'object') return; for (const [k, val] of Object.entries(x)) { if (k === 'image' && typeof val === 'string' && val.startsWith('data:')) x[k] = `[data-url ${val.length}B]`; else walk(val); } }; walk(copy); const raw = JSON.stringify(copy); return raw; } catch { return ''; } };
        const appendConsole = (text) => { if (!text) return; setInitState((prev) => prev ? ({ ...prev, console: (prev.console || '') + String(text) }) : prev); };
        const appendApi = (text) => { if (!text) return; setInitState((prev) => prev ? ({ ...prev, apiConsole: (prev.apiConsole || '') + String(text) }) : prev); };
        const traceApi = (d) => {
          if (!d || d.op === 'deployLog' || d.op === 'initStatus') return;
          const at = String(d.at || new Date().toISOString()).slice(11, 23);
          if (d.phase === 'request') {
            const body = consoleArgs(d.body);
            appendApi(`\n[${at}] → ${d.method} ${d.endpoint}${body && body !== '{}' ? ` ${body.slice(0, 220)}` : ''}\n`);
          } else if (d.phase === 'response') appendApi(`[${at}] ← ${d.status} ${d.bytes}B ${d.ms}ms\n`);
          else if (d.phase === 'error') appendApi(`[${at}] ← ERROR ${String(d.error || '').slice(0, 180)}\n`);
        };
        window.__CX_API_TRACE__ = traceApi;
        let stopDeployPoll = null;
        const call = async (op, args) => {
          const id = `api-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
          const t = new Date().toLocaleTimeString();
          trace({ id, t, op: `API ${op}`, impact: brief(args), status: 'run' });
          appendConsole(`\n$ API ${op} ${consoleArgs(args).slice(0, 220)}\n`);
          const started = Date.now();
          try { const r = await api(op, args); trace({ id, t, op: `API ${op}`, impact: brief(args), ms: Date.now() - started, status: 'ok' }); appendConsole(`[api ${op}] ok\n`); return r; }
          catch (e) { trace({ id, t, op: `API ${op}`, impact: brief(args), ms: Date.now() - started, status: 'error' }); appendConsole(`[api ${op}] ERROR ${String(e?.message || e)}\n`); throw e; }
        };
        const deployConsole = async (args) => {
          const id = `api-deploy-${Date.now()}`;
          const t = new Date().toLocaleTimeString();
          const port = Number(args.port) || 9188;
          trace({ id, t, op: 'API deploy', impact: brief(args), status: 'run' });
          appendConsole(`\n$ contextos deploy ${consoleArgs(args).slice(0, 220)}\n`);
          let busy = false;
          const poll = async () => {
            if (busy) return; busy = true;
            try { const r = await api('deployLog', { port }); if (r && typeof r.text === 'string') setInitState((prev) => prev ? ({ ...prev, console: r.text }) : prev); } catch { /* deploy log may not exist yet */ }
            finally { busy = false; }
          };
          const timer = setInterval(poll, 500);
          stopDeployPoll = () => clearInterval(timer);
          void poll();
          const started = Date.now();
          try {
            const r = await api('deploy', args);
            await poll();
            trace({ id, t, op: 'API deploy', impact: brief(args), ms: Date.now() - started, status: 'ok' });
            appendConsole(`\n[deploy] done\n`);
            return r;
          } catch (e) {
            await poll();
            trace({ id, t, op: 'API deploy', impact: brief(args), ms: Date.now() - started, status: 'error' });
            appendConsole(`\n[deploy] ERROR: ${String(e?.message || e)}\n`);
            throw e;
          } finally { /* keep polling through later init API calls */ }
        };
        const mark = (id, status, detail = '') => { trace({ op: `${status.toUpperCase()} ${id}`, impact: detail, status }); setInitState((prev) => prev ? ({ ...prev, steps: prev.steps.map((x) => x.id === id ? { ...x, status, detail } : x) }) : prev); };
        const finish = () => setInitState((prev) => prev ? ({ ...prev, phase: 'done', running: false, done: true, steps: prev.steps.map((x) => ({ ...x, status: x.status === 'wait' ? 'done' : x.status })) }) : prev);
        let current = 'node';
        try {
          if (cfg.mode === 'local' || cfg.mode === 'docker') {
            const port = Number(cfg.port) || 9188;
            const started = await call('initProject', { node: port, params: cfg });
            if (!started?.started && !started?.alreadyRunning) throw new Error(started?.error || '初始化作业未启动');
            let timer = null;
            try {
              await new Promise((resolve, reject) => {
                const tick = async () => {
                  try {
                    const st = await api('initStatus', { port });
                    if (st?.steps) {
                      setInitState((prev) => prev ? {
                        ...prev,
                        steps: prev.steps.map((x) => ({ ...x, status: st.steps[x.id] || x.status })),
                        spaceProgress: st.spaces || prev.spaceProgress,
                      } : prev);
                    }
                    if (st?.current) current = st.current;
                    const lg = await api('deployLog', { port });
                    if (lg?.text) setInitState((prev) => prev ? ({ ...prev, console: lg.text }) : prev);
                    if (st?.state === 'done') { resolve(st); return; }
                    if (st?.state === 'error') { reject(new Error(st.error || '初始化失败')); return; }
                  } catch { /* transient while the job starts */ }
                  timer = setTimeout(tick, 800);
                };
                void tick();
              });
            } finally {
              if (timer) clearTimeout(timer);
            }
            // Stop the init trace before the post-init page hydration. Those
            // calls (spaces/pmList/git/tree/readFile/stateSet) are not part of
            // deployment and should not pollute the init console.
            if (window.__CX_API_TRACE__ === traceApi) window.__CX_API_TRACE__ = null;
            await loadNodes();
            setNode(port);
            await loadSpaces(port);
            await loadAvatars(port);
            await loadBackgrounds(port).catch(() => null);
            await loadApps(port, '', actorUid);
            cxWriteText('init', '1');
            setViewMode('chat');
            setChatFull(true);
            mark('chat', 'done', T('对话已就绪'));
            finish();
            return;
          }
          let nodePort = 0;
          if (cfg.mode === 'remote') {
            mark('node', 'run', cfg.remoteUrl || '');
            const r = await call('remoteLogin', { url: cfg.remoteUrl, user: cfg.remoteUser, pass: cfg.remotePass });
            mark('node', 'done', `已连接 ${cfg.remoteUrl} · sessid ${String(r.sessid).slice(0, 10)}…`);
            ['spaces', 'avatar', 'scene', 'project'].forEach((id) => mark(id, 'done', T('远程连接：跳过本地步骤')));
            current = 'chat'; mark('chat', 'run');
            cxWriteText('init', '1');
            setViewMode('chat'); setChatFull(true);
            mark('chat', 'done', T('远程会话已建立'));
            finish();
            return;
          }
          if (cfg.mode === 'docker') {
            mark('node', 'run', `docker ${cfg.image || ''} · :${cfg.port}`);
            const r = await call('dockerDeploy', { port: Number(cfg.port) || 9188, dir: cfg.dir || '', image: cfg.image || '' });
            nodePort = r.port;
          } else if (cfg.mode === 'remoteDeploy') {
            mark('node', 'run', `ssh ${cfg.sshUser || ''}@${cfg.host || ''} · :${cfg.port}`);
            const r = await call('remoteDeploy', { host: cfg.host, user: cfg.sshUser, ssh_port: cfg.sshPort, port: Number(cfg.port) || 9188, dir: cfg.dir || '', image: cfg.image || '' });
            nodePort = r.port;
          } else {
            const list = await loadNodes();
            const found = list.find((n) => Number(n.port) === Number(cfg.port) && n.state === 'running');
            nodePort = found?.port;
            if (!nodePort) {
              const existing = list.find((n) => Number(n.port) === Number(cfg.port));
              mark('node', 'run', `port ${cfg.port} · ${cfg.dir}`);
              if (existing) {
                await call('start', { port: Number(cfg.port) });
                nodePort = existing.port;
              } else {
                await deployConsole({
                  port: Number(cfg.port) || 9188,
                  dir: cfg.dir,
                  repo: cfg.repo || '',
                  codeSource: cfg.codeSource || '',
                  mirror: cfg.mirror || '',
                  mode: 'auto',
                  method: cfg.method || 'auto',
                  ctxName: cfg.dir || '',
                  goPolicy: cfg.goPolicy || 'auto',
                });
                nodePort = Number(cfg.port) || 9188;
              }
            }
            const alive = (await loadNodes()).find((n) => Number(n.port) === Number(nodePort));
            if (!alive || alive.state !== 'running') throw new Error(`节点 :${nodePort} 未就绪（${alive?.state || 'missing'}），请查看 ${cfg.dir || '节点目录'}/var/log/deploy.log`);
          }
          mark('node', 'done', `node :${nodePort}`);
          setInitState((prev) => prev ? { ...prev, ctx: { ...(prev.ctx || {}), node: nodePort } } : prev);

          current = 'spaces';
          mark('spaces', 'run', T('云社区 · 云办公'));
          const wanted = cfg.spaces?.length ? cfg.spaces : ['community', 'enterprise'];
          let have = [];
          try { have = await api('spaces', { node: nodePort }) || []; } catch {}
          const binarySpaces = !!cfg.binaryMode;
          const hasKey = (k) => have.some((sp) => String(sp.name || '').includes(k));
          const missing = wanted.filter((k) => !hasKey(k));
          if (!missing.length) {
            mark('spaces', 'done', T('已存在，跳过'));
          } else {
            await call('officialSpaces', { node: nodePort, keys: missing, binaryMode: binarySpaces });
            mark('spaces', 'done', T('云社区 + 云办公已就绪'));
          }

          current = 'avatar';
          mark('avatar', 'run', cfg.avatar.name || '');
          const a = await call('createAvatar', { node: nodePort, name: cfg.avatar.name || '我的数字分身', company: cfg.avatar.company || '云轩领航', city: cfg.avatar.city || '深圳市', persona: '专业、亲和、直接', preferences: '技术、产品、效率', style: '简洁、结构化' });
          if (cfg.avatar.image) await call('updateAvatar', { node: nodePort, uid: a.uid, patch: { image: cfg.avatar.image } }).catch(() => {});
          await call('setAvatar', { node: nodePort, uid: a.uid });
          mark('avatar', 'done', `uid ${String(a.uid).slice(0, 10)}…${cfg.avatar.image ? ' · ' + T('已上传头像') : ''}`);
          setInitState((prev) => prev ? { ...prev, ctx: { ...(prev.ctx || {}), avatar: a } } : prev);

          current = 'scene';
          mark('scene', 'run', cfg.scene.name || '');
          try {
            const b = await call('createBackground', { node: nodePort, name: cfg.scene.name || '我的赛博世界' });
            const sceneId = b?.created?.id || b?.id || '';
            if (sceneId && cfg.scene.image) await call('updateBackground', { node: nodePort, id: sceneId, patch: { image: cfg.scene.image } }).catch(() => {});
            if (sceneId) await call('setBackground', { node: nodePort, id: sceneId });
            mark('scene', 'done', `${cfg.scene.name || T('我的赛博世界')}${cfg.scene.image ? ' · ' + T('已上传背景') : ''}`);
          } catch (e) {
            mark('scene', 'done', T('跳过：背景服务未就绪'));
          }

          current = 'project';
          mark('project', 'run', cfg.project.name || '');
          let projectReady = false;
          let projectError = null;
          for (let attempt = 0; attempt < 3; attempt++) {
            try { await call('ensureProject', { node: nodePort, uid: a.uid }); projectReady = true; break; }
            catch (e) { projectError = e; await new Promise((resolve) => setTimeout(resolve, 800)); }
          }
          if (!projectReady) throw projectError || new Error('project instance is not ready');
          const t = await call('pmCreate', { node: nodePort, uid: a.uid, kind: 'target', title: cfg.project.name || '我的第一个项目', content: cfg.project.goal || '' });
          const p = await call('pmCreate', { node: nodePort, uid: a.uid, kind: 'plan', target_uid: t.uid, title: `${cfg.project.name || '我的第一个项目'} · 计划`, content: cfg.project.plan || '' });
          mark('project', 'done', `1 ${T('目标')} · 1 ${T('计划')}`);

          current = 'chat';
          mark('chat', 'run');
          setNode(nodePort);
          await loadSpaces(nodePort);
          const active = await loadAvatars(nodePort);
          await loadBackgrounds(nodePort).catch(() => null);
          await loadApps(nodePort, '', actorUid);
          cxWriteText('init', '1');
          setViewMode('chat');
          setChatFull(true);
          mark('chat', 'done', T('对话已就绪'));
          finish();
        } catch (e) {
          const label = (INIT_STEPS.find((x) => x.id === current) || {}).label || current;
          setInitState((prev) => prev ? { ...prev, phase: 'error', running: false, done: false, failedStep: current, error: `${label}失败：${String(e?.message || e)}`, steps: prev.steps.map((x) => x.id === current || x.status === 'run' ? { ...x, status: 'err' } : x) } : prev);
        } finally {
          if (stopDeployPoll) { stopDeployPoll(); stopDeployPoll = null; }
          window.__CX_API_TRACE__ = null;
          initBusyRef.current = false;
        }
      }, [loadNodes, loadAvatars, loadBackgrounds, loadSpaces, loadApps]);

      const retryInit = useCallback(async () => {
        const st = initState;
        if (!st?.params) return;
        if (st.failedStep !== 'project' || !st.ctx?.node || !st.ctx?.avatar) return runInit(st.params);
        const cfg = st.params;
        const nodePort = st.ctx.node;
        const a = st.ctx.avatar;
        setInitState((prev) => prev ? { ...prev, phase: 'running', running: true, error: '', failedStep: '', logs: [...(prev.logs || []), { t: new Date().toLocaleTimeString(), op: 'RETRY project', impact: 'ensureProject + pmCreate', status: 'run' }] } : prev);
        try {
          await api('ensureProject', { node: nodePort, uid: a.uid });
          const t = await api('pmCreate', { node: nodePort, uid: a.uid, kind: 'target', title: cfg.project?.name || '我的第一个项目', content: cfg.project?.goal || '' });
          await api('pmCreate', { node: nodePort, uid: a.uid, kind: 'plan', target_uid: t.uid, title: `${cfg.project?.name || '我的第一个项目'} · 计划`, content: cfg.project?.plan || '' });
          setInitState((prev) => prev ? { ...prev, phase: 'done', running: false, done: true, steps: prev.steps.map((x) => x.id === 'project' ? { ...x, status: 'done' } : x) } : prev);
        } catch (e) {
          setInitState((prev) => prev ? { ...prev, phase: 'error', running: false, error: `重试失败：${String(e?.message || e)}`, failedStep: 'project' } : prev);
        }
      }, [initState, runInit]);
      const loadStore = useCallback(async (port) => {
        if (!port) { setStore([]); return []; }
        try { const d = await api('storeApps', { node: port, lang: locale }); setStore(d || []); return d || []; } catch { setStore([]); return []; }
      }, [locale]);

      useEffect(() => {
        if (bootedRef.current) return;
        bootedRef.current = true;
        let alive = true;
        (async () => {
          // 节点信息一律现查 /c/runtime（缓存只用于首屏占位），保证 version/builtAt/sizeText 是最新的
          if (alive) act('LOAD NODES', loadNodes);
        })();
        return () => { alive = false; };
      }, [act, loadNodes]);
      const autoSpaceRef = useRef({});
      useEffect(() => {
        if (!node || !spaces.length) return;
        if (autoSpaceRef.current[node]) return;
        autoSpaceRef.current[node] = true;
        const saved = selMapRef.current[node] || {};
        const pick = (saved.space && spaces.some((x) => x.name === saved.space)) ? saved.space : (spaces.find((x) => x.status === 'start')?.name || spaces[0].name);
        setSpace(pick);
        rememberSel(node, { space: pick });
      }, [node, spaces]);
      const autoAppRef = useRef({});
      useEffect(() => {
        if (!node || !space || !apps.length) return;
        const k = `${node}:${space}`;
        if (autoAppRef.current[k]) return;
        autoAppRef.current[k] = true;
        const saved = (selMapRef.current[node] || {}).appKey || '';
        const pick = apps.find((a) => appKeyOf(a) === saved) || apps[0];
        setApp(pick);
        rememberSel(node, { appKey: appKeyOf(pick) });
      }, [node, space, apps]);
      const firstNodeEffectRef = useRef(true);
      useEffect(() => {
        const keep = firstNodeEffectRef.current && bootSelRef.current?.node;
        firstNodeEffectRef.current = false;
        if (!keep) { setSpace(null); setApps([]); setApp(null); }
        setAppMode('recent');
        if (!node) return;
        act('LOAD CONTEXT', async () => {
          // boot order: node → active avatar → spaces → data; nothing asks the
          // node for data before the identity is known.
          await loadAvatars(node);
          await Promise.all([loadSpaces(node), loadBackgrounds(node)]);
        });
      }, [node, act, loadSpaces, loadApps, loadAvatars, loadBackgrounds]);
      const selectSpace = (name) => {
        if (!node) return;
        if (space === name) { setSpace(null); setApp(null); rememberSel(node, { space: null, appKey: null }); return; }
        setSpace(name); setApp(null);
        rememberSel(node, { space: name, appKey: null });
      };
      const selectApp = (a) => {
        const key = appKeyOf(a);
        if (app && appKeyOf(app) === key) { setApp(null); rememberSel(node, { appKey: null }); return; }
        setApp(a); rememberSel(node, { appKey: key });
      };
      const prevSelSpaceRef = useRef(space);
      useEffect(() => { const changed = prevSelSpaceRef.current !== space; prevSelSpaceRef.current = space; if (changed) setApp(null); if (node && actorUid) act('LOAD RECENT', () => loadApps(node, space, actorUid)); }, [node, space, actorUid, act, loadApps]);
      useEffect(() => {
        if (!avatar?.project?.place_uid) return;
        const tick = async () => {
          if (document.hidden) return;
          try {
            const d = await api('projectStatus', { node, uid: avatar.uid });
            const n = (v) => Number(String(v || '0').split('x')[0]) || 0;
            const tasks = n(d.counts?.task), reports = n(d.counts?.report);
            if (tasks > reports) log(`⏰ 项目提醒：${tasks - reports} 个任务还没有报告，去完成并提交报告`, 'run');
          } catch { /* project status is best effort */ }
        };
        const timer = setInterval(tick, 60000);
        return () => clearInterval(timer);
      }, [avatar?.project?.place_uid, node, log]);


      useEffect(() => {
        if (!nodesLoaded || autoInitRef.current) return;
        autoInitRef.current = true;
        let done = false;
        done = cxReadText('init', '') === '1';
        if (!done) openInit();
      }, [nodesLoaded, openInit]);

      const refreshAll = () => act('REFRESH', async () => {
        await loadNodes();
        if (!node) return;
        const [a] = await Promise.all([loadAvatars(node), loadSpaces(node)]);
        await loadApps(node, space, actorUid);
        if (appMode === 'store') await loadStore(node);
      });
      const openUrl = (url) => { try { window.open(url, '_blank', 'noopener'); } catch {} };
      const withActor = (raw) => {
        try {
          const u = new URL(raw, window.location.origin);
          if (!/^(127\.0\.0\.1|localhost)$/.test(u.hostname)) return raw;
          if (u.searchParams.has('sessid')) return raw;
          if (/^\/s\/[^/]+\/$/.test(u.pathname)) u.pathname = u.pathname.slice(0, -1);
          if (/^\/s\/[^/]+%2F$/i.test(u.pathname)) u.pathname = u.pathname.slice(0, -3);
          // ContextOS 空间首页和页面内的 /chat/action 都依赖 user.uid；缺失时服务端
          // 返回 _process:_cookie，而第三方 iframe 里 document.cookie 不能可靠写入。
          const appLevel = /^\/s\/[^/]+\/c\/web\.team\.[^/]+\.[^/]+/.test(u.pathname);
          const spaceHome = /^\/s\/[^/]+$/.test(u.pathname);
          let actor = avatar?.uid || '';
          if (!actor) actor = cxReadText('actor', '');
          if ((appLevel || spaceHome) && actor) u.searchParams.set('user.uid', actor);
          return u.toString();
        } catch { return raw; }
      };
      const withView = (raw) => {
        try {
          const u = new URL(raw, window.location.origin);
          // 不要把插件主题/语言注入 ContextOS iframe URL：ContextOS 页头会因此调用
          // /header?theme=…，并通过 osascript 修改宿主外观；每个 iframe 加载都会触发。
          return u.toString();
        } catch { return raw; }
      };
      const displayUrl = (raw) => {
        try {
          const u = new URL(raw, window.location.origin);
          if (/^\/s\/[^/]+\/$/.test(u.pathname)) u.pathname = u.pathname.slice(0, -1);
          if (/^\/s\/[^/]+%2F$/i.test(u.pathname)) u.pathname = u.pathname.slice(0, -3);
          return u.toString();
        } catch { return raw; }
      };
      useEffect(() => { if (avatar?.uid) cxWriteText('actor', avatar.uid); }, [avatar?.uid]);
      const webTabsRef = useRef([]);
      webTabsRef.current = webTabs;
      const openWeb = (url, title, appMeta) => {
        if (!url) return '';
        setDebug((ds) => [...ds.slice(-200), { t: new Date().toLocaleTimeString(), m: `OPEN ${url}` }]);
        const base0 = withActor(url);
        const found = webTabsRef.current.find((t) => (t.base || t.url) === base0);
        if (found) { setActiveWeb(found.id); return found.id; }
        const id = `w${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
        setActiveWeb(id);
        setWebTabs((tabs) => [...tabs, { id, base: base0, url: withView(base0), title: title || url, reload: 0, app: appMeta || null }]);
        return id;
      };
      useEffect(() => {
        setWebTabs((tabs) => tabs.length ? tabs.map((t) => { const b = withActor(t.base || t.url); return { ...t, base: b, url: withView(b) }; }) : tabs);
      }, [theme, locale, avatar?.uid]);
      useEffect(() => {
        try {
          cxWrite('sel', {
            node, space,
            app: app ? { space: app.space || '', command: app.command || '', name: app.name || '', title: app.title || '', place_uid: app.place_uid || '' } : null,
          });
        } catch {}
      }, [node, space, app]);
      useEffect(() => { if (space && spaces.length && !spaces.some((x) => x.name === space)) setSpace(null); }, [spaces]);
      useEffect(() => {
        if (!app || !apps.length) return;
        const found = apps.find((a) => (app.place_uid && a.place_uid === app.place_uid) || (a.space === app.space && a.command === app.command && (a.name === app.name || a.title === app.title)));
        if (found && found !== app) setApp(found);
      }, [apps]);
      useEffect(() => {
        try {
          cxWrite('webtabs', {
            active: activeWeb || '',
            tabs: webTabs.map((t) => ({ id: t.id, base: t.base || t.url, title: t.title, app: t.app || null })),
          });
        } catch {}
      }, [webTabs, activeWeb]);
      const activeTab = webTabs.find((t) => t.id === activeWeb) || webTabs[webTabs.length - 1] || null;
      const [webAddr, setWebAddr] = useState('');
      const [webHist, setWebHist] = useState({});
      const [webMax, setWebMax] = useState(false);
      const webBoxRef = useRef(null);
      useEffect(() => { if (!webMax) return; return cxMaxApply(webBoxRef.current); }, [webMax]);
      useEffect(() => { setWebAddr(displayUrl(activeTab?.base || activeTab?.url || '')); }, [activeTab?.id, activeTab?.base]);
      useEffect(() => { if (!activeTab) return; const u = activeTab.base || activeTab.url; setWebHist((h) => (h[activeTab.id] ? h : { ...h, [activeTab.id]: { list: [u], idx: 0 } })); }, [activeTab?.id]);
      const setWebUrl = (id, url) => setWebTabs((tabs) => tabs.map((t) => { if (t.id !== id) return t; const b = withActor(url); return { ...t, base: b, url: withView(b), title: b, reload: (t.reload || 0) + 1 }; }));
      const goBack = () => { const cur = activeTab && webHist[activeTab.id]; if (!cur || cur.idx <= 0) return; const idx = cur.idx - 1; setWebHist((h) => ({ ...h, [activeTab.id]: { ...cur, idx } })); setWebUrl(activeTab.id, cur.list[idx]); };
      const goFwd = () => { const cur = activeTab && webHist[activeTab.id]; if (!cur || cur.idx >= cur.list.length - 1) return; const idx = cur.idx + 1; setWebHist((h) => ({ ...h, [activeTab.id]: { ...cur, idx } })); setWebUrl(activeTab.id, cur.list[idx]); };
      const tabIcon = (t) => {
        const raw = String(t?.app?.icon || t?.app?.place_avatar || '').trim();
        if (!raw) return h(UiIcon, { name: 'web', size: 12 });
        const src = /^https?:/i.test(raw) ? raw : (node ? `http://127.0.0.1:${node}${raw.startsWith('/') ? '' : '/'}${raw}` : raw);
        return h('img', { className: 'cx-webtab-ico', src, alt: '' });
      };
      const currentApp = activeTab ? (activeTab.app || null) : app;
      const firstTabAppRef = useRef(true);
      useEffect(() => {
        if (!activeTab) return;
        if (firstTabAppRef.current) { firstTabAppRef.current = false; if (!bootSelRef.current?.app) setApp(activeTab.app || null); return; }
        setApp(activeTab.app || null);
      }, [activeTab?.id]);
      const closeWeb = (id) => setWebTabs((tabs) => {
        const next = tabs.filter((t) => t.id !== id);
        if (activeWeb === id) { const last = next[next.length - 1] || null; setActiveWeb(last?.id || null); setApp(last?.app || null); }
        return next;
      });
      const closeOthers = (id) => {
        setWebTabs((tabs) => {
          const keep = tabs.find((t) => t.id === id);
          if (keep) { setActiveWeb(keep.id); setApp(keep.app || null); }
          return keep ? [keep] : [];
        });
      };
      const closeAll = () => { setWebTabs([]); setActiveWeb(null); setApp(null); };
      const reloadTab = (id) => setWebTabs((tabs) => tabs.map((t) => t.id === id ? { ...t, url: withView(withActor(t.base || t.url)), reload: (t.reload || 0) + 1 } : t));
      const navWeb = (id, url) => {
        const raw = String(url || '').trim();
        if (!raw) return;
        const full0 = /^https?:\/\//i.test(raw) ? raw : `http://${raw}`;
        const full = withActor(full0);
        setWebHist((h) => { const cur = h[id] || { list: [], idx: -1 }; const list = cur.list.slice(0, cur.idx + 1); list.push(full); return { ...h, [id]: { list, idx: list.length - 1 } }; });
        setWebTabs((tabs) => tabs.map((t) => t.id === id ? { ...t, base: full, url: withView(full), title: full, reload: (t.reload || 0) + 1 } : t));
        setActiveWeb(id);
      };
      const manageWeb = (id) => { setActiveWeb(id); setViewMode('manage'); };
      const reloadWeb = () => activeWeb && reloadTab(activeWeb);
      const openExternal = () => { if (activeTab?.url) openUrl(activeTab.url); };
      const selectCreated = async (r) => {
        setAppMode('recent');
        const list = await loadApps(node, space, actorUid);
        const found = (r?.place_uid && list.find((a) => a.place_uid === r.place_uid))
          || (r?.command ? { name: (r.command.split('.')[2] || r.name), title: r.name, command: r.command, space: r.space, place_uid: r.place_uid, city_name: r.city, company_name: r.company, service_name: r.service?.name || '', place: r.place, functions: [] } : null);
        if (found) setApp(found);
        return found;
      };
      const chooseAvatar = async (a) => {
        try {
          await api('setAvatar', { node, uid: a.uid });
          setAvatar(a);
          await loadApps(node, space, actorUid);
        } catch (e) { log(`切换分身失败：${String(e?.message || e)}`, 'err'); }
      };
      useEffect(() => {
        if (!bg) return;
        const p = bg.params || {};
        if ((p.theme || 'system') === themeMode && (p.lang || 'system') === langMode) return;
        const t = setTimeout(() => {
          api('updateBackground', { node, id: bg.id, patch: { params: { theme: themeMode, lang: langMode } } })
            .then((r) => { setBgData(r); setBg((r.items || []).find((x) => x.id === bg.id) || bg); })
            .catch(() => {});
        }, 500);
        return () => clearTimeout(t);
      }, [themeMode, langMode, bg?.id]);
      const chooseBg = async (b) => {
        try { await api('setBackground', { node, id: b.id }); setBg(b); applyScene(b); } catch (e) { log(`切换背景失败：${String(e?.message || e)}`, 'err'); }
      };
      const updateScene = async (payload) => {
        if (!bg) return;
        try {
          const { name, ...params } = payload || {};
          const merged = { ...(bg.params || {}), ...params };
          const patch = { params: merged };
          if (name) patch.name = name;
          const r = await api('updateBackground', { node, id: bg.id, patch });
          setBgData(r);
          const nb = (r.items || []).find((x) => x.id === bg.id) || bg;
          setBg(nb); applyScene(nb);
        } catch (e) { log(`保存场景失败：${String(e?.message || e)}`, 'err'); }
      };
      const createBg = async () => {
        try {
          const r = await api('createBackground', { node, name: '' });
          setBgData({ active: r.active, items: r.items });
          setBg(r.created || (r.items || []).find((x) => x.id === r.active) || null);
        } catch (e) { log(`新建背景失败：${String(e?.message || e)}`, 'err'); }
      };
      const readImage = (file, cb, max = 720, quality = 0.82) => {
        try {
          const img = new Image(); const url = URL.createObjectURL(file);
          img.onload = () => {
            const scale = Math.min(1, max / Math.max(img.width || 1, img.height || 1));
            const c = document.createElement('canvas');
            c.width = Math.max(1, Math.round((img.width || 1) * scale)); c.height = Math.max(1, Math.round((img.height || 1) * scale));
            c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
            URL.revokeObjectURL(url);
            cb(c.toDataURL('image/jpeg', quality));
          };
          img.onerror = () => { URL.revokeObjectURL(url); log('图片读取失败', 'err'); };
          img.src = url;
        } catch (e) { log(`图片读取失败：${String(e?.message || e)}`, 'err'); }
      };
      const upBgImage = (file) => {
        if (!file || !bg) return;
        readImage(file, async (data) => {
          try {
            const r = await api('updateBackground', { node, id: bg.id, patch: { image: data } });
            if (avatar?.uid) api('saveUserMedia', { node, uid: avatar.uid, kind: 'background', dataUrl: data, name: avatar.name || '' }).catch(() => {});
            setBgData(r); setBg((r.items || []).find((x) => x.id === bg.id) || { ...bg, image: data });
          } catch (e) { log(`上传背景失败：${String(e?.message || e)}`, 'err'); }
        });
      };
      const upAvatarImage = (file) => {
        if (!file || !avatar) return;
        readImage(file, async (data) => {
          try {
            await api('updateAvatar', { node, uid: avatar.uid, patch: { image: data } });
            api('saveUserMedia', { node, uid: avatar.uid, kind: 'avatar', dataUrl: data, name: avatar.name || '' }).catch(() => {});
            const d = await api('avatars', { node });
            setAvatarData(d);
            setAvatar((d.items || []).find((x) => x.uid === avatar.uid) || { ...avatar, image: data });
          } catch (e) { log(`上传头像失败：${String(e?.message || e)}`, 'err'); }
        });
      };
      const updateAvatarProfile = async (patch) => {
        if (!avatar) return;
        try {
          await api('updateAvatar', { node, uid: avatar.uid, patch });
          const d = await api('avatars', { node });
          setAvatarData(d);
          setAvatar((d.items || []).find((x) => x.uid === avatar.uid) || { ...avatar, ...patch });
        } catch (e) { log(`修改分身失败：${String(e?.message || e)}`, 'err'); }
      };
      const openNode = (port) => { setApp(null); openWeb(`http://127.0.0.1:${port}/`, `node :${port}`); };
      const [webFocus, setWebFocus] = useState(false);
      const openSpace = (sp) => { if (!sp) return ''; setApp(null); return openWeb(`http://${CX_HOST}:${node}/s/${encodeURIComponent(sp)}`, sp); };
      // 应用实例的界面地址：system_uid 走查询参数（框架用它定位实例），
      // 路径段留空，避免被节点当成数据接口返回 JSON。
      const appUrl = (a) => cxWebUrl({
        node, pod: a.space || space || '', command: a.command, place: a.place || 'system',
        placeUid: a.place_uid || a['system_uid'] || '', uid: avatar?.uid || a.user_uid || '',
      });
      const openApp = (a) => { if (!a) return ''; setApp(a); return openWeb(appUrl(a), a.title || a.name, a); };
      const buildApp = (a) => act(`BUILD ${a.name}`, async () => { await api('buildSpace', { node, space: a.space || space }); await loadApps(node, space, actorUid); });
      const initSpace = (sp) => act(`INIT ${sp}`, async () => { await api('initSpace', { node, space: sp }); log(`skeleton ready: ${sp}`); });
      const buildSpace = (sp) => act(`BUILD ${sp}`, async () => { await api('buildSpace', { node, space: sp }); await loadApps(node, sp, actorUid); });
      const startNode = (port) => act(`START :${port}`, async () => { await api('start', { port }); await loadNodes(); });
      const stopNode = (port) => act(`STOP :${port}`, async () => { await api('stop', { port }); await loadNodes(); });
      const deleteNode = async (port) => {
        if (!(await cxAsk(`删除节点 :${port}？目录和台账都会删除。`))) return;
        act(`DELETE :${port}`, async () => { await api('deleteNode', { port }); await loadNodes(); });
      };
      const startSpace = (sp) => act(`START ${sp}`, async () => { await api('spaceStart', { node, space: sp }); await loadSpaces(node); });
      const stopSpace = (sp) => act(`STOP ${sp}`, async () => { await api('spaceStop', { node, space: sp }); await loadSpaces(node); });
      const deleteSpace = async (sp) => {
        if (!(await cxAsk(`删除项目空间 ${sp}？目录和记录都会删除。`))) return;
        act(`DELETE ${sp}`, async () => { await api('deleteSpace', { node, space: sp }); await loadSpaces(node); await loadApps(node, '', actorUid); });
      };
      const deployOfficial = (keys) => act(`DEPLOY OFFICIAL ${keys.join(',')}`, async () => {
        const out = await api('officialSpaces', { node, keys });
        await loadSpaces(node); await loadApps(node, '', actorUid);
        log(`official: ${out.map((x) => x.space || x.key).join(', ')}`);
        return out;
      });
      const showStore = () => { setAppMode('store'); act('LOAD STORE', () => loadStore(node)); };
      const backRecent = () => { setAppMode('recent'); act('LOAD RECENT', () => loadApps(node, space, actorUid)); };
      const openStoreCreate = (service) => { setStoreService(service); setModal('storeInstance'); };
      const storeAct = (service, action) => act(`STORE ${action} ${service.name}`, async () => {
        await api('storeAction', { node, space: service.space || '20240724-community', service_uid: service.uid, action });
        await loadStore(node);
      });
      // 商店模板的「编程」：vimer 直接定位到该模块的 portal.go
      // 远程 / 容器节点：取 token 或 sessid（本机节点免登录，取到的只是本机票据）
      const nodeAuth = (port) => act('NODE AUTH ' + port, async () => {
        const r = await api('nodeAuth', { node: port });
        if (!r || r.ok === false) {
          window.dispatchEvent(new CustomEvent('cx-toast', { detail: { text: '取凭证失败：' + (r && r.error || '未知错误'), kind: 'err' } }));
          return;
        }
        const d = r.data || r;
        const who = d.sessid ? `sessid ${String(d.sessid).slice(0, 12)}…` : `token ${String(d.token).slice(0, 12)}…`;
        try { await navigator.clipboard.writeText(d.sessid || d.token || ''); window.dispatchEvent(new CustomEvent('cx-toast', { detail: { text: '已复制 ' + who } })); }
        catch { window.dispatchEvent(new CustomEvent('cx-toast', { detail: { text: '已获取 ' + who } })); }
      });
      const storeCode = (service) => {
        const mod = String(service.command || '').split('.')[2] || service.name;
        const url = `http://${CX_HOST}:${node}/s/${encodeURIComponent(service.space)}/c/vimer`
          + `?file=${encodeURIComponent(`${mod}/portal.go`)}&path=${encodeURIComponent('src/')}&debug=true`
          + `#src/:${mod}/portal.go:1`;
        openCardTool(url, service.title || service.name);
      };
      // 商店模板的「配置」：门户表视图
      const storeConfig = (service) => {
        const url = `http://${CX_HOST}:${node}/s/${encodeURIComponent(service.space)}/c/${service.command}?view=table&debug=true`;
        openCardTool(url, service.title || service.name);
      };

      const startConsoleResize = (e) => {
        e.preventDefault();
        const startY = e.clientY, startH = consoleHeight;
        const move = (ev) => setConsoleHeight(Math.max(80, Math.min(460, startH + startY - ev.clientY)));
        const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', up);
      };
      // 过滤选项直接由当前数据列表聚合，并带上计数；标签必须与卡片上的状态词一致
      // （节点卡只有 运行中/离线，空间卡只有 运行中/已停止），不能拿底层 state 原样当标签。
      const countOptions = (list, keyOf, labelOf) => {
        const counts = new Map();
        (list || []).forEach((x) => { const v = keyOf(x); if (v) counts.set(v, (counts.get(v) || 0) + 1); });
        return [...counts.entries()].map(([value, count]) => ({ value, count, label: labelOf(value) }));
      };
      const nodeStatusKey = (n) => (n.state === 'running' ? 'running' : 'offline');
      const spaceStatusKey = (s) => (String(s.status || '').trim() === 'start' ? 'running' : 'stopped');
      const appSpaceKey = (a) => a.space || space || '';
      const nodeRows = nodes.filter((n) => !nodeStatusFilter.length || nodeStatusFilter.includes(nodeStatusKey(n)));
      const spaceRows = spaces.filter((s) => !spaceStatusFilter.length || spaceStatusFilter.includes(spaceStatusKey(s)));
      const appRows = apps.filter((a) => !appSpaceFilter.length || appSpaceFilter.includes(appSpaceKey(a)));
      const appSpaceOptions = countOptions(apps, appSpaceKey, (v) => v);
      const nodeStatusOptions = countOptions(nodes, nodeStatusKey, (v) => (v === 'running' ? t('running') : t('offline')));
      const spaceStatusOptions = countOptions(spaces, spaceStatusKey, (v) => (v === 'running' ? t('running') : t('stopped')));
      const storeRows = store.filter((s) => !storeSpaceFilter.length || storeSpaceFilter.includes(s.space));
      const storeSpaceOptions = countOptions(store, (s) => s.space, (v) => v);
      const activeNode = nodes.find((n) => n.port === node);
      const activeSpace = spaces.find((s) => s.name === space);
      const running = nodes.filter((n) => n.state === 'running').length;
      const stage = activeTab ? 4 : app ? 3 : space ? 2 : node ? 1 : 0;

      const [ideProjects, setIdeProjects] = useState(() => cxRead('ide', []));
      const [ideActive, setIdeActive] = useState(() => cxReadText('ide-active', ''));
      const [ideFile, setIdeFile] = useState(null);
      useEffect(() => cxWrite('ide', ideProjects), [ideProjects]);
      useEffect(() => cxWriteText('ide-active', ideActive), [ideActive]);
      useEffect(() => { const key = `${node}:${space}`; if (ideProjects.some((x) => x.key === key)) setIdeActive(key); }, [node, space]);
      const selectIdeProject = (key) => { const p = ideProjects.find((x) => x.key === key); if (!p) return; setIdeActive(key); setNode(p.node); setSpace(p.space); };
      const closeIdeProject = (key) => { setIdeProjects((ps) => ps.filter((x) => x.key !== key)); if (ideActive === key) setIdeActive(''); };
      // 节点/空间右键常用工具：一律开在聊天框自带的网页标签里
      const openCardTool = (url, title) => { const id = openWeb(url, title || url); if (id) setChatTab(id); return id; };
      // 首页由节点/空间自身的代码决定，插件只打开根地址，不写入任何配置
      // 某个工具页是否已经在网页标签里打开
      const isOpenUrl = (url) => (webTabs || []).some((t) => String(t.url || '') === String(url || ''));
      // 危险按键来自命令自省 meta._style（dream 的 stop/remove 等）
      const [actionStyle, setActionStyle] = useState({});
      useEffect(() => {
        if (!node) return;
        api('commandStyle', { node, command: 'dream' })
          .then((r) => setActionStyle((r && r.style) || {}))
          .catch(() => setActionStyle({}));
      }, [node]);
      const tone = (a) => actionStyle[a] || '';
      const openHome = (sp) => openCardTool(
        `http://127.0.0.1:${node}${sp ? `/s/${encodeURIComponent(sp)}` : ''}`,
        sp ? `${sp} · home` : 'home',
      );
      const openIde = async (port, sp) => {
        const n = Number(port);
        setNode(n);
        setViewMode('dev');
        let target = sp || '';
        if (sp === undefined) {
          try { target = ((await api('spaces', { node: n })) || [])[0]?.name || ''; } catch { /* keep */ }
        }
        setSpace(target || '');
        if (target) {
          const key = `${n}:${target}`;
          setIdeProjects((ps) => (ps.some((x) => x.key === key) ? ps : [...ps, { key, node: n, space: target }]));
          setIdeActive(key);
        }
      };
      const chatProps = { open: true, booted: nodesLoaded, full: true, theme, locale, themeMode, setThemeMode, langMode, setLangMode, view: viewMode, mode: workMode, onModeChange: setWorkMode, onRequest: pushReq, fx, onToggleFull: () => setChatFull((v) => !v), onInit: openInit, onClose: () => setViewMode('manage'), nodes, node, spaces, space, apps, app, onSelectNode: setNode, onSelectSpace: setSpace, onSelectApp: (a) => { setApp(a); openApp(a); }, ideFile, onSelectAvatar: chooseAvatar, avatars: avatarData.items, backgrounds: bgData.items, bg, onSelectBg: chooseBg, onCreateBg: createBg, onUploadBg: upBgImage, onUploadAvatar: upAvatarImage, onUpdateScene: updateScene, onUpdateAvatar: updateAvatarProfile, onCreateAvatar: () => setShowAvatars(true), webTabs, onOpenWebTab: openWeb, onCloseWebTab: closeWeb, onNavWebTab: navWeb, onReloadWebTab: reloadTab, onManageWebTab: manageWeb, onRefresh: () => refreshAll(), onOpenApp: openApp, onData: () => app && (setViewMode('chat'), setFormReq({ app, at: Date.now() })), formReq, onStore: showStore, onDevices: () => setShowDevices(true), avatar, cards: {
          selectNode: setNode, startNode, stopNode, deleteNode, openNode, openIde,
          openTerminal: (a) => api('openTerminal', { node: a?.node || node, space: a?.space || space }).then(() => true),
          rebuild: (a) => api('buildSpace', { node: a?.node || node, space: a?.space }).then((r) => { refreshAll(); return r; }),
          selectSpace, openSpace, startSpace, stopSpace, deleteSpace, selectApp, openApp, openCardTool, openHome, isOpenUrl, tone,
        }, onOpenDev: () => setViewMode('dev') };
      return h('div', { className: 'cx-shell', 'data-theme': theme, 'data-color': fx.color, 'data-light': fx.light, 'data-style': fx.style, 'data-view': viewMode, 'data-webfocus': webFocus ? '1' : '0', ref: shellRef },
        h('style', null, CRITICAL_CSS),
        h('div', { className: 'cx-water', 'aria-hidden': 'true' }, Array.from({ length: 3 }, (_, i) => h('i', { key: i, style: { left: ['18%', '62%', '84%'][i], top: ['72%', '26%', '58%'][i], animationDelay: `${i * 2.2}s` } }))),
        h(CursorComet),
        h(CxConfirmHost),
        pipeMenu ? h('div', { className: 'cx-pipe-menu-fixed', style: pipeMenu.right != null ? { right: pipeMenu.right, top: pipeMenu.y } : { left: pipeMenu.x, top: pipeMenu.y }, onClick: (e) => e.stopPropagation() },
          pipeMenu.title ? h('div', { className: 'cx-pipe-menu-title' }, pipeMenu.title) : null,
          // 菜单开着的时候网页标签也可能变化（如「关闭所有网页」），这里实时计算打开状态
          h(MenuList, { items: (pipeMenu.items || []).map((it) => (it && it.url ? { ...it, open: isOpenUrl(it.url) } : it)), onPick: () => setPipeMenu(null) })) : null,
        h('div', { className: 'cx-cursor-ring', 'aria-hidden': 'true' }),
        opFx ? h('div', { key: opFx.key, className: `cx-op-fx cx-op-${opFx.kind}`, 'aria-hidden': 'true' }) : null,
        intro && !lightTheme ? h(ModeIntro, { key: intro, mode: intro, onDone: () => setIntro(null) }) : null,
        welcome && (welcome.title === 'READY' || !lightTheme) ? h(WelcomeBurst, { key: `w${welcome.title}${Date.now()}`, title: welcome.title, sub: welcome.sub, onDone: () => setWelcome(null) }) : null,
        h('header', { className: 'cx-header' },
          sidebarHidden ? h('button', { className: 'cx-btn cx-sb-toggle', title: '显示 / 隐藏 DSH 侧边栏', onClick: () => { try { CX_LAYOUT && CX_LAYOUT.toggleSidebar && CX_LAYOUT.toggleSidebar(); } catch {} } }, '☰') : null,
          h('div', { className: 'cx-brand' }, h('div', { className: 'cx-mark' }, h(CtxMark, { variant: 'devops', size: 22 })), h('div', null, h('div', { className: 'cx-title' }, 'CONTEXTOS · DEVOPS'), h('div', { className: 'cx-sub' }, `${t('cluster')} · ${t('modules')} · ${t('automation')} · `,
              h('button', { type: 'button', className: `cx-ver${upd && upd.hasUpdate ? ' upd' : ''}`, title: upd && upd.hasUpdate ? `${T('有新版本')} v${upd.latest}` : T('检查更新'), onClick: (e) => { e.stopPropagation(); setUpdOpen(true); if (!upd) checkUpd(true); } },
                `v__CLIENT_CSS_VERSION__`),
              upd && upd.hasUpdate ? h('span', { className: 'cx-ver-tag', title: upd.checkedAt || '' }, `→ v${upd.latest}`) : null))),
          h('div', { className: 'cx-views' },
            [['chat', '对话', 'CHAT'], ['manage', '管理', 'MANAGE'], ['dev', '开发', 'DEV'], ['monitor', '监控', 'MONITOR'], ['ecom', '电商', 'ECOM']].map(([k, zh, en]) =>
              h(UiAffordance, { key: k, as: 'button', icon: k, zh: locale === 'zh' ? zh : en, en: locale === 'zh' ? en : '', mode: 'short', className: `cx-view${viewMode === k ? ' on' : ''}`, onClick: () => setViewMode(k), title: zh + ' / ' + en }))),
          h('div', { className: 'cx-actions' },
            h(DropSelect, { value: fx.sound, title: '声效', onChange: (v) => fxSet('sound', v), options: [{ value: 'soft', label: T('柔和') }, { value: 'cs', label: T('CS 风') }, { value: 'ra', label: T('红警风') }, { value: 'wow', label: T('魔兽风') }, { value: 'sc2', label: T('星际风') }, { value: 'chip', label: T('8-bit') }, { value: 'off', label: T('静音') }] }),
            h(DropSelect, { value: fx.light, title: '动效', onChange: (v) => fxSet('light', v), options: [{ value: 'high', label: T('动效·强') }, { value: 'mid', label: T('动效·中') }, { value: 'low', label: T('动效·弱') }, { value: 'micro', label: T('动效·微') }, { value: 'off', label: T('动效·关') }] }),
            h(DropSelect, { value: fx.color, title: '色系', onChange: (v) => fxSet('color', v), options: [{ value: 'cyan', label: T('青') }, { value: 'green', label: T('绿') }, { value: 'violet', label: T('紫') }, { value: 'amber', label: T('琥珀') }, { value: 'rose', label: T('玫红') }, { value: 'ice', label: T('冰蓝') }, { value: 'warm', label: T('暖橙') }] }),
            h(DropSelect, { value: fx.style, title: '风格', onChange: (v) => fxSet('style', v), options: [{ value: 'tech', label: T('科技风') }, { value: 'classic', label: T('古典风') }, { value: 'desert', label: T('沙漠风') }, { value: 'rainforest', label: T('雨林风') }, { value: 'cyber', label: T('赛博风') }, { value: 'steam', label: T('蒸汽风') }, { value: 'minimal', label: T('极简风') }] }),
            h(DropSelect, { value: themeMode, title: t('light') + ' / ' + t('dark'), onChange: setThemeMode, options: [{ value: 'system', label: t('system') }, { value: 'light', label: t('light') }, { value: 'dark', label: t('dark') }] }),
            h(DropSelect, { value: langMode, title: t('chinese') + ' / English', onChange: setLangMode, options: [{ value: 'system', label: t('system') }, { value: 'zh', label: '中文' }, { value: 'en', label: 'English' }] }),
            h('button', { className: 'cx-btn', onClick: openInit, disabled: !!initState?.running, title: t('initialize') }, t('initialize')))),
        h('div', { className: 'cx-header-compact' },
          h(IconButton, { name: 'gear', className: 'cx-btn xs cx-icon-btn', title: T('界面设置'), onClick: () => setHdrCfg((v) => !v) }),
          h(IconButton, { name: 'init', className: 'cx-btn xs cx-icon-btn', title: T('初始化'), onClick: openInit })),
        hdrCfg ? h('div', { className: 'cx-header-cfg' },
          h('div', { className: 'cx-header-cfg-h' }, h('b', null, T('界面设置')), h(IconButton, { name: 'close', className: 'cx-btn xs cx-icon-btn', title: T('关闭'), onClick: () => setHdrCfg(false) })),
          h('div', { className: 'cx-header-cfg-grid' },
            h('label', null, T('声效'), h(DropSelect, { value: fx.sound, onChange: (v) => fxSet('sound', v), options: [{ value: 'soft', label: T('柔和') }, { value: 'cs', label: T('CS 风') }, { value: 'ra', label: T('红警风') }, { value: 'wow', label: T('魔兽风') }, { value: 'sc2', label: T('星际风') }, { value: 'chip', label: T('8-bit') }, { value: 'off', label: T('静音') }] })),
            h('label', null, T('动效'), h(DropSelect, { value: fx.light, onChange: (v) => fxSet('light', v), options: [{ value: 'high', label: T('动效·强') }, { value: 'mid', label: T('动效·中') }, { value: 'low', label: T('动效·弱') }, { value: 'micro', label: T('动效·微') }, { value: 'off', label: T('动效·关') }] })),
            h('label', null, T('色系'), h(DropSelect, { value: fx.color, onChange: (v) => fxSet('color', v), options: [{ value: 'cyan', label: T('青') }, { value: 'green', label: T('绿') }, { value: 'violet', label: T('紫') }, { value: 'amber', label: T('琥珀') }, { value: 'rose', label: T('玫红') }, { value: 'ice', label: T('冰蓝') }, { value: 'warm', label: T('暖橙') }] })),
            h('label', null, T('风格'), h(DropSelect, { value: fx.style, onChange: (v) => fxSet('style', v), options: [{ value: 'tech', label: T('科技风') }, { value: 'classic', label: T('古典风') }, { value: 'desert', label: T('沙漠风') }, { value: 'rainforest', label: T('雨林风') }, { value: 'cyber', label: T('赛博风') }, { value: 'steam', label: T('蒸汽风') }, { value: 'minimal', label: T('极简风') }] })),
            h('label', null, T('主题'), h(DropSelect, { value: themeMode, onChange: setThemeMode, options: [{ value: 'system', label: t('system') }, { value: 'light', label: t('light') }, { value: 'dark', label: t('dark') }] })),
            h('label', null, T('语言'), h(DropSelect, { value: langMode, onChange: setLangMode, options: [{ value: 'system', label: t('system') }, { value: 'zh', label: '中文' }, { value: 'en', label: 'English' }] }))
          )) : null,
        h('div', { className: 'cx-pipe' },
          h(UiAffordance, { as: 'span', icon: 'server', zh: t('serve'), mode: 'short', iconSize: 18, onClick: (e) => openPipe(e, t('serve'), (nodes || []).map((n) => ({ label: `:${n.port} · ${n.name || n.state}`, on: n.port === node, go: () => setNode(n.port) })), 'server'), className: `cx-stage cx-stage-title${stage >= 1 ? ' on' : ''}` }, h('span', { className: 'cx-aff-value' }, activeNode ? `:${activeNode.port}` : t('deploy'))),
          h('span', { className: 'cx-arrow' }, '›'),
          h(UiAffordance, { as: 'span', icon: 'space', zh: t('space'), mode: 'short', iconSize: 18, onClick: (e) => openPipe(e, t('space'), (spaces || []).map((sp) => ({ label: `${sp.name} · ${sp.status || ''}`, on: sp.name === space, go: () => setSpace(sp.name) })), 'space'), className: `cx-stage cx-stage-title${stage >= 2 ? ' on' : ''}` }, h('span', { className: 'cx-aff-value' }, space || t('create'))),
          h('span', { className: 'cx-arrow' }, '›'),
          h(UiAffordance, { as: 'span', icon: 'app', zh: t('recent'), mode: 'short', iconSize: 18, onClick: (e) => openPipe(e, t('recent'), (apps || []).map((a) => ({ label: a.title || a.name, on: app && app.place_uid === a.place_uid, go: () => openApp(a) })), 'app'), className: `cx-stage cx-stage-title${stage >= 3 ? ' on' : ''}` }, h('span', { className: 'cx-aff-value' }, app ? app.title || app.name : t('recent'))),
          h('span', { className: 'cx-arrow' }, '›'),
          h(UiAffordance, { as: 'span', icon: 'web', zh: t('web'), mode: 'short', iconSize: 18, onClick: (e) => openPipe(e, t('web'), (webTabs || []).map((tb) => ({ label: tb.title || tb.url, on: tb.id === activeTab?.id, go: () => navWeb(tb.id) })), 'web'), className: `cx-stage cx-stage-title${stage >= 4 ? ' on' : ''}` }, h('span', { className: 'cx-aff-value' }, activeTab ? (activeTab.title || 'page') : 'tabs')),
          h('div', { className: 'cx-chips' },
            h(UiAffordance, { as: 'button', icon: 'avatar', zh: t('avatar'), mode: 'short', onClick: (e) => openPipe(e, t('avatar'), (avatarData.items || []).map((a) => ({ label: a.name || a.uid, on: a.uid === avatar?.uid, go: () => chooseAvatar(a) })), 'avatar'), className: 'cx-chip', title: t('avatar') }, h('b', null, avatar?.name || '—')),
            h(UiAffordance, { as: 'button', icon: 'image', zh: t('scene'), mode: 'short', onClick: (e) => openPipe(e, t('scene'), (bgData.items || []).map((b) => ({ label: b.name, on: b.id === bg?.id, go: () => chooseBg(b) })), 'image'), className: 'cx-chip', title: `${t('scene')}: ${bg?.name || T('默认')}` }, h('b', null, bg?.name || T('默认'))),
            h(UiAffordance, { as: 'button', icon: 'factory', zh: t('mode'), mode: 'short', onClick: (e) => openPipe(e, t('mode'), CHAT_MODES.map((m) => ({ label: pipeModeLabel(m.id), on: m.id === workMode, go: () => setWorkMode(m.id) })), 'factory'), className: 'cx-chip', title: t('mode') }, h('b', null, pipeModeLabel(workMode))),
            h(UiAffordance, { as: 'button', icon: 'layers', zh: t('view'), mode: 'short', onClick: (e) => openPipe(e, t('view'), [['chat', '对话'], ['manage', '管理'], ['dev', '开发'], ['monitor', '监控'], ['ecom', '电商']].map(([k, zh]) => ({ label: pipeViewLabel(k), on: k === viewMode, go: () => setViewMode(k) })), 'layers'), className: 'cx-chip', title: t('view') }, h('b', null, pipeViewLabel(viewMode))))),
        error ? h('div', { className: 'cx-err' }, error) : null,
        h('div', { className: `cx-chat-host${chatFull ? ' full' : ''}`, style: viewMode === 'chat' ? null : { display: 'none' } }, h(ChatPanel, { ...chatProps, docked: !chatFull, onWebFocus: setWebFocus })),
        devMounted ? h('div', { className: 'cx-dev-host', style: viewMode === 'dev' ? null : { display: 'none' } }, h(DevWorkspace, { locale, node, space, bg, theme, active: viewMode === 'dev', nodes, spaces, projects: ideProjects, activeKey: ideActive, onSelectProject: selectIdeProject, onCloseProject: closeIdeProject, onSelectNode: (p) => setNode(p), onSelectSpace: (sp) => setSpace(sp), onActiveFile: setIdeFile, requests: reqLog, onPick: openIde })) : null,
        viewMode === 'ecom' ? h('div', { className: 'cx-ecom-host' }, h(EcomView, { locale })) : null,
        viewMode === 'monitor' ? h('div', { className: 'cx-monitor-host' },
          h(MonitorView, { nodes, spaces, apps, events, logs, reqLog, locale, onRefresh: () => loadNodes() })) : null,
        h('div', { className: `cx-body${busy ? ' busy' : ''}`, style: viewMode === 'manage' ? null : { display: 'none' } },
          h(Panel, {
            icon: 'server', title: tp('serve'), count: `${nodeRows.length}/${nodes.length} NODES`,
            tools: [h(MultiFilter, { key: 'f', label: t('status'), options: nodeStatusOptions, value: nodeStatusFilter, onChange: setNodeStatusFilter }), h('span', { key: 'sp', className: 'cx-tools-spacer' }), h(IconButton, { name: 'refresh', key: 'r', className: 'cx-btn xs cx-icon-btn cx-tool-refresh', onClick: () => act('REFRESH NODES', loadNodes), title: t('refresh') }), h(IconButton, { name: 'plus', key: 'd', className: 'cx-btn xs pri cx-icon-btn', onClick: () => setModal('deploy'), title: t('create') })],
          }, nodeRows.length ? nodeRows.map((n) => h(NodeCard, { key: n.dir || n.port, n, active: node === n.port, busy: !!busy, locale, onSelect: setNode, onStart: startNode, onStop: stopNode, onDelete: deleteNode, onOpen: openNode, onIde: openIde, onTool: openCardTool, onHome: () => openHome(''), onAuth: nodeAuth, isOpen: isOpenUrl, tone })) : h('div', { className: 'cx-empty' }, '还没有节点。先部署一个：copy / download / source。')),
          h(Panel, {
            icon: 'space', title: tp('space'), count: node ? `${spaceRows.length}/${spaces.length} SPACES` : t('serve'),
            tools: [h(MultiFilter, { key: 'f', label: t('status'), options: spaceStatusOptions, value: spaceStatusFilter, onChange: setSpaceStatusFilter }), h('span', { key: 'sp', className: 'cx-tools-spacer' }), h(IconButton, { name: 'refresh', key: 'r', className: 'cx-btn xs cx-icon-btn cx-tool-refresh', disabled: !node, onClick: () => act('REFRESH SPACES', () => loadSpaces(node)), title: t('refresh') }), h(IconButton, { name: 'plus', key: 'c', className: 'cx-btn xs pri cx-icon-btn', disabled: !node, onClick: () => setModal('space'), title: t('create') })],
          }, !node
            ? h('div', { className: 'cx-empty' }, '先选择左侧服务节点。')
            : h(React.Fragment, null,
                spaceRows.length ? spaceRows.map((s) => h(SpaceCard, { key: s.name, s, node, active: space === s.name, busy: !!busy, onSelect: selectSpace, onOpen: openSpace, onStart: startSpace, onStop: stopSpace, onDelete: deleteSpace, onIde: openIde, onTool: openCardTool, onHome: () => openHome(s.name), isOpen: isOpenUrl, tone, locale })) : h('div', { className: 'cx-empty' }, '该节点还没有项目空间。创建空空间后自动 git init。'),
                h(OfficialSpaces, { node, onDeploy: deployOfficial, locale }))),
          h(Panel, {
            icon: 'app',
            title: appMode === 'store' ? t('store') : tp('recent'),
            count: appMode === 'store' ? `${store.length} SERVICES` : (node ? `${appRows.length}/${apps.length} APPS` : 'SELECT NODE'),
            tools: appMode === 'store'
              ? [h('button', { key: 'b', className: 'cx-btn xs pri', onClick: backRecent }, '← ' + t('recent')), h(MultiFilter, { key: 'f', label: t('space'), options: storeSpaceOptions, value: storeSpaceFilter, onChange: setStoreSpaceFilter, menu: true }), h('span', { key: 'sp', className: 'cx-tools-spacer' }), h(IconButton, { name: 'refresh', key: 'r', className: 'cx-btn xs cx-icon-btn cx-tool-refresh', disabled: !node, onClick: () => act('REFRESH STORE', () => loadStore(node)), title: t('refresh') }), h(IconButton, { name: 'plus', key: 't', className: 'cx-btn xs cx-icon-btn', disabled: !space, onClick: () => setModal('app'), title: t('create') + ' ' + t('template') })]
              : [h('button', { key: 's', className: 'cx-btn xs pri', disabled: !node, onClick: showStore }, t('store')), h(MultiFilter, { key: 'f', label: t('space'), options: appSpaceOptions, value: appSpaceFilter, onChange: setAppSpaceFilter, menu: true }), h('span', { key: 'sp', className: 'cx-tools-spacer' }), h(IconButton, { name: 'refresh', key: 'r', className: 'cx-btn xs cx-icon-btn cx-tool-refresh', disabled: !node, onClick: () => act('REFRESH RECENT', () => loadApps(node, space, actorUid)), title: t('refresh') }), h(IconButton, { name: 'plus', key: 'c', className: 'cx-btn xs cx-icon-btn', disabled: !space, onClick: () => setModal('app'), title: t('create') + ' ' + t('template') })],
          },
            appMode === 'store'
              ? (storeRows.length ? storeRows.map((s) => h(StoreRow, { key: `${s.space}:${s.command}:${s.uid}`, s, onCreate: openStoreCreate, busy: !!busy, onAction: storeAct, onCode: storeCode, onConfig: storeConfig, locale, node })) : h('div', { className: 'cx-empty' }, '应用商店加载中，或当前节点没有 service。'))
              : (!node ? h('div', { className: 'cx-empty' }, '先选择左侧服务节点。') : appRows.length ? appRows.map((a) => h(AppRow, { key: `${a.space}:${a.command}:${a.place_uid || a.name}`, a, active: app?.place_uid === a.place_uid, onSelect: selectApp, onOpen: openApp, locale, node })) : h('div', { className: 'cx-empty' }, '该用户最近还没有应用。用「应用商店」创建，或 AI 生成模板。'))),
          h(Panel, {
            icon: 'web', title: tp('web'), count: webTabs.length ? `${webTabs.length} TABS` : 'NO TAB',
          },
            h('div', { className: `cx-web${webMax ? ' max' : ''}`, ref: webBoxRef },
              h('div', { className: 'cx-webtabs' },
                webTabs.map((t) => h('div', { key: t.id, className: `cx-webtab${t.id === activeTab?.id ? ' on' : ''}`, onClick: () => { setActiveWeb(t.id); setApp(t.app || null); }, onContextMenu: (e) => { e.preventDefault(); e.stopPropagation(); setWebMenu({ x: e.clientX, y: e.clientY, id: t.id, tab: t }); } },
                  tabIcon(t),
                  h('span', { style: { overflow: 'hidden', textOverflow: 'ellipsis' } }, t.title || t.url),
                  h(IconButton, { name: 'close', className: 'x', onClick: (e) => { e.stopPropagation(); closeWeb(t.id); } }))),
                h(IconButton, { name: 'plus', className: 'cx-btn xs', disabled: !node, onClick: () => node && openNode(node) })),
              activeTab ? h('div', { className: 'cx-addrbar' },
                h(IconButton, { name: 'arrowLeft', className: 'nav', disabled: !(webHist[activeTab.id] && webHist[activeTab.id].idx > 0), onClick: goBack, title: T('后退') }),
                h(IconButton, { name: 'arrowRight', className: 'nav', disabled: !(webHist[activeTab.id] && webHist[activeTab.id].idx < webHist[activeTab.id].list.length - 1), onClick: goFwd, title: T('前进') }),
                h(IconButton, { name: 'refresh', className: 'nav', onClick: reloadWeb, title: T('刷新') }),
                h('input', { className: 'cx-addr-input', value: webAddr, placeholder: 'https://…', onChange: (e) => setWebAddr(e.target.value), onKeyDown: (e) => { if (e.key === 'Enter') navWeb(activeTab.id, webAddr); } }),
                h(IconButton, { name: webMax ? 'restore' : 'fullscreen', className: 'nav', onClick: () => setWebMax((v) => !v), title: webMax ? T('恢复') : T('最大化') }),
                h(MenuButton, { items: [
                  { label: '复制地址', action: () => { try { navigator.clipboard.writeText(displayUrl(activeTab.base || activeTab.url)); } catch {} } },
                  { label: '在浏览器打开', action: () => { try { window.open(activeTab.base || activeTab.url, '_blank'); } catch {} } },
                  { label: '刷新', action: reloadWeb },
                  { label: '关闭标签', danger: true, action: () => closeWeb(activeTab.id) },
                ] })) : null,
              h('div', { className: 'cx-webframe' },
                !webTabs.length
                  ? h('div', { className: 'cx-empty' }, '点击最近应用 OPEN，或节点/空间 OPEN，在此多标签打开。')
                  : viewMode !== 'manage'
                    ? h('div', { className: 'cx-empty' }, '切换到管理视图加载网页')
                    : [webTabs.map((t) => h('iframe', {
                        key: `${t.id}#${t.reload || 0}`, src: withView(withActor(t.base || t.url)), title: t.title || 'web', allow: 'clipboard-read; clipboard-write',
                        className: t.id === activeTab?.id ? 'on' : '',
                        onLoad: () => setWebLoaded((m) => m[t.id] ? m : { ...m, [t.id]: 1 }),
                      })),
                      activeTab && !webLoaded[activeTab.id] ? h('div', { key: 'loadmask', className: 'cx-webmask' }, '加载中…') : null])))),

        consoleOpen ? h('div', { className: `cx-console${consoleMax ? ' max' : ''}`, ref: consoleBoxRef, style: consoleMax ? null : { height: consoleHeight } },
          h('div', { className: 'cx-console-h' },
            h('div', { className: 'cx-console-tabs' },
              h('button', { className: `cx-console-tab${consoleTab === 'events' ? ' on' : ''}`, onClick: () => setConsoleTab('events') }, 'EVENTS', h('span', null, events.length)),
              h('button', { className: `cx-console-tab${consoleTab === 'activity' ? ' on' : ''}`, onClick: () => setConsoleTab('activity') }, 'ACTIVITY', h('span', null, logs.length)),
              h('button', { className: `cx-console-tab${consoleTab === 'request' ? ' on' : ''}`, onClick: () => setConsoleTab('request') }, 'REQUEST', h('span', null, (reqLog || []).length)),
              h('button', { className: `cx-console-tab${consoleTab === 'debug' ? ' on' : ''}`, onClick: () => setConsoleTab('debug') }, 'DEBUG / URL', h('span', null, debug.length)),
              h('button', { className: `cx-console-tab${consoleTab === 'state' ? ' on' : ''}`, onClick: () => setConsoleTab('state') }, 'STATE', h('span', null, stateRows.length)),
              h('button', { className: `cx-console-tab${consoleTab === 'files' ? ' on' : ''}`, onClick: () => setConsoleTab('files') }, 'FILES', h('span', null, files?.files?.length ?? '')),
              h('button', { className: `cx-console-tab${consoleTab === 'terminal' ? ' on' : ''}`, onClick: () => { setDetail(null); setConsoleTab('terminal'); } }, 'TERMINAL')),
            h('span', { className: 'cx-console-status' }, busy ? `RUNNING: ${busy}` : 'IDLE'),
            h('div', { className: 'cx-console-actions' },
              consoleTab === 'terminal' ? h('div', { className: 'cx-term-acts' },
                h('button', { className: 'cx-term-act', onClick: () => consoleTermDo(node, space, 'refresh'), title: T('刷新') }, T('刷新')),
                h('button', { className: 'cx-term-act', onClick: () => consoleTermDo(node, space, 'clear'), title: T('清屏') }, T('清屏')),
                h('button', { className: 'cx-term-act', onClick: () => consoleTermDo(node, space, 'reconnect'), title: T('重连') }, T('重连')),
                h('button', { className: `cx-term-act${termSplit ? ' on' : ''}`, onClick: () => setTermSplit((v) => !v), title: T('分屏') }, T('分屏'))) : null,
              h('button', { className: 'cx-console-clear', onClick: () => { setLogs([]); logsRef.current = []; setReqLog([]); reqLogRef.current = []; setDebug([]); setEvents([]); setFiles(null); setDetail(null); }, title: '清空' }, '清空'),
              h(IconButton, { name: consoleMax ? 'restore' : 'fullscreen', onClick: () => setConsoleMax((v) => !v), title: consoleMax ? T('恢复') : T('最大化') }),
              h(IconButton, { name: 'close', onClick: () => setConsoleOpen(false), title: T('关闭') }))),
          h('div', { className: 'cx-console-body' },
            consoleTab === 'terminal' ? h('div', { className: `cx-console-terms${termSplit ? ' split' : ''}` },
              h(ConsoleTerminal, { node, space, slot: '' }),
              termSplit ? h(ConsoleTerminal, { node, space, slot: '-b' }) : null) : h('div', { className: 'cx-console-main', ref: logRef },
            h('table', { className: 'cx-console-table' },
              h('thead', null, h('tr', null, consoleTable.cols.map((c) => h('th', { key: c.k, onClick: (e) => { e.stopPropagation(); setSort((sp) => sp.key === c.k ? { key: c.k, dir: -sp.dir } : { key: c.k, dir: 1 }); } }, c.label, sortKey === c.k ? (sort.dir > 0 ? ' ▲' : ' ▼') : '')))),
              h('tbody', null, sortedRows.map((r, i) => h('tr', {
                key: i,
                className: `${String(r.ok) === 'ERR' ? 'err' : ''}${detail && detail.key === rowKey(r) ? ' on' : ''}`,
                onClick: () => openDetail(r),
              }, consoleTable.cols.map((c) => h('td', { key: c.k, className: c.k === 'loc' ? 'cx-loc' : '' }, String(r[c.k] ?? '')))))),
            ),
            sortedRows.length === 0 ? h('div', { className: 'cx-line' }, h('span', { className: 'm' }, consoleTab === 'files' ? '没有数据文件（服务端重启后可用）' : '等待操作…')) : null),
            detail && consoleTab !== 'terminal' ? h(DebugDetail, { detail, onClose: () => setDetail(null) }) : null),
          h('div', { className: 'cx-console-resize', onPointerDown: startConsoleResize })) : h('button', { className: 'cx-console-open', onClick: () => setConsoleOpen(true) }, 'CONSOLE'),
        webMenu ? h('div', { className: 'cx-ctxmenu', style: { left: Math.min(webMenu.x, Math.max(0, (typeof window !== 'undefined' ? window.innerWidth : 1200) - 210)), top: Math.min(webMenu.y, Math.max(0, (typeof window !== 'undefined' ? window.innerHeight : 800) - 220)) }, onMouseDown: (e) => e.stopPropagation() },
          h('div', { className: 'cx-ctxmenu-t' }, webMenu.tab?.title || webMenu.tab?.url || 'WEB'),
          [['关闭', () => closeWeb(webMenu.id)], ['关闭其它标签', () => closeOthers(webMenu.id)], ['关闭全部标签', closeAll], ['刷新', () => reloadTab(webMenu.id)], ['外部打开', () => openUrl(webMenu.tab?.url || '')]].map(([label, action]) => h('button', { key: label, onClick: () => { setWebMenu(null); action(); } }, T(label))),
          webMenu.tab?.app ? h(React.Fragment, null,
            h('button', { onClick: () => { setWebMenu(null); setApp(webMenu.tab.app); setModal('code'); } }, T('编辑代码')),
            h('button', { onClick: () => { setWebMenu(null); setApp(webMenu.tab.app); setViewMode('chat'); setFormReq({ app: webMenu.tab.app, at: Date.now() }); } }, T('添加数据')),
            h('button', { onClick: () => { setWebMenu(null); setApp(webMenu.tab.app); setModal('instance'); } }, T('创建应用实例'))) : null) : null,
        modal === 'deploy' ? h(DeployModal, { onClose: () => setModal(null), onDone: () => { act('LOAD NODES', loadNodes); }, onScan: () => { setModal(null); setShowDevices(true); } }) : null,
        modal === 'space' ? h(SpaceModal, { node, onClose: () => setModal(null), onDone: (name) => { setModal(null); act('LOAD SPACES', async () => { await loadSpaces(node); setSpace(name); }); } }) : null,
        modal === 'app' ? h(AppModal, { node, space, onClose: () => setModal(null), onDone: (r) => { setModal(null); const synthetic = { name: r.name, title: r.help, command: r.command, space: r.space, path: r.path, place: r.place || '', functions: [], recent: false }; setApps((xs) => [synthetic, ...xs.filter((a) => !(a.name === synthetic.name && a.command === synthetic.command))]); setApp(synthetic); openApp(synthetic); act('LOAD RECENT', () => loadApps(node, space, actorUid)); } }) : null,
        modal === 'data' && currentApp ? h(DataModal, { node, space: currentApp.space || space, app: currentApp, onClose: () => setModal(null) }) : null,
        modal === 'code' && currentApp ? h(CodeModal, { node, space: currentApp.space || space, app: currentApp, onClose: () => setModal(null) }) : null,
        modal === 'instance' && currentApp ? h(InstanceModal, { node, space: currentApp.space || space, app: currentApp, avatar, onClose: () => setModal(null), onDone: (r) => { setModal(null); act('LOAD RECENT', () => selectCreated(r)); } }) : null,
        modal === 'storeInstance' && storeService ? h(StoreInstanceModal, { node, service: storeService, avatar, onClose: () => setModal(null), onDone: (r) => { setModal(null); setStoreService(null); act('LOAD RECENT', () => selectCreated(r)); } }) : null,
        showDevices ? h(DeviceModal, { node, onClose: () => setShowDevices(false) }) : null,
        updOpen ? h(UpdateModal, { info: upd, busy: updBusy, onCheck: () => checkUpd(true), onClose: () => setUpdOpen(false) }) : null,
        showAvatars ? h(AvatarModal, { node, data: avatarData, active: avatar, onClose: () => setShowAvatars(false), onSelect: (a) => { setAvatar(a); setShowAvatars(false); }, onCreated: async (a) => { const d = await api('avatars', { node }); setAvatarData(d); const found = (d.items || []).find((x) => x.uid === a.uid) || a; setAvatar(found); setShowAvatars(false); }, onUpdated: async (a) => { const d = await api('avatars', { node }); setAvatarData(d); const found = (d.items || []).find((x) => x.uid === a.uid) || a; setAvatar(found); } }) : null,
        h(InitOverlay, { state: initState, onClose: () => setInitState(null), onStart: runInit, onRetry: retryInit, onLoginRemote: (cfg) => api('remoteLogin', cfg) }),
        dataPulse ? h('div', { key: dataPulse, className: 'cx-data-flash', 'aria-hidden': 'true' }) : null,
        toast ? h('div', { key: toast.id, className: `cx-toast ${toast.kind}`, role: 'status', 'aria-live': 'polite' }, h('span', { className: 'cx-toast-mark' }, toast.kind === 'err' ? '!' : '✓'), h('span', null, toast.text)) : null,
        busy ? h('div', { className: 'cx-busy-overlay', role: 'status', 'aria-live': 'polite' },
          h('div', { className: 'cx-busy-card' },
            h('button', { className: 'cx-busy-close', title: T('关闭'), 'aria-label': T('关闭'), onClick: () => setBusy('') }, '×'),
            h('span', { className: 'cx-busy-spinner' }), h('div', null, h('b', null, busy), h('div', { className: 'cx-busy-sub' }, locale === 'zh' ? '正在等待接口返回…' : 'Waiting for API…')))) : null,
        viewMode !== 'chat' ? h('button', { className: 'cx-chat-fab', onClick: () => setViewMode('chat'), title: 'AI Copilot' }, 'AI') : null);
    }

    class Boundary extends React.Component {
      constructor(props) { super(props); this.state = { err: null }; }
      static getDerivedStateFromError(e) { return { err: e }; }
      componentDidCatch(e) { reportError(String(e?.message || e)); }
      render() {
        if (!this.state.err) return this.props.children;
        return h('div', { className: 'cx-error-pane', role: 'alert' },
          h('div', { className: 'cx-error-title' }, T('界面出现错误')),
          h('div', { className: 'cx-error-msg' }, String(this.state.err?.message || this.state.err)),
          h('div', { className: 'cx-error-actions' },
            h('button', { className: 'cx-btn', onClick: () => this.setState({ err: null }) }, T('重试')),
            h('button', { className: 'cx-btn pri', onClick: () => location.reload() }, T('刷新页面')),
            h('button', { className: 'cx-btn', onClick: () => this.setState({ err: null }) }, T('返回'))));
      }
    }

    return {
      inject: ['slots', 'layout'],
      apply(ctx) {
        try { CX_LAYOUT = ctx.layout || (ctx.get && ctx.get('layout')) || null; } catch {}
        ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({ name: 'sidebar.panellist', id: 'dsh-contextos-devops', order: 20, label: () => 'ContextOS DevOps' }, Icon));
        ctx.slots.inject('main', () => ctx.slots.register({ name: 'main', key: 'dsh-contextos-devops' }, () => h(Boundary, null, h(Page))));
        // 会话标签条：ContextOS 作为「标签」出现（与 Chat / Trajectory 并列），点击切到本视图
        ctx.slots.inject('conversation.view', () => ctx.slots.register({ name: 'conversation.view', id: 'contextos', order: 5, label: () => 'ContextOS' },
          (props) => h('div', { className: 'cx-view-host' }, h(Boundary, null, h(CtxCenter, { sessionId: (props && props.sessionId) || '', inline: true })))));
        // 输入框内最左：ContextOS 芯片（切换服务节点 / 打开控制台）
        ctx.slots.inject('conversation.input.left', () => ctx.slots.register({ name: 'conversation.input.left', id: 'dsh-contextos-devops', order: 0 }, (props) => h(CtxChip, { sessionId: (props && props.sessionId) || '', selectView: props && props.selectView })));
      },
    };
  },
});
