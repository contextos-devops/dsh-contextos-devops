# RSI ledger

> 读这份当：复盘，或查某个坑以前怎么处理。
> 不读这份当 → 症状路由 → `DIAGNOSTICS.md`

**按章读**：按日期倒序，**只读最近 3 条**即可对齐当前问题；查旧坑用 `grep -n "<症状关键词>" docs/RSI-LEDGER.md`。

Rule: every iteration must leave the project easier to change than before.
A change is incomplete if it only adds a page-local workaround.

Workflow: 目标 → 计划（时间/金钱预期）→ 分析决策 → 任务拆解 → 执行 → 报告 → 反馈。

Each entry records: lesson → reusable abstraction → verification.

## 2026-11-17 · 原生控件与自绘样式两套语言
- 现象：确认/候选/时间用的是浏览器原生控件，与应用风格割裂；根因：控件层（级联层第 3 次）。固化：`cxAsk`+`CxConfirmHost`、`CxCombo`、`CxDateTime` + `ui-probe datetime-pop`。数字：4→0、1→0、2→0。

## 2026-11-17 · 吸顶单位错了一层：节 vs 滚动区
- 现象：TIME 标题被钉住；当前卡片被下一节标题压住或被节底切掉。根因：级联层第 4 次（sticky 的包含块是父元素，不是视口）。
- 固化：`.cx-pm-sec/.cx-card-list{display:contents}` + `pinStack()` 量高写 `--pm-top/--pm-card-top`；`ui-probe right-panel-stack`（7 条）+ `ui-check` 两条。数字：TIME 标题底 43→-157；三层堆叠 0 重叠。

## 归档（只读）

2026-11-15 的 3 条早期条目，连同之前的 45 条，均已移入 [docs/archive/LEDGER-2026H1.md](archive/LEDGER-2026H1.md)（10-08 起，按日原样保存）。
正册只保留**最近 6–8 条**（滚动窗口，含本次上架；超过 8 条就把最旧的移入归档）；查旧坑先看这份，不够再进归档。

## 2026-11-19 — 定位到应用后表单全空

- 现象：输入「明天见投资人，帮我创建一个会议安排」，路由正确（会议管理 / meeting），表单却 title/content/begin_time 全空；begin_time 声明为 select 但 options 为空，填了也显示不出来。
- 根因：① `lib/core/appindex.js` 原 `valuesOf` 只认「标题：」「引号」「X 分」三种写法，原话里的时间和地点直接丢掉；② `src/client/parts/49-msg.js` 对 select 只渲染 options，空 options 的受控 select 会把预填值静默回退成空白。
- 固化：`extractValues`/`parseWhen`（今天/明天/下周一/12月5日 + 上午/下午/3点半 → `YYYY-MM-DD HH:mm`，只有日期默认 09:00+1h，没有时间不猜）；客户端 `fitFieldValues` 按真实字段名落位（address→place 等别名，多余字段丢弃）；空 options 的 select 退回输入框，预填值不在选项里时补一个 option。
- 数字：`route-check` 287 PASS；「明天见投资人…」→ title=见投资人、2026-11-20 09:00~10:00；「下周一上午10点评审会」→ 2026-11-23 10:00；「加一条记录」仍为 none。
- 教训：**「有值」不等于「看得见」**——受控 select 的空 options 会把预填值静默丢掉；预填要同时改「抽值」和「落位」两端。

## 2026-11-19 — 反馈编辑弹窗把「待改进」显示成「可完成」

- 现象：反馈卡片状态为「待改进」，点修改后表单的「反馈状态」却显示「可完成」；截图里评分还是 5 星（同标题的两条反馈，弹窗开在了较早那条 canFinish/5 上）。
- 根因层次：**逻辑层**——`src/client/parts/46-pm.js` 的 PMModal 用记录里的 `feedback_status`（`shouldImprove`）直接初始化 `<select value>`，而后台 `inputs` 返回的选项值是数字码 `0/1`（name 才是 `canFinish/shouldImprove`）；提交时有 `norm()` 归一，显示时没有。React 18 对匹配不到的 `value` 会静默回退到第一个 option，于是显示「可完成」。`report_type` 同样存在 `daily` vs `0` 的错位。
- 类别：表单取值/异步选项（同类第 1 次，规则早已写在 `DESIGN-SYSTEM` §18-4，但只覆盖提交、不覆盖初始 state）。
- 固化：① `46-pm.js` 新增 effect，options 到位后把 `report_type/feedback_status/score` 按 `value/name/label` 归一到 `value`；② `50-chat.js` 给 PMModal 加 `kind:mode:uid` key，切换记录不再复用旧 state；③ `docs/DESIGN-SYSTEM.md` §18 新增第 6 条，明确「初始 state 也要归一 + 不匹配会回退第一项」；④ React 18 UMD 复现页作为证据（旧逻辑 value=`shouldImprove` 渲染 `0/可完成`，归一后 `1/待改进`）。
- 数字：修复前 `<select>` `value=0 selectedIndex=0 text=可完成`（state 仍是 `shouldImprove`）；归一后 `value=1 selectedIndex=1 text=待改进`；`build:client` 170 条 ui-check、render/hook/op/store/i18n/context/docs 全过，`ui-probe` 仅 `pop-inside` 一条既有断言失败（无浏览器沙箱环境下与本次改动无关，CSS 未改）。
- 教训：**「提交时归一」不等于「显示时归一」**；异步 options + 受控 select 的组合必须把 state 也当作「存量数据」处理，否则 200 提交正确、界面照样骗人。

## 2026-11-19 — 反馈筛选栏显示 shouldImprove/canFinish

- 现象：反馈卡片的「状态」过滤条直接显示 `shouldImprove 1`、`canFinish 1`，没有中文；同页其他计划/任务状态筛选正常。
- 根因层次：**展示层**——`src/client/parts/55-pm.js` 的 `pmFilterOptions` 把 labelKey 拼成 `status_name_label`（实际字段是 `status_label`），取不到后回退 `pmStatusText(value)`，而 `PM_STATUS_ZH/EN` 只覆盖计划/任务七态，没有 `canFinish/shouldImprove`，于是枚举名原样漏出。英文模式下服务端 `status_label` 也直接是枚举名，只读 label 同样会漏。
- 类别：i18n/筛选项标签（状态词表与状态机脱节；第 1 次）。
- 固化：① `55-pm.js` 的 `pmFilterOptions` 对 `status_name` 统一走 `pmStatusText`，类型仍用服务端 `type_label`，最后过 `T()`；② `00-prelude.js` 的 `PM_STATUS_ZH/EN` 补 `canFinish/shouldImprove`；③ `DESIGN-SYSTEM.md` §18 新增第 7 条，明确「筛选 chip 也走翻译表，不要拼 `${key}_label`」。
- 数字：修复后 `shouldImprove 2 → 待改进 2`、`canFinish 1 → 可完成 1`（中英双语脚本断言通过）；`build:client` 的 170 条 ui-check 与 i18n/docs/gate 全过，`ui-probe` 仍只有既有的 `pop-inside` 一条失败（CSS 未改）。
- 教训：**状态词表要和状态机一起长**；新增状态只改后端枚举、不改 `PM_STATUS_*`，筛选栏就会把内部名字暴露给用户，而且卡片本身因为读 `status_label` 看起来是正常的，容易漏测筛选路径。

## 2026-11-19 — 切语言后消息标题和卡片状态还是旧语言

- **现象**：英文界面里 AI 消息显示 `Created 任务`，任务卡片状态位仍显示小写 `created`；切回中文，此前生成的消息和卡片也不会变。
- **根因**：**数据层**——生成消息时把 `T('已创建') + ' ' + PM_KIND_LABEL[kind]` 的成品串存进 `text`，`PM_KIND_LABEL` 只有中文，于是中英混排；卡片 item 的 `status_label` 是 `pmList` 按创建时 `lang` 算好的快照（英文时甚至是枚举名 `created`），`PmCard` 直接读快照，切换语言后既不重算也翻译不动。服务端持久化只存 `{role,text,t}`，卡片被剥掉，刷新后更无从恢复。
- **类别**：i18n/消息模型（把展示串当数据存；同类第 1 次）。
- **固化**：① 消息带 `i18n:{op:'create'|'update'|'remove'|'act',kind,title,action}` 描述，渲染走 `pmMsgText(m)` 用 `pmResultText` 重取词，旧消息可从 `card.pm.kind` 反推；② `PmCard` 状态改为 `status_name`/`type_name` 优先（报告卡走 `pmReportTypeText`），快照 label 仅兜底；③ `PM_STATUS_ZH/EN` 与后台 `STATUS_ZH` 对齐（`created=待提交`、`approved=待开始`），并补反馈两态；④ 服务端持久化补 `i18n` 字段；⑤ `DESIGN-SYSTEM.md` §18 新增第 8 条。
- **数字**：旧逻辑 zh `T('created')='created'`、en 拼出 `Created 任务`；新逻辑 zh/en 分别 `已创建 任务`/`Created Task`、`已更新 报告`/`Updated Report`、`任务「随机任务」开始执行`/`Task “随机任务” started`；状态 `待提交`/`Not submitted`、`待改进`/`Needs improvement`；`build:client` 170 条 ui-check、gate ERR=0 WARN=0，`ui-probe` 仍只有既有的 `pop-inside` 一条失败。
- **教训**：**消息是数据，不是渲染结果**——凡是会随语言/主题变化的文案，存的必须是可重算的描述（op/kind/action），不能存 `T()` 之后的成品串；快照里的 label 也只能当缓存，不能当状态真源。

## 2026-11-19 — 控制台筛选栏标签与卡片不一致、无计数
- 现象：节点筛选「缺失」/卡片「离线」，空间筛选「离线」/卡片「已停止」；项目空间选项无计数。
- 根因：展示层——`60-page.js` 用底层 `state`/`status` 生成选项并由 `stateLabel` 直译（`missing→缺失`、`stop→离线`），卡片却按布尔态分词；选项只 `Set` 去重，没计数。
- 固化：`countOptions` 从列表聚合 `{value,count,label}`；节点 `running/offline`、空间 `running/stopped` 与卡片同词；应用/商店项目空间补计数；旧持久化值迁移；计数复用 `.cx-tag` 不新增 CSS；`DESIGN-SYSTEM` §18-9。
- 数字：`running×2+missing+stopped` → 运行中 2/离线 2；`start×2+stop` → 运行中 2/已停止 1；`/tmp/filtercount.mjs` PASS；`build:client` EXIT=0、ui-check 178、gate ERR=0。
- 教训：筛选项是卡片状态的镜像；从原始枚举生成 chip 必然出现两套词。

## 2026-11-19 — 对话卡死、商店无匹配时盲选实例

- 现象：一句「创建三个随机的任务」整轮没有回执（模型挂起）；「做一个客户管理应用」却建出项目管理实例。
- 根因：**逻辑层**——`appOp` 每轮先 `llmJson resolveWrite` 定位应用（模型慢即整轮卡死）；`createAppFromStore` 无匹配时 `|| list[0]` 盲选第一个模板。
- 固化：新增 `lib/core/appindex.js` 三级路由（最近应用→应用商店→软件工厂，确定性打分，0 次模型调用）+ `appRoute` op + `scripts/route-check.mjs` 16 条断言（含「结构性功能名不算命中」「无匹配不 list[0]」「模糊写意图不生成应用」）；store miss 自动升级 `askAppPlan`。
- 数字：实况 4 句 → 任务/会议/目标 3 句命中最近应用、审批句命中商店模板；客户管理（商店无模板）升级软件工厂；`build:client` EXIT=0 / 276 PASS。
- 教训：**定位是索引问题，不是生成问题**——能用确定性打分就别问模型；兜底一旦选「第一个」就等于替用户做了错误决定。

## 2026-11-19 — 从会话切回插件，空间/应用/商店要等或手动刷新

- **现象**：从会话再进入插件，节点列有内容，但项目空间、最近应用、应用商店先空一段时间；有时要按 ↻ 才能看到最新数据。
- **根因层次**：**生命周期 + 数据层**——切到会话时 DSH 卸载 `Page`，React state 全丢；重进是全新 mount。`nodes` 有 `cxRead('nodes')` 首屏缓存，`spaces/apps/store` 初始都是 `[]`，必须等网络返回；且窗口重新可见时没有补数据逻辑，若宿主保留挂载则数据会一直旧。
- **类别**：缓存/重进体验（重挂载后空白或陈旧；第 1 次）。
- **固化**：① `08-store.js` 新增 `cache-spaces`/`cache-apps`/`cache-store` 与 `cxCacheGet/cxCacheSet`（TTL 7 天、单条 ≤200KB、最多 30 键）；② `60-page.js` 初始 state 从缓存取 spaces/apps/store，加载成功后回写；③ `visibilitychange`/`focus` 30s 节流静默补节点/空间/分身/应用/商店；④ `DESIGN-SYSTEM.md` §18 新增第 10 条。
- **数字**：`/tmp/cachetest.mjs` 断言往返、跨模块重载、TTL 过期、200KB 跳过、30 键上限、bundle 接线全部 PASS；`build:client` EXIT=0（1.48.158、701.8KB、hash `d7a17a2b6e3a`）、`ui-check: 178 passed`、`gate ERR=0 WARN=0`、`ui-probe` 全通过。
- **教训**：**重挂载不能只靠"再请求一次"**——先画上次成功结果，再后台对齐（stale-while-revalidate）；缓存只存小 JSON，图标/场景图这类大对象不要落盘。
