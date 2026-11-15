# AI context pack for plugin iteration


> 读这份当：每次开工，先拿到根规范路由与插件硬规则。
> 不读这份当 → 全量规范 → 根 `SPEC-CODE.md` / `USER-VIEW.md` 各册
Read these in order. The root ContextOS documents are authoritative; this file
only routes the relevant sections and records plugin-specific hard rules.

## 1. Root specifications

| Priority | File | Sections | Why |
| --- | --- | --- | --- |
| P0 | `../../../AGENTS.md` | §三 铁律, §五 反模式 | platform safety rules |
| P0 | `../../../SPEC-CODE.md` | §2.3 前端, §2.4 接口/数据, §五 反模式 | code and API conventions |
| P0 | `../../../USER-VIEW.md` | §〇 总则, §一 布局, §二 组件, §三 标签 | visual contract |
| P1 | `../../../CONTEXT.md` | §七 接口报文, §十一 前端界面 | data/UI architecture |
| P1 | `../../../SPEC-API.md` | command/action/method sections | generated API dictionary |
| P1 | `../../../SPEC-FLOW.md` | deploy / space / app flows | environment operations |
| P2 | `../../../USER-FLOW.md` | project-management workflow | product workflow |

## 2. Plugin specifications

| File | Content |
| --- | --- |
| `docs/ARCHITECTURE.md` | tokens, UI kit, PM data/card, UID contract |
| `docs/ACCEPTANCE.md` | **canonical four-level acceptance contract: static, API, rendered DOM, human evidence** |
| `docs/ACCEPTANCE.md` §12/§13 | UI 硬规则 + 可用性门禁（verify:ui） |
| `scripts/ui-check.mjs` | executable static gate |
| `scripts/context-check.mjs` | verifies this context pack stays valid |

## 3. Non-negotiable plugin rules

1. ContextOS data operations use the HTTP API. Do not read or mutate
   `var/db/*.db` directly.
2. Entity ids are 32-character hashes. Canonical names are
   `target_uid`, `plan_uid`, `task_uid`, `report_uid`, `feedback_uid`,
   `item_uid`; aliases are normalized only at the server boundary.
3. PM list operations go through the portal run path and the command's
   `list`/`action` contract. The client never invents status or action rules.
4. Client UI composes `10-ui.js` primitives and `--cx-*` tokens; no ad-hoc
   card/table/empty/error markup.
5. One PM data source: `usePmData`; one PM card: `PmCard`; one debug inspector:
   `DebugDetail`.
6. **RSI Constitution**: `docs/RSI-CONSTITUTION.md` is the mandatory 12-article law; it is injected into the runtime Copilot prompt.
7. **RSI rule**: every iteration must abstract reusable code/specs/flows, record the lesson in `docs/RSI-LEDGER.md`, and never repeat a known error. Add a gate for every recurring failure.
7. **Workflow**: 目标 → 计划（时间/金钱预期）→ 分析决策 → 任务拆解 → 执行 → 报告（做了什么/怎么做）→ 反馈（总结与沉淀）。No goal, no action; no report, not done; no feedback, not closed. 没有目标不动手；没有报告不算完成；没有反馈不算闭环。
8. A feature is not done until `npm run check:ui`, `npm run check:context`,
   API read-back, and a real rendered-screen check pass.

## 4. Iteration checklist

```text
[ ] read root spec sections above
[ ] identify whether change is token / kit / domain / page orchestration
[ ] add reusable primitive before adding a page-specific copy
[ ] keep UID names canonical
[ ] run check:ui + check:context
[ ] verify API read-back
[ ] verify rendered UI (empty/loading/error/long text)
[ ] fill the evidence table in `docs/ACCEPTANCE.md` (L0/L1/L2/L3)
```


## 5. Software-factory code generation

When the Copilot is in `factory` mode, generated Go/JS/CSS must follow:

- `SPEC-CODE.md` §2.3/§2.4/§五;
- `USER-CODE.md` app-platform conventions;
- Volcanos `can.*` APIs, not raw DOM/innerHTML;
- ContextOS action method gate and envelope parsing;
- 32-char UID field names;
- compile + mtime + warn check + read-back before declaring success.

The same rules are embedded in `lib/core/copilot.js` (`FACTORY CODE RULES`).
