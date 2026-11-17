window.__ModuleLoader__.load({
  id: 'dsh-contextos-devops',
  factory(require) {
    const React = require('react');
    const h = React.createElement;
    // 页面所在 host：cookie 只对同一 host 生效，localhost 与 127.0.0.1 不能混用。
    // 网页 URL（只给浏览器打开）：/s/<pod>/c/<portal>?debug=true&<place>_uid=<实例>#<实例>:<cmd>:<记录>
    // 接口 URL 在宿主 lib/base/url.js；两者形状不同，见 docs/URL-SPEC.md
    const cxPlaceKey = (place) => `${String(place || 'system').replace(/_(uid|name)$/, '') || 'system'}_uid`;
    const cxWebUrl = ({ node, pod, command, place = 'system', placeUid = '', recordUid = '', uid = '', host = '' }) => {
      if (!node || !pod || !command) return '';
      const portal = /^web\./.test(String(command)) && String(command).split('.').length >= 3
        ? String(command).split('.').slice(0, -1).join('.') + '.portal'
        : String(command);
      const q = new URLSearchParams({ debug: 'true', [cxPlaceKey(place)]: placeUid || '' });
      if (uid) q.set('user.uid', uid);
      const hash = recordUid ? `#${placeUid || ''}:${command}:${recordUid}` : '';
      return `http://${host || CX_HOST}:${node}/s/${encodeURIComponent(pod)}/c/${portal}?${q}${hash}`;
    };
    const CX_HOST = (typeof location !== 'undefined' && /^(localhost|127\.0\.0\.1)$/.test(location.hostname)) ? location.hostname : '127.0.0.1';
    const { useState, useEffect, useCallback, useRef } = React;
    let CX_LAYOUT = null;
    const API = '/dsh-contextos-devops/api';
    const CLIENT_CSS = '/dsh-contextos-devops/assets/client.css?v=__CLIENT_CSS_VERSION__';
    const CLIENT_BUILD = '__CLIENT_BUILD__';
    // 界面版本徽标：让「你看到的到底是哪一版」不再靠猜
    function cxClientTag() {
      try {
        const v = String(CLIENT_CSS).split('?v=')[1] || '';
        return v ? 'v' + v : '';
      } catch { return ''; }
    }
    const CRITICAL_CSS = '.cx-shell{height:100%;min-height:0;display:flex;flex-direction:column;background:#050a12;color:#d9f4ff;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;overflow:hidden}';
    // 样式随版本走：旧 link（上次插件实例注入的 v=旧版本）必须被改写，
    // 否则会出现「新 JS + 旧 CSS」——布局按旧规则算，看起来像回归。
    if (typeof document !== 'undefined') {
      const sel = 'link[data-cx-client-css]';
      let link = document.querySelector(sel);
      if (!link) {
        link = document.createElement('link');
        link.rel = 'stylesheet';
        link.id = 'cx-client-css';
        link.dataset.cxClientCss = '1';
        link.href = CLIENT_CSS;
        document.head.appendChild(link);
        activity('加载插件样式 ' + CLIENT_CSS.split('?')[0], 'info');
      } else if (link.getAttribute('href') !== CLIENT_CSS) {
        const from = String(link.getAttribute('href') || '');
        link.setAttribute('href', CLIENT_CSS);
        activity('刷新插件样式 ' + from.split('?v=')[1] + ' → ' + CLIENT_CSS.split('?v=')[1], 'info');
      }
    }
    // ACTIVITY 通道：模块级埋点，Page 挂载后把缓冲刷进 ACTIVITY 面板。
    const ACTIVITY = { fn: null, buf: [] };
    function activity(m, k = '') { try { if (ACTIVITY.fn) ACTIVITY.fn(m, k); else ACTIVITY.buf.push({ m, k }); } catch {} }
    // 统一最大化：唯一实现。按插件壳矩形写内联 !important，压过所有 CSS 规则；
    // 同时把祖先的 transform 置空（transform 会改变 fixed/absolute 的包含块）。
    function cxMaxApply(el, opts = {}) {
      if (!el) return () => {};
      const saved = [];
      const set = (k, v) => { saved.push([k, el.style.getPropertyValue(k), el.style.getPropertyPriority(k)]); el.style.setProperty(k, v, 'important'); };
      const shell = document.querySelector('.cx-shell') || document.body;
      const r = shell.getBoundingClientRect();
      // 与「网页最大化」对齐：从顶部导航条（.cx-pipe）下沿开始，保留标题栏 + 导航条
      const nav = document.querySelector('.cx-pipe');
      const navRect = nav ? nav.getBoundingClientRect() : null;
      const top = navRect && navRect.bottom > r.top ? navRect.bottom : r.top + (opts.offsetTop != null ? opts.offsetTop : 44);
      set('position', 'fixed');
      set('left', r.left + 'px');
      set('top', top + 'px');
      set('width', r.width + 'px');
      set('height', Math.max(120, r.height - (top - r.top)) + 'px');
      set('right', 'auto');
      set('bottom', 'auto');
      set('z-index', '950');
      set('margin', '0px');
      set('padding', '8px');
      set('box-sizing', 'border-box');
      set('overflow', 'auto');
      set('border', '0px');
      set('border-radius', '0px');
      set('background', opts.bg || 'var(--cx-surface-0)');
      const anc = [];
      for (let n = el.parentElement; n && n !== document.body; n = n.parentElement) {
        const cs = getComputedStyle(n);
        if (cs.transform !== 'none') { anc.push([n, n.style.transform]); n.style.setProperty('transform', 'none', 'important'); }
      }
      return () => {
        for (const [k, v, pr] of saved) { if (v) el.style.setProperty(k, v, pr); else el.style.removeProperty(k); }
        anc.forEach(([n, t]) => { n.style.transform = t; });
      };
    }

    // 控件定位：被点击元素分配稳定 data-cx-id，调试栏点条目前往对应控件。
    const LOCATE = { last: null };
    function locatable(el) {
      if (!el || el.nodeType !== 1) return '';
      let n = el.closest ? el.closest('[data-cx-id]') : null;
      if (!n) n = el;
      if (!n.dataset) return '';
      if (!n.dataset.cxId) n.dataset.cxId = 'cx-' + Math.random().toString(36).slice(2, 9);
      return n.dataset.cxId;
    }
    // ── 图标（取自 usr/macos-app/Resources/editor.html，同一套 SVG） ──────
    const ICON_PAGE = "<path d='M3.3 1.7h5.5l4 3.9v8.7H3.3z'/><path d='M8.8 1.7v3.9h4'/>";
    const ICON_DIR = "<path d='M2.4 4.7a1 1 0 0 1 1-1h3.05l1.4 1.75h5.75a1 1 0 0 1 1 1v5.75a1 1 0 0 1-1 1H3.4a1 1 0 0 1-1-1z'/>";
    const ICON_DIRO = "<path d='M2.4 12.1V4.7a1 1 0 0 1 1-1h3.05l1.4 1.75h5.8a1 1 0 0 1 1 1v1.1'/><path d='M2.4 12.1l1.45-4.1a1 1 0 0 1 .95-.67h9.3a.9.9 0 0 1 .85 1.18l-1.35 3.85a1 1 0 0 1-.94.66H3.33a.93.93 0 0 1-.93-.92z'/>";
    const ICON_NODE = "<rect x='2.5' y='2.8' width='11' height='4.35' rx='1.1'/><rect x='2.5' y='8.85' width='11' height='4.35' rx='1.1'/><path d='M5.1 4.97h2.2'/><path d='M5.1 11.02h2.2'/><circle cx='11.35' cy='4.97' r='.72' fill='currentColor' stroke='none'/><circle cx='11.35' cy='11.02' r='.72' fill='currentColor' stroke='none'/>";
    const ICON_NODEO = "<rect x='2.5' y='2.8' width='11' height='4.35' rx='1.1'/><rect x='2.5' y='8.85' width='11' height='4.35' rx='1.1'/><path d='M5.1 4.97h2.2'/><path d='M5.1 11.02h2.2'/><circle cx='11.35' cy='4.97' r='.72'/><circle cx='11.35' cy='11.02' r='.72'/>";
    const ICON_SPACE = "<path d='M8 2.35l5.1 2.85v5.6L8 13.65l-5.1-2.85v-5.6z'/><path d='M2.9 5.2L8 8.03l5.1-2.83'/><path d='M8 8.03v5.62'/>";
    const ICON_MARKS = {
      sh: "<path d='M5.7 8.1l1.5 1.3-1.5 1.3'/><path d='M8.6 10.7h2.4'/>",
      go: "<circle cx='6.9' cy='9.3' r='.78' fill='currentColor' stroke='none'/><circle cx='9.1' cy='9.3' r='.78' fill='currentColor' stroke='none'/><path d='M6.8 10.9a1.75 1.75 0 0 0 2.4 0'/>",
      json: "<path d='M7.4 6.9c-.95 0-.95.8-.95 1.3 0 .5-.2.9-.75 1.05.55.15.75.55.75 1.05 0 .5 0 1.3.95 1.3'/><path d='M8.6 6.9c.95 0 .95.8.95 1.3 0 .5.2.9.75 1.05-.55.15-.75.55-.75 1.05 0 .5 0 1.3-.95 1.3'/>",
      js: "<path d='M6.9 6.9c-1.15.7-1.15 3.5 0 4.2'/><path d='M9.1 6.9c1.15.7 1.15 3.5 0 4.2'/><circle cx='8' cy='9' r='.62' fill='currentColor' stroke='none'/>",
      css: "<path d='M7.1 6.9L6.6 11.5'/><path d='M9.6 6.9L9.1 11.5'/><path d='M5.9 8.6h5.2'/><path d='M5.55 10.2h5.2'/>",
      html: "<path d='M6.3 7.3L4.9 9.2l1.4 1.9'/><path d='M9.7 7.3l1.4 1.9-1.4 1.9'/><path d='M8.75 6.6l-1.5 5.1'/>",
      shy: "<path d='M8 6.4l2.25 2.65L8 11.7 5.75 9.05z'/>",
      md: "<path d='M6.2 7.1v4.4'/><path d='M9.8 7.1v4.4'/><path d='M8 6.8v4.7'/><path d='M6.95 10.25L8 11.35l1.05-1.1'/>",
      mod: "<path d='M6.2 7.1v4.4'/><path d='M9.8 7.1v4.4'/><path d='M8 6.8v4.7'/><path d='M6.95 10.25L8 11.35l1.05-1.1'/>",
      sum: "<path d='M6.2 7.1v4.4'/><path d='M9.8 7.1v4.4'/><path d='M8 6.8v4.7'/><path d='M6.95 10.25L8 11.35l1.05-1.1'/>",
      lic: "<path d='M6.2 6.9h3.6'/><path d='M6.2 8.4h3.6'/><path d='M6.2 9.9h2.4'/>",
      mk: "<path d='M6.2 6.9h3.6'/><path d='M6.2 8.4h3.6'/><path d='M6.2 9.9h2.4'/>",
      img: "<circle cx='6.4' cy='8.3' r='.85' fill='currentColor' stroke='none'/><path d='M4.9 11.4l2.2-2.4 1.8 1.9 1.3-1.4 1.4 1.9z'/>",
      log: "<path d='M6.2 6.9h3.6'/><path d='M6.2 8.4h3.6'/><path d='M6.2 9.9h2.4'/>",
    };
    const EXTC = { go: '#1ed6f2', js: '#ffc93c', mjs: '#ffc93c', cjs: '#ffc93c', ts: '#3d8bff', tsx: '#3d8bff', json: '#ffa412', md: '#b45cff', markdown: '#b45cff', html: '#ff4d4d', htm: '#ff4d4d', css: '#2ba7ff', scss: '#ff5cb0', sh: '#1ed760', bash: '#1ed760', zsh: '#1ed760', py: '#45e87d', rb: '#ff6b83', java: '#ff8a1f', c: '#5aa8ff', h: '#5aa8ff', cpp: '#5aa8ff', cc: '#5aa8ff', hpp: '#5aa8ff', m: '#9fb2d0', mm: '#9fb2d0', rs: '#ff8a1f', php: '#a985ff', swift: '#ff9b2e', sql: '#ff5cb0', yaml: '#f06bff', yml: '#f06bff', xml: '#ff9b2e', toml: '#ffc31f', ini: '#ffc31f', conf: '#ffc31f', svg: '#ffd614', plist: '#9fb2d0', shy: '#b45cff', mod: '#12a8f0', sum: '#8fa1c4', log: '#9fb2d0', less: '#2ba7ff', png: '#5eead4', apng: '#5eead4', jpg: '#5eead4', jpeg: '#5eead4', jpe: '#5eead4', gif: '#5eead4', webp: '#5eead4', bmp: '#5eead4', ico: '#5eead4', avif: '#5eead4', heic: '#5eead4', heif: '#5eead4', tif: '#5eead4', tiff: '#5eead4' };
    const iconKey = (name) => {
      const low = String(name || '').toLowerCase();
      if (low === 'makefile' || low === 'gnumakefile' || low === 'makefile.am' || low === 'makefile.in') return 'mk';
      if (low === 'license' || low === 'licence' || low === 'copying' || low === 'notice') return 'lic';
      const e = low.indexOf('.') >= 0 ? low.split('.').pop() : '';
      const map = { sh: 'sh', bash: 'sh', zsh: 'sh', go: 'go', json: 'json', js: 'js', mjs: 'js', cjs: 'js', ts: 'js', tsx: 'js', css: 'css', scss: 'css', less: 'css', html: 'html', htm: 'html', shy: 'shy', md: 'md', markdown: 'md', mod: 'mod', sum: 'sum', log: 'log', png: 'img', apng: 'img', jpg: 'img', jpeg: 'img', jpe: 'img', gif: 'img', webp: 'img', bmp: 'img', ico: 'img', avif: 'img', heic: 'img', heif: 'img', tif: 'img', tiff: 'img' };
      return map[e] || '';
    };
    const svgIcon = (inner, color, size) => {
      const px = size || 14;
      return { __html: `<svg width="${px}" height="${px}" viewBox="0 0 16 16" fill="none" stroke="${color || 'currentColor'}" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>` };
    };
    const fileIconHtml = (name, size) => svgIcon(ICON_PAGE + (ICON_MARKS[iconKey(name)] || ''), EXTC[(String(name).split('.').pop() || '').toLowerCase()] || 'var(--cx-text-dim)', size);
    const dirIconHtml = (open, size) => svgIcon(open ? ICON_DIRO : ICON_DIR, '#7b8cff', size);
    const nodeIconHtml = (running, size) => svgIcon(running ? ICON_NODE : ICON_NODEO, running ? '#b06bff' : '#6b7391', size);
    const spaceIconHtml = (size) => svgIcon(ICON_SPACE, '#7c8cff', size);
    const chevHtml = (open, size) => ({ __html: `<svg width="${size || 10}" height="${size || 10}" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="transform:rotate(${open ? 90 : 0}deg);transition:transform .12s">${'<path d="M5.5 3L10.5 8l-5 5"/>'}</svg>` });

    // store-migration：旧键前缀链式迁移，需要枚举全部键，属唯一例外（一次性）
    // contextos-devops: → contextos-devops-dsh: → dsh-contextos-devops:（插件改名的数据兼容）
    try {
      const LEGACY = ['contextos-devops:', 'contextos-devops-dsh:'];
      const NEW = 'dsh-contextos-devops:';
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && LEGACY.some((p) => k.startsWith(p))) keys.push(k);
      }
      for (const k of keys) {
        const p = LEGACY.find((x) => k.startsWith(x));
        const nk = NEW + k.slice(p.length);
        if (localStorage.getItem(nk) == null) localStorage.setItem(nk, localStorage.getItem(k));
      }
    } catch {}
    let OPEN_LINK = null;
    const WEBTABS_KEY = 'dsh-contextos-devops:webtabs';

    /* ── 统一会话快照 ────────────────────────────────────────────────
       启动时一次性恢复「当前节点 / 空间 / 应用实例 / 工作模式 / 视图 /
       网页标签」，直接进入上次的界面，不再逐项读取、不再闪回默认界面。 */
    const SESSION_KEY = 'dsh-contextos-devops:session';
    let cxSessionMem = null, cxSessionTimer = 0;
    const cxSessionGet = () => {
      if (cxSessionMem) return cxSessionMem;
      const s = cxRead(SESSION_KEY, null); cxSessionMem = s && s.v === 2 ? s : null;
      return cxSessionMem;
    };
    const cxSessionFlush = () => { if (cxSessionMem) cxWrite(SESSION_KEY, cxSessionMem); };
    const cxSessionSave = (patch) => {
      const next = { ...(cxSessionGet() || {}), ...(patch || {}), v: 2, updatedAt: Date.now() };
      cxSessionMem = next;
      if (cxSessionTimer) return;
      cxSessionTimer = setTimeout(() => { cxSessionTimer = 0; cxSessionFlush(); }, 400);
    };
    if (typeof window !== 'undefined') window.addEventListener('pagehide', cxSessionFlush);
    const NS = 'contextosDevops';
    const OFFICIAL = [['community','云社区','20240724-community','20240724'],['enterprise','云办公','20240724-enterprise','20240724'],['operation','云研发','20240903-operation','20240903'],['knowledge','云知识','20250520-knowledge','20250520'],['healthy','云健康','20250520-healthy','20250520'],['tourism','云文旅','20250520-tourism','20250520'],['charity','云公益','20250520-charity','20250520'],['education','云教育','20240724-education','20240724'],['industry','云工业','20250520-industry','20250520'],['agriculture','云农业','20250520-agriculture','20250520']];
    const OFFICIAL_KEY = Object.fromEntries(OFFICIAL.flatMap(([k, n]) => [[k, k], [n, k]]));
    const PRODUCT_NOTES = {
      avatar: { tag: '身份层', title: '数字分身', text: '只做两件事：用当前分身（user.uid / 城市 / 公司）创建应用实例、添加数据。不部署节点、不建空间、不生成代码。' },
      factory: { tag: '生产层', title: '软件工厂', text: '持续生产：部署服务节点、创建项目空间、生成应用模板与代码、编译上线、实例化。把从机器到应用的整条生产线跑起来。' },
      iot: { tag: '世界层', title: '赛博世界', text: '发现周边、连接万物：蓝牙扫描附近设备、WiFi 扫描附近网络与同网设备，结合场景与背景，把数字分身放进真实环境。' },
    };
    const INIT_STEPS = [
      { id: 'node', label: '部署服务节点' },
      { id: 'spaces', label: '部署项目空间（云社区 / 云办公）' },
      { id: 'avatar', label: '创建数字分身' },
      { id: 'scene', label: '创建赛博世界' },
      { id: 'project', label: '创建项目管理' },
      { id: 'chat', label: '进入对话模式' },
    ];
    const TERMS = {
      zh: {
        cluster: '集群化', modules: '模块化', automation: '自动化',
        serve: '服务节点', space: '项目空间', recent: '最近应用', web: '网页界面',
        avatar: '数字分身', mode: '工作模式', view: '视图模式', factory: '软件工厂', iot: '赛博世界', scene: '赛博世界',
        create: '创建', refresh: '刷新', maximize: '最大化', restore: '恢复', close: '关闭', initialize: '初始化',
        deploy: '部署', devices: '设备', scan: '扫描', store: '应用商店', template: '模板',
        target: '目标', plan: '计划', task: '任务', report: '报告', feedback: '反馈',
        status: '状态', type: '类型', all: '全部', stopped: '已停止', missing: '缺失', starting: '启动中', search: '搜索', online: '上架', offline: '下架', code: '编程', config: '配置', data: '数据',
        system: '跟随系统', light: '浅色', dark: '深色', chinese: '中文', english: 'English',
        '目标描述': '目标描述', '计划描述': '计划描述', '探测端口': '探测端口', '探测中…': '探测中…', '重试当前步骤': '重试当前步骤', '执行过程': '执行过程', '时间': '时间', '耗时': '耗时', '操作': '操作', '影响 / 接口': '影响 / 接口', idle: '空闲', workspace: '项目空间', applications: '应用', running: '运行中', offline: '离线', chat: '对话', manage: '管理', dev: '开发',
      },
      en: {
        cluster: 'CLUSTER', modules: 'MODULES', automation: 'AUTOMATION',
        serve: 'SERVE', space: 'SPACE', recent: 'RECENT', web: 'WEB',
        avatar: 'DIGITAL AVATAR', mode: 'MODE', view: 'VIEW', factory: 'SOFTWARE FACTORY', iot: 'CYBER WORLD', scene: 'CYBER WORLD',
        create: 'Create', refresh: 'Refresh', maximize: 'Maximize', restore: 'Restore', close: 'Close', initialize: 'INIT',
        deploy: 'Deploy', devices: 'Devices', scan: 'Scan', store: 'Store', template: 'Template',
        target: 'Targets', plan: 'Plans', task: 'Tasks', report: 'Reports', feedback: 'Feedback',
        status: 'Status', type: 'Type', all: 'All', stopped: 'Stopped', missing: 'Missing', starting: 'Starting', search: 'Search', online: 'Online', offline: 'Offline', code: 'Code', config: 'Config', data: 'Data',
        system: 'System', light: 'Light', dark: 'Dark', chinese: '中文', english: 'English',
        '目标描述': 'Goal description', '计划描述': 'Plan description', '创建目标': 'Create target', '先选择一个计划': 'Select a plan first', '先选择一个任务': 'Select a task first', '先选择一个报告': 'Select a report first', '该计划下还没有任务': 'No tasks under this plan', '该任务下还没有报告': 'No reports under this task', '该报告下还没有反馈': 'No feedback yet', '该目标下还没有计划': 'No plans under this target', '选择目标后显示计划': 'Select a target to see plans', '还没有目标': 'No targets yet', '请先初始化项目管理': 'Initialize project management first', '清除筛选': 'Clear filters', '清除': 'Clear', '状态': 'Status', '待开始': 'Not started', '进行中': 'In progress', '已完成': 'Finished', '已取消': 'Canceled', '已拒绝': 'Rejected', '已提交': 'Submitted', '已通过': 'Approved', '已创建': 'Created', '可完成': 'Can finish', '刷新': 'Refresh', '清屏': 'Clear', '重连': 'Reconnect', '分屏': 'Split', '待改进': 'Needs improvement', '日报': 'Daily', '周报': 'Weekly', '月报': 'Monthly', '深夜': 'Night', '深蓝': 'Deep blue', '浅色': 'Light', '柔和': 'Soft', 'CS 风': 'CS', '红警风': 'Red Alert', '魔兽风': 'Warcraft', '星际风': 'StarCraft', '8-bit': '8-bit', '静音': 'Mute', '动效·强': 'Motion · High', '动效·中': 'Motion · Mid', '动效·弱': 'Motion · Low', '动效·微': 'Motion · Micro', '动效·关': 'Motion · Off', '青': 'Cyan', '绿': 'Green', '紫': 'Violet', '琥珀': 'Amber', '玫红': 'Rose', '冰蓝': 'Ice', '暖橙': 'Warm', '科技风': 'Tech', '古典风': 'Classic', '沙漠风': 'Desert', '雨林风': 'Rainforest', '赛博风': 'Cyber', '蒸汽风': 'Steam', '极简风': 'Minimal',  '创建计划': 'Create plan', '创建任务': 'Create task', '创建报告': 'Create report', '创建反馈': 'Create feedback', '正在初始化': 'Initializing', '初始化完成': 'Initialized', '初始化失败': 'Initialization failed', '失败': 'Failed', '完成': 'Done', '执行中': 'Running', '执行过程': 'Execution log', '标准空间': 'Standard spaces', '默认': 'Default', '探测端口': 'Probe port', '探测中…': 'Probing…', '重试当前步骤': 'Retry step', '展开日志': 'Expand log', '收起日志': 'Collapse log', '最大化': 'Maximize', '还原': 'Restore', '请求信息': 'Request', '基本信息': 'Basic info', '请求头': 'Request headers', '响应头': 'Response headers', '原始数据': 'Raw', '请求参数': 'Params', '解析数据': 'Parsed', '后端日志': 'Backend log', '重新加载': 'Reload', '日志': 'Log', '点击重新加载': 'Reload logs', '没有可解析的数据': 'No parsed data', '展开日志': 'Expand log', '收起日志': 'Collapse log', '最大化': 'Maximize', '还原': 'Restore', '请求信息': 'Request', '基本信息': 'Basic info', '请求头': 'Request headers', '响应头': 'Response headers', '原始数据': 'Raw', '请求参数': 'Params', '解析数据': 'Parsed', '后端日志': 'Backend log', '重新加载': 'Reload', '日志': 'Log', '点击重新加载': 'Reload logs', '没有可解析的数据': 'No parsed data', '执行过程': 'Execution log', '时间': 'Time', '耗时': 'Duration', '操作': 'Operation', '影响 / 接口': 'Impact / API', '数字分身 · 软件工厂 · 赛博世界': 'Digital Avatar · Software Factory · Cyber World', '创建数字分身': 'Create Digital Avatar', '创建赛博世界': 'Create Cyber World', '部署服务节点': 'Deploy node', '部署项目空间（云社区 / 云办公）': 'Deploy spaces (Community / Enterprise)', '创建项目管理': 'Create project management', '进入对话模式': 'Enter chat', '三步进入你的赛博世界：部署 → 数字分身与赛博世界 → 项目。': 'Three steps into your Cyber World: deploy → Digital Avatar & Cyber World → project.', '部署节点 → 部署空间 → 数字分身 → 赛博世界 → 项目管理 → 进入对话': 'Deploy node → Deploy spaces → Digital Avatar → Cyber World → Project → Enter chat', '将生成': 'Will create', '下一步': 'Next', '上一步': 'Back', '初始化': 'Initialize', '关闭': 'Close', '隐藏': 'Hide', '进入': 'Enter',
        idle: 'IDLE', workspace: 'Workspace', applications: 'Applications', running: 'Running', offline: 'Offline', chat: 'CHAT', manage: 'MANAGE', dev: 'DEV',
      },
    };
    // 语言在模块加载时就定下来，避免首帧（表单等 T() 文案）先按中文渲染
    let CURRENT_LANG = (() => {
      try {
        // store-runtime：模块加载期就要定语言，早于 08-store 求值，只能直读
        const m = localStorage.getItem('dsh-contextos-devops:lang') || 'system';
        const nav = String((typeof navigator !== 'undefined' && navigator.language) || 'en').toLowerCase();
        const v = m === 'system' ? (nav.startsWith('zh') ? 'zh' : 'en') : m;
        return v === 'zh' ? 'zh' : 'en';
      } catch { return 'zh'; }
    })();
    const EN_TEXT = {
      '确定': 'OK', '今天': 'Today', '清除': 'Clear', '时间': 'Time',

  '创建流程': 'Create flow', '创建流程申请': 'Create request', '修改流程': 'Modify flow',
  '个字段': 'fields', '已提交': 'Submitted', '提交': 'Submit', '查看详情': 'View details',

      '取消': 'Cancel', '保存': 'Save', '关闭': 'Close', '删除': 'Delete', '引用': 'Quote', '编辑': 'Edit', '停止': 'Stop',
      '发送': 'Send', '保存并编译': 'Save + build', '创建中…': 'Creating…', '保存中…': 'Saving…', '复制': 'Copy', '新建': 'New', '界面出现错误': 'UI error', '重试': 'Retry', '刷新页面': 'Reload', '返回': 'Back', '更多': 'More', '收起': 'Less', '清除': 'Clear', '展开': 'Expand', '折叠': 'Collapse',
      '检查更新': 'Check updates', '当前版本': 'Current version', '最新版本': 'Latest version',
      '检查时间': 'Checked at', '检查失败': 'Check failed', '检查中…': 'Checking…', '重新检查': 'Check again',
      '有新版本': 'Update available', '已是最新版本': 'You are up to date', '复制更新命令': 'Copy update command',
      '打开发布页': 'Open npm page',
      '本地版本以 package.json 为准，最新版本来自 npm registry（缓存 30 分钟）。': 'Local version comes from package.json; latest comes from the npm registry (cached 30 min).',
      '暂时查不到最新版本（网络或 registry 不可用）': 'Cannot reach the registry right now',
      '上传头像照片': 'Upload avatar photo', '修改分身…': 'Edit avatar…', '切换分身': 'Switch avatar', '新建分身…': 'New avatar…',
      '上传背景照片': 'Upload background photo', '赛博世界设置…': 'Cyber World settings…', '切换赛博世界': 'Switch Cyber World', '新建赛博世界': 'New Cyber World',
      '初始化': 'Initialize', '进入': 'Enter', '稍后': 'Later', '添加文件': 'Attach file', '确认': 'Confirm',
      '放大': 'Zoom in', '缩小': 'Zoom out', '定位': 'Locate', '全屏': 'Fullscreen', '退出全屏': 'Exit fullscreen',
      '长期': 'Long', '年': 'Year', '月': 'Month', '周': 'Week', '全部日期': 'All dates', '今天': 'Today',
      '提交': 'Submit', '通过': 'Approve', '驳回': 'Reject', '开始': 'Start', '完成': 'Finish', '交接': 'Handover',
      '+ 计划': '+ Plan', '+ 任务': '+ Task', '+ 报告': '+ Report', '+ 反馈': '+ Feedback',
      '赛博世界': 'Cyber World', '默认赛博世界': 'Default Cyber World', '默认': 'Default', '刷新': 'Refresh', '应用商店': 'Store', '部署': 'Deploy',
      '隐藏左栏': 'Hide left panel', '显示左栏': 'Show left panel', '隐藏右栏': 'Hide right panel', '显示右栏': 'Show right panel',
      '+ 技能': '+ Skill', '上传形象': 'Upload image', '重新开始': 'Restart', '生成': 'Generate', '隐藏': 'Hide', '后退': 'Back', '前进': 'Forward', '复制地址': 'Copy address', '在浏览器打开': 'Open in browser', '在管理中打开': 'Open in manage', '关闭标签': 'Close tab', '加载中…': 'Loading…', 'Copilot 正在执行…': 'Copilot is working…', '我的分身': 'My Digital Avatar', '我的赛博世界': 'My Cyber World',
      '上一步': 'Back', '下一步': 'Next', '登录中…': 'Logging in…', '登录并获取 sessid': 'Login & get sessid',
      '本机部署': 'Local', '容器部署': 'Docker', '远程部署': 'Remote deploy', '远程连接': 'Remote connect',
      '部署': 'Deploy', '分身与场景': 'Digital Avatar & Cyber World', '项目': 'Project',
      '源码地址': 'Repo URL', '部署目录': 'Install dir', '端口': 'Port', '镜像': 'Image', '宿主机目录（可空）': 'Host dir (optional)',
      '远程主机': 'Remote host', 'SSH 用户': 'SSH user', 'SSH 端口': 'SSH port', '节点端口': 'Node port', '远程地址': 'Remote URL',
      '用户名': 'Username', '密码': 'Password', '数字分身': 'Digital Avatar',
      '上传头像': 'Upload avatar', '上传背景': 'Upload background', '名称': 'Name', '公司': 'Company', '城市': 'City',
      '赛博世界名称': 'Cyber World name', '项目名称': 'Project name', '目标描述': 'Goal description', '计划描述': 'Plan description', '创建目标': 'Create target', '创建计划': 'Create plan', '创建任务': 'Create task', '创建报告': 'Create report', '创建反馈': 'Create feedback', '探测端口': 'Probe port', '探测中…': 'Probing…', '重试当前步骤': 'Retry step', '展开日志': 'Expand log', '收起日志': 'Collapse log', '最大化': 'Maximize', '还原': 'Restore', '请求信息': 'Request', '基本信息': 'Basic info', '请求头': 'Request headers', '响应头': 'Response headers', '原始数据': 'Raw', '请求参数': 'Params', '解析数据': 'Parsed', '后端日志': 'Backend log', '重新加载': 'Reload', '日志': 'Log', '点击重新加载': 'Reload logs', '没有可解析的数据': 'No parsed data', '展开日志': 'Expand log', '收起日志': 'Collapse log', '最大化': 'Maximize', '还原': 'Restore', '请求信息': 'Request', '基本信息': 'Basic info', '请求头': 'Request headers', '响应头': 'Response headers', '原始数据': 'Raw', '请求参数': 'Params', '解析数据': 'Parsed', '后端日志': 'Backend log', '重新加载': 'Reload', '日志': 'Log', '点击重新加载': 'Reload logs', '没有可解析的数据': 'No parsed data', '时间': 'Time', '耗时': 'Duration', '操作': 'Operation', '影响 / 接口': 'Impact / API', '正在初始化': 'Initializing', '初始化完成': 'Initialized', '初始化失败': 'Initialization failed', '失败': 'Failed', '完成': 'Done', '执行中': 'Running', '执行过程': 'Execution log', '标准空间': 'Standard spaces', '默认': 'Default',
      '关闭其它标签': 'Close others', '关闭全部标签': 'Close all', '刷新': 'Refresh', '外部打开': 'Open externally',
      '编辑代码': 'Edit code', '添加数据': 'Add data', '创建实例': 'Create instance', '创建应用实例': 'Create app instance', '将生成': 'Will create', '目标': 'target', '计划': 'plan', '任务': 'task',
      '初始化 / INITIALIZE': 'INITIALIZE', '正在初始化 / INITIALIZING': 'INITIALIZING', '初始化完成 / INIT DONE': 'INIT DONE', '初始化失败 / INIT FAILED': 'INIT FAILED',
      '三步进入你的赛博世界：部署 → 数字分身与赛博世界 → 项目。': 'Three steps into your Cyber World: deploy → Digital Avatar & Cyber World → project.',
      '部署节点 → 部署空间 → 数字分身 → 赛博世界 → 项目管理 → 进入对话': 'Deploy node → Deploy spaces → Create Digital Avatar → Create Cyber World → Create project → Enter chat',
      '本机直接部署节点': 'Deploy on this machine', 'docker run 一个节点': 'Run a node in Docker', 'ssh 到远端建节点': 'Deploy via SSH', '登录远端换 sessid': 'Login and get sessid',
      '我的数字分身': 'My Digital Avatar', '云轩领航': 'Yunxuan', '深圳市': 'Shenzhen', '我的赛博世界': 'My Cyber World', '我的第一个项目': 'My first project',
      '把想法变成可交付的软件。': 'Turn ideas into shippable software.', '先梳理需求，再搭建原型，最后验收演示。': 'Clarify requirements, build a prototype, then demo and accept.', '梳理需求': 'Collect requirements', '搭建原型': 'Build prototype', '验收演示': 'Demo & accept',
      '点击选择图片': 'Click to choose image', '数字分身 · 软件工厂 · 赛博世界': 'Digital Avatar · Software Factory · Cyber World',
      '用一个对话，部署节点、创建空间、生成应用、管理数字分身与日常任务。': 'One conversation to deploy nodes, create spaces, generate apps, and manage avatars and tasks.',
      '消息还是空白 · 输入问题，或从下面的建议开始': 'Empty message · type a question or pick a suggestion below',
      '身份层': 'Identity layer', '生产层': 'Production layer', '世界层': 'World layer',
      '一个用户可以有多个分身；每个分身独立 user.uid、城市、公司、人格、喜好、风格。创建应用实例、添加数据、项目任务都归属当前分身。': 'One user can have multiple avatars; each with its own user.uid, city, company, persona, preferences and style. Instances, data and tasks belong to the active avatar.',
      '从服务节点到项目空间，再到应用模板、应用代码、应用实例。把部署、生成、编译、实例化串成一条可运行的软件生产线。': 'From nodes to spaces, app templates, app code and instances — deployment, generation, build and instantiation form one runnable software line.',
      '把数字分身放进可切换的赛博世界：上传背景、设置场景参数（主题/语言/时区/地点），让对话发生在你选择的世界里。': 'Put your avatar into switchable Cyber Worlds: upload backgrounds and set scene params (theme/language/timezone/location).',
      '云社区 · 云办公': 'Community · Enterprise', '云社区 + 云办公已就绪': 'Community + Enterprise ready',      '云社区': 'Community', '云办公': 'Enterprise', '云研发': 'R&D', '云知识': 'Knowledge', '云教育': 'Education', '云健康': 'Health', '云文旅': 'Tourism', '云公益': 'Charity', '云工业': 'Industry', '云农业': 'Agriculture',

      '跳过：背景服务未就绪': 'Skipped: scene service not ready', '远程连接：跳过本地步骤': 'Remote connect: local steps skipped',
      '远程会话已建立': 'Remote session established', '对话已就绪': 'Chat ready', '已上传头像': 'avatar uploaded', '已上传背景': 'background uploaded',
      '目标': 'Target', '计划': 'Plan', '任务': 'Task', '报告': 'Report', '反馈': 'Feedback',
      '青': 'Teal', '色系': 'Palette', '声效': 'Sound', 'CS 风': 'CS style',
      '模块': 'Module', '类型': 'Type', '已发现': 'Detected',
      '数据读写': 'Data & files', '下载二进制': 'Downloading binary', '收起高级配置': 'Hide advanced',
      '代码源（可选）': 'Code source (optional)', '没有可解析的日志': 'No parsable log', '没有可解析的 SQL': 'No parsable SQL',
      '请先初始化项目管理': 'Initialize the project first',
      '接口与命令行调用结果': 'API and CLI results', '查看请求的上下文与返回': 'Request context and response',
      '接口 / 命令行输出': 'API / CLI output',
      '该节点/空间暂无命令，点“重新扫描”': 'No commands on this node/space yet — hit "Rescan"',
      '先选择一个任务': 'Select a task first',
      '先选择一个报告': 'Select a report first',
      '冰蓝': 'Ice',
      '分屏': 'Split',
      '动效·中': 'Motion · Mid',
      '动效·关': 'Motion · Off',
      '动效·弱': 'Motion · Low',
      '动效·强': 'Motion · High',
      '动效·微': 'Motion · Micro',
      '古典风': 'Classic',
      '星际风': 'StarCraft',
      '暖橙': 'Warm',
      '极简风': 'Minimal',
      '柔和': 'Soft',
      '沙漠风': 'Desert',
      '清除筛选': 'Clear filters',
      '玫红': 'Rose',
      '琥珀': 'Amber',
      '科技风': 'Tech',
      '红警风': 'Red Alert',
      '蒸汽风': 'Steam',
      '该任务下还没有报告': 'No reports under this task',
      '该报告下还没有反馈': 'No feedback under this report',
      '该计划下还没有任务': 'No tasks under this plan',
      '赛博风': 'Cyber',
      '雨林风': 'Rainforest',
      '静音': 'Mute',
      '魔兽风': 'Warcraft',
      '主题': 'Theme',
      '先绑定节点': 'Bind a node first',
      '先选空间': 'Select a space first',
      '先选节点': 'Select a node first',
      '全部': 'All',
      '全部配置': 'All settings',
      '创建': 'Create',
      '创建分身': 'Create avatar',
      '动效': 'Motion',
      '复制全部': 'Copy all',
      '复制本机': 'Copy local',
      '安装方式': 'Install method',
      '已存在，跳过': 'Exists, skipped',
      '当前时间': 'Now',
      '恢复': 'Restore',
      '扫描中…': 'Scanning…',
      '控制台': 'Console',
      '暂无应用': 'No apps yet',
      '暂无空间': 'No spaces yet',
      '暂无节点': 'No nodes yet',
      '暂无调用': 'No calls yet',
      '未绑定': 'Not bound',
      '未选应用': 'No app',
      '未选空间': 'No space',
      '本机': 'Local',
      '正在扫描命令…': 'Scanning commands…',
      '清空': 'Clear',
      '源码构建': 'Build from source',
      '点击填入输入框': 'Click to fill the input',
      '界面设置': 'Interface',
      '自动': 'Auto',
      '详情': 'Details',
      '语言': 'Language',
      '进行中的计划': 'Plans in progress',
      '选择分身': 'Select avatar',
      '选择场景': 'Select scene',
      '选择应用': 'Select app',
      '选择空间': 'Select space',
      '选择节点': 'Select node',
      '重新扫描': 'Rescan',
      '重置': 'Reset',
      '风格': 'Style',
      '紫': 'Violet', '重连': 'Reconnect', '二进制': 'Binary', '源码文件': 'Source file',
      '未绑定节点': 'No node bound', '部署项目空间': 'Deploy spaces',
      '先选择一个计划': 'Select a plan first', '计划缺少起止时间': 'Plan needs start and end time',
      '选择目标后显示计划': 'Select a target to see plans',
      '绿': 'Green', '清屏': 'Clear', '未发现': 'Not found', '解析日志': 'Parsed log',
      '还没有目标': 'No targets yet', '展开高级配置': 'Show advanced', '高级配置': 'Advanced',
      '镜像源（可选）': 'Mirror (optional)',
      '没有进行中的计划': 'No plans in progress', '该目标下还没有计划': 'No plans under this target yet',
      '标题': 'Title', '内容': 'Content', '开始时间': 'Start', '结束时间': 'End',
      '报告类型': 'Report type', '评分': 'Score', '反馈状态': 'Feedback status',
      '继承当前选择作为上级 UID': 'Inherits the current selection as the parent UID',
      // 平台枚举值（portal.json trans）——英文模式必须翻掉，否则下拉框漏中文
      '可完成': 'Can finish',
      '待改进': 'Needs improvement',
      '反馈状态': 'Feedback status',
      '报告类型': 'Report type',
      '评分': 'Score',
      '日报': 'Daily',
      '周报': 'Weekly',
      '月报': 'Monthly',
      '季报': 'Quarterly',
      '年报': 'Annual',
      '目标': 'Target',
      '计划': 'Plan',
      '任务': 'Task',
      '报告': 'Report',
      '反馈': 'Feedback',
      '没有更多操作': 'No more actions',
    '结果': 'Result',
    '打开': 'Open',
    '自动': 'Auto',
    '打开项目管理': 'Open project',
    '请先选择一个': 'Select a',
    '缺少动作名': 'Missing action name',
    '已创建': 'Created',
      '已提交': 'Submitted',
      '已审批': 'Approved',
      '进行中': 'In progress',
      '已完成': 'Finished',
      '已取消': 'Canceled',
      '已驳回': 'Rejected',
      '为必填；输入时自动从接口 inputs 获取候选值，select 字段只能从下拉列表选择。': 'Required; candidates come from the inputs API, select fields accept list values only.',
      '还有 {n} 个必填项未填写': '{n} required field(s) missing',
      '已更新 {kind}': 'Updated {kind}', '已删除 {kind}': 'Deleted {kind}', '已创建 {kind}': 'Created {kind}',
      '部署服务节点': 'Deploy node', '部署项目空间（云社区 / 云办公）': 'Deploy spaces', '创建数字分身': 'Create avatar',
      '创建赛博世界': 'Create Cyber World', '创建项目管理': 'Create project', '进入对话模式': 'Enter chat', '已上传照片 · 生成赛博世界': 'Photo · Cyber World', '默认背景': 'Default scene',
    };
    // ZH_TEXT：英文为源文案时的中文翻译（新功能一律「英文 key + 中文翻译」）
    const ZH_TEXT = {
      'Edit': '编辑', 'New': '新建', 'Save': '保存', 'Cancel': '取消', 'Delete': '删除', 'More': '更多',
      'Title': '标题', 'Content': '内容', 'Start': '开始时间', 'End': '结束时间',
      'Report type': '报告类型', 'Score': '评分', 'Feedback status': '反馈状态',
      'Target': '目标', 'Plan': '计划', 'Task': '任务', 'Report': '报告', 'Feedback': '反馈',
      '8-bit': '8-bit',
      'Required fields are missing': '还有必填项未填写',
      'Inherits the current selection as the parent UID': '继承当前选择作为上级 UID',
      'Required; candidates come from the inputs API, select fields accept list values only.':
        '为必填；输入时自动从接口 inputs 获取候选值，select 字段只能从下拉列表选择。',
    };
    const T = (src) => (CURRENT_LANG === 'zh' ? (ZH_TEXT[src] || src) : (EN_TEXT[src] || src));
    // TT('已更新 {kind}', { kind: 'Target' })：先取模板再替换占位符，模板本身两边都要有词条
    const TT = (tpl, vars) => {
      let out = T(tpl);
      if (vars) for (const k of Object.keys(vars)) out = out.split(`{${k}}`).join(String(vars[k]));
      return out;
    };
    const PM_STATUS_ZH = { created: '已创建', submited: '已提交', approved: '已通过', process: '进行中', finished: '已完成', canceled: '已取消', rejected: '已拒绝' };
    const PM_STATUS_EN = { created: 'Created', submited: 'Submitted', approved: 'Approved', process: 'In progress', finished: 'Finished', canceled: 'Canceled', rejected: 'Rejected' };
    const pmStatusText = (v) => (CURRENT_LANG === 'zh' ? (PM_STATUS_ZH[v] || v) : (PM_STATUS_EN[v] || EN_TEXT[v] || v));
    const term = (lang, key) => (TERMS[lang] && TERMS[lang][key]) || TERMS.en[key] || key;
    const browserLang = () => (typeof navigator !== 'undefined' && String(navigator.language || '').toLowerCase().startsWith('zh') ? 'zh' : 'en');

    const CHAT_MODES = [
      { id: 'avatar', name: '数字分身', intro: '数字分身模式：只用当前分身（user.uid / 城市 / 公司）创建应用实例、添加数据、查看应用数据；不会部署节点、创建空间或生成代码。',
        quick: ['创建应用实例「员工管理」', '给「员工管理」添加一条数据', '查看「员工管理」的应用数据', '把目标拆解成计划和任务'],
        introEn: 'Digital avatar mode: the active avatar user.uid/company/city are used when creating instances. Say "create employee management", "add data to recent app", "check project progress".',
        quickEn: ['Create instance "Employee"', 'Add one record to "Employee"', 'View app data of "Employee"', 'Break a goal into plans and tasks'] },
      { id: 'factory', name: '软件工厂', intro: '软件工厂模式：持续部署服务节点、创建项目空间、生成应用代码并编译上线；说「部署 9188 节点」「创建空间 demo」「生成员工管理」「修改应用代码」。',
        quick: ['创建项目空间 demo', '生成应用模板「员工管理」', '添加应用代码「员工管理」'],
        introEn: 'Software factory mode: say "deploy node 9188", "create space demo", "generate employee management", "edit app code".',
        quickEn: ['Create space demo', 'Generate app template "Employee"', 'Add app code "Employee"'] },
      { id: 'iot', name: '赛博世界', intro: '赛博世界模式：发现周边设备——蓝牙扫描附近设备、WiFi 扫描附近网络与同网设备，实现万物互联；也可切换场景与背景。',
        quick: ['扫描周边设备', '连接周边设备', '控制周边设备「灯光」', '切换赛博世界场景'],
        introEn: 'Cyber World mode: scan, connect and control nearby devices over Bluetooth/WiFi, and switch the cyber scene.',
        quickEn: ['Scan nearby devices', 'Connect a nearby device', 'Control device "light"', 'Switch cyber scene'] },
    ];

    const reportError = (msg) => {
      try { fetch(API, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ op: 'clientError', error: msg }), keepalive: true }); } catch {}
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('error', (e) => reportError(String(e?.message || e?.error || '')));
      window.addEventListener('unhandledrejection', (e) => reportError(String(e?.reason?.message || e?.reason || '')));
    }

/** The single identity used for every request: the active avatar, else the last
 * one we saw (survives reloads before `avatars` finishes loading). */
function cxActorUid(avatar) {
  if (avatar && avatar.uid) return avatar.uid;
  return cxReadText('actor', '');
}
