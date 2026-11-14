# Project memory

Stable knowledge for future plugin iterations. New facts go here only after
they are verified; experiments stay out.

## Architecture

- PM data source: `src/client/parts/52-pmdata.js` (`usePmData`).
- PM entity card: `src/client/parts/55-pm.js` (`PmCard`, `PmActionMenu`).
- Debug inspector: `src/client/parts/12-debug.js` (`DebugDetail`).
- Reusable UI: `src/client/parts/10-ui.js`; design values: `tokens.css`.
- PM API/domain rules: `lib/core/project.js`; no direct SQLite.

## ContextOS rules that caused repeated bugs

- GET `/action/` is a method-gate violation for normal actions; list reads use
  the portal/run or direct list path as supported by the current node.
- `status` from the API may be a **string name** (`process`, `created`), not a
  number. Never use `Number(status)` for PM action rules.
- A 200 response with `count:0x0` is not success; read back the appended rows.
- Creating a child uses `otherCreate`; parent `*_uid` values belong in the
  request query, canonical names only.
- PM UIDs are 32-char hashes. Never accept arbitrary ids silently.

## Ordering

Plan/task lists sort by ContextOS status order
(`created, submited, approved, process, finished, canceled, rejected`),
then by `created_at` descending within the same status.

## UI invariants

- Chat message layout is `avatar | main(meta above body)`. `.cx-msg-main` is a
  column flex; never let the host make it a row. Body is full-width.
- Chat request context has one scene source: `scene`; strip `background`/`bg`
  aliases at the send boundary.

- Four debug tabs in one row; tab bar sticky.
- Header tables: fixed layout, stable KEY column, long values wrap.
- Detail panel height follows content; no forced full-height band.
- No duplicate section heading (e.g. REQUEST above a “请求信息” tab).
- Loading / empty / error / long-text states are always explicit.

## Software factory

- `createApp`: scaffold + generated CRUD + `ensureGoMod` + local Go build; returns
  `web.chat.<zone>.<name>`.
- `autogenApp`: community autogen + `ensureGoMod` + missing value files +
  `goTidyBuild` (`go build ... ./src`) + space restart. A build failure must throw;
  never return `{built:false}` as success.
- `value` is an ASCII Go identifier list; `trans` is the Chinese display list.
- Probe spaces must be deleted after acceptance (`deleteSpace`); never leave
  `factorycheck*`/`uiprobe*` in the node.

## Verification

```sh
npm run check:ui       # static UI contract
npm run check:context  # spec/context pack integrity
```

Both must pass plus API read-back and a rendered-screen check.
