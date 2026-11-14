# Code map

## Data flow

```text
Page state (node/avatar)
→ ChatPanel
→ usePmData (52-pmdata.js)
→ api('pmList') → ContextOS HTTP
→ pm { targets, plans, tasks, reports, feedbacks }
→ selection ids → PmCard / filters / PmModal
```

## Files

| File | Owns | Must not |
| --- | --- | --- |
| `index.js` | HTTP op routing and body UID aliases | contain PM business rules |
| `lib/core/project.js` | PM API, UID validation, status→action matrix | read SQLite directly |
| `lib/core/copilot.js` | LLM prompt, action allowlist, PM create/action | invent UI markup |
| `lib/core/gobuild.js` | local Go resolution, `go mod tidy` + `go build` | assume host PATH has Go |
| `lib/core/apps.js` | app scaffold, autogen value files, generated CRUD, `createApp` | duplicate Go build logic |
| `lib/core/spaces.js` | space lifecycle, `buildSpace`, `restartSpace` | copy node binary as a fake app build |
| `10-ui.js` | tokens-driven primitives, UID aliases | know PM entities |
| `12-debug.js` | DebugDetail inspector | fetch business data |
| `52-pmdata.js` | one PM loader | render cards |
| `55-pm.js` | PM metadata, PmCard, PmActionMenu | fetch data |
| `46-pm.js` | PM create/edit modal | call ContextOS directly |
| `50-chat.js` | chat orchestration, PM panels | duplicate PmCard/fetch logic |
| `60-page.js` | page orchestration, console/IDE | duplicate PM card/debug markup |

## Contracts

- API envelope: parse `option`, `append`, `key/value`; never treat `count:0x0` as success.
- UID: 32-char hash; canonical `target_uid/plan_uid/task_uid/report_uid/feedback_uid`.
- Action methods: create→PUT, remove→DELETE, other→POST; GET `/action/` only login/run/command.
- UI: `--cx-*` tokens; `10-ui.js` primitives; no page-local replacement.
- Delivery: `npm run check:ui` + `npm run check:context` + API read-back + rendered check; see `docs/ACCEPTANCE.md`.

## Change routing

- New status/action: `lib/core/project.js` only.
- New PM field: `project.js` + `docs/MEMORY.md` contract.
- New PM UI: `55-pm.js` component or `10-ui.js` primitive.
- New debug tab: `12-debug.js` + `UI-ACCEPTANCE.md`.
- New page section: compose existing primitives; do not create a second data loader.
