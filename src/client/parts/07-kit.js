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
