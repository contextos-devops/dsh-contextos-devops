# RSI ledger

> 读这份当：复盘，或查某个坑以前怎么处理。
> 不读这份当 → 症状路由 → `DIAGNOSTICS.md`

**按章读**：按日期倒序，**只读最近 3 条**即可对齐当前问题；查旧坑用 `grep -n "<症状关键词>" docs/RSI-LEDGER.md`。

Rule: every iteration must leave the project easier to change than before.
A change is incomplete if it only adds a page-local workaround.

Workflow: 目标 → 计划（时间/金钱预期）→ 分析决策 → 任务拆解 → 执行 → 报告 → 反馈。

Each entry records: lesson → reusable abstraction → verification.

## 归档（只读）

2026-11-15 之前的 45 条已移入 [docs/archive/LEDGER-2026H1.md](archive/LEDGER-2026H1.md)（10-08 起，按日原样保存）。
正册只保留**最近 6 条**（滚动窗口）；查旧坑先看这份，不够再进归档。


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
  `~/.dsh/contextos-devops-dsh/client-errors.log` 没有新记录（插件自己都还没跑起来，写不进日志）。
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

## 2026-11-15 · 一类问题：样式其实没错，错的是「生效的那一层」

- Symptom: 一整天围绕同一条消息卡片反复返工——先「头与按钮挤一行、正文挤成窄栏」，
  再「工具条位置不对」，再「字号高度不一致」，最后「折叠后卡片还是 218px」。
  每次改完都像修好了，下一次又冒出来。
- Root cause（三种，机制不同）:
  1. **加载层**：`<link>` 只在不存在时注入，DSH 热重载换 JS 不换 DOM → 新 JS 配旧 CSS（`max-age=3600` 命中旧 URL）。
  2. **级联层**：`.cx-msg-main{display:flex}` 被后面的 `!important`/旧规则改写成 row；
     `--cx-sec-h:218px` 无条件生效，折叠态只是「没有内容」，高度仍在。
  3. **污染层**：插件把 `--fs-*`/`--h-item` 这类通用令牌写到 `:root`，SPA 与宿主共用 document，把宿主界面也带歪。
- Fix: ①prelude 版本跟随 + `clientCheck` 自报 `build/css/layout/geo/dom`；②关键布局改内联 style + 挂载后自愈；
  ③令牌全部 `--cx-*` 并加 gate 第 12 项；④折叠态补 `height:auto!important` 例外。
- Evidence: `check:probe` msg-card 6/6（正文 93%、工具条间隙 0.0px）；pm-folded 3/3（折叠 42.6/28.6px、展开 218px）；
  `--css /dev/null` 自测 FAIL（证明断言真的依赖样式表）；`build:client` 10 道全绿。
- Lesson: **「改了对不对」要看最终生效值，不是看源码里那条规则**。所以本轮把手工取证固化成
  `scripts/ui-probe.mjs`：fixture 只写结构 + class，断言写在脚本里，双向自测（真 CSS 通过 / 空 CSS 失败）；
  并把「症状 → 先读 → 先跑 → 断言」收进 `docs/DIAGNOSTICS.md`，下次同类问题先跑命令再动代码。

## 2026-11-15 — 全面归纳 #1（插件架构与界面长战役）

> AGENTS.md §8.2 的第一次执行：聚类 → 找规律 → 升级门禁 → 补症状表 → 写报告。

| 类别 | 次数 | 典型症状 | 已固化为 |
| --- | --- | --- | --- |
| 加载层（产物/清单/缓存） | 3 | 插件整体不加载（parts 手抄漏片段）；新 JS 配旧 CSS；`:root` 通用令牌污染宿主 | `load-check`（真执行 factory）、prelude href 版本跟随、gate 第 12 项 `--cx-*` |
| 级联层（布局/覆盖） | 7 | 消息头与正文挤两栏；工具条位置四次调整；字号行高不等；折叠后仍 218px | `ui-probe` 的 `msg-card`（6 断言）/`pm-folded`（3 断言）；关键布局写 JSX 内联 |
| 流程层（门禁/文档） | 4 | README/AGENTS 结构失配；docs 孤儿与死链；gate 关键字随标题漂移 | `docs-check`、gate 第 11 项（README/AGENTS 结构）、`docs-index --write` |
| 数据层（接口/持久化） | 3 | `seedProject` 从未路由（静默 404）；`llmInfo` 调未导出函数；`feedback_count` 恒 0 | `op-check`（客户端调用 ↔ 注册表）、`store-check` 棘轮 |
| 索引层 | 2 | 手册式索引过时；文档重复三份验收 | `CODE-INDEX.md`/`STATE.md` 生成器、`docs/INDEX.md` 唯一入口 |

**规律**：出问题的往往不是「写的那一层」，而是「生效的那一层」——
产物没被执行（加载层）、后写的覆盖没说清为什么赢（级联层）、规则只写在文档里没有断言（流程层）。
因此固化的方向统一为：**把规则搬到可执行产物上**（真执行、真渲染、真计数）。

**本轮新增**：`scripts/ledger-stats.mjs`（数条目、距上次归纳条数、缺「根因/固化」点名，`--check` 阈值 10）；
`AGENTS.md` §八 定义单次五问与全面归纳六动作。

**下轮建议**：① 给「已挂载旧 link 被改写」加可判定证据（服务端校验 `clientCheck.build` 与静态路由版本一致）；
② 把 `ledger-stats --check` 以 soft 方式接进 `build:client`（只提示不阻断）；
③ 每次 retro 必须新增一个 `ui-probe` 用例或一条 gate 断言。

## 2026-11-15 · 文档 23 份互相重复，且写着过期事实

- Symptom: 同一件事写在 2–3 份文档里（CODE-MAP ≈ ARCHITECTURE、FORM-FIELDS ⊂ DESIGN-SYSTEM、
  CONTEXTOS-SUMMARY ⊂ PRODUCT-DESIGN、MEMORY 混装五类内容）；PRODUCT-DESIGN 1662 行吞掉架构/规范/UI/协议；
  更糟的是**写了与现状不符的事实**（「pmList 直读 SQLite」「index.js ≈3000 行」「client.js ≈5200 行」「没有独立构建产物」）。
- Root cause: 层：索引层 + 流程层 —— 文档没有「读这份当」入口、没有体积预算、合并后没有退役机制；
  文档里的数字靠人手抄，没有任何断言比对真实值。
- 类别: 索引层（同类第 3 次：验收三合一、代码索引只有 PM、本次全文重复）。
- Fix: 23 份 → 19 份（CONTEXTOS-SUMMARY/FORM-FIELDS 并入 PRODUCT-DESIGN/DESIGN-SYSTEM，
  MEMORY 按归属拆散，CODE-MAP 并入重写的 ARCHITECTURE）；PRODUCT-DESIGN 1662 → 843 行并加「按章读」；
  `docs/INDEX.md` 重写为「30 秒定位 → 任务路由 → 症状路由 → 文档地图（含行数）」；
  19 份全部补「读这份当 / 不读这份当」两行；`docs-check.mjs` 新增四条断言（入口约定、>400 行必须按章读、
  INDEX 行数 = 真实行数、已删 6 份不得复活）。
- 数字: docs 23 份 5244 行 → 19 份 4203 行（−1041）；INDEX 抓出 17 处过期行数并订正；
  `build:client` exit 0，ui-check 88、ui-probe 9/9、docs 19 份全绿。
- 固化: `docs-check` 第 4–7 条断言（行数断言让「文档里的数字」第一次可执行）；
  报告 `usr/local/WorkBuddy/dsh-reports/2026-11-15-docs-restructure.md`。

## 2026-11-15 · 上下文成本：大头在常驻 AGENTS，不在文档

- Symptom: 每次请求真正吃上下文的是两份 AGENTS 常驻（插件 6932 + 根 4914 tokens），按需文档一次仅 1.2–2.6K；
  LEDGER 越滚越长（51 条 4523 tokens）却每次收尾都要读。
- Root cause: 流程层 —— 只做了「文档去重」，没做「常驻预算」与「台账滚动」，体积全靠眼睛估、无断言钉住。
- 类别: 索引层（同类第 4 次：验收三合一 → 代码索引只覆盖 PM → 全文重复 → 常驻/台账膨胀）。
- Fix: ① AGENTS 396 → 327 行（文件地图表、脚本表改指针，脚本表进 `CODE-INDEX` §5.1 生成物）；
  ② LEDGER 51 → 正册 6 条 + `docs/archive/LEDGER-2026H1.md` 45 条；③ 新增 `scripts/docs-budget.mjs` 接进构建（第 11 道）。
- 数字: 19 份 49220 tokens 全部在预算内；路由实付 0 / 1661 / 3912 / 1673；LEDGER 4523 → 6 条；`build:client` exit 0。
- 固化: `docs-budget.mjs` 超预算即红 + 「11 道门禁」口径；报告 `2026-11-15-context-budget.md`。

## 2026-11-15 · 两个代码库地址（自建 + GitHub 镜像）

- Symptom: 远端一直只有 `https://shylinux.com/x/...`，push 曾长期失败；用户告知同时存在 GitHub 镜像，两个必须同 commit。
- Root cause: 流程层 —— 发布口径没写进规范，远端靠口头记忆。
- 类别: 流程层（同类第 1 次）。
- Fix: 加 `github` 远端；`npm run push:all`（origin + github 一起推）；AGENTS 新增「〇之二 代码库与发布」表。
- 数字: 落后 39 个提交 → 两个远端均推到 e93879e（0 落后，rc=0）。
- 固化: AGENTS §〇之二 + `push:all` 脚本；另把 `docs-index --write` 改成自动同步 INDEX 行数（本轮又一次被行数过期卡住）。
