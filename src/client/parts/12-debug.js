  const debugResponseTable = (row) => {
    let payload = row?.response;
    if (typeof payload === 'string') { try { payload = JSON.parse(payload); } catch { payload = null; } }
    const env = payload?.data !== undefined ? payload.data : payload;
    if (!env) return null;
    if (env.columns && Array.isArray(env.rows)) return { cols: env.columns.map((k) => ({ k, label: k })), rows: env.rows.map((v, i) => ({ ...v, _i: i + 1 })) };
    if (Array.isArray(env.append)) {
      const height = env[env.append[0]]?.length || 0;
      const rows = Array.from({ length: height }, (_, i) => Object.fromEntries(env.append.map((k) => [k, env[k]?.[i] ?? ''])));
      return { cols: env.append.map((k) => ({ k, label: k })), rows };
    }
    if (Array.isArray(env)) {
      const keys = [...new Set(env.flatMap((x) => x && typeof x === 'object' ? Object.keys(x) : []))].slice(0, 8);
      return { cols: keys.map((k) => ({ k, label: k })), rows: env.map((x, i) => x && typeof x === 'object' ? { ...x, _i: i + 1 } : { value: String(x), _i: i + 1 }) };
    }
    const result = env && typeof env === 'object' ? env.result : null;
    if (result && typeof result === 'object') {
      if (Array.isArray(result)) {
        const keys = [...new Set(result.flatMap((x) => x && typeof x === 'object' ? Object.keys(x) : []))].slice(0, 8);
        return { cols: keys.map((k) => ({ k, label: k })), rows: result.map((x) => x && typeof x === 'object' ? x : { value: String(x) }) };
      }
      const keys = Object.keys(result).slice(0, 12);
      return { cols: keys.map((k) => ({ k, label: k })), rows: [result] };
    }
    if (env && typeof env === 'object') {
      const lists = Object.entries(env).filter(([, v]) => Array.isArray(v) && v.length && v[0] && typeof v[0] === 'object');
      if (lists.length) {
        const rows = [];
        for (const [kind, list] of lists) for (const item of list) rows.push({ kind, ...item });
        const keys = [...new Set(rows.flatMap((x) => Object.keys(x)).filter((k) => k !== 'kind'))].slice(0, 8);
        return { cols: [{ k: 'kind', label: 'kind' }, ...keys.map((k) => ({ k, label: k }))], rows };
      }
      return { cols: [{ k: 'key', label: 'KEY' }, { k: 'value', label: 'VALUE' }], rows: Object.entries(env).map(([key, value]) => ({ key, value: typeof value === 'object' ? JSON.stringify(value).slice(0, 220) : String(value) })) };
    }
    return { cols: [{ k: 'value', label: 'VALUE' }], rows: [{ value: String(env) }] };
  };
  const debugMetaFields = (row) => {
    let env = row?.response;
    if (typeof env === 'string') { try { env = JSON.parse(env); } catch { env = null; } }
    if (env?.data !== undefined && env.data && typeof env.data === 'object') env = env.data;
    if (!env || typeof env !== 'object') return [];
    const out = [];
    for (const key of ['detail', 'option', 'append', 'result']) {
      if (env[key] === undefined) continue;
      const value = env[key];
      out.push([key.toUpperCase(), Array.isArray(value) ? value.join(' · ') : (typeof value === 'object' ? JSON.stringify(value).slice(0, 260) : String(value))]);
    }
    return out;
  };
  const debugActionOf = (url) => {
    const text = String(url || '');
    const runMarker = text.lastIndexOf('/action/run/');
    const base = runMarker >= 0 ? text.slice(runMarker + 12) : text;
    const marker = base.lastIndexOf('/action/');
    if (marker >= 0) {
      const tail = base.slice(marker + 8).split('?')[0];
      const parts = tail.split('/').filter(Boolean);
      return parts[0] || 'list';
    }
    return 'list';
  };
  const debugCmdOf = (url) => {
    const text = String(url || '');
    const runMarker = text.lastIndexOf('/action/run/');
    let command = '';
    if (runMarker >= 0) command = text.slice(runMarker + 12).split(/[?/]/)[0];
    else {
      const m = text.match(/\/c\/([^/?]+)/);
      command = m ? m[1] : '';
    }
    const parts = command.split('.').filter(Boolean);
    return parts[parts.length - 1] || '—';
  };
  const traceDebugRow = (row) => {
    const text = JSON.stringify(row?.response ?? row?.raw ?? '') + ' ' + String(row?.url || '');
    const uids = [...new Set(Array.from(text.matchAll(/"uid"\s*:\s*"([0-9a-f]{32})"/gi)).map((m) => m[1]))].slice(0, 40);
    try { window.dispatchEvent(new CustomEvent('cx-trace', { detail: { logId: row?.logId || '', uids } })); } catch {}
  };
    const debugParamsOf = (row) => {
      let env = row?.response;
      if (typeof env === 'string') { try { env = JSON.parse(env); } catch { env = null; } }
      const out = [];
      try {
        const u = new URL(String(row?.url || ''));
        for (const [k, v] of u.searchParams.entries()) if (!out.some((x) => x[0] === k)) out.push([k, v]);
      } catch {}
      if (env && typeof env === 'object') {
        const keys = Array.isArray(env.option) ? env.option : [];
        for (const k of keys) out.push([k, Array.isArray(env[k]) ? env[k].join(' · ') : (env[k] == null ? '' : String(env[k]))]);
      }
      return out;
    };

    function debugRequestUrl(detail) {
      return String(detail?.row?.req || detail?.row?.url || detail?.row?.request?.url || (detail?.fields || []).find(([k]) => k === 'URL')?.[1] || '');
    }
    function debugLogTarget(detail) {
      let node = Number(detail?.node || detail?.row?.node || 0) || 0;
      let space = String(detail?.space || detail?.row?.space || '');
      const raw = debugRequestUrl(detail);
      let parsed = null;
      try { parsed = new URL(raw, typeof location !== 'undefined' ? location.origin : 'http://127.0.0.1'); } catch {}
      if (parsed) {
        if (/^https?:/i.test(raw)) node = Number(parsed.port) || node;
        const m = parsed.pathname.match(/\/s\/([^/]+)/);
        if (m) space = decodeURIComponent(m[1]);
      }
      if (!space) { const m = raw.match(/\/s\/([^/?#]+)/); if (m) space = decodeURIComponent(m[1]); }
      if (!node) { const m = raw.match(/(?:127\.0\.0\.1|localhost):(\d+)/); if (m) node = Number(m[1]); }
      return { node, space, url: raw };
    }
    function colorizeLogLine(line) {
      const text = String(line || '');
      const out = [];
      const re = /(\b[0-9a-f]{8}-[0-9a-f]{4}\b|https?:\/\/\S+|\b(?:warn|error|panic|fatal)\b)/gi;
      let last = 0; let m;
      while ((m = re.exec(text))) {
        if (m.index > last) out.push(text.slice(last, m.index));
        const cls = /^https?:/i.test(m[0]) ? 'link' : /^(warn|error|panic|fatal)$/i.test(m[0]) ? 'mark' : 'id';
        out.push(h('span', { key: `${m.index}-${m[0]}`, className: cls }, m[0]));
        last = m.index + m[0].length;
      }
      if (last < text.length) out.push(text.slice(last));
      return out;
    }
    const ANSI_COLORS = ['#000000','#cc0000','#4e9a06','#c4a000','#3465a4','#75507b','#06989a','#d3d7cf','#555753','#ef2929','#8ae234','#fce94f','#729fcf','#ad7fa8','#34e2e2','#eeeeec'];
    const ANSI_NAMES = { black:'#000000', red:'#cc0000', green:'#4e9a06', yellow:'#c4a000', blue:'#3465a4', magenta:'#75507b', cyan:'#06989a', white:'#d3d7cf', silver:'#c0c0c0', gray:'#888888', grey:'#888888', darkgrey:'#555753', brightred:'#ef2929', brightgreen:'#8ae234', brightyellow:'#fce94f', brightblue:'#729fcf', brightmagenta:'#ad7fa8', brightcyan:'#34e2e2', brightwhite:'#eeeeec' };
    const ansiColor = (name, fallback) => {
      const v = String(name || '').trim().toLowerCase();
      if (/^#[0-9a-f]{3,8}$/.test(v)) return v;
      return ANSI_NAMES[v] || fallback;
    };
    const ansi256 = (n) => {
      n = Number(n) || 0;
      if (n < 16) return ANSI_COLORS[n] || null;
      if (n < 232) {
        const i = n - 16, r = Math.floor(i / 36), g = Math.floor((i % 36) / 6), b = i % 6;
        const c = (x) => x === 0 ? 0 : 55 + x * 40;
        return `rgb(${c(r)},${c(g)},${c(b)})`;
      }
      const v = 8 + (n - 232) * 10;
      return `rgb(${v},${v},${v})`;
    };
    function ansiRuns(text) {
      const src = String(text || '');
      const out = [];
      const state = { fg: null, bg: null, bold: false, dim: false, italic: false, underline: false, inverse: false };
      const push = (value) => {
        if (!value) return;
        let fg = state.fg, bg = state.bg;
        if (state.inverse) { const f = fg; fg = bg; bg = f; }
        out.push({ text: value, style: {
          color: fg || undefined, background: bg || undefined,
          fontWeight: state.bold ? 700 : undefined,
          opacity: state.dim ? 0.65 : undefined,
          fontStyle: state.italic ? 'italic' : undefined,
          textDecoration: state.underline ? 'underline' : undefined,
        } });
      };
      const re = /\x1b\[([0-9;]*)m/g;
      let last = 0, m;
      while ((m = re.exec(src))) {
        push(src.slice(last, m.index));
        const codes = (m[1] || '0').split(';').map((x) => Number(x || 0));
        for (let i = 0; i < codes.length; i++) {
          const c = codes[i];
          if (c === 0) { state.fg = state.bg = null; state.bold = state.dim = state.italic = state.underline = state.inverse = false; }
          else if (c === 1) state.bold = true;
          else if (c === 2) state.dim = true;
          else if (c === 3) state.italic = true;
          else if (c === 4) state.underline = true;
          else if (c === 7) state.inverse = true;
          else if (c === 22) { state.bold = false; state.dim = false; }
          else if (c === 23) state.italic = false;
          else if (c === 24) state.underline = false;
          else if (c === 27) state.inverse = false;
          else if ((c >= 30 && c <= 37) || (c >= 90 && c <= 97)) state.fg = ANSI_COLORS[c <= 37 ? c - 30 : c - 90 + 8];
          else if ((c >= 40 && c <= 47) || (c >= 100 && c <= 107)) state.bg = ANSI_COLORS[c <= 47 ? c - 40 : c - 100 + 8];
          else if (c === 39) state.fg = null;
          else if (c === 49) state.bg = null;
          else if (c === 38 || c === 48) {
            const target = c === 38 ? 'fg' : 'bg';
            if (codes[i + 1] === 5) { state[target] = ansi256(codes[i + 2]); i += 2; }
            else if (codes[i + 1] === 2) { state[target] = `rgb(${codes[i + 2] || 0},${codes[i + 3] || 0},${codes[i + 4] || 0})`; i += 4; }
          }
        }
        last = m.index + m[0].length;
      }
      push(src.slice(last));
      return out;
    }
    function AnsiText({ text }) {
      return h(React.Fragment, null, ansiRuns(text).map((r, i) => h('span', { key: i, style: r.style }, colorizeLogLine(r.text))));
    }
    function terminalTheme(text) {
      const src = String(text || '');
      const bg = src.match(/"sess\.bg":\["([^"]+)"/);
      const fg = src.match(/"sess\.fg":\["([^"]+)"/);
      return { background: ansiColor(bg?.[1], '#020a10'), color: ansiColor(fg?.[1], '#b9d7e8') };
    }
    function TerminalLog({ text }) {
      const lines = String(text || '').split('\n');
      const theme = terminalTheme(text);
      return h('pre', { className: 'cx-term-log', style: theme }, lines.map((line, i) => {
        const low = line.toLowerCase();
        const sev = /panic|fatal|error|✗/.test(low) ? 'err' : /warn/.test(low) ? 'warn' : '';
        return h('div', { key: i, className: `cx-term-line ${sev}` }, h(AnsiText, { text: line }));
      }));
    }
    // Reusable debug inspector. Keep request/response presentation here so
    // page.js only builds the data model and opens/closes the panel.
    /** 调试栏终端：xterm + PTY（bash，家目录），单例复用，避免重复挂载起两个 shell。 */
    const CONSOLE_TERMS = {};
    function consoleTermDo(node, space, kind, slot = '') {
      const key = `${node || ''}:${space || ''}:v2${slot}`;
      const rec = CONSOLE_TERMS[key];
      if (!rec) return;
      if (kind === 'clear') rec.clear && rec.clear();
      if (kind === 'refresh') rec.reset && rec.reset();
      if (kind === 'reconnect') rec.reconnect && rec.reconnect();
      if (kind === 'fit') rec.fitNow && rec.fitNow();
    }
    function ConsoleTerminal({ node, space, slot = '' }) {
      const hostRef = useRef(null);
      useEffect(() => {
        const key = `${node || ''}:${space || ''}:v2${slot}`;
        const host = hostRef.current;
        if (!host) return;
        const existing = CONSOLE_TERMS[key];
        if (existing) {
          try {
            Array.from(host.children).forEach((c) => { if (c !== existing.wrap) c.remove(); });
            if (existing.wrap.parentNode !== host) host.appendChild(existing.wrap);
            existing.fit && existing.fit.fit();
          } catch {}
          return () => { try { if (existing.wrap.parentNode) existing.wrap.parentNode.removeChild(existing.wrap); } catch {} };
        }
        let cancelled = false;
        Array.from(host.children).forEach((c) => c.remove());
        const wrap = document.createElement('div');
        wrap.className = 'cx-console-term-inner';
        host.appendChild(wrap);
        const rec = CONSOLE_TERMS[key] = { wrap, term: null, fit: null, ws: null };
        (async () => {
          const load = async (src) => { const code = await (await fetch(src)).text(); new Function('module', 'exports', 'define', 'require', 'window', 'self', 'globalThis', code)(undefined, undefined, undefined, undefined, window, window, window); };
          if (!window.Terminal) await load('/dsh-contextos-devops/xterm/xterm.js');
          if (!(window.FitAddon && window.FitAddon.FitAddon)) await load('/dsh-contextos-devops/xterm/addon-fit.js').catch(() => {});
          if (cancelled || !window.Terminal) return;
          const lightNow = (document.querySelector('.cx-shell') || {}).dataset?.theme === 'light';
          const termTheme = lightNow
            ? { background: '#ffffff', foreground: '#1d3a4a', cursor: '#0b7f9f', selectionBackground: 'rgba(11,127,159,.22)' }
            : { background: '#04101a', foreground: '#cfeff9', cursor: '#42f5a7' };
          const term = new window.Terminal({ fontSize: 12, fontFamily: 'Menlo, monospace', cursorBlink: true, scrollback: 2000, cols: 100, rows: 20, theme: termTheme });
          // 吞掉 DSR/DA 查询：别让 xterm 自动回 \x1b[1;<col>R，回包会被 shell 回显成数字
          try { term.parser.registerCsiHandler({ final: 'n' }, () => true); term.parser.registerCsiHandler({ final: 'c' }, () => true); } catch {}
          const fit = window.FitAddon && window.FitAddon.FitAddon ? new window.FitAddon.FitAddon() : null;
          if (fit) term.loadAddon(fit);
          term.open(wrap);
          rec.term = term; rec.fit = fit;
          try { fit && fit.fit(); } catch {}
          wrap.addEventListener('mousedown', () => { try { term.focus(); } catch {} });
          try { document.activeElement && document.activeElement !== document.body && document.activeElement.blur(); } catch {}
          try { term.focus(); } catch {}
          let wsHost = location.host, wsProto = location.protocol === 'https:' ? 'wss' : 'ws';
          if (!/^https?:$/.test(location.protocol)) { try { const o = await api('origin'); if (o && o.host) { wsHost = o.host; wsProto = 'ws'; } } catch {} }
          if (cancelled) return;
          let pend = '';
          const feed = (chunk) => {
            let t = pend + String(chunk || ''); pend = '';
            if (/\x1b\[1m\x1b\[7m%[\s\S]*\r \r/.test(t)) t = t.replace(/\x1b\[1m\x1b\[7m%\x1b\[27m\x1b\[1m\x1b\[0m *\r \r/g, '');
            else { const i = t.lastIndexOf('\x1b[1m\x1b[7m%'); if (i >= 0) { pend = t.slice(i); t = t.slice(0, i); } }
            if (t) { try { term.write(t); } catch {} }
          };
          const connect = () => {
            if (cancelled) return;
            let ws;
            try { ws = new WebSocket(`${wsProto}://${wsHost}/dsh-contextos-devops/terminal?shell=bash`); } catch { return; }
            rec.ws = ws;
            ws.onmessage = (e) => { if (ws === rec.ws) { try { feed(e.data); } catch {} } };
            ws.onclose = () => { if (ws !== rec.ws) return; try { term.write('\r\n[closed]\r\n'); } catch {} };
            rec.send = (d) => { const clean = String(d).replace(/\x1b\[[0-9;?]*[Rc]/g, ''); if (clean && ws.readyState === 1) ws.send(clean); };
          };
          connect();
          rec.reconnect = () => { try { rec.ws && rec.ws.close(); } catch {}; connect(); };
          rec.clear = () => { try { term.clear(); } catch {} };
          rec.reset = () => { try { rec.ws && rec.ws.readyState === 1 && rec.ws.send('clear\r'); } catch {} };
          rec.fitNow = () => { try { fit && fit.fit(); } catch {} };
          term.onData((d) => { rec.send && rec.send(d); });
          [200, 600, 1200].forEach((ms) => setTimeout(() => { try { fit && fit.fit(); } catch {} }, ms));
        })().catch(() => {});
        return () => { cancelled = true; try { rec.term && rec.term.blur(); } catch {}; try { if (wrap.parentNode) wrap.parentNode.removeChild(wrap); } catch {} };
      }, [node, space, slot]);
      return h('div', { className: 'cx-console-term', ref: hostRef });
    }

    /** 解析后端日志行：时间 / log.id / order / 模块 / 类型 / 内容 / SQL / 源码文件。 */
    function parseBackendLog(text) {
      const out = [];
      for (const line of String(text || '').split('\n')) {
        const t = line.trim();
        if (!t) continue;
        const m = /^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(?:\.\d+)?)\s+id:\s*(\S+)\s+(\d+)\s+(\S+)\s+(\S+)\s+(.*)$/.exec(t);
        if (!m) continue;
        const time = m[1], id = m[2], order = m[3], module = m[4], type = m[5];
        let rest = m[6];
        const srcM = /\s(\S+\.go:\d+)\s*$/.exec(rest);
        const file = srcM ? srcM[1] : '';
        if (srcM) rest = rest.slice(0, srcM.index);
        const costM = /\s(\d+(?:\.\d+)?(?:ns|us|ms|s))\s/.exec(rest);
        const cost = costM ? costM[1] : '';
        if (costM) rest = rest.slice(0, costM.index) + rest.slice(costM.index + costM[0].length);
        const sqlM = /\b(SELECT|UPDATE|INSERT|DELETE)\b[\s\S]*/i.exec(rest);
        const sql = sqlM ? sqlM[0].replace(/\s+rows;\s*[-\d]+[\s\S]*$/i, '').trim() : '';
        const content = (sqlM ? rest.slice(0, sqlM.index) : rest).replace(/\s+rows;[\s\S]*$/, '').trim();
        out.push({ time, id, order, module, type, content, cost, sql, file });
      }
      return out;
    }

    function DebugDetail({ detail, onClose }) {
      const [tab, setTab] = React.useState('info');
      const [logText, setLogText] = React.useState('');
      const [logFile, setLogFile] = React.useState('');
      const [logLoading, setLogLoading] = React.useState(false);
      React.useEffect(() => { setTab('info'); setLogText(''); setLogFile(''); setLogLoading(false); }, [detail?.key]);
      const logId = detail?.row?.logId || detail?.responseHeaders?.['log-id'] || detail?.responseHeaders?.['Log-Id'] || (detail?.fields || []).find(([k]) => k === 'LOG.ID')?.[1] || '';
      const loadLog = async () => {
        if (!detail || !logId) return;
        setLogLoading(true);
        try {
          const target = debugLogTarget(detail);
          if (!target.node || !target.space) throw new Error(`无法从 URL 解析节点/空间：${target.url || '（空 URL）'}`);
          const d = await api('pmLog', { node: target.node, space: target.space, log_id: logId });
          setLogText(d?.text || ''); setLogFile(d?.file || '');
        } catch (e) { setLogText(String(e?.message || e)); }
        finally { setLogLoading(false); }
      };
      React.useEffect(() => { if (['backend', 'sql', 'parsedlog'].includes(tab) && !logText && logId) loadLog(); }, [tab, detail?.key]);
      if (!detail) return null;
      const info = h(React.Fragment, null,
        h('div', { className: 'cx-detail-section' }, T('基本信息')),
        h(KeyValueTable, { rows: (detail.fields || []).map(([k, v]) => [k, k === 'LOG.ID' ? h(React.Fragment, null, String(v ?? ''), h('button', { className: 'cx-log-btn', onClick: () => { setTab('backend'); loadLog(); } }, T('日志'))) : String(v ?? '')]) }),
        h('div', { className: 'cx-detail-section' }, T('请求头')),
        h(KeyValueTable, { rows: Object.entries(detail.requestHeaders || {}) }),
        h('div', { className: 'cx-detail-section' }, T('响应头')),
        h(KeyValueTable, { rows: Object.entries(detail.responseHeaders || {}) }),
        logText ? h('div', { className: 'cx-detail-section' }, `${T('后端日志')} ${logFile}`) : null,
        logText ? h(TerminalLog, { text: logText }) : null);
      return h('div', { className: 'cx-console-detail', style: { height: 'auto', alignSelf: 'flex-start', maxHeight: '100%' } },
        h(DetailTabs, {
          items: [{ value: 'info', label: T('请求信息') }, { value: 'raw', label: T('原始数据') }, { value: 'params', label: T('请求参数') }, { value: 'parsed', label: T('解析数据') }, { value: 'sql', label: T('数据读写') }, { value: 'parsedlog', label: T('解析日志') }, { value: 'backend', label: T('后端日志') }],
          value: tab, onChange: setTab, onClose,
        }),
        tab === 'info' ? info : null,
        tab === 'raw' ? h('pre', { className: 'cx-console-detail-raw' }, detail.body || '') : null,
        tab === 'params' ? h(KeyValueTable, { rows: detail.params || [] }) : null,
        tab === 'parsed' ? h(UiTableList, { cols: detail.table?.cols || [], rows: detail.table?.rows?.slice(0, 100) || [], empty: h('div', { className: 'cx-console-empty' }, T('没有可解析的数据')) }) : null,
        tab === 'sql' ? h(UiTableList, { cols: [{ k: 'time', label: T('时间') }, { k: 'id', label: 'log.id' }, { k: 'sql', label: 'SQL' }, { k: 'cost', label: T('耗时') }, { k: 'file', label: T('源码文件') }], rows: parseBackendLog(logText).filter((r) => r.sql), empty: h('div', { className: 'cx-console-empty' }, T('没有可解析的 SQL')) }) : null,
        tab === 'parsedlog' ? h(UiTableList, { cols: [{ k: 'time', label: T('时间') }, { k: 'id', label: 'log.id' }, { k: 'order', label: 'log.order' }, { k: 'module', label: T('模块') }, { k: 'type', label: T('类型') }, { k: 'content', label: T('内容') }, { k: 'file', label: T('源码文件') }], rows: parseBackendLog(logText), empty: h('div', { className: 'cx-console-empty' }, T('没有可解析的日志')) }) : null,
        tab === 'backend' ? h('div', { className: 'cx-backend-log' }, h('div', { className: 'cx-backend-log-h' }, h('span', null, `${T('后端日志')} · ${logFile || logId || '—'}`), h('button', { className: 'cx-btn xs', disabled: logLoading, onClick: loadLog }, logLoading ? T('加载中…') : T('重新加载'))), logText ? h(TerminalLog, { text: logText }) : h('div', { className: 'cx-console-empty' }, logId ? T('点击重新加载') : 'no log.id')) : null);
    }
