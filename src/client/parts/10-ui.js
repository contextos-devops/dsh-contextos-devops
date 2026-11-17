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
