window.__ModuleLoader__.load({
  id: '@local/contextos-devops-dsh',
  factory(require) {
    const React = require('react');
    const h = React.createElement;
    const { useState, useEffect, useCallback, useRef } = React;
    const API = '/contextos-devops-dsh/api';
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

    // 旧版 localStorage 键迁移（一次性）
    try {
      const OLD = 'contextos-devops:';
      const NEW = 'contextos-devops-dsh:';
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.startsWith(OLD)) keys.push(k); }
      for (const k of keys) {
        const nk = NEW + k.slice(OLD.length);
        if (localStorage.getItem(nk) == null) localStorage.setItem(nk, localStorage.getItem(k));
      }
    } catch {}
    let OPEN_LINK = null;
    const WEBTABS_KEY = 'contextos-devops-dsh:webtabs';
    const NS = 'contextosDevops';
    const OFFICIAL = [['community','云社区','20240724'],['enterprise','云办公','20240724'],['operation','云研发','20240903'],['knowledge','云知识','20250520'],['education','云教育','20240724'],['healthy','云健康','20250520'],['tourism','云文旅','20250520'],['charity','云公益','20250520'],['industry','云工业','20250520'],['agriculture','云农业','20250520']];
    const OFFICIAL_KEY = Object.fromEntries(OFFICIAL.flatMap(([k, n]) => [[k, k], [n, k]]));
    const PRODUCT_NOTES = {
      avatar: { tag: '身份层', title: '数字分身', text: '一个用户可以有多个分身；每个分身独立 user.uid、城市、公司、人格、喜好、风格。创建应用实例、添加数据、项目任务都归属当前分身。' },
      factory: { tag: '生产层', title: '软件工厂', text: '从服务节点到项目空间，再到应用模板、应用代码、应用实例。把部署、生成、编译、实例化串成一条可运行的软件生产线。' },
      iot: { tag: '世界层', title: '赛博世界', text: '把数字分身放进可切换的赛博世界：上传背景、设置场景参数（主题/语言/时区/地点），让对话发生在你选择的世界里。' },
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
        avatar: '数字分身', mode: '工作模式', factory: '软件工厂', iot: '赛博世界', scene: '赛博世界',
        create: '创建', refresh: '刷新', maximize: '最大化', restore: '恢复', close: '关闭', initialize: '初始化',
        deploy: '部署', devices: '设备', scan: '扫描', store: '应用商店', template: '模板',
        target: '目标', plan: '计划', task: '任务', report: '报告', feedback: '反馈',
        status: '状态', type: '类型', all: '全部', search: '搜索', online: '上架', offline: '下架', code: '编程', config: '配置', data: '数据',
        system: '跟随系统', light: '浅色', dark: '深色', chinese: '中文', english: 'English',
        idle: '空闲', workspace: '项目空间', applications: '应用', running: '运行中', offline: '离线', chat: '对话', manage: '管理', dev: '开发',
      },
      en: {
        cluster: 'CLUSTER', modules: 'MODULES', automation: 'AUTOMATION',
        serve: 'SERVE', space: 'SPACE', recent: 'RECENT', web: 'WEB',
        avatar: 'DIGITAL AVATAR', mode: 'MODE', factory: 'SOFTWARE FACTORY', iot: 'CYBER WORLD', scene: 'CYBER WORLD',
        create: 'Create', refresh: 'Refresh', maximize: 'Maximize', restore: 'Restore', close: 'Close', initialize: 'INIT',
        deploy: 'Deploy', devices: 'Devices', scan: 'Scan', store: 'Store', template: 'Template',
        target: 'Targets', plan: 'Plans', task: 'Tasks', report: 'Reports', feedback: 'Feedback',
        status: 'Status', type: 'Type', all: 'All', search: 'Search', online: 'Online', offline: 'Offline', code: 'Code', config: 'Config', data: 'Data',
        system: 'System', light: 'Light', dark: 'Dark', chinese: '中文', english: 'English',
        idle: 'IDLE', workspace: 'Workspace', applications: 'Applications', running: 'Running', offline: 'Offline', chat: 'CHAT', manage: 'MANAGE', dev: 'DEV',
      },
    };
    let CURRENT_LANG = 'zh';
    const EN_TEXT = {
      '取消': 'Cancel', '保存': 'Save', '关闭': 'Close', '删除': 'Delete', '编辑': 'Edit', '停止': 'Stop',
      '发送': 'Send', '更多': 'More', '收起': 'Less', '清除': 'Clear', '展开': 'Expand', '折叠': 'Collapse',
      '上传头像照片': 'Upload avatar photo', '修改分身…': 'Edit avatar…', '切换分身': 'Switch avatar', '新建分身…': 'New avatar…',
      '上传背景照片': 'Upload background photo', '赛博世界设置…': 'Cyber world settings…', '切换赛博世界': 'Switch cyber world', '新建赛博世界': 'New cyber world',
      '初始化': 'Initialize', '进入': 'Enter', '稍后': 'Later', '添加文件': 'Attach file', '确认': 'Confirm',
      '放大': 'Zoom in', '缩小': 'Zoom out', '定位': 'Locate', '全屏': 'Fullscreen', '退出全屏': 'Exit fullscreen',
      '长期': 'Long', '年': 'Year', '月': 'Month', '周': 'Week', '全部日期': 'All dates',
      '提交': 'Submit', '通过': 'Approve', '驳回': 'Reject', '开始': 'Start', '完成': 'Finish', '交接': 'Handover',
      '+ 计划': '+ Plan', '+ 任务': '+ Task', '+ 报告': '+ Report', '+ 反馈': '+ Feedback',
      '赛博世界': 'Cyber world', '默认赛博世界': 'Default cyber world', '默认': 'Default', '刷新': 'Refresh', '应用商店': 'Store', '部署': 'Deploy',
      '隐藏左栏': 'Hide left panel', '显示左栏': 'Show left panel', '隐藏右栏': 'Hide right panel', '显示右栏': 'Show right panel',
      '+ 技能': '+ Skill', '上传形象': 'Upload image', '重新开始': 'Restart', '生成': 'Generate', '隐藏': 'Hide', '后退': 'Back', '前进': 'Forward', '复制地址': 'Copy address', '在浏览器打开': 'Open in browser', '在管理中打开': 'Open in manage', '关闭标签': 'Close tab', '加载中…': 'Loading…', 'Copilot 正在执行…': 'Copilot is working…', '我的分身': 'My Digital Avatar', '我的赛博世界': 'My cyber world',
      '上一步': 'Back', '下一步': 'Next', '登录中…': 'Logging in…', '登录并获取 sessid': 'Login & get sessid',
      '本机部署': 'Local', '容器部署': 'Docker', '远程部署': 'Remote deploy', '远程连接': 'Remote connect',
      '部署': 'Deploy', '分身与场景': 'Digital Avatar & World', '项目': 'Project',
      '源码地址': 'Repo URL', '部署目录': 'Install dir', '端口': 'Port', '镜像': 'Image', '宿主机目录（可空）': 'Host dir (optional)',
      '远程主机': 'Remote host', 'SSH 用户': 'SSH user', 'SSH 端口': 'SSH port', '节点端口': 'Node port', '远程地址': 'Remote URL',
      '用户名': 'Username', '密码': 'Password', '数字分身': 'Digital Avatar',
      '上传头像': 'Upload avatar', '上传背景': 'Upload background', '名称': 'Name', '公司': 'Company', '城市': 'City',
      '赛博世界名称': 'Cyber world name', '项目名称': 'Project name', '项目简介': 'Description', '任务清单（每行一个）': 'Tasks (one per line)',
      '关闭其它标签': 'Close others', '关闭全部标签': 'Close all', '刷新': 'Refresh', '外部打开': 'Open externally',
      '编辑代码': 'Edit code', '添加数据': 'Add data', '创建实例': 'Create instance', '将生成': 'Will create', '目标': 'target', '计划': 'plan', '任务': 'task',
      '初始化 / INITIALIZE': 'INITIALIZE', '正在初始化 / INITIALIZING': 'INITIALIZING', '初始化完成 / INIT DONE': 'INIT DONE', '初始化失败 / INIT FAILED': 'INIT FAILED',
      '三步进入你的赛博世界：部署 → 数字分身与赛博世界 → 项目。': 'Three steps into your cyber world: deploy → avatar & world → project.',
      '部署节点 → 部署空间 → 数字分身 → 赛博世界 → 项目管理 → 进入对话': 'Deploy node → Deploy spaces → Create avatar → Create cyber world → Create project → Enter chat',
      '本机直接部署节点': 'Deploy on this machine', 'docker run 一个节点': 'Run a node in Docker', 'ssh 到远端建节点': 'Deploy via SSH', '登录远端换 sessid': 'Login and get sessid',
      '我的数字分身': 'My Digital Avatar', '云轩领航': 'Yunxuan', '深圳市': 'Shenzhen', '我的赛博世界': 'My cyber world', '我的第一个项目': 'My first project',
      '把想法变成可交付的软件。': 'Turn ideas into shippable software.', '梳理需求': 'Collect requirements', '搭建原型': 'Build prototype', '验收演示': 'Demo & accept',
      '点击选择图片': 'Click to choose image', '数字分身 · 软件工厂 · 赛博世界': 'Digital Avatar · Software Factory · Cyber World',
      '用一个对话，部署节点、创建空间、生成应用、管理数字分身与日常任务。': 'One conversation to deploy nodes, create spaces, generate apps, and manage avatars and tasks.',
      '消息还是空白 · 输入问题，或从下面的建议开始': 'Empty message · type a question or pick a suggestion below',
      '身份层': 'Identity layer', '生产层': 'Production layer', '世界层': 'World layer',
      '一个用户可以有多个分身；每个分身独立 user.uid、城市、公司、人格、喜好、风格。创建应用实例、添加数据、项目任务都归属当前分身。': 'One user can have multiple avatars; each with its own user.uid, city, company, persona, preferences and style. Instances, data and tasks belong to the active avatar.',
      '从服务节点到项目空间，再到应用模板、应用代码、应用实例。把部署、生成、编译、实例化串成一条可运行的软件生产线。': 'From nodes to spaces, app templates, app code and instances — deployment, generation, build and instantiation form one runnable software line.',
      '把数字分身放进可切换的赛博世界：上传背景、设置场景参数（主题/语言/时区/地点），让对话发生在你选择的世界里。': 'Put your avatar into switchable cyber worlds: upload backgrounds and set scene params (theme/language/timezone/location).',
      '云社区 · 云办公': 'Community · Enterprise', '云社区 + 云办公已就绪': 'Community + Enterprise ready',
      '跳过：背景服务未就绪': 'Skipped: scene service not ready', '远程连接：跳过本地步骤': 'Remote connect: local steps skipped',
      '远程会话已建立': 'Remote session established', '对话已就绪': 'Chat ready', '已上传头像': 'avatar uploaded', '已上传背景': 'background uploaded',
      '部署服务节点': 'Deploy node', '部署项目空间（云社区 / 云办公）': 'Deploy spaces', '创建数字分身': 'Create avatar',
      '创建赛博世界': 'Create cyber world', '创建项目管理': 'Create project', '进入对话模式': 'Enter chat', '已上传照片 · 生成赛博世界': 'Photo · cyber world', '默认背景': 'Default scene',
    };
    const T = (zh) => (CURRENT_LANG === 'zh' ? zh : (EN_TEXT[zh] || zh));
    const term = (lang, key) => (TERMS[lang] && TERMS[lang][key]) || TERMS.en[key] || key;
    const browserLang = () => (typeof navigator !== 'undefined' && String(navigator.language || '').toLowerCase().startsWith('zh') ? 'zh' : 'en');

    const CHAT_MODES = [
      { id: 'avatar', name: '数字分身', intro: '数字分身模式：当前分身的 user.uid/公司/城市会用于创建实例；说「创建员工管理」「给最近应用添加数据」「查看项目进度」。', quick: ['创建员工管理', '最近应用', '查看项目进度', '拆解目标'], introEn: 'Digital avatar mode: the active avatar user.uid/company/city are used when creating instances. Say "create employee management", "add data to recent app", "check project progress".', quickEn: ['Create employee management', 'Recent apps', 'Check project progress', 'Break down a goal'] },
      { id: 'factory', name: '软件工厂', intro: '软件工厂模式：说「部署 9188 节点」「创建空间 demo」「生成员工管理」「修改应用代码」。', quick: ['部署 9188 节点', '创建空间 demo', '生成员工管理', '修改应用代码'], introEn: 'Software factory mode: say "deploy node 9188", "create space demo", "generate employee management", "edit app code".', quickEn: ['Deploy node 9188', 'Create space demo', 'Generate employee management', 'Edit app code'] },
      { id: 'iot', name: '赛博世界', intro: '赛博世界模式：说「切换场景」「上传背景照片」「设置场景时间地点」，用场景承载对话环境与数字分身的外观。', quick: ['切换场景', '上传背景照片', '设置场景时间地点', '打开应用'], introEn: 'Cyber world mode: say "switch scene", "upload background", "set scene time and location" to shape the conversation environment.', quickEn: ['Switch scene', 'Upload background', 'Set scene time/location', 'Open app'] },
    ];

    const reportError = (msg) => {
      try { fetch(API, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ op: 'clientError', error: msg }), keepalive: true }); } catch {}
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('error', (e) => reportError(String(e?.message || e?.error || '')));
      window.addEventListener('unhandledrejection', (e) => reportError(String(e?.reason?.message || e?.reason || '')));
    }

    const css = String.raw`
:root{--cx-bg:#050a12;--cx-panel:#08131f;--cx-panel2:#0b1b2b;--cx-line:#16384d;--cx-line2:#1d4d66;--cx-cyan:#3ee7ff;--cx-cyan2:#18b6d8;--cx-green:#42f5a7;--cx-orange:#ffb454;--cx-red:#ff5c7a;--cx-text:#d9f4ff;--cx-muted:#6f9bb3;--cx-font:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
.cx-shell{height:100%;min-height:0;display:flex;flex-direction:column;background:radial-gradient(1100px 500px at 15% -10%,rgba(62,231,255,.12),transparent 55%),radial-gradient(900px 400px at 95% 0%,rgba(66,245,167,.07),transparent 50%),var(--cx-bg);color:var(--cx-text);font-family:var(--cx-font);overflow:hidden}

.cx-shell{overflow-x:hidden}
.cx-chat-b,.cx-pm-side,.cx-dev-b,.cx-sel-menu,.cx-console-main,.cx-webmask{overflow-x:hidden}
.cx-shell,.cx-shell *{scrollbar-width:thin;scrollbar-color:rgba(62,231,255,.22) transparent}
.cx-shell::-webkit-scrollbar,.cx-shell ::-webkit-scrollbar{width:8px;height:8px}
.cx-shell::-webkit-scrollbar-track,.cx-shell ::-webkit-scrollbar-track{background:transparent}
.cx-shell::-webkit-scrollbar-thumb,.cx-shell ::-webkit-scrollbar-thumb{background:rgba(62,231,255,.22);border-radius:8px;border:2px solid transparent;background-clip:content-box}
.cx-shell::-webkit-scrollbar-thumb:hover,.cx-shell ::-webkit-scrollbar-thumb:hover{background:rgba(62,231,255,.42);background-clip:content-box}
.cx-shell ::-webkit-scrollbar-corner{background:transparent}
.cx-shell[data-theme="light"]{scrollbar-color:rgba(11,127,159,.28) transparent}
.cx-shell[data-theme="light"] ::-webkit-scrollbar-thumb{background:rgba(11,127,159,.28);background-clip:content-box}
.cx-shell[data-theme="light"] ::-webkit-scrollbar-thumb:hover{background:rgba(11,127,159,.45);background-clip:content-box}

.cx-shell *{box-sizing:border-box}
.cx-header{display:flex;align-items:center;gap:16px;padding:12px 16px;border-bottom:1px solid var(--cx-line);background:linear-gradient(180deg,rgba(9,24,38,.96),rgba(5,10,18,.9));position:relative}
.cx-header:after{content:"";position:absolute;left:0;right:0;bottom:-1px;height:1px;background:linear-gradient(90deg,transparent,var(--cx-cyan),transparent);opacity:.55}
.cx-brand{display:flex;align-items:center;gap:10px;min-width:250px}
.cx-mark{width:28px;height:28px;border:1px solid var(--cx-cyan);transform:rotate(45deg);display:grid;place-items:center;box-shadow:0 0 18px rgba(62,231,255,.3),inset 0 0 12px rgba(62,231,255,.12)}
.cx-mark i{width:8px;height:8px;background:var(--cx-cyan);box-shadow:0 0 10px var(--cx-cyan)}
.cx-title{font-size:14px;font-weight:800;letter-spacing:.18em;color:#eaffff}
.cx-sub{font-size:10px;color:var(--cx-muted);letter-spacing:.16em;margin-top:2px}
.cx-chips{display:flex;gap:8px;flex:1;min-width:0;flex-wrap:wrap}
.cx-chip{display:flex;align-items:center;gap:7px;padding:5px 9px;border:1px solid var(--cx-line);background:rgba(7,20,32,.75);font-size:10px;letter-spacing:.08em;color:var(--cx-muted);white-space:nowrap}
.cx-chip b{color:var(--cx-text);font-size:11px;font-weight:700}
.cx-chip .dot{width:6px;height:6px;border-radius:50%;background:var(--cx-muted)}
.cx-chip .dot.on{background:var(--cx-green);box-shadow:0 0 8px var(--cx-green)}
.cx-actions{display:flex;align-items:center;gap:7px;flex:none;white-space:nowrap}
.cx-btn{appearance:none;border:1px solid var(--cx-line2);background:rgba(8,25,40,.9);color:var(--cx-text);font:600 11px/1 var(--cx-font);padding:7px 10px;cursor:pointer;letter-spacing:.04em}
.cx-btn:hover{border-color:var(--cx-cyan);color:var(--cx-cyan);box-shadow:0 0 14px rgba(62,231,255,.12)}
.cx-btn.pri{border-color:var(--cx-cyan);background:linear-gradient(135deg,rgba(62,231,255,.18),rgba(24,182,216,.08));color:#dffcff}
.cx-btn.warn{border-color:rgba(255,180,84,.55);color:var(--cx-orange)}
.cx-btn.danger{border-color:rgba(255,92,122,.5);color:var(--cx-red)}
.cx-btn:disabled{opacity:.35;cursor:not-allowed;box-shadow:none}
.cx-btn.xs{height:26px;padding:0 8px;font-size:10px;display:inline-flex;align-items:center;justify-content:center;line-height:1}
.cx-pipe{display:flex;align-items:center;gap:0;padding:9px 16px;border-bottom:1px solid var(--cx-line);background:rgba(5,14,24,.78);overflow:auto}
.cx-stage{display:flex;align-items:center;gap:8px;padding:4px 10px;border:1px solid transparent;color:var(--cx-muted);font-size:10px;letter-spacing:.12em;white-space:nowrap}
.cx-stage .n{width:18px;height:18px;border:1px solid var(--cx-line2);display:grid;place-items:center;font-size:9px;color:var(--cx-muted)}
.cx-stage.on{color:var(--cx-cyan);border-color:rgba(62,231,255,.35);background:rgba(62,231,255,.06)}
.cx-stage.on .n{border-color:var(--cx-cyan);color:var(--cx-cyan);box-shadow:0 0 10px rgba(62,231,255,.2)}
.cx-stage.done{color:var(--cx-green)}
.cx-stage.done .n{border-color:var(--cx-green);color:var(--cx-green)}
.cx-arrow{color:var(--cx-line2);padding:0 6px;font-size:12px}
.cx-body{flex:1;min-height:0;display:grid;grid-template-columns:minmax(200px,.72fr) minmax(220px,.82fr) minmax(250px,.92fr) minmax(380px,2fr);gap:10px;padding:10px 12px 0;overflow:hidden}
.cx-panel{min-width:0;min-height:0;display:flex;flex-direction:column;border:1px solid var(--cx-line);background:linear-gradient(180deg,rgba(8,22,36,.92),rgba(6,15,25,.94));position:relative}
.cx-panel:before{content:"";position:absolute;left:-1px;top:-1px;width:18px;height:18px;border-left:1px solid var(--cx-cyan);border-top:1px solid var(--cx-cyan);opacity:.7}
.cx-ph{display:flex;align-items:center;gap:8px;padding:9px 10px;border-bottom:1px solid var(--cx-line);background:rgba(9,27,43,.55)}
.cx-ph .idx{font-size:9px;color:var(--cx-cyan);border:1px solid rgba(62,231,255,.35);padding:2px 4px}
.cx-ph .ttl{font-size:11px;font-weight:800;letter-spacing:.12em;color:#c9f7ff;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cx-ph .cnt{font-size:10px;color:var(--cx-muted)}
.cx-tools{display:flex;align-items:center;gap:5px;padding:7px 8px;border-bottom:1px solid rgba(22,56,77,.6);flex-wrap:wrap}
.cx-tools-spacer{flex:1;min-width:4px}
.cx-tools .cx-btn{flex:none}
.cx-tools .cx-filter{flex:none}
.cx-list{flex:1;min-height:0;overflow:auto;padding:6px}
.cx-empty{padding:18px 14px;color:var(--cx-muted);font-size:11px;line-height:1.8;border:1px dashed var(--cx-line);margin:8px}
.cx-node{display:flex;flex-wrap:wrap;align-items:center;gap:8px;padding:8px;border:1px solid transparent;border-left:2px solid var(--cx-line2);background:rgba(7,19,31,.7);margin-bottom:5px;cursor:pointer;position:relative}
.cx-node:hover{background:rgba(11,35,53,.8);border-color:var(--cx-line)}
.cx-node.on{border-color:var(--cx-cyan);border-left-color:var(--cx-cyan);background:rgba(12,42,60,.75);box-shadow:inset 0 0 18px rgba(62,231,255,.06)}
.cx-led{width:7px;height:7px;border-radius:50%;background:#31536a;flex:none}
.cx-led.on{background:var(--cx-green);box-shadow:0 0 9px var(--cx-green)}
.cx-led.warn{background:var(--cx-orange);box-shadow:0 0 8px var(--cx-orange)}
.cx-main{flex:1;min-width:0}
.cx-name{font-size:12px;font-weight:700;color:#e9fbff;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cx-meta{font-size:9px;color:var(--cx-muted);margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cx-tag{font-size:8px;padding:1px 4px;border:1px solid var(--cx-line2);color:var(--cx-muted);letter-spacing:.06em}
.cx-tag.cy{color:var(--cx-cyan);border-color:rgba(62,231,255,.4)}
.cx-tag.gr{color:var(--cx-green);border-color:rgba(66,245,167,.35)}
.cx-node-actions{display:flex;gap:5px;align-items:center;justify-content:flex-end;width:100%;margin-left:0;flex:none;margin-top:2px}
.cx-space-icon{width:22px;height:22px;border-radius:4px;object-fit:cover;flex:none;border:1px solid var(--cx-border);background:var(--cx-surface-2)}
.cx-space{padding:8px;border:1px solid rgba(22,56,77,.7);background:rgba(7,19,31,.65);margin-bottom:5px;cursor:pointer}
.cx-space:hover,.cx-space.on{border-color:var(--cx-cyan);background:rgba(11,35,53,.8)}
.cx-space .row{display:flex;align-items:center;gap:7px;min-width:0}
.cx-space .nm{flex:1;min-width:0;font-size:12px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cx-space .sub{display:flex;gap:6px;align-items:center;margin-top:2px;font-size:9px;color:var(--cx-muted);flex-wrap:wrap}
.cx-app{display:grid;grid-template-columns:minmax(0,1fr);gap:6px;padding:8px;border-bottom:1px solid rgba(22,56,77,.55);cursor:pointer}
.cx-app:hover{background:rgba(11,35,53,.55)}
.cx-app.on{background:rgba(13,45,64,.65);box-shadow:inset 2px 0 0 var(--cx-cyan)}
.cx-app .an{font-size:12px;font-weight:700;color:#e9fbff;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cx-app .ac{font-size:9px;color:var(--cx-muted);margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cx-app .aa{display:flex;gap:3px;align-items:center;justify-content:flex-end;grid-column:1/-1;margin-left:auto}
.cx-detail{border-top:1px solid var(--cx-line);padding:8px 9px;background:rgba(5,15,25,.85)}
.cx-detail .dt{font-size:10px;color:var(--cx-cyan);letter-spacing:.1em;margin-bottom:4px}
.cx-detail .dc{font-size:10px;color:var(--cx-muted);line-height:1.7;word-break:break-all}
.cx-preview{height:100%;min-height:320px;position:relative;background:#02060c}
.cx-preview iframe{position:absolute;inset:0;width:100%;height:100%;border:0;background:#fff}
.cx-preview-bar{position:absolute;left:0;right:0;top:0;z-index:2;display:flex;gap:5px;padding:5px 7px;background:linear-gradient(180deg,rgba(2,8,14,.92),transparent);pointer-events:none}
.cx-preview-bar .cx-btn{pointer-events:auto}
.cx-log{flex:0 0 220px;border-top:1px solid var(--cx-line);background:rgba(4,11,19,.92);display:flex;flex-direction:column;min-height:0}
.cx-log-h{display:flex;align-items:center;gap:8px;padding:5px 12px;border-bottom:1px solid rgba(22,56,77,.6);font-size:9px;letter-spacing:.12em;color:var(--cx-muted)}
.cx-log-h b{color:var(--cx-cyan);font-weight:700}
.cx-log-b{flex:1;overflow:auto;padding:5px 12px;font-size:10px;line-height:1.65}
.cx-line{display:flex;gap:8px;white-space:pre-wrap;word-break:break-all}
.cx-line .t{color:#436a80;flex:none}
.cx-line .m{color:#9fc4d6}
.cx-line.ok .m{color:var(--cx-green)}
.cx-line.err .m{color:var(--cx-red)}
.cx-line.run .m{color:var(--cx-orange)}
.cx-debug .cx-line .m{color:#7fb8d0;font-size:9px}
.cx-debug .cx-line{padding:1px 0;border-bottom:1px solid rgba(22,56,77,.2)}
.cx-err{margin:8px 12px 0;padding:7px 9px;border:1px solid rgba(255,92,122,.5);background:rgba(255,92,122,.08);color:#ff9caf;font-size:10px;white-space:pre-wrap}
.cx-modal{position:fixed;inset:0;background:rgba(1,5,10,.72);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;z-index:200}
.cx-card{width:min(620px,calc(100vw - 36px));max-height:calc(100vh - 60px);overflow:auto;border:1px solid var(--cx-cyan);background:linear-gradient(180deg,#081826,#050d16);box-shadow:0 0 50px rgba(62,231,255,.15);padding:16px}
.cx-card h2{margin:0;font-size:12px;letter-spacing:.14em;color:var(--cx-cyan);font-weight:800}
.cx-card .desc{font-size:10px;color:var(--cx-muted);line-height:1.7;margin:6px 0 12px}
.cx-form{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.cx-field{display:flex;flex-direction:column;gap:4px;font-size:9px;color:var(--cx-muted);letter-spacing:.06em}
.cx-field.full{grid-column:1/-1}
.cx-input,.cx-select,.cx-area{font:11px/1.5 var(--cx-font);color:var(--cx-text);background:#04101a;border:1px solid var(--cx-line2);padding:7px 8px;outline:none;width:100%}
.cx-input:focus,.cx-select:focus,.cx-area:focus{border-color:var(--cx-cyan);box-shadow:0 0 0 1px rgba(62,231,255,.15)}
.cx-area{min-height:90px;resize:vertical}
.cx-row{display:flex;gap:6px;align-items:center}
.cx-table{width:100%;border-collapse:collapse;font-size:10px}
.cx-table th,.cx-table td{border-bottom:1px solid rgba(22,56,77,.6);padding:4px 5px;text-align:left;color:var(--cx-muted)}
.cx-table th{color:var(--cx-cyan);font-weight:700}
.cx-foot{display:flex;gap:7px;justify-content:flex-end;margin-top:14px}
.cx-spin{display:inline-block;width:8px;height:8px;border:1px solid var(--cx-cyan);border-top-color:transparent;border-radius:50%;animation:cxspin .7s linear infinite}
@keyframes cxspin{to{transform:rotate(360deg)}}
.cx-chat-fab{position:fixed;right:18px;bottom:18px;z-index:260;width:52px;height:52px;border-radius:50%;border:1px solid var(--cx-cyan);background:radial-gradient(circle at 30% 20%,rgba(62,231,255,.35),rgba(5,15,25,.96));color:#eaffff;font:800 10px/1 var(--cx-font);letter-spacing:.08em;cursor:pointer;box-shadow:0 0 24px rgba(62,231,255,.28),inset 0 0 18px rgba(62,231,255,.12)}
.cx-chat-fab:hover{box-shadow:0 0 34px rgba(62,231,255,.5)}
.cx-chat{position:fixed;right:18px;bottom:18px;z-index:270;width:min(560px,calc(100vw - 18px));height:min(640px,calc(100vh - 30px));display:flex;flex-direction:column;border:1px solid var(--cx-cyan);background:linear-gradient(180deg,rgba(7,24,38,.97),rgba(4,11,19,.98));box-shadow:0 0 50px rgba(0,0,0,.55),0 0 30px rgba(62,231,255,.12)}
.cx-chat.full{position:absolute;left:0;right:0;top:0;bottom:0;width:100%;height:100%;border:0;z-index:500}
.cx-chat.full .cx-chat-b{max-width:900px;width:calc(100% - 36px);margin:0 auto;padding:18px 0}
.cx-chat.full .cx-chat-i,.cx-chat.full .cx-chat-q,.cx-chat.full .cx-chat-ctx,.cx-chat.full .cx-chat-modes{width:100%;max-width:900px;margin:0 auto}
.cx-chat.full .cx-msg{max-width:78%;font-size:12px;padding:10px 12px}
.cx-chat.full .cx-chat-b{gap:10px}
.cx-chat-h{display:flex;align-items:center;gap:8px;padding:9px 11px;border-bottom:1px solid var(--cx-line);background:rgba(9,30,46,.9)}
.cx-chat-h .t{font-size:10px;font-weight:800;letter-spacing:.14em;color:var(--cx-cyan);flex:1}
.cx-chat-h .x{border:0;background:transparent;color:var(--cx-muted);cursor:pointer;font-size:14px}
.cx-chat-modes{display:flex;gap:3px;padding:6px 8px;border-bottom:1px solid rgba(22,56,77,.6);background:rgba(5,16,26,.8)}
.cx-chat-mode{flex:1;font:700 9px/1 var(--cx-font);padding:6px 4px;border:1px solid var(--cx-line);background:transparent;color:var(--cx-muted);cursor:pointer;letter-spacing:.06em}
.cx-chat-mode.on{color:var(--cx-cyan);border-color:var(--cx-cyan);background:rgba(62,231,255,.08)}
.cx-chat-selectors{display:flex;gap:6px;padding:8px 18px;border-bottom:1px solid rgba(22,56,77,.55);background:rgba(5,15,25,.7);position:relative;z-index:3;flex-wrap:wrap}
.cx-chat-selectors.bottom{border-top:1px solid rgba(22,56,77,.55);border-bottom:0;padding:7px 10px;background:rgba(4,12,21,.88);flex:none}
.cx-chat.full .cx-chat-selectors.bottom{width:100%;max-width:900px;margin:0 auto}
.cx-sel{position:relative;flex:1;min-width:125px}
.cx-sel-btn{width:100%;display:grid;grid-template-columns:34px minmax(0,1fr) 10px;align-items:center;gap:5px;padding:7px 8px;border:1px solid var(--cx-line);background:rgba(7,20,32,.8);color:var(--cx-text);font:9px/1.3 var(--cx-font);cursor:pointer;text-align:left}
.cx-sel-btn:hover,.cx-sel-btn.on{border-color:var(--cx-cyan);box-shadow:0 0 14px rgba(62,231,255,.1)}
.cx-sel-btn .k{font-size:8px;color:var(--cx-cyan);letter-spacing:.08em;overflow:hidden;text-overflow:ellipsis}
.cx-sel-btn .v{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#e9fbff;font-size:9.5px}
.cx-sel-btn .a{color:var(--cx-muted);font-size:9px}
.cx-sel-menu{position:absolute;left:0;right:0;top:100%;z-index:500;margin-top:4px;max-height:260px;overflow:auto;border:1px solid var(--cx-cyan);background:#071522;box-shadow:0 12px 36px rgba(0,0,0,.55)}
.cx-sel-item{display:block;width:100%;text-align:left;border:0;border-bottom:1px solid rgba(22,56,77,.5);background:transparent;color:var(--cx-text);padding:7px 9px;cursor:pointer;font:9.5px/1.4 var(--cx-font)}
.cx-sel-item:hover{background:rgba(62,231,255,.1)}
.cx-sel-item.on{background:rgba(62,231,255,.12);color:var(--cx-cyan)}
.cx-sel-item .s{font-size:8.5px;color:var(--cx-muted);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cx-chat-ctx{padding:5px 10px;border-bottom:1px solid rgba(22,56,77,.6);font-size:8.5px;color:var(--cx-muted);letter-spacing:.04em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;background:rgba(4,14,24,.7)}
.cx-chat-b{flex:1;min-height:0;overflow:auto;padding:10px;display:flex;flex-direction:column;gap:7px}
.cx-msg{max-width:92%;padding:7px 9px;font-size:10.5px;line-height:1.65;border:1px solid var(--cx-line);background:rgba(9,27,42,.8);color:#c7edf8;white-space:pre-wrap}
.cx-msg.ai{border-left:2px solid var(--cx-cyan);align-self:flex-start}
.cx-msg.user{align-self:flex-end;border-color:rgba(66,245,167,.4);background:rgba(8,35,31,.75);color:#c9ffe9}
.cx-msg.sys{align-self:center;font-size:9px;color:var(--cx-muted);border-color:transparent;background:transparent;padding:2px}
.cx-chat-q{display:flex;gap:5px;flex-wrap:wrap;padding:7px 9px;border-top:1px solid rgba(22,56,77,.6)}
.cx-chat-q button{font-size:9px}
.cx-chat-i{display:flex;gap:5px;padding:8px;border-top:1px solid var(--cx-line);background:rgba(4,12,20,.9)}
.cx-chat-i input{flex:1;min-width:0}
.cx-chat-i button{flex:none}
.cx-chat-typing{font-size:9px;color:var(--cx-orange);padding:2px 10px 6px}
.cx-official{border-top:1px solid var(--cx-line);padding:9px 10px;background:rgba(4,14,24,.75)}
.cx-official .oh{font-size:9px;letter-spacing:.12em;color:var(--cx-cyan);margin-bottom:6px}
.cx-official label{display:flex;align-items:center;gap:6px;font-size:10px;color:var(--cx-muted);padding:3px 0;cursor:pointer}
.cx-official input{accent-color:var(--cx-cyan)}
.cx-avatar-list{display:flex;flex-direction:column;gap:5px;max-height:240px;overflow:auto;margin-bottom:10px}
.cx-avatar{display:flex;align-items:center;gap:8px;padding:7px 8px;border:1px solid var(--cx-line);background:rgba(7,19,31,.65);cursor:pointer}
.cx-avatar.on{border-color:var(--cx-cyan);box-shadow:inset 0 0 14px rgba(62,231,255,.08)}
.cx-avatar .an{flex:1;min-width:0;font-size:11px;font-weight:700;color:#e9fbff}
.cx-avatar .ad{font-size:9px;color:var(--cx-muted);margin-top:2px}
.cx-init{position:fixed;inset:0;z-index:600;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:26px 16px;overflow:hidden;background:radial-gradient(900px 520px at 50% 16%,rgba(62,231,255,.20),transparent 62%),radial-gradient(700px 420px at 82% 92%,rgba(66,245,167,.14),transparent 62%),linear-gradient(180deg,#03070d,#04101a 58%,#02060b)}
.cx-init-grid{position:absolute;left:-20%;right:-20%;top:-10%;bottom:-25%;background-image:linear-gradient(rgba(62,231,255,.28) 1px,transparent 1px),linear-gradient(90deg,rgba(62,231,255,.28) 1px,transparent 1px);background-size:48px 48px;transform:perspective(600px) rotateX(58deg) scale(1.35);transform-origin:50% 100%;animation:cx-init-grid 12s linear infinite;-webkit-mask-image:radial-gradient(ellipse at 50% 78%,#000 0%,rgba(0,0,0,.55) 45%,transparent 72%);mask-image:radial-gradient(ellipse at 50% 78%,#000 0%,rgba(0,0,0,.55) 45%,transparent 72%)}
@keyframes cx-init-grid{from{background-position:0 0}to{background-position:0 44px}}
.cx-init-ring{position:absolute;width:820px;height:820px;border-radius:50%;background:conic-gradient(from 0deg,rgba(62,231,255,0),rgba(62,231,255,.5),rgba(66,245,167,.35),rgba(62,231,255,0));filter:blur(42px);opacity:.8;animation:cx-init-spin 18s linear infinite}
.cx-init:before{content:"";position:absolute;left:0;right:0;top:72%;height:1px;background:linear-gradient(90deg,transparent,rgba(62,231,255,.85),transparent);box-shadow:0 0 34px rgba(62,231,255,.6);opacity:.55}
.cx-init:after{content:"";position:absolute;inset:0;pointer-events:none;background:repeating-linear-gradient(0deg,rgba(255,255,255,.035) 0 1px,transparent 1px 3px);mix-blend-mode:overlay}
@keyframes cx-init-spin{to{transform:rotate(360deg)}}
.cx-init-scan{position:absolute;left:0;right:0;height:160px;background:linear-gradient(180deg,transparent,rgba(62,231,255,.09),transparent);animation:cx-init-scan 6.5s ease-in-out infinite}
@keyframes cx-init-scan{0%{top:-25%}50%{top:85%}100%{top:-25%}}
.cx-init-world{margin:0 auto;flex:none;animation:cxWorldIn .9s ease both}
.cx-init .cx-init-card{max-height:calc(100vh - 300px);flex:none}
@media(max-height:880px){.cx-init-world .cx-world-name{font-size:clamp(20px,3.2vw,34px)}.cx-init .cx-init-card{max-height:calc(100vh - 240px)}}
.cx-init-card{position:relative;width:min(620px,calc(100vw - 40px));max-height:calc(100vh - 60px);overflow:auto;padding:22px 24px 18px;border:1px solid rgba(62,231,255,.55);background:linear-gradient(180deg,rgba(6,20,32,.93),rgba(3,10,18,.97));box-shadow:inset 0 0 0 1px rgba(62,231,255,.12),0 0 60px rgba(62,231,255,.25),0 30px 80px rgba(0,0,0,.6);clip-path:polygon(0 14px,14px 0,calc(100% - 14px) 0,100% 14px,100% calc(100% - 14px),calc(100% - 14px) 100%,14px 100%,0 calc(100% - 14px))}
.cx-init-card:before{content:"";position:absolute;left:0;right:0;top:0;height:1px;background:linear-gradient(90deg,transparent,var(--cx-cyan),transparent);animation:cx-init-sweep 3.2s linear infinite}
@keyframes cx-init-sweep{0%{opacity:.15;transform:translateX(-45%)}50%{opacity:1}100%{opacity:.15;transform:translateX(45%)}}
.cx-init-head{display:flex;gap:12px;align-items:center;margin-bottom:12px}
.cx-init-badge{width:40px;height:40px;flex:none;display:grid;place-items:center;border:1px solid var(--cx-cyan);color:var(--cx-cyan);font:800 10px var(--cx-mono);letter-spacing:.08em;box-shadow:0 0 18px rgba(62,231,255,.45),inset 0 0 14px rgba(62,231,255,.2);animation:cx-init-pulse 2.4s ease-in-out infinite}
@keyframes cx-init-pulse{0%,100%{box-shadow:0 0 14px rgba(62,231,255,.35),inset 0 0 12px rgba(62,231,255,.15)}50%{box-shadow:0 0 28px rgba(62,231,255,.75),inset 0 0 18px rgba(62,231,255,.3)}}
.cx-init-card h2{margin:0;font-size:15px;letter-spacing:.2em;color:#eaffff;text-shadow:0 0 12px rgba(62,231,255,.65)}
.cx-init-card .desc{font-size:10px;color:#8fb8c9;margin-top:4px;line-height:1.5}
.cx-init-progress{display:flex;align-items:center;gap:8px;margin:10px 0 4px;font:9px var(--cx-mono);color:#8fb8c9}
.cx-init-progress .track{flex:1;height:4px;background:rgba(62,231,255,.12);border-radius:2px;overflow:hidden}
.cx-init-progress .bar{height:100%;background:linear-gradient(90deg,var(--cx-cyan),var(--cx-green));box-shadow:0 0 10px rgba(62,231,255,.7);transition:width .4s ease}
.cx-init-step{display:flex;gap:10px;align-items:flex-start;padding:9px 2px;border-bottom:1px dashed rgba(22,56,77,.55);font-size:11px;color:#8fb8c9;font-family:var(--cx-mono)}
.cx-init-step .idx{color:rgba(62,231,255,.5);margin-right:6px;font-size:9px}
.cx-init-step .st{width:16px;flex:none;text-align:center}
.cx-init-step.done{color:var(--cx-green);text-shadow:0 0 8px rgba(66,245,167,.35)}
.cx-init-step.run{color:var(--cx-orange);text-shadow:0 0 8px rgba(255,180,84,.4)}
.cx-init-step.run .st{animation:cx-init-blink 1s steps(2) infinite}
@keyframes cx-init-blink{50%{opacity:.25}}
.cx-init-step.err{color:var(--cx-red)}
.cx-init-step .sd{font-size:9px;color:#7fa6b8;margin-top:2px;white-space:pre-wrap}
.cx-init .cx-form label{color:#8fb8c9}
.cx-init .cx-err{color:#ff8fa3}
.cx-init .cx-btn{background:rgba(8,26,40,.92);border:1px solid rgba(62,231,255,.35);color:#cfeff9}
.cx-init .cx-btn:hover{border-color:var(--cx-cyan);color:#eaffff;box-shadow:0 0 14px rgba(62,231,255,.3)}
.cx-init .cx-btn.pri{background:linear-gradient(90deg,rgba(10,108,134,.95),rgba(10,143,106,.95));border-color:var(--cx-cyan);color:#eaffff;box-shadow:0 0 18px rgba(62,231,255,.35)}
.cx-init .cx-btn.pri:hover{box-shadow:0 0 26px rgba(62,231,255,.6)}
.cx-init .cx-form .cx-input{background:rgba(4,16,26,.9);border-color:rgba(62,231,255,.28);color:#e6fbff}
.cx-init .cx-form .cx-input:focus{border-color:var(--cx-cyan);box-shadow:0 0 0 2px rgba(62,231,255,.15)}
.cx-init .cx-foot{display:flex;justify-content:flex-end;gap:8px;margin-top:14px}
.cx-menu-wrap{position:relative;display:inline-flex;flex:none}
.cx-menu{position:absolute;right:0;top:100%;z-index:400;min-width:145px;padding:4px;background:#081826;border:1px solid var(--cx-line2);box-shadow:0 8px 24px rgba(0,0,0,.45)}
.cx-menu-item{display:block;width:100%;text-align:left;border:0;background:transparent;color:var(--cx-text);font:10px/1.5 var(--cx-font);padding:5px 8px;cursor:pointer;white-space:nowrap}
.cx-menu-item:hover{background:rgba(62,231,255,.12);color:var(--cx-cyan)}
.cx-devices{display:flex;flex-direction:column;gap:6px}
.cx-adapter{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:6px}
.cx-device{display:flex;align-items:center;gap:8px;padding:7px 8px;border:1px solid var(--cx-line);background:rgba(7,19,31,.65)}
.cx-device .dn{flex:1;min-width:0;font-size:11px;font-weight:700;color:#e9fbff;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cx-device .dd{font-size:9px;color:var(--cx-muted);margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cx-store{display:flex;align-items:center;gap:8px;padding:7px 8px;border-bottom:1px solid rgba(22,56,77,.55);cursor:pointer}
.cx-store:hover{background:rgba(11,35,53,.55)}
.cx-store .si{width:24px;height:24px;border:1px solid var(--cx-line2);display:grid;place-items:center;font-size:10px;color:var(--cx-cyan);flex:none}
.cx-store .sn{font-size:11px;font-weight:700;color:#e9fbff;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cx-store .ss{font-size:9px;color:var(--cx-muted);margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cx-web{height:100%;min-height:320px;display:flex;flex-direction:column}
.cx-webtabs{display:flex;align-items:stretch;gap:3px;flex-wrap:nowrap;overflow:visible;border-bottom:1px solid var(--cx-line);flex:none;padding:4px 4px 0;min-height:34px}
.cx-webtab{position:relative;display:inline-flex;align-items:center;gap:4px;flex:0 1 auto;height:28px;min-width:84px;max-width:220px;padding:0 8px;border:1px solid var(--cx-line);border-radius:5px 5px 0 0;background:rgba(7,19,31,.85);color:var(--cx-muted);font-size:10px;cursor:pointer;white-space:nowrap;box-sizing:border-box}
.cx-webtab>span:first-child{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis}
.cx-webtab .cx-menu-wrap{position:relative;margin-left:auto;flex:none}
.cx-webtab .cx-menu-wrap button{width:20px;height:20px;padding:0;font-size:12px;display:grid;place-items:center}
.cx-webtab .cx-menu{top:100%;right:0;left:auto;z-index:900}
.cx-webtab .x{width:18px;height:18px;display:grid;place-items:center}
.cx-webtab.on{color:var(--cx-cyan);border-color:var(--cx-cyan);background:rgba(10,32,48,.95)}
.cx-webtab .x{border:0;background:transparent;color:var(--cx-muted);cursor:pointer;padding:0 2px;font-size:11px}
.cx-webtab .x:hover{color:var(--cx-red)}
.cx-webframe{flex:1;min-height:0;position:relative;background:#02060c}
.cx-webframe iframe{position:absolute;inset:0;width:100%;height:100%;border:0;background:transparent;opacity:0;pointer-events:none;transition:opacity .12s ease}
.cx-webframe iframe.on{opacity:1;pointer-events:auto}
.cx-webmask{position:absolute;inset:0;z-index:3;display:flex;align-items:center;justify-content:center;background:var(--cx-surface-1);color:var(--cx-text-faint);font:11px/1 var(--cx-font);letter-spacing:.14em}
.cx-webframe .cx-empty{position:absolute;inset:0;display:flex;align-items:center;justify-content:center}
.cx-chat.full{background:radial-gradient(1200px 600px at 20% -10%,rgba(62,231,255,.16),transparent 60%),radial-gradient(900px 500px at 90% 0%,rgba(66,245,167,.08),transparent 55%),#040a12}
.cx-chat.full:before{content:"";position:absolute;inset:0;pointer-events:none;background-image:linear-gradient(rgba(62,231,255,.045) 1px,transparent 1px),linear-gradient(90deg,rgba(62,231,255,.045) 1px,transparent 1px);background-size:48px 48px;mask-image:linear-gradient(180deg,rgba(0,0,0,.9),transparent 70%)}
.cx-chat-h{position:relative;z-index:2;padding:12px 18px;background:rgba(5,14,24,.72);backdrop-filter:blur(12px)}
.cx-chat-hin{display:flex;align-items:center;justify-content:space-between;gap:12px;width:100%;max-width:1080px;margin:0 auto;min-width:0}
.cx-chat-copy{min-width:0;flex:1}
.cx-chat-brand{display:flex;align-items:center;gap:10px;flex:1;min-width:0}
.cx-chat-title{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cx-chat-sub{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cx-chat-orb{width:26px;height:26px;border-radius:50%;background:conic-gradient(from 0deg,var(--cx-cyan),var(--cx-green),var(--cx-cyan));box-shadow:0 0 18px rgba(62,231,255,.5);position:relative;flex:none}
.cx-chat-orb:after{content:"";position:absolute;inset:5px;border-radius:50%;background:#06121e}
.cx-chat-title{font-size:12px;font-weight:800;letter-spacing:.16em;color:#eaffff}
.cx-chat-sub{font-size:9px;color:var(--cx-muted);margin-top:2px;letter-spacing:.08em}
.cx-chat-actions{display:flex;gap:6px;align-items:center}
.cx-city3d{position:absolute;inset:0;z-index:0;overflow:hidden;pointer-events:none;background:radial-gradient(circle at 50% 30%,#03111d,#01050a 70%)}
.cx-city-labels{position:absolute;left:18px;bottom:18px;display:flex;gap:6px;flex-wrap:wrap;z-index:2;pointer-events:none}
.cx-city-labels span{font-size:8px;letter-spacing:.12em;color:rgba(143,232,255,.72);border:1px solid rgba(62,231,255,.25);background:rgba(3,14,24,.55);padding:3px 6px;border-radius:3px}
.cx-city3d canvas{position:absolute;inset:0;width:100%!important;height:100%!important;display:block;opacity:.92}
.cx-tech-bg{position:absolute;inset:0;z-index:0;pointer-events:none;overflow:hidden;opacity:.62}
.cx-tech-bg svg{width:100%;height:100%}
.cx-chat-body{position:relative;z-index:1}
.cx-world{max-width:900px;margin:14px auto 0;text-align:center;position:relative;z-index:1;pointer-events:none;animation:cxWorldIn .9s ease both}
.cx-world:before{content:"";position:absolute;left:50%;top:-30px;width:min(940px,94vw);height:280px;transform:translateX(-50%);background:radial-gradient(ellipse at center,rgba(62,231,255,.20),rgba(66,245,167,.08) 45%,transparent 72%);z-index:-1;pointer-events:none}
.cx-world.gone{display:none}
.cx-world-kicker{font:9px var(--cx-mono);letter-spacing:.55em;color:var(--cx-cyan);opacity:.75}
.cx-world-name{margin:6px 0 8px;font-size:clamp(26px,4.6vw,52px);font-weight:800;letter-spacing:.1em;line-height:1.1;background:linear-gradient(90deg,#8ff5ff,#3ee7ff 32%,#42f5a7 68%,#b7ffe6);-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 0 22px rgba(62,231,255,.45));animation:cxWorldGlow 4.5s ease-in-out infinite}
@keyframes cxWorldGlow{0%,100%{filter:drop-shadow(0 0 16px rgba(62,231,255,.32))}50%{filter:drop-shadow(0 0 34px rgba(62,231,255,.7))}}
@keyframes cxWorldIn{from{opacity:0;transform:translateY(-12px)}to{opacity:1;transform:none}}
.cx-world-sub{font-size:11px;letter-spacing:.34em;color:var(--cx-text-dim)}
.cx-world-line{width:min(540px,82%);height:1px;margin:14px auto 0;background:linear-gradient(90deg,transparent,var(--cx-cyan),transparent);box-shadow:0 0 20px rgba(62,231,255,.65)}
.cx-shell[data-theme="light"] .cx-world-name{background:linear-gradient(90deg,#0a6d8f,#0b7f9f 32%,#0a7a4a 68%,#0a5f7d);-webkit-background-clip:text;background-clip:text;filter:drop-shadow(0 0 12px rgba(10,109,143,.25))}
.cx-shell[data-theme="light"] .cx-world-sub{color:#3d6678}
.cx-shell[data-theme="light"] .cx-world-line{background:linear-gradient(90deg,transparent,#0b7f9f,transparent);box-shadow:0 0 14px rgba(11,127,159,.35)}
.cx-hero{display:flex;align-items:center;justify-content:center;gap:22px;text-align:left;padding:26px 12px 18px;max-width:900px;margin:0 auto;position:relative;z-index:1}
.cx-portrait-stage{position:relative;width:100%;perspective:900px;transform-style:preserve-3d}
.cx-portrait-depth{position:absolute;inset:4% 3% 2%;transform:translateZ(-26px) scale(1.06);filter:blur(12px);opacity:.55;border-radius:48% 48% 42% 42% / 32% 32% 18% 18%;overflow:hidden}
.cx-portrait-depth img{width:100%;height:100%;object-fit:cover;object-position:50% 18%;filter:saturate(1.3) brightness(.7)}
.cx-portrait-floor{position:absolute;left:8%;right:8%;bottom:-4%;height:18%;border-radius:50%;background:radial-gradient(ellipse,rgba(62,231,255,.35),transparent 70%);filter:blur(8px);transform:rotateX(70deg)}
.cx-portrait-ring{position:absolute;left:50%;bottom:-2%;width:88%;height:16%;transform:translateX(-50%) rotateX(72deg);border:1px solid rgba(62,231,255,.55);border-radius:50%;box-shadow:0 0 22px rgba(62,231,255,.35),inset 0 0 18px rgba(62,231,255,.2);animation:cxRing 5s ease-in-out infinite}
.cx-avatar3d{position:relative;width:100%;aspect-ratio:1/1.08;cursor:grab;overflow:hidden;border-radius:14px;background:radial-gradient(circle at 50% 35%,rgba(62,231,255,.1),transparent 65%)}
.cx-avatar3d:active{cursor:grabbing}
.cx-avatar3d canvas{position:absolute;inset:0;width:100%!important;height:100%!important;display:block}
.cx-avatar-ghost{position:absolute;inset:2%;overflow:hidden;border-radius:48% 48% 42% 42% / 32% 32% 18% 18%;opacity:.22;filter:blur(3px) hue-rotate(35deg) saturate(1.6);transform:translateZ(-34px) scale(1.07)}
.cx-avatar-ghost img{width:100%;height:100%;object-fit:cover;object-position:50% 18%}
.cx-avatar-ring{position:absolute;left:50%;top:50%;border:1px solid rgba(62,231,255,.35);border-radius:50%;pointer-events:none;transform:translate(-50%,-50%) rotateX(72deg)}
.cx-avatar-ring.r1{width:88%;height:88%;animation:cxRingSpin 14s linear infinite}
.cx-avatar-ring.r2{width:74%;height:74%;border-color:rgba(66,245,167,.28);animation:cxRingSpin 9s linear infinite reverse}
.cx-avatar-ring.r3{width:100%;height:100%;border-style:dashed;opacity:.35;animation:cxRingSpin 22s linear infinite}
.cx-avatar-hud{position:absolute;left:7px;right:7px;top:7px;display:flex;justify-content:space-between;font-size:7px;letter-spacing:.1em;color:rgba(173,252,255,.8);text-shadow:0 0 8px rgba(62,231,255,.6);pointer-events:none}
.cx-avatar-coords{position:absolute;left:8px;bottom:38px;font-size:7px;color:rgba(143,232,255,.65);letter-spacing:.08em;pointer-events:none}
.cx-avatar-wave{position:absolute;left:8px;bottom:10px;display:flex;gap:2px;align-items:flex-end;height:18px;pointer-events:none}
.cx-avatar-wave i{display:block;width:2px;height:4px;background:linear-gradient(180deg,#6ff7ff,#42f5a7);animation:cxWave 1.1s ease-in-out infinite alternate;border-radius:1px}
.cx-avatar-particles{position:absolute;inset:0;pointer-events:none}
.cx-avatar-particles i{position:absolute;width:2px;height:2px;border-radius:50%;background:#7ff7ff;box-shadow:0 0 7px #3ee7ff;animation:cxParticle 4s ease-in-out infinite}
.cx-avatar-pulse{position:absolute;inset:18%;border:2px solid rgba(111,247,255,.8);border-radius:50%;pointer-events:none;animation:cxPulseRing .8s ease-out forwards}
@keyframes cxRingSpin{to{transform:translate(-50%,-50%) rotateX(72deg) rotateZ(360deg)}}
@keyframes cxWave{0%{height:3px;opacity:.45}100%{height:17px;opacity:1}}
@keyframes cxParticle{0%,100%{opacity:.15;transform:translateY(0)}50%{opacity:.9;transform:translateY(-8px)}}
@keyframes cxPulseRing{0%{transform:scale(.7);opacity:.9}100%{transform:scale(1.35);opacity:0}}
.cx-avatar3d-inner{position:absolute;inset:0;transform-style:preserve-3d;transition:transform .08s linear;border-radius:48% 48% 42% 42% / 32% 32% 18% 18%;overflow:hidden;box-shadow:0 18px 40px rgba(0,0,0,.55),0 0 30px rgba(62,231,255,.18);border:1px solid rgba(62,231,255,.35)}
.cx-avatar3d-inner img{width:100%;height:100%;object-fit:cover;object-position:50% 18%;display:block;filter:saturate(1.05) contrast(1.04)}
.cx-avatar-halo{position:absolute;inset:-6% -12% 12%;border:5px solid rgba(181,255,255,.75);border-radius:50%;filter:blur(1px) drop-shadow(0 0 16px rgba(62,231,255,.6));opacity:.8;pointer-events:none}
.cx-avatar-base{position:absolute;left:10%;right:10%;bottom:-3%;height:14%;border-radius:50%;background:radial-gradient(ellipse,rgba(62,231,255,.4),transparent 70%);filter:blur(5px);pointer-events:none}
.cx-avatar-scan{position:absolute;inset:0;pointer-events:none;background:linear-gradient(180deg,transparent 0%,rgba(62,231,255,.14) 48%,transparent 55%);animation:cxScan 6s linear infinite}
.cx-tech-portrait{position:relative;width:100%;aspect-ratio:152/194;border-radius:48% 48% 42% 42% / 32% 32% 18% 18%;overflow:hidden;border:1px solid rgba(62,231,255,.35);box-shadow:0 0 34px rgba(62,231,255,.28),inset 0 0 30px rgba(0,0,0,.35);background:#04121d}
.cx-tech-portrait{transform:rotateY(-7deg) rotateX(2deg) translateZ(18px);transform-style:preserve-3d;animation:cx3dFloat 6s ease-in-out infinite;box-shadow:-12px 14px 32px rgba(0,0,0,.55),0 0 34px rgba(62,231,255,.28)}
.cx-tech-portrait img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:50% 18%;filter:saturate(1.12) contrast(1.06) brightness(1.04);-webkit-mask-image:linear-gradient(180deg,#000 78%,transparent 100%);mask-image:linear-gradient(180deg,#000 78%,transparent 100%)}
.cx-portrait-halo{position:absolute;inset:-12% -22% 8%;border:6px solid rgba(181,255,255,.8);border-radius:50%;filter:blur(1px) drop-shadow(0 0 16px rgba(62,231,255,.65));opacity:.85;pointer-events:none}
.cx-portrait-veil{position:absolute;inset:0;pointer-events:none;background:linear-gradient(115deg,rgba(3,14,24,.96) 0 6%,transparent 16%),linear-gradient(270deg,rgba(3,14,24,.95) 0 4%,transparent 14%),linear-gradient(0deg,rgba(3,12,20,.92) 0 5%,transparent 24%)}
.cx-portrait-scan{position:absolute;inset:0;pointer-events:none;background:linear-gradient(180deg,transparent 0%,rgba(62,231,255,.12) 48%,transparent 55%);animation:cxScan 6s linear infinite}
@keyframes cxScan{0%{transform:translateY(-100%)}100%{transform:translateY(100%)}}
@keyframes cx3dFloat{0%,100%{transform:rotateY(-7deg) rotateX(2deg) translateZ(18px) translateY(0)}50%{transform:rotateY(5deg) rotateX(-1deg) translateZ(24px) translateY(-7px)}}
@keyframes cxRing{0%,100%{opacity:.5;transform:translateX(-50%) rotateX(72deg) scale(.96)}50%{opacity:1;transform:translateX(-50%) rotateX(72deg) scale(1.05)}}
.cx-hero-avatar{width:clamp(120px,16vw,190px);flex:none;filter:drop-shadow(0 0 24px rgba(62,231,255,.32));animation:cxFloat 5s ease-in-out infinite}
.cx-hero-avatar svg{display:block;width:100%;height:auto}
.cx-hero-copy{min-width:0;flex:1}
.cx-hero-title{text-align:left}
.cx-hero-sub{text-align:left;max-width:600px}
.cx-empty-hint{margin-top:12px;padding:7px 10px;border:1px dashed rgba(62,231,255,.3);background:rgba(5,18,30,.55);color:#7fa8bb;font-size:9.5px;letter-spacing:.04em;border-radius:6px;display:inline-block}
.cx-anime-eyes{transform-box:fill-box;transform-origin:center;animation:cxBlink 5.5s infinite}
@keyframes cxBlink{0%,92%,100%{transform:scaleY(1)}95%{transform:scaleY(.08)}}
.cx-dash{animation:cxDash 12s linear infinite}
.cx-pulse{animation:cxPulse 3s ease-in-out infinite}
@keyframes cxDash{to{stroke-dashoffset:-120}}
@keyframes cxPulse{0%,100%{opacity:.3}50%{opacity:1}}
@keyframes cxFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}
@media(max-width:760px){.cx-hero{flex-direction:column;text-align:center;gap:8px}.cx-hero-copy{text-align:center}.cx-hero-title,.cx-hero-sub{text-align:center}.cx-hero-avatar{width:120px}.cx-tech-bg{opacity:.4}}

.cx-hero-kicker{font-size:9px;letter-spacing:.22em;color:var(--cx-cyan);margin-bottom:10px}
.cx-hero-title{font-size:clamp(22px,3.2vw,38px);line-height:1.2;font-weight:900;letter-spacing:.02em;background:linear-gradient(135deg,#eaffff,#3ee7ff 55%,#42f5a7);-webkit-background-clip:text;background-clip:text;color:transparent;text-shadow:0 0 40px rgba(62,231,255,.12)}
.cx-hero-sub{font-size:11.5px;line-height:1.8;color:#8db5c8;margin-top:10px}
.cx-msg{display:flex;gap:8px;align-items:flex-start;max-width:94%;padding:9px 11px;border-radius:14px;border:1px solid rgba(30,70,92,.75);background:linear-gradient(135deg,rgba(9,28,44,.92),rgba(6,17,28,.92));box-shadow:0 8px 26px rgba(0,0,0,.18);white-space:normal}
.cx-msg.ai{border-left:2px solid var(--cx-cyan)}
.cx-msg.user{align-self:flex-end;flex-direction:row-reverse;border-color:rgba(66,245,167,.35);background:linear-gradient(135deg,rgba(8,38,33,.9),rgba(6,20,20,.92))}
.cx-msg-avatar{width:22px;height:22px;border-radius:50%;display:grid;place-items:center;font-size:8px;font-weight:800;flex:none;color:#041018;background:linear-gradient(135deg,var(--cx-cyan),var(--cx-green))}
.cx-msg.user .cx-msg-avatar{background:linear-gradient(135deg,var(--cx-green),#9bffd0);color:#042015}
.cx-msg-body{flex:1;min-width:0;white-space:normal;line-height:1.7}
.cx-msg.sys{max-width:none;align-self:center;border:0;background:transparent;box-shadow:none;color:var(--cx-muted);font-size:9px;padding:3px}
.cx-chat.full .cx-msg{max-width:82%}
.cx-suggest{display:grid;grid-template-columns:1fr 1fr;gap:7px;max-width:1080px;width:100%;margin:8px auto 0;padding:0 10px}
.cx-suggest button{text-align:left;padding:10px 11px;border:1px solid rgba(30,70,92,.8);background:linear-gradient(135deg,rgba(10,32,49,.8),rgba(7,19,31,.8));color:#c9edf8;font:10.5px/1.5 var(--cx-font);cursor:pointer;border-radius:10px;transition:.15s}
.cx-suggest button:hover{border-color:var(--cx-cyan);color:var(--cx-cyan);transform:translateY(-1px);box-shadow:0 8px 22px rgba(62,231,255,.1)}
.cx-chat.full .cx-chat-i{background:rgba(5,15,25,.9);border:1px solid rgba(62,231,255,.28);border-radius:14px;padding:7px;margin-top:8px;box-shadow:0 0 30px rgba(62,231,255,.08)}
.cx-chat.full .cx-chat-i .cx-input{height:38px;font-size:12px;border:0;background:transparent}
.cx-chat.full .cx-chat-i .cx-btn{padding:9px 16px}
.cx-compose{width:calc(100% - 36px);max-width:1080px;margin:8px auto 18px;border:1px solid rgba(62,231,255,.28);border-radius:16px;background:rgba(5,15,25,.92);box-shadow:0 0 32px rgba(62,231,255,.08),inset 0 0 20px rgba(62,231,255,.03);flex:none;position:relative}
.cx-compose-input{display:block;width:100%;min-height:84px;box-sizing:border-box;resize:none;border:0;outline:none;background:transparent;color:#dff8ff;font:12px/1.65 var(--cx-font);padding:12px 14px 4px}
.cx-compose-input::placeholder{color:#557a8d}
.cx-compose-tools{display:flex;align-items:center;gap:5px;padding:6px 8px;min-height:44px;overflow:visible}
.cx-compose-plus{width:32px;height:32px;border-radius:50%;border:1px solid var(--cx-line2);background:rgba(8,25,40,.9);color:var(--cx-cyan);font:20px/30px var(--cx-font);cursor:pointer;flex:none;padding:0}
.cx-compose-plus:hover{border-color:var(--cx-cyan);box-shadow:0 0 12px rgba(62,231,255,.2)}
.cx-compose .cx-sel{flex:0 1 auto;width:auto;min-width:0;max-width:220px}
.cx-compose .cx-sel-btn{height:32px;box-sizing:border-box;width:auto;min-width:62px;max-width:220px;padding:0 8px;border-color:rgba(30,70,92,.7);background:rgba(7,20,32,.55);display:flex;align-items:center;justify-content:space-between;gap:7px}

.cx-compose .cx-sel-btn .v{font-size:10px;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cx-compose .cx-sel-btn .v.ph{color:var(--cx-cyan);letter-spacing:.1em;font-weight:700}
.cx-compose .cx-sel-btn .a{font-size:10px;text-align:right}
.cx-compose .cx-sel-menu{bottom:100%;top:auto;margin-top:0;margin-bottom:6px;max-height:230px;left:0;right:auto;min-width:180px}
.cx-compose-right{display:flex;align-items:center;gap:5px;margin-left:auto;min-width:0}
.cx-compose-send{width:32px;height:32px;border-radius:50%;border:0;background:linear-gradient(135deg,var(--cx-cyan),var(--cx-green));color:#041018;font:800 16px/30px var(--cx-font);cursor:pointer;flex:none;box-shadow:0 0 14px rgba(62,231,255,.25)}
.cx-compose-send:disabled{opacity:.4;box-shadow:none}
.cx-compose-files{display:flex;gap:4px;flex-wrap:wrap;padding:8px 10px 0}
.cx-tag-x{border:0;background:transparent;color:var(--cx-muted);cursor:pointer;padding:0 0 0 3px;font-size:10px}
.cx-tag-x:hover{color:var(--cx-red)}
.cx-chat.full .cx-compose{max-width:1080px;margin-top:10px}
.cx-hint{display:flex;align-items:center;gap:8px;max-width:1080px;width:100%;margin:8px auto 0;padding:0 4px;box-sizing:border-box}
.cx-hint-text{flex:1;min-width:0;font-size:10px;line-height:1.5;color:#7fa8bb;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cx-hint-more{border:0;background:transparent;color:var(--cx-cyan);font:10px/1 var(--cx-font);cursor:pointer;padding:4px 2px;flex:none}
.cx-hint-more:hover{text-decoration:underline}
.cx-hint-panel{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;max-width:1080px;width:100%;margin:6px auto 0;padding:0 4px;box-sizing:border-box}
.cx-hint-card{text-align:left;border:1px solid rgba(30,70,92,.8);background:rgba(7,20,32,.75);padding:9px 10px;cursor:pointer;color:var(--cx-text);font-family:var(--cx-font);border-radius:8px}
.cx-hint-card:hover,.cx-hint-card.on{border-color:var(--cx-cyan);background:rgba(10,35,52,.9)}
.cx-hint-card .ht{font-size:9px;letter-spacing:.1em;color:var(--cx-cyan);font-weight:700;margin-bottom:4px}
.cx-hint-card .hd{font-size:9.5px;line-height:1.6;color:#8fb3c4}
@media(max-width:760px){.cx-hint-panel{grid-template-columns:1fr}.cx-hint-text{white-space:normal}}
.cx-chat.full .cx-chat-h{width:100%;max-width:none;margin:0;padding:12px 18px}
.cx-taskmap{position:sticky;bottom:0;margin-top:12px;border:1px solid rgba(30,70,92,.7);background:rgba(4,13,22,.94);padding:6px;border-radius:6px;z-index:2}
.cx-taskmap.full{position:fixed;inset:24px;z-index:800;margin:0;padding:10px;box-shadow:0 24px 80px rgba(0,0,0,.5)}
.cx-taskmap.full .cx-taskmap-leaflet{height:calc(100vh - 120px)}
.cx-taskmap-actions{display:flex;gap:3px;margin-left:auto}
.cx-taskmap-actions button{border:1px solid var(--cx-border);background:var(--cx-surface-2);color:var(--cx-text);font:12px/1 var(--cx-font);width:22px;height:22px;padding:0;cursor:pointer;border-radius:3px}
.cx-taskmap-actions button:hover{color:var(--cx-accent);border-color:var(--cx-accent)}
.cx-taskmap-loading{position:absolute;inset:0;display:grid;place-items:center;background:var(--cx-surface-2);color:var(--cx-text-dim);font-size:10px;z-index:500;pointer-events:none}
.cx-taskmap-leaflet{position:relative}
.cx-taskmap-h{display:flex;justify-content:space-between;font-size:9px;color:var(--cx-cyan);letter-spacing:.08em;padding:2px 2px 5px}
.cx-taskmap-leaflet{display:block;width:100%;height:180px;border:1px solid rgba(62,231,255,.2);border-radius:3px;overflow:hidden;background:#04121d}
.cx-taskmap-leaflet .leaflet-container{width:100%;height:100%;background:#04121d;font-family:var(--cx-font)}
.cx-taskmap-leaflet .leaflet-tile{filter:invert(1) hue-rotate(180deg) brightness(.72) contrast(1.18) saturate(.65)}
.cx-taskmap-leaflet .leaflet-control-attribution{font-size:6px!important;background:rgba(2,8,14,.55)!important;color:#6f97a9!important}
.cx-taskmap-leaflet .leaflet-control-attribution a{color:#6f97a9!important}
.cx-mapsec{position:sticky;bottom:0;z-index:2;margin-top:auto;background:var(--cx-surface-2);border:1px solid var(--cx-border);border-radius:6px;padding:0 2px 2px}
.cx-mapsec .cx-taskmap{position:relative;bottom:auto;margin-top:0;border:0;background:transparent;padding:6px}
.cx-mapsec.folded{margin-top:auto;background:var(--cx-surface-1);border-color:var(--cx-border);padding:0 2px;box-shadow:0 -6px 18px rgba(0,0,0,.25)}
.cx-mapsec.folded .cx-pm-h{padding:6px 4px}
.cx-mapsec .cx-taskmap-h>span:first-child{display:none}
.cx-ico{display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;border-radius:6px;flex:none;background:rgba(255,255,255,.05)}
.cx-ico svg{width:15px;height:15px}
.cx-ico-target{color:#ffb454;background:rgba(255,180,84,.14)}
.cx-ico-plan{color:#7be0ff;background:rgba(123,224,255,.14)}
.cx-ico-task{color:#b49cff;background:rgba(180,156,255,.14)}
.cx-ico-report{color:#ff9f6e;background:rgba(255,159,110,.14)}
.cx-ico-feedback{color:#6ef7b0;background:rgba(110,247,176,.14)}
.cx-ico-clock{color:#7be0ff;background:rgba(123,224,255,.14)}
.cx-ico-map{color:#42f5a7;background:rgba(66,245,167,.14)}
.cx-shell[data-theme="light"] .cx-ico-target{color:#8a5200;background:#fbe7c6}
.cx-shell[data-theme="light"] .cx-ico-plan{color:#0a5f7d;background:#d8f0fa}
.cx-shell[data-theme="light"] .cx-ico-task{color:#4f3596;background:#e6dcfb}
.cx-shell[data-theme="light"] .cx-ico-report{color:#94400e;background:#fbdfd0}
.cx-shell[data-theme="light"] .cx-ico-feedback{color:#086b40;background:#d5f5e4}
.cx-shell[data-theme="light"] .cx-ico-clock{color:#0a5f7d;background:#d8f0fa}
.cx-shell[data-theme="light"] .cx-ico-map{color:#086b40;background:#d5f5e4}

.cx-shell[data-theme="light"] .cx-mapsec{background:#fff;border-color:#c9dde8}

.cx-map-popup .leaflet-popup-content-wrapper{background:#071522;color:#dff8ff;border:1px solid #3ee7ff;border-radius:3px;font-size:10px}
.cx-map-popup .leaflet-popup-tip{background:#071522}
.cx-map-label{font-size:5px;fill:rgba(98,180,205,.7);letter-spacing:.14em}
.cx-map-dot{fill:#6b8a9c;stroke:#04121d;stroke-width:1;cursor:pointer}
.cx-map-dot.process{fill:#ffd166}.cx-map-dot.finished{fill:#42f5a7}.cx-map-dot.canceled{fill:#ff5c7a}.cx-map-dot.on{stroke:#fff;stroke-width:1.5;filter:drop-shadow(0 0 5px #3ee7ff)}
.cx-taskmap-legend{display:flex;gap:8px;padding:5px 2px 1px;font-size:7px;color:var(--cx-muted)}
.cx-taskmap-legend .lc:before{content:"";display:inline-block;width:5px;height:5px;border-radius:50%;margin-right:3px;background:#6b8a9c}
.cx-taskmap-legend .lc.process:before{background:#ffd166}.cx-taskmap-legend .lc.finished:before{background:#42f5a7}
.cx-cal{border:1px solid rgba(30,70,92,.65);background:rgba(5,15,25,.75);padding:7px;margin-bottom:8px}
.cx-cal-h{display:flex;align-items:center;justify-content:space-between;font-size:10px;color:var(--cx-cyan);padding:2px 2px 5px}
.cx-cal-h button{border:0;background:transparent;color:var(--cx-muted);font:12px var(--cx-font);cursor:pointer;padding:0 4px}
.cx-cal-w,.cx-cal-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:2px}
.cx-cal-w span{text-align:center;font-size:8px;color:var(--cx-muted);padding:2px 0}
.cx-cal-grid>span{height:28px}
.cx-cal-day{position:relative;height:30px;border:1px solid transparent;background:transparent;color:#a9cad8;font:9px var(--cx-font);cursor:pointer;border-radius:3px;padding:0}
.cx-cal-day:hover{border-color:rgba(62,231,255,.35)}
.cx-cal-day.on{background:rgba(62,231,255,.18);border-color:var(--cx-cyan);color:#eaffff}
.cx-cal-day .n{position:absolute;top:1px;left:0;right:0;font-size:7px;color:var(--cx-green)}
.cx-cal-day .d{position:absolute;bottom:3px;left:0;right:0}
.cx-cal-f{display:flex;justify-content:space-between;align-items:center;font-size:8px;color:var(--cx-muted);padding-top:5px}
.cx-cal-f button{border:0;background:transparent;color:var(--cx-cyan);font:8px var(--cx-font);cursor:pointer}
.cx-chat-body{display:flex;flex:1;min-height:0;width:100%;overflow:hidden}
.cx-chat-center{display:flex;flex-direction:column;flex:1;min-width:0;min-height:0}
.cx-chat-center{position:relative}
.cx-webstatus{display:flex;align-items:center;gap:8px;margin:0 12px 6px;padding:6px 10px;border:1px solid var(--cx-border);border-radius:6px;background:var(--cx-surface-2);color:var(--cx-text-dim);font:10px var(--cx-mono);cursor:pointer;flex:none}
.cx-webstatus:hover{border-color:var(--cx-accent);color:var(--cx-accent)}
.cx-webstatus .dot{width:6px;height:6px;border-radius:50%;background:var(--cx-green);flex:none}
.cx-webstatus .dot.busy{background:var(--cx-orange);animation:cx-blink 1s steps(2) infinite}
.cx-webstatus .arr{margin-left:auto;opacity:.7}.cx-webstatus-body{display:flex;flex-direction:column;gap:2px;min-width:0;flex:1}
.cx-webstatus .meta{display:flex;gap:10px;color:var(--cx-text-dim);font-size:9px;flex-wrap:wrap}
.cx-webstatus .sum{font-size:10px;color:var(--cx-text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:100%}
.cx-webpop{position:absolute;right:14px;bottom:132px;width:min(580px,88%);max-height:46%;display:flex;flex-direction:column;border:1px solid var(--cx-border-strong);border-radius:8px;background:var(--cx-surface-1);box-shadow:0 18px 50px rgba(0,0,0,.45);z-index:40;overflow:hidden}
.cx-webpop .h{display:flex;justify-content:space-between;align-items:center;padding:8px 10px;border-bottom:1px solid var(--cx-border);font:10px var(--cx-mono);letter-spacing:.08em;color:var(--cx-accent);flex:none}
.cx-webpop .h button{border:0;background:transparent;color:var(--cx-text-dim);cursor:pointer;font-size:12px}
.cx-webpop .b{padding:10px 12px;overflow:auto;font-size:12px;line-height:1.7;color:var(--cx-text)}
.cx-chat-tabs{display:flex;align-items:center;gap:4px;padding:6px 18px;border-bottom:1px solid var(--cx-border);background:var(--cx-surface-2);overflow-x:auto;flex:none}
.cx-chat-tab{display:inline-flex;align-items:center;gap:6px;padding:4px 10px;border:1px solid transparent;border-radius:4px;background:transparent;color:var(--cx-text-dim);font:10px var(--cx-mono);cursor:pointer;white-space:nowrap}
.cx-chat-tab.on{color:var(--cx-accent);border-color:var(--cx-border-strong);background:var(--cx-accent-soft)}
.cx-chat-tab .nm{max-width:160px;overflow:hidden;text-overflow:ellipsis}
.cx-chat-tab .x{border:0;background:transparent;color:inherit;cursor:pointer;font-size:10px;margin-left:2px;padding:0}
.cx-addrbar{display:flex;align-items:center;gap:6px;padding:6px 18px;border-bottom:1px solid var(--cx-border);background:var(--cx-surface-1);flex:none}
.cx-addrbar .nav{width:24px;height:24px;border:1px solid var(--cx-border);border-radius:5px;background:var(--cx-surface-2);color:var(--cx-text-dim);cursor:pointer;font-size:12px;line-height:1;padding:0}
.cx-addrbar .nav:hover:not(:disabled){color:var(--cx-accent);border-color:var(--cx-accent)}
.cx-addrbar .nav:disabled{opacity:.35;cursor:default}
.cx-addr-input{flex:1;min-width:0;height:26px;padding:0 10px;border:1px solid var(--cx-border);border-radius:6px;background:var(--cx-surface-2);color:var(--cx-text);font:11px var(--cx-mono)}
.cx-addr-input:focus{outline:none;border-color:var(--cx-accent)}
.cx-chat.webmax .cx-chat-h,.cx-chat.webmax .cx-chat-tabs,.cx-chat.webmax .cx-hint,.cx-chat.webmax .cx-compose,.cx-chat.webmax .cx-pm-side{display:none}

.cx-chat-webframes{flex:1;min-height:0;position:relative;display:flex}
.cx-chat-webframes iframe{flex:1;width:100%;height:100%;border:0;background:var(--cx-surface-1)}

.cx-pm-side{width:280px;flex:none;overflow:auto;border-right:1px solid rgba(30,70,92,.65);background:rgba(4,13,22,.86);padding:9px;display:flex;flex-direction:column}
.cx-pm-side>*{flex:none}
.cx-pm-side.right{border-right:0;border-left:1px solid rgba(30,70,92,.65);width:300px}
.cx-pm-titleline{display:flex;align-items:center;gap:5px;min-width:0;flex:1;flex-wrap:wrap}
.cx-pm-count{display:inline-grid;place-items:center;min-width:18px;height:16px;padding:0 4px;border:1px solid rgba(62,231,255,.3);border-radius:8px;color:var(--cx-cyan);font-size:8px;background:rgba(62,231,255,.08)}
.cx-filter{position:relative;flex:none}
.cx-filter-btn{height:26px;border:1px solid var(--cx-border);background:var(--cx-surface-2);color:var(--cx-text-dim);font:10px/1 var(--cx-font);padding:0 7px;cursor:pointer;border-radius:4px;display:inline-flex;align-items:center;gap:4px}
.cx-filter-btn.on{color:var(--cx-cyan);border-color:var(--cx-cyan)}
.cx-filter-menu{position:absolute;left:0;right:auto;top:100%;z-index:450;margin-top:4px;min-width:190px;white-space:nowrap;padding:4px;border:1px solid var(--cx-cyan);background:#071522;box-shadow:0 10px 26px rgba(0,0,0,.5)}
.cx-filter-item{display:flex;gap:5px;align-items:center;width:100%;border:0;background:transparent;color:var(--cx-text);font:10px/1.6 var(--cx-font);padding:4px 6px;cursor:pointer;text-align:left;white-space:nowrap}
.cx-filter-menu.right{left:auto;right:0}
.cx-filter-item:hover,.cx-filter-item.on{background:rgba(62,231,255,.1);color:var(--cx-cyan)}
.cx-filter-clear{width:100%;border:0;border-top:1px solid rgba(30,70,92,.6);background:transparent;color:var(--cx-muted);font:8px var(--cx-font);padding:5px;cursor:pointer}
.cx-filter-clear:hover{color:var(--cx-red)}
.cx-filter.inline{display:flex;align-items:center;gap:4px;flex-wrap:wrap}
.cx-filter-label{font-size:8px;letter-spacing:.08em;color:var(--cx-text-faint);flex:none}
.cx-filter-chip{font:9px/1 var(--cx-font);padding:4px 8px;border:1px solid var(--cx-border);border-radius:999px;background:transparent;color:var(--cx-text-dim);cursor:pointer;white-space:nowrap}
.cx-filter-chip:hover{border-color:var(--cx-accent);color:var(--cx-accent)}
.cx-filter-chip.on{background:color-mix(in srgb,var(--cx-accent) 14%,transparent);border-color:var(--cx-accent);color:var(--cx-accent)}

.cx-pm-h{display:flex;align-items:center;justify-content:space-between;gap:4px;padding:6px 8px;min-height:28px;font-size:11px;flex-wrap:wrap;letter-spacing:.12em;color:var(--cx-cyan);text-transform:uppercase;background:linear-gradient(90deg,color-mix(in srgb,var(--cx-cyan) 13%,transparent),color-mix(in srgb,var(--cx-cyan) 4%,transparent) 72%,transparent);border-left:2px solid color-mix(in srgb,var(--cx-cyan) 55%,transparent);border-radius:5px}
.cx-pm-h{border-radius:4px;cursor:pointer;transition:background .12s ease}
.cx-pm-h:hover{background:color-mix(in srgb,var(--cx-accent) 20%,transparent)}
.cx-shell[data-theme="light"] .cx-pm-h{background:linear-gradient(90deg,#e2f3fa,#f2fafd 70%,transparent);border-left-color:#7cc7de}
.cx-shell[data-theme="light"] .cx-pm-h:hover{background:#cfeaf5}
.cx-pm-ops{display:flex;align-items:center;gap:2px;margin-left:auto;flex:none}
.cx-pm-tools{display:flex;align-items:center;gap:4px;padding:0 3px 6px;flex-wrap:wrap}

.cx-pm-op{display:inline-grid;place-items:center;width:22px;height:22px;padding:0;border:1px solid transparent;background:transparent;color:var(--cx-cyan);font:16px/1 var(--cx-font);cursor:pointer;border-radius:3px}
.cx-pm-op:hover{color:var(--cx-cyan);border-color:rgba(62,231,255,.35);background:rgba(62,231,255,.08)}
.cx-pm-refresh:hover{color:var(--cx-cyan);border-color:rgba(62,231,255,.35);background:rgba(62,231,255,.08)}
.cx-pm-op.danger:hover{color:var(--cx-red);border-color:rgba(255,92,122,.4);background:rgba(255,92,122,.08)}
.cx-pm-refresh{display:inline-grid;place-items:center;width:22px;height:22px;padding:0;border:1px solid transparent;background:transparent;color:var(--cx-muted);font:16px/1 var(--cx-font);cursor:pointer;border-radius:3px}
.cx-pm-count{color:var(--cx-muted);font-size:8px}
.cx-pm-item{display:flex;flex-direction:column;align-items:flex-start;gap:2px;width:100%;text-align:left;border:1px solid transparent;border-left:2px solid transparent;background:transparent;color:#b9dbe8;padding:6px 6px;cursor:pointer;border-radius:5px}
.cx-pm-item:hover{background:rgba(62,231,255,.06)}
.cx-pm-item.on{background:rgba(62,231,255,.1);border-left-color:var(--cx-cyan);color:#eaffff}
.cx-pm-item .t{font-size:9.5px;line-height:1.35;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:100%}
.cx-pm-item .s{font-size:8px;color:var(--cx-muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:100%}
.cx-pm-topright{display:flex;align-items:center;gap:4px;flex:none}
.cx-pm-type{padding:2px 5px;border:1px solid currentColor;border-radius:3px;font-size:8px;font-weight:800;letter-spacing:.08em;line-height:1.3}
.cx-pm-type.type-target{color:#ffd166}
.cx-pm-type.type-plan{color:#7be0ff}
.cx-pm-type.type-task{color:#b49cff}
.cx-pm-type.type-report{color:#ff9f6e}
.cx-pm-type.type-feedback{color:#6ef7b0}
.cx-pm-status{padding:2px 5px;border:1px solid transparent;border-radius:3px;font-size:8px;line-height:1.3;letter-spacing:.04em}
.cx-pm-status.status-created{color:#8fa8b8;border-color:#355064;background:rgba(80,110,130,.12)}
.cx-pm-status.status-submited{color:#c39cff;border-color:#6d4a9b;background:rgba(120,80,180,.15)}
.cx-pm-status.status-approved{color:#7bd4ff;border-color:#2b6f92;background:rgba(50,140,180,.15)}
.cx-pm-status.status-process{color:#ffd166;border-color:#8a6a2a;background:rgba(180,130,40,.15)}
.cx-pm-status.status-finished,.cx-pm-status.status-canFinish{color:#6ef7b0;border-color:#2f8060;background:rgba(40,160,110,.15)}
.cx-pm-status.status-canceled,.cx-pm-status.status-rejected,.cx-pm-status.status-shouldImprove{color:#ff8fa3;border-color:#8a3d4d;background:rgba(180,60,80,.15)}
.cx-pm-status.status-target,.cx-pm-status.status-report{color:#7be0ff;border-color:#2b6f92;background:rgba(50,140,180,.12)}
.cx-fold{width:16px;height:16px;line-height:1;padding:0;border:0;background:transparent;color:var(--cx-text-faint);cursor:pointer;flex:none;font-size:10px}
.cx-fold:hover{color:var(--cx-accent)}
.cx-shell[data-theme="light"] .cx-pm-type.type-target{color:#8a5200}
.cx-shell[data-theme="light"] .cx-pm-type.type-plan{color:#0a5f7d}
.cx-shell[data-theme="light"] .cx-pm-type.type-task{color:#4f3596}
.cx-shell[data-theme="light"] .cx-pm-type.type-report{color:#94400e}
.cx-shell[data-theme="light"] .cx-pm-type.type-feedback{color:#086b40}
.cx-shell[data-theme="light"] .cx-pm-status{font-weight:700}
.cx-shell[data-theme="light"] .cx-pm-status.status-created{color:#3a5160;border-color:#8aa9b8;background:#eef5f9}
.cx-shell[data-theme="light"] .cx-pm-status.status-submited{color:#523496;border-color:#9b7fd0;background:#f3eefc}
.cx-shell[data-theme="light"] .cx-pm-status.status-approved{color:#0a5f7d;border-color:#5aa6c4;background:#eaf6fb}
.cx-shell[data-theme="light"] .cx-pm-status.status-process{color:#7a5000;border-color:#c49a3a;background:#fdf5e3}
.cx-shell[data-theme="light"] .cx-pm-status.status-finished,.cx-shell[data-theme="light"] .cx-pm-status.status-canFinish{color:#08663f;border-color:#4fae85;background:#e9f8f0}
.cx-shell[data-theme="light"] .cx-pm-status.status-canceled,.cx-shell[data-theme="light"] .cx-pm-status.status-rejected,.cx-shell[data-theme="light"] .cx-pm-status.status-shouldImprove{color:#a02034;border-color:#cf7f8e;background:#fdeef1}
.cx-shell[data-theme="light"] .cx-pm-status.status-target,.cx-shell[data-theme="light"] .cx-pm-status.status-report{color:#0a5f7d;border-color:#5aa6c4;background:#eaf6fb}
.cx-pm-card .cx-menu-wrap .cx-btn.xs{width:22px;height:22px;padding:0;font-size:13px;line-height:1}
.cx-menu-item.danger{color:#ff8fa3}
.cx-menu-item.danger:hover{background:rgba(255,92,122,.15);color:#ff5c7a}
.cx-pm-card{position:relative;display:flex;flex-direction:column;gap:4px;width:100%;text-align:left;border:1px solid rgba(30,70,92,.55);border-left:2px solid transparent;background:rgba(7,20,32,.55);color:#b9dbe8;padding:8px 9px;margin-bottom:5px;cursor:pointer;border-radius:6px}
.cx-pm-card:hover{background:rgba(62,231,255,.06);border-color:rgba(62,231,255,.35)}
.cx-pm-card.on{background:rgba(62,231,255,.1);border-left-color:var(--cx-cyan);border-color:rgba(62,231,255,.45)}
.cx-pm-card-top{display:flex;align-items:center;justify-content:space-between;gap:6px}
.cx-pm-type{font-size:9px;font-weight:800;letter-spacing:.08em;color:var(--cx-cyan)}
.cx-pm-status{font-size:8px;color:var(--cx-green);text-transform:uppercase;letter-spacing:.06em}
.cx-pm-title{font-size:11px;line-height:1.4;font-weight:700;color:#eaffff;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cx-pm-meta{font-size:9px;line-height:1.45;color:#6f97a9;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cx-pm-card-actions{display:flex;align-items:center;justify-content:flex-end;gap:4px;flex-wrap:wrap;margin-top:2px}
.cx-pm-card-actions .cx-menu-wrap{margin-left:auto}
.cx-pm-act{border:1px solid rgba(30,70,92,.75);background:rgba(5,16,26,.75);color:#8fb3c4;font:9px/1.2 var(--cx-font);padding:3px 5px;border-radius:3px;cursor:pointer}
.cx-pm-act:hover{border-color:var(--cx-cyan);color:var(--cx-cyan)}
.cx-pm-act.danger:hover{border-color:var(--cx-red);color:var(--cx-red)}
.cx-pm-empty{font-size:8.5px;color:#4f7a8c;padding:5px 4px;line-height:1.5}
.cx-gate{margin:20px auto;max-width:520px;padding:16px;border:1px solid rgba(62,231,255,.3);background:rgba(7,24,38,.85);text-align:center;border-radius:10px}
.cx-gate-t{font-size:13px;font-weight:800;color:#eaffff;margin-bottom:6px}
.cx-gate-d{font-size:10px;line-height:1.7;color:#8fb3c4;margin-bottom:12px}
.cx-gate-actions{display:flex;gap:6px;justify-content:center;flex-wrap:wrap}
@media(max-width:1000px){.cx-pm-side{display:none}}

.cx-msg-main{flex:1;min-width:0}
.cx-msg-meta{display:flex;align-items:center;gap:8px;font-size:8px;letter-spacing:.1em;color:var(--cx-muted);margin-bottom:4px}
.cx-msg-copy{margin-left:auto;border:0;background:transparent;color:var(--cx-muted);font:8px/1 var(--cx-font);cursor:pointer;letter-spacing:.08em}
.cx-msg-copy:hover{color:var(--cx-cyan)}
.cx-msg-metrics{color:var(--cx-text-faint);font-size:8px;letter-spacing:.04em}
.cx-msg-body{font-size:11px;line-height:1.75;color:#d9f4ff}
.cx-msg.user .cx-msg-body{color:#e9fff8}
.cx-md-p{margin:2px 0}
.cx-md-h{font-weight:800;color:#eaffff;margin:8px 0 3px;font-size:12px}
.cx-md-h.h1{font-size:15px}.cx-md-h.h2{font-size:14px}.cx-md-h.h3{font-size:13px}
.cx-md-list{margin:4px 0 4px 16px;padding:0}
.cx-md-list li{margin:2px 0}
.cx-md-quote{margin:5px 0;padding:4px 8px;border-left:2px solid var(--cx-cyan);background:rgba(62,231,255,.06);color:#9fc8d8}
.cx-md-inline{font-family:var(--cx-mono);font-size:10px;color:var(--cx-green);background:rgba(66,245,167,.08);padding:1px 4px;border-radius:3px}
.cx-md-a{color:var(--cx-cyan);text-decoration:underline}
.cx-md-codebox{margin:6px 0;border:1px solid rgba(30,70,92,.8);border-radius:6px;overflow:hidden;background:#030b12}
.cx-md-codebar{display:flex;align-items:center;justify-content:space-between;padding:4px 7px;border-bottom:1px solid rgba(30,70,92,.7);font-size:8px;color:var(--cx-muted);letter-spacing:.08em}
.cx-md-codebar button{border:0;background:transparent;color:var(--cx-muted);cursor:pointer;font:8px var(--cx-font)}
.cx-md-codebar button:hover{color:var(--cx-cyan)}
.cx-md-code{margin:0;padding:8px 10px;overflow:auto;font:10px/1.65 var(--cx-mono);color:#bfe9f8}
.cx-sysline{display:flex;align-items:center;justify-content:center;gap:6px;font-size:8px;letter-spacing:.12em;color:#4f7a8c;text-transform:uppercase}
.cx-sysdot{width:4px;height:4px;border-radius:50%;background:var(--cx-cyan);box-shadow:0 0 8px var(--cx-cyan)}
.cx-chat-typing{font-size:9px;color:var(--cx-cyan);letter-spacing:.1em;padding:4px 0 4px 30px}
@media(max-width:1250px){.cx-body{grid-template-columns:1fr 1fr;overflow:auto}.cx-panel{min-height:260px}.cx-shell{overflow:auto}}
@media(max-width:1000px){.cx-chat{width:calc(100vw - 12px);right:6px;bottom:6px;height:calc(100vh - 20px)}.cx-compose{max-width:none}.cx-compose-tools{display:flex;flex-wrap:wrap}.cx-compose .cx-sel{flex:0 1 auto;max-width:calc(50% - 18px)}.cx-compose .cx-sel-btn{max-width:100%}.cx-compose-right{margin-left:auto;flex-wrap:wrap;justify-content:flex-end}.cx-body{grid-template-columns:1fr;overflow:auto}.cx-panel{min-height:240px}.cx-shell{overflow:auto}.cx-log{min-height:110px}}
@media(max-width:760px){.cx-compose-tools{gap:4px}.cx-compose .cx-sel{flex:1 1 calc(33% - 14px);max-width:none}.cx-compose-right{flex:1 1 100%;margin-left:0;justify-content:flex-end;order:5}.cx-compose .cx-sel-btn{max-width:100%}}

/* light theme, follows system via data-theme */
.cx-shell[data-theme="light"]{--cx-bg:#eef6fb;--cx-panel:#ffffff;--cx-panel2:#f3f9fd;--cx-line:#c7dbe7;--cx-line2:#a8c9da;--cx-cyan:#0b7f9f;--cx-cyan2:#09677f;--cx-green:#07845a;--cx-orange:#a96700;--cx-red:#c73550;--cx-text:#183440;--cx-muted:#5e7d8e;color-scheme:light;background:radial-gradient(1000px 500px at 10% -10%,rgba(62,181,210,.14),transparent 55%),linear-gradient(180deg,#f4fbfe,#e9f3f9)}
.cx-shell[data-theme="light"] .cx-header{background:linear-gradient(180deg,rgba(255,255,255,.98),rgba(242,249,253,.96));border-bottom-color:var(--cx-line)}
.cx-shell[data-theme="light"] .cx-title,.cx-shell[data-theme="light"] .cx-name{color:#102f3d}
.cx-shell[data-theme="light"] .cx-panel{background:#fff;box-shadow:0 4px 18px rgba(31,73,94,.06)}
.cx-shell[data-theme="light"] .cx-ph,.cx-shell[data-theme="light"] .cx-tools{background:#f3f9fc;border-color:var(--cx-line)}
.cx-shell[data-theme="light"] .cx-ph .ttl{color:#123846}
.cx-shell[data-theme="light"] .cx-node,.cx-shell[data-theme="light"] .cx-space,.cx-shell[data-theme="light"] .cx-app{background:#f8fcfd;border-color:#d5e6ee}
.cx-shell[data-theme="light"] .cx-node:hover,.cx-shell[data-theme="light"] .cx-space:hover,.cx-shell[data-theme="light"] .cx-app:hover{background:#eef8fc}
.cx-shell[data-theme="light"] .cx-node.on,.cx-shell[data-theme="light"] .cx-space.on,.cx-shell[data-theme="light"] .cx-app.on{background:#e5f6fb;border-color:var(--cx-cyan)}
.cx-shell[data-theme="light"] .cx-chip{background:#fff;border-color:var(--cx-line);color:var(--cx-muted)}
.cx-shell[data-theme="light"] .cx-chip b{color:#173846}
.cx-shell[data-theme="light"] .cx-btn{background:#fff;border-color:#bcd4e1;color:#224a5b}
.cx-shell[data-theme="light"] .cx-btn.pri{background:#e6f7fb;border-color:var(--cx-cyan);color:#075a70}
.cx-shell[data-theme="light"] .cx-btn:hover{border-color:var(--cx-cyan);color:var(--cx-cyan)}
.cx-shell[data-theme="light"] .cx-log{background:#f5fbfd;border-color:var(--cx-line)}
.cx-shell[data-theme="light"] .cx-log-b{background:#f5fbfd}
.cx-shell[data-theme="light"] .cx-line .t{color:#a2bdc9}
.cx-shell[data-theme="light"] .cx-line .m{color:#43697a}
.cx-shell[data-theme="light"] .cx-line.ok .m{color:#07845a}.cx-shell[data-theme="light"] .cx-line.err .m{color:#c73550}.cx-shell[data-theme="light"] .cx-line.run .m{color:#a96700}
.cx-shell[data-theme="light"] .cx-preview{background:#f2f7fa}
.cx-shell[data-theme="light"] .cx-detail{background:#f7fbfd}
.cx-shell[data-theme="light"] .cx-detail .dc{color:#5c7b8c}
.cx-shell[data-theme="light"] .cx-chat{background:linear-gradient(180deg,#ffffff,#f5fafd);border-color:#b9d8e5;box-shadow:0 20px 50px rgba(25,64,82,.18)}
.cx-shell[data-theme="light"] .cx-chat.full{background:radial-gradient(900px 500px at 15% 0%,rgba(96,205,230,.18),transparent 60%),linear-gradient(180deg,#f7fcfe,#eaf4f9)}
.cx-shell[data-theme="light"] .cx-chat.full:before{background-image:linear-gradient(rgba(11,127,159,.06) 1px,transparent 1px),linear-gradient(90deg,rgba(11,127,159,.06) 1px,transparent 1px)}
.cx-shell[data-theme="light"] .cx-city3d,.cx-shell[data-theme="light"] .cx-tech-bg{opacity:.13}
.cx-shell[data-theme="light"] .cx-chat-h{background:rgba(255,255,255,.9);border-color:var(--cx-line)}
.cx-shell[data-theme="light"] .cx-chat-title{color:#0d3545}
.cx-shell[data-theme="light"] .cx-hero-title{background:linear-gradient(135deg,#0b4458,#0b7f9f 55%,#07845a);-webkit-background-clip:text;background-clip:text;color:transparent}
.cx-shell[data-theme="light"] .cx-hero-sub{color:#54798a}
.cx-shell[data-theme="light"] .cx-empty-hint{background:#fff;border-color:#b6d8e4;color:#55798a}
.cx-shell[data-theme="light"] .cx-msg{border-color:#c9e0ea;background:#fff;color:#173846;box-shadow:0 5px 16px rgba(32,80,102,.08)}
.cx-shell[data-theme="light"] .cx-msg.ai{border-left-color:var(--cx-cyan)}
.cx-shell[data-theme="light"] .cx-msg.user{background:#e9faf4;border-color:#a9dfc9}
.cx-shell[data-theme="light"] .cx-msg-body{color:#193845}
.cx-shell[data-theme="light"] .cx-msg.user .cx-msg-body{color:#123d30}
.cx-shell[data-theme="light"] .cx-msg-meta{color:#6d8a98}
.cx-shell[data-theme="light"] .cx-msg-copy{color:#6d8a98}
.cx-shell[data-theme="light"] .cx-sysline{color:#6a8b99}
.cx-shell[data-theme="light"] .cx-md-p,.cx-shell[data-theme="light"] .cx-md-list li{color:#193845}
.cx-shell[data-theme="light"] .cx-md-h{color:#123846}
.cx-shell[data-theme="light"] .cx-md-quote{background:#eef8fb;color:#446b7b}
.cx-shell[data-theme="light"] .cx-md-codebox{background:#f7fbfd;border-color:#c7dde8}
.cx-shell[data-theme="light"] .cx-md-code{color:#285366;background:#f2f8fb}
.cx-shell[data-theme="light"] .cx-md-inline{color:#076e55;background:#e6f7f0}
.cx-shell[data-theme="light"] .cx-compose{background:#fff;border-color:#b9d8e5;box-shadow:0 8px 28px rgba(24,66,84,.1)}
.cx-shell[data-theme="light"] .cx-compose-input{color:#173846}
.cx-shell[data-theme="light"] .cx-compose-input::placeholder{color:#8aa7b4}
.cx-shell[data-theme="light"] .cx-sel-btn,.cx-shell[data-theme="light"] .cx-compose .cx-sel-btn{background:#f4fafc;border-color:#c6dce7;color:#244a5a}
.cx-shell[data-theme="light"] .cx-sel-btn .v,.cx-shell[data-theme="light"] .cx-sel-btn .a{color:#244a5a}
.cx-shell[data-theme="light"] .cx-sel-btn .v.ph{color:#0b7f9f}
.cx-shell[data-theme="light"] .cx-sel-menu{background:#fff;border-color:#b9d8e5;box-shadow:0 12px 30px rgba(20,60,80,.18)}
.cx-shell[data-theme="light"] .cx-sel-item{color:#244a5a;border-color:#e1edf3}
.cx-shell[data-theme="light"] .cx-sel-item:hover,.cx-shell[data-theme="light"] .cx-sel-item.on{background:#eaf7fb;color:#0b7f9f}
.cx-shell[data-theme="light"] .cx-hint-text{color:#587b8b}
.cx-shell[data-theme="light"] .cx-hint-card{background:#fff;border-color:#c7dde8}
.cx-shell[data-theme="light"] .cx-hint-card .hd{color:#5d7f8f}
.cx-shell[data-theme="light"] .cx-suggest button{background:#fff;border-color:#c7dde8;color:#245164}
.cx-shell[data-theme="light"] .cx-pm-side{background:#f8fcfd;border-color:#c7dde8}
.cx-shell[data-theme="light"] .cx-pm-side.right{border-color:#c7dde8}
.cx-shell[data-theme="light"] .cx-pm-card{background:#fff;border-color:#d3e5ed}
.cx-shell[data-theme="light"] .cx-pm-card:hover,.cx-shell[data-theme="light"] .cx-pm-card.on{background:#eaf7fb;border-color:#8bcadd}
.cx-shell[data-theme="light"] .cx-pm-title{color:#173846}
.cx-shell[data-theme="light"] .cx-pm-meta{color:#698694}
.cx-shell[data-theme="light"] .cx-pm-empty{color:#708f9d}
.cx-shell[data-theme="light"] .cx-pm-act{background:#f7fbfd;border-color:#c7dde8;color:#4e7282}
.cx-shell[data-theme="light"] .cx-menu{background:#fff;border-color:#b9d8e5;box-shadow:0 10px 26px rgba(20,60,80,.18)}
.cx-shell[data-theme="light"] .cx-menu-item{color:#244a5a}
.cx-shell[data-theme="light"] .cx-cal,.cx-shell[data-theme="light"] .cx-taskmap{background:#fff;border-color:#c7dde8}
.cx-shell[data-theme="light"] .cx-cal-day{color:#41697a}
.cx-shell[data-theme="light"] .cx-cal-day:hover{border-color:#7ac6db}
.cx-shell[data-theme="light"] .cx-cal-day.on{background:#dff4fa;border-color:#0b7f9f;color:#084d60}
.cx-shell[data-theme="light"] .cx-taskmap-leaflet{background:#eaf4f8}
.cx-shell[data-theme="light"] .cx-taskmap-leaflet .leaflet-tile{filter:none}
.cx-shell[data-theme="light"] .cx-taskmap-leaflet .leaflet-container{background:#eaf4f8}
.cx-shell[data-theme="light"] .cx-gate{background:#fff;border-color:#b9d8e5}
.cx-shell[data-theme="light"] .cx-gate-t{color:#123846}
.cx-shell[data-theme="light"] .cx-gate-d{color:#5d7f8f}
.cx-shell[data-theme="light"] .cx-modal{background:rgba(226,240,247,.72)}
.cx-shell[data-theme="light"] .cx-card{background:#fff;border-color:#b9d8e5;box-shadow:0 20px 50px rgba(20,60,80,.2)}
.cx-shell[data-theme="light"] .cx-card h2{color:#0b7f9f}
.cx-shell[data-theme="light"] .cx-card .desc{color:#5d7f8f}
.cx-shell[data-theme="light"] .cx-input,.cx-shell[data-theme="light"] .cx-form .cx-input{background:#f7fbfd;border-color:#c7dde8;color:#173846}
.cx-shell[data-theme="light"] .cx-empty{color:#688795;border-color:#c7dde8}
.cx-shell[data-theme="light"] .cx-menu-item.danger{color:#c73550}



/* unified design tokens: typography + surfaces */
:root{--cx-font:-apple-system,BlinkMacSystemFont,"SF Pro Text","PingFang SC","Hiragino Sans GB","Microsoft YaHei",sans-serif;--cx-mono:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;--cx-radius-sm:5px;--cx-radius-md:8px;--cx-radius-lg:14px}
.cx-shell{font-family:var(--cx-font);font-size:12px;line-height:1.55;letter-spacing:.01em;color:var(--cx-text);background:var(--cx-bg)}
.cx-shell button,.cx-shell input,.cx-shell textarea,.cx-shell select{font-family:var(--cx-font);font-size:12px}
.cx-shell .cx-mono,.cx-shell .cx-md-code,.cx-shell .cx-md-inline{font-family:var(--cx-mono)}
.cx-shell .cx-title{font-size:16px;line-height:1.2;letter-spacing:.08em}
.cx-shell .cx-sub{font-size:10px;letter-spacing:.1em}
.cx-shell .cx-ph .ttl{font-size:12px;letter-spacing:.06em;font-weight:700}
.cx-shell .cx-name,.cx-shell .cx-space .nm,.cx-shell .cx-app .an{font-size:13px;letter-spacing:.01em}
.cx-shell .cx-meta,.cx-shell .cx-app .ac,.cx-shell .cx-space .sub{font-size:10px}
.cx-shell .cx-chat-title{font-size:14px;letter-spacing:.1em}
.cx-shell .cx-chat-sub{font-size:10px}
.cx-shell .cx-btn{font-size:11px;font-weight:600;letter-spacing:.02em;border-radius:var(--cx-radius-sm)}
.cx-shell .cx-btn.xs{font-size:10px}
.cx-shell .cx-msg-body{font-size:12px;line-height:1.7}
.cx-shell .cx-pm-title{font-size:12px;font-weight:650}
.cx-shell .cx-pm-meta{font-size:9.5px}
.cx-shell .cx-pm-h{font-size:11px}
.cx-shell .cx-md-p,.cx-shell .cx-md-list li{font-size:12px}
.cx-shell .cx-hint-text{font-size:10.5px}
.cx-shell .cx-compose-input{font-size:13px}
.cx-shell .cx-sel-btn .v{font-size:11px}

.cx-shell[data-theme="dark"]{--cx-bg:#050b12;--cx-surface-0:#03080e;--cx-surface-1:#08141f;--cx-surface-2:#0b1c2a;--cx-surface-3:#102738;--cx-glass:rgba(6,18,29,.9);--cx-text-strong:#effcff;--cx-text:#c6e5f1;--cx-text-dim:#7fa5b6;--cx-text-faint:#54788a;--cx-border:rgba(42,92,116,.55);--cx-border-strong:rgba(62,231,255,.38);--cx-accent:#3ee7ff;--cx-accent-soft:rgba(62,231,255,.09);--cx-shadow:0 18px 48px rgba(0,0,0,.45)}
.cx-shell[data-theme="light"]{--cx-bg:#edf5fa;--cx-surface-0:#e5f0f6;--cx-surface-1:#ffffff;--cx-surface-2:#f4fafd;--cx-surface-3:#e8f3f9;--cx-glass:rgba(255,255,255,.92);--cx-text-strong:#102f3e;--cx-text:#294c5d;--cx-text-dim:#5e7f8f;--cx-text-faint:#8ba5b1;--cx-border:#c9dde8;--cx-border-strong:#8fc5d9;--cx-accent:#0b7f9f;--cx-accent-soft:rgba(11,127,159,.08);--cx-shadow:0 16px 38px rgba(31,73,94,.12)}

.cx-shell{background:var(--cx-bg);color:var(--cx-text)}
.cx-shell .cx-header{background:var(--cx-surface-1);border-color:var(--cx-border);color:var(--cx-text)}
.cx-shell .cx-pipe{background:var(--cx-surface-2);border-color:var(--cx-border);color:var(--cx-text-dim)}
.cx-shell .cx-panel{background:var(--cx-surface-1);border-color:var(--cx-border);color:var(--cx-text);box-shadow:var(--cx-shadow)}
.cx-shell .cx-ph,.cx-shell .cx-tools{background:var(--cx-surface-2);border-color:var(--cx-border)}
.cx-shell .cx-ph .ttl{color:var(--cx-text-strong)}
.cx-shell .cx-list{background:var(--cx-surface-1)}
.cx-shell .cx-node,.cx-shell .cx-space,.cx-shell .cx-app{background:var(--cx-surface-2);border-color:var(--cx-border);color:var(--cx-text)}
.cx-shell .cx-node:hover,.cx-shell .cx-space:hover,.cx-shell .cx-app:hover{background:var(--cx-surface-3);border-color:var(--cx-border-strong)}
.cx-shell .cx-node.on,.cx-shell .cx-space.on,.cx-shell .cx-app.on{background:var(--cx-accent-soft);border-color:var(--cx-accent)}
.cx-shell .cx-name,.cx-shell .cx-space .nm,.cx-shell .cx-app .an{color:var(--cx-text-strong)}
.cx-shell .cx-meta,.cx-shell .cx-app .ac,.cx-shell .cx-space .sub,.cx-shell .cx-sub{color:var(--cx-text-dim)}
.cx-shell .cx-log{background:var(--cx-surface-0);border-color:var(--cx-border)}
.cx-shell .cx-log-b{color:var(--cx-text-dim)}
.cx-shell .cx-line .m{color:var(--cx-text)}
.cx-shell .cx-line .t{color:var(--cx-text-faint)}
.cx-shell .cx-chat{background:var(--cx-surface-1);border-color:var(--cx-border-strong);color:var(--cx-text);box-shadow:var(--cx-shadow)}
.cx-shell .cx-chat.full{background:radial-gradient(1000px 540px at 15% 0%,var(--cx-accent-soft),transparent 60%),var(--cx-surface-1)}
.cx-shell .cx-chat-h{background:var(--cx-glass);border-color:var(--cx-border);color:var(--cx-text)}
.cx-shell .cx-chat-title{color:var(--cx-text-strong)}
.cx-shell .cx-chat-sub{color:var(--cx-text-dim)}
.cx-shell .cx-compose{background:var(--cx-surface-1);border-color:var(--cx-border-strong);box-shadow:var(--cx-shadow)}
.cx-shell .cx-compose-input{color:var(--cx-text)}
.cx-shell .cx-compose-input::placeholder{color:var(--cx-text-faint)}
.cx-shell .cx-sel-btn,.cx-shell .cx-compose .cx-sel-btn{background:var(--cx-surface-2);border-color:var(--cx-border);color:var(--cx-text)}
.cx-shell .cx-sel-btn .v,.cx-shell .cx-sel-btn .a{color:var(--cx-text)}
.cx-shell .cx-sel-btn .v.ph{color:var(--cx-accent)}
.cx-shell .cx-pm-side{background:var(--cx-surface-2);border-color:var(--cx-border)}
.cx-shell .cx-pm-card{background:var(--cx-surface-1);border-color:var(--cx-border);color:var(--cx-text)}
.cx-shell .cx-pm-card:hover,.cx-shell .cx-pm-card.on{background:var(--cx-accent-soft);border-color:var(--cx-border-strong)}
.cx-shell .cx-pm-title{color:var(--cx-text-strong)}
.cx-shell .cx-pm-meta{color:var(--cx-text-dim)}
.cx-shell .cx-pm-act{background:var(--cx-surface-2);border-color:var(--cx-border);color:var(--cx-text-dim)}
.cx-shell .cx-msg{background:var(--cx-surface-2);border-color:var(--cx-border);color:var(--cx-text)}
.cx-shell .cx-msg.user{background:var(--cx-accent-soft);border-color:var(--cx-border-strong)}
.cx-shell .cx-msg-body{color:var(--cx-text)}
.cx-shell .cx-msg-meta{color:var(--cx-text-faint)}
.cx-shell .cx-sysline{color:var(--cx-text-faint)}
.cx-shell .cx-hint-text{color:var(--cx-text-dim)}
.cx-shell .cx-hint-card{background:var(--cx-surface-2);border-color:var(--cx-border);color:var(--cx-text)}
.cx-shell .cx-hint-card .hd{color:var(--cx-text-dim)}
.cx-shell .cx-suggest button{background:var(--cx-surface-2);border-color:var(--cx-border);color:var(--cx-text)}
.cx-shell .cx-cal,.cx-shell .cx-taskmap{background:var(--cx-surface-1);border-color:var(--cx-border)}
.cx-shell .cx-card{background:var(--cx-surface-1);border-color:var(--cx-border-strong);color:var(--cx-text);box-shadow:var(--cx-shadow)}
.cx-shell .cx-input,.cx-shell .cx-form .cx-input{background:var(--cx-surface-2);border-color:var(--cx-border);color:var(--cx-text)}
.cx-shell .cx-modal{background:color-mix(in srgb,var(--cx-surface-0) 72%,transparent)}
.cx-shell .cx-gate{background:var(--cx-surface-2);border-color:var(--cx-border-strong);color:var(--cx-text)}
.cx-shell .cx-gate-t{color:var(--cx-text-strong)}
.cx-shell .cx-gate-d{color:var(--cx-text-dim)}
.cx-shell .cx-btn{background:var(--cx-surface-2);border-color:var(--cx-border);color:var(--cx-text)}
.cx-shell .cx-btn:hover{border-color:var(--cx-accent);color:var(--cx-accent)}
.cx-shell .cx-btn.pri{background:var(--cx-accent-soft);border-color:var(--cx-accent);color:var(--cx-accent)}
.cx-shell .cx-menu,.cx-shell .cx-sel-menu{background:var(--cx-surface-1);border-color:var(--cx-border-strong)}
.cx-shell .cx-menu-item,.cx-shell .cx-sel-item{color:var(--cx-text);border-color:var(--cx-border)}
.cx-shell .cx-menu-item:hover,.cx-shell .cx-sel-item:hover,.cx-shell .cx-sel-item.on{background:var(--cx-accent-soft);color:var(--cx-accent)}
.cx-shell .cx-taskmap-leaflet .leaflet-container{background:var(--cx-surface-2)}

.cx-space-actions{display:flex;align-items:center;justify-content:flex-end;gap:5px;width:100%;margin-left:0;flex:none;margin-top:4px}
.cx-shell .cx-filter-btn{background:var(--cx-surface-2);border-color:var(--cx-border);color:var(--cx-text-dim)}
.cx-shell .cx-filter-btn.on{color:var(--cx-accent);border-color:var(--cx-accent);background:var(--cx-accent-soft)}
.cx-shell .cx-compose-plus{background:var(--cx-surface-2);border-color:var(--cx-border);color:var(--cx-accent)}
.cx-shell .cx-chat .x{background:transparent;border:0;color:var(--cx-text-dim);font-size:16px;line-height:1;width:24px;height:24px;border-radius:5px}
.cx-shell .cx-chat .x:hover{background:var(--cx-accent-soft);color:var(--cx-accent)}
.cx-shell .cx-pm-op,.cx-shell .cx-pm-refresh{color:var(--cx-text-dim)}
.cx-shell .cx-pm-op:hover,.cx-shell .cx-pm-refresh:hover{color:var(--cx-accent);background:var(--cx-accent-soft)}
.cx-shell .cx-tag{background:var(--cx-surface-2);border-color:var(--cx-border);color:var(--cx-text-dim)}
.cx-shell .cx-tag.cy{color:var(--cx-accent);border-color:var(--cx-border-strong)}
.cx-shell .cx-webtab{background:var(--cx-surface-2);border-color:var(--cx-border);color:var(--cx-text-dim)}
.cx-shell .cx-webtab.on{background:var(--cx-accent-soft);border-color:var(--cx-accent);color:var(--cx-accent)}
.cx-shell .cx-filter-menu{background:var(--cx-surface-1);border-color:var(--cx-border-strong)}
.cx-shell .cx-filter-item{color:var(--cx-text)}
.cx-shell .cx-filter-item:hover,.cx-shell .cx-filter-item.on{background:var(--cx-accent-soft);color:var(--cx-accent)}
.cx-shell .cx-cal-h button{color:var(--cx-text-dim)}
.cx-shell .cx-cal-h button:hover{color:var(--cx-accent)}
.cx-shell .leaflet-bar a{background:var(--cx-surface-1);color:var(--cx-text);border-color:var(--cx-border)}
.cx-shell .leaflet-bar a:hover{background:var(--cx-accent-soft);color:var(--cx-accent)}

.cx-shell[data-theme="light"] .cx-preview,.cx-shell[data-theme="light"] .cx-webframe{background:#f4fafd}
.cx-shell[data-theme="light"] .cx-preview .cx-empty,.cx-shell[data-theme="light"] .cx-webframe .cx-empty{color:#678694;background:#f4fafd}
.cx-shell[data-theme="light"] .cx-official{background:#f3f9fc;border-color:#c9dde8}
.cx-shell[data-theme="light"] .cx-official label{color:#4c6e7e}
.cx-shell[data-theme="light"] .cx-chat-actions .cx-btn{background:#fff;border-color:#bcd4e1;color:#224a5b}
.cx-shell[data-theme="light"] .cx-chat .x{background:transparent;color:#5e7f8f}
.cx-shell[data-theme="light"] .cx-compose-send{background:linear-gradient(135deg,#73eaff,#45e9ad);color:#063d42;box-shadow:0 0 18px rgba(54,210,220,.28)}
.cx-shell[data-theme="light"] .cx-compose-plus{background:#fff;color:#0b7f9f;border-color:#bcd4e1}
.cx-shell[data-theme="light"] .cx-chat-h{box-shadow:0 1px 0 rgba(31,73,94,.06)}

.cx-console{flex:0 0 auto;border-top:1px solid var(--cx-border);background:var(--cx-surface-0);display:flex;flex-direction:column;min-height:80px;position:relative}
.cx-console-h{display:flex;align-items:center;gap:10px;padding:4px 10px;border-bottom:1px solid var(--cx-border);background:var(--cx-surface-2);font-size:9px;color:var(--cx-text-dim)}
.cx-console-tabs{display:flex;gap:2px}
.cx-console-tab{border:0;border-bottom:2px solid transparent;background:transparent;color:var(--cx-text-dim);font:10px/1.5 var(--cx-font);padding:4px 8px;cursor:pointer;display:flex;gap:5px;align-items:center}
.cx-console-tab span{font-size:8px;color:var(--cx-text-faint)}
.cx-console-tab.on{color:var(--cx-accent);border-bottom-color:var(--cx-accent)}
.cx-console-status{margin-left:auto;font-size:8px;letter-spacing:.1em;color:var(--cx-text-faint)}
.cx-console-actions{display:flex;gap:3px}
.cx-console-actions button{width:22px;height:20px;padding:0;border:1px solid var(--cx-border);background:var(--cx-surface-1);color:var(--cx-text);font:12px/1 var(--cx-font);cursor:pointer;border-radius:3px}
.cx-console-actions button:hover{color:var(--cx-accent);border-color:var(--cx-accent)}
.cx-console-body{flex:1;min-height:0;overflow:auto;padding:4px 12px;font-size:10px;line-height:1.6;color:var(--cx-text-dim);font-family:var(--cx-mono)}
.cx-console-table{width:100%;border-collapse:collapse;font-size:10px;font-family:var(--cx-mono)}
.cx-console-table th{position:sticky;top:0;z-index:1;background:var(--cx-surface-1);color:var(--cx-text-dim);text-align:left;font-weight:600;padding:3px 8px;border-bottom:1px solid var(--cx-border);cursor:pointer;white-space:nowrap;letter-spacing:.06em;user-select:none}
.cx-console-table th:hover{color:var(--cx-accent)}
.cx-console-table td{padding:2px 8px;border-bottom:1px solid color-mix(in srgb,var(--cx-border) 50%,transparent);vertical-align:top;word-break:break-all}
.cx-console-table tr:hover td{background:var(--cx-accent-soft)}
.cx-console-table tr.err td{color:var(--cx-red)}
.cx-console-table td:first-child{white-space:nowrap;color:var(--cx-text-dim)}
.cx-console-body{display:flex;align-items:stretch;padding:0}
.cx-console-main{flex:1;min-width:0;overflow:auto;padding:4px 8px}
.cx-console-detail{width:40%;min-width:260px;max-width:560px;border-left:1px solid var(--cx-border);overflow:auto;padding:8px 10px;font-size:10px;font-family:var(--cx-mono)}
.cx-console-detail-h{display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;color:var(--cx-accent);font-size:9px;letter-spacing:.08em}
.cx-console-detail-h button{border:0;background:transparent;color:var(--cx-text-dim);cursor:pointer;font-size:13px;line-height:1}
.cx-console-detail .kv{display:grid;grid-template-columns:64px 1fr;gap:3px 8px;margin-bottom:8px}
.cx-console-detail .k{color:var(--cx-text-dim)}
.cx-console-detail pre{white-space:pre-wrap;word-break:break-all;background:var(--cx-surface-2);border:1px solid var(--cx-border);border-radius:4px;padding:6px;margin:0}
.cx-console-table tbody tr{cursor:pointer}
.cx-console-table tr.on td{background:var(--cx-accent-soft)}


.cx-console-resize{position:absolute;left:0;right:0;top:-3px;height:6px;cursor:ns-resize}
.cx-console-open{position:absolute;right:16px;bottom:12px;z-index:10;border:1px solid var(--cx-border);background:var(--cx-surface-1);color:var(--cx-accent);font:9px var(--cx-font);padding:4px 8px;cursor:pointer;border-radius:4px;box-shadow:var(--cx-shadow)}

.cx-shell[data-theme="light"] .cx-preview iframe,.cx-shell[data-theme="light"] .cx-webframe iframe{background:#f4fafd}

.cx-select{border:1px solid var(--cx-border);background:var(--cx-surface-2);color:var(--cx-text);font:10px/1.2 var(--cx-font);padding:5px 6px;border-radius:5px;cursor:pointer;outline:none}
.cx-select:hover,.cx-select:focus{border-color:var(--cx-accent);color:var(--cx-accent)}
.cx-icon-btn{min-width:30px;width:30px;height:30px;padding:0;display:inline-grid;place-items:center;font-size:15px;line-height:1}
.cx-kind{display:inline-flex;align-items:center;padding:2px 5px;border:1px solid currentColor;border-radius:3px;font-size:8px;font-weight:800;letter-spacing:.06em}
.cx-kind.type-serve{color:#0b7f9f}.cx-kind.type-space{color:#7a5bd6}.cx-kind.type-recent{color:#b57416}
.cx-card-line{display:flex;align-items:center;justify-content:space-between;gap:6px;min-width:0}
.cx-card-line .cx-name{min-width:0;flex:1}
.cx-card-head{display:flex;align-items:center;justify-content:space-between;gap:6px;margin-bottom:4px}
.cx-status-r{font-size:8px;padding:2px 5px;border:1px solid var(--cx-border);border-radius:3px;color:var(--cx-text-dim)}
.cx-status-r.on{color:#07845a;border-color:#7fc9a8;background:rgba(7,132,90,.08)}
.cx-status-r.off{color:#a35a65;border-color:#d8a9b1;background:rgba(160,70,80,.06)}

.cx-actions .cx-btn{flex:none;white-space:nowrap;height:30px;padding:0 10px;display:inline-flex;align-items:center;justify-content:center;line-height:1}
.cx-actions .cx-btn.cx-icon-btn{width:30px;min-width:30px;padding:0}
.cx-actions .cx-select{flex:none;width:auto;min-width:86px;height:30px}
.cx-actions .cx-chip{flex:none}
.cx-chips{min-width:0}

.cx-shell .cx-store{background:var(--cx-surface-1);border-color:var(--cx-border);color:var(--cx-text);flex-wrap:wrap}
.cx-shell .cx-store:hover{background:var(--cx-accent-soft);border-color:var(--cx-border-strong)}
.cx-shell .cx-store .sn{color:var(--cx-text-strong)}
.cx-shell .cx-store .ss{color:var(--cx-text-dim)}
.cx-store-actions{display:flex;align-items:center;justify-content:flex-end;gap:4px;width:100%;margin-left:0;flex-wrap:wrap;margin-top:6px;border-top:1px solid var(--cx-border);padding-top:6px}
.cx-store-titleline{display:flex;align-items:center;gap:6px;min-width:0}
.cx-store-titleline .sn{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cx-store-actions .cx-btn{height:26px;padding:0 7px;font-size:10px}
.cx-shell[data-theme="light"] .cx-store{background:#fff}
.cx-shell[data-theme="light"] .cx-store:hover{background:#eef8fc}
.cx-store-main{display:flex;align-items:center;gap:8px;flex:1;min-width:0;cursor:pointer}

.cx-avatar-extra{display:flex;gap:8px;align-items:flex-start;border-top:1px solid var(--cx-border);margin-top:8px;padding-top:8px}
.cx-avatar-preview{width:54px;height:54px;flex:none;border:1px solid var(--cx-border);border-radius:6px;overflow:hidden;background:var(--cx-surface-2);display:grid;place-items:center;color:var(--cx-accent);font-size:10px}
.cx-avatar-preview img{width:100%;height:100%;object-fit:cover}
.cx-avatar-extra-title{font-size:11px;font-weight:700;color:var(--cx-text-strong)}
.cx-avatar-extra-sub{font-size:9px;color:var(--cx-text-dim);line-height:1.5;margin:2px 0 5px}
.cx-avatar-skills{display:flex;gap:4px;flex-wrap:wrap;margin-bottom:5px}
.cx-avatar-skill-empty{font-size:9px;color:var(--cx-text-faint)}
.cx-avatar-skill-add{display:flex;gap:4px;align-items:center}
.cx-avatar-skill-add .cx-input{flex:1;min-width:0;height:26px}

.cx-pm-side.right{display:flex;flex-direction:column}
.cx-pm-side.right .cx-taskmap{margin-top:auto;position:sticky;bottom:0;flex:none}
.cx-taskmap.full{position:fixed;inset:24px;z-index:900;margin:0;padding:10px;width:auto;max-width:none;overflow:hidden}
.cx-taskmap.full .cx-taskmap-h{position:sticky;top:0;z-index:50;padding:8px 10px;font-size:12px;background:var(--cx-surface-1);border-bottom:1px solid var(--cx-border)}
.cx-taskmap.full .cx-taskmap-actions button{width:30px;height:30px;font-size:16px}
.cx-taskmap.full .cx-taskmap-leaflet{height:calc(100vh - 130px)}

.cx-taskmap.full{position:fixed;inset:0;z-index:900;margin:0;padding:0;width:100vw;height:100vh;max-width:none;border:0;border-radius:0;overflow:hidden;background:var(--cx-surface-1)}
.cx-taskmap.full .cx-taskmap-h{position:absolute;left:0;right:0;top:0;z-index:60;height:46px;box-sizing:border-box;padding:0 12px;display:flex;align-items:center;background:color-mix(in srgb,var(--cx-surface-1) 88%,transparent);backdrop-filter:blur(12px);border-bottom:1px solid var(--cx-border)}
.cx-taskmap.full .cx-taskmap-leaflet{position:absolute;inset:46px 0 0;width:100vw;height:calc(100vh - 46px);border:0;border-radius:0}
.cx-taskmap.full .cx-taskmap-legend{position:absolute;left:12px;bottom:12px;z-index:60;padding:5px 8px;background:color-mix(in srgb,var(--cx-surface-1) 90%,transparent);border:1px solid var(--cx-border);border-radius:4px}
.cx-taskmap.full .cx-taskmap-actions button{width:32px;height:32px;font-size:17px}

.cx-shell .cx-pm-side.right .cx-taskmap.full{position:fixed!important;inset:0!important;z-index:900;margin:0!important;padding:0!important;width:100vw!important;height:100vh!important;max-width:none!important;border:0!important;border-radius:0!important;overflow:hidden!important;background:var(--cx-surface-1)}
.cx-shell .cx-pm-side.right .cx-taskmap.full .cx-taskmap-h{position:absolute;left:0;right:0;top:0;height:48px;z-index:60;display:flex;align-items:center;padding:0 12px;background:var(--cx-surface-1);border-bottom:1px solid var(--cx-border)}
.cx-shell .cx-pm-side.right .cx-taskmap.full .cx-taskmap-leaflet{position:absolute;inset:48px 0 0;width:100vw;height:calc(100vh - 48px);border:0;border-radius:0}

.cx-shell .cx-pm-side.right .cx-taskmap.full{top:58px!important;bottom:0!important;height:calc(100vh - 58px)!important;inset:58px 0 0!important}
.cx-shell .cx-pm-side.right .cx-taskmap.full .cx-taskmap-leaflet{inset:48px 0 0;height:calc(100vh - 106px)}

.cx-taskmap.full .leaflet-tile{filter:none!important}

.cx-cal-views{display:flex;gap:3px;padding:3px 0 6px}
.cx-cal-view{flex:1;border:1px solid var(--cx-border);background:var(--cx-surface-2);color:var(--cx-text-dim);font:9px/1.2 var(--cx-font);padding:4px 0;cursor:pointer;border-radius:3px}
.cx-cal-view.on{color:var(--cx-accent);border-color:var(--cx-accent);background:var(--cx-accent-soft)}
.cx-cal-years{display:grid;grid-template-columns:repeat(4,1fr);gap:3px}
.cx-cal-year,.cx-cal-month{border:1px solid var(--cx-border);background:var(--cx-surface-2);color:var(--cx-text);font:10px var(--cx-font);padding:7px 2px;cursor:pointer;border-radius:3px}
.cx-cal-year.on,.cx-cal-month.on{background:var(--cx-accent-soft);border-color:var(--cx-accent);color:var(--cx-accent)}
.cx-cal-months{display:grid;grid-template-columns:repeat(4,1fr);gap:3px}
.cx-cal-month{display:flex;flex-direction:column;gap:2px}
.cx-cal-month span{font-size:7px;color:var(--cx-text-faint);white-space:nowrap;overflow:hidden}
.cx-cal-day .l{position:absolute;bottom:2px;left:0;right:0;font-size:6.5px;color:var(--cx-text-faint);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cx-cal-day{height:36px}

.cx-cal-day.on{background:color-mix(in srgb,var(--cx-accent) 14%,transparent);border-color:color-mix(in srgb,var(--cx-accent) 45%,transparent);color:var(--cx-text-strong)}
.cx-cal-day.start,.cx-cal-day.end{background:color-mix(in srgb,var(--cx-accent) 32%,transparent);border-color:var(--cx-accent);color:var(--cx-text-strong);font-weight:800;box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--cx-accent) 45%,transparent)}

/* 四步递进：标题底色由左至右渐深，01→04 一眼看出层级（2026-11-06） */
.cx-pipe>.cx-stage:nth-of-type(1){--cx-a:10%;--cx-b:2%}
.cx-pipe>.cx-stage:nth-of-type(2){--cx-a:16%;--cx-b:5%}
.cx-pipe>.cx-stage:nth-of-type(3){--cx-a:22%;--cx-b:8%}
.cx-pipe>.cx-stage:nth-of-type(4){--cx-a:28%;--cx-b:11%}
.cx-body>.cx-panel:nth-of-type(1){--cx-a:14%;--cx-b:4%}
.cx-body>.cx-panel:nth-of-type(2){--cx-a:20%;--cx-b:8%}
.cx-body>.cx-panel:nth-of-type(3){--cx-a:26%;--cx-b:12%}
.cx-body>.cx-panel:nth-of-type(4){--cx-a:32%;--cx-b:16%}
.cx-pipe>.cx-stage:not(.on){background-image:linear-gradient(90deg,color-mix(in srgb,var(--cx-accent) var(--cx-a,0%),transparent),color-mix(in srgb,var(--cx-accent) var(--cx-b,0%),transparent))}
.cx-body>.cx-panel>.cx-ph{background-image:linear-gradient(90deg,color-mix(in srgb,var(--cx-accent) var(--cx-a,0%),transparent),color-mix(in srgb,var(--cx-accent) var(--cx-b,0%),transparent))}

/* 窗口模式：对话 / 管理 / 开发；右上角给 DSH 图标留白（2026-11-06） */
.cx-shell{--cx-host-right:88px;--cx-host-left:168px;--cx-host-left-pad:0px;position:relative}
.cx-header{padding-left:calc(16px + var(--cx-host-left-pad))}
.cx-chat.full .cx-chat-hin{max-width:900px}
.cx-chat.full .cx-compose{max-width:900px}
.cx-chat.full .cx-hint{max-width:900px;width:calc(100% - 36px);padding:0}
.cx-chat.full .cx-hint-panel{max-width:900px;width:calc(100% - 36px);padding:0}
.cx-shell{--cx-pm-side-w:280px}
.cx-chat-host{flex:1;min-height:0;display:flex;min-width:0;padding:10px 12px 12px}
.cx-chat-host.full{position:absolute;inset:0;z-index:500;padding:0}
.cx-shell.host-chrome .cx-chat-host.full .cx-chat{padding-top:0}
.cx-chat.dock{position:relative;inset:auto;width:100%;height:100%;flex:1;min-height:0;border:1px solid var(--cx-line);z-index:1;box-shadow:none}
.cx-header{padding-right:calc(16px + var(--cx-host-right))}
.cx-header>.cx-actions{margin-left:auto}
.cx-pipe>.cx-chips{margin-left:auto;flex:none;flex-wrap:nowrap;padding-left:12px;overflow:hidden}

.cx-views{display:flex;flex:none;position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);z-index:3;border:1px solid var(--cx-line);background:var(--cx-surface-1)}
.cx-view{padding:6px 10px;border:0;border-right:1px solid var(--cx-line);background:transparent;color:var(--cx-muted);font:700 9px/1 var(--cx-font);letter-spacing:.08em;cursor:pointer}
.cx-view:last-child{border-right:0}
.cx-view:hover{color:var(--cx-text)}
.cx-view.on{background:color-mix(in srgb,var(--cx-accent) 16%,transparent);color:var(--cx-accent)}
.cx-dev{flex:1;min-height:0;display:grid;grid-template-columns:220px minmax(0,1fr) 300px;gap:10px;padding:10px 12px 0;overflow:hidden}.cx-dev-wrap{flex:1;min-height:0;display:flex;flex-direction:column;min-width:0}
.cx-dev-top{display:flex;align-items:center;gap:8px;padding:8px 12px;border-bottom:1px solid var(--cx-line);background:var(--cx-surface-1);flex:none;flex-wrap:wrap}
.cx-dev-projects{display:flex;gap:4px;overflow:auto;flex:1;min-width:0;padding-bottom:2px}
.cx-dev-ptab{display:inline-flex;align-items:center;gap:6px;padding:4px 10px;border:1px solid var(--cx-border);border-radius:4px;background:transparent;color:var(--cx-text-dim);font:10px var(--cx-mono);cursor:pointer;white-space:nowrap}
.cx-dev-ptab.on{color:var(--cx-accent);border-color:var(--cx-accent);background:var(--cx-accent-soft)}
.cx-dev-ptab .x{border:0;background:transparent;color:inherit;cursor:pointer;font-size:10px;padding:0}
.cx-dev-target{display:flex;gap:6px;flex:none}
.cx-dev{flex:1;min-height:0;display:grid;grid-template-columns:220px minmax(0,1fr) 360px;grid-template-rows:minmax(0,1fr) 200px;gap:8px;padding:8px 10px;overflow:hidden}
.cx-dev-explorer{grid-column:1;grid-row:1/3}
.cx-dev-editor{grid-column:2;grid-row:1}
.cx-dev-preview{grid-column:3;grid-row:1}
.cx-dev-term{grid-column:2/4;grid-row:2}
.cx-preview-wrap{display:flex;flex-direction:column}
.cx-preview-frame{flex:1;width:100%;border:0;background:#fff}.cx-dev .cx-dev-editor{background:transparent}
.cx-dev .cx-editor-wrap,.cx-dev .cx-editor-host,.cx-dev .cx-editor-ta{background:transparent}
.cx-dev .cx-editor-host .monaco-editor,.cx-dev .cx-editor-host .monaco-editor .margin,.cx-dev .cx-editor-host .monaco-editor-background,.cx-dev .cx-editor-host .monaco-editor .overflow-guard{background:transparent!important}
.cx-dev .cx-dev-editor{border:0}
.cx-dev .cx-dev-editor .cx-dev-h{border-bottom:0}
.cx-dev .cx-tabs{background:transparent;border:0}
.cx-dev .cx-editor-wrap,.cx-dev .cx-editor-host,.cx-dev .cx-editor-ta,.cx-dev .cx-dev-editor,.cx-dev .cx-dev-editor .cx-dev-b{border:0!important;box-shadow:none!important;outline:0!important}
.cx-dev.hide-left{grid-template-columns:minmax(0,1fr) 360px}
.cx-dev.hide-right{grid-template-columns:220px minmax(0,1fr)}
.cx-dev.hide-left.hide-right{grid-template-columns:minmax(0,1fr)}
.cx-dev.hide-bottom{grid-template-rows:minmax(0,1fr)}
.cx-dev.hide-left .cx-dev-explorer{display:none}
.cx-dev.hide-left .cx-dev-editor{grid-column:1}
.cx-dev.hide-left .cx-dev-preview{grid-column:2}
.cx-dev.hide-left .cx-dev-term{grid-column:1/3}
.cx-dev.hide-right .cx-dev-preview{display:none}
.cx-dev.hide-right .cx-dev-term{grid-column:2/3}
.cx-dev.hide-left.hide-right .cx-dev-editor{grid-column:1}
.cx-dev.hide-left.hide-right .cx-dev-term{grid-column:1/2}
.cx-dev.hide-bottom .cx-dev-term{display:none}
.cx-dev.hide-bottom .cx-dev-explorer{grid-row:1/2}
.cx-pm-op.on{color:var(--cx-accent);border-color:var(--cx-accent)}

.cx-dev .cx-editor-host .monaco-editor,.cx-dev .cx-editor-host .monaco-editor .overflow-guard,.cx-dev .cx-editor-host .monaco-editor .margin{border:0!important;box-shadow:none!important;outline:0!important}
.cx-dev .cx-tabs,.cx-dev .cx-tabs .cx-tab{border-bottom:0!important;box-shadow:none!important}
.cx-dev .cx-crumb{border:0}
.cx-dev .cx-tab{border-right:0}
.cx-dev .cx-tab .ico{font-size:7px;font-weight:800;letter-spacing:0;color:var(--cx-text-faint);min-width:12px;text-align:center}
.cx-dev .cx-tab.on .ico{color:var(--cx-accent)}
.cx-crumb{display:flex;align-items:center;gap:3px;padding:3px 10px;background:transparent;font:10px var(--cx-mono);color:var(--cx-text-dim);overflow:auto;flex:none;white-space:nowrap}
.cx-crumb .seg{display:inline-flex;align-items:center;gap:4px;padding:2px 6px;border-radius:3px;cursor:pointer}
.cx-crumb .seg:hover{background:var(--cx-accent-soft);color:var(--cx-accent)}
.cx-crumb .seg.file{color:var(--cx-text)}
.cx-crumb .ci{opacity:.65;font-size:9px}
.cx-crumb .sep{opacity:.45}
.cx-crumb-actions{margin-left:auto;display:flex;gap:2px;flex:none}

.cx-dev .cx-tab{background:transparent;border:0;border-top:2px solid transparent}
.cx-dev .cx-tab.on{background:transparent;border-top-color:var(--cx-accent);color:var(--cx-accent)}
.cx-dev .cx-tab .x{color:inherit}
.cx-menu-item .hint{margin-left:auto;padding-left:12px;opacity:.5;font-size:9px}
.cx-menu-item.on{color:var(--cx-accent)}
.cx-tree-menu{position:fixed;z-index:900;min-width:150px;padding:4px;border:1px solid var(--cx-border-strong);border-radius:6px;background:var(--cx-surface-1);box-shadow:0 12px 30px rgba(0,0,0,.45)}
.cx-namedlg{position:fixed;z-index:950;left:50%;top:30%;transform:translateX(-50%);width:min(360px,80vw);padding:12px;border:1px solid var(--cx-border-strong);border-radius:8px;background:var(--cx-surface-1);box-shadow:0 18px 50px rgba(0,0,0,.5)}
.cx-namedlg .t{font:10px var(--cx-mono);color:var(--cx-accent);margin-bottom:8px}
.cx-namedlg .cx-input{width:100%;margin-bottom:8px}
.cx-namedlg .b{display:flex;justify-content:flex-end;gap:8px}


.cx-dev-col{display:flex;flex-direction:column;min-height:0;min-width:0;border:1px solid var(--cx-line);background:var(--cx-surface-1)}
.cx-dev-h{display:flex;align-items:center;gap:8px;padding:8px 10px;border-bottom:1px solid var(--cx-line);background:var(--cx-surface-2);font:700 9px/1 var(--cx-font);letter-spacing:.14em;color:var(--cx-text-dim)}
.cx-dev-hint{margin-left:auto;font-weight:400;letter-spacing:.06em;opacity:.7}
.cx-dev-b{flex:1;min-height:0;overflow:auto}
.cx-tree{padding:8px 10px;font:11px/1.9 var(--cx-font);color:var(--cx-text-dim)}
.cx-tree .d{color:var(--cx-text)}
.cx-tree .f{padding-left:14px;color:var(--cx-text-dim)}
.cx-tabs{display:flex;border-bottom:1px solid var(--cx-line);background:var(--cx-surface-2);overflow:auto}
.cx-tab{padding:7px 12px;border-right:1px solid var(--cx-line);font:11px/1 var(--cx-font);color:var(--cx-text-dim);white-space:nowrap}
.cx-tab.on{background:var(--cx-surface-1);color:var(--cx-text-strong);box-shadow:inset 0 -2px 0 var(--cx-accent)}
.cx-code{margin:0;padding:12px 14px;font:11px/1.8 var(--cx-font);color:var(--cx-text-faint);white-space:pre;overflow:auto}
.cx-tree{display:flex;flex-direction:column;padding:4px 0}
.cx-tree-item{display:flex;align-items:center;gap:6px;padding:3px 8px;font:11px var(--cx-mono);color:var(--cx-text-dim);cursor:pointer;white-space:nowrap;overflow:hidden}
.cx-tree-item:hover{background:var(--cx-accent-soft);color:var(--cx-text)}
.cx-tree-item.on{background:var(--cx-accent-soft);color:var(--cx-accent)}
.cx-tree-item .ico{width:10px;flex:none;opacity:.8}
.cx-tree-item .nm{overflow:hidden;text-overflow:ellipsis}
.cx-tree-item .chev{width:10px;flex:none;opacity:.6;font-size:9px}
.cx-tree-item .fic{width:14px;display:inline-flex;align-items:center;justify-content:center;flex:none}
.cx-tree-item .chev{display:inline-flex;align-items:center;justify-content:center;color:var(--cx-text-faint)}
.cx-tree-recent{border-bottom:1px solid var(--cx-line);padding-bottom:4px;margin-bottom:4px}
.cx-tree-sect{display:flex;align-items:center;gap:6px;padding:5px 8px 3px;font:9px var(--cx-mono);letter-spacing:.08em;text-transform:uppercase;color:var(--cx-text-faint)}

.cx-editor-wrap{position:relative;display:flex;flex-direction:column;overflow:hidden}
.cx-editor-host{flex:1;min-height:0;width:100%;min-height:220px}
.cx-editor-ta{flex:1;width:100%;min-height:220px;border:0;resize:none;background:#1e1e1e;color:#d4d4d4;font:12px/1.6 Menlo,monospace;padding:10px;outline:none}
.cx-term-wrap{display:flex;flex-direction:column;background:#04101a;overflow:hidden}
.cx-term-h{padding:4px 8px;border-bottom:1px solid var(--cx-line)}
.cx-term-tabs{display:flex;gap:4px;align-items:center}
.cx-term-tab{border:0;border-bottom:2px solid transparent;background:transparent;color:var(--cx-text-dim);font:10px var(--cx-mono);padding:3px 8px;cursor:pointer}
.cx-term-tab.on{color:var(--cx-accent);border-bottom-color:var(--cx-accent)}
.cx-term-sessions{display:flex;gap:4px;align-items:center;margin-left:8px}
.cx-term-sess{display:inline-flex;align-items:center;gap:3px;padding:2px 6px;border:1px solid var(--cx-border);border-radius:3px;font:9px var(--cx-mono);color:var(--cx-text-dim);cursor:pointer}
.cx-term-sess.on{color:var(--cx-accent);border-color:var(--cx-accent)}
.cx-term-sess .x{border:0;background:transparent;color:inherit;font-size:9px;cursor:pointer;padding:0}
.cx-term-add{border:1px solid var(--cx-border);background:transparent;color:var(--cx-text-dim);border-radius:3px;font-size:11px;line-height:1;padding:1px 6px;cursor:pointer}
.cx-term-add:hover{color:var(--cx-accent);border-color:var(--cx-accent)}
.cx-term-out{margin:0;padding:8px 10px;font:11px/1.6 var(--cx-mono);color:var(--cx-text-dim);white-space:pre-wrap}

.cx-term-host{flex:1;min-height:0;padding:4px}
.cx-dev-status{font:9px var(--cx-mono);color:var(--cx-text-dim);padding:4px 8px;border-top:1px solid var(--cx-border)}
.cx-dev-status.err{color:var(--cx-red)}
.cx-dev-statusbar{display:flex;align-items:center;gap:8px;padding:4px 8px;border-top:1px solid var(--cx-border);font:9px var(--cx-mono);color:var(--cx-text-dim)}
.cx-dev-statusbar .cx-btn{margin-left:auto}
.cx-tab{display:flex;align-items:center;gap:6px;cursor:pointer}
.cx-tab.on{color:var(--cx-accent);background:var(--cx-accent-soft)}
.cx-tab .x{border:0;background:transparent;color:var(--cx-text-dim);cursor:pointer;font-size:11px;line-height:1}
.cx-dev-soon{margin:12px;padding:12px 14px;border:1px dashed var(--cx-border-strong);background:var(--cx-surface-2)}
.cx-dev-soon .t{font:800 11px/1.4 var(--cx-font);letter-spacing:.12em;color:var(--cx-accent)}
.cx-dev-soon .d{margin-top:4px;font-size:11px;line-height:1.7;color:var(--cx-text-dim)}
.cx-dev-soon ul{margin:6px 0 0;padding-left:16px;font-size:11px;line-height:1.8;color:var(--cx-text-dim)}
@media(max-width:1100px){.cx-dev{grid-template-columns:1fr;overflow:auto}.cx-dev-col{min-height:220px}}
@media(max-width:1000px){.cx-brand{min-width:0}.cx-brand .cx-sub{display:none}.cx-chips{display:none}.cx-header{gap:10px}.cx-views{position:static;transform:none;left:auto;top:auto}}

@media(max-width:900px){.cx-shell{--cx-host-right:56px}}

/* 我的背景：照片虚拟世界 + 输入区小按钮（2026-11-06） */
.cx-chat-bg{position:absolute;inset:0;z-index:0;overflow:hidden;pointer-events:none}
.cx-chat-bg img{width:100%;height:100%;object-fit:cover;display:block;opacity:.55}
.cx-chat-bg.photo:after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(4,10,18,.35),rgba(4,10,18,.72))}
.cx-shell[data-theme="light"] .cx-chat-bg img{opacity:.55}
.cx-shell[data-theme="light"] .cx-chat-bg.photo:after{background:linear-gradient(180deg,rgba(238,246,251,.28),rgba(238,246,251,.72))}
.cx-compose-mini{height:32px;min-width:32px;padding:0 6px;border:1px solid rgba(30,70,92,.7);background:rgba(7,20,32,.55);color:var(--cx-text-dim);font-size:13px;line-height:1;cursor:pointer;flex:none;display:inline-flex;align-items:center;justify-content:center}
.cx-compose-mini:hover{color:var(--cx-accent);border-color:var(--cx-accent)}
.cx-shell[data-theme="light"] .cx-compose-mini{background:#fff;border-color:#bcd4e1;color:#33586a}

/* 右键菜单：数字人 / 背景（2026-11-06） */
.cx-ctxmenu{position:fixed;z-index:600;min-width:176px;padding:4px;background:var(--cx-surface-1);border:1px solid var(--cx-border);box-shadow:var(--cx-shadow)}
.cx-ctxmenu-t{padding:6px 10px 5px;font:700 9px/1.2 var(--cx-font);letter-spacing:.12em;color:var(--cx-text-faint);border-bottom:1px solid var(--cx-border);margin-bottom:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cx-ctxmenu button{display:block;width:100%;text-align:left;padding:7px 10px;border:0;background:transparent;color:var(--cx-text);font:11px/1.4 var(--cx-font);cursor:pointer;white-space:nowrap}
.cx-ctxmenu button:hover{background:color-mix(in srgb,var(--cx-accent) 14%,transparent);color:var(--cx-accent)}
.cx-chat-actions .cx-btn.on{color:var(--cx-accent);border-color:var(--cx-accent);background:color-mix(in srgb,var(--cx-accent) 12%,transparent)}

.cx-shell[data-theme="light"] .cx-init .cx-input{background:rgba(4,16,26,.92);border-color:rgba(62,231,255,.28);color:#e6fbff}
.cx-shell[data-theme="light"] .cx-init .cx-input:focus{border-color:var(--cx-cyan);box-shadow:0 0 0 2px rgba(62,231,255,.18)}
.cx-shell[data-theme="light"] .cx-init .cx-form label{color:#8fb8c9}
.cx-shell[data-theme="light"] .cx-init .cx-btn{background:rgba(8,26,40,.92);border:1px solid rgba(62,231,255,.35);color:#cfeff9}
.cx-shell[data-theme="light"] .cx-init .cx-btn:hover{border-color:var(--cx-cyan);color:#eaffff}
.cx-shell[data-theme="light"] .cx-init .cx-btn.pri{background:linear-gradient(90deg,rgba(10,108,134,.95),rgba(10,143,106,.95));border-color:var(--cx-cyan);color:#eaffff;box-shadow:0 0 18px rgba(62,231,255,.35)}

.cx-init-wiz{display:flex;gap:6px;margin:4px 0 12px}
.cx-init-tab{flex:1;display:flex;flex-direction:column;gap:2px;padding:8px 10px;border:1px solid rgba(62,231,255,.25);background:rgba(6,22,34,.7);color:#8fb8c9;cursor:pointer;text-align:left;font:10px var(--cx-mono);border-radius:2px}
.cx-init-tab b{color:var(--cx-cyan);font-size:11px}
.cx-init-tab i{font-size:8px;letter-spacing:.1em;color:rgba(143,184,201,.6);font-style:normal}
.cx-init-tab.on{border-color:var(--cx-cyan);background:rgba(62,231,255,.12);color:#eaffff;box-shadow:0 0 16px rgba(62,231,255,.25)}
.cx-init-tab.done b:after{content:" ✓";color:var(--cx-green)}
.cx-init-modes{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:10px}
.cx-init-mode{display:flex;flex-direction:column;gap:2px;padding:7px 8px;border:1px solid rgba(62,231,255,.22);background:rgba(4,14,22,.8);color:#8fb8c9;cursor:pointer;text-align:left;border-radius:2px}
.cx-init-mode b{font-size:10px;color:#cfeff9}
.cx-init-mode span{font-size:8px;color:#6f97a9}
.cx-init-mode.on{border-color:var(--cx-cyan);background:rgba(62,231,255,.12);box-shadow:0 0 14px rgba(62,231,255,.25)}
.cx-init-mode.on b{color:#eaffff}
.cx-init-login{display:flex;align-items:center;gap:10px;margin-top:10px;font:9px var(--cx-mono);flex-wrap:wrap}
.cx-init-login .ok{color:var(--cx-green)}
.cx-init-login .err{color:var(--cx-red)}
.cx-init-grid2{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.cx-init-sub{display:flex;flex-direction:column;gap:6px}
.cx-init-sub h3{margin:0;font:10px var(--cx-mono);letter-spacing:.12em;color:var(--cx-cyan)}
.cx-init-pic{height:120px;border:1px dashed rgba(62,231,255,.35);border-radius:4px;display:flex;align-items:center;justify-content:center;cursor:pointer;overflow:hidden;background:rgba(4,16,26,.6)}
.cx-init-pic img{width:100%;height:100%;object-fit:cover}
.cx-init-pic .ph{display:flex;flex-direction:column;gap:4px;align-items:center;color:#8fb8c9;font-size:10px}
.cx-init-pic .ph b{color:var(--cx-cyan)}
.cx-init-pic .ph span{font-size:8px;color:#6f97a9}
.cx-init-sum{font:9px var(--cx-mono);color:#8fb8c9;margin-top:8px}

`;

    const emitEvent = (detail) => { try { window.dispatchEvent(new CustomEvent('cx-event', { detail })); } catch {} };
    async function api(op, params) {
      const body = { op, ...(params || {}) };
      const started = (typeof performance !== 'undefined' ? performance.now() : Date.now());
      const brief = (() => {
        try {
          const raw = JSON.stringify(body);
          return raw.length > 220 ? raw.slice(0, 220) + '…' : raw;
        } catch { return op; }
      })();
      try {
        window.dispatchEvent(new CustomEvent('cx-debug', { detail: { text: `POST ${window.location.origin}${API}\n${JSON.stringify(body)}` } }));
      } catch {}
      const res = await fetch(API, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
      const text = await res.text();
      let payload;
      try { payload = JSON.parse(text); } catch {
        emitEvent({ kind: 'api', ok: false, op, text: brief, ms: Math.round((typeof performance !== 'undefined' ? performance.now() : Date.now()) - started), error: `HTTP ${res.status}` });
        throw new Error(`HTTP ${res.status} from ${API} (${op}): ${text.slice(0, 160)}`);
      }
      if (Array.isArray(payload.debug)) {
        for (const call of payload.debug) {
          try { window.dispatchEvent(new CustomEvent('cx-debug', { detail: { text: `  ↳ ${call.method} ${call.url}` } })); } catch {}
        }
      }
      if (!payload.ok) {
        emitEvent({ kind: 'api', ok: false, op, text: brief, ms: Math.round((typeof performance !== 'undefined' ? performance.now() : Date.now()) - started), error: String(payload.error || 'request failed') });
        throw new Error(payload.error || 'request failed');
      }
      emitEvent({ kind: 'api', ok: true, op, text: brief, ms: Math.round((typeof performance !== 'undefined' ? performance.now() : Date.now()) - started) });
      return payload.data;
    }

    function Ico({ name, size = 12 }) {
      const d = {
        target: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z M12 11.2a.8.8 0 1 0 0 1.6.8.8 0 0 0 0-1.6Z',
        plan: 'M4 6h3v3H4z M10 7.5h10 M4 15h3v3H4z M10 16.5h10',
        task: 'M4 6h6 M4 12h6 M4 18h6 M13 7l2 2 4-4 M13 15l2 2 4-4',
        report: 'M6 3h8l4 4v14H6z M14 3v4h4 M9 12h6 M9 16h4',
        feedback: 'M4 5h16v10H9l-5 4z M8 9h8 M8 12h5',
        clock: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z M12 7v5l3 2',
        map: 'M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Z M9 4v14 M15 6v14',
      }[name];
      return h('span', { className: `cx-ico cx-ico-${name || 'dot'}` },
        h('svg', { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', style: { display: 'block' } }, h('path', { d: d || '' })));
    }

    function Icon({ size = 15 }) {
      return h('svg', { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': true },
        h('path', { d: 'M12 2 3 7v10l9 5 9-5V7l-9-5Z', stroke: 'currentColor', strokeWidth: 1.5 }),
        h('path', { d: 'M12 12 3 7M12 12l9-5M12 12v10', stroke: 'currentColor', strokeWidth: 1.1, opacity: .7 }),
        h('circle', { cx: 12, cy: 12, r: 1.7, fill: 'currentColor' }));
    }

    function Panel({ index, title, count, tools, children }) {
      return h('section', { className: 'cx-panel' },
        h('div', { className: 'cx-ph' }, h('span', { className: 'idx' }, index), h('span', { className: 'ttl' }, title), h('span', { className: 'cnt' }, count || '')),
        tools ? h('div', { className: 'cx-tools' }, tools) : null,
        h('div', { className: 'cx-list' }, children));
    }

    // 开发模式：VSCode 风格 IDE 的骨架（编辑器、终端、预览后续接入）
    function DevWorkspace({ locale, node, space, nodes, spaces, projects, activeKey, onSelectProject, onCloseProject, onSelectNode, onSelectSpace, onPick }) {
      const zh = locale === 'zh';
      const [dirs, setDirs] = useState({});
      const [expanded, setExpanded] = useState({ '': true });
      const [tabs, setTabs] = useState([]);
      const [activePath, setActivePath] = useState('');
      const [status, setStatus] = useState('');
      const [treeMenu, setTreeMenu] = useState(null);
      const [nameDlg, setNameDlg] = useState(null);
      const [crumbMenu, setCrumbMenu] = useState(null);
      const [showLeft, setShowLeft] = useState(true);
      const [showRight, setShowRight] = useState(true);
      const [showBottom, setShowBottom] = useState(true);
      const [editorErr, setEditorErr] = useState('');
      const [termErr, setTermErr] = useState('');
      const [termTab, setTermTab] = useState('term');
      const [termIds, setTermIds] = useState([1]);
      const [termActive, setTermActive] = useState(1);
      const [termOut, setTermOut] = useState('');
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
        el.onload = () => res(); el.onerror = () => rej(new Error('load failed: ' + src));
        document.head.appendChild(el);
      });
      const ensureCss = (href) => {
        if (document.querySelector(`link[href="${href}"]`)) return;
        const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = href; document.head.appendChild(l);
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
              if (window.monaco && window.monaco.editor) res(window.monaco);
              else { monacoPromise = null; rej(new Error('monaco editor missing')); }
            }, (e) => { monacoPromise = null; rej(e || new Error('monaco load failed')); });
          });
        })();
        return monacoPromise;
      };

      const loadDir = async (p) => {
        if (!node || !space) return;
        try {
          const list = await api('tree', { node, space, path: p });
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
      const openFile = async (p) => {
        setStatus('');
        if (!tabsRef.current.some((t) => t.path === p)) {
          try {
            const r = await api('readFile', { node, space, path: p });
            setTabs((ts) => [...ts, { path: p, name: p.split('/').pop(), content: r.content, dirty: false }]);
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
          await api('writeFile', { node, space, path: t.path, content: value });
          setTabs((ts) => ts.map((x) => x.path === t.path ? { ...x, content: value, dirty: false } : x));
          setStatus(zh ? `已保存 ${t.path}` : `saved ${t.path}`);
        } catch (e) { setStatus(String(e?.message || e)); }
      };
      saveRef.current = save;

      const ideKey = `${node || ''}:${space || ''}`;
      const readIdeOpen = () => { try { return JSON.parse(localStorage.getItem('contextos-devops-dsh:ide-open') || '{}'); } catch { return {}; } };
      useEffect(() => {
        if (!node || !space) return;
        restorePendingRef.current = true;
        setTabs([]); setActivePath(''); setDirs({}); setExpanded({ '': true }); setStatus('');
        loadDir('');
        const saved = readIdeOpen()[ideKey];
        if (!saved || !Array.isArray(saved.tabs) || !saved.tabs.length) { restorePendingRef.current = false; return; }
        let disposed = false;
        (async () => {
          const out = [];
          for (const p of saved.tabs.slice(0, 12)) {
            try { const r = await api('readFile', { node, space, path: p }); out.push({ path: p, name: p.split('/').pop(), content: r.content, dirty: false }); } catch { /* skip missing */ }
          }
          if (disposed) { restorePendingRef.current = false; return; }
          setTabs(out);
          setActivePath(out.some((t) => t.path === saved.active) ? saved.active : (out[0] ? out[0].path : ''));
          restorePendingRef.current = false;
        })();
        return () => { disposed = true; };
      }, [node, space]);
      useEffect(() => {
        if (!node || !space || restorePendingRef.current) return;
        try {
          const all = readIdeOpen();
          all[ideKey] = { tabs: tabs.map((t) => t.path), active: activePath };
          localStorage.setItem('contextos-devops-dsh:ide-open', JSON.stringify(all));
        } catch {}
      }, [tabs, activePath, node, space]);

      useEffect(() => {
        let disposed = false; let ed = null;
        (async () => {
          try {
            const monaco = await loadMonaco();
            if (disposed || !editorHostRef.current) return;
            monacoRef.current = monaco;
            ed = monaco.editor.create(editorHostRef.current, { value: '', theme: 'vs-dark', automaticLayout: true, fontSize: 12, minimap: { enabled: false }, scrollBeyondLastLine: false, tabSize: 4 });
            editorRef.current = ed;
            ed.onDidChangeModelContent(() => {
              const p = activeRef.current;
              if (!p) return;
              const v = ed.getValue();
              setTabs((ts) => ts.map((t) => (t.path === p && t.content !== v ? { ...t, content: v, dirty: true } : t)));
            });
            ed.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => saveRef.current());
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
        const ed = editorRef.current, monaco = monacoRef.current;
        if (!ed || !activeTab) return;
        const lang = (() => {
          const ext = (activeTab.path.split('.').pop() || '').toLowerCase();
          return ({ go: 'go', js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript', json: 'json', css: 'css', html: 'html', md: 'markdown', sh: 'shell', yml: 'yaml', yaml: 'yaml', sql: 'sql', py: 'python' })[ext] || 'plaintext';
        })();
        if (ed.getValue() !== activeTab.content) ed.setValue(activeTab.content);
        try { if (monaco && ed.getModel()) monaco.editor.setModelLanguage(ed.getModel(), lang); } catch {}
      }, [activePath, activeTab && activeTab.path]);

      useEffect(() => {
        Object.keys(termMapRef.current).forEach((id) => {
          const x = termMapRef.current[id];
          try { x.ws && x.ws.close(); } catch {}
          try { x.term && x.term.dispose(); } catch {}
        });
        termMapRef.current = {};
        termHostsRef.current = {};
        setTermIds([1]); setTermActive(1); setTermErr(''); setTermTab('term');
      }, [node, space]);
      useEffect(() => {
        let cancelled = false;
        (async () => {
          try {
            ensureCss('/contextos-devops-dsh/xterm/xterm.css');
            const evalScript = async (src) => {
              const code = await (await fetch(src)).text();
              const fn = new Function('module', 'exports', 'define', 'require', 'window', 'self', 'globalThis', code);
              fn(undefined, undefined, undefined, undefined, window, window, window);
            };
            if (!window.Terminal) await evalScript('/contextos-devops-dsh/xterm/xterm.js');
            if (!window.Terminal) throw new Error('xterm missing');
            if (!(window.FitAddon && window.FitAddon.FitAddon)) await evalScript('/contextos-devops-dsh/xterm/addon-fit.js').catch(() => {});
            const info = await api('spaceDir', { node, space }).catch(() => ({ dir: '' }));
            for (const id of termIds) {
              if (termMapRef.current[id]) continue;
              const host = termHostsRef.current[id];
              if (!host) continue;
              const term = new window.Terminal({ fontSize: 12, fontFamily: 'Menlo, monospace', cursorBlink: true, convertEol: true, theme: { background: '#04101a', foreground: '#cfeff9', cursor: '#42f5a7' } });
              const fit = window.FitAddon && window.FitAddon.FitAddon ? new window.FitAddon.FitAddon() : null;
              if (fit) term.loadAddon(fit);
              term.open(host);
              try { fit && fit.fit(); } catch {}
              const proto = location.protocol === 'https:' ? 'wss' : 'ws';
              const ws = new WebSocket(`${proto}://${location.host}/contextos-devops-dsh/terminal?cwd=${encodeURIComponent(info.dir || '')}`);
              term.onData((d) => { if (ws.readyState === 1) ws.send(d); });
              ws.onmessage = (ev) => { try { term.write(ev.data); } catch {} };
              ws.onclose = () => { try { term.write('\r\n[terminal closed]\r\n'); } catch {} };
              termMapRef.current[id] = { term, ws, fit };
              setTimeout(() => { try { fit && fit.fit(); } catch {} }, 150);
            }
            if (!cancelled) setTermErr('');
          } catch (e) { if (!cancelled) setTermErr(String(e?.message || e)); }
        })();
        const onResize = () => { Object.values(termMapRef.current).forEach((x) => { try { x.fit && x.fit.fit(); } catch {} }); };
        window.addEventListener('resize', onResize);
        return () => { cancelled = true; window.removeEventListener('resize', onResize); };
      }, [termIds, node, space]);
      useEffect(() => () => {
        Object.values(termMapRef.current).forEach((x) => { try { x.ws && x.ws.close(); } catch {}; try { x.term && x.term.dispose(); } catch {} });
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
        try { const list = await api('tree', { node, space, path: p }); setDirs((d) => ({ ...d, [p]: list })); setExpanded((e) => ({ ...e, [p]: true })); } catch (e) { setStatus(String(e?.message || e)); }
      };
      const newEntry = async (entry, isDir) => {
        const dir = dirOf(entry);
        const name = await askName(zh ? (isDir ? '新文件夹名' : '新文件名') : (isDir ? 'Folder name' : 'File name'), '');
        if (!name) return;
        const target = [dir, name].filter(Boolean).join('/');
        try {
          if (isDir) await api('mkdir', { node, space, path: target });
          else await api('writeFile', { node, space, path: target, content: '' });
          await reloadDir(dir);
          if (!isDir) openFile(target);
        } catch (e) { setStatus(String(e?.message || e)); }
      };
      const renameEntry = async (entry) => {
        const dir = dirOf(entry);
        const name = await askName(zh ? '重命名为' : 'Rename to', entry.name);
        if (!name || name === entry.name) return;
        const target = [dir, name].filter(Boolean).join('/');
        try {
          await api('renamePath', { node, space, from: entry.path, to: target });
          closeTab(entry.path);
          await reloadDir(dir);
        } catch (e) { setStatus(String(e?.message || e)); }
      };
      const removeEntry = async (entry) => {
        if (!window.confirm(zh ? `删除「${entry.name}」？` : `Delete "${entry.name}"?`)) return;
        const dir = dirOf(entry);
        try { await api('removePath', { node, space, path: entry.path }); closeTab(entry.path); await reloadDir(dir); }
        catch (e) { setStatus(String(e?.message || e)); }
      };
      const jumpLine = (line) => { const ed = editorRef.current; if (ed) { try { ed.revealLineInCenter(line); ed.setPosition({ lineNumber: line, column: 1 }); ed.focus(); } catch {} } };
      const symbolsOf = (text) => {
        const out = [];
        String(text || '').split('\n').forEach((ln, i) => {
          const m = ln.match(/^\s*func\s+(?:\([^)]*\)\s*)?([A-Za-z_]\w*)/) || ln.match(/^\s*(?:function|class|def|struct|interface|type)\s+([A-Za-z_]\w*)/);
          if (m) out.push({ label: m[1], hint: String(i + 1), action: () => jumpLine(i + 1) });
        });
        return out;
      };
      const menuAt = (el) => { const r = el.getBoundingClientRect(); return { x: Math.max(8, r.left), y: r.bottom + 4 }; };
      const listDir = async (dirPath) => { try { return await api('tree', { node, space, path: dirPath }); } catch { return []; } };
      const dirItems = (dirPath, current) => ev => {
        const pos = menuAt(ev.currentTarget || ev.target);
        listDir(dirPath).then((list) => setCrumbMenu({ ...pos, items: (list || []).map((e) => ({
          label: e.name, hint: e.type === 'dir' ? 'dir' : '', on: e.path === current || (e.type !== 'dir' && e.path === activePath),
          action: () => { if (e.type === 'dir') { setExpanded((m) => ({ ...m, [([dirPath, e.name].filter(Boolean).join('/'))]: true })); } else openFile(e.path); },
        })) }));
      };
      const addTerm = () => { const id = Math.max(0, ...termIds) + 1; setTermIds([...termIds, id]); setTermActive(id); setTermTab('term'); };
      const closeTerm = (id) => {
        const x = termMapRef.current[id];
        try { x && x.ws && x.ws.close(); } catch {}
        try { x && x.term && x.term.dispose(); } catch {}
        delete termMapRef.current[id];
        const rest = termIds.filter((t) => t !== id);
        const next = rest.length ? rest : [1];
        setTermIds(next);
        if (termActive === id) setTermActive(next[0]);
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
      const renderDir = (p, depth) => (dirs[p] || []).map((e) => {
        const isDir = e.type === 'dir';
        const key = p + '/' + e.name;
        const open = !!expanded[key];
        return h(React.Fragment, { key },
          h('div', { className: `cx-tree-item${activePath === e.path ? ' on' : ''}`, style: { paddingLeft: 6 + depth * 12 }, onClick: () => (isDir ? toggleDir(key) : openFile(e.path)), onContextMenu: (ev) => { ev.preventDefault(); ev.stopPropagation(); setTreeMenu({ x: ev.clientX, y: ev.clientY, entry: e }); }, title: e.path },
            isDir ? h('span', { className: 'chev', dangerouslySetInnerHTML: chevHtml(open) }) : h('span', { className: 'chev' }),
            h('span', { className: 'fic', dangerouslySetInnerHTML: isDir ? dirIconHtml(open) : fileIconHtml(e.name) }),
            h('span', { className: 'nm' }, e.name)),
          isDir && open ? renderDir(key, depth + 1) : null);
      });

      const previewUrl = node && space ? `http://127.0.0.1:${node}/s/${space}/` : '';

      return h('div', { className: 'cx-dev-wrap' },
        h('div', { className: 'cx-dev-top' },
          h('div', { className: 'cx-dev-projects' },
            (projects || []).map((p) => h('button', { key: p.key, className: `cx-dev-ptab${p.key === activeKey ? ' on' : ''}`, onClick: () => onSelectProject && onSelectProject(p.key), title: `${p.node} · ${p.space}` },
              h('span', { className: 'nm' }, `${p.node} · ${p.space}`),
              h('button', { className: 'x', onClick: (e) => { e.stopPropagation(); onCloseProject && onCloseProject(p.key); } }, '×')))),
          h('div', { className: 'cx-dev-target' },
            h('button', { className: 'cx-btn xs', onClick: compile, title: zh ? '编译当前项目' : 'Compile' }, zh ? '编译' : 'BUILD'),
            h('select', { className: 'cx-select', value: node || '', onChange: (e) => onSelectNode && onSelectNode(Number(e.target.value)) },
              (nodes || []).map((n) => h('option', { key: n.port, value: n.port }, n.name || `:${n.port}`))),
            h('select', { className: 'cx-select', value: space || '', onChange: (e) => onSelectSpace && onSelectSpace(e.target.value) },
              (spaces || []).map((x) => h('option', { key: x.name, value: x.name }, x.name))))),
        h('div', { className: `cx-dev${showLeft ? '' : ' hide-left'}${showRight ? '' : ' hide-right'}${showBottom ? '' : ' hide-bottom'}` },
        h('section', { className: 'cx-dev-col cx-dev-explorer' },
          h('div', { className: 'cx-dev-h' }, zh ? '资源管理器' : 'EXPLORER', h('span', { className: 'cx-dev-hint' }, node && space ? `${node} · ${space}` : (zh ? '未选择空间' : 'NO SPACE')),
            h('button', { className: 'cx-pm-op', style: { marginLeft: 'auto' }, onClick: () => newEntry({ type: 'dir', path: '', name: '' }, false), title: zh ? '新建文件' : 'New file' }, '+'),
            h('button', { className: 'cx-pm-refresh', onClick: () => reloadDir('') }, '↻')),
          h('div', { className: 'cx-dev-b' },
            !node || !space
              ? h('div', { className: 'cx-empty' }, zh ? '先在服务节点/项目空间上点「编程」打开项目。' : 'Pick a node/space and click CODE.')
              : h('div', { className: 'cx-tree' },
                recentFiles.length ? h('div', { className: 'cx-tree-recent' },
                  h('div', { className: 'cx-tree-sect' }, h('span', { className: 'chev', dangerouslySetInnerHTML: chevHtml(true) }), zh ? '最近打开的文件' : 'RECENT'),
                  recentFiles.slice(0, 8).map((p) => h('div', { key: 'r:' + p, className: `cx-tree-item${activePath === p ? ' on' : ''}`, style: { paddingLeft: 6 }, onClick: () => openFile(p) },
                    h('span', { className: 'chev' }),
                    h('span', { className: 'fic', dangerouslySetInnerHTML: fileIconHtml(p) }),
                    h('span', { className: 'nm' }, p.split('/').pop()))),
                  h('div', { className: 'cx-tree-sect' }, h('span', { className: 'chev', dangerouslySetInnerHTML: chevHtml(true) }), zh ? '资源管理器' : 'WORKSPACE')) : null,
                renderDir('', 0)),
            status ? h('div', { className: 'cx-dev-status' }, status) : null)),
        h('section', { className: 'cx-dev-col cx-dev-editor' },
          h('div', { className: 'cx-dev-h' }, 'EDITOR', h('span', { className: 'cx-dev-hint' }, activeTab ? activeTab.path : (zh ? '双击左侧文件' : 'OPEN A FILE'))),
          h('div', { className: 'cx-tabs' }, tabs.map((t) => h('div', { key: t.path, className: `cx-tab${t.path === activePath ? ' on' : ''}`, onClick: () => setActivePath(t.path), title: t.path },
            h('span', { className: 'ico', dangerouslySetInnerHTML: fileIconHtml(t.name, 12) }),
            h('span', { className: 'nm' }, t.name + (t.dirty ? ' ●' : '')),
            h('button', { className: 'x', onClick: (e) => { e.stopPropagation(); closeTab(t.path); } }, '×')))),
          h('div', { className: 'cx-crumb' },
            h('span', { className: 'seg', title: 'node', onClick: (ev) => { ev.stopPropagation(); setCrumbMenu({ ...menuAt(ev.currentTarget), items: (nodes || []).map((n) => ({ label: n.name || `:${n.port}`, hint: ':' + n.port, on: n.port === node, action: () => onSelectNode && onSelectNode(n.port) })) }); } }, h('span', { className: 'ci', dangerouslySetInnerHTML: nodeIconHtml(true) }), String(node || '')),
            h('span', { className: 'sep' }, '›'),
            h('span', { className: 'seg', title: 'space', onClick: (ev) => { ev.stopPropagation(); setCrumbMenu({ ...menuAt(ev.currentTarget), items: (spaces || []).map((x) => ({ label: x.name, hint: '', on: x.name === space, action: () => onSelectSpace && onSelectSpace(x.name) })) }); } }, h('span', { className: 'ci', dangerouslySetInnerHTML: spaceIconHtml() }), space || ''),
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
              h('button', { className: `cx-pm-op${showLeft ? ' on' : ''}`, onClick: () => setShowLeft((v) => !v), title: zh ? '左侧栏' : 'Left panel' }, '▌'),
              h('button', { className: `cx-pm-op${showBottom ? ' on' : ''}`, onClick: () => setShowBottom((v) => !v), title: zh ? '输出栏' : 'Bottom panel' }, '▄'),
              h('button', { className: `cx-pm-op${showRight ? ' on' : ''}`, onClick: () => setShowRight((v) => !v), title: zh ? '右侧栏' : 'Right panel' }, '▐'),
              h('button', { className: 'cx-pm-op', onClick: () => save(), title: zh ? '保存' : 'Save' }, '⤓'),
              h('button', { className: 'cx-pm-op', onClick: () => { if (activePath) reloadDir(''); }, title: zh ? '重新加载目录' : 'Reload' }, '↻'),
              h('button', { className: 'cx-pm-op', onClick: () => { try { navigator.clipboard.writeText([node, space, activePath].filter(Boolean).join(' / ')); } catch {} setStatus(zh ? '路径已复制' : 'path copied'); }, title: zh ? '复制路径' : 'Copy path' }, '⧉'))),
          h('div', { className: 'cx-dev-b cx-editor-wrap' },
            h('div', { className: 'cx-editor-host', ref: editorHostRef, style: editorErr ? { display: 'none' } : null }),
            editorErr ? h('textarea', {
              className: 'cx-editor-ta', ref: taRef, value: activeTab ? activeTab.content : '', spellCheck: false,
              onChange: (e) => { const v = e.target.value; setTabs((ts) => ts.map((t) => (t.path === activePath ? { ...t, content: v, dirty: true } : t))); },
            }) : null,
            editorErr ? h('div', { className: 'cx-dev-status err' }, `${editorErr} · ${zh ? '已回退到基础编辑器' : 'fallback editor'}`) : null),
          h('div', { className: 'cx-dev-statusbar' },
            h('span', null, node ? `:${node}` : ''), h('span', null, space || ''),
            h('button', { className: 'cx-btn', onClick: () => save() }, zh ? '保存' : 'SAVE'))),
        h('section', { className: 'cx-dev-col cx-dev-preview' },
          h('div', { className: 'cx-dev-h' }, 'PREVIEW', h('span', { className: 'cx-dev-hint' }, previewUrl ? space : (zh ? '未选择空间' : 'NO SPACE')),
            h('button', { className: 'cx-pm-refresh', style: { marginLeft: 'auto' }, onClick: () => { const f = document.querySelector('.cx-preview-frame'); if (f) { try { f.src = previewUrl; } catch {} } }, title: T('刷新') }, '↻')),
          h('div', { className: 'cx-dev-b cx-preview-wrap' },
            previewUrl ? h('iframe', { className: 'cx-preview-frame', src: previewUrl, title: 'preview' }) : h('div', { className: 'cx-empty' }, zh ? '选择节点/项目空间后显示预览' : 'Pick a node/space to preview'))),
        h('section', { className: 'cx-dev-col cx-dev-term' },
          h('div', { className: 'cx-dev-h cx-term-h' },
            h('div', { className: 'cx-term-tabs' },
              h('button', { className: `cx-term-tab${termTab === 'term' ? ' on' : ''}`, onClick: () => setTermTab('term') }, zh ? '终端' : 'TERMINAL'),
              h('button', { className: `cx-term-tab${termTab === 'out' ? ' on' : ''}`, onClick: () => setTermTab('out') }, zh ? '输出' : 'OUTPUT')),
            h('span', { className: 'cx-dev-hint' }, `${node || ''} · ${space || ''}`),
            h('div', { className: 'cx-term-sessions' },
              termIds.map((id) => h('span', { key: id, className: `cx-term-sess${id === termActive && termTab === 'term' ? ' on' : ''}`,
                onClick: () => { setTermActive(id); setTermTab('term'); setTimeout(() => { const x = termMapRef.current[id]; try { x && x.fit && x.fit.fit(); } catch {} }, 60); } },
                h('span', { className: 'n' }, String(id)),
                termIds.length > 1 ? h('button', { className: 'x', onClick: (ev) => { ev.stopPropagation(); closeTerm(id); } }, '×') : null)),
              h('button', { className: 'cx-term-add', onClick: addTerm, title: zh ? '新建终端' : 'New terminal' }, '+'))),
          h('div', { className: 'cx-dev-b cx-term-wrap' },
            termTab === 'out'
              ? h('pre', { className: 'cx-term-out' }, termOut || (zh ? '（暂无输出，点上方「编译」生成）' : 'no output'))
              : termIds.map((id) => h('div', { key: id, className: 'cx-term-host', style: id === termActive ? null : { display: 'none' }, ref: (el) => { if (el) termHostsRef.current[id] = el; } })),
            termErr ? h('div', { className: 'cx-dev-status err' }, termErr) : null))),
        nameDlg ? h('div', { className: 'cx-namedlg' },
          h('div', { className: 't' }, nameDlg.title),
          h('input', { className: 'cx-input', value: nameDlg.value, autoFocus: true,
            onChange: (e) => setNameDlg((d) => ({ ...d, value: e.target.value })),
            onKeyDown: (e) => { if (e.key === 'Enter') { const v = nameDlg.value; const r = nameDlg.resolve; setNameDlg(null); r(v); } if (e.key === 'Escape') { const r = nameDlg.resolve; setNameDlg(null); r(''); } } }),
          h('div', { className: 'b' },
            h('button', { className: 'cx-btn', onClick: () => { const r = nameDlg.resolve; setNameDlg(null); r(''); } }, T('取消')),
            h('button', { className: 'cx-btn pri', onClick: () => { const v = nameDlg.value; const r = nameDlg.resolve; setNameDlg(null); r(v); } }, T('保存')))) : null,
        crumbMenu ? h('div', { className: 'cx-tree-menu', style: { left: crumbMenu.x, top: crumbMenu.y }, onClick: (e) => e.stopPropagation() },
          crumbMenu.items.map((it, i) => h('button', { key: i, className: `cx-menu-item${it.on ? ' on' : ''}`, onClick: () => { setCrumbMenu(null); it.action(); } },
            it.label, it.hint ? h('span', { className: 'hint' }, it.hint) : null))) : null,
        treeMenu ? h('div', { className: 'cx-tree-menu', style: { left: treeMenu.x, top: treeMenu.y }, onClick: (e) => e.stopPropagation() },
          h('button', { className: 'cx-menu-item', onClick: () => { const t = treeMenu.entry; setTreeMenu(null); newEntry(t, false); } }, zh ? '新建文件' : 'New file'),
          h('button', { className: 'cx-menu-item', onClick: () => { const t = treeMenu.entry; setTreeMenu(null); newEntry(t, true); } }, zh ? '新建文件夹' : 'New folder'),
          h('button', { className: 'cx-menu-item', onClick: () => { const t = treeMenu.entry; setTreeMenu(null); renameEntry(t); } }, zh ? '重命名' : 'Rename'),
          h('button', { className: 'cx-menu-item danger', onClick: () => { const t = treeMenu.entry; setTreeMenu(null); removeEntry(t); } }, zh ? '删除' : 'Delete')) : null);
    }

    function MenuButton({ items, disabled }) {
      const [open, setOpen] = useState(false);
      return h('span', { className: 'cx-menu-wrap' },
        h('button', { className: 'cx-btn xs', type: 'button', disabled, title: '⋯', onClick: (e) => { e.stopPropagation(); setOpen((v) => !v); } }, '⋯'),
        open ? h('div', { className: 'cx-menu' }, (items || []).map((it, i) => h('button', {
          key: i, className: `cx-menu-item${it.danger ? ' danger' : ''}`, type: 'button',
          onClick: (e) => { e.stopPropagation(); setOpen(false); it.action(); },
        }, T(it.label)))) : null);
    }

    function Modal({ title, desc, onClose, children }) {
      return h('div', { className: 'cx-modal', onMouseDown: (e) => { if (e.target === e.currentTarget) onClose(); } },
        h('div', { className: 'cx-card' }, h('h2', null, title), desc ? h('div', { className: 'desc' }, desc) : null, children));
    }

    function SceneModal({ scene, onClose, onSave }) {
      const p = scene?.params || {};
      const tzDefault = (typeof Intl !== 'undefined' && Intl.DateTimeFormat().resolvedOptions().timeZone) || 'Asia/Shanghai';
      const [name, setName] = useState(scene?.name || '');
      const [theme, setTheme] = useState(p.theme || 'system');
      const [lang, setLang] = useState(p.lang || 'system');
      const [timezone, setTimezone] = useState(p.timezone || tzDefault);
      const [location, setLocation] = useState(p.location || '');
      return h(Modal, { title: '赛博世界设置 / CYBER WORLD', desc: '这些参数属于当前赛博世界：切换赛博世界会自动跟随；没设置的用系统默认。', onClose },
        h('div', { className: 'cx-form' },
          h('label', { className: 'cx-field full' }, '名称', h('input', { className: 'cx-input', value: name, placeholder: '例如 我的赛博世界', onChange: (e) => setName(e.target.value) })),
          h('label', { className: 'cx-field full' }, '主题', h('select', { className: 'cx-select', value: theme, onChange: (e) => setTheme(e.target.value) },
            h('option', { value: 'system' }, '跟随系统'), h('option', { value: 'light' }, '浅色'), h('option', { value: 'dark' }, '深色'))),
          h('label', { className: 'cx-field full' }, '语言', h('select', { className: 'cx-select', value: lang, onChange: (e) => setLang(e.target.value) },
            h('option', { value: 'system' }, '跟随系统'), h('option', { value: 'zh' }, '中文'), h('option', { value: 'en' }, 'English'))),
          h('label', { className: 'cx-field full' }, '时区', h('input', { className: 'cx-input', value: timezone, placeholder: tzDefault, onChange: (e) => setTimezone(e.target.value) })),
          h('label', { className: 'cx-field full' }, '地点', h('input', { className: 'cx-input', value: location, placeholder: '例如 深圳市', onChange: (e) => setLocation(e.target.value) }))),
        h('div', { className: 'cx-foot' },
          h('button', { className: 'cx-btn', onClick: onClose }, T('取消')),
          h('button', { className: 'cx-btn pri', onClick: () => onSave({ name: name.trim(), theme, lang, timezone, location }) }, T('保存'))));
    }

    function AvatarEditModal({ avatar, onClose, onSave }) {
      const [form, setForm] = useState({
        name: avatar?.name || '', city: avatar?.city || '', company: avatar?.company || '',
        persona: avatar?.persona || '', preferences: avatar?.preferences || '', style: avatar?.style || '',
      });
      const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
      return h(Modal, { title: '修改分身 / AVATAR', desc: '这些信息属于当前数字分身，创建实例与对话上下文都会带上。', onClose },
        h('div', { className: 'cx-form' },
          h('label', { className: 'cx-field full' }, '名称', h('input', { className: 'cx-input', value: form.name, onChange: set('name') })),
          h('label', { className: 'cx-field full' }, '城市', h('input', { className: 'cx-input', value: form.city, onChange: set('city') })),
          h('label', { className: 'cx-field full' }, '公司', h('input', { className: 'cx-input', value: form.company, onChange: set('company') })),
          h('label', { className: 'cx-field full' }, '人格', h('input', { className: 'cx-input', value: form.persona, onChange: set('persona'), placeholder: '专业、亲和、直接' })),
          h('label', { className: 'cx-field full' }, '偏好', h('input', { className: 'cx-input', value: form.preferences, onChange: set('preferences'), placeholder: '技术、产品、效率' })),
          h('label', { className: 'cx-field full' }, '风格', h('input', { className: 'cx-input', value: form.style, onChange: set('style'), placeholder: '简洁、结构化' }))),
        h('div', { className: 'cx-foot' },
          h('button', { className: 'cx-btn', onClick: onClose }, T('取消')),
          h('button', { className: 'cx-btn pri', onClick: () => onSave(form) }, T('保存'))));
    }

    function NodeCard({ n, active, onSelect, onStart, onStop, onDelete, onOpen, onIde, locale }) {
      const on = n.state === 'running';
      return h('div', { className: `cx-node${active ? ' on' : ''}`, onClick: () => onSelect(n.port) },
        h('span', { className: `cx-led${on ? ' on' : n.state === 'missing' ? ' warn' : ''}` }),
        h('div', { className: 'cx-main' },
          h('div', { className: 'cx-card-line' },
            h('span', { className: 'cx-name' }, n.name || `node-${n.port}`),
            h('span', { className: `cx-status-r ${on ? 'on' : 'off'}` }, on ? (locale === 'zh' ? '运行中' : 'RUNNING') : (locale === 'zh' ? '离线' : 'OFFLINE'))),
          h('div', { className: 'cx-meta' }, `:${n.port} · ${n.env || (on ? 'worker' : 'offline')} · ${n.size ? Math.round(n.size / 1048576) + 'M' : '—'}`)),
        h('div', { className: 'cx-node-actions' },
          on
            ? h('button', { className: 'cx-btn xs', onClick: (e) => { e.stopPropagation(); onOpen(n.port); } }, locale === 'zh' ? '主页' : 'HOME')
            : h('button', { className: 'cx-btn xs pri', onClick: (e) => { e.stopPropagation(); onStart(n.port); } }, locale === 'zh' ? '启动' : 'START'),
          h('button', { className: 'cx-btn xs', onClick: (e) => { e.stopPropagation(); onIde && onIde(n.port); } }, locale === 'zh' ? '编程' : 'CODE'),
          on ? h(MenuButton, { items: [{ label: '停止', danger: true, action: () => onStop(n.port) }, { label: '删除', danger: true, action: () => onDelete(n.port) }] }) : h(MenuButton, { items: [{ label: '删除', danger: true, action: () => onDelete(n.port) }] })));
    }

    function SpaceCard({ s, active, node, onSelect, onOpen, onStart, onStop, onDelete, onIde, locale }) {
      const on = String(s.status || '').trim() === 'start';
      const iconUrl = (() => {
        const raw = String(s.icons || '').trim();
        if (!raw) return '';
        if (/^https?:\/\//i.test(raw)) return raw;
        const p = raw.startsWith('/') ? raw : `/${raw}`;
        return node ? `http://127.0.0.1:${node}${p}` : p;
      })();
      return h('div', { className: `cx-space${active ? ' on' : ''}`, onClick: () => onSelect(s.name) },
        h('div', { className: 'row' },
          iconUrl ? h('img', { className: 'cx-space-icon', src: iconUrl, alt: '' }) : null,
          h('span', { className: 'nm' }, [s.help, s.name].filter(Boolean).join(' ')),
          h('span', { className: `cx-status-r ${on ? 'on' : 'off'}` }, on ? (locale === 'zh' ? '运行中' : 'start') : (locale === 'zh' ? '已停止' : 'stop'))),
        h('div', { className: 'sub' }, h('span', null, s.version || '—'), h('span', null, s.size || '')),
        h('div', { className: 'cx-space-actions' },
          h('button', { className: 'cx-btn xs', onClick: (e) => { e.stopPropagation(); onIde && onIde(node, s.name); } }, locale === 'zh' ? '编程' : 'CODE'),
          on ? h('button', { className: 'cx-btn xs pri', onClick: (e) => { e.stopPropagation(); onOpen(s.name); } }, locale === 'zh' ? '打开' : 'OPEN') : h('button', { className: 'cx-btn xs pri', onClick: (e) => { e.stopPropagation(); onStart(s.name); } }, locale === 'zh' ? '启动' : 'START'),
          h(MenuButton, { items: on ? [{ label: '停止', danger: true, action: () => onStop(s.name) }, { label: '删除', danger: true, action: () => onDelete(s.name) }] : [{ label: '删除', danger: true, action: () => onDelete(s.name) }] })));
    }

    function AppRow({ a, active, onSelect, onOpen, locale }) {
      return h('div', { className: `cx-app${active ? ' on' : ''}`, onClick: () => onOpen(a) },
        h('div', null,
          h('div', { className: 'an' }, a.title || a.name),
          h('div', { className: 'ac' }, [a.city_name, a.company_name, a.service_name].filter(Boolean).join(' · ') || a.command)),
        h('div', { className: 'aa' },
          h('button', { className: 'cx-btn xs pri', onClick: (e) => { e.stopPropagation(); onOpen(a); } }, locale === 'zh' ? '打开' : 'OPEN')));
    }

    function StoreRow({ s, onCreate, busy, onAction, onCode, onConfig, locale }) {
      const online = s.status === 'online';
      const acts = s.actions || ['create', 'online', 'offline', 'code', 'conf'];
      const has = (x) => acts.includes(x);
      const label = (x) => locale === 'zh' ? ({ create: '创建', online: '上架', offline: '下架', code: '编程', conf: '配置' }[x] || x) : ({ create: 'CREATE', online: 'Online', offline: 'Offline', code: 'Code', conf: 'Config' }[x] || x);
      return h('div', { className: 'cx-store' },
        h('div', { className: 'cx-store-main', onClick: () => !busy && onCreate(s) },
          h('div', { className: 'si' }, (s.name || '?').slice(0, 1)),
          h('div', { style: { flex: 1, minWidth: 0 } },
            h('div', { className: 'cx-store-titleline' },
              h('span', { className: 'sn' }, s.name),
              h('span', { className: `cx-status-r ${online ? 'on' : 'off'}` }, s.status_label || s.status)),
            h('div', { className: 'ss' }, `${s.space} · ${s.command}`))),
        h('div', { className: 'cx-store-actions' },
          has('create') ? h('button', { className: 'cx-btn xs pri', disabled: busy, onClick: (e) => { e.stopPropagation(); onCreate(s); } }, busy ? '…' : label('create')) : null,
          has('online') ? h('button', { className: 'cx-btn xs', disabled: busy, onClick: (e) => { e.stopPropagation(); onAction(s, 'online'); } }, label('online')) : null,
          has('offline') ? h('button', { className: 'cx-btn xs danger', disabled: busy, onClick: (e) => { e.stopPropagation(); onAction(s, 'offline'); } }, label('offline')) : null,
          has('code') ? h('button', { className: 'cx-btn xs', onClick: (e) => { e.stopPropagation(); onCode(s); } }, label('code')) : null,
          has('conf') ? h('button', { className: 'cx-btn xs', onClick: (e) => { e.stopPropagation(); onConfig(s); } }, label('conf')) : null));
    }

    function OfficialSpaces({ node, onDeploy, locale }) {
      const [keys, setKeys] = useState(['community']);
      const items = OFFICIAL;
      const toggle = (k) => setKeys((xs) => xs.includes(k) ? xs.filter((x) => x !== k) : [...xs, k]);
      return h('div', { className: 'cx-official' },
        h('div', { className: 'oh' }, locale === 'zh' ? '一键部署官方空间 / OFFICIAL SPACES' : 'OFFICIAL SPACES / One-click deploy'),
        items.map(([k, label, prefix]) => h('label', { key: k }, h('input', { type: 'checkbox', checked: keys.includes(k), onChange: () => toggle(k) }), `${label} · ${prefix}`)),
        h('button', { className: 'cx-btn xs pri', style: { marginTop: 5 }, disabled: !node || !keys.length, onClick: () => onDeploy(keys) }, locale === 'zh' ? `部署 (${keys.length})` : `DEPLOY (${keys.length})`));
    }

    function DeployModal({ onClose, onDone }) {
      const [port, setPort] = useState('9188');
      const [name, setName] = useState('');
      const [mode, setMode] = useState('copy');
      const [parent, setParent] = useState('');
      const [repo, setRepo] = useState('');
      const [sourceBin, setSourceBin] = useState('');
      const [busy, setBusy] = useState(false);
      const [err, setErr] = useState('');
      const go = async () => {
        setBusy(true); setErr('');
        try { await api('deploy', { port: Number(port), name, mode, parent, repo, sourceBin }); onDone(); }
        catch (e) { setErr(String(e?.message || e)); } finally { setBusy(false); }
      };
      return h(Modal, { title: '部署服务节点 / DEPLOY NODE', desc: 'copy=复用本机 ice.bin；download=从父节点 /publish 下载；source=git clone + miss.sh 编译。端口即节点身份。', onClose },
        h('div', { className: 'cx-form' },
          h('label', { className: 'cx-field' }, 'MODE', h('select', { className: 'cx-select', value: mode, onChange: (e) => setMode(e.target.value) },
            h('option', { value: 'copy' }, 'copy / 本机复制'), h('option', { value: 'download' }, 'download / 下载'), h('option', { value: 'source' }, 'source / 源码构建'))),
          h('label', { className: 'cx-field' }, 'PORT', h('input', { className: 'cx-input', value: port, onChange: (e) => setPort(e.target.value) })),
          h('label', { className: 'cx-field' }, 'NAME', h('input', { className: 'cx-input', value: name, placeholder: 'ContextOS-prod', onChange: (e) => setName(e.target.value) })),
          (mode === 'download' || mode === 'source') ? h('label', { className: 'cx-field' }, 'PARENT', h('input', { className: 'cx-input', value: parent, placeholder: 'https://shylinux.com', onChange: (e) => setParent(e.target.value) })) : null,
          mode === 'source' ? h('label', { className: 'cx-field full' }, 'REPO', h('input', { className: 'cx-input', value: repo, placeholder: 'https://shylinux.com/x/ContextOS', onChange: (e) => setRepo(e.target.value) })) : null,
          mode === 'copy' ? h('label', { className: 'cx-field full' }, 'SOURCE BIN', h('input', { className: 'cx-input', value: sourceBin, placeholder: '留空用 usr/publish，或 /path/bin/ice.bin', onChange: (e) => setSourceBin(e.target.value) })) : null),
        err ? h('div', { className: 'cx-err' }, err) : null,
        h('div', { className: 'cx-foot' }, h('button', { className: 'cx-btn', onClick: onClose }, T('取消')), h('button', { className: 'cx-btn pri', disabled: busy, onClick: go }, busy ? 'DEPLOYING…' : 'DEPLOY')));
    }

    function SpaceModal({ node, onClose, onDone }) {
      const [name, setName] = useState('project');
      const [busy, setBusy] = useState(false);
      const [err, setErr] = useState('');
      const go = async () => {
        setBusy(true); setErr('');
        try {
          const created = await api('createSpace', { node: Number(node), name });
          await api('initSpace', { node: Number(node), space: created.name });
          onDone(created.name);
        } catch (e) { setErr(String(e?.message || e)); } finally { setBusy(false); }
      };
      return h(Modal, { title: '创建项目空间 / CREATE WORKSPACE', desc: '不指定 repos：dream create 建空空间 → web.code.git.status init 生成 .git / src/main.go / go.mod 骨架。', onClose },
        h('div', { className: 'cx-form' }, h('label', { className: 'cx-field full' }, 'SPACE NAME', h('input', { className: 'cx-input', value: name, placeholder: 'project', onChange: (e) => setName(e.target.value) }))),
        h('div', { className: 'desc' }, '空间名只用字母、数字、下划线；服务端自动加 YYYYMMDD- 前缀。'),
        err ? h('div', { className: 'cx-err' }, err) : null,
        h('div', { className: 'cx-foot' }, h('button', { className: 'cx-btn', onClick: onClose }, T('取消')), h('button', { className: 'cx-btn pri', disabled: busy, onClick: go }, busy ? 'CREATING…' : 'CREATE + INIT')));
    }

    function AppModal({ node, space, onClose, onDone }) {
      const [name, setName] = useState('yuangong');
      const [help, setHelp] = useState('员工管理');
      const [place, setPlace] = useState('employee');
      const [value, setValue] = useState('profile,position,skill,experience,education,record');
      const [trans, setTrans] = useState('员工信息，工作岗位，专业技能，工作经验，教育经历，事件记录');
      const [busy, setBusy] = useState(false);
      const [err, setErr] = useState('');
      const go = async () => {
        setBusy(true); setErr('');
        try {
          const r = await api('autogenApp', { node: Number(node), space, name, help, place, value, trans });
          onDone(r);
        } catch (e) { setErr(String(e?.message || e)); } finally { setBusy(false); }
      };
      return h(Modal, { title: '生成应用 / GENERATE APP', desc: '云社区 service/autogen 按应用平台风格生成：portal.json + 五角色 + 列表/创建 + 看板；随后 compile。', onClose },
        h('div', { className: 'cx-form' },
          h('label', { className: 'cx-field' }, 'APP NAME', h('input', { className: 'cx-input', value: name, onChange: (e) => setName(e.target.value) })),
          h('label', { className: 'cx-field' }, 'TITLE', h('input', { className: 'cx-input', value: help, onChange: (e) => setHelp(e.target.value) })),
          h('label', { className: 'cx-field' }, 'PLACE', h('input', { className: 'cx-input', value: place, onChange: (e) => setPlace(e.target.value) })),
          h('label', { className: 'cx-field' }, 'VALUE (comma)', h('input', { className: 'cx-input', value: value, onChange: (e) => setValue(e.target.value) })),
          h('label', { className: 'cx-field full' }, 'TRANS (Chinese)', h('input', { className: 'cx-input', value: trans, onChange: (e) => setTrans(e.target.value) }))),
        err ? h('div', { className: 'cx-err' }, err) : null,
        h('div', { className: 'cx-foot' }, h('button', { className: 'cx-btn', onClick: onClose }, T('取消')), h('button', { className: 'cx-btn pri', disabled: busy, onClick: go }, busy ? 'GENERATING…' : 'GENERATE + BUILD')));
    }

    function CodeModal({ node, space, app, onClose }) {
      const [files, setFiles] = useState([]);
      const [showMore, setShowMore] = useState(false);
      const [pm, setPm] = useState(null);
      const [targetId, setTargetId] = useState('');
      const [planId, setPlanId] = useState('');
      const [taskId, setTaskId] = useState('');
      const [reportId, setReportId] = useState('');
      const [feedbackId, setFeedbackId] = useState('');
      const bootCal = (() => { try { return JSON.parse(localStorage.getItem('contextos-devops-dsh:cal') || 'null') || {}; } catch { return {}; } })();
      const [calStart, setCalStart] = useState(bootCal.start || '');
      const [calEnd, setCalEnd] = useState(bootCal.end || '');
      useEffect(() => { try { const prev = JSON.parse(localStorage.getItem('contextos-devops-dsh:cal') || '{}'); localStorage.setItem('contextos-devops-dsh:cal', JSON.stringify({ ...prev, start: calStart, end: calEnd })); } catch {} }, [calStart, calEnd]);
      const [planStatusFilter, setPlanStatusFilter] = useState([]);
      const [taskStatusFilter, setTaskStatusFilter] = useState([]);
      const [reportTypeFilter, setReportTypeFilter] = useState([]);
      const [feedbackStatusFilter, setFeedbackStatusFilter] = useState([]);
      const [pmForm, setPmForm] = useState(null);
      const sessionStateRef = useRef({ key: '', ready: false, msgs: [] });
      const seedingRef = useRef(false);
      const [file, setFile] = useState('portal.go');
      const [content, setContent] = useState('');
      const [msg, setMsg] = useState('');
      const [busy, setBusy] = useState(false);
      const [err, setErr] = useState('');
      useEffect(() => {
        let alive = true;
        api('listDir', { node, space, path: `src/${app.name}` }).then((d) => {
          if (!alive) return;
          const list = (d.entries || []).filter((e) => e.type === 'file' && /\.(go|json|js|css|md)$/.test(e.name));
          setFiles(list);
          const pick = list.find((e) => e.name === 'portal.go') || list[0];
          if (pick) setFile(pick.name);
        }).catch((e) => setErr(String(e?.message || e)));
        return () => { alive = false; };
      }, [node, space, app.name]);
      useEffect(() => {
        if (!file) return;
        let alive = true;
        api('readFile', { node, space, path: `src/${app.name}/${file}` }).then((d) => { if (alive) setContent(d.content || ''); }).catch((e) => { if (alive) setErr(String(e?.message || e)); });
        return () => { alive = false; };
      }, [node, space, app.name, file]);
      const save = async (build) => {
        setBusy(true); setErr(''); setMsg('');
        try {
          await api('writeFile', { node, space, path: `src/${app.name}/${file}`, content });
          setMsg('saved');
          if (build) { await api('buildSpace', { node, space }); setMsg('saved + built'); }
        } catch (e) { setErr(String(e?.message || e)); } finally { setBusy(false); }
      };
      return h(Modal, { title: `CODE / ${app.title || app.name}`, desc: `编辑 ${space}/src/${app.name}；保存后可编译。`, onClose },
        h('div', { className: 'cx-form' },
          h('label', { className: 'cx-field full' }, 'FILE', h('select', { className: 'cx-select', value: file, onChange: (e) => setFile(e.target.value) }, files.map((f) => h('option', { key: f.name, value: f.name }, f.name)))),
          h('label', { className: 'cx-field full' }, 'CONTENT', h('textarea', { className: 'cx-area', style: { minHeight: 300 }, value: content, spellCheck: false, onChange: (e) => setContent(e.target.value) }))),
        msg ? h('div', { className: 'desc' }, msg) : null,
        err ? h('div', { className: 'cx-err' }, err) : null,
        h('div', { className: 'cx-foot' }, h('button', { className: 'cx-btn', onClick: onClose }, T('关闭')), h('button', { className: 'cx-btn', disabled: busy, onClick: () => save(false) }, busy ? '…' : 'SAVE'), h('button', { className: 'cx-btn pri', disabled: busy, onClick: () => save(true) }, 'SAVE + BUILD')));
    }

    function InstanceModal({ node, space, app, avatar, onClose, onDone }) {
      const [name, setName] = useState(app.title || '我的应用');
      const [city, setCity] = useState(avatar?.city || '深圳市');
      const [company, setCompany] = useState(avatar?.company || '云轩领航');
      const [busy, setBusy] = useState(false);
      const [err, setErr] = useState('');
      const go = async () => {
        setBusy(true); setErr('');
        try { const r = await api('createInstance', { node, space, command: app.command, place: app.place || '', name, city, company, uid: avatar?.uid || '' }); onDone(r); }
        catch (e) { setErr(String(e?.message || e)); } finally { setBusy(false); }
      };
      return h(Modal, { title: `CREATE INSTANCE / ${app.title || app.name}`, desc: `在 ${space} 用 ${app.command} 建实例；实例行会出现在该用户的 recent 列表。`, onClose },
        h('div', { className: 'cx-form' },
          h('label', { className: 'cx-field full' }, 'INSTANCE NAME', h('input', { className: 'cx-input', value: name, onChange: (e) => setName(e.target.value) })),
          h('label', { className: 'cx-field' }, 'CITY', h('input', { className: 'cx-input', value: city, onChange: (e) => setCity(e.target.value) })),
          h('label', { className: 'cx-field' }, 'COMPANY', h('input', { className: 'cx-input', value: company, onChange: (e) => setCompany(e.target.value) }))),
        err ? h('div', { className: 'cx-err' }, err) : null,
        h('div', { className: 'cx-foot' }, h('button', { className: 'cx-btn', onClick: onClose }, T('取消')), h('button', { className: 'cx-btn pri', disabled: busy, onClick: go }, busy ? 'CREATING…' : 'CREATE INSTANCE')));
    }

    function StoreInstanceModal({ node, service, avatar, onClose, onDone }) {
      const [city, setCity] = useState(avatar?.city || '深圳市');
      const [company, setCompany] = useState(avatar?.company || '云轩领航');
      const [name, setName] = useState(String(service.name || '').split(/\s+/)[0] || '我的应用');
      const [busy, setBusy] = useState(false);
      const [err, setErr] = useState('');
      const go = async () => {
        setBusy(true); setErr('');
        try { const r = await api('createStoreInstance', { node, service, city, company, name, uid: avatar?.uid || '' }); onDone(r); }
        catch (e) { setErr(String(e?.message || e)); } finally { setBusy(false); }
      };
      return h(Modal, { title: `CREATE INSTANCE / ${service.name}`, desc: '从应用商店模板创建实例：城市 + 公司 + 应用名称三个参数。', onClose },
        h('div', { className: 'cx-form' },
          h('label', { className: 'cx-field full' }, 'CITY / 城市名称', h('input', { className: 'cx-input', value: city, onChange: (e) => setCity(e.target.value) })),
          h('label', { className: 'cx-field full' }, 'COMPANY / 公司名称', h('input', { className: 'cx-input', value: company, onChange: (e) => setCompany(e.target.value) })),
          h('label', { className: 'cx-field full' }, 'APP NAME / 应用名称', h('input', { className: 'cx-input', value: name, onChange: (e) => setName(e.target.value) }))),
        h('div', { className: 'desc' }, `space: ${service.space} · command: ${service.command}`),
        err ? h('div', { className: 'cx-err' }, err) : null,
        h('div', { className: 'cx-foot' }, h('button', { className: 'cx-btn', onClick: onClose }, T('取消')), h('button', { className: 'cx-btn pri', disabled: busy, onClick: go }, busy ? 'CREATING…' : 'CREATE INSTANCE')));
    }

    function AvatarModal({ node, data, active, onSelect, onCreated, onUpdated, onClose }) {
      const QUESTIONS = [
        { key: 'name', q: '先给分身起个名字？', d: '我的分身' },
        { key: 'city', q: '所在城市？', d: '深圳市' },
        { key: 'company', q: '公司名称？', d: '云轩领航' },
        { key: 'persona', q: '人格设定？例如：专业、稳重、直接', d: '专业、稳重、直接' },
        { key: 'preferences', q: '喜好/关注什么？例如：技术、产品、效率', d: '技术、产品、效率' },
        { key: 'style', q: '表达风格？例如：简洁、结构化、少客套', d: '简洁、结构化' },
      ];
      const [step, setStep] = useState(-1);
      const [answers, setAnswers] = useState({});
      const [msgs, setMsgs] = useState([]);
      const [input, setInput] = useState('');
      const [busy, setBusy] = useState(false);
      const [err, setErr] = useState('');
      const [skill, setSkill] = useState('');
      const imageRef = useRef(null);
      const update = async (patch) => {
        if (!active?.uid) return;
        setBusy(true); setErr('');
        try { const a = await api('updateAvatar', { node, uid: active.uid, patch }); onUpdated?.(a); }
        catch (e) { setErr(String(e?.message || e)); } finally { setBusy(false); }
      };
      const upload = (file) => {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
          const img = new Image();
          img.onload = () => {
            const max = 512, scale = Math.min(1, max / Math.max(img.width, img.height));
            const canvas = document.createElement('canvas');
            canvas.width = Math.round(img.width * scale); canvas.height = Math.round(img.height * scale);
            canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
            update({ image: canvas.toDataURL('image/jpeg', 0.86) });
          };
          img.src = String(reader.result);
        };
        reader.readAsDataURL(file);
      };
      const begin = () => {
        setStep(0); setAnswers({}); setMsgs([{ role: 'ai', text: QUESTIONS[0].q }]); setInput('');
      };
      const send = () => {
        if (step < 0 || step >= QUESTIONS.length) return;
        const q = QUESTIONS[step];
        const value = (input.trim() || q.d);
        const nextAnswers = { ...answers, [q.key]: value };
        setAnswers(nextAnswers);
        setMsgs((xs) => [...xs, { role: 'user', text: value }]);
        setInput('');
        if (step + 1 < QUESTIONS.length) {
          setMsgs((xs) => [...xs, { role: 'ai', text: QUESTIONS[step + 1].q }]);
          setStep(step + 1);
        } else {
          setStep(QUESTIONS.length);
          setMsgs((xs) => [...xs, { role: 'ai', text: '信息齐了。确认后创建分身，使用独立 user.uid。' }]);
        }
      };
      const create = async () => {
        setBusy(true); setErr('');
        try {
          const a = await api('createAvatar', { node, ...answers });
          onCreated(a);
        } catch (e) { setErr(String(e?.message || e)); } finally { setBusy(false); }
      };
      const choose = async (a) => {
        setBusy(true); setErr('');
        try { await api('setAvatar', { node, uid: a.uid }); onSelect(a); }
        catch (e) { setErr(String(e?.message || e)); } finally { setBusy(false); }
      };
      return h(Modal, { title: '数字分身 / DIGITAL AVATARS', desc: '每个分身有独立 user.uid、公司、城市、人格、喜好、风格。', onClose },
        h('div', { className: 'cx-avatar-list' }, (data?.items || []).map((a) => h('div', { key: a.uid, className: `cx-avatar${active?.uid === a.uid ? ' on' : ''}`, onClick: () => choose(a) },
          h('span', { className: 'cx-led on' }),
          h('div', { style: { flex: 1, minWidth: 0 } },
            h('div', { className: 'an' }, a.name || a.username),
            h('div', { className: 'ad' }, `${a.city || '—'} · ${a.company || '—'} · ${a.persona || '—'} · ${a.style || '—'}`),
            h('div', { className: 'ad' }, a.project?.place_uid ? `项目：${a.project.name || a.project.space}` : (a.project?.error ? `项目：${a.project.error}` : '项目：未创建'))),
          h('span', { className: 'cx-tag cy' }, active?.uid === a.uid ? 'ACTIVE' : 'SELECT')))),
        active ? h('div', { className: 'cx-avatar-extra' },
          h('div', { className: 'cx-avatar-preview' }, active.image ? h('img', { src: active.image, alt: '' }) : h('span', null, '3D')),
          h('div', { style: { flex: 1, minWidth: 0 } },
            h('div', { className: 'cx-avatar-extra-title' }, '形象与技能'),
            h('div', { className: 'cx-avatar-extra-sub' }, '上传照片生成你的数字人形象；技能会进入 AI 上下文。'),
            h('div', { className: 'cx-avatar-skills' }, (active.skills || []).map((x, i) => h('span', { key: i, className: 'cx-tag cy' }, x, h('button', { className: 'cx-tag-x', onClick: () => update({ skills: (active.skills || []).filter((_, j) => j !== i) }) }, '×'))), h('span', { className: 'cx-avatar-skill-empty' }, (active.skills || []).length ? '' : '暂无技能')),
            h('div', { className: 'cx-avatar-skill-add' },
              h('input', { className: 'cx-input', value: skill, placeholder: '添加技能，例如 数据分析', onChange: (e) => setSkill(e.target.value), onKeyDown: (e) => { if (e.key === 'Enter' && skill.trim()) { update({ skills: [...(active.skills || []), skill.trim()] }); setSkill(''); } } }),
              h('button', { className: 'cx-btn xs', disabled: !skill.trim() || busy, onClick: () => { update({ skills: [...(active.skills || []), skill.trim()] }); setSkill(''); } }, T('+ 技能')),
              h('button', { className: 'cx-btn xs pri', onClick: () => imageRef.current?.click() }, T('上传形象')))),
          h('input', { type: 'file', ref: imageRef, accept: 'image/*', style: { display: 'none' }, onChange: (e) => { upload(e.target.files?.[0]); e.target.value = ''; } })) : null,
        step < 0
          ? h('div', { className: 'cx-foot' }, h('button', { className: 'cx-btn', onClick: onClose }, T('关闭')), h('button', { className: 'cx-btn pri', onClick: begin }, '+ CREATE AVATAR'))
          : h('div', null,
              h('div', { className: 'cx-chat-b', style: { maxHeight: 220 } }, msgs.map((m, i) => h('div', { key: i, className: `cx-msg ${m.role}` }, m.text))),
              step < QUESTIONS.length
                ? h('div', { className: 'cx-chat-i' },
                    h('input', { className: 'cx-input', value: input, placeholder: QUESTIONS[step].d, onChange: (e) => setInput(e.target.value), onKeyDown: (e) => { if (e.key === 'Enter') send(); } }),
                    h('button', { className: 'cx-btn pri', onClick: send }, 'SEND'))
                : h('div', null,
                    h('div', { className: 'desc' }, `${answers.name} · ${answers.city} · ${answers.company}\n人格：${answers.persona}\n喜好：${answers.preferences}\n风格：${answers.style}`),
                    h('div', { className: 'cx-foot' }, h('button', { className: 'cx-btn', onClick: () => setStep(-1) }, 'BACK'), h('button', { className: 'cx-btn pri', disabled: busy, onClick: create }, busy ? 'CREATING…' : 'CREATE AVATAR')))),
        err ? h('div', { className: 'cx-err' }, err) : null);
    }

    function DeviceModal({ node, onClose }) {
      const [data, setData] = useState(null);
      const [busy, setBusy] = useState(true);
      const [err, setErr] = useState('');
      useEffect(() => {
        let alive = true;
        api('devices', { node }).then((d) => { if (alive) { setData(d); setBusy(false); } }).catch((e) => { if (alive) { setErr(String(e?.message || e)); setBusy(false); } });
        return () => { alive = false; };
      }, [node]);
      const groups = {};
      for (const d of data?.devices || []) (groups[d.kind] || (groups[d.kind] = [])).push(d);
      const renderDevice = (d) => h('div', { className: 'cx-device', key: d.id },
        h('span', { className: `cx-led${['running', 'online', 'paired'].includes(d.status) ? ' on' : ''}` }),
        h('div', { style: { flex: 1, minWidth: 0 } },
          h('div', { className: 'dn' }, d.name),
          h('div', { className: 'dd' }, `${d.address || '—'} · ${d.status || ''}`)),
        h('span', { className: 'cx-tag cy' }, d.controllable ? 'CONTROL' : 'DISCOVER'));
      const renderGroup = ([kind, list]) => h('div', { key: kind },
        h('div', { className: 'oh', style: { marginTop: 6 } }, `${kind.toUpperCase()} · ${list.length}`),
        list.map(renderDevice));
      return h(Modal, { title: '周边设备 / DEVICES', desc: '发现层：ContextOS 节点 / WiFi 局域网 / 蓝牙 / 红外；控制适配器后续接入。', onClose },
        busy ? h('div', { className: 'desc' }, '扫描中…') : null,
        err ? h('div', { className: 'cx-err' }, err) : null,
        data ? h('div', { className: 'cx-devices' },
          h('div', { className: 'cx-adapter' }, (data.adapters || []).map((a) => h('span', { key: a.kind, className: `cx-tag ${a.supported ? 'gr' : ''}` }, `${a.kind}${a.supported ? '' : ' ✕'}`))),
          Object.entries(groups).map(renderGroup),
          h('div', { className: 'desc' }, data.note || '')) : null);
    }

    function DataModal({ node, space, app, onClose }) {
      const funcs = app?.functions?.length ? app.functions : ['profile'];
      const [fn, setFn] = useState(funcs[0]);
      const [rows, setRows] = useState([{ k: 'title', v: '张三' }, { k: 'content', v: '员工档案' }]);
      const [data, setData] = useState(null);
      const [busy, setBusy] = useState(false);
      const [err, setErr] = useState('');
      const command = `web.team.${app.name}.${fn}`;
      const fields = Object.fromEntries(rows.filter((r) => r.k.trim()).map((r) => [r.k.trim(), r.v]));
      const run = async (write) => {
        setBusy(true); setErr('');
        try {
          if (write) await api('writeData', { node: Number(node), space, command, fields });
          setData(await api('readData', { node: Number(node), space, command }));
        } catch (e) { setErr(String(e?.message || e)); } finally { setBusy(false); }
      };
      let table = null;
      if (data) {
        const columns = (data.columns || []).slice(0, 6);
        table = h('div', { style: { marginTop: 10, maxHeight: 180, overflow: 'auto' } },
          h('div', { className: 'cx-meta' }, `count=${data.count || '—'} · rows=${data.rows?.length || 0}`),
          h('table', { className: 'cx-table' },
            h('thead', null, h('tr', null, columns.map((c) => h('th', { key: c }, c)))),
            h('tbody', null, (data.rows || []).slice(0, 8).map((row, i) => h('tr', { key: i },
              columns.map((c) => h('td', { key: c }, String(row[c] ?? '').slice(0, 28))))))));
      }
      return h(Modal, { title: `DATA / ${app.title || app.name}`, desc: `目标命令：${command}；写后回读，200/0x0 不算成功。`, onClose },
        h('div', { className: 'cx-form' },
          h('label', { className: 'cx-field full' }, 'FUNCTION', h('select', { className: 'cx-select', value: fn, onChange: (e) => setFn(e.target.value) }, funcs.map((f) => h('option', { key: f, value: f }, f)))),
          rows.map((r, i) => h('div', { key: i, className: 'cx-row full' },
            h('input', { className: 'cx-input', value: r.k, placeholder: 'field', onChange: (e) => setRows((rs) => rs.map((x, j) => j === i ? { ...x, k: e.target.value } : x)) }),
            h('input', { className: 'cx-input', value: r.v, placeholder: 'value', onChange: (e) => setRows((rs) => rs.map((x, j) => j === i ? { ...x, v: e.target.value } : x)) }),
            h('button', { className: 'cx-btn xs', onClick: () => setRows((rs) => rs.filter((_, j) => j !== i)) }, '×')))),
        h('button', { className: 'cx-btn xs', onClick: () => setRows((rs) => [...rs, { k: '', v: '' }]) }, '+ FIELD'),
        err ? h('div', { className: 'cx-err' }, err) : null,
        table,
        h('div', { className: 'cx-foot' }, h('button', { className: 'cx-btn', onClick: onClose }, T('关闭')), h('button', { className: 'cx-btn', disabled: busy, onClick: () => run(false) }, 'READ'), h('button', { className: 'cx-btn pri', disabled: busy, onClick: () => run(true) }, busy ? 'WORKING…' : 'WRITE + READ')));
    }

    async function fallbackApps(node, space) {
      try {
        const d = await api('listDir', { node, space, path: 'src' });
        const out = [];
        for (const e of d.entries || []) {
          if (e.type !== 'dir') continue;
          try {
            const f = await api('readFile', { node, space, path: `src/${e.name}/portal.json` });
            const portal = JSON.parse(f.content);
            out.push({
              name: e.name,
              title: portal.portal || e.name,
              command: `web.team.${e.name}.portal`,
              path: `src/${e.name}/portal.json`,
              functions: Object.keys(portal).filter((k) => !['portal', 'input', 'value'].includes(k)),
              offlineFallback: true,
            });
          } catch {}
        }
        return out;
      } catch { return []; }
    }

    const INIT_DEFAULTS = { dir: '~/ContextOS-9188', port: 9188, repo: 'https://shylinux.com/x/ContextOS' };
    const repoName = (repo) => {
      const text = String(repo || '').trim().replace(/\/$/, '');
      if (!text) return '';
      const name = text.split('/').pop().replace(/\.git$/i, '');
      return /^[A-Za-z0-9._-]+$/.test(name) ? name : '';
    };

    function InitOverlay({ state, onStart, onLoginRemote, onClose }) {
      if (!state) return null;
      const phase = state.phase || (state.running ? 'running' : state.error ? 'error' : state.done ? 'done' : 'setup');
      const [step, setStep] = useState(0);
      const [mode, setMode] = useState('local');
      const [dir, setDir] = useState(state.params?.dir || INIT_DEFAULTS.dir);
      const [port, setPort] = useState(String(state.params?.port || INIT_DEFAULTS.port));
      const [repo, setRepo] = useState(state.params?.repo ?? INIT_DEFAULTS.repo);
      const [image, setImage] = useState('shylinux/contextos:latest');
      const [host, setHost] = useState('');
      const [sshUser, setSshUser] = useState('shy');
      const [sshPort, setSshPort] = useState('22');
      const [remoteUrl, setRemoteUrl] = useState('http://127.0.0.1:9401');
      const [remoteUser, setRemoteUser] = useState('shy');
      const [remotePass, setRemotePass] = useState('');
      const [login, setLogin] = useState(null);
      const [loginBusy, setLoginBusy] = useState(false);
      const [avatar, setAvatar] = useState(() => ({ name: T('我的数字分身'), company: T('云轩领航'), city: T('深圳市'), image: '' }));
      const [scene, setScene] = useState(() => ({ name: T('我的赛博世界'), image: '' }));
      const [project, setProject] = useState(() => ({ name: T('我的第一个项目'), desc: T('把想法变成可交付的软件。'), tasks: [T('梳理需求'), T('搭建原型'), T('验收演示')].join('\n') }));
      const avatarRef = useRef(null);
      const sceneRef = useRef(null);
      const icon = (s) => s === 'done' ? '✓' : s === 'run' ? '◍' : s === 'err' ? '✗' : '○';
      const total = (state.steps || []).length;
      const doneCount = (state.steps || []).filter((x) => x.status === 'done').length;
      const pct = total ? Math.round((doneCount / total) * 100) : 0;
      const titles = { setup: T('初始化 / INITIALIZE'), running: T('正在初始化 / INITIALIZING'), done: T('初始化完成 / INIT DONE'), error: T('初始化失败 / INIT FAILED') };
      const readPic = (file, cb) => {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
          const img = new Image();
          img.onload = () => {
            const max = 720;
            const scale = Math.min(1, max / Math.max(img.width, img.height));
            const cv = document.createElement('canvas');
            cv.width = Math.round(img.width * scale); cv.height = Math.round(img.height * scale);
            cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
            cb(cv.toDataURL('image/jpeg', 0.82));
          };
          img.src = String(reader.result);
        };
        reader.readAsDataURL(file);
      };
      const start = () => onStart({ mode, dir, port: Number(port) || 9188, repo, image, host, sshUser, sshPort: Number(sshPort) || 22, remoteUrl, remoteUser, remotePass, avatar, scene, project });
      const doLogin = async () => {
        setLoginBusy(true); setLogin(null);
        try { const r = await onLoginRemote({ url: remoteUrl, user: remoteUser, pass: remotePass }); setLogin(r); }
        catch (e) { setLogin({ error: String(e?.message || e) }); }
        finally { setLoginBusy(false); }
      };
      const field = (label, node) => h('label', { className: 'cx-field full' }, label, node);
      const input = (value, set, props = {}) => h('input', { className: 'cx-input', value, onChange: (e) => set(e.target.value), ...props });
      const stepHead = h('div', { className: 'cx-init-wiz' }, [['01', '部署', 'DEPLOY'], ['02', '分身与场景', 'DIGITAL AVATAR & WORLD'], ['03', '项目', 'PROJECT']].map(([n, t, en], i) =>
        h('button', { key: n, type: 'button', className: `cx-init-tab${step === i ? ' on' : ''}${step > i ? ' done' : ''}`, onClick: () => phase === 'setup' && setStep(i) },
          h('b', null, n), h('span', null, T(t)), h('i', null, en))));
      const modeChip = ([id, label, desc]) => h('button', { key: id, type: 'button', className: `cx-init-mode${mode === id ? ' on' : ''}`, onClick: () => setMode(id) },
        h('b', null, T(label)), h('span', null, T(desc)));
      const modes = h('div', { className: 'cx-init-modes' },
        modeChip(['local', '本机部署', '本机直接部署节点']),
        modeChip(['docker', '容器部署', 'docker run 一个节点']),
        modeChip(['remoteDeploy', '远程部署', 'ssh 到远端建节点']),
        modeChip(['remote', '远程连接', '登录远端换 sessid']));
      const modeForm = mode === 'local' ? h('div', { className: 'cx-form' },
        field(T('源码地址'), input(repo, setRepo, { placeholder: 'https://shylinux.com/x/ContextOS' })),
        field(T('部署目录'), input(dir, setDir, { placeholder: '~/ContextOS-9188' })),
        field(T('端口'), input(port, setPort)))
        : mode === 'docker' ? h('div', { className: 'cx-form' },
          field(T('镜像'), input(image, setImage, { placeholder: 'shylinux/contextos:latest' })),
          field(T('宿主机目录（可空）'), input(dir, setDir, { placeholder: '~/contextos-data' })),
          field(T('端口'), input(port, setPort)))
          : mode === 'remoteDeploy' ? h('div', { className: 'cx-form' },
            field(T('远程主机'), input(host, setHost, { placeholder: '192.168.1.10' })),
            field(T('SSH 用户'), input(sshUser, setSshUser)),
            field(T('SSH 端口'), input(sshPort, setSshPort)),
            field(T('节点端口'), input(port, setPort)),
            field(T('镜像'), input(image, setImage)))
            : h('div', null,
              h('div', { className: 'cx-form' },
                field(T('远程地址'), input(remoteUrl, setRemoteUrl, { placeholder: 'http://127.0.0.1:9401' })),
                field(T('用户名'), input(remoteUser, setRemoteUser)),
                field(T('密码'), h('input', { className: 'cx-input', type: 'password', value: remotePass, onChange: (e) => setRemotePass(e.target.value) }))),
              h('div', { className: 'cx-init-login' },
                h('button', { className: 'cx-btn', type: 'button', disabled: loginBusy, onClick: doLogin }, loginBusy ? T('登录中…') : T('登录并获取 sessid')),
                login?.sessid ? h('span', { className: 'ok' }, `✓ sessid ${login.sessid.slice(0, 12)}… · ${login.via}`) : null,
                login?.error ? h('span', { className: 'err' }, login.error) : null));
      const pic = (kind) => {
        const ref = kind === 'avatar' ? avatarRef : sceneRef;
        const val = kind === 'avatar' ? avatar.image : scene.image;
        return h('div', { className: 'cx-init-pic', onClick: () => ref.current && ref.current.click(), title: T('点击选择图片') },
          val ? h('img', { src: val, alt: '' }) : h('div', { className: 'ph' }, h('b', null, kind === 'avatar' ? T('上传头像') : T('上传背景')), h('span', null, 'JPG / PNG · 720px')),
          h('input', { type: 'file', accept: 'image/*', ref, style: { display: 'none' }, onChange: (e) => { const f = e.target.files && e.target.files[0]; readPic(f, (data) => kind === 'avatar' ? setAvatar((v) => ({ ...v, image: data })) : setScene((v) => ({ ...v, image: data }))); } }));
      };
      const stepBody = step === 0 ? h('div', null, modes, modeForm)
        : step === 1 ? h('div', { className: 'cx-init-grid2' },
          h('div', { className: 'cx-init-sub' }, h('h3', null, T('数字分身')), pic('avatar'),
            h('div', { className: 'cx-form' }, field(T('名称'), input(avatar.name, (v) => setAvatar((a) => ({ ...a, name: v })))), field(T('公司'), input(avatar.company, (v) => setAvatar((a) => ({ ...a, company: v })))), field(T('城市'), input(avatar.city, (v) => setAvatar((a) => ({ ...a, city: v })))))),
          h('div', { className: 'cx-init-sub' }, h('h3', null, T('赛博世界')), pic('scene'),
            h('div', { className: 'cx-form' }, field(T('赛博世界名称'), input(scene.name, (v) => setScene((a) => ({ ...a, name: v })))))))
          : h('div', { className: 'cx-form' },
            field(T('项目名称'), input(project.name, (v) => setProject((x) => ({ ...x, name: v })))),
            field(T('项目简介'), input(project.desc, (v) => setProject((x) => ({ ...x, desc: v })))),
            h('label', { className: 'cx-field full' }, T('任务清单（每行一个）'), h('textarea', { className: 'cx-input', rows: 4, value: project.tasks, onChange: (e) => setProject((x) => ({ ...x, tasks: e.target.value })) })),
            h('div', { className: 'cx-init-sum' }, `${T('将生成')}: 1 ${T('目标')} · 1 ${T('计划')} · ${String(project.tasks || '').split('\n').filter((x) => x.trim()).length} ${T('任务')}`));
      const runView = h('div', null,
        total ? h('div', { className: 'cx-init-progress' }, h('div', { className: 'track' }, h('div', { className: 'bar', style: { width: `${pct}%` } })), h('span', null, `${doneCount}/${total} · ${pct}%`)) : null,
        (state.steps || []).length ? h('div', null, state.steps.map((s, i) => h('div', { key: s.id, className: `cx-init-step ${s.status || ''}` },
          h('span', { className: 'st' }, icon(s.status)),
          h('div', { style: { flex: 1, minWidth: 0 } }, h('span', { className: 'idx' }, String(i + 1).padStart(2, '0')), T(s.label), s.detail ? h('div', { className: 'sd' }, s.detail) : null)))) : null,
        state.error ? h('div', { className: 'cx-err' }, state.error) : null);
      return h('div', { className: `cx-init ${phase}` },
        h('div', { className: 'cx-init-grid' }),
        h('div', { className: 'cx-init-ring' }),
        h('div', { className: 'cx-init-scan' }),
        h('div', { className: 'cx-world cx-init-world' },
          h('div', { className: 'cx-world-kicker' }, 'WELCOME TO'),
          h('div', { className: 'cx-world-name' }, 'CONTEXTOS WORLD!'),
          h('div', { className: 'cx-world-sub' }, T('数字分身 · 软件工厂 · 赛博世界')),
          h('div', { className: 'cx-world-line' })),
        h('div', { className: 'cx-init-card' },
          h('div', { className: 'cx-init-head' },
            h('div', { className: 'cx-init-badge' }, 'CTX'),
            h('div', { style: { minWidth: 0 } },
              h('h2', null, titles[phase] || titles.setup),
              h('div', { className: 'desc' }, phase === 'setup' ? T('三步进入你的赛博世界：部署 → 数字分身与赛博世界 → 项目。') : T('部署节点 → 部署空间 → 数字分身 → 赛博世界 → 项目管理 → 进入对话')))),
          phase === 'setup' ? h('div', null, stepHead, stepBody) : runView,
          h('div', { className: 'cx-foot' },
            h('button', { className: 'cx-btn', onClick: onClose }, phase === 'running' ? T('隐藏') : phase === 'done' ? T('稍后') : T('关闭')),
            phase === 'setup' ? h('div', { style: { display: 'flex', gap: 8 } },
              step > 0 ? h('button', { className: 'cx-btn', onClick: () => setStep((v) => v - 1) }, T('上一步')) : null,
              step < 2 ? h('button', { className: 'cx-btn pri', onClick: () => setStep((v) => v + 1) }, T('下一步'))
                : h('button', { className: 'cx-btn pri', onClick: start }, T('初始化')))
              : phase === 'done' ? h('button', { className: 'cx-btn pri', onClick: onClose }, T('进入')) : null)));
    }

    function PmCalendar({ tasks, start, end, onChange, locale }) {
      const bootCalView = (() => { try { return JSON.parse(localStorage.getItem('contextos-devops-dsh:cal') || 'null') || {}; } catch { return {}; } })();
      const [view, setView] = useState(bootCalView.view || 'month');
      const [cursor, setCursor] = useState(() => { try { return bootCalView.cursor ? new Date(bootCalView.cursor) : new Date(); } catch { return new Date(); } });
      useEffect(() => { try { const prev = JSON.parse(localStorage.getItem('contextos-devops-dsh:cal') || '{}'); localStorage.setItem('contextos-devops-dsh:cal', JSON.stringify({ ...prev, view, cursor: cursor.toISOString() })); } catch {} }, [view, cursor]);
      const counts = {};
      for (const t of tasks || []) {
        const d = String(t.created_at || '').slice(0, 10);
        if (d) counts[d] = (counts[d] || 0) + 1;
      }
      const key = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const firstKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
      const lastKey = (d) => key(new Date(d.getFullYear(), d.getMonth() + 1, 0));
      const inRange = (a, b) => start && a <= (end || start) && b >= start;
      const lunar = (d) => {
        if (locale !== 'zh') return '';
        try {
          const day = new Intl.DateTimeFormat('zh-CN-u-ca-chinese', { day: 'numeric' }).format(d);
          if (!/^1日$/.test(day)) return '';
          return new Intl.DateTimeFormat('zh-CN-u-ca-chinese', { month: 'long' }).format(d);
        } catch { return ''; }
      };
      const pick = (a, b) => {
        if (!start) { onChange(a, b); return; }
        if (start === end) {
          const lo = a < start ? a : start;
          const hi = b > end ? b : end;
          onChange(lo, hi);
          return;
        }
        onChange(a, b);
      };
      const nav = (dir) => {
        if (view === 'long') setCursor(new Date(cursor.getFullYear() + dir * 10, 0, 1));
        else if (view === 'year') setCursor(new Date(cursor.getFullYear() + dir, 0, 1));
        else if (view === 'month') setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + dir, 1));
        else setCursor(new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + dir * 7));
      };
      const label = view === 'long' ? `${cursor.getFullYear() - 5} — ${cursor.getFullYear() + 6}`
        : view === 'year' ? `${cursor.getFullYear()}`
        : view === 'month' ? `${cursor.getFullYear()}.${String(cursor.getMonth() + 1).padStart(2, '0')}`
        : `${key(new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() - cursor.getDay()))} — ${key(new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() - cursor.getDay() + 6))}`;
      let body = null;
      if (view === 'long') {
        const base = cursor.getFullYear() - 5;
        body = h('div', { className: 'cx-cal-years' }, Array.from({ length: 12 }, (_, i) => {
          const y = base + i, a = `${y}-01-01`, b = `${y}-12-31`, on = inRange(a, b);
          return h('button', { key: y, className: `cx-cal-year${on ? ' on' : ''}`, onClick: () => pick(a, b) }, y);
        }));
      } else if (view === 'year') {
        body = h('div', { className: 'cx-cal-months' }, Array.from({ length: 12 }, (_, i) => {
          const d = new Date(cursor.getFullYear(), i, 1), a = firstKey(d), b = lastKey(d), on = inRange(a, b);
          return h('button', { key: i, className: `cx-cal-month${on ? ' on' : ''}`, onClick: () => pick(a, b) }, CURRENT_LANG === 'zh' ? `${i + 1}月` : ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][i], h('span', null, lunar(d)));
        }));
      } else {
        const days = view === 'week' ? 7 : new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
        const base = view === 'week' ? new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() - cursor.getDay()) : new Date(cursor.getFullYear(), cursor.getMonth(), 1);
        const lead = view === 'week' ? 0 : base.getDay();
        body = h(React.Fragment, null,
          h('div', { className: 'cx-cal-w' }, ['日', '一', '二', '三', '四', '五', '六'].map((w) => h('span', { key: w }, w))),
          h('div', { className: 'cx-cal-grid' },
            Array.from({ length: lead }, (_, i) => h('span', { key: `b${i}` })),
            Array.from({ length: days }, (_, i) => {
              const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() + i), k = key(d), on = inRange(k, k);
              return h('button', { key: k, className: `cx-cal-day${on ? ' on' : ''}${k === start ? ' start' : ''}${k === (end || start) ? ' end' : ''}`, onClick: () => pick(k, k) },
                counts[k] ? h('span', { className: 'n' }, counts[k]) : h('span', { className: 'n empty' }, ''),
                h('span', { className: 'd' }, d.getDate()),
                h('span', { className: 'l' }, lunar(d)));
            })));
      }
      return h('div', { className: 'cx-cal' },
        h('div', { className: 'cx-cal-h' },
          h('button', { onClick: () => nav(-1) }, '‹'),
          h('span', null, label),
          h('button', { onClick: () => nav(1) }, '›')),
        h('div', { className: 'cx-cal-views' }, [['long', '长期'], ['year', '年'], ['month', '月'], ['week', '周']].map(([v, n]) => h('button', { key: v, className: `cx-cal-view${view === v ? ' on' : ''}`, onClick: () => setView(v) }, T(n)))),
        body,
        h('div', { className: 'cx-cal-f' }, h('span', null, start ? `${start} → ${end || start}` : T('全部日期')), h('button', { onClick: () => onChange('', '') }, T('清除'))));
    }

    function MultiFilter({ label, options, value, onChange, align = 'left' }) {
      const [open, setOpen] = useState(false);
      const picked = value || [];
      const toggle = (v) => onChange(picked.includes(v) ? picked.filter((x) => x !== v) : [...picked, v]);
      if (!options || options.length <= 1) return null;
      if (options.length <= 6) {
        return h('div', { className: 'cx-filter inline' },
          h('span', { className: 'cx-filter-label' }, label),
          options.map((o) => h('button', { key: o.value, type: 'button', className: `cx-filter-chip${picked.includes(o.value) ? ' on' : ''}`, onClick: (e) => { e.stopPropagation(); toggle(o.value); } }, o.label || o.value)));
      }
      return h('div', { className: 'cx-filter' },
        h('button', { className: `cx-filter-btn${picked.length ? ' on' : ''}`, onClick: (e) => { e.stopPropagation(); setOpen((x) => !x); } }, `${label}${picked.length ? ` ${picked.length}` : ''} ▾`),
        open ? h('div', { className: `cx-filter-menu ${align}` },
          options.length ? options.map((o) => h('button', { key: o.value, className: `cx-filter-item${picked.includes(o.value) ? ' on' : ''}`, onClick: (e) => { e.stopPropagation(); toggle(o.value); } }, h('span', null, picked.includes(o.value) ? '✓' : '·'), o.label)) : h('div', { className: 'cx-empty', style: { padding: 7 } }, '暂无选项'),
          h('button', { className: 'cx-filter-clear', onClick: (e) => { e.stopPropagation(); onChange([]); setOpen(false); } }, T('清除'))) : null);
    }

    const CYBER_AVATAR = 'data:image/jpeg;base64,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';
    function ensureLeaflet() {
      if (window.L) return Promise.resolve(window.L);
      if (!document.querySelector('link[data-cx-leaflet]')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet'; link.href = '/contextos-devops-dsh/leaflet/leaflet.css'; link.dataset.cxLeaflet = '1';
        document.head.appendChild(link);
      }
      if (window.__cxLeafletPromise) return window.__cxLeafletPromise;
      window.__cxLeafletPromise = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = '/contextos-devops-dsh/leaflet/leaflet.js';
        script.async = true;
        script.onload = () => window.L ? resolve(window.L) : reject(new Error('leaflet not loaded'));
        script.onerror = () => reject(new Error('leaflet load failed'));
        document.head.appendChild(script);
      });
      return window.__cxLeafletPromise;
    }

    function TaskMap({ tasks, activeTask, onSelect }) {
      const hostRef = useRef(null);
      const mapRef = useRef(null);
      const leafletRef = useRef(null);
      const markersRef = useRef([]);
      const timersRef = useRef([]);
      const [mapReady, setMapReady] = useState(false);
      const [full, setFull] = useState(false);
      const [loading, setLoading] = useState(true);
      const onSelectRef = useRef(onSelect);
      onSelectRef.current = onSelect;
      const point = (t) => {
        const report = (t.reports || []).find((r) => Number(r.latitude) && Number(r.longitude));
        if (report) return [Number(report.latitude), Number(report.longitude)];
        let h = 0; for (const ch of String(t.uid || t.title || '')) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
        return [22.48 + (h % 100) / 100 * 0.16, 113.88 + ((h >>> 8) % 100) / 100 * 0.32];
      };
      useEffect(() => {
        let disposed = false;
        ensureLeaflet().then((L) => {
          if (disposed || !hostRef.current || mapRef.current) return;
          if (!document.querySelector('link[data-cx-tencent]')) {
            const pre = document.createElement('link'); pre.rel = 'preconnect'; pre.href = 'https://rt0.map.gtimg.com'; pre.dataset.cxTencent = '1'; document.head.appendChild(pre);
          }
          leafletRef.current = L;
          const bootMap = (() => { try { return JSON.parse(localStorage.getItem('contextos-devops-dsh:map') || 'null'); } catch { return null; } })();
          const startView = bootMap && Number.isFinite(bootMap.lat) && Number.isFinite(bootMap.lng) ? [bootMap.lat, bootMap.lng] : [22.5431, 114.0579];
          const startZoom = bootMap && Number.isFinite(bootMap.zoom) ? bootMap.zoom : 11;
          const map = L.map(hostRef.current, { zoomControl: false, attributionControl: true, scrollWheelZoom: true, wheelDebounceTime: 80, wheelPxPerZoomLevel: 120, preferCanvas: true, zoomAnimation: true }).setView(startView, startZoom);
          const saveMapState = () => { try { const c = map.getCenter(); localStorage.setItem('contextos-devops-dsh:map', JSON.stringify({ lat: c.lat, lng: c.lng, zoom: map.getZoom() })); } catch {} };
          map.on('moveend', saveMapState);
          map.on('zoomend', saveMapState);
          const tiles = L.tileLayer('https://rt{s}.map.gtimg.com/tile?z={z}&x={x}&y={y}&type=vector&styleid=3&scene=0', {
            maxZoom: 18, minZoom: 8, maxNativeZoom: 16, subdomains: ['0', '1', '2', '3'], tms: true, attribution: '© Tencent Map',
            updateWhenIdle: true, updateWhenZooming: false, keepBuffer: 1, detectRetina: false,
          });
          tiles.on('loading', () => setLoading(true));
          tiles.on('load', () => setLoading(false));
          tiles.addTo(map);
          if (navigator.geolocation && !bootMap) {
            navigator.geolocation.getCurrentPosition((pos) => {
              if (!mapRef.current) return;
              map.setView([pos.coords.latitude, pos.coords.longitude], 13);
              L.circleMarker([pos.coords.latitude, pos.coords.longitude], { radius: 7, color: '#ffffff', weight: 2, fillColor: '#3ee7ff', fillOpacity: 1 }).addTo(map).bindPopup('当前位置');
              L.circle([pos.coords.latitude, pos.coords.longitude], { radius: pos.coords.accuracy || 120, color: '#3ee7ff', weight: 1, fillColor: '#3ee7ff', fillOpacity: 0.08 }).addTo(map);
            }, () => { /* default Shenzhen center */ }, { timeout: 5000, maximumAge: 60000 });
          }
          mapRef.current = map;
          setMapReady(true);
          timersRef.current.push(setTimeout(() => {
            if (disposed || !mapRef.current || !hostRef.current?.isConnected) return;
            mapRef.current.invalidateSize(); setLoading(false);
          }, 1200));
        }).catch(() => { /* SVG fallback below stays */ });
        return () => {
          disposed = true;
          for (const t of timersRef.current) clearTimeout(t);
          timersRef.current = [];
          if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
        };
      }, []);
      useEffect(() => {
        const L = leafletRef.current, map = mapRef.current;
        if (!L || !map) return;
        for (const m of markersRef.current) map.removeLayer(m);
        markersRef.current = [];
        const color = (s) => s === 'process' ? '#ffd166' : s === 'finished' ? '#42f5a7' : s === 'canceled' ? '#ff5c7a' : '#7b98a8';
        for (const t of tasks || []) {
          const [lat, lng] = point(t);
          const marker = L.circleMarker([lat, lng], {
            radius: activeTask?.uid === t.uid ? 7 : 4.5,
            color: activeTask?.uid === t.uid ? '#ffffff' : color(t.status_name),
            weight: activeTask?.uid === t.uid ? 2 : 1,
            fillColor: color(t.status_name), fillOpacity: 0.85,
          }).addTo(map);
          const el = document.createElement('div');
          el.textContent = `${t.title || ''} · ${t.status_name || ''}`;
          marker.bindPopup(el, { closeButton: false, className: 'cx-map-popup' });
          marker.on('click', () => onSelectRef.current?.(t));
          markersRef.current.push(marker);
        }
      }, [tasks, activeTask, mapReady]);
      useEffect(() => {
        window.dispatchEvent(new CustomEvent('cx-map-full', { detail: full }));
        if (!mapRef.current) return;
        const t = setTimeout(() => {
          if (mapRef.current && hostRef.current?.isConnected) mapRef.current.invalidateSize();
        }, 120);
        return () => { clearTimeout(t); window.dispatchEvent(new CustomEvent('cx-map-full', { detail: false })); };
      }, [full]);
      const L = leafletRef.current;
      const zoomIn = () => mapRef.current && hostRef.current?.isConnected && mapRef.current.zoomIn();
      const zoomOut = () => mapRef.current && hostRef.current?.isConnected && mapRef.current.zoomOut();
      const locate = () => mapRef.current && hostRef.current?.isConnected && mapRef.current.locate({ setView: true, maxZoom: 14 });
      return h('div', { className: `cx-taskmap${full ? ' full' : ''}` },
        h('div', { className: 'cx-taskmap-h' },
          h('span', null, '任务地图 · 腾讯'),
          h('span', null, CURRENT_LANG === 'zh' ? `${tasks.length} 个点` : `${tasks.length} point${tasks.length === 1 ? '' : 's'}`),
          h('div', { className: 'cx-taskmap-actions' },
            h('button', { onClick: zoomIn, title: T('放大') }, '+'),
            h('button', { onClick: zoomOut, title: T('缩小') }, '−'),
            h('button', { onClick: locate, title: T('定位') }, '◎'),
            h('button', { onClick: () => setFull((v) => !v), title: full ? T('退出全屏') : T('全屏') }, full ? '×' : '⛶'))),
        h('div', { className: 'cx-taskmap-leaflet', ref: hostRef },
          loading ? h('div', { className: 'cx-taskmap-loading' }, '腾讯地图加载中…') : null),
        h('div', { className: 'cx-taskmap-legend' }, h('span', { className: 'lc created' }, CURRENT_LANG === 'zh' ? '待开始' : 'To do'), h('span', { className: 'lc process' }, CURRENT_LANG === 'zh' ? '进行中' : 'Doing'), h('span', { className: 'lc finished' }, CURRENT_LANG === 'zh' ? '已完成' : 'Done')));
    }

    const PM_KIND_LABEL = { target: '目标 TARGET', plan: '计划 PLAN', task: '任务 TASK', report: '报告 REPORT', feedback: '反馈 FEEDBACK' };
    const PM_SHORT = { target: '目标', plan: '计划', task: '任务', report: '报告', feedback: '反馈' };
    const PM_ACTION_LABEL = { planCreate: '+ 计划', taskCreate: '+ 任务', reportCreate: '+ 报告', feedbackCreate: '+ 反馈', submit: '提交', approve: '通过', reject: '驳回', process: '开始', finish: '完成', cancel: '取消', modify: '编辑', remove: '删除', handover: '交接' };
    function PMModal({ kind, mode, item, parent, node, avatar, onClose, onDone }) {
      const [title, setTitle] = useState(item?.title || '');
      const [content, setContent] = useState(item?.content || '');
      const [begin, setBegin] = useState(item?.begin_time || new Date().toISOString().slice(0, 10));
      const [end, setEnd] = useState(item?.end_time || new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10));
      const [reportType, setReportType] = useState('daily');
      const [score, setScore] = useState(String(item?.score || 5));
      const [feedbackStatus, setFeedbackStatus] = useState(item?.status_name || 'canFinish');
      const [busy, setBusy] = useState(false);
      const [err, setErr] = useState('');
      const submit = async () => {
        setBusy(true); setErr('');
        try {
          const body = { node, uid: avatar?.uid || '', kind, title, content, begin_time: begin, end_time: end, report_type: reportType, score, feedback_status: feedbackStatus, ...(parent || {}) };
          if (mode === 'edit') { body.item_uid = item.uid; await api('pmModify', body); }
          else await api('pmCreate', body);
          onDone();
        } catch (e) { setErr(String(e?.message || e)); } finally { setBusy(false); }
      };
      return h(Modal, { title: `${mode === 'edit' ? 'EDIT' : 'NEW'} ${PM_KIND_LABEL[kind] || kind}`, desc: parent ? '继承当前选择作为上级 UID' : '', onClose },
        h('div', { className: 'cx-form' },
          h('label', { className: 'cx-field full' }, '标题', h('input', { className: 'cx-input', value: title, onChange: (e) => setTitle(e.target.value) })),
          h('label', { className: 'cx-field full' }, '内容', h('textarea', { className: 'cx-input', rows: 3, value: content, onChange: (e) => setContent(e.target.value) })),
          kind === 'plan' ? h('label', { className: 'cx-field' }, '开始', h('input', { className: 'cx-input', value: begin, onChange: (e) => setBegin(e.target.value) })) : null,
          kind === 'plan' ? h('label', { className: 'cx-field' }, '结束', h('input', { className: 'cx-input', value: end, onChange: (e) => setEnd(e.target.value) })) : null,
          kind === 'report' ? h('label', { className: 'cx-field' }, '类型', h('select', { className: 'cx-input', value: reportType, onChange: (e) => setReportType(e.target.value) }, h('option', { value: 'daily' }, '日报'), h('option', { value: 'weekly' }, '周报'), h('option', { value: 'monthly' }, '月报'))) : null,
          kind === 'feedback' ? h('label', { className: 'cx-field' }, '评分', h('input', { className: 'cx-input', value: score, onChange: (e) => setScore(e.target.value) })) : null,
          kind === 'feedback' ? h('label', { className: 'cx-field' }, '结论', h('select', { className: 'cx-input', value: feedbackStatus, onChange: (e) => setFeedbackStatus(e.target.value) }, h('option', { value: 'canFinish' }, '可完成'), h('option', { value: 'shouldImprove' }, '待改进'))) : null),
        err ? h('div', { className: 'cx-err' }, err) : null,
        h('div', { className: 'cx-foot' }, h('button', { className: 'cx-btn', onClick: onClose }, T('取消')), h('button', { className: 'cx-btn pri', disabled: busy || !title.trim(), onClick: submit }, busy ? 'SAVING…' : mode === 'edit' ? 'SAVE' : 'CREATE')));
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

    function RichText({ text }) {
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
          h('div', { className: 'cx-md-codebar' }, h('span', null, lang), h('button', { onClick: () => { try { navigator.clipboard.writeText(code); } catch {} } }, 'COPY')),
          h('pre', { className: 'cx-md-code' }, h('code', null, code))));
        last = re.lastIndex;
      }
      if (last < src.length) parts.push(h('div', { key: `t${key++}` }, renderText(src.slice(last))));
      return h('div', { className: 'cx-rich' }, parts);
    }

    function ThreeAvatar({ image }) {
      const src = image || CYBER_AVATAR;
      const [tilt, setTilt] = useState({ x: 0, y: 0 });
      const [zoom, setZoom] = useState(1);
      const [pulse, setPulse] = useState(0);
      const drag = useRef(null);
      const down = (e) => {
        drag.current = { x: e.clientX, y: e.clientY, ox: tilt.x, oy: tilt.y };
        try { e.currentTarget.setPointerCapture(e.pointerId); } catch {}
      };
      const move = (e) => {
        if (!drag.current) return;
        setTilt({
          x: Math.max(-10, Math.min(10, drag.current.ox - (e.clientY - drag.current.y) * 0.08)),
          y: Math.max(-18, Math.min(18, drag.current.oy + (e.clientX - drag.current.x) * 0.1)),
        });
      };
      const up = () => { drag.current = null; };
      return h('div', { className: 'cx-avatar3d', onPointerDown: down, onPointerMove: move, onPointerUp: up, onPointerCancel: up, onClick: () => setPulse((x) => x + 1), onDoubleClick: () => { setTilt({ x: 0, y: 0 }); setZoom(1); }, onWheel: (e) => { e.preventDefault(); setZoom((z) => Math.max(0.92, Math.min(1.16, z - e.deltaY * 0.0008))); } },
        h('div', { className: 'cx-avatar-halo' }),
        h('div', { className: 'cx-avatar-ring r1' }),
        h('div', { className: 'cx-avatar-ring r2' }),
        h('div', { className: 'cx-avatar-ring r3' }),
        h('div', { className: 'cx-avatar-ghost' }, h('img', { src, alt: '', draggable: false })),
        h('div', { className: 'cx-avatar3d-inner', style: { transform: `perspective(900px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale(${zoom})` } },
          h('img', { src, alt: 'ContextOS female robot', draggable: false }),
          h('div', { className: 'cx-avatar-scan' }),
          h('div', { className: 'cx-avatar-hud' },
            h('span', null, '● NEURAL LINK'), h('span', null, 'SYNC 99.8%')),
          h('div', { className: 'cx-avatar-coords' }, '22.5431°N · 114.0579°E'),
          h('div', { className: 'cx-avatar-wave' }, Array.from({ length: 9 }, (_, i) => h('i', { key: i, style: { animationDelay: `${i * 0.12}s` } })))),
        h('div', { className: 'cx-avatar-base' }),
        h('div', { className: 'cx-avatar-particles' }, Array.from({ length: 12 }, (_, i) => h('i', { key: i, style: { left: `${8 + (i * 37) % 84}%`, top: `${12 + (i * 53) % 72}%`, animationDelay: `${i * 0.3}s` } }))),
        pulse ? h('div', { key: pulse, className: 'cx-avatar-pulse' }) : null);
    }

    function ThreeCity() {
      const ref = useRef(null);
      const [ready, setReady] = useState(false);
      useEffect(() => {
        let disposed = false;
        let cleanup = () => {};
        let observer = null;
        import('/contextos-devops-dsh/three/three.module.js').then((THREE) => {
          if (disposed || !ref.current) return;
          const host = ref.current;
          const scene = new THREE.Scene();
          scene.fog = new THREE.FogExp2(0x02070d, 0.026);
          const camera = new THREE.PerspectiveCamera(52, 1, 0.1, 200);
          camera.position.set(0, 9, 24);
          camera.lookAt(0, 2.5, 0);
          const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
          renderer.setPixelRatio(Math.min(1.7, window.devicePixelRatio || 1));
          renderer.setClearColor(0x02070d, 0.86);
          renderer.outputColorSpace = THREE.SRGBColorSpace;
          renderer.toneMapping = THREE.ACESFilmicToneMapping;
          renderer.toneMappingExposure = 1.1;
          host.appendChild(renderer.domElement);
          renderer.domElement.className = 'cx-canvas-city';

          scene.add(new THREE.AmbientLight(0x3f88aa, 1.2));
          const key = new THREE.DirectionalLight(0x8feaff, 2.2); key.position.set(8, 18, 10); scene.add(key);
          const violet = new THREE.PointLight(0x8b7bff, 18, 60); violet.position.set(-14, 8, -10); scene.add(violet);
          const green = new THREE.PointLight(0x42f5a7, 12, 50); green.position.set(14, 5, 8); scene.add(green);

          const city = new THREE.Group();
          scene.add(city);
          const ground = new THREE.Mesh(new THREE.PlaneGeometry(90, 90), new THREE.MeshStandardMaterial({ color: 0x030b12, metalness: 0.65, roughness: 0.42 }));
          ground.rotation.x = -Math.PI / 2; ground.position.y = -0.03; city.add(ground);
          const grid = new THREE.GridHelper(64, 64, 0x1a6b86, 0x0b2a3a);
          grid.material.transparent = true; grid.material.opacity = 0.42; grid.position.y = 0.005; city.add(grid);

          // roads
          const roadMat = new THREE.MeshBasicMaterial({ color: 0x0b3a4e, transparent: true, opacity: 0.7 });
          for (const x of [-16, -8, 0, 8, 16]) {
            const road = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.02, 64), roadMat);
            road.position.set(x, 0.015, 0); city.add(road);
          }
          for (const z of [-16, -8, 0, 8, 16]) {
            const road = new THREE.Mesh(new THREE.BoxGeometry(64, 0.02, 1.2), roadMat);
            road.position.set(0, 0.018, z); city.add(road);
          }

          const dark = new THREE.MeshStandardMaterial({ color: 0x071824, metalness: 0.72, roughness: 0.3 });
          const dark2 = new THREE.MeshStandardMaterial({ color: 0x0a2534, metalness: 0.6, roughness: 0.38 });
          const edge = new THREE.LineBasicMaterial({ color: 0x3ee7ff, transparent: true, opacity: 0.5 });
          const edgeGreen = new THREE.LineBasicMaterial({ color: 0x42f5a7, transparent: true, opacity: 0.35 });
          const windowMat = new THREE.MeshBasicMaterial({ color: 0x77f7ff, transparent: true, opacity: 0.8 });
          const windowViolet = new THREE.MeshBasicMaterial({ color: 0x9d8bff, transparent: true, opacity: 0.75 });
          let seed = 20261106;
          const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };

          const blocks = [];
          for (let x = -20; x <= 20; x += 4) {
            for (let z = -20; z <= 20; z += 4) {
              if (Math.abs(x) < 2.5 && Math.abs(z) < 2.5) continue;
              const w = 1.5 + rnd() * 1.7, d = 1.5 + rnd() * 1.7;
              const h = 1.2 + rnd() * 6.4;
              const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), rnd() > 0.5 ? dark : dark2);
              mesh.position.set(x + (rnd() - 0.5) * 1.2, h / 2, z + (rnd() - 0.5) * 1.2);
              city.add(mesh);
              const edges = new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry), rnd() > 0.8 ? edgeGreen : edge);
              edges.position.copy(mesh.position); city.add(edges);
              const rows = Math.max(1, Math.floor(h / 1.1));
              for (let r = 0; r < rows; r++) {
                if (rnd() < 0.28) continue;
                const strip = new THREE.Mesh(new THREE.BoxGeometry(w * 0.78, 0.035, 0.02), rnd() > 0.84 ? windowViolet : windowMat);
                strip.position.set(mesh.position.x, 0.45 + r * 1.02, mesh.position.z + d / 2 + 0.015);
                city.add(strip);
              }
              if (h > 5.5) {
                const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.2 + rnd(), 6), windowMat);
                ant.position.set(mesh.position.x, h + 0.6, mesh.position.z); city.add(ant);
              }
              blocks.push(mesh);
            }
          }

          // Shenzhen landmark skyline
          const landmarkMat = new THREE.MeshStandardMaterial({ color: 0x0a2130, metalness: 0.8, roughness: 0.24 });
          const landmarkEdge = new THREE.LineBasicMaterial({ color: 0x6ff7ff, transparent: true, opacity: 0.75 });
          const landmark = (x, z, type) => {
            const g = new THREE.Group();
            g.position.set(x, 0, z);
            const box = (w, h, d, y, mat = landmarkMat) => {
              const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.y = y; g.add(m);
              const e = new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry), landmarkEdge); e.position.y = y; g.add(e); return m;
            };
            if (type === 'pingan') {
              box(2.4, 8, 2.4, 4); box(1.9, 7, 1.9, 11.5); box(1.3, 3.5, 1.3, 16.7);
              const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.2, 3.2, 8), new THREE.MeshBasicMaterial({ color: 0x9ffcff })); spire.position.y = 20; g.add(spire);
            } else if (type === 'kk100') {
              const t = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.8, 13, 10), landmarkMat); t.position.y = 6.5; g.add(t);
              const cap = new THREE.Mesh(new THREE.SphereGeometry(1.1, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), landmarkEdge); cap.position.y = 13; g.add(cap);
              const ring = new THREE.Mesh(new THREE.TorusGeometry(1.4, 0.03, 8, 32), new THREE.MeshBasicMaterial({ color: 0x3ee7ff })); ring.rotation.x = Math.PI / 2; ring.position.y = 10; g.add(ring);
            } else if (type === 'spring') {
              const t = new THREE.Mesh(new THREE.ConeGeometry(2.2, 13, 20, 1, true), new THREE.MeshStandardMaterial({ color: 0x0a2130, metalness: 0.8, roughness: 0.25, wireframe: false })); t.position.y = 6.5; g.add(t);
              for (let i = 0; i < 5; i++) {
                const r = new THREE.Mesh(new THREE.TorusGeometry(1.9 - i * 0.3, 0.025, 8, 32), new THREE.MeshBasicMaterial({ color: i % 2 ? 0x42f5a7 : 0x6ff7ff, transparent: true, opacity: 0.8 })); r.rotation.x = Math.PI / 2; r.position.y = 2 + i * 2.3; g.add(r);
              }
            } else if (type === 'tencent') {
              box(1.8, 9, 1.8, 4.5, landmarkMat); box(1.8, 10, 1.8, 5, landmarkMat);
              const bridge = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.25, 0.4), new THREE.MeshBasicMaterial({ color: 0x6ff7ff })); bridge.position.set(0, 7.5, 0); g.add(bridge);
              [0, 1].forEach((i) => { g.children[i].position.x = -1.15; });
              [2, 3].forEach((i) => { g.children[i].position.x = 1.15; });
            } else if (type === 'diwang') {
              box(2.2, 8, 2.2, 4); box(1.7, 4, 1.7, 9.5);
              const top = new THREE.Mesh(new THREE.ConeGeometry(1.2, 2.2, 4), landmarkMat); top.position.y = 12.6; top.rotation.y = Math.PI / 4; g.add(top);
            }
            const ring = new THREE.Mesh(new THREE.TorusGeometry(2.4, 0.025, 8, 48), new THREE.MeshBasicMaterial({ color: 0x3ee7ff, transparent: true, opacity: 0.55 })); ring.rotation.x = Math.PI / 2; ring.position.y = 0.15; g.add(ring);
            city.add(g);
          };
          landmark(-12, -8, 'pingan');
          landmark(11, -10, 'kk100');
          landmark(0, -16, 'spring');
          landmark(15, 3, 'tencent');
          landmark(-17, 5, 'diwang');

          // central data tower
          const tower = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.8, 12, 8, 1, true), new THREE.MeshStandardMaterial({ color: 0x071a29, metalness: 0.8, roughness: 0.24, wireframe: true, transparent: true, opacity: 0.75 }));
          tower.position.y = 6; city.add(tower);
          const core = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 12, 12), new THREE.MeshBasicMaterial({ color: 0x3ee7ff, transparent: true, opacity: 0.85 }));
          core.position.y = 6; city.add(core);
          for (let i = 0; i < 5; i++) {
            const ring = new THREE.Mesh(new THREE.TorusGeometry(3 + i * 0.55, 0.025, 8, 72), new THREE.MeshBasicMaterial({ color: i % 2 ? 0x42f5a7 : 0x3ee7ff, transparent: true, opacity: 0.65 }));
            ring.rotation.x = Math.PI / 2; ring.position.y = 2 + i * 2.1; city.add(ring);
          }

          // data pulses along roads
          const movers = [];
          const pulseMat = new THREE.MeshBasicMaterial({ color: 0x7ff7ff });
          const pulseMat2 = new THREE.MeshBasicMaterial({ color: 0x8b7bff });
          for (let i = 0; i < 28; i++) {
            const m = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), i % 3 ? pulseMat : pulseMat2);
            const axis = i % 2 ? 'x' : 'z';
            const line = [-16, -8, 0, 8, 16][i % 5];
            m.position.set(axis === 'x' ? -30 : line, 0.18, axis === 'x' ? line : -30);
            m.userData = { axis, speed: 0.6 + rnd() * 1.6 };
            city.add(m); movers.push(m);
          }

          // stars / data particles
          const starsGeo = new THREE.BufferGeometry();
          const starPos = [];
          for (let i = 0; i < 260; i++) starPos.push((rnd() - 0.5) * 80, 4 + rnd() * 30, (rnd() - 0.5) * 80);
          starsGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3));
          city.add(new THREE.Points(starsGeo, new THREE.PointsMaterial({ color: 0x68dff1, size: 0.05, transparent: true, opacity: 0.7 })));

          let mouseX = 0, mouseY = 0, camX = 0, camY = 9, dragging = false, lastX = 0, lastY = 0, spin = 0, targetSpin = 0, zoom = 24;
          const onPointer = (e) => { mouseX = (e.clientX / window.innerWidth - 0.5) * 2; mouseY = (e.clientY / window.innerHeight - 0.5) * 2; };
          const onDown = (e) => { dragging = true; lastX = e.clientX; lastY = e.clientY; };
          const onMove = (e) => { if (!dragging) return; targetSpin += (e.clientX - lastX) * 0.002; lastX = e.clientX; lastY = e.clientY; };
          const onUp = () => { dragging = false; };
          const onWheel = (e) => { if (!e.shiftKey) return; e.preventDefault(); zoom = Math.max(16, Math.min(36, zoom + e.deltaY * 0.02)); };
          window.addEventListener('pointermove', onPointer);
          window.addEventListener('pointerdown', onDown);
          window.addEventListener('pointermove', onMove);
          window.addEventListener('pointerup', onUp);
          window.addEventListener('wheel', onWheel, { passive: false });

          const resize = () => {
            const w = host.clientWidth || window.innerWidth, h = host.clientHeight || window.innerHeight;
            renderer.setSize(w, h, false);
            camera.aspect = w / h; camera.updateProjectionMatrix();
          };
          resize();
          observer = new ResizeObserver(resize); observer.observe(host);

          let raf = 0, paused = false;
          const onMapFull = (e) => { paused = !!e.detail; };
          window.addEventListener('cx-map-full', onMapFull);
          const clock = new THREE.Clock();
          const animate = () => {
            raf = requestAnimationFrame(animate);
            if (paused) return;
            const t = clock.getElapsedTime();
            if (!dragging) targetSpin += 0.00045;
            spin += (targetSpin - spin) * 0.04;
            city.rotation.y = spin;
            camX += (mouseX * 1.8 - camX) * 0.03;
            camY += (9 + mouseY * 1.2 - camY) * 0.03;
            camera.position.x = camX;
            camera.position.y = camY;
            camera.position.z += (zoom - camera.position.z) * 0.03;
            camera.lookAt(0, 3.2, 0);
            for (const m of movers) {
              if (m.userData.axis === 'x') {
                m.position.x += m.userData.speed;
                if (m.position.x > 32) m.position.x = -32;
              } else {
                m.position.z += m.userData.speed;
                if (m.position.z > 32) m.position.z = -32;
              }
            }
            // city breathing
            city.position.y = Math.sin(t * 0.25) * 0.02;
            renderer.render(scene, camera);
          };
          animate();
          setReady(true);
          cleanup = () => {
            cancelAnimationFrame(raf);
            if (observer) observer.disconnect();
            window.removeEventListener('pointermove', onPointer);
            window.removeEventListener('pointerdown', onDown);
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
            window.removeEventListener('wheel', onWheel);
            window.removeEventListener('cx-map-full', onMapFull);
            renderer.dispose();
            if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
          };
        }).catch(() => { /* fallback SVG */ });
        return () => { disposed = true; cleanup(); };
      }, []);
      return h('div', { className: 'cx-city3d', ref },
        !ready ? h(TechBackdrop) : null,
        h('div', { className: 'cx-city-labels' },
          h('span', null, '平安金融中心'), h('span', null, 'KK100'), h('span', null, '春笋'), h('span', null, '腾讯滨海大厦'), h('span', null, '地王大厦')));
    }

    function TechBackdrop() {
      return h('div', { className: 'cx-tech-bg', 'aria-hidden': 'true' },
        h('svg', { viewBox: '0 0 1440 900', preserveAspectRatio: 'xMidYMid slice' },
          h('defs', null,
            h('radialGradient', { id: 'tbGlobe', cx: '.4', cy: '.35', r: '.7' }, h('stop', { offset: '0', stopColor: '#0e4a5f' }), h('stop', { offset: '1', stopColor: '#02080f' })),
            h('linearGradient', { id: 'tbLine', x1: '0', y1: '0', x2: '1', y2: '1' }, h('stop', { offset: '0', stopColor: '#3ee7ff' }), h('stop', { offset: '1', stopColor: '#42f5a7' })),
            h('filter', { id: 'tbGlow' }, h('feGaussianBlur', { stdDeviation: '3', result: 'b' }), h('feMerge', null, h('feMergeNode', { in: 'b' }), h('feMergeNode', { in: 'SourceGraphic' })))),
          h('circle', { cx: 1110, cy: 430, r: 205, fill: 'url(#tbGlobe)', stroke: 'rgba(62,231,255,.5)', strokeWidth: 1.5 }),
          h('ellipse', { cx: 1110, cy: 430, rx: 205, ry: 62, fill: 'none', stroke: 'rgba(62,231,255,.25)' }),
          h('ellipse', { cx: 1110, cy: 430, rx: 205, ry: 120, fill: 'none', stroke: 'rgba(62,231,255,.18)' }),
          h('ellipse', { cx: 1110, cy: 430, rx: 66, ry: 205, fill: 'none', stroke: 'rgba(62,231,255,.22)' }),
          h('ellipse', { cx: 1110, cy: 430, rx: 130, ry: 205, fill: 'none', stroke: 'rgba(62,231,255,.16)' }),
          h('path', { d: 'M905 430 Q1110 280 1315 430', fill: 'none', stroke: 'url(#tbLine)', strokeWidth: 2, className: 'cx-dash', filter: 'url(#tbGlow)' }),
          h('path', { d: 'M905 430 Q1110 580 1315 430', fill: 'none', stroke: 'url(#tbLine)', strokeWidth: 1.2, className: 'cx-dash', opacity: '.7' }),
          h('path', { d: 'M960 300 Q1110 180 1260 300', fill: 'none', stroke: '#42f5a7', strokeWidth: 1.2, className: 'cx-dash', opacity: '.6' }),
          h('path', { d: 'M960 560 Q1110 680 1260 560', fill: 'none', stroke: '#3ee7ff', strokeWidth: 1.2, className: 'cx-dash', opacity: '.6' }),
          [[905,430],[1315,430],[1110,225],[1110,635],[1010,285],[1210,575],[985,565],[1235,295]].map(([x,y],i) => h('circle', { key: i, cx: x, cy: y, r: i % 2 ? 3 : 2, fill: '#42f5a7', className: 'cx-pulse' })),
          h('path', { d: 'M1110 225 L1010 285 L905 430 L985 565 L1110 635 L1210 575 L1315 430 L1235 295 Z', fill: 'none', stroke: 'rgba(62,231,255,.18)' }),
          h('path', { d: 'M300 430 Q500 280 760 380 T1110 430', fill: 'none', stroke: 'rgba(62,231,255,.22)', strokeWidth: 1, className: 'cx-dash' }),
          h('path', { d: 'M220 620 Q520 500 760 560 T1110 430', fill: 'none', stroke: 'rgba(66,245,167,.16)', strokeWidth: 1, className: 'cx-dash' }),
          h('circle', { cx: 300, cy: 430, r: 4, fill: '#3ee7ff', className: 'cx-pulse' })));
    }

    function ChatPanel({ open, booted, onClose, nodes, node, spaces, space, apps, app, avatar, webTabs, onOpenWebTab, onCloseWebTab, onNavWebTab, onReloadWebTab, onManageWebTab, full, docked, theme, locale, themeMode, setThemeMode, langMode, setLangMode, onToggleFull, onInit, onSelectNode, onSelectSpace, onSelectApp, onSelectAvatar, avatars, backgrounds, bg, onSelectBg, onCreateBg, onUploadBg, onUploadAvatar, onUpdateScene, onUpdateAvatar, onCreateAvatar, onRefresh, onOpenApp, onData, onStore, onDevices }) {
      const [mode, setMode] = useState('avatar');
      const tt = (key) => term(locale, key);
      const sectionTitle = (cn, en) => locale === 'zh' ? `${cn} ${en}` : en;
      const modeLabel = (m) => locale === 'zh' ? m.name : ({ avatar: 'Digital Avatar', factory: 'Software Factory', iot: 'Cyber World' })[m.id] || m.name;
      const [pick, setPick] = useState(null);
      const [files, setFiles] = useState([]);
      const [showMore, setShowMore] = useState(false);
      const [pm, setPm] = useState(null);
      const [targetId, setTargetId] = useState('');
      const [planId, setPlanId] = useState('');
      const [taskId, setTaskId] = useState('');
      const [reportId, setReportId] = useState('');
      const [feedbackId, setFeedbackId] = useState('');
      const pmSelUidRef = useRef('');
      const [folds, setFolds] = useState(() => { try { return JSON.parse(localStorage.getItem('contextos-devops-dsh:folds') || 'null') || {}; } catch { return {}; } });
      useEffect(() => { try { localStorage.setItem('contextos-devops-dsh:folds', JSON.stringify(folds)); } catch {} }, [folds]);
      const fold = (k) => folds[k] === true;
      const foldHeadProps = (k) => ({ onClick: (e) => { if (e.target.closest('button, select, input, .cx-menu, .cx-sel')) return; setFolds((f) => ({ ...f, [k]: !f[k] })); } });
      const foldBtn = (k) => h('button', { className: 'cx-fold', type: 'button', title: fold(k) ? T('展开') : T('折叠'), onClick: (e) => { e.stopPropagation(); setFolds((f) => ({ ...f, [k]: !f[k] })); } }, fold(k) ? '▸' : '▾');
      useEffect(() => {
        const uid = avatar?.uid; if (!uid || pmSelUidRef.current === uid) return;
        pmSelUidRef.current = uid;
        let saved = {};
        try { saved = (JSON.parse(localStorage.getItem('contextos-devops-dsh:pm') || '{}'))[uid] || {}; } catch {}
        setTargetId(saved.target || ''); setPlanId(saved.plan || ''); setTaskId(saved.task || ''); setReportId(saved.report || ''); setFeedbackId(saved.feedback || '');
      }, [avatar?.uid]);
      useEffect(() => {
        const uid = avatar?.uid; if (!uid || pmSelUidRef.current !== uid) return;
        if (!targetId && !planId && !taskId && !reportId && !feedbackId) return;
        try {
          const all = JSON.parse(localStorage.getItem('contextos-devops-dsh:pm') || '{}');
          all[uid] = { target: targetId, plan: planId, task: taskId, report: reportId, feedback: feedbackId };
          localStorage.setItem('contextos-devops-dsh:pm', JSON.stringify(all));
        } catch {}
      }, [avatar?.uid, targetId, planId, taskId, reportId, feedbackId]);
      useEffect(() => {
        if (!pm) return;
        if (targetId && !(pm.targets || []).some((x) => x.uid === targetId)) setTargetId('');
        if (planId && !(pm.plans || []).some((x) => x.uid === planId)) setPlanId('');
        if (taskId && !(pm.tasks || []).some((x) => x.uid === taskId)) setTaskId('');
        if (reportId && !(pm.reports || []).some((x) => x.uid === reportId)) setReportId('');
        if (feedbackId && !(pm.feedbacks || []).some((x) => x.uid === feedbackId)) setFeedbackId('');
      }, [pm]);
      const bootCal = (() => { try { return JSON.parse(localStorage.getItem('contextos-devops-dsh:cal') || 'null') || {}; } catch { return {}; } })();
      const [calStart, setCalStart] = useState(bootCal.start || '');
      const [calEnd, setCalEnd] = useState(bootCal.end || '');
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
      const [showLeft, setShowLeft] = useState(() => { try { const s = JSON.parse(localStorage.getItem('contextos-devops-dsh:panels') || 'null'); return s ? s.left !== false : true; } catch { return true; } });
      const [showRight, setShowRight] = useState(() => { try { const s = JSON.parse(localStorage.getItem('contextos-devops-dsh:panels') || 'null'); return s ? s.right !== false : true; } catch { return true; } });
      useEffect(() => { try { localStorage.setItem('contextos-devops-dsh:panels', JSON.stringify({ left: showLeft, right: showRight })); } catch {} }, [showLeft, showRight]);
      const [ctxMenu, setCtxMenu] = useState(null);
      const [sceneOpen, setSceneOpen] = useState(false);
      const [chatTab, setChatTab] = useState(() => { try { return localStorage.getItem('contextos-devops-dsh:chattab') || 'chat'; } catch { return 'chat'; } });
      useEffect(() => { try { localStorage.setItem('contextos-devops-dsh:chattab', chatTab); } catch {} }, [chatTab]);
      const [replyPop, setReplyPop] = useState(false);
      const [chatLoaded, setChatLoaded] = useState({});
      const [webMax, setWebMax] = useState(false);
      const [turn, setTurn] = useState(null);
      const [, setTick] = useState(0);
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
      const [input, setInput] = useState('');
      const [step, setStep] = useState(null);
      const [busy, setBusy] = useState(false);
      useEffect(() => { if (!busy) return; const t = setInterval(() => setTick((x) => x + 1), 400); return () => clearInterval(t); }, [busy]);
      const endRef = useRef(null);
      useEffect(() => { if (endRef.current) endRef.current.scrollTop = endRef.current.scrollHeight; }, [msgs, busy, open]);      const loadPm = useCallback(async () => {
        if (!node || !avatar?.uid) { setPm(null); return; }
        try { const d = await api('pmList', { node, uid: avatar.uid, lang: locale }); setPm(d || null); } catch { setPm(null); }
      }, [node, avatar?.uid, locale]);
      useEffect(() => { loadPm(); }, [loadPm]);      useEffect(() => {
        if (!open || !pm?.project || (pm.targets || []).length || seedingRef.current) return;
        seedingRef.current = true;
        api('seedProject', { node, uid: avatar.uid }).then(() => loadPm()).catch(() => {}).finally(() => { seedingRef.current = false; });
      }, [open, pm?.project?.place_uid, pm?.targets?.length, node, avatar?.uid, loadPm]);

      const targets = pm?.targets || [];
      const activeTarget = targets.find((t) => t.uid === targetId) || targets[0] || null;
      const allPlans = activeTarget?.plans || [];
      const plans = allPlans.filter((p) => !planStatusFilter.length || planStatusFilter.includes(p.status_name));
      const activePlan = plans.find((p) => p.uid === planId) || plans[0] || null;
      const allTasks = activePlan?.tasks || [];
      const tasks = allTasks.filter((t) => (!taskStatusFilter.length || taskStatusFilter.includes(t.status_name)) && (() => { const d = String(t.created_at || '').slice(0, 10); return (!calStart || d >= calStart) && (!calEnd || d <= calEnd); })());
      const activeTask = tasks.find((t) => t.uid === taskId) || tasks[0] || null;
      const allReports = activeTask?.reports || [];
      const reports = allReports.filter((r) => !reportTypeFilter.length || reportTypeFilter.includes(r.type_name));
      const activeReport = reports.find((r) => r.uid === reportId) || reports[0] || null;
      const allFeedbacks = activeReport?.feedbacks || [];
      const feedbacks = allFeedbacks.filter((f) => !feedbackStatusFilter.length || feedbackStatusFilter.includes(f.status_name));
      const activeFeedback = feedbacks.find((f) => f.uid === feedbackId) || feedbacks[0] || null;
      const planStatusOptions = [...new Set(allPlans.map((p) => p.status_name).filter(Boolean))].map((v) => ({ value: v, label: allPlans.find((p) => p.status_name === v)?.status_label || v }));
      const taskStatusOptions = [...new Set(allTasks.map((t) => t.status_name).filter(Boolean))].map((v) => ({ value: v, label: allTasks.find((t) => t.status_name === v)?.status_label || v }));
      const reportTypeOptions = [...new Set(allReports.map((r) => r.type_name).filter(Boolean))].map((v) => ({ value: v, label: allReports.find((r) => r.type_name === v)?.type_label || v }));
      const feedbackStatusOptions = [...new Set(allFeedbacks.map((f) => f.status_name).filter(Boolean))].map((v) => ({ value: v, label: allFeedbacks.find((f) => f.status_name === v)?.status_label || v }));
      const sessionKey = `contextos-devops-dsh:chat:${avatar?.uid || 'anon'}:${activePlan?.uid || 'none'}`;
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
      }, [msgs, sessionKey, open]);

      const push = (role, text, meta) => setMsgs((xs) => [...xs, { role, text, ...(meta || {}), t: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
      const ai = (text, meta) => push('ai', text, meta);
      const switchMode = (m) => {
        if (m === mode) return;
        setMode(m);
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
            ai(`已添加${args.kind || '项目数据'}：${d.uid ? String(d.uid).slice(0, 10) + '…' : '完成'}`);
          });
        }
        if (op === 'pmList' || op === 'pmTree') {
          return run('PM TREE', async () => { await loadPm(); ai('项目数据已刷新。'); });
        }
        if (op === 'pmModify' || op === 'pmUpdate') {
          return run(`PM MODIFY ${args.kind || ''}`, async () => {
            const itemUid = args.item_uid || (args.kind === 'target' ? activeTarget?.uid : args.kind === 'plan' ? activePlan?.uid : args.kind === 'task' ? activeTask?.uid : args.kind === 'report' ? activeReport?.uid : activeFeedback?.uid) || '';
            await api('pmModify', { node, uid: avatar?.uid || '', kind: args.kind || '', item_uid: itemUid, title: args.title || '', content: args.content || '', begin_time: args.begin_time || '', end_time: args.end_time || '', report_type: args.report_type || '', score: args.score || '', feedback_status: args.feedback_status || '' });
            await loadPm();
            ai(`已更新${args.kind || '项目数据'}。`);
          });
        }
        if (op === 'pmRemove' || op === 'pmDelete') {
          return run(`PM REMOVE ${args.kind || ''}`, async () => {
            const itemUid = args.item_uid || (args.kind === 'target' ? activeTarget?.uid : args.kind === 'plan' ? activePlan?.uid : args.kind === 'task' ? activeTask?.uid : args.kind === 'report' ? activeReport?.uid : activeFeedback?.uid) || '';
            await api('pmRemove', { node, uid: avatar?.uid || '', kind: args.kind || '', item_uid: itemUid });
            await loadPm();
            ai(`已删除${args.kind || '项目数据'}。`);
          });
        }
        if (op === 'projectStatus') {
          return run('PROJECT STATUS', async () => { const d = await api('projectStatus', { node, uid: avatar?.uid || '' }); ai(`项目：${d.project?.name || '未创建'}\n目标 ${d.counts?.target || '0'} · 计划 ${d.counts?.plan || '0'} · 任务 ${d.counts?.task || '0'} · 报告 ${d.counts?.report || '0'} · 反馈 ${d.counts?.feedback || '0'}`); });
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
        push('user', content); setInput(''); setFiles([]);
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
        const selection = {
          serve: node,
          space,
          place: selectedApp,
          avatar: selectedAvatar,
          scene: selectedScene,
          web: webPage,
          mode,
          functions,
        };
        const context = {
          mode,
          selection,
          functions,
          serve: node,
          place: selectedApp,
          avatar: selectedAvatar,
          scene: selectedScene,
          web: webPage,
          node,
          space,
          app: selectedApp,
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
          if (r?.action) await executeAction(r.action);
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
              h('span', null, `${(((busy ? Date.now() - (turn?.at || Date.now()) : (turn?.ms || 0)) / 1000).toFixed(1))}s`),
              h('span', null, `${turn?.est ? '≈' : ''}${turn?.tokens || 0} tok`),
              h('span', null, `${fmtBytes(turn?.reqBytes || 0)} → ${fmtBytes(turn?.resBytes || 0)}`)),
            h('div', { className: 'sum' }, turn ? (busy ? `Q: ${turn.q}` : `A: ${turn.a || turn.q}`) : (locale === 'zh' ? '可以就当前网页提问' : 'Ask about this page'))),
          h('span', { className: 'arr' }, replyPop ? '▾' : '▴')) : null,
        files.length ? h('div', { className: 'cx-compose-files' }, files.map((f, i) => h('span', { key: i, className: 'cx-tag cy' }, f.name, h('button', { className: 'cx-tag-x', onClick: () => setFiles((xs) => xs.filter((_, j) => j !== i)) }, '×')))) : null,
        h('textarea', { className: 'cx-compose-input', rows: 3, value: input, placeholder: 'Message or run a task, / commands, @ files or sessions', disabled: busy, onChange: (e) => setInput(e.target.value), onKeyDown: (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handle(input); } } }),
        h('div', { className: 'cx-compose-tools' },
          h('button', { className: 'cx-compose-plus', type: 'button', title: T('添加文件'), onClick: () => fileRef.current && fileRef.current.click() }, '+'),
          selector('serve', tt('serve'), nodes.find((n) => n.port === node)?.name || (node ? `:${node}` : ''), (nodes || []).map((n) => ({ key: n.port, label: n.name || `:${n.port}`, sub: `:${n.port} · ${n.state}`, on: n.port === node, go: () => onSelectNode(n.port) })), '没有服务节点'),
          selector('space', tt('space'), space, (spaces || []).map((s) => ({ key: s.name, label: s.name, sub: `${s.status} · ${s.version || ''}`, on: s.name === space, go: () => onSelectSpace(s.name) })), '该节点还没有项目空间'),
          selector('place', tt('applications'), app?.title || app?.name || '', (apps || []).map((a) => ({ key: `${a.space}:${a.command}:${a.place_uid || a.name}`, label: a.title || a.name, sub: `${a.city_name || ''} · ${a.company_name || ''} · ${a.service_name || ''}`, on: app?.place_uid === a.place_uid, go: () => onSelectApp(a) })), '最近应用为空'),
          h('div', { className: 'cx-compose-right' },
            selector('avatar', T('我的分身'), avatar?.name || '', (avatars || []).map((a) => ({ key: a.uid, label: a.name || a.username, sub: `${a.city || ''} · ${a.company || ''}`, on: a.uid === avatar?.uid, go: () => onSelectAvatar(a) })), '没有数字分身'),
            selector('bg', T('我的赛博世界'), bg?.name || '', (backgrounds || []).map((b) => ({ key: b.id, label: b.name, sub: b.image ? T('已上传照片 · 生成赛博世界') : T('默认赛博世界'), on: b.id === bg?.id, go: () => onSelectBg(b) })), '没有背景'),
            selector('mode', tt('mode'), modeLabel(CHAT_MODES.find((m) => m.id === mode) || CHAT_MODES[0]), CHAT_MODES.map((m) => ({ key: m.id, label: modeLabel(m), sub: m.id, on: m.id === mode, go: () => switchMode(m.id) })), ''),
            h('button', { className: 'cx-compose-send', type: 'button', disabled: busy, title: T('发送'), onClick: () => handle(input) }, busy ? '…' : '↑'))),
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
                m.role === 'ai' ? h('button', { className: 'cx-msg-copy', onClick: () => { try { navigator.clipboard.writeText(m.text); } catch {} } }, 'COPY') : null),
              h('div', { className: 'cx-msg-body' }, h(RichText, { text: m.text }))));

      const openPm = (kind, mode = 'create', item = null) => {
        const parent = kind === 'target' ? {} : kind === 'plan' ? (activeTarget ? { target_uid: activeTarget.uid } : null) : kind === 'task' ? (activePlan ? { plan_uid: activePlan.uid } : null) : kind === 'report' ? (activeTask ? { task_uid: activeTask.uid } : null) : kind === 'feedback' ? (activeReport ? { report_uid: activeReport.uid } : null) : null;
        if (!parent) { ai('请先在上级列表选择一个项目。'); return; }
        setPmForm({ kind, mode, item, parent });
      };
      const removePm = async (kind, item) => {
        if (!item || !window.confirm(`删除「${item.title}」？`)) return;
        try { await api('pmRemove', { node, uid: avatar?.uid || '', kind, item_uid: item.uid }); await loadPm(); ai(`已删除${kind}：${item.title}`); }
        catch (e) { ai(`删除失败：${String(e?.message || e)}`); }
      };
      const pmOps = (kind, item, createParentOk = true) => h('span', { className: 'cx-pm-ops' },
        createParentOk ? h('button', { className: 'cx-pm-op', onClick: () => openPm(kind), title: `Create ${kind}` }, '+') : null);
      const runPmAction = async (kind, item, action) => {
        const createKind = action === 'planCreate' ? 'plan' : action === 'taskCreate' ? 'task' : action === 'reportCreate' ? 'report' : action === 'feedbackCreate' ? 'feedback' : '';
        if (createKind) return openPm(createKind);
        if (action === 'modify') return openPm(kind, 'edit', item);
        if (action === 'remove') return removePm(kind, item);
        try { await api('pmAct', { node, uid: avatar?.uid || '', kind, item_uid: item.uid, action }); await loadPm(); ai(`${PM_SHORT[kind]}「${item.title}」执行 ${action}。`); }
        catch (e) { ai(`操作失败：${String(e?.message || e)}`); }
      };
      const pmItem = (item, active, onClick, sub, kind) => {
        const status = kind === 'plan' ? (item.status_name || 'created') : kind === 'task' ? (item.status_name || 'created') : kind === 'feedback' ? (item.status_name || 'canFinish') : kind === 'report' ? 'report' : 'target';
        const inlineActions = (item.actions || []).filter((a) => a !== 'modify' && a !== 'remove');
        return h('div', { key: item.uid, className: `cx-pm-card${active ? ' on' : ''}`, onClick, role: 'button' },
          h('div', { className: 'cx-pm-card-top' },
            h('span', { className: `cx-pm-type type-${kind}` }, locale === 'zh' ? (PM_SHORT[kind] || kind) : kind.toUpperCase()),
            h('div', { className: 'cx-pm-topright' },
              h('span', { className: `cx-pm-status status-${status}` }, item.status_label || (locale === 'zh' ? ({ created: '待提交', submited: '待审批', approved: '待开始', process: '进行中', finished: '已完成', canceled: '已取消', rejected: '已驳回', canFinish: '可完成', shouldImprove: '待改进', report: '报告', target: '目标' }[status] || status) : status)))),
          h('div', { className: 'cx-pm-title' }, item.title || item.uid),
          h('div', { className: 'cx-pm-meta' }, kind === 'plan' && item.begin_time ? `${item.begin_time} → ${item.end_time || ''}` : (item.created_at ? String(item.created_at).slice(0, 16) : ''), sub ? ` · ${sub}` : ''),
          h('div', { className: 'cx-pm-card-actions' },
            inlineActions.map((action) => h('button', { key: action, className: 'cx-pm-act', onClick: (e) => { e.stopPropagation(); runPmAction(kind, item, action); } }, T(PM_ACTION_LABEL[action] || action))),
            h(MenuButton, { items: [
              { label: '编辑', action: () => openPm(kind, 'edit', item) },
              { label: '删除', danger: true, action: () => removePm(kind, item) },
            ] })));
      };
      const leftPanel = h('aside', { className: 'cx-pm-side' },
        h('div', { className: 'cx-pm-h', ...foldHeadProps('targets') },
          h('div', { className: 'cx-pm-titleline' }, foldBtn('targets'), h(Ico, { name: 'target' }), h('span', null, sectionTitle(tt('target'), 'TARGETS')), h('span', { className: 'cx-pm-count' }, targets.length)),
          h('span', { className: 'cx-pm-ops' }, pmOps('target', activeTarget), h('button', { className: 'cx-pm-refresh', onClick: loadPm }, '↻'))),
        fold('targets') ? null : targets.length ? targets.map((t) => pmItem(t, activeTarget?.uid === t.uid, () => { setTargetId(t.uid); setPlanId(''); setTaskId(''); setReportId(''); setFeedbackId(''); }, `${t.plans?.length || 0} 个计划`, 'target')) : h('div', { className: 'cx-pm-empty' }, pm?.project ? '还没有目标' : '请先初始化项目管理'),
        h('div', { className: 'cx-pm-h', style: { marginTop: 12 }, ...foldHeadProps('plans') },
          h('div', { className: 'cx-pm-titleline' }, foldBtn('plans'), h(Ico, { name: 'plan' }), h('span', null, sectionTitle(tt('plan'), 'PLANS')), h('span', { className: 'cx-pm-count' }, plans.length)),
          h('span', { className: 'cx-pm-ops' }, pmOps('plan', activePlan, !!activeTarget), h('button', { className: 'cx-pm-refresh', onClick: loadPm }, '↻'))),
        fold('plans') ? null : (planStatusOptions.length > 1 ? h('div', { className: 'cx-pm-tools' }, h(MultiFilter, { label: tt('status'), options: planStatusOptions, value: planStatusFilter, onChange: setPlanStatusFilter })) : null),
        fold('plans') ? null : plans.length ? plans.map((p) => pmItem(p, activePlan?.uid === p.uid, () => { setPlanId(p.uid); setTaskId(''); setReportId(''); setFeedbackId(''); }, `${p.tasks?.length || 0} 任务`, 'plan')) : h('div', { className: 'cx-pm-empty' }, '选择目标后显示计划'));
      const rightPanel = h('aside', { className: 'cx-pm-side right' },
        h('div', { className: 'cx-pm-h', ...foldHeadProps('cal') }, h('div', { className: 'cx-pm-titleline' }, foldBtn('cal'), h(Ico, { name: 'clock' }), h('span', null, sectionTitle('时间', 'TIME')))),
        fold('cal') ? null : h(PmCalendar, { tasks: allTasks, start: calStart, end: calEnd, onChange: (a, b) => { setCalStart(a); setCalEnd(b); }, locale }),
        h('div', { className: 'cx-pm-h', ...foldHeadProps('tasks') },
          h('div', { className: 'cx-pm-titleline' }, foldBtn('tasks'), h(Ico, { name: 'task' }), h('span', null, sectionTitle(tt('task'), 'TASKS')), h('span', { className: 'cx-pm-count' }, tasks.length)),
          h('span', { className: 'cx-pm-ops' }, pmOps('task', activeTask, !!activePlan), h('button', { className: 'cx-pm-refresh', onClick: loadPm }, '↻'))),
        fold('tasks') ? null : (taskStatusOptions.length > 1 ? h('div', { className: 'cx-pm-tools' }, h(MultiFilter, { label: tt('status'), options: taskStatusOptions, value: taskStatusFilter, onChange: setTaskStatusFilter })) : null),
        fold('tasks') ? null : tasks.length ? tasks.map((t) => pmItem(t, activeTask?.uid === t.uid, () => { setTaskId(t.uid); setReportId(''); setFeedbackId(''); }, `${t.reports?.length || 0} 报告`, 'task')) : h('div', { className: 'cx-pm-empty' }, activePlan ? '该计划下还没有任务' : '先选择一个计划'),
        h('div', { className: 'cx-pm-h', style: { marginTop: 12 }, ...foldHeadProps('reports') },
          h('div', { className: 'cx-pm-titleline' }, foldBtn('reports'), h(Ico, { name: 'report' }), h('span', null, sectionTitle(tt('report'), 'REPORTS')), h('span', { className: 'cx-pm-count' }, reports.length)),
          h('span', { className: 'cx-pm-ops' }, pmOps('report', activeReport, !!activeTask), h('button', { className: 'cx-pm-refresh', onClick: loadPm }, '↻'))),
        fold('reports') ? null : (reportTypeOptions.length > 1 ? h('div', { className: 'cx-pm-tools' }, h(MultiFilter, { label: tt('type'), options: reportTypeOptions, value: reportTypeFilter, onChange: setReportTypeFilter })) : null),
        fold('reports') ? null : reports.length ? reports.map((r) => pmItem(r, activeReport?.uid === r.uid, () => { setReportId(r.uid); setFeedbackId(''); }, `${r.feedbacks?.length || 0} 反馈`, 'report')) : h('div', { className: 'cx-pm-empty' }, activeTask ? '该任务下还没有报告' : '先选择一个任务'),
        h('div', { className: 'cx-pm-h', style: { marginTop: 12 }, ...foldHeadProps('feedbacks') },
          h('div', { className: 'cx-pm-titleline' }, foldBtn('feedbacks'), h(Ico, { name: 'feedback' }), h('span', null, sectionTitle(tt('feedback'), 'FEEDBACK')), h('span', { className: 'cx-pm-count' }, feedbacks.length)),
          h('span', { className: 'cx-pm-ops' }, pmOps('feedback', activeFeedback, !!activeReport), h('button', { className: 'cx-pm-refresh', onClick: loadPm }, '↻'))),
        fold('feedbacks') ? null : (feedbackStatusOptions.length > 1 ? h('div', { className: 'cx-pm-tools' }, h(MultiFilter, { label: tt('status'), options: feedbackStatusOptions, value: feedbackStatusFilter, onChange: setFeedbackStatusFilter })) : null),
        fold('feedbacks') ? null : feedbacks.length ? feedbacks.map((f) => pmItem(f, activeFeedback?.uid === f.uid, () => setFeedbackId(f.uid), `${f.score || 0} 分`, 'feedback')) : h('div', { className: 'cx-pm-empty' }, activeReport ? '该报告下还没有反馈' : '先选择一个报告'),
        h('div', { className: `cx-mapsec${fold('map') ? ' folded' : ''}` },
          h('div', { className: 'cx-pm-h', ...foldHeadProps('map') }, h('div', { className: 'cx-pm-titleline' }, foldBtn('map'), h(Ico, { name: 'map' }), h('span', null, sectionTitle('地点', 'LOCATION')))),
          fold('map') ? null : h(TaskMap, { tasks, activeTask, onSelect: (t) => { setTaskId(t.uid); setReportId(''); setFeedbackId(''); } })));

      if (!open) return null;
      return h('div', { className: `cx-chat${full ? ' full' : ''}${docked ? ' dock' : ''}${webMax && chatTab !== 'chat' ? ' webmax' : ''}`, 'data-theme': theme },
        h('div', { className: `cx-chat-bg${bg?.image ? ' photo' : ''}` }, bg?.image ? h('img', { src: bg.image, alt: '' }) : (full ? h(ThreeCity) : null)),
        h('div', { className: 'cx-chat-body' },
          full && showLeft ? leftPanel : null,
          h('div', { className: 'cx-chat-center' },
            h('div', { className: 'cx-chat-h' },
              h('div', { className: 'cx-chat-hin' },
                h('div', { className: 'cx-chat-brand' },
                  h('div', { className: 'cx-chat-orb' }),
                  h('div', { className: 'cx-chat-copy' }, h('div', { className: 'cx-chat-title' }, 'CONTEXTOS COPILOT'), h('div', { className: 'cx-chat-sub' }, `${tt('avatar')} · ${tt('factory')} · ${tt('iot')}`))),
                h('div', { className: 'cx-chat-actions' },
                  ...(!docked ? [
                    h('select', { className: 'cx-select', value: themeMode, title: tt('light') + ' / ' + tt('dark'), onChange: (e) => setThemeMode(e.target.value) },
                      h('option', { value: 'system' }, tt('system')), h('option', { value: 'light' }, tt('light')), h('option', { value: 'dark' }, tt('dark'))),
                    h('select', { className: 'cx-select', value: langMode, title: tt('chinese') + ' / English', onChange: (e) => setLangMode(e.target.value) },
                      h('option', { value: 'system' }, tt('system')), h('option', { value: 'zh' }, '中文'), h('option', { value: 'en' }, 'English')),
                    h('button', { className: 'cx-btn xs cx-icon-btn', onClick: onInit, title: 'Initialize' }, '⚡'),
                  ] : []),
                  h('button', { className: 'cx-btn xs cx-icon-btn', onClick: onToggleFull, title: (full && !docked) ? tt('restore') : tt('maximize') }, (full && !docked) ? '❐' : '⛶'),
                  h('button', { className: `cx-btn xs cx-icon-btn${showLeft ? ' on' : ''}`, type: 'button', title: showLeft ? T('隐藏左栏') : T('显示左栏'), onClick: () => setShowLeft((v) => !v) }, '◧'),
                  h('button', { className: `cx-btn xs cx-icon-btn${showRight ? ' on' : ''}`, type: 'button', title: showRight ? T('隐藏右栏') : T('显示右栏'), onClick: () => setShowRight((v) => !v) }, '◨'),
                  h('button', { className: 'x', onClick: onClose, title: tt('close') }, '×')))),
            h('div', { className: 'cx-chat-tabs' },
              h('button', { className: `cx-chat-tab${chatTab === 'chat' ? ' on' : ''}`, onClick: () => setChatTab('chat') }, tt('chat')),
              (webTabs || []).map((t) => h('button', { key: t.id, className: `cx-chat-tab${chatTab === t.id ? ' on' : ''}`, title: t.url, onClick: () => setChatTab(t.id) },
                h('span', { className: 'nm' }, t.title || 'web'),
                h('button', { className: 'x', onClick: (e) => { e.stopPropagation(); onCloseWebTab && onCloseWebTab(t.id); if (chatTab === t.id) setChatTab('chat'); } }, '×')))),
            chatWebTab ? h('div', { className: 'cx-addrbar' },
              h('button', { className: 'nav', disabled: !(hist && hist.idx > 0), onClick: back, title: T('后退') }, '←'),
              h('button', { className: 'nav', disabled: !(hist && hist.idx < hist.list.length - 1), onClick: fwd, title: T('前进') }, '→'),
              h('button', { className: 'nav', onClick: () => onReloadWebTab && onReloadWebTab(chatWebTab.id), title: T('刷新') }, '↻'),
              h('input', { className: 'cx-addr-input', value: addr, placeholder: 'https://…', onChange: (e) => setAddr(e.target.value), onKeyDown: (e) => { if (e.key === 'Enter') go(addr); } }),
              h('button', { className: 'nav', onClick: () => setWebMax((v) => !v), title: webMax ? tt('restore') : tt('maximize') }, webMax ? '❐' : '⛶'),
              h(MenuButton, { items: [
                { label: '复制地址', action: () => { try { navigator.clipboard.writeText(chatWebTab.base || chatWebTab.url); } catch {} } },
                { label: '在浏览器打开', action: () => { try { window.open(chatWebTab.base || chatWebTab.url, '_blank'); } catch {} } },
                { label: '在管理中打开', action: () => onManageWebTab && onManageWebTab(chatWebTab.id) },
                { label: '关闭标签', danger: true, action: () => { onCloseWebTab && onCloseWebTab(chatWebTab.id); setChatTab('chat'); } },
              ] })) : null,
            h('div', { className: 'cx-chat-webframes', style: chatTab === 'chat' ? { display: 'none' } : null },
              (webTabs || []).map((t) => h('iframe', { key: t.id, src: t.url, title: t.title || 'web', allow: 'clipboard-read; clipboard-write', onLoad: () => setChatLoaded((m) => (m[t.id] ? m : { ...m, [t.id]: 1 })), style: chatTab === t.id ? null : { display: 'none' } })),
              chatWebTab && !chatLoaded[chatWebTab.id] ? h('div', { className: 'cx-webmask' }, T('加载中…')) : null),
            h('div', { className: 'cx-chat-b', ref: endRef, style: chatTab !== 'chat' ? { display: 'none' } : null, onContextMenu: (e) => { if (e.target.closest('.cx-msg, button, a, input, textarea, select, .cx-sel, .cx-hint, .cx-suggest')) return; openCtx(e, 'bg'); } },
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
            modeQuick(CHAT_MODES.find((x) => x.id === mode)).map((label) => h('button', { key: label, onClick: () => handle(label) }, `→  ${label}`))) : null),
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
              h('div', { className: 'h' }, h('span', null, locale === 'zh' ? '最近一条回复' : 'LATEST REPLY'), h('button', { onClick: () => setReplyPop(false) }, '×')),
              h('div', { className: 'b' }, lastAi ? h(RichText, { text: lastAi.text }) : h('div', { className: 'cx-empty' }, '—'))) : null),
          full && showRight ? rightPanel : null),
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

    function Page() {
      const bootSelRef = useRef(null);
      if (bootSelRef.current === null) { try { bootSelRef.current = JSON.parse(localStorage.getItem('contextos-devops-dsh:sel') || 'null') || {}; } catch { bootSelRef.current = {}; } }
      const [nodes, setNodes] = useState([]);
      const [node, setNode] = useState(() => bootSelRef.current?.node ?? null);
      const [spaces, setSpaces] = useState([]);
      const [space, setSpace] = useState(() => bootSelRef.current?.space ?? null);
      const [apps, setApps] = useState([]);
      const [app, setApp] = useState(() => bootSelRef.current?.app || null);
      const [modal, setModal] = useState(null);
      const [appMode, setAppMode] = useState('recent');
      const [store, setStore] = useState([]);
      const [storeService, setStoreService] = useState(null);
      const [webTabs, setWebTabs] = useState(() => {
        try {
          const saved = JSON.parse(localStorage.getItem(WEBTABS_KEY) || 'null');
          if (!saved || !Array.isArray(saved.tabs)) return [];
          return saved.tabs.filter((t) => t && (t.base || t.url)).slice(0, 8).map((t, i) => ({
            id: t.id || `w${Date.now().toString(36)}${i}`,
            base: t.base || t.url, url: t.base || t.url,
            title: t.title || t.base || t.url,
            reload: 0, app: t.app || null,
          }));
        } catch { return []; }
      });
      const [webLoaded, setWebLoaded] = useState({});
      const [activeWeb, setActiveWeb] = useState(() => {
        try { const saved = JSON.parse(localStorage.getItem(WEBTABS_KEY) || 'null'); return saved?.active || null; } catch { return null; }
      });
      const [viewMode, setViewMode] = useState(() => { try { const v = localStorage.getItem('contextos-devops-dsh:view'); return ['chat', 'manage', 'dev'].indexOf(v) >= 0 ? v : 'chat'; } catch { return 'chat'; } });
      const [chatFull, setChatFull] = useState(() => { try { const v = localStorage.getItem('contextos-devops-dsh:chatfull'); return v === null ? true : v === '1'; } catch { return true; } });
      const [themeMode, setThemeMode] = useState(() => { try { return localStorage.getItem('contextos-devops-dsh:theme') || 'system'; } catch { return 'system'; } });
      const [theme, setTheme] = useState(() => { const sys = (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) ? 'light' : 'dark'; try { const m = localStorage.getItem('contextos-devops-dsh:theme') || 'system'; return m === 'system' ? sys : m; } catch { return sys; } });
      const [langMode, setLangMode] = useState(() => { try { return localStorage.getItem('contextos-devops-dsh:lang') || 'system'; } catch { return 'system'; } });
      const [locale, setLocale] = useState(() => { try { const m = localStorage.getItem('contextos-devops-dsh:lang') || 'system'; return m === 'system' ? browserLang() : m; } catch { return browserLang(); } });
      CURRENT_LANG = locale === 'zh' ? 'zh' : 'en';
      const bootConsole = (() => { try { return JSON.parse(localStorage.getItem('contextos-devops-dsh:console') || 'null') || {}; } catch { return {}; } })();
      const [consoleOpen, setConsoleOpen] = useState(bootConsole.open === true);
      const [consoleTab, setConsoleTab] = useState(bootConsole.tab || 'activity');
      const [consoleHeight, setConsoleHeight] = useState(Number(bootConsole.height) || 190);
      const [events, setEvents] = useState([]);
      const [sort, setSort] = useState({ key: '', dir: 1 });
      const [detail, setDetail] = useState(null);
      const parseDebug = (m) => {
        const text = String(m || '').trim().replace(/^↳\s*/, '');
        const mm = /^(GET|POST|PUT|DELETE|PATCH)\s+(\S+)([\s\S]*)$/i.exec(text);
        return mm ? { method: mm[1].toUpperCase(), url: mm[2], rest: mm[3], raw: text } : { method: '', url: text, rest: '', raw: text };
      };
      const [files, setFiles] = useState(null);
      useEffect(() => { try { localStorage.setItem('contextos-devops-dsh:console', JSON.stringify({ open: consoleOpen, tab: consoleTab, height: consoleHeight })); } catch {} }, [consoleOpen, consoleTab, consoleHeight]);
      const [nodeStatusFilter, setNodeStatusFilter] = useState([]);
      const [spaceStatusFilter, setSpaceStatusFilter] = useState([]);
      const [appSpaceFilter, setAppSpaceFilter] = useState([]);
      const [storeSpaceFilter, setStoreSpaceFilter] = useState([]);
      const t = useCallback((key) => term(locale, key), [locale]);
      const tp = useCallback((key) => locale === 'zh' ? `${term('zh', key)} / ${term('en', key)}` : term('en', key), [locale]);
      useEffect(() => {
        const mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: light)') : null;
        const apply = () => setTheme(themeMode === 'system' ? (mq && mq.matches ? 'light' : 'dark') : themeMode);
        apply();
        if (!mq) return;
        mq.addEventListener?.('change', apply);
        return () => mq.removeEventListener?.('change', apply);
      }, [themeMode]);
      useEffect(() => {
        const apply = () => setLocale(langMode === 'system' ? browserLang() : langMode);
        apply();
        window.addEventListener?.('languagechange', apply);
        return () => window.removeEventListener?.('languagechange', apply);
      }, [langMode]);
      useEffect(() => { try { localStorage.setItem('contextos-devops-dsh:theme', themeMode); } catch {} }, [themeMode]);
      useEffect(() => { try { localStorage.setItem('contextos-devops-dsh:lang', langMode); } catch {} }, [langMode]);
      useEffect(() => { try { localStorage.setItem('contextos-devops-dsh:view', viewMode); } catch {} }, [viewMode]);
      useEffect(() => { try { localStorage.setItem('contextos-devops-dsh:chatfull', chatFull ? '1' : '0'); } catch {} }, [chatFull]);
      const shellRef = useRef(null);
      React.useLayoutEffect(() => {
        const el = shellRef.current; if (!el) return;
        const check = () => {
          try {
            const left = el.getBoundingClientRect().left;
            const target = parseFloat(getComputedStyle(el).getPropertyValue('--cx-host-left')) || 168;
            const pad = left < 120 ? Math.max(0, target - 16 - left) : 0;
            el.style.setProperty('--cx-host-left-pad', pad + 'px');
            el.classList.toggle('host-chrome', pad > 0);
          } catch {}
        };
        check();
        const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(check) : null;
        if (ro) { ro.observe(el); ro.observe(document.documentElement); }
        window.addEventListener('resize', check);
        const t = setTimeout(check, 400);
        return () => { if (ro) ro.disconnect(); window.removeEventListener('resize', check); clearTimeout(t); };
      }, []);
      const [initState, setInitState] = useState(null);
      const [nodesLoaded, setNodesLoaded] = useState(false);
      const autoInitRef = useRef(false);
      const initBusyRef = useRef(false);
      const [showDevices, setShowDevices] = useState(false);
      const [avatarData, setAvatarData] = useState({ active: '', items: [] });
      const [bgData, setBgData] = useState({ active: '', items: [] });
      const [bg, setBg] = useState(null);
      const [avatar, setAvatar] = useState(null);
      const [showAvatars, setShowAvatars] = useState(false);
      const [busy, setBusy] = useState('');
      const [error, setError] = useState('');
      const [logs, setLogs] = useState([{ t: new Date().toLocaleTimeString(), m: 'CONTROL PLANE READY · 选择节点开始', k: 'ok' }]);
      const [debug, setDebug] = useState([]);
      const logRef = useRef(null);
      const log = useCallback((m, k = '') => {
        setLogs((ls) => [...ls.slice(-80), { t: new Date().toLocaleTimeString(), m, k }]);
        setTimeout(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; }, 30);
      }, []);
      useEffect(() => {
        const onDebug = (e) => {
          const text = String(e?.detail?.text || '');
          if (!text) return;
          setDebug((ds) => [...ds.slice(-200), { t: new Date().toLocaleTimeString(), m: text }]);
        };
        window.addEventListener('cx-debug', onDebug);
        return () => window.removeEventListener('cx-debug', onDebug);
      }, []);
      useEffect(() => {
        const onEvent = (e) => {
          const d = e?.detail || {};
          const at = new Date().toISOString().slice(11, 23);
          setEvents((xs) => [...xs.slice(-399), { id: `${at}-${Math.random().toString(36).slice(2, 6)}`, at, kind: d.kind || 'event', text: String(d.text || ''), ok: d.ok !== false, ms: d.ms, error: String(d.error || '') }]);
        };
        const onClick = (e) => {
          const btn = e.target && e.target.closest ? e.target.closest('button, .cx-menu-item, .cx-pm-card, .cx-chip, [role="button"]') : null;
          if (!btn) return;
          const label = String(btn.getAttribute('title') || btn.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 40);
          const cls = String(btn.className || '').split(' ').slice(0, 2).join('.');
          const at = new Date().toISOString().slice(11, 23);
          setEvents((xs) => [...xs.slice(-399), { id: `${at}-${Math.random().toString(36).slice(2, 6)}`, at, kind: 'click', text: `${cls} · ${label}`, ok: true }]);
        };
        window.addEventListener('cx-event', onEvent);
        document.addEventListener('click', onClick, true);
        return () => { window.removeEventListener('cx-event', onEvent); document.removeEventListener('click', onClick, true); };
      }, []);
      useEffect(() => { setSort({ key: '', dir: 1 }); setDetail(null); }, [consoleTab]);
      useEffect(() => { if (consoleTab !== 'files') return; api('files').then(setFiles).catch(() => setFiles({ error: 'files 接口不可用（重启 DSH 后生效）', files: [] })); }, [consoleTab]);
      useEffect(() => {
        const el = logRef.current;
        if (!el) return;
        setTimeout(() => { if (el) el.scrollTop = el.scrollHeight; }, 30);
      }, [logs, debug, events, files, consoleTab]);
      const stateRows = (() => {
        if (consoleTab !== 'state') return [];
        const liveRows = [
          { k: '', t: 'LIVE node', m: String(node ?? '') },
          { k: '', t: 'LIVE space', m: space || '' },
          { k: '', t: 'LIVE app', m: app?.name || '' },
          { k: '', t: 'LIVE avatar', m: avatar?.name || '' },
          { k: '', t: 'LIVE scene', m: bg?.name || '' },
          { k: '', t: 'LIVE view', m: viewMode },
          { k: '', t: 'LIVE locale', m: locale },
        ];
        try {
          return [...liveRows, ...Object.keys(localStorage).filter((k) => k.startsWith('contextos-devops-dsh:')).sort().map((k) => ({ k: 'ok', t: k.replace('contextos-devops-dsh:', ''), m: String(localStorage.getItem(k) || '').slice(0, 260) }))];
        } catch { return liveRows; }
      })();
      const prettyJson = (v) => { try { return JSON.stringify(JSON.parse(v), null, 2); } catch { return String(v ?? ''); } };
      const rowKey = (r) => `${r.t}|${r.req || r.text || r.m || ''}`;
      const openDetail = (r) => {
        const key = rowKey(r);
        if (consoleTab === 'activity') { setDetail({ key, row: r, title: 'ACTIVITY', fields: [['TIME', r.t], ['TYPE', r.k || '—'], ['MESSAGE', r.m]] }); return; }
        if (consoleTab === 'events') { setDetail({ key, row: r, title: 'EVENT', fields: [['TIME', r.t], ['KIND', r.kind], ['RESULT', r.ok], ['MS', r.ms ?? '—']], body: r.text }); return; }
        if (consoleTab === 'debug') { setDetail({ key, row: r, title: 'REQUEST', fields: [['TIME', r.t], ['METHOD', r.method], ['URL', r.req]], body: r.raw }); return; }
        if (consoleTab === 'state') { setDetail({ key, row: r, title: 'STATE', fields: [['KEY', r.t]], body: prettyJson(r.m) }); return; }
        if (consoleTab === 'files') {
          setDetail({ key, row: r, title: 'FILE', fields: [['NAME', r.t], ['SIZE', r.m], ['MODIFIED', r.x]], body: '加载中…' });
          if (r.t && r.t !== 'DIR') {
            api('file', { name: r.t }).then((d) => setDetail((cur) => (cur && cur.key === key ? { ...cur, body: d.content } : cur)))
              .catch((e) => setDetail((cur) => (cur && cur.key === key ? { ...cur, body: String(e?.message || e) } : cur)));
          }
        }
      };
      const consoleTable = (() => {
        if (consoleTab === 'activity') return { cols: [{ k: 't', label: 'TIME' }, { k: 'k', label: 'TYPE' }, { k: 'm', label: 'MESSAGE' }], rows: logs };
        if (consoleTab === 'events') return { cols: [{ k: 't', label: 'TIME' }, { k: 'kind', label: 'KIND' }, { k: 'text', label: 'DETAIL' }, { k: 'ms', label: 'MS' }, { k: 'ok', label: 'RESULT' }], rows: events.map((e) => ({ t: e.at, kind: String(e.kind || '').toUpperCase(), text: `${e.text}${e.error ? ` · ${e.error}` : ''}`, ms: e.ms ?? '', ok: e.ok === false ? 'ERR' : 'OK' })) };
        if (consoleTab === 'debug') return { cols: [{ k: 't', label: 'TIME' }, { k: 'method', label: 'METHOD' }, { k: 'req', label: 'REQUEST' }], rows: debug.map((l) => { const p = parseDebug(l.m); return { t: l.t, method: p.method || '—', req: p.url, rest: p.rest, raw: p.raw }; }) };
        if (consoleTab === 'state') return { cols: [{ k: 't', label: 'KEY' }, { k: 'm', label: 'VALUE' }], rows: stateRows };
        if (consoleTab === 'files') {
          if (files?.error) return { cols: [{ k: 't', label: 'ERROR' }], rows: [{ t: files.error }] };
          const rows = (files?.files || []).map((f) => ({ t: f.name, m: f.size, x: f.mtime }));
          if (files?.dir) rows.unshift({ t: 'DIR', m: '', x: files.dir });
          return { cols: [{ k: 't', label: 'FILE' }, { k: 'm', label: 'SIZE' }, { k: 'x', label: 'MODIFIED' }], rows };
        }
        return { cols: [], rows: [] };
      })();
      const sortKey = sort.key && consoleTable.cols.some((c) => c.k === sort.key) ? sort.key : (consoleTable.cols[0]?.k || '');
      const sortedRows = (() => {
        const dir = sort.dir || 1;
        return [...consoleTable.rows].sort((a, b) => {
          const va = a[sortKey], vb = b[sortKey];
          const na = Number(va), nb = Number(vb);
          if (String(va ?? '').trim() !== '' && String(vb ?? '').trim() !== '' && !Number.isNaN(na) && !Number.isNaN(nb)) return (na - nb) * dir;
          return String(va ?? '').localeCompare(String(vb ?? '')) * dir;
        });
      })();
      const act = useCallback(async (label, fn) => {
        setBusy(label); setError('');
        log(`→ ${label}`, 'run');
        try { const r = await fn(); log(`✓ ${label}`, 'ok'); return r; }
        catch (e) { const m = String(e?.message || e); setError(m); log(`✗ ${label}: ${m}`, 'err'); return undefined; }
        finally { setBusy(''); }
      }, [log]);

      const loadNodes = useCallback(async () => {
        const d = await api('nodes');
        const list = d.nodes || [];
        setNodes(list);
        setNodesLoaded(true);
        setNode((cur) => cur != null ? (list.some((n) => n.port === cur) ? cur : list[0]?.port ?? null) : (list.find((n) => n.state === 'running')?.port ?? list[0]?.port ?? null));
        return list;
      }, []);
      const loadSpaces = useCallback(async (port) => {
        if (!port) { setSpaces([]); return []; }
        try { const d = await api('spaces', { node: port }); setSpaces(d || []); return d || []; } catch { setSpaces([]); return []; }
      }, []);
      const loadApps = useCallback(async (port, sp, uid = '') => {
        if (!port) { setApps([]); return []; }
        try { const d = await api('apps', { node: port, space: sp || '', uid }); setApps(d || []); return d || []; }
        catch (e) {
          if (/unknown op|unknown op apps/i.test(String(e?.message || e))) {
            const d = await fallbackApps(port, sp); setApps(d); return d;
          }
          setApps([]); return [];
        }
      }, []);
      const loadAvatars = useCallback(async (port) => {
        if (!port) { setAvatarData({ active: '', items: [] }); setAvatar(null); return null; }
        try {
          const d = await api('avatars', { node: port });
          setAvatarData(d || { active: '', items: [] });
          const a = (d?.items || []).find((x) => x.uid === d?.active) || d?.items?.[0] || null;
          setAvatar(a);
          return a;
        } catch { setAvatarData({ active: '', items: [] }); setAvatar(null); return null; }
      }, []);
      const applyScene = useCallback((b) => {
        const p = b?.params || {};
        setThemeMode(p.theme || 'system');
        setLangMode(p.lang || 'system');
      }, []);
      const loadBackgrounds = useCallback(async (port) => {
        if (!port) { setBgData({ active: '', items: [] }); setBg(null); return null; }
        try {
          const d = await api('backgrounds', { node: port });
          setBgData(d || { active: '', items: [] });
          const b = (d?.items || []).find((x) => x.id === d?.active) || d?.items?.[0] || null;
          setBg(b);
          applyScene(b);
          return b;
        } catch { setBgData({ active: '', items: [] }); setBg(null); return null; }
      }, [applyScene]);
      const openInit = useCallback(() => {
        setInitState({ phase: 'setup', running: false, done: false, error: '', params: { ...INIT_DEFAULTS }, steps: INIT_STEPS.map((x) => ({ ...x, status: 'wait', detail: '' })) });
      }, []);
      const runInit = useCallback(async (params = {}) => {
        if (initBusyRef.current) return;
        initBusyRef.current = true;
        const cfg = { ...INIT_DEFAULTS, ...params, avatar: { ...(params.avatar || {}) }, scene: { ...(params.scene || {}) }, project: { ...(params.project || {}) } };
        const steps = INIT_STEPS.map((x) => ({ ...x, status: 'wait', detail: '' }));
        setInitState({ phase: 'running', running: true, done: false, error: '', params: cfg, steps });
        const mark = (id, status, detail = '') => setInitState((prev) => prev ? ({ ...prev, steps: prev.steps.map((x) => x.id === id ? { ...x, status, detail } : x) }) : prev);
        const finish = () => setInitState((prev) => prev ? ({ ...prev, phase: 'done', running: false, done: true, steps: prev.steps.map((x) => ({ ...x, status: x.status === 'wait' ? 'done' : x.status })) }) : prev);
        let current = 'node';
        try {
          let nodePort = 0;
          if (cfg.mode === 'remote') {
            mark('node', 'run', cfg.remoteUrl || '');
            const r = await api('remoteLogin', { url: cfg.remoteUrl, user: cfg.remoteUser, pass: cfg.remotePass });
            mark('node', 'done', `已连接 ${cfg.remoteUrl} · sessid ${String(r.sessid).slice(0, 10)}…`);
            ['spaces', 'avatar', 'scene', 'project'].forEach((id) => mark(id, 'done', T('远程连接：跳过本地步骤')));
            current = 'chat'; mark('chat', 'run');
            try { localStorage.setItem('contextos-devops-dsh:init', '1'); } catch {}
            setViewMode('chat'); setChatFull(true);
            mark('chat', 'done', T('远程会话已建立'));
            finish();
            return;
          }
          if (cfg.mode === 'docker') {
            mark('node', 'run', `docker ${cfg.image || ''} · :${cfg.port}`);
            const r = await api('dockerDeploy', { port: Number(cfg.port) || 9188, dir: cfg.dir || '', image: cfg.image || '' });
            nodePort = r.port;
          } else if (cfg.mode === 'remoteDeploy') {
            mark('node', 'run', `ssh ${cfg.sshUser || ''}@${cfg.host || ''} · :${cfg.port}`);
            const r = await api('remoteDeploy', { host: cfg.host, user: cfg.sshUser, ssh_port: cfg.sshPort, port: Number(cfg.port) || 9188, dir: cfg.dir || '', image: cfg.image || '' });
            nodePort = r.port;
          } else {
            const list = await loadNodes();
            const found = list.find((n) => Number(n.port) === Number(cfg.port) && n.state === 'running');
            nodePort = found?.port;
            if (!nodePort) {
              const existing = list.find((n) => Number(n.port) === Number(cfg.port));
              mark('node', 'run', `port ${cfg.port} · ${cfg.dir}`);
              if (existing) {
                await api('start', { port: Number(cfg.port) });
                nodePort = existing.port;
              } else {
                const mode = cfg.repo && cfg.repo !== INIT_DEFAULTS.repo ? 'source' : 'copy';
                await api('deploy', { port: Number(cfg.port) || 9188, dir: cfg.dir, repo: cfg.repo, mode });
                nodePort = Number(cfg.port) || 9188;
              }
            }
            const alive = (await loadNodes()).find((n) => Number(n.port) === Number(nodePort));
            if (!alive || alive.state !== 'running') throw new Error(`节点 :${nodePort} 未就绪（${alive?.state || 'missing'}），请查看 ${cfg.dir || '节点目录'}/var/log/deploy.log`);
          }
          mark('node', 'done', `node :${nodePort}`);

          current = 'spaces';
          mark('spaces', 'run', T('云社区 · 云办公'));
          await api('officialSpaces', { node: nodePort, keys: ['community', 'enterprise'] });
          mark('spaces', 'done', T('云社区 + 云办公已就绪'));

          current = 'avatar';
          mark('avatar', 'run', cfg.avatar.name || '');
          const a = await api('createAvatar', { node: nodePort, name: cfg.avatar.name || '我的数字分身', company: cfg.avatar.company || '云轩领航', city: cfg.avatar.city || '深圳市', persona: '专业、亲和、直接', preferences: '技术、产品、效率', style: '简洁、结构化' });
          if (cfg.avatar.image) await api('updateAvatar', { node: nodePort, uid: a.uid, patch: { image: cfg.avatar.image } }).catch(() => {});
          await api('setAvatar', { node: nodePort, uid: a.uid });
          mark('avatar', 'done', `uid ${String(a.uid).slice(0, 10)}…${cfg.avatar.image ? ' · ' + T('已上传头像') : ''}`);

          current = 'scene';
          mark('scene', 'run', cfg.scene.name || '');
          try {
            const b = await api('createBackground', { node: nodePort, name: cfg.scene.name || '我的赛博世界' });
            const sceneId = b?.created?.id || b?.id || '';
            if (sceneId && cfg.scene.image) await api('updateBackground', { node: nodePort, id: sceneId, patch: { image: cfg.scene.image } }).catch(() => {});
            if (sceneId) await api('setBackground', { node: nodePort, id: sceneId });
            mark('scene', 'done', `${cfg.scene.name || T('我的赛博世界')}${cfg.scene.image ? ' · ' + T('已上传背景') : ''}`);
          } catch (e) {
            mark('scene', 'done', T('跳过：背景服务未就绪'));
          }

          current = 'project';
          mark('project', 'run', cfg.project.name || '');
          const t = await api('pmCreate', { node: nodePort, uid: a.uid, kind: 'target', title: cfg.project.name || '我的第一个项目', content: cfg.project.desc || '' });
          const p = await api('pmCreate', { node: nodePort, uid: a.uid, kind: 'plan', target_uid: t.uid, title: `${cfg.project.name || '我的第一个项目'} · 计划`, content: cfg.project.desc || '' });
          const tasks = String(cfg.project.tasks || '').split('\n').map((x) => x.trim()).filter(Boolean);
          for (const title of tasks) await api('pmCreate', { node: nodePort, uid: a.uid, kind: 'task', plan_uid: p.uid, title, content: '' });
          mark('project', 'done', `1 ${T('目标')} · 1 ${T('计划')} · ${tasks.length} ${T('任务')}`);

          current = 'chat';
          mark('chat', 'run');
          setNode(nodePort);
          await loadSpaces(nodePort);
          const active = await loadAvatars(nodePort);
          await loadBackgrounds(nodePort).catch(() => null);
          await loadApps(nodePort, '', active?.uid || '');
          try { localStorage.setItem('contextos-devops-dsh:init', '1'); } catch {}
          setViewMode('chat');
          setChatFull(true);
          mark('chat', 'done', T('对话已就绪'));
          finish();
        } catch (e) {
          const label = (INIT_STEPS.find((x) => x.id === current) || {}).label || current;
          setInitState((prev) => prev ? { ...prev, phase: 'error', running: false, done: false, error: `${label}失败：${String(e?.message || e)}`, steps: prev.steps.map((x) => x.id === current || x.status === 'run' ? { ...x, status: 'err' } : x) } : prev);
        } finally {
          initBusyRef.current = false;
        }
      }, [loadNodes, loadAvatars, loadBackgrounds, loadSpaces, loadApps]);

      const loadStore = useCallback(async (port) => {
        if (!port) { setStore([]); return []; }
        try { const d = await api('storeApps', { node: port, lang: locale }); setStore(d || []); return d || []; } catch { setStore([]); return []; }
      }, [locale]);

      useEffect(() => { act('LOAD NODES', loadNodes); }, [act, loadNodes]);
      const firstNodeEffectRef = useRef(true);
      useEffect(() => { const keep = firstNodeEffectRef.current && bootSelRef.current?.node; firstNodeEffectRef.current = false; if (!keep) { setSpace(null); setApps([]); setApp(null); } setAppMode('recent'); if (node) { act('LOAD SPACES', () => loadSpaces(node)); act('LOAD AVATARS', async () => { const a = await loadAvatars(node); await loadApps(node, null, a?.uid || ''); }); act('LOAD BACKGROUNDS', () => loadBackgrounds(node)); } }, [node, act, loadSpaces, loadApps, loadAvatars]);
      const prevSelSpaceRef = useRef(space);
      useEffect(() => { const changed = prevSelSpaceRef.current !== space; prevSelSpaceRef.current = space; if (changed) setApp(null); if (node) act('LOAD RECENT', () => loadApps(node, space, avatar?.uid || '')); }, [node, space, avatar?.uid, act, loadApps]);
      useEffect(() => {
        if (!avatar?.project?.place_uid) return;
        const tick = async () => {
          try {
            const d = await api('projectStatus', { node, uid: avatar.uid });
            const n = (v) => Number(String(v || '0').split('x')[0]) || 0;
            const tasks = n(d.counts?.task), reports = n(d.counts?.report);
            if (tasks > reports) log(`⏰ 项目提醒：${tasks - reports} 个任务还没有报告，去完成并提交报告`, 'run');
          } catch { /* project status is best effort */ }
        };
        const timer = setInterval(tick, 60000);
        return () => clearInterval(timer);
      }, [avatar?.project?.place_uid, node, log]);


      useEffect(() => {
        if (!nodesLoaded || autoInitRef.current) return;
        autoInitRef.current = true;
        let done = false;
        try { done = localStorage.getItem('contextos-devops-dsh:init') === '1'; } catch {}
        if (!done) openInit();
      }, [nodesLoaded, openInit]);

      const refreshAll = () => act('REFRESH', async () => {
        await loadNodes();
        const a = node ? await loadAvatars(node) : null;
        if (node) await loadSpaces(node);
        if (node) await loadApps(node, space, a?.uid || avatar?.uid || '');
        if (node && appMode === 'store') await loadStore(node);
      });
      const openUrl = (url) => { try { window.open(url, '_blank', 'noopener'); } catch {} };
      const withView = (raw) => {
        try {
          const u = new URL(raw, window.location.origin);
          u.searchParams.set('theme', theme);
          u.searchParams.set('language', locale === 'zh' ? 'zh' : 'en');
          return u.toString();
        } catch { return raw; }
      };
      const webTabsRef = useRef([]);
      webTabsRef.current = webTabs;
      const openWeb = (url, title, appMeta) => {
        if (!url) return '';
        setDebug((ds) => [...ds.slice(-200), { t: new Date().toLocaleTimeString(), m: `OPEN ${url}` }]);
        const found = webTabsRef.current.find((t) => (t.base || t.url) === url);
        if (found) { setActiveWeb(found.id); return found.id; }
        const id = `w${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
        setActiveWeb(id);
        setWebTabs((tabs) => [...tabs, { id, base: url, url: withView(url), title: title || url, reload: 0, app: appMeta || null }]);
        return id;
      };
      useEffect(() => {
        setWebTabs((tabs) => tabs.length ? tabs.map((t) => ({ ...t, url: withView(t.base || t.url) })) : tabs);
      }, [theme, locale]);
      useEffect(() => {
        try {
          localStorage.setItem('contextos-devops-dsh:sel', JSON.stringify({
            node, space,
            app: app ? { space: app.space || '', command: app.command || '', name: app.name || '', title: app.title || '', place_uid: app.place_uid || '' } : null,
          }));
        } catch {}
      }, [node, space, app]);
      useEffect(() => { if (space && spaces.length && !spaces.some((x) => x.name === space)) setSpace(null); }, [spaces]);
      useEffect(() => {
        if (!app || !apps.length) return;
        const found = apps.find((a) => (app.place_uid && a.place_uid === app.place_uid) || (a.space === app.space && a.command === app.command && (a.name === app.name || a.title === app.title)));
        if (found && found !== app) setApp(found);
      }, [apps]);
      useEffect(() => {
        try {
          localStorage.setItem(WEBTABS_KEY, JSON.stringify({
            active: activeWeb || '',
            tabs: webTabs.map((t) => ({ id: t.id, base: t.base || t.url, title: t.title, app: t.app || null })),
          }));
        } catch {}
      }, [webTabs, activeWeb]);
      const activeTab = webTabs.find((t) => t.id === activeWeb) || webTabs[webTabs.length - 1] || null;
      const currentApp = activeTab ? (activeTab.app || null) : app;
      const firstTabAppRef = useRef(true);
      useEffect(() => {
        if (!activeTab) return;
        if (firstTabAppRef.current) { firstTabAppRef.current = false; if (!bootSelRef.current?.app) setApp(activeTab.app || null); return; }
        setApp(activeTab.app || null);
      }, [activeTab?.id]);
      const closeWeb = (id) => setWebTabs((tabs) => {
        const next = tabs.filter((t) => t.id !== id);
        if (activeWeb === id) { const last = next[next.length - 1] || null; setActiveWeb(last?.id || null); setApp(last?.app || null); }
        return next;
      });
      const closeOthers = (id) => {
        setWebTabs((tabs) => {
          const keep = tabs.find((t) => t.id === id);
          if (keep) { setActiveWeb(keep.id); setApp(keep.app || null); }
          return keep ? [keep] : [];
        });
      };
      const closeAll = () => { setWebTabs([]); setActiveWeb(null); setApp(null); };
      const reloadTab = (id) => setWebTabs((tabs) => tabs.map((t) => t.id === id ? { ...t, url: withView(t.base || t.url), reload: (t.reload || 0) + 1 } : t));
      const navWeb = (id, url) => {
        const raw = String(url || '').trim();
        if (!raw) return;
        const full = /^https?:\/\//i.test(raw) ? raw : `http://${raw}`;
        setWebTabs((tabs) => tabs.map((t) => t.id === id ? { ...t, base: full, url: withView(full), title: full, reload: (t.reload || 0) + 1 } : t));
        setActiveWeb(id);
      };
      const manageWeb = (id) => { setActiveWeb(id); setViewMode('manage'); };
      const reloadWeb = () => activeWeb && reloadTab(activeWeb);
      const openExternal = () => { if (activeTab?.url) openUrl(activeTab.url); };
      const selectCreated = async (r) => {
        setAppMode('recent');
        const list = await loadApps(node, space, avatar?.uid || '');
        const found = (r?.place_uid && list.find((a) => a.place_uid === r.place_uid))
          || (r?.command ? { name: (r.command.split('.')[2] || r.name), title: r.name, command: r.command, space: r.space, place_uid: r.place_uid, city_name: r.city, company_name: r.company, service_name: r.service?.name || '', place: r.place, functions: [] } : null);
        if (found) setApp(found);
        return found;
      };
      const chooseAvatar = async (a) => {
        try {
          await api('setAvatar', { node, uid: a.uid });
          setAvatar(a);
          await loadApps(node, space, a.uid);
        } catch (e) { log(`切换分身失败：${String(e?.message || e)}`, 'err'); }
      };
      useEffect(() => {
        if (!bg) return;
        const p = bg.params || {};
        if ((p.theme || 'system') === themeMode && (p.lang || 'system') === langMode) return;
        const t = setTimeout(() => {
          api('updateBackground', { node, id: bg.id, patch: { params: { theme: themeMode, lang: langMode } } })
            .then((r) => { setBgData(r); setBg((r.items || []).find((x) => x.id === bg.id) || bg); })
            .catch(() => {});
        }, 500);
        return () => clearTimeout(t);
      }, [themeMode, langMode, bg?.id]);
      const chooseBg = async (b) => {
        try { await api('setBackground', { node, id: b.id }); setBg(b); applyScene(b); } catch (e) { log(`切换背景失败：${String(e?.message || e)}`, 'err'); }
      };
      const updateScene = async (payload) => {
        if (!bg) return;
        try {
          const { name, ...params } = payload || {};
          const merged = { ...(bg.params || {}), ...params };
          const patch = { params: merged };
          if (name) patch.name = name;
          const r = await api('updateBackground', { node, id: bg.id, patch });
          setBgData(r);
          const nb = (r.items || []).find((x) => x.id === bg.id) || bg;
          setBg(nb); applyScene(nb);
        } catch (e) { log(`保存场景失败：${String(e?.message || e)}`, 'err'); }
      };
      const createBg = async () => {
        try {
          const r = await api('createBackground', { node, name: '' });
          setBgData({ active: r.active, items: r.items });
          setBg(r.created || (r.items || []).find((x) => x.id === r.active) || null);
        } catch (e) { log(`新建背景失败：${String(e?.message || e)}`, 'err'); }
      };
      const readImage = (file, cb) => {
        try {
          const img = new Image(); const url = URL.createObjectURL(file);
          img.onload = () => {
            const max = 720, scale = Math.min(1, max / Math.max(img.width || 1, img.height || 1));
            const c = document.createElement('canvas');
            c.width = Math.max(1, Math.round((img.width || 1) * scale)); c.height = Math.max(1, Math.round((img.height || 1) * scale));
            c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
            URL.revokeObjectURL(url);
            cb(c.toDataURL('image/jpeg', 0.82));
          };
          img.onerror = () => { URL.revokeObjectURL(url); log('图片读取失败', 'err'); };
          img.src = url;
        } catch (e) { log(`图片读取失败：${String(e?.message || e)}`, 'err'); }
      };
      const upBgImage = (file) => {
        if (!file || !bg) return;
        readImage(file, async (data) => {
          try {
            const r = await api('updateBackground', { node, id: bg.id, patch: { image: data } });
            if (avatar?.uid) api('saveUserMedia', { node, uid: avatar.uid, kind: 'background', dataUrl: data, name: avatar.name || '' }).catch(() => {});
            setBgData(r); setBg((r.items || []).find((x) => x.id === bg.id) || { ...bg, image: data });
          } catch (e) { log(`上传背景失败：${String(e?.message || e)}`, 'err'); }
        });
      };
      const upAvatarImage = (file) => {
        if (!file || !avatar) return;
        readImage(file, async (data) => {
          try {
            await api('updateAvatar', { node, uid: avatar.uid, patch: { image: data } });
            api('saveUserMedia', { node, uid: avatar.uid, kind: 'avatar', dataUrl: data, name: avatar.name || '' }).catch(() => {});
            const d = await api('avatars', { node });
            setAvatarData(d);
            setAvatar((d.items || []).find((x) => x.uid === avatar.uid) || { ...avatar, image: data });
          } catch (e) { log(`上传头像失败：${String(e?.message || e)}`, 'err'); }
        });
      };
      const updateAvatarProfile = async (patch) => {
        if (!avatar) return;
        try {
          await api('updateAvatar', { node, uid: avatar.uid, patch });
          const d = await api('avatars', { node });
          setAvatarData(d);
          setAvatar((d.items || []).find((x) => x.uid === avatar.uid) || { ...avatar, ...patch });
        } catch (e) { log(`修改分身失败：${String(e?.message || e)}`, 'err'); }
      };
      const openNode = (port) => { setApp(null); openWeb(`http://127.0.0.1:${port}/`, `node :${port}`); };
      const openSpace = (sp) => { setApp(null); openWeb(`http://127.0.0.1:${node}/s/${encodeURIComponent(sp)}`, sp); };
      const appUrl = (a) => {
        const sp = a.space || space || '';
        const tail = a.place_uid ? `/${encodeURIComponent(a.place_uid)}` : '';
        const uid = a.user_uid ? `?user.uid=${encodeURIComponent(a.user_uid)}` : '';
        return `http://127.0.0.1:${node}/s/${encodeURIComponent(sp)}/c/${a.command}${tail}${uid}`;
      };
      const openApp = (a) => { if (a) { setApp(a); openWeb(appUrl(a), a.title || a.name, a); } };
      const buildApp = (a) => act(`BUILD ${a.name}`, async () => { await api('buildSpace', { node, space: a.space || space }); await loadApps(node, space); });
      const initSpace = (sp) => act(`INIT ${sp}`, async () => { await api('initSpace', { node, space: sp }); log(`skeleton ready: ${sp}`); });
      const buildSpace = (sp) => act(`BUILD ${sp}`, async () => { await api('buildSpace', { node, space: sp }); await loadApps(node, sp); });
      const startNode = (port) => act(`START :${port}`, async () => { await api('start', { port }); await loadNodes(); });
      const stopNode = (port) => act(`STOP :${port}`, async () => { await api('stop', { port }); await loadNodes(); });
      const deleteNode = (port) => {
        if (!window.confirm(`删除节点 :${port}？目录和台账都会删除。`)) return;
        act(`DELETE :${port}`, async () => { await api('deleteNode', { port }); await loadNodes(); });
      };
      const startSpace = (sp) => act(`START ${sp}`, async () => { await api('spaceStart', { node, space: sp }); await loadSpaces(node); });
      const stopSpace = (sp) => act(`STOP ${sp}`, async () => { await api('spaceStop', { node, space: sp }); await loadSpaces(node); });
      const deleteSpace = (sp) => {
        if (!window.confirm(`删除项目空间 ${sp}？目录和记录都会删除。`)) return;
        act(`DELETE ${sp}`, async () => { await api('deleteSpace', { node, space: sp }); await loadSpaces(node); await loadApps(node); });
      };
      const deployOfficial = (keys) => act(`DEPLOY OFFICIAL ${keys.join(',')}`, async () => {
        const out = await api('officialSpaces', { node, keys });
        await loadSpaces(node); await loadApps(node);
        log(`official: ${out.map((x) => x.space || x.key).join(', ')}`);
        return out;
      });
      const showStore = () => { setAppMode('store'); act('LOAD STORE', () => loadStore(node)); };
      const backRecent = () => { setAppMode('recent'); act('LOAD RECENT', () => loadApps(node, space)); };
      const openStoreCreate = (service) => { setStoreService(service); setModal('storeInstance'); };
      const storeAct = (service, action) => act(`STORE ${action} ${service.name}`, async () => {
        await api('storeAction', { node, space: service.space || '20240724-community', service_uid: service.uid, action });
        await loadStore(node);
      });
      const storeCode = (service) => {
        const synthetic = { name: service.name, title: service.title || service.name, command: service.command, space: service.space, path: `src/${service.name}/portal.json`, place: service.place || '', functions: [], recent: false };
        setApp(synthetic); setModal('code');
      };
      const storeConfig = (service) => {
        openWeb(`http://127.0.0.1:${node}/s/${encodeURIComponent(service.space)}/c/${service.command}`, service.title || service.name);
      };

      const startConsoleResize = (e) => {
        e.preventDefault();
        const startY = e.clientY, startH = consoleHeight;
        const move = (ev) => setConsoleHeight(Math.max(80, Math.min(460, startH + startY - ev.clientY)));
        const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', up);
      };
      const nodeRows = nodes.filter((n) => !nodeStatusFilter.length || nodeStatusFilter.includes(n.state));
      const spaceRows = spaces.filter((s) => !spaceStatusFilter.length || spaceStatusFilter.includes(s.status));
      const appRows = apps.filter((a) => !appSpaceFilter.length || appSpaceFilter.includes(a.space || space || ''));
      const appSpaceOptions = [...new Set(apps.map((a) => a.space || space).filter(Boolean))].map((v) => ({ value: v, label: v }));
      const nodeStatusOptions = [...new Set(nodes.map((n) => n.state).filter(Boolean))].map((v) => ({ value: v, label: v === 'running' ? t('running') : v === 'offline' ? t('offline') : v }));
      const spaceStatusOptions = [...new Set(spaces.map((s) => s.status).filter(Boolean))].map((v) => ({ value: v, label: v === 'start' ? t('running') : v === 'stop' ? t('offline') : v }));
      const storeRows = store.filter((s) => !storeSpaceFilter.length || storeSpaceFilter.includes(s.space));
      const storeSpaceOptions = [...new Set(store.map((s) => s.space).filter(Boolean))].map((v) => ({ value: v, label: v }));
      const activeNode = nodes.find((n) => n.port === node);
      const activeSpace = spaces.find((s) => s.name === space);
      const running = nodes.filter((n) => n.state === 'running').length;
      const stage = activeTab ? 4 : app ? 3 : space ? 2 : node ? 1 : 0;

      const [ideProjects, setIdeProjects] = useState(() => { try { return JSON.parse(localStorage.getItem('contextos-devops-dsh:ide') || 'null') || []; } catch { return []; } });
      const [ideActive, setIdeActive] = useState(() => { try { return localStorage.getItem('contextos-devops-dsh:ide-active') || ''; } catch { return ''; } });
      useEffect(() => { try { localStorage.setItem('contextos-devops-dsh:ide', JSON.stringify(ideProjects)); } catch {} }, [ideProjects]);
      useEffect(() => { try { localStorage.setItem('contextos-devops-dsh:ide-active', ideActive); } catch {} }, [ideActive]);
      useEffect(() => { const key = `${node}:${space}`; if (ideProjects.some((x) => x.key === key)) setIdeActive(key); }, [node, space]);
      const selectIdeProject = (key) => { const p = ideProjects.find((x) => x.key === key); if (!p) return; setIdeActive(key); setNode(p.node); setSpace(p.space); };
      const closeIdeProject = (key) => { setIdeProjects((ps) => ps.filter((x) => x.key !== key)); if (ideActive === key) setIdeActive(''); };
      const openIde = async (port, sp) => {
        const n = Number(port);
        setNode(n);
        setViewMode('dev');
        let target = sp || '';
        if (!target) {
          try { target = ((await api('spaces', { node: n })) || [])[0]?.name || ''; } catch { /* keep */ }
        }
        if (target) setSpace(target);
        if (target) {
          const key = `${n}:${target}`;
          setIdeProjects((ps) => (ps.some((x) => x.key === key) ? ps : [...ps, { key, node: n, space: target }]));
          setIdeActive(key);
        }
      };
      const chatProps = { open: true, booted: nodesLoaded, full: true, theme, locale, themeMode, setThemeMode, langMode, setLangMode, onToggleFull: () => setChatFull((v) => !v), onInit: openInit, onClose: () => setViewMode('manage'), nodes, node, spaces, space, apps, app, onSelectNode: setNode, onSelectSpace: setSpace, onSelectApp: (a) => { setApp(a); openApp(a); }, onSelectAvatar: chooseAvatar, avatars: avatarData.items, backgrounds: bgData.items, bg, onSelectBg: chooseBg, onCreateBg: createBg, onUploadBg: upBgImage, onUploadAvatar: upAvatarImage, onUpdateScene: updateScene, onUpdateAvatar: updateAvatarProfile, onCreateAvatar: () => setShowAvatars(true), webTabs, onOpenWebTab: openWeb, onCloseWebTab: closeWeb, onNavWebTab: navWeb, onReloadWebTab: reloadTab, onManageWebTab: manageWeb, onRefresh: refreshAll, onOpenApp: openApp, onData: () => app && setModal('data'), onStore: showStore, onDevices: () => setShowDevices(true), avatar };
      return h('div', { className: 'cx-shell', 'data-theme': theme, ref: shellRef },
        h('style', null, css),
        h('header', { className: 'cx-header' },
          h('div', { className: 'cx-brand' }, h('div', { className: 'cx-mark' }, h('i')), h('div', null, h('div', { className: 'cx-title' }, 'CONTEXTOS // DEVOPS'), h('div', { className: 'cx-sub' }, `${t('cluster')} · ${t('modules')} · ${t('automation')}`))),
          h('div', { className: 'cx-views' },
            [['chat', locale === 'zh' ? '对话' : 'CHAT'], ['manage', locale === 'zh' ? '管理' : 'MANAGE'], ['dev', locale === 'zh' ? '开发' : 'DEV']].map(([k, label]) =>
              h('button', { key: k, className: `cx-view${viewMode === k ? ' on' : ''}`, onClick: () => setViewMode(k), title: label }, label))),
          h('div', { className: 'cx-actions' },
            h('select', { className: 'cx-select', value: themeMode, title: t('light') + ' / ' + t('dark'), onChange: (e) => setThemeMode(e.target.value) },
              h('option', { value: 'system' }, t('system')), h('option', { value: 'light' }, t('light')), h('option', { value: 'dark' }, t('dark'))),
            h('select', { className: 'cx-select', value: langMode, title: t('chinese') + ' / English', onChange: (e) => setLangMode(e.target.value) },
              h('option', { value: 'system' }, t('system')), h('option', { value: 'zh' }, '中文'), h('option', { value: 'en' }, 'English')),
            h('button', { className: 'cx-btn cx-icon-btn', onClick: refreshAll, disabled: !!busy, title: t('refresh') }, busy ? '…' : '↻'),
            h('button', { className: 'cx-btn pri cx-icon-btn', onClick: () => setModal('deploy'), title: t('deploy') }, '+'),
            h('button', { className: 'cx-btn', onClick: openInit, disabled: !!initState?.running, title: t('initialize') }, t('initialize')))),
        h('div', { className: 'cx-pipe' },
          h('div', { className: `cx-stage${stage >= 1 ? ' on' : ''}` }, h('span', { className: 'n' }, '01'), t('serve'), h('span', null, activeNode ? `:${activeNode.port}` : t('deploy'))),
          h('span', { className: 'cx-arrow' }, '›'),
          h('div', { className: `cx-stage${stage >= 2 ? ' on' : ''}` }, h('span', { className: 'n' }, '02'), t('space'), h('span', null, space || t('create'))),
          h('span', { className: 'cx-arrow' }, '›'),
          h('div', { className: `cx-stage${stage >= 3 ? ' on' : ''}` }, h('span', { className: 'n' }, '03'), t('recent'), h('span', null, app ? app.title || app.name : t('recent'))),
          h('span', { className: 'cx-arrow' }, '›'),
          h('div', { className: `cx-stage${stage >= 4 ? ' on' : ''}` }, h('span', { className: 'n' }, '04'), t('web'), h('span', null, activeTab ? (activeTab.title || 'page') : 'tabs')),
          h('div', { className: 'cx-chips' },
            h('div', { className: 'cx-chip' }, h('span', { className: `dot${running ? ' on' : ''}` }), `${t('cluster')} `, h('b', null, `${running}/${nodes.length}`)),
            h('div', { className: 'cx-chip' }, h('span', { className: `dot${apps.length ? ' on' : ''}` }), `${t('modules')} `, h('b', null, apps.length)),
            h('div', { className: 'cx-chip' }, h('span', { className: `dot${app ? ' on' : ''}` }), `${t('automation')} `, h('b', null, app ? t('applications') : space ? t('space') : t('idle'))),
            h('button', { className: 'cx-chip', onClick: () => setShowAvatars(true), title: t('avatar') }, h('span', { className: 'dot on' }), `${t('avatar')} `, h('b', null, avatar?.name || '—')),
            h('button', { className: 'cx-chip', onClick: () => setViewMode('chat'), title: `${t('scene')}: ${bg?.name || T('默认')}` }, h('span', { className: `dot${bg?.image ? ' on' : ''}` }), `${t('scene')} `, h('b', null, bg?.name || T('默认'))))),
        error ? h('div', { className: 'cx-err' }, error) : null,
        h('div', { className: `cx-chat-host${chatFull ? ' full' : ''}`, style: viewMode === 'chat' ? null : { display: 'none' } }, h(ChatPanel, { ...chatProps, docked: !chatFull })),
        viewMode === 'dev' ? h(DevWorkspace, { locale, node, space, nodes, spaces, projects: ideProjects, activeKey: ideActive, onSelectProject: selectIdeProject, onCloseProject: closeIdeProject, onSelectNode: (p) => setNode(p), onSelectSpace: (sp) => setSpace(sp), onPick: openIde }) : null,
        h('div', { className: 'cx-body', style: viewMode === 'manage' ? null : { display: 'none' } },
          h(Panel, {
            index: '01', title: tp('serve'), count: `${nodeRows.length}/${nodes.length} NODES`,
            tools: [h(MultiFilter, { key: 'f', label: t('status'), options: nodeStatusOptions, value: nodeStatusFilter, onChange: setNodeStatusFilter }), h('span', { key: 'sp', className: 'cx-tools-spacer' }), h('button', { key: 'd', className: 'cx-btn xs pri cx-icon-btn', onClick: () => setModal('deploy'), title: t('create') }, '+'), h('button', { key: 'r', className: 'cx-btn xs cx-icon-btn', onClick: () => act('REFRESH NODES', loadNodes), title: t('refresh') }, '↻')],
          }, nodeRows.length ? nodeRows.map((n) => h(NodeCard, { key: n.dir || n.port, n, active: node === n.port, locale, onSelect: setNode, onStart: startNode, onStop: stopNode, onDelete: deleteNode, onOpen: openNode, onIde: openIde })) : h('div', { className: 'cx-empty' }, '还没有节点。先部署一个：copy / download / source。')),
          h(Panel, {
            index: '02', title: tp('space'), count: node ? `${spaceRows.length}/${spaces.length} SPACES` : t('serve'),
            tools: [h(MultiFilter, { key: 'f', label: t('status'), options: spaceStatusOptions, value: spaceStatusFilter, onChange: setSpaceStatusFilter }), h('span', { key: 'sp', className: 'cx-tools-spacer' }), h('button', { key: 'c', className: 'cx-btn xs pri cx-icon-btn', disabled: !node, onClick: () => setModal('space'), title: t('create') }, '+'), h('button', { key: 'r', className: 'cx-btn xs cx-icon-btn', disabled: !node, onClick: () => act('REFRESH SPACES', () => loadSpaces(node)), title: t('refresh') }, '↻')],
          }, !node
            ? h('div', { className: 'cx-empty' }, '先选择左侧服务节点。')
            : h(React.Fragment, null,
                spaceRows.length ? spaceRows.map((s) => h(SpaceCard, { key: s.name, s, node, active: space === s.name, onSelect: setSpace, onOpen: openSpace, onStart: startSpace, onStop: stopSpace, onDelete: deleteSpace, onIde: openIde, locale })) : h('div', { className: 'cx-empty' }, '该节点还没有项目空间。创建空空间后自动 git init。'),
                h(OfficialSpaces, { node, onDeploy: deployOfficial, locale }))),
          h(Panel, {
            index: '03',
            title: appMode === 'store' ? t('store') : tp('recent'),
            count: appMode === 'store' ? `${store.length} SERVICES` : (node ? `${appRows.length}/${apps.length} APPS` : 'SELECT NODE'),
            tools: appMode === 'store'
              ? [h(MultiFilter, { key: 'f', label: t('space'), options: storeSpaceOptions, value: storeSpaceFilter, onChange: setStoreSpaceFilter }), h('button', { key: 'b', className: 'cx-btn xs pri', onClick: backRecent }, '← ' + t('recent')), h('span', { key: 'sp', className: 'cx-tools-spacer' }), h('button', { key: 't', className: 'cx-btn xs cx-icon-btn', disabled: !space, onClick: () => setModal('app'), title: t('create') + ' ' + t('template') }, '+'), h('button', { key: 'r', className: 'cx-btn xs cx-icon-btn', disabled: !node, onClick: () => act('REFRESH STORE', () => loadStore(node)), title: t('refresh') }, '↻')]
              : [h(MultiFilter, { key: 'f', label: t('space'), options: appSpaceOptions, value: appSpaceFilter, onChange: setAppSpaceFilter }), h('button', { key: 's', className: 'cx-btn xs pri', disabled: !node, onClick: showStore }, t('store')), h('span', { key: 'sp', className: 'cx-tools-spacer' }), h('button', { key: 'c', className: 'cx-btn xs cx-icon-btn', disabled: !space, onClick: () => setModal('app'), title: t('create') + ' ' + t('template') }, '+'), h('button', { key: 'r', className: 'cx-btn xs cx-icon-btn', disabled: !node, onClick: () => act('REFRESH RECENT', () => loadApps(node, space)), title: t('refresh') }, '↻')],
          },
            appMode === 'store'
              ? (storeRows.length ? storeRows.map((s) => h(StoreRow, { key: `${s.space}:${s.command}:${s.uid}`, s, onCreate: openStoreCreate, busy: !!busy, onAction: storeAct, onCode: storeCode, onConfig: storeConfig, locale })) : h('div', { className: 'cx-empty' }, '应用商店加载中，或当前节点没有 service。'))
              : (!node ? h('div', { className: 'cx-empty' }, '先选择左侧服务节点。') : appRows.length ? appRows.map((a) => h(AppRow, { key: `${a.space}:${a.command}:${a.place_uid || a.name}`, a, active: app?.place_uid === a.place_uid, onOpen: openApp, locale })) : h('div', { className: 'cx-empty' }, '该用户最近还没有应用。用「应用商店」创建，或 AI 生成模板。'))),
          h(Panel, {
            index: '04', title: tp('web'), count: webTabs.length ? `${webTabs.length} TABS` : 'NO TAB',
          },
            h('div', { className: 'cx-web' },
              h('div', { className: 'cx-webtabs' },
                webTabs.map((t) => h('div', { key: t.id, className: `cx-webtab${t.id === activeTab?.id ? ' on' : ''}`, onClick: () => { setActiveWeb(t.id); setApp(t.app || null); } },
                  h('span', { style: { overflow: 'hidden', textOverflow: 'ellipsis' } }, t.title || t.url),
                  h(MenuButton, { items: [
                    { label: '关闭', action: () => closeWeb(t.id) },
                    { label: '关闭其它标签', action: () => closeOthers(t.id) },
                    { label: '关闭全部标签', action: closeAll },
                    { label: '刷新', action: () => reloadTab(t.id) },
                    { label: '外部打开', action: () => openUrl(t.url) },
                    ...(t.app ? [
                      { label: '编辑代码', action: () => { setApp(t.app); setModal('code'); } },
                      { label: '添加数据', action: () => { setApp(t.app); setModal('data'); } },
                      { label: '创建实例', action: () => { setApp(t.app); setModal('instance'); } },
                    ] : []),
                  ] }),
                  h('button', { className: 'x', onClick: (e) => { e.stopPropagation(); closeWeb(t.id); } }, '×'))),
                h('button', { className: 'cx-btn xs', disabled: !node, onClick: () => node && openNode(node) }, '+')),
              h('div', { className: 'cx-webframe' },
                webTabs.length
                  ? [webTabs.map((t) => h('iframe', {
                      key: `${t.id}#${t.reload || 0}`, src: t.url, title: t.title || 'web', allow: 'clipboard-read; clipboard-write',
                      className: t.id === activeTab?.id ? 'on' : '',
                      onLoad: () => setWebLoaded((m) => m[t.id] ? m : { ...m, [t.id]: 1 }),
                    })),
                    activeTab && !webLoaded[activeTab.id] ? h('div', { key: 'loadmask', className: 'cx-webmask' }, '加载中…') : null]
                  : h('div', { className: 'cx-empty' }, '点击最近应用 OPEN，或节点/空间 OPEN，在此多标签打开。'))))),
        consoleOpen ? h('div', { className: 'cx-console', style: { height: consoleHeight } },
          h('div', { className: 'cx-console-h' },
            h('div', { className: 'cx-console-tabs' },
              h('button', { className: `cx-console-tab${consoleTab === 'activity' ? ' on' : ''}`, onClick: () => setConsoleTab('activity') }, 'ACTIVITY', h('span', null, logs.length)),
              h('button', { className: `cx-console-tab${consoleTab === 'events' ? ' on' : ''}`, onClick: () => setConsoleTab('events') }, 'EVENTS', h('span', null, events.length)),
              h('button', { className: `cx-console-tab${consoleTab === 'debug' ? ' on' : ''}`, onClick: () => setConsoleTab('debug') }, 'DEBUG / URL', h('span', null, debug.length)),
              h('button', { className: `cx-console-tab${consoleTab === 'state' ? ' on' : ''}`, onClick: () => setConsoleTab('state') }, 'STATE', h('span', null, stateRows.length)),
              h('button', { className: `cx-console-tab${consoleTab === 'files' ? ' on' : ''}`, onClick: () => setConsoleTab('files') }, 'FILES', h('span', null, files?.files?.length ?? ''))),
            h('span', { className: 'cx-console-status' }, busy ? `RUNNING: ${busy}` : 'IDLE'),
            h('div', { className: 'cx-console-actions' },
              h('button', { onClick: () => setConsoleHeight((h) => Math.min(460, h + 30)), title: T('放大') }, '+'),
              h('button', { onClick: () => setConsoleHeight((h) => Math.max(80, h - 30)), title: T('缩小') }, '−'),
              h('button', { onClick: () => setConsoleOpen(false), title: T('关闭') }, '×'))),
          h('div', { className: 'cx-console-body' },
            h('div', { className: 'cx-console-main', ref: logRef },
            h('table', { className: 'cx-console-table' },
              h('thead', null, h('tr', null, consoleTable.cols.map((c) => h('th', { key: c.k, onClick: (e) => { e.stopPropagation(); setSort((sp) => sp.key === c.k ? { key: c.k, dir: -sp.dir } : { key: c.k, dir: 1 }); } }, c.label, sortKey === c.k ? (sort.dir > 0 ? ' ▲' : ' ▼') : '')))),
              h('tbody', null, sortedRows.map((r, i) => h('tr', {
                key: i,
                className: `${String(r.ok) === 'ERR' ? 'err' : ''}${detail && detail.key === rowKey(r) ? ' on' : ''}`,
                onClick: () => openDetail(r),
              }, consoleTable.cols.map((c) => h('td', { key: c.k }, String(r[c.k] ?? '')))))),
            ),
            sortedRows.length === 0 ? h('div', { className: 'cx-line' }, h('span', { className: 'm' }, consoleTab === 'files' ? '没有数据文件（服务端重启后可用）' : '等待操作…')) : null),
            detail ? h('div', { className: 'cx-console-detail' },
              h('div', { className: 'cx-console-detail-h' }, h('b', null, detail.title), h('button', { type: 'button', onClick: () => setDetail(null), title: T('关闭') }, '×')),
              h('div', { className: 'kv' }, (detail.fields || []).flatMap(([k, v], i) => [h('span', { key: `k${i}`, className: 'k' }, k), h('span', { key: `v${i}` }, String(v ?? ''))])),
              detail.body ? h('pre', null, detail.body) : null) : null),
          h('div', { className: 'cx-console-resize', onPointerDown: startConsoleResize })) : h('button', { className: 'cx-console-open', onClick: () => setConsoleOpen(true) }, 'CONSOLE'),
        modal === 'deploy' ? h(DeployModal, { onClose: () => setModal(null), onDone: () => { setModal(null); act('LOAD NODES', loadNodes); } }) : null,
        modal === 'space' ? h(SpaceModal, { node, onClose: () => setModal(null), onDone: (name) => { setModal(null); act('LOAD SPACES', async () => { await loadSpaces(node); setSpace(name); }); } }) : null,
        modal === 'app' ? h(AppModal, { node, space, onClose: () => setModal(null), onDone: (r) => { setModal(null); const synthetic = { name: r.name, title: r.help, command: r.command, space: r.space, path: r.path, place: r.place || '', functions: [], recent: false }; setApps((xs) => [synthetic, ...xs.filter((a) => !(a.name === synthetic.name && a.command === synthetic.command))]); setApp(synthetic); openApp(synthetic); act('LOAD RECENT', () => loadApps(node, space)); } }) : null,
        modal === 'data' && currentApp ? h(DataModal, { node, space: currentApp.space || space, app: currentApp, onClose: () => setModal(null) }) : null,
        modal === 'code' && currentApp ? h(CodeModal, { node, space: currentApp.space || space, app: currentApp, onClose: () => setModal(null) }) : null,
        modal === 'instance' && currentApp ? h(InstanceModal, { node, space: currentApp.space || space, app: currentApp, avatar, onClose: () => setModal(null), onDone: (r) => { setModal(null); act('LOAD RECENT', () => selectCreated(r)); } }) : null,
        modal === 'storeInstance' && storeService ? h(StoreInstanceModal, { node, service: storeService, avatar, onClose: () => setModal(null), onDone: (r) => { setModal(null); setStoreService(null); act('LOAD RECENT', () => selectCreated(r)); } }) : null,
        showDevices ? h(DeviceModal, { node, onClose: () => setShowDevices(false) }) : null,
        showAvatars ? h(AvatarModal, { node, data: avatarData, active: avatar, onClose: () => setShowAvatars(false), onSelect: (a) => { setAvatar(a); setShowAvatars(false); }, onCreated: async (a) => { const d = await api('avatars', { node }); setAvatarData(d); const found = (d.items || []).find((x) => x.uid === a.uid) || a; setAvatar(found); setShowAvatars(false); }, onUpdated: async (a) => { const d = await api('avatars', { node }); setAvatarData(d); const found = (d.items || []).find((x) => x.uid === a.uid) || a; setAvatar(found); } }) : null,
        h(InitOverlay, { state: initState, onClose: () => setInitState(null), onStart: runInit, onLoginRemote: (cfg) => api('remoteLogin', cfg) }),
        viewMode !== 'chat' ? h('button', { className: 'cx-chat-fab', onClick: () => setViewMode('chat'), title: 'AI Copilot' }, 'AI') : null);
    }

    class Boundary extends React.Component {
      constructor(props) { super(props); this.state = { err: null }; }
      static getDerivedStateFromError(e) { return { err: e }; }
      componentDidCatch(e) { reportError(String(e?.message || e)); }
      render() { return this.state.err ? h('div', { className: 'cx-err' }, `渲染错误：${String(this.state.err?.message || this.state.err)}`) : this.props.children; }
    }

    return {
      inject: ['slots'],
      apply(ctx) {
        ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({ name: 'sidebar.panellist', id: 'contextos-devops-dsh', order: 20, label: () => 'ContextOS DevOps' }, Icon));
        ctx.slots.inject('main', () => ctx.slots.register({ name: 'main', key: 'contextos-devops-dsh' }, () => h(Boundary, null, h(Page))));
      },
    };
  },
});
