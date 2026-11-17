    /* ============ 电商作战指挥室（mock）：五步向导 + 多指挥室 / 多流水线 ============ */
    const ECOM_STAGES = [
      { id: 'select', zh: '选品', en: 'Select' },
      { id: 'list', zh: '上架', en: 'List' },
      { id: 'plan', zh: '策划', en: 'Plan' },
      { id: 'media', zh: '内容', en: 'Media' },
      { id: 'live', zh: '直播', en: 'Live' },
      { id: 'order', zh: '接单', en: 'Order' },
      { id: 'ship', zh: '发货', en: 'Ship' },
      { id: 'after', zh: '售后', en: 'After' },
      { id: 'learn', zh: '回流', en: 'Learn' },
    ];

    const ECOM_AGENT_POOL = ['Scout', 'Lister', 'Strategist', 'Editor', 'Streamer', 'Order', 'Ship', 'After', 'Orchestrator', 'Guardrail', 'Budget'];

    const ECOM_PLATFORMS = [
      { id: 'tiktok', zh: 'TikTok Shop', en: 'TikTok Shop' },
      { id: 'amazon', zh: 'Amazon', en: 'Amazon' },
      { id: 'douyin', zh: '抖音小店', en: 'Douyin' },
      { id: 'shopee', zh: 'Shopee', en: 'Shopee' },
    ];

    const ECOM_REGIONS = [
      { id: 'sea', zh: '东南亚', en: 'SEA' },
      { id: 'us', zh: '北美', en: 'North America' },
      { id: 'eu', zh: '欧洲', en: 'Europe' },
      { id: 'jp', zh: '日本', en: 'Japan' },
    ];

    const ECOM_AUDIENCES = [
      { id: 'f25', zh: '25–34 女性 · 家居', en: 'F 25–34 · Home' },
      { id: 'm30', zh: '30–44 男性 · 户外', en: 'M 30–44 · Outdoor' },
      { id: 'g18', zh: '18–24 泛人群 · 饰品', en: '18–24 · Accessories' },
      { id: 'pet', zh: '养宠家庭 · 宠物', en: 'Pet families' },
    ];

    const ECOM_COMPANY = {
      zh: '深圳云轩领航电子商务有限公司',
      en: 'Yunxuan Pilot E-commerce Co., Ltd.',
      city: '深圳市',
      contact: 'ops@yunxuan.example',
      uscc: '91440300MA5F****3K',
    };

    // 每个环节默认的智能体数（可被流水线覆盖）
    const ECOM_DEFAULT_AGENTS = { select: 2, list: 1, plan: 1, media: 2, live: 1, order: 1, ship: 1, after: 1, learn: 1 };

    function ecomRoom(name, no) {
      const pipes = [
        { id: `${no}-a`, zh: 'TikTok · 东南亚 · 家居', platform: 'tiktok', region: 'sea', audience: 'f25', cost: 28, margin: 26, live: true },
        { id: `${no}-b`, zh: 'Amazon · 北美 · 户外', platform: 'amazon', region: 'us', audience: 'm30', cost: 34, margin: 22, live: true },
        { id: `${no}-c`, zh: 'TikTok · 日本 · 饰品', platform: 'tiktok', region: 'jp', audience: 'g18', cost: 22, margin: 31, live: no === 'r1' },
      ];
      return { id: no, name, company: ECOM_COMPANY, stages: ECOM_STAGES.map((s) => s.id), pipelines: pipes.filter((p) => p.live || no === 'r1'), logs: [] };
    }

    const ECOM_ROOMS_SEED = [
      ecomRoom('云轩领航 · 主战室', 'r1'),
      ecomRoom('云轩领航 · 东南亚攻坚', 'r2'),
    ];

    const ECOM_HUE = { tiktok: '#25f4ee', amazon: '#ffb020', douyin: '#fe2c55', shopee: '#ff6a3d' };

    // token 计价：演示口径 ¥0.008 / 1k token
    const ECOM_TOKEN_PRICE = 0.008;
    function ecomCost(tokens) { return (tokens / 1000) * ECOM_TOKEN_PRICE; }
    function ecomMoney(v) { return `¥${v >= 100 ? Math.round(v).toLocaleString() : v.toFixed(2)}`; }
    // 周期倍数：本时=1 / 今日=1 / 本周=7 / 本月=30
    const ECOM_PERIOD_SCALE = { hour: 1 / 8, today: 1, week: 7, month: 30 };
    function ecomPipeAgg(room, pipe, t, scale = 1) {
      const st = room.stages.map((id) => ecomStageStat(pipe, id, t, (room.bonus || {})[id]));
      const agents = st.reduce((a, x) => a + x.agents, 0);
      const tasks = Math.round(st.reduce((a, x) => a + x.tasks, 0) * scale);
      const tokens = Math.round(st.reduce((a, x) => a + x.tokens, 0) * scale);
      return { agents, tasks, tokens, cost: ecomCost(tokens) };
    }
    function ecomRoomAgg(room, t, scale = 1) {
      return room.pipelines.reduce((acc, p) => {
        const a = ecomPipeAgg(room, p, t, scale);
        acc.agents += a.agents; acc.tasks += a.tasks; acc.tokens += a.tokens; acc.cost += a.cost;
        return acc;
      }, { agents: 0, tasks: 0, tokens: 0, cost: 0 });
    }

    const ECOM_LOG_POOL = [
      ['Scout', 'SKU 缺口扫描：家居收纳 +18%，竞争密度 0.42'],
      ['Lister', 'feeds 批次 #A7 已提交，预计 7 分钟回执'],
      ['Strategist', '人群包 f25 命中率 6.8%，出价下调 12%'],
      ['Editor', '成片 3 条，平均 28s，合规标识已打'],
      ['Streamer', '排期 20:00–22:00，出镜人待审批'],
      ['Order', 'TikTok 新单 12 笔，地址校验 11 / 待补 1'],
      ['Ship', '面单 17 张，异常 1 单（超区）转人工'],
      ['After', '退款 2 笔（< ¥80）自动通过，1 笔进人审'],
      ['Guardrail', '价格低于成本线 1 次，已拦截'],
      ['Budget', '本轮预算消耗 38% / ¥4,200，继续'],
      ['Orchestrator', '复盘写入核心库：f25 家居 +6% 点击'],
    ];

    function ecomNum(seed, min, max) {
      const x = Math.abs(Math.sin(seed * 12.9898) * 43758.5453);
      return Math.floor(min + (x - Math.floor(x)) * (max - min));
    }

    function ecomStageStat(pipe, stageId, t, bonus) {
      const seed = pipe.id.length * 17 + stageId.length * 7 + pipe.cost;
      const agents = (ECOM_DEFAULT_AGENTS[stageId] || 1) + (Number(bonus) || 0);
      const tasks = ecomNum(seed, 2, 14) + Math.floor((t / 9) % 5);
      const tokens = (ecomNum(seed + 3, 8, 60) + Math.floor((t / 6) % 20)) * 1000;
      return { agents, tasks, tokens };
    }

    function ecomKpi(room, t) {
      let gmv = 0, orders = 0, tokens = 0;
      room.pipelines.forEach((p, i) => {
        const boost = 1 + Math.sin((t + i * 7) / 11) * 0.06;
        const o = 120 + ecomNum(p.id.length + i, 20, 90) + Math.floor(t * 1.2);
        orders += o;
        gmv += o * (580 + ecomNum(i + 5, 0, 240)) * boost;
        room.stages.forEach((s) => { tokens += ecomStageStat(p, s, t).tokens; });
      });
      const spend = Math.round(gmv * (room.pipelines.reduce((s, p) => s + p.cost, 0) / 100 / Math.max(1, room.pipelines.length)));
      const margin = Math.round(gmv - spend);
      return { gmv: Math.round(gmv), orders, tokens, spend, margin, reject: (1.8 + Math.sin(t / 13) * 0.7).toFixed(1) };
    }

    function EcomStep({ n, label, state }) {
      return h('div', { className: `cx-ecom-step ${state}` },
        h('i', null, state === 'done' ? '✓' : String(n)),
        h('span', null, label));
    }

    function EcomWizard({ L, draft, setDraft, step, setStep, onDone }) {
      const steps = [L('选择环节', 'Stages'), L('公司信息', 'Company'), L('平台授权', 'Auth'), L('添加流水线', 'Pipelines'), L('进入指挥室', 'Enter')];
      const toggleStage = (id) => setDraft((d) => ({ ...d, stages: d.stages.includes(id) ? d.stages.filter((x) => x !== id) : d.stages.concat(id) }));
      const togglePlatform = (id) => setDraft((d) => ({ ...d, auth: { ...d.auth, [id]: !d.auth[id] } }));
      const addPipe = () => setDraft((d) => ({ ...d, pipes: d.pipes.concat({ id: 'p' + (d.pipes.length + 1), platform: 'tiktok', region: 'sea', audience: 'f25', cost: 25, margin: 25 }) }));
      const patchPipe = (id, patch) => setDraft((d) => ({ ...d, pipes: d.pipes.map((p) => (p.id === id ? { ...p, ...patch } : p)) }));
      const setField = (k, v) => setDraft((d) => ({ ...d, company: { ...d.company, [k]: v } }));

      return h('div', { className: 'cx-ecom-wiz' },
        h('div', { className: 'cx-ecom-steps' }, steps.map((s, i) => h(EcomStep, { key: s, n: i + 1, label: s, state: i < step ? 'done' : i === step ? 'now' : 'todo' }))),
        h('div', { className: 'cx-ecom-wiz-body' },
          step === 0 ? h('div', { className: 'cx-ecom-wiz-sec' },
            h('div', { className: 'cx-ecom-wiz-h' }, h('b', null, L('这一步决定流水线跑哪些环节', 'Pick the stages this line will run')),
              h('span', null, `${draft.stages.length} / ${ECOM_STAGES.length}`)),
            h('div', { className: 'cx-ecom-chips' }, ECOM_STAGES.map((s, i) => h('button', {
              key: s.id, className: `cx-ecom-pick${draft.stages.includes(s.id) ? ' on' : ''}`, onClick: () => toggleStage(s.id),
            }, h('i', null, String(i + 1).padStart(2, '0')), L(s.zh, s.en))))) : null,
          step === 1 ? h('div', { className: 'cx-ecom-wiz-sec' },
            h('div', { className: 'cx-ecom-wiz-h' }, h('b', null, L('指挥室绑定企业信息', 'The war room is bound to this company'))),
            h('div', { className: 'cx-ecom-form2' },
              h('label', null, L('公司名称', 'Company'), h('input', { className: 'cx-ecom-sel', value: draft.company.zh, onChange: (e) => setField('zh', e.target.value) })),
              h('label', null, L('所在城市', 'City'), h('input', { className: 'cx-ecom-sel', value: draft.company.city, onChange: (e) => setField('city', e.target.value) })),
              h('label', null, L('统一信用代码', 'USCC'), h('input', { className: 'cx-ecom-sel', value: draft.company.uscc, onChange: (e) => setField('uscc', e.target.value) })),
              h('label', null, L('运营联系人', 'Ops contact'), h('input', { className: 'cx-ecom-sel', value: draft.company.contact, onChange: (e) => setField('contact', e.target.value) }))),
            h('div', { className: 'cx-ecom-tip' }, L('指挥室里的所有流水线、实例、数据都归这家公司。', 'Every pipeline, instance and record in this room belongs to this company.'))) : null,
          step === 2 ? h('div', { className: 'cx-ecom-wiz-sec' },
            h('div', { className: 'cx-ecom-wiz-h' }, h('b', null, L('接入第三方平台', 'Connect platforms')), h('span', null, `${Object.values(draft.auth).filter(Boolean).length} connected`)),
            h('div', { className: 'cx-ecom-authgrid' }, ECOM_PLATFORMS.map((p) => h('button', {
              key: p.id, className: `cx-ecom-authcard${draft.auth[p.id] ? ' on' : ''}`, onClick: () => togglePlatform(p.id),
            }, h('b', null, L(p.zh, p.en)), h('span', null, draft.auth[p.id] ? L('已授权 · 令牌托管中', 'Authorized · token vaulted') : L('点击授权', 'Click to authorize'))))),
            h('div', { className: 'cx-ecom-tip' }, L('演示页只记录授权状态，不发起真实 OAuth。', 'Demo only records auth state; no real OAuth is triggered.'))) : null,
          step === 3 ? h('div', { className: 'cx-ecom-wiz-sec' },
            h('div', { className: 'cx-ecom-wiz-h' }, h('b', null, L('一条流水线 = 一个平台 × 一个地区人群', 'One pipeline = one platform × one audience')),
              h('button', { className: 'cx-ecom-btn sm', onClick: addPipe }, L('+ 添加流水线', '+ Add pipeline'))),
            h('div', { className: 'cx-ecom-pipes-form' }, draft.pipes.map((p, i) => h('div', { key: p.id, className: 'cx-ecom-pipe-form' },
              h('span', { className: 'cx-ecom-pf-n' }, `0${i + 1}`),
              h('select', { className: 'cx-ecom-sel', value: p.platform, onChange: (e) => patchPipe(p.id, { platform: e.target.value }) }, ECOM_PLATFORMS.map((x) => h('option', { key: x.id, value: x.id }, L(x.zh, x.en)))),
              h('select', { className: 'cx-ecom-sel', value: p.region, onChange: (e) => patchPipe(p.id, { region: e.target.value }) }, ECOM_REGIONS.map((x) => h('option', { key: x.id, value: x.id }, L(x.zh, x.en)))),
              h('select', { className: 'cx-ecom-sel', value: p.audience, onChange: (e) => patchPipe(p.id, { audience: e.target.value }) }, ECOM_AUDIENCES.map((x) => h('option', { key: x.id, value: x.id }, L(x.zh, x.en)))),
              h('label', { className: 'cx-ecom-mini' }, `${L('成本', 'Cost')} ${p.cost}%`, h('input', { type: 'range', min: 10, max: 60, value: p.cost, onChange: (e) => patchPipe(p.id, { cost: Number(e.target.value) }) })),
              h('label', { className: 'cx-ecom-mini' }, `${L('利润', 'Margin')} ${p.margin}%`, h('input', { type: 'range', min: 8, max: 55, value: p.margin, onChange: (e) => patchPipe(p.id, { margin: Number(e.target.value) }) }))))) ) : null,
          step === 4 ? h('div', { className: 'cx-ecom-wiz-sec' },
            h('div', { className: 'cx-ecom-wiz-h' }, h('b', null, L('确认并进入作战指挥室', 'Review and enter'))),
            h('div', { className: 'cx-ecom-review' },
              h('div', null, h('span', null, L('公司', 'Company')), h('b', null, draft.company.zh)),
              h('div', null, h('span', null, L('环节', 'Stages')), h('b', null, `${draft.stages.length}`)),
              h('div', null, h('span', null, L('平台', 'Platforms')), h('b', null, ECOM_PLATFORMS.filter((p) => draft.auth[p.id]).map((p) => p.zh).join(' · ') || '—')),
              h('div', null, h('span', null, L('流水线', 'Pipelines')), h('b', null, `${draft.pipes.length}`)),
              h('div', null, h('span', null, L('预算', 'Budget')), h('b', null, draft.pipes.map((p) => `${p.cost}/${p.margin}`).join(' · ')))) ) : null),
        h('div', { className: 'cx-ecom-wiz-foot' },
          h('button', { className: 'cx-ecom-btn', disabled: step === 0, onClick: () => setStep(Math.max(0, step - 1)) }, L('上一步', 'Back')),
          h('span', { className: 'cx-ecom-wiz-p' }, `${Math.round(((step + 1) / 5) * 100)}%`),
          step < 4
            ? h('button', { className: 'cx-ecom-btn pri', onClick: () => setStep(step + 1) }, L('下一步', 'Next'))
            : h('button', { className: 'cx-ecom-btn pri', onClick: onDone }, L('创建并进入', 'Create & enter'))));
    }

    function EcomStageCell({ s, idx, stat, pct, hot, L }) {
      return h('div', { className: `cx-ecom-cell${hot ? ' hot' : ''}` },
        h('div', { className: 'cx-ecom-cell-h' }, h('i', null, String(idx + 1).padStart(2, '0')), h('b', null, L(s.zh, s.en))),
        h('div', { className: 'cx-ecom-cell-s' },
          h('span', { title: L('任务数', 'Tasks') }, h('em', null, stat.tasks)),
          h('span', { title: L('智能体数', 'Agents') }, h('em', null, stat.agents)),
          h('span', { title: 'token' }, h('em', null, `${Math.round(stat.tokens / 100) / 10}k`))),
        h('div', { className: 'cx-ecom-cell-bar' }, h('u', { style: { width: `${pct}%` } })));
    }

    function ecomShop(pipe, t) {
      const seed = pipe.id.length * 31 + pipe.cost + pipe.zh.length;
      const plat = ECOM_PLATFORMS.find((x) => x.id === pipe.platform) || ECOM_PLATFORMS[0];
      const site = pipe.region === 'sea' ? 'TH · MY · VN' : pipe.region === 'us' ? 'US' : pipe.region === 'eu' ? 'DE · FR' : 'JP';
      return {
        name: `${plat.en} · ${pipe.region.toUpperCase()}`,
        site,
        skus: ecomNum(seed, 18, 120),
        stock: ecomNum(seed + 1, 0, 5),
        pending: ecomNum(seed + 2, 0, 24),
        after: ecomNum(seed + 3, 0, 4),
        rating: (4 + ecomNum(seed + 4, 0, 9) / 10).toFixed(1),
        gmv: ecomNum(seed + 5, 8, 90) * 1000 + Math.floor(t * 37),
        orders: ecomNum(seed + 6, 30, 400) + Math.floor(t * 2),
        ad: ecomNum(seed + 7, 3, 30) * 1000,
        items: ecomNum(seed + 8, 40, 300),
        price: ecomNum(seed + 9, 19, 89) + 0.9,
        cost: ecomNum(seed + 10, 8, 40) + 0.5,
        sold: ecomNum(seed + 11, 0, 40),
        roas: (1.2 + ecomNum(seed + 12, 0, 34) / 10).toFixed(1),
      };
    }

    // 六个 AI 员工：每行「名字 + 状态 + 两句口径 + 已处理进度」
    function ecomAgents(room, t, L) {
      const base = [
        { id: 'scout', zh: '选品官', en: 'SCOUT', icon: '◎', tone: '#ffc24d', doing: [L('扫热榜 · 比货源 · 算毛利', 'Scan charts · source · margin'), L('毛利低于 35% 不上架', 'Skip under 35% margin')], key: 'select' },
        { id: 'lister', zh: '上架官', en: 'LISTER', icon: '◈', tone: '#8b5cf6', doing: [L('写标题 · 定价 · 上架', 'Title · price · publish'), L('先过合规，再上架', 'Compliance first')], key: 'list' },
        { id: 'creator', zh: '内容官', en: 'CREATOR', icon: '▣', tone: '#fe2c55', doing: [L('拆爆款 · 写脚本 · 出短视频', 'Hook · script · short video'), L('每个品先出 3 条钩子', '3 hooks per SKU')], key: 'media' },
        { id: 'ads', zh: '投流官', en: 'ADS', icon: '≋', tone: '#25f4ee', doing: [L('开计划 · 盯 ROAS · 调预算', 'Launch · watch ROAS · budget'), L('ROAS 低于 1.5 立刻停', 'Pause under ROAS 1.5')], key: 'live' },
        { id: 'service', zh: '客服官', en: 'SERVICE', icon: '✉', tone: '#3dffa8', doing: [L('多语秒回 · 催付 · 挽单', 'Multilingual reply · save'), L('退款交老板拍板', 'Refunds need owner')], key: 'order' },
        { id: 'fulfil', zh: '履约官', en: 'FULFIL', icon: '◧', tone: '#7dd3fc', doing: [L('打单 · 发货 · 跟物流', 'Label · ship · track'), L('每一单都留记录', 'Every order logged')], key: 'ship' },
      ];
      return base.map((a, i) => {
        const stat = ecomStageStat(room.pipelines[0], a.key, t);
        const done = stat.tasks + i * 3;
        const busy = t > 20 && (i + Math.round(t)) % 4 !== 0;
        return { ...a, done, total: Math.max(done + 2, 12), state: busy ? L('处理中', 'Running') : L('待命', 'Idle'), busy };
      });
    }

    function EcomHero({ room, k, running, L }) {
      return h('div', { className: 'cx-ecom-hero' },
        h('div', { className: 'cx-ecom-hero-l' },
          h('div', { className: 'cx-ecom-logo' }, '>_'),
          h('div', null,
            h('div', { className: 'cx-ecom-hero-t' }, L('AI 出海指挥台', 'AI Cross-border Command')),
            h('div', { className: 'cx-ecom-hero-s' },
              h('i', { className: running ? 'on' : '' }),
              running ? L('运行中', 'Live') : L('已暂停', 'Paused'),
              h('span', null, '·'),
              h('span', null, new Date().toTimeString().slice(0, 8)),
              h('span', null, '·'),
              h('span', null, room.pipelines.length + L(' 条流水线', ' pipelines')),
              h('span', null, '·'),
              h('span', null, room.company.city)))),
        h('div', { className: 'cx-ecom-hero-gmv' },
          h('span', null, L('今日 GMV', 'GMV today')),
          h('b', null, h('i', null, '¥'), k.gmv.toLocaleString()),
          h('em', null, L('模拟数据 · 不构成收益承诺', 'Mock data · not a promise'))),
        h('div', { className: 'cx-ecom-hero-r' },
          [[L('订单', 'Orders'), k.orders, '#eafcff'], [L('已发货', 'Shipped'), Math.round(k.orders * 0.72), '#3dffa8'], [L('退款', 'Refund'), Math.round(k.orders * 0.03), '#ff6b8a']]
            .map(([n, v, c]) => h('div', { key: n }, h('span', null, n), h('b', { style: { color: c } }, String(v))))));
    }

    function EcomStageBar({ room, t, L }) {
      return h('div', { className: 'cx-ecom-flow' },
        h('div', { className: 'cx-ecom-flow-h' }, h('b', null, 'LIVE FLOW'), h('span', null, ECOM_STAGES.map((s) => s.zh).join(' → '))),
        h('div', { className: 'cx-ecom-flow-row' }, ECOM_STAGES.map((s, i) => {
          const stat = ecomStageStat(room.pipelines[0], s.id, t);
          const on = i <= Math.round((t / 6) % 9);
          return h('div', { key: s.id, className: `cx-ecom-flowp${on ? ' on' : ''}` },
            h('i', null, String(i + 1).padStart(2, '0')),
            h('b', null, L(s.zh, s.en)),
            h('em', null, `${stat.tasks} · ${stat.agents} · ${Math.round(stat.tokens / 100) / 10}k`));
        })));
    }

    function EcomProducts({ room, t, L }) {
      return h('div', { className: 'cx-ecom-prods' }, room.pipelines.slice(0, 3).map((p, i) => {
        const s = ecomShop(p, t);
        const margin = Math.round(((s.price - s.cost) / s.price) * 100);
        return h('div', { key: p.id, className: 'cx-ecom-prod' },
          h('div', { className: 'cx-ecom-prod-h' },
            h('b', null, `${L('爆款', 'Hit')} ${i + 1}`),
            h('span', { className: `cx-ecom-pill${i === 0 ? ' hot' : ''}` }, i === 0 ? L('投放中', 'Running') : L('待投', 'Queued'))),
          h('div', { className: 'cx-ecom-prod-n' }, p.zh),
          h('div', { className: 'cx-ecom-prod-g' },
            [[L('售价', 'Price'), `¥${s.price.toFixed(2)}`], [L('成本', 'Cost'), `¥${s.cost.toFixed(2)}`],
              [L('毛利', 'Margin'), `${margin}%`], ['ROAS', s.roas], [L('已售', 'Sold'), String(s.sold)], [L('库存', 'Stock'), String(s.stock)]]
              .map(([a, b]) => h('div', { key: a }, h('span', null, a), h('b', null, b)))));
      }));
    }

    function EcomPipelineTable({ room, t, L, onOpen }) {
      const aggs = room.pipelines.map((p) => ecomPipeAgg(room, p, t));
      const tmax = Math.max(1, ...aggs.map((a) => a.tokens));
      return h('div', { className: 'cx-ecom-table' },
        h('div', { className: 'cx-ecom-th' },
          h('div', { className: 'cx-ecom-td shop' }, L('店铺 / 站点', 'Shop / site')),
          h('div', { className: 'cx-ecom-td num' }, 'GMV'),
          h('div', { className: 'cx-ecom-td num' }, L('订单', 'Orders')),
          h('div', { className: 'cx-ecom-td num' }, L('利润率', 'Margin')),
          h('div', { className: 'cx-ecom-td num' }, L('智能体', 'Agents')),
          h('div', { className: 'cx-ecom-td num' }, L('任务', 'Tasks')),
          h('div', { className: 'cx-ecom-td num' }, 'TOKEN'),
          h('div', { className: 'cx-ecom-td num' }, L('费用', 'Cost')),
          h('div', { className: 'cx-ecom-td num' }, L('待发货', 'To ship')),
          h('div', { className: 'cx-ecom-td num' }, L('库存', 'Stock'))),
        room.pipelines.map((p, i) => {
          const s = ecomShop(p, t);
          const agg = aggs[i];
          const hue = ECOM_HUE[p.platform] || '#2fe3c8';
          const heat = agg.tokens / tmax;
          return h('div', { key: p.id, className: 'cx-ecom-block', style: { '--cx-ecom-hue': hue } },
            h('div', { className: 'cx-ecom-tr', onClick: () => onOpen && onOpen(p) },
              h('div', { className: 'cx-ecom-td shop' }, h('i', { className: 'cx-ecom-dot' }), h('b', null, s.name), h('span', null, `${s.site} · ${i + 1}`)),
              h('div', { className: 'cx-ecom-td num money' }, `¥${s.gmv.toLocaleString()}`),
              h('div', { className: 'cx-ecom-td num' }, s.orders.toLocaleString()),
              h('div', { className: 'cx-ecom-td num up' }, `${p.margin}%`),
              h('div', { className: 'cx-ecom-td num' }, String(agg.agents)),
              h('div', { className: 'cx-ecom-td num' }, String(agg.tasks)),
              h('div', { className: 'cx-ecom-td num' }, `${Math.round(agg.tokens / 1000)}k`),
              h('div', { className: 'cx-ecom-td num cost' }, ecomMoney(agg.cost)),
              h('div', { className: 'cx-ecom-td num warn' }, s.pending),
              h('div', { className: `cx-ecom-td num${s.stock > 3 ? ' down' : ''}` }, s.stock)),
            h('div', { className: 'cx-ecom-heat', style: { '--cx-ecom-heat': String(Math.round(heat * 100) / 100) } },
              room.stages.map((id) => {
                const stg = ECOM_STAGES.find((x) => x.id === id) || ECOM_STAGES[0];
                const stat = ecomStageStat(p, id, t);
                const lv = Math.max(0.12, Math.min(1, stat.tokens / (tmax / room.stages.length) / 6));
                return h('span', {
                  key: id, className: `cx-ecom-hc${stat.tasks >= 12 ? ' hot' : ''}`,
                  style: { '--lv': String(Math.round(lv * 100) / 100) },
                  title: `${L(stg.zh, stg.en)} · ${L('任务', 'tasks')} ${stat.tasks} · ${L('智能体', 'agents')} ${stat.agents} · token ${stat.tokens} · ${ecomMoney(ecomCost(stat.tokens))}`,
                }, L(stg.zh, stg.en), h('em', null, stat.tasks));
              })));
        }));
    }

    function EcomTotals({ room, t, L }) {
      const a = ecomRoomAgg(room, t);
      const items = [[L('智能体', 'Agents'), String(a.agents), '#25f4ee'], [L('任务累积', 'Tasks'), String(a.tasks), '#3dffa8'],
        ['TOKEN', `${Math.round(a.tokens / 1000)}k`, '#ffc24d'], [L('TOKEN 费用', 'Token cost'), ecomMoney(a.cost), '#fe6b8b']];
      return h('div', { className: 'cx-ecom-totals' }, items.map(([n, v, c]) => h('div', { key: n, className: 'cx-ecom-total' },
        h('span', null, n), h('b', { style: { color: c } }, v), h('u', null, h('i', { style: { background: c } })))));
    }

    function EcomModules({ room, t, L }) {
      const shops = room.pipelines.map((p) => ecomShop(p, t));
      const sup = shops.reduce((s, x) => s + Math.max(2, Math.round(x.skus / 12)), 0);
      const sku = shops.reduce((s, x) => s + x.skus, 0);
      const warn = shops.reduce((s, x) => s + (x.stock > 3 ? 1 : 0), 0);
      const orders = shops.reduce((s, x) => s + x.orders, 0);
      const pending = shops.reduce((s, x) => s + x.pending, 0);
      const after = shops.reduce((s, x) => s + x.after, 0);
      const cards = [
        { k: L('供应商管理', 'Supply'), en: 'F · Factory', tone: '#ffc24d', rows: [[L('合作供应商', 'Suppliers'), sup], [L('在途 SKU', 'SKUs'), sku], [L('缺货预警', 'Stock alerts'), warn]] },
        { k: L('产品管理', 'Products'), en: 'P · Product', tone: '#25f4ee', rows: [[L('在线商品', 'Online'), sku], [L('待上架', 'Queued'), Math.max(1, Math.round(sku * 0.08))], [L('合规拦截', 'Blocked'), Math.max(0, warn - 1)]] },
        { k: L('订单管理', 'Orders'), en: 'O · Order', tone: '#3dffa8', rows: [[L('今日订单', 'Orders'), orders], [L('待发货', 'To ship'), pending], [L('售后', 'After'), after]] },
      ];
      return h('div', { className: 'cx-ecom-mods' }, cards.map((c) => h('div', { key: c.k, className: 'cx-ecom-mod', style: { '--mc': c.tone } },
        h('div', { className: 'cx-ecom-mod-h' }, h('b', null, c.k), h('span', null, c.en)),
        h('div', { className: 'cx-ecom-mod-g' }, c.rows.map(([n, v]) => h('div', { key: n }, h('span', null, n), h('b', null, String(v))))),
        h('u', null, h('i', null)))));
    }

    function EcomEvents({ room, t, L }) {
      const kinds = [
        { k: L('出片', 'VIDEO'), tone: 'video', v: (s) => `${2 + (s % 3)} ${L('条视频', 'videos')}` },
        { k: L('出单', 'SALE'), tone: 'sale', v: (s) => `+¥${(80 + (s % 7) * 43).toFixed(2)}` },
        { k: L('回复', 'REPLY'), tone: 'reply', v: (s) => `${2 + (s % 4)} ${L('条', 'msgs')}` },
        { k: L('淘汰', 'DROP'), tone: 'drop', v: () => L('不上架', 'skipped') },
        { k: L('开投', 'ADS'), tone: 'ads', v: (s) => `¥${(20 + (s % 5) * 10)}/d` },
      ];
      const rows = Array.from({ length: 7 }, (_, i) => {
        const seed = Math.round(t) + i * 13;
        const kd = kinds[seed % kinds.length];
        const s = ecomShop(room.pipelines[i % room.pipelines.length], t);
        return { at: `10:${String(40 + i).padStart(2, '0')}`, kind: kd.k, tone: kd.tone, val: kd.v(seed), name: s.name, why: L('先跑小预算，看 ROAS 再加', 'Small budget first, scale on ROAS') };
      });
      return h('div', { className: 'cx-ecom-events' },
        h('div', { className: 'cx-ecom-events-h' }, h('b', null, 'EVENT LOG'), h('span', null, L('每个动作都有原因', 'Every action has a reason'))),
        rows.map((r, i) => h('div', { key: i, className: 'cx-ecom-ev' },
          h('span', { className: 'cx-ecom-ev-t' }, r.at),
          h('span', { className: `cx-ecom-ev-k ${r.tone}` }, r.kind),
          h('div', { className: 'cx-ecom-ev-b' }, h('b', null, r.name), h('em', null, r.why)),
          h('span', { className: `cx-ecom-ev-v ${r.tone}` }, r.val))));
    }

    function EcomScore({ k, L }) {
      const w = 160, h2 = 46;
      const pts = Array.from({ length: 14 }, (_, i) => 6 + Math.pow(i / 13, 2.4) * 34);
      const d = pts.map((y, i) => `${i === 0 ? 'M' : 'L'}${((i / 13) * w).toFixed(1)},${(h2 - y).toFixed(1)}`).join(' ');
      return h('div', { className: 'cx-ecom-score' },
        h('div', { className: 'cx-ecom-score-h' }, h('b', null, L('今日战绩', 'Today')), h('span', null, L('开工 vs 现在', 'Open vs now'))),
        h('div', { className: 'cx-ecom-score-b' },
          h('div', null, h('span', null, L('开工', 'Open')), h('b', null, '¥0.00')),
          h('div', null, h('span', null, L('现在', 'Now')), h('b', { className: 'big' }, `¥${k.gmv.toLocaleString()}`))),
        h('div', { className: 'cx-ecom-score-bar' }, h('i', { style: { width: `${Math.min(100, 12 + (k.orders % 70))}%` } })),
        h('div', { className: 'cx-ecom-score-g' },
          h('span', null, `${L('已发货', 'Shipped')} ${Math.round(k.orders * 0.72)} / ${k.orders}`),
          h('span', null, `${L('退款', 'Refund')} ${Math.round(k.orders * 0.03)}`),
          h('svg', { viewBox: `0 0 ${w} ${h2}`, preserveAspectRatio: 'none' },
            h('path', { d: `${d} L${w},${h2} L0,${h2} Z`, className: 'cx-ecom-score-a' }),
            h('path', { d, className: 'cx-ecom-score-l' }))));
    }

    function EcomTicker({ room, t, L }) {
      const lines = [
        `${L('弹药播报', 'Ticker')} · ${L('出单', 'SALE')} +¥${(120 + Math.round(t) * 7).toFixed(2)}`,
        `${L('新单', 'NEW')} ${2 + Math.round(t) % 5}`,
        `ROAS ${(2.4 + (t % 9) / 10).toFixed(1)}`,
        `TOKEN ${Math.round(t * 3.1)}k · ${ecomMoney(ecomCost(t * 3100))}`,
        `${L('库存预警', 'Stock')} ${room.pipelines.length}`,
      ];
      return h('div', { className: 'cx-ecom-ticker' }, h('div', { className: 'cx-ecom-ticker-in' },
        lines.concat(lines).map((x, i) => h('span', { key: i }, x))));
    }

    function EcomFilters({ period, setPeriod, range, setRange, L }) {
      const ps = [['hour', L('本时', 'Hour')], ['today', L('今日', 'Today')], ['week', L('本周', 'Week')], ['month', L('本月', 'Month')]];
      const rs = [[7, L('近 7 天', '7d')], [14, L('近 14 天', '14d')], [30, L('近 30 天', '30d')]];
      return h('div', { className: 'cx-ecom-filters' },
        h('span', { className: 'cx-ecom-f-label' }, L('周期', 'Period')),
        h('div', { className: 'cx-ecom-seg' }, ps.map(([id, n]) => h('button', { key: id, className: `cx-ecom-seg-b${period === id ? ' on' : ''}`, onClick: () => setPeriod(id) }, n))),
        h('span', { className: 'cx-ecom-f-label' }, L('区间', 'Range')),
        h('div', { className: 'cx-ecom-seg' }, rs.map(([id, n]) => h('button', { key: id, className: `cx-ecom-seg-b${range === id ? ' on' : ''}`, onClick: () => setRange(id) }, n))));
    }

    function EcomChart({ k, L }) {
      const w = 420, hh = 120;
      const pts = Array.from({ length: 14 }, (_, i) => 8 + Math.pow(i / 13, 2.2) * 96);
      const d = pts.map((y, i) => `${i === 0 ? 'M' : 'L'}${((i / 13) * w).toFixed(1)},${(hh - y).toFixed(1)}`).join(' ');
      return h('div', { className: 'cx-ecom-chart' },
        h('div', { className: 'cx-ecom-chart-h' },
          h('b', null, L('营收趋势', 'Revenue trend')),
          h('span', null, L('今日累计', 'Today')),
          h('em', null, `¥${k.gmv.toLocaleString()}`)),
        h('svg', { viewBox: `0 0 ${w} ${hh}`, preserveAspectRatio: 'none' },
          h('path', { d: `${d} L${w},${hh} L0,${hh} Z`, className: 'cx-ecom-chart-a' }),
          h('path', { d, className: 'cx-ecom-chart-l' })));
    }

    function EcomKpis({ room, t, k, agg, shops, L }) {
      const items = [
        [L('利润', 'Profit'), ecomMoney(k.margin), '#3dffa8'],
        [L('成本', 'Cost'), ecomMoney(k.spend), '#ff6b8a'],
        [L('接单数', 'Orders'), String(k.orders), '#eafcff'],
        [L('退单数', 'Refunds'), String(Math.round(k.orders * 0.03)), '#ff6b8a'],
        ['TOKEN', `${Math.round(agg.tokens / 1000)}k`, '#ffc24d'],
        [L('TOKEN 费用', 'Token cost'), ecomMoney(agg.cost), '#fe6b8b'],
        [L('供应商', 'Suppliers'), String(Math.max(2, Math.round(shops.reduce((s, x) => s + x.skus, 0) / 24))), '#25f4ee'],
        [L('产品数', 'Products'), String(shops.reduce((s, x) => s + x.skus, 0)), '#25f4ee'],
        [L('智能体', 'Agents'), String(agg.agents), '#8b5cf6'],
      ];
      return h('div', { className: 'cx-ecom-kpigrid' },
        h(EcomChart, { k, L }),
        items.map(([n, v, c]) => h('div', { key: n, className: 'cx-ecom-kpi2' },
          h('span', null, n), h('b', { style: { color: c } }, v))));
    }

    function EcomFocus({ room, t, scale, L }) {
      const p = room.pipelines[0];
      const s = ecomShop(p, t);
      const margin = Math.round(((s.price - s.cost) / s.price) * 100);
      return h('div', { className: 'cx-ecom-focus' },
        h('div', { className: 'cx-ecom-focus-h' }, h('b', null, L('焦点商品', 'Focus SKU')), h('em', { className: 'cx-ecom-pill hot' }, 'LIVE')),
        h('div', { className: 'cx-ecom-focus-n' }, p.zh),
        h('div', { className: 'cx-ecom-focus-g' },
          [[L('售价', 'Price'), `¥${s.price.toFixed(2)}`], [L('成本', 'Cost'), `¥${s.cost.toFixed(2)}`],
            [L('毛利率', 'Margin'), `${margin}%`], [L('已售', 'Sold'), String(s.sold)], ['ROAS', s.roas]].map(([a, b]) => h('div', { key: a }, h('span', null, a), h('b', null, b)))),
        h('div', { className: 'cx-ecom-focus-f' }, h('span', null, `${L('动作', 'Action')} · ${L('开投', 'Ads')} · ¥${20 + (t % 5) * 10}/d`)));
    }

    function EcomPipeCards({ room, t, scale, L, onAddAgent }) {
      return h('div', { className: 'cx-ecom-pipes' },
        h('div', { className: 'cx-ecom-pipes-h' }, h('b', null, L('流水线', 'Pipelines')), h('span', null, `${room.pipelines.length} ${L('条', 'lines')}`)),
        room.pipelines.map((p) => {
          const s = ecomShop(p, t);
          const agg = ecomPipeAgg(room, p, t, scale);
          const hue = ECOM_HUE[p.platform] || '#2fe3c8';
          const tmax = Math.max(1, ...room.stages.map((id) => ecomStageStat(p, id, t).tokens));
          return h('div', { key: p.id, className: 'cx-ecom-pipe', style: { '--cx-ecom-hue': hue } },
            h('div', { className: 'cx-ecom-pipe-h' },
              h('i', { className: 'cx-ecom-dot' }),
              h('b', null, s.name),
              h('span', { className: 'cx-ecom-tag' }, p.zh),
              h('span', { className: 'cx-ecom-tag' }, `${L('成本', 'Cost')} ¥${s.ad.toLocaleString()} · GMV ¥${s.gmv.toLocaleString()} · ${p.margin}%`),
              h('span', { className: 'cx-ecom-pipe-n' }, `${agg.agents} ${L('智能体', 'agents')} · ${agg.tasks} ${L('任务', 'tasks')} · ${Math.round(agg.tokens / 1000)}k · ${ecomMoney(agg.cost)}`)),
            h('div', { className: 'cx-ecom-stages' }, room.stages.map((id) => {
              const stg = ECOM_STAGES.find((x) => x.id === id) || ECOM_STAGES[0];
              const stat = ecomStageStat(p, id, t);
              const lv = Math.max(0.12, Math.min(1, stat.tokens / tmax));
              return h('div', { key: id, className: `cx-ecom-stg${stat.tasks >= 12 ? ' hot' : ''}`, style: { '--lv': String(Math.round(lv * 100) / 100) } },
                h('div', { className: 'cx-ecom-stg-h' }, h('b', null, L(stg.zh, stg.en)), h('u', null, String(stat.tasks))),
                h('div', { className: 'cx-ecom-stg-m' }, `${L('任务', 'tasks')} ${stat.tasks} · ${L('智能体', 'agents')} ${stat.agents}`),
                h('div', { className: 'cx-ecom-stg-t' }, `${Math.round(stat.tokens / 1000 * 10) / 10}k · ${ecomMoney(ecomCost(stat.tokens))}`),
                h('button', { className: 'cx-ecom-stg-add', onClick: () => onAddAgent(p.id, id), title: L('添加智能体', 'Add agent') }, '+'));
            })));
        }));
    }

    function EcomEvolve({ room, t, L }) {
      const gen = 1 + Math.floor(t / 40);
      const rows = [
        [L('产品活力', 'Product'), `${(0.6 + (t % 7) / 20).toFixed(2)}`, L('低于 0.95 下架', 'drop under 0.95')],
        [L('素材流量', 'Creative'), `CTR ${(2.8 + (t % 5) / 2).toFixed(1)}%`, L('播放 180 起评', 'min 180 views')],
        [L('智能体赛马', 'Agents'), `${gen} ${L('代', 'gen')}`, L('营收 < 组均 50% 换一代', 'replace under 50%')],
      ];
      return h('div', { className: 'cx-ecom-evolve' },
        h('div', { className: 'cx-ecom-evolve-h' }, h('b', null, L('演化引擎 · 优胜劣汰', 'Evolution engine')),
          h('span', null, `${L('第', 'gen')} ${gen} ${L('代 · 已迭代', 'generations · ')}${Math.floor(t / 20)}`)),
        rows.map(([a, b, c]) => h('div', { key: a, className: 'cx-ecom-ev2' },
          h('span', null, a), h('b', null, b), h('em', null, c))));
    }

    function EcomAgentModal({ open, onClose, onAdd, L }) {
      if (!open) return null;
      return h('div', { className: 'cx-ecom-mask', onClick: onClose },
        h('div', { className: 'cx-ecom-modal', onClick: (e) => e.stopPropagation() },
          h('div', { className: 'cx-ecom-modal-h' }, h('b', null, L('添加智能体', 'Add agents')), h('button', { className: 'cx-ecom-btn sm', onClick: onClose }, '×')),
          h('div', { className: 'cx-ecom-modal-b' }, ECOM_AGENT_POOL.map((n) => h('button', { key: n, className: 'cx-ecom-agent-pick', onClick: () => onAdd(n) }, n))),
          h('div', { className: 'cx-ecom-modal-f' }, h('span', null, L('演示页只记录数量，不产生真实调度。', 'Demo only counts; no real scheduling.')))));
    }

    function EcomWarRoom({ room, t, running, onToggle, L, rooms, activeId, onSwitch, onNew, period, onPeriod, range, onRange, agentAt, onAgentOpen, onAgentClose, onAgentAdd }) {
      const scale = ECOM_PERIOD_SCALE[period] || 1;
      const k = ecomKpi(room, t);
      const agg = ecomRoomAgg(room, t, scale);
      const shops = room.pipelines.map((p) => ecomShop(p, t));
      const agents = ecomAgents(room, t, L);
      return h('div', { className: 'cx-ecom-room' },
        h('div', { className: 'cx-ecom-roombar' },
          h('div', { className: 'cx-ecom-roomtabs' }, rooms.map((r) => h('button', {
            key: r.id, className: `cx-ecom-roomtab${r.id === activeId ? ' on' : ''}`, onClick: () => onSwitch(r.id),
          }, r.name))),
          h('button', { className: 'cx-ecom-btn sm', onClick: onNew }, L('+ 新建指挥室', '+ New room')),
          h('div', { className: 'cx-ecom-run' },
            h('span', { className: `cx-ecom-live${running ? ' on' : ''}` }, h('i'), 'LIVE'),
            h('button', { className: `cx-ecom-btn glow${running ? ' on' : ''}`, onClick: onToggle }, running ? L('暂停', 'Pause') : L('开跑', 'Run')))),
        h(EcomTicker, { room, t, L }),
        h(EcomHero, { room, k, running, L }),
        h(EcomFilters, { period, setPeriod: onPeriod, range, setRange: onRange, L }),
        h('div', { className: 'cx-ecom-grid' },
          h('div', { className: 'cx-ecom-col-l' }, agents.map((a) => h('div', { key: a.id, className: `cx-ecom-agent${a.busy ? ' on' : ''}` },
            h('div', { className: 'cx-ecom-agent-i', style: { color: a.tone, borderColor: `${a.tone}55` } }, a.icon),
            h('div', { className: 'cx-ecom-agent-b' },
              h('div', { className: 'cx-ecom-agent-h' }, h('b', null, L(a.zh, a.en)), h('span', null, a.en), h('em', { className: a.busy ? 'on' : '' }, a.state)),
              a.doing.map((line, li) => h('div', { key: li, className: 'cx-ecom-agent-d', title: line }, line)),
              h('div', { className: 'cx-ecom-agent-p' }, h('span', null, `${L('已处理', 'Done')} ${a.done}`), h('u', null, h('i', { style: { width: `${Math.round((a.done / a.total) * 100)}%`, background: a.tone } })))))),
            h(EcomFocus, { room, t, scale, L })),
          h('div', { className: 'cx-ecom-col-c' },
            h(EcomKpis, { room, t, k, agg, shops, L }),
            h(EcomPipeCards, { room, t, scale, L, onAddAgent: (pid, sid) => onAgentOpen && onAgentOpen({ pipe: pid, stage: sid }) }),
            h(EcomEvolve, { room, t, L })),
          h('div', { className: 'cx-ecom-col-r' },
            h(EcomModules, { room, t, L }),
            h(EcomEvents, { room, t, L }),
            h(EcomScore, { k, L }))),
        h(EcomAgentModal, { open: !!agentAt, stage: agentAt && agentAt.stage, onClose: () => onAgentClose && onAgentClose(), onAdd: (n) => onAgentAdd && onAgentAdd(n), L }));
    }

    function EcomView({ locale }) {
      const zh = locale === 'zh';
      const L = (a, b) => (zh ? a : b);
      const [rooms, setRooms] = useState(() => ECOM_ROOMS_SEED.map((r) => ({ ...r })));
      const [activeId, setActiveId] = useState('r1');
      const [mode, setMode] = useState('room');
      const [step, setStep] = useState(0);
      const [t, setT] = useState(18);
      const [running, setRunning] = useState(true);
      const [period, setPeriod] = useState('today');
      const [range, setRange] = useState(7);
      const [agentAt, setAgentAt] = useState(null);
      const [draft, setDraft] = useState(() => ({ stages: ECOM_STAGES.map((s) => s.id), company: ECOM_COMPANY, auth: { tiktok: true, amazon: false, douyin: false, shopee: false }, pipes: [{ id: 'p1', platform: 'tiktok', region: 'sea', audience: 'f25', cost: 28, margin: 26 }] }));
      const room = rooms.find((r) => r.id === activeId) || rooms[0];

      useEffect(() => {
        if (mode !== 'room' || !running) return undefined;
        const iv = setInterval(() => { if (!document.hidden) setT((v) => v + 1.4); }, 900);
        return () => clearInterval(iv);
      }, [mode, running]);

      useEffect(() => {
        if (mode !== 'room' || !running) return undefined;
        const iv = setInterval(() => {
          if (document.hidden) return;
          const pick = ECOM_LOG_POOL[Math.floor(Math.random() * ECOM_LOG_POOL.length)];
          setRooms((rs) => rs.map((r) => (r.id !== activeId ? r : { ...r, logs: [{ at: new Date().toTimeString().slice(0, 5), who: pick[0], text: pick[1] }].concat(r.logs).slice(0, 80) })));
        }, 3000);
        return () => clearInterval(iv);
      }, [mode, running, activeId]);

      const enterRoom = () => {
        const id = 'r' + (rooms.length + 1);
        const next = {
          id, name: `${draft.company.zh.slice(0, 6)} · ${L('作战室', 'Room')} ${rooms.length + 1}`,
          company: draft.company, stages: draft.stages.slice(), logs: [],
          pipelines: draft.pipes.map((p, i) => ({
            id: `${id}-${i}`, zh: `${(ECOM_PLATFORMS.find((x) => x.id === p.platform) || {}).zh || p.platform} · ${(ECOM_REGIONS.find((x) => x.id === p.region) || {}).zh || p.region}`,
            platform: p.platform, region: p.region, audience: p.audience, cost: p.cost, margin: p.margin, live: true,
          })),
        };
        setRooms((rs) => rs.concat(next));
        setActiveId(id);
        setMode('room');
        setStep(0);
      };

      return h('div', { className: 'cx-ecom' },
        h('div', { className: 'cx-ecom-head' },
          h('div', { className: 'cx-ecom-tabs' },
            h('button', { className: `cx-ecom-tab${mode === 'room' ? ' on' : ''}`, onClick: () => setMode('room') }, L('作战指挥室', 'War rooms')),
            h('button', { className: `cx-ecom-tab${mode === 'wizard' ? ' on' : ''}`, onClick: () => setMode('wizard') }, L('新建流程', 'New'))),
          h('div', { className: 'cx-ecom-co-n' }, mode === 'room' ? L('大盘 / 流水线 / 日志', 'Board / pipelines / logs') : L('五步：环节 → 公司 → 授权 → 流水线 → 指挥室', 'Five steps')),
          h('div', { className: 'cx-ecom-auth' },
            ECOM_PLATFORMS.map((p) => h('span', { key: p.id, className: `cx-ecom-badge${room && room.id ? '' : ''}` }, p.zh)))),
        mode === 'wizard'
          ? h(EcomWizard, { L, draft, setDraft, step, setStep, onDone: enterRoom })
          : h(EcomWarRoom, {
            room, t, running, L, rooms, activeId, onSwitch: setActiveId, onNew: () => setMode('wizard'),
            onToggle: () => setRunning((v) => !v),
            period, onPeriod: setPeriod, range, onRange: setRange,
            agentAt, onAgentOpen: setAgentAt, onAgentClose: () => setAgentAt(null),
            onAgentAdd: (n) => {
              if (!agentAt) return;
              setRooms((rs) => rs.map((r) => (r.id !== activeId ? r : {
                ...r,
                bonus: { ...(r.bonus || {}), [agentAt.stage]: ((r.bonus || {})[agentAt.stage] || 0) + n },
              })));
              setAgentAt(null);
            },
          }));
    }
