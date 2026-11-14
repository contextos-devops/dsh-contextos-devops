# 产品与技术设计详解 / PRODUCT DESIGN

> 这是插件的**深度设计稿**：产品逻辑、AI-first 会话、DSH 联动、技术架构、编程/设计规范、
> 通信协议、数据存储、当前实现状态、工程化路线。
>
> - 想**快速了解项目**：读根目录 `README.md`。
> - 想**知道文档怎么找**：读 `docs/INDEX.md`。
> - 想知道**文件级清单**：读生成的 `docs/CODE-INDEX.md`。
>
> 注意：下文的「目标形态 / 路线图 / P0-P2」是设计意图；**已实现到哪一步以 `README.md`
> 的能力矩阵和 `docs/ACCEPTANCE.md` 为准**。

---

## 0. 一句话产品定义

**ContextOS DevOps 是一个“AI 原生的数字分身工作台”**：

```text
部署节点 → 建空间 → 上架/生成应用 → 创建实例
        → 分身身份 → 项目管理（目标/计划/任务/报告/反馈）
        → 对话执行 → 数字城市/场景/地图 → 持续提醒
```

用户不需要记住 ContextOS 的几十个命令，只要描述意图；插件负责把意图转成真实 API 调用，并把结果回读给 UI。

---

# 一、产品逻辑设计

## 1.1 三层结构

```text
基础设施层      CLUSTER      服务节点
                     ↓
工作空间层      WORKSPACE    项目空间（云社区/云办公/…）
                     ↓
应用与数据层    RECENT       应用实例 → 数据
                WEB          应用网页/管理后台
```

对应界面四栏：

```text
01 服务节点 / SERVE
02 项目空间 / SPACE
03 最近应用 / RECENT
04 网页界面 / WEB
```

顶栏流水线始终显示当前阶段，点击可回到对应层级。

## 1.2 五类项目实体

数字分身的项目管理由五类实体组成：

```text
目标 target
  └─ 计划 plan
       └─ 任务 task
            └─ 报告 report
                 └─ 反馈 feedback
```

约束（来自 `xiangmuguanli` 源码）：

| 实体 | 关键状态/约束 |
|---|---|
| 目标 | 无 status；有计划后不能删除 |
| 计划 | `created → submited → approved → process → finished/canceled`；只有 `process` 能建任务 |
| 任务 | `created → process → finished`；只有 `process` 能建报告；`canFinish` 才能完成任务 |
| 报告 | 无 status；有反馈后不能修改/删除 |
| 反馈 | `canFinish` / `shouldImprove`；反馈决定任务能否完成 |

## 1.3 六项核心能力

| # | 能力 | 用户操作 | 后端动作 |
|---|---|---|---|
| 1 | 部署服务节点 | `+ 节点` / 初始化 | `deploy` → `forever start` → `/c/version` |
| 2 | 创建项目空间 | `+ 空间` | `dream create` → `git.status init` → 编译 |
| 3 | 生成应用模板 | 应用模板/应用商店 | `service/autogen` → `portal.json` + 五角色 |
| 4 | 添加应用代码 | CODE 编辑器 | 读写 `src/<app>/*` → `compile` |
| 5 | 创建应用实例 | 最近应用/商店 | `placeCreate` → recent |
| 6 | 添加应用数据 | DATA 弹窗 | 选 function → `create` → 回读 |

## 1.4 初始化：一键把环境准备好

首次进入弹出初始化表单：

```text
源码地址   https://shylinux.com/x/ContextOS
部署目录   ~/ContextOS-9188（源码变化时自动跟随仓库名）
端口       9188
[初始化]
```

步骤：

```text
1 检查/部署服务节点
2 部署云社区
3 部署云办公
4 创建数字分身
5 自动创建该分身的项目管理
6 进入
```

关键设计：

- 用户可改目录/端口/源码，留空走默认；
- 源码仓库名驱动默认目录，例如 `/x/community` → `~/community`；
- 同端口已有节点复用；端口不可用回退现有节点；
- 部署后打开空间首页 `/s/<space>/`，触发数据库初始化，应用商店才有数据；
- 初始化步骤用 `wait/run/done/err` 展示，失败可重试。

## 1.5 数字分身：身份、人格、技能

每个分身拥有独立的：

```text
user.uid
name / city / company
persona / preferences / style
image（上传照片生成形象）
skills（可添加技能）
project（自动创建的项目管理实例）
```

设计原则：

1. **分身是数据归属边界**：实例、recent、任务都按分身 `user.uid` 查询；
2. **分身是 AI 上下文**：创建实例默认带当前分身的 uid/city/company/persona/style；
3. **分身是会话边界**：切换分身切换最近应用和项目数据；
4. **分身是可扩展的**：技能会随上下文传给模型，作为能力提示。

当前实现：

- 对话式创建分身（名字 → 城市 → 公司 → 人格 → 喜好 → 风格）；
- 上传图片生成数字人形象（压缩后写入 avatar.image）；
- 添加/移除技能；
- Three.js 3D 人物卡片，可拖拽倾斜、滚轮缩放、点击脉冲。

## 1.6 项目管理会话：每个计划一个会话

```text
左侧：目标列表 → 当前目标的计划列表
中间：当前计划的 AI 会话
右侧：当前计划的任务 → 报告 → 反馈
```

规则：

- 点击目标 → 计划列表切换；
- 点击计划 → **切换会话**，消息按 `avatar.uid:plan.uid` 持久化；
- 点击任务 → 报告列表；
- 点击报告 → 反馈列表；
- 当前选择通过 `context.functions` 传给模型；
- AI 说“加一个任务/改报告/删除反馈”时使用 `pmList/pmCreate/pmModify/pmRemove`，完成后刷新左右栏。

## 1.7 应用商店：软件工厂的“上架—下架—实例化”闭环

```text
应用商店（web.team.gonganxitong.service）
  ├─ 空间过滤
  ├─ 上架 / 下架
  ├─ 编程（打开代码编辑器）
  ├─ 配置（打开服务页面）
  └─ CREATE（创建实例）
        ↓
最近应用（gonganxitong.recent）
  ├─ OPEN
  ├─ 数据
  └─ 实例
```

操作来源：

- 后端 `storeApps` 返回 `status/status_label/actions`；
- 前端不猜测动作，按 `s.actions` 渲染；
- 上架/下架走真实 `service/action/online|offline`；
- 编程/配置/数据复用现有编辑器与页面。

## 1.8 赛博世界 / 万物互联

### 当前能力

- 设备发现：

```text
ContextOS 节点（可控）
WiFi/LAN（arp 发现）
蓝牙（system_profiler / bluetoothctl）
红外（预留适配层）
```

- 数字人：3D 人物卡片 + 上传形象 + 技能；
- 数字城市：Three.js 深圳地标场景（平安金融中心/KK100/春笋/腾讯滨海/地王）；
- 地图：腾讯地图任务分布，右下角，可全屏、缩放、定位、滚轮缩放；
- 场景背景/参数：`backgrounds` 状态，可切换主题、语言、时区、位置。

### 产品愿景（当前仍在路线图）

```text
上传一张照片 → 生成可交互数字人
上传一张场景照片 → 生成可交互 3D 场景
数字人添加技能 → 在场景中添加物件 → 万物互联
```

需要补的能力：

- 图像分割 / 重建 / 绑定骨骼；
- 照片到场景的深度估计与 3D 生成；
- 技能运行时（函数调用/工具权限）；
- 场景物件协议与协同编辑；
- 统一资产格式与版本。

---

## 1.9 AI-first 会话流程：让对话成为唯一操作入口

### 目标形态

用户以后不需要逐栏点击，只需要对 AI 说：

```text
初始化
创建云研发空间
生成员工管理
创建员工管理实例
给员工管理添加张三
拆解目标：本月完成产品发布
查看项目进度
```

AI 负责：

```text
理解意图 → 补齐上下文 → 执行动作 → 回读结果 → 更新项目/会话 → 提醒下一步
```

UI 的角色从“操作面板”变成：

- **观察面**：看到节点、空间、应用、PM 的实时状态；
- **干预面**：必要时手动修正、确认危险操作、查看日志；
- **可解释面**：每一步执行有 ACTIVITY/DEBUG/错误回读。

### 会话生命周期

```text
① 进入会话
   └─ 初始化检查：节点 / 云社区 / 云办公 / 分身 / 项目管理
② 建立上下文
   └─ SERVE / SPACE / PLACE / AVATAR / MODE
   └─ FUNCTIONS: TARGET / PLAN / TASK / REPORT / FEEDBACK
③ 理解目标
   └─ 用户说目标，AI 判定是“查询 / 创建 / 修改 / 执行 / 拆解”
④ 参数补全
   └─ 用户没指定的参数，从当前选择与 PM 上下文补齐
   └─ 仍缺失时才反问，且一次只问一个
⑤ 生成动作
   └─ 一个 JSON action + args
   └─ 只允许白名单 op，不执行任意 shell
⑥ 执行与回读
   └─ 调真实 ContextOS API
   └─ 200 不算成功；回读 append/DB/状态
⑦ 更新会话
   └─ 刷新左右栏、当前 PM、当前实例
   └─ 把结果写入计划级消息
⑧ 继续下一轮
   └─ 提示下一步：加数据/报告/反馈/下一个任务
```

### 上下文数据包

每次 `chat` 请求都携带：

```json
{
  "message": "给员工管理添加张三",
  "mode": "avatar",
  "selection": {
    "serve": 9061,
    "space": "20240724-enterprise",
    "place": {
      "title": "员工管理",
      "command": "web.team.yuangong.portal",
      "place_uid": "81018c5e..."
    },
    "avatar": {
      "uid": "a4f6...",
      "name": "我的分身",
      "city": "深圳市",
      "company": "云轩领航",
      "skills": ["数据分析"]
    },
    "mode": "avatar",
    "functions": {
      "target": { "uid": "...", "title": "..." },
      "plan": { "uid": "...", "title": "...", "status": "process" },
      "task": { "uid": "...", "title": "...", "status": "process" },
      "report": null,
      "feedback": null
    }
  }
}
```

设计原则：

- **上下文优先**：用户没指定时，AI 先用当前选择，不重复问；
- **计划绑定**：每个会话属于一个计划，消息按计划保存；
- **身份绑定**：实例/数据默认使用当前分身的 uid/city/company；
- **真实回读**：执行结果来自 ContextOS，不编造成功。

### 三个持续循环

```text
基础设施循环
  部署节点 → 建空间 → 编译 → 启停 → 删节点/空间

应用生产循环
  应用商店/生成模板 → 写代码 → 编译 → 创建实例 →
  上架/下架 → 打开网页 → 加数据

项目运行循环
  目标 → 计划 → 任务 → 报告 → 反馈 →
  进度提醒 → 下一个目标
```

三条循环可以同时进行，但每次对话只聚焦当前选择的一条路径。

### AI 能力覆盖（目标）

| 领域 | 对话示例 | 动作 |
|---|---|---|
| 节点 | 部署 9188 | `deploy` |
| 节点 | 启动/停止/删除节点 | `start` / `stop` / `deleteNode` |
| 空间 | 创建云研发 | `officialSpaces` |
| 空间 | 创建空间 demo | `createSpace` |
| 空间 | 编译/启动/打开空间 | `buildSpace` / `spaceStart` / `spaceOpen` |
| 应用 | 生成员工管理 | `autogenApp` |
| 应用 | 修改应用代码 | `code` |
| 应用 | 从商店创建实例 | `createStoreInstance` |
| 应用 | 创建实例 | `createInstance` |
| 应用 | 上架/下架 | `storeAction` |
| 数据 | 给员工管理添加张三 | `data` / `writeData` |
| 项目管理 | 拆解目标 | `planProject` |
| 项目管理 | 查看/新增/修改/删除五类数据 | `pmList/pmCreate/pmModify/pmRemove` |
| 项目管理 | 开始/完成/交接 | `pmAct` |
| 分身 | 创建/切换/上传形象/加技能 | `createAvatar/updateAvatar/setAvatar` |
| 场景 | 切换背景/设置参数 | `backgrounds` |
| 设备 | 发现周边设备 | `devices` |
| 文件/Git | 查看目录/文件/Git | `files/file/git` |
| 终端 | 打开节点/空间终端 | `nodeTerminal/spaceTerminal` |
| 交付 | Docker/远程/流水线 | `dockerDeploy/remoteDeploy/pipeline` |

当前并非所有 op 都进入 ChatPanel 的白名单；目标是把 **操作注册表** 自动生成给 AI，而不是手工维护两份列表。

### 一次连续会话示例

```text
用户：初始化
AI：部署 9061 → 云社区/云办公 → 创建分身 → 项目管理
    完成，已进入工作台。

用户：创建云研发空间
AI：创建 20240903-operation → 编译 → 启动
    完成，当前空间已切换。

用户：生成员工管理
AI：service/autogen → go work use → compile
    生成 src/yuangong，已编译。

用户：创建员工管理实例
AI：placeCreate → 深圳/云轩领航 → recent
    实例已创建并选中。

用户：给员工管理添加张三
AI：读取 portal functions → writeData → readData
    已写入并回读 1 行。

用户：拆解目标：本月完成产品发布
AI：target → plan → task → report → feedback
    已创建 1 个目标、1 个计划、3 个任务。

用户：查看项目进度
AI：task 3 / report 1 / feedback 0
    还有 2 个任务缺少报告，建议先完成报告。
```

### 当前实现 vs 目标

已实现：

- 对话式创建分身/实例/空间/应用；
- 计划级会话切换；
- context.selection/functions 传递；
- AI 动作白名单 + 真实执行 + 回读；
- PM 五类 CRUD 与提醒；
- 初始化步骤进度。

尚未实现：

- 一次对话执行**多步事务**；
- 长任务后台队列/断点续跑；
- 对危险操作的显式二次确认；
- 自动重试/补偿/回滚；
- 动作注册表与 OpenAPI/JSON Schema 自动同步；
- 会话跨设备同步；
- 真正的规划器/执行器（当前是单 action）；
- 对“所有 op”的完整自然语言覆盖；
- AI 结果的可验证证据链（截图/DOM/回读摘要）。

### AI-first 的五条铁律

1. **对话是控制面，UI 是观测面**：主要操作都应可从对话发起；
2. **上下文优先于追问**：能从 selection/functions 补齐的，不再问用户；
3. **动作必须可审计**：每个动作有 op、参数、真实 URL、回读结果；
4. **危险动作必须确认**：删除节点/空间/应用、远程命令、终端写入；
5. **不能假成功**：200、0x0、空数组都不等于成功，必须有回读证据。

### 会话指标

要成为公开产品，需要度量：

```text
任务完成率
平均动作步数
澄清问题数/会话
动作失败率
回读失败率
平均耗时
用户中断率
重复操作率
```

这些指标应进入后续的 telemetry（opt-in）与产品质量看板。


## 1.10 与 DSH 主对话联动：从“插件内 Copilot”到“DSH 全局分身”

### 现状

当前有两套对话入口：

```text
A. DSH 主对话
   DSH Agent → 插件注册的 tools
   典型可见：contextos_deploy_node / list_nodes / create_space / create_app / write_data / read_data / pipeline

B. 插件内 Copilot
   ChatPanel → chat op → ctx.llm.stream
   能看到 avatar / PM / 场景 / 商店等完整上下文
```

问题：

- DSH 主对话**不知道**用户在插件里选中的节点、空间、应用、分身、计划；
- 插件注册的 tools 里**没有** avatar / PM / 项目五类 CRUD；
- 两套会话各自维护上下文，容易“DSH 里做一遍、插件里再做一遍”；
- 没有 DSH 会话 ID ↔ 项目计划 的绑定；
- 没有事件同步，插件 UI 不会跟随 DSH 切上下文。

### 目标

```text
用户在 DSH 主对话说一句话
→ DSH Agent 自动获得当前分身 + 当前项目 + 当前计划
→ 调用插件 tools
→ 写 ContextOS / 写 PM
→ 插件 UI 同步刷新
→ 下一轮继续
```

即：**DSH 主对话是统一入口，插件是 ContextOS 能力的工具层和可视化层。**

### 总体架构

```text
┌──────────────────── DSH Main Chat ────────────────────┐
│  DSH Agent                                             │
│   ├─ Skill/系统提示：ContextOS 工作流                  │
│   ├─ tool: contextos_context   读取当前上下文           │
│   ├─ tool: contextos_pm_*      读写目标/计划/任务/报告/反馈│
│   ├─ tool: contextos_avatar_*  创建/选择/更新分身        │
│   └─ tool: contextos_*         节点/空间/应用/数据       │
└───────────────────────┬────────────────────────────────┘
                        │ tool calls
┌───────────────────────▼────────────────────────────────┐
│  Plugin Backend                                         │
│  context store（state.json / context.json）              │
│  ContextOS API adapter + PM service + avatar service    │
│  SSE /events  ←→  Plugin UI                             │
└───────────────────────┬────────────────────────────────┘
                        │
┌───────────────────────▼────────────────────────────────┐
│  ContextOS Node / Space / App / SQLite                  │
└─────────────────────────────────────────────────────────┘
```

### 核心：共享上下文总线

新增一个后端上下文对象：

```json
{
  "version": 1,
  "node": 9061,
  "space": "20240724-enterprise",
  "app": {
    "title": "员工管理",
    "command": "web.team.yuangong.portal",
    "place_uid": "81018c5e..."
  },
  "avatar": {
    "uid": "a4f6...",
    "name": "我的分身",
    "city": "深圳市",
    "company": "云轩领航",
    "skills": ["数据分析"]
  },
  "mode": "avatar",
  "functions": {
    "target": { "uid": "...", "title": "..." },
    "plan": { "uid": "...", "title": "...", "status": "process" },
    "task": null,
    "report": null,
    "feedback": null
  },
  "dshSessionId": "optional",
  "updatedAt": "2026-11-07T..."
}
```

来源：

- 插件 UI 每次切换选择时 `contextSet`；
- DSH 主对话开始时 tool `contextos_context` 读取；
- 缺省时由后端选择 active avatar + 最近节点 + 最近空间。

### DSH tools 需要补齐的最小集合

```text
contextos_context_read
contextos_context_set
contextos_avatar_list
contextos_avatar_create
contextos_avatar_select
contextos_pm_list
contextos_pm_create
contextos_pm_modify
contextos_pm_remove
contextos_pm_act
contextos_pm_capture_turn
```

`contextos_context_read` 返回：

```json
{
  "node": 9061,
  "space": "...",
  "app": {...},
  "avatar": {...},
  "functions": {...},
  "ready": true
}
```

Tool 描述必须写清楚：

```text
Before any ContextOS/PM operation, call contextos_context_read.
Use the returned avatar.uid/city/company as defaults.
Use functions.plan.uid as the session plan.
Do not ask the user for node/space/avatar if context already has them.
```

### 会话绑定

理想：

```text
DSH sessionId ↔ PM plan.uid
```

实现路径：

1. DSH tool runtime 若提供 session/thread 上下文：直接取 `sessionId`；
2. 若不提供：由 `contextos_context_set` 显式绑定：

```json
{"dshSessionId":"...","plan_uid":"..."}
```

3. 暂不具备时：以“当前计划”为全局上下文，DSH 与插件共用当前计划；
4. 新建 DSH 会话时，默认绑定到 active plan，用户说“切换计划”再改。

### 自动记录 DSH 任务结果

建议增加一个“会话捕获”工具：

```text
contextos_pm_capture_turn
  plan_uid
  kind: report | feedback | task
  title
  content
  task_uid?
```

DSH 每完成一次实质工作：

```text
用户目标 → DSH 执行 → 生成摘要
→ contextos_pm_capture_turn
→ 写 report / feedback
```

若 DSH 提供消息事件订阅，也可以在后端监听 assistant 消息，按规则自动写入；工具调用更可控、可审计。

### 事件同步

插件 UI 与 DSH 主对话需要双向同步：

```text
DSH 切换 plan → 插件 UI 切换左侧计划/会话
插件切换 avatar → DSH 下一轮 context 更新
DSH 创建任务 → 插件右侧任务列表刷新
```

建议新增：

```text
GET /contextos-devops-dsh/events   SSE
event: context-changed
data: {...}
```

前端订阅；后端在 `contextSet`/PM 写操作后广播。

### 分阶段落地

#### P0：上下文桥（1–2 天）

- 增加 `context.json` / `contextGet` / `contextSet`；
- 插件 UI 选择变化时写 context；
- 注册 `contextos_context_read`；
- Tool 描述要求先读 context。

验收：

```text
DSH 主对话问“当前在哪个空间/分身”
→ tool 返回插件当前选择
```

#### P1：PM tools + 会话计划（2–4 天）

- 注册 `contextos_pm_list/create/modify/remove/act`；
- DSH 主对话说“给当前计划加任务”
- 使用 context.functions.plan.uid，写入并回读。

#### P2：Skill + 会话绑定（3–5 天）

- 增加 DSH Skill/系统提示：ContextOS 工作流；
- `sessionId ↔ plan_uid` 绑定；
- 每次实质工作后 `pm_capture_turn` 写报告/反馈。

#### P3：自动化与多用户（后续）

- SSE 双向同步；
- 后台任务队列/断点续跑；
- 多用户/租户隔离；
- 危险动作确认与审计。

### 关键风险

| 风险 | 处理 |
|---|---|
| 模型不调用 context tool | Tool 描述 + Skill 强约束；首轮系统提示 |
| 上下文过期 | `updatedAt` + 版本号；写前读取 |
| 重复写入 | 幂等键 `sessionId:turnId:kind` |
| DSH 无 sessionId | 先以当前计划为全局上下文 |
| 两套会话冲突 | 明确“DSH 主对话优先”；插件 ChatPanel 作为调试/专用入口 |
| 权限越界 | 工具白名单 + 危险动作二次确认 + 审计 |

### 一句话结论

**联动不是“把插件 API 暴露成 tool”就够了，而是要做三件事：**

```text
1. 共享上下文（当前节点/空间/应用/分身/五类函数）
2. 共享会话（DSH session ↔ 项目计划）
3. 共享写入（PM/ContextOS 真实回读 + UI 事件同步）
```

先做 P0 的 context bridge，再补 PM tools，最后用 Skill 和会话绑定把“自动使用分身与项目管理”变成默认行为。


# 二、技术架构设计

## 2.1 DSH 插件接入

`index.js`：

```js
export const inject = ['tools', 'webServer', 'llm'];
export function apply(ctx) { ... }
```

注册内容：

1. **tRPC 风格工具**：`ctx.tools.register`，供 DSH 主代理调用；
2. **HTTP API**：`/contextos-devops-dsh/api`；
3. **静态资源**：`/monaco`、`/xterm`、`/three`、`/leaflet`；
4. **WebSocket**：`/contextos-devops-dsh/terminal`（PTY）；
5. **LLM 注入**：`ctx.llm`，由 `chat` op 调用。

客户端：

```js
window.__ModuleLoader__.load({ id, factory(require) { ... } });
```

没有独立构建产物，`client.js` 直接作为 DSH Web 插件模块加载；React 由宿主提供。

## 2.2 后端分层

```text
lib/core/         核心业务逻辑（可引用 base + misc）：nodes / spaces / apps / data / files / device / terminal / users / project / avatar / copilot
lib/base/         基础功能逻辑（可引用 misc）：env / platform / http / registry / table / field / state
lib/misc/         外部辅助工具（叶子，不引用 base/core）：shell（进程执行）/ async（等待）/ static（静态资源）
index.js          业务命令 + HTTP 路由 + DSH tools
```

关键机制：

- **HTTP_DEBUG AsyncLocalStorage**：记录真实 ContextOS URL/method，回传前端 DEBUG；
- **ContextOS API 适配**：所有写操作走真实 HTTP，不另造数据格式；
- **PM 读取**：`pmList` 优先 SQLite 直读，避免 ContextOS list 身份过滤导致 0x0；
- **翻译**：带浏览器 UA 请求 `_trans` 元数据，缓存 60 秒；
- **状态**：`avatars.json`、`backgrounds.json`、`users.json` 位于 DSH state 目录。

## 2.3 前端结构

```text
client.js
  ├─ CSS Token + KIT_CSS
  ├─ 基础组件：Panel/Section/Toolbar/Btn/Field/Tabs/Card/Modal/MenuButton/DropSelect/EmptyState/ErrorBox/Hint
  ├─ 业务组件：NodeCard/SpaceCard/AppRow/StoreRow/PmCalendar/TaskMap/PMForm/...
  ├─ 场景组件：DevWorkspace（Monaco + xterm + 文件树 + Git + 预览）
  ├─ AI：ChatPanel（三种模式、上下文、动作执行）
  ├─ 3D：ThreeAvatar / ThreeCity
  └─ Page：四栏工作台 + 视图切换
```

当前规模：

```text
index.js    ≈ 3,000 行
client.js   ≈ 5,200 行（含内嵌图片/3D/地图/编辑器）
组件         ≈ 38 个
状态 hooks   ≈ 220 个 useState / 90 个 useEffect
```

优点：单文件可热更新、无构建、部署简单。  
代价：耦合高、可测试性低、页面状态复杂（见第七节工程化欠账）。

## 2.4 数据流

### 普通操作

```text
React 事件
  → api(op, body)
  → POST /contextos-devops-dsh/api
  → 后端调用 ContextOS HTTP / shell / SQLite
  → 回读结果
  → UI 更新 + ACTIVITY/DEBUG
```

### AI 操作

```text
ChatPanel
  → chat(message, history, context, mode)
  → ctx.llm.stream 解析 {reply, action}
  → 白名单 action
  → 同一套 api() 执行
  → 结果回读
```

### 初始化

```text
runInit(form)
  → 节点部署/复用
  → 云社区 + 云办公
  → 打开空间首页（DB bootstrap）
  → createAvatar
  → createProjectForAvatar
  → 刷新 PM
```

## 2.5 外部依赖

| 依赖 | 用途 | 方式 |
|---|---|---|
| Three.js 0.160 | 3D 人物/数字城市 | `vendor/three` + 动态 import |
| Leaflet 1.9.4 | 腾讯地图任务点 | `vendor/leaflet` |
| Monaco | 代码编辑器 | 宿主资源 `/monaco` |
| xterm.js | Web 终端 | `vendor/xterm` |
| ContextOS HTTP | 节点/空间/应用/数据 | 真实 API |
| DSH `ctx.llm` | AI 意图 | 宿主注入 |
| SQLite | PM 数据读取 | 空间 `var/db/xiangmuguanli.db` |

---

# 三、编程规范

## 3.1 边界优先

新增功能只能在下列扩展点组合：

```text
lib/core/        核心业务（引用 base + misc）
lib/base/        基础功能（引用 misc）
lib/misc/        外部辅助工具（叶子）
index.js op      业务能力
client.js 组件   界面
```

禁止：

- 业务代码拼 `$HOME`；
- 业务代码直接判断 `process.platform`；
- 页面直接手写 ContextOS HTTP；
- 新增第二套数据格式；
- 在软链目录里改框架。

## 3.2 后端规则

1. 写操作走真实 ContextOS，不绕过 API；
2. 方法门：`create→PUT`、`modify→POST`、`remove→DELETE`，其余 POST；
3. 写完必须回读，200 不等于成功；
4. 所有路径必须 `resolve` 后校验仍在 space 内；
5. 字段值禁止半角 `/`；
6. 错误返回 `{ok:false,error}`，不静默吞异常；
7. 外部命令必须超时；
8. 新增 op 必须加类型化参数说明和 UI 调用点。

## 3.3 前端规则

1. 新按钮使用 `Btn`，不手写 `cx-btn`；
2. 新颜色/间距先加 `--cx-*` token；
3. 空态 `EmptyState`、错误 `ErrorBox`、提示 `Hint`；
4. 危险操作用 `MenuButton` + `danger`，红色；
5. 数据卡：类型左上、状态右上、操作底部靠右；
6. 下拉菜单按按钮位置对齐：左按钮左对齐、右按钮右对齐；
7. 组件只组合基础组件，不复制样式；
8. 任何异步操作必须有 `busy/error/empty` 三态。

## 3.4 命名与文案

- 代码：`camelCase` / `PascalCase` / `UPPER_SNAKE_CASE`；
- op：`pmList` / `pmCreate` / `pmModify` / `pmRemove`；
- 中文优先、英文补充：

```text
服务节点 / SERVE
项目空间 / SPACE
最近应用 / RECENT
网页界面 / WEB
```

纯品牌名与数据值例外。

## 3.5 i18n

- 语言：`中文 / English / 跟随系统`；
- 文案键集中在 `TERMS` 与 `locale/*.json`；
- 状态/类型翻译优先使用 ContextOS `_trans`；
- 禁止在 JSX 中新增不可翻译的中文长句。

当前 i18n 仍是**部分覆盖**：核心按钮/标题已翻译，编辑器/终端/部分弹窗仍有硬编码。

---

# 四、设计规范

## 4.1 布局

```text
顶栏：品牌 + 状态 + 语言/主题 + 初始化
流水线：服务节点 → 项目空间 → 最近应用 → 网页界面
四栏：
  节点  |  空间  |  最近应用  |  网页界面
底部：
  ACTIVITY / DEBUG 标签页
```

- 四栏自适应，网页栏优先变宽；
- 网页标签统一高度、宽度自适应；
- 对话全屏默认打开，可切工作台；
- 地图固定右下角，可全屏；
- 日历在右侧顶部。

## 4.2 Token

```css
--cx-bg
--cx-surface-0/1/2/3
--cx-glass
--cx-border / --cx-border-strong
--cx-text-strong / --cx-text / --cx-text-dim / --cx-text-faint
--cx-accent / --cx-accent-soft
--cx-shadow
--cx-font / --cx-mono
```

深色/浅色只覆盖变量，不重复写组件色值。

## 4.3 字体

- UI：系统无衬线（SF Pro / PingFang SC / Microsoft YaHei）；
- 代码/日志：等宽；
- 标题 12–16px；正文 12–13px；按钮 10–11px；辅助 9–10px。

## 4.4 按钮与图标

| 功能 | 规范 |
|---|---|
| 创建 | `+`，右对齐 |
| 刷新 | `↻` |
| 最大化 | `⛶` |
| 恢复 | `❐` |
| 关闭 | `×` |
| 更多 | `⋯`，危险项红色 |

- 按钮高度统一 26–30px；
- 图标按钮方形；
- 危险操作只出现在 `⋯` 菜单。

## 4.5 类型/状态

- 类型：目标/计划/任务/报告/反馈，各自颜色；
- 状态：created/submited/approved/process/finished/canceled/rejected/canFinish/shouldImprove；
- 浅色与深色分别使用 token 对比度；
- 类型左上、状态右上。

## 4.6 空态/加载/错误

- 空：`EmptyState` + 下一步 CTA；
- 加载：骨架/加载文案；
- 错误：`ErrorBox` + 可重试；
- 长任务：进度步骤。

## 4.7 响应式与可访问性

当前：

- ≤1000px 侧栏隐藏/换行；
- 地图/3D 降低不透明度；
- 键盘 Enter 发送，Shift+Enter 换行。

待补：

- 键盘焦点环、ARIA、对比度审计；
- 触摸手势；
- 减少动画 `prefers-reduced-motion`。

---

# 五、API 概览

所有请求：

```text
POST /contextos-devops-dsh/api
{"op":"...", ...}
→ {"ok":true,"data":...}
→ {"ok":false,"error":"...","debug":[...]}
```

分组：

| 组 | ops |
|---|---|
| 节点 | `health` `nodes` `deploy` `start` `stop` `deleteNode` `nodeTerminal` `sshHosts` `sysControl` |
| 空间 | `spaces` `createSpace` `buildSpace` `initSpace` `startSpace` `stopSpace` `deleteSpace` `officialSpaces` `spaceTerminal` `spaceOpen` |
| 应用 | `apps` `autogenApp` `createApp` `createInstance` `storeApps` `storeAction` `createStoreInstance` `compile` |
| 文件/代码 | `listDir` `tree` `readFile` `writeFile` `mkdir` `renamePath` `removePath` `git` |
| 数据 | `readData` `writeData` `removeData` |
| 分身/背景 | `avatars` `createAvatar` `updateAvatar` `setAvatar` `deleteAvatar` `backgrounds` `createBackground` `updateBackground` `setBackground` `deleteBackground` `saveUserMedia` |
| 项目管理 | `pmList` `pmCreate` `pmModify` `pmRemove` `pmAct` `planProject` `projectStatus` `seedProject` |
| AI | `chat` `llmInfo` |
| 系统 | `stateGet` `stateSet` `files` `file` `clientError` `devices` |
| 交付 | `dockerDeploy` `remoteDeploy` `remoteLogin` `pipeline` |

---

# 六、通信协议与数据存储

## 6.1 通信总览

```text
┌──────────────┐   HTTPS/HTTP(JSON)   ┌──────────────────────┐
│ DSH Web UI   │ ───────────────────→ │ DSH Plugin Backend    │
│ client.js    │ ←─────────────────── │ /contextos-devops-dsh │
└──────────────┘   JSON/调试/错误      └──────────┬───────────┘
                                                   │
                          HTTP / WebSocket / SQLite│
                                                   ▼
                                      ┌──────────────────────┐
                                      │ ContextOS Node / Space│
                                      │ 真实命令与数据         │
                                      └──────────┬───────────┘
                                                 │
                          HTTP(JSON/HTML)、静态资源、腾讯瓦片
                                                 ▼
                                      ┌──────────────────────┐
                                      │ 应用 / 地图 / 外部服务 │
                                      └──────────────────────┘
```

原则：

- UI → 插件：统一 JSON API；
- 插件 → ContextOS：真实 HTTP/WS，不复制业务数据；
- 插件 → DSH LLM：`ctx.llm.stream`；
- 插件 → 外部：腾讯地图瓦片、系统浏览器/终端。

## 6.2 插件 API 协议

### 请求

```http
POST /contextos-devops-dsh/api
Content-Type: application/json

{"op":"pmList","node":9061,"uid":"<avatar-uid>","lang":"zh"}
```

- 路径固定，`op` 为操作名；
- body 最大 **2 MB**；
- 无 body 时默认 `op=health`；
- 未知 op 返回 HTTP 404 + `{ok:false,error:"unknown op ..."}`。

### 成功

```json
{"ok": true, "data": { ... }, "debug": [ ... ]}
```

### 失败

```json
{"ok": false, "error": "具体错误", "steps": [ ... ]}
```

注意：

- 多数业务错误仍返回 **HTTP 200**，必须检查 `ok`；
- `debug` 仅在开启 HTTP_DEBUG 收集时返回；
- `steps` 用于初始化/流水线等分步操作。

### 调试协议

后端用 `AsyncLocalStorage` 保存每次 API 调用期间的真实 ContextOS 请求：

```json
{"method":"POST","url":"http://127.0.0.1:9061/s/.../action/create?user.uid=..."}
```

前端可在 DEBUG 标签看到 method/url/query/body，便于判断“200 但写丢”。

## 6.3 ContextOS HTTP 协议

### 地址模型

```text
http://127.0.0.1:<node-port>/s/<space>/c/<command>/action/<action>
```

常用 option：

| 参数 | 用途 |
|---|---|
| `user.uid` | 用户/分身身份 |
| `sessid` | 分身登录会话 |
| `project_uid` | 项目管理实例 |
| `_place_uid=project_uid` | 告诉命令按项目取 place |
| `project_name` | 创建项目 |
| `uid` | 上级实体 UID（target/plan/task/report） |
| `user_role=1` | 项目创建者角色 |
| `begin_time/end_time` | 计划时间 |

### 方法门

```text
create/insert      → PUT
modify/update      → POST
remove/delete      → DELETE
其他 action        → POST
GET /action/*      → 405（login/run/command 例外）
```

### 响应形态

ContextOS 可能返回：

1. JSON envelope：

```json
{
  "append": ["uid", "title", "status"],
  "_status": ["[...count...]"],
  "value_uid": ["..."],
  "_trans": ["{...}"]
}
```

2. HTML（带浏览器 `User-Agent`/`Accept: text/html`）；
3. 302/HTML 重定向；
4. 错误页/空响应。

插件处理：

- JSON：`envelopeRows` 解析 `append`；
- 固定宽度 CLI 表：`parseFixedTable`；
- HTML：仅在翻译元数据场景使用 `_trans`；
- 写操作必须回读，不能以 200 作为成功判据。

### 身份补充

`http()` 会为所有请求自动补 `user.uid`（节点级持久用户）；
分身场景使用 `sessid`，并在需要时补 `user_role`、`project_uid`、`_place_uid`。

## 6.4 DSH LLM 协议

```js
for await (const chunk of ctx.llm.stream({
  provider, model, messages
})) {
  // text-delta / finish
}
```

提示词要求模型只输出：

```json
{"reply":"...","action":{"op":"...","args":{...}}}
```

插件只执行白名单 action；模型失败时返回明确错误，不静默回退本地规则。

## 6.5 WebSocket 终端协议

```text
ws://127.0.0.1:<dsh-port>/contextos-devops-dsh/terminal?cwd=<dir>
```

- 标准 WebSocket 握手；
- 文本/二进制帧直接转发给 PTY；
- 特殊控制帧：

```text
\x00CTX_RESIZE <cols> <rows>
```

用于调整 PTY 窗口大小；
- macOS/Linux 通过 Python `pty.fork`；
- Windows 明确返回 501，不伪装支持。

## 6.6 静态资源与外部服务

| 路径 | 内容 | 缓存 |
|---|---|---|
| `/contextos-devops-dsh/monaco/*` | Monaco | 1h |
| `/contextos-devops-dsh/xterm/*` | xterm.js | 1h |
| `/contextos-devops-dsh/three/*` | Three.js | 1h |
| `/contextos-devops-dsh/leaflet/*` | Leaflet | 1h |
| `/contextos-devops-dsh/assets/*` | 默认头像等静态图片 | 1h |

腾讯地图瓦片：

```text
https://rt{s}.map.gtimg.com/tile?z={z}&x={x}&y={y}&type=vector&styleid=3&scene=0
```

- Leaflet 用 `tms: true` 反转 Y；
- 需要浏览器网络访问；
- 未配置腾讯地图 key，使用的是瓦片直连。

---

## 6.7 数据存储总览

```text
插件状态（DSH_HOME/contextos-devops-dsh/）
  ├─ users.json
  ├─ avatars.json
  ├─ backgrounds.json
  ├─ state.json
  └─ client-errors.log

节点台账
  └─ ~/.contextos/nodes.json

ContextOS 运行数据
  ├─ <node>/usr/local/work/<space>/var/db/*.db
  ├─ <node>/usr/local/work/<space>/src/*
  └─ <node>/var/media/*

浏览器本地
  └─ localStorage: contextos-devops-dsh:*
```

## 6.8 插件状态文件

### users.json

```json
{
  "9061": {
    "uid": "a4f6...",
    "username": "dsh_copilot_9061"
  }
}
```

- 按节点端口保存默认用户；
- 首次请求时创建；
- 用于 recent、实例等 `user.uid`。

### avatars.json

```json
{
  "9061": {
    "active": "<uid>",
    "items": [{
      "uid": "a4f6...",
      "name": "我的分身",
      "city": "深圳市",
      "company": "云轩领航",
      "persona": "...",
      "preferences": "...",
      "style": "...",
      "image": "data:image/jpeg;base64,...",
      "skills": ["数据分析"],
      "project": {
        "space": "20240724-enterprise",
        "command": "web.team.xiangmuguanli.portal",
        "place_uid": "..."
      }
    }]
  }
}
```

- 图片以 data URL 存储；建议改为文件 + URL；
- `project` 是该分身的项目管理实例；
- 删除分身只删记录，不删系统用户。

### backgrounds.json

```json
{
  "9061": {
    "active": "bg_xxx",
    "items": [{
      "id": "bg_xxx",
      "name": "深圳数字城市",
      "image": "",
      "params": {
        "theme": "dark",
        "lang": "zh",
        "timezone": "Asia/Shanghai",
        "location": "Shenzhen"
      }
    }]
  }
}
```

- 场景/背景与参数；
- 支持主题、语言、时区、位置等环境上下文。

### state.json

```json
{
  "reqlog": [],
  "selMap": {},
  "termBuf": {},
  "chat:contextos-devops-dsh:chat:<avatar>:<plan>": []
}
```

- 通用 key/value 状态；
- 前端 `stateGet` 恢复、`stateSet` 回写；
- 没有版本号/迁移/事务。

## 6.9 浏览器 localStorage

主要键：

| 键 | 内容 |
|---|---|
| `contextos-devops-dsh:sel` / `sel-map` | 当前节点/空间/应用选择 |
| `...:theme` / `lang` | 主题/语言模式 |
| `...:view` / `chatfull` / `chatfull` | 视图状态 |
| `...:cal` | 日历视图、起止、游标 |
| `...:map` | 地图中心/缩放 |
| `...:pm` | 当前 PM 选择 |
| `...:chat:<avatar>:<plan>` | 计划级会话 |
| `...:term-buf` / `ide-open` / `tree-folds` | 终端/IDE 布局 |
| `...:filter-*` | 栏过滤条件 |
| `...:console` / `reqlog` | 控制台状态/请求日志 |

策略：

- 本地先写，900ms 左右去抖同步到 `stateSet`；
- 会话历史最多 100 条，每条文本最多 4000 字符；
- 请求日志最多 50 条；
- 终端缓冲最多约 60KB/终端。

## 6.10 ContextOS 运行数据

### 项目管理 DB

```text
<node>/usr/local/work/20240724-enterprise/var/db/xiangmuguanli.db
```

表：

```text
targets / plans / tasks / reports / feedbacks
```

- `pmList` 直接 SQLite 读，避免 ContextOS list 因身份过滤返回 0x0；
- 写仍然走 ContextOS API；
- 这是**读旁路**，不是替代业务 API；
- 与 ContextOS schema 强耦合，升级需回归。

### 应用数据

- 存储在对应 space 的 ContextOS 数据库；
- 插件不维护第二份业务数据；
- `writeData` 后必须 `readData` 回查。

### 媒体文件

```text
<node>/var/media/<uid>-<kind>.<ext>
```

- 上传头像/背景时保存；
- 可能同步写 space 的 `avatar/background` 字段；
- 当前未做清理/配额/病毒扫描。

## 6.11 并发与一致性

当前：

- 状态 JSON **无锁、无原子写**；
- 多窗口同时写可能互相覆盖；
- PM 读取 SQLite 与写入 API 之间没有事务；
- 3D/地图/终端状态以本地为主。

建议：

1. 原子写：临时文件 + `rename`；
2. 文件锁或单写者队列；
3. state schema 版本 + migration；
4. 会话/日志设置 TTL/配额；
5. 关键写操作使用幂等键；
6. PM 读模型加缓存版本号；
7. 远程/多用户时改为服务端权威存储。

## 6.12 数据所有权与隐私

- 节点/空间/应用数据属于用户 ContextOS；
- 插件 state 属于本机 DSH profile；
- 头像/背景图片可能包含个人隐私，默认本地存储；
- 腾讯地图会向外部瓦片服务发起请求；
- 终端/远程命令可访问本机，发布前必须加权限与审计；
- 当前没有加密、租户隔离、数据导出/删除 API。

# 七、当前实现状态

## 已实现

- 节点部署/启停/删除/终端；
- 云社区/云办公等十个标准空间；
- 应用生成/编译/实例/数据；
- 应用商店上架/下架/编程/配置；
- 数字分身多身份/形象上传/技能；
- 项目管理五实体 + AI/手动 CRUD；
- 计划级会话持久化；
- 腾讯地图/地球/3D 城市；
- 深/浅主题、中英切换；
- 初始化引导、示例数据、错误日志。

## 已知限制

- 图片→3D 人物/场景仍是“形象/背景”，不是真实重建；
- 万物互联只做发现，WiFi/蓝牙/红外控制未接；
- 多用户/云同步/协作未做；
- 终端/远程操作权限模型不完整；
- 大型单文件、无测试、无 CI；
- 部分 i18n/主题未完全 token 化；
- PM 直读 SQLite，与 ContextOS 版本耦合；
- 3D/地图/编辑器同时开启时资源占用高。

---

# 八、成为公开流行软件的工程化/产品化补充

## P0：先成为“可安全发布”的软件

1. **拆分单体**
   - `client.js` → `components/`、`hooks/`、`services/`；
   - `Page` → `WorkbenchLayout`、`ChatShell`、`ProjectPanel`；
   - `index.js` → `routes/`、`services/`、`adapters/`。

2. **测试**
   - 后端：op 契约测试、路径穿越、方法门、状态机；
   - 前端：Playwright 覆盖初始化/创建/PM/主题/语言；
   - 3D/地图/终端冒烟测试。

3. **类型与契约**
   - JSON Schema / Zod 校验每个 op；
   - API 版本化 `v1`；
   - 错误码统一。

4. **安全**
   - 终端/远程/Docker 加权限与确认；
   - 图片上传限制大小/类型；
   - state 文件原子写 + 锁；
   - 禁止任意 cwd 终端；
   - 第三方依赖许可证清单。

5. **发布工程**
   - GitHub Actions：lint/typecheck/test/build；
   - 语义化版本 + CHANGELOG；
   - 安装包签名/校验；
   - 自动更新通道。

## P1：成为“可传播”的产品

1. 一键演示模式（无真实节点也能看完整流程）；
2. 首次启动 3 分钟教程；
3. 官网/文档站/截图/视频；
4. 模板市场（行业空间、分身、场景）；
5. 完整中英文；
6. 可访问性与低配模式；
7. 崩溃上报（opt-in）与日志导出；
8. 社区：Issue 模板、Discussions、贡献指南。

## P2：成为“平台”

1. 多用户/团队/权限；
2. 云端同步与备份；
3. 插件 SDK（自定义 op/卡片/技能）；
4. 场景/资产市场；
5. 技能运行时（工具权限、审计）；
6. 计费/授权/私有化部署；
7. 可观测性：指标、追踪、审计日志；
8. 性能预算：首屏、3D FPS、地图交互延迟。

## 产品策略

- **定位**：不是“又一个 DevOps 面板”，而是“数字分身的操作系统入口”；
- **差异化**：分身身份 + 项目管理 + 真实应用生成闭环；
- **首个爆点**：一句话生成并上架一个业务应用；
- **第二个爆点**：上传照片生成可交互数字人/场景；
- **护城河**：ContextOS 真实运行链路 + 分身数据资产 + 场景/技能生态。

---

# 九、开发与运行

```bash
# 插件目录
cd usr/dsh-plugins/contextos-devops-dsh

# 语法检查
node --check index.js
node --check client.js

# 修改后端后重启 DSH；修改 client 可刷新页面
```

环境变量：

| 变量 | 默认 | 用途 |
|---|---|---|
| `CTX_ROOT` | `~/ContextOS` | 主仓根 |
| `CTX_NODES_FILE` | `~/.contextos/nodes.json` | 节点台账 |
| `CTX_DEVOPS_STATE` | `$DSH_HOME/contextos-devops-dsh` | 插件状态 |
| `CTX_MONACO_DIR` | `usr/macos-app/Resources/monaco` | Monaco |

目录：

```text
index.js                 后端入口
client.js                前端模块
lib/                     环境/平台/台账/shell
locale/                  语言资源
vendor/three             3D
vendor/leaflet           地图
vendor/xterm             终端
```

---


## 9.1 前端源码拆分（Phase 1）

`client.js` 已从单文件拆成 14 个源码片段，但 DSH 仍然只加载一个 `client.js`：

```text
src/client/parts/
  00-prelude.js        ModuleLoader 外壳、常量、图标
  05-bootstrap.js      api / 事件 / 调试 / 超时
  10-ui.js             Panel/Btn/Field/Empty 等基础组件
  20-devworkspace.js   Monaco + xterm + 文件树 + Git + 预览
  30-modals.js         DropSelect/MenuButton/Modal/Scene/AvatarEdit
  32-cards.js          节点/空间/应用/商店卡片
  34-forms.js          部署/空间/应用/代码/实例表单
  36-data.js           分身/设备/数据弹窗
  40-project.js        初始化/日历/过滤器
  45-map.js            腾讯地图
  46-pm.js             项目管理表单/富文本
  47-three.js          3D 分身/数字城市
  50-chat.js           ChatPanel 与动作执行
  60-page.js           Page、Boundary、插件注册

src/client/styles/
  main.css             主视觉样式
  kit.css              基础组件 + 可访问性样式

assets/
  avatar.jpg           默认数字人图片（静态资源，不进 bundle）
  client.css           构建生成的样式文件

build/client.mjs       组装脚本
client.js              生成产物（DSH 唯一入口）
```

### 构建

```bash
cd usr/dsh-plugins/contextos-devops-dsh

npm run build:client     # 生成 client.js
npm run watch:client     # 监听 src/client 变化并重建
```

### 约束

- **不要直接改 `client.js`**，它是生成物；
- 改 `src/client/parts/*` 或 `src/client/styles/*` 后执行构建；
- 片段共享 ModuleLoader factory 的词法作用域，因此单个片段不是独立 ES module，不能单独 `node --check`；
- 构建完成后用 `node --check client.js` 校验；
- DSH 仍然只加载一个 `client.js`，运行时行为不变；
- Phase 2 才会把这些片段迁移成真正的 ESM modules + esbuild。
- 默认头像已从 bundle 移到 `/contextos-devops-dsh/assets/avatar.jpg`，减少约 111KB JS。
- 3D 城市在页面隐藏/地图全屏时暂停；降低 DPR；卸载时释放几何体/材质。
- PM 类型/状态/操作全部以 `pmList` 返回的 `kind_label/status_label/actions` 为准，前端不再自行过滤。
- PM 卡片展示 content、反馈星级；报告类型使用独立颜色。
- 字段选项通过 `fieldOptions` 读取 command `inputs`，字段名/值翻译优先取 `web.team.xiangmuguanli.task` 的 `meta._trans`。
- 空翻译不再缓存 60 秒；节点恢复后下一次 pmList 立即拿到中文。
- ChatPanel 在窗口重新获得焦点时自动刷新 PM，避免长时间停留旧语言/旧 action。
- 管理栏创建按钮移到刷新之后；GET/START/STOP 等操作期间禁用按钮并显示进度遮罩，接口返回后自动关闭。
- 操作成功/失败显示 2.6s/4.2s toast，刷新时 PM 侧栏淡入过渡；新增 PM 卡片显示扫描高亮，应用数据表写入后也有刷新高亮。
- 创建表单标注必填项并在缺失时禁用提交；每个字段进入时调用 `inputs` 补全，select 字段只允许下拉选择。
- 通用字段标题/内容/时间/报告类型/评分/反馈状态使用中文兜底翻译，避免 meta 缺失时显示 raw key。
- PM 数据变化按签名检测，任务完成等会同时高亮 task/report/feedback 的变化；其它操作增加全局数据扫描闪光。
- 报告 modify/remove 补传 task_uid，反馈 modify/remove 补传 report_uid；修复报告编辑、删除、反馈新增无效。
- 反馈区在选中报告后始终显示 `+`，不因 API actions 暂缺而隐藏。
- 报告/反馈的编辑删除按接口上下文补传 task_uid/report_uid，避免 0x0 no-op。
- 报告卡片始终由 API 返回 feedbackCreate/modify/remove，兼容任务完成后的报告维护。
- 卡片上的 + 计划/+ 任务/+ 报告/+ 反馈会先把被点击卡片设为父级，再打开表单，修复父 UID 错位导致创建无效。
- 创建 plan/task/report/feedback 不再先 pmList、也不再建 sessid：使用已有父 UID 直接 action，按 value_uid 返回。
- PM 列表改为级联：target list → target/planList → plan/taskList → task/reportList → report/feedbackList；切换选中项刷新下游。
- 插件只读查询 op 改走 GET；DEBUG 记录 method/url/params/response，详情按 envelope 解析成表格，支持一键清空。
- PM 级联查询改为 ContextOS GET /c/<cmd>/<planList|taskList|reportList|feedbackList>，不再建 sessid；清理 user_uid/user_role/user.role 等内部参数。
- DEBUG 详情展示 log.id、HTTP status、耗时、报文大小、请求/响应头；选中请求按 log.id 在对应 PM 卡片上扫描高亮。
- DEBUG 只展示 ContextOS 接口调用，不再展示插件自身的 /api 请求；List 用 GET，Create 用 PUT，Modify 用 POST，Remove 用 DELETE。
- 刷新按钮按 target/plan/task/report/feedback 作用域只拉取自身及下游；只有写操作才从 target 全量刷新。
- 接口失败时把 ContextOS 文本/HTTP 错误回传到表单和 toast；创建严格走父级 action：target/planCreate、plan/taskCreate、task/reportCreate、report/feedbackCreate，使用 PUT，再 GET 子列表回读 UID；进入插件无 PM 缓存时自动 target list。
- RichText / PmCalendar / ThreeAvatar 使用 React.memo；地图标记只在任务签名变化时重绘。
- CSS 从 JS bundle 外置为 `/contextos-devops-dsh/assets/client.css`，bundle 降到约 310KB，样式可缓存。
- CSS/头像 URL 带版本参数，发布后不会被 1h 缓存卡住。
- 刷新操作并行加载 avatars/spaces，再拉 recent，减少等待。
- 首次选中节点时把 avatars/spaces/backgrounds 合并为一个并行 LOAD CONTEXT，减少 busy 抖动和活动日志。
- WEB 栏 iframe 只在管理视图加载，对话/开发视图不再后台加载应用页面。
- apps/spaces/pmList 增加请求序号，快速切换节点/分身时旧响应不会覆盖新状态。
- ACTIVITY/REQUEST 日志先写 ref，只有控制台打开时才 setState；关闭控制台时操作不再触发 Page 日志重渲染。
- DEBUG/EVENT 写入按 80ms 批量 flush，避免一次加载触发多次 Page 更新。
- 输入框改为非受控 + ref，输入时不再触发整个 ChatPanel/项目栏重渲染。
- 忙碌计时拆成独立 `Elapsed` 组件，400ms tick 不再重渲染 ChatPanel。
- 中文输入法组合期间按 Enter 不误发送。
- 控制台关闭且非 IDE 视图时，不再记录每次点击，避免 Page 无意义重渲染。
- `Cmd/Ctrl + K` 聚焦输入框。
- IDE/DevWorkspace 改为首次进入 DEV 视图才挂载，减少首屏初始化。
- 控制台关闭时跳过 DEBUG/EVENT 状态写入，减少 API 请求引发的 Page 重渲染。
- 项目提醒轮询在页面隐藏时跳过。
- 草稿延迟 180ms 写入 localStorage，避免每次按键同步 I/O。
- API 增加 120s/900s 超时；页面级错误边界提供重试/刷新。

### 为什么先这么做

当前 `client.js` 约 5,260 行，bundle 约 420KB。直接改成 ESM 会同时改动：

```text
React 实例
h 工厂
200+ state
CSS 顺序
ModuleLoader 契约
```

风险过高。Phase 1 先做到：

```text
AI 每次只读一个 feature 片段
构建仍输出单文件
不改变运行行为
```

等片段稳定后再做 ESM 化。

# 十、结论

这个插件已经具备一个“AI 原生 ContextOS 工作台”的骨架：

```text
真实部署链路
+ 分身身份
+ 项目管理
+ AI 意图执行
+ 3D/地图/编辑器
```

但要成为公开、流行、可长期维护的软件，还需要从**单文件原型**升级为**有边界、有测试、有权限、有发布流程、有文档与社区的产品**。优先级应是：

```text
安全与拆分 > 测试与契约 > 演示与文档 > 生态与商业化
```

---

## License / 第三方

发布前需补充项目 LICENSE 与 `THIRD_PARTY_NOTICES`，至少覆盖 Three.js、Leaflet、xterm.js、Monaco 及腾讯地图瓦片使用条款。

