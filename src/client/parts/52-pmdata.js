    // Single PM data source for the chat panel. Selection switches pass their
    // ids through this hook; no component performs ad-hoc PM fetches.
    function usePmData({ node, avatarUid, locale, targetId, planId, taskId, reportId }) {
      const [pm, setPm] = useState(null);
      const [pmError, setPmError] = useState('');
      const [pmRefreshing, setPmRefreshing] = useState(false);
      const seqRef = useRef(0);
      const loadPm = useCallback(async () => {
        if (!node || !avatarUid) {
          setPm(null);
          setPmError(!node ? '请选择服务节点' : '等待分身加载…');
          return;
        }
        const seq = ++seqRef.current;
        setPmRefreshing(true);
        setPmError('');
        try {
          const d = await api('pmList', { node, uid: avatarUid, lang: locale, target_uid: targetId, plan_uid: planId, task_uid: taskId, report_uid: reportId });
          if (seq === seqRef.current) setPm(d || null);
          activity(`加载项目管理：目标 ${(d?.targets || []).length} · 计划 ${(d?.plans || []).length} · 任务 ${(d?.tasks || []).length}`, 'ok');
        } catch (e) {
          if (seq === seqRef.current) { setPm(null); setPmError(String(e?.message || e)); }
        } finally {
          if (seq === seqRef.current) setPmRefreshing(false);
        }
      }, [node, avatarUid, locale, targetId, planId, taskId, reportId]);
      useEffect(() => { loadPm(); }, [loadPm]);
      return { pm, pmError, pmRefreshing, loadPm };
    }
