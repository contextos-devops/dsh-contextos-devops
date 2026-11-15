> 读这份当：要把插件发给别人用（仓库安装 / npm / 私有索引 / 上架 DSH 插件市场）。
> 不读这份当：只想在本机开发 → 见 `AGENTS.md` §〇；只想知道功能 → 见 `README.md`。

# 对外发布与上架插件市场

插件市场（DSH「插件 → 发现」）不托管代码，它读的是精选列表
[`awesome-dsh-plugin`](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin) 生成的
`https://awesome-dsh-plugin.com/plugins.json`。所以「上架」＝**往那个仓库提一个 YAML 文件的 PR**。

## 1. 三条路径先选一条

| | 怎么做 | 用户怎么装 | 成本 | 适合 |
|---|---|---|---|---|
| **A 源码**（最快） | 仓库已满足安装条件，直接提教学 PR | `dsh plugin --profile desktop add github:shylinux/contextos-devops-dsh` | 0 依赖，安装时要拉仓库 | 先上架、先被看见 |
| **B npm**（体验最好） | 改名 → `npm publish` → 条目加 `npm:` | `dsh plugin --profile desktop add dsh-contextos-devops` | 一次改名 + 一次发布 | 正式对外 |
| **C 私有索引** | 自建 `index.json`，用户加索引源 | 界面「索引源」填 URL | 要一台静态服务器 | 企业内网、不上市场 |

A 和 B 不冲突：**先 A 上架，再 B 提速**。

## 2. 路径 A：GitHub 源码安装 + 上架

### 2.1 仓库必须满足（缺一条会被 CI 打回）

| 要求 | 我们的状态 | 检查命令 |
|---|---|---|
| `package.json` 声明 `dsh.bundle.patch` | ✅ `./cordis.patch.yml` | `node scripts/publish-check.mjs` |
| 该 patch 文件存在且有 `insert.id` | ✅ | 同上 |
| 构建产物入库（`client.js`、`assets/client.css`） | ✅（源码安装不跑构建） | `git ls-files client.js` |
| 仓库满 1 天 | ✅ 2026-11-06 | `git log --reverse --format=%ad \| head -1` |
| 位图图标（png/jpg/webp，约 96–180px） | ✅ `assets/icon-180.png` | `sips -g pixelWidth assets/icon-180.png` |
| 仓库加 `dsh-plugin` topic | ⬜ 在 GitHub 仓库页 Settings → Topics | 网页操作 |
| 描述属实、数字对得上代码 | ✅ 见 `README.md` 能力矩阵 | 人工 |

自己先跑一遍：`npm run check:publish`（有 FAIL 就别提 PR）。

### 2.2 提 PR

```sh
# 1) fork awesome-dsh-plugin，克隆下来
# 2) 复制现成条目（本仓库已准备好）
cp <本仓库>/release/catalog-entry.yml data/plugins/shylinux__contextos-devops-dsh.yml
# 3) 只加这一个文件，一个 PR 不超过 3 个条目
git checkout -b add-contextos-devops-dsh && git add data/plugins/shylinux__contextos-devops-dsh.yml
git commit -m "Add shylinux/contextos-devops-dsh" && git push
```

CI 依次检查：条目数量 → `dsh.bundle` → 仓库年龄 → awesome-lint 与站点构建。
人工评审会真的读仓库；若被打上 `held: author`，**在同一个分支改完再推 + 留一条评论**即可，不要新开 PR。
合并后站点与市场列表最长约 1 小时刷新一次（客户端每次实时请求，不缓存旧列表）。

### 2.3 用户安装（A 路径的最终形态）

```sh
dsh plugin --profile desktop add github:shylinux/contextos-devops-dsh
# 装了新版后重载：plugin_manager set_plugin include:contextos-devops-dsh
```

## 3. 路径 B：发 npm（推荐作为正式版）

npm 上 `dsh-contextos-devops` 与 `contextos-devops-dsh` 都空闲。发布前做三件事：

```sh
# 1) 改名 + 去掉 private（同步 cordis.patch.yml 里的 name）
python3 - <<'PY'
import json;p='package.json';d=json.load(open(p))
d['name']='dsh-contextos-devops';d.pop('private',None)
json.dump(d,open(p,'w'),indent=2,ensure_ascii=False);open(p,'a').write('\n')
PY
sed -i '' "s#name: '@local/contextos-devops-dsh'#name: 'dsh-contextos-devops'#" cordis.patch.yml

# 2) 全量门禁 + 发布检查
npm run build:client && npm run check:publish

# 3) 发布（--access public 只对 scoped 包需要；无 scope 可省）
npm login && npm publish
```

发布后把 `release/catalog-entry.yml` 里的 `npm:` 行取消注释，再提一个 PR 更新条目。

**注意 semver 预发布坑**：给 `@deepseek-ai/*` 写 peerDependencies 时范围必须显式带预发布分支
（如 `>=0.2.2-rc.1 <1.0.0`），否则 `0.2.2-rc.3` 这类版本会被静默排除。我们目前不直接依赖
任何 `@deepseek-ai/*` 包（只用 `ctx` 注入），所以只需 `engines.dsh`。

## 4. 路径 C：自建索引（内网 / 私有）

`index.json` 最小形状：

```json
{ "version": 1, "plugins": [
  { "name": "contextos-devops-dsh", "spec": "github:shylinux/contextos-devops-dsh",
    "description": "ContextOS DevOps for DSH", "version": "1.48.23" } ] }
```

用户加索引源：插件 → 发现 → 索引源 → 填 URL；或设 `DSHM_REGISTRY_URL=<你的地址>` 让客户端整体改源。
适合内网镜像：把 `plugins.json` 与 tarball 都放内网静态服务器。

## 5. 每次发版的固定动作

```sh
npm version patch --no-git-tag-version   # 或 minor
npm run build:client                      # 11 道门禁 + 产物
npm run check:publish                     # 发布就绪
git add -A && git commit -m "release: vX.Y.Z" && npm run push:all
# A 路径：无需额外动作（市场读 GitHub）；B 路径：npm publish + GitHub Release 上传 tarball
```

**tarball 命名**：用 GitHub Release 的 `latest/download/<固定名>.tgz`，文件名里**不能带版本号**，
否则下次发版链接 404（这是市场文档点名的高频错误）。

## 6. 常见被拒原因（按出现频率）

| 症状 | 原因 | 修法 |
|---|---|---|
| CI 直接红 | 只声明了 `dsh.client`，没有 `dsh.bundle.patch` | 补 `dsh.bundle` |
| CI 红 | 仓库不满 1 天 | 等一天再提 |
| CI 红 | 条目字段拼错 / 描述含 `: ` 没加引号 | 用 `release/catalog-entry.yml` |
| 人工打回 | 描述里的数字、接口名与代码对不上 | 只写能验证的事实 |
| 图标不显示 | 用了 SVG 或非 GitHub 托管链接 | 用 `raw.githubusercontent.com/...png` |
| 装完白屏 | 构建产物没入库、源码安装拿不到 `client.js` | 提交构建产物（我们已入库） |
| 用户装不上 | `allowBuilds` 未授权（源码安装要跑 postinstall） | 发 npm 版即可规避 |

## 7. 我方现状（2026-11-15）

- ✅ LICENSE（MIT）、`assets/icon-180.png`、`engines.dsh`、`keywords`、`repository`、`dsh.bundle.patch`、产物入库、仓库 9 天
- ✅ `scripts/publish-check.mjs`（8 PASS / 2 WARN：`private:true`、`@local` 包名——发 npm 时才需要改）
- ✅ `release/catalog-entry.yml` 可直接复制进教学仓库
- ⬜ GitHub 仓库加 topic `dsh-plugin`（网页操作，一次性）
- ⬜ 决定是否改名发 npm（需你拍板：要不要发布 `dsh-contextos-devops`）
