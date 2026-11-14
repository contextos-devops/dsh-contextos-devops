    function DeployModal({ onClose, onDone, onScan }) {
      const [port, setPort] = useState('9188');
      const [name, setName] = useState('');
      const [mode, setMode] = useState('auto');
      const [parent, setParent] = useState('');
      const [repo, setRepo] = useState('');
      const [sourceBin, setSourceBin] = useState('');
      const [spaceKeys, setSpaceKeys] = useState(['community', 'enterprise']);
      const [busy, setBusy] = useState(false);
      const [err, setErr] = useState('');
      const go = async () => {
        setBusy(true); setErr('');
        try { await api('deploy', { port: Number(port), name, mode, parent, repo, sourceBin }); await api('officialSpaces', { node: Number(port), keys: spaceKeys }); onDone(); }
        catch (e) { setErr(String(e?.message || e)); } finally { setBusy(false); }
      };
      return h(Modal, { title: '部署服务节点 / DEPLOY NODE', desc: 'auto=先 clone 代码库，有 git+go 编译，否则复制或下载 ice.bin；默认选中云社区、云办公。', onClose },
        h('div', { className: 'cx-form' },
          h('label', { className: 'cx-field' }, '部署方式 / MODE', h('select', { className: 'cx-select', value: mode, onChange: (e) => setMode(e.target.value) },
            h('option', { value: 'auto' }, 'auto / 克隆后编译/复制/下载'), h('option', { value: 'copy' }, 'copy / 本机复制'), h('option', { value: 'download' }, 'download / 下载'), h('option', { value: 'source' }, 'source / 源码构建'))),
          h('label', { className: 'cx-field' }, '端口 / PORT', h('input', { className: 'cx-input', value: port, onChange: (e) => setPort(e.target.value) })),
          h('label', { className: 'cx-field' }, '名称 / NAME', h('input', { className: 'cx-input', value: name, placeholder: 'ContextOS-prod', onChange: (e) => setName(e.target.value) })),
          (mode === 'download' || mode === 'source') ? h('label', { className: 'cx-field' }, '父节点 / PARENT', h('input', { className: 'cx-input', value: parent, placeholder: 'https://shylinux.com', onChange: (e) => setParent(e.target.value) })) : null,
          mode === 'source' ? h('label', { className: 'cx-field full' }, '代码仓库 / REPO', h('input', { className: 'cx-input', value: repo, placeholder: 'https://shylinux.com/x/ContextOS', onChange: (e) => setRepo(e.target.value) })) : null,
          mode === 'copy' ? h('label', { className: 'cx-field full' }, '节点镜像 / SOURCE BIN', h('input', { className: 'cx-input', value: sourceBin, placeholder: '留空用 usr/publish，或 /path/bin/ice.bin', onChange: (e) => setSourceBin(e.target.value) })) : null,
          h('label', { className: 'cx-field full' }, '标准空间 / SPACES', h(StandardSpaces, { value: spaceKeys, onChange: setSpaceKeys }))),
        err ? h(ErrorBox, { text: err }) : null,
        h('div', { className: 'cx-foot' },
          onScan ? h('button', { className: 'cx-btn', style: { marginRight: 'auto' }, onClick: onScan, title: '扫描远程主机 / WiFi / 蓝牙' }, '扫描设备') : null,
          h('button', { className: 'cx-btn', onClick: onClose }, T('取消')),
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
      const bootCal = (() => { try { return JSON.parse(localStorage.getItem('contextos-devops-dsh:cal') || 'null') || {}; } catch { return {}; } })();
      const [calStart, setCalStart] = useState(bootCal.start || '');
      const [calEnd, setCalEnd] = useState(bootCal.end || '');
      useEffect(() => { try { const prev = JSON.parse(localStorage.getItem('contextos-devops-dsh:cal') || '{}'); localStorage.setItem('contextos-devops-dsh:cal', JSON.stringify({ ...prev, start: calStart, end: calEnd })); } catch {} }, [calStart, calEnd]);
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
