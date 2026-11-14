# UI acceptance gate

> Canonical delivery contract: `docs/ACCEPTANCE.md` (L0/L1/L2/L3 + evidence table).
> This file is the UI-specific checklist and static gate reference.

Canonical product rules: `USER-VIEW.md` at the ContextOS root. This plugin adds
machine checks for the regressions that reached the UI.

## Hard rules

- 4px spacing scale; no arbitrary gaps.
- No duplicate headings (tab label carries the meaning).
- Scroll containers use sticky section/tab headers.
- No forced full-height side panel; height follows content unless content must scroll.
- Tables use fixed layout with a stable first column.
- Long URLs/options/logs wrap (`overflow-wrap:anywhere`), never widen the panel.
- Empty, loading, error states are explicit.
- Single source of truth for data; do not prefetch before the rendering component mounts.
- Danger actions live in the context menu; primary actions only in the card row.
- Status-driven actions come from the code rules in `lib/core/project.js`.

## Required visual check

Before saying "done", verify a real screenshot at the current desktop size:

- tabs in one horizontal row;
- tab bar sticky while content scrolls;
- header KEY/VALUE columns aligned;
- long value does not overflow;
- panel has no arbitrary blank band;
- empty/error state visible.

Static gate: `npm run check:ui` (also runs after `build:client`).

## Initialization

- Port field has a probe action and never occupies an existing node/listener port.
- Standard term: `Digital Avatar & Cyber World` / `Cyber World` (title case).
- Step 3 collects goal and plan descriptions, not a task list.
- The running view shows a scrollable table: time, duration, operation, impact/API, status.
- A failed step exposes a retry action; retry preserves the existing node/avatar context.
- Translation keys for init labels exist in both zh/en; `check:i18n` enforces required keys and Cyber World casing.
