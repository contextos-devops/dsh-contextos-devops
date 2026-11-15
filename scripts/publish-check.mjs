// 发布就绪检查：把「上架插件市场」的要求变成断言。
//
// 三层要求（来源：awesome-dsh-plugin/contributing.md + dshmarket README）：
//   1. 可安装：package.json 声明 dsh.bundle.patch，且 patch 文件真实存在、有 insert.id
//   2. 可收录：真实代码、仓库 ≥1 天、description 属实、icon 是 GitHub 托管的位图
//   3. 可发布：LICENSE、README、engines.dsh、keywords、repository、无密钥
//
// 用法：node scripts/publish-check.mjs [--json]
// 退出码：0 = 无 FAIL（可能有 WARN）；1 = 有 FAIL。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const json = process.argv.includes('--json');
const fails = [];
const warns = [];
const oks = [];

const fail = (m) => fails.push(m);
const warn = (m) => warns.push(m);
const ok = (m) => oks.push(m);
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
const exists = (f) => fs.existsSync(path.join(root, f));

const pkg = JSON.parse(read('package.json'));

// ── 1. 可安装：dsh.bundle 是市场判定的第一条硬门槛（只声明 dsh.client 会被拒）
const patchRel = pkg.dsh?.bundle?.patch;
if (!patchRel) {
  fail('manifest 缺 dsh.bundle.patch —— 只声明 dsh.client 无法用 dsh plugin add 安装（最常见被拒原因）');
} else if (!exists(patchRel)) {
  fail(`dsh.bundle.patch 指向 ${patchRel}，但文件不存在`);
} else {
  const patch = read(patchRel);
  const id = (patch.match(/^\s*-\s*id:\s*(\S+)/m) || [])[1];
  if (!id) fail(`${patchRel} 里没有 insert.id`);
  else if (!patch.includes(`name:`) && !patch.includes('name:')) warn(`${patchRel} 的条目没有 name 字段`);
  else ok(`dsh.bundle → ${patchRel}（insert.id=${id}）`);
}

// ── 2. 产物必须入库（源码安装时用户直接拿仓库，不跑构建）
for (const f of ['index.js', 'client.js', 'assets/client.css']) {
  if (!exists(f)) fail(`缺构建产物 ${f}（源码安装会白屏；先 npm run build:client 再提交）`);
}
if (exists('client.js') && fs.statSync(path.join(root, 'client.js')).size < 50_000) {
  fail('client.js 小于 50KB，疑似没构建完整');
}
const ignore = exists('.gitignore') ? read('.gitignore') : '';
for (const f of ['client.js', 'assets/']) {
  if (ignore.split('\n').some((l) => l.trim() === f || l.trim() === f.replace(/\/$/, ''))) {
    fail(`${f} 被 .gitignore 忽略 —— 市场从源码安装时拿不到构建产物`);
  }
}
if (!fails.length) ok('构建产物 index.js / client.js / assets/client.css 均已入库');

// ── 3. 可收录：仓库年龄（≥1 天）、icon 位图、README、LICENSE
const firstCommit = (() => {
  try {
    return execSync('git log --reverse --format=%ct | head -1', { cwd: root, encoding: 'utf8' }).trim();
  } catch {
    return '';
  }
})();
if (!firstCommit) warn('读不到 git 历史，无法核对「仓库 ≥1 天」');
else {
  const days = (Date.now() / 1000 - Number(firstCommit)) / 86400;
  if (days < 1) fail(`仓库只有 ${days.toFixed(1)} 天，市场要求 ≥1 天`);
  else ok(`仓库年龄 ${days.toFixed(0)} 天（≥1 天）`);
}

const raster = ['assets/icon-180.png', 'assets/icon.png', 'icon.png'].find(exists);
if (!raster) fail('缺位图图标（市场只接受 png/jpg/webp，SVG 会被拒）');
else {
  const size = fs.statSync(path.join(root, raster)).size;
  if (size > 512 * 1024) warn(`${raster} 有 ${(size / 1024).toFixed(0)}KB，建议 <200KB`);
  else ok(`图标 ${raster}（${(size / 1024).toFixed(0)}KB，位图）`);
}

for (const f of ['README.md', 'LICENSE']) {
  if (!exists(f)) fail(`缺 ${f}（收录与 npm 发布都要）`);
}
if (exists('README.md')) {
  const md = read('README.md');
  if (!/##\s*(安装|快速开始|Quick|Install)/i.test(md)) warn('README 没有安装/快速开始一节，安装路径不明显');
  else ok('README 有安装一节');
}

// ── 4. 可发布：npm 侧的元数据（源码安装不要求，但发布 npm 必须）
if (pkg.private === true) warn('package.json 有 private:true —— 发 npm 时由 scripts/publish-npm.mjs 在临时目录删掉（不影响本机 link 安装）');
if (String(pkg.name || '').startsWith('@local/')) {
  warn(`包名 ${pkg.name} 是本地名；发 npm 时 publish-npm.mjs 会改名为 dsh-contextos-devops 并同步 cordis.patch.yml（npm 上已查为空闲）`);
}
if (!pkg.engines?.dsh) fail('缺 engines.dsh —— 市场用它判断「这个插件能不能装进当前宿主」');
else ok(`engines.dsh = ${pkg.engines.dsh}`);
if (!pkg.license) fail('缺 license 字段');
if (!pkg.repository?.url?.includes('github.com')) fail('repository.url 必须指向 GitHub（市场只从 GitHub 读清单）');
if (!pkg.description || pkg.description.length < 40) warn('description 太短，市场卡片只有一句话的空间');

// ── 5. 无密钥（P0）
const SECRET = [/\bsk-[A-Za-z0-9]{20,}/, /\bghp_[A-Za-z0-9]{20,}/, /\bAKIA[0-9A-Z]{16}\b/, /-----BEGIN [A-Z ]*PRIVATE KEY-----/];
const walk = (dir, out = []) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.git', 'vendor', 'assets', 'dist'].includes(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(js|mjs|json|ya?ml|md|sh|ts)$/.test(e.name) && fs.statSync(p).size < 2_000_000) out.push(p);
  }
  return out;
};
const hits = walk(root).filter((p) => {
  const t = fs.readFileSync(p, 'utf8');
  return SECRET.some((re) => re.test(t));
});
if (hits.length) fail(`疑似密钥：${hits.map((p) => path.relative(root, p)).join(', ')}`);
else ok('未发现密钥形状');

// ── 6. 打包体积（npm pack 预览，太大时市场安装体验差）
try {
  const out = execSync('npm pack --dry-run --json 2>/dev/null', { cwd: root, encoding: 'utf8' });
  const info = JSON.parse(out)[0];
  const mb = info.size / 1048576;
  if (mb > 5) warn(`tarball ${mb.toFixed(1)}MB，超过 5MB 会影响安装速度（可外置 vendor/）`);
  else ok(`tarball ${mb.toFixed(2)}MB / ${info.files.length} 个文件`);
} catch {
  warn('npm pack 预览失败（跳过体积检查）');
}

// ── 输出
const rows = [
  ...fails.map((m) => ['FAIL', m]),
  ...warns.map((m) => ['WARN', m]),
  ...oks.map((m) => ['PASS', m]),
];
if (json) console.log(JSON.stringify({ pass: oks, warn: warns, fail: fails }, null, 2));
else {
  for (const [k, m] of rows) console.log(`${k}  ${m}`);
  console.log(`\npublish-check: ${oks.length} passed · ${warns.length} warn · ${fails.length} failed`);
}
process.exit(fails.length ? 1 : 0);
