# lib/core · 核心业务逻辑

引用方向：`core → base → misc`（core、base 可引用 misc；misc 不引用任何内部模块）。

| 文件 | 职责 |
|---|---|
| `nodes.js` | 节点：部署/启停/打开/终端/删除/官方空间/容器与远程部署/流水线 |
| `spaces.js` | 空间：创建/启动/停止/编译/初始化/官方空间/路径 |
| `apps.js` | 应用：列表/生成/代码/实例/商店/最近应用 |
| `files.js` | 文件：列目录/读写/树/新建/改名/删除/git 状态 |
| `data.js` | 数据：读/写/删（回读校验） |
| `users.js` | 用户：每节点 `dsh_copilot_<port>`，uid 持久化 |
| `project.js` | 项目管理：target/plan/task/report/feedback |
| `avatar.js` | 数字分身/背景/用户媒体 |
| `copilot.js` | AI Copilot：模型解析/对话/动作提取/目标拆解 |
| `device.js` | 周边设备发现（节点/WiFi/蓝牙/局域网） |
| `terminal.js` | 内嵌终端（WebSocket + PTY） |
