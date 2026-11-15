# 状态索引 / STATE

> 读这份当：要加一个持久化状态，或查某个键存在哪、默认值是什么。
> 不读这份当 → 存储出口的实现与门禁 → [ARCHITECTURE.md](ARCHITECTURE.md) §5；服务端 state.json → §5 同节
>
> 生成物：`node scripts/docs-index.mjs --write`（2026-11-15）· 源：`src/client/parts/08-store.js` 的 `CX_STORE_SCHEMA`
> 手改会被下一次生成覆盖；要改内容改代码里的源头。

## 1. 浏览器侧（localStorage，前缀 `dsh-contextos-devops:`）

| 键 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `theme` | 文本 | `system` | 主题：system / dark / light |
| `lang` | 文本 | `system` | 语言：system / zh / en |
| `view` | 文本 | `chat` | 视图模式：chat / manage / dev |
| `work-mode` | 文本 | `avatar` | 工作模式：avatar / factory / iot |
| `chatfull` | 文本 | `1` | 对话全屏：1 全屏 / 0 分栏 |
| `actor` | 文本 | `` | 当前分身：user.uid |
| `nodes` | JSON | `[]` | 节点缓存：进入插件先渲染，↻ 才刷新 |
| `sel` | JSON | `{}` | 本次选择：节点/空间/应用启动引导 |
| `sel-map` | JSON | `{}` | 按节点记忆选择：{ node: [space, app] } |
| `console` | JSON | `{}` | 控制台：open / tab / height / sort |
| `reqlog` | JSON | `[]` | 请求记录：最近 50 条，服务端另有 state.reqlog |
| `fx` | JSON | `{"sound":"soft","light":"high","color":"cyan","style":"tech"}` | 特效：声音/光效/配色/风格 |
| `webtabs` | JSON | `null` | 网页页签：{ tabs, active } |
| `panels` | JSON | `{}` | 面板宽度：左右栏拖拽结果 |
| `folds` | JSON | `{}` | 面板折叠：PM 卡片/控制台折叠 |
| `tree-folds` | JSON | `{}` | 编辑器折叠：按项目记 WORKSPACE/GIT 分区 |
| `ide` | JSON | `null` | 编辑器页签：{ tabs, active } |
| `ide-open` | JSON | `{}` | 编辑器已开文件：按项目记文件树展开 |
| `ide-active` | 文本 | `` | 编辑器当前文件：按项目记 active |
| `ide-panes` | JSON | `{}` | 编辑器分栏：分栏与比例 |
| `preview-w` | 文本 | `360` | 预览宽度：网页预览分栏 |
| `pm` | JSON | `{}` | 项目管理选择：target/plan/task 选中态 |
| `cal` | JSON | `{}` | 日历：周期/锚点日期 |
| `map` | JSON | `{}` | 地图：中心点/缩放 |
| `init` | 文本 | `` | 初始化向导：完成标记 1；细节在服务端 |
| `term-buf` | JSON | `{}` | 终端缓冲：与服务端 state.termBuf 同步 |
| `draft` | 文本 | `` | 输入草稿：未发送的输入框文本 |
| `scroll` | JSON | `{}` | 滚动位置：按视图记位置 |
| `formstate` | JSON | `{}` | 表单状态：按表单记未提交字段 |
| `calls` | JSON | `[]` | 调用记录：工具调用摘要 |
| `cfg` | JSON | `{}` | 配置草稿：配置视图未保存项 |
| `filter-node` | JSON | `null` | 节点过滤：状态筛选 |
| `filter-space` | JSON | `null` | 空间过滤：状态筛选 |
| `filter-app` | JSON | `null` | 应用过滤：按空间筛 |
| `filter-store` | JSON | `null` | 商店过滤：按空间筛 |
| `monitor-panels` | JSON | `{}` | 监控面板：面板开关/顺序 |
| `session` | JSON | `null` | 会话：{ v, 会话键: 消息 } |
| `chat` | JSON | `[]` | 消息缓存：旧版单键；现按 chat:<分身>:<计划> 分键 |

## 2. 服务端（`~/.dsh/dsh-contextos-devops/state.json`）

| 名称 | 写入方 | 用途 |
| --- | --- | --- |
| `prefs` | `stateSet` | 主题/语言/视图/工作模式（跨端口恢复） |
| `clientCheck` | `stateSet` | 真实 DOM 字号/bundle 版本回报 |
| `reqlog` | `stateSet` | 最近 50 条请求（控制台 REQUEST 页） |
| `selMap` | `stateSet` | 每节点选中的空间/应用 |
| `chat:<分身>:<计划>` | `stateSet` | 会话消息（最多 100 条） |
| `termBuf` | `stateSet` | 终端滚动缓冲 |
| `nodesCache` | `stateSet` | 节点列表缓存（打开插件先渲染） |
| `ideOpen` | `stateSet` | 编辑器已开文件 |

> 规则：浏览器键只经 `cxRead/cxWrite`；跨端口必须恢复的状态走服务端 `stateSet`（DSH 每次重启换端口，localStorage 会按 origin 隔离）。
