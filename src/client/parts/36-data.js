    function AvatarModal({ node, data, active, onSelect, onCreated, onUpdated, onClose }) {
      const QUESTIONS = [
        { key: 'name', q: '先给分身起个名字？', d: '我的分身' },
        { key: 'city', q: '所在城市？', d: '深圳市' },
        { key: 'company', q: '公司名称？', d: '云轩领航' },
        { key: 'persona', q: '人格设定？例如：专业、稳重、直接', d: '专业、稳重、直接' },
        { key: 'preferences', q: '喜好/关注什么？例如：技术、产品、效率', d: '技术、产品、效率' },
        { key: 'style', q: '表达风格？例如：简洁、结构化、少客套', d: '简洁、结构化' },
      ];
      const [step, setStep] = useState(-1);
      const [answers, setAnswers] = useState({});
      const [msgs, setMsgs] = useState([]);
      const [input, setInput] = useState('');
      const [busy, setBusy] = useState(false);
      const [err, setErr] = useState('');
      const [skill, setSkill] = useState('');
      const imageRef = useRef(null);
      const update = async (patch) => {
        if (!active?.uid) return;
        setBusy(true); setErr('');
        try { const a = await api('updateAvatar', { node, uid: active.uid, patch }); onUpdated?.(a); }
        catch (e) { setErr(String(e?.message || e)); } finally { setBusy(false); }
      };
      const upload = (file) => {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
          const img = new Image();
          img.onload = () => {
            const max = 512, scale = Math.min(1, max / Math.max(img.width, img.height));
            const canvas = document.createElement('canvas');
            canvas.width = Math.round(img.width * scale); canvas.height = Math.round(img.height * scale);
            canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
            update({ image: canvas.toDataURL('image/jpeg', 0.86) });
          };
          img.src = String(reader.result);
        };
        reader.readAsDataURL(file);
      };
      const begin = () => {
        setStep(0); setAnswers({}); setMsgs([{ role: 'ai', text: QUESTIONS[0].q }]); setInput('');
      };
      const send = () => {
        if (step < 0 || step >= QUESTIONS.length) return;
        const q = QUESTIONS[step];
        const value = (input.trim() || q.d);
        const nextAnswers = { ...answers, [q.key]: value };
        setAnswers(nextAnswers);
        setMsgs((xs) => [...xs, { role: 'user', text: value }]);
        setInput('');
        if (step + 1 < QUESTIONS.length) {
          setMsgs((xs) => [...xs, { role: 'ai', text: QUESTIONS[step + 1].q }]);
          setStep(step + 1);
        } else {
          setStep(QUESTIONS.length);
          setMsgs((xs) => [...xs, { role: 'ai', text: '信息齐了。确认后创建分身，使用独立 user.uid。' }]);
        }
      };
      const create = async () => {
        setBusy(true); setErr('');
        try {
          const a = await api('createAvatar', { node, ...answers });
          onCreated(a);
        } catch (e) { setErr(String(e?.message || e)); } finally { setBusy(false); }
      };
      const choose = async (a) => {
        setBusy(true); setErr('');
        try { await api('setAvatar', { node, uid: a.uid }); onSelect(a); }
        catch (e) { setErr(String(e?.message || e)); } finally { setBusy(false); }
      };
      return h(Modal, { title: '数字分身 / DIGITAL AVATARS', desc: '每个分身有独立 user.uid、公司、城市、人格、喜好、风格。', onClose },
        h('div', { className: 'cx-avatar-list' }, (data?.items || []).map((a) => h('div', { key: a.uid, className: `cx-avatar${active?.uid === a.uid ? ' on' : ''}`, onClick: () => choose(a) },
          h('span', { className: 'cx-led on' }),
          h('div', { style: { flex: 1, minWidth: 0 } },
            h('div', { className: 'an' }, a.name || a.username),
            h('div', { className: 'ad' }, `${a.city || '—'} · ${a.company || '—'} · ${a.persona || '—'} · ${a.style || '—'}`),
            h('div', { className: 'ad' }, a.project?.place_uid ? `项目：${a.project.name || a.project.space}` : (a.project?.error ? `项目：${a.project.error}` : '项目：未创建'))),
          h('span', { className: 'cx-tag cy' }, active?.uid === a.uid ? 'ACTIVE' : 'SELECT')))),
        active ? h('div', { className: 'cx-avatar-extra' },
          h('div', { className: 'cx-avatar-preview' }, active.image ? h('img', { src: active.image, alt: '' }) : h('span', null, '3D')),
          h('div', { style: { flex: 1, minWidth: 0 } },
            h('div', { className: 'cx-avatar-extra-title' }, '形象与技能'),
            h('div', { className: 'cx-avatar-extra-sub' }, '上传照片生成你的数字人形象；技能会进入 AI 上下文。'),
            h('div', { className: 'cx-avatar-skills' }, (active.skills || []).map((x, i) => h('span', { key: i, className: 'cx-tag cy' }, x, h(IconButton, { name: 'close', className: 'cx-tag-x', onClick: () => update({ skills: (active.skills || []).filter((_, j) => j !== i) }) }))), h('span', { className: 'cx-avatar-skill-empty' }, (active.skills || []).length ? '' : '暂无技能')),
            h('div', { className: 'cx-avatar-skill-add' },
              h('input', { className: 'cx-input', value: skill, placeholder: '添加技能，例如 数据分析', onChange: (e) => setSkill(e.target.value), onKeyDown: (e) => { if (e.key === 'Enter' && skill.trim()) { update({ skills: [...(active.skills || []), skill.trim()] }); setSkill(''); } } }),
              h('button', { className: 'cx-btn xs', disabled: !skill.trim() || busy, onClick: () => { update({ skills: [...(active.skills || []), skill.trim()] }); setSkill(''); } }, T('+ 技能')),
              h('button', { className: 'cx-btn xs pri', onClick: () => imageRef.current?.click() }, T('上传形象')))),
          h('input', { type: 'file', ref: imageRef, accept: 'image/*', style: { display: 'none' }, onChange: (e) => { upload(e.target.files?.[0]); e.target.value = ''; } })) : null,
        step < 0
          ? h('div', { className: 'cx-foot' }, h('button', { className: 'cx-btn', onClick: onClose }, T('关闭')), h('button', { className: 'cx-btn pri', onClick: begin }, '+ ' + T('创建分身')))
          : h('div', null,
              h('div', { className: 'cx-chat-b', style: { maxHeight: 220 } }, msgs.map((m, i) => h('div', { key: i, className: `cx-msg ${m.role}` }, m.text))),
              step < QUESTIONS.length
                ? h('div', { className: 'cx-chat-i' },
                    h('input', { className: 'cx-input', value: input, placeholder: QUESTIONS[step].d, onChange: (e) => setInput(e.target.value), onKeyDown: (e) => { if (e.key === 'Enter') send(); } }),
                    h('button', { className: 'cx-btn pri', onClick: send }, T('发送')))
                : h('div', null,
                    h('div', { className: 'desc' }, `${answers.name} · ${answers.city} · ${answers.company}\n人格：${answers.persona}\n喜好：${answers.preferences}\n风格：${answers.style}`),
                    h('div', { className: 'cx-foot' }, h('button', { className: 'cx-btn', onClick: () => setStep(-1) }, T('上一步')), h('button', { className: 'cx-btn pri', disabled: busy, onClick: create }, busy ? T('创建中…') : T('创建分身'))))),
        err ? h(ErrorBox, { text: err }) : null);
    }

    function DeviceModal({ node, onClose }) {
      const [data, setData] = useState(null);
      const [busy, setBusy] = useState(true);
      const [err, setErr] = useState('');
      useEffect(() => {
        let alive = true;
        loadSsh();
        api('devices', { node }).then((d) => { if (alive) { setData(d); setBusy(false); } }).catch((e) => { if (alive) { setErr(String(e?.message || e)); setBusy(false); } });
        return () => { alive = false; };
      }, [node]);
      const [scanKind, setScanKind] = useState('');
      const [ssh, setSsh] = useState(null);
      const [tab, setTab] = useState('hosts');
      const loadSsh = async () => { try { const r = await api('sshHosts'); setSsh(r && (r.services || r.knownHosts) ? r : { unavailable: true }); } catch { setSsh({ unavailable: true }); } };
      const scan = async (kind) => {
        setScanKind(kind); setBusy(true); setErr('');
        try { setData(await api('devices', { node })); await loadSsh(); }
        catch (e) { setErr(String(e?.message || e)); }
        finally { setBusy(false); }
      };
      const groups = {};
      for (const d of data?.devices || []) (groups[d.kind] || (groups[d.kind] = [])).push(d);
      const renderDevice = (d) => h('div', { className: 'cx-device', key: d.id },
        h('span', { className: `cx-led${['running', 'online', 'paired'].includes(d.status) ? ' on' : ''}` }),
        h('div', { style: { flex: 1, minWidth: 0 } },
          h('div', { className: 'dn' }, d.name),
          h('div', { className: 'dd' }, `${d.address || '—'} · ${d.status || ''}`)),
        h('span', { className: 'cx-tag cy' }, d.controllable ? 'CONTROL' : 'DISCOVER'),
        d.kind === 'contextos' ? h('button', { className: 'cx-btn xs', onClick: () => { try { window.open(`http://127.0.0.1:${String(d.address).split(':').pop()}`, '_blank'); } catch {} } }, '打开') : null);
      const renderGroup = ([kind, list]) => h('div', { key: kind },
        h('div', { className: 'oh', style: { marginTop: 6 } }, `${kind.toUpperCase()} · ${list.length}`),
        list.map(renderDevice));
      return h(Modal, { title: '扫描设备 / SCAN', desc: '远程主机（SSH 服务）/ WiFi 网络 / WiFi 设备（同网）/ 蓝牙设备 / ContextOS 节点；每条数据带复制、打开等操作。', onClose },
        busy ? h('div', { className: 'desc' }, '扫描中…') : null,
        err ? h(ErrorBox, { text: err }) : null,
        data ? h('div', { className: 'cx-devices' },
          h('div', { className: 'cx-adapter' }, (data.adapters || []).map((a) => h('span', { key: a.kind, className: `cx-tag ${a.supported ? 'gr' : ''}` }, `${a.kind}${a.supported ? '' : ' ✕'}`))),
          h('div', { className: 'cx-dev-actions' },
            h('button', { className: `cx-btn xs${scanKind === 'lan' ? ' on' : ''}`, onClick: () => scan('lan') }, '扫描同网设备'),
            h('button', { className: `cx-btn xs${scanKind === 'wifi' ? ' on' : ''}`, onClick: () => scan('wifi') }, '扫描无线网络'),
            h('button', { className: `cx-btn xs${scanKind === 'bt' ? ' on' : ''}`, onClick: () => scan('bt') }, '扫描蓝牙设备'),
            h('button', { className: 'cx-btn xs', style: { marginLeft: 'auto' }, onClick: () => scan('') }, '重新扫描')),
          h('div', { className: 'cx-scan-tabs' },
            [
              { id: 'hosts', label: '远程主机', n: (ssh?.services || []).length },
              { id: 'lan', label: 'WIFI 设备', n: (data.lanHosts || []).length },
              { id: 'wifi', label: 'WIFI 网络', n: (data.wifiNetworks || []).length },
              { id: 'bt', label: '蓝牙设备', n: (data.bluetoothNearby || []).length + (data.devices || []).filter((d) => d.kind === 'bluetooth').length },
              { id: 'ir', label: '红外设备', n: 0 },
            ].map((t) => h('button', { key: t.id, className: `cx-scan-tab${tab === t.id ? ' on' : ''}`, onClick: () => setTab(t.id) }, t.label, h('span', { className: 'n' }, t.n)))),
          h('div', { className: 'cx-scan-body' },
            tab === 'hosts' ? ((ssh?.services || []).length
              ? ssh.services.map((x, i) => h('div', { className: 'cx-device', key: 'svc' + i },
                  h('span', { className: 'cx-led on' }),
                  h('div', { style: { flex: 1, minWidth: 0 } }, h('div', { className: 'dn' }, x.name), h('div', { className: 'dd' }, `${x.username ? x.username + '@' : ''}${x.host}:${x.port}${x.init ? ' · ' + x.init : ''}`)),
                  h('button', { className: 'cx-btn xs', onClick: () => { try { navigator.clipboard.writeText(`ssh ${x.username ? x.username + '@' : ''}${x.host} -p ${x.port}`); } catch {} } }, '复制')))
              : h('div', { className: 'cx-empty-d' }, ssh && ssh.unavailable ? '服务端版本过旧：请重启 DSH 以启用 SSH 主机扫描' : '没有读取到 ~/.ssh/host 服务（目录：~/.ssh/host/*.json）'))
            : null,
            tab === 'wifi' ? ((data.wifiNetworks || []).length
              ? data.wifiNetworks.slice(0, 30).map((n, i) => h('div', { className: 'cx-device', key: 'wn' + i },
                  h('span', { className: 'cx-led on' }),
                  h('div', { style: { flex: 1, minWidth: 0 } }, h('div', { className: 'dn' }, n.ssid || '(隐藏)'), h('div', { className: 'dd' }, `${n.bssid || '—'} · ch ${n.channel || '—'}${n.rssi != null ? ` · ${n.rssi} dBm` : ''}`)),
                  h('button', { className: 'cx-btn xs', onClick: () => { try { navigator.clipboard.writeText(n.ssid || ''); } catch {} } }, '复制')))
              : h('div', { className: 'cx-empty-d' }, '没有扫描到无线网络'))
            : null,
            tab === 'lan' ? ((data.lanHosts || []).length
              ? data.lanHosts.slice(0, 40).map((x, i) => h('div', { className: 'cx-device', key: 'lan' + i },
                  h('span', { className: 'cx-led on' }),
                  h('div', { style: { flex: 1, minWidth: 0 } }, h('div', { className: 'dn' }, x.name || x.ip), h('div', { className: 'dd' }, `${x.ip} · ${x.mac}`)),
                  h('button', { className: 'cx-btn xs', onClick: () => { try { window.open(`http://${x.ip}`, '_blank'); } catch {} } }, '打开'),
                  h('button', { className: 'cx-btn xs', onClick: () => { try { navigator.clipboard.writeText(x.ip || ''); } catch {} } }, '复制')))
              : h('div', { className: 'cx-empty-d' }, '没有同网设备'))
            : null,
            tab === 'bt' ? (((data.bluetoothNearby || []).length || (data.devices || []).some((d) => d.kind === 'bluetooth'))
              ? [(data.bluetoothNearby || []).map((d, i) => h('div', { className: 'cx-device', key: 'bt' + i },
                  h('span', { className: 'cx-led on' }),
                  h('div', { style: { flex: 1, minWidth: 0 } }, h('div', { className: 'dn' }, d.name || d.address || 'BLE'), h('div', { className: 'dd' }, `${d.address || '—'}${d.rssi != null ? ` · ${d.rssi} dBm` : ''} · 附近`)),
                  h('button', { className: 'cx-btn xs', onClick: () => { try { navigator.clipboard.writeText(d.address || d.name || ''); } catch {} } }, '复制'))),
                (data.devices || []).filter((d) => d.kind === 'bluetooth').map((d) => h('div', { className: 'cx-device', key: d.id },
                  h('span', { className: 'cx-led on' }),
                  h('div', { style: { flex: 1, minWidth: 0 } }, h('div', { className: 'dn' }, d.name), h('div', { className: 'dd' }, `${d.address || '—'} · ${d.status || 'paired'}`)),
                  h('span', { className: 'cx-tag cy' }, 'PAIRED')))]
              : h('div', { className: 'cx-empty-d' }, '没有蓝牙设备（附近扫描需安装 blueutil）'))
            : null,
            tab === 'ir' ? (() => {
              const ad = (data.adapters || []).find((a) => a.kind === 'infrared');
              return ad && ad.supported
                ? h('div', { className: 'cx-empty-d' }, '红外适配器已就绪，等待发现设备')
                : h('div', { className: 'cx-empty-d' }, `当前宿主无红外适配器${ad && ad.reason ? '（' + ad.reason + '）' : ''}`);
            })() : null),
          h('div', { className: 'desc' }, data.note || '')) : null);
    }

    function DataModal({ node, space, app, onClose }) {
      const funcs = app?.functions?.length ? app.functions : ['profile'];
      const [fn, setFn] = useState(funcs[0]);
      const [rows, setRows] = useState([{ k: 'title', v: '张三' }, { k: 'content', v: '员工档案' }]);
      const [data, setData] = useState(null);
      const [busy, setBusy] = useState(false);
      const [err, setErr] = useState('');
      const [fresh, setFresh] = useState(false);
      const command = `web.team.${app.name}.${fn}`;
      const fields = Object.fromEntries(rows.filter((r) => r.k.trim()).map((r) => [r.k.trim(), r.v]));
      const run = async (write) => {
        setBusy(true); setErr('');
        try {
          if (write) await api('writeData', { node: Number(node), space, command, fields });
          setData(await api('readData', { node: Number(node), space, command }));
          if (write) { setFresh(true); setTimeout(() => setFresh(false), 1800); }
        } catch (e) { setErr(String(e?.message || e)); } finally { setBusy(false); }
      };
      let table = null;
      if (data) {
        const columns = (data.columns || []).slice(0, 6);
        table = h('div', { className: `cx-data-table${fresh ? ' fresh' : ''}`, style: { marginTop: 10, maxHeight: 180, overflow: 'auto' } },
          h('div', { className: 'cx-meta' }, `count=${data.count || '—'} · rows=${data.rows?.length || 0}`),
          h('table', { className: 'cx-table' },
            h('thead', null, h('tr', null, columns.map((c) => h('th', { key: c }, c)))),
            h('tbody', null, (data.rows || []).slice(0, 8).map((row, i) => h('tr', { key: i },
              columns.map((c) => h('td', { key: c }, String(row[c] ?? '').slice(0, 28))))))));
      }
      return h(Modal, { title: `DATA / ${app.title || app.name}`, desc: `目标命令：${command}；写后回读，200/0x0 不算成功。`, onClose },
        h('div', { className: 'cx-form' },
          h('label', { className: 'cx-field full' }, 'FUNCTION', h('select', { className: 'cx-select', value: fn, onChange: (e) => setFn(e.target.value) }, funcs.map((f) => h('option', { key: f, value: f }, f)))),
          rows.map((r, i) => h('div', { key: i, className: 'cx-row full' },
            h('input', { className: 'cx-input', value: r.k, placeholder: 'field', onChange: (e) => setRows((rs) => rs.map((x, j) => j === i ? { ...x, k: e.target.value } : x)) }),
            h('input', { className: 'cx-input', value: r.v, placeholder: 'value', onChange: (e) => setRows((rs) => rs.map((x, j) => j === i ? { ...x, v: e.target.value } : x)) }),
            h(IconButton, { name: 'close', className: 'cx-btn xs', onClick: () => setRows((rs) => rs.filter((_, j) => j !== i)) })))),
        h('button', { className: 'cx-btn xs', onClick: () => setRows((rs) => [...rs, { k: '', v: '' }]) }, '+ FIELD'),
        err ? h(ErrorBox, { text: err }) : null,
        table,
        h('div', { className: 'cx-foot' }, h('button', { className: 'cx-btn', onClick: onClose }, T('关闭')), h('button', { className: 'cx-btn', disabled: busy, onClick: () => run(false) }, 'READ'), h('button', { className: 'cx-btn pri', disabled: busy, onClick: () => run(true) }, busy ? 'WORKING…' : 'WRITE + READ')));
    }

    async function fallbackApps(node, space) {
      try {
        const d = await api('listDir', { node, space, path: 'src' });
        const out = [];
        for (const e of d.entries || []) {
          if (e.type !== 'dir') continue;
          try {
            const f = await api('readFile', { node, space, path: `src/${e.name}/portal.json` });
            const portal = JSON.parse(f.content);
            out.push({
              name: e.name,
              title: portal.portal || e.name,
              command: `web.team.${e.name}.portal`,
              path: `src/${e.name}/portal.json`,
              functions: Object.keys(portal).filter((k) => !['portal', 'input', 'value'].includes(k)),
              offlineFallback: true,
            });
          } catch {}
        }
        return out;
      } catch { return []; }
    }

    const INIT_DEFAULTS = { dir: '~/ContextOS-9188', port: 9188, repo: 'https://shylinux.com/x/ContextOS' };
    const repoName = (repo) => {
      const text = String(repo || '').trim().replace(/\/$/, '');
      if (!text) return '';
      const name = text.split('/').pop().replace(/\.git$/i, '');
      return /^[A-Za-z0-9._-]+$/.test(name) ? name : '';
    };
