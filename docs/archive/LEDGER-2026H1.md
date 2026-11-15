# LEDGER 归档（2026-11-15 之前）

> 读这份当：要查 2026-11-15 之前的某个坑，且现行 `docs/RSI-LEDGER.md` 里没有。
> 不读这份当 → 现行台账 → [../RSI-LEDGER.md](../RSI-LEDGER.md)；症状路由 → [../DIAGNOSTICS.md](../DIAGNOSTICS.md)

归档规则：保留最近 10 条在正册，更早的按日原样归档；每轮全面归纳可把更早的条目压成「类别摘要」替换本文件正文。

> 归档条目：46 条 · 时间跨度 2026-11-08 → 2026-11-13

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
- 验证：`POST /contextos-devops-dsh/api {"op":"createSpace"...}` 返回 `ok:true`，创建的探针空间已用 `deleteSpace` 清理。


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
