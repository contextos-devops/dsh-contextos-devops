# Plugin iteration entry

For any change to `contextos-devops-dsh`, read `docs/AI-CONTEXT.md` first.
It routes the relevant root ContextOS specifications and records the plugin's
hard rules (API-only, 32-char UID names, tokens/UI kit, PM data/card/debug
component boundaries). Run `npm run check:ui` and `npm run check:context`
before claiming completion.

URL rule (hard): 接口 URL 与网页 URL 是两套形状，空间只用 pod 名称，实例条件用 `<place>_uid`，
记录主键才是 `uid`。构造只走 `lib/base/url.js`（apiPath/webUrl）与 `cxWebUrl`，
禁止手拼、禁止空间 uid。规范与禁止清单见 `docs/URL-SPEC.md`（gate 第 7 项强制）。

RSI rule: keep iterating, abstract shared code/specs/flows, record lessons in `docs/RSI-LEDGER.md`, and add a gate for every repeated error.

Workflow: 目标 → 计划（时间/金钱预期）→ 分析决策 → 任务拆解 → 执行 → 报告 → 反馈。No goal, no action; no report, not done; no feedback, not closed.

RSI Constitution: `docs/RSI-CONSTITUTION.md` is mandatory for every AI conversation; goal → plan → analyze → tasks → execute → report → feedback.
