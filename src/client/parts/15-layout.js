    // Design-system layout primitives. Every page is composed from these slots
    // so the chrome, spacing and behavior stay identical across product areas.
    const SingleLineTitle = UiAffordance;
    const DoubleLineTitle = EntityTitle;

    function UiBar({ kind = 'toolbar', children, className = '', ...rest }) {
      return h('div', { className: `cx-bar cx-bar--${kind}${className ? ' ' + className : ''}`, ...rest }, children);
    }
    function UiWorkspace({ header, tabs, toolbar, left, content, preview, output, right, status, className = '' }) {
      return h('div', { className: `cx-workspace${className ? ' ' + className : ''}` },
        header ? h('div', { className: 'cx-workspace-header' }, header) : null,
        tabs ? h('div', { className: 'cx-workspace-tabs' }, tabs) : null,
        toolbar ? h('div', { className: 'cx-workspace-toolbar' }, toolbar) : null,
        h('div', { className: 'cx-workspace-body' },
          left ? h('aside', { className: 'cx-workspace-left' }, left) : null,
          h('main', { className: 'cx-workspace-main' },
            h('div', { className: 'cx-workspace-canvas' },
              content ? h('section', { className: 'cx-workspace-content' }, content) : null,
              preview ? h('section', { className: 'cx-workspace-preview' }, preview) : null),
            output ? h('section', { className: 'cx-workspace-output' }, output) : null),
          right ? h('aside', { className: 'cx-workspace-right' }, right) : null),
        status ? h('div', { className: 'cx-workspace-status' }, status) : null);
    }
    function UiAddressBar({ segments = [], actions, children, className = '' }) {
      return h('div', { className: `cx-addressbar${className ? ' ' + className : ''}` },
        h('div', { className: 'cx-addressbar-segments' }, segments.map((s, i) => h(React.Fragment, { key: i },
          i ? h(UiIcon, { name: 'chevronRight', size: 12 }) : null,
          h('button', { type: 'button', className: `cx-addressbar-seg${s.active ? ' on' : ''}`, title: s.title || s.label, onClick: s.onClick },
            s.icon ? h(UiIcon, { name: s.icon, size: 13 }) : null,
            h('span', null, s.label || ''))))),
        children ? h('div', { className: 'cx-addressbar-input' }, children) : null,
        actions ? h('div', { className: 'cx-addressbar-actions' }, actions) : null);
    }
    // 全局统一下拉列表：三列（图标/文字/选中），可滚动时上下显示箭头
    function MenuList({ items, onPick }) {
      const ref = useRef(null);
      const [hint, setHint] = useState({ top: false, bottom: false });
      const update = () => {
        const el = ref.current;
        if (!el) return;
        const top = el.scrollTop > 2;
        const bottom = el.scrollTop + el.clientHeight < el.scrollHeight - 2;
        setHint((h) => (h.top === top && h.bottom === bottom ? h : { top, bottom }));
      };
      useEffect(() => {
        update();
        const el = ref.current;
        if (!el) return;
        el.addEventListener('scroll', update, { passive: true });
        const ro = new ResizeObserver(update); ro.observe(el);
        return () => { el.removeEventListener('scroll', update); ro.disconnect(); };
      }, [items]);
      const list = items || [];
      return h('div', { className: 'cx-menu-list' },
        hint.top ? h('div', { className: 'cx-menu-hint top', 'aria-hidden': 'true' }, '▲') : null,
        h('div', { className: 'cx-menu-scroll', ref, onScroll: update },
          list.length ? list.map((it, i) => h('button', {
            key: i, type: 'button',
            className: `cx-menu-item cx-menu-3col${it.on ? ' on' : ''}`,
            onClick: () => { try { it.go(); } catch {} onPick && onPick(it); },
          },
            h(UiIcon, { name: it.icon || 'dot', size: 14 }),
            h('span', { className: 'cx-menu-lbl' }, it.label),
            h('span', { className: 'cx-menu-chk' }, it.on ? h(UiIcon, { name: 'check', size: 12 }) : '')))
            : h('div', { className: 'cx-menu-item empty' }, '—')),
        hint.bottom ? h('div', { className: 'cx-menu-hint bottom', 'aria-hidden': 'true' }, '▼') : null);
    }

    function UiCardList({ items, render, empty, className = '' }) {
      const list = items || [];
      if (!list.length) return empty || null;
      return h('div', { className: `cx-card-list${className ? ' ' + className : ''}` }, list.map((item, i) => render(item, i)));
    }
    function UiTableList({ cols, rows, empty, className = '' }) {
      if (!rows || !rows.length) return empty || null;
      return h('div', { className: `cx-table-list${className ? ' ' + className : ''}` }, h(DataTable, { cols, rows }));
    }
    function UiTreeList({ children, empty, className = '' }) {
      const has = Array.isArray(children) ? children.length > 0 : !!children;
      if (!has) return empty || null;
      return h('div', { className: `cx-tree-list${className ? ' ' + className : ''}`, role: 'tree' }, children);
    }
