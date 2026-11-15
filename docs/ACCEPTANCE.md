# 验收规范 / ACCEPTANCE


> 读这份当：要判定「这次改动算不算完成」、需要证据表或验收分级。
> 不读这份当 → 流程 → `../AGENTS.md` §七；历史坑 → `RSI-LEDGER.md`
> 一句话：**没有证据 = 未验收；无法验收 = 不算完成。**
> 本文件是插件交付的**唯一**验收口径：分级（L0–L3）、强制流程、证据表、
> UI 硬规则、可用性门禁（`verify:ui`）都在这里。任何“完成”结论都必须能落到证据表。

## 1. 验收分级（四级，缺一不可）

| 级别 | 验什么 | 怎么验 | 通过证据 |
| --- | --- | --- | --- |
| **L0 静态** | 语法、构建、静态门禁 | `npm run build:client` | 退出码 0 + `ui-check`/`context-check` 通过行 |
| **L1 接口** | 同一个后端入口、真实回读 | `node --check index.js` + `POST /dsh-contextos-devops/api` | 请求/响应原文 + 回读结果；200 不等于成功 |
| **L2 渲染** | 真实浏览器 DOM、样式、控制台、交互 | `dsh-preview` 的 `browser_open/console/read/interact` | 页面 URL、0 console error、关键选择器与尺寸、截图 |
| **L3 人看** | 视觉与任务闭环 | 截图 + 实际操作路径 | 截图路径 + “哪些没验到”的明确说明 |

**退出码语义**：`0` = 通过；`1` = 有失败项，必须修；`2` = 无法验证（没有浏览器/服务），
**不能当作通过**。

## 2. 强制流程

1. **先写可判定目标**：一句话说明“解决什么、什么算完”，并列出 3–7 条可核验验收句。
2. **L0**：`npm run build:client`，贴出退出码。
3. **L1**：用真实 API 复现/验证；写操作后必须回读同一对象。
4. **L2**：用 `dsh-preview` 打开页面，先看 console，再读 DOM/样式，再操作关键按钮，最后截图。
5. **L3**：人看截图；同时写明无法验证的部分（例如无头浏览器与真实 GPU 的差异）。
6. **清理**：一次性节点/空间/应用必须删除，并在报告里写清理结果。
7. **回灌**：把本轮新增的坑写进 `docs/RSI-LEDGER.md`；能机器判定的写成 gate。

## 3. 证据表（报告模板）

```text
ACCEPT <feature> @ <time>
Goal: <一句话>
Scope: <改动文件/接口>
Cost: <实际耗时；如涉及部署，写节点/空间成本>

L0: npm run build:client -> exit 0; ui-check N passed; context-check passed
L1: request <op/args> -> response <ok/data>; read-back <field=value>
L2: URL <...>; console 0 errors; selectors <...>; text/styles <...>
L3: screenshot <path>; 人看结论 <...>
Cleanup: <deleted node/space/app or none>
Unverified: <明确列出，不能省略>
```

## 4. UI 验收清单（每次 UI 改动）

- 4px 间距；控件高 28/32/36 与 token 一致；没有任意空白带。
- 表头、KEY/VALUE 列对齐；长 URL/日志换行，不撑宽面板。
- Tab 横排、sticky；不做重复标题。
- 空态、加载、错误三态都有明确文案；错误可见且可重试。
- 危险操作在上下文菜单；主操作在卡片行。
- 控制台 0 error；关键按钮点过至少一次；截图留档。
- 新增页面/组件时，必须同步在 `scripts/ui-verify.mjs` 或 `ui-check.mjs` 增加断言。

## 5. API 验收清单

- 方法门：create/insert→PUT；modify/update→POST；remove/delete→DELETE；其余 POST。
- 不拿 `GET /action/` 探活；探活只用 `/c/version`、`/c/dream`。
- 200、`_status:0x0`、`count:0x0` 都不等于成功；按 `append` 回读关键字段。
- UID 是 32 位 hash；字段名用 `target_uid/plan_uid/task_uid/report_uid/feedback_uid`。
- 平台查询必须带 `place_uid`，不能跨实例读写。
- 写值不能包含半角 `/`。

## 6. PM 验收矩阵

| 对象 | 主操作 | 上下文菜单 | 关键回读 |
| --- | --- | --- | --- |
| 目标 | `+ 计划` | 修改/删除（无计划时） | `planCreate` 后目标下出现计划 |
| 计划 | 提交/审批/执行 | 修改/删除/驳回 | `status_name` 变化，不是 `Number(status)` |
| 任务 | `+ 报告` / 开始任务 | 修改/删除/取消/移交 | `process` 任务出现 `+ 报告`，已完成不出现 |
| 报告 | `+ 反馈` / 打开 | 修改/删除（任务进行中且无反馈） | 反馈创建后报告下出现反馈 |
| 反馈 | 打开 | 修改/删除（任务进行中） | 反馈内容与任务关联 |

## 7. 软件工厂验收

1. `deploy`：节点 `/c/version` 可访问，`/v/index.css` 返回 200。
2. `createSpace`：只发送 `name`；`/c/dream` 出现日期前缀名称，空间 `/c/version` 可访问。
   请求应为 `PUT /c/dream/action/create?name=<fullName>`，不得带 `binary`、`space.noecho`、`repos` 或 `user.uid`。
3. `autogenApp`：空间内生成 `src/<zone>/main.shy`，编译无 warn/error。
4. `createApp`：生成的命令可写一条记录并读回；字段名符合 ContextOS 规范。
5. 清理：删除一次性空间；保留证据（请求/响应/命令路径）。

## 8. 浏览器验收工具

已安装 `dsh-preview`（profile `desktop`），并提供 `frontend-verify` 技能。
验收时按技能顺序：

```text
browser_open → browser_console(errorsOnly) → browser_read(text/styles)
→ browser_interact(click/type/press) → browser_screenshot → 修复后重验
```

- 页面必须来自 **localhost / 127.0.0.1**；外部域名要在配置里显式放行。
- 无头浏览器不覆盖 pointer lock、GPU 细节、系统弹窗；这些要写进 `Unverified`。
- 不截含凭据/个人数据的页面。
- 插件安装后如果宿主没有热加载，下一次允许的重启后再调用；**不得为了验收反复重启宿主**。

## 9. 失败处理

- 先复现，再改根因，再同一入口回读；禁止只改客户端绕过后端。
- 一次只修一个根因；修完重跑 L0→L2。
- 不能在任务中 kill/重启 DSH 宿主；需要重启时先征得用户同意，并记录 pid 与回滚办法。
- 验收红了就说红了；不许用“应该可以”“构建通过”代替。

## 10. 本轮证据（2026-11-13，软件工厂）

```text
ACCEPT createApp @ 2026-11-13 15:47 CST
Goal: 在可丢弃空间里生成一个真实 CRUD 应用，写一条记录并从同一命令读回。
Scope: lib/core/gobuild.js; lib/core/spaces.js::buildSpace/restartSpace; scripts/ui-check.mjs; package.json 1.30.6
Cost: 本地测试空间 1 个；无新增节点；go mod tidy/build 约 15s

L0: npm run build:client -> ui-check 78 passed; context-check passed
L1: direct createApp(9197, 20261113-factorycheck2, accept2)
    -> {"command":"web.chat.devops.accept2"}
    PUT /action/create?title=acceptance2&content=probe2&user_uid=...
    -> readData rows[0].title="acceptance2", count="1x5"
L2: http://localhost:9197/s/20261113-factorycheck2/c/web.chat.devops.accept2
    -> title "ContextOS web.chat.devops.accept2"; console 0 errors
    -> table headers index,time,title,content,user_uid; 1 data row
L3: screenshot /Users/shy/.dsh/profiles/desktop/.dsh-preview/page-3-1794556134011.png
Cleanup: deleteSpace(9197, 20261113-factorycheck2) -> deleted:true; dir removed
Unverified: 宿主当前仍加载旧 apps.js；修复后的 createApp 以模块直调验证，
            需用户批准一次重启后才对聊天 UI 生效。
```

根因与修复：节点进程 PATH 没有 `/usr/local/go/bin`，`vimer/compile` 静默执行
`go build` 失败；共享的 `lib/core/gobuild.js` 显式解析本地 Go（`GO` →
`<ctx>/usr/local/go/bin/go` → `/usr/local/go/bin/go`），执行 `go mod tidy` +
`go build`；`buildSpace` 用 `restartSpace` 加载新二进制。不要再用“编译返回 200”当成功。

## 10.1 本轮补充证据（2026-11-13 16:37 CST，autogen 与对齐）

```text
ACCEPT autogen + alignment @ 2026-11-13 16:37 CST
L0: npm run build:client -> ui-check 84 passed; context-check passed; version 1.30.7
L1: old host POST /dsh-contextos-devops/api {"op":"autogenApp",...}
    -> HTTP 200, ok:true, data.built=false
       warning "go mod tidy failed (1): ... module declares its path as ice
                but was required as ice/devops"
       data.goWork.code=1 (stale probe entries)
    Root cause: autogen omitted ensureGoMod/value files, swallowed buildSpace errors,
    and used Chinese labels as Go value identifiers.
L1 fix: direct autogenApp on clean disposable space -> built:true,
    command web.team.employee.portal.
L2: http://localhost:9197/s/20261113-factorycheck6/c/web.team.employee.portal
    -> title ContextOS web.team.employee.portal; console 0 errors.
L3: screenshot page-4-1794558943011.png
Cleanup: deleteSpace -> deleted:true; stale go.work entries dropped.
Alignment: fixture at 900px, .cx-chat-typing box x=26,w=864;
    .cx-compose box x=26,w=864; text starts x=40 for both (14px padding).
Unverified: real DSH GUI screenshot blocked by web auth in headless browser;
    CSS/geometry verified on the same stylesheet; host still needs one restart
    to load the new backend.
```

## 11. 重启后一键复验

后端改动（如 `gobuild.js`）必须由宿主重新加载后才对聊天 UI 生效。重启后运行：

```sh
node scripts/accept-factory.mjs --url http://127.0.0.1:<当前DSH端口> --node 9197
# 或 npm run verify:factory -- --url http://127.0.0.1:<port> --node 9197
```

脚本会创建一次性空间、生成 `web.chat.devops.verifyapp`、写读一条记录、
打印 `ACCEPT factory: PASS`，并在 finally 中删除空间。失败退出码 1；
清理失败退出码 2；**不要用 `2` 当通过**。

## 12. UI 硬规则与视觉检查

> 产品口径以根目录 `USER-VIEW.md` 为准；这里只记插件额外加的机器可查项。

**硬规则**

- 4px 间距刻度；不出现随意空白带。
- 不重复标题（页签文字已经表达含义）。
- 滚动容器用 sticky 分区/页签头。
- 不被强制撑满高度的侧栏；高度跟内容，除非内容必须滚动。
- 表格固定布局，首列稳定。
- 长 URL/选项/日志换行（`overflow-wrap:anywhere`），不撑宽面板。
- 空态、加载、错误三态都有明确文案。
- 单一数据源；不要在渲染组件挂载前预取。
- 危险操作在上下文菜单；主操作只在卡片行。
- 状态驱动的按钮来自 `lib/core/project.js` 的代码规则，客户端不自造状态机。

**上屏前必须看的**（当前桌面尺寸的真实截图）

- 页签横排一行、滚动时 sticky；
- 头部 KEY/VALUE 列对齐；
- 长值不溢出；
- 没有任意空白带；
- 空态/错误态可见。

**初始化向导**

- 端口有探测动作，且绝不占用已存在的节点/监听端口。
- 标准词：`Digital Avatar & Cyber World` / `Cyber World`（标题大小写）。
- 第 3 步收集目标与计划描述，不是任务列表。
- 运行视图是滚动表格：时间、耗时、操作、影响/接口、状态。
- 失败步骤有重试；重试保留既有节点/分身上下文。
- 中英文案都有；`check:i18n` 校验必需键与 Cyber World 大小写。

## 13. 可用性门禁（verify:ui / release）

> 判据不是我说了算，是 `npm run release` 的退出码。

**铁律**

1. 任何 UI 改动，`npm run release` 退出码 = 0 才允许说「完成」。
2. 退出码 2（无法验证）不算完成：先开浏览器再验证。
3. 报告必须贴 verify 输出（metrics + PASS/FAIL），不接受「应该没问题」。
4. 失败项先修，不许「下次再改」。
5. 新增 UI 面（新页面/新组件）必须同步在 `scripts/ui-verify.mjs` 加断言。

**检查项**

| 类别 | 断言 |
| --- | --- |
| 可打开 | 能进入插件页，`.cx-shell` 存在 |
| 结构 | 顶栏、流程条、输入框、右栏、模式切换都存在 |
| 无错误 | 没有 `.cx-error-pane`，运行时无 console error |
| 尺寸 | 顶栏 padding=20、控件高=28、chip 高=28 |
| 字号 | 控件 ∈ {10,12,14}、标题=14、正文=10 |
| 图标 | 宽度 ∈ {14,18} |
| 基线 | 关键数值与 `scripts/ui-baseline.json` 对比，偏差报警 |
| 留证 | 每次生成 `/tmp/ui-verify.png` 截图 |

**流程**

```sh
npm run release     # 构建 + 门禁 + 可用性验证，必须 exit 0
```

浏览器前置（只需一次）：

```sh
"/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge" \
  --user-data-dir=/tmp/edge-ui --remote-debugging-port=9223 about:blank
```

**例外**：纯文档改动可只跑 `npm run build:client`；宿主 `lib/*.js` 改动仍需
重启应用后跑 `npm run verify:ui`，否则视为未验证。
