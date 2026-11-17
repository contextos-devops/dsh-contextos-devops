# 文档索引 / INDEX

> 读这份当：每次开工，找「我该读哪一份的哪一章」。
> 不读这份当 → 流程与验收 → `../AGENTS.md`；症状排查 → `DIAGNOSTICS.md`。
>
> **唯一入口**：按「我现在要干什么」找到**一行**，只读那一份的**那一章**。
> 冲突优先级：根 `../../../AGENTS.md`（平台铁律）> 插件 `../AGENTS.md` > 本目录任何文档。
> 本文件由 `scripts/docs-check.mjs` 校验：孤儿文档、死链、生成物过期都会红。

## 〇、30 秒定位

| 加页面 / 组件 / 状态 / 接口 / 样式 / 动效 | `docs/EXTENDING.md`（先 `npm run new -- <kind> <Name>`） |
| 我要… | 读这一份 | 读哪一章 |
| --- | --- | --- |
| 知道自己该干什么、怎么算完成 | `../AGENTS.md` | §二 工作流程、§七 验收、§八 归纳 |
| 判断方向对不对 | `DOCTRINE.md` | 全册（104 行） |
| Copilot 每轮的最高法则 | `RSI-CONSTITUTION.md` | 全册（107 行） |
| 出问题了先查哪、先跑哪条命令 | `DIAGNOSTICS.md` | §一 症状表 |
| 找某个文件 / 组件 / op / 脚本 | `CODE-INDEX.md` | 按表查（生成物） |
| 查存了哪些状态 | `STATE.md` | 键表（生成物） |

## 一、开工三件套（每次对话，按顺序，别多读）

1. `../AGENTS.md` §〇 定位 + §二 八步流程 —— 本轮该怎么走。
2. `AI-CONTEXT.md` —— 根规范路由 + 插件硬规则（72 行，必读）。
3. 本文件「§二 任务路由」对应的一行 —— 只取那一章。

## 二、任务路由（一行一任务）

| 我要做的事 | 文档 | 章节 |
| --- | --- | --- |
| 统一界面/功能术语、沟通口径 | `GLOSSARY.md` | 全册（215 行） |
| 改界面：布局 / 组件 / 主题 / 图标 / 文字 | `DESIGN-SYSTEM.md` | 全册（276 行） |
| 改表单、字段取值 | `DESIGN-SYSTEM.md` | §18 表单取值 |
| 加 UI 回归断言 | `DESIGN-SYSTEM.md` | §19 UI 不变量 |
| 写新组件 / 加样式 | `DESIGN-SYSTEM.md` | §20 样式分层与结构原语 |
| 布局出问题（挤行 / 折叠过高 / 改了没变） | `DIAGNOSTICS.md` | §二 布局三条硬规则 |
| 接口 / 报文 / 五种形态 | `INTERFACE.md` | §1–§10；PM 排序看 §11 |
| 构造任何 URL 之前 | `URL-SPEC.md` | 全册（239 行） |
| 加一个 op（后端动作） | `../lib/core/ops.js` + `CODE-INDEX.md` | 注册表 + §3 |
| 加一个要保存的状态 | `STATE.md` + `08-store.js` | 键表 / `CX_STORE_SCHEMA` |
| 写代码生成（factory 模式） | `CODE-GEN.md` | 一–五；工厂实现要点看 §六 |
| 部署节点 / 选源码还是二进制 / 跨平台准备 | `INSTALL.md` | 全册（能力矩阵 + 平台表 + 验收） |
| 写项目管理（PM）逻辑 | `ARCHITECTURE.md` + `INTERFACE.md` | §5 唯一入口 / §11 状态与排序 |
| 接 AI 对话 / 动作协议 | `AI-CONVERSATION.md` | 全册（123 行） |
| 接监控面板 | `MONITOR.md` | 全册（79 行） |
| 权限 / 身份 | `IAM.md` | 全册（147 行） |
| DSH 宿主能力与边界 | `DSH-COS.md` | 全册（110 行） |
| 交付前验收 | `ACCEPTANCE.md` | L0–L3 + 证据表 |
| 对外讲产品 / 做方案 | `PRODUCT-DESIGN.md` | §0–§1.11；按章读表在开头 |
| 判断一层代码该放哪 | `ARCHITECTURE.md` | §1 五层、§8 模块归属 |

## 三、症状路由（先跑命令，再读文档）

| 症状 | 先跑 | 再读 |
| --- | --- | --- |
| 对外发布 / 上架市场 / 发 npm | `PUBLISH.md` | §1 选路径 · §2 提 PR |
| 插件不加载 / 白屏 | `npm run check:load` | `DIAGNOSTICS.md` §一 · `RSI-LEDGER` 11-15 |
| 改了样式界面没变 | `clientCheck` 的 `css` / `build` | `DIAGNOSTICS.md` §一 加载层 |
| 消息头与正文挤成两栏 | `npm run check:probe -- --case msg-card` | `DIAGNOSTICS.md` §二.1–.2 |
| 折叠后卡片仍很长 | `npm run check:probe -- --case pm-folded` | `DIAGNOSTICS.md` §二.3 |
| 悬停态看不出差别 | 看 `clientCheck.layout.opacity` | `DIAGNOSTICS.md` §二.4 |
| 宿主界面被带歪 | — | `DIAGNOSTICS.md` §一 污染层 |
| 接口 404 / 405 / 写丢字段 | `npm run check:ops` | `INTERFACE.md`、`URL-SPEC.md` |
| 门禁红了看不出原因 | 单跑该脚本，看 `FAIL` 行 | `../AGENTS.md` §十 脚本表 |

## 四、文档地图（人写 19 份 + 生成 2 份）

| 文档 | 行数 | 一句话 | 读这份当 | 不读这份当 → 见 |
| --- | --- | --- | --- | --- |
| `GLOSSARY.md` | 207 | 界面/功能/流程统一术语 | 沟通有歧义 | 具体规范 → `DESIGN-SYSTEM.md` |
| `AI-CONTEXT.md` | 76 | 根规范路由 + 插件硬规则 | 每次开工 | — |
| `DOCTRINE.md` | 108 | 三纲五常 / 四件套 / 抽象递减 | 判断方向 | 具体做法 → `../AGENTS.md` |
| `RSI-CONSTITUTION.md` | 111 | 十二条运行期法则 | 任何 AI 对话 | 落地流程 → `../AGENTS.md` §二 |
| `DIAGNOSTICS.md` | 105 | 出问题先查哪、先跑哪 | 有故障 | 历史坑 → `RSI-LEDGER.md` |
| `DESIGN-SYSTEM.md` | 355 | 视觉/组件/表单/UI 不变量 | 任何界面改动 | 产品取舍 → `PRODUCT-DESIGN.md` |
| `INTERFACE.md` | 419 | 五种形态/认证/PM 排序 | 接口设计与排障 | URL 形状 → `URL-SPEC.md` |
| `URL-SPEC.md` | 243 | 两类 URL 与禁止清单 | 构造 URL 前 | 接口语义 → `INTERFACE.md` |
| `CODE-GEN.md` | 424 | 代码生成规范与工厂要点 | factory 模式 | 架构 → `ARCHITECTURE.md` |
| `ARCHITECTURE.md` | 135 | 五层/请求流程/模块归属 | 判断代码放哪 | 生成细节 → `CODE-GEN.md` |
| `AI-CONVERSATION.md` | 140 | 对话参数/动作表/缺口 | 改 Copilot 链路 | 提示词 → `../lib/core/copilot.js` |
| `MONITOR.md` | 83 | 监控面板与数据源 | 改监控视图 | — |
| `IAM.md` | 151 | 权限与身份模型 | 涉及 user.uid/角色 | 接口 → `INTERFACE.md` |
| `DSH-COS.md` | 114 | DSH 宿主能力与边界 | 判断能不能做到 | 版本差异 → `RSI-LEDGER.md` |
| `ACCEPTANCE.md` | 247 | 唯一验收口径 | 说「完成」之前 | 流程 → `../AGENTS.md` §七 |
| `PRODUCT-DESIGN.md` | 843 | 产品与技术设计稿 | 做方案/查设计取舍 | 现状 → `../README.md` 能力矩阵 |
| `RSI-LEDGER.md` | 125 | 踩坑与决策台账 | 复盘/避免重复 | 症状路由 → `DIAGNOSTICS.md` |
| `INSTALL.md` | 108 | 节点安装矩阵与平台选择 | 部署/跨平台 | 节点生命周期 → `ARCHITECTURE.md` |
| `CODE-INDEX.md` | 169 | 文件-行数-导出-契约索引 | 找东西 | 生成物，勿手改 |
| `STATE.md` | 66 | 存储键表 | 加/查状态 | 生成物，勿手改 |
| `INDEX.md` | 本文件 | 唯一入口 | 每次开工 | — |

**按章读**（>400 行的大文档，只读需要的章）：`INTERFACE.md` §1–§5 报文与动作、§6–§10 认证与排障、§11 PM 排序；
`CODE-GEN.md` §一–§三 模块与词表、§四–§五 参数文法与权限、§六 工厂实现；
`PRODUCT-DESIGN.md` 开头有按章读表；`RSI-LEDGER.md` 按日期倒序读最近三条即可。

## 五、生成物（脚本产出，勿手改）

```sh
node scripts/docs-index.mjs --write   # 重新生成 CODE-INDEX.md 与 STATE.md
npm run check:docs                    # 校验孤儿/死链/生成物是否过期
```

## 六、文档治理（写新文档前先读）

1. **能加到现有文档的一章，就不新开文件**；新开必须在 §二/§四登记，否则 `check:docs` 判孤儿。
2. **一份真源**：同一事实只写一处，其它地方给「文件 §章节」指针。
3. **生成物不手改**：改 `ops.js`、`08-store.js`、目录结构后重跑生成脚本。
4. **过时内容**：加「已废弃（日期）→ 见 X」，并在 `RSI-LEDGER.md` 记一行。
5. **文档与代码同一次提交**；`check:docs` + `check:context` 必须绿。
