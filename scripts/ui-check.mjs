#!/usr/bin/env node
// Static UI acceptance gate. This is intentionally small and deterministic:
// it catches the regressions we actually shipped (vertical tabs, stretched
// detail panels, overflowing values, missing tab pages).
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const css = read('assets/client.css');
const page = read('src/client/parts/60-page.js');
const mainCss = read('src/client/styles/main.css');
const tokens = read('src/client/styles/tokens.css');
const debug = read('src/client/parts/12-debug.js');
// 对话由两个片段组成：49 消息组件、50 会话面板；断言跨两个文件
const chat = read('src/client/parts/49-msg.js') + read('src/client/parts/50-chat.js');
const pm = read('src/client/parts/55-pm.js');
const pmdata = read('src/client/parts/52-pmdata.js');
const pmsel = read('src/client/parts/51-pmselection.js');
const editorUi = read('src/client/parts/25-editor-ui.js');
const initUi = read('src/client/parts/40-project.js');
const ui = read('src/client/parts/10-ui.js');
const project = read('lib/core/project.js');
const checks = [];
const ok = (name, condition, detail = '') => checks.push({ name, condition: !!condition, detail });

ok('detail tabs are a horizontal flex row', /\.cx-detail-tabs\{[^}]*display:flex!important[^}]*flex-direction:row!important/.test(css));
ok('detail tabs are sticky', /\.cx-detail-tabs\{[^}]*position:sticky!important/.test(css));
ok('detail tabs are equal width', /\.cx-detail-tabs \.cx-console-tab\{[^}]*flex:1 1 0!important/.test(css));
ok('detail panel has no forced full height', !/(?:^|;)\s*height:100%!important/.test((css.match(/\.cx-console-detail\{[^}]*\}/) || [''])[0]));
ok('detail panel clips horizontal overflow', /\.cx-console-detail\{[^}]*overflow-x:hidden!important/.test(css));
ok('header tables use fixed layout', /\.cx-detail-head-table\{[^}]*table-layout:fixed/.test(css));
ok('long values wrap', /\.cx-detail-kv \.v\{[^}]*overflow-wrap:anywhere!important/.test(css));
ok('four detail tabs exist', ['请求信息', '原始数据', '请求参数', '解析数据'].every((x) => debug.includes(x)));
ok('no redundant REQUEST detail title', !page.includes("title: 'REQUEST'"));
ok('design tokens are centralized', tokens.includes('--cx-bg') && !mainCss.includes(':root{--cx-bg'));
ok('detail reuses KeyValueTable', debug.includes('h(KeyValueTable'));
ok('detail reuses UiTableList', debug.includes('UiTableList'));
ok('Init selects standard spaces', initUi.includes('h(StandardSpaces'));
ok('Deploy selects standard spaces', read('src/client/parts/34-forms.js').includes('h(StandardSpaces'));
ok('Deploy auto mode exists', read('lib/core/nodes.js').includes("mode = 'auto'"));
const forms = read('src/client/parts/34-forms.js');
ok('Deploy shows install matrix', forms.includes('cx-install-matrix') && forms.includes("api('deployOptions'") && forms.includes('codeSource') && forms.includes('mirror') && !forms.includes('目标平台'));
ok('Deploy toolbar shows git/go versions or 未发现', forms.includes('installDep') && forms.includes('gitVersion') && forms.includes('未发现') && forms.includes('install-toolbar'));
ok('Deploy hides install fields behind advanced', forms.includes('InstallToolbar') && forms.includes('cx-advanced-btn') && forms.includes('advanced ? h('));
ok('Init hides install fields behind advanced', initUi.includes('InstallToolbar') && initUi.includes('advanced ? field'));
ok('Init selects install method', initUi.includes('setMethod') && initUi.includes('deployOptions') && initUi.includes('codeSource') && initUi.includes('mirror') && !initUi.includes('目标平台') && !initUi.includes('安装源'));
ok('Backend install plan is wired', fs.existsSync(path.join(root, 'lib/core/installer.js')) && read('lib/core/ops.js').includes('deployOptions:') && read('lib/core/nodes.js').includes('buildInstallPlan'));
ok('Install toolbar omits curl chip', !forms.includes("installDep(opt?.curl") && forms.includes('installDep(opt?.go'));
ok('Install previews script and shows process log', forms.includes("preview(true)") && forms.includes('预览脚本') && forms.includes('result?.log') && forms.includes('EXECUTION LOG') && forms.includes('plan.script'));
ok('Official spaces use binary mode without build', read('lib/core/nodes.js').includes('binaryMode') && read('lib/core/nodes.js').includes('binaryMode ?') && read('lib/core/spaces.js').includes("query.set('binary'"));
ok('Standard spaces use canonical order', /community[\s\S]*enterprise[\s\S]*operation[\s\S]*knowledge[\s\S]*healthy[\s\S]*tourism[\s\S]*charity[\s\S]*education[\s\S]*industry[\s\S]*agriculture/.test(read('src/client/parts/00-prelude.js')) && /community[\s\S]*enterprise[\s\S]*operation[\s\S]*knowledge[\s\S]*healthy[\s\S]*tourism[\s\S]*charity[\s\S]*education[\s\S]*industry[\s\S]*agriculture/.test(read('lib/core/nodes.js')));
ok('Go detector reports version below minimum', read('lib/core/installer.js').includes('goFound') && read('lib/core/installer.js').includes('goReady'));
ok('Go detector checks common install paths', read('lib/core/toolchain.js').includes('/usr/local/go/bin') && read('lib/core/toolchain.js').includes("os.homedir()"));

ok('Init log is a table', initUi.includes('cx-init-log'));
ok('Init has retry action', initUi.includes('onRetry'));
ok('Init port probe exists', initUi.includes('freePort') && read('lib/core/ops.js').includes('freePort:'));
ok('Init uses Cyber World term', initUi.includes('分身与赛博世界'));
ok('Init shows execution log', initUi.includes('cx-init-debug'));
ok('Init console streams full deploy output', initUi.includes('cx-init-console') && page.includes("api('deployLog'") && read('lib/core/nodes.js').includes('appendDeployLog') && read('lib/misc/shell.js').includes('onChunk'));
ok('Deploy log API is exposed', read('lib/core/ops.js').includes('deployLog:') && fs.existsSync(path.join(root, 'lib/core/deploy-log.js')));
ok('Init uses goal/plan descriptions', initUi.includes('目标描述') && initUi.includes('计划描述'));
ok('Editor git helpers are in scope', editorUi.includes('function gitClass'));
ok('Editor tabs are shared', read('src/client/parts/20-devworkspace.js').includes('h(EditorTabs') && editorUi.includes('function EditorTabs'));
ok('Git sections are one vertical group', editorUi.includes("className: 'cx-git-sections'") && css.includes('.cx-git-sections'));
ok('busy status aligns with composer', css.includes('.cx-chat-typing{width:calc(100% - 36px)') && css.includes('max-width:1080px;box-sizing:border-box;margin:0 auto'));
ok('PM status order is shared', pm.includes('PM_STATUS_ORDER') && chat.includes('sortPmItems('));
ok('PM filters are shared', chat.includes('h(PmFilter') && pm.includes('function PmFilter'));
ok('PM create button is shared', chat.includes('h(PmCreateButton') && pm.includes('function PmCreateButton'));
ok('Manage/dev controls use unified icons', read('src/client/parts/60-page.js').includes("h(IconButton, { name: 'refresh'") && read('src/client/parts/20-devworkspace.js').includes("h(IconButton, { name: 'save'"));
ok('View tabs use unified icons', read('src/client/parts/60-page.js').includes('h(UiAffordance, { key: k, as: '));
ok('View tabs use affordance modes', page.includes("mode: 'short', className: `cx-view"));
ok('Ecom demo view is wired', fs.existsSync(path.join(root, 'src/client/parts/57-ecom.js')) && page.includes("['ecom', '电商', 'ECOM']") && page.includes("h(EcomView, { locale })") && page.includes("'ecom', '电商']"));
ok('Ecom demo has its own icon and host', read('src/client/parts/10-ui.js').includes('ecom: [') && css.includes('.cx-ecom-host'));
ok('Ecom demo is documented', fs.existsSync(path.join(root, 'docs/ECOM-DEMO.md')) && read('docs/INDEX.md').includes('ECOM-DEMO.md'));
ok('Ecom demo stages stay data-driven', (read('src/client/parts/57-ecom.js').match(/ECOM_STAGES = \[/) || []).length === 1 && read('src/client/parts/57-ecom.js').includes('function ecomStageStat('));
ok('Affordance text uses one line box', css.includes('.cx-aff .cx-aff-zh,.cx-aff .cx-aff-en{display:inline-flex;align-items:center;height:20px;line-height:20px'));
ok('Affordance parts share a center line', css.includes('.cx-aff>*{align-self:center') && css.includes('.cx-aff .cx-aff-zh,.cx-aff .cx-aff-en'));
ok('acceptance contract is canonical and four-level', read('docs/ACCEPTANCE.md').includes('L0') && read('docs/ACCEPTANCE.md').includes('browser_screenshot') && read('docs/AI-CONTEXT.md').includes('docs/ACCEPTANCE.md'));
ok('factory acceptance is one command', fs.existsSync(path.join(root, 'scripts/accept-factory.mjs')) && JSON.parse(read('package.json')).scripts['verify:factory'] === 'node scripts/accept-factory.mjs');
ok('createApp uses local Go build + space restart', /export async function goTidyBuild/.test(read('lib/core/gobuild.js')) && /ensureGo\(/.test(read('lib/core/gobuild.js')) && /await goTidyBuild\(dir, \{ node/.test(read('lib/core/spaces.js')) && /export async function restartSpace/.test(read('lib/core/spaces.js')) && /await buildSpace\(\{ node, space \}\)/.test(read('lib/core/apps.js')));
const spaces = read('lib/core/spaces.js');
const createSpaceBlock = (spaces.match(/export async function createSpace[\s\S]*?\n}/) || [''])[0];
ok('createSpace sends name and optional binary only', /const query = new URLSearchParams\(\{ name: fullName \}\);/.test(createSpaceBlock) && createSpaceBlock.includes('auth: false') && createSpaceBlock.includes("query.set('binary'") && !createSpaceBlock.includes("'space.noecho'") && !read('index.js').includes('repos: body.repos'));
const doStart = chat.indexOf('const doCreateSpace = async');
const nextMark = chat.indexOf('const shortAppTitle', doStart);
const doEnd = nextMark > doStart ? nextMark : doStart + 2500;
const doCreateBlock = doStart > 0 ? chat.slice(doStart, doEnd) : '';
ok('doCreateSpace never reads an outer vals', doCreateBlock.length > 200 && !/\bvals\b/.test(doCreateBlock) && /api\('initSpace', \{ node, space: created\.name, repos \}\)/.test(doCreateBlock));
ok('createSpace is imported by the backend route', /import \{[^}]*createSpace[^}]*\} from '.\/lib\/core\/spaces.js'/.test(read('index.js')));
ok('autogen builds all src packages', read('lib/core/gobuild.js').includes("'-o', 'bin/ice.bin', './src'") && !read('lib/core/gobuild.js').includes("'src/version.go'"));
ok('autogen preflights go.mod and value files', read('lib/core/apps.js').includes('ensureAutogenValues(dir, name, place, values)') && read('lib/core/apps.js').includes('await ensureAppGoMod({ node, space, dir: n.dir, module })') && read('lib/core/apps.js').includes('async function saveSpaceFile'));
ok('autogen surfaces build failures', !/let built = false;[\s\S]*?warning = String/.test(read('lib/core/apps.js')));
ok('autogen value names are ASCII identifiers', read('lib/core/apps.js').includes('put Chinese labels in trans'));
ok('client sanitizes autogen value', chat.includes('preset.value = base.value') && chat.includes('preset.trans = base.trans'));
ok('Factory exposes app code generation', read('lib/core/copilot.js').includes("'createApp', 'generateAppCode'") && chat.includes("op === 'createApp'"));
ok('createSpace action is self-contained', chat.includes("if (op === 'createSpace')") && !chat.includes('return createSpace('));
ok('All PM lists use UiCardList', (chat.match(/h\(UiCardList/g) || []).length >= 5);
ok('PM target list uses UiCardList', chat.includes('h(UiCardList') && read('src/client/parts/15-layout.js').includes('function UiCardList'));
ok('Editor relayouts on window resize', read('src/client/parts/20-devworkspace.js').includes('editorRef.current.layout') && read('src/client/parts/20-devworkspace.js').includes("window.addEventListener('resize', onResize)"));
ok('Map controls live on the shared section head', read('src/client/parts/50-chat.js').includes("name: 'locate'") && read('src/client/parts/50-chat.js').includes("name: mapFull ? 'restore' : 'fullscreen'"));
ok('Max views share cxMaxApply + restore headers', css.includes('.cx-calsec.max') && css.includes('--cx-shell-left') && chat.includes("name: calFull ? 'restore' : 'fullscreen'"));
ok('Chrome bars share vertical center', css.includes('.cx-header,.cx-pipe,.cx-ph,.cx-tools,.cx-crumb,.cx-statusbar') && css.includes('.cx-addrbar,.cx-addressbar{min-height:38px}'));
ok('Address bar primitive exists', read('src/client/parts/15-layout.js').includes('function UiAddressBar'));
ok('Address menu aligns with breadcrumb text', css.includes('.cx-tree-menu .cx-menu-item{gap:6px;padding-left:0}') && css.includes('.cx-tree-menu .cx-menu-item .mi{width:12px'));
ok('Long menu has more hint', read('src/client/parts/20-devworkspace.js').includes('cx-menu-more'));
ok('Menus scroll and align', css.includes('.cx-menu,.cx-tree-menu,.cx-drop-pop,.cx-ctxmenu{max-height:min(60vh,420px)') && css.includes('.cx-menu-item,.cx-tree-menu .cx-menu-item'));
ok('Layout design-system primitives exist', read('src/client/parts/15-layout.js').includes('function UiWorkspace') && read('src/client/parts/15-layout.js').includes('function UiCardList') && read('src/client/parts/15-layout.js').includes('const DoubleLineTitle'));
ok('PM cards use DoubleLineTitle', pm.includes('h(DoubleLineTitle'));
ok('Global affordance primitive exists', read('src/client/parts/10-ui.js').includes('function UiAffordance') && css.includes('.cx-aff--short .cx-aff-en'));
ok('Entity image matches two text lines', css.includes('.cx-entity-pic{width:38px;height:38px') && css.includes('.cx-entity-head{height:20px}') && css.includes('.cx-entity-meta{height:14px'));
ok('Entity double-line title is shared', read('src/client/parts/10-ui.js').includes('function EntityTitle') && read('src/client/parts/32-cards.js').includes('h(EntityTitle'));
ok('Node image resolves src/main', read('lib/base/registry.js').includes("['src/main.png', 'src/main.jpg', 'src/main.ico']"));
ok('Panels use icon headers', read('src/client/parts/10-ui.js').includes("icon ? h(UiIcon") && page.includes("icon: 'server'"));
ok('Workflow status chips use icons', page.includes("icon: 'avatar'") && page.includes("icon: 'layers'"));
ok('Flow/chips are 36px and cannot shrink', css.includes('.cx-pipe>.cx-stage.cx-aff,.cx-pipe .cx-chips .cx-chip.cx-aff{height:36px;flex:0 0 auto') && css.includes('background:var(--cx-surface-1)'));
ok('Flow and chips share one line height', css.includes('.cx-stage.cx-aff,.cx-chip.cx-aff{height:32px'));
ok('Workflow stages use icons', page.includes("icon: 'server'") && page.includes("icon: 'web'") && page.includes('cx-stage cx-stage-title'));
ok('Panel refresh is hover-only', css.includes('.cx-panel .cx-tool-refresh{visibility:hidden'));
ok('Web tabs open menu on contextmenu', page.includes('onContextMenu: (e) =>') && page.includes('setWebMenu'));
ok('Time/location use the shared section head', chat.includes("icon: 'clock'") && chat.includes("icon: 'map'"));
ok('Header refresh is hover-only', css.includes('.cx-pm-h .cx-pm-refresh,.cx-tree-sect .cx-pm-refresh{visibility:hidden'));
ok('PM controls use unified icons', read('src/client/parts/10-ui.js').includes('function IconButton') && pm.includes("h(IconButton, { name: 'refresh'") && pm.includes("h(IconButton, { name: folded ? 'chevronRight' : 'chevronDown'"));
ok('PM empty state exposes create action', pm.includes('cx-pm-create-big') && chat.includes("h(PmEmpty, { label: T('创建目标')"));
ok('PM section headers are shared', chat.includes('h(PmSectionHead') && pm.includes('function PmSectionHead'));
ok('PM filters use one helper', chat.includes('pmFilterOptions(') && pm.includes('function pmFilterOptions'));
ok('PM selection uses one hook', chat.includes('usePmSelection(') && pmsel.includes('function usePmSelection'));
ok('PM data uses one hook', chat.includes('usePmData(') && pmdata.includes('function usePmData'));
ok('UID aliases are canonical', ui.includes('UID_RE') && ui.includes('targetUID'));
ok('PM action menu is shared', pm.includes('function PmActionMenu'));
ok('Backend log converts ANSI colors', read('src/client/parts/12-debug.js').includes('ansiRuns') && read('src/client/parts/12-debug.js').includes('terminalTheme'));
ok('Backend log resolves node/space from URL', read('src/client/parts/12-debug.js').includes('debugLogTarget'));
ok('Backend log tab is shared', read('src/client/parts/12-debug.js').includes('TerminalLog') && read('src/client/parts/12-debug.js').includes("value: 'backend'"));
ok('PM card is shared', pm.includes('function PmCard'));
ok('detail reuses DetailTabs', debug.includes('h(DetailTabs'));
ok('task process uses reportCreate', project.includes("status === 'process'") && project.includes("reportCreate"));
ok('danger actions are in context menu', pm.includes("new Set(['modify', 'remove', 'cancel', 'reject', 'handover'])"));
ok('Chat context has one scene source', chat.includes('function stripSceneAliases') && chat.includes('const requestContext = stripSceneAliases(context);') && chat.includes('context: requestContext'));
ok('Workspace has exactly one grid definition', (css.match(/^\.cx-body\{/gm) || []).length === 1);
  ok('Workspace keeps four columns with horizontal scroll', css.includes('grid-template-columns:minmax(320px,480px) minmax(320px,480px) minmax(320px,480px) minmax(420px,1fr)') && css.includes('overflow-x:auto') && css.includes('overscroll-behavior-x:contain'));
  ok('Chat message body is a vertical column', css.includes('.cx-shell .cx-msg .cx-msg-main{display:flex!important;flex-direction:column!important') && css.includes('.cx-shell .cx-msg .cx-msg-body{width:100%!important;min-width:0}'));
ok('version chip opens update modal', read('src/client/parts/60-page.js').includes("className: `cx-ver${upd && upd.hasUpdate ? ' upd' : ''}`") && read('src/client/parts/60-page.js').includes('h(UpdateModal, { info: upd'));
ok('update check is a GET op with noUser', read('lib/core/ops.js').includes("checkUpdate: { method: 'GET', noUser: true") && read('src/client/parts/05-bootstrap.js').includes("'checkUpdate']"));
ok('update check never throws (falls back to cache)', read('lib/core/update.js').includes('if (cache.value) return { ...cache.value, local, cached: true, stale: true, error: msg };'));
ok('deploy console traces every ContextOS API request', read('lib/base/http.js').includes('traceDeployRequest(port') && read('lib/base/http.js').includes('traceDeployResponse(port') && read('lib/core/deploy-log.js').includes('export function traceDeployRequest') && read('lib/core/deploy-log.js').includes('export function traceDeployResponse'));
ok('direct fetch API paths are traced too', read('lib/core/nodes.js').includes("traceDeployRequest(p, 'GET', url)") && read('lib/core/nodes.js').includes("traceDeployRequest(rp, 'POST', loginUrl)"));
ok('init logs every plugin API request', read('src/client/parts/05-bootstrap.js').includes('__CX_API_TRACE__') && page.includes('__CX_API_TRACE__') && initUi.includes('state.apiConsole') && page.includes("d.op === 'deployLog'"));
ok('init console filters by HTTP method', initUi.includes("['ALL', 'GET', 'PUT', 'POST', 'DELETE']") && initUi.includes('compactInitLog(') && initUi.includes('methodFilter'));
ok('init console has one output area and no execution table', initUi.includes('cx-init-methods') && !initUi.includes("className: 'cx-init-log'") && !initUi.includes("T('执行过程')"));
ok('space home has no trailing slash', !page.includes("u.pathname += '%2F'") && read('lib/core/nodes.js').includes('opened: `http://localhost:${Number(node)}/s/${space}`'));
ok('view tabs scroll horizontally when narrow', css.includes('.cx-shell .cx-header .cx-views') && css.includes('justify-content:safe center') && css.includes('.cx-views>.cx-view{flex:0 0 auto}'));
ok('header style settings collapse at narrow widths', page.includes("className: 'cx-header-compact'") && css.includes('.cx-header .cx-actions{display:none}') && !css.includes('.cx-pipe>.cx-stage,.cx-pipe>.cx-arrow') && css.includes('.cx-header-cfg-grid'));
ok('binary standard spaces still pass repos', read('lib/core/nodes.js').includes('repos: item.repo, binary'));
ok('deploy waits before runtime probe', read('lib/core/nodes.js').includes('await sleep(3000)') && read('lib/core/nodes.js').includes("[wait] 等待 3s"));
ok('space create waits before runtime probe', read('lib/core/spaces.js').includes('setTimeout(r, 3000)') && read('lib/core/spaces.js').includes('interval: 1500'));
ok('download progress bar is rendered', initUi.includes('cx-init-dl') && initUi.includes('downloadPct') && read('lib/core/nodes.js').includes('[download] ${pct}%'));
ok('init refreshes node list after deploy', page.includes('await loadNodes();\n            setNode(port);'));
ok('download progress reaches 100 percent', read('lib/core/nodes.js').includes('[download] 100%'));
ok('space progress is rendered from job status', initUi.includes('cx-init-subbar') && read('lib/core/init.js').includes('onProgress'));
ok('copy mode is wired through official spaces', read('lib/core/ops.js').includes('copyMode') && read('src/client/parts/34-forms.js').includes('copyMode'));
ok('current step dot is yellow', css.includes('background:#ffd166'));
ok('init modal keeps header/footer fixed', css.includes('.cx-init .cx-init-card{height:min(760px') && css.includes('.cx-init .cx-init-body{flex:1;min-height:0;overflow:auto'));
ok('init console wraps every character at full width', css.includes('.cx-init-console{width:100%;max-width:100%;box-sizing:border-box;word-break:break-all;overflow-wrap:anywhere}'));
ok('runtime probes are hidden from console', read('lib/core/deploy-log.js').includes("endsWith('/c/runtime')"));
ok('running step has a breathing probe dot', initUi.includes('cx-init-dot') && css.includes('@keyframes cx-probe'));
ok('space home URLs have no trailing slash', read('lib/core/nodes.js').includes('return { opened: `http://localhost:${Number(node)}/s/${space}` };'));
ok('avatar step does not duplicate project creation', read('lib/core/init.js').includes('skipProject: true') && read('lib/core/avatar.js').includes('skipProject = false'));
ok('Avatar user is created through community API', read('lib/core/avatar.js').includes('/c/web.team.gonganxitong.user/action/create') && !read('lib/core/avatar.js').includes('/c/aaa.user/action/create'));
ok('ContextOS lives in the conversation tab strip', /name: 'conversation\.view'/.test(page) && /id: 'contextos'/.test(page) && !/openRightbar/.test(page));
ok('the tab renders the session config panel', page.includes('h(CtxCenter, { sessionId:') && page.includes('inline: true'));
ok('config entries switch to the tab first', read('src/client/parts/58-config.js').includes("selectView('contextos')"));
ok('Header theme and language are single cycling buttons', (() => {
  const chat = read('src/client/parts/50-chat.js'), ui = read('src/client/parts/10-ui.js');
  const cycles = (chat.match(/h\(CtxCycle, \{/g) || []).length;
  return ui.includes('function CtxCycle(') && !ui.includes('function CtxSeg(') && cycles >= 2
    && chat.includes("{ value: 'light', icon: 'sun'") && chat.includes("{ value: 'dark', icon: 'moon'")
    && !/h\(DropSelect, \{ value: (themeMode|langMode)/.test(chat);
})());
ok('Selected cards scroll into view below the sticky header', (() => {
  const ui = read('src/client/parts/10-ui.js'), pm = read('src/client/parts/55-pm.js'), kit = read('src/client/styles/kit.css');
  return ui.includes('function cxReveal(') && ui.includes("scrollIntoView({ block: 'nearest'") &&
    pm.includes('if (active) cxReveal(cardRef.current)') && pm.includes('ref: cardRef') &&
    kit.includes('scroll-padding-top:44px');
})());
ok('Chat cards and inline forms reuse the kit', (() => {
  const chat = read('src/client/parts/50-chat.js'), msg = read('src/client/parts/49-msg.js'), css = read('src/client/styles/kit.css');
  return chat.includes("h(CxSection, { className: 'cx-msg-card'") && chat.includes("className: 'cx-kv'")
    && msg.includes('function CxWriteForm') && msg.includes('h(CxField,') && msg.includes('h(CxBtn,')
    && css.includes('.cx-kv-row{') && css.includes('.cx-field-lite{');
})());
ok('Right panel stacks PM sections but not the TIME header', (() => {
  const css = read('src/client/styles/kit.css'), main = read('src/client/styles/main.css'), chat = read('src/client/parts/50-chat.js');
  return css.includes('.cx-pm-sec>.cx-pm-h{position:sticky;top:0')
    && !main.includes('.cx-pm-side.right .cx-pm-h{position:sticky')
    && !chat.includes("'--cx-hi'")
    && chat.includes('cx-calsec');
})());
ok('Each section stacks its header and current card', (() => {
  const css = read('src/client/styles/kit.css'), chat = read('src/client/parts/50-chat.js');
  return css.includes('.cx-pm-sec{position:relative}')
    && css.includes('.cx-pm-sec>.cx-pm-h{position:sticky;top:0')
    && css.includes('.cx-pm-sec .cx-pm-card.on{position:sticky;top:34px')
    && (chat.match(/className: 'cx-pm-sec'/g) || []).length >= 5
    && !css.includes('.cx-pm-pin');
})());
ok('Report period types use their own colours', (() => {
  const pm = read('src/client/parts/55-pm.js'), css = read('src/client/styles/kit.css');
  return pm.includes('const PM_REPORT_TONE = {') && pm.includes('PM_REPORT_TONE[reportType] || pmTone(statusKey)')
    && ['daily', 'weekly', 'monthly', 'quarterly', 'annual'].every((t) => css.includes(`.cx-entity-status.is-rt-${t}{`));
})());
ok('Feedback score renders as stars inline', (() => {
  const ui = read('src/client/parts/10-ui.js'), pm = read('src/client/parts/55-pm.js'), form = read('src/client/parts/46-pm.js');
  return ui.includes('function cxStars(') && pm.includes('cxStars(score)') && !pm.includes('cx-pm-stars') && pm.includes("className: 'cx-stars'") && form.includes('cxStars(o.value ?? o.label)');
})());
ok('PM card actions align left while the more button sits right', (() => { const css = read('src/client/styles/main.css'); const pm = read('src/client/parts/55-pm.js'); return css.includes('.cx-pm-card-actions{display:flex;align-items:center;justify-content:flex-start') && css.includes('.cx-pm-card-actions .cx-menu-wrap{margin-left:auto') && pm.includes('function PmActionMenu') && pm.includes('disabled: !list.length') && !/function PmActionMenu[^}]*return null/.test(pm); })());
ok('confirm dialogs use the shared component', (() => { const ui = read('src/client/parts/10-ui.js'); const texts = ['src/client/parts/20-devworkspace.js', 'src/client/parts/50-chat.js', 'src/client/parts/60-page.js'].map(read).join('\n'); return ui.includes('function cxAsk(') && ui.includes('function CxConfirmHost()') && page.includes('h(CxConfirmHost)') && !texts.includes('window.confirm'); })());
ok('date and time pickers are shared controls', (() => { const ui = read('src/client/parts/10-ui.js'); const pm = read('src/client/parts/46-pm.js'); return ui.includes('function CxDateTime(') && ui.includes('function CxCombo(') && pm.includes('type: \'datetime\'') && !pm.includes('datalist') && ui.includes('cxPad') && ui.includes('return `${p.y}-${cxPad(p.mo)}-${cxPad(p.d)} ${cxPad(p.hh)}:${cxPad(p.mm)}:${cxPad(p.ss)}`'); })());
ok('PM ops alias to pmCreate/pmAct', (() => { const c = read('src/client/parts/50-chat.js'); return c.includes('PM_OP_ALIAS') && c.includes("pmStart: ['pmAct', { action: 'process' }]") && c.includes("pmPlanCreate: ['pmCreate', { kind: 'plan' }]"); })());
ok('PM create chains the parent uid it just created', (() => { const c = read('src/client/parts/50-chat.js'); return c.includes('const pmChain = useRef({})') && c.includes('chain[parentKind]'); })());
ok('PM result card reuses the sidebar card', (() => { const c = read('src/client/parts/50-chat.js'); return c.includes('m.card.pm') && c.includes('h(PmCard, { item: m.card.pm.item'); })());
ok('PM item is refetched after writes for fresh actions', read('src/client/parts/50-chat.js').includes('const pmFetchItem = useCallback'));
ok('the composer chip opens a three-level cascade', (() => { const c = read('src/client/parts/58-config.js'); return c.includes('function CtxCascade') && c.includes("col('服务节点 / NODE'") && c.includes("col('项目空间 / SPACE'") && c.includes("col('最近应用 / APP'"); })());
ok('the header utilities button is gone', !page.includes("'conversation.session.header.utilities'"));
ok('conversation view host fills its tab', mainCss.includes('.cx-view-host{height:100%'));
const failed = checks.filter((c) => !c.condition);
for (const c of checks) console.log(`${c.condition ? 'PASS' : 'FAIL'}  ${c.name}${c.detail ? ` — ${c.detail}` : ''}`);
if (failed.length) { console.error(`ui-check: ${failed.length} failed`); process.exit(1); }
console.log(`ui-check: ${checks.length} passed`);

ok('structure primitives exist', read('src/client/parts/07-kit.js').includes('function CxSection') && read('src/client/parts/07-kit.js').includes('function CxBtn') && read('src/client/parts/07-kit.js').includes('function CxTabs'));
ok('UpdateModal uses structure primitives', read('src/client/parts/30-modals.js').includes('h(CxStack, null,') && read('src/client/parts/30-modals.js').includes("h(CxBtn, { variant: 'primary'"));
