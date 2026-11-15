# 代码生成规范（在插件里按需求生成 ContextOS 代码）

> 读这份当：让插件按需求生成 ContextOS 代码（factory 模式）。
> 不读这份当 → 架构 → `ARCHITECTURE.md`；接口 → `INTERFACE.md`

**按章读**：§一–§二 两类模块与目录 → 要落文件时；§三 词表 → 起名/中英对照；§四–§五 参数文法与权限 → 写命令标签；§六 工厂实现要点 → 改 `lib/core/codegen.js`。

> 用户说「给某个功能加一个动作 / 加个按钮 / 加个字段 / 新写一个功能」，插件按本规范生成代码、写入空间、编译、验证。
> 实现：`lib/core/codegen.js`（模板 + 渲染 + 落盘）、`index.js` 的 `codegenList` / `codegenRender` / `codegenApply`，客户端 `50-chat.js` 的 `codegenAsk`。

## 一、硬规则

1. **只加不改**：新动作 = 结构体加一行 + 加一个方法，不动框架、不改路由。
2. **声明即注册**：`name:"what title* content* user_uid"` 写在结构体里，`*` = 必填，不需要另写路由表。
3. **只写 `<space>/src/<zone>/<file>.go`**：`codegenPath()` 强制校验，路径逃逸直接报错。
4. **写完必编译**：`POST /c/dream/action/build?name=<space>`，编译失败要带 `buildNote` 报给用户。
5. **值里不能有半角 `/`**：URL 路径分隔符，服务端会重新切分导致写丢。
6. **按钮只在浏览器 UA 下渲染**：`PushButton` 内部 `if !m.IsCliUA()`，curl 拿到数据没有按钮是正常的。

## 一·五、用户怎么说，插件怎么解析

用户不会说「给我加一个 rowButton」，他会说：

> 在工具栏上添加一个驳回按键
> 当状态为待审时，添加一个通过按键
> 金额大于 100 的时候显示提醒按钮

`codegenPlan({text, module, fields})`（`lib/core/copilot.js`）先让模型解析，失败再用规则兜底，输出：

```json
{"scope":"toolbar|row","action":"Reject","label":"驳回","field":"status","op":"eq","value":"created","why":"…"}
```

| 用户用词 | 解析结果 |
|---|---|
| 工具栏 / 工具条 / 页面上方 | `scope = toolbar` |
| 当…时 / 如果…就 / 某条数据… | `scope = row` |
| 驳回 / 通过 / 提交 / 完成 / 取消 / 归档 | `action = Reject / Approve / Submit / Finish / Cancel / Archive` |
| `状态=待审`、`status 为 approved` | `field + op(eq) + value` |
| 大于 / 超过 / 高于 | `op = gt` |
| 不为空 / 有值 | `op = nonempty` |

兜底规则在 `codegenPlan` 里，模型不可用时同样能出结果（`source: fallback`）。

## 二、四个模板

| key | 用途 | 变量 | 产出 |
|---|---|---|---|
| `action` | 给已有功能加一个动作 | zone, module, Action, action, params | 结构体一行 + 方法 |
| `field` | 给功能加一个字段 | field, type | 结构体一行（另需手工加进 `field`/`create` 标签） |
| `function` | 新写一个功能模块 | zone, module | 整个 `.go` 文件 |
| `buttons` | 列表每行挂按钮 | module, Action, action | `List` 覆写 |

### 2.1 action

```go
type note struct {
	ice.Hash
	short  string `data:"index,title"`
	field  string `data:"time,index,title,content,user_uid"`
	create string `name:"create title* content* user_uid"`
	what   string `name:"what title* content* user_uid" help:"快速填写"`
	list   string `name:"list index auto"`
}

func (s note) What(m *ice.Message, arg ...string) {
	s.Create(m, arg...)
	s.List(m)
}
```

### 2.2 buttons

```go
func (s note) List(m *ice.Message, arg ...string) *ice.Message {
	s.Select(m, arg...)
	m.Action(s.Create, s.What)
	m.Table(func(value ice.Maps) {
		m.PushButton(s.What, s.Modify, s.Remove)
	})
	return m
}
```

### 2.3 function

```go
package devops

import "shylinux.com/x/ice"

type note struct {
	ice.Hash
	short  string `data:"index,title"`
	field  string `data:"time,index,title,content,user_uid"`
	create string `name:"create title* content* user_uid"`
	list   string `name:"list index auto"`
}

func init() { ice.Cmd("web.devops.note", note{}) }
```

### 2.4 toolbarButton（工具栏条件按键）

```go
reject   string `name:"reject title* content*" help:"驳回"`

func (s note) Reject(m *ice.Message, arg ...string) {
	s.Create(m, arg...)
	s.List(m)
}

func (s note) List(m *ice.Message, arg ...string) *ice.Message {
	s.Select(m, arg...)
	m.Action(s.Create)
	if m.Option("status") == "created" {
		m.Action(s.Reject)
	}
	m.Table(func(value ice.Maps) {
		m.PushButton(s.Modify, s.Remove)
	})
	return m
}
```

### 2.5 rowButton（行内条件按键）

```go
m.Table(func(value ice.Maps) {
	if value["status"] == "created" {
		m.PushButton(s.Reject, s.Modify, s.Remove)
	} else {
		m.PushButton(s.Modify, s.Remove)
	}
})
```

条件表达式统一由 `codegenCond()` 生成，支持 `eq/ne/gt/lt/nonempty/empty`。

> **合并而不是覆盖**：目标 `.go` 已存在时，`codegenApply` 用 `codegenMerge()` 把声明插进结构体、把方法追加到末尾；`function` 模板遇到同名文件直接拒绝。

## 二·五、两类模块：系统级 vs 平台级

生成代码前先判类型（`detectClass()`），两类结构不同，改法也不同。

| | 系统级 | 平台级 |
|---|---|---|
| 继承 | `ice.Hash` | `db.Table`（`Table` + `model/`） |
| 存储 | 内存（类 Redis） | SQLite / MySQL |
| 字段声明 | `field string \`data:"..."\`` | `fields string \`data:"..."\`` |
| 索引 | `short string \`data:"..."\`` 生成 hash 索引 | 由 `model` 里的 `gorm` 标签与表结构决定 |
| 数据模型 | 无独立文件 | `model/model.go`：常量 + struct |
| 判据 | 有 `ice.Hash` | 有 `fields ... data:` 或 `db.Table` 或 `Table` + `model.` |

### 2.5.1 添加字段

| 用户说 | 系统级动作 | 平台级动作 |
|---|---|---|
| 给模块加一个 `remark` 字段 | `field` 标签插入 `remark` | `fields` 标签插入 `remark`，同时在 `model/model.go` 的 `const` 块加 `REMARK = "remark"` |

插入位置：**`user_uid` 之前**（没有则追加），保持「业务字段 → 归属字段」的顺序。

### 2.5.2 添加操作

统一是「声明 + 方法 + 按钮」三件套：

```go
finish string `name:"finish" help:"完成"`        // ① 结构体声明

func (s note) Finish(m *ice.Message, arg ...string) {  // ② 方法
	s.Create(m, arg...)
	s.List(m)
}

m.Action(s.Finish)                               // ③ 工具栏
m.PushButton(s.Finish, s.Modify, s.Remove)       // ③ 行内
```

### 2.5.3 顺序规则（必须遵守）

1. **结构体声明顺序 = 字段顺序**：`order`/`role` → `field|fields` → `short` → 动作声明（create 在最前）→ `list` 在最后；
2. **方法顺序 = 声明顺序**：`Create` → `Modify` → `Remove` → 自定义动作 → `List`；
3. 新动作插在 `list` 声明**之前**、新字段插在 `user_uid` **之前**；
4. `codegenMerge()` 已按此顺序插入，不要手工挪位置。

### 2.5.4 字段名与操作名：只用框架词表

词表来源：`usr/icebergs/base/`（十二个基础模块：aaa/base/cli/ctx/gdb/lex/log/mdb/nfs/ssh/tcp/web/yac）与 `usr/icebergs/core/`（chat/code/mall/team/wiki）。

**字段**（`mdb.*` / `aaa.*`）：

```
uid id time name title text content type status order score group
valid enable member expire icon help user_uid place_uid project_uid
target_uid plan_uid task_uid report_uid feedback_uid image link
begin_time end_time process_time finished_time
```

**操作**（`mdb.*`）：

```
create insert modify update remove delete select list detail export import enable disable prunes
```

中文自动归一：

| 用户说 | 落库字段/操作 |
|---|---|
| 备注 / 说明 / 描述 | `text` |
| 名称 / 名字 | `name` |
| 排序 / 顺序 | `order` |
| 新增 / 添加 | `create` |
| 编辑 | `modify` |
| 移除 | `remove` |
| 查看 / 查询 | `select` |

不在词表里的名字**直接拒绝**，并返回可用清单（`checkField` / `checkAction`）。

### 2.5.5 声明属性：name / help / icon / role / style

```go
finish string `name:"finish title*" help:"完成" icon:"ok" role:"leader" style:"guiding"`
```

| 属性 | 作用 | 取值 |
|---|---|---|
| `name` | 参数声明，带 `*` 为必填 | `title* content` |
| `help` | 中文名 | 任意中文 |
| `icon` | 图标 | 框架图标名 |
| `role` | 系统角色 `root/tech/void`；成员角色 `creator/leader/worker/member/visitor/server` | 见 `ROLES` |
| `style` | 样式 | `guiding/notice/danger/primary/success/warning` |

`declAttrs()` 按顺序拼接，缺省不写。

### 2.5.5.1 参数文法（`usr/icebergs/info.go` `SplitCmd`）

声明里的 `name:"…"` 不是随便写，由 `SplitCmd(name, actions)` 解析，分隔符是**空格**和 `* : = @`：

```
name*(:text|textarea|select|button|password)=value@action
```

| 写法 | 含义 |
|---|---|
| `title` | 文本字段 |
| `title*` | 必填（`need:"must"`） |
| `content:textarea` | 多行文本 |
| `status:select=created,approved` | 下拉，候选值逗号分隔，默认第一个 |
| `approve@create` | 按钮，点击执行 `create` |
| `list:auto` | 自动列表按钮 |

后缀自动推导（不写 `:type` 也生效）：

| 后缀 | 推导 |
|---|---|
| `_info` / `_content` / `content` / `text` | textarea |
| `_uid` / `_type` / `_status` / `type` / `status` | select |
| `_image` / `image` | text + `@img` + `=9` |
| `_time` | select + `@date` |

生成器用 `paramOf()` / `paramSpec()` 拼这个字符串，不手写。

### 2.5.7 模块常用函数与顺序

框架里一个模块的标准函数就这七个（`ice.Hash` / `db.Table` 都有默认实现，可以全部重写）：

| 顺序 | 函数 | 作用 |
|---|---|---|
| 1 | `Init(m *ice.Message, arg ...string)` | 系统启动时加载：注册数据、初始化缓存 |
| 2 | `Exit(m *ice.Message, arg ...string)` | 系统停止时卸载：关句柄、落盘 |
| 3 | `Inputs(m *ice.Message, arg ...string)` | 参数补全：前端联动取值 |
| 4 | `Create(m *ice.Message, arg ...string)` | 新增 |
| 5 | `Modify(m *ice.Message, arg ...string)` | 修改 |
| 6 | `Remove(m *ice.Message, arg ...string)` | 删除 |
| 7 | `List(m *ice.Message, arg ...string)` | 列表（自定义动作排它前面） |

```go
func (s note) Init(m *ice.Message, arg ...string)   { s.Hash.Init(m, arg...) }
func (s note) Exit(m *ice.Message, arg ...string)   { s.Hash.Exit(m, arg...) }
func (s note) Inputs(m *ice.Message, arg ...string) { s.Hash.Inputs(m, arg...) }
func (s note) Create(m *ice.Message, arg ...string) { s.ValueCreate(m, arg...) }
func (s note) Modify(m *ice.Message, arg ...string) { s.ValueModify(m, arg...) }
func (s note) Remove(m *ice.Message, arg ...string) { s.ValueRemove(m, arg...) }
func (s note) List(m *ice.Message, arg ...string) *ice.Message {
	s.Select(m, arg...)
	m.Action(s.Create)
	m.Table(func(value ice.Maps) { m.PushButton(s.Modify, s.Remove) })
	return m
}
```

自定义动作（`Finish` 之类）排 `Remove` 之后、`List` 之前。`codegenMerge()` 的 `insertFunc()` 按这个 rank 插入，不按到达顺序追加。

### 2.5.8 权限检查的两层

**第一层：声明上的 `role`**——框架在分发命令前就拦住，没权限根本进不来。

```go
finish string `name:"finish" help:"完成" role:"leader"`   // 只有负责人及以上
```

**第二层：函数内自查**——条件依赖数据或组合判断时用。

| 检查 | 写法 | 适用 |
|---|---|---|
| 系统管理员（root/tech） | `m.IsTech()`（等价 `aaa.IsTechOrRoot(m)`） | 任意模块 |
| 创建人 | `s.IsCreator(m)` | 平台级（有 `Table`） |
| 负责人及以上 | `s.IsLeader(m)` | 平台级 |
| 执行人及以上 | `s.IsWorker(m)` | 平台级 |
| 访客 | `s.IsVisitor(m)` | 平台级 |

拒绝并返回的正确写法：

```go
func (s note) Audit(m *ice.Message, arg ...string) {
	if m.WarnNotRight(!m.IsTech()) { return }   // 403 + 日志，然后退出
	s.Create(m, arg...)
	s.List(m)
}
```

成员角色对应 `model.USER_ROLE`：`visitor=0 / creator=1 / leader=2 / worker=3`（见 `gonganxitong/common.go:1180`）。

> 系统级模块（`ice.Hash`）没有 `Table` 的成员角色方法，成员级限制只能写在声明 `role` 上。

### 2.5.6 平台级字段要写两处

`model/model.go` 里**同名结构体**加字段**且** `const` 块加常量：

```go
type Plan struct {
	db.ModelContent
	db.ModelApprove
	ProjectUID string `gorm:"type:char(32);index"`
	TargetUID  string `gorm:"type:char(32);index"`
	BeginTime  db.Time
	EndTime    db.Time
	Remark     string        // ← 同名结构体加字段
}
const (
	…
	REMARK = "remark"        // ← 常量也要加
)
```

## 三、可用的既有能力（不要自己造）

| 用途 | 写法 |
|---|---|
| 增 / 改 / 删 | `s.Create(m, arg...)` `s.Modify` `s.Remove` |
| 带校验的增改删 | `s.ValueCreate / s.ValueModify / s.ValueRemove` |
| 查数据 | `msg := s.Select(m.Spawn(), arg...)` |
| 推数据 | `m.Push(k, v)` / `m.Echo(text)` |
| 表格 | `m.Table(func(value ice.Maps) { ... })` |
| 工具栏 | `m.Action(s.Create, s.What)` |
| 行内按钮 | `m.PushButton(s.What, s.Modify, s.Remove)` |
| 前端脚本 / 样式 | `m.Display(...)` / `m.DisplayCSS(...)` |
| 后续行为 | `m.Process(mdb.REFRESH)` / `_open` / `_cookie` / `_field` |

## 四、生成 → 编译 → 验证

```sh
# 1 渲染（不落盘，先给用户看）
POST /api?op=codegenRender  {template, vars}

# 2 落盘 + 编译
POST /api?op=codegenApply   {node, space, template, vars, build:true}

# 3 调新动作（路径参数形式）
POST /s/<pod>/c/<command>/action/<action>/title/<v>/content/<v>/user_uid/<uid>?user.uid=<uid>

# 4 浏览器看按钮
http://127.0.0.1:<node>/s/<pod>/c/<command>
```

验证判据：

- 动作返回 `count 1xN` 且列表里出现新行 → 写入路径通
- 浏览器里出现工具栏页签与行内按钮 → `m.Action` / `m.PushButton` 生效
- 编译 200 且 `bin/ice.bin` 更新 → 编译通

## 四点五、工具链：git 自带，go 按需下载

编译要 **Go 1.25+**，DSH 与 ContextOS 都不带 go；git 由 ContextOS 自带。

| 依赖 | 来源 |
| --- | --- |
| git | ContextOS 自带（创建带 `repos` 的空间可直接用） |
| go | 首次编译时自动装到 `<node>/usr/local/go` |
| node / python | DSH 自带 |

```js
findGo({ node })    // 节点 → 本仓库 → PATH，且 ≥ GO_MIN
ensureGo({ node })  // 缺则下载并解压到 <node>/usr/local/go
goEnv({ node, go }) // PATH / GOROOT / GOPROXY / GOWORK=off
envDoctor({ node }) // 自检 go / git / node / 空间目录
```

- 镜像顺序：`GODOWN` → aliyun → golang.google.cn → dl.google.com；文件 < 1MB 或 20s 无速度即换下一个。
- 编译前必须 `ensureGo`；失败文案要带「已试哪些镜像」，不许只报 `go build failed`。

## 五、插件的入口

工厂模式下说「给 note 加一个 what 动作」「给列表每行加按钮」，客户端走：

```
codegenAsk(text)
  → api('codegenList')          选模板
  → askPush(...)                参数表单（zone / module / Action / action / params）
  → submitAsk('codegen')
  → api('codegenApply')         写文件 + 编译
  → 回报「已写入 …，编译完成」
```

用户可以在表单里改 zone、module、动作名与参数，改完再确认。

## 六、软件工厂实现要点（createApp / autogenApp）

- `createApp`：脚手架 + 生成 CRUD + `ensureGoMod` + 本地 Go 构建；返回 `web.chat.<zone>.<name>`。
- `autogenApp`：社区 autogen + `ensureGoMod` + 补值文件 + `goTidyBuild`（`go build ... ./src`）+ 空间重启。
- **构建失败必须抛错**，不许返回 `{built:false}` 当成功。
- `value` 是 ASCII Go 标识符列表；`trans` 是中文显示列表。
- 验收用的探测空间必须删除（`deleteSpace`），不许留 `factorycheck*`/`uiprobe*`。
