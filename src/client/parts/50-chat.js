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

    function ChatPanel({ open, booted, fx, onClose, nodes, node, spaces, space, apps, app, avatar, ideFile, view, mode, onModeChange, onRequest, webTabs, onOpenWebTab, onCloseWebTab, onNavWebTab, onReloadWebTab, onManageWebTab, full, docked, theme, locale, themeMode, setThemeMode, langMode, setLangMode, onToggleFull, onInit, onSelectNode, onSelectSpace, onSelectApp, onSelectAvatar, avatars, backgrounds, bg, onSelectBg, onCreateBg, onUploadBg, onUploadAvatar, onUpdateScene, onUpdateAvatar, onCreateAvatar, onRefresh, onOpenApp, onData, onStore, onDevices }) {
      const tt = (key) => term(locale, key);
      const sectionTitle = (cn, en) => locale === 'zh' ? `${cn} ${en}` : en;
      const modeLabel = (m) => locale === 'zh' ? m.name : ({ avatar: 'Digital Avatar', factory: 'Software Factory', iot: 'Cyber World' })[m.id] || m.name;
      const [pick, setPick] = useState(null);
      const [files, setFiles] = useState([]);
      const [showMore, setShowMore] = useState(false);
      const [folds, setFolds] = useState({ map: true, targets: false, plans: false, tasks: false, reports: false, feedbacks: false });
      useEffect(() => { try { localStorage.setItem('contextos-devops-dsh:folds', JSON.stringify(folds)); } catch {} }, [folds]);
      const fold = (k) => folds[k] === true;
      const [calFull, setCalFull] = useState(false);
      const calRef = useRef(null);
      const [mapFull, setMapFull] = useState(false);
      const mapApiRef = useRef(null);
      const mapSecRef = useRef(null);
      useEffect(() => { if (!mapFull) return; return cxMaxApply(mapSecRef.current, { bg: 'var(--cx-surface-1)', padding: 8 }); }, [mapFull]);
      useEffect(() => { if (!calFull) return; return cxMaxApply(calRef.current); }, [calFull]);
      useEffect(() => { if (!calFull) return; const close = (e) => { if (e.key === 'Escape') setCalFull(false); }; window.addEventListener('keydown', close); return () => window.removeEventListener('keydown', close); }, [calFull]);
      const [calStart, setCalStart] = useState('');
      const [calEnd, setCalEnd] = useState('');
      useEffect(() => { try { const prev = JSON.parse(localStorage.getItem('contextos-devops-dsh:cal') || '{}'); localStorage.setItem('contextos-devops-dsh:cal', JSON.stringify({ ...prev, start: calStart, end: calEnd })); } catch {} }, [calStart, calEnd]);
      const [planStatusFilter, setPlanStatusFilter] = useState([]);
      const [taskStatusFilter, setTaskStatusFilter] = useState([]);
      const [reportTypeFilter, setReportTypeFilter] = useState([]);
      const [feedbackStatusFilter, setFeedbackStatusFilter] = useState([]);
      const [pmForm, setPmForm] = useState(null);
      const sessionStateRef = useRef({ key: '', ready: false, msgs: [] });
      const seedingRef = useRef(false);
      const fileRef = useRef(null);
      const avatarImgRef = useRef(null);
      const bgImgRef = useRef(null);
      const [showLeft, setShowLeft] = useState(true);
      const [showRight, setShowRight] = useState(true);
      useEffect(() => { try { localStorage.setItem('contextos-devops-dsh:panels', JSON.stringify({ left: showLeft, right: showRight })); } catch {} }, [showLeft, showRight]);
      const [ctxMenu, setCtxMenu] = useState(null);
      const [sceneOpen, setSceneOpen] = useState(false);
      const [chatTab, setChatTab] = useState(() => { try { return localStorage.getItem('contextos-devops-dsh:chattab') || 'chat'; } catch { return 'chat'; } });
      useEffect(() => { try { localStorage.setItem('contextos-devops-dsh:chattab', chatTab); } catch {} }, [chatTab]);
      const [replyPop, setReplyPop] = useState(false);
      const [chatLoaded, setChatLoaded] = useState({});
      const [webMax, setWebMax] = useState(false);
      const [turn, setTurn] = useState(null);
      OPEN_LINK = (url, title) => { if (onOpenWebTab) onOpenWebTab(url, title); };
      useEffect(() => {
        const onMsg = (e) => {
          const d = e && e.data;
          if (!d || d.type !== 'ctx-open-url') return;
          const url = String(d.url || '');
          if (!/^https?:\/\//i.test(url)) return;
          const id = onOpenWebTab ? onOpenWebTab(url, url) : '';
          if (id) setChatTab(id);
        };
        window.addEventListener('message', onMsg);
        return () => window.removeEventListener('message', onMsg);
      }, [onOpenWebTab]);
      useEffect(() => { if (chatTab !== 'chat' && !(webTabs || []).some((t) => t.id === chatTab)) setChatTab('chat'); }, [webTabs, chatTab]);
      const [avatarEditOpen, setAvatarEditOpen] = useState(false);
      const openCtx = (e, kind) => { e.preventDefault(); e.stopPropagation(); setCtxMenu({ x: e.clientX, y: e.clientY, kind }); };
      useEffect(() => {
        if (!ctxMenu) return;
        const close = () => setCtxMenu(null);
        const esc = (e) => { if (e.key === 'Escape') close(); };
        window.addEventListener('click', close);
        window.addEventListener('scroll', close, true);
        window.addEventListener('keydown', esc);
        return () => { window.removeEventListener('click', close); window.removeEventListener('scroll', close, true); window.removeEventListener('keydown', esc); };
      }, [ctxMenu]);
      const modeIntro = (m) => (m ? (locale === 'zh' ? m.intro : (m.introEn || m.intro)) : '');
      const modeQuick = (m) => (m ? (locale === 'zh' ? m.quick : (m.quickEn || m.quick)) : []);
      const [msgs, setMsgs] = useState([{ role: 'ai', text: modeIntro(CHAT_MODES[0]) }]);
      const inputRef = useRef(null);
      const [mapTheme, setMapTheme] = useState(theme === 'light' ? 'light' : 'dark');
      useEffect(() => { setMapTheme(theme === 'light' ? 'light' : 'dark'); }, [theme]);
      const draftTimerRef = useRef(null);
      const initialDraft = (() => { try { return localStorage.getItem('contextos-devops-dsh:draft') || ''; } catch { return ''; } })();
      useEffect(() => {
        const onKey = (e) => {
          if ((e.metaKey || e.ctrlKey) && String(e.key).toLowerCase() === 'k') {
            e.preventDefault();
            inputRef.current?.focus();
          }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
      }, []);
      const [step, setStep] = useState(null);
      const [busy, setBusy] = useState(false);
      useEffect(() => {
        if (!open || busy) return;
        try { inputRef.current?.focus({ preventScroll: true }); } catch {}
      }, [busy, open]);
      const endRef = useRef(null);

      const { targetId, setTargetId, planId, setPlanId, taskId, setTaskId, reportId, setReportId, feedbackId, setFeedbackId } = usePmSelection({ avatarUid: avatar?.uid || '' });
      const pmNode = node || (nodes || []).find((n) => n.state === 'running')?.port || (nodes || [])[0]?.port || 0;
      const [traceIds, setTraceIds] = useState([]);
      const [traceLog, setTraceLog] = useState('');
      const traceTimerRef = useRef(0);
      const { pm, pmError, pmRefreshing, loadPm } = usePmData({ node: pmNode, avatarUid: avatar?.uid || '', locale, targetId, planId, taskId, reportId });
      useEffect(() => {
        const onJump = (e) => {
          const uid = String(e?.detail?.uid || '');
          if (!uid) return;
          setTargetId(uid); setPlanId(''); setTaskId(''); setReportId(''); setFeedbackId('');
        };
        window.addEventListener('cx-select-target', onJump);
        return () => window.removeEventListener('cx-select-target', onJump);
      }, []);
      useEffect(() => {
        const onTrace = (e) => {
          setTraceIds(Array.isArray(e?.detail?.uids) ? e.detail.uids : []);
          setTraceLog(String(e?.detail?.logId || ''));
          clearTimeout(traceTimerRef.current);
          traceTimerRef.current = setTimeout(() => { setTraceIds([]); setTraceLog(''); }, 3200);
        };
        window.addEventListener('cx-trace', onTrace);
        return () => { clearTimeout(traceTimerRef.current); window.removeEventListener('cx-trace', onTrace); };
      }, []);
      useEffect(() => {
        if (!open || !avatar?.uid || !pm?.project || (pm.targets || []).length || seedingRef.current) return;
        seedingRef.current = true;
        api('seedProject', { node: pmNode, uid: avatar.uid }).then(() => loadPm()).catch(() => {}).finally(() => { seedingRef.current = false; });
      }, [open, pm?.project?.place_uid, pm?.targets?.length, pmNode, avatar?.uid, loadPm]);
      const targets = pm?.targets || [];
      const activeTarget = targets.find((t) => t.uid === targetId) || targets[0] || null;
      const allPlans = sortPmItems(pm?.plans || []);
      const plans = allPlans.filter((p) => !planStatusFilter.length || planStatusFilter.includes(p.status_name));
      const activePlan = plans.find((p) => p.uid === planId) || plans[0] || null;
      const allTasks = sortPmItems(pm?.tasks || []);
      const tasks = allTasks.filter((t) => (!taskStatusFilter.length || taskStatusFilter.includes(t.status_name)) && (() => { const d = String(t.created_at || '').slice(0, 10); return (!calStart || d >= calStart) && (!calEnd || d <= calEnd); })());
      const activeTask = tasks.find((t) => t.uid === taskId) || tasks[0] || null;
      const allReports = pm?.reports || [];
      const reports = allReports.filter((r) => !reportTypeFilter.length || reportTypeFilter.includes(r.type_name));
      const activeReport = reports.find((r) => r.uid === reportId) || reports[0] || null;
      const allFeedbacks = pm?.feedbacks || [];
      const feedbacks = allFeedbacks.filter((f) => !feedbackStatusFilter.length || feedbackStatusFilter.includes(f.status_name));
      const activeFeedback = feedbacks.find((f) => f.uid === feedbackId) || feedbacks[0] || null;
      const planStatusOptions = pmFilterOptions(allPlans, 'status_name');
      const taskStatusOptions = pmFilterOptions(allTasks, 'status_name');
      const reportTypeOptions = pmFilterOptions(allReports, 'type_name');
      const feedbackStatusOptions = pmFilterOptions(allFeedbacks, 'status_name');
      const calOnChange = useCallback((a, b) => { setCalStart(a); setCalEnd(b); }, []);
      const sessionKey = `contextos-devops-dsh:chat:${avatar?.uid || 'anon'}:${activePlan?.uid || 'none'}`;
      useEffect(() => {
        /* 兜底：即使加载到旧样式（!important 12px），也强制输入框为 13px */
        const el = inputRef.current;
        if (!el) return;
        try {
          el.style.setProperty('font-size', '13px', 'important');
          el.style.setProperty('line-height', '1.65', 'important');
        } catch {}
      }, [sessionKey]);
      useEffect(() => {
        if (!open) return;
        const t = setTimeout(() => { try { inputRef.current?.focus({ preventScroll: true }); } catch {} }, 60);
        return () => clearTimeout(t);
      }, [open, sessionKey]);

      const scrollKeyOf = () => `contextos-devops-dsh:scroll:${sessionKey}`;
      const scrollRestorePendingRef = useRef(true);
      const scrollSaveTimer = useRef(null);
      useEffect(() => { scrollRestorePendingRef.current = true; }, [sessionKey]);
      useEffect(() => {
        const el = endRef.current;
        if (!el) return;
        if (scrollRestorePendingRef.current) {
          scrollRestorePendingRef.current = false;
          try { const v = Number(localStorage.getItem(scrollKeyOf()) || '0'); el.scrollTop = v > 0 ? v : el.scrollHeight; }
          catch { el.scrollTop = el.scrollHeight; }
          return;
        }
        el.scrollTop = el.scrollHeight;
      }, [msgs, busy, open]);
      const onMsgScroll = (e) => {
        const el = e.currentTarget;
        clearTimeout(scrollSaveTimer.current);
        scrollSaveTimer.current = setTimeout(() => { try { localStorage.setItem(scrollKeyOf(), String(Math.round(el.scrollTop))); } catch {} }, 300);
      };
      useEffect(() => {
        (async () => {
          try {
            let local = null;
            try { local = JSON.parse(localStorage.getItem(sessionKey) || 'null'); } catch {}
            if (Array.isArray(local) && local.length) return;
            const st = await api('stateGet');
            const remote = st && st['chat:' + sessionKey];
            if (Array.isArray(remote) && remote.length) {
              setMsgs(remote);
              try { localStorage.setItem(sessionKey, JSON.stringify(remote)); } catch {}
            }
          } catch {}
        })();
      }, [sessionKey]);
      const chatReady = !!avatar?.project && !!pm?.project;
      const chatWebTab = chatTab !== 'chat' ? (webTabs || []).find((t) => t.id === chatTab) : null;
      const [addr, setAddr] = useState('');
      const [navHist, setNavHist] = useState({});
      const histKey = chatWebTab ? chatWebTab.id : '';
      const hist = navHist[histKey] || null;
      useEffect(() => { setAddr(chatWebTab?.base || chatWebTab?.url || ''); }, [chatWebTab?.id, chatWebTab?.base]);
      useEffect(() => { if (chatWebTab) setNavHist((h) => (h[chatWebTab.id] ? h : { ...h, [chatWebTab.id]: { list: [chatWebTab.base || chatWebTab.url], idx: 0 } })); }, [chatWebTab?.id]);
      const pushHist = (url) => setNavHist((h) => {
        const cur = h[histKey] || { list: [], idx: -1 };
        const list = cur.list.slice(0, cur.idx + 1);
        if (list[list.length - 1] !== url) list.push(url);
        return { ...h, [histKey]: { list, idx: list.length - 1 } };
      });
      const go = (raw) => {
        const t = String(raw || '').trim();
        if (!t || !chatWebTab) return;
        const full = /^https?:\/\//i.test(t) ? t : `http://${t}`;
        pushHist(full);
        onNavWebTab && onNavWebTab(chatWebTab.id, full);
      };
      const back = () => { const cur = navHist[histKey]; if (!cur || cur.idx <= 0 || !chatWebTab) return; const url = cur.list[cur.idx - 1]; setNavHist((h) => ({ ...h, [histKey]: { ...cur, idx: cur.idx - 1 } })); onNavWebTab && onNavWebTab(chatWebTab.id, url); };
      const fwd = () => { const cur = navHist[histKey]; if (!cur || cur.idx >= cur.list.length - 1 || !chatWebTab) return; const url = cur.list[cur.idx + 1]; setNavHist((h) => ({ ...h, [histKey]: { ...cur, idx: cur.idx + 1 } })); onNavWebTab && onNavWebTab(chatWebTab.id, url); };
      const [pmBooted, setPmBooted] = useState(false);
      useEffect(() => { if (pm) setPmBooted(true); }, [pm]);
      useEffect(() => { const t = setTimeout(() => setPmBooted(true), 1500); return () => clearTimeout(t); }, []);
      const planReady = !!activePlan;
      useEffect(() => {
        if (!open) return;
        const prev = sessionStateRef.current;
        if (prev.key && prev.ready) {
          try { localStorage.setItem(prev.key, JSON.stringify(prev.msgs)); } catch {}
        }
        let saved = null;
        try { saved = JSON.parse(localStorage.getItem(sessionKey) || 'null'); } catch {}
        const next = Array.isArray(saved) && saved.length ? saved : [{ role: 'ai', text: modeIntro(CHAT_MODES.find((x) => x.id === mode)) || modeIntro(CHAT_MODES[0]) }];
        sessionStateRef.current = { key: sessionKey, ready: false, msgs: next };
        setMsgs(next);
      }, [sessionKey, open]);
      useEffect(() => {
        if (!open) return;
        const cur = sessionStateRef.current;
        if (cur.key !== sessionKey) return;
        if (!cur.ready) { cur.ready = true; cur.msgs = msgs; return; }
        cur.msgs = msgs;
        try { localStorage.setItem(sessionKey, JSON.stringify(msgs)); } catch {}
        try { api('stateSet', { name: 'chat:' + sessionKey, value: msgs.slice(-100).map((m) => ({ role: m.role, text: String(m.text || '').slice(0, 4000), t: m.t || '' })) }).catch(() => {}); } catch {}
      }, [msgs, sessionKey, open]);

      const push = (role, text, meta) => setMsgs((xs) => [...xs, { role, text, ...(meta || {}), t: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
      const ai = (text, meta) => push('ai', text, meta);
      const aiCard = (text, card, meta) => push('ai', text, { ...(meta || {}), card });
      const pmPortalUrl = (kind = '', uid = '') => {
        if (!node || !space) return '';
        const projectUid = pm?.project?.place_uid || '';
        if (!projectUid) return '';
        const base = `http://localhost:${node}/s/${space}/c/web.team.xiangmuguanli.portal?project_uid=${projectUid}`;
        if (!kind || !uid) return base;
        return `${base}#${projectUid}:web.team.xiangmuguanli.${kind}:${uid}`;
      };
      const switchMode = (m) => {
        if (m === mode) return;
        onModeChange(m);
        setShowMore(false);
      };
      const run = async (label, fn) => {
        setBusy(true); push('sys', label);
        try { return await fn(); }
        catch (e) { ai(`失败：${String(e?.message || e)}`); return undefined; }
        finally { setBusy(false); }
      };
      const deploy = async (port) => {
        const r = await run(`DEPLOY :${port}`, async () => {
          await api('deploy', { port: Number(port), mode: 'copy' });
          await onRefresh();
          onSelectNode(Number(port));
          return true;
        });
        if (r) { ai(`节点 :${port} 已部署。\n下一步：创建项目空间，例如「创建空间 demo」。`); setStep(null); }
      };
      const createSpace = async (name) => {
        if (!node) { ai('还没有选中节点。先说「部署 9188 节点」，或点左侧节点。'); return; }
        const r = await run(`WORKSPACE ${name}`, async () => {
          const created = await api('createSpace', { node, name });
          await api('initSpace', { node, space: created.name });
          await onRefresh();
          onSelectNode(node); onSelectSpace(created.name);
          return created;
        });
        if (r) { ai(`空间 ${r.name} 已创建并 git init。\n下一步：生成应用，例如「生成员工管理」。`); setStep(null); }
      };
      const generate = async (spec) => {
        if (!space) { ai('还没有选中项目空间。先说「创建空间 demo」，或点中间空间。'); return; }
        const raw = typeof spec === 'string' ? { name: spec } : (spec || {});
        const employee = /员工|employee|yuangong/i.test(String(raw.name || '')) || /员工/.test(String(raw.help || ''));
        const base = employee
          ? { name: 'yuangong', help: '员工管理', place: 'employee', value: 'profile,position,skill,experience,education,record', trans: '员工信息，工作岗位，专业技能，工作经验，教育经历，事件记录' }
          : { name: 'app', help: '应用', place: 'profile', value: 'profile', trans: '简介' };
        const preset = { ...base, ...raw };
        if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(preset.name || '')) { ai('应用名需要字母开头，只用字母/数字/下划线。'); return; }
        const r = await run(`GENERATE ${preset.name}`, async () => {
          const out = await api('autogenApp', { node, space, name: preset.name, help: preset.help, place: preset.place, value: preset.value, trans: preset.trans });
          await onRefresh();
          return out;
        });
        if (r) {
          ai(`应用「${r.help}」已生成。\ncommand: ${r.command}\n${r.built ? '编译完成，可直接打开。' : '编译未完成：' + (r.warning || '未知原因')}`);
        }
      };
      const executeAction = async (action) => {
        if (!action || typeof action !== 'object') return;
        const op = String(action.op || '');
        const args = action.args && typeof action.args === 'object' ? action.args : {};
        const ctxApp = app || null;
        const ctxSpace = space || ctxApp?.space || '';
        if (op === 'sshHosts') {
          return run('SSH HOSTS', async () => {
            const r = await api('sshHosts');
            const hs = (r && r.knownHosts) || [];
            const sv = (r && r.services) || [];
            ai(`找到 ${sv.length} 个 SSH 服务${sv.length ? '（' + sv.slice(0, 6).map((x) => x.name).join('、') + '…）' : ''}，${hs.length} 台连接过的设备`);
            return r;
          });
        }
        if (op === 'sysControl') {
          const act = String(args.action || '').toLowerCase();
          const val = args.value == null ? '' : args.value;
          return run(`SYS ${act}`, async () => {
            const r = await api('sysControl', { action: act, value: val });
            ai(`已执行 ${act}：${String(r?.result == null ? '' : r.result).slice(0, 300)}`);
            return r;
          });
        }
        if (op === 'deploy') return deploy(Number(args.port) || 9188);
        if (op === 'officialSpaces') {
          const keys = (Array.isArray(args.keys) ? args.keys : [args.name]).map((k) => OFFICIAL_KEY[k] || k).filter(Boolean);
          if (!keys.length) { ai('要部署哪个标准空间？云社区/云办公/云研发/云知识/…'); return; }
          return run(`DEPLOY OFFICIAL ${keys.join(',')}`, async () => { await api('officialSpaces', { node, keys }); await onRefresh(); });
        }
        if (op === 'createSpace' && OFFICIAL_KEY[args.name]) {
          return run(`DEPLOY OFFICIAL ${args.name}`, async () => { await api('officialSpaces', { node, keys: [OFFICIAL_KEY[args.name]] }); await onRefresh(); });
        }
        if (op === 'createSpace') return createSpace(String(args.name || 'project'));
        if (op === 'initSpace') {
          const target = String(args.space || space || '');
          if (!target) { ai('当前没有项目空间。'); return; }
          return run(`INIT ${target}`, async () => { await api('initSpace', { node, space: target }); await onRefresh(); });
        }
        if (op === 'autogenApp') return generate(args);
        if (op === 'createInstance') {
          const target = (apps || []).find((a) => a.name === args.name) || app;
          if (!target) { ai('没找到要建实例的应用，先生成/选择一个应用。'); return; }
          const targetSpace = target.space || space || '';
          return run(`INSTANCE ${target.name}`, async () => {
            await api('createInstance', { node, space: targetSpace, command: target.command, place: target.place || args.place || '', name: args.name || target.title || '我的应用', city: args.city || avatar?.city || '深圳市', company: args.company || avatar?.company || '云轩领航', uid: avatar?.uid || '' });
            await onRefresh();
          });
        }
        if (op === 'buildSpace') {
          const target = String(args.space || space || '');
          if (!target) { ai('当前没有项目空间。'); return; }
          return run(`BUILD ${target}`, async () => { await api('buildSpace', { node, space: target }); await onRefresh(); });
        }
        if (op === 'openApp') {
          const target = (apps || []).find((a) => a.name === args.name) || app;
          if (target) onOpenApp(target); else ai('没有找到这个应用，先在应用列表里选一个。');
          return;
        }
        if (op === 'openNode') {
          window.open(`http://127.0.0.1:${Number(args.port) || node}/`, '_blank', 'noopener');
          return;
        }
        if (op === 'listApps') {
          const list = (apps || []).slice(0, 8).map((a) => `· ${a.title || a.name}  [${a.name}]`).join('\n');
          ai(list ? `最近应用：\n${list}` : '当前空间还没有应用。');
          return;
        }
        if (op === 'code') {
          const target = (apps || []).find((a) => a.name === args.name) || app;
          if (target) setModal('code'); else ai('先在应用列表里选一个应用。');
          return;
        }
        if (op === 'pmCreate') {
          return run(`PM CREATE ${args.kind || ''}`, async () => {
            const d = await api('pmCreate', { node, uid: avatar?.uid || '', kind: args.kind || '', title: args.title || '', content: args.content || '', target_uid: args.target_uid || activeTarget?.uid || '', plan_uid: args.plan_uid || activePlan?.uid || '', task_uid: args.task_uid || activeTask?.uid || '', report_uid: args.report_uid || activeReport?.uid || '', begin_time: args.begin_time || '', end_time: args.end_time || '', report_type: args.report_type || 'daily', score: args.score || '5', feedback_status: args.feedback_status || 'canFinish' });
            await loadPm();
            const kindLabel = PM_KIND_LABEL[args.kind] || PM_SHORT[args.kind] || args.kind || '项目数据';
            const rows = [['类型', kindLabel], ['标题', args.title || '—'], ['UID', d.uid ? String(d.uid).slice(0, 12) + '…' : '—']];
            if (args.begin_time) rows.push(['开始', args.begin_time]);
            if (args.end_time) rows.push(['结束', args.end_time]);
            aiCard(`已添加${kindLabel}`, { title: `${kindLabel}创建成功`, rows, link: pmPortalUrl(args.kind, d.uid) ? { label: '打开项目管理', url: pmPortalUrl(args.kind, d.uid) } : null });
          });
        }
        if (op === 'pmList' || op === 'pmTree') {
          return run('PM TREE', async () => { await loadPm(); const rows = [['目标', String((pm?.targets || []).length)], ['计划', String((pm?.plans || []).length)], ['任务', String((pm?.tasks || []).length)], ['报告', String((pm?.reports || []).length)], ['反馈', String((pm?.feedbacks || []).length)]]; aiCard('项目数据已刷新', { title: '项目管理概览', rows, link: pmPortalUrl(args.kind, d.uid) ? { label: '打开项目管理', url: pmPortalUrl(args.kind, d.uid) } : null }); });
        }
        if (op === 'pmModify' || op === 'pmUpdate') {
          return run(`PM MODIFY ${args.kind || ''}`, async () => {
            const itemUid = args.item_uid || (args.kind === 'target' ? activeTarget?.uid : args.kind === 'plan' ? activePlan?.uid : args.kind === 'task' ? activeTask?.uid : args.kind === 'report' ? activeReport?.uid : activeFeedback?.uid) || '';
            await api('pmModify', { node, uid: avatar?.uid || '', kind: args.kind || '', item_uid: itemUid, title: args.title || '', content: args.content || '', begin_time: args.begin_time || '', end_time: args.end_time || '', report_type: args.report_type || '', score: args.score || '', feedback_status: args.feedback_status || '' });
            await loadPm();
            aiCard(`已更新${PM_KIND_LABEL[args.kind] || '项目数据'}`, { title: '更新成功', rows: [['类型', PM_KIND_LABEL[args.kind] || args.kind || '项目数据'], ['标题', args.title || '—']], link: pmPortalUrl(args.kind, d.uid) ? { label: '打开项目管理', url: pmPortalUrl(args.kind, d.uid) } : null });
          });
        }
        if (op === 'pmRemove' || op === 'pmDelete') {
          return run(`PM REMOVE ${args.kind || ''}`, async () => {
            const itemUid = args.item_uid || (args.kind === 'target' ? activeTarget?.uid : args.kind === 'plan' ? activePlan?.uid : args.kind === 'task' ? activeTask?.uid : args.kind === 'report' ? activeReport?.uid : activeFeedback?.uid) || '';
            await api('pmRemove', { node, uid: avatar?.uid || '', kind: args.kind || '', item_uid: itemUid });
            await loadPm();
            aiCard(`已删除${PM_KIND_LABEL[args.kind] || '项目数据'}`, { title: '删除成功', rows: [['类型', PM_KIND_LABEL[args.kind] || args.kind || '项目数据']], link: pmPortalUrl(args.kind, d.uid) ? { label: '打开项目管理', url: pmPortalUrl(args.kind, d.uid) } : null });
          });
        }
        if (op === 'projectStatus') {
          return run('PROJECT STATUS', async () => { const d = await api('projectStatus', { node, uid: avatar?.uid || '' }); const rows = [['目标', String(d.counts?.target || 0)], ['计划', String(d.counts?.plan || 0)], ['任务', String(d.counts?.task || 0)], ['报告', String(d.counts?.report || 0)], ['反馈', String(d.counts?.feedback || 0)]]; aiCard(`项目：${d.project?.name || '未创建'}`, { title: '项目概览', rows, link: pmPortalUrl(args.kind, d.uid) ? { label: '打开项目管理', url: pmPortalUrl(args.kind, d.uid) } : null }); });
        }
        if (op === 'planProject') {
          return run('PLAN PROJECT', async () => {
            const d = await api('planProject', { node, uid: avatar?.uid || '', goal: args.goal || '' });
            await onRefresh();
            ai(`已拆解目标：计划 ${d.plans} · 任务 ${d.tasks} · 报告 ${d.reports} · 反馈 ${d.feedbacks}`);
          });
        }
        if (op === 'createAvatar') {
          return run('CREATE AVATAR', async () => {
            const a = await api('createAvatar', { node, name: args.name || '我的分身', city: args.city || avatar?.city || '深圳市', company: args.company || avatar?.company || '云轩领航', persona: args.persona || avatar?.persona || '', preferences: args.preferences || avatar?.preferences || '', style: args.style || avatar?.style || '', bio: args.bio || '' });
            await onRefresh();
            ai(`分身「${a.name}」已创建，uid=${String(a.uid).slice(0, 10)}…`);
          });
        }
        if (op === 'devices') {
          return run('DISCOVER DEVICES', async () => { const d = await api('devices', { node }); ai(`发现 ${d.devices?.length || 0} 个周边设备（${(d.adapters || []).filter((a) => a.supported).length} 个适配器可用）。`); onDevices?.(); });
        }
        if (op === 'storeApps') {
          if (onStore) onStore();
          return run('APP STORE', async () => { const list = await api('storeApps', { node }); ai(`应用商店：${list.length} 个服务。`); });
        }
        if (op === 'createStoreInstance') {
          return run(`STORE INSTANCE ${args.name || ''}`, async () => {
            const services = await api('storeApps', { node });
            const target = services.find((s) => (args.command && s.command === args.command) || (args.name && s.name.includes(args.name))) || (ctxApp ? { name: ctxApp.title || ctxApp.name, command: ctxApp.command, space: ctxApp.space || ctxSpace, place: ctxApp.place, uid: ctxApp.service_uid || '' } : null);
            if (!target) { ai('应用商店里没有匹配的服务。'); return; }
            await api('createStoreInstance', { node, service: target, name: args.name || String(target.name).split(/\s+/)[0], city: args.city || avatar?.city || '深圳市', company: args.company || avatar?.company || '云轩领航', uid: avatar?.uid || '' });
            await onRefresh();
            ai(`已从应用商店创建「${target.name}」实例。`);
          });
        }
        if (op === 'data') { onData(); return; }
        ai(`AI 给出了未识别的动作：${op || 'null'}`);
      };
      const handle = async (raw) => {
        const text = String(raw || '').trim();
        if (!text || busy) return;
        if (!chatReady) { ai('请先完成初始化：服务节点、云社区/云办公、数字分身和项目管理。'); return; }
        const attached = files.map((f) => f.name).join(', ');
        const content = attached ? `${text}\n附件：${attached}` : text;
        push('user', content); clearTimeout(draftTimerRef.current); if (inputRef.current) inputRef.current.value = ''; try { localStorage.removeItem('contextos-devops-dsh:draft'); } catch {} setFiles([]); try { inputRef.current?.focus({ preventScroll: true }); } catch {}
        const history = msgs.filter((m) => m.role === 'user' || m.role === 'ai').slice(-8).map((m) => ({ role: m.role, text: m.text }));
        const selectedApp = app ? { name: app.name, title: app.title, command: app.command, space: app.space || space, place_uid: app.place_uid || '', place: app.place || '' } : null;
        const selectedAvatar = avatar ? { name: avatar.name, uid: avatar.uid, city: avatar.city, company: avatar.company, persona: avatar.persona || '', preferences: avatar.preferences || '', style: avatar.style || '', skills: avatar.skills || [] } : null;
        const functions = {
          target: activeTarget ? { uid: activeTarget.uid, title: activeTarget.title, content: activeTarget.content } : null,
          plan: activePlan ? { uid: activePlan.uid, title: activePlan.title, content: activePlan.content, status: activePlan.status_name, begin_time: activePlan.begin_time, end_time: activePlan.end_time } : null,
          task: activeTask ? { uid: activeTask.uid, title: activeTask.title, content: activeTask.content, status: activeTask.status_name } : null,
          report: activeReport ? { uid: activeReport.uid, title: activeReport.title, content: activeReport.content } : null,
          feedback: activeFeedback ? { uid: activeFeedback.uid, title: activeFeedback.title, content: activeFeedback.content, status: activeFeedback.status_name, score: activeFeedback.score } : null,
        };
        const sceneTz = (bg?.params || {}).timezone || (typeof Intl !== 'undefined' ? (Intl.DateTimeFormat().resolvedOptions().timeZone || '') : '');
        const sceneLoc = (bg?.params || {}).location || (avatar?.city || '');
        const selectedScene = bg ? { id: bg.id, name: bg.name, theme: themeMode, language: locale === 'zh' ? 'zh' : 'en', timezone: sceneTz, location: sceneLoc } : null;
        const webPage = chatWebTab ? { url: chatWebTab.base || chatWebTab.url, title: chatWebTab.title || '' } : null;
        const editorFile = ideFile && ideFile.path ? { node: ideFile.node, space: ideFile.space, path: ideFile.path, language: ideFile.language, dirty: !!ideFile.dirty, content: String(ideFile.content || '').slice(0, 1500) } : null;
        // 概念顺序：serve/node → space/pod → place/app → avatar → scene/background → mode → view → web → editor
        const selection = {
          serve: node, node,
          space, pod: space,
          place: selectedApp, app: selectedApp,
          avatar: selectedAvatar,
          scene: selectedScene, background: selectedScene,
          mode,
          view: view || 'chat',
          web: webPage,
          editor: editorFile,
          experience: { sound: fx?.sound, light: fx?.light, color: fx?.color, style: fx?.style },
          functions,
        };
        const context = {
          selection,
          serve: node, node,
          space, pod: space,
          place: selectedApp, app: selectedApp,
          avatar: selectedAvatar,
          scene: selectedScene, background: selectedScene,
          mode,
          view: view || 'chat',
          web: webPage,
          editor: editorFile,
          experience: { sound: fx?.sound, light: fx?.light, color: fx?.color, style: fx?.style },
          functions,
          nodes: (nodes || []).map((n) => ({ port: n.port, name: n.name, state: n.state, env: n.env })),
          spaces: (spaces || []).map((s) => ({ name: s.name, status: s.status })),
          apps: (apps || []).map((a) => ({ name: a.name, title: a.title, command: a.command })),
        };
        const startedAt = Date.now();
        setTurn({ at: startedAt, ms: 0, tokens: 0, reqBytes: 0, resBytes: 0, q: text.slice(0, 70), a: '' });
        setBusy(true); push('sys', 'DSH INTENT');
        try {
          const r = await api('chat', { message: content, history, context, mode });
          const reply = String(r?.reply || '');
          const u = r?.usage || null;
          const tokens = u ? (Number(u.total_tokens) || ((Number(u.input_tokens) || Number(u.prompt_tokens) || 0) + (Number(u.output_tokens) || Number(u.completion_tokens) || 0))) : Math.round((content.length + reply.length) / 4);
          setTurn({ at: startedAt, ms: Number(r?.ms) || (Date.now() - startedAt), tokens, est: !u, reqBytes: Number(r?.promptBytes) || 0, resBytes: Number(r?.outputBytes) || reply.length, q: text.slice(0, 70), a: reply.slice(0, 80) });
          if (reply) ai(reply, { ms: Number(r?.ms) || (Date.now() - startedAt), tokens, est: !u, bytes: Number(r?.outputBytes) || reply.length });
          if (onRequest) onRequest({
            at: new Date(startedAt).toISOString(),
            ms: Number(r?.ms) || (Date.now() - startedAt),
            tokens, usage: u, est: !u,
            reqBytes: Number(r?.promptBytes) || 0,
            resBytes: Number(r?.outputBytes) || reply.length,
            message: String(content).slice(0, 4000),
            context, mode,
            reply: String(reply).slice(0, 8000),
            action: r?.action || null,
          });
          const actions = Array.isArray(r?.actions) && r.actions.length ? r.actions : (r?.action ? [r.action] : []);
          for (const action of actions) await executeAction(action);
        } catch (e) {
          ai(`DSH 意图层调用失败：${String(e?.message || e)}\n请确认 DSH 已配置模型，或重启 DSH 加载 llm 注入。`);
        } finally {
          setBusy(false);
        }
      };
      const selector = (kind, key, value, items, sub) => {
        let menu = null;
        if (pick === kind) {
          const children = items.length
            ? items.map((it) => h('button', {
                key: it.key, className: `cx-sel-item${it.on ? ' on' : ''}`,
                onClick: () => { setPick(null); it.go(); },
              }, it.label, it.sub ? h('div', { className: 's' }, it.sub) : null))
            : h('div', { className: 'cx-empty', style: { padding: 10 } }, sub || '暂无数据');
          menu = h('div', { className: 'cx-sel-menu' }, children);
        }
        return h('div', { className: 'cx-sel' },
          h('button', { className: `cx-sel-btn${pick === kind ? ' on' : ''}`, title: value ? `${key}: ${value}` : key, onClick: () => setPick(pick === kind ? null : kind) },
            h('span', { className: `v${value ? '' : ' ph'}` }, value || key), h('span', { className: 'a' }, '▾')),
          menu);
      };

      const fileInput = h('input', {
        type: 'file', ref: fileRef, multiple: true, style: { display: 'none' },
        onChange: (e) => { const list = Array.from(e.target.files || []); setFiles((xs) => [...xs, ...list]); e.target.value = ''; },
      });

      const fmtBytes = (n) => (n >= 1024 ? `${(n / 1024).toFixed(1)}KB` : `${n}B`);
      const lastAi = [...msgs].reverse().find((m) => m.role === 'ai') || null;
      const compose = h('div', { className: 'cx-compose' },
        chatTab !== 'chat' ? h('div', { className: 'cx-webstatus', onClick: () => setReplyPop((v) => !v) },
          h('span', { className: `dot${busy ? ' busy' : ''}` }),
          h('div', { className: 'cx-webstatus-body' },
            h('div', { className: 'meta' },
              h('span', null, turn ? new Date(turn.at).toLocaleTimeString() : '—'),
              h(Elapsed, { from: turn?.at, ms: turn?.ms, active: busy }),
              h('span', null, `${turn?.est ? '≈' : ''}${turn?.tokens || 0} tok`),
              h('span', null, `${fmtBytes(turn?.reqBytes || 0)} → ${fmtBytes(turn?.resBytes || 0)}`)),
            h('div', { className: 'sum' }, turn ? (busy ? `Q: ${turn.q}` : `A: ${turn.a || turn.q}`) : (locale === 'zh' ? '可以就当前网页提问' : 'Ask about this page'))),
          h(IconButton, { name: replyPop ? 'chevronDown' : 'chevronUp', className: 'arr', onClick: () => setReplyPop((v) => !v), title: replyPop ? T('收起') : T('展开') })) : null,
        files.length ? h('div', { className: 'cx-compose-files' }, files.map((f, i) => h('span', { key: i, className: 'cx-tag cy' }, f.name, h(IconButton, { name: 'close', className: 'cx-tag-x', onClick: () => setFiles((xs) => xs.filter((_, j) => j !== i)) })))) : null,
        h('textarea', { key: sessionKey, ref: inputRef, className: 'cx-compose-input', rows: 3, defaultValue: initialDraft, placeholder: 'Message or run a task, / commands, @ files or sessions', disabled: busy, onChange: (e) => { const v = e.target.value; clearTimeout(draftTimerRef.current); draftTimerRef.current = setTimeout(() => { try { localStorage.setItem('contextos-devops-dsh:draft', v); } catch {} }, 180); }, onKeyDown: (e) => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent?.isComposing) { e.preventDefault(); handle(inputRef.current?.value || ''); } } }),
        h('div', { className: 'cx-compose-tools', onContextMenu: (e) => {
          const el = e.target.closest && e.target.closest('.cx-compose-plus, .cx-compose-send');
          if (!el) return;
          e.preventDefault();
          el.classList.remove('cx-shake');
          void el.offsetWidth;
          el.classList.add('cx-shake');
          setTimeout(() => { try { el.classList.remove('cx-shake'); } catch {} }, 520);
        } },
          h(IconButton, { name: 'plus', className: 'cx-compose-plus', title: T('添加文件'), onClick: () => fileRef.current && fileRef.current.click() }),
          selector('serve', tt('serve'), nodes.find((n) => n.port === node)?.name || (node ? `:${node}` : ''), (nodes || []).map((n) => ({ key: n.port, label: n.name || `:${n.port}`, sub: `:${n.port} · ${n.state}`, on: n.port === node, go: () => onSelectNode(n.port) })), '没有服务节点'),
          selector('space', tt('space'), space, (spaces || []).map((s) => ({ key: s.name, label: s.name, sub: `${s.status} · ${s.version || ''}`, on: s.name === space, go: () => onSelectSpace(s.name) })), '该节点还没有项目空间'),
          selector('place', tt('applications'), app?.title || app?.name || '', (apps || []).map((a) => ({ key: `${a.space}:${a.command}:${a.place_uid || a.name}`, label: a.title || a.name, sub: `${a.city_name || ''} · ${a.company_name || ''} · ${a.service_name || ''}`, on: app?.place_uid === a.place_uid, go: () => onSelectApp(a) })), '最近应用为空'),
          h('div', { className: 'cx-compose-right' },
            selector('avatar', T('我的分身'), avatar?.name || '', (avatars || []).map((a) => ({ key: a.uid, label: a.name || a.username, sub: `${a.city || ''} · ${a.company || ''}`, on: a.uid === avatar?.uid, go: () => onSelectAvatar(a) })), '没有数字分身'),
            selector('bg', T('我的赛博世界'), bg?.name || '', (backgrounds || []).map((b) => ({ key: b.id, label: b.name, sub: b.image ? T('已上传照片 · 生成赛博世界') : T('默认赛博世界'), on: b.id === bg?.id, go: () => onSelectBg(b) })), '没有背景'),
            selector('mode', tt('mode'), modeLabel(CHAT_MODES.find((m) => m.id === mode) || CHAT_MODES[0]), CHAT_MODES.map((m) => ({ key: m.id, label: modeLabel(m), sub: m.id, on: m.id === mode, go: () => switchMode(m.id) })), ''),
            h(IconButton, { name: 'send', className: 'cx-compose-send', disabled: busy, title: T('发送'), onClick: () => handle(inputRef.current?.value || '') }))),
        fileInput,
        h('input', { type: 'file', accept: 'image/*', ref: avatarImgRef, style: { display: 'none' }, onChange: (e) => { const f = (e.target.files || [])[0]; e.target.value = ''; f && onUploadAvatar(f); } }),
        h('input', { type: 'file', accept: 'image/*', ref: bgImgRef, style: { display: 'none' }, onChange: (e) => { const f = (e.target.files || [])[0]; e.target.value = ''; f && onUploadBg(f); } }));

      const renderMsg = (m, i) => m.role === 'sys'
        ? h('div', { key: i, className: 'cx-sysline' }, h('span', { className: 'cx-sysdot' }), m.text)
        : h('div', { key: i, className: `cx-msg ${m.role}` },
            h('span', { className: 'cx-msg-avatar' }, m.role === 'user' ? 'ME' : 'AI'),
            h('div', { className: 'cx-msg-main' },
              h('div', { className: 'cx-msg-meta' },
                h('span', null, m.role === 'user' ? 'YOU' : 'COPILOT'),
                m.t ? h('span', null, m.t) : null,
                m.role === 'ai' && m.ms ? h('span', { className: 'cx-msg-metrics' }, `${(m.ms / 1000).toFixed(1)}s`) : null,
                m.role === 'ai' && m.tokens ? h('span', { className: 'cx-msg-metrics' }, `${m.est ? '≈' : ''}${m.tokens} tok`) : null,
                m.role === 'ai' && m.bytes ? h('span', { className: 'cx-msg-metrics' }, fmtBytes(m.bytes)) : null,
                h('div', { className: 'cx-msg-tools' },
                  h('button', { className: 'cx-msg-tool', title: T('复制'), onClick: () => { try { navigator.clipboard.writeText(m.text); } catch {} } }, T('复制')),
                  h('button', { className: 'cx-msg-tool', title: T('引用'), onClick: () => { const el = inputRef.current; if (!el) return; el.value = '> ' + String(m.text || '').split('\n').join('\n> ') + '\n'; el.focus(); } }, T('引用')),
                  m.role === 'ai' ? h('button', { className: 'cx-msg-tool', title: T('重试'), onClick: () => { const prev = [...msgs.slice(0, i)].reverse().find((x) => x.role === 'user'); if (prev) handle(prev.text); } }, T('重试')) : null,
                  h('button', { className: 'cx-msg-tool danger', title: T('删除'), onClick: () => { setMsgs((list) => list.filter((_, j) => j !== i)); } }, T('删除')))),
              h('div', { className: 'cx-msg-body' },
                h(RichText, { text: m.text }),
                m.card ? h('div', { className: 'cx-result-card' },
                  h('div', { className: 'cx-result-title' }, m.card.title || '结果'),
                  h('div', { className: 'cx-result-rows' }, (m.card.rows || []).map(([k, v], j) => h('div', { key: j, className: 'cx-result-row' }, h('span', null, k), h('b', null, String(v ?? '—'))))),
                  m.card.link ? h('button', { className: 'cx-result-link', onClick: () => { if (typeof OPEN_LINK === 'function') OPEN_LINK(m.card.link.url, m.card.link.label || '管理'); } }, m.card.link.label || '打开') : null) : null)));

      const uidCtx = (it) => uidFieldMap(it);
      const openPm = (kind, mode = 'create', item = null) => {
        const parent = kind === 'target' ? {} : kind === 'plan' ? (activeTarget ? { target_uid: activeTarget.uid, ...uidCtx(activeTarget) } : null) : kind === 'task' ? (activePlan ? { plan_uid: activePlan.uid, ...uidCtx(activePlan) } : null) : kind === 'report' ? (activeTask ? { task_uid: activeTask.uid, ...uidCtx(activeTask) } : null) : kind === 'feedback' ? (activeReport ? { report_uid: activeReport.uid, task_uid: activeReport.task_uid || '', ...uidCtx(activeReport) } : null) : null;
        if (!parent) { ai('请先在上级列表选择一个项目。'); return; }
        setPmForm({ kind, mode, item, parent });
      };
      const openPmChild = (kind, parentItem) => {
        if (!parentItem?.uid) { ai('请先选择一个上级项目。'); return; }
        let parent = null;
        if (kind === 'plan') { parent = { target_uid: parentItem.uid, ...uidCtx(parentItem) }; setTargetId(parentItem.uid); setPlanId(''); setTaskId(''); setReportId(''); setFeedbackId(''); }
        if (kind === 'task') { parent = { plan_uid: parentItem.uid, ...uidCtx(parentItem) }; setPlanId(parentItem.uid); setTaskId(''); setReportId(''); setFeedbackId(''); }
        if (kind === 'report') { parent = { task_uid: parentItem.uid, ...uidCtx(parentItem) }; setTaskId(parentItem.uid); setReportId(''); setFeedbackId(''); }
        if (kind === 'feedback') { parent = { report_uid: parentItem.uid, task_uid: parentItem.task_uid || '', ...uidCtx(parentItem) }; setReportId(parentItem.uid); setFeedbackId(''); }
        if (!parent) { ai('无法确定上级项目。'); return; }
        setPmForm({ kind, mode: 'create', item: null, parent });
      };
      const removePm = async (kind, item) => {
        if (!item || !window.confirm(`删除「${item.title}」？`)) return;
        try { await api('pmRemove', { node, uid: avatar?.uid || '', kind, item_uid: item.uid, uid_options: uidFieldMap(item) }); await loadPm(); ai(`已删除${kind}：${item.title}`); }
        catch (e) { ai(`删除失败：${String(e?.message || e)}`); }
      };
      const pmCanCreate = (kind) => kind === 'target'
        ? true
        : kind === 'plan' ? !!(activeTarget?.actions || []).includes('planCreate')
        : kind === 'task' ? !!(activePlan?.actions || []).includes('taskCreate')
        : kind === 'report' ? !!(activeTask?.actions || []).includes('reportCreate')
        : kind === 'feedback' ? !!activeReport
        : false;
      const pmOps = (kind) => h(PmCreateButton, { kind, allowed: pmCanCreate(kind), onCreate: () => openPm(kind) });
      const runPmAction = async (kind, item, action) => {
        const createKind = action === 'planCreate' ? 'plan' : action === 'taskCreate' ? 'task' : action === 'reportCreate' ? 'report' : action === 'feedbackCreate' ? 'feedback' : '';
        if (createKind) return openPmChild(createKind, item);
        if (action === 'modify') return openPm(kind, 'edit', item);
        if (action === 'open') { if (item.link && typeof OPEN_LINK === 'function') OPEN_LINK(item.link, item.title || 'link'); return; }
        if (action === 'remove') return removePm(kind, item);
        try { await api('pmAct', { node, uid: avatar?.uid || '', kind, item_uid: item.uid, action, uid_options: uidFieldMap(item) }); await loadPm(); const msg = `${PM_SHORT[kind]}「${item.title}」执行 ${action}`; ai(msg); try { window.dispatchEvent(new CustomEvent('cx-toast', { detail: { text: msg, kind: 'ok' } })); } catch {} }
        catch (e) { const msg = `操作失败：${String(e?.message || e)}`; ai(msg); try { window.dispatchEvent(new CustomEvent('cx-toast', { detail: { text: msg, kind: 'err' } })); } catch {} }
      };
      const pmItem = (item, active, onClick, sub, kind) => h(PmCard, {
        key: `${item.uid}:${cxCardSig(item)}`, item, kind, active, sub, traceIds, traceLog,
        onSelect: onClick, onAction: (action) => runPmAction(kind, item, action),
      });
      const leftPanel = h('aside', { className: `cx-pm-side${pmRefreshing ? ' refreshing' : ''}` },
        h('div', { className: 'cx-pm-scroll' },
        h(PmSectionHead, { icon: 'target', title: sectionTitle(tt('target'), 'TARGETS'), count: targets.length, folded: fold('targets'), onToggle: () => setFolds((f) => ({ ...f, targets: !f.targets })), onRefresh: () => loadPm('target'), tools: pmOps('target') }),
        pmError ? h('div', { className: 'cx-pm-empty err' }, pmError) : null,
        !pm && !pmError ? h('div', { className: 'cx-pm-empty' }, T('加载中…')) : null,
        fold('targets') ? null : targets.length ? h(UiCardList, { items: targets, render: (t) => pmItem(t, activeTarget?.uid === t.uid, () => { setTargetId(t.uid); setPlanId(''); setTaskId(''); setReportId(''); setFeedbackId(''); }, `${t.plans?.length || 0} 个计划`, 'target') }) : h(PmEmpty, { label: T('创建目标'), onCreate: pm?.project && pmCanCreate('target') ? () => openPm('target') : null }, pm?.project ? T('还没有目标') : T('请先初始化项目管理')),
        h(PmSectionHead, { icon: 'plan', title: sectionTitle(tt('plan'), 'PLANS'), count: plans.length, folded: fold('plans'), style: { marginTop: 12 }, onToggle: () => setFolds((f) => ({ ...f, plans: !f.plans })), onRefresh: () => loadPm('plan'), tools: pmOps('plan') }),
        fold('plans') ? null : (planStatusOptions.length > 1 ? h(PmFilter, { label: tt('status'), options: planStatusOptions, value: planStatusFilter, onChange: setPlanStatusFilter }) : null),
        fold('plans') ? null : plans.length ? h(UiCardList, { items: plans, render: (p) => pmItem(p, activePlan?.uid === p.uid, () => { setPlanId(p.uid); setTaskId(''); setReportId(''); setFeedbackId(''); }, `${p.tasks?.length || 0} 任务`, 'plan') }) : h(PmEmpty, { label: T('创建计划'), onCreate: activeTarget && pmCanCreate('plan') ? () => openPm('plan') : null }, activeTarget ? T('该目标下还没有计划') : T('选择目标后显示计划')),
        ),
        h('div', { className: `cx-gantt-sec${fold('gantt') ? ' folded' : ''}` },
          h(PmSectionHead, { icon: 'clock', title: sectionTitle('进度', 'PROGRESS'), count: plans.filter((p) => p.status_name === 'process').length, folded: fold('gantt'), onToggle: () => setFolds((f) => ({ ...f, gantt: !f.gantt })) }),
          fold('gantt') ? null : h(Gantt, { plans, activeUid: activePlan?.uid })));
      const rightPanel = h('aside', { className: `cx-pm-side right${pmRefreshing ? ' refreshing' : ''}` },
        h('div', { className: `cx-calsec${calFull ? ' max' : ''}`, ref: calRef },
          h(PmSectionHead, { icon: 'clock', title: sectionTitle('时间', 'TIME'), folded: fold('cal'), style: { '--cx-hi': '0' }, onToggle: () => setFolds((f) => ({ ...f, cal: !f.cal })), tools: h(IconButton, { name: calFull ? 'restore' : 'fullscreen', className: 'cx-pm-max', onClick: () => { setCalFull((v) => !v); if (fold('cal')) setFolds((f) => ({ ...f, cal: false })); }, title: calFull ? T('还原') : T('最大化') }) }),
          fold('cal') ? null : h(PmCalendar, { tasks: allTasks, start: calStart, end: calEnd, onChange: calOnChange, locale })),
        h(PmSectionHead, { icon: 'task', title: sectionTitle(tt('task'), 'TASKS'), count: tasks.length, folded: fold('tasks'), style: { '--cx-hi': '1' }, onToggle: () => setFolds((f) => ({ ...f, tasks: !f.tasks })), onRefresh: () => loadPm('task'), tools: pmOps('task') }),
        fold('tasks') ? null : (taskStatusOptions.length > 1 ? h(PmFilter, { label: tt('status'), options: taskStatusOptions, value: taskStatusFilter, onChange: setTaskStatusFilter }) : null),
        fold('tasks') ? null : tasks.length ? h(UiCardList, { items: tasks, render: (t) => pmItem(t, activeTask?.uid === t.uid, () => { setTaskId(t.uid); setReportId(''); setFeedbackId(''); }, `${t.reports?.length || 0} 报告`, 'task') }) : (allTasks.length ? h('div', { className: 'cx-pm-empty' }, `有 ${allTasks.length} 条任务被筛选条件隐藏 `, h('button', { className: 'cx-btn xs', onClick: () => { setCalStart(''); setCalEnd(''); setTaskStatusFilter([]); } }, T('清除筛选'))) : h(PmEmpty, { label: T('创建任务'), onCreate: activePlan && pmCanCreate('task') ? () => openPm('task') : null }, activePlan ? T('该计划下还没有任务') : T('先选择一个计划'))),
        h(PmSectionHead, { icon: 'report', title: sectionTitle(tt('report'), 'REPORTS'), count: reports.length, folded: fold('reports'), style: { '--cx-hi': '2', marginTop: 12 }, onToggle: () => setFolds((f) => ({ ...f, reports: !f.reports })), onRefresh: () => loadPm('report'), tools: pmOps('report') }),
        fold('reports') ? null : (reportTypeOptions.length > 1 ? h(PmFilter, { label: tt('type'), options: reportTypeOptions, value: reportTypeFilter, onChange: setReportTypeFilter }) : null),
        fold('reports') ? null : reports.length ? h(UiCardList, { items: reports, render: (r) => pmItem(r, activeReport?.uid === r.uid, () => { setReportId(r.uid); setFeedbackId(''); }, `${r.feedbacks?.length || 0} 反馈`, 'report') }) : h(PmEmpty, { label: T('创建报告'), onCreate: activeTask && pmCanCreate('report') ? () => openPm('report') : null }, activeTask ? T('该任务下还没有报告') : T('先选择一个任务')),
        h(PmSectionHead, { icon: 'feedback', title: sectionTitle(tt('feedback'), 'FEEDBACK'), count: feedbacks.length, folded: fold('feedbacks'), style: { '--cx-hi': '3', marginTop: 12 }, onToggle: () => setFolds((f) => ({ ...f, feedbacks: !f.feedbacks })), onRefresh: () => loadPm('feedback'), tools: pmOps('feedback') }),
        fold('feedbacks') ? null : (feedbackStatusOptions.length > 1 ? h(PmFilter, { label: tt('status'), options: feedbackStatusOptions, value: feedbackStatusFilter, onChange: setFeedbackStatusFilter }) : null),
        fold('feedbacks') ? null : feedbacks.length ? h(UiCardList, { items: feedbacks, render: (f) => pmItem(f, activeFeedback?.uid === f.uid, () => setFeedbackId(f.uid), `${f.score || 0} 分`, 'feedback') }) : h(PmEmpty, { label: T('创建反馈'), onCreate: activeReport && pmCanCreate('feedback') ? () => openPm('feedback') : null }, activeReport ? T('该报告下还没有反馈') : T('先选择一个报告')),
        h('div', { className: `cx-mapsec${fold('map') ? ' folded' : ''}${mapFull ? ' max' : ''}`, ref: mapSecRef },
          h(PmSectionHead, { icon: 'map', title: sectionTitle('地点', 'LOCATION'), folded: fold('map'), style: { '--cx-hi': '4' }, onToggle: () => setFolds((f) => ({ ...f, map: !f.map })), tools: [
            h(IconButton, { key: 'loc', name: 'locate', onClick: () => mapApiRef.current && mapApiRef.current.locate && mapApiRef.current.locate(), title: T('定位') }),
            h(IconButton, { key: 'max', name: mapFull ? 'restore' : 'fullscreen', onClick: () => { setMapFull((v) => !v); if (fold('map')) setFolds((f) => ({ ...f, map: false })); }, title: mapFull ? T('还原') : T('最大化') }),
          ] }),
          fold('map') ? null : h(TaskMap, { tasks, activeTask, theme: mapTheme, full: mapFull, onLocateReady: (api) => { mapApiRef.current = api; }, onSelect: (t) => { setTaskId(t.uid); setReportId(''); setFeedbackId(''); } })));

      if (!open) return null;
      return h('div', { className: `cx-chat${full ? ' full' : ''}${docked ? ' dock' : ''}${webMax && chatTab !== 'chat' ? ' webmax' : ''}`, 'data-theme': theme },
        h('div', { className: `cx-chat-bg${bg?.image ? ' photo' : ''}` }, bg?.image ? h('img', { src: bg.image, alt: '' }) : (full ? h(ThreeCity) : null)),
        h('div', { className: 'cx-chat-body' },
          showLeft ? leftPanel : null,
          h('div', { className: 'cx-chat-center' },
            h('div', { className: 'cx-chat-h' },
              h('div', { className: 'cx-chat-hin' },
                h('div', { className: 'cx-chat-brand' },
                  h('div', { className: 'cx-chat-orb' }, h(CtxMark, { variant: 'copilot', size: 22 })),
                  h('div', { className: 'cx-chat-copy' }, h('div', { className: 'cx-chat-title' }, 'CONTEXTOS · COPILOT'), h('div', { className: 'cx-chat-sub' }, `${tt('avatar')} · ${tt('factory')} · ${tt('iot')}`))),
                h('div', { className: 'cx-chat-actions' },
                  ...(!docked ? [
                    h(DropSelect, { value: themeMode, title: tt('light') + ' / ' + tt('dark'), onChange: setThemeMode, options: [{ value: 'system', label: tt('system') }, { value: 'light', label: tt('light') }, { value: 'dark', label: tt('dark') }] }),
                    h(DropSelect, { value: langMode, title: tt('chinese') + ' / English', onChange: setLangMode, options: [{ value: 'system', label: tt('system') }, { value: 'zh', label: '中文' }, { value: 'en', label: 'English' }] }),
                    h(IconButton, { name: 'bolt', className: 'cx-btn xs cx-icon-btn', onClick: onInit, title: 'Initialize' }),
                  ] : []),
                  h(IconButton, { name: (full && !docked) ? 'restore' : 'fullscreen', className: 'cx-btn xs cx-icon-btn', onClick: onToggleFull, title: (full && !docked) ? tt('restore') : tt('maximize') }),
                  h(IconButton, { name: 'panelLeft', className: `cx-btn xs cx-icon-btn${showLeft ? ' on' : ''}`, title: showLeft ? T('隐藏左栏') : T('显示左栏'), onClick: () => setShowLeft((v) => !v) }),
                  h(IconButton, { name: 'panelRight', className: `cx-btn xs cx-icon-btn${showRight ? ' on' : ''}`, title: showRight ? T('隐藏右栏') : T('显示右栏'), onClick: () => setShowRight((v) => !v) }),
                  h(IconButton, { name: 'close', className: 'x', onClick: onClose, title: tt('close') })))),
            h('div', { className: 'cx-chat-tabs' },
              h('button', { className: `cx-chat-tab${chatTab === 'chat' ? ' on' : ''}`, onClick: () => setChatTab('chat') }, tt('chat')),
              (webTabs || []).map((t) => h('button', { key: t.id, className: `cx-chat-tab${chatTab === t.id ? ' on' : ''}`, title: t.url, onClick: () => setChatTab(t.id) },
                h('span', { className: 'nm' }, t.title || 'web'),
                h(IconButton, { name: 'close', className: 'x', onClick: (e) => { e.stopPropagation(); onCloseWebTab && onCloseWebTab(t.id); if (chatTab === t.id) setChatTab('chat'); } })))),
            chatWebTab ? h('div', { className: 'cx-addrbar' },
              h(IconButton, { name: 'arrowLeft', className: 'nav', disabled: !(hist && hist.idx > 0), onClick: back, title: T('后退') }),
              h(IconButton, { name: 'arrowRight', className: 'nav', disabled: !(hist && hist.idx < hist.list.length - 1), onClick: fwd, title: T('前进') }),
              h(IconButton, { name: 'refresh', className: 'nav', onClick: () => onReloadWebTab && onReloadWebTab(chatWebTab.id), title: T('刷新') }),
              h('input', { className: 'cx-addr-input', value: addr, placeholder: 'https://…', onChange: (e) => setAddr(e.target.value), onKeyDown: (e) => { if (e.key === 'Enter') go(addr); } }),
              h(IconButton, { name: webMax ? 'restore' : 'fullscreen', className: 'nav', onClick: () => setWebMax((v) => !v), title: webMax ? tt('restore') : tt('maximize') }),
              h(MenuButton, { items: [
                { label: '复制地址', action: () => { try { navigator.clipboard.writeText(chatWebTab.base || chatWebTab.url); } catch {} } },
                { label: '在浏览器打开', action: () => { try { window.open(chatWebTab.base || chatWebTab.url, '_blank'); } catch {} } },
                { label: '在管理中打开', action: () => onManageWebTab && onManageWebTab(chatWebTab.id) },
                { label: '关闭标签', danger: true, action: () => { onCloseWebTab && onCloseWebTab(chatWebTab.id); setChatTab('chat'); } },
              ] })) : null,
            h('div', { className: 'cx-chat-webframes', style: chatTab === 'chat' ? { display: 'none' } : null },
              (webTabs || []).map((t) => h('iframe', { key: t.id, src: t.url, title: t.title || 'web', allow: 'clipboard-read; clipboard-write', onLoad: () => setChatLoaded((m) => (m[t.id] ? m : { ...m, [t.id]: 1 })), style: chatTab === t.id ? null : { display: 'none' } })),
              chatWebTab && !chatLoaded[chatWebTab.id] ? h('div', { className: 'cx-webmask' }, T('加载中…')) : null),
            h('div', { className: 'cx-chat-b', ref: endRef, onScroll: onMsgScroll, style: chatTab !== 'chat' ? { display: 'none' } : null, onContextMenu: (e) => { if (e.target.closest('.cx-msg, button, a, input, textarea, select, .cx-sel, .cx-hint, .cx-suggest')) return; openCtx(e, 'bg'); } },
          h('div', { className: `cx-world${msgs.some((m) => m.role === 'user') ? ' gone' : ''}` },
            h('div', { className: 'cx-world-kicker' }, 'WELCOME TO'),
            h('div', { className: 'cx-world-name' }, 'CONTEXTOS WORLD!'),
            h('div', { className: 'cx-world-sub' }, T('数字分身 · 软件工厂 · 赛博世界')),
            h('div', { className: 'cx-world-line' })),
          (booted && !chatReady) ? h('div', { className: 'cx-gate' }, h('div', { className: 'cx-gate-t' }, '先初始化，再开始对话'), h('div', { className: 'cx-gate-d' }, '需要服务节点、云社区/云办公、数字分身和项目管理。'), h('button', { className: 'cx-btn pri', onClick: onInit }, T('初始化'))) : ((pmBooted && !planReady) ? h('div', { className: 'cx-gate' }, h('div', { className: 'cx-gate-t' }, '先创建或选择计划'), h('div', { className: 'cx-gate-d' }, '每个会话属于一个计划。可以在左侧选择目标/计划，或直接对 AI 说「创建目标…」「为该目标创建计划…」。'), h('div', { className: 'cx-gate-actions' }, h('button', { className: 'cx-btn pri', onClick: () => openPm('target') }, '+ 目标'), h('button', { className: 'cx-btn', onClick: loadPm }, '刷新项目数据'))) : null),
          h('div', { className: 'cx-hero' },
            h('div', { className: 'cx-hero-avatar', title: '右键：上传头像照片', onContextMenu: (e) => openCtx(e, 'avatar') }, h(ThreeAvatar, { image: avatar?.image })),
            h('div', { className: 'cx-hero-copy' },
              h('div', { className: 'cx-hero-kicker' }, 'AI NATIVE OPERATING SYSTEM'),
              h('div', { className: 'cx-hero-title' }, '你好，我是 ContextOS Copilot'),
              h('div', { className: 'cx-hero-sub' }, T('用一个对话，部署节点、创建空间、生成应用、管理数字分身与日常任务。')),
              !msgs.some((m) => m.role === 'user') ? h('div', { className: 'cx-empty-hint' }, T('消息还是空白 · 输入问题，或从下面的建议开始')) : null)),
          msgs.map(renderMsg),
          msgs.length <= 1 ? h('div', { className: 'cx-suggest' },
            modeQuick(CHAT_MODES.find((x) => x.id === mode)).map((label) => h('button', {
              key: label, type: 'button', className: 'cx-suggest-tag', title: T('点击填入输入框'),
              onClick: () => {
                const el = inputRef.current;
                if (!el) return;
                el.value = label;
                el.focus();
                try { el.setSelectionRange(el.value.length, el.value.length); } catch {}
              },
            }, label))) : null),
        busy ? h('div', { className: 'cx-chat-typing' }, T('Copilot 正在执行…')) : null,
        h('div', { className: 'cx-hint' },
          h('div', { className: 'cx-hint-text' }, `${activePlan ? (locale === 'zh' ? `计划「${activePlan.title}」 · ` : `Plan "${activePlan.title}" · `) : ''}${modeIntro(CHAT_MODES.find((m) => m.id === mode))}`),
          h('button', { className: 'cx-hint-more', onClick: () => setShowMore((v) => !v) }, showMore ? T('收起') : T('更多'))),
        showMore ? h('div', { className: 'cx-hint-panel' }, CHAT_MODES.map((m) => {
          const note = PRODUCT_NOTES[m.id] || {};
          return h('button', { key: m.id, className: `cx-hint-card${m.id === mode ? ' on' : ''}`, onClick: () => { switchMode(m.id); setShowMore(false); } },
            h('div', { className: 'ht' }, T(note.tag || 'MODE'), ' · ', locale === 'zh' ? (note.title || m.name) : modeLabel(m)),
            h('div', { className: 'hd' }, T(note.text || m.intro)));
        })) : null,
            compose,
            chatTab !== 'chat' && replyPop ? h('div', { className: 'cx-webpop' },
              h('div', { className: 'h' }, h('span', null, locale === 'zh' ? '最近一条回复' : 'LATEST REPLY'), h(IconButton, { name: 'close', onClick: () => setReplyPop(false) })),
              h('div', { className: 'b' }, lastAi ? h(RichText, { text: lastAi.text }) : h('div', { className: 'cx-empty' }, '—'))) : null),
          showRight ? rightPanel : null),
        ctxMenu ? h('div', { className: 'cx-ctxmenu', style: { left: Math.min(ctxMenu.x, Math.max(0, (typeof window !== 'undefined' ? window.innerWidth : 1200) - 200)), top: Math.min(ctxMenu.y, Math.max(0, (typeof window !== 'undefined' ? window.innerHeight : 800) - 150)) }, onClick: (e) => e.stopPropagation() },
          h('div', { className: 'cx-ctxmenu-t' }, ctxMenu.kind === 'avatar' ? (avatar?.name || '数字人') : (bg?.name || '背景')),
          ctxMenu.kind === 'avatar' ? [
            h('button', { key: 'up', onClick: () => { setCtxMenu(null); avatarImgRef.current && avatarImgRef.current.click(); } }, T('上传头像照片')),
            h('button', { key: 'edit', onClick: () => { setCtxMenu(null); setAvatarEditOpen(true); } }, T('修改分身…')),
            h('button', { key: 'sw', onClick: () => { setCtxMenu(null); setPick('avatar'); } }, T('切换分身')),
            h('button', { key: 'new', onClick: () => { setCtxMenu(null); onCreateAvatar(); } }, T('新建分身…')),
          ] : [
            h('button', { key: 'up', onClick: () => { setCtxMenu(null); bgImgRef.current && bgImgRef.current.click(); } }, T('上传背景照片')),
            h('button', { key: 'cfg', onClick: () => { setCtxMenu(null); setSceneOpen(true); } }, T('赛博世界设置…')),
            h('button', { key: 'sw', onClick: () => { setCtxMenu(null); setPick('bg'); } }, T('切换赛博世界')),
            h('button', { key: 'new', onClick: () => { setCtxMenu(null); onCreateBg(); } }, T('新建赛博世界')),
          ]) : null,
        avatarEditOpen ? h(AvatarEditModal, { avatar, onClose: () => setAvatarEditOpen(false), onSave: (p) => { onUpdateAvatar(p); setAvatarEditOpen(false); } }) : null,
        sceneOpen ? h(SceneModal, { scene: bg, onClose: () => setSceneOpen(false), onSave: (p) => { onUpdateScene(p); setSceneOpen(false); } }) : null,
        pmForm ? h(PMModal, { kind: pmForm.kind, mode: pmForm.mode, item: pmForm.item, parent: pmForm.parent, node, avatar, onClose: () => setPmForm(null), onDone: async () => { setPmForm(null); await loadPm(); } }) : null);
    }
