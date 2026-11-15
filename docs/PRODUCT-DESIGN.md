# 产品与技术设计详解 / PRODUCT DESIGN

> 读这份当：要看**产品为什么这么设计**（分层结构、五类实体、六项能力、AI-first 流程、DSH 联动路线图、产品策略）。
> 不读这份当：架构与代码边界 → [ARCHITECTURE.md](ARCHITECTURE.md)；接口 → [INTERFACE.md](INTERFACE.md)；
> 界面规范 → [DESIGN-SYSTEM.md](DESIGN-SYSTEM.md)；验收 → [ACCEPTANCE.md](ACCEPTANCE.md)；现状与限制 → [README.md](../README.md)。

**按章读，不要整份读**（本文 800+ 行，只有需要产品论证时才翻对应章）：

| 章 | 内容 | 什么时候读 |
| --- | --- | --- |
| 0–1.3 | 产品定义、三层结构、五类实体、六项能力 | 讲清「这是什么」 |
| 1.4–1.8 | 初始化、数字分身、项目会话、应用商店、赛博世界 | 讲某一功能怎么用 |
| 1.9 | AI-first 会话流程（目标形态、上下文包、指标） | 改对话体验 |
| 1.10 | 与 DSH 主对话联动（共享上下文总线、分阶段落地） | 规划跨端能力 |
| 1.11 | 规模与战略 | 讲为什么必须自动化 |
| 2 | 架构指针（真正的架构在 ARCHITECTURE） | 只作跳转 |
| 3 | 现状与路线图（P0/P1/P2） | 排优先级 |
| 4–6 | 产品策略、前端工程化、许可 | 决策与合规 |

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
GET /dsh-contextos-devops/events   SSE
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

## 1.11 规模与战略（为什么必须小）

- **规模推演**：一个节点 ≈ 数十空间，一个空间 ≈ 数十应用，万级节点即百万级子系统 → 只能靠「自动化生成 + 自动化运维」。
- **对架构的硬要求**：一切可生成（模块/接口/界面）、一切可远程（无本地依赖）、一切可回滚（Git + 编译产物）。
- **群控 = 多智能体协同**：人给意图，多个智能体分别负责部署/生成/数据/验收，插件是它们的操作面板与审计面。
- **诚实缺口**：多用户与云同步未做；物联只到发现层；视频/语音等模态尚未接入。

## 2. 架构与规范（本文件不再重复）

架构分层、请求流程、宿主接入、客户端契约、模块归属已统一到
[ARCHITECTURE.md](ARCHITECTURE.md)；接口形状见 [INTERFACE.md](INTERFACE.md) 与 [URL-SPEC.md](URL-SPEC.md)；
界面规范见 [DESIGN-SYSTEM.md](DESIGN-SYSTEM.md)；验收见 [ACCEPTANCE.md](ACCEPTANCE.md)。
本节只保留产品视角的一句话：插件 = **DSH 的一个 Web 模块 + 一个 op 注册表 + 一层 ContextOS HTTP 适配**。


## 3. 现状与路线图

### 3.1 现状

**已实现清单以 [README.md](../README.md) §能力矩阵 为准**（本文不再复述，避免两处不同步）。
已知限制见 README §状态与 [RSI-LEDGER.md](RSI-LEDGER.md) 的未闭环项。

### 3.2 路线图


## P0（先行）：可安全发布

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

## P1（其次）：可传播

1. 一键演示模式（无真实节点也能看完整流程）；
2. 首次启动 3 分钟教程；
3. 官网/文档站/截图/视频；
4. 模板市场（行业空间、分身、场景）；
5. 完整中英文；
6. 可访问性与低配模式；
7. 崩溃上报（opt-in）与日志导出；
8. 社区：Issue 模板、Discussions、贡献指南。

## P2（再后）：平台化

1. 多用户/团队/权限；
2. 云端同步与备份；
3. 插件 SDK（自定义 op/卡片/技能）；
4. 场景/资产市场；
5. 技能运行时（工具权限、审计）；
6. 计费/授权/私有化部署；
7. 可观测性：指标、追踪、审计日志；
8. 性能预算：首屏、3D FPS、地图交互延迟。

## 4. 产品策略

- **定位**：不是“又一个 DevOps 面板”，而是“数字分身的操作系统入口”；
- **差异化**：分身身份 + 项目管理 + 真实应用生成闭环；
- **首个爆点**：一句话生成并上架一个业务应用；
- **第二个爆点**：上传照片生成可交互数字人/场景；
- **护城河**：ContextOS 真实运行链路 + 分身数据资产 + 场景/技能生态。

---

# 九、开发与运行

```bash
# 插件目录
cd usr/dsh-plugins/dsh-contextos-devops

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
| `CTX_DEVOPS_STATE` | `$DSH_HOME/dsh-contextos-devops` | 插件状态 |
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


## 5. 前端工程化（已完成）

拆分已落地：`src/client/parts/*.js`（24 片段）由 `build/client.mjs` 拼成 `client.js`，
样式拆为 `tokens/main/kit.css`。当前结构与行数见 [CODE-INDEX.md](CODE-INDEX.md)，
边界规则见 [ARCHITECTURE.md](ARCHITECTURE.md) §5/§7。


## 6. License / 第三方

发布前需补充项目 LICENSE 与 `THIRD_PARTY_NOTICES`，至少覆盖 Three.js、Leaflet、xterm.js、Monaco 及腾讯地图瓦片使用条款。

