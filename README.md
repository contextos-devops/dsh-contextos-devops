# ContextOS DevOps

<img src="icon.svg" width="72" align="left" hspace="12" vspace="4" alt="ContextOS DevOps">

**把 ContextOS 的节点、空间、应用、分身、赛博世界装进 DeepSeek Harness 的对话界面。**
一句话部署节点，一句话生成应用，一句话写数据——每一步都能在界面上看见、点动、回读验证。

<p>
  <img alt="version" src="https://img.shields.io/badge/version-1.48.1-0a8fb0">
  <img alt="ops" src="https://img.shields.io/badge/ops-102-0a8fb0">
  <img alt="gates" src="https://img.shields.io/badge/build%20gates-9-0a8fb0">
  <img alt="client" src="https://img.shields.io/badge/client-24%20parts-0a8fb0">
  <img alt="license" src="https://img.shields.io/badge/license-private-6b7f8c">
</p>

---

## 为什么

ContextOS 的核心是三纲五常：**集群化部署**让设备互联互通，**模块化开发**让代码自动生成，**自动化应用**让数据自由流动；五常是代码、文档、会话、团队、市场。

这个插件把这三件事搬进对话：你说「部署 9188 节点」，节点就起来了；你说「生成一个审批系统」，模板、五个功能、编译、实例、商店卡片一次到位。**不靠记忆命令，靠说清楚意图。**

---

## 能力矩阵

| 域 | 你能做什么 |
| --- | --- |
| **节点** | 部署（copy / download / source）、启动、停止、编译时间与体积、运行环境、命令终端、卡片菜单 |
| **项目空间** | 创建（可指定代码库）、编译、启停、go.work 自动登记、打开首页 |
| **应用** | 生成模板（AI 调研五个功能）→ 确认 → 编译 → 创建实例 → 打开界面 |
| **数据** | 添加 / 列表 / 详情 / 修改 / 删除，全部走五种标准 URL，回读校验 |
| **代码生成** | 加动作、加字段、条件按钮、模块骨架；两类模块（内存 / 数据库）都按框架规范生成 |
| **数字分身** | 分身与赛博世界、项目管理（目标→计划→任务→报告→反馈）、地图与甘特 |
| **监控** | Grafana 式看板：任意面板 + 数据源（节点 + 空间 + 命令 + 参数）、iframe 内嵌 |
| **对话** | 三种工作模式（数字分身 / 软件工厂 / 物联）各自限定能力，写操作先出确认表单 |

---

## 快速开始（60 秒上手）

### 前置

- DeepSeek Harness 桌面版（本插件以 local bundle 方式 `link:` 安装）
- Node.js 20+
- 一个可用的 ContextOS 节点（可选；插件可以自己部署）

### 安装

```sh
cd usr/dsh-plugins/contextos-devops-dsh
npm run build:client          # 构建 + 10 道门禁，必须全绿
```

然后在 DSH 里启用插件，重载后打开 **ContextOS DevOps**：

```js
plugin_manager({ action: 'set_plugin', target: 'include:contextos-devops-dsh', enabled: true })
```

### 第一次对话

```
部署 9188 节点
创建项目空间 demo
生成应用模板「员工管理」
创建「员工管理」实例
给「员工管理」添加数据：张三 / 研发部
```

每一步都会返回一张可点击的卡片或表单，不用记 URL。

---

## 三种工作模式

| 模式 | 能做 | 不能做 |
| --- | --- | --- |
| **数字分身** `avatar` | 创建应用实例、读写业务数据、查最近应用 | 生成代码、部署节点 |
| **软件工厂** `factory` | 部署节点、建空间、生成模板与代码、编译上线 | 读写业务数据、查最近应用 |
| **物联** `iot` | 扫描 / 连接 / 控制设备 | 业务数据、代码生成 |

模式在**调用模型之前**就完成短路，不把「该不该做」交给模型判断。

---

## 架构

```
┌──────────────────── DeepSeek Harness ────────────────────┐
│  Web GUI  ──  src/client/parts/*.js  (24 片段)            │
│                 │  api(op, args)                          │
│                 ▼                                         │
│  index.js  ──  lib/core/ops.js  (102 个 op, 唯一注册处)    │
│                 │                                         │
│                 ▼                                         │
│  lib/core/*.js  ──  lib/base/*.js  ──  ContextOS HTTP     │
└───────────────────────────────────────────────────────────┘
                          │
                          ▼
        ┌──────────── ContextOS ────────────┐
        │ 节点 /c/...      空间 /s/<pod>/... │
        │ 门户 /s/<pod>/c/<portal>/action/...│
        └────────────────────────────────────┘
```

- **一条请求**：组件 → `api(op)` → `ops.js` 分发 → `lib/core` → ContextOS → 回执 → 卡片/表单/表格。
- **一条命令五种形态**：网页 URL、接口 URL、内部 CMD、命令 CLI、会话 MCP，详见 [`docs/INTERFACE.md`](docs/INTERFACE.md)。
- **URL 单一来源**：`lib/base/url.js` 与客户端的 `cxWebUrl`，禁止手拼。

---

## 目录

```
.
├── index.js               # 宿主入口：只做查表分发，不写业务分支
├── lib/
│   ├── base/              # http / url / registry / 状态目录
│   └── core/              # ops 注册 + 各域实现（nodes/spaces/apps/data/codegen/…）
├── src/client/
│   ├── parts/             # 24 个片段 → build/client.mjs → client.js
│   └── styles/            # tokens / main / kit → assets/client.css
├── docs/                  # 入口 docs/INDEX.md
├── scripts/               # 构建与 10 道门禁
└── build/client.mjs       # 唯一的打包入口
```

`client.js` 与 `assets/client.css` 是**构建产物**，不要手改。

---

## 开发

```sh
npm run build:client    # 构建 + 全部门禁
npm run verify:ui       # 真浏览器验收（需 Edge CDP 9223），exit 0 才算过
npm run check:docs      # 文档索引 / 链接 / 生成物一致
```

构建链（10 道）：

```
gate → load-check → hook-order-check → op-check → store-check
     → ui-check → ui-probe → i18n-check → context-check → docs-check
```

| 命令 | 检查什么 |
| --- | --- |
| `check:ops` | op 必须注册在 `ops.js`，`index.js` 不许出现 `if (op === …)` |
| `check:store` | 持久化状态必须走 `08-store.js` 的 schema |
| `check:ui` | 字号 / 图标 / 控件尺寸 / 禁用写法 |
| `check:probe` | 无头浏览器渲染 fixture：消息三行结构、工具条对齐、折叠态高度 |
| `check:docs` | 文档索引覆盖、链接可解析、生成物不过期 |
| `verify:ui` | 真开浏览器：结构、尺寸、下拉、本地化、控制台无报错 |

**改宿主必须重载插件**（`lib/`、`index.js`）；只改客户端刷新页面即可。

---

## 文档

| 文档 | 读它做什么 |
| --- | --- |
| [`docs/INDEX.md`](docs/INDEX.md) | **唯一入口**：按任务查表 |
| [`docs/DOCTRINE.md`](docs/DOCTRINE.md) | 三纲五常、每轮四件套、抽象递减 |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | 分层与模块边界 |
| [`docs/CODE-GEN.md`](docs/CODE-GEN.md) | 代码生成规范：两类模块、词表、参数文法、权限 |
| [`docs/INTERFACE.md`](docs/INTERFACE.md) | 一条命令五种形态、两层能力、三种认证 |
| [`docs/URL-SPEC.md`](docs/URL-SPEC.md) | 接口 URL / 网页 URL 形状与禁止清单 |
| [`docs/AI-CONVERSATION.md`](docs/AI-CONVERSATION.md) | 对话请求参数、动作表、已知缺口 |
| [`docs/ACCEPTANCE.md`](docs/ACCEPTANCE.md) | 验收标准与证据要求 |
| [`AGENTS.md`](AGENTS.md) | 给 AI 的工作契约（铁律、工作流、对话流程） |

---

## 状态

- **稳定**：节点 / 空间 / 应用 / 数据 CRUD / 代码生成 / 监控看板 / 三种模式对话。
- **已知限制**：见 [`docs/RSI-LEDGER.md`](docs/RSI-LEDGER.md) 的未闭环项（网页标签会话隔离、远程节点凭证续期、监控无历史数据）。
- **版本**：以 `package.json` 为准，每次改动必 bump（客户端缓存键）。

---

## 给智能体（Agent）

这个插件本身就是给智能体用的：

- **外部智能体**（DSH 代理）可以直接调 15 个 `contextos_*` 工具：部署节点、建空间、建应用、读写数据、跑流水线。
- **插件内 Copilot** 走 `POST /api?op=chat`：客户端按模式短路 → 宿主拼 prompt → 返回 `{reply, action}` → 执行并渲染。
- 两者共用同一套约束：每轮走完 **RSI 循环**（目标 → 计划 → 取证 → 改动 → 构建 → 实测 → 抽象 → 报告），并留下四件套（代码 / 文档 / 门禁 / 规范）。

契约见 [`AGENTS.md`](AGENTS.md)，动作协议见 [`docs/AI-CONVERSATION.md`](docs/AI-CONVERSATION.md)。

---

## 参与

1. 读 [`AGENTS.md`](AGENTS.md) 与 [`docs/INDEX.md`](docs/INDEX.md)。
2. 每轮四件套：**代码 + 文档 + 门禁 + 规范**，缺一不算完成。
3. 提交前：`npm run build:client` 全绿、`git status` 只含本轮文件、报告落 `usr/local/WorkBuddy/dsh-reports/`。

---

## 许可

私有项目，未附开源协议文件；未经授权请勿分发。
