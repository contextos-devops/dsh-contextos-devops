---
id: MONITOR
title: 监控看板
status: active
layer: L2
owner: code
truth: self
updated: 2026-11-14
---

# 监控看板


> 读这份当：给监控视图加面板或改数据源。
> 不读这份当 → 架构 → `ARCHITECTURE.md`
参考 Grafana / Prometheus：**面板可加，数据源可配**，内容由用户自己定。

## 一、数据源

一个面板 = 一个数据源 + 一个展示方式。数据源四种：

| 类型 | 含义 | 例子 |
|---|---|---|
| `nodes` | 节点列表（前端已有） | `{kind:'nodes'}` |
| `spaces` | 空间列表（前端已有） | `{kind:'spaces'}` |
| `op` | 插件内置 op | `{kind:'op', op:'sampleNodes'}` |
| `cmd` | **ContextOS 命令**：节点 + 空间 + 命令 + 参数 | `{kind:'cmd', node:9191, space:'', command:'runtime', action:'', params:{}}` |
| `url` | 内嵌网页（CMD_URL） | `{kind:'url', node:9191, url:'/c/admin'}` |

`cmd` 走宿主 `monitorQuery`：

```js
monitorQuery({ node, space, command, action, params })
// → { status, ms, shape:'list'|'detail'|... , columns, rows, fields, result, count }
```

- 有 `space` → `/s/<pod>/c/<cmd>`；没有 → `/c/<cmd>`；
- `params` 走 Query，`action` 决定方法（见 INTERFACE §1.4）；
- 回执是文本表格时自动解析成 `columns/rows`。

## 二、面板

```js
{ id, title, type, src, w, refresh }
```

| 字段 | 说明 |
|---|---|
| `type` | `stat` 数值 / `table` 表格 / `query` 命令单值或键值 / `iframe` 内嵌网页 |
| `w` | 宽度，1–12 栅格（12 列） |
| `refresh` | 刷新秒数，`0` = 不自动刷新 |

## 三、用 `_display` 渲染

命令可以自带前端脚本（`m.Display()`）。面板用 `iframe` + 该命令的**网页 URL** 就能直接嵌入：

```
http://127.0.0.1:9191/c/<cmd>          # 节点命令的网页形态
http://127.0.0.1:9191/s/<pod>/c/<cmd>  # 空间命令
```

浏览器 UA 拿到的是界面，非浏览器 UA 拿到的是数据（INTERFACE §2.4），所以同一个地址两种用法。

## 四、配置存在哪

`localStorage['contextos-devops-dsh:monitor-panels']`，最多 24 个面板。换机器/清缓存会丢，属于已知限制。

## 五、默认面板

| 面板 | 数据源 |
|---|---|
| 服务节点 | `nodes` |
| 项目空间 | `spaces` |
| 节点健康 | `op: sampleNodes`（存活/版本/耗时） |
| runtime | `cmd: /c/runtime` |
| 管理后台 | `url: /c/admin` |

## 六、已知缺失

- 没有历史存储（趋势是前端攒的，刷新即丢）；
- 没有告警阈值；
- 面板布局是固定 12 栅格，不能拖拽排序。
