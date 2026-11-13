    function NodeCard({ n, active, busy, onSelect, onStart, onStop, onDelete, onOpen, onIde, locale }) {
      const on = n.state === 'running';
      return h('div', { className: `cx-node${active ? ' on' : ''}`, onClick: () => onSelect(n.port) },
        h(EntityTitle, {
          image: n.image,
          icon: 'server',
          title: n.name || `node-${n.port}`,
          status: on ? (locale === 'zh' ? '运行中' : 'RUNNING') : (locale === 'zh' ? '离线' : 'OFFLINE'),
          statusTone: on ? 'ok' : 'off',
          meta: `:${n.port} · ${n.env || (on ? 'worker' : 'offline')} · ${n.size ? Math.round(n.size / 1048576) + 'M' : '—'}${n.createdAt ? ' · ' + String(n.createdAt).slice(0, 16) : ''}`,
        }),
        h('div', { className: 'cx-node-actions' },
          on
            ? h('button', { className: 'cx-btn xs', onClick: (e) => { e.stopPropagation(); onOpen(n.port); } }, locale === 'zh' ? '主页' : 'HOME')
            : h('button', { className: 'cx-btn xs pri', onClick: (e) => { e.stopPropagation(); onStart(n.port); } }, locale === 'zh' ? '启动' : 'START'),
          h('button', { className: 'cx-btn xs', disabled: busy, onClick: (e) => { e.stopPropagation(); onIde && onIde(n.port, ''); } }, locale === 'zh' ? '编程' : 'CODE'),
          on ? h(MenuButton, { disabled: busy, items: [{ label: '停止', danger: true, action: () => onStop(n.port) }, { label: '删除', danger: true, action: () => onDelete(n.port) }] }) : h(MenuButton, { disabled: busy, items: [{ label: '删除', danger: true, action: () => onDelete(n.port) }] })));
    }

    function SpaceCard({ s, active, busy, node, onSelect, onOpen, onStart, onStop, onDelete, onIde, locale }) {
      const on = String(s.status || '').trim() === 'start';
      const iconUrl = (() => {
        const raw = String(s.icons || '').trim();
        if (!raw) return '';
        if (/^https?:\/\//i.test(raw)) return raw;
        const p = raw.startsWith('/') ? raw : `/${raw}`;
        return node ? `http://127.0.0.1:${node}${p}` : p;
      })();
      return h('div', { className: `cx-space${active ? ' on' : ''}`, onClick: () => onSelect(s.name) },
        h(EntityTitle, {
          image: iconUrl,
          icon: 'space',
          title: [s.help, s.name].filter(Boolean).join(' '),
          status: on ? (locale === 'zh' ? '运行中' : 'start') : (locale === 'zh' ? '已停止' : 'stop'),
          statusTone: on ? 'ok' : 'off',
          meta: `${s.version || '—'} · ${s.size || '—'}`,
        }),
        h('div', { className: 'cx-space-actions' },
          on ? h('button', { className: 'cx-btn xs pri', disabled: busy, onClick: (e) => { e.stopPropagation(); onOpen(s.name); } }, locale === 'zh' ? '打开' : 'OPEN') : h('button', { className: 'cx-btn xs pri', disabled: busy, onClick: (e) => { e.stopPropagation(); onStart(s.name); } }, locale === 'zh' ? '启动' : 'START'),
          h('button', { className: 'cx-btn xs', disabled: busy, onClick: (e) => { e.stopPropagation(); onIde && onIde(node, s.name); } }, locale === 'zh' ? '编程' : 'CODE'),
          h(MenuButton, { disabled: busy, items: on ? [{ label: '停止', danger: true, action: () => onStop(s.name) }, { label: '删除', danger: true, action: () => onDelete(s.name) }] : [{ label: '删除', danger: true, action: () => onDelete(s.name) }] })));
    }

    function ItemIcon({ item, name, size, src, port }) {
      const raw = String(src || (item && (item.icons || item.icon || item.image)) || '').trim();
      const iconSrc = !raw ? ''
        : /^(https?:|data:)/i.test(raw) ? raw
        : raw.startsWith('/') && port ? `http://127.0.0.1:${port}${raw}`
        : '';
      const label = String(name || (item && (item.title || item.name)) || '?').trim().slice(0, 1) || '?';
      let hue = 0;
      const sname = String((item && (item.name || item.command)) || label);
      for (let i = 0; i < sname.length; i += 1) hue = (hue * 31 + sname.charCodeAt(i)) % 360;
      const px = size || 26;
      if (iconSrc && /^(https?:|\/)/.test(iconSrc)) {
        return h('span', { className: 'cx-ai', style: { width: px, height: px } }, h('img', { src: iconSrc, alt: '' }));
      }
      return h('span', { className: 'cx-ai', style: { width: px, height: px, background: `linear-gradient(135deg, hsl(${hue} 72% 42%), hsl(${(hue + 42) % 360} 70% 26%))` } }, label.toUpperCase());
    }

    function AppRow({ a, active, onSelect, onOpen, locale, node }) {
      return h('div', { className: `cx-app${active ? ' on' : ''}`, onClick: () => (onSelect ? onSelect(a) : onOpen(a)) },
        h(EntityTitle, {
          image: a.place_avatar || a.icon ? (/^https?:/i.test(a.place_avatar || a.icon) ? (a.place_avatar || a.icon) : `http://127.0.0.1:${node}${a.place_avatar || a.icon}`) : '',
          icon: 'app',
          type: locale === 'zh' ? '应用' : 'APP',
          title: a.title || a.name,
          meta: [a.city_name, a.company_name, a.service_name].filter(Boolean).join(' · ') || a.command,
        }),
        h('div', { className: 'aa' },
          h('button', { className: 'cx-btn xs pri', onClick: (e) => { e.stopPropagation(); onOpen(a); } }, locale === 'zh' ? '打开' : 'OPEN')));
    }

    function StoreRow({ s, onCreate, busy, onAction, onCode, onConfig, locale, node }) {
      const online = s.status === 'online';
      const acts = s.actions || ['create', 'online', 'offline', 'code', 'conf'];
      const has = (x) => acts.includes(x);
      const label = (x) => locale === 'zh' ? ({ create: '创建', online: '上架', offline: '下架', code: '编程', conf: '配置' }[x] || x) : ({ create: 'CREATE', online: 'Online', offline: 'Offline', code: 'Code', conf: 'Config' }[x] || x);
      return h('div', { className: 'cx-store' },
        h('div', { className: 'cx-store-main', onClick: () => !busy && onCreate(s) },
          h(ItemIcon, { item: s, name: s.name, size: 26, src: s.icon, port: node }),
          h('div', { style: { flex: 1, minWidth: 0 } },
            h('div', { className: 'cx-store-titleline' },
              h('span', { className: 'sn' }, s.name),
              h('span', { className: `cx-status-r ${online ? 'on' : 'off'}` }, s.status_label || s.status)),
            h('div', { className: 'ss' }, `${s.space} · ${s.command}`))),
        h('div', { className: 'cx-store-actions' },
          has('create') ? h('button', { className: 'cx-btn xs pri', disabled: busy, onClick: (e) => { e.stopPropagation(); onCreate(s); } }, busy ? '…' : label('create')) : null,
          has('online') ? h('button', { className: 'cx-btn xs', disabled: busy, onClick: (e) => { e.stopPropagation(); onAction(s, 'online'); } }, label('online')) : null,
          has('offline') ? h('button', { className: 'cx-btn xs danger', disabled: busy, onClick: (e) => { e.stopPropagation(); onAction(s, 'offline'); } }, label('offline')) : null,
          has('code') ? h('button', { className: 'cx-btn xs', onClick: (e) => { e.stopPropagation(); onCode(s); } }, label('code')) : null,
          has('conf') ? h('button', { className: 'cx-btn xs', onClick: (e) => { e.stopPropagation(); onConfig(s); } }, label('conf')) : null));
    }

    function OfficialSpaces({ node, onDeploy, locale }) {
      const [keys, setKeys] = useState(['community', 'enterprise']);
      const items = OFFICIAL;
      const toggle = (k) => { if (k === 'community' || k === 'enterprise') return; setKeys((xs) => xs.includes(k) ? xs.filter((x) => x !== k) : [...xs, k]); };
      return h('div', { className: 'cx-official' },
        h('div', { className: 'oh' }, locale === 'zh' ? '一键部署官方空间 / OFFICIAL SPACES' : 'OFFICIAL SPACES / One-click deploy'),
        items.map(([k, label, en]) => {
          const forced = k === 'community' || k === 'enterprise';
          const on = forced || keys.includes(k);
          return h('label', { key: k, className: `cx-official-row${forced ? ' forced' : ''}` },
            h('input', { type: 'checkbox', checked: on, disabled: forced, onChange: () => toggle(k) }),
            h('span', { className: 'cx-space-ico', dangerouslySetInnerHTML: spaceIconHtml(label, 14) }),
            h('span', { className: 'cx-space-name' }, label),
            h('em', { className: 'cx-space-en' }, en || ''),
            forced ? h('i', null, T('默认')) : null);
        }),
        h('button', { className: 'cx-btn xs pri cx-deploy-btn', style: { marginTop: 8 }, disabled: !node || !keys.length, onClick: () => onDeploy(keys) }, locale === 'zh' ? `部署 (${keys.length})` : `DEPLOY (${keys.length})`));
    }
