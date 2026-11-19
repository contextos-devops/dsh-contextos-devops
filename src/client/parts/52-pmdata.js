    // Single PM data source for the chat panel. Selection switches pass their
    // ids through this hook; no component performs ad-hoc PM fetches.
    // loadPm(focus) accepts the entity the user just touched ({kind, uid, target_uid,
    // plan_uid, task_uid, report_uid}). Its ancestors are sent as query filters so the
    // fresh entity is present in the returned list and pmList.next can point at it.
    const PM_FOCUS_UID = { target: 'target_uid', plan: 'plan_uid', task: 'task_uid', report: 'report_uid', feedback: 'report_uid' };
    function usePmData({ node, avatarUid, locale, targetId, planId, taskId, reportId }) {
      const [pm, setPm] = useState(null);
      const [pmError, setPmError] = useState('');
      const [pmRefreshing, setPmRefreshing] = useState(false);
      const seqRef = useRef(0);
      const selRef = useRef({});
      selRef.current = { target_uid: targetId || '', plan_uid: planId || '', task_uid: taskId || '', report_uid: reportId || '' };
      const loadPm = useCallback(async (focus) => {
        if (!node || !avatarUid) {
          setPm(null);
          setPmError(!node ? '请选择服务节点' : '等待分身加载…');
          return null;
        }
        const seq = ++seqRef.current;
        setPmRefreshing(true);
        setPmError('');
        const q = { node, uid: avatarUid, lang: locale, ...selRef.current };
        const f = focus && typeof focus === 'object' ? focus : null;
        if (f) {
          for (const k of ['target_uid', 'plan_uid', 'task_uid', 'report_uid']) if (f[k]) q[k] = String(f[k]);
          if (f.kind && f.uid) { q.focus_kind = String(f.kind); q.focus_uid = String(f.uid); }
        }
        try {
          const d = await api('pmList', q);
          if (seq === seqRef.current) setPm(d || null);
          activity(`加载项目管理：目标 ${(d?.targets || []).length} · 计划 ${(d?.plans || []).length} · 任务 ${(d?.tasks || []).length}`, 'ok');
          return d || null;
        } catch (e) {
          if (seq === seqRef.current) { setPm(null); setPmError(String(e?.message || e)); }
          return null;
        } finally {
          if (seq === seqRef.current) setPmRefreshing(false);
        }
      }, [node, avatarUid, locale, targetId, planId, taskId, reportId]);
      useEffect(() => { loadPm(); }, [loadPm]);
      return { pm, pmError, pmRefreshing, loadPm };
    }
    // 由 pmList.next（服务端唯一真源）生成可序列化快捷按钮：消息会进 JSON 存储，
    // 不能带函数，只能存 {kind,action,item_uid,title,uids,preset}，点击时再重建 item。
    function pmNextChips(pm) {
      const n = pm && pm.next;
      if (!n || !n.kind) return [];
      const uids = { target_uid: '', plan_uid: '', task_uid: '', report_uid: '' };
      const item = n.item || {};
      if (n.kind === 'plan') uids.target_uid = item.target_uid || item.uid || '';
      if (n.kind === 'task') { uids.target_uid = item.target_uid || ''; uids.plan_uid = item.plan_uid || item.uid || ''; }
      if (n.kind === 'report') { uids.target_uid = item.target_uid || ''; uids.plan_uid = item.plan_uid || ''; uids.task_uid = item.task_uid || item.uid || ''; }
      if (n.kind === 'feedback') { uids.target_uid = item.target_uid || ''; uids.plan_uid = item.plan_uid || ''; uids.task_uid = item.task_uid || ''; uids.report_uid = item.report_uid || item.uid || ''; }
      const kindLabel = PM_KIND_LABEL[n.kind] || n.kind;
      if (n.action === 'finish') return [{ label: `完成${kindLabel}`, kind: n.kind, action: 'finish', item_uid: n.item_uid, title: n.title, uids }];
      if (n.action === 'process') return [{ label: `开始${kindLabel}`, kind: n.kind, action: 'process', item_uid: n.item_uid, title: n.title, uids }];
      if (n.action === 'submit' || n.action === 'approve') return [{ label: n.label, kind: n.kind, action: n.action, item_uid: n.item_uid, title: n.title, uids }];
      const create = { label: n.label, kind: n.kind, action: 'create', item_uid: n.item_uid, title: n.title || '', uids, next: { kind: n.kind, action: n.action } };
      if (n.kind === 'feedback') {
        return [
          { ...create, label: '可以完成', preset: { feedback_status: 'canFinish' } },
          { ...create, label: '需要改进', preset: { feedback_status: 'shouldImprove' } },
        ];
      }
      return [create];
    }
