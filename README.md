# ContextOS DevOps

<img src="icon.svg" width="72" align="left" hspace="12" vspace="4" alt="ContextOS DevOps">

**A software factory inside DeepSeek Harness.** Deploy a cluster node, generate a working app,
and put it online — by talking, not by memorising commands. Every step is visible on screen,
clickable, and reads back from the server so you can check it landed.

<p>
  <img alt="version" src="https://img.shields.io/badge/version-1.48.34-0a8fb0">
  <img alt="ops" src="https://img.shields.io/badge/ops-102-0a8fb0">
  <img alt="build gates" src="https://img.shields.io/badge/build%20gates-12-0a8fb0">
  <img alt="client" src="https://img.shields.io/badge/client-24%20parts-0a8fb0">
  <img alt="license" src="https://img.shields.io/badge/license-MIT-0a8fb0">
</p>

---

## Why this exists

ContextOS is built on three doctrines: **clustered deployment** (machines find each other and
share work), **modular development** (code is generated from a spec, not typed line by line), and
**automated applications** (data flows through apps instead of being copied between tools).

Most teams only ever use a fraction of that, because the entry cost is a pile of CLI flags.
This plugin removes that cost: the primitives are the same, but the interface is a conversation
plus a control panel. Say "deploy a node on 9188" and a node appears; say "generate an approval
system" and you get a template, five features, a compile, an instance and a store card.

The long-term goal is simple: **every company gets its own software factory**, not by hiring a
platform team, but by talking to one that is already in the room.

---

## Capabilities

| Area | What you can do |
| --- | --- |
| **Nodes** | Deploy (copy / download / source), start, stop, read uptime + size, open a terminal, act from card menus |
| **Spaces** | Create (optionally from a repo), compile, start / stop, auto-register in `go.work`, open the space home page |
| **Apps** | Generate a template (Copilot researches five features) → confirm → compile → create instance → open the UI |
| **Data** | Create / list / detail / update / delete through the five standard URLs, with read-back verification |
| **Code generation** | Add actions, add fields, conditional buttons, module skeletons — for both in-memory and database modules |
| **Avatars & PM** | Digital avatars and cyber scenes, project boards (goal → plan → task → report → feedback), calendar, map, Gantt |
| **Monitoring** | Grafana-style dashboards: any panel bound to node + space + command + params, iframe embedding |
| **Chat** | Three working modes (avatar / factory / iot), each with its own action whitelist; writes go through a confirm form |
| **Updates** | The header version chip compares the running build with npm (`checkUpdate`, 30 min cache) and gives you the exact update command |

---

## Quick start

### Install

Fastest path — the package is published on npm:

```sh
dsh plugin --profile desktop add dsh-contextos-devops
```

From source — useful when you want to change it:

```sh
git clone https://github.com/contextos-devops/dsh-contextos-devops
cd dsh-contextos-devops
npm run build:client            # build + 15 gates, must be all green
dsh plugin --profile desktop add link:$PWD
```

Then enable the bundle and reload it (a DSH restart is not needed):

```js
plugin_manager({ action: 'set_plugin', target: 'include:dsh-contextos-devops', enabled: true })
```

Open **ContextOS DevOps** in the sidebar. You need Node.js 20+ and a ContextOS node — the plugin
can deploy one for you if you do not have it yet.

### First five minutes

```
deploy a node on 9188
create a space called demo
generate an app template "Employee Management"
create an instance of "Employee Management"
add a row to "Employee Management": Zhang San / R&D
```

Every sentence returns a card or a form you can click; nothing depends on remembering a URL.

---

## The interface: four surfaces

| Surface | What it is for | What you see |
| --- | --- | --- |
| **Chat** | Drive everything by talking | Message cards with per-message actions, a composer with six context chips (node / space / app / avatar / scene / mode), a request console |
| **Manage** | Run the factory with your eyes | Node, space, app and recent cards; project boards; calendar, map and Gantt |
| **Dev** | Change code without leaving the app | File tree, Monaco editor, Git changes and history, multi-session terminal, live preview |
| **Monitor** | Watch it work | Grafana-style panels over the same ops layer, plus a console that can show activity, requests, events, debug URLs, state and files |

### Chat

The composer carries the current context so you never repeat yourself: which node, which space,
which app, which avatar, which scene, which working mode. The message bar has **details / retry /
quote / copy / delete**; "details" opens the exact request that was sent, with size, tokens and
the raw response. Confirm forms appear before anything that writes.

### Manage

Four columns of live cards: **serve** (nodes with status, port, worker/prod, memory), **space**
(version, modules, uptime), **recent apps**, and the **store**. Selecting a node scopes the other
three; selections are remembered per node. The right rail holds the project board, with goal →
plan → task → report → feedback as a chain and a Gantt view of what is running.

### Dev

A real IDE surface, not a read-only viewer: Monaco with the ContextOS language grammar, a tree
that hides dotfiles, Git changes and history sections, up to four panes, and xterm sessions that
survive tab switches. The editor follows the selected project.

### Monitor

Panels are data-bound, not screenshots: pick node, space, command and params, and the panel
renders the live response. The bottom console switches between ACTIVITY, REQUEST, EVENTS,
DEBUG/URL, STATE and FILES — the request log is the same one the chat writes to.

---

## End-to-end flows

### 1. Deploy a node

`deploy a node on 9188` → pick a mode (copy an existing binary, download from a parent node, or
build from source) → the plugin starts it, waits for `/c/runtime`, and verifies the static assets.
The node card then offers start / stop / terminal / open, and a size-by-uptime readout.

### 2. Space → app → instance → data

```
create a space called demo
generate an app template "Employee Management"
create an instance of "Employee Management"
add a row: Zhang San / R&D
```

The generator writes a real Go module (command registration, table model, CSS and JS views),
compiles it inside the space, and only reports success after the command answers.

### 3. Generate code

Ask for a change — "add a `status` field to the task list", "only leaders may approve", "add a
button that archives a row". The generator edits the module skeleton, keeps naming and URL rules
intact, and recompiles; failures are surfaced instead of being swallowed.

### 4. Publish

Every app and space has a web URL and an API URL that follow the same rules, so sharing is a link,
not a deployment ritual. Instances can be published to the store together with a card that other
spaces (and other machines) can install.

### 5. Run the work

The project board carries the loop everyone actually needs: a goal holds plans, a plan holds
tasks, a task produces reports, a report receives feedback, and feedback decides whether the task
may finish. Calendar, map and Gantt read the same data.

### 6. Devices and machines

Scan the LAN, list Wi-Fi networks and nearby Bluetooth devices, browse the SSH hosts already
configured on this machine, and control local volume, clipboard, screenshots and wallpaper — all
from the same panel.

---

## Working modes

| Mode | Allowed | Blocked |
| --- | --- | --- |
| **Avatar** `avatar` | Create app instances, read/write business data, list recent apps | Code generation, node deployment |
| **Factory** `factory` | Deploy nodes, create spaces, generate templates and code, compile and ship | Business data, recent apps |
| **IoT** `iot` | Scan, connect and control devices | Business data, code generation |

The mode is enforced **before the model is called** — the whitelist lives in the server, so a
prompt cannot talk its way into an action the mode does not allow.

---

## Architecture

```
┌──────────────────── DeepSeek Harness ────────────────────┐
│  Web GUI  ──  src/client/parts/*.js  (24 parts)           │
│                 │  api(op, args)                          │
│                 ▼                                         │
│  index.js  ──  lib/core/ops.js  (102 ops, one registry)   │
│                 │                                         │
│                 ▼                                         │
│  lib/core/*.js  ──  lib/base/*.js  ──  ContextOS HTTP     │
└───────────────────────────────────────────────────────────┘
                          │
                          ▼
        ┌──────────── ContextOS ────────────┐
        │ nodes /c/...    spaces /s/<pod>/...│
        │ portals /s/<pod>/c/<portal>/action/...│
        └────────────────────────────────────┘
```

- **One request**: component → `api(op)` → `ops.js` dispatch → `lib/core` → ContextOS → response → card / form / table.
- **One command, five shapes**: web URL, API URL, internal CMD, CLI, session MCP — see [`docs/INTERFACE.md`](docs/INTERFACE.md).
- **One URL source**: `lib/base/url.js` and the client's `cxWebUrl`; hand-built URLs are rejected by review.

---

## Repository layout

```
.
├── index.js               # host entry: table dispatch only, no business branches
├── lib/
│   ├── base/              # http / url / registry / state directory
│   └── core/              # ops registry + domain logic (nodes/spaces/apps/data/codegen/…)
├── src/client/
│   ├── parts/             # 24 parts → build/client.mjs → client.js
│   └── styles/            # tokens / main / kit → assets/client.css
├── docs/                  # entry point: docs/INDEX.md
├── scripts/               # build + 15 gates
└── build/client.mjs       # the only bundler entry
```

`client.js` and `assets/client.css` are **build artifacts** — never edit them by hand.

---

## Development

```sh
npm run build:client    # build + every gate
npm run verify:ui       # real browser check (needs Edge on CDP 9223); exit 0 counts
npm run check:docs      # docs index / links / generated files in sync
npm run publish:npm     # dry-run npm packaging; --publish to actually ship
```

Build chain (15 gates):

```
gate → load-check → hook-order-check → op-check → install-check → store-check
     → ui-check → ui-probe → css-check → i18n-check → context-check
     → docs-check → docs-budget → bench-chat → publish-check
```

| Command | What it checks |
| --- | --- |
| `check:ops` | Every op is registered in `ops.js`; `index.js` has no `if (op === …)` |
| `check:store` | Persisted state goes through the `08-store.js` schema, and the raw `localStorage` count may only go down |
| `check:ui` | Type scale, icon sizes, control heights, banned patterns |
| `check:probe` | Headless render of fixtures: message structure, toolbar alignment, collapsed heights |
| `check:docs` | Docs index covers every file, links resolve, generated files are current |
| `check:prompt` | Chat prompt budget: cached system block, per-turn payload, context compaction, stable prefix |
| `check:load` | The built bundle actually executes and exports `apply` / `inject` |
| `check:publish` | npm/GitHub metadata, manifest, icon, tarball size |
| `verify:ui` | Real browser: structure, sizes, dropdowns, localisation, no console errors |

**Host changes need a plugin reload** (`lib/`, `index.js`); client changes only need a page refresh.

---

## Docs

| Doc | Read it when |
| --- | --- |
| [`docs/INDEX.md`](docs/INDEX.md) | **Start here** — one row per task |
| [`docs/DOCTRINE.md`](docs/DOCTRINE.md) | The three doctrines, the per-round checklist, abstraction budget |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Layers and module boundaries |
| [`docs/CODE-GEN.md`](docs/CODE-GEN.md) | Code generation: module kinds, vocabulary, grammar, permissions |
| [`docs/INTERFACE.md`](docs/INTERFACE.md) | One command in five shapes, two capability tiers, three auth models |
| [`docs/URL-SPEC.md`](docs/URL-SPEC.md) | API vs web URL shapes and the forbidden list |
| [`docs/AI-CONVERSATION.md`](docs/AI-CONVERSATION.md) | Chat request params, action table, known gaps |
| [`docs/DIAGNOSTICS.md`](docs/DIAGNOSTICS.md) | Symptom → cause table; layout invariants |
| [`docs/PUBLISH.md`](docs/PUBLISH.md) | npm, tarball, catalog submission |
| [`docs/ACCEPTANCE.md`](docs/ACCEPTANCE.md) | Acceptance criteria and the evidence they need |
| [`AGENTS.md`](AGENTS.md) | The working contract for AI agents (iron rules, workflow, chat protocol) |

---

## Status

- **Stable**: nodes, spaces, apps, data CRUD, code generation, monitoring panels, the three modes.
- **Known limits**: see the open items in [`docs/RSI-LEDGER.md`](docs/RSI-LEDGER.md) (web-tab session isolation, remote node credential renewal, monitoring has no history).
- **Version**: `package.json` is the source of truth, and every change bumps it because the client cache key follows the version.
- **Scale**: 102 ops, 25 client parts, ~7.6k lines of client code, 15 gates.

---

## For agents

This plugin exists to be driven by agents.

- **External agents** (the DSH agent) can call the `contextos_*` tools directly: deploy a node,
  create a space, create an app, read/write data, run the whole pipeline.
- **The in-app Copilot** uses `POST /api?op=chat`: the client short-circuits by working mode, the
  host builds the prompt, the model returns `{reply, action}`, and the plugin executes and renders it.
- Both obey the same contract: every round runs the **RSI loop** (goal → plan → evidence → change →
  build → verify → abstract → report) and leaves four artifacts (code, docs, gates, spec).

The contract is in [`AGENTS.md`](AGENTS.md); the action protocol is in [`docs/AI-CONVERSATION.md`](docs/AI-CONVERSATION.md).

---

## Contributing

1. Read [`AGENTS.md`](AGENTS.md) and [`docs/INDEX.md`](docs/INDEX.md).
2. Every round ships four artifacts: **code + docs + gate + spec** — three out of four is not done.
3. Before committing: `npm run build:client` is green, `git status` holds only this round's files,
   and the report lands in `usr/local/WorkBuddy/dsh-reports/`.

---

## License

MIT — see [LICENSE](LICENSE).
