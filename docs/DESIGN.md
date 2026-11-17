# 插件设计与理念

> 读这份当：要给新同事/新 Agent 讲清楚「这个插件为什么长这样」，或准备大改架构。
> 不读这份当：只是改一个按钮 → `DESIGN-SYSTEM.md`；改一个接口 → `INTERFACE.md`。

**按章读**：§1 定位 / §2 分层 / §3 请求路径 / §4 状态真源 / §5 与 ContextOS 三架的对偶 / §6 十条原则 / §7 反模式 / §8 质量体系 / §9 演进史 / §10 代价。

## 1. 一句话与三个不变量

**一句话**：把 ContextOS 的「节点 / 空间 / 应用 / 分身 / 项目 / 设备」装进 DeepSeek Harness 的对话界面，
让一个人用说话完成「部署集群 → 建空间 → 生成代码 → 发布应用 → 日常运营」。

三个不变量（违反任何一个，架构就塌）：

1. **只有一条数据通路**：组件 → `api(op)` → `ops.js` 里的 op → `lib/core/<域>.js` → ContextOS HTTP。
   任何绕过 `api()` 的 fetch、任何在 `index.js` 里写的业务分支，都是破坏这条通路。
2. **只有一处真源**：URL 只在 `lib/base/url.js`，存储键只在 `CX_STORE_SCHEMA`，颜色/字号只在 `tokens.css`，
   项目管理状态机只在 `lib/core/project.js`，提示词只在 `lib/core/copilot.js`。
3. **每一层默认够用**：新组件不写字号/颜色/间距/字号/圆角/动画；默认值由 `base → layout → kit → motion` 提供。

## 2. 分层（代码五层 / 样式六层）

| 层 | 目录 | 只做一件事 | 不许做 |
| --- | --- | --- | --- |
| 页面 | `src/client/parts/60-page.js` | 装配四个视图、持有全局状态、编排动作 | 写业务规则、拼 URL |
| 组件 | `parts/*.js`（25 个片段） | 渲染 + 局部交互，组合 `07-kit` 原语 | 直接 `fetch`、直接读写 `localStorage` |
| 宿主路由 | `index.js`（363 行） | 查 `OPS` 表分发、鉴权、静态路由 | 写业务分支（`op-check` 会红） |
| 领域 | `lib/core/*.js`（20 个） | 业务规则：部署/空间/应用/PM/对话/代码生成 | 拼 UI、读全局变量 |
| 基座 | `lib/base/*.js`（9 个） | HTTP、URL、存储、平台、注册表、表解析 | 含业务语义 |

样式六层：`tokens`（唯一字面量）→ `base`（元素默认）→ `layout`（结构工具类）→ `kit`（控件）
→ `motion`（动画）→ `main`（业务结构）。新组件只写最后一层的「结构」。

## 3. 四条请求路径

```text
普通数据：点击 → api('pmList',{node,space}) → ops.pmList.run → lib/core/project.js → GET /s/<pod>/c/...
对话：    输入 → 客户端按 mode 短路 → POST api?op=chat → copilot.js(buildChatPrompt) → ctx.llm
          → {reply, action} → executeAction(action) → 卡片/表单 → 又回到「普通数据」路径
部署：    表单 → api('deploy',{port,mode}) → nodes.deployNode → 复制/下载/源码三选一 → 探活 → 注册表
初始化：  首次进入 → api('init') → init.js 确保用户/官方空间 → 缓存到 nodesCache
```

**关键设计**：对话不直接改数据。模型只能返回 `action`（op + args），真正写库仍走第二条路径里的
`executeAction`，因此「三模式短路」和「写操作必须先出表单」是两道理性闸门，而不是提示词约定。

## 4. 状态真源（三层，各有归属）

| 层 | 存在哪 | 谁写 | 丢了的后果 |
| --- | --- | --- | --- |
| 界面状态 | `CX_STORE_SCHEMA`（38 键，前缀 `dsh-contextos-devops:`） | 客户端 `cxWrite` | 刷新后回到默认（可接受） |
| 服务端状态 | `~/.dsh/dsh-contextos-devops/state.json`（9 项） | `stateSet` op | 终端历史、节点缓存、对话记录丢失 |
| 业务数据 | ContextOS 节点（mdb/MySQL），经 HTTP | `lib/core/*` | 真丢，必须备份 |

原则：**能重算的放浏览器，跨设备/跨重启要留的放服务端，业务事实只放 ContextOS。**
`docs/STATE.md` 是这两层的自动清单，改了键必须重新生成。

## 5. 与 ContextOS 三架的对偶（为什么它「优雅」）

| ContextOS | 我们的对应 | 借的是什么 |
| --- | --- | --- |
| `ice.Command/Action` + tag 编译 | `ops.js` 的 `{method,noUser,run}` | **注册即能力**：加一个 op = 加一条记录，不写路由 |
| `mdb` 的 `HashAction`（一次给 CRUD） | `CX_STORE_SCHEMA` + `07-kit` 原语 | **声明即实现**：字段/键/控件不重复写 |
| `volcanos` 的 `can` 原型链 + `$` 选择器 | `parts` 片段共享作用域 + 六层 CSS | **继承即默认**：子组件不重复父级的样式 |
| `intshell` 的 `require` 自举 | `npm run new` + `check:*` | **一条命令把环境变可用**，而不是写文档教人手工做 |
| `web/render.go` 的 `$output` 作用域 | `.cx-*` 命名空间 + `:root` 只准 `--cx-*` | **不污染宿主**：同一 document 里两个应用共存 |

真正的优雅不是「代码少」，而是**同一个概念只出现一次**：状态机只在 `project.js`，URL 只在 `url.js`，
颜色只在 `tokens.css`，op 只在 `ops.js`，扩展路径只在 `scaffold.mjs`。

## 6. 十条原则（有取舍的）

1. **注册表优先于分支**：`OPS` / `CX_STORE_SCHEMA` / `ui-probe CASES` / `scaffold KINDS` 都是表驱动。
2. **目录优先于清单**：parts、docs、fixtures 一律目录推导（手抄清单曾导致插件整包加载失败）。
3. **默认值优先于重复**：能由层给的，组件一律不写。
4. **断言优先于记忆**：同一个坑第二次出现，第三次必须是脚本或断言。
5. **最小暴露**：`index.js` 只暴露 op 表；客户端只有 `api()` 一个出口。
6. **失败要可判定**：所有 `check:*` 用退出码说话；`verify:ui` 退出 2 不算完成。
7. **可观测**：`clientCheck` 自报版本/CSS/布局/几何，线上问题先读数据再看图。
8. **渐进式抽象**：出现第二次才抽（`usePmPanelState`、`cxImageDataUrl`、`moduleSource` 都是第三次才抽的）。
9. **不追求一次完美**：3395 行 `main.css` 没拆成 20 个文件——收益低、回归风险高；用门禁防它继续变坏。
10. **代价写在明处**：每个决定都记「为什么不选另一条」（见 §10 与 `RSI-LEDGER.md`）。

## 7. 反模式（都真实踩过）

| 反模式 | 后果 | 现在的闸门 |
| --- | --- | --- |
| 手抄文件清单 | 插件整体加载失败（`cxRead is not defined`） | `load-check` 执行产物 |
| 只在文本层做断言 | 产物坏了门禁还是绿的 | `load-check` + `ui-probe` 真渲染 |
| `:root` 写通用令牌 | 宿主消息工具栏被压扁 | gate 第 12 项 |
| 样式改了但页面没变 | 旧 `<link href="?v=旧">` 常驻 | prelude 改写 href + `clientCheck.css` |
| 固定高度不写折叠例外 | 折叠后仍占 218px | `ui-probe --case pm-folded` |
| 客户端重复排序 | 与服务端口径漂移 | `INTERFACE.md` §11 + `dup-check` |
| 提示词每次重拼 | 前缀缓存 0 命中、1.6s/次 | `buildChatPrompt` 分层 + `bench-chat` |

## 8. 质量体系（16 道门禁，按「发现问题的层次」排）

`gate`（产物/文案）→ `load-check`（能加载）→ `hook-order`（TDZ）→ `op-check`（路由契约）
→ `install-check`（安装计划）→ `store-check`（存储出口）→ `ui-check`（结构断言）
→ `ui-probe`（真渲染量尺寸）→ `dup-check`（跨文件重复）→ `css-check`（令牌/重复率）
→ `i18n-check`（文案）→ `context-check`（规范文本）→ `docs-check`（索引/链接）
→ `docs-budget`（常驻成本）→ `bench-chat`（提示词预算）→ `publish-check`（可发布性）。

层次含义：**能在低层发现的，绝不放到高层**——加载错误不该等到 UI 断言才发现。

## 9. 演进史（六次转折，每次都由事故推动）

1. 单文件 `client.js` → 25 个片段 + 构建（手抄清单导致整包失败后才做）。
2. 路由 705 行 if/else → `OPS` 注册表（`op-check` 守住）。
3. 96 处 `localStorage` → `08-store.js` + schema（`store-check` 棘轮）。
4. 一个 3396 行 CSS → 六层（`css-check` 棘轮）。
5. 5 个挂载点 / 右栏 → 会话标签 + 内联配置（用户要求的交互形态）。
6. 六类扩展靠记忆 → `scaffold.mjs` + `EXTENDING.md`（`check:extend`）。

## 10. 已知代价与下一步

- **`main.css` 3395 行**：仍是最大单文件；只在新增时受门禁约束，不做一次性重写。
- **`60-page.js` 1666 行**：装配 + 全局状态集中，拆它要先有「视图注册表」，否则只是换个地方堆。
- **`lib/core/nodes.js` 1204 行**：部署/容器/远程/管道四类，下一步按「部署计划（plan）」拆文件。
- **门禁耗时**：`build:client` 全链约 40–60s；`verify:ui` 需 Edge CDP，尚未进 CI。
- **下一步三件**：① 用 `new -- page` 做第一个真实新页面，验证 rails；② `nodes.js` 按计划对象拆分；
  ③ `verify:ui` 接进发布前检查（不是每次提交）。
