    // 统一品牌标识（科技风）：devops = 六边集群，copilot = 神经 C 核心
    function CtxMark({ variant = 'devops', size = 22 }) {
      if (variant === 'copilot') {
        return h('svg', { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': true },
          h('path', { d: 'M17.2 7.1a6.5 6.5 0 1 0 0 9.8', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' }),
          h('circle', { cx: 11.2, cy: 12, r: 1.7, fill: 'currentColor' }),
          h('path', { d: 'M17.6 5.4 21 2.4', stroke: 'currentColor', strokeWidth: 1.4, strokeLinecap: 'round' }),
          h('path', { d: 'M19.4 9.2h2.9', stroke: 'currentColor', strokeWidth: 1.4, strokeLinecap: 'round' }),
          h('path', { d: 'M18.9 15.1l2.2 2.2', stroke: 'currentColor', strokeWidth: 1.4, strokeLinecap: 'round' }));
      }
      const pts = [[12, 2.8], [19.9, 7.4], [19.9, 16.6], [12, 21.2], [4.1, 16.6], [4.1, 7.4]];
      return h('svg', { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': true },
        h('path', { d: 'M12 2.8 19.9 7.4v9.2L12 21.2 4.1 16.6V7.4Z', stroke: 'currentColor', strokeWidth: 1.5, strokeLinejoin: 'round' }),
        h('path', { d: 'M12 6.9 16.4 9.5v4.9L12 17 7.6 14.4V9.5Z', stroke: 'currentColor', strokeWidth: 1.1, opacity: '.55', strokeLinejoin: 'round' }),
        h('circle', { cx: 12, cy: 12, r: 1.7, fill: 'currentColor' }),
        ...pts.map(([x, y], i) => h('circle', { key: i, cx: x, cy: y, r: i % 2 ? 1 : 1.2, fill: 'currentColor' })));
    }

    function Ico({ name, size = 12 }) {
      const d = {
        target: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z M12 11.2a.8.8 0 1 0 0 1.6.8.8 0 0 0 0-1.6Z',
        plan: 'M4 6h3v3H4z M10 7.5h10 M4 15h3v3H4z M10 16.5h10',
        task: 'M4 6h6 M4 12h6 M4 18h6 M13 7l2 2 4-4 M13 15l2 2 4-4',
        report: 'M6 3h8l4 4v14H6z M14 3v4h4 M9 12h6 M9 16h4',
        feedback: 'M4 5h16v10H9l-5 4z M8 9h8 M8 12h5',
        clock: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z M12 7v5l3 2',
        map: 'M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Z M9 4v14 M15 6v14',
      }[name];
      return h('span', { className: `cx-ico cx-ico-${name || 'dot'}` },
        h('svg', { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', style: { display: 'block' } }, h('path', { d: d || '' })));
    }

    function Icon({ size = 15 }) {
      return h('svg', { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': true },
        h('path', { d: 'M12 2 3 7v10l9 5 9-5V7l-9-5Z', stroke: 'currentColor', strokeWidth: 1.5 }),
        h('path', { d: 'M12 12 3 7M12 12l9-5M12 12v10', stroke: 'currentColor', strokeWidth: 1.1, opacity: .7 }),
        h('circle', { cx: 12, cy: 12, r: 1.7, fill: 'currentColor' }));
    }

    function Panel({ index, icon, title, count, tools, children }) {
      const [zh, en] = String(title || '').split(' / ');
      return h('section', { className: 'cx-panel' },
        h('div', { className: 'cx-ph' }, h(UiAffordance, { icon, zh, en, mode: 'full', iconSize: 18, className: 'cx-panel-title' }), h('span', { className: 'cnt' }, count || '')),
        tools ? h('div', { className: 'cx-tools' }, tools) : null,
        h('div', { className: 'cx-list' }, children));
    }

    // ==== UI KIT：全局通用组件。新界面只允许组合这里的组件 + cx-* token，禁止再手写 cx-empty/cx-err。 ====
    const TOKENS = { space: [4, 8, 12, 16, 24], radius: [6, 8, 12], font: [10, 11, 12, 13, 15] };
    function Btn({ kind = 'default', size = 'md', icon, children, ...rest }) {
      const cls = `cx-btn${kind !== 'default' ? ` cx-${kind}` : ''}${size === 'sm' ? ' cx-sm' : ''}`;
      return h('button', { type: 'button', className: cls, ...rest }, icon ? h(Ico, { name: icon }) : null, children);
    }
    function Toolbar({ children, className = '' }) { return h('div', { className: `cx-tools ${className}`.trim() }, children); }
    function Section({ title, tools, children }) { return h('div', { className: 'cx-section' }, title ? h('div', { className: 'cx-section-h' }, title) : null, tools ? h(Toolbar, null, tools) : null, children); }
    function Field({ label, children }) { return h('label', { className: 'cx-field' }, h('span', null, label), children); }
    function EmptyState({ text, style }) { return h('div', { className: 'cx-empty', style }, text); }
    function ErrorBox({ text }) { return h('div', { className: 'cx-err' }, text); }
    function Hint({ text, className = '' }) { return h('div', { className: `cx-hint ${className}`.trim() }, text); }
    function Card({ title, children, ...rest }) { return h('div', { className: 'cx-card', ...rest }, title ? h('div', { className: 'cx-card-head' }, title) : null, children); }
    function Tabs({ items, value, onChange }) { return h('div', { className: 'cx-tabs' }, items.map((it) => h('button', { key: it.value, type: 'button', className: `cx-tab${value === it.value ? ' on' : ''}`, onClick: () => onChange(it.value) }, it.label))); }

    const UID_RE = /^[0-9a-f]{32}$/i;
    const UID_ALIASES = { targetUID: 'target_uid', targetId: 'target_uid', target_uid: 'target_uid', planUID: 'plan_uid', planId: 'plan_uid', plan_uid: 'plan_uid', taskUID: 'task_uid', taskId: 'task_uid', task_uid: 'task_uid', reportUID: 'report_uid', reportId: 'report_uid', report_uid: 'report_uid', feedbackUID: 'feedback_uid', feedbackId: 'feedback_uid', feedback_uid: 'feedback_uid' };
    function uidFieldMap(input = {}) {
      const out = {};
      for (const [key, value] of Object.entries(input || {})) {
        const canonical = UID_ALIASES[key];
        if (canonical && value && UID_RE.test(String(value))) out[canonical] = String(value);
      }
      return out;
    }

    const UI_ICONS = {
      monitor: ['M2.2 3.2h11.6v7.2H2.2z', 'M5.4 13.2h5.2', 'M8 10.4v2.8'],
      ecom: ['M2 2.6h2.1l1.5 8.2h7.6l1.4-6H5.2', 'M6.4 13.4a.9.9 0 1 0 0-.1', 'M11.6 13.4a.9.9 0 1 0 0-.1'],
      sun: ['M8 5.4a2.6 2.6 0 1 0 0 5.2 2.6 2.6 0 0 0 0-5.2z', 'M8 1.6v1.6', 'M8 12.8v1.6', 'M1.6 8h1.6', 'M12.8 8h1.6', 'M3.5 3.5l1.1 1.1', 'M11.4 11.4l1.1 1.1', 'M12.5 3.5l-1.1 1.1', 'M4.6 11.4l-1.1 1.1'],
      moon: ['M12.6 9.6A5.2 5.2 0 0 1 6.4 3.4a5.6 5.6 0 1 0 6.2 6.2z'],
      auto: ['M8 2.2a5.8 5.8 0 1 0 0 11.6A5.8 5.8 0 0 0 8 2.2z', 'M8 2.2v11.6'],
      chevronRight: ['M6 4l4 4-4 4'],
      chevronDown: ['M4 6l4 4 4-4'],
      refresh: ['M13.5 8a5.5 5.5 0 1 1-1.7-3.9', 'M13.5 2.8v3.4h-3.4'],
      plus: ['M8 3v10', 'M3 8h10'],
      more: ['M3.5 8h.01', 'M8 8h.01', 'M12.5 8h.01'],
      settings: ['M8 2.2v1.8', 'M8 12v1.8', 'M2.2 8h1.8', 'M12 8h1.8', 'M4.1 4.1l1.3 1.3', 'M10.6 10.6l1.3 1.3', 'M11.9 4.1l-1.3 1.3', 'M5.4 10.6l-1.3 1.3', 'M8 5.2a2.8 2.8 0 1 0 0 5.6 2.8 2.8 0 0 0 0-5.6z'],
      gear: ['M8 2.2l1.1 1.9 2.2-.4.8 2.1 1.9 1.1-1.1 1.9 1.1 1.9-1.9 1.1-.8 2.1-2.2-.4L8 13.8l-1.1-1.9-2.2.4-.8-2.1L2 8.9l1.1-1.9L2 5.1l1.9-1.1.8-2.1 2.2.4z', 'M8 6.2a1.8 1.8 0 1 0 0 3.6 1.8 1.8 0 0 0 0-3.6'],
      init: ['M8 2v12', 'M2 8h12', 'M4.2 4.2l7.6 7.6', 'M11.8 4.2l-7.6 7.6'],
      close: ['M4 4l8 8', 'M12 4l-8 8'],
      chat: ['M3 4.5h10v6H8l-3 2v-2H3z'],
      manage: ['M3 4h10', 'M3 8h10', 'M3 12h10', 'M6 2.8v2.4', 'M10 6.8v2.4', 'M7 10.8v2.4'],
      dev: ['M6 4L3 8l3 4', 'M10 4l3 4-3 4'],
      chevronUp: ['M4 10l4-4 4 4'],
      arrowLeft: ['M13 8H3', 'M7 4L3 8l4 4'],
      arrowRight: ['M3 8h10', 'M9 4l4 4-4 4'],
      fullscreen: ['M6 3H3v3', 'M10 3h3v3', 'M6 13H3v-3', 'M10 13h3v-3'],
      restore: ['M3 6h3V3', 'M13 6h-3V3', 'M3 10h3v3', 'M13 10h-3v3'],
      panelLeft: ['M3 3h10v10H3z', 'M6 3v10'],
      panelRight: ['M3 3h10v10H3z', 'M10 3v10'],
      panelBottom: ['M3 3h10v10H3z', 'M3 10h10'],
      save: ['M8 3v7', 'M5 7l3 3 3-3', 'M3 13h10'],
      copy: ['M6 5h7v8H6z', 'M3 3h7v2', 'M3 3v8h2'],
      check: ['M3 8l3 3 7-7'],
      send: ['M8 13V3', 'M4 7l4-4 4 4'],
      bolt: ['M8 2L4 9h3l-1 5 4-7H7z'],
      external: ['M9 3h4v4', 'M13 3L7 9', 'M5 3H3v10h10v-2'],
      minus: ['M3 8h10'],
      locate: ['M8 2a6 6 0 1 0 0 12A6 6 0 0 0 8 2z', 'M8 6a2 2 0 1 0 0 4 2 2 0 0 0 0-4z', 'M8 1v2', 'M8 13v2', 'M1 8h2', 'M13 8h2'],
      server: ['M3 3h10v4H3z', 'M3 9h10v4H3z', 'M5 5h.01', 'M5 11h.01'],
      space: ['M3 5h4l1 2h5v6H3z'],
      app: ['M3 3h4v4H3z', 'M9 3h4v4H9z', 'M3 9h4v4H3z', 'M9 9h4v4H9z'],
      web: ['M8 2a6 6 0 1 0 0 12A6 6 0 0 0 8 2z', 'M2 8h12', 'M8 2c2 2 2 10 0 12', 'M8 2c-2 2-2 10 0 12'],
      avatar: ['M8 3a2.2 2.2 0 1 0 0 4.4A2.2 2.2 0 0 0 8 3z', 'M3.5 13c0-2.5 2-4 4.5-4s4.5 1.5 4.5 4'],
      image: ['M3 4h10v8H3z', 'M5 9l2-2 2 2 2-2 2 2', 'M5 6.5h.01'],
      factory: ['M3 13V7l3 2V7l3 2V5h3v8z', 'M5 13v-2h2v2', 'M9 13v-2h2v2'],
      layers: ['M8 2l5 3-5 3-5-3z', 'M3 8l5 3 5-3', 'M3 11l5 3 5-3'],
      home: ['M3 7l5-4 5 4v6H3z', 'M6.5 13V9h3v4'],
      pulse: ['M2 8.5h3l1.8-4.2 2.4 8 1.8-4.6h2.4'],
      lock: ['M4.6 7.2V5.4a3.4 3.4 0 0 1 6.8 0v1.8', 'M3.4 7.2h9.2v6.2H3.4z', 'M8 9.6v1.8'],
      setting: ['M8 5.6a2.4 2.4 0 1 0 0 4.8 2.4 2.4 0 0 0 0-4.8', 'M8 1.6v1.8', 'M8 12.6v1.8', 'M1.6 8h1.8', 'M12.6 8h1.8'],
      terminal: ['M3 4h10v8H3z', 'M5.5 7l2 2-2 2', 'M9 11h2'],
      stop: ['M4.5 4.5h7v7h-7z'],
      trash: ['M4 5h8', 'M6.2 5V3.2h3.6V5', 'M5.2 5l.5 8h4.6l.5-8'],
    };
    function UiIcon({ name, size = 16 }) {
      const paths = UI_ICONS[name] || UI_ICONS.chevronRight;
      return h('svg', { viewBox: '0 0 16 16', width: size, height: size, fill: 'none', stroke: 'currentColor', strokeWidth: 1.4, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': 'true', focusable: 'false' },
        paths.map((d, i) => h('path', { key: i, d })));
    }
    function IconButton({ name, title, onClick, className = '', size = 16, disabled = false, ...rest }) {
      return h(UiAffordance, { as: 'button', icon: name, iconSize: size, mode: 'icon', className: `cx-icon ${className}`.trim(), title, disabled, onClick, ...rest });
    }
    // 五档评分统一用星星表示（卡片副标题、表单下拉共用）
    function cxStars(n) {
      const v = Math.max(0, Math.min(5, Number(n) || 0));
      return '★'.repeat(v) + '☆'.repeat(5 - v);
    }
    // 三态切换按钮：一个图标/文字按钮显示当前档，点击循环到下一档。
    // （三枚并排的分段太占标题栏宽度，改成单按钮「状态切换的图标」。）
    // ── 确认对话框（抽象组件，替代 window.confirm）────────────────────────────
    // 用法：if (!(await cxAsk('删除「x」？'))) return;
    let askPending = null;
    const askSubs = new Set();
    function cxAsk(message, { ok = '', cancel = '', danger = true } = {}) {
      return new Promise((resolve) => {
        askPending = { message, ok, cancel, danger, resolve };
        askSubs.forEach((fn) => fn());
      });
    }
    function CxConfirmHost() {
      const [, bump] = useState(0);
      useEffect(() => { const fn = () => bump((n) => n + 1); askSubs.add(fn); return () => askSubs.delete(fn); }, []);
      if (!askPending) return null;
      const cur = askPending;
      const settle = (v) => { askPending = null; askSubs.forEach((fn) => fn()); cur.resolve(v); };
      return h('div', { className: 'cx-mask', onClick: () => settle(false) },
        h('div', { className: 'cx-card cx-confirm', role: 'dialog', 'aria-modal': 'true', onClick: (e) => e.stopPropagation() },
          h('div', { className: 'cx-confirm-msg' }, cur.message),
          h('div', { className: 'cx-foot' },
            h('button', { className: 'cx-btn', onClick: () => settle(false) }, T(cur.cancel || '取消')),
            h('button', { className: `cx-btn pri${cur.danger ? ' danger' : ''}`, onClick: () => settle(true) }, T(cur.ok || '确定')))));
    }

    // ── 组合输入框（可输入 + 统一风格下拉，替代原生 datalist）──────────────
    // 浮层定位：position:fixed 才不会被弹窗的 overflow:auto 裁掉；
    // 宽度跟随触发元素（下拉与输入框同宽），下方空间不足时向上翻。
    // position:fixed 在带 transform / backdrop-filter 的祖先内会退化成「相对该祖先」，
    // 于是首次算出的 left/top 会整体偏移。量一次面板真实位置，把差值补回去即可收敛。
    function cxPopSettle(anchor, panel, panelH, minW) {
      const want = cxPopStyle(anchor, panelH, minW);
      if (!panel || typeof panel.getBoundingClientRect !== 'function') return want;
      const got = panel.getBoundingClientRect();
      const dx = want.left - got.left;
      const dy = want.top - got.top;
      // 已经对齐就返回 null：重复写入同一坐标会让「被祖先带偏」的浮层来回跳一格
      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return null;
      return { ...want, left: Math.round(want.left + dx), top: Math.round(want.top + dy) };
    }

    // 打开期间连续校正：弹窗有入场动画（transform/backdrop-filter），单次测量会偏。
    function cxPopTrack(anchorRef, popRef, panelH, minW, setPos) {
      const place = () => {
        const next = cxPopSettle(anchorRef.current, popRef.current, panelH, minW);
        if (next) setPos(next);
      };
      let raf = 0;
      let n = 0;
      const tick = () => { place(); if (++n < 48) raf = requestAnimationFrame(tick); };
      tick();
      const onScroll = () => place();
      window.addEventListener('scroll', onScroll, true);
      window.addEventListener('resize', onScroll);
      return () => {
        cancelAnimationFrame(raf);
        window.removeEventListener('scroll', onScroll, true);
        window.removeEventListener('resize', onScroll);
      };
    }

    function cxPopStyle(el, panelH, minW) {
      if (!el || typeof el.getBoundingClientRect !== 'function') return { left: 0, top: 0, width: minW || 240 };
      const r = el.getBoundingClientRect();
      const vh = (typeof window !== 'undefined' ? window.innerHeight : 800) || 800;
      const vw = (typeof window !== 'undefined' ? window.innerWidth : 1200) || 1200;
      const width = Math.max(minW || 0, Math.round(r.width));
      const below = vh - r.bottom - 8;
      const up = below < panelH && r.top > below;
      const top = up ? Math.max(8, r.top - panelH - 4) : Math.round(r.bottom + 4);
      const left = Math.max(8, Math.min(Math.round(r.left), vw - width - 8));
      return { left, top, width, maxHeight: Math.max(160, Math.min(panelH, up ? r.top - 16 : below)) };
    }

    function CxCombo({ value, onChange, options, onFocus, placeholder, required }) {
      const [open, setOpen] = useState(false);
      const [pos, setPos] = useState(null);
      const wrapRef = useRef(null);
      const opts = options || [];
      useEffect(() => {
        if (!open) return;
        const away = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
        const esc = (e) => { if (e.key === 'Escape') setOpen(false); };
        const stop = cxPopTrack(wrapRef, popRef, 280, 160, setPos);
        document.addEventListener('mousedown', away);
        document.addEventListener('keydown', esc);
        return () => {
          stop();
          document.removeEventListener('mousedown', away);
          document.removeEventListener('keydown', esc);
        };
      }, [open]);
      const q = String(value ?? '').toLowerCase();
      const shown = q ? opts.filter((o) => String(o.label ?? o.name ?? o.value).toLowerCase().includes(q)) : opts;
      return h('div', { className: `cx-combo${open ? ' on' : ''}`, ref: wrapRef },
        h('input', {
          className: 'cx-input', value: value ?? '', placeholder, 'aria-required': required || undefined,
          onFocus: () => { onFocus && onFocus(); setOpen(true); },
          onChange: (e) => { onChange(e.target.value); setOpen(true); },
        }),
        h('button', { type: 'button', className: 'cx-combo-btn', 'aria-label': T('更多'), onClick: () => { onFocus && onFocus(); setOpen((v) => !v); } }, h(UiIcon, { name: 'chevronDown', size: 12 })),
        open && shown.length ? h('div', { className: 'cx-drop-pop cx-combo-pop', ref: popRef, style: pos || undefined },
          shown.slice(0, 50).map((o) => h('button', {
            key: String(o.value), type: 'button', className: `cx-combo-item${String(o.value) === String(value) ? ' on' : ''}`,
            onClick: () => { onChange(String(o.label ?? o.name ?? o.value)); setOpen(false); },
          }, T(String(o.label ?? o.name ?? o.value))))) : null);
    }

    // ── 日期时间选择（统一风格，返回 YYYY-MM-DD HH:mm:ss）─────────────────
    const cxPad = (n) => String(n).padStart(2, '0');
    function cxParseWhen(v) {
      const m = String(v || '').match(/(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
      const now = new Date();
      return m
        ? { y: +m[1], mo: +m[2], d: +m[3], hh: +(m[4] ?? 0), mm: +(m[5] ?? 0), ss: +(m[6] ?? 0) }
        : { y: now.getFullYear(), mo: now.getMonth() + 1, d: now.getDate(), hh: 0, mm: 0, ss: 0 };
    }
    function cxWhenText(p) { return `${p.y}-${cxPad(p.mo)}-${cxPad(p.d)} ${cxPad(p.hh)}:${cxPad(p.mm)}:${cxPad(p.ss)}`; }
    function CxDateTime({ value, onChange }) {
      const [open, setOpen] = useState(false);
      const [pos, setPos] = useState(null);
      const [p, setP] = useState(() => cxParseWhen(value));
      useEffect(() => { setP(cxParseWhen(value)); }, [value]);
      const ref = useRef(null);
      const popRef = useRef(null);
      useEffect(() => {
        if (!open) return;
        const away = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        const esc = (e) => { if (e.key === 'Escape') setOpen(false); };
        const stop = cxPopTrack(ref, popRef, 320, 264, setPos);
        document.addEventListener('mousedown', away);
        document.addEventListener('keydown', esc);
        return () => {
          stop();
          document.removeEventListener('mousedown', away);
          document.removeEventListener('keydown', esc);
        };
      }, [open]);
      const first = new Date(p.y, p.mo - 1, 1).getDay();
      const days = new Date(p.y, p.mo, 0).getDate();
      const shift = (dy, dm) => {
        const d = new Date(p.y + dy, p.mo - 1 + dm, 1);
        setP({ ...p, y: d.getFullYear(), mo: d.getMonth() + 1, d: Math.min(p.d, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()) });
      };
      const pick = (d) => setP({ ...p, d });
      const commit = () => { onChange(cxWhenText(p)); setOpen(false); };
      const num = (k, max) => h('input', {
        className: 'cx-input cx-dt-num', type: 'number', min: 0, max, value: p[k],
        onChange: (e) => setP({ ...p, [k]: Math.max(0, Math.min(max, Number(e.target.value) || 0)) }),
      });
      return h('div', { className: `cx-dt${open ? ' on' : ''}`, ref },
        h('button', { type: 'button', className: 'cx-input cx-dt-btn', onClick: () => setOpen((v) => !v) },
          h('span', { className: 'cx-dt-text' }, cxWhenText(p)),
          h(UiIcon, { name: 'calendar', size: 12 })),
        open ? h('div', { className: 'cx-drop-pop cx-dt-pop', style: pos || undefined },
          h('div', { className: 'cx-dt-head' },
            h('button', { type: 'button', className: 'cx-dt-nav', onClick: () => shift(-1, 0) }, '«'),
            h('button', { type: 'button', className: 'cx-dt-nav', onClick: () => shift(0, -1) }, '‹'),
            h('span', { className: 'cx-dt-ym' }, `${p.y}.${cxPad(p.mo)}`),
            h('button', { type: 'button', className: 'cx-dt-nav', onClick: () => shift(0, 1) }, '›'),
            h('button', { type: 'button', className: 'cx-dt-nav', onClick: () => shift(1, 0) }, '»')),
          h('div', { className: 'cx-dt-week' }, ['日', '一', '二', '三', '四', '五', '六'].map((w, i) => h('span', { key: i }, T(w)))),
          h('div', { className: 'cx-dt-grid' },
            Array.from({ length: first }, (_, i) => h('span', { key: `b${i}` })),
            Array.from({ length: days }, (_, i) => {
              const d = i + 1;
              const on = d === p.d;
              return h('button', { key: d, type: 'button', className: `cx-dt-day${on ? ' on' : ''}`, onClick: () => pick(d) }, String(d));
            })),
          h('div', { className: 'cx-dt-foot' },
            h('div', { className: 'cx-dt-time' },
              num('hh', 23), h('b', null, ':'), num('mm', 59), h('b', null, ':'), num('ss', 59)),
            h('div', { className: 'cx-dt-acts' },
              h('button', { type: 'button', className: 'cx-btn xs', onClick: () => { const now = new Date(); setP({ y: now.getFullYear(), mo: now.getMonth() + 1, d: now.getDate(), hh: p.hh, mm: p.mm, ss: p.ss }); } }, T('今天')),
              h('button', { type: 'button', className: 'cx-btn xs', onClick: () => { onChange(''); setOpen(false); } }, T('清除')),
              h('button', { type: 'button', className: 'cx-btn xs pri', onClick: commit }, T('确定'))))) : null);
    }

    function CtxCycle({ value, items, onChange, label }) {
      const list = items || [];
      const i = Math.max(0, list.findIndex((it) => it.value === value));
      const cur = list[i] || list[0] || {};
      const next = list[(i + 1) % Math.max(1, list.length)] || {};
      return h('button', {
        type: 'button',
        className: 'cx-cycle',
        title: `${label || ''}${label ? '：' : ''}${cur.label} → ${next.label}`,
        'aria-label': `${label || ''} ${cur.label}`.trim(),
        onClick: (e) => { e.stopPropagation(); next.value && onChange && onChange(next.value); },
      }, cur.icon ? h(UiIcon, { name: cur.icon, size: 14 }) : h('span', { className: 'cx-seg-txt' }, cur.label));
    }
    // 选中项滚进可视区：滚动容器设了 scroll-padding-top（见 kit.css），
    // scrollIntoView('nearest') 会自动避开吸顶的分节标题，不会把卡片藏在标题下面。
    function cxReveal(el) {
      if (!el || typeof el.getBoundingClientRect !== 'function') return;
      try {
        // 只滚动自己所在的纵向容器：scrollIntoView 会连带滚动祖先（含 .cx-body 的横向滚动），
        // 结果整片界面被推偏，标题栏首个页签与消息就会被切掉。
        const sc = el.closest('.cx-pm-scroll, .cx-pm-side, .cx-chat-b');
        if (!sc) return;
        const r = el.getBoundingClientRect();
        const sr = sc.getBoundingClientRect();
        const padTop = 44;
        if (r.top < sr.top + padTop) sc.scrollTop -= (sr.top + padTop - r.top);
        else if (r.bottom > sr.bottom - 4) sc.scrollTop += (r.bottom - sr.bottom + 4);
      } catch {}
    }
    function EntityTitle({ image, icon = 'app', type, title, status, statusTone = '', meta, after, onClick, active = false, className = '', children }) {
      const cls = `cx-entity${active ? ' on' : ''}${className ? ' ' + className : ''}`;
      return h('div', { className: cls, onClick, role: onClick ? 'button' : null },
        h('div', { className: 'cx-entity-pic' }, image
          ? h('img', { src: image, alt: title || '', loading: 'lazy', onError: (e) => { e.currentTarget.style.display = 'none'; } })
          : (React.isValidElement(icon) ? h('span', { className: 'cx-entity-ico' }, icon) : h(UiIcon, { name: icon, size: 28 }))),
        h('div', { className: 'cx-entity-copy' },
          h('div', { className: 'cx-entity-head' },
            type ? h('span', { className: 'cx-entity-type' }, type) : null,
            h('span', { className: 'cx-entity-name', title: title || '' }, title || ''),
            after ? h('span', { className: 'cx-entity-time' }, after) : null,
            status ? h('span', { className: `cx-entity-status ${statusTone}` }, status) : null),
          h('div', { className: 'cx-entity-meta', title: typeof meta === 'string' ? meta : '' }, meta || ''),
          children || null));
    }
    function UiAffordance({ icon, zh, en, mode = 'full', active = false, onClick, className = '', title, disabled = false, children, as = 'span', iconSize = 14, ...rest }) {
      const content = [
        icon ? h(UiIcon, { name: icon, size: iconSize }) : null,
        zh ? h('span', { className: 'cx-aff-zh' }, zh) : null,
        en ? h('span', { className: 'cx-aff-en' }, en) : null,
        children || null,
      ];
      const cls = `cx-aff cx-aff--${mode}${active ? ' on' : ''}${onClick ? ' action' : ''}${className ? ' ' + className : ''}`;
      if (onClick || as === 'button') return h('button', { type: 'button', className: cls, title, disabled, onClick, ...rest }, ...content);
      return h('span', { className: cls, title, ...rest }, ...content);
    }
    function StandardSpaces({ value, onChange, zh = false }) {
      const selected = new Set(value || []);
      const toggle = (key) => {
        if (key === 'community' || key === 'enterprise') return;
        const next = new Set(selected);
        next.has(key) ? next.delete(key) : next.add(key);
        onChange([...next]);
      };
      return h('div', { className: 'cx-space-picker' }, OFFICIAL.map(([key, name, en]) => {
        const forced = key === 'community' || key === 'enterprise';
        const on = forced || selected.has(key);
        return h('label', { key, className: `cx-space-check${on ? ' on' : ''}${forced ? ' forced' : ''}` },
          h('input', { type: 'checkbox', checked: on, disabled: forced, onChange: () => toggle(key) }),
          h('span', { className: 'cx-space-ico', dangerouslySetInnerHTML: spaceIconHtml(name, 14) }),
          h('span', { className: 'cx-space-name' }, zh ? name : T(name)),
          h('em', { className: 'cx-space-en' }, en || ''),
          forced ? h('i', null, zh ? '默认' : T('默认')) : null);
      }));
    }
    function KeyValueTable({ rows, className = '' }) {
      return h('table', { className: `cx-console-table cx-detail-head-table ${className}`.trim() },
        h('thead', null, h('tr', null, h('th', null, 'KEY'), h('th', null, 'VALUE'))),
        h('tbody', null, (rows || []).map(([k, v], i) => h('tr', { key: i }, h('td', null, String(k)), h('td', null, React.isValidElement(v) ? v : String(v ?? ''))))));
    }
    function DataTable({ cols, rows }) {
      return h('div', { className: 'cx-console-detail-table' },
        h('table', { className: 'cx-console-table' },
          h('thead', null, h('tr', null, (cols || []).map((c) => h('th', { key: c.k }, c.label)))),
          h('tbody', null, (rows || []).map((row, i) => h('tr', { key: i }, (cols || []).map((c) => h('td', { key: c.k }, String(row[c.k] ?? ''))))))));
    }
    function DetailTabs({ items, value, onChange, onClose }) {
      return h('div', { className: 'cx-detail-tabs', style: { display: 'flex', flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 } },
        (items || []).map((it) => h('button', { key: it.value, type: 'button', className: `cx-console-tab${value === it.value ? ' on' : ''}`, style: { display: 'inline-flex', width: 'auto', whiteSpace: 'nowrap', flex: '0 0 auto' }, onClick: () => onChange(it.value) }, it.label)),
        onClose ? h(IconButton, { name: 'close', className: 'cx-detail-close', onClick: onClose, title: T('关闭') }) : null);
    }


    // 开发模式：VSCode 风格 IDE 的骨架（编辑器、终端、预览后续接入）

/* 选图 → 等比缩放到 max 边 → JPEG dataURL。
   头像（512/0.86）与项目图片（720/0.82）以前各写一份，改阈值时容易漏改。 */
function cxImageDataUrl(file, { max = 512, quality = 0.86 } = {}) {
  return new Promise((resolve, reject) => {
    if (!file) return resolve('');
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error || new Error('read failed'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('image decode failed'));
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}
