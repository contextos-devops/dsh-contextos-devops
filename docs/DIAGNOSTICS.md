# 问题诊断路由 / DIAGNOSTICS

> 用途：**症状 → 先读哪份 → 先跑哪条命令 → 哪条断言应该拦住它**。
> 这份文件解决一个具体痛点：同一个坑踩第二次时，不要再从零推理。
> 铁律：`../../../AGENTS.md` > `../../AGENTS.md` > 本文件。新增一条 = 先在本表加行，再补断言。

## 〇、页面先跑这三条

```sh
npm run build:client                 # 10 道门禁；红了先修，不许带 FAIL 交付
npm run check:probe                  # 离线渲染 fixture，量布局不变量（需本机 Edge/Chrome）
npm run verify:ui                    # 真浏览器验收（需 Edge CDP 9223），exit 0 才算过
```

## 一、按症状查

| 症状 | 问题类型 | 先读 | 先跑 | 已固化的断言 |
| --- | --- | --- | --- | --- |
| 界面「改了没变」/ 样式像旧的 | B 加载与缓存 | `RSI-LEDGER.md` 2026-11-15 两条 | 看 `state.json` 的 `clientCheck.css/build`；确认 `?v=` 与 `package.json` 一致 | prelude 版本跟随（href 改写）；`clientCheck` 记录 build/css |
| 消息头与正文挤成两栏 | A 布局 | 本文件 §二 | `npm run check:probe -- --case msg-card --verbose` | `ui-probe`：main 竖排、正文 ≥85%、工具条贴右 |
| 折叠后卡片还是很长 | A 布局 | 本文件 §二.3 | `npm run check:probe -- --case pm-folded` | `ui-probe`：折叠 ≤60px、展开仍 ≥200px |
| 悬停/交互状态无法离线验证 | A 布局 | 本文件 §二.4 | 用 `!important` 注入类名把两态拆开 | 无需断言：把判定交给 `clientCheck.layout` 的 `opacity` |
| 插件整体不加载 / 白屏 | B 加载 | `RSI-LEDGER.md` 2026-11-15 加载失败条目 | `node scripts/load-check.mjs` | `load-check`：清单 vs 目录哈希 + factory 试执行 |
| 宿主界面被插件带歪 | A 布局（污染） | `main.css` 顶部令牌区 | `grep -n ":root" src/client/styles/*.css` | gate 第 12 项：`:root` 只准 `--cx-*` |
| 接口 404 / 405 / 静默失败 | C 接口 | `INTERFACE.md`、`URL-SPEC.md` | `npm run check:ops`；`curl` 回执 | `op-check`：客户端每个 `api('x')` 都有 op；方法门一致 |
| 刷新后状态丢了 | D 持久化 | `STATE.md` | `grep -n "localStorage" src/client/parts/*.js` | `store-check`：棘轮 + schema 登记 |
| 文档找不到 / 链接断了 | E 文档 | `docs/INDEX.md` | `npm run check:docs` | `docs-check`：孤儿文档、死链、生成物过期 |
| 门禁红了但看不懂 | F 构建 | 本文件 §三 | `node scripts/<gate>.mjs` 单跑 | 每个门禁都必须能单跑并给出定位行 |

## 二、布局类：三条硬规则

### 二.1 先量后改，不猜级联

CSS 事故的根因永远在**最终生效的那条规则**，不在你刚写的那条。顺序：

```sh
grep -n "选择器" src/client/styles/main.css       # 找出全部同名规则
node scripts/ui-probe.mjs --case <fixture> --verbose  # 量真实盒子与计算样式
```

`--verbose` 打印 `x/y/w/h/right/display/flexDirection/marginLeft/opacity/fontSize/lineHeight`，
断言失败时会带上实际值，报告里直接引用数字，不用「看起来」。

### 二.2 关键布局不写在 CSS 里，写在 JSX 内联

消息卡片这类「一旦歪了整页不能读」的结构，布局用内联 `style`（`display/flexDirection/flex`），
CSS 只负责外观。理由：客户端样式表可能被旧缓存命中（见 B 类），内联样式在 DOM 上，不会错版。

配套：`50-chat.js` 的「布局自愈」在挂载 + 400ms/1600ms + MutationObserver 时复查并纠正，
纠正条数写进 ACTIVITY 日志；`clientCheck.dom/geo/layout` 回传实测值供远程取证。

### 二.3 固定高度必须配「折叠例外」

`--cx-sec-h`（218px）这类等高规则一旦无条件生效，折叠态就会留一大块空壳。规矩：

```css
.cx-xxx{ height:var(--cx-sec-h)!important }        /* 展开态 */
.cx-xxx.folded{ height:auto!important; min-height:0!important; flex:0 0 auto!important }
```

并且 `ui-probe` 的 `pm-folded` 用例**同时**断言折叠 ≤60px 与展开 ≥200px，
防止「为了折叠把展开也压扁」。

### 二.4 离线渲染的已知偏差

- 无头浏览器命中 `@media (hover:none)`，悬停态恒显；判「悬停才显示」不要靠离线截图，
  用 `clientCheck.layout` 里的 `opacity`，或注入 `!important` 类名把两态拆开再截。
- `file://` 页面加载 `assets/client.css` 走文件系统，不受 `max-age` 影响；线上是 HTTP 缓存，
  两者结论不一致时，以实机 `clientCheck` 为准。

## 三、加一条新的布局不变量

1. 在 `scripts/fixtures/` 建 fixture：只写**结构 + class**，不写内联布局（否则测的是你自己）；
2. 在 `scripts/ui-probe.mjs` 的 `CASES` 加一条：`sels` 列出要量的选择器，`assert(m)` 返回
   `[[布尔, 名称, 详情], …]`；
3. 自测双向：真样式表 → PASS；`--css /dev/null` → **必须 FAIL**（否则说明断言不依赖样式表，是假门禁）；
4. 红了先修代码，不要改断言阈值——除非在报告里写清「为什么旧阈值是错的」。

## 四、本轮新增的教训入口

- 复盘写入 `docs/RSI-LEDGER.md`（症状 → 根因 → 修法 → 证据 → 教训）；
- 门禁写进 `package.json` 的 `build:client` 链（少一条就等于没有）；
- 规则写进 `AGENTS.md` §三（铁律）或本文件 §二（布局类）。
