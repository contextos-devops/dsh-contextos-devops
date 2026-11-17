# RSI ledger

> 读这份当：复盘，或查某个坑以前怎么处理。
> 不读这份当 → 症状路由 → `DIAGNOSTICS.md`

**按章读**：按日期倒序，**只读最近 3 条**即可对齐当前问题；查旧坑用 `grep -n "<症状关键词>" docs/RSI-LEDGER.md`。

Rule: every iteration must leave the project easier to change than before.
A change is incomplete if it only adds a page-local workaround.

Workflow: 目标 → 计划（时间/金钱预期）→ 分析决策 → 任务拆解 → 执行 → 报告 → 反馈。

Each entry records: lesson → reusable abstraction → verification.

## 2026-11-17 — 逐行优化：重复代码只减不增

- 根因：逻辑层——同一能力在多处各写一遍（模板、HTTP 断言、vimer 写入、图像缩放、PM 筛选状态、状态序数组），改一处忘一处。
- 类别：重复/抽象（同类第 2 次：上次是 CSS 重复声明，这次是 JS 重复逻辑）。
- 固化：新增 `scripts/dup-check.mjs`（6 行跨文件窗口，基线 0，接入 build:client 成第 16 道门禁）；`assertOk`/`saveSpaceFile`/`moduleSource`/`cxImageDataUrl`/`usePmPanelState`/`STATUS_ORDER` 六个唯一入口；`docs/DESIGN.md` 记录分层与对偶。
- 数字：跨文件重复窗口 3 → 0；`action/save` 3 → 1；状态序数组 2 → 1；手写 HTTP 断言 11 → 0；服务端 7795 → 7658 行。

## 2026-11-17 — 加一类东西要问一遍「放哪、怎么接」，因为流程只写在脑子里

- **现象**：用户要把「加页面/组件/状态/接口/样式/动效」变成可复用流程（m07175）；此前每次都要现场翻
  「片段编号、schema 位置、OPS 写法、CSS 层」，同一个新人问题重复问，动效更是每次重写 keyframes。
- **根因**：流程层 —— 扩展路径没落成**脚本 + 文档 + 断言**三件套；动效也没有独立层，散落在 main.css
  各处（`.cx-toast` 自带 keyframes、`.cx-busy-spinner` 引用了不存在的 `cx-spin`）。
- **类别**：流程层 · 第 5 次（前四次：门禁缺失、parts 手抄、验收口径、预算/索引漂移）。
- **固化**：
  ① 新增第 6 个样式层 `styles/motion.css`（7 个 keyframes + `.cx-anim-*` + reduced-motion 统一关闭），
     `build/client.mjs`/`gate.mjs`/`css-check.mjs` 三处同步；
  ② `scripts/scaffold.mjs`（`npm run new -- <kind> <Name>`，6 类）+ `npm run check:extend` 自检；
  ③ `scripts/ui-probe.mjs` 新增 `anim` 用例（量 `animationName/animationDuration`），把「动效有没有接上」变成断言；
  ④ 新增 `docs/EXTENDING.md`（六类扩展的固定入口与接线表）+ `DESIGN-SYSTEM.md` §20.4/§20.5 + `INDEX.md` 路由行；
  ⑤ `AGENTS.md` 岗位表加一行「加页面/组件/状态/接口/样式/动效 → 先 scaffold」。
- **数字**：样式层 5 → **6**；扩展路径 0 → **6 类脚本化**；`anim` 用例 5/5；`check:extend` PASS；
  门禁 15 道（+`css-check` 之后未再新增）；`build:client` exit 0。

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

## 2026-11-17 · 原生控件与自绘样式两套语言
- 现象：确认/候选/时间用的是浏览器原生控件，与应用风格割裂；根因：控件层（级联层第 3 次）。固化：`cxAsk`+`CxConfirmHost`、`CxCombo`、`CxDateTime` + `ui-probe datetime-pop`。数字：4→0、1→0、2→0。

## 2026-11-17 · 吸顶单位错了一层：节 vs 滚动区
- 现象：TIME 标题被钉住；当前卡片被下一节标题压住或被节底切掉。根因：级联层第 4 次（sticky 的包含块是父元素，不是视口）。
- 固化：`.cx-pm-sec/.cx-card-list{display:contents}` + `pinStack()` 量高写 `--pm-top/--pm-card-top`；`ui-probe right-panel-stack`（7 条）+ `ui-check` 两条。数字：TIME 标题底 43→-157；三层堆叠 0 重叠。

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

## 2026-11-17 — 新增「电商流水线」演示视图（mock）

- 现象：客户要看「模板 → 入驻 → 授权 → 多智能体」的链路，但没有可看的东西。
- 根因层次：流程层（缺一个把模式讲清楚的界面）。
- 类别：产品演示（首次）。
- 固化：新增 `57-ecom.js`（视图 id `ecom`，纯 mock、零请求）+ `docs/ECOM-DEMO.md` 并登记
  `docs/INDEX.md`；`docs-index --write` 把新片段写进 `CODE-INDEX.md`，`docs-check` 不再报生成物过期。
  两条棘轮：`css-check` 锁死 main.css → 样式落 `layout.css`；`i18n-lint` 中文棘轮 → 徽标改英文。
- 数字：`build:client` exit 0（ui-check 151）；新增 1 视图 / 75 行样式 / 263 行组件。
- 教训：视图级样式不要往 `main.css` 堆——它被预算棘轮锁死，新视图应落在 `layout.css` 或独立层。
