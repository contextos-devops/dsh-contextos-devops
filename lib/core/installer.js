// 安装计划：把「有没有 git / go」和「代码源 / 镜像源」变成可核验的安装路径。
//
// 参考官方安装脚本（https://shylinux.com）：
//   binary: 下载 publish/ice.<os>.<arch>，不需要 git / go
//   source: git clone → source etc/miss.sh（缺 go 时脚本会自动补）
// 本模块只做纯规划，不启动进程、不写文件；deployNode() 负责执行并回读。
import path from 'node:path';
import { platformTriple, osName, archName } from '../base/platform.js';
import { runShell } from '../misc/shell.js';
import { findGo } from './toolchain.js';

export const DEFAULT_SERVER = 'https://shylinux.com';
export const DEFAULT_REPO = 'https://shylinux.com/x/ContextOS';
export const GO_MIN = process.env.GO_MIN || '1.25.0';

// 只列官方 publish 实际有内容的文件。windows.arm64 目前 200 但 0 字节，保留展示、禁止选择。
export const INSTALL_TARGETS = Object.freeze([
  { id: 'darwin.arm64', os: 'darwin', arch: 'arm64', available: true, label: 'macOS · Apple Silicon' },
  { id: 'darwin.amd64', os: 'darwin', arch: 'amd64', available: true, label: 'macOS · Intel' },
  { id: 'linux.amd64', os: 'linux', arch: 'amd64', available: true, label: 'Linux · x86_64' },
  { id: 'linux.arm64', os: 'linux', arch: 'arm64', available: true, label: 'Linux · ARM64' },
  { id: 'linux.386', os: 'linux', arch: '386', available: true, label: 'Linux · 386' },
  { id: 'linux.arm', os: 'linux', arch: 'arm', available: true, label: 'Linux · ARM' },
  { id: 'linux.mipsle', os: 'linux', arch: 'mipsle', available: true, label: 'Linux · MIPSLE' },
  { id: 'windows.amd64', os: 'windows', arch: 'amd64', available: true, label: 'Windows · x86_64' },
  { id: 'windows.386', os: 'windows', arch: '386', available: true, label: 'Windows · 386' },
  { id: 'windows.arm64', os: 'windows', arch: 'arm64', available: false, label: 'Windows · ARM64（暂缺）' },
]);

export const INSTALL_METHODS = Object.freeze([
  { id: 'auto', label: '自动' },
  { id: 'source', label: '源码' },
  { id: 'binary', label: '二进制' },
  { id: 'copy', label: '本机复制' },
]);

const TARGET_MAP = new Map(INSTALL_TARGETS.map((x) => [x.id, x]));
const TARGET_ALIASES = {
  'darwin.x86_64': 'darwin.amd64',
  'darwin.aarch64': 'darwin.arm64',
  'linux.x86_64': 'linux.amd64',
  'linux.aarch64': 'linux.arm64',
  'linux.i386': 'linux.386',
  'windows.x86_64': 'windows.amd64',
  'windows.aarch64': 'windows.arm64',
};

export function hostTarget() {
  return platformTriple();
}

export function normalizeTarget(value) {
  const key = value && typeof value === 'object' ? value.id : value;
  const raw0 = String(key || '').trim().toLowerCase().replace('/', '.');
  if (!raw0) return hostTarget();
  const raw = TARGET_ALIASES[raw0] || raw0;
  const hit = TARGET_MAP.get(raw);
  if (!hit) throw new Error(`unknown platform target: ${value}`);
  return hit;
}

export function binaryNameFor(value) {
  const t = normalizeTarget(value);
  return `ice.${t.os}.${t.arch}`;
}

export function platformOptions() {
  const host = hostTarget();
  return INSTALL_TARGETS.map((t) => ({ ...t, host: t.id === host }));
}

function trimUrl(value) {
  return String(value || '').trim().replace(/\/+$/, '');
}

/** 源码地址的主机地址：https://x/y/z → https://x。 */
export function mirrorOf(repo) {
  try {
    return new URL(trimUrl(repo || DEFAULT_REPO)).origin;
  } catch {
    return DEFAULT_SERVER;
  }
}

/** 源码地址里的项目名：.../x/ContextOS → ContextOS。 */
export function projectNameOf(repo) {
  try {
    const parts = new URL(trimUrl(repo || DEFAULT_REPO)).pathname.split('/').filter(Boolean);
    return parts[parts.length - 1] || 'ContextOS';
  } catch {
    return 'ContextOS';
  }
}

/** 代码源是「主机/根」，拼 /x/<项目名>；已经是 /x/<项目> 则原样使用。 */
export function codeAddressOf(repo, codeSource) {
  const source = trimUrl(repo) || DEFAULT_REPO;
  const code = trimUrl(codeSource);
  if (!code) return source;
  if (/\/x\/[^/]+$/.test(code)) return code;
  return `${code}/x/${projectNameOf(source)}`;
}

/**
 * 解析两类来源，保持语义唯一：
 * - 源码地址 repo：默认源码地址；源码安装默认从它 clone。
 * - 代码源 codeSource：可选主机/根，拼成 <codeSource>/x/<源码项目名>。
 * - 镜像源 mirror：可选主机/根；未指定时取源码地址的 origin。
 * - server 仅作旧调用兼容，等价于镜像源。
 */
export function resolveSources({ repo = '', codeSource = '', mirror = '', server = '' } = {}) {
  const sourceAddress = trimUrl(repo) || DEFAULT_REPO;
  const code = trimUrl(codeSource);
  const mirrorOverride = trimUrl(mirror) || trimUrl(server);
  return {
    repo: sourceAddress,
    codeSource: code,
    sourceRepo: codeAddressOf(sourceAddress, code),
    project: projectNameOf(sourceAddress),
    mirror: mirrorOverride || mirrorOf(sourceAddress),
    mirrorSource: mirrorOverride,
  };
}

export function installMatrix({ git = true, go = true, repo = '', codeSource = '', mirror = '', server = '' } = {}) {
  const s = resolveSources({ repo, codeSource, mirror, server });
  const bin = 'ice.<os>.<arch>';
  const win = '?filename=ice.exe';
  return [
    {
      id: 'git+go', git: true, go: true, strategy: 'source',
      label: '有 git + 有 go',
      detail: 'clone 源码 → source etc/miss.sh 本机编译',
      command: `git clone ${s.sourceRepo} && cd <ctx_name> && source etc/miss.sh`,
    },
    {
      id: 'git', git: true, go: false, strategy: 'source',
      label: '有 git + 无 go',
      detail: 'clone 源码 → source etc/miss.sh（自动补 Go）',
      command: `git clone ${s.sourceRepo} && cd <ctx_name> && source etc/miss.sh`,
      autoGo: true,
    },
    {
      id: 'go', git: false, go: true, strategy: 'binary',
      label: '无 git + 有 go',
      detail: '直接下载对应平台的 ice.<os>.<arch>，不需要 go',
      command: `curl -fL ${s.mirror}/publish/${bin}${win} -o <ctx_name>/bin/ice.bin`,
    },
    {
      id: 'none', git: false, go: false, strategy: 'binary',
      label: '无 git + 无 go',
      detail: '直接下载对应平台的 ice.<os>.<arch>，零工具链',
      command: `curl -fL ${s.mirror}/publish/${bin}${win} -o <ctx_name>/bin/ice.bin`,
    },
  ];
}

export function chooseStrategy({ method = 'auto', git = true, go = true } = {}) {
  const m = String(method || 'auto').toLowerCase();
  if (m === 'auto') return git ? 'source' : 'binary';
  if (m === 'source') {
    if (!git) throw new Error('源码部署需要 git；没有 git 请选择 binary 或 auto');
    return 'source';
  }
  if (m === 'binary' || m === 'download') return 'binary';
  if (m === 'copy') return 'copy';
  throw new Error(`unknown install method: ${method}`);
}

/**
 * 纯规划：不执行任何命令。
 * @returns {{method:string,strategy:string,target:object,binary?:object,steps:Array,warnings:Array,canStart:boolean}}
 */
export function buildInstallPlan({
  method = 'auto',
  target = '',
  git = true,
  go = true,
  repo = '',
  codeSource = '',
  mirror = '',
  server = '',
  dir = '',
  ctxName = '',
  port = 9188,
  name = '',
  sourceBin = '',
  goPolicy = 'auto',
} = {}) {
  const t = normalizeTarget(target);
  if (!t.available) throw new Error(`平台 ${t.id} 没有可用的 publish 二进制（0 字节）`);
  const host = hostTarget();
  const strategy = chooseStrategy({ method, git, go });
  const installDir = dir || ctxName || `~/ContextOS-${Number(port) || 9188}`;
  const s = resolveSources({ repo, codeSource, mirror, server });
  const sameTarget = t.id === host;
  const plan = {
    method: String(method || 'auto'),
    strategy,
    target: t,
    host,
    sameTarget,
    canStart: strategy === 'copy' || sameTarget,
    dir: installDir,
    ctxName: ctxName || installDir,
    port: Number(port) || 9188,
    name: String(name || ''),
    repo: s.repo,
    project: s.project,
    codeSource: s.codeSource,
    sourceRepo: s.sourceRepo,
    mirror: s.mirror,
    mirrorSource: s.mirrorSource,
    goPolicy,
    steps: [],
    script: [],
    warnings: [],
  };
  if (strategy === 'source') {
    if (!sameTarget) throw new Error('源码部署只能在本机编译；跨平台请选择 binary');
    plan.steps.push({ id: 'clone', label: '准备源码', cmd: `git clone ${s.sourceRepo} ${installDir}`, detail: `git clone ${s.sourceRepo} ${installDir}` });
    plan.steps.push({ id: 'go', label: '准备 Go', detail: go ? `使用 ${GO_MIN}+` : `自动下载 Go 到 ${installDir}/usr/local/go` });
    plan.steps.push({ id: 'build', label: '源码构建', cmd: '. ./etc/miss.sh', detail: 'source etc/miss.sh → bin/ice.bin' });
    if (!go) {
      if (goPolicy === 'never') throw new Error('源码部署需要 Go，但 goPolicy=never');
      plan.warnings.push(`Go 未就绪，将自动下载到 ${installDir}/usr/local/go`);
      plan.script.push(`# 缺少 Go：先安装到 ${installDir}/usr/local/go，并把 ${installDir}/usr/local/go/bin 加入 PATH`);
    }
    plan.script.push(`git clone ${s.sourceRepo} ${installDir}`, `cd ${installDir}`, '. ./etc/miss.sh');
  } else if (strategy === 'binary') {
    const binary = binaryNameFor(t.id);
    const filename = t.os === 'windows' ? 'ice.exe' : 'ice.bin';
    const url = `${s.mirror}/publish/${binary}${t.os === 'windows' ? '?filename=ice.exe' : ''}`;
    // filename 是服务端响应的文件名；节点本地始终保存为 bin/ice.bin。
    plan.binary = { name: binary, filename, local: 'bin/ice.bin', url, sameTarget };
    plan.steps.push({ id: 'download', label: '下载二进制', cmd: `curl -fL '${url}' -o '${installDir}/bin/ice.bin'`, detail: url });
    plan.steps.push({ id: 'chmod', label: '写入节点', detail: `${installDir}/bin/ice.bin` });
    plan.script.push(`mkdir -p ${installDir}/bin`, `curl -fL '${url}' -o '${installDir}/bin/ice.bin'`, `chmod +x '${installDir}/bin/ice.bin'`);
    if (!sameTarget) plan.warnings.push(`目标是 ${t.id}，本机是 ${host}：只准备/搬运二进制，不会在本机启动`);
    if (t.os === 'windows') plan.warnings.push('Windows 下载 URL 指定 filename=ice.exe；本地统一保存为 bin/ice.bin');
  } else {
    if (!sameTarget) throw new Error('copy 只能复制本机二进制；跨平台请选择 binary');
    const src = sourceBin || '<本机 bin/ice.bin>';
    plan.steps.push({ id: 'copy', label: '复制本机二进制', cmd: `cp '${src}' '${installDir}/bin/ice.bin'`, detail: src });
    plan.script.push(`mkdir -p ${installDir}/bin`, `cp '${src}' '${installDir}/bin/ice.bin'`, `chmod +x '${installDir}/bin/ice.bin'`);
  }
  const startCmd = `cd ${installDir} && ./bin/ice.bin forever start port ${plan.port}`;
  const verifyUrl = `http://localhost:${plan.port}/c/runtime`;
  plan.steps.push({ id: 'start', label: '启动节点', cmd: startCmd, detail: plan.canStart ? startCmd : '跳过（跨平台）' });
  plan.steps.push({ id: 'verify', label: '回读', cmd: `curl -fsS ${verifyUrl}`, detail: `GET ${verifyUrl}` });
  if (plan.canStart) {
    plan.script.push(startCmd, `curl -fsS ${verifyUrl}`);
  } else {
    plan.script.push(`# 目标 ${t.id} 不在本机启动；将目录/二进制搬运到目标机后执行：`, startCmd);
  }
  plan.api = [{ method: 'GET', path: `/c/runtime`, impact: '回读节点运行时' }];
  return plan;
}

async function commandOk(cmd) {
  try {
    return (await runShell(cmd, undefined, { timeoutMs: 8000 })).code === 0;
  } catch {
    return false;
  }
}

async function commandVersion(cmd) {
  try {
    const r = await runShell(cmd, undefined, { timeoutMs: 8000 });
    if (r.code !== 0) return '';
    return String(r.out || r.err || '').trim();
  } catch {
    return '';
  }
}

/** 探测当前机器能力；只读，不安装。 */
export async function detectInstallEnv({ dir = '', repo = '', codeSource = '', mirror = '', server = '' } = {}) {
  const gitText = await commandVersion('git --version');
  const gitVersion = (gitText.match(/\d+(?:\.\d+)+/) || [])[0] || '';
  const git = !!gitText;
  const curl = await commandOk('curl --version');
  const wget = await commandOk('wget --version');
  const g = await findGo({ node: { dir: dir || process.cwd() } });
  const host = hostTarget();
  const s = resolveSources({ repo, codeSource, mirror, server });
  const goFound = !!g.version || !!g.bin;
  return {
    host,
    platform: `${osName}.${archName}`,
    git, gitVersion, go: goFound, goReady: !!g.ok, goVersion: g.version || '', goNeed: g.ok ? '' : (g.need || GO_MIN), goBin: g.bin || '',
    curl, wget,
    downloader: curl ? 'curl' : wget ? 'wget' : '',
    dir,
    repo: s.repo,
    codeSource: '',
    mirror: '',
    sources: s,
    matrix: installMatrix({ git, go: !!g.ok, repo: s.repo, mirror: s.mirrorSource }),
    targets: platformOptions(),
    methods: INSTALL_METHODS,
    defaults: { method: 'auto', repo: s.repo, codeSource: '', mirror: '', goPolicy: 'auto' },
  };
}

/** HTTP/UI 选项：环境 + 四种能力组合 + 来源默认值。 */
export async function deployOptions({ dir = '', repo = '', codeSource = '', mirror = '', server = '' } = {}) {
  return await detectInstallEnv({ dir, repo, codeSource, mirror, server });
}
