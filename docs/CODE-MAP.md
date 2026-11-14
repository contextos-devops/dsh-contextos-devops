# 代码地图 / CODE MAP

> 只讲**边界与数据流**；文件级清单（行数、导出）看生成物 `docs/CODE-INDEX.md`。

## 一、五层与边界

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

## 二、一条请求怎么走

```text
组件事件
  → api('pmList', { node, space })           lib/base/api.js（方法由 OPS[op].method 决定）
  → POST /contextos-devops-dsh/api?op=pmList&node=…
  → index.js route()                          OPS 查表；非 noUser 先 ensureUser(node)
  → ops.js run(body, ctx)                     → lib/core/project.js listPm()
  → ContextOS /s/<pod>/c/web.team.xiangmuguanli.portal/action/run/plan/action/list
  → { targets, plans, tasks, reports, feedbacks }
  → 52-pmdata.js 一份 loader → 55-pm.js PmCard / 46-pm.js 表单
```

## 三、客户端片段分工（构建顺序 = 文件名顺序）

| 片段 | 职责 |
| --- | --- |
| `00-prelude` | 全局常量、词表、格式化、i18n 原语 |
| `05-bootstrap` | 模块加载入口 |
| `08-store` | **唯一持久化出口**（schema + cxRead/cxWrite） |
| `10-ui` | token 化原语（按钮/输入/页签/表格） |
| `12-debug` | DebugDetail 检查器 |
| `15-layout` | 三栏骨架 |
| `20-devworkspace` | IDE 工作区（Monaco/xterm/three） |
| `25-editor-ui`、`30-modals` | 编辑器 UI、通用弹窗 |
| `32-cards`、`34-forms`、`36-data` | 实体卡、表单、数据表 |
| `40-project`、`45-map`、`46-pm`、`47-three` | 项目/地图/PM 弹窗/三维 |
| `49-msg` | 消息内组件（实体卡、写入表单、提问表单、Elapsed） |
| `50-chat` | 会话编排、Copilot 动作执行、PM 面板 |
| `51-pmselection`、`52-pmdata`、`55-pm` | PM 选择态、数据 loader、PM 卡片与菜单 |
| `58-config`、`59-monitor` | 配置/调用、监控 |
| `60-page` | 页面编排（页头、控制台、IDE 挂载） |

## 四、契约

- 报文：解析 `option`/`append`/`key,value`；`count:0x0`、HTTP 200 都不等于成功，必须回读。
- UID：32 位 hash；`target_uid/plan_uid/task_uid/report_uid/feedback_uid`。
- 方法：create→PUT、remove→DELETE、其余 POST；GET `/action/` 只允许 login/run/command。
- URL：只走 `lib/base/url.js`（`apiPath`/`webUrl`）与 `cxWebUrl`，见 `docs/URL-SPEC.md`。
- 状态：浏览器只经 `08-store.js`（键表 `docs/STATE.md`）；跨端口必须记住的走服务端 `stateSet`。
- UI：`--cx-*` token + `10-ui.js` 原语，禁止页面私有样式。

## 五、改动路由

| 要加什么 | 改哪里 | 顺手要做的 |
| --- | --- | --- |
| 新 op（后端动作） | `lib/core/ops.js`（+ 领域函数） | `npm run check:ops`；`docs/INDEX.md` 不用改 |
| 新接口字段 | `lib/core/project.js` | `docs/MEMORY.md` 契约段 |
| 新持久化状态 | `08-store.js` 的 `CX_STORE_SCHEMA` | `node scripts/docs-index.mjs --write` 更新 `docs/STATE.md` |
| 新 PM 状态/动作 | `lib/core/project.js` | 状态机表进 `docs/MEMORY.md` |
| 新 PM 卡片/菜单 | `55-pm.js`，复用 `10-ui.js` | `npm run check:ui` |
| 新调试页签 | `12-debug.js` | `docs/ACCEPTANCE.md` §12 |
| 新页面区块 | 组合既有原语，不新建数据 loader | `docs/DESIGN-SYSTEM.md` |
