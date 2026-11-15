# 初始化全量接口日志

- 版本：1.48.49
- 目标：初始化执行期间，控制台输出所有接口请求信息，而不是只显示一条 `API deploy`。

## 实现

- 客户端 `api()` 增加 `window.__CX_API_TRACE__` 钩子：
  - 请求：method、完整 endpoint、请求 body。
  - 响应：HTTP 状态、耗时、字节数、完整响应体。
  - 失败：错误信息。
- 初始化 `runInit` 注册该钩子，写入独立 `apiConsole`，与后端 ContextOS HTTP 日志一起显示。
- `deployLog` 轮询继续贯穿后续 `officialSpaces`、avatar、scene、project 步骤，不再在 deploy 结束时停止。
- 跳过 `deployLog` 自身的轮询请求，避免日志刷屏。

## 证据

- 真实 9444 部署日志包含 `→ GET .../c/runtime`、`← 200 2026B 11ms` 与完整 runtime JSON。
- `ui-check` 通过；`install-check 4/10`；docs 21；publish 8；`build:client` 退出 0。
