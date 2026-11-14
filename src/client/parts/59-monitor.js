    /* ============ 监控视图：数字大屏 / 数字孪生 ============ */
    function MonitorDonut({ items, size = 132 }) {
      const total = items.reduce((a, b) => a + b.value, 0) || 1;
      const R = size / 2 - 10, C = 2 * Math.PI * R;
      let acc = 0;
      return h('svg', { width: size, height: size, viewBox: `0 0 ${size} ${size}`, className: 'cx-mon-donut' },
        h('circle', { cx: size / 2, cy: size / 2, r: R, fill: 'none', stroke: 'rgba(var(--cx-hue-rgb),.12)', strokeWidth: 14 }),
        items.map((it, i) => {
          const len = (it.value / total) * C;
          const el = h('circle', {
            key: i, cx: size / 2, cy: size / 2, r: R, fill: 'none', stroke: it.color, strokeWidth: 14,
            strokeDasharray: `${len} ${C - len}`, strokeDashoffset: -acc,
            transform: `rotate(-90 ${size / 2} ${size / 2})`, strokeLinecap: 'butt', opacity: .92,
          });
          acc += len;
          return el;
        }),
        h('text', { x: size / 2, y: size / 2 - 2, textAnchor: 'middle', className: 'cx-mon-donut-n' }, String(total)),
        h('text', { x: size / 2, y: size / 2 + 16, textAnchor: 'middle', className: 'cx-mon-donut-l' }, 'TOTAL'));
    }

    function MonitorSpark({ series, width = 320, height = 92 }) {
      const data = series.length ? series : [0];
      const max = Math.max(1, ...data);
      const step = width / Math.max(1, data.length - 1);
      const pts = data.map((v, i) => [i * step, height - (v / max) * (height - 8) - 4]);
      const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
      const area = `${line} L${width},${height} L0,${height} Z`;
      return h('svg', { viewBox: `0 0 ${width} ${height}`, className: 'cx-mon-spark', preserveAspectRatio: 'none' },
        h('defs', null, h('linearGradient', { id: 'cxMonGrad', x1: 0, y1: 0, x2: 0, y2: 1 },
          h('stop', { offset: '0%', stopColor: 'var(--cx-cyan)', stopOpacity: .35 }),
          h('stop', { offset: '100%', stopColor: 'var(--cx-cyan)', stopOpacity: 0 }))),
        h('path', { d: area, fill: 'url(#cxMonGrad)' }),
        h('path', { d: line, fill: 'none', stroke: 'var(--cx-cyan)', strokeWidth: 1.6, strokeLinejoin: 'round' }),
        pts.map((p, i) => (i % 6 === 0 ? h('circle', { key: i, cx: p[0], cy: p[1], r: 1.8, fill: 'var(--cx-cyan)' }) : null)));
    }

    function MonitorTwin({ nodes, spaces, apps }) {
      const ref = useRef(null);
      useEffect(() => {
        const cv = ref.current;
        if (!cv) return;
        const g = cv.getContext('2d');
        let w = 0, h = 0, raf = 0, t = 0, alive = true;
        const dots = [];
        const n = Math.max(6, Math.min(26, 6 + (nodes || []).length));
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2;
          dots.push({ a, r: 0.55 + ((i * 37) % 30) / 100, s: 0.15 + ((i * 13) % 9) / 60, kind: i % 7 === 0 ? 'hub' : 'node' });
        }
        const resize = () => { const b = cv.getBoundingClientRect(); w = cv.width = Math.max(1, Math.round(b.width)); h = cv.height = Math.max(1, Math.round(b.height)); };
        resize();
        const ro = new ResizeObserver(resize); ro.observe(cv);
        const draw = () => {
          raf = 0;
          if (!alive) return;
          raf = requestAnimationFrame(draw);
          if (document.hidden) return;
          t += 0.012;
          g.clearRect(0, 0, w, h);
          const cx = w / 2, cy = h / 2, R = Math.min(w, h) * 0.36;
          g.strokeStyle = 'rgba(62,231,255,.10)'; g.lineWidth = 1;
          for (let k = 1; k <= 3; k++) { g.beginPath(); g.arc(cx, cy, R * k / 3, 0, 6.283); g.stroke(); }
          const pts = dots.map((d) => [cx + Math.cos(d.a + t * d.s) * R * d.r, cy + Math.sin(d.a + t * d.s) * R * d.r * 0.72]);
          g.strokeStyle = 'rgba(62,231,255,.22)';
          for (let i = 0; i < pts.length; i++) {
            for (let j = i + 1; j < pts.length; j++) {
              if ((i * 7 + j * 3) % 11 !== 0) continue;
              g.beginPath(); g.moveTo(pts[i][0], pts[i][1]); g.lineTo(pts[j][0], pts[j][1]); g.stroke();
            }
          }
          for (let i = 0; i < pts.length; i++) {
            const p = pts[i], d = dots[i];
            const pulse = 0.6 + 0.4 * Math.sin(t * 2 + i);
            g.beginPath();
            g.fillStyle = d.kind === 'hub' ? `rgba(255,190,74,${pulse})` : `rgba(62,231,255,${pulse})`;
            g.arc(p[0], p[1], d.kind === 'hub' ? 4 : 2.4, 0, 6.283); g.fill();
            if (d.kind === 'hub') { g.strokeStyle = 'rgba(255,190,74,.35)'; g.beginPath(); g.arc(p[0], p[1], 10 + 4 * Math.sin(t * 2), 0, 6.283); g.stroke(); }
          }
          g.fillStyle = 'rgba(62,231,255,.85)'; g.beginPath(); g.arc(cx, cy, 5, 0, 6.283); g.fill();
          g.strokeStyle = 'rgba(62,231,255,.4)'; g.beginPath(); g.arc(cx, cy, 14 + 4 * Math.sin(t * 2), 0, 6.283); g.stroke();
        };
        raf = requestAnimationFrame(draw);
        return () => { alive = false; cancelAnimationFrame(raf); ro.disconnect(); };
      }, [nodes]);
      return h('canvas', { className: 'cx-mon-twin', ref });
    }


    /* ===== 面板看板：参考 Grafana，面板与数据源都可加 ===== */
    const MON_PANELS = 'contextos-devops-dsh:monitor-panels';
    const MON_DEFAULT = [
      { id: 'n1', type: 'stat', title: '服务节点', src: { kind: 'nodes' }, w: 3, refresh: 0 },
      { id: 'n2', type: 'stat', title: '项目空间', src: { kind: 'spaces' }, w: 3, refresh: 0 },
      { id: 'n3', type: 'table', title: '节点健康', src: { kind: 'op', op: 'sampleNodes' }, w: 6, refresh: 10 },
      { id: 'n4', type: 'query', title: 'runtime', src: { kind: 'cmd', node: 9191, command: 'runtime' }, w: 4, refresh: 10 },
      { id: 'n5', type: 'iframe', title: '管理后台', src: { kind: 'url', url: '/c/admin', node: 9191 }, w: 8, refresh: 0 },
    ];
    const monLoad = () => { const v = cxRead(MON_PANELS, null); return Array.isArray(v) && v.length ? v : MON_DEFAULT; };
    const monSave = (v) => cxWrite(MON_PANELS, v.slice(0, 24));

    function MonitorPanel({ p, data, onEdit, onDel, onReload, zh }) {
      const body = () => {
        if (p.type === 'iframe') {
          const url = /^https?:/.test(p.src.url) ? p.src.url : `http://127.0.0.1:${p.src.node || 9191}${p.src.url || '/'}`;
          return h('iframe', { className: 'cx-mon-frame', src: url, title: p.title, sandbox: 'allow-same-origin allow-scripts allow-forms' });
        }
        if (!data || data.loading) return h('div', { className: 'cx-mon-empty' }, zh ? '加载中…' : 'loading…');
        if (data.error) return h('div', { className: 'cx-mon-empty err' }, String(data.error).slice(0, 120));
        const r = data.value || {};
        if (p.type === 'stat') return h('div', { className: 'cx-mon-stat' }, h('b', null, String(r.value ?? '—')), h('span', null, r.sub || ''));
        if (p.type === 'table') {
          const cols = (r.columns || []).slice(0, 5);
          return h('div', { className: 'cx-mon-tbl' },
            h('div', { className: 'h' }, cols.map((c) => h('span', { key: c }, String(c)))),
            (r.rows || []).slice(0, 6).map((row, i) => h('div', { key: i, className: 'r' }, cols.map((c) => h('span', { key: c }, String(row[c] ?? '').slice(0, 18))))));
        }
        // query：单值 / 键值
        if (r.fields) return h('div', { className: 'cx-mon-kv' }, Object.entries(r.fields).slice(0, 6).map(([k, v]) => h('div', { key: k }, h('span', null, k), h('b', null, String(v).slice(0, 24)))));
        if (r.result) return h('div', { className: 'cx-mon-stat' }, h('b', { className: 'sm' }, String(r.result).slice(0, 40)));
        return h('div', { className: 'cx-mon-empty' }, `${r.status ?? ''} ${r.count || ''} · ${r.ms ?? ''}ms`);
      };
      return h('section', { className: 'cx-mon-panel cx-mon-bo', style: { gridColumn: `span ${Math.max(2, Math.min(12, p.w || 3))}` } },
        h('div', { className: 'cx-mon-pt' },
          h('span', null, p.title || p.id),
          h('span', { className: 'cx-mon-bo-act' },
            h('button', { className: 'cx-term-act', onClick: () => onReload(p) }, zh ? '刷新' : 'Refresh'),
            h('button', { className: 'cx-term-act', onClick: () => onEdit(p) }, zh ? '编辑' : 'Edit'),
            h('button', { className: 'cx-term-act danger', onClick: () => onDel(p) }, zh ? '删除' : 'Delete'))),
        h('div', { className: 'cx-mon-bo-body' }, body()));
    }

    function MonitorBoard({ nodes, spaces, locale, onNotify }) {
      const zh = locale === 'zh';
      const [panels, setPanels] = useState(monLoad);
      const [data, setData] = useState({});
      const [edit, setEdit] = useState(null);
      const [tick, setTick] = useState(0);
      useEffect(() => { monSave(panels); }, [panels]);
      useEffect(() => { const t = setInterval(() => setTick((x) => x + 1), 5000); return () => clearInterval(t); }, []);
      const load = async (p) => {
        if (p.type === 'iframe') return;
        setData((d) => ({ ...d, [p.id]: { loading: true } }));
        try {
          let value;
          if (p.src.kind === 'nodes') value = { value: (nodes || []).length, sub: `${(nodes || []).filter((n) => n.state === 'running').length} running` };
          else if (p.src.kind === 'spaces') value = { value: (spaces || []).length, sub: `${(spaces || []).filter((s) => s.status === 'running').length} online` };
          else if (p.src.kind === 'op') value = await api(p.src.op, p.src.params || {});
          else value = await api('monitorQuery', { node: p.src.node || 9191, space: p.src.space || '', command: p.src.command, action: p.src.action || '', params: p.src.params || {} });
          setData((d) => ({ ...d, [p.id]: { value, at: Date.now() } }));
        } catch (e) {
          setData((d) => ({ ...d, [p.id]: { error: e.message || String(e) } }));
        }
      };
      useEffect(() => {
        panels.forEach((p) => { if (p.type === 'iframe') return; const due = p.refresh > 0 ? tick % Math.max(1, Math.round(p.refresh / 5)) === 0 : true; if (tick === 0 || due) load(p); });
      }, [tick, panels.length]);
      const startAdd = () => setEdit({ id: 'p' + Date.now().toString(36), type: 'query', title: zh ? '新面板' : 'New panel', w: 4, refresh: 10, src: { kind: 'cmd', node: 9191, command: 'runtime', params: {} } });
      const saveEdit = () => { setPanels((list) => { const i = list.findIndex((x) => x.id === edit.id); return i >= 0 ? list.map((x) => (x.id === edit.id ? edit : x)) : [...list, edit]; }); setEdit(null); };
      return h('div', { className: 'cx-mon-board' },
        h('div', { className: 'cx-mon-board-h' },
          h('span', { className: 't' }, zh ? '面板看板' : 'PANELS'),
          h('span', { className: 's' }, zh ? '数据源 = 节点 + 空间 + 命令 + 参数' : 'source = node + space + command + params'),
          h('button', { className: 'cx-btn xs pri', onClick: startAdd }, zh ? '+ 添加面板' : '+ Panel')),
        h('div', { className: 'cx-mon-board-grid' }, panels.map((p) => h(MonitorPanel, { key: p.id, p, data: data[p.id], zh, onEdit: setEdit, onDel: (x) => setPanels((l) => l.filter((y) => y.id !== x.id)), onReload: load }))),
        edit ? h('div', { className: 'cx-mon-ed' },
          h('div', { className: 'cx-mon-ed-h' }, zh ? '面板设置' : 'Panel'),
          h('label', null, zh ? '标题' : 'Title', h('input', { value: edit.title, onChange: (e) => setEdit({ ...edit, title: e.target.value }) })),
          h('label', null, zh ? '类型' : 'Type', h('select', { value: edit.type, onChange: (e) => setEdit({ ...edit, type: e.target.value }) },
            h('option', { value: 'stat' }, zh ? '数值' : 'Stat'),
            h('option', { value: 'table' }, zh ? '表格' : 'Table'),
            h('option', { value: 'query' }, zh ? '命令' : 'Command'),
            h('option', { value: 'iframe' }, zh ? '内嵌网页' : 'Iframe'))),
          h('label', null, zh ? '数据源类型' : 'Source', h('select', { value: edit.src.kind, onChange: (e) => setEdit({ ...edit, src: { ...edit.src, kind: e.target.value } }) },
            h('option', { value: 'nodes' }, zh ? '节点列表' : 'Nodes'),
            h('option', { value: 'spaces' }, zh ? '空间列表' : 'Spaces'),
            h('option', { value: 'op' }, zh ? '内置数据' : 'Builtin'),
            h('option', { value: 'cmd' }, zh ? '命令' : 'Command'),
            h('option', { value: 'url' }, zh ? '网址' : 'URL'))),
          edit.src.kind === 'cmd' ? h('div', { className: 'cx-mon-ed-row' },
            h('label', null, 'node', h('input', { value: edit.src.node || 9191, onChange: (e) => setEdit({ ...edit, src: { ...edit.src, node: Number(e.target.value) || 9191 } }) })),
            h('label', null, 'space', h('input', { value: edit.src.space || '', onChange: (e) => setEdit({ ...edit, src: { ...edit.src, space: e.target.value } }) })),
            h('label', null, 'command', h('input', { value: edit.src.command || '', onChange: (e) => setEdit({ ...edit, src: { ...edit.src, command: e.target.value } }) })),
            h('label', null, 'action', h('input', { value: edit.src.action || '', onChange: (e) => setEdit({ ...edit, src: { ...edit.src, action: e.target.value } }) }))) : null,
          edit.src.kind === 'url' ? h('div', { className: 'cx-mon-ed-row' },
            h('label', null, 'node', h('input', { value: edit.src.node || 9191, onChange: (e) => setEdit({ ...edit, src: { ...edit.src, node: Number(e.target.value) || 9191 } }) })),
            h('label', null, 'url', h('input', { value: edit.src.url || '', onChange: (e) => setEdit({ ...edit, src: { ...edit.src, url: e.target.value } }) }))) : null,
          h('label', null, zh ? '宽度（1-12 栅格）' : 'Width', h('input', { type: 'number', min: 2, max: 12, value: edit.w || 3, onChange: (e) => setEdit({ ...edit, w: Number(e.target.value) || 3 }) })),
          h('label', null, zh ? '刷新秒数（0=不刷新）' : 'Refresh', h('input', { type: 'number', min: 0, max: 600, value: edit.refresh || 0, onChange: (e) => setEdit({ ...edit, refresh: Number(e.target.value) || 0 }) })),
          h('div', { className: 'cx-mon-ed-f' },
            h('button', { className: 'cx-btn xs', onClick: () => setEdit(null) }, zh ? '取消' : 'Cancel'),
            h('button', { className: 'cx-btn xs pri', onClick: saveEdit }, zh ? '保存' : 'Save'))) : null);
    }

    function MonitorView({ nodes, spaces, apps, events, logs, reqLog, locale, onRefresh }) {
      const zh = locale === 'zh';
      const [, tick] = useState(0);
      useEffect(() => { const t = setInterval(() => tick((x) => x + 1), 2000); return () => clearInterval(t); }, []);
      const now = new Date();
      const running = (nodes || []).filter((n) => n.state === 'running').length;
      const offline = (nodes || []).filter((n) => n.state && n.state !== 'running').length;
      const runningApps = (apps || []).length;
      const reqs = (reqLog || []).length;
      const errs = (reqLog || []).filter((r) => /err|fail|×|500/i.test(String(r.status || r.op || ''))).length;
      const errRate = reqs ? Math.round((errs / reqs) * 1000) / 10 : 0;
      const series = (reqLog || []).slice(-24).map((r) => Number(r.ms) || 60);
      const kpis = [
        { k: zh ? '节点' : 'NODES', v: (nodes || []).length, sub: `${running} ${zh ? '运行中' : 'running'}`, tone: 'cyan' },
        { k: zh ? '项目空间' : 'SPACES', v: (spaces || []).length, sub: `${(spaces || []).filter((s) => s.status === 'running').length} ${zh ? '在线' : 'online'}`, tone: 'green' },
        { k: zh ? '应用' : 'APPS', v: runningApps, sub: zh ? '最近加载' : 'loaded', tone: 'green' },
        { k: zh ? '请求' : 'REQUESTS', v: reqs, sub: zh ? '本次会话' : 'session', tone: 'cyan' },
        { k: zh ? '错误率' : 'ERR RATE', v: `${errRate}%`, sub: `${errs} ${zh ? '次' : 'errs'}`, tone: errRate > 5 ? 'rose' : 'amber' },
        { k: zh ? '事件' : 'EVENTS', v: (events || []).length, sub: `${(logs || []).length} ${zh ? '日志' : 'logs'}`, tone: 'amber' },
      ];
      const donut = [
        { value: running, color: 'var(--cx-green)' },
        { value: offline, color: 'var(--cx-amber)' },
        { value: Math.max(0, (nodes || []).length - running - offline), color: 'rgba(var(--cx-hue-rgb),.35)' },
      ];
      const spaceBars = (spaces || []).slice(0, 6).map((s) => ({ name: s.name, value: (apps || []).filter((a) => a.space === s.name).length || 1 }));
      const maxBar = Math.max(1, ...spaceBars.map((b) => b.value));
      const feed = (events || []).slice(-8).reverse();
      return h('div', { className: 'cx-monitor' },
        h(MonitorBoard, { nodes, spaces, locale }),
        h('div', { className: 'cx-mon-head' },
          h('div', null,
            h('div', { className: 'cx-mon-title' }, zh ? '数字孪生 · 运行监控' : 'DIGITAL TWIN · LIVE MONITOR'),
            h('div', { className: 'cx-mon-sub' }, `${now.toLocaleDateString()} ${now.toLocaleTimeString()} · ${zh ? '每 2 秒刷新' : 'refresh 2s'}`)),
          h('div', { className: 'cx-mon-head-r' },
            h('span', { className: 'cx-mon-live' }, '● LIVE'),
            h('button', { className: 'cx-term-act', onClick: onRefresh }, zh ? '刷新' : 'Refresh'))),
        h('div', { className: 'cx-mon-kpis' }, kpis.map((k) => h('div', { key: k.k, className: `cx-mon-kpi tone-${k.tone}` },
          h('div', { className: 'k' }, k.k), h('div', { className: 'v' }, String(k.v)), h('div', { className: 's' }, k.sub)))),
        h('div', { className: 'cx-mon-grid' },
          h('section', { className: 'cx-mon-panel' },
            h('div', { className: 'cx-mon-pt' }, zh ? '请求耗时趋势' : 'LATENCY TREND'),
            h(MonitorSpark, { series }),
            h('div', { className: 'cx-mon-legend' }, h('i', { className: 'dot cyan' }), zh ? '耗时 ms · 最近 24 次调用' : 'ms · last 24 calls')),
          h('section', { className: 'cx-mon-panel mid' },
            h('div', { className: 'cx-mon-pt' }, zh ? '孪生拓扑' : 'TWIN TOPOLOGY'),
            h(MonitorTwin, { nodes, spaces, apps }),
            h('div', { className: 'cx-mon-legend' }, h('i', { className: 'dot cyan' }), zh ? '节点' : 'node', h('i', { className: 'dot amber' }), zh ? '枢纽' : 'hub')),
          h('section', { className: 'cx-mon-panel' },
            h('div', { className: 'cx-mon-pt' }, zh ? '节点状态占比' : 'NODE STATUS'),
            h('div', { className: 'cx-mon-donut-wrap' }, h(MonitorDonut, { items: donut }),
              h('ul', { className: 'cx-mon-keys' },
                h('li', null, h('i', { className: 'dot green' }), zh ? '运行' : 'running', h('b', null, running)),
                h('li', null, h('i', { className: 'dot amber' }), zh ? '离线' : 'offline', h('b', null, offline)))))),
        h('div', { className: 'cx-mon-grid2' },
          h('section', { className: 'cx-mon-panel' },
            h('div', { className: 'cx-mon-pt' }, zh ? '空间应用分布' : 'APPS BY SPACE'),
            spaceBars.length ? spaceBars.map((b) => h('div', { key: b.name, className: 'cx-mon-bar' },
              h('span', { className: 'n' }, b.name),
              h('span', { className: 't' }, h('i', { style: { width: (b.value / maxBar) * 100 + '%' } })),
              h('span', { className: 'v' }, String(b.value)))) : h('div', { className: 'cx-mon-empty' }, zh ? '暂无空间' : 'no spaces')),
          h('section', { className: 'cx-mon-panel' },
            h('div', { className: 'cx-mon-pt' }, zh ? '实时事件' : 'EVENT STREAM'),
            feed.length ? feed.map((e, i) => h('div', { key: i, className: 'cx-mon-feed' },
              h('span', { className: 't' }, String(e.t || '').slice(0, 8)),
              h('span', { className: 'o' }, String(e.op || e.kind || '')), h('span', { className: 's' }, String(e.status || e.detail || '').slice(0, 28))))
              : h('div', { className: 'cx-mon-empty' }, zh ? '暂无事件' : 'no events'))));
    }
