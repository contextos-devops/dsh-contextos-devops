    function ChatPanel({ open, booted, fx, onClose, nodes, node, spaces, space, apps, app, avatar, ideFile, view, mode, onModeChange, onRequest, webTabs, onOpenWebTab, onCloseWebTab, onNavWebTab, onReloadWebTab, onManageWebTab, full, docked, theme, locale, themeMode, setThemeMode, langMode, setLangMode, onToggleFull, onInit, onSelectNode, onSelectSpace, onSelectApp, onSelectAvatar, avatars, backgrounds, bg, onSelectBg, onCreateBg, onUploadBg, onUploadAvatar, onUpdateScene, onUpdateAvatar, onCreateAvatar, onRefresh, onOpenApp, onData, onStore, onDevices, formReq, cards, onOpenDev, onWebFocus }) {
      const tt = (key) => term(locale, key);
      const sectionTitle = (cn, en) => locale === 'zh' ? `${cn} ${en}` : en;
      const modeLabel = (m) => locale === 'zh' ? m.name : ({ avatar: 'Digital Avatar', factory: 'Software Factory', iot: 'Cyber World' })[m.id] || m.name;
      const [pick, setPick] = useState(null);
      const [files, setFiles] = useState([]);
      const [showMore, setShowMore] = useState(false);
      const [folds, setFolds] = useState({ map: true, targets: false, plans: false, tasks: false, reports: false, feedbacks: false });
      useEffect(() => cxWrite('folds', folds), [folds]);
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
      useEffect(() => cxWrite('cal', { ...cxRead('cal', {}), start: calStart, end: calEnd }), [calStart, calEnd]);
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
      useEffect(() => cxWrite('panels', { left: showLeft, right: showRight }), [showLeft, showRight]);
      const [ctxMenu, setCtxMenu] = useState(null);
      const [sceneOpen, setSceneOpen] = useState(false);
      // 聊天面板当前标签：按 URL 基准恢复（标签 id 每次启动都会重排，不能存 id）
      const tabIdOfBase = (base) => { const t = (webTabs || []).find((x) => (x.base || x.url) === base); return t ? t.id : null; };
      const [chatTab, setChatTab] = useState(() => {
        try {
          const base = (cxSessionGet() || {}).chatTab;
          if (!base || base === 'chat') return 'chat';
          return tabIdOfBase(base) || 'chat';
        } catch { return 'chat'; }
      });
      useEffect(() => {
        // 切换节点/空间后标签会被重建，此时回退到对话
        if (chatTab !== 'chat' && !(webTabs || []).some((t) => t.id === chatTab)) { setChatTab('chat'); return; }
        const t = (webTabs || []).find((x) => x.id === chatTab);
        cxSessionSave({ chatTab: t ? (t.base || t.url) : 'chat' });
      }, [chatTab, webTabs]);
      const [replyPop, setReplyPop] = useState(false);
      const [chatLoaded, setChatLoaded] = useState({});
      const [webMax, setWebMax] = useState(() => !!(cxSessionGet() || {}).webMax);
      useEffect(() => { cxSessionSave({ webMax }); }, [webMax]);
      // 网页标签一出现就进入「最大化」：收起左右两栏，让页面占满整个对话区
      useEffect(() => { onWebFocus && onWebFocus(!!webMax && chatTab !== 'chat'); }, [webMax, chatTab]);
      const [turn, setTurn] = useState(null);
      // 链接直接在聊天框自带的网页标签里打开（CHAT 旁边那个 tab），不再另开窗口
      OPEN_LINK = (url, title) => { const id = onOpenWebTab ? onOpenWebTab(url, title) : ''; if (id) setChatTab(id); };
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
      const [msgs, setMsgs] = useState(() => {
        const a = cxRead('chat', []);
        if (Array.isArray(a) && a.length) return a;
        return [{ role: 'ai', text: modeIntro(CHAT_MODES[0]) }];
      });
      const [live, setLive] = useState(null);
      const [traceMsg, setTraceMsg] = useState(null);
      useEffect(() => {
        cxWrite('chat', msgs.slice(-120));
      }, [msgs]);
      /* 布局自愈：消息卡片的结构是「头一行、按钮在行尾、正文满宽」。
         若页面上还挂着旧版本样式表，级联会把正文挤到右边；这里用内联
         !important 兜底（不依赖任何外部样式），并记录「谁把它挤歪了」。 */
      useEffect(() => {
        let timer = null, observer = null, warned = false;
        const fix = () => {
          try {
            const root = document.querySelector('.cx-chat-b');
            if (!root) return;
            const fixed = [];
            root.querySelectorAll('.cx-msg').forEach((card) => {
              const main = card.querySelector('.cx-msg-main');
              const meta = card.querySelector('.cx-msg-meta');
              const tools = card.querySelector('.cx-msg-tools');
              const body = card.querySelector('.cx-msg-body');
              const want = [
                [card, 'display', 'flex', 'display'],
                [card, 'align-items', 'flex-start', 'alignItems'],
                [main, 'display', 'flex', 'display'],
                [main, 'flex-direction', 'column', 'flexDirection'],
                [main, 'align-items', 'stretch', 'alignItems'],
                [main, 'flex', '1 1 auto', 'flexGrow'],
                [main, 'min-width', '0', 'minWidth'],
                [meta, 'display', 'flex', 'display'],
                [meta, 'flex-direction', 'row', 'flexDirection'],
                [meta, 'align-items', 'center', 'alignItems'],
                [meta, 'flex-wrap', 'wrap', 'flexWrap'],
                [tools, 'margin-left', '0', 'marginLeft'],
                [body, 'width', '100%', 'width'],
                [body, 'max-width', '100%', 'maxWidth'],
              ];
              want.forEach(([el, cssKey, val, jsKey]) => {
                if (!el) return;
                const before = window.getComputedStyle(el)[jsKey];
                if (jsKey === 'flexDirection' && String(before) !== val) fixed.push(`${String(el.className).split(' ')[0]}.${jsKey}=${before}`);
                if (el.style.getPropertyValue(cssKey) !== val || el.style.getPropertyPriority(cssKey) !== 'important') el.style.setProperty(cssKey, val, 'important');
              });
            });
            if (fixed.length && !warned && typeof activity === 'function') {
              warned = true;
              activity(`布局自愈 ${fixed.length} 处（旧样式接管）：${fixed.slice(0, 4).join(' ')}`, 'warn');
            }
          } catch {}
        };
        const boot = () => { fix(); timer = setTimeout(fix, 400); timer = setTimeout(fix, 1600); };
        boot();
        try {
          const root = document.querySelector('.cx-chat-b');
          if (root && window.MutationObserver) {
            observer = new MutationObserver(() => fix());
            observer.observe(root, { childList: true, subtree: true });
          }
        } catch {}
        return () => { if (timer) clearTimeout(timer); if (observer) observer.disconnect(); };
      }, []);
      const inputRef = useRef(null);
      const lastUserRef = useRef('');
      const [mapTheme, setMapTheme] = useState(theme === 'light' ? 'light' : 'dark');
      const spaceRef = useRef(space);
      useEffect(() => { if (space) spaceRef.current = space; }, [space]);
      useEffect(() => { setMapTheme(theme === 'light' ? 'light' : 'dark'); }, [theme]);
      const draftTimerRef = useRef(null);
      const initialDraft = cxReadText('draft', '');
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
        /* 把真实渲染结果回报给服务端，便于核对当前加载的 bundle 与计算字号 */
        setTimeout(() => {
          try {
            const cs = window.getComputedStyle(el);
            api('stateSet', { name: 'clientCheckChat', value: {
              at: new Date().toISOString(),
              version: String(CLIENT_CSS).split('?v=')[1] || '',
              fontSize: cs.fontSize,
              lineHeight: cs.lineHeight,
              placeholder: (() => { try { return window.getComputedStyle(el, '::placeholder').fontSize; } catch { return ''; } })(),
              rev: String(CLIENT_CSS),
            } }).catch(() => {});
          } catch {}
        }, 300);
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
      // 一次性贴底：同步 + rAF + 三档延时，兼顾卡片异步撑高
      const userUpRef = useRef(false);
      const scrollToEnd = () => {
        userUpRef.current = false;
        const put = () => { const el = endRef.current; if (el) el.scrollTop = el.scrollHeight; };
        put();
        requestAnimationFrame(put);
        [60, 200, 420].forEach((t) => setTimeout(put, t));
      };
      useEffect(() => {
        if (!endRef.current) return;
        scrollRestorePendingRef.current = false;
        scrollToEnd();
      }, [msgs, busy, open, view, chatTab, sessionKey, space, node]);
      // 切回聊天视图时再补一次（等布局完成后）
      useEffect(() => {
        if (view !== 'chat' || chatTab !== 'chat') return;
        const t = setTimeout(scrollToEnd, 60);
        return () => clearTimeout(t);
      }, [view, chatTab, open, sessionKey]);
      // 卡片图片/表格异步撑高后，仍然贴底（否则看起来“回滚到最前面”）
      useEffect(() => {
        const el = endRef.current;
        if (!el) return;
        // 只有用户主动向上滚才停止跟随；内容撑高（卡片/表格/图片）时继续贴底
        const el2 = el;
        const onWheel = (e) => { if (e.deltaY < 0) userUpRef.current = true; };
        const onTouch = () => { userUpRef.current = true; };
        const onKey = (e) => { if (e.key === 'PageUp' || e.key === 'ArrowUp' || e.key === 'Home') userUpRef.current = true; };
        el2.addEventListener('wheel', onWheel, { passive: true });
        el2.addEventListener('touchmove', onTouch, { passive: true });
        el2.addEventListener('keydown', onKey);
        const ro = new ResizeObserver(() => { if (!userUpRef.current) el2.scrollTop = el2.scrollHeight; });
        ro.observe(el2);
        if (el2.firstElementChild) ro.observe(el2.firstElementChild);
        return () => {
          el2.removeEventListener('wheel', onWheel);
          el2.removeEventListener('touchmove', onTouch);
          el2.removeEventListener('keydown', onKey);
          ro.disconnect();
        };
      }, [chatTab, view, open, sessionKey, space, node]);
      const onMsgScroll = (e) => {
        const el = e.currentTarget;
        clearTimeout(scrollSaveTimer.current);
        scrollSaveTimer.current = setTimeout(() => cxWriteText(scrollKeyOf(), Math.round(el.scrollTop)), 300);
      };
      useEffect(() => {
        (async () => {
          try {
            let local = null;
            local = cxRead(sessionKey, null);
            if (Array.isArray(local) && local.length) return;
            const st = await api('stateGet');
            const remote = st && st['chat:' + sessionKey];
            if (Array.isArray(remote) && remote.length) {
              setMsgs(remote);
              cxWrite(sessionKey, remote);
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
          cxWrite(prev.key, prev.msgs);
        }
        let saved = null;
        saved = cxRead(sessionKey, null);
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
        cxWrite(sessionKey, msgs);
        try { api('stateSet', { name: 'chat:' + sessionKey, value: msgs.slice(-100).map((m) => ({ role: m.role, text: String(m.text || '').slice(0, 4000), t: m.t || '' })) }).catch(() => {}); } catch {}
      }, [msgs, sessionKey, open]);

      const sanitizeTrace = (v, depth = 0) => {
        if (v == null || typeof v === 'number' || typeof v === 'boolean') return v;
        if (typeof v === 'string') return v.length > 4000 ? v.slice(0, 4000) + '…' : v;
        if (depth > 4) return '[object]';
        if (Array.isArray(v)) return v.slice(0, 50).map((x) => sanitizeTrace(x, depth + 1));
        if (typeof v === 'object') { const o = {}; for (const k of Object.keys(v).slice(0, 40)) o[k] = sanitizeTrace(v[k], depth + 1); return o; }
        return String(v);
      };
      const push = (role, text, meta) => {
        const id = `m${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
        setMsgs((xs) => [...xs, { id, role, text, ...(meta || {}), t: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
        return id;
      };
      // 表单提交成功后把只读状态写回消息（刷新后仍只剩「查看详情」）
      const markFormDone = (id, link, values) => setMsgs((xs) => xs.map((m) => (m.id === id ? { ...m, done: true, link, values } : m)));
      const ai = (text, meta) => push('ai', text, meta);
      const aiCard = (text, card, meta) => push('ai', text, { ...(meta || {}), card });

      // —— 基础动作 ——
      const run = async (label, fn) => {
        setBusy(true); push('sys', label);
        try { return await fn(); }
        catch (e) { ai(`失败：${String(e?.message || e)}`); push('tool', ''); return undefined; }
        finally { setBusy(false); }
      };
      // 常用调试工具条：编程 / 切节点 / 切空间 / 开发模式
      const ToolRow = ({ ctx }) => h('div', { className: 'cx-toolrow' },
        ctx && ctx.space ? h('button', {
          className: 'cx-btn sm',
          onClick: () => cards?.openTerminal && cards.openTerminal({ node: ctx.node || node, space: ctx.space }),
        }, locale === 'zh' ? '终端' : 'Terminal') : null,
        ctx && ctx.space ? h('button', {
          className: 'cx-btn sm',
          onClick: () => cards?.rebuild && cards.rebuild({ node: ctx.node || node, space: ctx.space }),
        }, locale === 'zh' ? '重新编译' : 'Rebuild') : null,
        h('button', { className: 'cx-btn sm', onClick: () => cards?.openIde && cards.openIde(node) }, locale === 'zh' ? '编程' : 'IDE'),
        nodes && nodes.length
          ? h('label', { className: 'cx-toolsel' }, locale === 'zh' ? '节点' : 'Node',
              h('select', { value: String(node || ''), onChange: (e) => cards?.selectNode(Number(e.target.value)) },
                nodes.map((n) => h('option', { key: n.port, value: String(n.port) }, `:${n.port}`))))
          : null,
        spaces && spaces.length
          ? h('label', { className: 'cx-toolsel' }, locale === 'zh' ? '空间' : 'Space',
              h('select', { value: String(space || ''), onChange: (e) => cards?.selectSpace(e.target.value) },
                spaces.map((sp) => h('option', { key: sp.name, value: sp.name }, sp.name))))
          : null,
        h('button', { className: 'cx-btn sm', onClick: () => onOpenDev && onOpenDev() }, locale === 'zh' ? '开发模式' : 'Dev'));
      const switchMode = (id) => { if (id && id !== mode) onModeChange && onModeChange(id); };
      const actorId = () => cxActorUid(avatar);
      const appHomeUrl = (a, uid) => (!node || !a || !a.space || !a.command) ? '' : cxWebUrl({
        node, pod: a.space, command: a.command, place: a.place || 'system',
        placeUid: uid || a.place_uid || '', uid: actorId(),
      });
      const pmPortalUrl = (kind, uid) => {
        if (!node || !space) return '';
        const q = ['debug=true'];
        if (uid) q.push(`system_uid=${encodeURIComponent(uid)}`);
        return `http://127.0.0.1:${node}/s/${encodeURIComponent(space)}/c/web.team.xiangmuguanli.portal?${q.join('&')}`;
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

      // —— 应用商店 → 创建实例 ——
      // 创建应用实例：先出确认表单（实例名/城市/公司），确认后再真正创建
      const askInstance = (hit, nm) => {
        const av = avatar || {};
        const nz = (zh, en) => (locale === 'zh' ? zh : en);
        const svc = hit || {};
        const title = svc.title || svc.name || nz('应用', 'App');
        askPush(nz(`创建应用实例 · ${title}`, `Create instance · ${title}`), [
          { name: 'name', label: nz('实例名称', 'Instance name'), value: nm || title, required: true },
          { name: 'city', label: nz('城市', 'City'), value: av.city_name || '深圳市' },
          { name: 'company', label: nz('公司', 'Company'), value: av.company_name || '云轩领航' },
        ], 'instance', { service: svc });
      };

      const createAppFromStore = async (source) => {
        if (!node) { ai('还没有选中节点。'); return undefined; }
        const direct = source && typeof source === 'object' && source.command ? source : null;
        const kw = direct ? '' : String(source || '').trim();
        return run(`STORE INSTANCE ${direct ? direct.name : (kw || '-')}`, async () => {
          const list = direct ? [direct] : ((await api('storeApps', { node })) || []);
          const norm = (s) => String(s || '').toLowerCase();
          const hit = direct || list.find((s) => kw && (norm(s.title).includes(norm(kw)) || norm(s.help).includes(norm(kw)) || norm(s.command).includes(norm(kw))))
            || list.find((s) => /审批/.test(kw) && /审批|shenpi/.test(String(s.title) + String(s.command) + String(s.help)))
            || list.find((s) => /项目/.test(kw) && /项目|xiangmu/.test(String(s.title) + String(s.command) + String(s.help)))
            || list[0];
          if (!hit) { ai('应用商店里没有可用模板。'); return undefined; }
          const nm = direct ? (direct.title || direct.name) : (kw && !/创建|生成|做一个|应用/.test(kw) ? kw : (hit.title || hit.name));
          askInstance(hit, nm);
          return hit;
        });
      };

      // —— 往实例里写数据：先出表单 ——
      // 最长公共中文片段（2..6 字），用于把用户原话和「最近应用」标题对上
      const commonRun = (a, b) => {
        const s = String(a || ''), t = String(b || '');
        let best = 0;
        for (let i = 0; i < s.length; i++) {
          for (let n = 2; n <= 6 && i + n <= s.length; n++) {
            const seg = s.slice(i, i + n);
            if (t.includes(seg)) best = Math.max(best, n);
          }
        }
        return best;
      };
      // 只在「最近应用」里找实例：不看当前选中的空间/应用
      const matchRecentApp = (text, pool) => {
        const list = Array.isArray(pool) ? pool.filter((x) => x && x.command) : [];
        if (!list.length) return null;
        let best = null, bestScore = 0;
        list.forEach((x) => {
          const sc = Math.max(commonRun(text, x.title), commonRun(text, x.name), commonRun(text, x.space));
          if (sc > bestScore) { bestScore = sc; best = x; }
        });
        return bestScore >= 2 ? best : list[0];
      };

      // 应用=目录、功能=文件；读写都走同一条定位链：① 应用 ② 功能 ③ 读/写
      const appOp = async ({ text: rawText, mode = 'write', function: fnArg = '' } = {}) => {
        const text = String(rawText || lastUserRef.current || '');
        if (!text.trim()) return false;
        let list = Array.isArray(apps) ? apps.slice() : [];
        if (!list.length) {
          try { const r = await api('apps', { node, space, uid: actorId() }); if (Array.isArray(r)) list = r; } catch {}
        }
        if (!list.length) { ai('最近应用里还没有应用实例，请先在应用商店创建一个。'); return true; }

        push('step', `① 定位应用（目录）：在 ${list.length} 个最近应用里匹配`);
        let plan = null;
        try {
          plan = await api('resolveWrite', {
            node, text, mode,
            apps: list.map((x) => ({ title: x.title, name: x.name, space: x.space, command: x.command, functions: x.functions })),
          });
        } catch (e) { plan = null; }
        const byPlan = plan && plan.command ? list.find((x) => String(x.command) === String(plan.command)) : null;
        const app0 = byPlan || matchRecentApp(text, list);
        if (!app0) { ai('最近应用里没有匹配的应用，请说清楚是哪个应用。'); return true; }

        const fns = String(app0.functions || '').split(',').map((x) => x.trim()).filter(Boolean);
        let fn = String((plan && plan.fn) || fnArg || '').trim();
        if (!fn) fn = (/创建|新建|添加|建立|定义/.test(text) && /流程/.test(text)) ? 'flow' : (/发起|提交|申请|送审|报批/.test(text) ? 'request' : '');
        if (fns.length && fn && !fns.includes(fn)) fn = fns.includes('supplier') && /供应商/.test(text) ? 'supplier' : fns[0];
        if (!fn) fn = fns[0] || '';
        if (!fn) { ai('这个应用还没有可用的功能，请先到应用商店重新生成模板。'); return true; }
        push('step', `② 定位功能（文件）：${app0.title || app0.name} / ${fn}`);

        const command = String(app0.command || '').replace(/\.portal$/, '') + '.' + fn;

        if (mode === 'read') {
          push('step', `③ 读取数据：${command}`);
          let r = null;
          try { r = await api('readData', { node, space: app0.space, command }); } catch (e) { r = null; }
          if (!r || !Array.isArray(r.rows)) { ai(`读取失败：${command}`); return true; }
          const cols = (r.columns || []).slice(0, 5).map((c) => ({ key: c, label: FIELD_ZH[c] || c }));
          if (r.shape === 'detail' && r.fields) {
            // 详情：一条记录，键值对展示
            push('table', '', { table: { title: `${app0.title || app0.name} / ${fn}`, count: 1, detail: Object.entries(r.fields).slice(0, 12).map(([k, v]) => ({ key: k, label: FIELD_ZH[k] || k, value: String(v ?? '') })) } });
          } else {
            push('table', '', { table: { title: `${app0.title || app0.name} / ${fn}`, count: r.rows.length, columns: cols, rows: r.rows.slice(0, 20) } });
          }
          return true;
        }

        push('step', `③ 查询接口参数：${command}`);
        let fields = [];
        try { fields = await api('appFields', { node, space: app0.space, command }); } catch (e) { fields = []; }
        const fromMeta = Array.isArray(fields) && fields.length > 0;
        if (!fromMeta) {
          fields = [
            { name: 'title', label: '标题', labelEn: 'Title', type: 'text', required: true },
            { name: 'content', label: '内容', labelEn: 'Content', type: 'textarea' },
          ];
        }
        push('step', `④ 生成表单：${fields.length} 个字段${fromMeta ? '' : '（接口未返回字段，用通用字段）'}，确认后写入`);

        const fk = `${node}|${app0.space}|${app0.place_uid}|${fn}`;
        const saved = (typeof readFormState === 'function' ? readFormState(fk) : null) || {};
        const planned = plan && plan.values && Object.keys(plan.values).length ? { ...plan.values } : null;
        const values = saved.values || planned;
        // 表单自带上下文：节点 / 空间 / 命令 / 实例 / 身份，随时能拼出完整接口 URL
        const ctx = {
          node, space: app0.space,                 // 空间只用名称（pod），绝不用 uid
          command, portal: String(command).replace(/\.[^.]+$/, '.portal'),
          place: app0.place || 'system',           // 数据挂在哪个表上 → <place>_uid
          place_uid: app0.place_uid || '', uid: actorId(),
        };
        push('form', '', {
          form: true, app: { ...app0 }, fn, action: 'create', command, ctx,
          fields, fk, home: appHomeUrl(app0, app0.place_uid),
          done: !!saved.done, link: saved.link || '', values,
        });
        return true;
      };
      const writeIntoApp = (args) => appOp({ ...(args || {}), mode: 'write' });

      // —— 表单提交 ——
      const submitForm = async (m, vals) => {
        const a = m.app || {};
        // 只用表单自带的上下文，不依赖页面下方当前节点/空间的选择
        const ctx = m.ctx || {};
        const fNode = ctx.node || node;
        const fSpace = ctx.space || a.space;
        const cmd = ctx.command || m.command || a.command;
        const sysUid = ctx.place_uid || a.place_uid || '';
        const who = ctx.uid || actorId();
        const place = ctx.place || a.place || 'system';
        // 接口 URL：/s/<pod>/c/<portal>/action/run/<cmd>/action/<action>/<k>/<v>?user.uid=&<place>_uid=&uid=
        const scope = { [`${place}_uid`]: sysUid, 'user.uid': who, 'user_uid': who };
        // user.uid = 当前分身身份；uid 只有「改/删某条记录」时才传
        const r = await api('writeData', { node: fNode, space: fSpace, command: cmd, action: m.action || 'create', fields: vals, scope });
        const uid = (r && (r.uid || r.id)) || '';
        const portal = ctx.portal || String(cmd || '').replace(/\.[^.]+$/, '.portal');
        const url = uid
          ? cxWebUrl({ node: fNode, pod: fSpace, command: cmd, place, placeUid: sysUid, recordUid: uid, uid: who })
          : '';
        ai(locale === 'zh' ? `已提交「${a.title || a.name || '应用'}」` : `Saved to ${a.title || a.name || 'app'}`);
        return { ...(r || {}), url };
      };

      // 每个应用的默认五功能链（AI 调研失败时的兜底）：目标 → 计划 → 任务 → 报告 → 反馈
      const APP_CHAIN = [
        { name: 'target', label: '目标' },
        { name: 'plan', label: '计划' },
        { name: 'task', label: '任务' },
        { name: 'report', label: '报告' },
        { name: 'feedback', label: '反馈' },
      ];
      const CHAIN_VALUE = APP_CHAIN.map((x) => x.name).join(',');
      const CHAIN_TRANS = APP_CHAIN.map((x) => x.label).join(',');
      // 代码生成：选模板 -> 表单确认 -> 落盘 -> 编译
      const codegenAsk = async (text) => {
        const list = await api('codegenList');
        const app0 = app || (apps || [])[0] || {};
        const parts = String(app0.command || '').split('.');
        const zone = parts[1] || 'devops';
        const mod = parts[2] || 'note';
        // 先让宿主解析意图：工具栏 / 行内 + 动作名 + 条件
        let plan = null;
        try {
          plan = await api('codegenPlan', { text, module: mod, fields: [] });
        } catch (e) { plan = null; }
        const tplKey = (plan && plan.template) || (/按钮/.test(text) ? 'buttons' : 'action');
        const tpl = (list || []).find((x) => x.key === tplKey) || (list || [])[0];
        if (!tpl) { ai('没有可用的代码模板。'); return false; }
        const act = (plan && plan.action) || (text.match(/([a-zA-Z][a-zA-Z0-9_]*)/) || [])[1] || 'What';
        askPush(locale === 'zh' ? `生成代码 · ${tpl.title}` : `Code · ${tpl.title}`, [
          { name: 'zone', label: 'zone', value: zone, required: true },
          { name: 'module', label: 'module', value: mod, required: true },
          { name: 'Action', label: 'Action（导出）', value: act.charAt(0).toUpperCase() + act.slice(1), required: true },
          { name: 'action', label: 'action（小写）', value: act.toLowerCase(), required: true },
          { name: 'label', label: '按键文字', value: (plan && plan.label) || '' },
          { name: 'field', label: '条件字段', value: (plan && plan.field) || '' },
          { name: 'op', label: '比较（eq/ne/gt/lt/nonempty/empty）', value: (plan && plan.op) || '' },
          { name: 'value', label: '条件值', value: (plan && plan.value) || '' },
          { name: 'params', label: '参数', value: 'title* content*' },
        ], 'codegen', { template: tpl.key, space: app0.space || space, why: (plan && plan.why) || '' });
        if (plan && plan.why) push('step', plan.why);
        return true;
      };
      const askPush = (title, fields, action, extra) => push('ai', '', { ask: { title, fields, action, ...(extra || {}) } });
      const submitAsk = async (m, vals) => {
        const a = m.ask || {};
        if (!a.action) return;
        markFormDone(m.id);
        if (a.action === 'space') {
          return doCreateSpace(vals.name, vals.repos);
        }
        if (a.action === 'codegen') {
          const sp2 = a.space || spaceRef.current || space;
          return run(`CODEGEN ${a.template}`, async () => {
            const vars = { zone: vals.zone, module: vals.module, Action: vals.Action, action: vals.action, label: vals.label || vals.Action, field: vals.field || 'status', op: vals.op || 'eq', value: vals.value || '', params: vals.params || 'title* content*' };
            const r = await api('codegenApply', { node, space: sp2, template: a.template, vars });
            await onRefresh();
            ai(locale === 'zh'
              ? `已写入 ${r.file}（${r.bytes} 字节），编译${r.built ? '完成' : '未完成'}。`
              : `Wrote ${r.file} (${r.bytes}B), build ${r.built ? 'done' : 'incomplete'}.`);
            return r;
          });
        }
        if (a.action === 'instance') {
          const hit = a.service || {};
          const nm = String(vals.name || '').trim() || hit.title || hit.name || '我的应用';
          return run(`INSTANCE ${nm}`, async () => {
            push('step', locale === 'zh' ? '① 定位模板 ② 等待空间编译就绪 ③ 创建实例' : '① template ② wait for space ③ create');
            const d = await api('createStoreInstance', { node, service: hit, name: nm, city: vals.city || '', company: vals.company || '', uid: actorId() });
            await onRefresh();
            const data = { space: hit.space, command: hit.command, name: hit.name, title: nm, place_uid: d.place_uid || '', user_uid: actorId(), icons: hit.icons, service_name: hit.title };
            ai(locale === 'zh' ? `已创建应用实例「${nm}」（${hit.space}）。` : `Instance "${nm}" created in ${hit.space}.`);
            aiCard(locale === 'zh' ? `已从应用商店创建「${nm}」` : `Instance "${nm}" created`, { kind: 'app', entity: { kind: 'app', node, data }, action: { type: 'open', label: locale === 'zh' ? '打开界面' : 'Open', url: appHomeUrl(data, d.place_uid) } });
            return d;
          });
        }
        if (a.action === 'app') {
          return run(`AUTOGEN ${vals.name}`, async () => {
            const nm = appIdent(vals.name || '');
            const sp2 = vals.space || a.space || spaceRef.current || space;
            let finalName = appIdent(nm);
            try {
              const uq = await api('nameCheck', { node, space: sp2, name: finalName });
              if (uq && uq.name) finalName = uq.name;
            } catch (e) { /* 检查失败就按用户填的建，冲突时框架会报错 */ }
            if (finalName !== nm) ai(locale === 'zh' ? `模板名「${nm}」已被占用，改用「${finalName}」。` : `Template "${nm}" is taken, using "${finalName}".`);
            const r = await api('autogenApp', { node, space: sp2, name: finalName, help: vals.help || '', place: vals.place || 'system', value: vals.value || CHAIN_VALUE, trans: vals.trans || CHAIN_TRANS });
            await onRefresh();
            const built = !!r.built;
            ai(built
              ? `应用模板「${vals.help || nm}」已生成并编译完成（${sp2}）。`
              : `应用模板「${vals.help || nm}」已生成，编译未完成${r.buildNote ? '：' + r.buildNote : ''}。`);
            const svc = {
              name: r.name,
              title: vals.help || r.name,
              command: `web.team.${r.name}.portal`,
              space: r.space || sp2,
              place: vals.place || 'system',
              help: vals.help || '',
              icons: '',
              uid: '',
            };
            if (!built) {
              // 编译失败：不给模板卡（不可用），给这条错误消息挂上排查工具
              push('tool', '', { tool: { node, space: svc.space, name: svc.name } });
              return r;
            }
            aiCard(locale === 'zh' ? '应用商店模板' : 'Store template', { kind: 'service', entity: { kind: 'service', node, data: svc } });
            // 空间编译/重启期间创建实例会失败，轮询到就绪再提示，界面不阻塞
            let tries = 0;
            const timer = setInterval(async () => {
              tries += 1;
              if (tries > 72) { clearInterval(timer); return; }
              try {
                const st = await api('spaceReady', { node, space: svc.space, command: svc.command });
                if (st && st.ready) {
                  clearInterval(timer);
                  ai(locale === 'zh' ? `模板已就绪，可以创建实例「${svc.title}」。` : `Template ready: ${svc.title}.`);
                }
              } catch { /* keep polling */ }
            }, 5000);
            return r;
          });
        }
      };
      // 真正创建一个项目空间：建空间 → git init → 刷新 → 切为当前空间 → 卡片
      const doCreateSpace = async (nameArg, reposArg) => {
        const name = String(nameArg || '').trim();
        if (!name) return;
        const repos = String(reposArg || '').trim();
        const reposLabel = repos ? (/^https?:|^git@/.test(repos) ? repos : `https://shylinux.com/x/${repos}`) : 'git init';
        return run(`WORKSPACE ${name}`, async () => {
          const created = await api('createSpace', { node, name, repos });
          await api('initSpace', { node, space: created.name, repos });
          await onRefresh();
          spaceRef.current = created.name;
          onSelectNode(node); onSelectSpace(created.name);
          aiCard('', { entity: {
            kind: 'space', node,
            data: { name: created.name, status: 'start', version: created.version || '', size: created.size || '', help: created.help || '', icons: created.icons || '' },
            title: created.name,
            status: (locale === 'zh' ? '运行中' : 'Running'),
            statusKind: 'ok',
            sub: `:${node} · ${reposLabel}`,
            actions: [
              { label: (locale === 'zh' ? '打开' : 'Open'), url: `http://127.0.0.1:${node}/s/${encodeURIComponent(created.name)}` },
              { label: (locale === 'zh' ? '编程' : 'Code'), url: `http://127.0.0.1:${node}/s/${encodeURIComponent(created.name)}/c/command` },
            ],
          } });
          return created;
        });
      };

      // 创建应用前：让 AI 依据需求与竞品调研出五个功能及依赖，再进确认表单给用户改。
      // 应用标识：小写字母开头，只留 a-z0-9_，非法时用 app+时间戳兜底
      const appIdent = (name) => {
        const s = String(name || '').toLowerCase().replace(/[^a-z0-9_]/g, '');
        return /^[a-z][a-z0-9_]*$/.test(s) ? s : `app${Date.now().toString(36).slice(-5)}`;
      };
      // 中文名：优先取用户原话里的短语（≤16 字），不要模型写的整段解释
      const shortAppTitle = (text, name) => {
        const t = String(text || '');
        const m = t.match(/(?:创建|新建|搭建|建一个|做一个|生成|来一个|帮我做)(?:一个|个)?\s*([^\s，。,.!?！？的]{2,16})(?:的)?应用/);
        if (m && m[1]) return `${m[1]}应用`;
        const s = String(name || '').trim();
        return s ? `${s} 应用` : '应用';
      };
      const askAppPlan = (sp, name, help, place, text) => run(`PLAN ${name}`, async () => {
        let nm = appIdent(name);
        if (nm !== name) ai(`应用标识「${name}」不合规，改用「${nm}」。`);
        // 模板名必须和云社区 service 列表、目标空间已有模块区分开
        try {
          const uq = await api('nameCheck', { node, space: sp, name: nm });
          if (uq && uq.name && uq.name !== nm) {
            ai(locale === 'zh' ? `模板名「${nm}」已被占用，改用「${uq.name}」。` : `Template "${nm}" is taken, using "${uq.name}".`);
            nm = uq.name;
          }
        } catch (e) { /* 名字检查失败时继续，提交前还有一次 */ }
        const ttl = (help && String(help).trim().length <= 20 && !/[，。；、]/.test(String(help))) ? String(help).trim() : shortAppTitle(text, nm);
        let plan = null;
        try { plan = await api('appPlan', { node, space: sp, name: nm, help: ttl, text: String(text || help || nm) }); } catch (e) { plan = null; }
        const fns = (plan && Array.isArray(plan.functions) && plan.functions.length === 5)
          ? plan.functions
          : APP_CHAIN.map((x, i) => ({ name: x.name, label: x.label, depends: i ? [APP_CHAIN[i - 1].name] : [] }));
        const val = fns.map((f) => f.name).join(',');
        const tr = fns.map((f) => String(f.label || f.name).replace(/[,，、;；]/g, '')).join('、');
        const chain = fns.map((f) => `${f.label}(${f.name})`).join(' → ');
        // 参数表完全来自 service autogen 的自省（meta.autogen），客户端只填值。
        let spec = null;
        try { spec = await api('autogenSpec', { node }); } catch (e) { spec = null; }
        if (!spec || !Array.isArray(spec.fields) || !spec.fields.length) {
          ai(`读取 service autogen 参数失败：${String((spec && spec.error) || 'no fields')}`);
          return;
        }
        // place = 应用在数据库里的表名，默认就是 system；模型给的模块名一律不用
        const placeVal = (place && /^[a-z][a-z0-9_]*$/.test(String(place)) && String(place) !== nm) ? String(place) : 'system';
        const VALUES = { space: sp, name: nm, help: ttl, place: placeVal, value: val, trans: tr };
        const specFields = spec.fields.map((f) => ({
          name: f.name,
          label: f.label || f.name,
          required: !!f.required,
          value: VALUES[f.name] == null ? '' : VALUES[f.name],
        }));
        askPush(locale === 'zh' ? '创建应用模板' : 'Create app template', specFields, 'app', { node, note: (locale === 'zh' ? 'AI 调研的五个功能：' : 'AI-researched functions: ') + chain });
      });
      const generate = async (spec) => {
        let sp = spaceRef.current || space;
        if (!sp) { ai('还没有选中项目空间。先说「创建空间 demo」，或点中间空间。'); return; }
        const raw = typeof spec === 'string' ? { name: spec } : (spec || {});
        const employee = /员工|employee|yuangong/i.test(String(raw.name || '')) || /员工/.test(String(raw.help || ''));
        const base = employee
          ? { name: 'yuangong', help: '员工管理', place: 'employee', value: 'profile,position,skill,experience,education,record', trans: '员工信息，工作岗位，专业技能，工作经验，教育经历，事件记录' }
          : { name: 'app', help: '应用', place: 'system', value: 'profile', trans: '简介' };
        const preset = { ...base, ...raw };
        if (!/^[a-zA-Z][a-zA-Z0-9_]*(\s*[,，、]\s*[a-zA-Z][a-zA-Z0-9_]*)*$/.test(String(preset.value || ''))) {
          preset.value = base.value;
          preset.trans = base.trans;
        }
        if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(preset.name || '')) { ai('应用名需要字母开头，只用字母/数字/下划线。'); return; }
        return askAppPlan(sp, preset.name, preset.help, preset.place, lastUserRef.current);
      };
      const executeAction = async (action) => {
        if (!action || typeof action !== 'object') return;
        const op = String(action.op || '');
        const args = action.args && typeof action.args === 'object' ? action.args : {};
        const ctxApp = app || null;
        const ctxSpace = spaceRef.current || space || ctxApp?.space || '';
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
        if (op === 'createSpace') {
          const target = String(args.name || 'project').trim();
          if (!node) { ai('还没有选中节点。先说「部署 9188 节点」，或点左侧节点。'); return; }
          const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
          const slug = (target || 'project').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'project';
          const guess = /^\d{8}-/.test(target) ? target : `${today}-${slug}`;
          const repoName = guess.replace(/^\d{8}-?/, '') || slug;
          const repos = String(args.repos || '').trim() || `https://shylinux.com/x/${repoName}`;
          // 先出确认表单（名称/仓库可改），确认后走 doCreateSpace；仓库默认指到云社区同名库
          askPush(locale === 'zh' ? '创建项目空间 · 确认参数' : 'Create space · confirm', [
            { name: 'name', label: locale === 'zh' ? '空间名称' : 'Space name', value: guess, required: true },
            { name: 'repos', label: locale === 'zh' ? '代码库（仓库名或完整地址）' : 'Repos (name or full URL)', value: repos, hint: locale === 'zh' ? '默认 https://shylinux.com/x/<仓库名>；清空则创建空空间（git init）' : 'Default https://shylinux.com/x/<repo>; clear it to create an empty space (git init)' },
          ], 'space', { node });
          return;
        }
        if (op === 'initSpace') {
          const target = String(args.space || space || '');
          if (!target) { ai('当前没有项目空间。'); return; }
          return run(`INIT ${target}`, async () => { await api('initSpace', { node, space: target, repos: String(args.repos || '') }); await onRefresh(); });
        }
        if (op === 'autogenApp') return generate(args);
        if (op === 'createApp' || op === 'generateAppCode') {
          const appName = String(args.name || '').trim();
          // Digital-avatar / cyber-world mode never writes code.「创建 X 应用」means:
          // find the matching template in the app store, then create an instance.
          if (mode && mode !== 'factory') {
            const kw = String(appName || args.title || '').trim();
            return createAppFromStore(kw);
          }
          const sp = spaceRef.current || space;
          if (!sp) { ai('还没有选中项目空间。先创建或选择空间。'); return; }
          if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(appName)) { ai('应用名需要字母开头，只用字母/数字/下划线。'); return; }
          return askAppPlan(sp, appName, args.help || args.title || appName, args.place, lastUserRef.current);

        }
        if (op === 'createInstance') {
          const target = (apps || []).find((a) => a.name === args.name) || app;
          if (!target) { ai('没找到要建实例的应用，先生成/选择一个应用。'); return; }
          const targetSpace = target.space || space || '';
          return run(`INSTANCE ${target.name}`, async () => {
            await api('createInstance', { node, space: targetSpace, command: target.command, place: target.place || args.place || '', name: args.name || target.title || '我的应用', city: args.city || avatar?.city || '深圳市', company: args.company || avatar?.company || '云轩领航', uid: cxActorUid(avatar) });
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
        if (op === 'createStoreInstance') return createAppFromStore(args.command || args.name || '');
        if (op === 'writeData' || op === 'data') {
          if (mode !== 'avatar') { ai(locale === 'zh' ? '读写应用数据请在数字分身模式下进行。' : 'App data read/write runs in Digital Avatar mode.'); return; }
          return appOp({ ...args, mode: args.mode === 'read' ? 'read' : 'write', text: args.text || args.prompt || lastUserRef.current || '', function: args.command || args.function || '' });
        }
        ai(`AI 给出了未识别的动作：${op || 'null'}`);
      };
      const handle = async (raw) => {
        const text = String(raw || '').trim();
        if (!text || busy) return;
        lastUserRef.current = text;
        if (!chatReady) { ai('请先完成初始化：服务节点、云社区/云办公、数字分身和项目管理。'); return; }
        const attached = files.map((f) => f.name).join(', ');
        const content = attached ? `${text}\n附件：${attached}` : text;
        push('user', content); clearTimeout(draftTimerRef.current); if (inputRef.current) inputRef.current.value = ''; cxRemove('draft'); setFiles([]); try { inputRef.current?.focus({ preventScroll: true }); } catch {}
        // 读写都走同一条定位链（应用=目录、功能=文件），成功就不再调模型
        const WRITE_RE = /(添加|录入|新增|写入|加一条|新建一条|创建|发起|提交|报批)/;
        const READ_RE = /(查看|查询|看看|列出|列一下|有哪些|列表|显示|统计|多少条)/;
        const DATA_RE = /(数据|记录|列表|明细|清单|内容|情况)/;
        const CODEGEN_RE = /(加|添加|新增|生成|写)[^，。]{0,8}(动作|功能|接口|按钮|代码)/;
        if (mode === 'factory' && CODEGEN_RE.test(text)) {
          setBusy(true);
          try {
            const ok = await codegenAsk(text);
            setBusy(false);
            if (ok) return;
          } catch (e) {
            ai(`生成失败：${String(e?.message || e)}`);
            setBusy(false);
            return;
          }
        }
        if (mode === 'avatar' && WRITE_RE.test(text) && !/^(怎么|如何|为什么)/.test(text)) {
          setBusy(true);
          try {
            const ok = await appOp({ text, mode: 'write' });
            if (ok) { setBusy(false); return; }
          } catch (e) {
            ai(`执行失败：${String(e?.message || e)}`);
            setBusy(false);
            return;
          }
          setBusy(false);
        } else if (mode === 'avatar' && READ_RE.test(text) && DATA_RE.test(text)) {
          setBusy(true);
          try {
            const ok = await appOp({ text, mode: 'read' });
            if (ok) { setBusy(false); return; }
          } catch (e) {
            ai(`执行失败：${String(e?.message || e)}`);
            setBusy(false);
            return;
          }
          setBusy(false);
        }
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
        // 单一命名，不设别名：node / space / app / avatar / scene / mode / view / web / editor
        const context = {
          mode,
          view: view || 'chat',
          node,
          space,
          app: selectedApp,
          avatar: selectedAvatar,
          scene: selectedScene,
          web: webPage,
          editor: editorFile,
          experience: { sound: fx?.sound, light: fx?.light, color: fx?.color, style: fx?.style },
          functions,
          nodes: (nodes || []).map((n) => ({ port: n.port, name: n.name, state: n.state, env: n.env })),
          spaces: (spaces || []).map((s) => ({ name: s.name, status: s.status })),
          apps: [],
        };
        let recentApps = Array.isArray(apps) ? apps.slice() : [];
        if (!recentApps.length) {
          try { const rr = await api('apps', { node, space, uid: actorId() }); if (Array.isArray(rr)) recentApps = rr; } catch {}
        }
        context.apps = (recentApps || []).map((a) => ({ name: a.name, title: a.title, command: a.command }));
        // 请求上下文只保留一个场景来源：scene。旧会话可能残留 background/bg 别名，
        // 在发送边界统一剥离，避免同一份赛博世界配置在提示词里重复出现。
        const requestContext = stripSceneAliases(context);
        const startedAt = Date.now();
        setTurn({ at: startedAt, ms: 0, tokens: 0, reqBytes: 0, resBytes: 0, q: text.slice(0, 70), a: '' });
        setBusy(true); push('sys', 'DSH INTENT');
        try {
          setLive(locale === 'zh' ? '② 调用模型：分析意图与参数' : '② Calling model');
          const r = await api('chat', { message: content, history, context: requestContext, mode });
          const reply = String(r?.reply || '');
          const u = r?.usage || null;
          const tokens = u ? (Number(u.total_tokens) || ((Number(u.input_tokens) || Number(u.prompt_tokens) || 0) + (Number(u.output_tokens) || Number(u.completion_tokens) || 0))) : Math.round((content.length + reply.length) / 4);
          setTurn({ at: startedAt, ms: Number(r?.ms) || (Date.now() - startedAt), tokens, est: !u, reqBytes: Number(r?.promptBytes) || 0, resBytes: Number(r?.outputBytes) || reply.length, q: text.slice(0, 70), a: reply.slice(0, 80) });
          const trace = {
            at: new Date(startedAt).toISOString(),
            mode,
            ms: Number(r?.ms) || (Date.now() - startedAt),
            request: { message: content, history, context: requestContext, promptBytes: Number(r?.promptBytes) || 0 },
            response: { reply, usage: u || null, outputBytes: Number(r?.outputBytes) || reply.length },
            actions: [],
          };
          const aiId = reply ? ai(reply, { ms: trace.ms, tokens, est: !u, bytes: trace.response.outputBytes, trace }) : null;
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
          for (const action of actions) {
            setLive(locale === 'zh' ? `③ 执行动作：${action.op}` : `③ Action: ${action.op}`);
            let out;
            try { out = await executeAction(action); } catch (e) { out = { error: String(e?.message || e) }; }
            trace.actions.push({ op: action.op, args: action.args || {}, result: sanitizeTrace(out) });
            if (aiId) setMsgs((xs) => xs.map((m) => (m.id === aiId ? { ...m, trace: { ...trace, actions: trace.actions.slice() } } : m)));
          }
          // 模型没给动作时，客户端自己判断：写数据类指令直接执行，不再回一句「正在打开…」
          if (!actions.length && /(添加|录入|新增|写入|加一条|新建一条)/.test(text)) {
            try { await writeIntoApp({ text }); } catch (e) { ai(`执行失败：${String(e?.message || e)}`); }
          }
        } catch (e) {
          ai(`DSH 意图层调用失败：${String(e?.message || e)}\n请确认 DSH 已配置模型，或重启 DSH 加载 llm 注入。`);
        } finally {
          setLive(null);
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
      const tracePanel = traceMsg ? h('div', { className: 'cx-trace-mask', onClick: () => setTraceMsg(null) },
        h('div', { className: 'cx-trace', onClick: (e) => e.stopPropagation() },
          h('div', { className: 'cx-trace-h' },
            h('span', null, locale === 'zh' ? '请求上下文与返回' : 'Request trace'),
            h('span', { className: 'cx-trace-sub' }, `${traceMsg.mode || ''} · ${traceMsg.trace?.ms || 0}ms`),
            h('button', { className: 'cx-trace-x', onClick: () => setTraceMsg(null) }, '✕')),
          h('div', { className: 'cx-trace-b' }, ['request', 'response', 'actions'].map((k) => h('div', { key: k, className: 'cx-trace-sec' },
            h('div', { className: 'cx-trace-k' }, k === 'request' ? (locale === 'zh' ? '① 请求（原样发出）' : '① REQUEST') : k === 'response' ? (locale === 'zh' ? '② 模型返回' : '② RESPONSE') : (locale === 'zh' ? '③ 执行动作与结果' : '③ ACTIONS')),
            h('pre', { className: 'cx-trace-code' }, JSON.stringify(traceMsg.trace?.[k] ?? null, null, 2))))),
          h('div', { className: 'cx-trace-f' },
            h('button', { className: 'cx-btn sm', onClick: () => { try { navigator.clipboard.writeText(JSON.stringify(traceMsg.trace, null, 2)); } catch {} } }, T('复制全部'))))) : null;
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
        h('textarea', { key: sessionKey, ref: inputRef, className: 'cx-compose-input', rows: 3, defaultValue: initialDraft, placeholder: 'Message or run a task, / commands, @ files or sessions', disabled: busy, onChange: (e) => { const v = e.target.value; clearTimeout(draftTimerRef.current); draftTimerRef.current = setTimeout(() => cxWriteText('draft', v), 180); }, onKeyDown: (e) => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent?.isComposing) { e.preventDefault(); handle(inputRef.current?.value || ''); } } }),
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

      const renderMsg = (m, i) => m.role === 'form'
        ? h(CxWriteForm, { key: i, msg: m, lang: locale, onSubmit: submitForm, onDone: markFormDone, onOpen: (url, title) => { if (typeof OPEN_LINK === 'function') OPEN_LINK(url, title); } })
        : m.role === 'step'
        ? h('div', { key: i, className: 'cx-step' }, m.text)
        : m.role === 'table' && m.table
        ? h('div', { key: i, className: 'cx-dtable' },
            h('div', { className: 'cx-dtable-h' }, h('span', null, m.table.title), h('span', { className: 'n' }, m.table.detail ? (locale === 'zh' ? '详情' : 'DETAIL') : `${m.table.count} ${locale === 'zh' ? '条' : 'rows'}`)),
            h('div', { className: 'cx-dtable-wrap' },
              m.table.detail
                ? h('table', { className: 'cx-dtable-kv' }, h('tbody', null, m.table.detail.map((f) => h('tr', { key: f.key },
                    h('th', null, f.label), h('td', null, f.value.slice(0, 120))))))
                : h('table', null,
                    h('thead', null, h('tr', null, m.table.columns.map((c) => h('th', { key: c.key }, c.label)))),
                    h('tbody', null, m.table.rows.map((row, ri) => h('tr', { key: ri }, m.table.columns.map((c) => h('td', { key: c.key }, String(row[c.key] ?? '').slice(0, 40)))))))))
        : m.role === 'sys'
        ? h('div', { key: i, className: 'cx-sysline' }, h('span', { className: 'cx-sysdot' }), m.text)
        : h('div', { key: i, className: `cx-msg-wrap ${m.role}` },

            h('div', { className: `cx-msg ${m.role}`, style: { display: 'flex', flexDirection: m.role === 'user' ? 'row-reverse' : 'row', alignItems: 'flex-start', gap: 8 } },
            h('span', { className: 'cx-msg-avatar' }, m.role === 'user' ? 'ME' : 'AI'),
            h('div', { className: 'cx-msg-main', style: { display: 'flex', flexDirection: 'column', alignItems: 'stretch', flex: '1 1 auto', minWidth: 0 } },
              h('div', { className: 'cx-msg-meta', style: { display: 'flex', alignItems: 'center', gap: 8, width: '100%', marginBottom: 2 } },
                h('span', null, m.role === 'user' ? 'YOU' : 'COPILOT'),
                m.t ? h('span', null, m.t) : null,
                m.role === 'ai' && m.ms ? h('span', { className: 'cx-msg-metrics' }, `${(m.ms / 1000).toFixed(1)}s`) : null,
                m.role === 'ai' && m.tokens ? h('span', { className: 'cx-msg-metrics' }, `${m.est ? '≈' : ''}${m.tokens} tok`) : null,
                m.role === 'ai' && m.bytes ? h('span', { className: 'cx-msg-metrics' }, fmtBytes(m.bytes)) : null,
                h('div', { className: 'cx-msg-tools', style: { marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 } },
                m.trace ? h('button', { className: 'cx-msg-tool', title: T('查看请求的上下文与返回'), onClick: () => setTraceMsg(m) }, T('详情')) : null,
                m.role === 'ai' ? h('button', { className: 'cx-msg-tool', title: T('重试'), onClick: () => { const prev = [...msgs.slice(0, i)].reverse().find((x) => x.role === 'user'); if (prev) handle(prev.text); } }, T('重试')) : null,
                h('button', { className: 'cx-msg-tool', title: T('引用'), onClick: () => { const el = inputRef.current; if (!el) return; el.value = '> ' + String(m.text || '').split('\n').join('\n> ') + '\n'; el.focus(); } }, T('引用')),
                h('button', { className: 'cx-msg-tool', title: T('复制'), onClick: () => { try { navigator.clipboard.writeText(m.text); } catch {} } }, T('复制')),
                h('button', { className: 'cx-msg-tool danger', title: T('删除'), onClick: () => { setMsgs((list) => list.filter((_, j) => j !== i)); } }, T('删除'))),
              ),
              h('div', { className: 'cx-msg-body' },
                h(RichText, { text: m.text }),
                m.ask ? h(CxAskForm, { m, lang: locale, onSubmit: submitAsk })
                : m.card && m.card.entity && m.card.entity.kind === 'space' && m.card.entity.data
                  ? h(SpaceCard, { s: m.card.entity.data, node: m.card.entity.node || node, locale, busy: false,
                    onSelect: cards?.selectSpace, onOpen: (x) => { const id = cards?.openSpace?.(x?.name || x); if (id) setChatTab(id); }, onStart: cards?.startSpace, onStop: cards?.stopSpace, onDelete: cards?.deleteSpace, onIde: cards?.openIde, onTool: cards?.openCardTool, onHome: () => cards?.openHome?.(m.card.entity.data?.name || ''), isOpen: cards?.isOpenUrl, tone: cards?.tone })
                : m.card && m.card.entity && m.card.entity.kind === 'app' && m.card.entity.data
                  ? h(AppRow, { a: m.card.entity.data, node: m.card.entity.node || node, locale, busy: false, onSelect: cards?.selectApp, onOpen: (a) => { const id = cards?.openApp?.(a); if (id) setChatTab(id); } })
                : m.role === 'tool' ? h(ToolRow, { ctx: m.tool })
                : m.card && m.card.entity && m.card.entity.kind === 'service' && m.card.entity.data
                  ? h(StoreRow, { s: m.card.entity.data, node: m.card.entity.node || node, locale, busy: false,
                    onCreate: (svc) => createAppFromStore(svc || '') })
                : m.card && m.card.entity && m.card.entity.kind === 'node' && m.card.entity.data
                  ? h(NodeCard, { n: m.card.entity.data, locale, active: false, busy: false, onSelect: cards?.selectNode, onStart: cards?.startNode, onStop: cards?.stopNode, onDelete: cards?.deleteNode, onOpen: cards?.openNode, onIde: cards?.openIde, onTool: cards?.openCardTool, onHome: () => cards?.openHome?.(''), isOpen: cards?.isOpenUrl, tone: cards?.tone })
                : m.card && m.card.entity ? h(CxEntityCard, { e: m.card.entity, lang: locale, onOpen: (u, t) => { if (typeof OPEN_LINK === 'function') OPEN_LINK(u, t); } })
                : m.card && m.card.app ? h('div', { className: 'cx-app-card' },
                  h('div', { className: 'cx-app-card-ico' }, m.card.app.icon ? h('img', { src: m.card.app.icon, alt: '' }) : h('span', { className: 'ph' }, String(m.card.app.title || 'A').slice(0, 1))),
                  h('div', { className: 'cx-app-card-main' },
                    h('div', { className: 'cx-app-card-title' }, m.card.app.title || '应用'),
                    h('div', { className: 'cx-app-card-sub' }, m.card.app.meta || '')),
                  m.card.app.link ? h('button', { className: 'cx-app-card-open', onClick: () => { if (typeof OPEN_LINK === 'function') OPEN_LINK(m.card.app.link.url, m.card.app.title || '打开'); } }, 'OPEN') : null)
                  : m.card ? h('div', { className: 'cx-result-card' },
                  h('div', { className: 'cx-result-title' }, m.card.title || '结果'),
                  h('div', { className: 'cx-result-rows' }, (m.card.rows || []).map(([k, v], j) => h('div', { key: j, className: 'cx-result-row' }, h('span', null, k), h('b', null, String(v ?? '—'))))),
                  m.card.link ? h('button', { className: 'cx-result-link', onClick: () => { if (typeof OPEN_LINK === 'function') OPEN_LINK(m.card.link.url, m.card.link.label || '管理'); } }, m.card.link.label || '打开') : null) : null))));

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
                  h('div', { className: 'cx-chat-copy' }, h('div', { className: 'cx-chat-title' }, 'CONTEXTOS · COPILOT'), h('div', { className: 'cx-chat-sub' }, `${tt('avatar')} · ${tt('factory')} · ${tt('iot')} · ${cxClientTag()}`))),
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
          live ? h('div', { className: 'cx-live' }, h('span', { className: 'cx-live-dot' }), h('span', { className: 'cx-live-t' }, live)) : null),
        h('div', { className: 'cx-hint' },
          h('div', { className: 'cx-hint-name' }, activePlan ? (locale === 'zh' ? `计划「${activePlan.title}」` : `Plan "${activePlan.title}"`) : T(CHAT_MODES.find((m) => m.id === mode)?.name || '提示词')),
          h('div', { className: 'cx-hint-quick' }, modeQuick(CHAT_MODES.find((x) => x.id === mode)).map((label) => h('button', {
            key: label, type: 'button', className: 'cx-hint-chip', title: T('点击填入输入框'),
            onClick: () => {
              const el = inputRef.current;
              if (!el) return;
              el.value = label;
              el.focus();
              try { el.setSelectionRange(el.value.length, el.value.length); el.dispatchEvent(new Event('input', { bubbles: true })); } catch {}
            },
          }, label))),
          h('button', { className: 'cx-hint-more', onClick: () => setShowMore((v) => !v) }, showMore ? T('收起') : T('更多'))),
        showMore ? h('div', { className: 'cx-hint-panel' }, CHAT_MODES.map((m) => {
          const note = PRODUCT_NOTES[m.id] || {};
          return h('button', { key: m.id, className: `cx-hint-card${m.id === mode ? ' on' : ''}`, onClick: () => { switchMode(m.id); setShowMore(false); } },
            h('div', { className: 'ht' }, T(note.tag || 'MODE'), ' · ', locale === 'zh' ? (note.title || m.name) : modeLabel(m)),
            h('div', { className: 'hd' }, T(note.text || m.intro)));
        })) : null,
            busy ? h('div', { className: 'cx-chat-typing' }, T('Copilot 正在执行…')) : null,
            compose,
            chatTab !== 'chat' && replyPop ? h('div', { className: 'cx-webpop' },
              h('div', { className: 'h' }, h('span', null, locale === 'zh' ? '最近一条回复' : 'LATEST REPLY'), h(IconButton, { name: 'close', onClick: () => setReplyPop(false) })),
              h('div', { className: 'b' }, lastAi ? h(RichText, { text: lastAi.text }) : h('div', { className: 'cx-empty' }, '—'))) : null),
          showRight ? rightPanel : null),
        tracePanel,
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
