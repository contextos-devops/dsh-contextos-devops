# ContextOS 界面设计系统


> 读这份当：任何界面、组件、表单、主题改动。
> 不读这份当 → 布局故障 → `DIAGNOSTICS.md`；产品取舍 → `PRODUCT-DESIGN.md`
所有页面只允许组合本文件的组件与 `--cx-*` token。

## 1. 纵向结构

```text
标题栏 HeaderBar
标签栏 TabBar
工具栏 ToolBar
内容区 Content
状态栏 StatusBar
```

对应组件：

```text
UiBar kind="header|tabs|toolbar|status"
```

## 2. 横向结构

```text
左导航栏  内容区  预览区  右导航栏
             └──── 输出区 ────┘
```

- 输出区位于内容区与预览区下方；
- 左导航、右导航独立滚动；
- 内容区与预览区共享画布；
- 输出区高度可调，默认不超过 42%。

对应组件：

```text
UiWorkspace {
  header, tabs, toolbar,
  left, content, preview, output, right,
  status
}
```

## 3. 内容结构

```text
UiCardList   卡片列表
UiTableList  表格列表
UiTreeList   树状结构
```

统一空态、间距、滚动和键盘可达性。

## 4. 展示元素

### 单行标题

```text
SingleLineTitle
= UiAffordance
```

```text
[图标] 中文 English 操作
```

显示模式：

```text
icon   只显示图标
short  图标 + 中文
full   图标 + 中文 + 英文
text   只显示文字
```

### 双行标题

```text
DoubleLineTitle
= EntityTitle
```

```text
[大图/图标]  类型  主标题              状态
             副标题（时间/文件/计数等）
```

- 图片尺寸 = 两行文字高度；
- 类型在标题左侧；
- 状态在标题右侧；
- 副标题承载时间、文件、计数等元信息。

## 5. 布局与视觉规则

- 所有可交互元素 32–36px 高，行盒居中；
- 所有图标 16/18px，`stroke-width: 1.4`；
- hover / active / focus 只使用 `.cx-aff` 与 `.cx-icon` 的统一状态；
- 不使用字体符号代替操作图标；
- 卡片使用 `UiCardList`，不手写列表间距；
- 表格使用 `UiTableList`/`DataTable`；
- 树使用 `UiTreeList`。

## 6. 代码位置

```text
10-ui.js       UiIcon / IconButton / UiAffordance / EntityTitle / Panel / DataTable
15-layout.js   UiBar / UiWorkspace / UiCardList / UiTableList / UiTreeList
55-pm.js       PM 卡片与菜单
```

## 7. 地址栏

```text
[图标 段] › [图标 段] › [当前段]        [输入框]        [操作]
```

统一：

- 高度 32px；
- 段按钮 24px；
- 分隔符 12px 图标；
- 单行省略；
- 当前段 `on`；
- 右侧操作按钮固定，不挤压路径；
- 路径过长时只滚动/省略中段，不换行。

组件：

```text
UiAddressBar {
  segments: [{ icon, label, title, active, onClick }],
  children,  // 可选输入框
  actions
}
```

## 8. 下拉菜单 / 右键菜单

统一结构：

```text
[图标] [标签 ......................] [提示]
```

规则：

- 菜单项最小高度 28px；
- 图标固定 16 × 16；
- 标签左对齐并省略；
- 提示/快捷键右对齐；
- 最大高度 `min(60vh, 420px)`；
- 超出滚动，不撑出窗口；
- 菜单最小宽度 180px，最大宽度 `min(420px, 100vw - 16px)`；
- 右键菜单使用 `position: fixed`；
- 危险项统一红色；
- hover 背景统一 `--cx-accent` 12%。

适用：

```text
.cx-menu
.cx-tree-menu
.cx-drop-pop
.cx-ctxmenu
```

---

# 今日设计规范（2026-11-08 定稿）

> 单一来源：`src/client/styles/tokens.css`（变量）+ `main.css` 末尾「字号规范（唯一来源）」段。
> 所有页面/卡片/控件必须引用变量，不允许再写裸像素。

## 9. 字号（唯一来源）

| 角色 | 变量 | 值 | 用在 |
|---|---|---|---|
| 默认 | `--cx-fs` | **12px** | 按钮、下拉、标签、流程条、模式切换 |
| 正文 | `--cx-fs-body` | **10px** | 消息正文、卡片正文、输入框 |
| 状态 | `--cx-fs-status` | **10px** | 状态标签、类型标签、副标题、提示行 |
| 双行标题 | `--cx-fs-title` | **14px** | `EntityTitle` 的 `.cx-entity-name`、品牌标题 |

规则：`body/font-size` 继承 `--cx-fs`；每个角色只允许出现在一个选择器组里。

## 10. 颜色

- **色系**（`data-hue`，7 档）：cyan / green / violet / amber / rose / ice / warm
  - 每档同时定义 `--cx-cyan`、`--cx-accent`、`--cx-green`、`--cx-hue-rgb`、`--cx-green-rgb`
  - 所有 `rgba()` 一律写 `rgba(var(--cx-hue-rgb), α)`，禁止硬编码色值
- **风格**（`data-style`，7 档）：tech / classic / desert / rainforest / cyber / steam / minimal
  - 覆盖主色 + 背景渐变 + 字体族（古典用衬线）
- 边框/弱文字跟随色系：`--cx-line`、`--cx-line2`、`--cx-border`、`--cx-border-strong`、`--cx-muted`、`--cx-text-dim`

## 11. 布局

- **顶部四段**：`[☰] [品牌标题] [模式组 flex:1 居中] [样式组]`
  - 模式组吃掉剩余空间并居中；样式组 2px 间隔、固定右侧
  - 窄屏按优先级隐藏：声效(1560) → 动效(1440) → 色系(1340) → 风格(1240) → 主题(1140) → 语言(1040)
- **右栏**：`时间 / 任务 / 报告 / 反馈 / 地点` 五段，标题依次吸顶（`top: i*34px`）
- **卡片**：`EntityTitle`（图标 + 标题 + 类型 + 状态 + 元信息）+ 正文 + 操作行

## 12. 间距与圆角

| 项 | 值 |
|---|---|
| 控件间距（样式组） | 2px |
| 段间距 | 8–10px |
| 卡片内边距 | 10–12px |
| 圆角：控件 | 4px |
| 圆角：输入框 | 24px |
| 圆角：图标按钮 | 50% |

## 13. 图标

- 图标与字号绑定：**12px 文字 → 18px 图标**、**10px 文字 → 14px 图标**、**14px 标题 → 20px 图标**（变量 `--cx-icon-12 / --cx-icon-10 / --cx-icon-14`）
- 卡片图标必须复用标题栏的 `Ico`，不允许另画一套

## 14. 动效（全部可被「动效·关」禁用）

| 名称 | 时长 | 触发 |
|---|---|---|
| 卡片入场（5 种：滑入/弹跳/翻牌/霓虹/下落） | 1.0s | 新卡或字段变化 |
| 扫光 | 1.8s | 同上 |
| 模式欢迎（五扇门） | 3.2s | 首次进入模式 |
| 初始化欢迎 | 1.8s | 进入/离开初始化 |
| 选中闪光 | 1.5s | 切换模式 |
| 光波扩散 | 3.2s | 点击（canvas） |
| 光标彗星 | 持续 | 鼠标移动 |
| 静止光波 | 60s | 鼠标静止 ≥55s |
| 数据操作 | 0.95s | 创建/修改/删除/刷新 |

动效强弱四档（强/中/弱/微）+ 关：`data-light` 控制光晕透明度、彗星透明度、动画时长。

## 15. 交互反馈

| 操作 | 反馈 |
|---|---|
| hover | 上浮 1px + 主色描边 + 发光（按钮/下拉/输入按钮） |
| active | 缩放 0.97 + 光波 |
| 右键 | 抖动 0.45s（输入框的 + 与发送） |
| 点击 | 光波扩散（全区域 canvas） |
| 键盘 | 字母/退格/回车有键音 |

## 16. 声音

- 7 种音色：柔和 / CS / 红警 / 魔兽 / 星际 / 8-bit / 静音
- WebAudio 现场合成，无音频文件；悬停、点击、按键、数据操作各有音色

## 17. 代码约定

1. **不手改 `client.js`**：改 `src/client/parts/*.js` 后 `npm run build:client`（含门禁）
2. **样式进 `main.css`**，变量进 `tokens.css`；禁止裸色值/裸字号
3. **单一实现**：最大化 `cxMaxApply`、标题 `EntityTitle`、图标 `Ico`、下拉 `DropSelect`、声音 `play()` 各只有一处
4. **门禁**：`gate.mjs` 校验产物哈希、CSS 版本、`100vw/100vh` 全屏回归、`cxMaxApply` 唯一性
5. **调试**：Edge 常开 + `node scripts/edge-refresh.mjs` 刷新验证，不再反复启停插件

## 18. 表单取值（强制）

所有表单参数，取值范围与提交值都必须以后台为准。

1. **取值范围来自后台**：任何枚举/下拉字段，先调 `fieldOptions({ node, space, command, field })` 拿 `options`。
2. **提交 `value`，不提交 `name`/`label`**：后台返回 `{ value, name, label }` 时 `value` 才是可写值（常见是数字 `"0"/"1"`）。
3. **显示用 `label`**：UI 展示 label（缺省回退 name），不把显示值发回去。
4. **存量数据要归一**：编辑旧记录时按 `value/name/label` 三种形态匹配到 `value` 再提交。
5. **默认值也取自选项**：默认 = `options[0].value`，不硬编码英文名。

实现入口：`lib/core/project.js → optionValue({ node, space, command, field, raw })`。

## 19. UI 不变量（回归清单）

- 消息布局 `avatar | main(meta 上、body 下)`；`.cx-msg-main` 列 flex、body 满宽。
- 消息工具条在 meta 行右端，`margin-left:auto`，默认 `opacity:0`、悬停显示（不占额外行、不跳行）。
- 请求上下文只有 `scene`；`background`/`bg` 发送前剥离。
- 调试四页签同一行，页签条 sticky；同一区块不出现重复标题。
- 表头固定、KEY 列稳定、长值换行；详情高度随内容。
- 加载/空/错误/长文本四态必须显式。
- 输入框最左芯片是**多级列表**入口（节点 → 空间 → 最近应用，三列、向上展开），选中写会话配置；标题栏不放第二入口。
- **控件高度**：单行 `input/select` 固定 `--cx-h-control` 且**垂直内边距为 0**（靠高度居中）；多行 `textarea/.cx-area` 用 `height:auto` + `min-height:calc(3 * 1.5em + 内边距)`，至少三行可见、不裁字。门禁 `ui-probe --case form-controls`。
- **遮罩不越界**：`.cx-mask/.cx-modal/.cx-init/.cx-toast/.cx-busy-overlay` 用 `position:absolute`，定位上下文是 `.cx-shell`；宿主与插件共用 document，`fixed` 会盖住侧栏。门禁 `ui-probe --case modal-scope`。

## 20. 样式分层与结构原语（新增组件先读这一节）

### 20.1 六层，只允许单向依赖

| 层 | 文件 | 只放什么 | 不许放什么 |
| --- | --- | --- | --- |
| 1 令牌 | `styles/tokens.css` | `--cx-*` 字面量（颜色/间距/字号/尺寸/圆角/阴影/层级/动效）+ 主题覆盖 | 任何组件类 |
| 2 基座 | `styles/base.css` | 元素默认值（字体继承、标题、`table`、`code`、滚动条、焦点环） | 具体组件 |
| 3 布局 | `styles/layout.css` | `.cx-stack/.cx-row/.cx-col/.cx-grid`、`.cx-sec/.cx-hd/.cx-bd/.cx-ft`、`.cx-fill/.cx-scroll/.cx-center`、间距工具类 | 颜色/字号 |
| 4 控件 | `styles/kit.css` | `.cx-btn(.pri/.danger/.ghost/.xs/.lg/.icon/.on)`、`.cx-input/.cx-select`、`.cx-field`、`.cx-chip`、`.cx-tag`、`.cx-tabs`、`.cx-list`、`.cx-panel`、`.cx-table`、`.cx-modal/.cx-mask/.cx-menu` | 业务布局 |
| 5 动效 | `styles/motion.css` | `--cx-dur-*` 驱动的 `.cx-anim-*`；`prefers-reduced-motion` 一次关掉 | 业务动画 |
| 6 业务 | `styles/main.css` | 只写「这个功能独有」的定位/网格/尺寸例外 | 重复的字体、颜色、圆角、间距 |

依赖方向：`main → motion → kit → layout → base → tokens`；反方向一律不接受。

### 20.2 新组件的默认写法

先在 `07-kit.js` 找原语拼结构，不写 `className`：

```js
h(CxSection, { title: T('Deploy node'), actions: h(CxBtn, { size: 'sm', onClick: reload }, T('Refresh')) },
  h(CxRow, { gap: 3 },
    h(CxField, { label: T('Port') }, h(CxInput, { value: port, onChange: onPort })),
    h(CxField, { label: T('Name') }, h(CxInput, { value: name, onChange: onName }))),
  h(CxToggle, { tabs: MODES, value: mode, onChange: setMode }));
```

原语：`CxStack/CxRow/CxCol`（布局，`gap` 走 `--cx-g1..g5`）、`CxSection`（标题/副标题/动作/内容）、`CxField`（标签+控件+提示，`full` 独占一行）、`CxBtn`（`variant`+`size`+`icon/active/loading`）、`CxInput/CxSelect`、`CxChip/CxTabs`、`CxToggle`（平铺分组，待抽 `CxSegmented`）。

要写新样式时：① 已有类能否拼出来 → ② 能否给 `kit.css` 加**变体** → ③ 才在 `main.css` 写业务规则（且只写定位/网格）。

### 20.3 文案（铁律：英文优先）

- 新功能一律**英文 key**，中文进 `00-prelude.js` 的 `ZH_TEXT`；旧中文 key 靠 `EN_TEXT` 翻译并逐步迁移。
- 渲染只走 `T('…')`；带变量用 `TT('已更新 {kind}', { kind })`，模板两边都要词条。
- 缺词条或把中文写进 `title/label/placeholder/desc`，`npm run check:i18n` 会红（`i18n-lint`，直写中文按基线只减不增）。

### 20.4 门禁（`scripts/css-check.mjs`，构建链第 8 道）

`tokens.css` 只准 `:root`/`.cx-shell` 选择器；每个 `var(--cx-*)` 必须已声明或属运行时令牌；`main.css` 走棘轮
（字面量色 ≤562、`rgba(` ≤302、`!important` ≤689、重复率 ≤72.8%、行数 ≤3400，只降不升）；死类只 WARN。
调高基线必须在报告里写「旧上限为什么不够」，否则视为放宽断言（AGENTS §六 红线 13）。

### 20.5 六类扩展的固定入口

加页面/组件/状态/接口/样式/动效，先 `npm run new -- <kind> <Name>`，再按 `docs/EXTENDING.md` 补接线；
动效验收 `node scripts/ui-probe.mjs --case anim`（量 `animationName`/`animationDuration`）。

### 20.7 滚动时的上下文栈

左侧「目标 / 计划」、右侧「任务 / 报告 / 反馈」各有一块 `PmStickyStack`：每层一行
`标题栏标签 + 当前项标题 + 状态 chip`，`position:sticky; top:0`，数据再多也贴着顶端堆叠；
没有当前项时不渲染、不占高度。门禁 `node scripts/ui-probe.mjs --case pm-sticky`（4 条）。

### 20.6 状态与类型的颜色语言

判断顺序：先问「要不要用户现在看一眼」，再问「警醒还是鼓励」。七档一色，禁止就地发明颜色。

| 档 | class | 色 | 对应值 |
|---|---|---|---|
| idle | `.is-idle` | 中性灰蓝 | created |
| review | `.is-review` | 琥珀（等你处理） | submited / shouldImprove |
| ready | `.is-ready` | 蓝（已就绪） | approved |
| active | `.is-active` | 绿加粗（活着） | process / canFinish / running |
| done | `.is-done` | 灰（退到背景） | finished / stopped |
| halted | `.is-halted` | 暗红（终止） | canceled |
| failed | `.is-failed` | 亮红（失败） | rejected |

类型标签一律 `.cx-entity-type` 安静灰；新增状态先归到七档之一；门禁 `ui-probe --case status-tones`。

标题栏的主题与语言用**三态分段控件**（`CtxSeg`）：主题 = 自动 ◐ / 浅色 ☀ / 深色 ☾（图标），语言 = 自动 / 中 / EN（文字档位）；三态平铺可见，不用文本下拉（避免两枚下拉都显示「System」看不出区别）。

反馈评分一律用星星（`cxStars(n)`：`★`×n + `☆`×(5-n)）——卡片上并进副标题同一行（`.cx-stars`），表单里评分下拉的每个选项也显示星星；不再单独占一行。

卡片按钮区一律 `justify-content:flex-start`，`⋯`（PmActionMenu）在没有二级动作时置灰但不消失——同一列卡的按钮区永远对齐。门禁 `ui-probe --case pm-card-actions`。

