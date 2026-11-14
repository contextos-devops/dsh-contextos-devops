# 2026-11-14 — Chat 消息双列 / 场景参数去重

## 目标
- 修复聊天消息“标题列 + 正文列”并排造成的“双乱”视觉。
- 请求上下文只保留 `scene`，不再携带 `background` / `bg`。

## 计划与代价
- 范围：`src/client/parts/50-chat.js`、`src/client/styles/main.css`、`scripts/ui-check.mjs`。
- 影响面：仅插件聊天渲染与请求体；不改 ContextOS API。
- 成本：约 20 分钟，无外部费用。

## 执行
1. 用真实桌面截图确认：消息并非重复文本，而是 `.cx-msg-main` 被横向排成两列。
2. CSS 强制 `.cx-shell .cx-msg .cx-msg-main{display:flex!important;flex-direction:column!important}`，正文 `width:100%`。
3. 发送前用 `stripSceneAliases()` 递归删除 `background` / `bg`（含 `selection` 内层）；trace 记录同一对象。
4. 增加两条 UI 门禁：列布局、递归单一 scene 来源。
5. 版本 `1.45.94`，重新构建。

## 报告（证据）
- 复现页 `file:///tmp/cx-msg-test.html` 加入敌意 `.cx-msg-main{display:flex;flex-direction:row}` 后，计算样式仍为 `flex-direction:column`，截图 `page-5-1794645228125.png`。
- `ui-check: 88 passed`；`context-check: passed`；客户端 542.7 KB。
- `state.json` reqlog 证明 `context.background` 与 `context.selection.background` 都曾与 `scene` 完全相同；递归剥离覆盖这两层。
- 当前桌面插件仍加载旧 CSS `v1.45.91`；需重开 DSH 一次才会加载 `v1.45.94`，未在旧页面上宣称已生效。

## 反馈
- 教训：截图里的“重复文字”先查 flex 轴，不要先怀疑渲染了两次。
- 沉淀：消息布局必须列向；请求上下文只允许一个场景字段，边界统一剥离别名。
