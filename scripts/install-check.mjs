// 安装矩阵静态验收：4 种 git/go 能力 + 10 个 OS/arch 目标。
// 纯规划，不下载、不启动；真实下载/启动由 test-install-live.mjs 做。
import assert from 'node:assert/strict';
import {
  INSTALL_TARGETS,
  installMatrix,
  platformOptions,
  chooseStrategy,
  normalizeTarget,
  binaryNameFor,
  buildInstallPlan,
  hostTarget,
} from '../lib/core/installer.js';

const host = hostTarget();
const matrix = installMatrix({ git: true, go: true });
assert.equal(matrix.length, 4);
assert.deepEqual(matrix.map((x) => `${x.git}/${x.go}:${x.strategy}`), [
  'true/true:source', 'true/false:source', 'false/true:binary', 'false/false:binary',
]);
assert.equal(chooseStrategy({ git: true, go: true }), 'source');
assert.equal(chooseStrategy({ git: true, go: false }), 'source');
assert.equal(chooseStrategy({ git: false, go: true }), 'binary');
assert.equal(chooseStrategy({ git: false, go: false }), 'binary');
assert.throws(() => chooseStrategy({ method: 'source', git: false }), /git/);

const targets = platformOptions();
assert.equal(targets.length, INSTALL_TARGETS.length);
assert.equal(targets.length, 10);
assert.equal(targets.filter((x) => x.available).length, 9);
assert.equal(targets.find((x) => x.id === 'windows.arm64').available, false);
assert.equal(normalizeTarget('linux.x86_64').id, 'linux.amd64');
assert.equal(normalizeTarget('darwin.aarch64').id, 'darwin.arm64');
assert.equal(binaryNameFor('linux.arm64'), 'ice.linux.arm64');

let plans = 0;
for (const t of targets) {
  if (!t.available) continue;
  const p = buildInstallPlan({ method: 'binary', target: t.id, git: false, go: false });
  assert.equal(p.strategy, 'binary');
  assert.equal(p.target.id, t.id);
  assert.equal(p.binary.name, `ice.${t.os}.${t.arch}`);
  const q = t.os === 'windows' ? '\\?filename=ice\\.exe' : '';
  assert.match(p.binary.url, new RegExp(`/publish/ice\\.${t.os}\\.${t.arch}${q}$`));
  assert.equal(p.canStart, t.id === host);
  assert.equal(p.sameTarget, t.id === host);
  if (t.id !== host) assert.ok(p.warnings.length > 0, `${t.id} cross warning`);
  plans++;
}
assert.equal(plans, 9);
assert.throws(() => buildInstallPlan({ method: 'source', target: 'linux.amd64', git: true, go: true }), /跨平台|本机/);
assert.throws(() => buildInstallPlan({ method: 'copy', target: 'linux.amd64', git: true, go: true }), /copy|跨平台/);
assert.throws(() => buildInstallPlan({ method: 'binary', target: 'windows.arm64', git: false, go: false }), /0 字节|没有可用/);

// 代码源 / 镜像源语义：源码地址是默认；代码源覆盖 clone；镜像源覆盖下载主机。
const sourcePlan = buildInstallPlan({ method: 'source', target: host, git: true, go: true, repo: 'https://example.com/x/ContextOS' });
assert.equal(sourcePlan.sourceRepo, 'https://example.com/x/ContextOS');
assert.ok(sourcePlan.steps.some((x) => x.detail.includes('https://example.com/x/ContextOS')));
const overridePlan = buildInstallPlan({ method: 'source', target: host, git: true, go: true, repo: 'https://example.com/x/ContextOS', codeSource: 'https://git.example.com/team' });
assert.equal(overridePlan.sourceRepo, 'https://git.example.com/team/x/ContextOS');
assert.ok(overridePlan.steps.some((x) => x.detail.includes('https://git.example.com/team/x/ContextOS')));
const mirrorPlan = buildInstallPlan({ method: 'binary', target: host, git: false, go: false, repo: 'https://example.com/x/ContextOS', mirror: 'https://mirror.example.com/ctx' });
assert.equal(mirrorPlan.mirror, 'https://mirror.example.com/ctx');
assert.equal(mirrorPlan.binary.url, `https://mirror.example.com/ctx/publish/${binaryNameFor(host)}`);
const defaultMirror = buildInstallPlan({ method: 'binary', target: host, git: false, go: false, repo: 'https://example.com/x/ContextOS' });
assert.equal(defaultMirror.mirror, 'https://example.com');
assert.equal(defaultMirror.binary.url, `https://example.com/publish/${binaryNameFor(host)}`);

console.log(`PASS install-matrix matrix=4 targets=${targets.length} available=9 host=${host}`);
console.log('PASS install-matrix source requires git; cross-target source/copy rejected');
