// ═══════════════════════════════════════════════════════════════════════════
// 07-kit — 结构原语（布局 → 组件 → 控件）
//
// 设计规则（与 styles/layout.css、styles/kit.css 一一对应）：
//   1. 原语只决定「结构 + 变体」，不写颜色/字号/间距 —— 全部由 CSS 层默认值提供。
//   2. 新组件优先用这些原语拼装；需要新样式时先问「能不能只用已有类」。
//   3. 变体用枚举（variant/size/tone），不要在调用处拼 className。
// ═══════════════════════════════════════════════════════════════════════════

  const cxCx = (...parts) => parts.filter(Boolean).join(' ');

  // ── 布局 ────────────────────────────────────────────────────────────────
  function CxStack({ gap, className, style, children, as, ...rest }) {
    const div = as || 'div';
    return h(div, { ...rest, className: cxCx('cx-stack', gap ? `cx-g${gap}` : '', className), style }, children);
  }
  function CxRow({ gap, className, style, children, as, ...rest }) {
    const div = as || 'div';
    return h(div, { ...rest, className: cxCx('cx-row', gap ? `cx-g${gap}` : '', className), style }, children);
  }
  function CxCol({ gap, className, style, children, as, ...rest }) {
    const div = as || 'div';
    return h(div, { ...rest, className: cxCx('cx-col', gap ? `cx-g${gap}` : '', className), style }, children);
  }
  function CxSection({ title, sub, actions, className, bodyClass, children, ...rest }) {
    return h('section', { ...rest, className: cxCx('cx-sec', className) },
      (title || actions) ? h('header', { className: 'cx-hd' },
        title ? h('span', { className: 'cx-hd-t' }, title) : null,
        sub ? h('span', { className: 'cx-hd-s' }, sub) : null,
        actions ? h('div', { className: 'cx-hd-a' }, actions) : null) : null,
      h('div', { className: cxCx('cx-bd', bodyClass) }, children));
  }
  function CxField({ label, hint, full, className, children, ...rest }) {
    return h('label', { ...rest, className: cxCx('cx-field', full ? 'full' : '', className) },
      label ? h('span', { className: 'cx-label' }, label) : null,
      children,
      hint ? h('span', { className: 'cx-hint' }, hint) : null);
  }

  // ── 控件 ────────────────────────────────────────────────────────────────
  const CX_BTN_VARIANT = { primary: 'pri', danger: 'danger', ghost: 'ghost', text: 'ghost' };
  const CX_BTN_SIZE = { sm: 'xs', md: '', lg: 'lg' };
  function CxBtn({ variant, size, icon, active, loading, className, children, ...rest }) {
    const cls = cxCx('cx-btn', CX_BTN_VARIANT[variant] || '', CX_BTN_SIZE[size] || '', icon && !children ? 'icon' : '', active ? 'on' : '', className);
    return h('button', { ...rest, className: cls, disabled: rest.disabled || loading },
      icon ? h('span', { className: 'cx-btn-i' }, icon) : null,
      children || null);
  }
  function CxInput(props) {
    return h('input', { ...props, className: cxCx('cx-input', props.className) });
  }
  function CxSelect({ className, children, ...rest }) {
    return h('select', { ...rest, className: cxCx('cx-select', className) }, children);
  }
  function CxChip({ active, tone, className, children, ...rest }) {
    return h('button', { ...rest, className: cxCx('cx-chip', active ? 'on' : '', tone ? `t-${tone}` : '', className) }, children);
  }
  function CxTabs({ tabs, value, onChange, className }) {
    return h('div', { className: cxCx('cx-tabs', className), role: 'tablist' },
      (tabs || []).map((t) => h('button', {
        key: t.key, role: 'tab', 'aria-selected': t.key === value ? 'true' : 'false',
        className: cxCx('cx-tab', t.key === value ? 'on' : ''),
        onClick: () => onChange && onChange(t.key),
      }, t.label)));
  }

  // ── 浮层（下拉 / 日期面板共用）────────────────────────────────────────────
  // 定位唯一入口：浮层一律 position:fixed + 自校正。
  // 为什么自校正：祖先带 transform / backdrop-filter 时，fixed 的包含块会被换成该祖先，
  // 视口坐标直接写进去会整体偏移；量一次真实落点、把差值补回来即可收敛（最多两帧）。
  // 浮层定位诊断：最近 6 次「锚点/期望/实际/写入」的坐标，clientCheck 会上报
  const CX_POP_LOG = [];

  function cxPopStyle(el, panelH, minW) {
    if (!el || typeof el.getBoundingClientRect !== 'function') return { left: 0, top: 0, width: minW || 240 };
    const r = el.getBoundingClientRect();
    const vh = (typeof window !== 'undefined' ? window.innerHeight : 800) || 800;
    const vw = (typeof window !== 'undefined' ? window.innerWidth : 1200) || 1200;
    const width = Math.min(Math.max(minW || 0, Math.round(r.width)), vw - 16);
    const below = vh - r.bottom - 8;
    const up = below < panelH && r.top > below;
    const top = up ? Math.max(8, r.top - panelH - 4) : Math.round(r.bottom + 4);
    const left = Math.max(8, Math.min(Math.round(r.left), vw - width - 8));
    return { left, top, width, maxHeight: Math.max(160, Math.min(panelH, up ? r.top - 16 : below)) };
  }

  function cxPopSettle(anchor, panel, panelH, minW) {
    const want = cxPopStyle(anchor, panelH, minW);
    if (!panel || typeof panel.getBoundingClientRect !== 'function') return want;
    // 祖先带 transform/backdrop-filter 时，fixed 的包含块不是视口：浏览器会在我们写的 left/top
    // 之上再加一个固定偏移。这里先量出「实际比我们写的大多少」，再用 want 减掉它 —— 一步收敛，
    // 不能拿 want 和 got 直接相减（首帧还没写 want 时会把偏移算重，浮层就会来回跳）。
    const appliedLeft = parseFloat(panel.style.left) || 0;
    const appliedTop = parseFloat(panel.style.top) || 0;
    const got = panel.getBoundingClientRect();
    const dx = want.left - got.left;
    const dy = want.top - got.top;
    if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return null; // 已对齐：不要再写，否则会来回跳
    // 在「已写值」上做增量修正：偏移包含块里写 want 会差一个固定量，一次修正即到位。
    return { ...want, left: Math.round(appliedLeft + dx), top: Math.round(appliedTop + dy) };
  }

  function CxPopover({ anchorRef, open, panelH = 280, minW = 160, className, onClose, children }) {
    const popRef = useRef(null);
    const [pos, setPos] = useState(null);
    useEffect(() => {
      if (!open) { setPos(null); return undefined; }
      const place = () => {
        const next = cxPopSettle(anchorRef.current, popRef.current, panelH, minW);
        try {
          const an = anchorRef.current, pn = popRef.current;
          if (an && pn && typeof an.getBoundingClientRect === 'function') {
            const ar = an.getBoundingClientRect(), pr = pn.getBoundingClientRect();
            CX_POP_LOG.push({
              cls: String(className || ''),
              anchor: [Math.round(ar.left), Math.round(ar.top), Math.round(ar.width)],
              got: [Math.round(pr.left), Math.round(pr.top)],
              applied: [parseFloat(pn.style.left) || 0, parseFloat(pn.style.top) || 0],
              next: next ? [next.left, next.top] : null,
            });
            if (CX_POP_LOG.length > 6) CX_POP_LOG.shift();
          }
        } catch {}
        if (next) setPos(next);
      };
      let raf = 0;
      let n = 0;
      const tick = () => { place(); if (++n < 48) raf = requestAnimationFrame(tick); };
      tick();
      // 表单是异步的（fieldOptions 回来后会多出字段，锚点整体下移）：
      // 只靠开窗那几帧会把面板钉在旧位置，必须跟着布局变化重新贴。
      let mo = null;
      try {
        const an = anchorRef.current;
        const scope = (an && an.closest && an.closest('.cx-card')) || document.body;
        mo = new MutationObserver(() => place());
        mo.observe(scope, { childList: true, subtree: true, attributes: true, attributeFilter: ['style', 'class'] });
      } catch { mo = null; }
      const onScroll = () => place();
      window.addEventListener('scroll', onScroll, true);
      window.addEventListener('resize', onScroll);
      const away = (e) => {
        const a = anchorRef.current;
        const p = popRef.current;
        if (a && a.contains(e.target)) return;
        if (p && p.contains(e.target)) return;
        onClose && onClose();
      };
      const esc = (e) => { if (e.key === 'Escape') onClose && onClose(); };
      document.addEventListener('mousedown', away);
      document.addEventListener('keydown', esc);
      return () => {
        cancelAnimationFrame(raf);
        if (mo) mo.disconnect();
        window.removeEventListener('scroll', onScroll, true);
        window.removeEventListener('resize', onScroll);
        document.removeEventListener('mousedown', away);
        document.removeEventListener('keydown', esc);
      };
    }, [open, panelH, minW]);
    if (!open) return null;
    return h('div', {
      className: cxCx('cx-pop', className),
      ref: popRef,
      style: pos || { left: 0, top: 0, visibility: 'hidden' },
    }, children);
  }
