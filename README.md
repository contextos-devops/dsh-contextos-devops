# ContextOS DevOps（DSH 插件）

把 ContextOS 的 **集群化部署 → 项目空间 → 应用生成 → 数据** 做成一块科技风控制台 + 模型工具。
界面按 `SPEC-FLOW.md`、`SPEC-CICD.md`、`USER-FLOW.md` 的真实链路组织，不另造一套 API。

## 三块核心逻辑

```text
01 CLUSTER      02 WORKSPACE        03 APPLICATIONS
服务节点    →   项目空间       →    应用列表
部署/启停       创建 + git init       service/autogen
健康/端口       编译/打开            列表/数据/打开
```

## 界面

- **顶栏**：`CONTEXTOS // DEVOPS`，CLUSTER / MODULES / AUTOMATION 三枚状态；
- **流水线**：`01 CLUSTER › 02 WORKSPACE › 03 APPLICATIONS`，选中哪一级亮哪一级；
- **四栏**：
  1. **服务节点**：状态灯、端口、角色、SIZE；运行中 `STOP/HOME`，已停止 `START/DEL`；`+ DEPLOY`；
  2. **项目空间**：状态/版本/体积；运行中 `STOP/OPEN`，已停止 `START/DEL`；`+ WORKSPACE`；底部“一键部署官方空间”多选（云社区/云办公/云研发/云知识/云教育/云健康/云文旅/云公益/云工业/云农业）；
  3. **RECENT / 节点最近应用**：查该节点 `gonganxitong.recent`；行内**只有 OPEN**；第二行显示 `city_name · company_name · service_name`；创建实例后自动选中新实例；工具栏 `应用商店` 进入 `web.team.gonganxitong.service`；商店页工具栏有 `+ 模板`，点任一服务弹出城市/公司/应用名对话框，创建成功后返回 recent；
  4. **WEB / 网页界面**：多标签 iframe；`+` 开节点首页；**无工具栏**，每个标签的 `⋯` 菜单含：关闭、关闭其它标签、关闭全部标签、刷新、外部打开；应用标签还含编辑代码/添加数据/创建实例；
- **底部 ACTIVITY**：每次操作的逐步日志（`→` 开始、`✓` 成功、`✗` 失败），200 不算成功；
- **底部 DEBUG / URL**：每个操作的 DSH API 请求体 + 后端真实 ContextOS HTTP 方法/完整 URL（含 `user.uid` 与参数）；打开网页也记录 `OPEN <url>`；
- 深色网格 + 青色扫描线 + 等宽字体；不依赖外部 UI 库；右侧 PREVIEW 栏内嵌应用网页，点击实例即开。

## UI 文案强制规范

**所有标题、按钮、菜单、弹窗标题一律「中文在前、英文在后」**，中间用 ` / ` 分隔：

- 正确：`场景设置 / SCENE`、`修改分身 / AVATAR`、`初始化 / INITIALIZE`、`部署服务节点 / DEPLOY NODE`
- 错误：`SCENE / 场景设置`、`AVATAR / 修改分身`

例外：纯英文品牌名（`CONTEXTOS COPILOT`、`AI NATIVE OPERATING SYSTEM`）与数据值（空间名、端口、命令名）不受此限。新增文案必须遵守，评审按此条检查。

## 主题

统一使用字体/表面/边框/文本语义变量（`--cx-surface-*`、`--cx-text-*`、`--cx-border*`），深色和浅色共用一套布局。状态/类型翻译由 `/s/<pod>/c/web.team.xiangmuguanli.target` 的 `_trans` 元数据提供（浏览器 UA），并缓存 60 秒。顶部提供语言（中文/English/跟随系统）与主题（浅色/深色/跟随系统）切换，默认跟随系统。

默认跟随系统 `prefers-color-scheme`：

- 系统浅色 → 浅色主题；
- 系统深色 → 深色主题；
- 监听系统切换实时更新，无需刷新。

## 初始化与视图

**默认全屏 AI 对话**：进入插件先看到占满屏幕的 Copilot；输入框默认三行高，底栏采用等距网格对齐（小屏自动多行：左侧 SERVE/SPACE/PLACE 换行，右侧 AVATAR/MODE/发送整组靠右），依次为 `+ 添加文件 / SERVE / SPACE / PLACE / AVATAR / MODE / ↑ 发送`，底部输出合并为 ACTIVITY/DEBUG 标签页（可拖拽调高、+/− 调整、关闭/重开）；前三栏去掉类型标签，工具栏左过滤、右创建/刷新；左侧菜单左对齐；数据操作靠右同高；网页标签菜单不再被裁切；网页标签统一高度自适应宽度；四栏自适应且网页栏优先变宽；项目空间标题显示 help + name。左侧为 SERVE/SPACE/PLACE，右侧为 AVATAR/MODE；未选择时只显示字段名（SERVE/SPACE/PLACE/AVATAR），选中后只显示内容；选择器宽度随内容自适应，最大 220px；所有下拉菜单向上弹出；标题栏使用内层 1080px 容器与输入框对齐，标题单行不换行；消息区支持 Markdown（标题/列表/引用/代码块/行内代码/链接）、角色/时间/复制/系统状态行；女机器人参考图 3D 卡片（拖拽倾斜/滚轮缩放/点击能量脉冲/HUD/环绕粒子）+ 深圳地标数字城市 + 右下角任务地图（平安金融中心/KK100/春笋/腾讯滨海/地王，鼠标视差/拖拽/Shift+滚轮）/地球科技背景在有消息时仍显示；空消息时额外显示提示；输入框上方有一行当前模式提示，右侧 `更多` 展开三张产品逻辑卡（数字分身/软件工厂/赛博世界）；点 `工作台` 切换到四栏管理视图，点 `全屏` 切回。

首次进入（localStorage 未标记）弹出初始化表单：

```text
源码地址  [https://shylinux.com/x/ContextOS]
部署目录  [~/ContextOS-9188]
端口      [9188]
[初始化]
```

- 留空/不改 = 默认值；
- 输入源码地址后，目录自动跟随仓库名（例如 `/x/community` → `~/community`）；
- 点 `初始化` 才执行，完成后同一位置变成 `进入`；
- 步骤：部署节点 → 云社区 → 云办公 → 创建数字分身；
- 初始化过程用 `InitOverlay` 展示每一步 `wait/run/done/err` 和详情；
- 云社区/云办公部署完成后会 `GET /s/<space>/` 打开首页，触发数据库初始化，应用商店才能出列表；
- 创建分身时自动在云办公创建 `项目管理` 实例，用于存目标/计划/任务/报告/反馈；
- 成功后写入 `localStorage['contextos-devops:init']=1`，失败保留错误并可重试；
- 顶栏/对话头部 `INIT` 可随时重新打开初始化表单；
- 已有同端口节点时复用；端口不可用时回退到现有节点。

## AI COPILOT（三种模式）

右下角 **AI** 打开对话框，顶部切换三种模式：

| 模式 | 主要动作 |
|---|---|
| **数字分身** | 应用商店 `storeApps` / `createStoreInstance` 创建应用；最近应用 `listApps` / `data` 加数据 |
| **软件工厂** | `deploy` 节点、`createSpace` / `officialSpaces` 空间、`autogenApp` 模板、`code` 代码 |
| **赛博世界** | 场景切换、背景与虚拟环境参数；设备发现作为辅助能力 |

每种模式只把对应动作作为首选，当前节点/空间/应用实例始终随 context 传给模型。

| # | 你说 | 它做什么 |
|---|---|---|
| ① | `部署 9188 节点` | `deploy(copy)` → 刷新节点 → 选中新节点 |
| ② | `创建空间 demo` | `createSpace` → `initSpace?remote=` → 选中空间 |
| ③ | `生成员工管理` | `autogenApp` → `go work use` → `vimer compile` |
| ④ | `修改应用代码` | `code` → 打开 CODE 编辑器（读写 `src/<app>/*.go,json,js`） |
| ⑤ | `创建实例 员工测试` | `createInstance` → `placeCreate` → 补 recent 行 |
| ⑥ | `添加数据 张三` | `data` → 选 function → 写后回读 |
| — | `最近应用` | 当前节点 `gonganxitong.recent`，按 `updated` 倒序 |
| — | `帮助` | 六步提示 |

意图层直接走 **DSH `ctx.llm.stream`**：模型返回 `{reply, action}`，插件只执行白名单动作；
动作仍走真实 `/contextos-devops/api`。每次对话都把当前 `node/space/app`（含 space/place_uid/command）作为 context 传给模型，
提示词要求“当前选中项直接操作，不再让用户重复指定”。DSH 没有可用模型时明确报错，不回退本地正则。

## 十个标准空间

```text
community   云社区   20240724-community
enterprise  云办公   20240724-enterprise
operation   云研发   20240903-operation
knowledge   云知识   20250520-knowledge
education   云教育   20240724-education
healthy     云健康   20250520-healthy
tourism     云文旅   20250520-tourism
charity     云公益   20250520-charity
industry    云工业   20250520-industry
agriculture 云农业   20250520-agriculture
```

标准空间的日期前缀是固定的（20240724 / 20240903 / 20250520），不是部署当天；
`officialSpaces` 只复用完全同名的空间，不会把今天的日期前缀当成标准空间。

AI 对话直接说“部署云办公”“部署云社区和云研发”，会走 `officialSpaces`，不再当成普通 `createSpace`；创建出的空间名保持上表的固定日期前缀。

## 项目管理对话

全屏对话以“计划”为会话单元：

- 初始化完成（节点 + 云社区/云办公 + 数字分身 + 项目管理）后才可对话；
- 左侧：目标列表、当前目标下的计划列表；
- 点击目标 → 切换计划列表；
- 点击计划 → 切换会话，消息按 `${avatar.uid}:${plan.uid}` 持久化；
- 右侧：当前计划的任务、当前任务的报告、当前报告的反馈；
- 每次请求携带 `context.functions {target,plan,task,report,feedback}`，AI 用它们补全未指定的 UID；
- 说“添加/修改/删除/查看目标/计划/任务/报告/反馈”时，AI 使用内置 PM Skill 调用 `pmList/pmCreate/pmModify/pmRemove`，完成后刷新左右栏；也可以点各栏的 `+ / ✎ / ×` 手动操作。

API：

| op | 参数 | 说明 |
|---|---|---|
| `pmList` | `node`, `uid` | 目标/计划/任务/报告/反馈树 |
| `pmCreate` | `node`, `uid`, `kind`, parent uids, `title`, `content` | 建五类数据 |
| `pmModify` | `node`, `uid`, `kind`, `item_uid`, fields | 修改目标/计划/任务/报告/反馈 |
| `pmRemove` | `node`, `uid`, `kind`, `item_uid` | 删除目标/计划/任务/报告/反馈 |

## 项目管理链路（源码分析）

来源：`usr/local/work/20240724-enterprise/src/xiangmuguanli/`。

| 层 | 命令 | 状态/约束 |
|---|---|---|
| 目标 | `target` | 无 status；有计划后不能删目标 |
| 计划 | `plan` | created → submited → approved → process → finished/canceled；`taskCreate` 只在 process |
| 任务 | `task` | created → process → finished；`reportCreate` 只在 process；`finish` 要求反馈 `canFinish` |
| 报告 | `report` | 无 status；`feedbackCreate` 只在任务 process；有反馈后不能改/删报告 |
| 反馈 | `feedback` | `canFinish` / `shouldImprove`；`canFinish` 是任务完成的前置 |

正确级联（`uid` 是上一层的 UID）：

```text
target/action/create
  → target uid
target/action/planCreate?uid=<target_uid>
  → plan uid
plan/action/taskCreate?uid=<plan_uid>
  → task uid
task/action/reportCreate?uid=<task_uid>
  → report uid
report/action/feedbackCreate?uid=<report_uid>
```

状态流转：

```text
plan: created/submited --submit--> approved --process--> process
task: created --process--> process --reportCreate--> report
feedback: canFinish --> 允许 task finish
```

AI 对话：

- 用户给目标 → `planProject {goal}`；
- AI 先补齐：目标、计划起止时间、任务清单、报告/反馈要求；
- 后端按上述级联写五类记录；
- 提示词要求 plan 到 process、task 到 process 才能继续。

## 数字分身项目（自动创建）

创建分身时自动：

```text
createAvatar
→ createProjectForAvatar
→ 20240724-enterprise / web.team.xiangmuguanli.portal
→ 项目名：<分身名> 的项目管理
→ 写入 avatar.project {space, command, place_uid, name}
```

项目管理里五类数据：

```text
目标 target → 计划 plan → 任务 task → 报告 report → 反馈 feedback
```

- AI 动作 `planProject {goal}`：用 DSH 模型拆解目标，写入五类记录；
- AI 动作 `projectStatus {}`：读取五类计数；API 过滤为 0 时回退到空间 SQLite 统计，避免“有数据但显示 0x0”；
- 前端每 60 秒检查一次：任务数 > 报告数时，在 ACTIVITY 里提醒“去完成任务并提交报告”；
- 提醒是本地 UI 检查，不依赖后台守护进程；插件关闭后不提醒。

## 数字分身（多用户）

顶栏 `AVATAR` 打开分身管理：

- 每个分身有独立 `user.uid`、公司、城市、人格、喜好、风格；
- 可创建多个分身，点击选择当前分身；
- 创建采用对话式向导，逐个询问：名字 → 城市 → 公司 → 人格 → 喜好 → 风格；
- `user.uid` 持久化在 `$DSH_HOME/contextos-devops/avatars.json`；
- 最近应用按当前分身查询；
- 服务商店上架/下架/编程/配置；创建应用实例时，默认带当前分身的 `uid/city/company`，弹窗可改。

API：

| op | 参数 | 说明 |
|---|---|---|
| `avatars` | `node` | 分身列表 + active |
| `createAvatar` | `node`, `name`, `city`, `company`, `persona`, `preferences`, `style` | 新建分身用户 |
| `updateAvatar` | `node`, `uid`, `patch` | 修改人格/喜好/风格 |
| `setAvatar` | `node`, `uid` | 切换当前分身 |
| `deleteAvatar` | `node`, `uid` | 移除分身记录（不删系统用户） |
| `planProject` | `node`, `uid`, `goal` | AI 拆解目标/计划/任务/报告/反馈 |
| `projectStatus` | `node`, `uid` | 五类计数/进度 |

## 周边设备发现（赛博世界 · 辅助能力）

| 通道 | 实现 | 当前状态 |
|---|---|---|
| ContextOS 节点 | 节点台账 + pid/HTTP | 可发现，可打开/管理 |
| WiFi / 局域网 | `/usr/sbin/arp -a` | 发现 IP/MAC |
| 蓝牙 | macOS `system_profiler SPBluetoothDataType -json`；Linux `bluetoothctl devices` | 发现已配对/周边设备 |
| 红外 | 预留 IR 适配层 | 当前宿主无红外适配器 |

- 后端 `devices` op 返回 `{adapters, devices}`；
- 集群栏 `DEVICES` 打开周边设备列表；
- 赛博世界 AI 模式说“发现设备”会调用 `devices`；说“切换场景/设置场景”会操作场景与参数；
- 目前只有 ContextOS 节点标记 `controllable:true`；WiFi/蓝牙/红外目前是**发现层**，控制适配器后续接入，不假装能控。

## 六步功能

| # | 功能 | 入口 | 实现 |
|---|---|---|---|
| 1 | 部署服务节点 | `+ NODE` | copy/download/source → `forever start` → `/c/version`；默认名 `ContextOS-<port>`；运行 `STOP/HOME`，停止 `START/DEL` |
| 2 | 创建项目空间 | `+ WORKSPACE` | `dream create`（不带 repos）→ `git.status init?remote=`；运行 `STOP/OPEN`，停止 `START/DEL`；OPEN 无尾斜杠 |
| 3 | 生成应用模板 | `+ GENERATE` | 云社区 `service/autogen` → `portal.json` + 五角色 + 列表/创建 |
| 4 | 添加应用代码 | 应用详情 `CODE` | 读/写 `src/<app>/*.go,json,js`；`SAVE + BUILD` |
| 5 | 服务商店上架/下架/编程/配置；创建应用实例 | 应用详情 `INSTANCE` | `placeCreate`（city/company/instance）→ 刷新 recent |
| 6 | 添加应用数据 | 应用详情 `DATA` | 选 function → `create` → 回读 |

应用列表不再扫描目录，而是查**当前节点**的 recent：

```text
/s/20240724-community/c/web.team.gonganxitong.portal/action/run/web.team.gonganxitong.recent?user.uid=<uid>
```

- 每个节点首次请求时创建一个 `dsh_copilot_<port>` 用户，uid 持久化到
  `$DSH_HOME/contextos-devops/users.json`；
- 之后所有发往该节点的 HTTP 请求自动带 `user.uid`；
- 列表项带 `space/place_uid/updated_at`，`OPEN` 按行里的 space 打开。

## 关键链路

### 1. 本机部署节点

```text
+ NODE → copy / download / source
  → ./bin/ice.bin forever start [dev <parent>] port <port>
  → 校验 /c/version + /v/index.css
```

### 2. 创建项目空间（不指定 repos）

```text
+ WORKSPACE
  → PUT /c/dream/action/create?name=<name>
  → POST /s/<space>/c/web.code.git.status/action/init?remote=<node>/x/<short>
  → 生成 .git / src/main.go / go.mod / etc/miss.sh
```

`init` **必须带 `remote`**；不带时 0x0、不生成骨架。空间名只用字母/数字/下划线。

### 3. 生成应用（平台风格）

```text
+ GENERATE
  → POST /s/20240724-community/c/web.team.gonganxitong.service/action/autogen
       name/help/place/value/trans/space
  → src/<app>/portal.json + 五角色 + 列表/创建 + dashboard
  → go work use → buildSpace（compile + 重启）
```

默认示例：员工管理 `name=yuangong help=员工管理 place=employee`，六个功能
`profile,position,skill,experience,education,record`。

### 4. 添加数据

```text
DATA → 选择 FUNCTION → 填 title/content → WRITE + READ
  → PUT /s/<space>/c/web.team.<app>.<function>/action/create/...
  → 回读 count/columns/rows
```

字段值不能含半角 `/`（ContextOS 会当路径分隔符），直接报错。

## JSON API

```
POST /contextos-devops/api   {"op": "...", ...参数}
```

| op | 参数 | 说明 |
|---|---|---|
| `nodes` | — | 节点列表（磁盘扫描 + 台账 + 判活） |
| `deploy` | `port`, `mode`, `name?`, `parent?`, `repo?`, `sourceBin?` | 部署节点；默认名 `ContextOS-<port>` |
| `start` / `stop` | `port` | 节点启停 |
| `spaces` | `node` | 空间列表 |
| `createSpace` | `node`, `name`, `repos?` | 建空间 |
| `initSpace` | `node`, `space` | `git.status init`（带 remote） |
| `buildSpace` | `node`, `space` | 编译 + 重启 |
| `apps` | `node`, `uid?` | 当前节点 recent；`uid` 为当前分身，返回 space/place_uid/updated |
| — | — | 空间状态：按 `/c/dream` 表头列宽切分，取 `status` 列 `start/stop` |
| `storeApps` | `node` | `web.team.gonganxitong.service` 应用商店 |
| `createStoreInstance` | `node`, `service`, `name`, `city`, `company` | 从商店服务创建实例（三参数） |
| `officialSpaces` | `node`, `keys[]` | 一键部署十个标准空间；key 或中文名均可 |
| `deleteNode` / `deleteSpace` | `port` / `node,space` | 停止并删除目录/记录 |
| `createInstance` | `node`, `space`, `command`, `place?`, `name`, `city`, `company` | `placeCreate` 建实例 |
| `chat` | `message`, `history?`, `context?`, `provider?`, `model?` | DSH LLM 意图解析，返回 `{reply, action}` |
| `llmInfo` | — | 返回已挂载 provider/model，便于排查 |
| `autogenApp` | `node`, `space`, `name`, `help`, `place`, `value`, `trans` | 生成平台应用 |
| `createApp` | `node`, `space`, `name`, `zone?` | 通用 `vimer module`（旧） |
| `readData` / `writeData` / `removeData` | `node`, `space`, `command`, `fields?` | 数据 |
| `listDir` / `readFile` / `writeFile` | `node`, `space`, `path?` | 目录/文件 |
| `pipeline` | `port`, `space`, `app` | 端到端流水线 |

响应统一 `{"ok":true,"data":...}` 或 `{"ok":false,"error":"..."}`。

> DSH 后端有模块缓存：改完 `index.js` 需要重启 DSH 才加载新 op；客户端 `client.js`
> 可由 HMR 热换。若 `apps` 返回 `unknown op`，客户端会回退到 `listDir + readFile`
> 扫描 `portal.json`，至少应用列表不空。

## 节点台账

- 主台账 `~/.contextos/nodes.json`，与 macOS `CtxNodeRegistry` 同源；
- 字段 `dir/name/port/parent/platform/source/container/image/resident/env`；
- 每次列表先扫描 `~/ContextOS*`（含 `bin/ice.bin`），合并台账；
- 停止只停自己的 `var/log/ice.pid`，不 `pkill`。

## 环境变量

| 变量 | 默认 | 含义 |
|---|---|---|
| `CTX_ROOT` | `$HOME/ContextOS` | 主仓根 |
| `CTX_NODES_FILE` | `~/.contextos/nodes.json` | 节点台账 |
| `CTX_DEVOPS_STATE` | `$DSH_HOME/contextos-devops` | 插件状态/错误日志 |

## 实测与边界

- 节点默认名：`ContextOS-<port>`（自定义名若不带前缀也会补上）；
- 2026-11-05：9090 上 `dream create` → `git.status init?remote` → `autogen` 生成
  `yuangong`（员工管理）→ `go work use` → `vimer compile` 6.07s / 34M → 首页 200；
- 新空间 DB 迁移仍需在目标空间本地完成；`/s/` 的 migrate 可能被 ops 兜底，
  此时 `placeCreate` 会 `db.Table.Create` nil pointer（插件会在 ACTIVITY 里显示错误，不静默）；
- 未做：CICD 三节点发布编排（见 `SPEC-CICD.md`）、监控/备份。

## 安全边界

- 只操作台账 + 磁盘扫描出的节点/空间；端口先探测，已有 `bin/ice.bin` 拒绝覆盖；
- 路径防穿越（`path.resolve` 后必须仍在空间目录内）；
- 数据字段禁止 `/`；写后回读；
- 终端 WebSocket 仍为节点/空间目录的 PTY，不暴露任意 cwd。
