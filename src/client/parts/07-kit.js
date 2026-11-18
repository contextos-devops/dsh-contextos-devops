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
  // 浮层：位置交给布局（绝对定位在锚点下方），只判断「下边放不下就翻到上边」。
  // 不再用视口坐标算位置 —— 弹窗的 backdrop-filter / transform 会把 fixed 的包含块换掉，
  // 坐标法已经在同一类 bug 上翻车三次（偏移两次、位置过期一次）。
  const CX_POP_LOG = [];

  function cxPopFlip(anchor, panelH) {
    try {
      if (!anchor || typeof anchor.getBoundingClientRect !== 'function') return false;
      const r = anchor.getBoundingClientRect();
      const vh = (typeof window !== 'undefined' ? window.innerHeight : 800) || 800;
      return r.bottom + panelH + 8 > vh && r.top > panelH;
    } catch { return false; }
  }

  function CxPopover({ anchorRef, open, panelH = 280, minW = 160, className, onClose, children }) {
    const popRef = useRef(null);
    const [up, setUp] = useState(false);
    useEffect(() => {
      if (!open) return undefined;
      // 只判断翻转方向；水平/垂直位置由 .cx-pop 的绝对定位跟随锚点（布局算，不由我们算）
      const place = () => setUp(cxPopFlip(anchorRef.current, panelH));
      let raf = 0;
      let n = 0;
      const tick = () => { place(); if (++n < 12) raf = requestAnimationFrame(tick); };
      tick();
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
      className: cxCx('cx-pop', up ? 'up' : '', className),
      ref: popRef,
    }, children);
  }

