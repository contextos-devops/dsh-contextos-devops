# AGENTS · 插件工作契约

> 本文件约束**两类智能体**：
> 1. 在本仓库里改代码的 **DSH 代理**（外部驱动）；
> 2. 插件内 **Copilot**（`/api?op=chat`，用户在界面里对话）。
>
> 冲突时：根目录 `../../../AGENTS.md`（平台铁律）> 本文件 > `docs/*`。
> 每次对话先读本文件与 `docs/AI-CONTEXT.md`，再动手。

---

## 一、铁律（违反即返工）

| # | 铁律 | 判据 |
|---|---|---|
| 1 | **不改构建产物**：`client.js` 只能由 `node build/client.mjs` 生成 | `git diff client.js` 必须来自构建 |
| 2 | **每次改动 bump `package.json` 版本** | 缓存失效 + 可追溯 |
| 3 | **改完必过构建链**：`npm run build:client` | `gate: PASS` + `ui-check` 全绿 + `context-check: passed` |
| 4 | **宿主改动必须重载**：`plugin_manager set_plugin target=include:contextos-devops-dsh` 先 false 再 true | 否则 `lib/*.js` 不生效 |
| 5 | **不改框架**：`usr/volcanos/`、`usr/icebergs/` 只读；`page/cache.css` 只能由 `POST /c/webpack/action/create` 生成 | 手改即污染 |
| 6 | **不直连数据库**：数据操作走 HTTP API（`apiPath` / `webUrl`） | 禁止 `sqlite3 var/db/*.db` 改数据 |
| 7 | **URL 单一来源**：`lib/base/url.js` 与 `cxWebUrl` | 手拼 URL 一律拒绝 |
| 8 | **词表优先**：字段/操作用 `lib/core/vocab.js` 里的框架名 | 自定义名直接拒绝 |
| 9 | **结论必须有证据**：命令输出、回执、截图、`exit code` | 「应该可以」不算完成 |
| 10 | **报告落盘**：`usr/local/WorkBuddy/dsh-reports/` | 不落盘 = 没做 |

---

## 二、DSH 工作流（改插件代码时）

```
① 定位 → ② 取证 → ③ 目标/验收 → ④ 改动 → ⑤ 构建 → ⑥ 重载 → ⑦ 实测 → ⑧ 报告/反馈
```

**① 定位**
- 读 `AGENTS.md` → `docs/AI-CONTEXT.md` → 相关 `docs/*`（`CODE-GEN.md` / `URL-SPEC.md` / `INTERFACE.md` / `AI-CONVERSATION.md`）。
- 只读相关章节，不整份塞。

**② 取证**
- 读现有代码与文档；能调工具的先调：`contextos_list_nodes` / `contextos_list_spaces` / `contextos_read_data`。
- 涉及框架行为，去源码确认（`usr/icebergs/`、`ice@vX/hash.go`、平台 `gonganxitong/`），不猜。

**③ 目标/验收**
- 一句话目标 + 可判定验收（例：`/c/command/...` 的 `meta.create[1].type === "select"`）。
- 三件事写清楚：**改哪里、怎么验、失败怎么退**。

**④ 改动**
- 客户端：`src/client/parts/*.js`、`src/client/styles/*.css`；构建前不要碰 `client.js`。
- 宿主：`lib/**/*.js`、`index.js`；改 import 后必须 `node --check`。
- 文档：与改动同一次提交更新（`CODE-GEN.md` / `URL-SPEC.md` / `AI-CONVERSATION.md`）。

**⑤ 构建**
```sh
node -e "const p=require('./package.json');p.version='x.y.z';require('fs').writeFileSync('package.json',JSON.stringify(p,null,2)+'\n')"
npm run build:client     # build → gate → ui-check → i18n → context
```
任何一项红：**先修再继续**，不允许带着 `FAIL` 交付。

**⑥ 重载**
```js
plugin_manager({ action:'set_plugin', target:'include:contextos-devops-dsh', enabled:false })
plugin_manager({ action:'set_plugin', target:'include:contextos-devops-dsh', enabled:true })
```

**⑦ 实测**
- 接口：真实 curl/工具调用，记录状态码、耗时、回执片段。
- 界面：`browser_open` + `browser_screenshot`，看 DOM 与截图，不靠「我觉得」。
- 失败复现：先复现，再修，再复现验证。

**⑧ 报告/反馈**
- 报告写 `usr/local/WorkBuddy/dsh-reports/<日期>-<主题>.md`：目标、命令、回执、耗时、结论、清理动作。
- 反复踩的坑 → 加一条 gate 断言（`scripts/gate.mjs` 或 `scripts/ui-check.mjs`）。

### DSH 禁止清单

| 禁止 | 原因 |
|---|---|
| 手改 `client.js` | 下次构建被覆盖 |
| 手改 `usr/volcanos/index.css` / 清空 `page/cache.css` | 页面立刻无样式，只能靠 `webpack create` 重建 |
| 用 `sqlite3` 改业务数据 | 绕过框架，留下脏数据 |
| 未 bump 版本就构建 | 客户端缓存不刷新 |
| 「已修复」但没有 exit code / 回执 / 截图 | 无法验证 |
| 把测试节点/空间/实例留在环境里 | 污染用户数据，收尾必须清理 |

---

## 三、插件内 AI 对话流程（Copilot）

### 3.1 请求链

```
用户输入
  → 客户端前置判断（模式 / 正则 / 上下文）
  → POST /contextos-devops-dsh/api?op=chat   { message, history, context }
  → 宿主 lib/core/copilot.js 拼 system + context + history + user
  → { reply, action | actions }
  → 客户端 executeAction(action) → 渲染卡片/表单/表格
```

### 3.2 上下文（单一命名，不设别名）

```
mode view node space app avatar scene web editor experience functions nodes spaces apps
```

- 一个概念只用一个字段名；`serve/pod/place/background/selection` 这些旧别名已删除。
- 上下文由客户端组装，宿主只读不改写。

### 3.3 三种模式，权限不同

| 模式 | 能做 | 不能做 |
|---|---|---|
| `avatar` 数字分身 | 创建实例、读写应用数据、查最近应用 | 生成代码、部署节点 |
| `factory` 软件工厂 | 部署节点、建空间、生成模板/代码、编译 | **禁止 data**、禁止查最近应用 |
| `iot` 物联 | 扫描/连接/控制设备 | 业务数据、代码生成 |

客户端在**调用模型之前**按模式短路，不把选择权交给模型。

### 3.4 动作协议

| 动作 | 触发 | 前置 |
|---|---|---|
| `data`（读写应用数据） | 「添加/录入/查询…」 | 仅 `avatar`；先 `resolveWrite` 定位应用与功能 |
| `createSpace` | 「创建空间」 | 先弹确认表单（名称 + 仓库地址） |
| `createApp` / `autogenApp` | 「生成应用模板」 | 先 `appPlan` 出五功能 → 确认表单 → 编译 |
| `codegen` | 「加一个动作/字段」 | 先 `codegenPlan` → 表单 → 合并写入 → 编译 |
| `deploy` | 「部署 9188 节点」 | 端口/目录确认后执行 |

**硬规则**
1. 需要用户确认的写操作，**必须**先出表单，不允许直接执行。
2. 表单提交后进入只读态（`localStorage['contextos-devops-dsh:formstate']`，键 `node|space|place_uid|fn`），刷新也不回到可编辑。
3. 会话记忆持久：`localStorage['contextos-devops-dsh:chat']`（消息）与 `contextos-devops-dsh:session`（节点/空间/应用/模式/标签/分栏）。
4. 结果卡片**复用管理视图组件**（`NodeCard/SpaceCard/AppRow/StoreRow`），不新造样式。
5. 失败必须显示真实错误（状态码 + 回执片段），不允许「正在执行…」后无下文。
6. 可执行请求不允许只用散文回答（prompt 里已写 `NEVER answer a data-write request with prose only`）。

### 3.5 渲染约定

| 内容 | 组件 |
|---|---|
| 过程 | `.cx-step`（一行一步） |
| 列表 | `.cx-dtable`（最多 20 行 × 5 列） |
| 详情 | `.cx-dtable-kv`（键值两列） |
| 表单 | `CxWriteForm`（标题 = 操作 + 功能） |
| 确认 | `CxAskForm`（可编辑字段 + 确认） |
| 实体卡 | `NodeCard` / `SpaceCard` / `AppRow` / `StoreRow` |

---

## 四、验收（缺一不算完成）

| 层级 | 判据 |
|---|---|
| 静态 | `npm run build:client` 全绿（gate / ui-check / i18n / context） |
| 接口 | 真实调用返回预期回执（状态码 + 关键字段） |
| 渲染 | 浏览器 DOM 断言 + 截图 |
| 人证 | 报告里的命令输出与截图路径 |

> RSI：目标 → 计划（范围/影响/代价）→ 分析 → 任务 → 执行 → 报告 → 反馈。
> 没有目标不动手；没有报告不算完成；没有反馈不算闭环。

---

## 五、版本与发布

- `package.json` 版本即缓存键：`__CLIENT_CSS_VERSION__` 与 `@build-hash` 都由它派生。
- 发布前：`git status` 干净、构建全绿、报告已落盘。
- 回滚：`git reset --hard <commit>` + 重新构建 + 重载插件。

---

## 六、常用入口

| 入口 | 说明 |
|---|---|
| `docs/AI-CONTEXT.md` | 上下文包与文档路由 |
| `docs/CODE-GEN.md` | 代码生成规范（两类模块、词表、参数文法、权限） |
| `docs/URL-SPEC.md` | 接口 URL / 网页 URL 形状与禁止清单 |
| `docs/INTERFACE.md` | 一条命令五种形态、两层能力、认证 |
| `docs/AI-CONVERSATION.md` | 对话请求参数、动作表、已知缺口 |
| `scripts/gate.mjs` | 构建门禁（版本、哈希、规范断言） |
| `scripts/ui-check.mjs` | 静态 UI 门禁 |
| `scripts/ui-verify.mjs` | 真浏览器验收（exit 0/1/2） |
