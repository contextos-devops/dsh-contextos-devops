    const installDep = (on, label, version, pending, note = '') => h('span', { className: `cx-cap ${pending ? '' : on ? 'ok' : 'off'}`, title: note || label },
      h('b', null, label), ' ', pending ? '…' : on ? (version || T('已发现')) : T('未发现'));
    function InstallToolbar({ opt, advanced, onToggle, hostLabel }) {
      return h('div', { className: 'cx-cap-row install-toolbar' },
        installDep(opt?.git, 'git', opt?.gitVersion, !opt),
        installDep(opt?.go, 'go', opt?.goVersion, !opt, opt?.goReady === false && opt?.goVersion ? `低于 ${opt.goNeed}，源码编译会先补 Go` : ''),
        h('span', { className: 'cx-cap host' }, hostLabel),
        h('button', { type: 'button', className: `cx-btn xs cx-advanced-btn${advanced ? ' on' : ''}`, 'aria-expanded': advanced ? 'true' : 'false', title: advanced ? T('收起高级配置') : T('展开高级配置'), onClick: onToggle },
          h('span', null, advanced ? T('收起高级配置') : T('高级配置')), h('span', { className: 'cx-adv-caret' }, advanced ? '▴' : '▾')));
    }
    function DeployModal({ onClose, onDone, onScan }) {
      const [port, setPort] = useState('9188');
      const [name, setName] = useState('');
      const [method, setMethod] = useState('auto');
      const [dir, setDir] = useState('');
      const [parent, setParent] = useState('');
      const [repo, setRepo] = useState('');
      const [codeSource, setCodeSource] = useState('');
      const [mirror, setMirror] = useState('');
      const [sourceBin, setSourceBin] = useState('');
      const [goPolicy, setGoPolicy] = useState('auto');
      const [opt, setOpt] = useState(null);
      const [plan, setPlan] = useState(null);
      const [result, setResult] = useState(null);
      const [showScript, setShowScript] = useState(false);
      const [advanced, setAdvanced] = useState(false);
      const [spaceKeys, setSpaceKeys] = useState(['community', 'enterprise']);
      const [busy, setBusy] = useState(false);
      const [err, setErr] = useState('');
      useEffect(() => {
        let alive = true;
        api('deployOptions', {}).then((r) => {
          if (!alive) return;
          setOpt(r);
          if (!repo) setRepo(r?.defaults?.repo || '');
        }).catch((e) => { if (alive) setErr(String(e?.message || e)); });
        return () => { alive = false; };
      }, []);
      const payload = () => ({ port: Number(port), name, method, repo, codeSource, mirror, dir, parent, sourceBin, goPolicy, ctxName: dir, dryRun: false });
      const preview = async (script = false) => {
        setErr(''); setBusy(true); setShowScript(script);
        try { const r = await api('deploy', { ...payload(), dryRun: true }); setPlan(r.plan || r); }
        catch (e) { setErr(String(e?.message || e)); setPlan(null); }
        finally { setBusy(false); }
      };
      const go = async () => {
        setBusy(true); setErr('');
        try {
          const r = await api('deploy', payload());
          const binaryMode = r?.plan?.strategy === 'binary' || r?.method === 'binary' || (!opt?.git && !opt?.go);
          const spaces = await api('officialSpaces', { node: Number(port), keys: spaceKeys, binaryMode });
          setResult({ ...r, officialSpaces: spaces });
          onDone();
        } catch (e) { setErr(String(e?.message || e)); } finally { setBusy(false); }
      };
      const host = opt?.host || '';
      const rows = opt?.matrix || [];
      return h(Modal, { title: '部署服务节点 / DEPLOY NODE', desc: '按 git / go 能力自动选源码或二进制；源码地址可被代码源覆盖，二进制从镜像源下载。', onClose },
        h('div', { className: 'cx-form' },
          h(InstallToolbar, { opt, advanced, onToggle: () => setAdvanced((v) => !v), hostLabel: `本机 ${host || '…'}` }),
          advanced ? h('label', { className: 'cx-field' }, '安装方式 / METHOD', h('select', { className: 'cx-select', value: method, onChange: (e) => setMethod(e.target.value) },
            h('option', { value: 'auto' }, 'auto / 有 git 编译，无 git 下载'),
            h('option', { value: 'source' }, 'source / 源码构建（自动补 Go）'),
            h('option', { value: 'binary' }, 'binary / 从镜像源下载程序文件'),
            h('option', { value: 'copy' }, 'copy / 复制本机二进制'))) : null,
          advanced ? h('label', { className: 'cx-field full' }, '源码地址 / SOURCE ADDRESS', h('input', { className: 'cx-input', value: repo, placeholder: 'https://shylinux.com/x/ContextOS', onChange: (e) => setRepo(e.target.value) })) : null,
          advanced ? h('label', { className: 'cx-field full' }, '代码源（可选） / CODE SOURCE', h('input', { className: 'cx-input', value: codeSource, placeholder: '留空使用源码地址', onChange: (e) => setCodeSource(e.target.value) })) : null,
          advanced ? h('label', { className: 'cx-field full' }, '镜像源（可选） / MIRROR SOURCE', h('input', { className: 'cx-input', value: mirror, placeholder: '留空使用源码地址的主机地址', onChange: (e) => setMirror(e.target.value) })) : null,
          h('label', { className: 'cx-field' }, '端口 / PORT', h('input', { className: 'cx-input', value: port, onChange: (e) => setPort(e.target.value), inputMode: 'numeric' })),
          h('label', { className: 'cx-field' }, '名称 / NAME', h('input', { className: 'cx-input', value: name, placeholder: 'ContextOS-prod', onChange: (e) => setName(e.target.value) })),
          h('label', { className: 'cx-field full' }, '安装目录 / CTX_NAME', h('input', { className: 'cx-input', value: dir, placeholder: '~/ContextOS-9188（留空自动）', onChange: (e) => setDir(e.target.value) })),
          method === 'source' ? h('label', { className: 'cx-field' }, 'Go 策略 / GO', h('select', { className: 'cx-select', value: goPolicy, onChange: (e) => setGoPolicy(e.target.value) },
            h('option', { value: 'auto' }, 'auto / 缺失时下载到节点'), h('option', { value: 'never' }, 'never / 缺失就失败'))) : null,
          method === 'copy' ? h('label', { className: 'cx-field full' }, '节点镜像 / SOURCE BIN', h('input', { className: 'cx-input', value: sourceBin, placeholder: '留空用本机 bin/ice.bin', onChange: (e) => setSourceBin(e.target.value) })) : null,
          h('label', { className: 'cx-field full' }, '标准空间 / SPACES', h(StandardSpaces, { value: spaceKeys, onChange: setSpaceKeys })),
          advanced && rows.length ? h('div', { className: 'cx-install-matrix' },
            h('div', { className: 'cx-install-matrix-head' }, '能力矩阵 / 手动选择（点击行切换方式）'),
            rows.map((r) => h('button', { key: r.id, type: 'button', className: `cx-install-row${method === r.strategy ? ' on' : ''}`, onClick: () => setMethod(r.strategy) },
              h('b', null, r.label), h('span', null, r.detail), h('code', null, r.strategy)))) : null,
          plan ? h('div', { className: 'cx-install-plan' },
            h('div', { className: 'cx-install-plan-head' }, `${plan.strategy} · ${plan.target?.id || ''} · ${plan.sameTarget ? '本机可启动' : '仅准备，不启动'}`),
            (plan.steps || []).map((x) => h('div', { key: x.id, className: 'cx-install-step' }, h('b', null, x.label), h('span', null, x.detail))),
            (plan.warnings || []).map((x, i) => h('div', { key: i, className: 'cx-install-warn' }, x)),
            plan.binary ? h('code', null, plan.binary.url) : null,
            showScript && plan.script?.length ? h('div', { className: 'cx-install-script' }, h('b', null, '将要执行的命令 / SCRIPT'), h('pre', null, plan.script.join('\n'))) : null) : null,
          result?.log?.length ? h('div', { className: 'cx-deploy-log' },
            h('div', { className: 'cx-install-plan-head' }, '执行过程 / EXECUTION LOG'),
            h('table', null,
              h('thead', null, h('tr', null, h('th', null, 'TIME'), h('th', null, 'STATUS'), h('th', null, 'CLI / API'), h('th', null, '影响'), h('th', null, 'DETAIL'))),
              h('tbody', null, result.log.map((x, i) => h('tr', { key: i, className: x.status },
                h('td', null, String(x.time || '').slice(11, 19)),
                h('td', null, x.status),
                h('td', null, h('code', null, x.cmd || '')),
                h('td', null, x.impact || ''),
                h('td', null, x.detail || '')
              )))
            )
          ) : null,
          result?.officialSpaces?.length ? h('div', { className: 'cx-deploy-log' },
            h('div', { className: 'cx-install-plan-head' }, '标准空间 / OFFICIAL SPACES'),
            h('table', null,
              h('thead', null, h('tr', null, h('th', null, 'SPACE'), h('th', null, 'MODE'), h('th', null, 'BUILD'), h('th', null, 'SOURCE'))),
              h('tbody', null, result.officialSpaces.map((x, i) => h('tr', { key: i },
                h('td', null, x.space || x.name || ''),
                h('td', null, x.binary ? 'binary' : 'source'),
                h('td', null, x.built ? 'build' : 'skip'),
                h('td', null, x.binary || x.repo || '')
              )))
            )
          ) : null),
        err ? h(ErrorBox, { text: err }) : null,
        h('div', { className: 'cx-foot' },
          onScan ? h('button', { className: 'cx-btn', style: { marginRight: 'auto' }, onClick: onScan, title: '扫描远程主机 / WiFi / 蓝牙' }, '扫描设备') : null,
          h('button', { className: 'cx-btn', onClick: () => preview(false), disabled: busy }, '查看安装计划'),
          h('button', { className: 'cx-btn', onClick: () => preview(true), disabled: busy }, '预览脚本'),
          h('button', { className: 'cx-btn', onClick: onClose }, result ? T('关闭') : T('取消')),
          h('button', { className: 'cx-btn pri', disabled: busy, onClick: go }, busy ? '部署中…' : '部署')));
    }
    function SpaceModal({ node, onClose, onDone }) {
      const [name, setName] = useState('project');
      const [busy, setBusy] = useState(false);
      const [err, setErr] = useState('');
      const go = async () => {
        setBusy(true); setErr('');
        try {
          const created = await api('createSpace', { node: Number(node), name });
          await api('initSpace', { node: Number(node), space: created.name });
          onDone(created.name);
        } catch (e) { setErr(String(e?.message || e)); } finally { setBusy(false); }
      };
      return h(Modal, { title: '创建项目空间 / CREATE WORKSPACE', desc: '不指定 repos：dream create 建空空间 → web.code.git.status init 生成 .git / src/main.go / go.mod 骨架。', onClose },
        h('div', { className: 'cx-form' }, h('label', { className: 'cx-field full' }, '空间名称 / SPACE NAME', h('input', { className: 'cx-input', value: name, placeholder: 'project', onChange: (e) => setName(e.target.value) }))),
        h('div', { className: 'desc' }, '空间名只用字母、数字、下划线；服务端自动加 YYYYMMDD- 前缀。'),
        err ? h(ErrorBox, { text: err }) : null,
        h('div', { className: 'cx-foot' }, h('button', { className: 'cx-btn', onClick: onClose }, T('取消')), h('button', { className: 'cx-btn pri', disabled: busy, onClick: go }, busy ? '创建中…' : '创建并初始化')));
    }

    function AppModal({ node, space, onClose, onDone }) {
      const [name, setName] = useState('yuangong');
      const [help, setHelp] = useState('员工管理');
      const [place, setPlace] = useState('employee');
      const [value, setValue] = useState('profile,position,skill,experience,education,record');
      const [trans, setTrans] = useState('员工信息，工作岗位，专业技能，工作经验，教育经历，事件记录');
      const [busy, setBusy] = useState(false);
      const [err, setErr] = useState('');
      const go = async () => {
        setBusy(true); setErr('');
        try {
          const r = await api('autogenApp', { node: Number(node), space, name, help, place, value, trans });
          onDone(r);
        } catch (e) { setErr(String(e?.message || e)); } finally { setBusy(false); }
      };
      return h(Modal, { title: '生成应用 / GENERATE APP', desc: '云社区 service/autogen 按应用平台风格生成：portal.json + 五角色 + 列表/创建 + 看板；随后 compile。', onClose },
        h('div', { className: 'cx-form' },
          h('label', { className: 'cx-field' }, '应用名称 / APP NAME', h('input', { className: 'cx-input', value: name, onChange: (e) => setName(e.target.value) })),
          h('label', { className: 'cx-field' }, '标题 / TITLE', h('input', { className: 'cx-input', value: help, onChange: (e) => setHelp(e.target.value) })),
          h('label', { className: 'cx-field' }, '场景 / PLACE', h('input', { className: 'cx-input', value: place, onChange: (e) => setPlace(e.target.value) })),
          h('label', { className: 'cx-field' }, '字段 / VALUE (逗号分隔)', h('input', { className: 'cx-input', value: value, onChange: (e) => setValue(e.target.value) })),
          h('label', { className: 'cx-field full' }, '翻译 / TRANS（中文）', h('input', { className: 'cx-input', value: trans, onChange: (e) => setTrans(e.target.value) }))),
        err ? h(ErrorBox, { text: err }) : null,
        h('div', { className: 'cx-foot' }, h('button', { className: 'cx-btn', onClick: onClose }, T('取消')), h('button', { className: 'cx-btn pri', disabled: busy, onClick: go }, busy ? '生成中…' : '生成并编译')));
    }

    function CodeModal({ node, space, app, onClose }) {
      const [files, setFiles] = useState([]);
      const [showMore, setShowMore] = useState(false);
      const [pm, setPm] = useState(null);
      const [targetId, setTargetId] = useState('');
      const [planId, setPlanId] = useState('');
      const [taskId, setTaskId] = useState('');
      const [reportId, setReportId] = useState('');
      const [feedbackId, setFeedbackId] = useState('');
      const bootCal = cxRead('cal', {});
      const [calStart, setCalStart] = useState(bootCal.start || '');
      const [calEnd, setCalEnd] = useState(bootCal.end || '');
      useEffect(() => cxWrite('cal', { ...cxRead('cal', {}), start: calStart, end: calEnd }), [calStart, calEnd]);
      const [planStatusFilter, setPlanStatusFilter] = useState([]);
      const [taskStatusFilter, setTaskStatusFilter] = useState([]);
      const [reportTypeFilter, setReportTypeFilter] = useState([]);
      const [feedbackStatusFilter, setFeedbackStatusFilter] = useState([]);
      const [pmForm, setPmForm] = useState(null);
      const sessionStateRef = useRef({ key: '', ready: false, msgs: [] });
      const seedingRef = useRef(false);
      const [file, setFile] = useState('portal.go');
      const [content, setContent] = useState('');
      const [msg, setMsg] = useState('');
      const [busy, setBusy] = useState(false);
      const [err, setErr] = useState('');
      useEffect(() => {
        let alive = true;
        api('listDir', { node, space, path: `src/${app.name}` }).then((d) => {
          if (!alive) return;
          const list = (d.entries || []).filter((e) => e.type === 'file' && /\.(go|json|js|css|md)$/.test(e.name));
          setFiles(list);
          const pick = list.find((e) => e.name === 'portal.go') || list[0];
          if (pick) setFile(pick.name);
        }).catch((e) => setErr(String(e?.message || e)));
        return () => { alive = false; };
      }, [node, space, app.name]);
      useEffect(() => {
        if (!file) return;
        let alive = true;
        api('readFile', { node, space, path: `src/${app.name}/${file}` }).then((d) => { if (alive) setContent(d.content || ''); }).catch((e) => { if (alive) setErr(String(e?.message || e)); });
        return () => { alive = false; };
      }, [node, space, app.name, file]);
      const save = async (build) => {
        setBusy(true); setErr(''); setMsg('');
        try {
          await api('writeFile', { node, space, path: `src/${app.name}/${file}`, content });
          setMsg('saved');
          if (build) { await api('buildSpace', { node, space }); setMsg('saved + built'); }
        } catch (e) { setErr(String(e?.message || e)); } finally { setBusy(false); }
      };
      return h(Modal, { title: `CODE / ${app.title || app.name}`, desc: `编辑 ${space}/src/${app.name}；保存后可编译。`, onClose },
        h('div', { className: 'cx-form' },
          h('label', { className: 'cx-field full' }, 'FILE', h('select', { className: 'cx-select', value: file, onChange: (e) => setFile(e.target.value) }, files.map((f) => h('option', { key: f.name, value: f.name }, f.name)))),
          h('label', { className: 'cx-field full' }, 'CONTENT', h('textarea', { className: 'cx-area', style: { minHeight: 300 }, value: content, spellCheck: false, onChange: (e) => setContent(e.target.value) }))),
        msg ? h('div', { className: 'desc' }, msg) : null,
        err ? h(ErrorBox, { text: err }) : null,
        h('div', { className: 'cx-foot' }, h('button', { className: 'cx-btn', onClick: onClose }, T('关闭')), h('button', { className: 'cx-btn', disabled: busy, onClick: () => save(false) }, busy ? '…' : T('保存')), h('button', { className: 'cx-btn pri', disabled: busy, onClick: () => save(true) }, T('保存并编译'))));
    }

    function InstanceModal({ node, space, app, avatar, onClose, onDone }) {
      const [name, setName] = useState(app.title || '我的应用');
      const [city, setCity] = useState(avatar?.city || '深圳市');
      const [company, setCompany] = useState(avatar?.company || '云轩领航');
      const [busy, setBusy] = useState(false);
      const [err, setErr] = useState('');
      const go = async () => {
        setBusy(true); setErr('');
        try { const r = await api('createInstance', { node, space, command: app.command, place: app.place || '', name, city, company, uid: cxActorUid(avatar) }); onDone(r); }
        catch (e) { setErr(String(e?.message || e)); } finally { setBusy(false); }
      };
      return h(Modal, { title: `创建应用实例 / ${app.title || app.name}`, desc: `在 ${space} 用 ${app.command} 建实例；实例行会出现在该用户的 recent 列表。`, onClose },
        h('div', { className: 'cx-form' },
          h('label', { className: 'cx-field full' }, '实例名称 / INSTANCE NAME', h('input', { className: 'cx-input', value: name, onChange: (e) => setName(e.target.value) })),
          h('label', { className: 'cx-field' }, '城市 / CITY', h('input', { className: 'cx-input', value: city, onChange: (e) => setCity(e.target.value) })),
          h('label', { className: 'cx-field' }, '公司 / COMPANY', h('input', { className: 'cx-input', value: company, onChange: (e) => setCompany(e.target.value) }))),
        err ? h(ErrorBox, { text: err }) : null,
        h('div', { className: 'cx-foot' }, h('button', { className: 'cx-btn', onClick: onClose }, T('取消')), h('button', { className: 'cx-btn pri', disabled: busy, onClick: go }, busy ? '创建中…' : '创建应用实例')));
    }

    function StoreInstanceModal({ node, service, avatar, onClose, onDone }) {
      const [city, setCity] = useState(avatar?.city || '深圳市');
      const [company, setCompany] = useState(avatar?.company || '云轩领航');
      const [name, setName] = useState(String(service.name || '').split(/\s+/)[0] || '我的应用');
      const [busy, setBusy] = useState(false);
      const [err, setErr] = useState('');
      const go = async () => {
        setBusy(true); setErr('');
        try { const r = await api('createStoreInstance', { node, service, city, company, name, uid: avatar?.uid || '' }); onDone(r); }
        catch (e) { setErr(String(e?.message || e)); } finally { setBusy(false); }
      };
      return h(Modal, { title: `创建应用实例 / ${service.name}`, desc: '从应用商店模板创建实例：城市 + 公司 + 应用名称三个参数。', onClose },
        h('div', { className: 'cx-form' },
          h('label', { className: 'cx-field full' }, '城市名称 / CITY', h('input', { className: 'cx-input', value: city, onChange: (e) => setCity(e.target.value) })),
          h('label', { className: 'cx-field full' }, '公司名称 / COMPANY', h('input', { className: 'cx-input', value: company, onChange: (e) => setCompany(e.target.value) })),
          h('label', { className: 'cx-field full' }, '应用名称 / APP NAME', h('input', { className: 'cx-input', value: name, onChange: (e) => setName(e.target.value) }))),
        h('div', { className: 'desc' }, `space: ${service.space} · command: ${service.command}`),
        err ? h(ErrorBox, { text: err }) : null,
        h('div', { className: 'cx-foot' }, h('button', { className: 'cx-btn', onClick: onClose }, T('取消')), h('button', { className: 'cx-btn pri', disabled: busy, onClick: go }, busy ? '创建中…' : '创建应用实例')));
    }
