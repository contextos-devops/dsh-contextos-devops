    function DevWorkspace({ locale, node, space, bg, theme, active, nodes, spaces, projects, activeKey, onSelectProject, onCloseProject, onSelectNode, onSelectSpace, onActiveFile, requests, onPick }) {
      const zh = locale === 'zh';
      const sp = space || '';
      const normPath = (v) => String(v || '').replace(/^\/+/, '');
      const [dirs, setDirs] = useState({});
      const [expanded, setExpanded] = useState({ '': true });
      const [tabs, setTabs] = useState([]);
      const [activePath, setActivePath] = useState('');
      const [status, setStatus] = useState('');
      const [treeMenu, setTreeMenu] = useState(null);
      const [nameDlg, setNameDlg] = useState(null);
      const [crumbMenu, setCrumbMenu] = useState(null);
      const [showLeft, setShowLeft] = useState(true);
      const [showRight, setShowRight] = useState(false);
      const [showBottom, setShowBottom] = useState(false);
      const [previewNonce, setPreviewNonce] = useState(0);
      const [previewWidth, setPreviewWidth] = useState(() => Number(cxReadText('preview-w', '360')) || 360);
      useEffect(() => cxWriteText('preview-w', previewWidth), [previewWidth]);
      const startResize = (e) => {
        e.preventDefault();
        const startX = e.clientX; const startW = previewWidth;
        const onMove = (ev) => { const w = Math.min(Math.max(240, startW - (ev.clientX - startX)), 900); setPreviewWidth(w); };
        const onUp = () => { document.body.style.userSelect = ''; window.removeEventListener('mousemove', onMove); };
        document.body.style.userSelect = 'none';
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp, { once: true });
      };
      const [git, setGit] = useState(null);
      const [gitOpen, setGitOpen] = useState(true);
      const [gitHistOpen, setGitHistOpen] = useState(false);
      const [cursor, setCursor] = useState({ line: 1, column: 1 });
      const refreshGit = async () => {
        if (!node) return;
        try { setGit(await api('git', { node, space: sp })); } catch { /* no git */ }
      };
      useEffect(() => { refreshGit(); }, [node, space]);
      const [recentOpen, setRecentOpen] = useState(true);
      const [treeOpen, setTreeOpen] = useState(true);
      const readTreeFolds = () => cxRead('tree-folds', {});
      const treeFoldsKey = `${node || ''}:${space || ''}`;
      const skipTreeFoldSaveRef = useRef(false);
      useEffect(() => {
        if (!node) return;
        skipTreeFoldSaveRef.current = true;
        const f = readTreeFolds()[treeFoldsKey] || {};
        setRecentOpen(f.recent !== false);
        setTreeOpen(f.tree !== false);
        setGitOpen(f.git !== false);
        setGitHistOpen(f.gitHist === true);
      }, [node, space]);
      useEffect(() => {
        if (skipTreeFoldSaveRef.current) { skipTreeFoldSaveRef.current = false; return; }
        if (!node) return;
        try {
          const all = readTreeFolds();
          all[treeFoldsKey] = { recent: recentOpen, tree: treeOpen, git: gitOpen, gitHist: gitHistOpen };
          cxWrite('tree-folds', all);
        } catch {}
      }, [recentOpen, treeOpen, gitOpen, gitHistOpen, node, space]);
      const [editorErr, setEditorErr] = useState('');
      const [termErr, setTermErr] = useState('');
      useEffect(() => {
        if (!active) return;
        const t = setTimeout(() => {
          Object.values(termMapRef.current).forEach((x) => { try { x.fit && x.fit.fit(); } catch {} });
          const m = monacoRef.current;
          if (m && editorRef.current) { try { editorRef.current.layout(); } catch {} }
        }, 60);
        return () => clearTimeout(t);
      }, [active]);
      useEffect(() => {
        const onResize = () => {
          requestAnimationFrame(() => {
            try { editorRef.current && editorRef.current.layout && editorRef.current.layout(); } catch {}
            Object.values(termMapRef.current).forEach((x) => { try { x.fit && x.fit.fit(); } catch {} });
          });
        };
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
      }, []);
      const [termTab, setTermTab] = useState('term');
      const [termIds, setTermIds] = useState([1]);
      const [termActive, setTermActive] = useState(1);
      const [termOut, setTermOut] = useState('');
      const [reqDetail, setReqDetail] = useState(null);
      const termActiveRef = useRef(termActive); termActiveRef.current = termActive;
      useEffect(() => {
        if (!onActiveFile) return;
        const timer = setTimeout(() => {
        const t = tabs.find((x) => x.path === activePath);
        onActiveFile(t ? {
          node, space, path: String(t.path || '').replace(/^\/+/, ''), name: t.name, dirty: !!t.dirty,
          language: (() => { const e = (t.path.split('.').pop() || '').toLowerCase(); return ({ go: 'go', js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript', json: 'json', css: 'css', html: 'html', md: 'markdown', shy: 'shy', sh: 'shell', yml: 'yaml', yaml: 'yaml' })[e] || 'plaintext'; })(),
          content: String(t.content || '').slice(0, 1500),
        } : (node ? { node, space, path: '', name: '', dirty: false, language: '', content: '' } : null));
        }, 400);
        return () => clearTimeout(timer);
      }, [activePath, tabs, node, space]);
      const restoreTextRef = useRef({});
      const termPendingRef = useRef(false);
      const saveTimerRef = useRef(null);
      const readTermBuf = () => cxRead('term-buf', {});
      const readRemoteState = async () => { try { return (await api('stateGet')) || {}; } catch { return {}; } };
      const writeRemoteState = (name, value) => { try { api('stateSet', { name, value }).catch(() => {}); } catch {} };
      const termIdsRef = useRef(termIds); termIdsRef.current = termIds;
      const termKeyRef = useRef('');
      const persistTermBuf = (key) => {
        const k = key || termKeyRef.current;
        if (!k) return;
        try {
          const ids = []; const texts = {};
          Object.keys(termMapRef.current).forEach((id) => {
            const x = termMapRef.current[id];
            if (x.key !== k) return;
            ids.push(Number(id));
            texts[id] = String(x.text || '').slice(-60000);
          });
          if (!ids.length) return;
          ids.sort((a, b) => a - b);
          const all = readTermBuf();
          all[k] = { ids, texts };
          cxWrite('term-buf', all);
          writeRemoteState('termBuf', all);
        } catch {}
      };
      const scheduleSave = () => { try { clearTimeout(saveTimerRef.current); } catch {} const k = termKeyRef.current; saveTimerRef.current = setTimeout(() => persistTermBuf(k), 800); };
      const editorHostRef = useRef(null);
      const taRef = useRef(null);
      const termHostsRef = useRef({});
      const editorRef = useRef(null);
      const monacoRef = useRef(null);
      const termMapRef = useRef({});
      const tabsRef = useRef(tabs); tabsRef.current = tabs;
      const activeRef = useRef(activePath); activeRef.current = activePath;
      const restorePendingRef = useRef(false);
      const saveRef = useRef(() => {});
      const activeTab = tabs.find((t) => t.path === activePath) || null;

      const ensureScript = (src) => new Promise((res, rej) => {
        const hit = document.querySelector(`script[src="${src}"]`);
        if (hit) return res();
        const el = document.createElement('script'); el.src = src; el.async = true;
        el.onload = () => { activity('加载脚本 ' + src, 'ok'); res(); }; el.onerror = () => { activity('脚本加载失败 ' + src, 'err'); rej(new Error('load failed: ' + src)); };
        document.head.appendChild(el);
      });
      const ensureCss = (href) => {
        if (document.querySelector(`link[href="${href}"]`)) return;
        const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = href; document.head.appendChild(l);
      };
      const registerShyLang = (monaco) => {
        try {
          if (monaco.languages.getLanguages().some((l) => l.id === 'shy')) return;
          monaco.languages.register({ id: 'shy', extensions: ['.shy'], aliases: ['Shy', 'shy'] });
          monaco.languages.setMonarchTokensProvider('shy', {
            ignoreCase: false,
            tokenizer: {
              root: [
                [/#.*$/, 'comment'],
                [/^[ \t]*~[\w\-.]*/, 'keyword'],
                [/^[ \t]*[\w\-./]+/, 'keyword'],
                [/"/, { token: 'string.quote', next: '@dstr' }],
                [/`/, { token: 'string.quote', next: '@bstr' }],
                [/[a-zA-Z_][\w\-.]*/, 'identifier'],
                [/\d[\w\-.:%/]*/, 'number'],
                [/[=,;:(){}[\]]/, 'delimiter'],
              ],
              dstr: [
                [/[^\\"]+/, 'string'],
                [/\\./, 'string.escape'],
                [/"/, { token: 'string.quote', next: '@pop' }],
              ],
              bstr: [
                [/[^`]+/, 'string'],
                [/`/, { token: 'string.quote', next: '@pop' }],
              ],
            },
          });
          monaco.languages.setLanguageConfiguration('shy', {
            comments: { lineComment: '#' },
            autoClosingPairs: [{ open: '"', close: '"' }, { open: '`', close: '`' }],
            surroundingPairs: [{ open: '"', close: '"' }, { open: '`', close: '`' }],
          });
        } catch {}
      };
      let monacoPromise = null;
      const loadMonaco = () => {
        if (window.monaco && window.monaco.editor) return Promise.resolve(window.monaco);
        if (monacoPromise) return monacoPromise;
        monacoPromise = (async () => {
          if (!(window.require && window.require.config)) {
            try { if (window.require) delete window.require; } catch {}
            await ensureScript('/contextos-devops-dsh/monaco/vs/loader.js');
          }
          return new Promise((res, rej) => {
            const req = window.require;
            if (!req || !req.config) return rej(new Error('monaco loader missing'));
            req.config({ paths: { vs: '/contextos-devops-dsh/monaco/vs' } });
            req(['vs/editor/editor.main'], () => {
              if (window.monaco && window.monaco.editor) { activity('加载 Monaco 编辑器', 'ok'); res(window.monaco); }
              else { monacoPromise = null; rej(new Error('monaco editor missing')); }
            }, (e) => { monacoPromise = null; rej(e || new Error('monaco load failed')); });
          });
        })();
        return monacoPromise;
      };

      const loadDir = async (p) => {
        if (!node) return;
        try {
          const list = await api('tree', { node, space: sp, path: p });
          setDirs((d) => ({ ...d, [p]: list }));
          setExpanded((e) => ({ ...e, [p]: true }));
        } catch (e) { setStatus(String(e?.message || e)); }
      };
      const toggleDir = (p) => {
        setExpanded((e) => {
          const on = !e[p];
          if (on && !dirs[p]) loadDir(p);
          return { ...e, [p]: on };
        });
      };
      const openFile = async (rawPath) => {
        const p = normPath(rawPath);
        setStatus('');
        if (!tabsRef.current.some((t) => t.path === p)) {
          try {
            const r = await api('readFile', { node, space: sp, path: p });
            setTabs((ts) => [...ts, { path: p, name: p.split('/').pop(), content: r.content, dirty: false }]);
            activity(`打开文件 ${p}（${String(r?.content || '').length}B）`, 'ok');
          } catch (e) { setStatus(String(e?.message || e)); return; }
        }
        setActivePath(p);
      };
      const closeTab = (p) => {
        setTabs((ts) => ts.filter((t) => t.path !== p));
        if (activePath === p) setActivePath('');
      };
      const save = async () => {
        const t = tabsRef.current.find((x) => x.path === activeRef.current);
        const ed = editorRef.current;
        if (!t) return;
        const value = ed ? ed.getValue() : (taRef.current ? taRef.current.value : t.content);
        try {
          await api('writeFile', { node, space: sp, path: t.path, content: value });
          activity(`保存文件 ${t.path}（${String(value || '').length}B）`, 'ok');
          setTabs((ts) => ts.map((x) => x.path === t.path ? { ...x, content: value, dirty: false } : x));
          setStatus(zh ? `已保存 ${t.path}` : `saved ${t.path}`);
          refreshGit();
        } catch (e) { setStatus(String(e?.message || e)); }
      };
      saveRef.current = save;

      const ideKey = `${node || ''}:${space || ''}`;
      const [ideVersion, setIdeVersion] = useState(0);
      useEffect(() => {
        (async () => {
          try {
            const st = await api('stateGet');
            const remote = st && st.ideOpen;
            if (!remote || typeof remote !== 'object') return;
            const local = readIdeOpen();
            let changed = false;
            for (const k of Object.keys(remote)) { if (!local[k]) { local[k] = remote[k]; changed = true; } }
            if (changed) { cxWrite('ide-open', local); setIdeVersion((v) => v + 1); }
          } catch {}
        })();
      }, []);
      const readIdeOpen = () => cxRead('ide-open', {});
      useEffect(() => {
        if (!node) return;
        restorePendingRef.current = true;
        setStatus('');
        (async () => {
          try {
            const list = await api('tree', { node, space, path: '' });
            setDirs({ '': list }); setExpanded({ '': true });
          } catch {}
        })();
        const openDefault = async () => {
          for (const p of ['src/main.shy', 'main.shy', 'src/main.go']) {
            try {
              const r = await api('readFile', { node, space: sp, path: p });
              setTabs([{ path: p, name: p.split('/').pop(), content: r.content, dirty: false }]);
              setActivePath(p);
              return;
            } catch { /* try next */ }
          }
          setTabs([]); setActivePath('');
        };
        const saved = readIdeOpen()[ideKey];
        if (!saved || !Array.isArray(saved.tabs) || !saved.tabs.length) { openDefault(); restorePendingRef.current = false; return; }
        let disposed = false;
        (async () => {
          const out = [];
          for (const raw of saved.tabs.slice(0, 12)) {
            const p = String(raw || '').replace(/^\/+/, '');
            if (!p) continue;
            try { const r = await api('readFile', { node, space: sp, path: p }); out.push({ path: p, name: p.split('/').pop(), content: r.content, dirty: false }); } catch { /* skip missing */ }
          }
          if (disposed) { restorePendingRef.current = false; return; }
          if (!out.length) { await openDefault(); restorePendingRef.current = false; return; }
          setTabs(out);
          setActivePath(out.some((t) => t.path === String(saved.active || '').replace(/^\/+/, '')) ? String(saved.active || '').replace(/^\/+/, '') : (out[0] ? out[0].path : ''));
          restorePendingRef.current = false;
        })();
        return () => { disposed = true; };
      }, [node, space, ideVersion]);
      useEffect(() => {
        if (!node || restorePendingRef.current) return;
        try {
          const all = readIdeOpen();
          all[ideKey] = { tabs: tabs.map((t) => t.path), active: activePath };
          cxWrite('ide-open', all);
          try { api('stateSet', { name: 'ideOpen', value: all }).catch(() => {}); } catch {}
        } catch {}
      }, [tabs, activePath, node, space]);

      useEffect(() => {
        let disposed = false; let ed = null;
        (async () => {
          try {
            const monaco = await loadMonaco();
            if (disposed || !editorHostRef.current) return;
            monacoRef.current = monaco;
            registerShyLang(monaco);
            ed = monaco.editor.create(editorHostRef.current, { value: '', theme: theme === 'light' ? 'vs' : 'vs-dark', automaticLayout: true, fontSize: 12, minimap: { enabled: false }, scrollBeyondLastLine: false, tabSize: 4 });
            editorRef.current = ed;
            ed.onDidChangeModelContent(() => {
              const p = activeRef.current;
              if (!p) return;
              const v = ed.getValue();
              setTabs((ts) => ts.map((t) => (t.path === p && t.content !== v ? { ...t, content: v, dirty: true } : t)));
            });
            ed.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => saveRef.current());
            ed.onDidChangeCursorPosition((ev) => { try { setCursor({ line: ev.position.lineNumber, column: ev.position.column }); } catch {} });
            const cur = tabsRef.current.find((t) => t.path === activeRef.current);
            if (cur) {
              ed.setValue(cur.content);
              try { if (ed.getModel()) monaco.editor.setModelLanguage(ed.getModel(), 'plaintext'); } catch {}
            }
            setEditorErr('');
          } catch (e) { setEditorErr(String(e?.message || e)); }
        })();
        return () => { disposed = true; try { ed && ed.dispose(); } catch {} };
      }, []);

      useEffect(() => {
        const m = monacoRef.current;
        if (!m || !m.editor) return;
        try { m.editor.setTheme(theme === 'light' ? 'vs' : 'vs-dark'); } catch {}
      }, [theme]);
      useEffect(() => {
        const ed = editorRef.current, monaco = monacoRef.current;
        if (!ed || !activeTab) return;
        const lang = (() => {
          const ext = (activeTab.path.split('.').pop() || '').toLowerCase();
          return ({ go: 'go', js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript', json: 'json', css: 'css', html: 'html', md: 'markdown', sh: 'shell', yml: 'yaml', yaml: 'yaml', sql: 'sql', py: 'python', shy: 'shy' })[ext] || 'plaintext';
        })();
        if (ed.getValue() !== activeTab.content) ed.setValue(activeTab.content);
        try { if (monaco && ed.getModel()) monaco.editor.setModelLanguage(ed.getModel(), lang); } catch {}
      }, [activePath, activeTab && activeTab.path]);

      useEffect(() => {
        const nextKey = `${node}:${space}`;
        if (termKeyRef.current === nextKey && Object.keys(termMapRef.current).length) return;
        const prevKey = termKeyRef.current;
        if (prevKey && prevKey !== nextKey) persistTermBuf(prevKey);
        termPendingRef.current = true;
        let cancelled = false;
        (async () => {
          const remote = await readRemoteState();
          if (cancelled) return;
          const saved = (remote && remote.termBuf && remote.termBuf[nextKey]) || readTermBuf()[nextKey] || {};
          const ids = Array.isArray(saved.ids) && saved.ids.length ? saved.ids : [1];
          const texts = saved.texts || {};
          const cwd = (await api('spaceDir', { node, space: sp }).catch(() => ({ dir: '' }))).dir || '';
          if (cancelled) return;
          Object.keys(termMapRef.current).forEach((id) => {
            if (ids.map((x) => String(x)).includes(String(id))) return;
            const x = termMapRef.current[id];
            x.alive = false; try { x.timer && clearTimeout(x.timer); } catch {}
            try { x.ws && x.ws.close(); } catch {}
            try { x.term && x.term.dispose(); } catch {}
            delete termMapRef.current[id];
          });
          ids.forEach((id) => {
            const x = termMapRef.current[id];
            if (!x) return;
            x.key = nextKey; x.cwd = cwd;
            try { x.term.reset(); } catch {}
            const t = texts[id] || '';
            try { if (t) x.term.write(t); } catch {}
            x.text = t;
            try { x.openWs && x.openWs(cwd); } catch {}
          });
          termKeyRef.current = nextKey;
          restoreTextRef.current = texts;
          termPendingRef.current = false;
          setTermIds(ids); setTermActive(ids[0]); setTermErr(''); setTermTab('term');
        })();
        return () => { cancelled = true; termPendingRef.current = false; };
      }, [node, space]);
      useEffect(() => {
        if (termPendingRef.current) return;
        let cancelled = false;
        (async () => {
          try {
            ensureCss('/contextos-devops-dsh/xterm/xterm.css');
            const evalScript = async (src) => {
              const code = await (await fetch(src)).text();
              const fn = new Function('module', 'exports', 'define', 'require', 'window', 'self', 'globalThis', code);
              fn(undefined, undefined, undefined, undefined, window, window, window);
            };
            if (!window.Terminal) { activity('加载终端 xterm', 'info'); await evalScript('/contextos-devops-dsh/xterm/xterm.js'); activity('终端 xterm 就绪', 'ok'); }
            if (!window.Terminal) throw new Error('xterm missing');
            if (!(window.FitAddon && window.FitAddon.FitAddon)) await evalScript('/contextos-devops-dsh/xterm/addon-fit.js').catch(() => {});
            const info = await api('spaceDir', { node, space: sp }).catch(() => ({ dir: '' }));
            for (const id of termIds) {
              if (termMapRef.current[id]) continue;
              const host = termHostsRef.current[id];
              if (!host) continue;
              const lightNow = (document.querySelector('.cx-shell') || {}).dataset?.theme === 'light';
              const termTheme = lightNow
                ? { background: '#ffffff', foreground: '#1d3a4a', cursor: '#0b7f9f', selectionBackground: 'rgba(11,127,159,.22)' }
                : { background: '#04101a', foreground: '#cfeff9', cursor: '#42f5a7' };
              const term = new window.Terminal({ fontSize: 12, fontFamily: 'Menlo, monospace', cursorBlink: true, convertEol: true, theme: termTheme });
              const fit = window.FitAddon && window.FitAddon.FitAddon ? new window.FitAddon.FitAddon() : null;
              if (fit) term.loadAddon(fit);
              term.open(host);
              const restored = restoreTextRef.current && restoreTextRef.current[id];
              if (restored) { try { term.write(restored); } catch {} }
              if (host.offsetParent) { try { fit && fit.fit(); } catch {} }
              let wsHost = location.host;
              let wsProto = location.protocol === 'https:' ? 'wss' : 'ws';
              if (!/^https?:$/.test(location.protocol)) {
                try { const o = await api('origin'); if (o && o.host) { wsHost = o.host; wsProto = 'ws'; } } catch {}
              }
              const state = { term, ws: null, fit, alive: true, timer: null, key: `${node}:${space}`, cwd: info.dir || '' };
              if (restored) state.text = restored;
              const openWs = (cwd) => {
                if (!state.alive) return;
                const url = `${wsProto}://${wsHost}/contextos-devops-dsh/terminal?cwd=${encodeURIComponent(cwd || '')}`;
                state.switching = true;
                try { state.ws && state.ws.close(); } catch {}
                state.switching = false;
                const ws = new WebSocket(url);
                state.ws = ws;
                ws.onmessage = (ev) => { if (ws !== state.ws) return; try { term.write(ev.data); } catch {}; state.text = String(state.text || '') + String(ev.data); if (state.text.length > 400000) state.text = state.text.slice(-200000); scheduleSave(); };
                ws.onclose = () => {
                  if (!state.alive || state.switching || ws !== state.ws) return;
                  state.ws = null;
                  state.fail = (state.fail || 0) + 1;
                  try {
                    term.write('\r\n[reconnecting…]\r\n');
                    if (state.fail === 3) term.write(`[terminal ${url}]\r\n`);
                  } catch {}
                  state.timer = setTimeout(() => openWs(state.cwd), 1000);
                };
                ws.onopen = () => { if (ws !== state.ws) return; state.fail = 0; };
                ws.onerror = () => {};
              };
              state.openWs = openWs;
              term.onData((d) => { const ws = state.ws; if (ws && ws.readyState === 1) ws.send(d); });
              openWs(state.cwd);
              termMapRef.current[id] = state;
              setTimeout(() => { try { fit && fit.fit(); } catch {} }, 150);
            }
            if (!cancelled) setTermErr('');
          } catch (e) { if (!cancelled) setTermErr(String(e?.message || e)); }
        })();
        const onResize = () => {
          const active = termMapRef.current[termActiveRef.current];
          if (active && active.term && active.term.element && active.term.element.offsetParent) { try { active.fit && active.fit.fit(); } catch {} }
        };
        window.addEventListener('resize', onResize);
        return () => { cancelled = true; window.removeEventListener('resize', onResize); };
      }, [termIds, node, space]);
      useEffect(() => {
        if (!showBottom || termTab !== 'term') return;
        const t = setTimeout(() => {
          const x = termMapRef.current[termActive];
          if (!x) return;
          try { x.fit && x.fit.fit(); } catch {}
          try { x.term && x.term.refresh(0, Math.max(0, x.term.rows - 1)); } catch {}
        }, 80);
        return () => clearTimeout(t);
      }, [showBottom, termTab, termActive, termIds]);
      useEffect(() => () => {
        persistTermBuf(termKeyRef.current);
        Object.values(termMapRef.current).forEach((x) => { x.alive = false; try { x.timer && clearTimeout(x.timer); } catch {}; try { x.ws && x.ws.close(); } catch {}; try { x.term && x.term.dispose(); } catch {} });
        termMapRef.current = {};
      }, []);

      const askName = (title, value = '') => new Promise((resolve) => setNameDlg({ title, value, resolve }));
      const fileColor = (name) => {
        const ext = (String(name).split('.').pop() || '').toLowerCase();
        return ({
          go: '#00d3d3', js: '#f7df1e', jsx: '#f7df1e', ts: '#3b9cff', tsx: '#3b9cff', json: '#f5c542',
          md: '#b07cff', css: '#42a5f5', scss: '#42a5f5', html: '#ff7043', htm: '#ff7043', sh: '#8bc34a',
          yml: '#7cb342', yaml: '#7cb342', py: '#4fc3f7', sql: '#f06292', png: '#ef5350', jpg: '#ef5350',
          jpeg: '#ef5350', gif: '#ef5350', svg: '#ffb74d', mod: '#00d3d3', sum: '#00d3d3', shy: '#b07cff',
        })[ext] || 'var(--cx-text-faint)';
      };
      const recentFiles = (() => { try { const m = readIdeOpen()[ideKey]; return (m && m.tabs) || []; } catch { return []; } })();
      const fileGlyph = (name) => {
        const ext = (String(name).split('.').pop() || '').toLowerCase();
        return ({ go: 'GO', js: 'JS', ts: 'TS', json: '{}', css: 'CS', html: '<>', md: 'MD', sh: '$', yml: 'YM', yaml: 'YM', sql: 'DB', py: 'PY' })[ext] || '·';
      };
      const dirOf = (entry) => (entry.type === 'dir' ? entry.path : entry.path.split('/').slice(0, -1).join('/'));
      const reloadDir = async (p) => {
        try { const list = await api('tree', { node, space: sp, path: p }); setDirs((d) => ({ ...d, [p]: list })); setExpanded((e) => ({ ...e, [p]: true })); } catch (e) { setStatus(String(e?.message || e)); }
      };
      const newEntry = async (entry, isDir) => {
        const dir = dirOf(entry);
        const name = await askName(zh ? (isDir ? '新文件夹名' : '新文件名') : (isDir ? 'Folder name' : 'File name'), '');
        if (!name) return;
        const target = [dir, name].filter(Boolean).join('/');
        try {
          if (isDir) await api('mkdir', { node, space: sp, path: target });
          else await api('writeFile', { node, space: sp, path: target, content: '' });
          await reloadDir(dir); refreshGit();
          if (!isDir) openFile(target);
        } catch (e) { setStatus(String(e?.message || e)); }
      };
      const renameEntry = async (entry) => {
        const dir = dirOf(entry);
        const name = await askName(zh ? '重命名为' : 'Rename to', entry.name);
        if (!name || name === entry.name) return;
        const target = [dir, name].filter(Boolean).join('/');
        try {
          await api('renamePath', { node, space: sp, from: entry.path, to: target });
          closeTab(entry.path);
          await reloadDir(dir); refreshGit();
        } catch (e) { setStatus(String(e?.message || e)); }
      };
      const removeEntry = async (entry) => {
        if (!window.confirm(zh ? `删除「${entry.name}」？` : `Delete "${entry.name}"?`)) return;
        const dir = dirOf(entry);
        try { await api('removePath', { node, space: sp, path: entry.path }); closeTab(entry.path); await reloadDir(dir); refreshGit(); }
        catch (e) { setStatus(String(e?.message || e)); }
      };
      const readPanes = () => cxRead('ide-panes', {});
      useEffect(() => {
        if (!node) return;
        const p = readPanes()[`${node}:${space}`];
        setShowLeft(p ? !!p.left : true);
        setShowRight(p ? !!p.right : false);
        setShowBottom(p ? !!p.bottom : false);
      }, [node, space]);
      useEffect(() => {
        if (!node) return;
        try { const all = readPanes(); all[`${node}:${space}`] = { left: showLeft, right: showRight, bottom: showBottom }; cxWrite('ide-panes', all); } catch {}
      }, [showLeft, showRight, showBottom, node, space]);
      const jumpLine = (line) => { const ed = editorRef.current; if (ed) { try { ed.revealLineInCenter(line); ed.setPosition({ lineNumber: line, column: 1 }); ed.focus(); } catch {} } };
      const gitMark = (p) => (git && git.files ? git.files[p] : '');
      const gitClass = (x) => (x === 'A' || x === '?' || x === '??' ? 'add' : x === 'D' ? 'del' : x === 'U' || x === 'UU' ? 'unt' : 'mod');
      const langOfPath = (p) => {
        const e = String(p || '').split('.').pop().toLowerCase();
        return ({ go: 'go', js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript', json: 'json', md: 'markdown', css: 'css', scss: 'scss', html: 'html', htm: 'html', sh: 'shell', yml: 'yaml', yaml: 'yaml', py: 'python', sql: 'sql', mod: 'go', sum: 'plaintext' })[e] || 'plaintext';
      };
      const symbolsOf = (text) => {
        const out = [];
        String(text || '').split('\n').forEach((ln, i) => {
          const m = ln.match(/^\s*func\s+(?:\([^)]*\)\s*)?([A-Za-z_]\w*)/) || ln.match(/^\s*(?:function|class|def|struct|interface|type)\s+([A-Za-z_]\w*)/);
          if (m) out.push({ label: m[1], hint: String(i + 1), icon: `<svg width='12' height='12' viewBox='0 0 16 16' fill='none' stroke='currentColor' stroke-width='1.4' stroke-linecap='round'><path d='M6 4.2c-1.2 0-1.6.7-1.6 1.7v1.3c0 .6-.3 1-.9 1.1.6.1.9.5.9 1.1v1.3c0 1 .4 1.7 1.6 1.7'/><path d='M10 4.2c1.2 0 1.6.7 1.6 1.7v1.3c0 .6.3 1 .9 1.1-.6.1-.9.5-.9 1.1v1.3c0 1-.4 1.7-1.6 1.7'/></svg>`, action: () => jumpLine(i + 1) });
        });
        return out;
      };
      const menuAt = (el) => { const r = el.getBoundingClientRect(); return { x: Math.max(8, r.left), y: r.bottom + 4 }; };
      const menuStyle = (m) => ({ left: m.x, top: m.y, maxHeight: Math.max(120, (typeof window !== 'undefined' ? window.innerHeight : 800) - m.y - 18), overflowY: 'auto', overscrollBehavior: 'contain' });
      const listDir = async (dirPath) => { try { return await api('tree', { node, space, path: dirPath }); } catch { return []; } };
      const dirItems = (dirPath, current) => ev => {
        const pos = menuAt(ev.currentTarget || ev.target);
        listDir(dirPath).then((list) => setCrumbMenu({ ...pos, items: (list || []).map((e) => ({
          label: e.name, hint: e.type === 'dir' ? 'dir' : '', icon: e.type === 'dir' ? dirIconHtml(false) : fileIconHtml(e.name),
          on: e.path === current || (e.type !== 'dir' && e.path === activePath),
          action: () => { if (e.type === 'dir') { setExpanded((m) => ({ ...m, [([dirPath, e.name].filter(Boolean).join('/'))]: true })); } else openFile(e.path); },
        })) }));
      };
      const addTerm = () => { const id = Math.max(0, ...termIds) + 1; setTermIds([...termIds, id]); setTermActive(id); setTermTab('term'); setTimeout(() => scheduleSave(), 0); };
      const termAct = (kind) => {
        const st = termMapRef.current[termActive];
        if (!st) return;
        if (kind === 'clear') { try { st.term.clear(); } catch {} }
        if (kind === 'refresh') { try { st.ws && st.ws.readyState === 1 && st.ws.send('clear\r'); } catch {} }
        if (kind === 'reconnect') { try { st.ws && st.ws.close(); } catch {}; try { st.openWs && st.openWs(st.cwd); } catch {} }
        if (kind === 'split') addTerm();
      };
      const closeTerm = (id) => {
        const x = termMapRef.current[id];
        if (x) { x.alive = false; try { x.timer && clearTimeout(x.timer); } catch {} }
        try { x && x.ws && x.ws.close(); } catch {}
        try { x && x.term && x.term.dispose(); } catch {}
        delete termMapRef.current[id];
        const rest = termIds.filter((t) => t !== id);
        const next = rest.length ? rest : [1];
        setTermIds(next);
        if (termActive === id) setTermActive(next[0]);
        setTimeout(() => scheduleSave(), 0);
      };
      const compile = async () => {
        if (!node || !space) return;
        setStatus(zh ? '编译中…' : 'compiling…');
        try {
          const r = await api('compile', { node, space });
          const out = String(r?.out || '');
          setStatus(r?.status === 200 ? (zh ? '编译完成' : 'compiled') : (zh ? '编译失败' : 'compile failed'));
          setTermOut((prev) => `${prev}$ compile\n${out}\n\n`);
          setTermTab('out');
        } catch (e) { setStatus(String(e?.message || e)); }
      };
      useEffect(() => {
        if (!treeMenu && !crumbMenu) return;
        const close = () => { setTreeMenu(null); setCrumbMenu(null); };
        window.addEventListener('click', close);
        window.addEventListener('scroll', close, true);
        return () => { window.removeEventListener('click', close); window.removeEventListener('scroll', close, true); };
      }, [treeMenu, crumbMenu]);
      const sortEntries = (list) => {
        const ORDER = ['src', 'etc', 'bin', 'var', 'usr'];
        const rank = (e) => { const i = ORDER.indexOf(e.name); return i < 0 ? 99 : i; };
        return (list || []).filter((e) => !String(e.name || '').startsWith('.')).slice().sort((a, b) => {
          if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
          if (a.type === 'dir') { const ra = rank(a), rb = rank(b); if (ra !== rb) return ra - rb; }
          return String(a.name).localeCompare(String(b.name));
        });
      };
      const renderDir = (p, depth) => sortEntries(dirs[p]).map((e) => {
        const isDir = e.type === 'dir';
        const key = (p ? p + '/' : '') + e.name;
        const open = !!expanded[key];
        return h(React.Fragment, { key },
          h('div', { className: `cx-tree-item${activePath === e.path ? ' on' : ''}`, style: { paddingLeft: 6 + depth * 12 }, onClick: () => (isDir ? toggleDir(key) : openFile(e.path)), onContextMenu: (ev) => { ev.preventDefault(); ev.stopPropagation(); setTreeMenu({ x: ev.clientX, y: ev.clientY, entry: e }); }, title: e.path },
            isDir ? h('span', { className: 'chev', dangerouslySetInnerHTML: chevHtml(open) }) : h('span', { className: 'chev' }),
            h('span', { className: 'fic', dangerouslySetInnerHTML: isDir ? dirIconHtml(open) : fileIconHtml(e.name) }),
            h('span', { className: 'nm' }, e.name),
            gitMark(e.path) ? h('span', { className: `cx-git-badge ${gitClass(gitMark(e.path))}` }, gitMark(e.path) === '??' ? 'U' : gitMark(e.path)) : null),
          isDir && open ? renderDir(key, depth + 1) : null);
      });

      const previewUrl = node && space ? `http://127.0.0.1:${node}/s/${space}/` : '';
      const previewKindOf = (p) => {
        const e = String(p || '').split('.').pop().toLowerCase();
        if (['html', 'htm', 'xhtml'].includes(e)) return 'html';
        if (['md', 'markdown', 'mdx'].includes(e)) return 'md';
        if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'ico'].includes(e)) return 'image';
        if (['txt', 'log', 'csv', 'json', 'yml', 'yaml', 'ini', 'conf', 'makefile', 'license'].includes(e)) return 'text';
        return 'page';
      };
      const pvKind = activePath ? previewKindOf(activePath) : 'page';

      return h('div', { className: 'cx-dev-wrap' },
        bg && bg.image ? h('div', { className: 'cx-chat-bg photo' }, h('img', { src: bg.image, alt: '' })) : null,
        h('div', { className: `cx-dev${showLeft ? '' : ' hide-left'}${showRight ? '' : ' hide-right'}${showBottom ? '' : ' hide-bottom'}`, style: { '--cx-preview-w': `${previewWidth}px` } },
        h('section', { className: 'cx-dev-col cx-dev-explorer' },
          h('div', { className: 'cx-dev-b' },
            !node
              ? h(EmptyState, { text: zh ? '先在服务节点/项目空间上点「编程」打开项目。' : 'Pick a node/space and click CODE.' })
              : h('div', { className: 'cx-tree' },
                h('div', { className: 'cx-tree-recent' },
                  h('div', { className: 'cx-tree-sect', onClick: () => setRecentOpen((v) => !v) }, h('span', { className: 'chev', dangerouslySetInnerHTML: chevHtml(recentOpen) }), zh ? '最近打开的文件' : 'RECENT'),
                  recentOpen && recentFiles.length ? recentFiles.slice(0, 8).map((p) => h('div', { key: 'r:' + p, className: `cx-tree-item${activePath === p ? ' on' : ''}`, style: { paddingLeft: 6 }, onClick: () => openFile(p) },
                    h('span', { className: 'chev' }),
                    h('span', { className: 'fic', dangerouslySetInnerHTML: fileIconHtml(p) }),
                    h('span', { className: 'nm' }, p.split('/').pop()))) : null),

                h('div', { className: 'cx-tree-sect', onClick: () => setTreeOpen((v) => !v) }, h('span', { className: 'chev', dangerouslySetInnerHTML: chevHtml(treeOpen) }), zh ? '资源管理器' : 'WORKSPACE',
                  h(IconButton, { name: 'refresh', className: 'cx-pm-refresh', style: { marginLeft: 'auto' }, onClick: (ev) => { ev.stopPropagation(); reloadDir(''); } }),
                  h(IconButton, { name: 'plus', className: 'cx-pm-op', onClick: (ev) => { ev.stopPropagation(); newEntry({ type: 'dir', path: '', name: '' }, false); }, title: zh ? '新建文件' : 'New file' })),
                treeOpen ? renderDir('', 0) : null,
                h(GitSections, { git, gitOpen, setGitOpen, gitHistOpen, setGitHistOpen, activePath, openFile, setStatus, zh }),
            status ? h('div', { className: 'cx-dev-status' }, status) : null))),
        h('section', { className: 'cx-dev-col cx-dev-editor' },
          h(EditorTabs, { tabs, activePath, setActivePath, closeTab }),
          h('div', { className: 'cx-crumb' },
            h('span', { className: 'seg', title: 'node', onClick: (ev) => { ev.stopPropagation(); setCrumbMenu({ ...menuAt(ev.currentTarget), items: (nodes || []).map((n) => ({ label: n.name || `:${n.port}`, hint: ':' + n.port, icon: nodeIconHtml(true), on: n.port === node, action: () => onSelectNode && onSelectNode(n.port) })) }); } }, h('span', { className: 'ci', dangerouslySetInnerHTML: nodeIconHtml(true) }), String(node || '')),
            h('span', { className: 'sep' }, '›'),
            h('span', { className: 'seg', title: 'space', onClick: (ev) => { ev.stopPropagation(); setCrumbMenu({ ...menuAt(ev.currentTarget), items: (spaces || []).map((x) => ({ label: x.name, hint: '', icon: spaceIconHtml(), on: x.name === space, action: () => onSelectSpace && onSelectSpace(x.name) })) }); } }, h('span', { className: 'ci', dangerouslySetInnerHTML: spaceIconHtml() }), space || ''),
            (activePath || '').split('/').filter(Boolean).map((seg, i, arr) => {
              const p = arr.slice(0, i + 1).join('/');
              const isFile = i === arr.length - 1;
              const dir = isFile ? arr.slice(0, -1).join('/') : p;
              return h(React.Fragment, { key: p },
                h('span', { className: 'sep' }, '›'),
                h('span', { className: `seg${isFile ? ' file' : ''}`, title: p, onClick: (ev) => { ev.stopPropagation(); const parent = p.split('/').slice(0, -1).join('/'); dirItems(parent, isFile ? activePath : p)(ev); } },
                  h('span', { className: 'ci', dangerouslySetInnerHTML: isFile ? fileIconHtml(seg) : dirIconHtml(true) }), seg));
            }),
            activeTab ? h(React.Fragment, null,
              h('span', { className: 'sep' }, '›'),
              h('span', { className: 'seg', title: 'symbols', onClick: (ev) => { ev.stopPropagation(); const items = symbolsOf(activeTab.content); if (items.length) setCrumbMenu({ ...menuAt(ev.currentTarget), items }); } },
                h('span', { className: 'ci' }, 'ƒ'), (symbolsOf(activeTab.content)[0] || {}).label || (zh ? '函数' : 'fn'))) : null,
            h('div', { className: 'cx-crumb-actions' },
              h('button', { className: 'cx-pm-op cx-pm-txt', onClick: compile, title: zh ? '编译当前项目' : 'Compile' }, zh ? '编译' : 'BUILD'),
              h(IconButton, { name: 'save', className: 'cx-pm-op', onClick: () => save(), title: zh ? '保存' : 'Save' }),
              h(IconButton, { name: 'refresh', className: 'cx-pm-op', onClick: () => { if (activePath) reloadDir(''); }, title: zh ? '重新加载目录' : 'Reload' }),
              h(IconButton, { name: 'copy', className: 'cx-pm-op', onClick: () => { try { navigator.clipboard.writeText([node, space, activePath].filter(Boolean).join(' / ')); } catch {} setStatus(zh ? '路径已复制' : 'path copied'); }, title: zh ? '复制路径' : 'Copy path' }),
              h('span', { className: 'cx-crumb-sep' }),
              h(IconButton, { name: 'panelLeft', className: `cx-pm-op${showLeft ? ' on' : ''}`, onClick: () => setShowLeft((v) => !v), title: zh ? '左侧栏' : 'Left panel' }),
              h(IconButton, { name: 'panelBottom', className: `cx-pm-op${showBottom ? ' on' : ''}`, onClick: () => setShowBottom((v) => !v), title: zh ? '输出栏' : 'Bottom panel' }),
              h(IconButton, { name: 'panelRight', className: `cx-pm-op${showRight ? ' on' : ''}`, onClick: () => setShowRight((v) => !v), title: zh ? '右侧栏' : 'Right panel' }))),
          h('div', { className: 'cx-dev-b cx-editor-wrap' },
            h('div', { className: 'cx-editor-host', ref: editorHostRef, style: editorErr ? { display: 'none' } : null }),
            editorErr ? h('textarea', {
              className: 'cx-editor-ta', ref: taRef, value: activeTab ? activeTab.content : '', spellCheck: false,
              onChange: (e) => { const v = e.target.value; setTabs((ts) => ts.map((t) => (t.path === activePath ? { ...t, content: v, dirty: true } : t))); },
            }) : null,
            editorErr ? h('div', { className: 'cx-dev-status err' }, `${editorErr} · ${zh ? '已回退到基础编辑器' : 'fallback editor'}`) : null)),
        h('section', { className: 'cx-dev-col cx-dev-preview' },
          h('div', { className: 'cx-preview-grip', onMouseDown: startResize, title: zh ? '拖动调整宽度' : 'Drag to resize' }),
          h(IconButton, { name: 'refresh', className: 'cx-pane-refresh', onClick: () => setPreviewNonce((v) => v + 1), title: T('刷新') }),
          h('div', { className: 'cx-dev-b cx-preview-wrap' },
            pvKind === 'md'
              ? h('div', { className: 'cx-preview-md' }, activeTab ? h(RichText, { text: activeTab.content }) : null)
              : pvKind === 'text'
                ? h('pre', { className: 'cx-preview-text' }, activeTab ? activeTab.content : '')
                : pvKind === 'html'
                  ? (activeTab ? h('iframe', { key: 'pv' + previewNonce + activePath, className: 'cx-preview-frame', srcDoc: activeTab.content, title: 'preview' }) : null)
                  : previewUrl && activeTab
                    ? h('iframe', { key: 'pv' + previewNonce, className: 'cx-preview-frame', src: previewUrl, title: 'preview' })
                    : h('div', { className: 'cx-empty cx-preview-empty' }, zh ? (activeTab ? '选择节点/项目空间后显示预览' : '打开文件后显示预览') : 'Open a file to preview'))),
        h('section', { className: 'cx-dev-col cx-dev-term' },
          h('div', { className: 'cx-dev-h cx-term-h' },
            h('div', { className: 'cx-term-tabs' },
              h('button', { className: `cx-term-tab${termTab === 'term' ? ' on' : ''}`, onClick: () => setTermTab('term') }, 'TERMINAL'),
              h('button', { className: `cx-term-tab${termTab === 'out' ? ' on' : ''}`, onClick: () => setTermTab('out') }, 'OUTPUT')),
            h('span', { className: 'cx-dev-hint' }, `${node || ''} · ${space || ''}`),
            h('div', { className: 'cx-term-sessions' },
              termIds.map((id) => h('span', { key: id, className: `cx-term-sess${id === termActive && termTab === 'term' ? ' on' : ''}`,
                onClick: () => { setTermActive(id); setTermTab('term'); setTimeout(() => { const x = termMapRef.current[id]; if (!x) return; try { x.fit && x.fit.fit(); } catch {}; try { x.term && x.term.refresh(0, Math.max(0, x.term.rows - 1)); } catch {}; try { x.term && x.term.focus(); } catch {} }, 80); } },
                h('span', { className: 'n' }, String(id)),
                termIds.length > 1 ? h(IconButton, { name: 'close', className: 'x', onClick: (ev) => { ev.stopPropagation(); closeTerm(id); } }) : null)),
              h(IconButton, { name: 'plus', className: 'cx-term-add', onClick: addTerm, title: zh ? '新建终端' : 'New terminal' })),
            h('div', { className: 'cx-term-acts' },
              h('button', { className: 'cx-term-act', onClick: () => termAct('refresh'), title: T('刷新') }, T('刷新')),
              h('button', { className: 'cx-term-act', onClick: () => termAct('clear'), title: T('清屏') }, T('清屏')),
              h('button', { className: 'cx-term-act', onClick: () => termAct('reconnect'), title: T('重连') }, T('重连')),
              h('button', { className: 'cx-term-act', onClick: () => termAct('split'), title: T('分屏') }, T('分屏')))),
          h('div', { className: 'cx-dev-b cx-term-wrap' },
            termTab === 'out'
              ? h('pre', { className: 'cx-term-out' }, termOut || (zh ? '（暂无输出，点上方「编译」生成）' : 'no output'))
              : termIds.map((id) => h('div', { key: id, className: 'cx-term-host', style: id === termActive ? null : { display: 'none' }, ref: (el) => { if (el) termHostsRef.current[id] = el; } })),
            termErr ? h('div', { className: 'cx-dev-status err' }, termErr) : null))),
        h('div', { className: 'cx-statusbar' },
          h('span', { className: 'sb-branch' }, `⎇ ${git && git.branch ? git.branch : '-'}`),
          git && git.ahead ? h('span', null, `↑${git.ahead}`) : null,
          h('span', null, `${git && git.changed ? git.changed : 0} 变更`),
          h('span', { className: 'sep' }),
          h('span', { className: 'sb-path' }, activePath || (zh ? '未打开文件' : 'no file')),
          h('span', null, activeTab && activeTab.dirty ? (zh ? '未保存' : 'unsaved') : (zh ? '已保存' : 'saved')),
          h('span', { className: 'spacer' }),
          h('span', null, `行 ${cursor.line}, 列 ${cursor.column}`),
          h('span', null, langOfPath(activePath)),
          h('span', null, 'UTF-8')),
        reqDetail ? h(Modal, { title: (zh ? '请求详情 / REQUEST' : 'REQUEST'), desc: '', onClose: () => setReqDetail(null) },
          h('div', { className: 'cx-req-detail' },
            h('div', { className: 'kv' },
              [['请求时间', new Date(reqDetail.at).toLocaleString()],
               ['耗时', `${reqDetail.ms} ms`],
               ['报文大小', `↑ ${reqDetail.reqBytes || 0} B · ↓ ${reqDetail.resBytes || 0} B`],
               ['Token', `${reqDetail.tokens || 0}${reqDetail.est ? '（估算）' : ''}`],
               ['金额', (() => { const u = reqDetail.usage || {}; const c = u.cost ?? u.total_cost ?? u.total_price; if (c !== undefined && c !== null) return String(c); const i = Number(u.input_tokens || u.prompt_tokens || 0); const o = Number(u.output_tokens || u.completion_tokens || 0); return (i || o) ? `≈¥${((i * 0.000002) + (o * 0.000008)).toFixed(6)}` : '—'; })()],
               ['模式 / 视图', `${reqDetail.mode || '-'} / ${(reqDetail.context && reqDetail.context.view) || '-'}`]].map(([k, v]) => h('div', { key: k, className: 'row' }, h('span', { className: 'k' }, k), h('span', { className: 'v' }, v)))),
            h('div', { className: 'cx-req-sect' }, zh ? '请求内容' : 'REQUEST'),
            h('pre', { className: 'cx-req-pre' }, String(reqDetail.message || '')),
            h('div', { className: 'cx-req-sect' }, zh ? '请求参数' : 'PARAMS'),
            h('pre', { className: 'cx-req-pre' }, (() => { try { return JSON.stringify(reqDetail.context || {}, null, 2); } catch { return ''; } })()),
            h('div', { className: 'cx-req-sect' }, zh ? '返回内容' : 'RESPONSE'),
            h('pre', { className: 'cx-req-pre' }, String(reqDetail.reply || '') + (reqDetail.action ? `\n\nACTION:\n${JSON.stringify(reqDetail.action, null, 2)}` : '')))) : null,
        nameDlg ? h('div', { className: 'cx-namedlg' },
          h('div', { className: 't' }, nameDlg.title),
          h('input', { className: 'cx-input', value: nameDlg.value, autoFocus: true,
            onChange: (e) => setNameDlg((d) => ({ ...d, value: e.target.value })),
            onKeyDown: (e) => { if (e.key === 'Enter') { const v = nameDlg.value; const r = nameDlg.resolve; setNameDlg(null); r(v); } if (e.key === 'Escape') { const r = nameDlg.resolve; setNameDlg(null); r(''); } } }),
          h('div', { className: 'b' },
            h('button', { className: 'cx-btn', onClick: () => { const r = nameDlg.resolve; setNameDlg(null); r(''); } }, T('取消')),
            h('button', { className: 'cx-btn pri', onClick: () => { const v = nameDlg.value; const r = nameDlg.resolve; setNameDlg(null); r(v); } }, T('保存')))) : null,
        crumbMenu ? h('div', { className: 'cx-tree-menu', style: menuStyle(crumbMenu), onClick: (e) => e.stopPropagation() },
          crumbMenu.items.map((it, i) => h('button', { key: i, className: `cx-menu-item${it.on ? ' on' : ''}`, onClick: () => { setCrumbMenu(null); it.action(); } },
            h('span', { className: 'mi', dangerouslySetInnerHTML: it.icon ? (typeof it.icon === 'string' ? { __html: it.icon } : it.icon) : { __html: '' } }),
            h('span', { className: 'lb' }, it.label), it.hint ? h('span', { className: 'hint' }, it.hint) : null)),
          crumbMenu.items.length > 8 ? h('div', { className: 'cx-menu-more' }, '↓ 更多内容，滚动查看') : null) : null,
        treeMenu ? h('div', { className: 'cx-tree-menu', style: menuStyle(treeMenu), onClick: (e) => e.stopPropagation() },
          h('button', { className: 'cx-menu-item', onClick: () => { const t = treeMenu.entry; setTreeMenu(null); newEntry(t, false); } }, zh ? '新建文件' : 'New file'),
          h('button', { className: 'cx-menu-item', onClick: () => { const t = treeMenu.entry; setTreeMenu(null); newEntry(t, true); } }, zh ? '新建文件夹' : 'New folder'),
          h('button', { className: 'cx-menu-item', onClick: () => { const t = treeMenu.entry; setTreeMenu(null); renameEntry(t); } }, zh ? '重命名' : 'Rename'),
          h('button', { className: 'cx-menu-item danger', onClick: () => { const t = treeMenu.entry; setTreeMenu(null); removeEntry(t); } }, zh ? '删除' : 'Delete')) : null);
    }

    // 统一下拉：按钮 + 固定定位弹层，所有选择器共用一套样式
