# 表单取值规范（强制）

> 所有表单参数，取值范围与提交值都必须以后台为准。

## 规则

1. **取值范围来自后台**：任何枚举/下拉字段，先调
   `fieldOptions({ node, space, command, field })`，拿 `options`。
2. **提交 `value`，不提交 `name` / `label`**：
   后台返回 `{ value, name, label }` 时，`value` 才是可写值（常见是数字 `"0"/"1"`）；
   `name`（如 `canFinish`）和 `label`（如 `可完成`）仅用于显示。
3. **显示用 label**：UI 展示 `label`（缺省回退 `name`），不把显示值发回去。
4. **存量数据要归一**：编辑旧记录时，把已存值按 `value/name/label` 三种形态匹配到 `value` 再提交。
5. **默认值也取自选项**：默认 = `options[0].value`，不要硬编码英文名。

## 实现

宿主统一入口：`lib/core/project.js → optionValue({ node, space, command, field, raw })`

```js
// canFinish → "0"，可完成 → "0"，"1" → "1"
await optionValue({ node, space, command: 'web.team.xiangmuguanli.feedback', field: 'feedback_status', raw: 'canFinish' });
```

内部带缓存（同一 node+space+command+field 只查一次）；查不到时原样返回，不阻塞提交。

客户端表单（`PMModal`）同样遵守：`<option value>` 用 `o.value`，提交前 `norm()` 归一。

## 已接入

| 位置 | 字段 |
|---|---|
| `pmCreateItem` | report_type、feedback_status、score |
| `pmModifyItem` | 同上 |
| `PMModal`（客户端） | report_type、feedback_status、score |

新增枚举字段时，必须同时：接入 `optionValue`、用 `o.value` 渲染 option、补测试用例。
