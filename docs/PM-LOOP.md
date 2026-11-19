# PM-LOOP · 项目闭环：动作序列、URL 与约束

> 读这份当：要改项目管理的流程、写任务/报告/反馈、把业务流程搬到一个新场景（如 AI 电商派单）。
> 不读这份当：只是查某个 op 的字段 → `docs/INTERFACE.md` §1–§5。


PM 只有两层：**平台 REST（真源）** 与 **插件 op（唯一出口）**。任何界面/对话都不许绕过 op 手拼 URL。

## 1 URL 形状（平台真源）

```
/s/<space>/c/web.team.xiangmuguanli.portal/action/run/<cmd>/action/<action>?project_uid=<实例>&user.uid=<分身>&uid=<记录或父记录>
```

- `<cmd>` ∈ target · plan · task · report · feedback；
- 创建类（create/planCreate/taskCreate/reportCreate/feedbackCreate）**PUT**，remove **DELETE**，*List **GET**，其余 **POST**；
- `uid`：创建类是父记录 UID，其余是本记录 UID；值禁半角 `/`。

## 2 主流程（九步）

| # | 动作 | 平台动作 | 前置 | 结果状态 |
|---|---|---|---|---|
| 1 | 创建目标 | `target/action/create` (PUT) | 分身有 project.space | target `created` |
| 2 | 创建计划 | `target/action/planCreate?uid=<target_uid>` (PUT) | 目标存在 | plan `created`（leader 直接 `approved`）|
| 3 | 提交计划 | `plan/action/submit?uid=<plan_uid>` | plan `created` | `submited` |
| 4 | 审批计划 | `plan/action/approve?uid=<plan_uid>` | plan `submited` | `approved` |
| 5 | **开始计划** | `plan/action/process?uid=<plan_uid>` | plan `approved` | `process` |
| 6 | 创建任务 | `plan/action/taskCreate?uid=<plan_uid>` (PUT) | plan `process` | task `created` |
| 7 | **开始任务** | `task/action/process?uid=<task_uid>` | task `created` 且 plan `process` | `process`（写 process_time）|
| 8 | 创建报告 | `task/action/reportCreate?uid=<task_uid>` (PUT) | task `process` | report 生成 |
| 9 | 创建反馈 | `report/action/feedbackCreate?uid=<report_uid>` (PUT) | task `process` | feedback（`canFinish` / `shouldImprove`）|
| 10 | 完成任务 | `task/action/finish?uid=<task_uid>` | 该 task 有 `canFinish` 反馈 | `finished` |
| 11 | 完成计划 | `plan/action/finish?uid=<plan_uid>` | 计划下**没有** `process` 任务 | `finished` |

**注意**：没有 `start` 这个动作名，开始 = `process`。对话层里 `pmStart/pmFinish` 只是别名，落库前都归一成 `process/finish`。

## 3 动作全集

| cmd | 动作 |
|---|---|
| target | create · planCreate · modify · remove |
| plan | create · submit · approve · reject · process · finish · cancel · taskCreate · modify · remove |
| task | create · process · finish · cancel · handover · reportCreate · modify · remove |
| report | create · feedbackCreate · open · modify · remove |
| feedback | create · modify · remove |

## 4 三条互锁（服务端强制）

1. `task.finish` 要求存在 `feedback.status = canFinish` 的报告（`can_finish` 由服务端算好返回）；
2. `plan.finish` 要求计划下没有 `process` 任务；`plan.cancel` 同样；
3. 任务进入 `finished/canceled` 后**禁止**再建反馈（`pmCreateItem` 前置校验）。

## 5 插件 op（客户端唯一出口）

| op | 方法 | body 关键字段 |
|---|---|---|
| `pmCreate` | PUT | `kind, title, content, uid, target_uid, plan_uid, task_uid, report_uid, begin_time, end_time, report_type, score, feedback_status` |
| `pmAct` | POST | `kind, uid, action, item_uid(=uid), uid_options` |
| `pmList` | GET | `uid, target_uid, plan_uid, task_uid, report_uid, scope, focus_kind, focus_uid` |
| `pmModify` / `pmRemove` | POST / DELETE | `kind, uid, ...fields` |

对话里模型只输出 `{op:'pmCreate'|'pmAct', args}`；父 UID 由客户端 `pmChain` 补齐，避免「刚建目标就建计划」拿不到 target_uid。

`pmList` 除数据外还返回两项派生值（同一函数算，界面/对话共用）：

| 字段 | 形状 | 含义 |
|---|---|---|
| `active` | `{target_uid,plan_uid,task_uid,report_uid,feedback_uid}` | 本次查询实际选中的链路 |
| `next` | `{kind,action,item_uid,title,label,reason,stage}` | 闭环的**唯一下一步**（`pmNextStep`） |

`focus_kind/focus_uid` 传入刚创建/刚操作的实体：其父级 uid 一并查询，保证新实体出现在返回列表里，`next` 才能从它继续。`next` 的判定顺序：

1. 无目标 → `target.create`；无计划 → `plan.create`；
2. plan `created/submited/approved` → `submit/approve/process`；
3. plan `process` 且无任务 → `task.create`；有任务但未开始 → `task.process`；
4. 进行中任务无报告 → `report.create`；报告无反馈 → `feedback.create`；
5. 反馈 `shouldImprove` → `task.create`（改进任务）；`canFinish` → `task.finish`；
6. 当前计划收口后：同目标还有未收口计划则跳过去，否则 `plan.create`（新计划）。

对话侧不再各写一套状态机：卡片 chips（`pmNextChips`）与 context 的 `project.next` 都读这一处。

## 6 闭环自驱

```
目标 → 计划 → 审批 → 进行 → 任务 ⇄ 报告 → 反馈(canFinish | shouldImprove)
                                     ↓ canFinish              ↓ shouldImprove
                                任务完成 → 计划完成        新任务（改进项）→ 回到任务
```

报告是产物记录（`link` 指向文件/网页，`type` 是周期）；反馈是验收结论（`canFinish` 放行、`shouldImprove` 触发改进任务）；计划未完成前持续循环，直到没有 `process` 任务才允许 `plan.finish`。

AI 电商沿用同一状态机：商品/订单流水线拆成任务 → 派给智能体 → 产物落报告 → 反馈决定放行或返工。

## 7 对话里的闭环入口

| 用户说法 | 走哪条 | 结果 |
|---|---|---|
| 「继续 / 下一步 / 然后呢」 | 客户端短路 → `pmNextChips(pm)[0]` | 不调模型，直接执行 `next` |
| 「创建任务 / 写报告 / 给反馈」 | `appOp` → `pmEntityOf` → `pmCreateFrom` | 表单/直接建，父级自动补 |
| 「开始/完成/提交/审批」 | `executeAction('pmAct')`（`pmStart/pmFinish` 是别名） | 落库归一 `process/finish` |
| 卡片底部 chips | `card.next` → `runNextChip` | `create` 开预填表单；动作类直接 `pmAct` |

`card.next` 的 chips 必须可 JSON 序列化（消息会存 `cx-store`）：只存 `{label,kind,action,item_uid,title,uids,preset}`，点击时再重建 item。
