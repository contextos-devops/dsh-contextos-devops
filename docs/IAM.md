---
id: IAM
title: 用户 / 会话 / 权限模型
status: active
layer: L2
owner: code
truth: self
updated: 2026-11-14
---

# 用户 / 会话 / 权限


> 读这份当：涉及用户身份、sessid、角色与权限。
> 不读这份当 → 接口形状 → `INTERFACE.md`
> 三层身份，三类对象。任何地方**不许**自己发明第四种。

## 一、三层

| 层 | 用户 | 会话 | 权限 |
|---|---|---|---|
| **系统级**（节点自身） | `aaa.user` | `aaa.sess` | `aaa.role` |
| **平台级**（云社区） | `web.team.gonganxitong.user` | `web.team.gonganxitong.sess` | 由平台分配给应用实例 |
| **应用级**（每个实例） | — | 复用平台会话 | 成员 `web.team.<mod>.member`<br>申请 `web.team.<mod>.apply`<br>审批 `web.team.<mod>.allow` |

- 系统级：节点管理员，管节点本身与系统能力。
- 平台级：普通用户，`gonganxitong.sess` 能解析出 `user.uid`；OAuth 最终都落到这里。
- 应用级：每个实例**自己的**成员与角色；加入要申请（apply），由审批（allow）通过。

## 二、凭证

| 凭证 | 创建 | 身份 |
|---|---|---|
| 工具令牌 | `PUT /c/web.token/action/create`（可简写 `/c/token`） | 工具 / 节点 |
| 管理员会话 | `PUT /c/aaa.sess/action/create/<username>` | 系统管理员 |
| 用户会话 | `PUT /s/<space>/c/web.team.gonganxitong.sess/action/create/user_uid/<uid>` | 普通用户 |

详见 `docs/URL-SPEC.md` §八。

## 三、代码入口

```js
// lib/core/iam.js
iamCommand({ level, kind, mod })     // 命令名：aaa.user / web.team.gonganxitong.user / web.team.<mod>.member
iamList({ node, level, kind, space, mod, uid })   // → { columns, rows, url, empty }
iamCall({ node, level, kind, space, mod, action, args, fields, uid })
iamEndpoints({ node, space, mod })   // 管理矩阵：三层入口 URL 列表
```

op：

```
iamList       {node, level:'system'|'platform'|'instance', kind:'user'|'sess'|'role'|'member'|'apply'|'allow', space?, mod?, uid?}
iamCall       {…, action:'create'|'modify'|'remove'|'allow'|'apply', args:[…] 或 fields:{…}}
iamEndpoints  {node, space, mod}
```

## 四、两种参数风格（实测）

| 层 | 风格 | 例子 |
|---|---|---|
| 系统级 | **位置参数** | `PUT /c/aaa.role/action/create/probe_pos` → 新建角色 `probe_pos` |
| 平台 / 应用级 | **k/v 段** | `PUT /s/<space>/c/web.team.gonganxitong.sess/action/create/user_uid/<uid>` |

系统级用 `?name=xxx` 查询串**不生效**（实测），必须位置参数；`iamCall` 的 `args` 与 `fields` 分别对应这两种风格。

## 五、列表格式

| 层 | 格式 | 解析 |
|---|---|---|
| 系统级 | 等宽文本表（`time userrole username …`） | `lib/base/texttable.js parseTextTable` |
| 平台 / 应用级 | JSON 信封（`append` 列名 + 同名数组） | `envelopeRows` |

实测：

```
system user  4 行：time,userrole,username,usernick,language,avatar,background,userzone
system role  2 行：time,name            → tech, void
system sess  3 行：time,hash,userrole,username,usernick,…
platform user：count 0x0（本机 root 视角下需要实例上下文才返回行）
```

## 六、待补

- 客户端还没有「用户 / 会话 / 权限」面板：现在只有 `iamList` / `iamCall` / `iamEndpoints` 三个 op 可用。
- 应用级 member/apply/allow 需要实例上下文（`system_uid` 之类的 place 条件），当前返回 `count 0x0`，接 UI 时要把实例 uid 一起带上。

## 七、主体（五种，平台内固定）

| 主体 | 命令 | 说明 |
|---|---|---|
| 平台 | `web.team.gonganxitong.place` | 平台自身（根） |
| 城市 | `web.team.gonganxitong.city` | 行政区 |
| 公司/组织 | `web.team.gonganxitong.street` | 公司、街道、学校、医院等组织 |
| 服务 | `web.team.gonganxitong.service` | 应用实例 |
| 个人 | `web.team.gonganxitong.user` | 自然人 |

每个应用实例创建时，自动挂到对应主体之下。

实测（9191 / 20240724-community）：五条命令全部存在；`web.team.gonganxitong.zzz` 不存在——**判断命令是否存在要看回执里有没有 `index/help/list/meta`**，不存在的命令只回回声信封（`count 0x0`）。

## 七点五、命令短名

ice 的系统命令注册了短名，长名与短名等价：

| 长名 | 短名 |
|---|---|
| `aaa.user` | `user` |
| `aaa.sess` | `sess` |
| `aaa.role` | `role` |
| `web.token` | `token` |

`lib/core/iam.js` 的 `IAM.system` 用短名，`lib/core/auth.js` 用 `web.token`（`token` 作兜底）。

实测：`/c/user`、`/c/sess`、`/c/role` 均返回表；`/c/web.token/action/create` 与 `/c/token/action/create` 都返回 token。

## 八、认证链

```
个人：  身份证 + 手机号                         → 个人实名认证
企业：  营业执照 + 法人实名                       → 企业认证
服务：  认证企业 → 向发起认证的服务授权「认证标识」
归属：  认证后的个人 / 企业 → 下挂到城市名下
政府：  后续开放接口，按城市管理个人与企业
```

现状（源码确认 + 实测）：

- 源码：`usr/icebergs/base/aaa/aaa.go` 的 `ice.Index.Register(Index, nil, APPLY, OFFER, EMAIL, USER, TOTP, SESS, ROLE, CERT, RSA)`，常量有 `RSA/SIGN/CERT/VERIFY/BASE64`——认证能力是 **aaa 的上下文**，不是表命令。
- 实测：当前节点（9191）`/c/cert`、`/c/aaa.cert` 都返回 `warn: not found index`，说明这个内核还没把 `cert` 暴露成可调用命令。
- 平台侧：`web.team.gonganxitong.cert` 也不存在（只回回声信封，`count 0x0`）。

因此认证流程要等 `aaa.cert` 在当前内核可用后再接；现在只能接**主体归属**（个人/企业挂城市）。

## 九、资金闭环

```
认证 → 资金账户 → 下单（任何应用、任何功能） → 订单 → 支付 → 账单
```

| 环节 | 命令 | 现状 |
|---|---|---|
| 经费 | `web.team.gonganxitong.fund` | ✅ 存在（租户级） |
| 广场 | `web.team.gonganxitong.market` | ✅ 存在 |
| 服务名片 | `web.team.gonganxitong.credit` | ✅ 存在 |
| 订单 | `web.team.gonganxitong.order` | ❌ 尚未实现 |
| 账单 | `web.team.gonganxitong.bill` | ❌ 尚未实现 |
| 资金账户 | `web.team.gonganxitong.account` | ❌ 尚未实现 |

代码里已把这三类登记为 `FUND` 常量（`ready` 标记），`iamSubjects` op 会逐个回查真实存在性，避免把「规划」当成「已有」。
