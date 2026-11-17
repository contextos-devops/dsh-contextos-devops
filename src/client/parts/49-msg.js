    function Elapsed({ from, ms, active }) {
      const [, setN] = useState(0);
      useEffect(() => {
        if (!active) return;
        const t = setInterval(() => setN((x) => x + 1), 400);
        return () => clearInterval(t);
      }, [active]);
      const value = active ? Date.now() - (from || Date.now()) : (ms || 0);
      return h('span', null, `${(value / 1000).toFixed(1)}s`);
    }

    // 请求上下文只允许一个场景来源：scene。旧会话/旧选择可能把同一份配置
    // 同时塞进 background、bg，甚至嵌在 selection 里；发送前递归剥掉别名。
    function stripSceneAliases(value) {
      if (Array.isArray(value)) return value.map(stripSceneAliases);
      if (!value || typeof value !== 'object') return value;
      const out = {};
      for (const [key, item] of Object.entries(value)) {
        if (key === 'background' || key === 'bg') continue;
        out[key] = stripSceneAliases(item);
      }
      return out;
    }

    // 消息列表里的数据表单：字段来自应用模块的 portal.json
    // 操作 + 功能的中文名，拼成表单标题（如「创建流程」）
    const FN_LABEL = { flow: '流程', request: '流程申请', apply: '申请', allow: '审批', notice: '通知', event: '事件', member: '成员', setting: '设置', auth: '权限', node: '节点', credit: '积分', qrcode: '扫码', message: '消息', service: '服务', market: '市场', portal: '应用' };
    const ACT_LABEL = { create: '创建', modify: '修改', update: '修改', remove: '删除' };
    const FN_LABEL_EN = { flow: 'Flow', request: 'Request', apply: 'Apply', allow: 'Approve', notice: 'Notice', event: 'Event', member: 'Member', setting: 'Settings', auth: 'Auth', node: 'Node', credit: 'Credit', qrcode: 'QR', message: 'Message', service: 'Service', market: 'Market', portal: 'App' };
    const ACT_LABEL_EN = { create: 'Create', modify: 'Modify', update: 'Modify', remove: 'Delete' };
    // 常见字段名的中英对照（后端 _trans 没给时兜底）
    const FIELD_ZH = { title: '标题', content: '内容', name: '名称', system_uid: '系统', uid: '编号', index: '序号', icons: '图标', begin_time: '开始时间', end_time: '结束时间', status: '状态', status_uid: '状态', remark: '备注', desc: '描述', description: '描述', phone: '手机号', email: '邮箱', address: '地址', city_name: '城市', company_name: '公司', project_name: '项目名称', report_type: '报告类型', feedback_status: '反馈状态', score: '评分', image: '图片', video: '视频', url: '链接', key: '键', value: '值', type: '类型', field: '字段', sub: '子项' };
    const FIELD_EN = { title: 'Title', content: 'Content', name: 'Name', system_uid: 'System', uid: 'ID', index: 'Index', icons: 'Icon', begin_time: 'Begin', end_time: 'End', status: 'Status', status_uid: 'Status', remark: 'Remark', desc: 'Description', description: 'Description', phone: 'Phone', email: 'Email', address: 'Address', city_name: 'City', company_name: 'Company', project_name: 'Project', report_type: 'Report type', feedback_status: 'Feedback', score: 'Score', image: 'Image', video: 'Video', url: 'URL', key: 'Key', value: 'Value', type: 'Type', field: 'Field', sub: 'Sub' };
    // 全局统一的结果卡片：服务节点 / 项目空间 / 应用实例 / 应用模板 / 数据记录
    const KIND_META = {
      node: { icon: 'server', zh: '服务节点', en: 'Node' },
      space: { icon: 'space', zh: '项目空间', en: 'Space' },
      app: { icon: 'app', zh: '应用实例', en: 'App' },
      service: { icon: 'market', zh: '应用模板', en: 'Template' },
      data: { icon: 'report', zh: '数据记录', en: 'Record' },
    };
    function CxEntityCard({ e, lang, onOpen }) {
      const L = (zh, en) => (lang === 'zh' ? zh : en);
      const km = KIND_META[e.kind] || KIND_META.app;
      return h('div', { className: `cx-rc cx-rc-${e.kind || 'app'}` },
        h('div', { className: 'cx-rc-ico' },
          e.icon ? h('img', { src: e.icon, alt: '' }) : h(Icon, { name: km.icon, size: 18 })),
        h('div', { className: 'cx-rc-main' },
          h('div', { className: 'cx-rc-head' },
            h('span', { className: 'cx-rc-kind' }, L(km.zh, km.en)),
            e.title ? h('span', { className: 'cx-rc-title' }, e.title) : null,
            e.status ? h('span', { className: `cx-rc-badge${e.statusKind ? ' ' + e.statusKind : ''}` }, e.status) : null),
          e.sub ? h('div', { className: 'cx-rc-sub' }, e.sub) : null,
          Array.isArray(e.meta) && e.meta.length
            ? h('div', { className: 'cx-rc-meta' }, e.meta.filter(Boolean).map((x, i) => h('span', { key: i }, x)))
            : null),
        Array.isArray(e.actions) && e.actions.length
          ? h('div', { className: 'cx-rc-acts' }, e.actions.map((a, i) => h('button', {
            key: i,
            className: 'cx-rc-btn',
            onClick: () => { if (a.url && typeof onOpen === 'function') onOpen(a.url, a.title || e.title || ''); if (typeof a.onClick === 'function') a.onClick(); },
          }, a.label)))
          : null);
    }
    const FORM_STATE_KEY = 'dsh-contextos-devops:formstate';
    const readFormState = (fk) => (cxRead(FORM_STATE_KEY, {}) || {})[fk] || null;
    const writeFormState = (fk, v) => {
      if (!fk) return;
      const all = cxRead(FORM_STATE_KEY, {}) || {};
      all[fk] = { ...(all[fk] || {}), ...v };
      cxWrite(FORM_STATE_KEY, all);
    };
    function CxWriteForm({ msg, onSubmit, onOpen, onDone, lang }) {
      // 直接用当前语言渲染，避免 T() 依赖全局语言初始化时机
      const L = (zh, en) => (lang === 'zh' ? zh : en);
      const fLabel = (f) => (lang === 'zh'
        ? (FIELD_ZH[f.name] || (f.label && f.label !== f.name ? f.label : f.name))
        : (f.labelEn || FIELD_EN[f.name] || f.label || f.name));
      const fields = msg.fields || [];
      // 已提交过的表单：参数与状态都从持久表恢复，刷新后仍是只读 + 原值
      const saved = (typeof readFormState === 'function' ? readFormState(msg.fk) : null) || {};
      const savedVals = saved.values || msg.values || null;
      const init = {};
      for (const f of fields) {
        init[f.name] = savedVals && savedVals[f.name] != null
          ? savedVals[f.name]
          : (f.options && f.options.length ? f.options[0].value : (f.value || ''));
      }
      const [vals, setVals] = useState(init);
      const [busy, setBusy] = useState(false);
      const [done, setDone] = useState(() => !!msg.done || !!saved.done);
      const [err, setErr] = useState('');
      const [link, setLink] = useState(() => msg.link || saved.link || '');
      const set = (k, v) => setVals((x) => ({ ...x, [k]: v }));
      const a = msg.app || {};
      const title = L(`${ACT_LABEL[msg.action || 'create'] || '创建'}${FN_LABEL[msg.fn] || msg.fn || ''}`, `${ACT_LABEL_EN[msg.action || 'create'] || 'Create'} ${FN_LABEL_EN[msg.fn] || msg.fn || ''}`.trim());
      const home = msg.home || '';
      return h(CxSection, { className: `cx-wform${done ? ' done' : ''}`, title, sub: done ? L('已提交', 'Submitted') : `${fields.length} ${L('个字段', 'fields')}` },
        h('div', {
          className: `cx-wform-app${home ? ' link' : ''}`,
          title: home ? '打开实例首页' : '',
          onClick: home ? () => onOpen?.(home, a.title || a.name || '应用') : undefined,
        },
          h('span', { className: 'ico' }, h(Icon, { name: 'app', size: 16 })),
          h('span', { className: 'body' },
            h('span', { className: 'name' }, a.title || a.name || '应用'),
            h('span', { className: 'sub' }, [a.city_name || a.city, a.company_name || a.company, a.template || a.service_name, a.space].filter(Boolean).join(' · ')))),
        h('div', { className: 'cx-kv' },
          (fields || []).map((f) => (done
            ? h('div', { key: f.name, className: 'cx-kv-row' }, h('span', { className: 'cx-kv-k' }, fLabel(f)), h('b', { className: 'cx-kv-v' }, vals[f.name] || '—'))
            : h(CxField, { key: f.name, className: 'cx-field-lite', label: `${fLabel(f)}${f.required ? ' *' : ''}` },
                f.type === 'select'
                  ? h(CxSelect, { value: vals[f.name] ?? '', disabled: busy, onChange: (e) => set(f.name, e.target.value) },
                      (f.options || []).map((o) => h('option', { key: o.value, value: o.value }, o.label)))
                  : h(CxInput, { value: vals[f.name] ?? '', disabled: busy, placeholder: f.label || f.name, onChange: (e) => set(f.name, e.target.value) }))))),
        err ? h('div', { className: 'cx-wform-err' }, err) : null,
        done && link ? h('div', { className: 'cx-foot' },
          h(CxBtn, { size: 'sm', onClick: () => onOpen?.(link, msg.app?.title || msg.app?.name || '详情') }, L('查看详情', 'View details'))) : null,
        done ? null : h('div', { className: 'cx-foot' },
          h('button', {
            className: 'cx-btn pri', disabled: busy || done,
            onClick: async () => {
              if (busy || done) return;
              setBusy(true); setErr('');
              try {
                const res = await onSubmit(msg, vals, true);
                setLink(res?.url || ''); setDone(true);
                writeFormState(msg.fk, { done: true, link: res?.url || '', values: vals });
                onDone?.(msg.id, res?.url || '', vals);
              }
              catch (e) { setErr(String(e?.message || e)); }
              finally { setBusy(false); }
            },
          }, busy ? L('提交中…', 'Submitting…') : L('提交', 'Submit'))));
    }


    // 创建类操作先确认参数：字段可编辑，确认后才真正调用接口。
    function CxAskForm({ m, lang, onSubmit }) {
      const L = (zh, en) => (lang === 'zh' ? zh : en);
      const fields = (m.ask && m.ask.fields) || [];
      const [vals, setVals] = useState(() => Object.fromEntries(fields.map((f) => [f.name, f.value == null ? '' : String(f.value)])));
      const [sub, setSub] = useState(false);
      const done = !!m.done;
      const set = (k, v) => setVals((x) => ({ ...x, [k]: v }));
      const submit = async () => {
        if (sub || done) return;
        setSub(true);
        try { await onSubmit(m, vals); } finally { setSub(false); }
      };
      return h(CxSection, { className: 'cx-wform', title: (m.ask && m.ask.title) || '', sub: done ? L('已确认', 'Confirmed') : `${fields.length} ${L('个参数', 'fields')}` },
        (m.ask && m.ask.note) ? h('div', { className: 'cx-hint' }, m.ask.note) : null,
        fields.map((f) => h(CxField, { key: f.name, className: 'cx-field-lite', label: `${f.label || f.name}${f.required ? ' *' : ''}` },
          f.options
            ? h(CxSelect, { value: vals[f.name] == null ? '' : vals[f.name], disabled: done, onChange: (e) => set(f.name, e.target.value) },
              f.options.map((o) => h('option', { key: String(o.value ?? o), value: String(o.value ?? o) }, String(o.label ?? o))))
            : h(CxInput, { value: vals[f.name] == null ? '' : vals[f.name], placeholder: f.hint || '', title: f.hint || '', disabled: done, onChange: (e) => set(f.name, e.target.value) }))),
        done ? null : h('div', { className: 'cx-foot' },
          h(CxBtn, { variant: 'primary', disabled: sub, onClick: submit }, sub ? L('创建中…', 'Creating…') : L('确认创建', 'Confirm'))));
    }
