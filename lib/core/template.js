// 代码生成模板：唯一真源（apps.js 的 createApp 与 codegen.js 的「新建功能」都从这里取）。
// 模板只描述「一个最薄的 ContextOS 模块」——ice.Hash 提供 CRUD，三个 tag 提供字段/参数/列表。
export function moduleSource({ zone = 'devops', name = 'demo', command = 'web.chat' } = {}) {
  const type = String(name).replace(/[^a-zA-Z0-9_]/g, '') || 'demo';
  return `package ${zone}

import "shylinux.com/x/ice"

type ${type} struct {
\tice.Hash
\tshort  string \`data:"index,title"\`
\tfield  string \`data:"time,index,title,content,user_uid"\`
\tcreate string \`name:"create title* content* user_uid"\`
\tlist   string \`name:"list index auto"\`
}

func init() { ice.Cmd("${command}.${zone}.${type}", ${type}{}) }
`;
}
