# DSH 0.2.2 升级与七项能力集成方案

日期：2026-11-14　对象：`@local/contextos-devops-dsh` v1.45.91　DSH：`@deepseek-ai/dsh` 0.2.2-rc.3（desktop profile）

标注约定：**实测**＝本轮读过包内 README/源码或跑过命令；**推断**＝按文档语义推导，未在真机验证。

## 0. 结论先行

1. **DSH 这轮升级对我们真正的冲击只有两处**：Client UI 的菜单/浮层必须改「CSS 锚点」（v0.2.2-alpha.2），以及 macOS 自定义浮层要声明窗口拖动区域（v0.2.2-rc.1）。其余（Session.append 重载、BundleInfo.update、TerminalBackendCleanupError、schedule 工具改名、apply_patch）我们没用到，不受影响。
2. **七项能力里，DSH 原生只给了三样**：联网搜索/抓取（`ctx.web`）、工具执行管线（`ctx.tools`）、语音识别（实验 bundle，默认关）。TTS、图像识别（模型侧）、图像生成、视频生成 **DSH 都没有原生包**；但 profile 里已经装了第三方 `dsh-image-gen`，图像生成可直接复用。
3. **真正的瓶颈不在 DSH，在我们的 Copilot**：`lib/core/copilot.js:56` 的 `chatWithDSH()` 是「一次 llm 调用 + 大 system 提示词 + 让模型吐 JSON 动作」，没有工具循环、没有联网、没有多模态。把能力接进来，改的是这一层（P1），不是去改 DSH。

## 1. 事实基线（实测）

- 版本链：崩溃日志里的 `dsh-desktop 0.2.1-rc.5` → 当前 `@deepseek-ai/dsh 0.2.2-rc.3`；`docs/upgrade-guide/` 无 rc.5/rc.2/rc.3 目录 ＝ 这三个版本无破坏性变更。
- profile 已启用 bundle：`dsh-base`、`dsh-web-app`、`@local/contextos-devops-dsh`、`dshmarket`、`billion-context`、`dsh-context`、`@xmanrui/dsh-im`、**`dsh-image-gen 0.11.2`**、`dsh-preview`。
- 未启用但存在：`@deepseek-ai/dsh-experimental-voice-input-bundle`（`speech-to-text` + `sensevoice` + `api-speech-to-text` + `ui-voice-input`）、Office kit 之外的 terminal/cua/forge 等实验 bundle。
- 插件侧：`index.js:525 export const inject = ['tools', 'webServer', 'llm']`；`cordis.patch.yml` 只 insert 自己一行。
- 服务 API（包内 README）：
  - `ctx.web.search({ query, maxResults })` → `answer? + sources[]`；`ctx.web.fetch({ url })` → `finalUrl/status/body/truncated`；无 provider 抛 `WEB_PROVIDER_UNAVAILABLE`。
  - `ctx.speechToText.prepare(id, opts)` + `transcribe()`；**只有识别，没有合成**（README 原文：speech synthesis have no service methods）。
  - `ctx.tools.execute()` 接受完整原始调用批次 → **宿主侧可以直接调用任意已注册工具**（含 `generate_image`）。
- 340 个 `@deepseek-ai` 包里搜不到 TTS / 图像识别 / 视频生成包。

## 2. DSH 0.2.2 变更 → 我们的影响面

| 变更 | 影响 | 我们要做什么 |
|---|---|---|
| `css-anchored-menus`（alpha.2）：Client 浮层必须 CSS 锚点，废弃 JS 面板定位与 Menu 矩形回调 | **高**：`30-modals.js` 的 `DropSelect`、IDE 的 `crumbMenu/treeMenu/ctxMenu` 全是 `fixed + clientX/clientY` | P0 改成锚点定位（`anchor-name`/`position-anchor` 或 popover + 相对定位）；顺带消灭「下拉被裁剪」这类老 bug |
| `window-drag-regions`（rc.1） | **中**：插件若画到标题栏区域，macOS 会拖不动窗口 | P0 检查是否有 `-webkit-app-region` 缺失；需要时给顶栏声明 `drag`、给按钮声明 `no-drag` |
| DeepSeek Search/Fetch 按能力计费、凭据来源变化 | **中**：接入搜索后会产生费用 | P1 做开关 + 每日预算 + 结果缓存（1h） |
| `fs-observation-policy` 默认关 + `apply_patch` | **无**：我们的文件读写走自己的 HTTP API，不走 DSH 工具 | 不改 |
| `schedule` 工具改名、`dsh-doc` 取代 Creator 四 skill | **无** | 不改 |
| `Session.append` 重载、`BundleInfo.update`、`TerminalBackendCleanupError`、subagent interrupt 默认值 | **无**：这三个 API 我们都没调用 | 不改，升级时无需回归 |
| Office kit 取代 office-to-pdf | **潜在可用**：想做「生成报表/PPT」时可直接调 office 工具 | 记入 P2 备选 |

## 3. 插件升级方案（按代价排序）

### P0 兼容与卫生（0.5–1 人日，低风险）

1. **菜单锚点化**：`src/client/parts/30-modals.js:1 DropSelect` 与 `20-devworkspace.js` 的 `crumbMenu/treeMenu/ctxMenu` 改为锚点定位；统一到一个 `Menu` 原语，删除 `getBoundingClientRect + fixed` 分支。
2. **窗口拖动区域**：客户端顶栏 `.cx-topbar` 加 `-webkit-app-region: drag`，其中按钮/输入加 `no-drag`；确认不遮挡 DSH 自带标题栏拖动条。
3. **版本与兼容声明**：`package.json` 里补 `dsh` 兼容范围（建议 `>=0.2.2 <0.3`），避免装到旧运行时。
4. **新增 gate**：`scripts/ui-check.mjs` 增加一条「菜单不得使用 `position:fixed` + 行内 left/top」的静态检查，把这次踩的坑固化成门禁。

### P1 能力接线（2–3 人日，中风险，收益最大）

5. **Copilot 三段式**（改 `lib/core/copilot.js:56 chatWithDSH`）：
   - 第 1 段「判意图」：沿用现在的 JSON 输出，增加 `need: ['web','image','tool']` 字段；
   - 第 2 段「取料」：`need.web` → `ctx.web.search/fetch`；`need.image` → `ctx.tools.execute([{name:'generate_image', args}])`；`need.tool` → 调本插件已注册的 `contextos_*` 工具；
   - 第 3 段「总结」：把取料结果（含来源 URL、图片路径）作为 `tool` 消息回灌给模型，输出最终 reply。
   - 这样不需要重写 agent loop，最多 3 次 llm 调用，行为和现在的「JSON 动作」完全兼容。
6. **联网搜索落 UI**：回答里渲染 `sources[]` 链接 + 「抓取正文」按钮（`ctx.web.fetch`）；请求日志里记录 `web: {query, ms, sources}`。
7. **图像生成落 UI**：聊天里出图 → 存到空间 `var/gen/`，消息里内联缩略图 + 「打开/下载」；复用 `dsh-image-gen` 已配好的 provider（当前是 google）。
8. **`inject` 扩展**：`index.js:525` 改 `inject: { required: ['tools','webServer','llm'], optional: ['web','speechToText'] }`，服务缺失时降级而不是崩。

### P2 语音与多模态（3–5 人日，中高风险，需你拍板）

9. **语音识别**：启用 `@deepseek-ai/dsh-experimental-voice-input-bundle`（本地 SenseVoice，首次下载模型；或改用 `api-speech-to-text` 云端转写）。UI 侧 composer 加麦克风按钮（MediaRecorder）→ `ctx.speechToText` → 回填草稿。
10. **语音合成**：DSH 无服务。**推荐先做本机 `say`**（macOS 自带、零依赖、免费），命令走已有的 `sysControl`；云端 TTS（OpenAI/Gemini/ElevenLabs）放 P3，需要 API key 与按字符计费。
11. **图像识别**：取决于路由是否 image-capable。`deepseek-flash` 当前是否支持视觉**未验证**；若否，需切到支持视觉的 provider（Gemini/OpenAI）或接 MCP vision。插件侧要做「能力探测 + 明确提示」，绝不能把占位符当识别结果。
12. **视频生成**：DSH 无包。只做「提交任务 → 轮询 → 展示」薄客户端，接可灵/Runway/Veo 的 MCP 或 REST；按秒计费，建议做成显式确认再花钱。

## 4. 七项能力矩阵

| 能力 | 现状 | DSH 原生 | 推荐实现 | 工作量 | 钱 |
|---|---|---|---|---|---|
| 联网搜索 | 无 | ✅ `ctx.web` | 插件内直接调，结果回灌 | 0.5 人日 | 按次计费，需开关+缓存 |
| 工具调用 | 仅「JSON 动作白名单」 | ✅ `ctx.tools` + agent loop | 三段式取料（P1-5） | 1–1.5 人日 | 仅 token |
| 语音识别 | 无 | ✅ 实验 bundle（默认关） | 启用 bundle + 录音按钮 | 1–2 人日 | 本地免费 / 云端按分钟 |
| 语音合成 | 无 | ❌ 无 | 本机 `say`；云端 TTS 后置 | 0.5 人日（say） | 免费 / 云端按字符 |
| 图片识别 | 无 | ⚠️ 取决于模型 | 附件 + vision 路由（需先验证） | 0.5 人日接线 | 按图 |
| 图片生成 | 无（插件内） | ✅ 已装 `dsh-image-gen` | `ctx.tools.execute('generate_image')` | 0.5–1 人日 | 按张（provider 计费） |
| 视频生成 | 无 | ❌ 无 | MCP/外部 API 薄封装 | 2–4 人日 | 按秒，贵 |

## 5. 实施顺序与验收（每条都可判定）

| 步 | 内容 | 验收句 |
|---|---|---|
| 1 | 搜索接线 | 问「今天深圳天气」，回答带 ≥1 个可点击来源，且 `web.fetch` 返回 200 |
| 2 | 图像生成 | 说「画一只赛博猫」，消息里出现图片且文件存在于 `var/gen/` |
| 3 | 菜单锚点 | 窗口缩到 800×600，三个下拉全部完整可见、无裁剪（截图比对） |
| 4 | ASR | 录 3 秒中文，草稿出现对应文字，识别耗时 < 3s（本地） |
| 5 | TTS | 点「朗读」，`say` 出声且可中断 |
| 6 | vision | 传一张含文字的截图，回答能复述其中文字（路由不支持则明确报错） |
| 7 | 视频 | 提交任务后能轮询到结果并内联播放（或明确失败原因） |

通用门禁：`npm run build:client`（gate + ui-check + i18n + context + hook-order）全绿；`verify:ui` 出截图；真机 `clientCheck` 回报版本号与能力开关状态。

## 6. 成本与风险

- **搜索**：DeepSeek Search 按能力计费，价格以官网为准（未实测）；风险是「每次都搜」烧钱 → 默认关、命中关键词才开、结果缓存 1h。
- **ASR**：SenseVoice 首次下载模型（数百 MB 量级，未实测），需你同意；不下载则只能走云端转写。
- **vision**：最大风险是「模型不支持视觉但插件以为支持」→ 必须做 capability 探测，失败要报错而不是编。
- **视频**：单价最高、延迟最长，做成显式二次确认。
- **兼容**：0.2.2 的菜单锚点改造会影响所有自绘浮层，改完必须全量回归（下拉/右键/树菜单/面包屑/控制台筛选）。

## 7. 待拍板

1. ASR 走**本地 SenseVoice**（免费、要下模型）还是**云端转写**（要 key、按分钟）？
2. 图像识别是否允许**切换/新增一个 vision provider**（会影响默认模型选择）？
3. 视频生成这轮做不做？做的话选哪家（可灵 / Runway / Veo / 其他）？

> 附：本机 `git push` 到 `https://shylinux.com/x/contextos-devops-dsh` 一直认证失败（凭据只覆盖 2024/2025 系域名），本地提交需你手动推送。
