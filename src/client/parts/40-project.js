    const compactInitLog = (text, method = 'ALL') => {
      const out = [];
      let pending = '';
      for (const raw of String(text || '').split('\n')) {
        const s = raw.trim();
        const req = s.match(/^\[[0-9:.]+\]\s*→\s*(GET|PUT|POST|DELETE|PATCH)\b/);
        if (req) {
          pending = req[1];
          if (method === 'ALL' || pending === method) out.push(s);
          continue;
        }
        if (/^\[[0-9:.]+\]\s*←/.test(s)) {
          if (pending && (method === 'ALL' || pending === method)) out.push(s);
          continue;
        }
        if (/^\$ /.test(s) || /^\[(?:exit|start|deploy|api |download\])/.test(s)) {
          if (method === 'ALL') out.push(s);
        }
      }
      return out.join('\n');
    };
    function InitOverlay({ state, onStart, onRetry, onLoginRemote, onClose }) {
      if (!state) return null;
      const T = (s) => s;
      const phase = state.phase || (state.running ? 'running' : state.error ? 'error' : state.done ? 'done' : 'setup');
      const [step, setStep] = useState(0);
      const [mode, setMode] = useState('local');
      const [dir, setDir] = useState(state.params?.dir || INIT_DEFAULTS.dir);
      const [port, setPort] = useState(String(state.params?.port || INIT_DEFAULTS.port));
      const [repo, setRepo] = useState(state.params?.repo ?? INIT_DEFAULTS.repo);
      const [method, setMethod] = useState(state.params?.method || 'auto');
      const [codeSource, setCodeSource] = useState(state.params?.codeSource || '');
      const [mirror, setMirror] = useState(state.params?.mirror || '');
      const [goPolicy, setGoPolicy] = useState(state.params?.goPolicy || 'auto');
      const [deployOpt, setDeployOpt] = useState(null);
      const [advanced, setAdvanced] = useState(false);
      const [image, setImage] = useState('shylinux/contextos:latest');
      const [host, setHost] = useState('');
      const [sshUser, setSshUser] = useState('shy');
      const [sshPort, setSshPort] = useState('22');
      const [remoteUrl, setRemoteUrl] = useState('http://127.0.0.1:9401');
      const [remoteUser, setRemoteUser] = useState('shy');
      const [remotePass, setRemotePass] = useState('');
      const [login, setLogin] = useState(null);
      const [loginBusy, setLoginBusy] = useState(false);
      const [avatar, setAvatar] = useState(() => ({ name: T('我的数字分身'), company: T('云轩领航'), city: T('深圳市'), image: '' }));
      const [scene, setScene] = useState(() => ({ name: T('我的赛博世界'), image: '' }));
      const [project, setProject] = useState(() => ({ name: T('我的第一个项目'), goal: T('把想法变成可交付的软件。'), plan: T('先梳理需求，再搭建原型，最后验收演示。') }));
      const [probeBusy, setProbeBusy] = useState(false);
      const probedRef = useRef(false);
      const [spaceKeys, setSpaceKeys] = useState(['community', 'enterprise']);
      const [logCollapsed, setLogCollapsed] = useState(false);
      const [logMax, setLogMax] = useState(false);
      const [methodFilter, setMethodFilter] = useState('ALL');
      const [probePulse, setProbePulse] = useState(false);
      const probeSeenRef = useRef(0);
      const probePort = async () => {
        setProbeBusy(true);
        try {
          const r = await api('freePort', { start: Number(port) || 9188 });
          setPort(String(r.port));
          if (!dir || /^~\/ContextOS-\d+$/.test(dir)) setDir(r.dir || `~/ContextOS-${r.port}`);
        } finally { setProbeBusy(false); }
      };
      const avatarRef = useRef(null);
      const sceneRef = useRef(null);
      const consoleRef = useRef(null);
      const icon = (s) => s === 'done' ? '✓' : s === 'run' ? '◍' : s === 'err' ? '✗' : '○';
      useEffect(() => {
        if (!logMax) return;
        const onKey = (e) => { if (e.key === 'Escape') setLogMax(false); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
      }, [logMax]);
      useEffect(() => {
        const el = consoleRef.current;
        if (!el) return;
        if (el.scrollHeight - el.scrollTop - el.clientHeight < 120) el.scrollTop = el.scrollHeight;
      }, [state.console, state.apiConsole, logCollapsed]);
      useEffect(() => {
        const n = (String(state.console || '').match(/\[probe\]/g) || []).length;
        if (n === probeSeenRef.current) return;
        probeSeenRef.current = n;
        setProbePulse(true);
        const t = setTimeout(() => setProbePulse(false), 760);
        return () => clearTimeout(t);
      }, [state.console]);
      const total = (state.steps || []).length;
      const doneCount = (state.steps || []).filter((x) => x.status === 'done').length;
      const pct = total ? Math.round((doneCount / total) * 100) : 0;
      const dlPcts = [...String(state.console || '').matchAll(/\[download\]\s+(\d+)%/g)].map((m) => Number(m[1]));
      const downloadPct = dlPcts.length ? dlPcts[dlPcts.length - 1] : 0;
      const titles = { setup: T('初始化'), running: T('正在初始化'), done: T('初始化完成'), error: T('初始化失败') };
      const readPic = (file, cb) => cxImageDataUrl(file, { max: 720, quality: 0.82 }).then((url) => url && cb(url)).catch(() => {});
      const binaryMode = method === 'binary' || method === 'copy' || (!!deployOpt && !deployOpt.git);
      const start = () => onStart({ mode, dir, port: Number(port) || 9188, repo, codeSource, mirror, method, goPolicy, image, host, sshUser, sshPort: Number(sshPort) || 22, remoteUrl, remoteUser, remotePass, binaryMode, avatar, scene, project, spaces: spaceKeys });
      const doLogin = async () => {
        setLoginBusy(true); setLogin(null);
        try { const r = await onLoginRemote({ url: remoteUrl, user: remoteUser, pass: remotePass }); setLogin(r); }
        catch (e) { setLogin({ error: String(e?.message || e) }); }
        finally { setLoginBusy(false); }
      };
      const field = (label, node) => h('label', { className: 'cx-field full' }, label, node);
      const input = (value, set, props = {}) => h('input', { className: 'cx-input', value, onChange: (e) => set(e.target.value), ...props });
      useEffect(() => { if (probedRef.current) return; probedRef.current = true; probePort(); }, []);
      useEffect(() => {
        if (mode !== 'local') return;
        let alive = true;
        api('deployOptions', { dir }).then((r) => {
          if (!alive) return;
          setDeployOpt(r);
        }).catch(() => {});
        return () => { alive = false; };
      }, [mode, dir]);
      const stepHead = h('div', { className: 'cx-init-wiz' }, [['01', '部署', '部署节点'], ['02', '分身与场景', '分身与赛博世界'], ['03', '项目', '创建项目']].map(([n, t, en], i) =>
        h('button', { key: n, type: 'button', className: `cx-init-tab${step === i ? ' on' : ''}${step > i ? ' done' : ''}`, onClick: () => phase === 'setup' && setStep(i) },
          h('b', null, n), h('span', null, T(t)), h('i', null, en))));
      const modeChip = ([id, label, desc]) => h('button', { key: id, type: 'button', className: `cx-init-mode${mode === id ? ' on' : ''}`, onClick: () => setMode(id) },
        h('b', null, T(label)), h('span', null, T(desc)));
      const modes = h('div', { className: 'cx-init-modes' },
        modeChip(['local', '本机部署', '本机直接部署节点']),
        modeChip(['docker', '容器部署', 'docker run 一个节点']),
        modeChip(['remoteDeploy', '远程部署', 'ssh 到远端建节点']),
        modeChip(['remote', '远程连接', '登录远端换 sessid']));
      const modeForm = mode === 'local' ? h('div', { className: 'cx-form' },
        h(InstallToolbar, { opt: deployOpt, advanced, onToggle: () => setAdvanced((v) => !v), hostLabel: `${T('本机')} ${deployOpt?.host || '…'}` }),
        advanced ? field(T('安装方式'), h('select', { className: 'cx-select', value: method, onChange: (e) => setMethod(e.target.value) },
          h('option', { value: 'auto' }, T('自动') + ' / auto'),
          h('option', { value: 'source' }, T('源码构建') + ' / source'),
          h('option', { value: 'binary' }, T('二进制') + ' / binary'),
          h('option', { value: 'copy' }, T('复制本机') + ' / copy'))) : null,
        advanced ? field(T('源码地址'), input(repo, setRepo, { placeholder: 'https://shylinux.com/x/ContextOS' })) : null,
        advanced ? field(T('代码源（可选）'), input(codeSource, setCodeSource, { placeholder: '留空使用源码地址' })) : null,
        advanced ? field(T('镜像源（可选）'), input(mirror, setMirror, { placeholder: '留空使用源码地址的主机地址' })) : null,
        field(T('部署目录'), input(dir, setDir, { placeholder: '~/ContextOS-9188' })),
        h('label', { className: 'cx-field full' }, T('端口'), h('div', { className: 'cx-port-row' }, input(port, setPort, { inputMode: 'numeric' }), h('button', { className: 'cx-btn', type: 'button', disabled: probeBusy, onClick: probePort }, probeBusy ? T('探测中…') : T('探测端口')))),
        h('div', { className: 'cx-field full' }, T('标准空间'), h(StandardSpaces, { value: spaceKeys, onChange: setSpaceKeys, zh: true })))
        : mode === 'docker' ? h('div', { className: 'cx-form' },
          field(T('镜像'), input(image, setImage, { placeholder: 'shylinux/contextos:latest' })),
          field(T('宿主机目录（可空）'), input(dir, setDir, { placeholder: '~/contextos-data' })),
          h('label', { className: 'cx-field full' }, T('端口'), h('div', { className: 'cx-port-row' }, input(port, setPort, { inputMode: 'numeric' }), h('button', { className: 'cx-btn', type: 'button', disabled: probeBusy, onClick: probePort }, probeBusy ? T('探测中…') : T('探测端口')))))
          : mode === 'remoteDeploy' ? h('div', { className: 'cx-form' },
            field(T('远程主机'), input(host, setHost, { placeholder: '192.168.1.10' })),
            field(T('SSH 用户'), input(sshUser, setSshUser)),
            field(T('SSH 端口'), input(sshPort, setSshPort)),
            h('label', { className: 'cx-field full' }, T('节点端口'), h('div', { className: 'cx-port-row' }, input(port, setPort, { inputMode: 'numeric' }), h('button', { className: 'cx-btn', type: 'button', disabled: probeBusy, onClick: probePort }, probeBusy ? T('探测中…') : T('探测端口')))),
            field(T('镜像'), input(image, setImage)))
            : h('div', null,
              h('div', { className: 'cx-form' },
                field(T('远程地址'), input(remoteUrl, setRemoteUrl, { placeholder: 'http://127.0.0.1:9401' })),
                field(T('用户名'), input(remoteUser, setRemoteUser)),
                field(T('密码'), h('input', { className: 'cx-input', type: 'password', value: remotePass, onChange: (e) => setRemotePass(e.target.value) }))),
              h('div', { className: 'cx-init-login' },
                h('button', { className: 'cx-btn', type: 'button', disabled: loginBusy, onClick: doLogin }, loginBusy ? T('登录中…') : T('登录并获取 sessid')),
                login?.sessid ? h('span', { className: 'ok' }, `✓ sessid ${login.sessid.slice(0, 12)}… · ${login.via}`) : null,
                login?.error ? h('span', { className: 'err' }, login.error) : null));
      const pic = (kind) => {
        const ref = kind === 'avatar' ? avatarRef : sceneRef;
        const val = kind === 'avatar' ? avatar.image : scene.image;
        return h('div', { className: 'cx-init-pic', onClick: () => ref.current && ref.current.click(), title: T('点击选择图片') },
          val ? h('img', { src: val, alt: '' }) : h('div', { className: 'ph' }, h('b', null, kind === 'avatar' ? T('上传头像') : T('上传背景')), h('span', null, 'JPG / PNG · 720px')),
          h('input', { type: 'file', accept: 'image/*', ref, style: { display: 'none' }, onChange: (e) => { const f = e.target.files && e.target.files[0]; readPic(f, (data) => kind === 'avatar' ? setAvatar((v) => ({ ...v, image: data })) : setScene((v) => ({ ...v, image: data }))); } }));
      };
      const stepBody = step === 0 ? h('div', null, modes, modeForm)
        : step === 1 ? h('div', { className: 'cx-init-grid2' },
          h('div', { className: 'cx-init-sub' }, h('h3', null, T('数字分身')), pic('avatar'),
            h('div', { className: 'cx-form' }, field(T('名称'), input(avatar.name, (v) => setAvatar((a) => ({ ...a, name: v })))), field(T('公司'), input(avatar.company, (v) => setAvatar((a) => ({ ...a, company: v })))), field(T('城市'), input(avatar.city, (v) => setAvatar((a) => ({ ...a, city: v })))))),
          h('div', { className: 'cx-init-sub' }, h('h3', null, T('赛博世界')), pic('scene'),
            h('div', { className: 'cx-form' }, field(T('赛博世界名称'), input(scene.name, (v) => setScene((a) => ({ ...a, name: v })))))))
          : h('div', { className: 'cx-form' },
            field(T('项目名称'), input(project.name, (v) => setProject((x) => ({ ...x, name: v })))),
            h('label', { className: 'cx-field full' }, T('目标描述'), h('textarea', { className: 'cx-input', rows: 3, value: project.goal, onChange: (e) => setProject((x) => ({ ...x, goal: e.target.value })) })),
            h('label', { className: 'cx-field full' }, T('计划描述'), h('textarea', { className: 'cx-input', rows: 3, value: project.plan, onChange: (e) => setProject((x) => ({ ...x, plan: e.target.value })) })),
            h('div', { className: 'cx-init-sum' }, `${T('将生成')}: 1 ${T('目标')} · 1 ${T('计划')}`));
      const sp = state.spaceProgress;
      const spaceBar = sp?.total ? h('div', { className: 'cx-init-subbar' },
        h('div', { className: 'track' }, h('div', { className: 'bar', style: { width: `${Math.round((sp.done / sp.total) * 100)}%` } })),
        h('span', null, `${T('部署项目空间')} ${sp.done}/${sp.total}${sp.done >= sp.total ? ` · ${T('完成')}` : sp.space ? ` · ${sp.name ? `${sp.name} · ` : ''}${sp.space}` : ''}`)) : null;
      const runView = h('div', null,
        total ? h('div', { className: 'cx-init-progress' }, h('div', { className: 'track' }, h('div', { className: 'bar', style: { width: `${pct}%` } })), h('span', null, `${doneCount}/${total} · ${pct}%`)) : null,
        (state.steps || []).length ? h('div', null, state.steps.map((s, i) => h('div', { key: s.id, className: `cx-init-step ${s.status || ''}` },
          h('span', { className: `st${s.status === 'run' ? ' run' : ''}` }, s.status === 'run' ? h('i', { className: `cx-init-dot${probePulse ? ' pulse' : ''}` }) : icon(s.status)),
          h('div', { style: { flex: 1, minWidth: 0 } },
            h('span', { className: 'idx' }, String(i + 1).padStart(2, '0')), T(s.label),
            s.detail ? h('div', { className: 'sd' }, s.detail) : null,
            s.id === 'spaces' ? spaceBar : null)))) : null,
        state.error ? h(ErrorBox, { text: state.error }) : null,
        (state.console || state.apiConsole) ? h('div', { className: `cx-init-console-wrap${logMax ? ' max' : ''}` },
          h('div', { className: 'cx-init-debug-h' },
            T('接口 / 命令行输出'),
            h('div', { className: 'cx-init-methods' }, ['ALL', 'GET', 'PUT', 'POST', 'DELETE'].map((x) => h('button', { key: x, type: 'button', className: `cx-filter-chip${methodFilter === x ? ' on' : ''}`, onClick: () => setMethodFilter(x) }, x === 'ALL' ? T('全部') : x))),
            h('button', { className: 'cx-btn xs', onClick: () => setLogCollapsed((v) => !v) }, T(logCollapsed ? '展开日志' : '收起日志')),
            h('button', { className: 'cx-btn xs', onClick: () => setLogMax((v) => !v) }, T(logMax ? '退出全屏' : '最大化'))),
          downloadPct > 0 && downloadPct < 100 ? h('div', { className: 'cx-init-dl' }, h('div', { className: 'track' }, h('div', { className: 'bar', style: { width: `${downloadPct}%` } })), h('span', null, `${T('下载二进制')} ${downloadPct}%`)) : null,
          h('pre', { ref: consoleRef, className: `cx-init-console${logCollapsed ? ' collapsed' : ''}`, 'aria-label': T('接口与命令行调用结果') }, compactInitLog(`${state.apiConsole || ''}${state.apiConsole && state.console ? '\n' : ''}${state.console || ''}`, methodFilter))) : null);
      const footer = h('div', { className: 'cx-foot' },
        h('button', { className: 'cx-btn', onClick: onClose }, phase === 'running' ? T('隐藏') : phase === 'done' ? T('稍后') : T('关闭')),
        phase === 'setup' ? h('div', { style: { display: 'flex', gap: 8 } },
          step > 0 ? h('button', { className: 'cx-btn', onClick: () => setStep((v) => v - 1) }, T('上一步')) : null,
          step < 2 ? h('button', { className: 'cx-btn pri', onClick: () => setStep((v) => v + 1) }, T('下一步'))
            : h('button', { className: 'cx-btn pri', onClick: start }, T('初始化')))
          : phase === 'done' ? h('button', { className: 'cx-btn pri', onClick: onClose }, T('进入')) : phase === 'error' ? h('button', { className: 'cx-btn pri', onClick: onRetry }, T('重试当前步骤')) : null);
      return h('div', { className: `cx-init ${phase}${logMax ? ' maxlog' : ''}`, style: { '--cx-shell-left': '0px', '--cx-shell-top': '0px', '--cx-shell-width': '100vw', '--cx-shell-height': '100vh' } },
        h('div', { className: 'cx-init-grid' }),
        h('div', { className: 'cx-init-ring' }),
        h('div', { className: 'cx-init-scan' }),
        h('div', { className: 'cx-world cx-init-world' },
          h('div', { className: 'cx-world-kicker' }, 'WELCOME TO'),
          h('div', { className: 'cx-world-name' }, 'CONTEXTOS WORLD!'),
          h('div', { className: 'cx-world-sub' }, T('数字分身 · 软件工厂 · 赛博世界')),
          h('div', { className: 'cx-world-line' })),
        h('div', { className: 'cx-init-card' },
          h('div', { className: 'cx-init-head' },
            h('div', { className: 'cx-init-badge' }, 'CTX'),
            h('div', { style: { minWidth: 0 } },
              h('h2', null, titles[phase] || titles.setup),
              h('div', { className: 'desc' }, phase === 'setup' ? T('三步进入你的赛博世界：部署 → 数字分身与赛博世界 → 项目。') : T('部署节点 → 部署空间 → 数字分身 → 赛博世界 → 项目管理 → 进入对话')))),
          h('div', { className: 'cx-init-body' }, phase === 'setup' ? h('div', null, stepHead, stepBody) : runView),
          footer));
    }

    // ---- 农历 / 节气（1900-2100，移植自 volcanos/lib/date.js）----
    const CX_LUNAR_INFO = [ // 农历1900-2100的润大小信息表
		0x04bd8,0x04ae0,0x0a570,0x054d5,0x0d260,0x0d950,0x16554,0x056a0,0x09ad0,0x055d2,//1900-1909
		0x04ae0,0x0a5b6,0x0a4d0,0x0d250,0x1d255,0x0b540,0x0d6a0,0x0ada2,0x095b0,0x14977,//1910-1919
		0x04970,0x0a4b0,0x0b4b5,0x06a50,0x06d40,0x1ab54,0x02b60,0x09570,0x052f2,0x04970,//1920-1929
		0x06566,0x0d4a0,0x0ea50,0x16a95,0x05ad0,0x02b60,0x186e3,0x092e0,0x1c8d7,0x0c950,//1930-1939
		0x0d4a0,0x1d8a6,0x0b550,0x056a0,0x1a5b4,0x025d0,0x092d0,0x0d2b2,0x0a950,0x0b557,//1940-1949
		0x06ca0,0x0b550,0x15355,0x04da0,0x0a5b0,0x14573,0x052b0,0x0a9a8,0x0e950,0x06aa0,//1950-1959
		0x0aea6,0x0ab50,0x04b60,0x0aae4,0x0a570,0x05260,0x0f263,0x0d950,0x05b57,0x056a0,//1960-1969
		0x096d0,0x04dd5,0x04ad0,0x0a4d0,0x0d4d4,0x0d250,0x0d558,0x0b540,0x0b6a0,0x195a6,//1970-1979
		0x095b0,0x049b0,0x0a974,0x0a4b0,0x0b27a,0x06a50,0x06d40,0x0af46,0x0ab60,0x09570,//1980-1989
		0x04af5,0x04970,0x064b0,0x074a3,0x0ea50,0x06b58,0x05ac0,0x0ab60,0x096d5,0x092e0,//1990-1999
		0x0c960,0x0d954,0x0d4a0,0x0da50,0x07552,0x056a0,0x0abb7,0x025d0,0x092d0,0x0cab5,//2000-2009
		0x0a950,0x0b4a0,0x0baa4,0x0ad50,0x055d9,0x04ba0,0x0a5b0,0x15176,0x052b0,0x0a930,//2010-2019
		0x07954,0x06aa0,0x0ad50,0x05b52,0x04b60,0x0a6e6,0x0a4e0,0x0d260,0x0ea65,0x0d530,//2020-2029
		0x05aa0,0x076a3,0x096d0,0x04afb,0x04ad0,0x0a4d0,0x1d0b6,0x0d250,0x0d520,0x0dd45,//2030-2039
		0x0b5a0,0x056d0,0x055b2,0x049b0,0x0a577,0x0a4b0,0x0aa50,0x1b255,0x06d20,0x0ada0,//2040-2049
		0x14b63,0x09370,0x049f8,0x04970,0x064b0,0x168a6,0x0ea50,0x06b20,0x1a6c4,0x0aae0,//2050-2059
		0x092e0,0x0d2e3,0x0c960,0x0d557,0x0d4a0,0x0da50,0x05d55,0x056a0,0x0a6d0,0x055d4,//2060-2069
		0x052d0,0x0a9b8,0x0a950,0x0b4a0,0x0b6a6,0x0ad50,0x055a0,0x0aba4,0x0a5b0,0x052b0,//2070-2079
		0x0b273,0x06930,0x07337,0x06aa0,0x0ad50,0x14b55,0x04b60,0x0a570,0x054e4,0x0d160,//2080-2089
		0x0e968,0x0d520,0x0daa0,0x16aa6,0x056d0,0x04ae0,0x0a9d4,0x0a2d0,0x0d150,0x0f252,//2090-2099
		0x0d520, //2100
	];
    const CX_TERM_INFO = [ // 1900-2100各年的24节气日期速查表
		'9778397bd097c36b0b6fc9274c91aa','97b6b97bd19801ec9210c965cc920e','97bcf97c3598082c95f8c965cc920f',
		'97bd0b06bdb0722c965ce1cfcc920f','b027097bd097c36b0b6fc9274c91aa','97b6b97bd19801ec9210c965cc920e',
		'97bcf97c359801ec95f8c965cc920f','97bd0b06bdb0722c965ce1cfcc920f','b027097bd097c36b0b6fc9274c91aa',
		'97b6b97bd19801ec9210c965cc920e','97bcf97c359801ec95f8c965cc920f','97bd0b06bdb0722c965ce1cfcc920f',
		'b027097bd097c36b0b6fc9274c91aa','9778397bd19801ec9210c965cc920e','97b6b97bd19801ec95f8c965cc920f',
		'97bd09801d98082c95f8e1cfcc920f','97bd097bd097c36b0b6fc9210c8dc2','9778397bd197c36c9210c9274c91aa',
		'97b6b97bd19801ec95f8c965cc920e','97bd09801d98082c95f8e1cfcc920f','97bd097bd097c36b0b6fc9210c8dc2',
		'9778397bd097c36c9210c9274c91aa','97b6b97bd19801ec95f8c965cc920e','97bcf97c3598082c95f8e1cfcc920f',
		'97bd097bd097c36b0b6fc9210c8dc2','9778397bd097c36c9210c9274c91aa','97b6b97bd19801ec9210c965cc920e',
		'97bcf97c3598082c95f8c965cc920f','97bd097bd097c35b0b6fc920fb0722','9778397bd097c36b0b6fc9274c91aa',
		'97b6b97bd19801ec9210c965cc920e','97bcf97c3598082c95f8c965cc920f','97bd097bd097c35b0b6fc920fb0722',
		'9778397bd097c36b0b6fc9274c91aa','97b6b97bd19801ec9210c965cc920e','97bcf97c359801ec95f8c965cc920f',
		'97bd097bd097c35b0b6fc920fb0722','9778397bd097c36b0b6fc9274c91aa','97b6b97bd19801ec9210c965cc920e',
		'97bcf97c359801ec95f8c965cc920f','97bd097bd097c35b0b6fc920fb0722','9778397bd097c36b0b6fc9274c91aa',
		'97b6b97bd19801ec9210c965cc920e','97bcf97c359801ec95f8c965cc920f','97bd097bd07f595b0b6fc920fb0722',
		'9778397bd097c36b0b6fc9210c8dc2','9778397bd19801ec9210c9274c920e','97b6b97bd19801ec95f8c965cc920f',
		'97bd07f5307f595b0b0bc920fb0722','7f0e397bd097c36b0b6fc9210c8dc2','9778397bd097c36c9210c9274c920e',
		'97b6b97bd19801ec95f8c965cc920f','97bd07f5307f595b0b0bc920fb0722','7f0e397bd097c36b0b6fc9210c8dc2',
		'9778397bd097c36c9210c9274c91aa','97b6b97bd19801ec9210c965cc920e','97bd07f1487f595b0b0bc920fb0722',
		'7f0e397bd097c36b0b6fc9210c8dc2','9778397bd097c36b0b6fc9274c91aa','97b6b97bd19801ec9210c965cc920e',
		'97bcf7f1487f595b0b0bb0b6fb0722','7f0e397bd097c35b0b6fc920fb0722','9778397bd097c36b0b6fc9274c91aa',
		'97b6b97bd19801ec9210c965cc920e','97bcf7f1487f595b0b0bb0b6fb0722','7f0e397bd097c35b0b6fc920fb0722',
		'9778397bd097c36b0b6fc9274c91aa','97b6b97bd19801ec9210c965cc920e','97bcf7f1487f531b0b0bb0b6fb0722',
		'7f0e397bd097c35b0b6fc920fb0722','9778397bd097c36b0b6fc9274c91aa','97b6b97bd19801ec9210c965cc920e',
		'97bcf7f1487f531b0b0bb0b6fb0722','7f0e397bd07f595b0b6fc920fb0722','9778397bd097c36b0b6fc9274c91aa',
		'97b6b97bd19801ec9210c9274c920e','97bcf7f0e47f531b0b0bb0b6fb0722','7f0e397bd07f595b0b0bc920fb0722',
		'9778397bd097c36b0b6fc9210c91aa','97b6b97bd197c36c9210c9274c920e','97bcf7f0e47f531b0b0bb0b6fb0722',
		'7f0e397bd07f595b0b0bc920fb0722','9778397bd097c36b0b6fc9210c8dc2','9778397bd097c36c9210c9274c920e',
		'97b6b7f0e47f531b0723b0b6fb0722','7f0e37f5307f595b0b0bc920fb0722','7f0e397bd097c36b0b6fc9210c8dc2',
		'9778397bd097c36b0b70c9274c91aa','97b6b7f0e47f531b0723b0b6fb0721','7f0e37f1487f595b0b0bb0b6fb0722',
		'7f0e397bd097c35b0b6fc9210c8dc2','9778397bd097c36b0b6fc9274c91aa','97b6b7f0e47f531b0723b0b6fb0721',
		'7f0e27f1487f595b0b0bb0b6fb0722','7f0e397bd097c35b0b6fc920fb0722','9778397bd097c36b0b6fc9274c91aa',
		'97b6b7f0e47f531b0723b0b6fb0721','7f0e27f1487f531b0b0bb0b6fb0722','7f0e397bd097c35b0b6fc920fb0722',
		'9778397bd097c36b0b6fc9274c91aa','97b6b7f0e47f531b0723b0b6fb0721','7f0e27f1487f531b0b0bb0b6fb0722',
		'7f0e397bd097c35b0b6fc920fb0722','9778397bd097c36b0b6fc9274c91aa','97b6b7f0e47f531b0723b0b6fb0721',
		'7f0e27f1487f531b0b0bb0b6fb0722','7f0e397bd07f595b0b0bc920fb0722','9778397bd097c36b0b6fc9274c91aa',
		'97b6b7f0e47f531b0723b0787b0721','7f0e27f0e47f531b0b0bb0b6fb0722','7f0e397bd07f595b0b0bc920fb0722',
		'9778397bd097c36b0b6fc9210c91aa','97b6b7f0e47f149b0723b0787b0721','7f0e27f0e47f531b0723b0b6fb0722',
		'7f0e397bd07f595b0b0bc920fb0722','9778397bd097c36b0b6fc9210c8dc2','977837f0e37f149b0723b0787b0721',
		'7f07e7f0e47f531b0723b0b6fb0722','7f0e37f5307f595b0b0bc920fb0722','7f0e397bd097c35b0b6fc9210c8dc2',
		'977837f0e37f14998082b0787b0721','7f07e7f0e47f531b0723b0b6fb0721','7f0e37f1487f595b0b0bb0b6fb0722',
		'7f0e397bd097c35b0b6fc9210c8dc2','977837f0e37f14998082b0787b06bd','7f07e7f0e47f531b0723b0b6fb0721',
		'7f0e27f1487f531b0b0bb0b6fb0722','7f0e397bd097c35b0b6fc920fb0722','977837f0e37f14998082b0787b06bd',
		'7f07e7f0e47f531b0723b0b6fb0721','7f0e27f1487f531b0b0bb0b6fb0722','7f0e397bd097c35b0b6fc920fb0722',
		'977837f0e37f14998082b0787b06bd','7f07e7f0e47f531b0723b0b6fb0721','7f0e27f1487f531b0b0bb0b6fb0722',
		'7f0e397bd07f595b0b0bc920fb0722','977837f0e37f14998082b0787b06bd','7f07e7f0e47f531b0723b0b6fb0721',
		'7f0e27f1487f531b0b0bb0b6fb0722','7f0e397bd07f595b0b0bc920fb0722','977837f0e37f14998082b0787b06bd',
		'7f07e7f0e47f149b0723b0787b0721','7f0e27f0e47f531b0b0bb0b6fb0722','7f0e397bd07f595b0b0bc920fb0722',
		'977837f0e37f14998082b0723b06bd','7f07e7f0e37f149b0723b0787b0721','7f0e27f0e47f531b0723b0b6fb0722',
		'7f0e397bd07f595b0b0bc920fb0722','977837f0e37f14898082b0723b02d5','7ec967f0e37f14998082b0787b0721',
		'7f07e7f0e47f531b0723b0b6fb0722','7f0e37f1487f595b0b0bb0b6fb0722','7f0e37f0e37f14898082b0723b02d5',
		'7ec967f0e37f14998082b0787b0721','7f07e7f0e47f531b0723b0b6fb0722','7f0e37f1487f531b0b0bb0b6fb0722',
		'7f0e37f0e37f14898082b0723b02d5','7ec967f0e37f14998082b0787b06bd','7f07e7f0e47f531b0723b0b6fb0721',
		'7f0e37f1487f531b0b0bb0b6fb0722','7f0e37f0e37f14898082b072297c35','7ec967f0e37f14998082b0787b06bd',
		'7f07e7f0e47f531b0723b0b6fb0721','7f0e27f1487f531b0b0bb0b6fb0722','7f0e37f0e37f14898082b072297c35',
		'7ec967f0e37f14998082b0787b06bd','7f07e7f0e47f531b0723b0b6fb0721','7f0e27f1487f531b0b0bb0b6fb0722',
		'7f0e37f0e366aa89801eb072297c35','7ec967f0e37f14998082b0787b06bd','7f07e7f0e47f149b0723b0787b0721',
		'7f0e27f1487f531b0b0bb0b6fb0722','7f0e37f0e366aa89801eb072297c35','7ec967f0e37f14998082b0723b06bd',
		'7f07e7f0e47f149b0723b0787b0721','7f0e27f0e47f531b0723b0b6fb0722','7f0e37f0e366aa89801eb072297c35',
		'7ec967f0e37f14998082b0723b06bd','7f07e7f0e37f14998083b0787b0721','7f0e27f0e47f531b0723b0b6fb0722',
		'7f0e37f0e366aa89801eb072297c35','7ec967f0e37f14898082b0723b02d5','7f07e7f0e37f14998082b0787b0721',
		'7f07e7f0e47f531b0723b0b6fb0722','7f0e36665b66aa89801e9808297c35','665f67f0e37f14898082b0723b02d5',
		'7ec967f0e37f14998082b0787b0721','7f07e7f0e47f531b0723b0b6fb0722','7f0e36665b66a449801e9808297c35',
		'665f67f0e37f14898082b0723b02d5','7ec967f0e37f14998082b0787b06bd','7f07e7f0e47f531b0723b0b6fb0721',
		'7f0e36665b66a449801e9808297c35','665f67f0e37f14898082b072297c35','7ec967f0e37f14998082b0787b06bd',
		'7f07e7f0e47f531b0723b0b6fb0721','7f0e26665b66a449801e9808297c35','665f67f0e37f1489801eb072297c35',
	'7ec967f0e37f14998082b0787b06bd','7f07e7f0e47f531b0723b0b6fb0721','7f0e27f1487f531b0b0bb0b6fb0722'];
    const CX_TERM_NAME = ['小寒','大寒','立春','雨水','惊蛰','春分','清明','谷雨','立夏','小满','芒种','夏至','小暑','大暑','立秋','处暑','白露','秋分','寒露','霜降','立冬','小雪','大雪','冬至'];
    const CX_GAN = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
    const CX_ZHI = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
    const CX_ANIMALS = ['鼠','牛','虎','兔','龙','蛇','马','羊','猴','鸡','狗','猪'];
    const CX_NSTR1 = ['正','二','三','四','五','六','七','八','九','十','冬','腊'];
    const CX_NSTR2 = ['初','十','廿','卅'];
    const CX_NSTR3 = ['日','一','二','三','四','五','六','七','八','九','十'];
    const CX_LUNAR_FEST = { '1-1': '春节', '1-15': '元宵', '5-5': '端午', '8-15': '中秋', '9-9': '重阳', '12-30': '除夕' };
    const CX_LUNAR = {
      lYearDays(y) { let sum = 348; for (let i = 0x8000; i > 0x8; i >>= 1) sum += (CX_LUNAR_INFO[y - 1900] & i) ? 1 : 0; return sum + this.leapDays(y); },
      leapMonth(y) { return CX_LUNAR_INFO[y - 1900] & 0xf; },
      leapDays(y) { return this.leapMonth(y) ? ((CX_LUNAR_INFO[y - 1900] & 0x10000) ? 30 : 29) : 0; },
      monthDays(y, m) { return (CX_LUNAR_INFO[y - 1900] & (0x10000 >> m)) ? 30 : 29; },
      term(y, n) {
        const t = CX_TERM_INFO[y - 1900];
        const parts = [0, 5, 10, 15, 20, 25].map((p) => parseInt('0x' + t.substr(p, 5), 16).toString());
        const days = [];
        for (const s of parts) days.push(parseInt(s.substr(0, 1)), parseInt(s.substr(1, 2)), parseInt(s.substr(3, 1)), parseInt(s.substr(4, 2)));
        return parseInt(days[n - 1]);
      },
      cnMonth(m) { return CX_NSTR1[m - 1] + '月'; },
      cnDay(d) { if (d === 10) return '初十'; if (d === 20) return '二十'; if (d === 30) return '三十'; return CX_NSTR2[Math.floor(d / 10)] + CX_NSTR3[d % 10]; },
      gzYear(y) { const g = ((y - 3) % 10) || 10; const z = ((y - 3) % 12) || 12; return CX_GAN[g - 1] + CX_ZHI[z - 1]; },
      animal(y) { return CX_ANIMALS[(y - 4) % 12]; },
      astro(m, d) { const arr = [20, 19, 21, 21, 21, 22, 23, 23, 23, 23, 22, 22]; const s = '摩羯水瓶双鱼白羊金牛双子巨蟹狮子处女天秤天蝎射手摩羯'; return s.substr(m * 2 - (d < arr[m - 1] ? 2 : 0), 2) + '座'; },
      convert(y, m, d) {
        let day = (Date.UTC(y, m - 1, d) - Date.UTC(1900, 0, 31)) / 86400000;
        let year = 1900, days = 0;
        for (; year < 2101 && day > 0; year++) { days = this.lYearDays(year); day -= days; }
        if (day < 0) { day += days; year--; }
        const leap = this.leapMonth(year);
        let isLeap = false, month = 1;
        for (; month < 13 && day > 0; month++) {
          if (leap > 0 && month === leap + 1 && !isLeap) { month--; isLeap = true; days = this.leapDays(year); }
          else days = this.monthDays(year, month);
          if (isLeap && month === leap + 1) isLeap = false;
          day -= days;
        }
        if (day === 0 && leap > 0 && month === leap + 1) { if (isLeap) isLeap = false; else { isLeap = true; month--; } }
        if (day < 0) { day += days; month--; }
        day++;
        const t1 = this.term(y, m * 2 - 1), t2 = this.term(y, m * 2);
        const term = d === t1 ? CX_TERM_NAME[m * 2 - 2] : d === t2 ? CX_TERM_NAME[m * 2 - 1] : '';
        const fest = CX_LUNAR_FEST[month + '-' + day] || '';
        return { lYear: year, lMonth: month, lDay: day, isLeap, cnMonth: (isLeap ? '闰' : '') + this.cnMonth(month), cnDay: this.cnDay(day), term, fest, gzYear: this.gzYear(year), animal: this.animal(year), astro: this.astro(m, d) };
      },
      label(d) {
        const r = this.convert(d.getFullYear(), d.getMonth() + 1, d.getDate());
        return r.fest || r.term || (r.lDay === 1 ? r.cnMonth : r.cnDay);
      },
      line(d) {
        const r = this.convert(d.getFullYear(), d.getMonth() + 1, d.getDate());
        return `${r.gzYear} ${r.animal}年 ${r.cnMonth}${r.cnDay} ${r.astro}`;
      },
    };

    const PmCalendar = React.memo(function PmCalendar({ tasks, start, end, onChange, locale }) {
      const bootCalView = cxRead('cal', {});
      const [view, setView] = useState(bootCalView.v === 2 && bootCalView.view ? bootCalView.view : 'week');
      const [cursor, setCursor] = useState(() => { try { return bootCalView.cursor ? new Date(bootCalView.cursor) : new Date(); } catch { return new Date(); } });
      useEffect(() => cxWrite('cal', { ...cxRead('cal', {}), v: 2, view, cursor: cursor.toISOString() }), [view, cursor]);
      const counts = {};
      for (const t of tasks || []) {
        const d = String(t.created_at || '').slice(0, 10);
        if (d) counts[d] = (counts[d] || 0) + 1;
      }
      const key = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const firstKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
      const todayKey = key(new Date());
      const lastKey = (d) => key(new Date(d.getFullYear(), d.getMonth() + 1, 0));
      const inRange = (a, b) => start && a <= (end || start) && b >= start;
      const lunar = (d) => {
        if (locale !== 'zh') return '';
        try { return CX_LUNAR.label(d); } catch { return ''; }
      };
      const lunarSpecial = (d) => { try { const r = CX_LUNAR.convert(d.getFullYear(), d.getMonth() + 1, d.getDate()); return !!(r.term || r.fest); } catch { return false; } };
      const pick = (a, b) => {
        if (!start) { onChange(a, b); return; }
        if (start === end) {
          const lo = a < start ? a : start;
          const hi = b > end ? b : end;
          onChange(lo, hi);
          return;
        }
        onChange(a, b);
      };
      const nav = (dir) => {
        if (view === 'long') setCursor(new Date(cursor.getFullYear() + dir * 10, 0, 1));
        else if (view === 'year') setCursor(new Date(cursor.getFullYear() + dir, 0, 1));
        else if (view === 'month') setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + dir, 1));
        else setCursor(new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + dir * 7));
      };
      const label = view === 'long' ? `${cursor.getFullYear() - 5} — ${cursor.getFullYear() + 6}`
        : view === 'year' ? `${cursor.getFullYear()}`
        : view === 'month' ? `${cursor.getFullYear()}.${String(cursor.getMonth() + 1).padStart(2, '0')}`
        : `${key(new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() - cursor.getDay()))} — ${key(new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() - cursor.getDay() + 6))}`;
      let body = null;
      if (view === 'long') {
        const base = cursor.getFullYear() - 5;
        body = h('div', { className: 'cx-cal-years' }, Array.from({ length: 12 }, (_, i) => {
          const y = base + i, a = `${y}-01-01`, b = `${y}-12-31`, on = inRange(a, b);
          return h('button', { key: y, className: `cx-cal-year${on ? ' on' : ''}`, onClick: () => pick(a, b) }, y);
        }));
      } else if (view === 'year') {
        body = h('div', { className: 'cx-cal-months' }, Array.from({ length: 12 }, (_, i) => {
          const d = new Date(cursor.getFullYear(), i, 1), a = firstKey(d), b = lastKey(d), on = inRange(a, b);
          return h('button', { key: i, className: `cx-cal-month${on ? ' on' : ''}`, onClick: () => pick(a, b) }, CURRENT_LANG === 'zh' ? `${i + 1}月` : ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][i], h('span', null, lunar(d)));
        }));
      } else {
        const days = view === 'week' ? 7 : new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
        const base = view === 'week' ? new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() - cursor.getDay()) : new Date(cursor.getFullYear(), cursor.getMonth(), 1);
        const lead = view === 'week' ? 0 : base.getDay();
        body = h(React.Fragment, null,
          h('div', { className: 'cx-cal-w' }, ['日', '一', '二', '三', '四', '五', '六'].map((w) => h('span', { key: w }, w))),
          h('div', { className: 'cx-cal-grid' },
            Array.from({ length: lead }, (_, i) => h('span', { key: `b${i}` })),
            Array.from({ length: days }, (_, i) => {
              const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() + i), k = key(d), on = inRange(k, k);
              return h('button', { key: k, className: `cx-cal-day${on ? ' on' : ''}${k === start ? ' start' : ''}${k === (end || start) ? ' end' : ''}`, onClick: () => pick(k, k) },
                counts[k] ? h('span', { className: 'n' }, counts[k]) : h('span', { className: 'n empty' }, ''),
                h('span', { className: `d${k === todayKey ? ' today' : ''}` }, d.getDate()),
                h('span', { className: `l${lunarSpecial(d) ? ' accent' : ''}` }, lunar(d)));
            })));
      }
      return h('div', { className: 'cx-cal' },
        h('div', { className: 'cx-cal-h' },
          h(IconButton, { name: 'arrowLeft', onClick: () => nav(-1) }),
          h('span', null, label),
          h(IconButton, { name: 'arrowRight', onClick: () => nav(1) })),
        h('div', { className: 'cx-cal-views' }, [['long', '长期'], ['year', '年'], ['month', '月'], ['week', '周']].map(([v, n]) => h('button', { key: v, className: `cx-cal-view${view === v ? ' on' : ''}`, onClick: () => setView(v) }, T(n)))),
        body,
        h('div', { className: 'cx-cal-lunar' }, (() => {
          try {
            let d = cursor;
            if (start) { const [yy, mm, dd] = String(start).split('-').map(Number); d = new Date(yy, mm - 1, dd); }
            return CX_LUNAR.line(d);
          } catch { return ''; }
        })()),
        h('div', { className: 'cx-cal-f' },
          h('span', null, start ? `${start} → ${end || start}` : T('全部日期')),
          h('div', { className: 'cx-cal-f-r' },
            h('button', { onClick: () => { const now = new Date(); setCursor(now); onChange(todayKey, todayKey); } }, T('今天')),
            h('button', { onClick: () => onChange('', '') }, T('清除')))));
    });

    function MultiFilter({ label, options, value, onChange, align = 'left', menu = false }) {
      const [open, setOpen] = useState(false);
      const picked = value || [];
      const toggle = (v) => onChange(picked.includes(v) ? picked.filter((x) => x !== v) : [...picked, v]);
      if (!options || options.length <= 1) return null;
      if (!menu && options.length <= 2) {   /* 两个以内的状态用平铺 chip；空间名等长选项强制走下拉，避免挤出列宽 */
        return h('div', { className: 'cx-filter inline' },
          h('span', { className: 'cx-filter-label' }, label),
          options.map((o) => h('button', { key: o.value, type: 'button', className: `cx-filter-chip${picked.includes(o.value) ? ' on' : ''}`, onClick: (e) => { e.stopPropagation(); toggle(o.value); } }, o.label || o.value, o.count != null ? h('span', { className: 'cx-filter-n cx-tag' }, o.count) : null)));
      }
      return h('div', { className: 'cx-filter' },
        h('button', { className: `cx-filter-btn${picked.length ? ' on' : ''}`, onClick: (e) => { e.stopPropagation(); setOpen((x) => !x); } }, `${label}${picked.length ? ` ${picked.length}` : ''}`, h(UiIcon, { name: 'chevronDown', size: 12 })),
        open ? h('div', { className: `cx-filter-menu ${align}` },
          options.length ? options.map((o) => h('button', { key: o.value, className: `cx-filter-item${picked.includes(o.value) ? ' on' : ''}`, onClick: (e) => { e.stopPropagation(); toggle(o.value); } }, h('span', { className: 'cx-filter-text' }, o.label), o.count != null ? h('span', { className: 'cx-filter-n cx-tag' }, o.count) : null, h('span', { className: 'cx-filter-check' }, picked.includes(o.value) ? h(UiIcon, { name: 'check', size: 12 }) : ''))) : h(EmptyState, { text: '暂无选项', style: { padding: 7 } }),
          h('button', { className: 'cx-filter-clear', onClick: (e) => { e.stopPropagation(); onChange([]); setOpen(false); } }, T('清除'))) : null);
    }

    function ensureLeaflet() {
      if (window.L) return Promise.resolve(window.L);
      if (!document.querySelector('link[data-cx-leaflet]')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet'; link.href = '/dsh-contextos-devops/leaflet/leaflet.css'; link.dataset.cxLeaflet = '1';
        document.head.appendChild(link);
      }
      if (window.__cxLeafletPromise) return window.__cxLeafletPromise;
      window.__cxLeafletPromise = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = '/dsh-contextos-devops/leaflet/leaflet.js';
        script.async = true;
        script.onload = () => window.L ? resolve(window.L) : reject(new Error('leaflet not loaded'));
        script.onerror = () => reject(new Error('leaflet load failed'));
        document.head.appendChild(script);
      });
      return window.__cxLeafletPromise;
    }
