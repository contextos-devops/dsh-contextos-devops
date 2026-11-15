# 代码索引 / CODE INDEX

> 读这份当：要找某个文件 / 组件 / op / 脚本在哪，或核对接口契约。
> 不读这份当 → 架构分层与模块归属 → [ARCHITECTURE.md](ARCHITECTURE.md)；产品设计 → [PRODUCT-DESIGN.md](PRODUCT-DESIGN.md)
>
> 生成物：`node scripts/docs-index.mjs --write`（2026-11-15）· 源：`src/client/parts/*.js`、`lib/**/*.js`、`scripts/*.mjs`、`docs/*.md`
> 手改会被下一次生成覆盖；要改内容改代码里的源头。

## 1. 服务端（宿主进程）

| 文件 | 行数 | 导出 |
| --- | ---: | --- |
| `index.js` | 364 | `apply()`、`inject`；路由只做 `OPS` 分发 |
| `lib/base/env.js` | 23 | `ctxRoot()` `stateDir()` `HOME` |
| `lib/base/field.js` | 26 | `fieldSegments()` `splitFields()` |
| `lib/base/http.js` | 171 | `baseUrl()` `encode()` `envelopeRows()` `envelopeShape()` `http()` `upload()` `parseRuntime()` `probe()` …11 个 |
| `lib/base/platform.js` | 34 | `sqliteBin()` `openBrowser()` `openTerminalAt()` `isMac` `isLinux` `osName` `archName` `platformTriple` …9 个 |
| `lib/base/registry.js` | 194 | `registryPath()` `readRegistry()` `writeRegistry()` `saveNodeInfo()` `refreshNodes()` `portOnDisk()` `scanLocalNodes()` `binExists()` …10 个 |
| `lib/base/state.js` | 67 | `listDataFiles()` `readDataFile()` `migrateStateKeys()` `migrateStateOnce()` |
| `lib/base/table.js` | 48 | `decodeCell()` `parseFixedTable()` `parseTable()` |
| `lib/base/texttable.js` | 27 | `parseTextTable()` |
| `lib/base/url.js` | 179 | `portalOf()` `placeUidKey()` `apiPath()` `dataPath()` `webUrl()` `systemUrl()` `spaceUrl()` `platformUrl()` …19 个 |
| `lib/core/apps.js` | 680 | `storeApps()` `storeAction()` `createStoreInstance()` `listApps()` `scanApps()` `uniqueAppName()` `autogenSpec()` `autogenService()` …15 个 |
| `lib/core/auth.js` | 111 | `toolToken()` `adminSessid()` `appSession()` `appSessid()` `peekNodeAuth()` `ensureNodeAuth()` `APP_COOKIE` `nodeToken` …9 个 |
| `lib/core/avatar.js` | 326 | `avatarsFile()` `readAvatars()` `writeAvatars()` `defaultAvatar()` `listAvatars()` `createProjectForAvatar()` `ensureProject()` `createAvatar()` …20 个 |
| `lib/core/backup.js` | 106 | `backupRoot()` `backupSpace()` `listBackups()` `sampleNodes()` `monitorQuery()` |
| `lib/core/codegen.js` | 402 | `codegenCond()` `codegenList()` `codegenRender()` `codegenMerge()` `codegenPath()` `codegenWrite()` `detectClass()` `moduleInfo()` …13 个 |
| `lib/core/copilot.js` | 544 | `setLlm()` `getLlm()` `chatProviders()` `compactContext()` `lastEffort()` `buildChatPrompt()` `chatWithDSH()` `llmJson()` …15 个 |
| `lib/core/data.js` | 158 | `writeData()` `readData()` `removeData()` |
| `lib/core/deploy-log.js` | 84 | `deployLogPath()` `resetDeployLog()` `traceDeployRequest()` `traceDeployResponse()` `appendDeployLog()` `readDeployLog()` |
| `lib/core/device.js` | 149 | `discoverDevices()` |
| `lib/core/files.js` | 153 | `listDir()` `readFile()` `writeFile()` `listTree()` `makeDir()` `renamePath()` `removePath()` `gitStatus()` |
| `lib/core/gobuild.js` | 99 | `goBinary()` `runGo()` `goTidyBuild()` |
| `lib/core/iam.js` | 123 | `iamCommand()` `iamList()` `iamCall()` `commandExists()` `subjectEndpoints()` `iamEndpoints()` `IAM` `SUBJECTS` …9 个 |
| `lib/core/identity.js` | 23 | `activeAvatarUid()` `resolveActorUid()` |
| `lib/core/init.js` | 205 | `getInitStatus()` `startInit()` |
| `lib/core/installer.js` | 311 | `hostTarget()` `normalizeTarget()` `binaryNameFor()` `platformOptions()` `mirrorOf()` `projectNameOf()` `codeAddressOf()` `resolveSources()` …18 个 |
| `lib/core/nodes.js` | 967 | `sshHosts()` `sysControl()` `deployNode()` `stopWatchdog()` `watchdogState()` `startWatchdog()` `startNode()` `stopNode()` …20 个 |
| `lib/core/ops.js` | 321 | `opIndex()` `OPS` |
| `lib/core/project.js` | 394 | `fieldOptions()` `pmList()` `optionValue()` `pmCreateItem()` `pmLog()` `pmFieldsFor()` `pmModifyItem()` `pmRemoveItem()` …13 个 |
| `lib/core/spaces.js` | 411 | `baseDirOf()` `spaceBase()` `spaceDir()` `startSpace()` `stopSpace()` `compileSpace()` `listSpaces()` `initSpace()` …20 个 |
| `lib/core/terminal.js` | 138 | `terminalUpgrade()` |
| `lib/core/terminal2.js` | 142 | `terminalUpgrade()` |
| `lib/core/toolchain.js` | 221 | `cmpVer()` `goVersionOf()` `goCandidates()` `findGoInPath()` `findGo()` `ensureGo()` `goEnv()` `envDoctor()` …10 个 |
| `lib/core/update.js` | 102 | `parseVersion()` `compareVersion()` `localVersion()` `checkUpdate()` `resetUpdateCache()` `PKG_NAME` `REGISTRY` `NPM_PAGE` …9 个 |
| `lib/core/users.js` | 52 | `usersFile()` `loadUsers()` `saveUsers()` `ensureUser()` |
| `lib/core/vocab.js` | 159 | `fieldOf()` `actionOf()` `checkField()` `checkAction()` `declAttrs()` `autoType()` `paramOf()` `paramSpec()` …21 个 |
| `lib/misc/async.js` | 16 | `waitFor()` |
| `lib/misc/shell.js` | 28 | `shellArgs()` `runShell()` `spawnDetached()` `isWin` |
| `lib/misc/static.js` | 34 | `STATIC_MIME` `makeStatic` |

## 2. 客户端片段（构建顺序 = 文件名顺序）

| 片段 | 行数 | 主要定义 |
| --- | ---: | --- |
| `src/client/parts/00-prelude.js` | 322 | `React` `cxPlaceKey` `cxWebUrl` `CX_HOST` `API` `CLIENT_CSS` `CLIENT_BUILD` `cxClientTag` `CRITICAL_CSS` `ACTIVITY` |
| `src/client/parts/05-bootstrap.js` | 66 | `apiTrace` `QUERY_OPS` |
| `src/client/parts/08-store.js` | 86 | — |
| `src/client/parts/10-ui.js` | 189 | `CtxMark` `Ico` `Icon` `Panel` `TOKENS` `Btn` `Toolbar` `Section` `Field` `EmptyState` |
| `src/client/parts/12-debug.js` | 362 | `ANSI_COLORS` `ANSI_NAMES` `AnsiText` `terminalTheme` `TerminalLog` `CONSOLE_TERMS` `ConsoleTerminal` `DebugDetail` |
| `src/client/parts/15-layout.js` | 87 | `SingleLineTitle` `DoubleLineTitle` `UiBar` `UiWorkspace` `UiAddressBar` `MenuList` `UiCardList` `UiTableList` `UiTreeList` |
| `src/client/parts/20-devworkspace.js` | 790 | `DevWorkspace` `termActiveRef` `termPendingRef` `termIdsRef` `termKeyRef` `termHostsRef` `termMapRef` `termAct` |
| `src/client/parts/25-editor-ui.js` | 29 | `GitSections` `EditorTabs` |
| `src/client/parts/30-modals.js` | 107 | `DropSelect` `MenuButton` `Modal` `SceneModal` `AvatarEditModal` `UpdateModal` |
| `src/client/parts/32-cards.js` | 177 | `CARD_TOOLS` `NodeCard` `SpaceCard` `ItemIcon` `AppRow` `StoreRow` `OfficialSpaces` |
| `src/client/parts/34-forms.js` | 263 | `InstallToolbar` `DeployModal` `SpaceModal` `AppModal` `CodeModal` `InstanceModal` `StoreInstanceModal` |
| `src/client/parts/36-data.js` | 268 | `AvatarModal` `QUESTIONS` `DeviceModal` `DataModal` `INIT_DEFAULTS` |
| `src/client/parts/40-project.js` | 464 | `InitOverlay` `CX_LUNAR_INFO` `CX_TERM_INFO` `CX_TERM_NAME` `CX_GAN` `CX_ZHI` `CX_ANIMALS` `CX_NSTR1` `CX_NSTR2` `CX_NSTR3` |
| `src/client/parts/45-map.js` | 110 | `TaskMap` `L` |
| `src/client/parts/46-pm.js` | 159 | `PMModal` `RichText` |
| `src/client/parts/47-three.js` | 325 | `ThreeAvatar` `ThreeCity` `TechBackdrop` |
| `src/client/parts/49-msg.js` | 168 | `Elapsed` `FN_LABEL` `ACT_LABEL` `FN_LABEL_EN` `ACT_LABEL_EN` `FIELD_ZH` `FIELD_EN` `KIND_META` `CxEntityCard` `L` |
| `src/client/parts/50-chat.js` | 1423 | `ChatPanel` `userUpRef` `ToolRow` `APP_CHAIN` `CHAIN_VALUE` `CHAIN_TRANS` |
| `src/client/parts/51-pmselection.js` | 32 | `usePmSelection` |
| `src/client/parts/52-pmdata.js` | 30 | `usePmData` |
| `src/client/parts/55-pm.js` | 147 | `PM_KIND_LABEL` `PM_SHORT` `PM_ACTION_LABEL` `PM_MENU_ACTIONS` `Gantt` `PmFilter` `PmEmpty` `PmCreateButton` `PmSectionHead` `PM_STATUS_ORDER` |
| `src/client/parts/58-config.js` | 382 | `CTX_CFG_KEYS` `CTX_CFG_DEFAULT` `CTX_CFG_NS` `CTX_CALLS_NS` `CTX_UI` `CTX_DATA` `MODE_INTRO_SEEN` `ModeIntro` `WelcomeBurst` `CursorComet` |
| `src/client/parts/59-monitor.js` | 263 | `MonitorDonut` `R` `MonitorSpark` `MonitorTwin` `MON_PANELS` `MON_DEFAULT` `MonitorPanel` `MonitorBoard` `MonitorView` |
| `src/client/parts/60-page.js` | 1636 | `PipeSelect` `Page` `Boundary` |

## 3. 接口契约

- 注册表：`lib/core/ops.js` — **109** 个 op（GET 查询 / PUT 仅 pmCreate / POST 其余）。
- 客户端调用 **79** 个；仅服务端 **31** 个：`health` `refreshNodes` `initProject` `openNode` `nodeTerminal` `dockerDeploy` `remoteDeploy` `pipeline` `spaceOpen` `spaceTerminal` `storageCheck` `backupSpace` `backups` `sampleNodes` `envDoctor` `goEnsure` `createApp` `codegenRender` `codegenInspect` `pmTree` `pmUpdate` `pmDelete` `deleteAvatar` `deleteBackground` `removeData` `llmInfo` `iamList` `iamCall` `iamSubjects` `iamEndpoints` `clientError`。
- 门禁：`scripts/op-check.mjs`（缺 op、方法不一致、路由层残留业务分支都会红）。

## 4. 持久化

- 唯一出口：`src/client/parts/08-store.js`；**38** 个登记键，明细见 `docs/STATE.md`。
- 门禁：`scripts/store-check.mjs`（直连 localStorage 只减不增，新键必须进 schema）。

## 5. 脚本与门禁

| 脚本 | 作用 |
| --- | --- |
| `scripts/accept-factory.mjs` | 一次性空间跑通软件工厂 |
| `scripts/bench-chat.mjs` | — |
| `scripts/catalog-pr.mjs` | — |
| `scripts/context-check.mjs` | AI 上下文包与硬规则仍在 |
| `scripts/docs-budget.mjs` | 文档 token 预算（棘轮）与路由实付 |
| `scripts/docs-check.mjs` | 文档索引、链接、生成物一致 |
| `scripts/docs-index.mjs` | — |
| `scripts/e2e-deploy.mjs` | — |
| `scripts/edge-refresh.mjs` | CDP 刷新页面 |
| `scripts/gate.mjs` | 构建门禁：产物哈希/语法/CSS 版本/规范断言 |
| `scripts/hook-order-check.mjs` | hook 依赖数组的 TDZ |
| `scripts/i18n-check.mjs` | 中英文案键与大小写 |
| `scripts/install-check.mjs` | — |
| `scripts/ledger-stats.mjs` | — |
| `scripts/load-check.mjs` | — |
| `scripts/op-check.mjs` | OPS ↔ 客户端 api() 契约 |
| `scripts/publish-check.mjs` | — |
| `scripts/publish-npm.mjs` | — |
| `scripts/push-all.mjs` | — |
| `scripts/store-check.mjs` | 持久化唯一出口 + schema 登记 |
| `scripts/ui-check.mjs` | UI 结构与组件复用断言 |
| `scripts/ui-probe.mjs` | — |
| `scripts/ui-verify.mjs` | 真浏览器验收（Edge CDP 9223） |

### 5.1 npm 脚本

| 命令 | 作用 |
| --- | --- |
| `npm run build:client` | 构建 + 全部门禁（11 道，红先修） |
| `npm run watch:client` | 监听片段变化重建（不跑门禁） |
| `npm run verify:factory` | factory 模式端到端验收 |
| `npm run gate` | node scripts/gate.mjs |
| `npm run verify:ui` | 真浏览器验收（Edge CDP 9223） |
| `npm run release` | build:client + verify:ui |
| `npm run stats:ledger` | LEDGER 条目统计与归纳提醒 |
| `npm run push:all` | node scripts/push-all.mjs |
| `npm run catalog:pr` | node scripts/catalog-pr.mjs |
| `npm run publish:npm` | node scripts/publish-npm.mjs |
| `npm run check:<名>` | 单跑某道门禁：ui / probe / context / i18n / hooks / ops / install / store / docs / load / budget / publish / prompt |

## 6. 文档

| 文档 | 行数 | 性质 |
| --- | ---: | --- |
| `docs/ACCEPTANCE.md` | 247 | 人写 |
| `docs/AI-CONTEXT.md` | 76 | 人写 |
| `docs/AI-CONVERSATION.md` | 140 | 人写 |
| `docs/ARCHITECTURE.md` | 135 | 人写 |
| `docs/CODE-GEN.md` | 424 | 人写 |
| `docs/DESIGN-SYSTEM.md` | 280 | 人写 |
| `docs/DIAGNOSTICS.md` | 98 | 人写 |
| `docs/DOCTRINE.md` | 108 | 人写 |
| `docs/DSH-COS.md` | 114 | 人写 |
| `docs/IAM.md` | 151 | 人写 |
| `docs/INDEX.md` | 107 | 索引 |
| `docs/INSTALL.md` | 108 | 人写 |
| `docs/INTERFACE.md` | 419 | 人写 |
| `docs/MONITOR.md` | 83 | 人写 |
| `docs/PRODUCT-DESIGN.md` | 843 | 人写 |
| `docs/PUBLISH.md` | 172 | 人写 |
| `docs/RSI-CONSTITUTION.md` | 111 | 人写 |
| `docs/RSI-LEDGER.md` | 109 | 人写 |
| `docs/STATE.md` | — | 生成 |
| `docs/URL-SPEC.md` | 243 | 人写 |
