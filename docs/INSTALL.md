# 部署安装矩阵（节点）

> 读这份当：部署节点、选择源码/二进制、跨平台准备或排查 git/go/目标架构。
> 不读这份当 → 节点生命周期 → `ARCHITECTURE.md` §8；接口形状 → `INTERFACE.md`。

## 0. 一句话

先探测 **git / go**；有 git 走源码（缺 go 自动补），无 git 走镜像二进制。
源码地址是默认 clone 源，代码源可覆盖；二进制从源码地址的主机地址下载，镜像源可覆盖。
跨平台只准备文件，**不在本机启动**。

## 1. 四种能力组合

| git | go | strategy | 实际步骤 |
| --- | --- | --- | --- |
| 有 | 有 | `source` | `git clone` → `source etc/miss.sh` → `bin/ice.bin` |
| 有 | 无 | `source` | 同上，`ensureGo()` 下载 Go 到节点 `usr/local/go` |
| 无 | 有 | `binary` | 下载 `/publish/ice.<os>.<arch>`，不需要 go |
| 无 | 无 | `binary` | 同上，零工具链 |

`auto` 只按 git 选：**有 git → source；无 git → binary**。界面默认 `auto`，代码源 / 镜像源初始为空。`goPolicy=never` 时 source 缺 go 直接报错；
`copy` 只用于本机已有二进制，不参与跨平台。

官方参考脚本的行为等价于：

```sh
# 无 git：下载官方 wrapper，source binary
export ctx_dev=https://shylinux.com ctx_name=2026-ContextOS
temp=$(mktemp); curl -fsSL "$ctx_dev" -o "$temp"; . "$temp" binary

# 有 git：同一 wrapper，source source（缺 go 自动补）
temp=$(mktemp); curl -fsSL "$ctx_dev" -o "$temp"; . "$temp" source
```

## 2. 目标平台（官方 `/publish` 实测非空；仅 API/CI 测试，界面不暴露）

| target | 平台 | 文件 | 本机可启动 |
| --- | --- | --- | --- |
| `darwin.arm64` | macOS Apple Silicon | `ice.darwin.arm64` | 仅 macOS arm64 |
| `darwin.amd64` | macOS Intel | `ice.darwin.amd64` | 仅 macOS amd64 |
| `linux.amd64` | Linux x86_64 | `ice.linux.amd64` | 仅 Linux amd64 |
| `linux.arm64` | Linux ARM64 | `ice.linux.arm64` | 仅 Linux arm64 |
| `linux.386` | Linux 386 | `ice.linux.386` | 仅 Linux 386 |
| `linux.arm` | Linux ARM | `ice.linux.arm` | 仅 Linux arm |
| `linux.mipsle` | Linux MIPSLE | `ice.linux.mipsle` | 仅 Linux mipsle |
| `windows.amd64` | Windows x86_64 | `ice.windows.amd64` | 仅 Windows amd64 |
| `windows.386` | Windows 386 | `ice.windows.386` | 仅 Windows 386 |
| `windows.arm64` | Windows ARM64 | — | **不可用**（发布文件 0 B，UI 禁用） |

别名：`linux.x86_64`、`darwin.aarch64`、`windows.x86_64` 会归一到上表 id。

## 3. 四种安装方式

| method | 用途 | 关键行为 |
| --- | --- | --- |
| `auto` | 默认 | git 有则源码，无则镜像二进制 |
| `source` | 本机开发/可编译 | 必须 git；可自动下载 Go；必须与目标同机 |
| `binary` | 干净机器/跨平台准备 | 从镜像源下载；跨平台返回 `prepared:true,canStart:false` |
| `copy` | 本机快速复制 | 只复制本机 `bin/ice.bin`；无下载 |

## 4. API 与界面

- `POST /dsh-contextos-devops/api?op=deployOptions`：返回 `host/git/gitVersion/go/goVersion/goReady/goNeed/targets/matrix/methods/defaults`；
  `defaults={method:'auto',repo:<源码地址>,codeSource:'',mirror:''}`。Go 低版本仍显示版本（并标记需补 1.25+），不再显示“未发现”。
- `POST /dsh-contextos-devops/api?op=deploy`：参数
  `port,name,method,repo,codeSource,mirror,dir,ctxName,goPolicy,parent,sourceBin,dryRun`；
  `target` 仅保留给 API/CI 全矩阵测试，界面不暴露；`server` 为旧参数，等价于 `mirror`。
  `dryRun:true` 只返回 `{dryRun:true,plan}`，不建目录、不占端口、不启动。
- 管理 → 部署节点：顶部能力条显示 `git <版本>` / `go <版本>`，检测不到显示「未发现」；不显示 curl 检测。
  最右侧「高级配置」默认收起，展开后才显示安装方式（默认 auto）、源码地址、代码源、镜像源和四行能力矩阵；
  `CTX_NAME`、端口、名称、标准空间常显。`查看安装计划`（dry-run）与 `预览脚本` 不展开高级配置也可用；
  部署后保留窗口，按时间/状态/CLI/API/影响/明细展示真实执行过程。
- 初始化向导 → 本机部署：同一套能力条和高级配置开关；默认只看部署目录、端口、标准空间，
  展开后才显示安装方式 / 源码地址 / 代码源 / 镜像源；不再显示目标平台和安装源。
  向导把参数传给 `runInit` 的 `deploy`。

## 4.1 源码地址 / 代码源 / 镜像源

- `repo`（源码地址）：默认 clone 源，默认 `https://shylinux.com/x/ContextOS`。
- `codeSource`（代码源，可选）：主机或根；源码安装时拼成
  `<codeSource>/x/<源码地址项目名>`，例如 `https://web.shylinux.com` → `https://web.shylinux.com/x/ContextOS`。
  已带 `/x/<项目>` 的完整地址原样使用；为空时用 `repo`。
- `mirror`（镜像源，可选）：二进制下载根；空时取 `repo` 的 origin。下载
  `<mirror>/publish/ice.<os>.<arch>`；Windows 追加 `?filename=ice.exe`。
- `officialSpaces` 的 `binaryMode=true` 时，每个标准空间 `createSpace` 带
  `binary=https://web.shylinux.com/s/<prefix>-<key>`，**不调用** `buildSpace`（dream/build）；
  binaryMode=false 时 source 模式不带 binary，创建后调用 `dream/action/build`。
  镜像包启动较慢，binary 模式等待 `/c/runtime` 最多 180s。

## 4.2 部署控制台：所有 ContextOS 接口请求

部署期间 `lib/base/http.js` 的每次 ContextOS 请求都会实时写入
`/tmp/contextos-deploy-<port>.log`，同时写入请求行、HTTP 方法、完整 URL、状态码、耗时、字节数
和完整响应体；前端初始化页每 500ms 轮询 `deployLog`，原样显示，不截断到一行摘要。
`http()` 的统一入口覆盖 `GET/POST/PUT/DELETE`（含 `/c/` 与 `/s/`），`upload()` 也走同一套记录。
接口响应超过 200KB 时保留前 200KB 并明确标记截断长度，避免控制台渲染卡死。

## 5. 验收

```sh
npm run check:install   # 4 组合 × 10 目标（9 可用）纯规划
npm run build:client    # 含 check:install + 其余门禁
```

真实部署至少跑三类：`copy`（本机复制）、`binary`（下载并启动）、跨平台 `binary`（下载后
`canStart:false`，检查 ELF/PE 头）；源码模式另跑一次 clone+build。测试节点用独立端口/目录，
结束后 `stopNode` + `deleteNode`，不留测试垃圾。
