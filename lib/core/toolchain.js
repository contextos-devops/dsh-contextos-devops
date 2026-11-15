// 工具链：git 由 ContextOS 自带，go 需要时才下载（工厂模式编译空间）。
import path from 'node:path';
import os from 'node:os';
import fsp from 'node:fs';
import { spawn } from 'node:child_process';
import { ctxRoot } from '../base/env.js';

export const GO_MIN = process.env.GO_MIN || '1.25.0';
// 镜像按可达性排序：国内直连 aliyun 最快；golang.google.cn 会 302 到 dl.google.com，仅作兜底。
const GO_MIRRORS = [
  process.env.GODOWN,
  'https://mirrors.aliyun.com/golang/',
  'https://golang.google.cn/dl/',
  'https://dl.google.com/go/',
].filter(Boolean);

function platformPkg() {
  const os = process.platform === 'darwin' ? 'darwin' : process.platform === 'win32' ? 'windows' : 'linux';
  const arch = process.arch === 'arm64' ? 'arm64' : process.arch === 'ia32' ? '386' : 'amd64';
  return { os, arch, ext: os === 'windows' ? 'zip' : 'tar.gz' };
}

export function cmpVer(a, b) {
  const pa = String(a).replace(/^go/, '').split('.').map((x) => parseInt(x, 10) || 0);
  const pb = String(b).replace(/^go/, '').split('.').map((x) => parseInt(x, 10) || 0);
  for (let i = 0; i < 3; i++) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d) return d > 0 ? 1 : -1;
  }
  return 0;
}

function run(bin, args, { cwd = undefined, timeout = 30000 } = {}) {
  return new Promise((resolve) => {
    let child;
    try {
      child = spawn(bin, args, { cwd, stdio: ['ignore', 'pipe', 'pipe'] });
    } catch (e) {
      resolve({ code: -1, out: '', err: String(e?.message || e) });
      return;
    }
    let out = '';
    let err = '';
    const timer = setTimeout(() => child.kill('SIGKILL'), timeout);
    child.stdout.on('data', (d) => { out += String(d); });
    child.stderr.on('data', (d) => { err += String(d); });
    child.on('error', (e) => { clearTimeout(timer); resolve({ code: -1, out, err: String(e?.message || e) }); });
    child.on('close', (code) => { clearTimeout(timer); resolve({ code, out, err }); });
  });
}

export async function goVersionOf(bin) {
  const r = await run(bin, ['version']);
  const m = /go(\d+\.\d+(?:\.\d+)?)/.exec(r.out || r.err || '');
  return m ? m[1] : '';
}

/** go 候选路径：节点自带 → 本仓库 → 系统 PATH。 */
export function goCandidates(node) {
  const list = [];
  if (node && node.dir) list.push(path.join(node.dir, 'usr', 'local', 'go', 'bin', 'go'));
  list.push(path.join(ctxRoot(), 'usr', 'local', 'go', 'bin', 'go'));
  list.push('/usr/local/go/bin/go');
  if (process.env.GO) list.unshift(process.env.GO);
  return list.filter((p) => {
    try { return fsp.existsSync(p); } catch { return false; }
  });
}

export function findGoInPath() {
  const dirs = String(process.env.PATH || '').split(path.delimiter).filter(Boolean);
  // DSH 桌面进程的 PATH 不继承登录 shell；只查 PATH 会把已装 Go 判成未发现。
  const common = [
    '/usr/local/go/bin',
    '/opt/homebrew/bin',
    '/usr/local/bin',
    path.join(os.homedir(), 'go', 'bin'),
    path.join(os.homedir(), '.local', 'go', 'bin'),
  ];
  for (const d of [...dirs, ...common]) {
    const p = path.join(d, 'go');
    try { if (fsp.existsSync(p)) return p; } catch { /* ignore */ }
  }
  return '';
}

/** 找可用的 go：优先节点自带且版本够，其次 PATH。 */
export async function findGo({ node, min = GO_MIN } = {}) {
  const cands = goCandidates(node);
  const sys = findGoInPath();
  if (sys) cands.push(sys);
  for (const bin of cands) {
    const version = await goVersionOf(bin);
    if (version && cmpVer(version, min) >= 0) return { bin, version, ok: true, source: bin.startsWith(String(node?.dir || '')) ? 'node' : 'system' };
  }
  const first = cands[0] || '';
  const version = first ? await goVersionOf(first) : '';
  return { bin: first, version, ok: false, need: min, source: first ? 'system' : 'none' };
}

async function downloadOne(url, file, onProgress) {
  const attempt = (extra) => new Promise((resolve) => {
    let child;
    try {
      child = spawn('curl', [...extra, '-L', '--retry', '1', '--connect-timeout', '15', '--speed-limit', '20000', '--speed-time', '20', '-o', file, url], { stdio: ['ignore', 'pipe', 'pipe'] });
    } catch (e) { resolve({ code: -1, err: String(e?.message || e) }); return; }
    let err = '';
    let lastSize = -1;
    let stalled = 0;
    child.stderr.on('data', (d) => { err += String(d); });
    const timer = setInterval(() => {
      try {
        const size = fsp.statSync(file).size;
        onProgress?.(0, size, 0, `下载中 ${(size / 1048576).toFixed(1)}M`);
        if (size === lastSize) stalled += 1; else { stalled = 0; lastSize = size; }
        if (stalled >= 4) child.kill('SIGKILL');
      } catch { /* 文件还没建 */ }
    }, 1000);
    child.on('error', (e) => { clearInterval(timer); resolve({ code: -1, err: String(e?.message || e) }); });
    child.on('close', (code) => { clearInterval(timer); resolve({ code, err }); });
  });
  let r = await attempt([]);
  if (r.code !== 0) r = await attempt(['--noproxy', '*']);
  if (r.code !== 0) return { ok: false, err: (r.err || '').trim().slice(-160) };
  let size = 0;
  try { size = fsp.statSync(file).size; } catch { /* ignore */ }
  if (size < 1024 * 1024) return { ok: false, err: `文件过小 ${size}B（可能被网关拦截）` };
  onProgress?.(100, size, size, `下载完成 ${(size / 1048576).toFixed(1)}M`);
  return { ok: true, bytes: size };
}

async function download(pkg, file, onProgress) {
  const errors = [];
  for (const base of GO_MIRRORS) {
    const url = `${base.replace(/\/?$/, '/')}${pkg}`;
    onProgress?.(-1, 0, 0, `下载 ${pkg} ← ${new URL(url).host}`);
    const r = await downloadOne(url, file, onProgress);
    if (r.ok) return { bytes: r.bytes, url };
    errors.push(`${new URL(url).host}: ${r.err}`);
    await fsp.promises.unlink(file).catch(() => null);
  }
  throw new Error(`下载失败（已试 ${GO_MIRRORS.length} 个镜像）：${errors.join(' | ')}`);
}

/** 确保节点目录下有可用的 go；缺了就下载到 <node>/usr/local/go。 */
export async function ensureGo({ node, min = GO_MIN, onProgress } = {}) {
  const found = await findGo({ node, min });
  if (found.ok) return { ...found, installed: false };
  if (!node || !node.dir) throw new Error(`Go ${min}+ 未安装，且没有目标节点目录可安装`);
  const { os, arch, ext } = platformPkg();
  const pkg = `go${min}.${os}-${arch}.${ext}`;
  const local = path.join(node.dir, 'usr', 'local');
  await fsp.promises.mkdir(local, { recursive: true });
  const file = path.join(local, pkg);
  await download(pkg, file, (pct, got, total, label) => onProgress?.(pct, got, total, label));
  if (ext === 'zip') {
    const { execFile } = await import('node:child_process');
    await new Promise((resolve, reject) => execFile('unzip', ['-oq', file, '-d', local], (e) => (e ? reject(e) : resolve())));
  } else {
    const r = await run('tar', ['-xzf', file, '-C', local], { timeout: 300000 });
    if (r.code !== 0) throw new Error(`解压失败：${(r.err || r.out).slice(-200)}`);
  }
  const bin = path.join(local, 'go', 'bin', 'go');
  if (!fsp.existsSync(bin)) throw new Error(`解压后没有找到 ${bin}`);
  const version = await goVersionOf(bin);
  if (cmpVer(version, min) < 0) throw new Error(`安装的 Go 版本 ${version || '未知'} 低于 ${min}`);
  await fsp.promises.unlink(file).catch(() => null);
  return { bin, version, ok: true, source: 'node', installed: true };
}

/** 给子进程用的 go 环境：PATH 带上 go/bin，并关掉继承来的 GOROOT。 */
export function goEnv({ node, go }) {
  const dirs = [];
  if (go) dirs.push(path.dirname(go));
  if (node?.dir) dirs.push(path.join(node.dir, 'usr', 'local', 'bin'), path.join(node.dir, 'bin'));
  const env = {
    ...process.env,
    PATH: [...dirs, '/usr/local/bin', '/usr/bin', '/bin'].join(path.delimiter),
    CGO_ENABLED: '0',
    GOWORK: 'off',
    GO111MODULE: 'on',
    GOFLAGS: '',
    GOPRIVATE: process.env.GOPRIVATE || 'shylinux.com',
    GOPROXY: process.env.GOPROXY || 'https://goproxy.cn,direct',
  };
  if (go) env.GOROOT = path.dirname(path.dirname(go));
  return env;
}

/** 环境自检：git 由 ContextOS 自带，go 可按需下载。 */
export async function envDoctor({ node } = {}) {
  const items = [];
  const g = await findGo({ node });
  items.push({
    name: 'go', ok: g.ok, version: g.version || '', need: GO_MIN,
    hint: g.ok ? '' : '首次编译空间时会自动下载到 <node>/usr/local/go',
  });
  const git = await run('git', ['--version']);
  items.push({ name: 'git', ok: git.code === 0, version: (/git version (\S+)/.exec(git.out) || [])[1] || '', need: '', hint: git.code === 0 ? '' : 'ContextOS 自带 git，安装后可用' });
  items.push({ name: 'node', ok: true, version: process.versions.node, need: '', hint: 'DSH 自带' });
  const nodeDir = node?.dir || '';
  if (nodeDir) {
    items.push({ name: 'space', ok: fsp.existsSync(path.join(nodeDir, 'usr', 'local', 'work')), version: '', need: '', hint: nodeDir });
  }
  return { ok: items.every((x) => x.ok), items, goMin: GO_MIN, node: node?.port || null };
}

/** 仅供自测：把 go 安装包下到指定目录并解压（不参与生产路径）。 */
export async function installGoAt({ dir, version = GO_MIN, onProgress } = {}) {
  const { os, arch, ext } = platformPkg();
  const pkg = `go${version}.${os}-${arch}.${ext}`;
  const file = path.join(dir, pkg);
  await fsp.promises.mkdir(dir, { recursive: true });
  const r = await download(pkg, file, onProgress);
  const ex = await run('tar', ['-xzf', file, '-C', dir], { timeout: 300000 });
  if (ex.code !== 0) throw new Error(`解压失败：${(ex.err || ex.out).slice(-200)}`);
  const bin = path.join(dir, 'go', 'bin', 'go');
  const ver = await goVersionOf(bin);
  return { bin, ver, bytes: r.bytes, pkg };
}
