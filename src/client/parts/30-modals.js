    function DropSelect({ value, onChange, options, title, className }) {
      const [open, setOpen] = useState(false);
      const [pos, setPos] = useState(null);
      const btnRef = useRef(null);
      const lbRef = useRef(null);
      const openMenu = (e) => { e.stopPropagation(); setOpen((v) => !v); };
      useEffect(() => {
        if (!open) return;
        const close = () => setOpen(false);
        window.addEventListener('click', close);
        window.addEventListener('scroll', close, true);
        return () => { window.removeEventListener('click', close); window.removeEventListener('scroll', close, true); };
      }, [open]);
      const cur = (options || []).find((o) => o.value === value);
      return h('span', { className: `cx-drop${className ? ' ' + className : ''}` },
        h('button', { ref: btnRef, type: 'button', className: `cx-drop-btn${open ? ' on' : ''}`, title, onClick: openMenu },
          h('span', { className: 'lb' }, cur ? cur.label : ''),
          h('span', { className: 'cv' }, h(UiIcon, { name: 'chevronDown', size: 12 }))),
        open ? h('div', { className: 'cx-drop-pop', onClick: (e) => e.stopPropagation() },
          h(MenuList, { items: (options || []).map((o) => ({ label: o.label, icon: o.icon, on: o.value === value, go: () => { setOpen(false); onChange(o.value); } })), onPick: () => setOpen(false) })) : null);
    }

    function MenuButton({ items, disabled }) {
      const [open, setOpen] = useState(false);
      const fire = (e) => {
        e.stopPropagation();
        const r = e.currentTarget.getBoundingClientRect();
        try {
          window.dispatchEvent(new CustomEvent('cx-float-menu', { detail: {
            x: Math.round(r.left),
            right: Math.round((window.innerWidth || 1200) - r.right),
            y: Math.round(Math.min(r.bottom + 4, (window.innerHeight || 800) - 300)),
            title: T('More'),
            icon: 'more',
            items: (items || []).map((it) => (it.sep ? { sep: true } : { label: T(it.label), icon: it.icon || 'chevronRight', url: it.url || '', danger: !!it.danger, open: !!it.open, openable: !!it.openable, go: () => it.action() })),
          } }));
        } catch {}
      };
      return h('span', { className: 'cx-menu-wrap' },
        h(IconButton, { name: 'more', className: 'cx-btn xs', title: '⋯', disabled, onClick: fire }));
    }

    function Modal({ title, desc, onClose, children }) {
      return h('div', { className: 'cx-modal', onMouseDown: (e) => { if (e.target === e.currentTarget) onClose(); } },
        h('div', { className: 'cx-card' }, h('h2', null, title), desc ? h('div', { className: 'desc' }, desc) : null, children));
    }

    function SceneModal({ scene, onClose, onSave }) {
      const p = scene?.params || {};
      const tzDefault = (typeof Intl !== 'undefined' && Intl.DateTimeFormat().resolvedOptions().timeZone) || 'Asia/Shanghai';
      const [name, setName] = useState(scene?.name || '');
      const [theme, setTheme] = useState(p.theme || 'system');
      const [lang, setLang] = useState(p.lang || 'system');
      const [timezone, setTimezone] = useState(p.timezone || tzDefault);
      const [location, setLocation] = useState(p.location || '');
      return h(Modal, { title: '赛博世界设置 / CYBER WORLD', desc: '这些参数属于当前赛博世界：切换赛博世界会自动跟随；没设置的用系统默认。', onClose },
        h('div', { className: 'cx-form' },
          h('label', { className: 'cx-field full' }, '名称', h('input', { className: 'cx-input', value: name, placeholder: '例如 我的赛博世界', onChange: (e) => setName(e.target.value) })),
          h('label', { className: 'cx-field full' }, '主题', h(DropSelect, { value: theme, onChange: setTheme, options: [{ value: 'system', label: '跟随系统' }, { value: 'light', label: '浅色' }, { value: 'dark', label: '深色' }] })),
          h('label', { className: 'cx-field full' }, '语言', h(DropSelect, { value: lang, onChange: setLang, options: [{ value: 'system', label: '跟随系统' }, { value: 'zh', label: '中文' }, { value: 'en', label: 'English' }] })),
          h('label', { className: 'cx-field full' }, '时区', h('input', { className: 'cx-input', value: timezone, placeholder: tzDefault, onChange: (e) => setTimezone(e.target.value) })),
          h('label', { className: 'cx-field full' }, '地点', h('input', { className: 'cx-input', value: location, placeholder: '例如 深圳市', onChange: (e) => setLocation(e.target.value) }))),
        h('div', { className: 'cx-foot' },
          h('button', { className: 'cx-btn', onClick: onClose }, T('取消')),
          h('button', { className: 'cx-btn pri', onClick: () => onSave({ name: name.trim(), theme, lang, timezone, location }) }, T('保存'))));
    }

    function AvatarEditModal({ avatar, onClose, onSave }) {
      const [form, setForm] = useState({
        name: avatar?.name || '', city: avatar?.city || '', company: avatar?.company || '',
        persona: avatar?.persona || '', preferences: avatar?.preferences || '', style: avatar?.style || '',
      });
      const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
      return h(Modal, { title: '修改分身 / AVATAR', desc: '这些信息属于当前数字分身，创建实例与对话上下文都会带上。', onClose },
        h('div', { className: 'cx-form' },
          h('label', { className: 'cx-field full' }, '名称', h('input', { className: 'cx-input', value: form.name, onChange: set('name') })),
          h('label', { className: 'cx-field full' }, '城市', h('input', { className: 'cx-input', value: form.city, onChange: set('city') })),
          h('label', { className: 'cx-field full' }, '公司', h('input', { className: 'cx-input', value: form.company, onChange: set('company') })),
          h('label', { className: 'cx-field full' }, '人格', h('input', { className: 'cx-input', value: form.persona, onChange: set('persona'), placeholder: '专业、亲和、直接' })),
          h('label', { className: 'cx-field full' }, '偏好', h('input', { className: 'cx-input', value: form.preferences, onChange: set('preferences'), placeholder: '技术、产品、效率' })),
          h('label', { className: 'cx-field full' }, '风格', h('input', { className: 'cx-input', value: form.style, onChange: set('style'), placeholder: '简洁、结构化' }))),
        h('div', { className: 'cx-foot' },
          h('button', { className: 'cx-btn', onClick: onClose }, T('取消')),
          h('button', { className: 'cx-btn pri', onClick: () => onSave(form) }, T('保存'))));
    }

    // 检查更新弹窗：只展示事实（本地/最新/检查时间/来源），动作交给用户复制命令执行。
    function UpdateModal({ info, busy, onCheck, onClose }) {
      const local = info?.local || '—';
      const latest = info?.latest || '—';
      const has = !!info?.hasUpdate;
      const cmd = 'npm i -g dsh-contextos-devops && dsh plugin --profile desktop add dsh-contextos-devops';
      const copy = (text) => { try { navigator.clipboard.writeText(text); } catch {} };
      const stateText = has
        ? `↑ ${T('有新版本')}：v${local} → v${latest}`
        : (info?.stale || !info?.ok ? T('暂时查不到最新版本（网络或 registry 不可用）') : T('已是最新版本'));
      return h(Modal, {
        title: T('检查更新') + ' / CHECK UPDATES',
        desc: T('本地版本以 package.json 为准，最新版本来自 npm registry（缓存 30 分钟）。'),
        onClose,
      },
        h(CxStack, null,
          h(CxRow, { gap: 3 },
            h(CxField, { label: T('当前版本') }, h(CxInput, { readOnly: true, value: `v${local}` })),
            h(CxField, { label: T('最新版本') }, h(CxInput, { readOnly: true, value: info?.ok ? `v${latest}` : (info?.error || T('检查失败')) }))),
          h(CxField, { label: T('检查时间'), full: true }, h(CxInput, { readOnly: true, value: info?.checkedAt ? new Date(info.checkedAt).toLocaleString() : '—' })),
          h(CxField, { full: true }, h('div', { className: `cx-upd-state${has ? ' on' : ''}` }, stateText))),
        h(CxRow, { gap: 2, className: 'cx-foot' },
          h(CxBtn, { onClick: () => copy(cmd), title: cmd }, T('复制更新命令')),
          h(CxBtn, { onClick: onCheck, loading: busy }, busy ? T('检查中…') : T('重新检查')),
          info?.npm ? h(CxBtn, { onClick: () => { try { window.open(info.npm, '_blank'); } catch {} } }, T('打开发布页')) : null,
          h(CxBtn, { variant: 'primary', onClick: onClose }, T('关闭'))));
    }
