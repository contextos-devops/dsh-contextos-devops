# 文档索引 / INDEX

> 唯一入口：先在这里按「我现在要干什么」找到**一行**，只读那一份的**那一章**。
> 铁律：`../../../AGENTS.md`（平台）> `../../AGENTS.md`（插件）> 本目录任何文档。
> 本文件由 `scripts/docs-check.mjs` 校验：`docs/` 下每份 `.md` 必须在此登记，链接必须可解析。

## 一、开工三件套（每次对话，按顺序）

| 步骤 | 读什么 | 为什么 |
| --- | --- | --- |
| 1 | `../../AGENTS.md` §一 铁律、§二 工作流 | 不许改构建产物、必须 bump 版本、必须落报告 |
| 2 | `AI-CONTEXT.md` | 根规范路由 + 插件硬规则 + 迭代清单 |
| 3 | `INDEX.md`（本文件）对应行 | 只取本轮需要的那一章 |

## 二、按任务找文档

| 我要做的事 | 读这份 | 章节 |
| --- | --- | --- |
| 改界面：布局/组件/主题/图标/文字 | `DESIGN-SYSTEM.md`；根 `USER-VIEW.md` | 全册 / §〇–§三 |
| 新页面/新组件，别造第二套样式 | `DESIGN-SYSTEM.md`、`FORM-FIELDS.md` | 组件清单 / 字段形态 |
| 加接口、调接口、对报文 | `INTERFACE.md`、`URL-SPEC.md` | 五形态 / 两类 URL + 禁止清单 |
| 加一个 op（后端动作） | `../lib/core/ops.js` + `CODE-INDEX.md` §3 | 注册表 + 门禁 |
| 加一个要保存的状态 | `STATE.md` + `../src/client/parts/08-store.js` | 键表 / `CX_STORE_SCHEMA` |
| 写代码生成（factory 模式） | `CODE-GEN.md` | 两类模块 + 词表 + 权限 |
| 写项目管理（PM）逻辑 | `CODE-MAP.md`、`MEMORY.md` | 数据流/契约 / PM 约定 |
| 接 AI 对话 / 动作协议 | `AI-CONVERSATION.md` | 请求参数 + 动作表 + 已知缺口 |
| 接监控面板 | `MONITOR.md` | 面板可加、数据源可配 |
| 接权限/身份 | `IAM.md` | 角色与 user.uid |
| 部署/环境/DSH 本体机制 | `DSH-COS.md` | 宿主能力与边界 |
| 交付前验收 | `ACCEPTANCE.md` | L0–L3、证据表、UI 硬规则、可用性门禁 |
| 看产品全貌（对外讲） | `CONTEXTOS-SUMMARY.md` | 一页读懂 |
| 架构分层与目录职责 | `ARCHITECTURE.md` | 五层与边界 |
| 找某个文件/组件/op 在哪 | `CODE-INDEX.md`（生成） | §1–§6 |
| 复盘历史坑与决策 | `RSI-LEDGER.md` | 按日期 |
| 运行期最高法则（Copilot 也注入） | `RSI-CONSTITUTION.md` | 十二条 |

## 三、规范类（人写，会变）

| 文档 | 一句话 | 什么时候读 |
| --- | --- | --- |
| `ARCHITECTURE.md` | tokens / UI kit / PM 数据与卡片 / UID 契约 | 判断一层代码该放哪 |
| `DESIGN-SYSTEM.md` | 插件视觉与组件规范 | 任何界面改动 |
| `FORM-FIELDS.md` | 字段形态与表单渲染约定 | 新增/修改表单 |
| `INTERFACE.md` | 一条命令五种形态、两层能力、认证 | 接口设计/排障 |
| `URL-SPEC.md` | 接口 URL 与网页 URL 的形状、禁止清单 | 构造任何 URL 之前 |
| `CODE-GEN.md` | 代码生成规范（模块/词表/参数文法/权限） | factory 模式生成代码 |
| `CODE-MAP.md` | 数据流、文件职责、契约、改动路由 | 改 PM 或页面编排 |
| `AI-CONVERSATION.md` | 对话请求参数、动作表、已知缺口 | 改 Copilot 链路 |
| `AI-CONTEXT.md` | 根规范路由 + 插件硬规则 + 迭代清单 | 每次开工 |
| `MEMORY.md` | 项目长期记忆与 PM 契约 | 跨轮次决策依赖 |
| `MONITOR.md` | 监控面板与数据源 | 改监控视图 |
| `IAM.md` | 权限与身份模型 | 涉及 user.uid/角色 |
| `DSH-COS.md` | DSH 宿主能力与 ContextOS 的边界 | 判断能不能做到 |
| `CONTEXTOS-SUMMARY.md` | 产品全貌（对外讲） | 写材料/介绍 |
| `ACCEPTANCE.md` | 唯一验收口径：L0–L3 + 证据表 + UI 硬规则 + verify:ui | 说「完成」之前 |
| `RSI-CONSTITUTION.md` | 十二条运行期法则（注入 Copilot 提示词） | 任何 AI 对话 |
| `RSI-LEDGER.md` | 踩坑与决策台账 | 复盘/避免重复 |

## 四、生成物（脚本产出，勿手改）

| 文档 | 生成命令 | 内容 |
| --- | --- | --- |
| `CODE-INDEX.md` | `node scripts/docs-index.mjs --write` | 服务端/客户端/脚本/文档的文件-行数-导出索引、op 契约、存储概览 |
| `STATE.md` | 同上 | 浏览器 38 个存储键 + 服务端 state.json 9 项 |

`npm run check:docs` 会比对生成物是否与代码一致（不一致就红）。

## 五、文档治理（写新文档前先读）

1. **能加到现有文档的一章，就不新开文件**；新开必须在 §二/§三登记，否则 `check:docs` 判孤儿。
2. 一份真源：同一事实只写一处，其它地方给「文件 + 章节」指针（例如 `ACCEPTANCE.md §12`）。
3. 生成物不手改：改 `08-store.js`、`ops.js`、目录结构，再跑生成脚本。
4. 过时内容不删改历史叙述：在原文加「已废弃（日期）→ 见 XXX」并在 `RSI-LEDGER.md` 记一行。
5. 文档与代码同一次提交；`check:docs` + `check:context` 必须绿。
