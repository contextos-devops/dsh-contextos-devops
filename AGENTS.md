# AGENTS · 插件工作契约

> 约束两类智能体：**外部 DSH 代理**（有 bash/文件工具，改本仓库）与**插件内 Copilot**（`/api?op=chat`，在界面里对话）。
> 冲突优先级：根 `../../../AGENTS.md`（平台铁律）> 本文件 > `docs/*`。
> 每次对话：**本文件 §〇 → §二 流程 → `docs/INDEX.md` 对应一行**，只读本轮需要的那一章。

---

## 〇、30 秒定位

| 问题 | 答案 |
| --- | --- |
| 这是什么 | DSH 插件：把 ContextOS 的节点/空间/应用/分身/项目/物联装进对话式界面 |
| 规模 | 宿主 345 行 + `lib/**` 5.6k 行 + 客户端 24 片段 7.6k 行 + CSS 3.3k 行 + 102 个 op |
| 代码在哪 | 宿主 `index.js` + `lib/**`；客户端 `src/client/parts/*.js`（拼成 `client.js`）；样式 `src/client/styles/*.css` |
| 一条请求怎么走 | 组件 → `api(op)` → `index.js` 查 `lib/core/ops.js` → `lib/core/<域>.js` → ContextOS HTTP |
| 怎么算改完 | `npm run build:client` 全绿（10 道门禁）+ 有证据 + 报告落盘 |
| 下一步干什么 | §七 验收标准 → §十三 本轮优先级：红门禁 > 已知限制 > 用户需求 |

```sh
npm run build:client     # 构建 + 10 道门禁（红了先修，不许带 FAIL 交付）
npm run check:probe      # 离线渲染 fixture 量布局（需本机 Edge/Chrome）
npm run verify:ui        # 真浏览器验收（需 Edge CDP 9223），exit 0 才算过
node --check index.js    # 只改宿主时先做语法检查
```

---

## 一、工作范式

**三纲**：集群化部署 → 让所有设备互联互通；模块化开发 → 让所有代码自动生成；自动化应用 → 让所有数据自由流动。

**五常**：代码、文档、会话、团队、市场。

**运行方式**：以 **AI 会话为驱动**实现人机协同 —— 人给意图，智能体给计划与产物；**不断生成代码、不断生成文档**；
**用代码工具提升效率**（能写成脚本的检查不再靠人看），**用规范文档提升质量**（写不清楚的规则等于没有）；
**不断优化流程本身**，让「发现 → 修复 → 固化」的周期一轮比一轮短，最终实现 **RSI**。

一句话判据：**这件事让「设备更多、代码更少、数据更通」中的哪一个前进？** 都答不出，就别做。
理念全文 `docs/DOCTRINE.md`；每轮判据 `docs/RSI-CONSTITUTION.md`。

---

## 二、工作流程：八步（每轮照做，不跳步）

| # | 步骤 | 做什么 | 产出（缺一不算做完） |
| --- | --- | --- | --- |
| ① | **意图识别** | 复述诉求 + 判断问题类型（`docs/DIAGNOSTICS.md` §一）+ 写目标句与可判定验收 | 目标 + 验收句 |
| ② | **生成计划** | 范围 / 影响面 / 代价（时间、回归风险、要碰的文件） | 计划（≤6 行） |
| ③ | **拆解任务** | 拆成 3–6 条可执行任务，标出依赖与顺序 | 任务清单 |
| ④ | **读取规范** | 按 `docs/INDEX.md` 只读本轮相关的那一章，不整份塞 | 引用到的章节号 |
| ⑤ | **选择工具** | 先查 §十 脚本表与 `DIAGNOSTICS.md`「先跑哪条」；有现成门禁就不手搓 | 命令清单 |
| ⑥ | **执行任务** | 生成代码 + 生成文档（同一次提交）；长任务逐步报进度（做了什么、哪个数字变了） | 改动 + 进度 |
| ⑦ | **质量验收** | 是否符合规范？是否满足用户需求？→ `build:client` 全绿 + §七 对应矩阵 + 报告里贴证据 | exit 0 + 证据 |
| ⑧ | **归纳总结** | 规范不完善 → 补规范；脚本不完善 → 补脚本；索引不完善 → 补索引；验收标准不完善 → 补标准 | 至少一条新断言/新脚本/新索引行 |

一句话记忆：**意图 → 计划 → 任务 → 规范 → 工具 → 执行 → 验收 → 归纳**。
第 ⑧ 步是复利来源：同类问题第二次出现时，应当靠断言而不是靠回忆解决。

**每轮四件套（缺一不算完成）**：代码（全绿 + 可验证）· 文档（改对应章节，不追加文末）·
门禁（本轮踩的坑 → 至少一条新断言）· 规范（写进本文件或 `docs/CODE-GEN.md`）。

---

## 三、代码索引（架构与现状）

### 3.1 五层

```
页面/视图（60-page 装配，chat / manage / dev / monitor）
   ↓
组件片段（src/client/parts/*.js：卡片、表单、消息、PM、地图、编辑器、监控…）
   ↓ api(op)                         ← 唯一客户端出口，op 必须登记在 ops.js
宿主路由（index.js：查表分发，不写业务分支）
   ↓
领域实现（lib/core/*.js：nodes / spaces / apps / project / copilot / codegen …）
   ↓
ContextOS HTTP（lib/base/http.js + url.js 构造，URL 只走这两处）
```

### 3.2 文件地图

| 路径 | 行数 | 职责 |
| --- | --- | --- |
| `index.js` | 345 | 宿主接线：`export const inject=['tools','webServer','llm']`、工具注册、HTTP/WS 路由、静态资源 |
| `lib/core/ops.js` | 299 | **op 注册表**（102 条）：`{ method, noUser, run }`；`index.js` 只查表 |
| `lib/core/nodes.js` | 627 | 节点：列表/部署/启停/探活/端口 |
| `lib/core/spaces.js` | 406 | 空间：列表/创建/构建/目录树 |
| `lib/core/apps.js` | 675 | 应用：列表/创建/打开/商店 |
| `lib/core/project.js` | 393 | 项目管理状态机（PM 唯一处） |
| `lib/core/copilot.js` | 419 | 对话：提示词、三模式短路、动作白名单 |
| `lib/core/codegen.js` | 401 | 代码生成（factory 模式） |
| `lib/core/avatar.js` | 289 | 数字分身 |
| `lib/core/vocab.js` | 158 | 词表（字段/概念唯一命名） |
| `lib/base/url.js` | 178 | 两类 URL 构造（`apiPath` / `webUrl`） |
| `lib/base/http.js` | 140 | 请求与鉴权（`user.uid`/sessid） |
| `lib/base/registry.js` | 186 | 节点/空间注册与缓存 |
| `lib/base/state.js` | 45 | 服务端状态目录（`state.json`） |

客户端 24 片段（构建顺序即文件名序）：

| 片段 | 行数 | 干什么 |
| --- | --- | --- |
| `00-prelude.js` | 310 | 启动、样式注入（版本跟随）、i18n、工具函数 |
| `05-bootstrap.js` | 61 | React/Monaco/xterm 加载与降级 |
| `08-store.js` | 85 | **唯一持久化出口**（`CX_STORE_SCHEMA` + `cxRead/cxWrite`） |
| `10-ui.js` | 188 | 基础组件（按钮、标签、空态、加载） |
| `12-debug.js` | 361 | 底部控制台、DEBUG/STATE 页 |
| `15-layout.js` | 86 | 壳层布局与侧栏 |
| `20-devworkspace.js` | 789 | DEV 工作台：终端会话、预览、分栏 |
| `25-editor-ui.js` | 28 | 编辑器工具条 |
| `30-modals.js` | 85 | 模态框底座 |
| `32-cards.js` | 176 | 节点/空间/应用卡片 |
| `34-forms.js` | 176 | 表单与字段 |
| `36-data.js` | 267 | 数据表格 |
| `40-project.js` | 430 | PM 数据层（计划/任务/报告/反馈）+ 农历 |
| `45-map.js` | 109 | 地图卡片（Leaflet） |
| `46-pm.js` | 158 | PM 交互（选择/筛选） |
| `47-three.js` | 324 | 三维场景（赛博世界） |
| `49-msg.js` | 167 | 消息子组件（引用/表单/实体卡） |
| `50-chat.js` | 1422 | 会话面板（消息流、工具条、自愈、上传） |
| `51-pmselection.js` | 31 | PM 选中态 |
| `52-pmdata.js` | 29 | PM 数据派生 |
| `55-pm.js` | 146 | PM 视图装配 |
| `58-config.js` | 381 | 插件配置（主题/语言/模型/调用） |
| `59-monitor.js` | 262 | 监控面板 |
| `60-page.js` | 1518 | 页面装配、视图切换、`clientCheck` 自报 |

样式：`tokens.css`（2）+ `main.css`（3294）+ `kit.css`（20）→ 构建成 `assets/client.css`。

**构建产物**：`client.js`（7590 行）、`assets/client.css` —— 只由 `build/client.mjs` 生成，不许手改。

### 3.3 数据与状态

- 浏览器：38 个键，全部登记在 `src/client/parts/08-store.js` 的 `CX_STORE_SCHEMA`，键表见 `docs/STATE.md`。
- 服务端：`~/.dsh/contextos-devops-dsh/state.json`（节点缓存、终端缓冲、请求日志、选择记忆、prefs、clientCheck）。
- 生成物：`docs/CODE-INDEX.md`（代码索引）、`docs/STATE.md`（状态表）—— 改代码后跑 `node scripts/docs-index.mjs --write`。

---

## 四、文档索引（19 份，入口 `docs/INDEX.md`）

| 我要干什么 | 读这份 |
| --- | --- |
| 按任务找文档（唯一入口） | `docs/INDEX.md` |
| 理念：三纲五常 / 四件套 / 抽象递减 | `docs/DOCTRINE.md` |
| 每轮判据（Copilot 也注入） | `docs/RSI-CONSTITUTION.md` |
| **出问题了先查哪、先跑哪** | `docs/DIAGNOSTICS.md` |
| 界面：布局/组件/主题/图标/文字 | `docs/DESIGN-SYSTEM.md` + 根 `USER-VIEW.md` |
| 表单取值 / 字段形态 | `docs/DESIGN-SYSTEM.md` §18 |
| 接口五形态 / 两类 URL / 禁止清单 | `docs/INTERFACE.md`、`docs/URL-SPEC.md` |
| 代码生成（factory）两类模块与词表 | `docs/CODE-GEN.md` |
| 架构分层 / 请求流程 / 模块归属 | `docs/ARCHITECTURE.md` |
| 对话协议与动作表 | `docs/AI-CONVERSATION.md` |
| 监控面板接法 | `docs/MONITOR.md` |
| 权限/身份 | `docs/IAM.md` |
| DSH 宿主能力与边界 | `docs/DSH-COS.md` |
| 交付验收（L0–L3 + 证据表） | `docs/ACCEPTANCE.md` |
| 产品全貌 / 对外讲 | `docs/PRODUCT-DESIGN.md` §0–1.11 |
| 完整产品设计稿 | `docs/PRODUCT-DESIGN.md` |
| 找文件/组件/op/脚本（生成） | `docs/CODE-INDEX.md` |
| 查存了哪些状态（生成） | `docs/STATE.md` |
| 历史坑与决策 | `docs/RSI-LEDGER.md` |
| 根规范路由与插件硬规则 | `docs/AI-CONTEXT.md` |

新文档必须登记 `docs/INDEX.md`，否则 `docs-check` 判孤儿。

---

## 五、岗位职责（可以做什么）

| 想做的事 | 改哪里 | 顺手必须做 |
| --- | --- | --- |
| 加/改后端动作 | `lib/core/ops.js` + `lib/core/<域>.js` | `npm run check:ops` |
| 改请求转发/鉴权 | `index.js`（只许查表分发） | `node --check index.js` + 重载插件 |
| 加持久化状态 | `08-store.js` 的 `CX_STORE_SCHEMA` | `node scripts/docs-index.mjs --write` |
| 改界面/布局/组件 | `src/client/parts/*.js`、`styles/*.css` | `check:ui` + `check:probe` + 真机截图 |
| 加项目管理流程 | `lib/core/project.js`（状态机唯一处） | 排序/状态口径进 `docs/INTERFACE.md` §11 |
| 改 Copilot 提示词/动作 | `lib/core/copilot.js` + `docs/AI-CONVERSATION.md` | 三模式短路不许绕过 |
| 改文档 | `docs/*.md` | 登记 `INDEX.md` + `check:docs` |
| 加门禁脚本 | `scripts/*.mjs` + `build:client` 链 | 自测「能抓到该错误」 |
| 加布局不变量 | `scripts/fixtures/*.html` + `ui-probe` 的 `CASES` | `--css /dev/null` 必须 FAIL |

**可直接调用的宿主工具**：`contextos_list_nodes`、`contextos_list_spaces`、`contextos_read_data`、
`contextos_write_data`、`contextos_create_space`、`contextos_create_app`、`contextos_deploy_node`、
`contextos_space_start/stop`、`contextos_pipeline`。

---

## 六、铁律红线（不可以做）

| # | 红线 | 判据 |
| --- | --- | --- |
| 1 | 不改构建产物 | `client.js`、`assets/client.css` 只能由 `build/client.mjs` 生成 |
| 2 | 不碰框架与数据库 | `usr/icebergs/`、`usr/volcanos/` 只读；禁止 `sqlite3` 改数据 |
| 3 | 不在 `index.js` 写业务分支 | 只许查 `OPS` 表；`op-check` 会红 |
| 4 | 不绕过存储出口 | 禁止 `localStorage.setItem`；`store-check` 会红 |
| 5 | 不手拼 URL | 只走 `lib/base/url.js` 与 `cxWebUrl`；空间只用 pod 名 |
| 6 | 不跨应用污染样式 | `:root` 只准声明 `--cx-*`；gate 第 12 项 |
| 7 | 不用重启代替修复 | 先复现 → 改根因 → 再验 |
| 8 | 不带 FAIL 交付 | `build:client` exit 0 才算完；`verify:ui` 退出 2 不算完成 |
| 9 | 不写「应该可以」 | 结论必须带命令输出/回执/截图/exit code |
| 10 | 不把版本写死 | bump `package.json.version`，缓存键跟着走 |
| 11 | 不留测试垃圾 | 测试节点/空间/临时文件收尾清理 |
| 12 | 不新增无归属文档 | 孤儿文档 `docs-check` 会红 |
| 13 | 不放宽断言蒙混 | 断言放宽必须在报告里写清「为什么旧阈值是错的」 |

---

## 七、验收标准（什么算完成任务）

**通用四件**：`npm run build:client` exit 0 · 对应验证矩阵通过 · 文档同步 · 报告落盘 `usr/local/WorkBuddy/dsh-reports/`。
**收尾必做**：§八 归纳总结（单次写 LEDGER 五问；累计到阈值做全面归纳）。

改了宿主（`index.js`、`lib/**`）必须让宿主重载后才算验收：`plugin_manager` 把插件 `false → true`：

```sh
# 或由 DSH 代理调用同名工具
plugin_manager set_plugin include:contextos-devops-dsh  # enabled:false → 再 true
```

| 改动类型 | 最低验证 | 判定 |
| --- | --- | --- |
| 纯文档 | `check:docs` | 索引覆盖 + 链接可解析 |
| 客户端 UI/样式 | `build:client` + `check:probe` + `verify:ui` | 不变量全绿 + 真机截图 |
| 宿主 `lib/*.js`、`index.js` | `build:client` + **重载插件** + 真实 `api` 回执 | 回执字段符合预期 |
| 新 op | `check:ops` + `curl`（方法门一致）+ 回读 | 写入成功且能读回 |
| 存储键 | `check:store` + `docs-index --write` + 刷新仍在 | 刷新后值不变 |
| Copilot 动作 | `build:client` + 一次真实对话 | `action` 正确 + 卡片渲染 |
| 门禁脚本 | 自测「故意改坏 → 必须 FAIL」 | 双向自测通过 |

**不合格的典型**：只跑静态门禁就说已验证；截图能看但数值不对；报告里没有 exit code。

---

## 八、归纳总结（每次会话后小结，每多轮后全面归纳）

> 目的是让「发现 → 修复 → 固化」的周期一轮比一轮短：**单次留证据，多轮出规律**。
> 交付代码只是半程；没有归纳，同一个坑会以新面孔再来一次。

### 8.1 每次问题会话后（单次复盘，必做）

问题修完、门禁变绿之后，立刻回答五个问题，写进 `docs/RSI-LEDGER.md` 对应日期条目：

| # | 问题 | 写不出说明什么 |
| --- | --- | --- |
| 1 | **现象**：用户看到什么？用哪张截图/哪条自报数据复现 | 需求没理解，回到 §二 第 ① 步 |
| 2 | **根因层次**：加载层 / 级联层 / 数据层 / 逻辑层 / 流程层（见 `docs/DIAGNOSTICS.md` §一） | 还在猜，回去量 |
| 3 | **属于哪类**：这是第几次出现同一类问题？（查 §十一 经验表与 LEDGER） | 没归类，下次还会慢 |
| 4 | **固化了什么**：新增/收紧了哪条断言、脚本、索引行、规范句 | 等于没修根因，只是这次手动绕过了 |
| 5 | **数字对比**：改前 → 改后（px / 行数 / 耗时 / exit code） | 结论不可判定，见 §六 红线 9 |

单次复盘模板（直接粘进 LEDGER）：

```text
YYYY-MM-DD — <一句话现象>
- 根因：<层次 + 具体机制 + 文件:行>
- 类别：<布局/加载/数据/流程…>（同类第 N 次）
- 固化：<新门禁/新断言/新索引行/新规范句，写清判据>
- 数字：<改前 → 改后>
```

### 8.2 每多轮之后（全面归纳，定期做）

**触发条件**（满足任一即做）：同类问题累计 ≥3 次；问题会话累计 ≥10 次；每两周一次；用户明确要求「总结一下」。

全面归纳的六个动作，缺一不算完成：

| # | 动作 | 产物 |
| --- | --- | --- |
| 1 | **聚类**：把这段时间的问题按 §8.1 的类别归堆，数每类次数 | 一张「类别 × 次数 × 典型症状」表 |
| 2 | **找规律**：哪一类复发最多？复发是因为没断言，还是断言写在了错的一层？ | 一段结论（不是罗列） |
| 3 | **升级门禁**：把最高频的类变成**可执行断言**（优先扩展现有脚本，不新开脚本） | 新断言 / 新 `ui-probe` 用例 / 新 gate 项 |
| 4 | **补症状表**：新的症状 → 先跑哪条命令 → 指向哪份文档 | `docs/DIAGNOSTICS.md` 新行 |
| 5 | **补经验与索引**：能一句话说清的处理方式进 §十一；新文档/新脚本进 §四/§十 与 `docs/INDEX.md` | 表行 + 索引行 |
| 6 | **写归纳报告**：`usr/local/WorkBuddy/dsh-reports/YYYY-MM-DD-retro-<主题>.md`（类别表、规律、门禁升级、下轮建议） | 报告文件 |

**判据（可执行）**：`node scripts/ledger-stats.mjs` 会打印条目总数、距上次全面归纳的条目数、缺字段的条目。
`--check` 在「距上次归纳 ≥10 条」或「2026-11-15 之后的新条目缺 根因/固化」时 exit 1 —— 此时先补归纳，再开新功能。
（单次命令：`npm run stats:ledger`；本文件 §八 的规则与脚本行为必须一致，改口径要同时改脚本。）

### 8.3 两条纪律

- **不许只写「已修复」**：没有根因层次与固化判据的条目，视为没复盘（`ledger-stats --check` 会点名）。
- **不许把归纳写成感想**：归纳的产物必须是**表、断言、脚本、索引行**之一；纯文字总结不算。

---

## 九、规范（怎么写才算「本仓库风格」）

- **JS 不断抽象通用组件**：同一个交互出现第二次 → 抽到 `10-ui/32-cards/34-forms`，不要复制粘贴；
  hook 依赖数组不许引用本文件稍后才声明的变量（`hook-order-check` 会红）。
- **CSS 不断抽象全局变量**：颜色/字号/间距/圆角一律走 `--cx-*` 令牌（`tokens.css`），
  禁止散落硬编码色值；同一属性的覆盖必须能说清「为什么后写的这条要赢」。
- **API 不断完善接口标准**：新动作先进 `ops.js` 注册（method/noUser），客户端只 `api(op)`；
  参数与报文遵循 `docs/INTERFACE.md` 与 `docs/URL-SPEC.md`。
- **不断生成脚本工具**：凡是「人工检查超过两次」的事，第三次必须变成脚本或断言；
  凡是「列表」必须由目录/注册表推导，不许手抄（今天正是手抄 parts 列表导致插件整体加载失败）。
- **命名**：概念/参数固定为 `node/space/app/avatar/scene/mode/view/web/editor`，不自造同义词（`vocab.js`）。

---

## 十、脚本（现成能用什么）

### 10.1 npm 脚本

| 命令 | 作用 |
| --- | --- |
| `npm run build:client` | 构建 + 10 道门禁（gate → load → hook-order → op → store → ui → probe → i18n → context → docs） |
| `npm run check:probe` | 离线渲染 fixture，断言布局不变量（`--case` / `--verbose` / `--png` / `--css`） |
| `npm run verify:ui` | 真浏览器验收（Edge CDP 9223），`exit 0/1/2` |
| `npm run check:ops` / `check:store` / `check:ui` / `check:hooks` / `check:load` / `check:i18n` / `check:context` / `check:docs` | 单跑某道门禁 |
| `npm run watch:client` | 监听片段变化重建（不跑门禁） |
| `npm run release` | `build:client` + `verify:ui` |

### 10.2 脚本文件

| 脚本 | 干什么 | 典型用法 |
| --- | --- | --- |
| `build/client.mjs` | 拼 24 片段 → `client.js`，拼 CSS → `client.css`，注入构建哈希与版本 | `node build/client.mjs --watch` |
| `scripts/gate.mjs` | 产物哈希/语法/CSS 版本/`:root` 令牌/README+AGENTS 结构 | `npm run gate` |
| `scripts/load-check.mjs` | 片段清单 vs 目录哈希 + `vm` 里真执行 `factory()` | `npm run check:load` |
| `scripts/hook-order-check.mjs` | hook 依赖数组引用未声明变量（TDZ） | `npm run check:hooks` |
| `scripts/op-check.mjs` | 客户端每个 `api('x')` 都有 op；方法与注册表一致 | `npm run check:ops` |
| `scripts/store-check.mjs` | 只准走 `08-store.js`；schema 与 helper 类型一致（棘轮） | `npm run check:store` |
| `scripts/ui-check.mjs` | 静态 UI 断言（字号/图标/控件尺寸/禁用写法，88 条） | `npm run check:ui` |
| `scripts/ui-probe.mjs` | 无头渲染真实 CSS，量盒子并断言（消息结构/折叠高度） | `npm run check:probe -- --verbose` |
| `scripts/i18n-check.mjs` | 中英文案成对、词表一致 | `npm run check:i18n` |
| `scripts/context-check.mjs` | `ai-context.json` 文档存在 + 硬规则仍被注入提示词 | `npm run check:context` |
| `scripts/docs-index.mjs` | 生成 `CODE-INDEX.md` / `STATE.md`（`--write` 或 `--check`） | `node scripts/docs-index.mjs --write` |
| `scripts/docs-check.mjs` | 孤儿文档、死链、生成物过期、已删文档复活 | `npm run check:docs` |
| `scripts/ui-verify.mjs` | 真机验收：结构/尺寸/下拉/本地化/控制台 | `npm run verify:ui` |
| `scripts/edge-refresh.mjs` | 通过 CDP 刷新页面（改完客户端用） | `node scripts/edge-refresh.mjs` |
| `scripts/accept-factory.mjs` | factory 模式端到端验收 | `npm run verify:factory` |
| `scripts/ledger-stats.mjs` | 数 LEDGER 条目、距上次全面归纳的条数、缺字段条目 | `node scripts/ledger-stats.mjs --check` |

---

## 十一、经验（以前踩过什么，现在怎么处理）

| 症状 | 做法 | 依据 |
| --- | --- | --- |
| 插件整体不加载 / 白屏 | 先跑 `check:load`；parts 列表必须目录推导，产物必须被真执行 | `RSI-LEDGER` 2026-11-15 加载失败 |
| 「改了样式界面没变」 | 先查 `clientCheck.css/build` 与 `?v=` 是否一致；prelude 会改写已挂载的旧 `<link>` | `RSI-LEDGER` 2026-11-15 新 JS + 旧 CSS |
| 消息头与正文挤成两栏 | 关键布局写 JSX 内联；`check:probe --case msg-card` 复现 | `DIAGNOSTICS.md` §二.1/.2 |
| 折叠后卡片还是很长 | 固定高度必须配 `.folded{height:auto}` 例外；`check:probe --case pm-folded` 双向断言 | `DIAGNOSTICS.md` §二.3 |
| 悬停态离线截图看不出差别 | 无头命中 `@media (hover:none)`；判悬停看 `clientCheck.layout.opacity` 或注入类名 | `DIAGNOSTICS.md` §二.4 |
| 宿主界面被插件带歪 | `:root` 只写 `--cx-*`；跨应用共用 document 是事实 | gate 第 12 项 |
| hook 报 `Cannot access X before initialization` | 依赖数组引用了稍后声明的变量；`check:hooks` 拦 | `RSI-LEDGER` 2026-11-13 崩溃 |
| 接口 404/405 | `check:ops` + 方法门（create→PUT / remove→DELETE / 其余 POST） | `INTERFACE.md` |
| 数据写入 200 但丢字段 | 值里不能带半角 `/`；写完必须回读 | `URL-SPEC.md` |
| 门禁红了但看不出原因 | 单跑对应脚本，看它打印的定位行 | 各脚本 `FAIL` 行 |
| 同一个坑踩第二次 | 到本表加一行 + 在 §二 第 ⑧ 步补断言 | 本文件 §二 |

完整复盘按日期在 `docs/RSI-LEDGER.md`；症状路由在 `docs/DIAGNOSTICS.md`。

---

## 十二、对话流程：插件内 Copilot 契约（改对话链路时读）

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

## 十三、本轮做什么（优先级）

1. **红门禁**：`build:client` 任何 FAIL，先修。
2. `docs/RSI-LEDGER.md` 未闭环项与 `README.md` 已知限制。
3. 用户新需求（走 §二 八步）。
4. 无上述输入时按「抽象 → 门禁 → 索引」自选；先写清「完成后哪个判据会变绿」。

---

## 十四、交接模板（报告里必须有）

```md
# <主题>
- 目标：<一句话>；验收：<可判定句>
- 改动：<文件:行>（3–6 条）
- 证据：<命令输出/回执/截图路径>
- 代价：<时间/风险；未做什么>
- 下一步：<1–3 条，按优先级>
```
