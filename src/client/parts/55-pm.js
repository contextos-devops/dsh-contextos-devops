    // 状态色语言（与 kit.css 的 .is-* 一一对应）：先判断「要不要用户注意」，再判断「警醒还是鼓励」。
    const PM_STATUS_TONE = { created: 'is-idle', submited: 'is-review', approved: 'is-ready', process: 'is-active', finished: 'is-done', canceled: 'is-halted', rejected: 'is-failed', canFinish: 'is-active', shouldImprove: 'is-review' };
    const pmTone = (key) => PM_STATUS_TONE[key] || 'is-idle';
    const PM_KIND_LABEL = { target: '目标', plan: '计划', task: '任务', report: '报告', feedback: '反馈' };
    const PM_SHORT = { target: '目标', plan: '计划', task: '任务', report: '报告', feedback: '反馈' };
    const PM_ACTION_LABEL = { planCreate: '+ 计划', taskCreate: '+ 任务', reportCreate: '+ 报告', feedbackCreate: '+ 反馈', submit: '提交', approve: '通过', reject: '驳回', process: '开始', finish: '完成', cancel: '取消', modify: '编辑', remove: '删除', handover: '交接', open: '打开链接' };
    // Shared PM card. Keep status/action presentation in one place so every
    // entity type has the same selection, badge, effect and context-menu UI.
    const PM_MENU_ACTIONS = new Set(['modify', 'remove', 'cancel', 'reject', 'handover']);
    


    // 甘特图：只显示进行中的计划；计划条内嵌任务条（未完成画到最右）
    function Gantt({ plans, activeUid }) {
      const ts = (v) => { if (!v) return null; const d = new Date(String(v).replace(' ', 'T')); return Number.isNaN(d.getTime()) ? null : d.getTime(); };
      const rows = (plans || []).filter((p) => p.status_name === 'process');
      if (!rows.length) return h('div', { className: 'cx-gantt-empty' }, T('没有进行中的计划'));
      let min = Infinity, max = -Infinity;
      for (const p of rows) {
        for (const v of [p.begin_time, p.end_time]) { const t = ts(v); if (t != null) { min = Math.min(min, t); max = Math.max(max, t); } }
      }
      if (!Number.isFinite(min) || max <= min) return h('div', { className: 'cx-gantt-empty' }, T('计划缺少起止时间'));
      const span = max - min;
      const pct = (t) => Math.max(0, Math.min(100, ((t - min) / span) * 100));
      /* 行高与任务间距按“计划数 + 任务总数”自适应，目标是把所有计划和任务都放进 168px 可视区 */
      const rowCount = rows.length;
      const totalTasks = rows.reduce((a, p) => a + Math.min(8, (p.tasks || []).length), 0);
      const step = Math.max(4, Math.min(11, Math.floor((168 - rowCount * 10 - (rowCount - 1) * 3) / Math.max(1, totalTasks))));
      const label = (t) => { const d = new Date(t); return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
      const now = Date.now();
      const nowPct = Math.max(0, Math.min(100, ((now - min) / span) * 100));   /* 超出范围时贴边显示 */
      return h('div', { className: 'cx-gantt' },
        h('div', { className: 'cx-gantt-axis' }, h('span', null, label(min)), h('span', { className: 'mid' }, T('进行中的计划')), h('span', null, label(max))),
        h('div', { className: 'cx-gantt-body' },
        nowPct != null ? h('div', { className: 'cx-gantt-now', style: { left: nowPct + '%' }, title: T('当前时间') }) : null,
        rows.map((p) => {
        const pb = ts(p.begin_time), pe = ts(p.end_time);
        const left = pct(pb ?? min), right = pct(pe ?? max);
        const width = Math.max(2, right - left);
        const isActive = p.uid === activeUid;
        const tasks = (p.tasks || []).slice(0, 8);
        const top0 = 5;
        const rowH = Math.max(18, top0 + tasks.length * step + 4 + (isActive ? 4 : 0));
        return h('div', { className: `cx-gantt-row${isActive ? ' on' : ''}`, key: p.uid },
          h('div', { className: 'cx-gantt-track', style: { height: rowH + 'px', minHeight: rowH + 'px' } },
            h('div', { className: `cx-gantt-plan${isActive ? ' on' : ''}`, style: { left: left + '%', width: width + '%', height: rowH + 'px' } },
              tasks.map((t, i) => {
                const tb = ts(t.begin_time) ?? ts(t.created_at) ?? pb ?? min;
                const done = t.status_name === 'finished' || t.status_name === 'canceled';
                const te = done ? (ts(t.finished_time) ?? ts(t.process_time) ?? max) : max;   /* 未完成 → 最右 */
                const l = Math.max(pb ?? min, Math.min(tb, te));
                const r = Math.min(pe ?? max, Math.max(tb, te));
                const lp = Math.max(0, ((l - (pb ?? min)) / Math.max(1, (pe ?? max) - (pb ?? min))) * 100);
                const wp = Math.max(1.5, ((Math.max(r, l + 1) - l) / Math.max(1, (pe ?? max) - (pb ?? min))) * 100);
                return h('div', {
                  key: t.uid || i,
                  className: `cx-gantt-task ${t.status_name || 'created'}`,
                  title: `${t.title || ''} · ${t.status_name || ''}`,
                  style: { left: lp + '%', width: Math.min(100 - lp, wp) + '%', top: (top0 + i * step) + 'px', height: Math.max(3, Math.min(6, step - 3)) + 'px' },
                });
              }))));
      }))
      );
    }

    function PmFilter({ label, options, value, onChange }) {
      if (!(options || []).length) return null;
      return h('div', { className: 'cx-pm-tools' }, h(MultiFilter, { label, options, value, onChange }));
    }
    function PmEmpty({ children, label, onCreate }) { return h('div', { className: 'cx-pm-empty' }, children, onCreate ? h('button', { className: 'cx-pm-create-big', type: 'button', onClick: onCreate }, h(UiIcon, { name: 'plus', size: 18 }), label) : null); }
    function PmCreateButton({ kind, allowed, onCreate }) {
      return allowed ? h(IconButton, { name: 'plus', className: 'cx-pm-op', onClick: onCreate, title: `Create ${kind}` }) : null;
    }
    // 滚动时的上下文栈：每一层「标题栏 + 当前项」按层级从上往下堆叠，
    // 数据再多也能一眼看清自己在 目标/计划/任务/报告/反馈 的哪一层。
    function PmStickyStack({ rows }) {
      const list = (rows || []).filter((r) => r && r.title);
      if (!list.length) return null;
      return h('div', { className: 'cx-pm-sticky' }, list.map((r) => h('div', { key: r.kind, className: 'cx-pm-pin' },
        h('span', { className: 'cx-pm-pin-k' }, r.label),
        h('span', { className: 'cx-pm-pin-t', title: r.title }, r.title),
        r.status ? h('span', { className: `cx-entity-status ${pmTone(r.statusKey)}` }, r.status) : null)));
    }
    function PmSectionHead({ icon, title, count, folded, onToggle, onRefresh, tools, style }) {
      return h('div', { className: 'cx-pm-h', style: style || null, onClick: (e) => { if (e.target.closest('button, select, input, .cx-menu, .cx-sel')) return; onToggle && onToggle(); } },
        h('div', { className: 'cx-pm-titleline' },
          h(IconButton, { name: folded ? 'chevronRight' : 'chevronDown', className: 'cx-pm-caret', 'aria-expanded': !folded, title: folded ? T('展开') : T('折叠'), onClick: (e) => { e.stopPropagation(); onToggle && onToggle(); } }),
          h('span', { className: 'cx-pm-kind' }, h(Ico, { name: icon })),
          h('span', null, title),
          count != null ? h('span', { className: 'cx-pm-count' }, count) : null),
        h('span', { className: 'cx-pm-ops' }, onRefresh ? h(IconButton, { name: 'refresh', className: 'cx-pm-refresh', onClick: onRefresh }) : null, tools || null));
    }
    /* PM 面板的 5 个共享状态：聊天右栏与管理页以前各写一份 useState（6 行 × 2）。
       统一成 hook 后，加一个筛选维度只改这里。 */
    function usePmPanelState() {
      const [planStatusFilter, setPlanStatusFilter] = useState([]);
      const [taskStatusFilter, setTaskStatusFilter] = useState([]);
      const [reportTypeFilter, setReportTypeFilter] = useState([]);
      const [feedbackStatusFilter, setFeedbackStatusFilter] = useState([]);
      const [pmForm, setPmForm] = useState(null);
      return { planStatusFilter, setPlanStatusFilter, taskStatusFilter, setTaskStatusFilter, reportTypeFilter, setReportTypeFilter, feedbackStatusFilter, setFeedbackStatusFilter, pmForm, setPmForm };
    }

    function pmFilterOptions(list, key) {
      const labelKey = key === 'type_name' ? 'type_label' : `${key}_label`;
      // count 是该取值在这批数据里的条数：下拉里直接显示「Approved 5」，不用先筛一遍才知道有多少
      const counts = new Map();
      (list || []).forEach((x) => { const v = x[key]; if (v) counts.set(v, (counts.get(v) || 0) + 1); });
      return [...counts.keys()].map((value) => ({
        value,
        count: counts.get(value),
        label: (list || []).find((x) => x[key] === value)?.[labelKey] || (key === 'status_name' ? pmStatusText(value) : value),
      }));
    }
    const PM_STATUS_ORDER = ['created', 'submited', 'approved', 'process', 'finished', 'canceled', 'rejected'];
    function sortPmItems(items) {
      const rank = new Map(PM_STATUS_ORDER.map((name, i) => [name, i]));
      return (items || []).slice().sort((a, b) => {
        const ra = rank.has(a.status_name) ? rank.get(a.status_name) : 99;
        const rb = rank.has(b.status_name) ? rank.get(b.status_name) : 99;
        if (ra !== rb) return ra - rb;
        return String(b.created_at || b.updated_at || '').localeCompare(String(a.created_at || a.updated_at || ''));
      });
    }
    // 卡片上的「⋯」永远存在：没有二级动作时置灰（而不是整块消失），
    // 这样同一列卡片的按钮区始终对齐，也不会让人以为漏渲染。
    function PmActionMenu({ actions, onAction }) {
      const list = actions || [];
      return h(MenuButton, {
        disabled: !list.length,
        items: list.map((action) => ({ label: PM_ACTION_LABEL[action] || action, danger: ['remove', 'cancel', 'reject'].includes(action), action: () => onAction(action) })),
      });
    }
    // 卡片出场特效：新卡/变更卡每次刷新按 1..5 轮换一种动画
    let CX_ANIM_SEQ = 0;
    function cxCardSig(item) {
      return [item.title, item.content, item.status_key, item.status_label, item.score, item.begin_time, item.end_time, item.updated_at, item.type_name, item.uid].join('|');
    }
    function cxCardAnimRef() {
      CX_ANIM_SEQ = (CX_ANIM_SEQ % 5) + 1;
      return CX_ANIM_SEQ;
    }

    // 计划卡片：只显示 MM-DD（同年）或 YYYY-MM-DD（跨年），有时间才带 HH:mm
    function shortDate(v) {
      const s = String(v || '');
      if (!s) return '';
      const d = s.slice(0, 10);
      const sameYear = d.slice(0, 4) === String(new Date().getFullYear());
      const day = sameYear ? d.slice(5) : d;
      const hasTime = s.length > 10 && !/^\d{4}-\d{2}-\d{2}[ T]00:00/.test(s);
      return hasTime ? `${day} ${s.slice(11, 16)}` : day;
    }

    function PmCard({ item, kind, active, sub, traceIds, traceLog, onSelect, onAction }) {
      const statusKey = item.status_name || item.type_name || (kind === 'report' ? 'report' : '');
      const statusLabel = item.status_label ? T(item.status_label) : (item.status_name ? pmStatusText(item.status_name) : '');
      const score = Number(item.score);
      const stars = kind === 'feedback' && Number.isFinite(score) && item.score !== '' && item.score != null
        ? `${'★'.repeat(Math.max(0, Math.min(5, score)))}${'☆'.repeat(Math.max(0, 5 - Math.max(0, Math.min(5, score))))}`
        : '';
      const animRef = useRef(0);
      if (!animRef.current) animRef.current = cxCardAnimRef();
      const anim = animRef.current;
      const actions = item.actions || [];
      const primary = actions.filter((a) => !PM_MENU_ACTIONS.has(a));
      const secondary = actions.filter((a) => PM_MENU_ACTIONS.has(a));
      return h('div', { key: `${item.uid}:${cxCardSig(item)}`, className: `cx-pm-card${active ? ' on' : ''}${(traceIds || []).includes(item.uid) ? ' trace' : ''}${anim ? ` cx-in cx-in-${anim}` : ''}`, onClick: onSelect, role: 'button' },
        h(DoubleLineTitle, {
          image: item.image || item.avatar || item.icon,
          icon: h(Ico, { name: kind, size: 24 }),
          title: item.title || item.uid,
          status: statusLabel,
          statusTone: pmTone(statusKey),
          meta: [kind === 'plan' && item.begin_time ? `${shortDate(item.begin_time)} → ${shortDate(item.end_time)}` : (item.created_at ? String(item.created_at).slice(0, 16) : ''), sub, (traceIds || []).includes(item.uid) ? `#${String(traceLog || '').slice(0, 8)}` : ''].filter(Boolean).join(' · '),
        }),
        item.content ? h('div', { className: 'cx-pm-content', title: item.content }, item.content) : null,
        stars ? h('div', { className: 'cx-pm-stars', title: `${score} / 5` }, stars) : null,
        h('div', { className: 'cx-pm-card-actions' },
          primary.map((action) => h('button', { key: action, className: `cx-pm-act${action === 'remove' ? ' danger' : ''}`, onClick: (e) => { e.stopPropagation(); onAction(action); } }, T(PM_ACTION_LABEL[action] || action))),
          h(PmActionMenu, { actions: secondary, onAction })));
    }
