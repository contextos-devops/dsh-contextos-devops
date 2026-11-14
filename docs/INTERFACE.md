---
id: INTERFACE
title: 接口规范
status: active
layer: L2
owner: code
truth: self
updated: 2026-11-14
---

# 接口规范

> DSH 里一切皆插件；ContextOS 里一切皆**命令**。
> 一条命令五种用法，两层能力，两套权限。

## 0. 速查

| 问题 | 答案 |
|---|---|
| 节点命令 | `/c/<cmd>` |
| 空间命令 | `/s/<pod>/c/<cmd>` |
| 平台接口 | `/s/<pod>/c/<portal>/action/run/<cmd>`（**要过门户查成员**） |
| 上传 | `/s/<pod>/c/<portal>/action/run/<cmd>/action/upload` |
| 静态文件 | `/p/<path>?pod=<space>` |
| 判活/版本 | `/c/runtime` |
| 网页转发 | `POST /chat/action/?_index=<cmd>` + `cmds` |
| 方法 | 看 `/action/<action>`，见 §1.4 |
| 参数 | `arg`→Path、`opt`→Query、`hash`→Hash |
| 身份 | 本机免登录；远程用 `token` / `sessid` / cookie |

## 1. 命令

### 1.1 五种用法

| 形态 | 怎么用 | 例子 |
|---|---|---|
| 网页 URL | 浏览器打开 | `/s/<pod>/c/<cmd>?debug=true` |
| 平台接口 | HTTP 调用（走门户） | `/s/<pod>/c/<portal>/action/run/<cmd>/action/<action>` |
| 内部 CMD · 本进程 | 直接调 | `m.Cmd("<cmd>", <arg>, map[string]string{<opt>})` |
| 内部 CMD · 其它空间 | 指定空间 | `m.Cmd("space", "<pod>", "<cmd>", <arg>, map[string]string{<opt>})` |
| 命令 CLI · 本进程 | 本进程命令行 | `./bin/ice.bin <cmd> <arg>` |
| 命令 CLI · 服务节点 | 发给节点执行 | `./bin/ice.bin admin <cmd> <arg>` |
| 会话 MCP | 智能体会话 | `mcp://contextos/<cmd>?pod=<pod>` |

生成：`commandForms({node, pod, command, portal, arg, opt, hash})`。

### 1.2 命令契约

```go
func (s access) List(m *ice.Message, arg ...string) {}
```

| 入口 | 取什么 |
|---|---|
| `arg ...string` | 位置参数（URL Path） |
| `m.Option()` | 选项参数（URL Query） |
| `m.Config()` | 配置参数（命令自身 `data:"..."`，不是请求参数） |

| 输出 | 作用 |
|---|---|
| `m.Push()` | 结构化数据（列表行） |
| `m.Echo()` | 文本化数据（纯文本、令牌） |
| `m.Cmdy()` | 调其它命令，返回数据复制到当前消息 |
| `m.Display()` / `m.DisplayCSS()` | 前端脚本 / 样式 |
| `m.Process()` | 前端后续行为（`_open` / `_cookie` / `_field`） |

### 1.3 参数三类

| 参数 | 含义 | URL 位置 |
|---|---|---|
| **arg** 位置参数 | 按顺序传 | **Path** |
| **opt** 选项参数 | 具名选项 | **Query** |
| **hash** 锚定参数 | 定位记录/位置 | **Hash** |

没有位置参数时**不要**写空串 `""`——空串也算一个 arg。

### 1.4 方法语义

| URL | 方法 |
|---|---|
| 最后一段命令后面没有 `/action/` | `GET` |
| `/action/` 且是 `create` 或 `*Create` 结尾（`placeCreate`） | `PUT` |
| `/action/` 且是 `remove` / `trash` 或 `*Remove` 结尾 | `DELETE` |
| 其它 `/action/...` | `POST` |

`methodOf({action})` / `methodOfUrl(url)`；读数据一律 GET，写数据不许 GET。

## 2. 返回

### 2.1 响应报文

| 块 | 含义 |
|---|---|
| `append` | 列表列名（列数组等长） |
| `option` | 详情/单条记录字段 |
| `detail` | 字段名清单；**在回声里表示"命令未注册"**（见 §2.3） |
| `result` | 结果值（新记录 uid、令牌、计数） |
| `_status` | 只给**状态栏显示**用（`time`、`count`…），每个命令可任意自定义，**不能当成功/失败判据** |
| `_process` | 前端后续行为：`_open` / `_cookie` / `_field` |
| `_arg` | 行为参数（`_open` 给地址、`_cookie` 给 cookie 值） |
| `_display` / `_display_css` | 前端脚本与样式 |

### 2.1.1 命令的 meta

`meta` 是命令的**自描述**，含样式、翻译、图标、参数：

```
GET /c/command/<cmd>   →   index / name / help / list / meta
```

- 参数定义用它（`meta.<action>`），别自己维护字段表；
- 通用翻译在 `usr/volcanos/const.js`，命令自带的在 `meta._trans`；
- 按钮样式（红/绿）在 `_style`。

### 2.2 数据形态（只有列表与详情两种）

| 形态 | 结构 | 场景 |
|---|---|---|
| **列表** | `append` + 等长列数组 | 查多条 |
| **详情** | `option`（+ `detail` 字段名） | 查单条（带 `uid` / `<place>_uid`） |

`envelopeShape(text)` → `'list' | 'detail' | 'empty' | 'text'`。一条记录不是「一行的列表」。

### 2.2.1 列表：不分页，只查最近

ContextOS **不建议分页**（不分表、不翻页）：

- 只查最近的数据，用最合适的方式排序；
- 排序在命令里用 `m.Sort()` 做好，前端不要自己排；
- 系统默认带 `limit` / `offset`，**暂不建议外部调用方使用**。

### 2.3 错误与空回执（都是 200，别混）

| 现象 | 含义 | 怎么判 |
|---|---|---|
| `append` 存在、0 行、`count 0x0` | **没数据**（正常） | `append.length > 0` |
| `detail:[…]` 且没有业务字段、`count 0x0` | **命令或动作未注册**（回声） | `detail` 数组等于请求路径段 |
| 纯文本 `warn: not allow: …` | 动作未注册 / 不允许 | 文本匹配 |
| 纯文本 `warn: not found index: […]` | 索引不存在 | 文本匹配 |
| 空间日志 `warn not found space: space <uuid> …` | 节点重启后空间注册丢失 | 空间 `var/log/error.log` |
| 超时 | 空间在编译/重启 | 先 `POST /c/dream/action/build` 或 `start` |

**判活不要用 `action/create` 试探**（会真建数据），用 `/c/command/<cmd>` 看有没有 `index/help/list/meta`（`commandExists()`）。

### 2.4 网页还是数据：看 UA

| UA | 返回 |
|---|---|
| 浏览器 | 网页界面（HTML） |
| curl / SDK / 服务端 | 数据（§2.1 的报文或文本） |

同一个地址，不需要 `?format=json`。

## 3. 两层能力

### 3.1 系统级

```
GET /c/<cmd>                        节点命令
GET /s/<pod>/c/<cmd>                空间命令（不经门户，不查成员）
```

### 3.2 平台级

```
GET  /s/<pod>/c/<portal_cmd>                          门户首页
PUT  /s/<pod>/c/<portal_cmd>/action/run/<index_cmd>   经门户执行
```

门户负责：解析身份（sessid → `user.uid`）→ 查成员（`member` / `apply` / `allow`）→ 转发。

**平台级命令不能绕过门户直调 `index_cmd`**，否则跳过成员检查。

### 3.3 两套用户权限

| | 系统级 | 平台级 |
|---|---|---|
| 用户 | `user` | `web.team.gonganxitong.user` |
| 会话 | `sess` | `web.team.gonganxitong.sess` |
| 权限 | `role` | 实例 `member` / `apply` / `allow` |

## 4. 认证与身份

### 4.1 本机 vs 远程

| 场景 | 身份 | 说明 |
|---|---|---|
| 本机（127.0.0.1） | 免登录，等同 root | 参数可任意指定 |
| 远程 / 容器 | 必须 token 或 sessid | 服务端解析身份 |

### 4.2 三种凭证

| 凭证 | 用途 | 命令 |
|---|---|---|
| `web.token`（简写 `token`） | 第三方工具、git、节点互连 | `/c/web.token/action/create` |
| `sess`（`aaa.sess`） | 系统管理员 | `PUT /c/sess/action/create/<username>` |
| `gonganxitong.sess` | 普通用户，能解析出 `user.uid` | `PUT /s/<pod>/c/web.team.gonganxitong.sess/action/create/user_uid/<uid>` |

各种 OAuth 最终都转成 `gonganxitong.sess`。

### 4.3 cookie 值格式

平台级 sessid 的 cookie 不是裸串：

```
sessid = space <pod> web.team.gonganxitong.sess check <sessid>
```

程序化调用用裸 `?sessid=`；浏览器/iframe 用完整值（`_process:["_cookie"]` 时 `_arg[1]` 就是它）。

### 4.4 `user.uid` 的作用范围

- **只对应用级命令有效**：`/s/<pod>/c/web.team.<mod>.portal` 及其子命令；
- 系统级命令（`/c/dream`、`/c/xterm`、`/c/runtime`）不认它，别往日志里塞。

### 4.5 兼容原则

ContextOS **原则上一路加功能、保持兼容**：老命令不删、老参数不改语义，所以不需要声明「最低版本」。新能力以新增命令/新增字段的方式出现。

## 5. 传输细节

### 5.1 上传（平台级）

```
POST /s/<pod>/c/<portal_cmd>/action/run/<index_cmd>/action/upload
Content-Type: multipart/form-data
```

- form-data 里 `cmds` 是**重复字段**，拼出命令链（门户 → 内部命令 → upload）；
- 业务字段与文件同传；`_upload` 是框架标识，`upload` 是文件字段名；
- 命令要调 `web.Upload(m)` 才落盘，否则回显（`vimer` 实测）。

**存储依赖云研发空间**：`20240903-operation` 要装并运行，文件才进文件列表。

```js
uploadUrl({node, pod, command, portal, scope})
upload(port, pathname, {fields, filename, data})
storageReady({node})   // → {installed, running, ready}
```

### 5.2 下载与静态资源

```
GET /p/<path>?pod=<space>
```

实测：`/p/src/main.jpg?pod=20240903-operation` → `200 application/jpg 276434`。

### 5.3 缓存与版本

- 前端资源带版本：`/v/index.css?v=<version>`，版本变则缓存失效；
- `?debug=true` 让页面多显示调试信息、后端多打日志（不改 HTTP 缓存头）。

### 5.4 健康检查

```
GET /c/runtime
```

返回 `boot`（bin/size/time）+ `make`（version/hash/time）→ 判活、拿版本/编译时间/大小（`parseRuntime()`）。

### 5.5 网页转发

```
POST /chat/action/?_index=<index_cmd>
form-data: cmds = action, run, <portal>, action, run, <cmd>, action, <action>
```

`chatActionUrl() / cmdsChain()`。

### 5.6 全局参数

| 参数 | 作用 |
|---|---|
| `user.lang` | 语言，目前只有 `zh-cn` / `en-us` |
| `sess.theme` | 主题（`dark` / `light`），**只影响渲染的模板** |
| `sess.bg` / `sess.fg` | 背景色 / 前景色，同样只影响模板渲染 |
| `sess.daemon` | websocket 网页空间标识 |

`web.chat.action` 的 form-data 里能看到这些值，系统据此返回对应的文案与配色。

### 5.7 sess.daemon 的协议

`sess.daemon` 建立的网页空间**完全支持 `detail` / `option` / `append` / `result` 报文**：

- 用统一的命令方式调用前端网页的能力；
- 前端在 `usr/volcanos/frame.js` 的 `ondaemon` 里解析报文并处理；
- 只带 `sess.daemon`，不带 pod。

## 6. 两个调用方

| 层 | 目录 | 怎么调 |
|---|---|---|
| 终端 / CLI | `usr/intshell/` | `./bin/ice.bin <cmd>`、`ops/<域>/`、`admin <cmd>` |
| 浏览器前端 | `usr/volcanos/` | `can.page.*` / `can.onimport.*` 调同一地址 |

同一个命令、同一套参数、同一份报文——任何一方新增能力，另一方零适配。

## 7. 代码入口

```js
// lib/base/url.js
portalOf(command) placeUidKey(place) apiPath(…) webUrl(…)
systemUrl(…) spaceUrl(…) platformUrl(…) commandForms(…)
paramKinds({arg,opt,hash}) goOpt(opt) methodOf({action}) methodOfUrl(url)
uploadUrl(…) chatActionUrl(…) cmdsChain(…) CHAT_ACTION GLOBAL_PARAMS

// lib/base/http.js
http(port, pathname, {method, timeout, token, sessid, cookie})
upload(port, pathname, {fields, filename, data})
envelopeRows(text) envelopeShape(text) parseRuntime(text)
```

## 8. 已知缺失与自保做法

内核在这三块确实还没有成体系的能力，先把「缺什么」和「我们怎么绕」写清楚，别让后来人以为有。

| 方面 | 缺什么 | 我们怎么办 |
|---|---|---|
| **文件读写** | 只有上传（`action/upload`）与静态下载（`/p/`），没有「读文件内容 / 写文件内容 / 列附件 / 删附件」的命令级接口 | 上传后走实例数据（`portal.json` 的 `input` 字段）记录文件引用；下载走 `/p/<path>?pod=<space>`；不自己造文件 API |
| **并发控制** | 没有锁、没有版本号（`_rev`/ETag）、没有「条件写」 | 插件侧按 `(node, space, command, 实例, 记录)` 串行化写；写完必回读；冲突时以回读结果为准（`lib/core/data.js` 的 `WRITE_QUEUE`） |
| **节点状态流转** | 只有 `running / start / offline` 这种粗粒度，没有「编译中 / 重启中 / 注册中 / 失联」的明确状态机 | 用 `/c/runtime` 判活 + 角色判据（空间日志 `not found space` 视为注册丢失）；UI 上只展示能证实的三种状态，不猜 |
| **数据备份** | 内核没有备份命令；数据全在 `<node>/usr/local/work/<space>/var/db/*.db` | 插件侧 `backupSpace({node, space})` → `~/.contextos/backups/<node>-<space>-<时间>/`（含 `manifest.json`）；`listBackups()` 列出；**恢复不进自动流程**，手工拷回 |
| **服务监控** | 只有「活/不活」，没有历史、没有告警阈值 | `sampleNodes()` 采样每个节点的存活/版本/耗时；监控视图按采样点画趋势；暂不做告警 |

三条对应的实测证据：

- `/c/vimer/action/upload` → 回声（命令未实现上传），说明上传能力是**逐命令**的；
- 空间编译期间写入 → `count 0x0` 或 echo，必须靠回读判定（`writeData` 的重试 + 回读）；
- 节点重启后 `/s/<pod>/...` 全量回声，日志 `warn not found space: space <uuid>`（`base/web/space.go:173`）。

```js
// lib/core/data.js
writeData(args)   // 内部按实例串行化 → writeDataRaw
```

## 9. 示例

```bash
# 列表
curl -s "http://127.0.0.1:9090/c/user"

# 详情
curl -s "http://127.0.0.1:9090/c/command/web.team.shenpixitong.flow"

# 写入（方法由 action 决定）
curl -s -X PUT "http://127.0.0.1:9090/s/<pod>/c/web.team.<mod>.portal/action/run/web.team.<mod>.<fn>/action/create/title/示例?user.uid=<uid>"

# 上传
curl -s -X POST -F "cmds=action" -F "cmds=run" -F "cmds=web.team.<mod>.portal" \
  -F "cmds=action" -F "cmds=run" -F "cmds=web.team.<mod>.<fn>" -F "cmds=action" -F "cmds=upload" \
  -F "upload=@./file.png" \
  "http://127.0.0.1:9090/s/<pod>/c/web.team.<mod>.portal/action/run/web.team.<mod>.<fn>/action/upload"

# 判活
curl -s "http://127.0.0.1:9090/c/runtime"
```

## 10. 功能定制：给一个功能加动作

三步，照抄即可。

### 10.1 结构体里声明动作

```go
type note struct {
	ice.Hash
	short  string `data:"index,title"`
	field  string `data:"time,index,title,content,user_uid"`
	create string `name:"create title* content* user_uid"`
	what   string `name:"what title* content* user_uid" help:"快速填写"`
	list   string `name:"list index auto"`
}
```

`name:"what title* content* user_uid"`：`*` 表示必填，声明即注册，不必写路由。

### 10.2 写函数

```go
func (s note) What(m *ice.Message, arg ...string) {
	s.Create(m, arg...)   // 或 s.ValueCreate(m, arg...)
	s.List(m)
}

func (s note) List(m *ice.Message, arg ...string) *ice.Message {
	s.Select(m, arg...)                 // msg := s.Select(m.Spawn()) 也行
	m.Action(s.Create, s.What)          // 工具栏
	m.Table(func(value ice.Maps) {
		m.PushButton(s.What, s.Modify, s.Remove)  // 每行按钮
	})
	return m
}
```

可用的既有函数：`s.Create / s.Modify / s.Remove`、`s.ValueCreate / ValueModify / ValueRemove`、`s.Select(m.Spawn())`、`m.Push / m.Echo / m.Table / m.Action / m.PushButton / m.PushAction`。

### 10.3 编译空间

```sh
POST /c/dream/action/build?name=<space>
```

### 10.4 一个必须知道的行为

`PushButton` 只在**浏览器 UA** 下生效：`curl`（非浏览器 UA）拿到的是数据报文，没有按钮列；浏览器打开同一 URL 才看到工具栏与行内按钮。这是 UA + Method 区分网页/接口的必然结果，不是 bug。
