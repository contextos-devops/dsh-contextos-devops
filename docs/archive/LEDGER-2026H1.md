# LEDGER 归档（2026-11-17 之前）

> 读这份当：要查 2026-11-15 之前的某个坑，且现行 `docs/RSI-LEDGER.md` 里没有。
> 不读这份当 → 现行台账 → [../RSI-LEDGER.md](../RSI-LEDGER.md)；症状路由 → [../DIAGNOSTICS.md](../DIAGNOSTICS.md)

归档规则：保留最近 10 条在正册，更早的按日原样归档；每轮全面归纳可把更早的条目压成「类别摘要」替换本文件正文。

> 归档条目：54 条 · 时间跨度 2026-11-08 → 2026-11-17

---

## 2026-11-08 — PM/debug UI hardening

- Lesson: CSS/string checks alone cannot prove a rendered panel is usable.
- Abstraction: `tokens.css`, `10-ui.js` primitives, `12-debug.js`,
  `52-pmdata.js`, `55-pm.js`, `PmActionMenu`.
- Verification: `ui-check` (19 checks), `context-check`, API read-back,
  rendered-screen review.
- Removed: PM direct SQLite read/write compatibility path.

## Required next entries

When a bug is fixed, add:

```text
date — symptom
root cause
new/updated shared abstraction
gate added so the same bug cannot return silently
```

## 2026-11-08 — UI/architecture cleanup

- Lesson: duplicated page-local PM/debug markup caused inconsistent fixes.
- Abstraction: `usePmData`, `PmCard`, `PmActionMenu`, `DebugDetail`, UI tables,
  centralized UID normalization.
- Removed: unused `pmDetail` API path, `assertUid`, item UID wrapper, dead
  fresh-id state.
- Gate: `ui-check` + `context-check`; project memory in `docs/MEMORY.md`（2026-11-15 已并入 `ARCHITECTURE.md` / `DIAGNOSTICS.md`，此处为历史记录）

## 2026-11-08 — code map / metadata consolidation

- Lesson: PM metadata was split between map and card modules.
- Abstraction: PM metadata lives with `PmCard`; ownership documented in
  `docs/CODE-MAP.md`（2026-11-15 已并入 `ARCHITECTURE.md`，此处为历史记录）
- Gate: context pack includes code map and memory.

## 2026-11-08 — PM selection hook

- Lesson: selection persistence was mixed into the chat component.
- Abstraction: `usePmSelection` owns restore/save of target/plan/task/report/feedback.
- Gate: ui-check requires the selection hook.

## 2026-11-08 — debug parser/filter consolidation

- Lesson: debug parsing was in page.js; PM filter options were repeated four times.
- Abstraction: debug parsers live with `DebugDetail`; `pmFilterOptions` is shared.
- Gate: ui-check requires both shared helpers.

## 2026-11-08 — PM section header

- Lesson: the five PM section headers repeated fold/refresh/count markup.
- Abstraction: `PmSectionHead` with icon/title/count/fold/refresh/tools props.
- Gate: ui-check requires the shared section header.

## 2026-11-08 — PM panel primitives

- Lesson: filter wrappers and the create button were still repeated per section.
- Abstraction: `PmFilter`, `PmEmpty`, `PmCreateButton`.
- Gate: ui-check requires all three shared components.

## 2026-11-08 — plan/task ordering

- Lesson: plan/task order was whatever the API returned.
- Abstraction: shared `PM_STATUS_ORDER` + `sortPmItems` (backend and client).
- Contract: status order from ContextOS `guanlixitong.Status`; ties by created_at desc.

## 2026-11-08 — Git sections/ordering

- Lesson: Git changes/history were separate blocks with competing margins.
- Abstraction: one `cx-git-sections` vertical group; shared status ordering for plans/tasks.
- Gate: ui-check requires the group and shared status order.

## 2026-11-08 — editor chrome

- Lesson: editor tabs and Git groups were inline in a 700+ line workspace file.
- Abstraction: `25-editor-ui.js` (`EditorTabs`, `GitSections`).
- Gate: ui-check requires both components.

## 2026-11-08 — editor helper scope

- Symptom: `gitClass is not defined` after extracting `GitSections`.
- Root cause: helper was a component-local const, not module scope.
- Fix: moved `gitClass` into `25-editor-ui.js`; gate requires it.
- Lesson: moving JSX also requires moving its helper dependencies or passing them explicitly.

## 2026-11-08 — initialization flow

- Lesson: no port conflict check, mixed terminology, task list instead of goal/plan, and no execution trace.
- Changes: `freePort` API + probe button; Cyber World terminology; goal/plan descriptions; init trace/log panel.
- Gate: ui-check checks all four.

## 2026-11-08 — initialization hardening

- Lesson: init had no port probe, no execution trace, no retry, and mixed Cyber World casing.
- Changes: freePort API + probe; structured log table; project-step retry; goal/plan descriptions; i18n gate.
- Gate: `check:i18n` + ui-check checks init features.

## 2026-11-08 — deployment strategy

- Lesson: deploy modes skipped cloning and spaces could lack bin/ice.bin.
- Changes: auto clone → compile → copy → download; per-space binary copy;
  standard-space picker (Community/Enterprise forced).
- Gate: ui-check checks picker/auto/log/retry.

## 2026-11-08 — deploy/init finalization

- Lesson: `targetOfBinary` passed the buffer as fd (`readSync(0, ...)`), causing
  "buffer argument must be Buffer, received number 0"; init deploy mode skipped
  clone; log/status labels stayed Chinese in English UI.
- Fix: correct fd/buffer order; `auto` clone→build→copy→download; per-space
  bin copy; translated init labels; standard-space picker.
- Gate: i18n-check + ui-check + context-check.

## 2026-11-08 — space binary and init toolbar

- Lesson: copying the node binary into a space produced a working process but the
  wrong module binary; `deployOfficialSpaces` reused it without rebuild.
- Fix: verify space bin != node bin; copy a peer space binary, otherwise fail;
  rebuild reused official spaces; init toolbar above a short expandable log.
- Evidence: 9195 community/node hashes were identical; 9061 community differs.

## 2026-11-08 — backend log URL resolution

- Symptom: backend log tab threw `Failed to construct 'URL': Invalid URL`.
- Cause: debug rows can hold relative URLs; parsing used `new URL` without a base and assumed the DSH port was the node port.
- Fix: `debugLogTarget` parses absolute URLs for node/space, falls back to Page node/space for relative URLs, and reports a clear error if both are unavailable.
- Gate: ui-check requires `debugLogTarget`.

## 2026-11-08 — PM hover caret/empty create

- Lesson: fold chevrons were always visible and empty sections only offered a tiny header plus.
- Changes: default show kind icon; hover/focus swaps in a larger `›/⌄` caret; empty sections with permission show a large create button.
- Gate: ui-check checks the empty-state create action.

## 2026-11-08 — unified view icons

- Changes: Chat/Manage/Dev tabs use `UiIcon`; all UI icons share 1.4 stroke.
- Gate: ui-check checks view-tab icons.

## 2026-11-08 — header affordance alignment

- Changes: resource refresh sits before create and is right-aligned; PM/workspace
  refresh hidden until hover/focus; time/location now compose `PmSectionHead`.
- Gate: ui-check checks shared headers and hover-only refresh.

## 2026-11-08 — workflow icons/web tab menu

- Changes: stage 01-04 icons; panel refresh hover-only; web tab ellipsis removed,
  right-click opens the full tab menu.
- Gate: ui-check checks flow icons, hover refresh, and onContextMenu.

## 2026-11-08 — panel/flow icon headers

- Changes: removed header deploy/refresh; stage numbers replaced by larger icons;
  panel headers now use `icon` instead of numeric index; avatar/scene/mode/view
  chips use icons.
- Gate: ui-check checks panel/chip icons.

## 2026-11-08 — global affordance

- Abstraction: `UiAffordance` owns icon/zh/en/children and `icon|short|full|text`
  display modes; hover/active transitions are all in `.cx-aff`.
- Applied: panel titles, workflow stages, status chips.
- Gate: ui-check requires the primitive and mode CSS.

## 2026-11-08 — affordance adoption

- `IconButton` now renders `UiAffordance` in `icon` mode, so every icon-only
  action shares hover/active/transition behavior.
- View tabs use `UiAffordance` short mode with zh/en props.
- Remaining text-first buttons can adopt `mode="short|full"` without new CSS.

## 2026-11-08 — EntityTitle

- Abstraction: `EntityTitle` = large image/icon left + type/title/status line + meta line.
- Applied: node/space/app rows.
- Node image: backend resolves `src/main.png|jpg|ico` and returns `/p/src/main.*`.
- Gate: ui-check requires the component and node image candidates.

## 2026-11-08 — one-line flow/chip titles

- Changes: flow stages and status chips are both `UiAffordance` short-mode
  single-line titles; shared 32px height, 20px inner line, same border/hover/active.
- Gate: ui-check checks the shared 32px rule.

## 2026-11-08 — one-line overflow fix

- Symptom: flow/chip text overflowed and backgrounds were too dark.
- Cause: stage items had default `flex-shrink:1`; chip base background remained dark;
  height was too small.
- Fix: `flex:0 0 auto`, 36px height, surface-1 background, max-width ellipsis,
  shared hover/active.
- Gate: ui-check checks the 36px/no-shrink rule.

## 2026-11-08 — design-system refactor

- Added `15-layout.js`: `UiBar`, `UiWorkspace`, `UiCardList`, `UiTableList`,
  `UiTreeList`; aliases `SingleLineTitle`/`DoubleLineTitle`.
- PM cards now use `DoubleLineTitle`; target list uses `UiCardList`.
- Spec: `docs/DESIGN-SYSTEM.md` (vertical slots, horizontal regions, content
  patterns, single/double-line title contracts).

## 2026-11-08 — global migration batch

- PM plans/tasks/reports/feedback now all use `UiCardList`.
- Debug parsed data uses `UiTableList`.
- Calendar/filter/detail icon glyphs replaced with `IconButton`/`UiIcon`.
- Added canonical layout tokens (`--cx-control-h`, `--cx-line-h`, `--cx-meta-h`).
- Gate: all five PM lists must use `UiCardList`.

## 2026-11-08 — address bar/menu spec

- Added `UiAddressBar` (segments + optional input + actions, 32px).
- Menus now share 28px rows, 16px leading icon, ellipsis label, max-height
  60vh/420px and scrolling; applies to menu/tree/drop/context menus.
- Gate: ui-check checks address bar and menu rules.

## 2026-11-08 — crumb menu alignment/scroll

- Fix: menu uses inline max-height/overflow, so wheel scrolls menu not editor.
- Fix: crumb menu item leading slot is 12px/padding 0, text starts at the same
  x as breadcrumb label.
- Added sticky `更多内容，滚动查看` hint for long node menus.
- Gate: ui-check checks alignment and hint.

## 2026-11-08 — calendar maximize escape

- Symptom: maximizing the time calendar left no visible title bar/restore path.
- Fix: explicit maximize/restore icon in the time header; full view is a fixed
  `.cx-calsec.max` with a sticky header and Escape-to-restore.
- Gate: ui-check checks full-view header and restore icon.

## 2026-11-08 — editor resize

- Symptom: maximizing the window could leave Monaco blank/clipped; only terminal
  was refit, editor layout was not.
- Fix: window resize listener calls Monaco `layout()` and refits all terminals in
  the next animation frame.
- Gate: ui-check checks the resize/relayout hook.

## 2026-11-13 — lunar calendar in the month grid

- Symptom: `Intl.DateTimeFormat('zh-CN-u-ca-chinese')` only gives a numeric day
  (`5日`) and a month name; it cannot produce `初五`, solar terms (`立冬`/`小雪`)
  or the `丙午 马年 十月初五` footer line, so the grid looked empty.
- Fix: bundled the 1900-2100 lunar table + 24-term table (ported from
  `volcanos/lib/date.js`) into `40-project.js`; each cell shows the lunar day
  (or month/term/festival) and the footer shows 干支+生肖+月日+星座.
- Gate: ui-check requires `CX_LUNAR` and `.cx-cal-lunar`; rendered-screen check
  at 2026-11 shows 廿三/立冬/小雪 and `丙午 马年 十月初五 天蝎座`.

## 2026-11-13 — render crash from hook dependency order (TDZ)

- Symptom: after adding prefs hydration, the whole plugin turned into
  “界面出现错误” (white screen). `useEffect(..., [themeMode, langMode, ...])`
  was declared before `const [langMode] = useState(...)`, so the dependency
  array evaluated a `let`-like binding in its TDZ and threw on render.
- Why gates missed it: `build:client` only runs static gates
  (gate/ui-check/i18n/context); a TDZ is a runtime error and only appears when
  React actually renders the component.
- Fix: move the effect below all state declarations; add
  `scripts/hook-order-check.mjs` (a static scan that fails when a hook's
  dependency array references an identifier declared later in the same file)
  and wire it into `build:client` before the other checks.
- Lesson: for any client change, static gates are not enough — either run
  `npm run verify:ui` against a real browser, or add a gate that encodes the
  runtime failure mode; do not claim done on build-only evidence.

## 2026-11-13 — createSpace action

- Symptom: AI actions reported `createSpace is not defined` when creating random spaces.
- Cause: action dispatch referenced a helper whose client scope was not present in the executed bundle.
- Fix: inline the create-space flow in `executeAction` (`api createSpace → initSpace → refresh → select`), removing the fragile helper reference.
- Gate: ui-check forbids `return createSpace(` and requires the inline action.

## 2026-11-13 — software factory actions

- Added AI action `createApp` / alias `generateAppCode`: generates a Go module and compiles it.
- Factory allowlist now includes both; deploy action uses `mode:auto` (clone→build→copy→download).
- `createSpace` action is fully inline, so no helper-scope ReferenceError.

## 2026-11-13 — createSpace import root cause

- Real root cause of `createSpace is not defined` was backend, not client scope: `index.js` route called `createSpace` but did not import it from `lib/core/spaces.js`.
- Fix: add `createSpace` to the `spaces.js` import; gate asserts it.
- Verification must call the plugin API, not infer from UI text.


## 2026-11-13 — 行为纠正：禁止重启代替修复

- 事故：用多次重启试图加载 `createSpace` 修复，导致用户正在进行的回合被 `Task stopped`，且真正根因（`index.js` 未导入 `createSpace`）未被先验证。
- 新硬规则（根 `AGENTS.md` 11/12）：任务中不重启宿主；先 API/DOM 复现；一次只改一个根因；修复后用同一 API 回读。
- 验证：`POST /dsh-contextos-devops/api {"op":"createSpace"...}` 返回 `ok:true`，创建的探针空间已用 `deleteSpace` 清理。


## 2026-11-13 — acceptance plugin + four-level contract

- Installed `dsh-preview` 0.1.1 into profile `desktop`; it exposes `browser_open/console/read/interact/screenshot/close` and the `frontend-verify` skill. It hot-loaded into the running host; no restart was used.
- Added `docs/ACCEPTANCE.md`: four evidence levels (L0 static, L1 API read-back, L2 rendered DOM/console, L3 human screenshot), evidence table, exit-code semantics (0/1/2), PM/factory matrices.
- Wired `context-check` and `ui-check` to fail when the acceptance contract or browser evidence requirement disappears.
- Lesson: an acceptance plugin without a written evidence contract turns into another “looks fine”; the doc + gates are the actual acceptance mechanism.

## 归档（只读）

| 日期 | 条目数 |
| --- | ---: |
| 2026-11-08 | 33 |
| 2026-11-13 | 7 |
| Required n | 1 |
| 合计 | 41 |

2026-11-15 之前的条目已移入 [docs/archive/LEDGER-2026H1.md](archive/LEDGER-2026H1.md)；
正册只保留最近 10 条（滚动窗口），保证 Agent 读「最近 3 条」时成本可控。

---

## 2026-11-13 — software factory: local Go build

- Symptom: `createApp` timed out; generated command never registered. Space error log:
  `go build ... err: exec: "go": executable file not found in $PATH`.
- Cause: the node process PATH does not contain `/usr/local/go/bin`; `vimer/compile`
  only warns and returns, so the timeout surfaced far from the root.
- Fix: `lib/core/gobuild.js` resolves `GO` → `<ctx>/usr/local/go/bin/go` →
  `/usr/local/go/bin/go`, runs `go mod tidy` + `go build`, and
  `spaces.js::restartSpace` stops/starts the space to load the new binary.
  `buildSpace` and `createApp` share it; no copied node binary on build failure.
- Evidence: disposable `20261113-factorycheck2`, command `web.chat.devops.accept2`,
  record `acceptance2/probe2` read back `count:"1x5"`; browser page 0 console errors;
  screenshot `page-3-1794556134011.png`; probe deleted.
- Gate: `ui-check` requires `goTidyBuild` + `restartSpace` + `createApp → buildSpace`.


## 2026-11-13 — autogen: half-written app tree

- Symptom: AI reported `autogenApp` success, then “编译未完成：go mod tidy failed”;
  generated `staff/model/model.go` contained `���工管理` identifiers.
- Cause chain: `autogenApp` did not call `ensureGoMod`, so the skeleton only had
  `module <short>` and no `require shylinux.com/x/ice v1.6.6`; Go tried to fetch
  `ice/devops` as its own module. It also swallowed `buildSpace` errors, and the
  character service omits the per-value `.go` files that `portal.go` instantiates.
  The model supplied Chinese labels as `value`, which are Go identifiers.
- Fix: `ensureGoMod` before build; `goTidyBuild` builds `./src` (no hard-coded
  `version.go`); `ensureAutogenValues` writes missing value files from the
  validated ASCII list; `autogenApp` throws on build failure; `value` validated
  as ASCII identifiers; client falls back to the preset fields and keeps labels
  in `trans`.
- Evidence: disposable `20261113-factorycheck6`, autogen `employee` →
  `built:true`, command `web.team.employee.portal`, browser page 0 console errors;
  probe deleted. `ui-check` 84 passed; `context-check` passed.
- Lesson: “build warning” in a factory result is a failure, not a footnote.
## 2026-11-13 — createSpace: name-only contract

- Symptom: the UI debug row showed `PUT /c/dream/action/create?name=...&space.noecho=true&binary=...&user.uid=...`; the user required “只需要指定项目名称，其它参数都不需要”.
- Cause: `createSpace` added a defensive `binary` + `space.noecho`; `http()` also injected `user.uid` for every call. The extra parameters were internal guesses, not ContextOS requirements.
- Fix: `createSpace` query is now only `new URLSearchParams({ name: fullName })`; `http()` accepts `auth:false`, and the create call uses it. `repos` was removed from the MCP route/schema and the project initializer call site.
- Evidence: direct module run created `20261113-onlyapi164912` with request `PUT http://127.0.0.1:9197/c/dream/action/create?name=20261113-onlyapi164912` (HTTP 200, `status:start`); probe deleted. `ui-check` 85 passed; `context-check` passed.
- Lesson: do not add “defensive” query parameters to ContextOS actions; the smallest valid request is the contract.

## 2026-11-14 — chat: two-column message body + duplicated scene alias

- Symptom: AI message showed `COPILOT / time / tokens` in a left column and the
  reply text in a right column, looking “double/mixed”; request context also
  appeared to carry both `scene` and `background`.
- Cause: the message markup is `avatar + main(meta + body)`, but the host/legacy
  CSS could make `.cx-msg-main` a horizontal flex row. The client context only
  has `scene`; stale sessions or earlier payloads can still carry a
  `background`/`bg` alias at the request boundary.
- Fix: force `.cx-shell .cx-msg .cx-msg-main` to `flex-direction:column` with
  `!important`, make `.cx-msg-body` full-width, and strip `background`/`bg`
  from the outgoing `requestContext` before `api('chat')`; the trace records the
  same sanitized object.
- Evidence: rendered test page confirms `display:flex;flex-direction:column`;
  `ui-check` 88 passed, `context-check` passed. Live plugin still needs one
  app reload to pick up `v1.45.93`; do not call it verified before that.
- Lesson: when a screenshot looks like duplicated text, inspect the computed
  flex axis first; “two copies” can be two columns of one message.

---

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

## 2026-11-15 · 源码/镜像语义

- 修复：Go 低版本仍显示版本；代码源/镜像源统一；binary 标准空间带 binary= 跳过 build；binary 探 `/c/runtime` 等 180s。
- 证据：bintest/community binary 创建并清理；ui 102，install 4/10，docs/publish 通过；1.48.43。
- Lesson：安装方式贯穿空间创建；binary 判活看版本。


## 2026-11-15 · 全量接口日志

- api 事件+后端 HTTP 落盘 9444 runtime 200 1.48.49

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

- 根因：这段时间的界面问题不在「写的样式」，而在「生效的那一层」——加载层（旧 JS/旧 link/手抄清单）、级联层（!important 与固定高度）、污染层（:root 通用令牌）。

- 固化：类别表 + `scripts/ledger-stats.mjs`（计数与缺字段点名）+ §八 全面归纳流程；规律「出问题的往往是生效的那一层」写进 DIAGNOSTICS。

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

**下轮建议**：① 给「已挂载旧 link 被改写」加可判定证据（服务端校验 `clientCheck.build` 与静态路由版本一致）；
② 把 `ledger-stats --check` 以 soft 方式接进 `build:client`（只提示不阻断）；
③ 每次 retro 必须新增一个 `ui-probe` 用例或一条 gate 断言。

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

## 2026-11-17 — 英文模式下弹窗里冒出中文：i18n 只有单向词典

- 根因：i18n 层（`00-prelude.js`）只有 `EN_TEXT`（中文 key → 英文），文案源全部是中文；
  英文模式遇到未登记中文就直接漏出，中文模式遇到英文 key 也没有反查表 → 弹窗标题/字段/提示与「更多」菜单两侧同时错。
- 类别：文案/国际化（同类第 1 次）
- 固化：`T` 改双向（新增 `ZH_TEXT` + `TT` 模板）；新增 `scripts/i18n-lint.mjs` 进 `build:client`
  （A 硬校验每个 `T/TT` key 有词条、B 直写中文按 `scripts/i18n-baseline.json` 棘轮只减不增）；
  `AGENTS.md` §六 增第 14 条铁律「界面文案英文优先」；`DESIGN-SYSTEM.md` §20.3 记写法。
- 数字：缺词条 0 条（原英文模式可见中文 3 处：弹窗标题/字段/必填提示 + 菜单 1 处）；
  直写中文 109 处纳入基线，只降不升。

---

## 2026-11-19 归档批次（2026-11-15 至 11-17，5 条）

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


<!-- 2026-11-19 滚动归档：正册滚动窗口移出 -->

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
