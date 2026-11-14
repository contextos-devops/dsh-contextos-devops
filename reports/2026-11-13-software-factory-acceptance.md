# 软件工厂 createApp 验收报告

- 时间：2026-11-13 15:47 CST
- 目标：证明软件工厂能在一个可丢弃空间生成真实 ContextOS CRUD 应用，并完成写读回环。
- 结论：**模块级通过，宿主级待一次批准重启**（不把“构建通过”冒充“UI 已通过”）。

## 做了什么

1. 安装 `dsh-preview@0.1.1`，获得浏览器 DOM/console/screenshot 证据能力。
2. 新增 `docs/ACCEPTANCE.md`，定义 L0/L1/L2/L3 四级验收与证据表，接入 `ui-check`/`context-check`。
3. 在节点 9197 创建一次性空间 `20261113-factorycheck2`。
4. 复现 `createApp` 超时；读取空间 `var/log/error.log`，定位 `go: executable file not found in $PATH`。
5. 新增 `lib/core/gobuild.js`，集中解析本地 Go 并执行 `go mod tidy` + `go build`；
   `lib/core/spaces.js::buildSpace` 改用本地构建，再用 `restartSpace` 加载新二进制。
6. 直调 `createApp` 成功；生成命令 `web.chat.devops.accept2`；写入并读回 1 条记录。
7. 浏览器打开生成命令页面，控制台 0 error，截图留档。
8. 用 `deleteSpace` 删除一次性空间，确认目录已删除。

## 证据

- L0：`ui-check: 78 passed`，`context-check: passed`
- L1：`readData` rows[0] = `{title:"acceptance2", content:"probe2", user_uid:"0cd512..."}`, `count:"1x5"`
- L1（脚本路径）：`writeData` 省略 `user_uid` 也成功，返回 1 行；`accept-factory.mjs` 使用同一接口
- L2：`http://localhost:9197/s/20261113-factorycheck2/c/web.chat.devops.accept2`
- L3：`/Users/shy/.dsh/profiles/desktop/.dsh-preview/page-3-1794556134011.png`

## 经验

- “编译 200 + 进程存在”不代表命令已注册；必须用命令 URL 回读。
- 编辑器/编译动作依赖宿主 PATH；软件工厂必须显式解析 Go，不假设 shell 环境。
- 覆盖二进制后必须重启空间进程，否则旧 inode 继续服务。

## 清理

- `deleteSpace(9197, 20261113-factorycheck2)` 返回 `deleted:true`；目录已不存在。

## 补充：autogen 编译失败根因（16:37 CST）

旧宿主（仍加载旧 `apps.js`）的真实返回：

```json
{"ok":true,"data":{"built":false,"warning":"go mod tidy failed (1): ... module declares its path as ice but was required as ice/devops","goWork":{"code":1}}}
```

接口本身是 200，但 `built:false` 才是结果。根因有三处：

1. `autogenApp` 没有调用 `ensureGoMod`，骨架 `go.mod` 只有 `module <short>`。
2. 社区 autogen 没有生成 `portal.go` 引用的 per-value `.go` 文件。
3. `gobuild.js` 硬编码 `src/version.go`；autogen 应用没有这个文件。
   另外模型把中文标签放进 `value`，被当成 Go 标识符。

修复后直调干净空间 `20261113-factorycheck6`：

```json
{"built":true,"command":"web.team.employee.portal"}
```

浏览器打开该 portal 命令，控制台 0 error；截图 `page-4-1794558943011.png`。
一次性空间已删除，`go.work` 中残留条目已清理。

**仍未验证**：当前 DSH 宿主仍为旧后端；聊天 UI 触发 autogen 需一次批准的重启后复验。
