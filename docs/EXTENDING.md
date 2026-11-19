# EXTENDING · 六类扩展的固定做法

> 读这份当：要加一个页面 / 组件 / 状态 / 接口 / 样式 / 动效，想一次做对、不返工。
> 不读这份当：改现有功能的行为 → 见 `INTERFACE.md`、`CODE-GEN.md`；改架构 → 见 `ARCHITECTURE.md`。

每个扩展先跑一条命令生成骨架，再补「需要你判断的那几处」，最后跑验收命令。**骨架负责命名、位置、注册；人负责接线和文案。**

| 加什么 | 命令 | 自动落哪些文件 | 验收 |
|---|---|---|---|
| 页面 | `npm run new -- page ProductView` | `src/client/parts/56-product-view.js` | `npm run build:client` + 新断言 |
| 组件 | `npm run new -- component CxBadge` | `07-kit.js` + `kit.css` | `npm run check:css` |
| 状态 | `npm run new -- state last-view` | `08-store.js` 的 `CX_STORE_SCHEMA` | `npm run check:store` |
| 接口 | `npm run new -- op nodeUptime` | `lib/core/ops.js` 的 `OPS` | `npm run check:ops` |
| 样式 | `npm run new -- style cx-badge` | `kit.css` 变体块 | `npm run check:css` |
| 动效 | `npm run new -- motion flash` | `motion.css` + 工具类 | `npm run check:probe`（`--case anim`） |

> 约定自检：`node scripts/scaffold.mjs --check`（六类都有落脚点、组件命名 `Cx*`、注册表存在）。

---

## 1. 加一个页面

页面 = **一个片段文件 + 60-page.js 的三处接线**。

```sh
npm run new -- page ProductView
```

自动生成 `src/client/parts/56-product-view.js`（片段按文件名排序，56 落在 60-page 之前）。需要你补：

| 位置 | 改什么 |
|---|---|
| `60-page.js` 的 `viewMode` 枚举 | 增加 `'product'`（默认值仍在 `boot.view`） |
| `60-page.js` 渲染区 | `viewMode === 'product' ? h(ProductView, { node, space, busy, onRefresh }) : null` |
| 头部视图按钮 | 数组里加一项（图标 + 中英文 + 快捷键），`setViewMode` |
| `00-prelude.js` 的 `EN_TEXT` | 英文词条（中文直接写字面量） |
| `scripts/ui-check.mjs` | 一条断言：渲染分支里必须出现该组件 |

坑：重资源视图（Monaco/终端）必须**常驻挂载 + `display:none`**，否则切回来会丢状态（`dev` 视图就是这么做的）。

---

## 2. 加一个组件

组件只写**结构**，样式用现有类或 `kit.css` 变体。

```sh
npm run new -- component CxBadge
```

生成外壳 + `.cx-badge` 默认块。规则：

- 优先复用 `CxSection / CxRow / CxField / CxBtn / CxInput / CxSelect / CxChip / CxTabs`；
- 新组件**不写** `font-size / color / padding` 字面量，需要差异就加变体类（`.on / .pri / .danger`）；
- 动态类名要让 `css-check` 能找到（它会报「疑似死类」WARN，属提示）。

---

## 3. 加一个状态

```sh
npm run new -- state last-view
```

自动在 `CX_STORE_SCHEMA` 加一行（含 `kind / def / zh / note`），并同步进 `docs/STATE.md`、控制台 STATE 页。

用法：`const [v, setV] = useState(() => cxRead('last-view', null))` + `useEffect(() => cxWrite('last-view', v), [v])`。

坑：**渲染期不许写**；localStorage 只准经 `08-store.js`（`store-check` 棘轮会数）；键要在 schema 里，否则门禁红。

---

## 4. 加一个接口

```sh
npm run new -- op nodeUptime
```

自动在 `OPS` 表加 `{ method, noUser, run }`。三条硬规则：

1. 客户端只能 `api('nodeUptime', {...})`，禁止直接 `fetch`；
2. 只读接口用 `GET`，并把 op 名加进 `05-bootstrap.js` 的 `QUERY_OPS`（否则会走 POST）；
3. 复杂逻辑放 `lib/core/<域>.js`，`OPS` 里只做参数归一 + 一行调用。

别忘了：`docs/INTERFACE.md` 补一行（op / 方法 / 入参 / 返回 / 用途），`server` 字段需要节点在线就**不要**加 `noUser`。

---

## 5. 加一个样式

```sh
npm run new -- style cx-badge
```

五层的落点判断：

| 你要加的东西 | 放哪 |
|---|---|
| 新颜色/间距/字号/圆角/阴影 | `tokens.css`（唯一字面量层） |
| 元素默认值（标题、表格、滚动条） | `base.css` |
| 布局原语（栈/行/列/栅格/滚动） | `layout.css` |
| 控件默认值与变体（按钮/输入/标签/页签） | `kit.css` |
| 动效 | `motion.css` |
| 业务定位（只写位置与组合） | `main.css` |

`css-check` 会卡：main.css 的字面量色/rgba/`!important`/重复率不得超基线，`var(--cx-*)` 必须已定义。

---

## 6. 加一个动效

```sh
npm run new -- motion flash
```

生成 `@keyframes cx-flash` + `.cx-anim-flash`。规则：

- 时长/缓动只用 `--cx-dur*` / `--cx-ease*`；
- 一律 `animation-fill-mode: both`；
- `prefers-reduced-motion` 已由 `motion.css` 统一关闭，不要重复写；
- 列表交错用 `.cx-anim-stagger` + `--cx-i`。

验收：`node scripts/ui-probe.mjs --case anim`（量的是真实计算样式，不是字符串）。

---

## 7. 做完统一收尾

```sh
npm run build:client      # 全链门禁（20 步，见 CODE-INDEX §5.1），全绿才算改完
node scripts/docs-index.mjs --write   # 有状态/接口/代码结构变化时
```

然后在 `docs/RSI-LEDGER.md` 记一条（现象 / 根因层次 / 固化了什么 / 数字对比）。文档、代码、门禁同一次提交。
