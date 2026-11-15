# AGENTS · 插件工作契约

> 本文件约束两类智能体：
> 1. 在本仓库改代码的 **DSH 代理**（外部驱动，有 bash/文件工具）；
> 2. 插件内 **Copilot**（`/api?op=chat`，用户在界面里对话）。
>
> 冲突优先级：根 `../../../AGENTS.md`（平台铁律）> 本文件 > `docs/*`。
> 每次对话：读本文件 → `docs/INDEX.md` → 只读本轮相关的那一章。

---

## 〇、30 秒定位

| 问题 | 答案 |
| --- | --- |
| 这是什么 | DSH 插件：ContextOS 的节点/空间/应用/分身/项目/物联，装进对话式界面 |
| 代码在哪 | 宿主 `index.js` + `lib/**`；客户端 `src/client/parts/*.js`（24 片段拼成 `client.js`） |
| 一条请求怎么走 | 组件 → `api(op)` → `index.js` 查 `lib/core/ops.js` → `lib/core/*.js` → ContextOS HTTP |
| 怎么算改完 | `npm run build:client` 全绿 + 接口/界面有证据 + 报告落盘 |
| 下一步干什么 | 看 §六「本轮做什么」：红门禁 > 已知限制 > 用户新需求 |

三条命令先记住：

```sh
npm run build:client     # 构建 + 10 道门禁（红了先修，不许带 FAIL 交付）
npm run check:probe      # 离线渲染 fixture 量布局（需本机 Edge/Chrome）
npm run verify:ui        # 真浏览器验收（需 Edge CDP 9223）
node --check index.js    # 只改宿主时先做语法检查
```

---

## 一、你可以做哪些事

| 想做 | 改哪里 | 顺手必须做 |
| --- | --- | --- |
| 加/改一个后端动作 | `lib/core/ops.js` + `lib/core/<域>.js` | `npm run check:ops` |
| 改请求转发/鉴权 | `index.js`（只允许查表分发，不许写业务分支） | `node --check index.js` + 重载 |
| 加一个要保存的状态 | `src/client/parts/08-store.js` 的 `CX_STORE_SCHEMA` | `node scripts/docs-index.mjs --write` |
| 改界面/布局/组件 | `src/client/parts/*.js`、`src/client/styles/*.css` | `check:ui` + `check:probe` + 真机截图 |
| 加项目管理工作流 | `lib/core/project.js`（状态机唯一处） | 状态表进 `docs/MEMORY.md` |
| 改 Copilot 提示词/动作 | `lib/core/copilot.js` + `docs/AI-CONVERSATION.md` | 三模式短路不许绕过 |
| 改文档 | `docs/*.md`；新文档必须进 `docs/INDEX.md` | `npm run check:docs` |
| 加门禁 | `scripts/*.mjs` + `package.json` 的 `build:client` 链 | 自测「能抓到该错误」；布局类加 `ui-probe` 用例 |

**不能碰**：`client.js`（构建产物）、`usr/icebergs/`、`usr/volcanos/`、`page/cache.css`、任何 `*.db`。

**可以直接调的宿主能力**：`contextos_list_nodes`、`contextos_list_spaces`、`contextos_read_data`、
`contextos_write_data`、`contextos_create_space`、`contextos_create_app`、`contextos_deploy_node`、
`contextos_space_start/stop`、`contextos_pipeline`。

---

## 二、方向：三纲五常（判断该不该做）

**三纲**：集群化部署 → 设备互联互通；模块化开发 → 代码自动生成；自动化应用 → 数据自由流动。
**五常**：代码、文档、会话、团队、市场。

一句话判据：**这件事让「设备更多、代码更少、数据更通」中的哪一个前进？** 都答不出，就别做。
完整理念见 `docs/DOCTRINE.md`；每轮判据见 `docs/RSI-CONSTITUTION.md`。

---

## 三、铁律（违反即返工）

| # | 铁律 | 判据 |
| --- | --- | --- |
| 1 | 不改构建产物 | `client.js` 只能由 `node build/client.mjs` 生成 |
| 2 | 每次改动 bump 版本 | `package.json.version` 变化（缓存键） |
| 3 | 改完必过构建链 | `npm run build:client` exit 0 |
| 4 | 宿主改动必须重载 | `plugin_manager set_plugin include:contextos-devops-dsh` → false → true |
| 5 | 不改框架 | `usr/volcanos`、`usr/icebergs` 只读 |
| 6 | 不直连数据库 | 读写走 HTTP API，禁止 `sqlite3` 改数据 |
| 7 | URL 单一来源 | `lib/base/url.js`（`apiPath`/`webUrl`）与 `cxWebUrl` |
| 8 | 不直连 localStorage | 只走 `08-store.js` 的 `cxRead/cxWrite/…` |
| 9 | 词表优先 | 字段/操作用 `lib/core/vocab.js` 与框架名，不自造同义词 |
| 10 | 结论必须有证据 | 命令输出/回执/截图/exit code；「应该可以」不算 |
| 11 | 报告落盘 | `usr/local/WorkBuddy/dsh-reports/<日期>-<主题>.md` |
| 12 | 不重启代替修复 | 先复现 → 改根因 → 再验，不许用重启掩盖 |

---

## 四、DSH 工作流：八步（每轮照做，不跳步）

用户只给一句话也要走完这八步；每步都有**可判定的产出**，没有产出就还在上一步。

| # | 步骤 | 做什么 | 产出（缺一不算做完） |
| --- | --- | --- | --- |
| ① | **分析** | 复述诉求 → 判断问题类型（`docs/DIAGNOSTICS.md` §一）→ 写目标句与验收句 | 目标 + 可判定验收 |
| ② | **计划** | 范围 / 影响面 / 代价（时间、回归风险、要碰的文件）+ 3–6 条任务 | 计划表 + 任务清单 |
| ③ | **读规范** | 按 `docs/INDEX.md` 只读本轮相关那一章，不整份塞 | 引用到的章节号 |
| ④ | **选工具** | 先看 `docs/DIAGNOSTICS.md`「先跑哪条」；有现成门禁/取证脚本就不手搓 | 命令清单 |
| ⑤ | **执行** | 调工具与模型，最小改动；长任务逐步报进度（做了什么、哪个数字变了） | 改动 + 进度 |
| ⑥ | **产物** | 代码 + 文档改动 + 报告（`usr/local/WorkBuddy/dsh-reports/`） | 三件齐 |
| ⑦ | **检测** | `npm run build:client` 全绿 + 对应验证矩阵 + 报告里贴证据 | exit 0 + 证据 |
| ⑧ | **归纳** | 这是哪一类问题 → 补规范（本章/DIAGNOSTICS）→ 补工具（新断言/新脚本） | 至少一条新断言 |

一句话记忆：**分析 → 计划 → 规范 → 工具 → 执行 → 产物 → 检测 → 归纳**。
第 ⑧ 步是这套流程的复利来源：同类问题第二次出现时，应当靠断言而不是靠回忆解决。

**每轮四件套（缺一不算完成）**

| 件 | 判据 |
| --- | --- |
| 代码 | `npm run build:client` 全绿 + 接口回执可验证 |
| 文档 | 行为变了就改对应章节（不追加文末），`docs/*` 与代码同提交 |
| 门禁 | 本轮踩的坑 → 至少一条新断言（gate/ui-check/op-check/store-check/docs-check） |
| 规范 | 规则写进本文件或 `docs/CODE-GEN.md` |

**提交前自检**

```sh
npm run build:client && node --check index.js
git status --porcelain          # 只应包含本轮文件
git add -A && git -c user.name="shy" -c user.email="shy@localhost" commit -m "…"
```

---

## 五、验证矩阵（按改动类型选，不许降级）

| 改动 | 最低验证 |
| --- | --- |
| 纯文档 | `npm run check:docs` |
| 客户端 UI/样式 | `build:client` + `check:probe`（布局不变量）+ `verify:ui`（或 headless 截图 + DOM 断言） |
| 宿主 `lib/*.js`、`index.js` | `build:client` + **重载插件** + 真实 `api` 调用回执 |
| 新 op | `check:ops` + `curl`（PUT/POST/DELETE 与方法门一致）+ 回读 |
| 存储键 | `check:store` + `docs-index --write` + 刷新后状态仍在 |
| Copilot 动作 | `build:client` + 一次真实对话（看 `action` 与卡片） |

判定口径：`verify:ui` 退出码 `0` 才算通过；`2`（无法验证）不算完成。

---

## 六、本轮做什么（优先级）

1. **红门禁**：`build:client` 有任何 FAIL，先修它。
2. **`docs/RSI-LEDGER.md` 里的未闭环项**与 `README.md §十三 已知限制`。
3. 用户新需求（按 §四 走）。
4. 没有上述输入时，按「抽象 → 门禁 → 索引」自选：把重复代码抽掉、把人工检查变成断言、
   把散落知识收进索引（`docs/INDEX.md`、`CODE-INDEX`、`STATE`）。

选任务时先写一句「完成后哪个判据会变绿/哪个数字会下降」，否则换一个。

---

## 七、禁止清单与反模式

| 禁止 / 反模式 | 原因 |
| --- | --- |
| 手改 `client.js` | 下次构建覆盖，且掩盖源文件问题 |
| 只跑静态门禁就说「已验证」 | 界面/接口没真跑过，回归全留给用户 |
| 改 CSS 只看自己加的那条规则 | 本仓库多次被后面的 `!important` 与旧规则覆盖 |
| 未 bump 版本就构建 | 客户端缓存不刷新，用户看到旧界面 |
| 在 `index.js` 写 `if (op === …)` | 契约被打散，`op-check` 会红 |
| 新状态直接 `localStorage.setItem` | 绕过 schema，`store-check` 会红 |
| 新增无归属文档 | `docs-check` 判孤儿 |
| 把测试节点/空间留在环境里 | 污染用户数据，收尾必须清理 |
| 用「重启试试」代替定位 | 下一次同样的问题还会来 |

---

## 八、对话流程：插件内 Copilot 契约（改对话链路时读）

```text
用户输入 → 客户端按 mode 短路 → POST /api?op=chat { message, history, context }
        → lib/core/copilot.js 拼 system + context → { reply, action | actions }
        → 客户端 executeAction(action) → 卡片/表单/表格
```

- 上下文单一命名：`mode view node space app avatar scene web editor experience functions nodes spaces apps`（无别名）。
- `avatar`：只创建实例/读写数据/查最近应用；`factory`：部署/建空间/生成代码，禁 data；`iot`：只碰设备。
- 写操作**必须先出表单**（`CxWriteForm`），提交后进入只读态；失败必须显示状态码 + 回执片段。
- 可执行请求不允许只回散文（提示词已写死 `NEVER answer a data-write request with prose only`）。
- 结果卡片复用 `NodeCard/SpaceCard/AppRow/StoreRow`，不新造样式。

协议细节与动作表：`docs/AI-CONVERSATION.md`。

---

## 九、文档与索引（别让知识散落）

| 你要 | 动作 |
| --- | --- |
| 找某份文档 | `docs/INDEX.md`（唯一入口，按任务查表） |
| 找文件/组件/op | `docs/CODE-INDEX.md`（生成，别手改） |
| 查存了哪些状态 | `docs/STATE.md`（生成，别手改） |
| 加文档 | 先想「能不能加到现有文档的一章」；必须新开就登记进 `INDEX.md` |
| 改生成物 | 改代码源头（`08-store.js`/`ops.js`/目录），再 `node scripts/docs-index.mjs --write` |
| 复盘 | 每轮往 `docs/RSI-LEDGER.md` 追加：症状 → 根因 → 修法 → 证据 → 教训 |

---

## 十、交接模板（报告里必须有）

```md
# <主题>
- 目标：<一句话>；验收：<可判定句>
- 改动：<文件:行>（3–6 条）
- 证据：<命令输出/回执/截图路径>
- 代价：<时间/风险；未做什么>
- 下一步：<1–3 条，按优先级>
```
