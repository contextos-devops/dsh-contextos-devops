# 可用性门禁（强制约束）

> 总验收口径见 `docs/ACCEPTANCE.md`；本文件是 `npm run release` 的 UI 执行说明。

> 目的：杜绝「构建通过、界面坏了」这种交付。
> 判据不是我说了算，是 `npm run release` 的退出码。

## 铁律

1. **任何 UI 改动，必须 `npm run release` 退出码 = 0**，才允许说「完成」。
2. **退出码 2（无法验证）不算完成**：先开浏览器，再验证。
3. **报告必须贴出 verify 输出**（metrics + PASS/FAIL），不接受「应该没问题」。
4. **失败项必须先修**，不许用「下次再改」绕过。
5. 新增 UI 面（新页面/新组件）时，必须同步在 `scripts/ui-verify.mjs` 里加断言。

## 它检查什么

| 类别 | 断言 |
|---|---|
| 可打开 | 能进入插件页，`.cx-shell` 存在 |
| 结构 | 顶栏、流程条、输入框、右栏、模式切换都存在 |
| 无错误 | 没有 `.cx-error-pane`，运行时无 console error |
| 尺寸 | 顶栏 padding=20、控件高=28、chip 高=28 |
| 字号 | 控件 ∈ {10,12,14}、标题=14、正文=10 |
| 图标 | 宽度 ∈ {14,18} |
| 基线 | 关键数值与 `scripts/ui-baseline.json` 对比，偏差报警 |
| 留证 | 每次生成 `/tmp/ui-verify.png` 截图 |

## 流程

```sh
npm run release     # 构建 + 门禁 + 可用性验证，必须 exit 0
```

浏览器前置（只需一次）：

```sh
"/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge" \
  --user-data-dir=/tmp/edge-ui --remote-debugging-port=9223 about:blank
```

## 例外

- 纯文档改动：可只跑 `npm run build:client`；
- 宿主（`lib/*.js`）改动：仍需重启应用后跑 `npm run verify:ui`，否则视为未验证。
