# Client architecture contract

## Layers

1. **Tokens** — `src/client/styles/tokens.css` is the only source of color,
   typography, spacing and radius variables. Components must use `--cx-*`.
2. **UI kit** — `src/client/parts/10-ui.js`: `Btn`, `Toolbar`, `Section`,
   `Field`, `EmptyState`, `ErrorBox`, `Hint`, `Card`, `Tabs`, `KeyValueTable`,
   `DataTable`, `DetailTabs`. New UI must compose these, not re-style raw
   `<table>`/`<button>` markup.
3. **Domain** — `lib/core/*` owns ContextOS calls, status rules and action
   matrix. The client only renders `item.actions` and calls `pmAct/pmCreate/...`.
4. **Specs** — `docs/UI-ACCEPTANCE.md` + root `USER-VIEW.md`.
5. **Gate** — `npm run check:ui` runs on every `build:client`.

## Rules

- No raw design values in new component code; use tokens.
- No duplicate markup when a UI-kit component exists.
- No status/action inference in the client.
- No panel prefetch before its component mounts.
- One PM request shape: current node + avatar + selected ids.
- Every interactive state must define loading, empty, error and long-text behavior.

## External references (principles only)

- WCAG 2.2: https://www.w3.org/WAI/WCAG22/quickref/
- Material 3 spacing/grids: https://m3.material.io/foundations/layout/grids-spacing/grids
- Apple HIG layout: https://developer.apple.com/design/human-interface-guidelines/layout
- GOV.UK error message pattern: https://design-system.service.gov.uk/components/error-message/

## Client feature modules

- `52-pmdata.js` — the only PM data loader (`usePmData`).
- `55-pm.js` — the only PM entity card (`PmCard`).
- `12-debug.js` — the only debug inspector (`DebugDetail`) and debug parsing helpers.
- `10-ui.js` — reusable primitives (`KeyValueTable`, `DataTable`, `DetailTabs`, …).
- `60-page.js` — page orchestration only; do not add PM fetch/card markup here.
- `docs/MEMORY.md` — stable verified decisions and recurring traps.
- `docs/RSI-LEDGER.md` — per-iteration lessons and gates.

## UID contract

ContextOS entity ids are 32-character hashes. Canonical argument names are
`target_uid`, `plan_uid`, `task_uid`, `report_uid`, `feedback_uid` and
`item_uid`. Input aliases (`targetUID`, `targetId`, etc.) are normalized at the
server boundary; clients must send the canonical snake_case names.

## Code map

See `docs/CODE-MAP.md` for ownership boundaries and the PM data flow.

## Selection

`51-pmselection.js` owns the five persisted selection ids. Page code must not
reimplement localStorage restore/save for PM selection.

## PM panel primitives

`55-pm.js` owns `PmSectionHead` as well as the card/menu. ChatPanel must compose
these primitives instead of rebuilding section headers.

`PmFilter`, `PmEmpty`, `PmCreateButton` and `PmSectionHead` live in
`55-pm.js`; chat panels compose them.

## Editor

`25-editor-ui.js` owns `EditorTabs` and `GitSections`. The explorer composes
them; do not duplicate tab/Git-group markup in `20-devworkspace.js`.

## Deployment

`deployNode` defaults to `auto`: clone the repo, compile when git+go are
available, otherwise copy a compatible binary (root or another node), then
download from `/publish`. `createSpace`/`initSpace` copy the node binary into
the space so every space has `bin/ice.bin`. Standard spaces default to
Community + Enterprise; the picker keeps those mandatory.
