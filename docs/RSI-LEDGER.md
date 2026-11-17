# RSI ledger

> 读这份当：复盘，或查某个坑以前怎么处理。
> 不读这份当 → 症状路由 → `DIAGNOSTICS.md`

**按章读**：按日期倒序，**只读最近 3 条**即可对齐当前问题；查旧坑用 `grep -n "<症状关键词>" docs/RSI-LEDGER.md`。

Rule: every iteration must leave the project easier to change than before.
A change is incomplete if it only adds a page-local workaround.

Workflow: 目标 → 计划（时间/金钱预期）→ 分析决策 → 任务拆解 → 执行 → 报告 → 反馈。

Each entry records: lesson → reusable abstraction → verification.

## 2026-11-17 — 样式全写在一个文件里，新组件只能复制粘贴

- **现象**：新增一个弹窗/卡片要复制 15~20 行 CSS（字号、颜色、flex 三段式），`main.css` 3396 行里
  `font-size:var(--cx-fs-body)` 出现 150 次、`display:flex` 290 次、`align-items:center` 214 次；
  字号还有 74 处写成 `px` 字面量，色值 562 处 `#hex`。
- **根因**：级联层 —— 只有 `tokens.css`(2 行) 与 `main.css`(3396 行) 两个文件，缺「基座/布局/控件」三层，
  于是每个组件都要自己重复声明默认值；同时 `:root` 在 main.css 里又声明了一遍调色板，主题有两个真源。
- **类别**：级联层 · 第 2 次（首次是 2026-11-15「宿主令牌污染」，那次只清了 `:root` 命名空间）。
- **固化**：
  ① 新建 `base.css`/`layout.css`/`kit.css`，`build/client.mjs` 固定顺序 `tokens → base → layout → kit → main`；
  ② `tokens.css` 成为唯一字面量层（含四块主题：`:root` 深/浅、`.cx-shell:not([data-theme=light])`、`.cx-shell[data-theme=light]`），main.css 的两处 `:root` 调色板删除；
  ③ 新增 `scripts/css-check.mjs`（构建第 8 道）：tokens 只准 `:root/.cx-shell`、main.css 字面量色/`rgba`/`!important`/重复率/行数棘轮、`var(--cx-*)` 必须有定义或 fallback；
  ④ 新增 `07-kit.js` 结构原语（`CxStack/CxRow/CxCol/CxSection/CxField/CxBtn/CxInput/CxSelect/CxChip/CxTabs`），`UpdateModal` 迁移为「零 className」写法；
  ⑤ `ui-check` 增 2 条：原语必须存在、`UpdateModal` 必须用原语。
- **数字**：`font-size:<px>` 74 → **0**；未定义令牌 7 个（`--cx-panel-2/--cx-text-2/--cx-text-3/--cx-fg/--cx-dim/--cx-mut/--cx-rose`）→ 0（补别名）；
  同选择器重复声明 −103 条；CSS 文件 2 → 5 个（tokens 298 / base 75 / layout 50 / kit 119 / main 3395）；
  门禁 14 → 15 道，`build:client` exit 0。

## 归档（只读）

2026-11-15 的 3 条早期条目，连同之前的 45 条，均已移入 [docs/archive/LEDGER-2026H1.md](archive/LEDGER-2026H1.md)（10-08 起，按日原样保存）。
正册只保留**最近 6–8 条**（滚动窗口，含本次上架；超过 8 条就把最旧的移入归档）；查旧坑先看这份，不够再进归档。


## 2026-11-15 · 会话越用越慢：提示词每次重拼，缓存一次没命中

- 现象：同一条链路，聊得越久越慢；实测一次「你好」要 1.58s，`usage.cacheReadTokens` 恒为 0，输入 tokens 稳定在 3.2k。
- 根因：**流程层**。`chatWithDSH` 把 system 规则、Current context（截断 6000 字）、history（8×1200）、用户话全拼成**一条 user 消息**——
  没有 `system` 角色，provider 无法复用前缀，每轮全量重算；工具型调用（`resolveWrite`）继承 profile 默认 `reasoningEffort=high`，5s 只为一个字段抽取。
- 类别：流程层（同类第 1 次：请求链路的成本从未被量化过）。
- 固化：① `buildChatPrompt()` 把 system / user 拆开，system 逐轮字节一致；`compactContext()` 只留白名单字段（≤2KB）；
  history 8×1200 → 6×600；② `resolveChatModel` 加 5 分钟模型缓存，省掉每次 `listModels` 往返；
  ③ `streamWithEffort()` 把 `reasoningEffort` 显式传入（`CX_CHAT_EFFORT`/`CX_UTIL_EFFORT` 默认 `low`，`CX_CHAT_MAX_TOKENS=900`），
  适配器不认就回落默认；④ `scripts/bench-chat.mjs` 成第 14 道门禁：断言 prompt 预算、system 稳定、compactContext 不带 `background`。
- 数字：system+context+history 约 36KB → 14.2KB；对话输入 tokens 3192 → 2402（首轮）/ 226（次轮，`cacheReadTokens=2176`）；
  `resolveWrite` 5.07s → 2.49s/1.98s；`build:client` 14 道门禁全绿。

## 2026-11-15 · 改名后「插件好像没了」：模块 id 变了，宿主还在找旧目录

- 现象：目录/包名从 `contextos-devops-dsh` 改成 `dsh-contextos-devops` 后，界面里插件打不开；正在跑的宿主返回 `/dsh-contextos-devops/api?op=health` 404。
- 根因：**加载层**。宿主在进程启动时按旧模块 id（`@local/contextos-devops-dsh`）加载并把 fiber 留在内存里；仓库目录改名后旧 specifier 解析不到，新 id 又没被这轮启动加载 → 插件整体消失。`plugin_manager list_bundles` 读的是 profile 配置，所以看起来「已安装、已启用」，与运行态不是一回事。
- 类别：加载层（同类第 4 次：手抄清单、旧 CSS、旧 link、模块 id 漂移）。
- 固化：① `scripts/push-all.mjs` 按主机挑凭据并核对两端 HEAD（GitHub 组织仓库用 `contextos-devops` 令牌，`~/.git-credentials` 里第一条是 `shylinux` → 403）；② `lib/base/state.js` 的 `migrateStateKeys()` 把 `state.json` 里 `chat:/scroll:` 的旧前缀键一次性改名（服务端状态也不能随改名丢）；③ AGENTS §〇之二 写明「GitHub 组织仓库要换账号令牌」。
- 数字：健康检查 404 → 200；旧前缀键 2 → 0；两端 HEAD 9bcf54f → aeca8d7（同 commit）；`build:client` 12 道门禁全绿。

## 2026-11-15 · 上架插件市场：市场不收代码，只收一行 YAML

- 症状：想「发布插件」，但市场（插件→发现）里搜不到，也不知道从哪一步开始；仓库里其实早已满足安装条件，缺的只是一个条目文件。
- 根因层次：**认知层**——把「发布」当成打包上传，实际是「往精选列表提一个 YAML 的 PR」，市场只允许安装列表内的 `github:` / `npm:` 来源；同时仓库缺 `dsh.bundle.patch` 是最常见被拒原因（我们这条本来就有）。
- 固化：`docs/PUBLISH.md`（三条路径 + 提 PR 步骤 + 发版动作 + 被拒对照表）、`release/catalog-entry.yml`（可直接复制的条目）、`scripts/publish-check.mjs`（把收录硬门槛变成 12 条断言，接入 `build:client` 成为第 12 道门禁）、`LICENSE` 与 `assets/icon-180.png`（市场拒 SVG）。
- 数字：publish-check 8 PASS / 2 WARN（`private:true`、`@local` 包名，均属「发 npm 才需改」）；tarball 0.95MB / 80 文件；仓库年龄 9 天。
- 教训：**对外发布的第一性问题是「别人怎么装」**，不是「怎么打包」；先让 GitHub 源码安装可用（产物入库 + dsh.bundle），npm 只是提速项。

## 2026-11-15 — architecture pass: OPS registry, store, docs index

- Symptom: `index.js` grew a 700-line `route()` with ~100 inline op branches;
  duplicate op handling hid two dead endpoints (`seedProject` never routed,
  `llmInfo` calling an unexported `chatProviders` → guaranteed ReferenceError);
  `client.js` had 96 raw `localStorage` calls with no schema; docs had three
  overlapping acceptance files, no entry index, and a 46-line code map covering
  only PM.
- Fix: (1) `lib/core/ops.js` is the single op registry (`method`/`noUser`/`run`),
  `index.js` only dispatches; `scripts/op-check.mjs` asserts client `api()` ↔ ops
  and that no op branch returns to `index.js`. (2) `src/client/parts/08-store.js`
  is the only persistence door with `CX_STORE_SCHEMA`; `scripts/store-check.mjs`
  is a ratchet (direct `localStorage` only shrinks) plus helper/kind consistency.
  (3) `docs/INDEX.md` is the router; `scripts/docs-check.mjs` fails on orphan
  docs, dead links, stale generated docs, or a resurrected merged file.
  (4) `scripts/docs-index.mjs` generates `docs/CODE-INDEX.md` + `docs/STATE.md`
  from code, so the index cannot drift. (5) `50-chat.js` split: message-level
  components moved to `49-msg.js` (1536 → 1364 lines).
- Evidence: `npm run build:client` green end-to-end (gate ERR=0 WARN=0, 102 ops,
  88 ui-check, i18n, context, docs). `node --check client.js` passes.
- Lesson: an index that a human must remember to update is not an index; make
  the generator + the check the same script, and let the gate fail on drift.

## 2026-11-15 · 插件根本加载不出来：构建片段清单漂移

- Symptom: 用户报「ContextOS 的插件怎么没有加载成功」——侧栏有入口，点进去空白/不渲染。
  `~/.dsh/dsh-contextos-devops/client-errors.log` 没有新记录（插件自己都还没跑起来，写不进日志）。
- Root cause: `build/client.mjs` 与 `scripts/gate.mjs` 各有一份**硬编码**的 `parts` 列表，
  新增的 `src/client/parts/08-store.js`、`49-msg.js` 没进列表 → 产物缺 `cxRead/cxWrite`，
  factory 顶层执行 `ctxCfgLoad()` 时抛 `ReferenceError: cxRead is not defined`，整个模块加载失败。
  静态门禁（gate/ui-check/i18n/context）全绿也发现不了：它们只读文本，从没执行过产物。
- Fix: (1) 片段列表改为**目录推导**（`readdirSync` + 字典序），build 与 gate 共用同一规则；
  (2) 产物头部写 `// @parts <file>:<sha8>,…` 清单；
  (3) 新增 `scripts/load-check.mjs`：清单 vs 目录逐项比对 + 在模拟宿主（React/DOM/localStorage 桩）
  里 vm 执行 `client.js`、调用 `factory(require)`、断言导出 `apply`/`inject`；
  (4) 接入 `build:client`（gate 之后），新增 `npm run check:load`。
- Evidence: 修复前 `node scripts/load-check.mjs` → `factory() 抛错：cxRead is not defined`（可复现）；
  修复后 `PASS client bundle 可加载（24 片段、factory 正常导出 apply/inject）`；
  全链 gate PASS / load-check PASS / ui-check 88 / i18n / context / docs 全绿；版本 1.48.1。
- Lesson: **凡是「列表」就必须由目录或注册表推导，不能手抄**；凡是「产物」就必须被**执行**过一次，
  文本断言替代不了加载测试。静态门禁全绿 ≠ 能加载。

## 2026-11-15 · 新 JS + 旧 CSS：界面“还是乱的”

- Symptom: 插件能加载后，消息行布局错乱——COPILOT/时间/指标与「详情 重试 引用 复制 删除」挤成一行，
  正文被挤到右侧窄栏（看起来像两栏），与源码里的 `.cx-msg-main{display:flex;flex-direction:column}` 不符。
- Root cause: 样式靠 `<link data-cx-client-css>` 注入，旧逻辑是「**只要已存在就不再注入**」；
  DSH 热重载只换 JS 模块、不清 DOM，于是 `<link href="…?v=旧版本">` 一直留着。
  静态资源路由是 `cache-control: max-age=3600`，旧 URL 命中旧缓存 → 新 JS 配旧 CSS。
  这正是「改了半天样式，界面没变」的机制性原因。
- Fix: prelude 改为**版本跟随**——已存在且 href 不等于当前 `CLIENT_CSS` 就改写 href（并记 ACTIVITY 日志）；
  同时 `clientCheck` 自报 `build`（构建哈希）、`css`（页面上所有 cx 样式链接）、`layout`
  （`.cx-msg-main/meta/tools` 的 display/flex-direction/margin-left），下次可直接读真实 DOM 计算值。
- Evidence: 本地用真实 `assets/client.css` 渲染同一段消息结构（headless Edge）→ meta 独占一行、tools 右对齐、
  正文满宽；说明 CSS 本身正确，线上差异来自「加载了哪份 CSS」。`npm run build:client` 全绿（1.48.2）。
- 固化: `00-prelude` 的 href 版本跟随（自动生效）+ `clientCheck` 的 `build`/`css`/`layout` 字段（可判定）。
  缺口：静态门禁仍无法断言「页面上已挂载的旧 link」，列为 §8.2 第 ③ 步的待升级项。
- Lesson: 版本化资源不仅要换 URL，还要**改写已经挂在 DOM 上的旧 URL**；热重载场景下，DOM 生命周期比模块长。

