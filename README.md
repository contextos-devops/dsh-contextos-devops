# ContextOS DevOps for DeepSeek Harness

> 把 ContextOS 的**服务节点 / 项目空间 / 应用实例 / 数字分身 / 赛博世界**装进 DSH 的一个插件：
> 用对话完成「部署 — 生成 — 运营」的闭环，并在界面上看得见、点得动、可验证。

| 事实 | 值 |
| --- | --- |
| 包名 | `@local/contextos-devops-dsh`（local bundle，`link:` 安装） |
| 版本 | `1.48.1`（以 `package.json` 为准） |
| 规模 | 客户端 `client.js` ≈ 7.2k 行（由 24 个片段拼成）、宿主 `lib/` ≈ 20 个模块、`index.js` ≈ 350 行 |
| 接口 | `POST /contextos-devops-dsh/api?op=<op>`，**102** 个 op 只在 `lib/core/ops.js` 注册 |
| 门禁 | `npm run build:client` 串联 9 道（见 §八），全绿才算完成 |
| 文档 | 唯一入口 [`docs/INDEX.md`](docs/INDEX.md)；文件级清单看 [`docs/CODE-INDEX.md`](docs/CODE-INDEX.md)（生成物） |

---

## 一、60 秒上手

```sh
cd usr/dsh-plugins/contextos-devops-dsh

# 1) 改版本（每次改动都要，缓存键来自它）
npm version patch --no-git-tag-version   # 或手动改 package.json 的 version

# 2) 构建 + 全部门禁（任何一项红都不许交付）
npm run build:client

# 3) 宿主代码（lib/*.js、index.js）有改动时，必须重载插件
#    plugin_manager set_plugin include:contextos-devops-dsh → false，再 → true
```

- 只改 `src/client/**`：刷新页面即可（`client.js` 与 `client.css` 带版本参数）。
- 改了 `lib/**` 或 `index.js`：**必须重载**，否则跑的还是旧模块。
- 想验收界面：`npm run verify:ui`（需要先开 Edge 的 CDP 9223，见 `docs/ACCEPTANCE.md` §13）。

---

## 二、它是什么

### 三纲（方向）

| 纲 | 在本插件里的落点 |
| --- | --- |
| **集群化部署** → 所有设备互联互通 | 节点部署/启停/监控、空间构建、`openNode`/远程命令、设备扫描（WiFi/蓝牙/局域网/SSH） |
| **模块化开发** → 所有代码自动生成 | 应用模板生成、`autogenApp`、`codegenPlan`/`codegen`、编译与回读 |
| **自动化应用** → 所有数据自由流动 | 应用实例与数据读写（`data` 动作）、应用商店、项目管理（目标→计划→任务→报告→反馈） |

### 五常（内容）

代码（`src/` `lib/`）、文档（`docs/` `AGENTS.md`）、会话（插件内 Copilot + `dsh-reports/`）、
团队（角色与权限：visitor/creator/leader/worker/tech）、市场（应用模板与服务流通）。

完整理念见 [`docs/DOCTRINE.md`](docs/DOCTRINE.md)。

---

## 三、五个概念（命名固定，别再造同义词）

按这个顺序说话，界面、接口、提示词、文档都一致：

| 顺序 | 概念 | 字段 | 说明 |
| --- | --- | --- | --- |
| 1 | 服务节点 | `node`（旧 `serve`） | 一个 `ice.bin` 进程 + 端口 |
| 2 | 项目空间 | `space`（旧 `pod`） | 一个 Git 仓库 + 数据库 |
| 3 | 应用实例 | `app`（旧 `place`） | 空间里某个门户/应用 |
| 4 | 数字分身 | `avatar` | 身份（`user.uid`）、所在城市/公司 |
| 5 | 赛博世界 | `scene`（旧 `background`） | 场景：主题、语言、时区、地点 |

工作模式 `mode`：`avatar`（数字分身）/ `factory`（软件工厂）/ `iot`（物联）。
视图模式 `view`：`chat` / `manage` / `dev` / `monitor`。

---

## 四、三种工作模式 × 四种视图

| 模式 | 能做什么 | 明确不能做 |
| --- | --- | --- |
| `avatar` 数字分身 | 创建应用实例、读写应用数据、查最近应用 | 生成代码、部署节点 |
| `factory` 软件工厂 | 部署节点、建空间、生成模板/代码、编译 | 禁止 data、禁止查最近应用 |
| `iot` 物联 | 扫描/连接/控制周边设备 | 业务数据、代码生成 |

| 视图 | 内容 |
| --- | --- |
| `chat` | Copilot 对话 + 项目面板（目标/计划/任务/日历/地图/甘特） |
| `manage` | 节点、空间、应用、商店、设备 |
| `dev` | IDE（文件树、Monaco、终端、Git、预览） |
| `monitor` | 面板：请求、事件、运行状态 |

模式由**客户端在调用模型之前**短路，不把选择权交给模型。

---

## 五、架构：五层 + 一次请求

```text
① 平台 ContextOS（只读）      usr/icebergs（命令/数据/权限）、usr/volcanos（界面引擎）
② 领域 lib/core/*.js           nodes spaces apps project copilot codegen …（懂业务，不懂 React）
③ 契约 lib/core/ops.js        op → { method, noUser, run() }；index.js 只做查表+鉴权+调用
④ 客户端 src/client/parts/*   24 个片段按文件名顺序拼成 client.js（渲染/交互/本地态）
⑤ 文档 docs/*.md              INDEX 入口 + 生成物（CODE-INDEX/STATE）+ 规范
```

一次 `pmList` 的完整链路：

```text
组件事件 → api('pmList',{node,space})
  → POST /api?op=pmList → index.js route()：查 OPS、按 noUser 决定是否 ensureUser
  → ops.js run() → lib/core/project.js → ContextOS /s/<pod>/c/<portal>/action/run/...
  → { targets, plans, tasks, reports, feedbacks } → 52-pmdata.js → 55-pm.js PmCard
```

规则：客户端**不手拼 URL**（走 `apiPath`/`webUrl`），**不直连 localStorage**（走 `08-store.js`），
宿主**不写业务分支**（写进 `ops.js`）。详见 [`docs/CODE-MAP.md`](docs/CODE-MAP.md)。

---

## 六、能力矩阵（诚实标注）

| 能力 | 状态 | 证据/入口 |
| --- | --- | --- |
| 节点部署 / 启停 / 监控 | 已实现 | `ops: deploy/start/stop/nodes`，`NodeCard` |
| 空间创建 / 构建 / 重启 / 文件树 | 已实现 | `ops: spaceCreate/buildSpace/spaceStart/tree` |
| 应用实例 / 商店 / 模板生成 / 编译 | 已实现 | `createApp`/`autogenApp`/`codegen`/`compile` |
| 项目管理：目标→计划→任务→报告→反馈 | 已实现 | `pmList/pmCreate/...` + `55-pm.js` |
| 数字分身 / 赛博世界 / 日历（含农历）/ 地图 / 甘特 | 已实现 | `40-project.js`、`45-map.js`、`46-pm.js` |
| IDE：文件树 / Monaco / 终端 / Git / 预览 | 已实现 | `20-devworkspace.js` |
| Copilot 对话 + 动作协议 + 表单确认 | 已实现（单轮 JSON 动作） | `lib/core/copilot.js`、`AI-CONVERSATION.md` |
| 设备扫描（远程主机/WiFi/蓝牙/局域网） | 已实现（macOS 能力内） | `ops: devices/sshHosts` |
| 本机控制（音量/剪贴板/截图/锁屏…） | 已实现 | `ops: sysControl` |
| 联网搜索 / 网页抓取 | **未接入**（DSH 有 `ctx.web`） | 见 `README` §十二 |
| 语音识别 / 语音合成 | **未接入**（DSH 有实验 bundle） | 同上 |
| 图像识别 / 图像生成 / 视频生成 | **未接入**（profile 已装 `dsh-image-gen` 可复用） | 同上 |
| 与 DSH 主对话共享上下文 | **未接入**（设计见 `PRODUCT-DESIGN.md` §1.10） | 待做 |

---

## 七、智能体（你）可以做什么

**能调用的**（真实工具，不是文档描述）：`contextos_list_nodes`、`contextos_list_spaces`、
`contextos_read_data`、`contextos_write_data`、`contextos_create_space`、`contextos_create_app`、
`contextos_deploy_node`、`contextos_space_start/stop`、`contextos_pipeline`。

**能跑的验证**：

```sh
npm run build:client     # build → gate → hook-order → op-check → store-check → ui-check → i18n → context → docs
npm run check:ops        # 客户端 api() ↔ OPS 契约
npm run check:store      # 持久化唯一出口 + schema
npm run check:docs       # 文档索引/死链/生成物
npm run verify:ui        # 真浏览器（Edge CDP 9223），exit 0 才算通过
node -e "…"              # 版本号等一次性小改
```

**能改的**：`src/client/parts/*.js`、`src/client/styles/*.css`、`lib/**/*.js`、`index.js`、`scripts/*.mjs`、`docs/*.md`。

**不能改的**：`client.js`（构建产物）、`usr/icebergs/`、`usr/volcanos/`、`page/cache.css`、数据库文件。

**禁止**：手拼 URL、直连 `localStorage`、在 `index.js` 里写 op 分支、用 `sqlite3` 改业务数据、
未 bump 版本就构建、只跑静态门禁就说「已验证」、把测试节点/空间留在环境里。

---

## 八、工作方式：RSI 飞轮

每一轮都是一个闭环，**不是**「改完就说完成」：

```text
① 目标   一句话目标 + 可判定验收（没有目标不动手）
② 计划   范围 / 影响面 / 代价（时间、回归风险）
③ 取证   读代码与文档；能调工具先调；框架行为去源码确认，不猜
④ 改动   最小改动；客户端/宿主/文档同一次提交
⑤ 构建   npm run build:client 全绿；红了先修，不许带 FAIL 交付
⑥ 实测   接口回执（状态码+字段）、界面 DOM/截图、失败先复现
⑦ 抽象   把重复抽象成模板/词表/工具/门禁，让下次手写更少
⑧ 报告   写 usr/local/WorkBuddy/dsh-reports/<日期>-<主题>.md；重复踩的坑 → 新门禁
```

**每轮四件套**（缺一不算完成）：

| 件 | 判据 |
| --- | --- |
| 代码 | `npm run build:client` 全绿 + 接口回执可验证 |
| 文档 | `docs/*` 同步更新（改行为就改对应章节，不追加文末） |
| 门禁 | 本轮踩的坑 → 至少一条新断言（`gate`/`ui-check`/`op-check`/`store-check`/`docs-check`） |
| 规范 | 规则写进 `AGENTS.md` 或 `docs/CODE-GEN.md` |

**加速手段**（用于「加速整个项目进程」）：

1. **先抽象再实现**：同类第二遍就抽模板/词表，第三遍就该由生成器产出。
2. **门禁前置**：能在构建期抓到的，绝不靠人复查。
3. **索引自动生成**：`docs/CODE-INDEX.md`、`docs/STATE.md` 由脚本生成，人不维护。
4. **小步提交**：一个提交一件事，提交信息写「改了什么 + 为什么」。
5. **未验证就说未验证**：结论标注「实测 / 源码确认 / 未验证」。

---

## 九、质量门禁（9 道）

| 门禁 | 抓什么 |
| --- | --- |
| `gate.mjs` | 构建产物哈希/语法、CSS 版本、UI 基线、监控取数入口 |
| `hook-order-check.mjs` | hook 依赖数组引用后声明变量（TDZ 白屏） |
| `op-check.mjs` | 客户端 `api()` 与 `OPS` 不一致、路由层残留业务分支 |
| `store-check.mjs` | 直连 `localStorage` 增量、键未登记、helper 与类型不符 |
| `ui-check.mjs` | 组件复用、布局结构、单一样式来源（88 条） |
| `i18n-check.mjs` | 中英文案键缺失、`Cyber World` 大小写 |
| `context-check.mjs` | AI 上下文包与硬规则仍在文档里 |
| `docs-check.mjs` | 孤儿文档、死链、生成物过期、已合并文档复活 |
| `verify:ui` | 真浏览器：结构、尺寸、字号、无 console error、截图留证 |

---

## 十、文档地图

| 想知道什么 | 读哪份 |
| --- | --- |
| 文档怎么找 | [`docs/INDEX.md`](docs/INDEX.md) |
| 方向与理念（三纲五常） | [`docs/DOCTRINE.md`](docs/DOCTRINE.md) |
| 架构分层与边界 | [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)、[`docs/CODE-MAP.md`](docs/CODE-MAP.md) |
| 文件/组件/op 在哪 | [`docs/CODE-INDEX.md`](docs/CODE-INDEX.md)（生成） |
| 状态存了哪些 | [`docs/STATE.md`](docs/STATE.md)（生成） |
| 接口 URL 与报文 | [`docs/INTERFACE.md`](docs/INTERFACE.md)、[`docs/URL-SPEC.md`](docs/URL-SPEC.md) |
| 代码生成规范 | [`docs/CODE-GEN.md`](docs/CODE-GEN.md) |
| AI 对话协议 | [`docs/AI-CONVERSATION.md`](docs/AI-CONVERSATION.md) |
| 设计规范（布局/颜色/字号） | [`docs/DESIGN-SYSTEM.md`](docs/DESIGN-SYSTEM.md)、根 `USER-VIEW.md` |
| 验收口径 | [`docs/ACCEPTANCE.md`](docs/ACCEPTANCE.md) |
| 完整产品/技术设计稿 | [`docs/PRODUCT-DESIGN.md`](docs/PRODUCT-DESIGN.md) |
| 踩过的坑与决策 | [`docs/RSI-LEDGER.md`](docs/RSI-LEDGER.md) |

---

## 十一、目录速览

```text
index.js                 宿主入口：OPS 分发 + 静态资源 + WebSocket 终端
lib/core/                领域逻辑（nodes/spaces/apps/project/copilot/codegen…）
lib/core/ops.js          102 个 op 的唯一注册表
lib/base/                URL 构造、API 调用、通用工具
src/client/parts/        24 个片段（00-prelude → 60-page），按文件名顺序拼接
src/client/styles/       tokens / main / kit（构建成 assets/client.css）
build/client.mjs         拼装 + 注入版本与 hash
scripts/                 9 道门禁 + 文档生成器
docs/                    INDEX 入口 + 规范 + 生成物
package.json             版本即缓存键
```

---

## 十二、版本、发布、回滚

- 版本号是缓存键：`__CLIENT_CSS_VERSION__`、`@build-hash` 都由 `package.json.version` 派生，**改完必须 bump**。
- 发布前：`git status` 干净、`npm run build:client` 全绿、报告已落盘。
- 回滚：`git reset --hard <commit>` + 重新构建 + 重载插件（数据不回滚）。
- 远端：`https://shylinux.com/x/contextos-devops-dsh`；本机凭据不可用时需人工 `git push`。

---

## 十三、已知限制与下一步

1. **Copilot 仍是单轮 JSON 动作**：没有 tool loop、没有联网、没有多模态。接入方案见
   `usr/dsh-plugins/contextos-devops-dsh/reports/2026-11-14-dsh-022-upgrade-plan.md`。
2. **与 DSH 主对话未打通**：插件内 Copilot 与 DSH 会话各自为政；设计见 `PRODUCT-DESIGN.md` §1.10。
3. **`60-page.js`（约 1.4k 行）与 `50-chat.js`（约 1.3k 行）仍是编排根**：拆分需先抽
   `usePageState()`；插件页在 DSH 渲染进程内，无 CDP 时只能靠静态门禁，回归风险高，留作专项。
4. **宿主改动必须重载**：`lib/*.js` 不热更新，别把「没生效」误判成「没改对」。
5. **macOS 设备能力受系统限制**：SSID 脱敏、蓝牙需 `blueutil`、截图需屏幕录制权限。

## License / 第三方

见仓库根 `LICENSE`；客户端内嵌 Monaco / xterm / three / leaflet 等开源组件，各自遵循原许可证。
