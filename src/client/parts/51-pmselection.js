    // Persisted PM selection. The component only owns rendering; restoring and
    // saving the five selected ids is one concern, so it lives here.
    function usePmSelection({ avatarUid }) {
      const [targetId, setTargetId] = useState('');
      const [planId, setPlanId] = useState('');
      const [taskId, setTaskId] = useState('');
      const [reportId, setReportId] = useState('');
      const [feedbackId, setFeedbackId] = useState('');
      const ownerRef = useRef('');
      useEffect(() => {
        const uid = avatarUid || '';
        if (!uid || ownerRef.current === uid) return;
        ownerRef.current = uid;
        let saved = (cxSessionGet() || {}).pm || {};
        if (!saved || !Object.keys(saved).length) saved = cxRead('pm', {})[uid] || {};
        setTargetId(saved.target || ''); setPlanId(saved.plan || ''); setTaskId(saved.task || ''); setReportId(saved.report || ''); setFeedbackId(saved.feedback || '');
      }, [avatarUid]);
      useEffect(() => {
        const uid = avatarUid || '';
        if (!uid || ownerRef.current !== uid) return;
        if (!targetId && !planId && !taskId && !reportId && !feedbackId) return;
        const shaped = { target: targetId, plan: planId, task: taskId, report: reportId, feedback: feedbackId };
        cxSessionSave({ pm: shaped });
        try {
          const all = cxRead('pm', {});
          all[uid] = shaped;
          cxWrite('pm', all);
        } catch {}
      }, [avatarUid, targetId, planId, taskId, reportId, feedbackId]);
      return { targetId, setTargetId, planId, setPlanId, taskId, setTaskId, reportId, setReportId, feedbackId, setFeedbackId };
    }
