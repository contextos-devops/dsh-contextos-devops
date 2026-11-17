# 架构与边界 / ARCHITECTURE

> 读这份当：要弄清「代码分几层、请求怎么走、模块归谁、改动该落在哪一层」。
> 不读这份当：文件级清单（行数/导出/op 表）看生成物 [CODE-INDEX.md](CODE-INDEX.md)；产品愿景看 [PRODUCT-DESIGN.md](PRODUCT-DESIGN.md)；接口形状看 [INTERFACE.md](INTERFACE.md)。

## 1. 五层与边界

```text
用户点界面
  → src/client/parts/*.js            ④ 客户端（构建产物 client.js）
      api(op, body) → fetch /api
  → index.js                         ③ 路由：只做 OPS[op] 分发 + 鉴权
  → lib/core/ops.js                  ③ 契约：op → { method, noUser, run() }
  → lib/core/*.js                    ② 领域：nodes/spaces/apps/project/copilot/codegen
  → ContextOS HTTP /c/.../action/…   ① 平台（只读，不改）
```

| 层 | 位置 | 允许 | 禁止 |
| --- | --- | --- | --- |
| ① 平台 | `usr/icebergs`、`usr/volcanos` | 只读、按接口调用 | 手改框架文件 |
| ② 领域 | `lib/core/*.js`、`lib/base/*.js` | 业务规则、API 调用、URL 构造 | 认识 React/DOM |
| ③ 契约 | `lib/core/ops.js`、`index.js` | op 注册、方法门、鉴权前置 | 写业务分支（`if (op === '…')`） |
| ④ 客户端 | `src/client/parts/*.js` | 渲染、交互、本地状态 | 手拼 URL、直连 localStorage |
| ⑤ 文档 | `docs/*.md` | 索引与规范 | 手改生成物 |

## 2. 一条请求怎么走

```text
组件事件
  → api('pmList', { node, space })           lib/base/api.js（方法由 OPS[op].method 决定）
  → POST /dsh-contextos-devops/api?op=pmList&node=…
  → index.js route()                          OPS 查表；非 noUser 先 ensureUser(node)
  → ops.js run(body, ctx)                     → lib/core/project.js listPm()
  → ContextOS /s/<pod>/c/web.team.xiangmuguanli.portal/action/run/plan/action/list
  → { targets, plans, tasks, reports, feedbacks }
  → 52-pmdata.js 一份 loader → 55-pm.js PmCard / 46-pm.js 表单
```

AI 操作：`ChatPanel → chat(message, history, context, mode) → ctx.llm → {reply, action}`
→ 白名单校验 → 同一套 `api()` 执行 → 回读。初始化：`runInit` → 节点部署/复用 → 社区 + 办公空间
→ 打开空间首页（DB bootstrap）→ 建分身 → 建项目 → 刷新 PM。

## 3. 宿主接入（DSH 插件）

```js
// index.js
export const inject = ['tools', 'webServer', 'llm'];
export function apply(ctx) { … }
```

1. **工具**：`ctx.tools.register`（`contextos_*`），供 DSH 主代理调用；
2. **HTTP API**：`/dsh-contextos-devops/api`（`?op=` 单一入口，方法门在 `ops.js`）；
3. **静态资源**：`/monaco`、`/xterm`、`/three`、`/leaflet` 与插件自身 `assets/`；
4. **WebSocket**：`/dsh-contextos-devops/terminal`（PTY 多会话）；
5. **LLM**：`ctx.llm`（`chat` op 调 `lib/core/copilot.js`）。

客户端由 `build/client.mjs` 拼 24 个片段成 `client.js`，经
`window.__ModuleLoader__.load({ id, factory })` 作为 Web 插件加载；React 由宿主提供。

## 4. 后端分层与关键机制

```text
lib/core/   业务（可引用 base + misc）：nodes / spaces / apps / project / copilot / codegen / avatar
lib/base/   基础（可引用 misc）：http / url / registry / state / env / platform / table / field
lib/misc/   叶子工具：shell（进程）/ async（等待）/ static（静态资源）
index.js    接线：工具注册 + HTTP/WS 路由 + 静态资源（不写业务分支）
```

- **HTTP_DEBUG AsyncLocalStorage**：记录真实 ContextOS URL/method，回传前端 DEBUG 面板；
- **写操作走真实 HTTP**：不另造数据格式；**PM 不直读 SQLite**（历史直读路径已移除）；
- **翻译**：带浏览器 UA 的请求取 `_trans` 元数据，缓存 60 秒；
- **状态**：`~/.dsh/dsh-contextos-devops/state.json`（节点缓存、终端缓冲、请求日志、选择记忆、prefs、clientCheck）。

## 5. 客户端结构与片段分工

构建顺序即文件名序（24 片段，行数与职责见 [CODE-INDEX.md](CODE-INDEX.md)）。几个「唯一入口」：

| 关注的 | 唯一实现 |
| --- | --- |
| 持久化 | `08-store.js`（`CX_STORE_SCHEMA` + `cxRead/cxWrite`） |
| 基础原语 | `10-ui.js`（Btn/Toolbar/Section/Field/EmptyState/ErrorBox/Card/Tabs/KeyValueTable/DataTable/DetailTabs） |
| PM 数据 | `52-pmdata.js`（`usePmData`） |
| PM 卡片/菜单 | `55-pm.js`（`PmCard`/`PmActionMenu`/`PmSectionHead`/`PmFilter`/`PmEmpty`/`PmCreateButton`） |
| PM 选择态 | `51-pmselection.js`（五个选中 id 的恢复/保存） |
| 调试检查器 | `12-debug.js`（`DebugDetail`） |
| 编辑器页签/Git | `25-editor-ui.js`（`EditorTabs`/`GitSections`） |
| 页面编排 | `60-page.js`（只编排，不加 PM 取数/卡片标记） |

## 6. 契约

- **报文**：解析 `option`/`append`/`key,value`；`count:0x0`、HTTP 200 都不等于成功，必须回读。
- **UID**：32 位 hash；规范名 `target_uid/plan_uid/task_uid/report_uid/feedback_uid/item_uid`，
  客户端只传 snake_case，别名在服务端边界归一。
- **方法**：create→PUT、remove→DELETE、其余 POST；`GET /action/` 只允许 login/run/command。
- **URL**：只走 `lib/base/url.js`（`apiPath`/`webUrl`）与 `cxWebUrl`，见 [URL-SPEC.md](URL-SPEC.md)。
- **状态**：浏览器只经 `08-store.js`（键表 [STATE.md](STATE.md)）；跨端口要记住的走服务端 `stateSet`。
- **UI**：`--cx-*` token + `10-ui.js` 原语，禁止页面私有样式。

## 7. 客户端架构契约

1. **Tokens**：`src/client/styles/tokens.css` 是颜色/字号/间距/圆角唯一来源，组件只用 `--cx-*`。
2. **UI kit**：`10-ui.js`；新 UI 尽量组合它，不重写裸 `<table>`/`<button>` 标记。
3. **Domain**：`lib/core/*` 拥有 ContextOS 调用、状态规则与动作矩阵；客户端只渲染 `item.actions`。
4. **Specs**：UI 硬规则见 [ACCEPTANCE.md](ACCEPTANCE.md) §12 与根 `../../../USER-VIEW.md`。
5. **Gate**：`npm run check:ui` 随 `build:client` 跑。

规则：新代码不写裸设计值；有原语就不复制标记；客户端不推断状态/动作；面板未挂载不预取；
PM 请求只有一种形状（当前节点 + 分身 + 选中 id）；每个交互态都要有加载/空/错误/长文本。

## 8. 模块归属与外部依赖

| 关注 | 归属 | 备注 |
| --- | --- | --- |
| PM 状态机 | `lib/core/project.js` | 客户端不复制状态规则 |
| 部署节点 | `lib/core/nodes.js` + `installer.js` | `deployOptions` 探测 git/go；`buildInstallPlan` 选 source/binary/copy；9 个可用平台 |
| 建空间 | `lib/core/spaces.js` | `createSpace`/`initSpace` 把节点二进制复制进空间 `bin/ice.bin` |
| 代码生成 | `lib/core/codegen.js` | 见 [CODE-GEN.md](CODE-GEN.md) |
| 对话 | `lib/core/copilot.js` | 见 [AI-CONVERSATION.md](AI-CONVERSATION.md) |

| 依赖 | 用途 | 方式 |
| --- | --- | --- |
| Three.js 0.160 | 3D 人物/数字城市 | `vendor/three` + 动态 import |
| Leaflet 1.9.4 | 腾讯地图任务点 | `vendor/leaflet` |
| Monaco | 代码编辑器 | 宿主资源 `/monaco` |
| xterm.js | Web 终端 | `vendor/xterm` |
| ContextOS HTTP | 节点/空间/应用/数据 | 真实 API |
| DSH `ctx.llm` | AI 意图 | 宿主注入 |

## 9. 改动路由

最常改的四处：新 op → `lib/core/ops.js` + 领域函数（跑 `check:ops`）；新状态键 → `08-store.js`
（跑 `docs-index --write`）；新界面 → 组合 `10-ui.js`（跑 `check:ui` + `check:probe`）；
新文档 → `docs/INDEX.md` 登记（跑 `check:docs`）。完整「改哪里 + 顺手做什么」见
[AGENTS.md](../AGENTS.md) §五与 [INDEX.md](INDEX.md)。
