    function PMModal({ kind, mode, item, parent, node, avatar, onClose, onDone }) {
      const [title, setTitle] = useState(item?.title || '');
      const [content, setContent] = useState(item?.content || '');
      const [begin, setBegin] = useState(String(item?.begin_time || new Date().toISOString().slice(0, 10)).slice(0, 10));
      const [end, setEnd] = useState(String(item?.end_time || new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)).slice(0, 10));
      const [reportType, setReportType] = useState(item?.type_name || item?.report_type || 'daily');
      const [score, setScore] = useState(String(item?.score || 5));
      const [feedbackStatus, setFeedbackStatus] = useState(String(item?.feedback_status ?? item?.status_name ?? item?.status ?? ''));
      const [busy, setBusy] = useState(false);
      const [err, setErr] = useState('');
      const [fieldOpts, setFieldOpts] = useState({});
      const project = avatar?.project || item?.project || null;
      const command = `web.team.xiangmuguanli.${kind}`;
      const formFields = [
        'title', 'content',
        ...(kind === 'plan' ? ['begin', 'end'] : []),
        ...(kind === 'report' ? ['report_type'] : []),
        ...(kind === 'feedback' ? ['score', 'feedback_status'] : []),
      ];
      const selectFields = new Set(['report_type', 'feedback_status', 'score']);
      const requiredFields = new Set([
        'title',
        ...(kind === 'plan' ? ['begin', 'end'] : []),
        ...(kind === 'report' ? ['report_type'] : []),
        ...(kind === 'feedback' ? ['score', 'feedback_status'] : []),
      ]);
      const fieldLabels = { title: 'Title', content: 'Content', begin: 'Start', end: 'End', report_type: 'Report type', score: 'Score', feedback_status: 'Feedback status' };
      const fieldInflight = useRef(new Set());
      const loadField = useCallback(async (field) => {
        if (!node || !project?.space || fieldOpts[field] || fieldInflight.current.has(field)) return;
        fieldInflight.current.add(field);
        try {
          const d = await api('fieldOptions', { node, space: project.space, command, field, project_uid: project.place_uid || '', uid: avatar?.uid || '' });
          if (d?.options?.length) setFieldOpts((cur) => ({ ...cur, [field]: d }));
        } catch { /* free-text field */ }
        finally { fieldInflight.current.delete(field); }
      }, [node, project?.space, project?.place_uid, avatar?.uid, command, fieldOpts]);
      useEffect(() => { formFields.forEach((field) => loadField(field)); }, [kind, node, project?.space, project?.place_uid, avatar?.uid, command]);
      useEffect(() => {
        if (kind === 'report' && !item && fieldOpts.report_type?.options?.length) setReportType(String(fieldOpts.report_type.options[0].value ?? ''));
        if (kind === 'feedback' && !item && fieldOpts.feedback_status?.options?.length) setFeedbackStatus(String(fieldOpts.feedback_status.options[0].value ?? ''));
      }, [kind, item, fieldOpts]);
      const missing = [...requiredFields].filter((field) => {
        const value = field === 'title' ? title : field === 'content' ? content : field === 'begin' ? begin : field === 'end' ? end : field === 'report_type' ? reportType : field === 'score' ? score : field === 'feedback_status' ? feedbackStatus : '';
        return !String(value ?? '').trim();
      });
      const control = (field, value, setValue, { full = false, type = 'text', multiline = false } = {}) => {
        const opts = fieldOpts[field]?.options || [];
        const metaLabel = fieldOpts[field]?.field_label;
        const label = T((metaLabel && metaLabel !== field && /[^\x00-\x7F]/.test(metaLabel)) ? metaLabel : (fieldLabels[field] || metaLabel || field));
        const required = requiredFields.has(field);
        const common = { className: 'cx-input', value, onFocus: () => loadField(field), 'aria-required': required || undefined };
        const input = selectFields.has(field)
          ? h('select', { ...common, onChange: (e) => setValue(e.target.value) },
              opts.length ? opts.map((o) => h('option', { key: String(o.value), value: String(o.value) }, T(o.label || o.name || String(o.value)))) : h('option', { value: '' }, '加载中…'))
          : h(React.Fragment, null,
              multiline
                ? h('textarea', { ...common, rows: 3, onChange: (e) => setValue(e.target.value) })
                : h('input', { ...common, type, list: opts.length ? `cx-dl-${field}` : undefined, onChange: (e) => setValue(e.target.value) }),
              opts.length ? h('datalist', { id: `cx-dl-${field}` }, opts.map((o) => h('option', { key: o.value, value: o.name || o.value }, o.label))) : null);
        return h('label', { className: `cx-field${full ? ' full' : ''}${required ? ' req' : ''}` },
          h('span', { className: 'cx-field-lb' }, label, required ? h('b', { className: 'cx-req' }, ' *') : null),
          input);
      };
      const submit = async () => {
        setBusy(true); setErr('');
        try {
          const body = { node, uid: avatar?.uid || '', kind, ...(parent || {}) };
          // 只取当前类型表单里真实存在的字段，其它一律不采
          const norm = (field, raw) => {
            const list = fieldOpts[field]?.options || [];
            const hit = list.find((o) => String(o.value) === String(raw) || String(o.name) === String(raw) || String(o.label) === String(raw));
            return hit ? String(hit.value) : String(raw ?? '');
          };
          const values = { title, content, begin_time: begin, end_time: end, report_type: norm('report_type', reportType), score, feedback_status: norm('feedback_status', feedbackStatus) };
          for (const f of formFields) {
            const key = f === 'begin' ? 'begin_time' : f === 'end' ? 'end_time' : f;
            body[key] = values[key];
          }
          body.uid_options = Object.fromEntries(Object.entries(parent || {}).filter(([k, v]) => /_uid$/.test(k) && k !== 'user_uid' && v));
          if (mode === 'edit') { body.item_uid = item.uid; body.uid_options = uidFieldMap(item); await api('pmModify', body); }
          else await api('pmCreate', body);
          onDone();
        } catch (e) { setErr(String(e?.message || e)); } finally { setBusy(false); }
      };
      return h(Modal, { title: `${T(mode === 'edit' ? 'Edit' : 'New')} ${T(PM_KIND_LABEL[kind] || kind)}`, desc: parent ? T('Inherits the current selection as the parent UID') : '', onClose },
        h('div', { className: 'cx-form-hint' }, h('b', null, '*'), ' ', T('Required; candidates come from the inputs API, select fields accept list values only.')),
        h('div', { className: 'cx-form' },
          control('title', title, setTitle, { full: true }),
          control('content', content, setContent, { full: true, multiline: true }),
          kind === 'plan' ? control('begin', begin, setBegin, { type: 'date' }) : null,
          kind === 'plan' ? control('end', end, setEnd, { type: 'date' }) : null,
          kind === 'report' ? control('report_type', reportType, setReportType, { full: true }) : null,
          kind === 'feedback' ? control('score', score, setScore) : null,
          kind === 'feedback' ? control('feedback_status', feedbackStatus, setFeedbackStatus) : null),
        missing.length ? h('div', { className: 'cx-form-warn' }, TT('还有 {n} 个必填项未填写', { n: missing.length })) : null,
        err ? h(ErrorBox, { text: err }) : null,
        h('div', { className: 'cx-foot' }, h('button', { className: 'cx-btn', onClick: onClose }, T('取消')), h('button', { className: 'cx-btn pri', disabled: busy || missing.length > 0, onClick: submit }, busy ? T('保存中…') : mode === 'edit' ? T('保存') : T('创建'))));
    }

    function mdInline(text) {
      const out = [];
      const re = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;
      let last = 0, m;
      while ((m = re.exec(text))) {
        if (m.index > last) out.push(text.slice(last, m.index));
        const token = m[0];
        if (token.startsWith('**')) out.push(h('strong', { key: out.length }, token.slice(2, -2)));
        else if (token.startsWith('`')) out.push(h('code', { key: out.length, className: 'cx-md-inline' }, token.slice(1, -1)));
        else {
          const mm = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
          out.push(mm ? h('a', { key: out.length, className: 'cx-md-a', href: mm[2], target: '_blank', rel: 'noreferrer', onClick: (e) => { if (OPEN_LINK) { e.preventDefault(); e.stopPropagation(); OPEN_LINK(mm[2], mm[1]); } } }, mm[1]) : token);
        }
        last = m.index + token.length;
      }
      if (last < text.length) out.push(text.slice(last));
      return out;
    }

    const RichText = React.memo(function RichText({ text }) {
      const src = String(text || '');
      const parts = [];
      const re = /```([A-Za-z0-9_-]*)\n?([\s\S]*?)```/g;
      let last = 0, m, key = 0;
      const renderText = (chunk) => {
        const lines = chunk.split('\n');
        const nodes = [];
        let list = null, ordered = false;
        const flush = () => { if (list) { nodes.push(h(ordered ? 'ol' : 'ul', { key: `l${key++}`, className: 'cx-md-list' }, list)); list = null; } };
        for (const line of lines) {
          const hd = line.match(/^(#{1,4})\s+(.*)$/);
          const ul = line.match(/^[-*]\s+(.*)$/);
          const ol = line.match(/^\d+\.\s+(.*)$/);
          const quote = line.match(/^>\s?(.*)$/);
          if (hd) { flush(); nodes.push(h('div', { key: `h${key++}`, className: `cx-md-h h${hd[1].length}` }, mdInline(hd[2]))); }
          else if (ul || ol) {
            const isOrdered = !!ol;
            if (!list || ordered !== isOrdered) { flush(); list = []; ordered = isOrdered; }
            list.push(h('li', { key: `i${key++}` }, mdInline((ul || ol)[1])));
          } else if (quote) { flush(); nodes.push(h('blockquote', { key: `q${key++}`, className: 'cx-md-quote' }, mdInline(quote[1]))); }
          else if (!line.trim()) { flush(); }
          else { flush(); nodes.push(h('div', { key: `p${key++}`, className: 'cx-md-p' }, mdInline(line))); }
        }
        flush();
        return nodes;
      };
      while ((m = re.exec(src))) {
        if (m.index > last) parts.push(h('div', { key: `t${key++}` }, renderText(src.slice(last, m.index))));
        const lang = m[1] || 'code';
        const code = m[2].replace(/\n$/, '');
        parts.push(h('div', { key: `c${key++}`, className: 'cx-md-codebox' },
          h('div', { className: 'cx-md-codebar' }, h('span', null, lang), h('button', { onClick: () => { try { navigator.clipboard.writeText(code); } catch {} } }, T('复制'))),
          h('pre', { className: 'cx-md-code' }, h('code', null, code))));
        last = re.lastIndex;
      }
      if (last < src.length) parts.push(h('div', { key: `t${key++}` }, renderText(src.slice(last))));
      return h('div', { className: 'cx-rich' }, parts);
    });
