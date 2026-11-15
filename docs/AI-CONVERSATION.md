# AI 会话：请求参数、上下文与可执行动作


> 读这份当：改 Copilot 对话链路、动作协议或上下文注入。
> 不读这份当 → 实现 → `../lib/core/copilot.js`；产品设计 → `PRODUCT-DESIGN.md`
> 一句话：**一次对话 = 一次 `{message, history, context, mode}` → `{reply, action, actions}` 的往返**；客户端先尝试本地直执（读写应用数据），失败或非数据类意图才交给模型。

## 一、请求流程

```
用户输入
  │
  ├─ 0. 前置短路（不调模型）
  │    avatar 模式 + 写意图（添加/录入/新增/写入/加一条/新建一条/创建/发起/提交/报批）
  │      → appOp({text, mode:'write'})：resolveWrite 定位应用/功能 → appFields 取字段 → 消息区表单
  │    avatar 模式 + 读意图（查看/查询/列出/统计/多少条…）且含数据词（数据/记录/列表/明细/清单…）
  │      → appOp({text, mode:'read'})：readData → 消息区表格
  │    成功即结束本轮，不再请求模型
  │
  ├─ 1. 组装请求
  │    POST /api?op=chat   { message, history[≤8], context, mode }
  │
  ├─ 2. 宿主拼 prompt（lib/core/copilot.js）
  │    system 规则（按 mode 追加）＋ Current context（JSON，截断 6000 字）
  │    ＋ HISTORY（最近 8 条，截断）＋ USER（截断 2000 字）
  │
  ├─ 3. 模型返回
  │    {"reply":"…","action":{op,args}}   或   {"reply":"…","actions":[…]}
  │
  └─ 4. 客户端执行
       executeAction(op,args) → 本地 UI 动作 或 api(<op>) → 宿主 → 节点/空间 HTTP
       每条结果推入消息区（step/表格/表单/实体卡/工具条）
```

## 二、请求参数

| 参数 | 类型 | 说明 |
|---|---|---|
| `message` | string | 本轮用户原话（附件以「附件：a,b」追加） |
| `history` | array | 最近 8 条 `{role:'user'\|'ai', text}`，仅文本 |
| `mode` | string | `avatar` / `factory` / `iot` |
| `context` | object | 见下表；宿主序列化后截断 6000 字符放进 prompt |

### context 字段（单一命名，不设别名）

| 字段 | 内容 | 用途 |
|---|---|---|
| `mode` | `avatar` / `factory` / `iot` | 决定允许的动作集 |
| `view` | `chat` / `manage` / `dev` / `monitor` | 「这个界面」指代 |
| `node` | 当前服务节点端口 | 部署、空间、实例操作 |
| `space` | 当前项目空间名 | 同上 |
| `app` | 当前应用实例 `{name,title,command,space,place,place_uid}` | 读写数据的默认目标 |
| `avatar` | `{name,uid,city,company,persona,preferences,style,skills[]}` | 实例归属、身份、城市/公司默认值 |
| `scene` | `{id,name,theme,language,timezone,location}` | 渲染主题、语言、时区、城市级回答 |
| `web` | `{url,title}` 当前网页标签 | 「这个页面」指代 |
| `editor` | `{node,space,path,language,dirty,content(≤1500字)}` | 「这个文件」指代 |
| `experience` | `{sound,light,color,style}` | 特效/音效偏好 |
| `functions` | `{target,plan,task,report,feedback}` 各 `{uid,title,content,status}` | 项目五功能的默认父级与 item_uid |
| `nodes` | `[{port,name,state,env}]` | 已部署节点列表 |
| `spaces` | `[{name,status}]` | 当前节点的空间列表 |
| `apps` | `[{name,title,command}]` | 最近应用（为空时用 `api('apps')` 现取） |

> 早期版本同时带 `selection`、`serve`/`pod`/`place`、`background` 等别名，内容与上表完全重复，已删除（v1.45.90）。现在一个概念只有一个字段名。

## 三、三种工作模式

| | 数字分身 avatar | 软件工厂 factory | 赛博世界 iot |
|---|---|---|---|
| 上下文侧重点 | `avatar`、`apps`、`place`、`functions` | `serve`、`spaces`、`apps` | `scene`、`devices` |
| 允许动作 | 创建实例、读写数据、项目五功能 | 部署节点、建空间、生成模板/代码、编译 | 扫描/连接/控制设备、切换场景、系统控制 |
| 明确禁止 | 部署节点、建空间、生成代码 | **`data`（读写业务数据）**、查最近应用 | 部署节点、业务数据 |
| 前置短路 | 写意图→表单；读意图→表格 | 无（都走模型） | 无 |
| 典型说法 | 「创建员工管理」「给审批流加一条数据」 | 「创建空间 demo」「生成员工管理」 | 「扫描附近蓝牙设备」 |

## 四、可执行动作（客户端 `executeAction`）

| op | 参数 | 行为 |
|---|---|---|
| `deploy` | `{port}` | 部署服务节点（`contextos_deploy_node`） |
| `officialSpaces` | `{keys[]}` | 一键部署官方空间 |
| `createSpace` | `{name,repos?}` | 弹确认表单 → 建空间 + git init + 加入 go.work + 切当前空间 |
| `initSpace` | `{space,repos?}` | 初始化空间源码（git clone / 空仓库） |
| `autogenApp` | `{name,help,place,value,trans,space}` | 调云社区 `service autogen` 生成模板并编译 |
| `createApp` / `generateAppCode` | `{name,help?}` | 走 AI 五功能调研 → 确认表单 → autogen |
| `createInstance` | `{space,command,name,city,company}` | 弹实例确认表单 → `placeCreate` → 访问实例（写最近应用） |
| `buildSpace` | `{space}` | `POST /c/dream/action/build` + 重启 |
| `openApp` / `openNode` | `{space,name}` / `{port}` | 打开网页标签 |
| `listApps` / `storeApps` | `{}` | 最近应用 / 应用商店 |
| `createStoreInstance` | `{command,name?}` | 商店模板 → 实例确认表单 |
| `code` | `{name}` | 打开编程工具 |
| `pmCreate` / `pmModify` / `pmRemove` / `pmList` / `pmAct` | 项目五功能 | 目标/计划/任务/报告/反馈 CRUD |
| `projectStatus` / `planProject` | `{}` / `{goal}` | 项目总览 / 拆解目标 |
| `createAvatar` | `{name,city,company,persona,…}` | 新建数字分身 |
| `devices` | `{}` | 扫描周边设备 |
| `sshHosts` | `{}` | SSH 服务/主机清单 |
| `sysControl` | `{action,value}` | 音量/静音/剪贴板/截图/打开/网络/睡眠/锁屏/壁纸/快捷键 |
| `data` / `writeData` | `{space,command,text}` | 写应用数据（仅 avatar） |

## 五、宿主工具（`index.js` 的 op，共 93 个）

- **基础设施**：`health` `freePort` `nodes` `refreshNodes` `deploy` `dockerDeploy` `remoteDeploy` `remoteLogin` `nodeAuth` `openTerminal` `nodeTerminal` `compile`
- **空间**：`spaces` `createSpace` `initSpace` `buildSpace` `spaceStart` `spaceStop` `spaceReady` `spaceDir` `spaceOpen` `spaceTerminal` `deleteSpace` `storageCheck`
- **应用**：`apps` `storeApps` `storeAction` `createStoreInstance` `createInstance` `autogenApp` `autogenSpec` `appPlan` `appFields` `nameCheck` `resolveWrite` `ensureProject` `planProject` `projectStatus`
- **数据**：`readData` `writeData` `removeData` `fieldOptions` `commandStyle` `monitorQuery`
- **项目五功能**：`pmList` `pmTree` `pmCreate` `pmModify` `pmRemove` `pmDelete` `pmAct` `pmLog`
- **身份/主体**：`avatars` `createAvatar` `updateAvatar` `deleteAvatar` `setAvatar` `users` `stateGet` `stateSet` `iamList` `iamCall` `iamEndpoints` `iamSubjects`
- **文件/代码**：`files` `tree` `listDir` `readFile` `writeFile` `mkdir` `renamePath` `removePath` `file`
- **备份/采样**：`backupSpace` `backups` `sampleNodes`
- **其它**：`backgrounds` `createBackground` `setBackground` `updateBackground` `deleteBackground` `llmInfo` `pipeline` `chat` `clientError` `sysControl` `sshHosts` `devices`

## 六、失败与回执

| 现象 | 含义 |
|---|---|
| 模型只回文字、不返回 action | prompt 里参数没给全（见 `data args` 历史 bug）；客户端有正则兜底，但正解是补 prompt |
| `count 0x0` | 命令执行了但没数据 |
| 响应体含 `detail` 且无 `index/help/meta` | 命令未注册（空间没编译完 / 进程是旧二进制） |
| `warn: not allow` | 动作不存在或无权限（不是「参数错」） |
| 客户端「执行失败：…」 | `executeAction` 抛错，错误原文透出 |

## 七、已知缺口

1. `history` 只带文本，不带上一轮的动作与结果 → 多轮「继续」容易重复执行；
2. `context` 截断 6000 字符，`apps`/`nodes` 很长时会被截掉尾部；
3. 没有工具调用的结构化回执（没有 tool_call id / 结果回灌），模型看不到执行结果；
4. iot 模式的设备控制没有「先问再做」的白名单，睡眠/锁屏靠 prompt 约束。
