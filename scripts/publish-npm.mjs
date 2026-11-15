// 把当前仓库打成一个可发布的 npm 包，而不改本机 dev 安装的包名。
//
// 为什么需要这一步：本机 profile 用 `link:` 把仓库装成 `dsh-contextos-devops`，
// 直接改 package.json 的 name 会让本地插件解析失败。所以发布时在**临时目录**里改名：
//   package.json → name=<--name>、删 private
//   cordis.patch.yml → insert.name=<--name>
// 然后把改名后的包重新打包，交给 npm publish。
//
// 用法：
//   node scripts/publish-npm.mjs                     # 只打包，打印下一步命令（默认）
//   node scripts/publish-npm.mjs --name xyz          # 换发布名
//   node scripts/publish-npm.mjs --publish           # 真的发（需要先 npm login）
//   node scripts/publish-npm.mjs --keep              # 保留临时目录便于检查
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const arg = (k, d) => {
  const i = argv.indexOf(k);
  return i >= 0 ? argv[i + 1] : d;
};
const PUBLISH = argv.includes('--publish');
const KEEP = argv.includes('--keep');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const target = arg('--name', 'dsh-contextos-devops');
const version = pkg.version;

const run = (cmd, cwd) => execSync(cmd, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();

console.log(`[publish-npm] 仓库包名 ${pkg.name} · 版本 ${version} → 发布名 ${target}`);

// 1. 打原始包（走 .npmignore / files 规则，和最终包内容一致）
const stage = fs.mkdtempSync(path.join(os.tmpdir(), 'cx-publish-'));
const srcTgz = path.join(stage, 'src.tgz');
run(`npm pack --silent --pack-destination ${JSON.stringify(stage)}`, root);
const packed = fs.readdirSync(stage).find((f) => f.endsWith('.tgz'));
if (!packed) {
  console.error('FAIL  打包失败：npm pack 没有产出 tgz');
  process.exit(1);
}
fs.renameSync(path.join(stage, packed), srcTgz);

// 2. 解包并改写身份
const work = path.join(stage, 'pkg');
fs.mkdirSync(work);
run(`tar -xzf ${JSON.stringify(srcTgz)} -C ${JSON.stringify(work)}`, stage);
const pkgDir = path.join(work, 'package');

const pubPkg = JSON.parse(fs.readFileSync(path.join(pkgDir, 'package.json'), 'utf8'));
pubPkg.name = target;
delete pubPkg.private;
pubPkg.version = version;
fs.writeFileSync(path.join(pkgDir, 'package.json'), JSON.stringify(pubPkg, null, 2) + '\n');

const patchPath = path.join(pkgDir, 'cordis.patch.yml');
if (fs.existsSync(patchPath)) {
  const before = fs.readFileSync(patchPath, 'utf8');
  fs.writeFileSync(patchPath, before.replace(/name:\s*'[^']+'/, `name: '${target}'`));
}

// 3. 自检：新包里 name / patch 必须一致，且不含 private
const check = JSON.parse(fs.readFileSync(path.join(pkgDir, 'package.json'), 'utf8'));
const patchAfter = fs.readFileSync(patchPath, 'utf8');
const problems = [];
if (check.name !== target) problems.push(`name=${check.name} ≠ ${target}`);
if (check.private) problems.push('private 仍在');
if (!patchAfter.includes(`name: '${target}'`)) problems.push('cordis.patch.yml 的 insert.name 没改成新包名');
for (const f of ['index.js', 'client.js', 'assets/client.css']) {
  if (!fs.existsSync(path.join(pkgDir, f))) problems.push(`缺产物 ${f}`);
}
if (problems.length) {
  console.error('FAIL  发布包自检未通过：\n  - ' + problems.join('\n  - '));
  process.exit(1);
}
console.log('PASS  发布包自检：name / patch / 产物 一致，private 已移除');

// 4. 重新打包
const outTgz = path.join(root, `${target}-${version}.tgz`);
run(`npm pack --silent --pack-destination ${JSON.stringify(root)}`, pkgDir);
const built = fs.readdirSync(root).find((f) => f === `${target}-${version}.tgz`);
if (!built) {
  console.error('FAIL  重新打包失败');
  process.exit(1);
}
const mb = (fs.statSync(outTgz).size / 1048576).toFixed(2);
console.log(`PASS  产出 ${outTgz}（${mb}MB）`);

if (PUBLISH) {
  try {
    run('npm whoami');
  } catch {
    console.error('FAIL  未登录 npm：先跑 `npm login`，再执行同一条命令');
    process.exit(1);
  }
  console.log('[publish-npm] npm publish …');
  const out = execSync(`npm publish ${JSON.stringify(outTgz)} --access public`, { cwd: root, encoding: 'utf8' });
  console.log(out.trim());
  console.log(`PASS  已发布 ${target}@${version}`);
  console.log(`下一步：把 release/catalog-entry.yml 的 npm 行取消注释（npm: ${target}）再提 PR`);
} else {
  console.log('\n下一步（二选一）：');
  console.log(`  npm login && npm publish ${path.basename(outTgz)} --access public`);
  console.log(`  node scripts/publish-npm.mjs --publish      # 已登录时一条命令完成`);
}

if (!KEEP) fs.rmSync(stage, { recursive: true, force: true });
else console.log(`[publish-npm] 临时目录保留：${stage}`);
