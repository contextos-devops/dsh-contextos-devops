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
