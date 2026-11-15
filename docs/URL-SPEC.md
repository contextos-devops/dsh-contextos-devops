---
id: URL-SPEC
title: 接口 URL 与网页 URL 规范
status: active
layer: L2
owner: code
truth: self
updated: 2026-11-14
---

# 接口 URL 与网页 URL 规范


> 读这份当：构造任何接口或网页 URL 之前。
> 不读这份当 → 接口语义 → `INTERFACE.md`
> 唯一真源：`lib/base/url.js`（宿主）、`cxWebUrl`（`src/client/parts/00-prelude.js`，客户端）。
> 任何地方**不许手拼**这两类 URL；任何地方**不许**用空间 uid。

## 一、空间标识：只用 pod（名称）

| 用法 | 允许 | 禁止 |
|---|---|---|
| 空间标识 | `20240724-enterprise` | `space_uid`、`sp.uid`、`f1af4d7a…` |
| 实例标识 | `<place>_uid`（如 `system_uid`、`supplier_uid`） | 写成通用 `place_uid=` 参数 |

`place` = 数据表名，默认 `system`；参数名由 `placeUidKey(place)` 生成：`<place>_uid`。

## 二、接口 URL（读写数据）

```
/s/<pod>/c/<portal>/action/run/<cmd>/action/<action>/<k0>/<v0>/<k1>/<v1>/...
    ?user.uid=<当前分身>
    &<place>_uid=<实例>
    &uid=<记录>            ← 只有 modify / remove 才带
```

- `<portal>`：`web.team.<mod>.portal`（由 `portalOf(command)` 推导，`web.team.<mod>.<fn>` → `web.team.<mod>.portal`）
- `<cmd>`：`web.team.<mod>.<fn>`，如 `web.team.supplychain20.supplier`
- `<action>`：`create` / `modify` / `remove`
- `<k>/<v>`：表单字段，路径段，值里不能有半角 `/`
- `user.uid`：当前分身身份（`cxActorUid(avatar)`）
- `<place>_uid>`：实例条件，键名随 `place` 变
- `uid`：**记录**主键，创建时不传

构造：`apiPath({ pod, command, action, seg, scope })`；`segment` 由 `fieldSegments(numFields)` 生成。

## 三、网页 URL（浏览器打开）

```
http://127.0.0.1:<node>/s/<pod>/c/<portal>?debug=true&<place>_uid=<实例>#<实例>:<cmd>:<记录>
```

- host 用 `CX_HOST`（页面在 `localhost` 就用 `localhost`，否则 `127.0.0.1`），不能混用（cookie 不跨 host）
- 空间路径**不带尾斜杠**
- `#` 三段只在「打开某条记录」时出现

构造：`cxWebUrl({node, pod, command, place, placeUid, recordUid, uid})`（客户端）/ `webUrl(...)`（宿主）。

## 四、身份与实例的来源

1. 插件启动先加载「当前节点 + 当前分身」（`60-page.js` 的启动 effect）；
2. 表单在生成时就把 `ctx = {node, space, command, portal, place, place_uid, uid}` 写进消息；
3. 提交只用 `ctx`，不读页面下方当前节点/空间选择。

## 五、禁止清单（gate 会查）

- 代码里出现 `space_uid` / `sp.uid` 拼接；
- 手写 `action/run` 或 `/s/…/c/…?debug=true` 字符串（必须走 `apiPath` / `cxWebUrl`）；
- 创建请求里带 `uid=<分身 uid>`（`uid` 只能是记录主键）；
- 网页 URL 与接口 URL 互相复用（网页 URL 只给 iframe/浏览器，接口 URL 只给 `http()`）。

## 五、两个全局通用参数（2026-11-14 定论）

| 参数 | 作用范围 | 语义 |
|---|---|---|
| `debug=true` | **全局通用** | 网页界面显示更多调试信息，后端日志打印更多信息。任何 URL 都可以带。 |
| `user.uid` | **仅应用级命令** | 只对 `web.team.*.portal` 及其子命令（`/s/<pod>/c/web.team.<mod>.portal[/action/...]`）有效；系统级命令不认它。 |

系统级命令（**不要**带 `user.uid`）：

```
/c/dream            /c/xterm/type/sh      /c/vimer
/c/desktop          /c/admin              /c/monitor
/s/<pod>/c/runtime  /s/<pod>/c/web.team.<mod>.<fn>?   ← 只有 portal 家族才认 user.uid
```

为什么：`user.uid` 是**应用数据**的身份维度（最近应用、实例归属、记录归属）；系统级接口的服务对象是节点/空间本身，带上去既不生效，又会让日志里出现「看似有身份其实无意义」的记录。

客户端实现：`withActor(raw)`（`src/client/parts/60-page.js`）用

```js
const appLevel = /^\/s\/[^/]+\/c\/web\.team\.[^/]+\.[^/]+/.test(u.pathname);
if (appLevel && actor) u.searchParams.set('user.uid', actor);
```

`debug=true` 由各入口自己决定（如商店「配置」=`?view=table&debug=true`、「编程」= vimer + `debug=true`）。

## 六、访问模式：本机免登录 vs 远程必须授权

| 访问方式 | 身份 | `user.uid` | `sessid` / token |
|---|---|---|---|
| 本机 `127.0.0.1:<port>` | 免登录，等同于 root | **可以任意指定**（只对应用级命令生效） | 不需要 |
| 远程节点 | 必须登录/授权 | **不要自己编**；服务端从 `sessid`/token 解析出 `user.uid` 及相关用户信息 | 必须带 |

规则：

1. 本机请求：`user.uid` 是「以谁的身份看数据/写数据」的**覆盖参数**，可以任意指定；因此本地可以一个进程里切多个身份做诊断。
2. 远程请求：身份由 `sessid` / token 决定，客户端**不传、也不猜** `user.uid`；没有有效 `sessid` 应当先走登录/授权，而不是伪造身份。
3. 宿主实现（`lib/base/http.js`）：只有当路径是应用级（`/s/<pod>/c/web.team.…`）时才自动附加缓存的 `user.uid`；系统级命令（`/c/dream`、`/c/xterm` 等）一律不加。
4. 客户端实现（`src/client/parts/60-page.js` 的 `withActor`）：同样只在应用级路径上加；远程节点（非 `127.0.0.1/localhost`）直接返回原 URL，不做任何身份注入。

## 七、远程 / 容器节点的凭证

本机节点免登录；**远程节点与容器节点**必须先用另外的通道（ssh / docker exec）在该节点上执行一次：

```
PUT /c/web.token/action/create              → token（十六进制串）
PUT /c/aaa.sess/action/create/<username>    → sessid（十六进制串）
```

拿到之后，所有请求二选一携带：

```
?sessid=<sessid>        ← 有会话，优先
?token=<token>          ← 无会话，用令牌
```

此时**不要再传 `user.uid`**：服务端会从 sessid / token 解析出用户身份。

实现：`lib/core/auth.js`

| 函数 | 作用 |
|---|---|
| `nodeToken({node})` | `PUT /c/web.token/action/create` |
| `nodeSessid({node, username})` | `PUT /c/aaa.sess/action/create/<username>` |
| `ensureNodeAuth({node, username, force})` | 取 token，失败再取 sessid；结果缓存到 `stateDir()/node-auth.json`（TTL 30 分钟） |
| `peekNodeAuth({node})` | 只读缓存，返回 `{token, sessid, at, fresh}` |

`http(port, path, { sessid })` / `{ token }` 会自动把凭证拼进查询串。

节点卡片「⋯ → 登录凭证」= `nodeAuth` op：取到后复制到剪贴板并提示。

### 7.1 两种 sessid

| 层级 | 创建方式 | 回执 | 用途 |
|---|---|---|---|
| 系统级 | `PUT /c/aaa.sess/action/create/<username>` | 纯文本 sessid | 节点本身（`/c/...`） |
| **应用级** | `PUT /s/<space>/c/web.team.gonganxitong.sess/action/create/user_uid/<uid>` | JSON：`result[0]` = sessid，`_process:["_cookie"]`，`_arg:["sessid","space <pod> web.team.gonganxitong.sess check <sessid>","-2"]` | 应用（`web.team.*.portal` 及其子命令） |

应用级 sessid 的实现：`lib/core/auth.js appSessid({ node, space = '20240724-community', userUid })`。

实测（9090）：

```
PUT /s/20240724-community/c/web.team.gonganxitong.sess/action/create/user_uid/32bcaf00…?user.uid=32bcaf00…&user_uid=32bcaf00…
→ result ["d97cf252fc34f1f3a8141bf30843710b"]
GET /s/20240724-community/c/web.team.gonganxitong.service?sessid=d97cf252…  → 200
```

调用 `nodeAuth` op 时用 `{kind:'app', space, userUid}` 取应用级 sessid；不传 `kind` 则取系统级 token/sessid。

## 八、三种认证方式（2026-11-14 定论）

| 认证 | 创建方式 | 身份 | 用途 |
|---|---|---|---|
| **工具令牌** | `PUT /c/aaa.token/action/create`（`web.token` 是它的网页入口） | 一个工具/节点，不解析成用户 | 第三方工具、git 推送、**服务节点之间互连** |
| **管理员会话** | `PUT /c/aaa.sess/action/create/<username>` | 系统管理员 | 登录网页，执行更多系统级操作 |
| **用户会话** | `PUT /s/<space>/c/web.team.gonganxitong.sess/action/create/user_uid/<uid>` | 普通用户，**可解析出 `user.uid`** | 普通用户登录、应用级数据访问 |

携带方式一律是查询参数：`?token=<token>` 或 `?sessid=<sessid>`；带凭证时不要再传 `user.uid`（服务端会解析）。

后续会加入各种 OAuth 登录，**最终都转换成 `web.team.gonganxitong.sess` 生成的 sessid** 来访问——即：无论入口是微信/钉钉/GitHub，落到本系统只有一种会话。

代码：`lib/core/auth.js` 的 `toolToken` / `adminSessid` / `appSessid`；`nodeAuth` op 用 `kind: 'tool' | 'admin' | 'app'` 选择。

### 8.1 平台级 sessid 的 cookie 值

`web.team.gonganxitong.sess` 创建出来的会话，cookie 里存的不只是十六进制串，而是**带命令的完整值**：

```
sessid=space 20240724-community web.team.gonganxitong.sess check d97cf252fc34f1f3a8141bf30843710b
```

回执里 `_arg` 就是这个约定的证据：

```json
"_arg": ["sessid", "space 20240724-community web.team.gonganxitong.sess check d97cf252…", "-2"]
"_process": ["_cookie"]
```

因此：

| 场景 | 用法 |
|---|---|
| 程序化调用接口 | `?sessid=<十六进制>`（裸值即可） |
| 浏览器 / iframe / 设置 cookie | `Cookie: sessid=space <pod> <command> check <sessid>`（**完整值**） |

代码：`appSession({node, space, userUid})` → `{ sessid, cookie }`；`http(port, path, { cookie })` 会按完整值拼 `Cookie` 头。

## 九、平台数据接口（三条，唯一形态）

```http
# 添加数据
PUT /s/<pod>/c/<portal>/action/run/<index_cmd>/action/create/<k0>/<v0>/<k1>/<v1>…?user.uid=<user.uid>&<place>_uid=<place_uid>

# 查询数据列表
GET /s/<pod>/c/<portal>/action/run/<index_cmd>/<place_uid>?user.uid=<user.uid>

# 查询数据详情
GET /s/<pod>/c/<portal>/action/run/<index_cmd>/<place_uid>/<uid>?user.uid=<user.uid>
```

- `<index_cmd>` 是应用内的功能命令（如 `web.team.xiangmuguanli.plan`），不是门户。
- 写：实例条件走**查询参数** `<place>_uid`；字段走 `/k/v` 路径段，顺序必须与 `meta.create` 一致。
- 读：实例 uid 走**路径段**，详情再加记录 uid，**不再用查询参数**。
- 只有 `user.uid` 一个身份参数；`user_uid`、`project_uid` 均已废弃。
- 代码入口：`lib/base/url.js` 的 `dataPath()`，`lib/core/data.js` 的 `readData/writeData` 只调它。
- **实例参数的键名由门户决定**：`<place>_uid`。门户的 place 表叫 `system` 就是 `system_uid`（autogen 生成的应用默认如此），叫 `project` 就是 `project_uid`（项目管理系统）。键名取自响应里的 `_place_uid` 字段，不要写死 `system_uid`。

### 9.0 响应形态（实测）

| 操作 | 成功判据 | 说明 |
|---|---|---|
| 添加 | `result: [<新记录 uid>]` + `count 1xN` | N = 列数 |
| 列表 | `count 1xN` + 并行数组（`uid`/`title`/…） | `append` 是列名 |
| 详情 | `count 1xN` + `append: [key, value]` 的键值对 | 不是列表行 |
| 修改 | `count 0x0` | 0x0 也可能是成功，必须回读确认 |
| 删除 | `count 0x0` | 同上，回读列表确认为空 |


### 9.1 修改（modify） / 删除（remove）

```http
# 修改
POST /s/<pod>/c/<portal>/action/run/<index_cmd>/action/modify/<k0>/<v0>/…?user.uid=<user.uid>&<place>_uid=<place_uid>&uid=<uid>

# 删除
DELETE /s/<pod>/c/<portal>/action/run/<index_cmd>/action/remove?user.uid=<user.uid>&<place>_uid=<place_uid>&uid=<uid>
```

- 修改 = `modify` + `POST`；删除 = `remove` + `DELETE`。动作名不同，不要混用。
- `uid` 是被操作的那条记录（不是身份）；身份只有 `user.uid`。
