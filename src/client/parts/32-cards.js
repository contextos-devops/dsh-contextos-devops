    // 节点/空间通用的常用工具（都是宿主自带页面）
    // key, 中文, 英文, 尾段, 图标
    const CARD_TOOLS = [
      ['desktop', '应用桌面', 'App Desktop', '', 'monitor'],
      ['portal', '官方网站', 'Website', '', 'web'],
      ['admin', '管理后台', 'Admin', '', 'manage'],
      ['vimer', '编程工具', 'Code', '', 'dev'],
      ['runtime', '运行环境', 'Runtime', '', 'pulse'], // /c/runtime
      ['xterm', '命令终端', 'Terminal', '/type/sh', 'terminal'], // 直接进 shell，不停在会话列表
    ];
    // 首页由节点/空间自己的代码决定，插件只负责「打开首页」；这里只列固定工具
    // 副标题用的时间：MM-DD HH:mm
    const cardTime = (v) => {
      const s = String(v || '').replace('T', ' ').replace(/\..*$/, '');
      const m = s.match(/^(?:\d{4}-)?(\d{2}-\d{2})[ T](\d{2}:\d{2})/);
      return m ? `${m[1]} ${m[2]}` : (s || '');
    };
    // 版本号兜底：老接口会把整张 /c/version 表塞进 version，这里只取 vX.Y.Z-xxx
    const cardVer = (v) => {
      const raw = String(v || '').trim();
      if (!raw) return '';
      if (!/\s/.test(raw)) return raw;
      const m = raw.match(/v\d+\.\d+\.\d+(?:-[0-9a-z.]+)+/i);
      return m ? m[0] : '';
    };
    const toolItems = (onTool, urlOf, locale, isOpen = null) => (onTool ? CARD_TOOLS.map(([key, zh, en, tail, icon]) => {
      const url = urlOf(key, tail || '');
      return {
        label: locale === 'zh' ? zh : en,
        icon,
        url,
        openable: !!isOpen,
        open: isOpen ? !!isOpen(url) : false,
        action: () => onTool(url, locale === 'zh' ? zh : en),
      };
    }) : []);

    function NodeCard({ n, active, busy, onSelect, onStart, onStop, onDelete, onOpen, onIde, onTool, onHome, onAuth, isOpen, tone = () => '', locale }) {
      const on = n.state === 'running';
      return h('div', { className: `cx-node${active ? ' on' : ''}`, onClick: () => onSelect(n.port) },
        h(EntityTitle, {
          image: n.image,
          icon: 'server',
          title: n.name || `node-${n.port}`,
          status: on ? (locale === 'zh' ? '运行中' : 'RUNNING') : (locale === 'zh' ? '离线' : 'OFFLINE'),
          statusTone: on ? 'ok' : 'off',
          // 端口 · 代码版本 · 编译时间 · 程序大小
          // 端口 · 版本 · 编译时间 · 大小 · 进程 · 部署方式
          meta: [`:${n.port}`, cardVer(n.version) || '—',
            cardTime(n.builtAt || (n.runtime && n.runtime.builtAt)) || '—',
            n.sizeText || (n.runtime && n.runtime.sizeText) || (n.size ? Math.round(n.size / 1048576) + 'M' : '—'),
            n.pid ? `pid ${n.pid}` : '',
            n.source || ''].filter(Boolean).join(' · '),
        }),
        h('div', { className: 'cx-node-actions' },
          on
            ? h('button', { className: 'cx-btn xs', onClick: (e) => { e.stopPropagation(); onOpen(n.port); } }, locale === 'zh' ? '首页' : 'HOME')
            : h('button', { className: 'cx-btn xs pri', onClick: (e) => { e.stopPropagation(); onStart(n.port); } }, locale === 'zh' ? '启动' : 'START'),
          h('button', { className: 'cx-btn xs', disabled: busy, onClick: (e) => { e.stopPropagation(); onIde && onIde(n.port, ''); } }, locale === 'zh' ? '编程' : 'CODE'),
          on
            ? h(MenuButton, { disabled: busy, items: [
              ...(onHome ? [{ label: locale === 'zh' ? '打开首页' : 'Open home', icon: 'home', action: () => onHome() }] : []),
              ...toolItems(onTool, (k, tail = '') => `http://127.0.0.1:${n.port}/c/${k}${tail}`, locale, isOpen),
              ...(onAuth ? [{ label: locale === 'zh' ? '登录凭证' : 'Credentials', icon: 'lock', action: () => onAuth(n.port) }] : []),
              { sep: true }, { label: '停止', icon: 'stop', danger: tone('stop') === 'danger', action: () => onStop(n.port) }, { label: '删除', icon: 'trash', danger: true, action: () => onDelete(n.port) }] })
            : h(MenuButton, { disabled: busy, items: [
              ...(onHome ? [{ label: locale === 'zh' ? '打开首页' : 'Open home', icon: 'home', action: () => onHome() }] : []),
              ...toolItems(onTool, (k, tail = '') => `http://127.0.0.1:${n.port}/c/${k}${tail}`, locale, isOpen),
              ...(onAuth ? [{ label: locale === 'zh' ? '登录凭证' : 'Credentials', icon: 'lock', action: () => onAuth(n.port) }] : []),
              { sep: true },
              { label: '删除', icon: 'trash', danger: tone('remove') === 'danger', action: () => onDelete(n.port) },
            ] })));
    }

    function SpaceCard({ s, active, busy, node, onSelect, onOpen, onStart, onStop, onDelete, onIde, onTool, onHome, isOpen, tone = () => '', locale }) {
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
          // 代码版本 · 编译时间 · 程序大小
          meta: [cardVer(s.version) || '—', cardTime(s.builtAt) || '—', s.size || '—'].join(' · '),
        }),
        h('div', { className: 'cx-space-actions' },
          on ? h('button', { className: 'cx-btn xs pri', disabled: busy, onClick: (e) => { e.stopPropagation(); onOpen(s.name); } }, locale === 'zh' ? '首页' : 'OPEN') : h('button', { className: 'cx-btn xs pri', disabled: busy, onClick: (e) => { e.stopPropagation(); onStart(s.name); } }, locale === 'zh' ? '启动' : 'START'),
          h('button', { className: 'cx-btn xs', disabled: busy, onClick: (e) => { e.stopPropagation(); onIde && onIde(node, s.name); } }, locale === 'zh' ? '编程' : 'CODE'),
          h(MenuButton, { disabled: busy, items: [
            ...(onHome ? [{ label: locale === 'zh' ? '打开首页' : 'Open home', icon: 'home', action: () => onHome() }] : []),
            ...toolItems(onTool, (k, tail = '') => `http://127.0.0.1:${node}/s/${encodeURIComponent(s.name)}/c/${k}${tail}`, locale, isOpen),
            ...(on ? [{ sep: true }, { label: '停止', icon: 'stop', danger: tone('stop') === 'danger', action: () => onStop(s.name) }] : []),
            { label: '删除', icon: 'trash', danger: true, action: () => onDelete(s.name) },
          ] })));
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
          title: a.title || a.name,
          after: cardTime(a.updated) || '',
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
          (has('code') || has('conf') || has('more')) ? h(MenuButton, { disabled: busy, items: [
            has('code') ? { label: label('code'), icon: 'dev', action: () => onCode(s) } : null,
            has('conf') ? { label: label('conf'), icon: 'setting', action: () => onConfig(s) } : null,
            has('more') ? { label: locale === 'zh' ? '更多' : 'More', icon: 'more', action: () => onAction(s, 'more') } : null,
          ].filter(Boolean) }) : null));
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
