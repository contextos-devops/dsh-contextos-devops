// 核心业务：服务节点（部署/启停/打开/终端/删除/官方空间/容器与远程部署/流水线）。
import fs from 'node:fs/promises';
import fsp from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { runShell } from '../misc/shell.js';
import { http, encode, probe, portFree } from '../base/http.js';
import { waitFor } from '../misc/async.js';
import { HOME, ctxRoot, stateDir } from '../base/env.js';
import { openBrowser as platformOpenBrowser, openTerminalAt as platformOpenTerminal, platformTriple } from '../base/platform.js';
import { binExists, listNodes, pidAlive, readRegistry, writeRegistry } from '../base/registry.js';
import { buildSpace, createSpace, listSpaces, startSpace, stopSpace, warmSpace } from './spaces.js';
import { DEFAULT_SERVER, buildInstallPlan, binaryNameFor, normalizeTarget, hostTarget } from './installer.js';
import { findGo, ensureGo, goEnv } from './toolchain.js';
import { appendDeployLog, resetDeployLog, traceDeployRequest, traceDeployResponse } from './deploy-log.js';

function platformName() {
  return platformTriple();
}

/** 从目录名 / ContextOS-<port> 尾部推端口；读 var/log/ice.port 优先。 */
/** 磁盘扫描：任何含 bin/ice.bin 的 ~/ContextOS* 目录都是一个节点（对齐 CtxDeployer.scanLocalInstalls）。 */


export async function sshHosts() {
  const home = os.homedir();
  const read = async (p) => { try { return await fs.readFile(p, 'utf8'); } catch { return ''; } };
  const known = await read(path.join(home, '.ssh', 'known_hosts'));
  const hosts = [];
  for (const line of known.split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const parts = t.split(/\s+/);
    const addr = parts[0];
    if (!addr) continue;
    for (const h of addr.split(',')) {
      const plain = h.replace(/^\[/, '').replace(/\]:\d+$/, '');
      hosts.push({ host: /^\|1\|/.test(h) ? '(hashed)' : plain, address: h, hashed: /^\|1\|/.test(h) });
    }
  }
  const cfg = await read(path.join(home, '.ssh', 'config'));
  const configHosts = [];
  let cur = null;
  for (const line of cfg.split('\n')) {
    const m = /^\s*Host\s+(.+)$/i.exec(line);
    if (m) {
      const name = m[1].trim();
      if (/[*?]/.test(name)) { cur = null; continue; }
      cur = { name, hostname: '', user: '', port: '' };
      configHosts.push(cur);
      continue;
    }
    if (!cur) continue;
    const hn = /^\s*HostName\s+(.+)$/i.exec(line); if (hn) cur.hostname = hn[1].trim();
    const u = /^\s*User\s+(.+)$/i.exec(line); if (u) cur.user = u[1].trim();
    const pt = /^\s*Port\s+(\d+)/i.exec(line); if (pt) cur.port = pt[1];
  }
  const hist = await read(path.join(home, '.zsh_history')) + '\n' + await read(path.join(home, '.bash_history'));
  const cmds = [];
  for (const line of hist.split('\n')) {
    const m = /(?:^|;)\s*(ssh\s+[^\n]+)$/.exec(line);
    if (!m) continue;
    const raw = m[1].trim();
    const tm = /ssh\s+(?:-\S+\s+(?:\S+\s+)?)*([^\s]+)/.exec(raw);
    if (!tm) continue;
    const target = tm[1].replace(/["']/g, '');
    if (!target || /^[#-]/.test(target) || !/^[A-Za-z0-9_.@:-]+$/.test(target)) continue;
    cmds.push({ target, raw: raw.slice(0, 200) });
  }
  const keys = await read(path.join(home, '.ssh', 'authorized_keys'));
  const services = [];
  try {
    const dir = path.join(home, '.ssh', 'host');
    const names = await fs.readdir(dir);
    for (const f of names.sort()) {
      if (!f.endsWith('.json')) continue;
      try {
        const d = JSON.parse(await fs.readFile(path.join(dir, f), 'utf8'));
        services.push({
          name: f.replace(/\.json$/, ''),
          username: d.username || '',
          host: d.host || '',
          port: d.port || '22',
          init: d.init || '',
        });
      } catch { /* skip broken json */ }
    }
  } catch { /* no host dir */ }
  const uniq = (arr, key) => [...new Map(arr.map((x) => [x[key], x])).values()];
  return {
    services,
    knownHosts: uniq(hosts, 'address').slice(0, 100),
    configHosts: uniq(configHosts, 'name').slice(0, 50),
    history: uniq(cmds, 'target').slice(0, 60),
    authorizedKeys: keys.split('\n').filter((l) => l.trim() && !l.startsWith('#')).length,
  };
}

export async function sysControl({ action, value } = {}) {
  const a = String(action || '').toLowerCase();
  const v = value == null ? '' : String(value);
  const run = (cmd, timeoutMs = 8000) => runShell(cmd, process.cwd(), { timeoutMs });
  if (a === 'volume') {
    if (v === '') { const r = await run("osascript -e 'output volume of (get volume settings)'"); return { action: a, result: String(r.out || '').trim() }; }
    const n = Math.max(0, Math.min(100, Number(v) || 0));
    await run(`osascript -e 'set volume output volume ${n}'`);
    return { action: a, result: `volume=${n}` };
  }
  if (a === 'mute') {
    const on = ['1', 'true', 'on', 'yes', '是'].includes(v.toLowerCase());
    await run(`osascript -e 'set volume output muted ${on ? 'true' : 'false'}'`);
    return { action: a, result: on ? 'muted' : 'unmuted' };
  }
  if (a === 'clipboard') {
    if (v === '') { const r = await run('pbpaste'); return { action: a, result: String(r.out || '').slice(0, 20000) }; }
    const file = path.join(stateDir(), 'clipboard.txt');
    await fs.writeFile(file, v);
    await run(`pbcopy < ${JSON.stringify(file)}`);
    return { action: a, result: `copied ${v.length} chars` };
  }
  if (a === 'screenshot') {
    const file = path.join(stateDir(), `screenshot-${Date.now()}.png`);
    await run(`screencapture -x ${JSON.stringify(file)}`, 12000);
    let bytes = 0;
    try { bytes = (await fs.stat(file)).size; } catch {}
    if (!bytes) throw new Error('截屏失败：需要给 DSH 授予「屏幕录制」权限（系统设置 → 隐私与安全性 → 屏幕录制）');
    return { action: a, result: file, path: file, bytes };
  }
  if (a === 'open') {
    if (!/^(https?:\/\/|\/|file:)/i.test(v)) throw new Error('open 只接受 http(s) URL 或绝对路径');
    await run(`open ${JSON.stringify(v)}`);
    return { action: a, result: v };
  }
  if (a === 'wifi') {
    if (v === 'on' || v === 'off') await run(`networksetup -setairportpower en0 ${v}`);
    const r = await run('networksetup -getairportpower en0');
    return { action: a, result: String(r.out || '').trim() };
  }
  if (a === 'sleep') { await run('pmset sleepnow'); return { action: a, result: 'sleeping' }; }
  if (a === 'lock') { await run('pmset displaysleepnow'); return { action: a, result: 'display asleep' }; }
  if (a === 'wallpaper') {
    if (!v) throw new Error('wallpaper 需要图片绝对路径');
    await run(`osascript -e 'tell application "System Events" to set picture of every desktop to ${JSON.stringify(v)}'`);
    return { action: a, result: v };
  }
  if (a === 'shortcut') {
    if (!v) throw new Error('shortcut 需要名称');
    const r = await run(`shortcuts run ${JSON.stringify(v)}`, 30000);
    return { action: a, result: r.code === 0 ? `ran ${v}` : String(r.out || 'failed').slice(0, 400) };
  }
  if (a === 'shortcuts') { const r = await run('shortcuts list'); return { action: a, result: String(r.out || '').trim() }; }
  if (a === 'info') {
    const [bt, dsk, mem, disp] = await Promise.all([
      run('pmset -g batt'), run('df -h /'), run('vm_stat'), run('system_profiler SPDisplaysDataType'),
    ]);
    return { action: a, result: { battery: String(bt.out || '').trim().split('\n').slice(0, 2).join(' '), disk: String(dsk.out || '').trim().split('\n').slice(-1)[0], displays: String(disp.out || '').split('\n').filter((l) => /Resolution|Display Type/.test(l)).slice(0, 4) } };
  }
  throw new Error(`unknown sysControl action: ${a}`);
}

/** ContextOS answers with plain text tables or a JSON status envelope. */
/** Fixed-width table: use header column offsets, not a 2+ space split. */
function binaryName() {
  const osName = process.platform === 'darwin' ? 'darwin' : process.platform === 'win32' ? 'windows' : 'linux';
  const arch = process.arch === 'arm64' ? 'arm64' : process.arch === 'ia32' ? '386' : 'amd64';
  return `ice.${osName}.${arch}`;
}

async function findBinary(root) {
  const candidates = [
    process.env.CTX_DEVOPS_BINARY,
    path.join(root, 'usr', 'publish', binaryName()),
    path.join(root, 'bin', 'ice.bin'),
  ].filter(Boolean);
  for (const candidate of candidates) {
    try {
      const st = await fs.stat(candidate);
      if (st.isFile() && st.size > 5 * 1024 * 1024) return candidate;
    } catch {
      /* keep looking */
    }
  }
  throw new Error(`no usable ice.bin; expected ${path.join(root, 'usr', 'publish', binaryName())}`);
}

async function findRunningPublishBinary(target = '') {
  const file = binaryNameFor(target || hostTarget().id);
  let best = '';
  let bestMs = 0;
  for (const n of await listNodes()) {
    if (n.state !== 'running' || !n.dir) continue;
    const p = path.join(n.dir, 'usr', 'publish', file);
    const st = await fs.stat(p).catch(() => null);
    if (st?.isFile() && st.size > 5 * 1024 * 1024 && st.mtimeMs > bestMs) { best = p; bestMs = st.mtimeMs; }
  }
  return best;
}

function launchArgs(port, parent) {
  const a = ['forever', 'start'];
  if (parent) a.push('dev', parent);
  a.push('port', String(port));
  return a;
}

async function writeLauncherMeta(node, source) {
  await fs.mkdir(path.join(node.dir, 'var', 'log'), { recursive: true });
  const cmd = ['./bin/ice.bin', ...launchArgs(node.port, node.parent || '')].join(' ');
  const meta = {
    installDir: node.dir,
    port: node.port,
    parentURL: node.parent || '',
    platform: platformName(),
    source,
    command: cmd,
    createdAt: new Date().toISOString(),
  };
  await fs.writeFile(path.join(node.dir, '.ctx-deploy.json'), JSON.stringify(meta, null, 2));
  await fs.writeFile(
    path.join(node.dir, 'start.sh'),
    `#!/bin/sh\ncd "$(dirname "$0")" || exit 1\nexec ${cmd}\n`,
    { mode: 0o755 },
  );
  await fs.writeFile(
    path.join(node.dir, 'stop.sh'),
    `#!/bin/sh\nPORT=$(cat var/log/ice.port 2>/dev/null)\n[ -z "$PORT" ] && PORT="${node.port}"\ncurl -s -m 5 "http://localhost:$PORT/c/quit"\necho\n`,
    { mode: 0o755 },
  );
}

async function saveRecord(node, source) {
  const registry = await readRegistry();
  const idx = registry.findIndex((r) => r.dir === node.dir);
  const rec = {
    dir: node.dir,
    name: node.name || path.basename(node.dir),
    port: node.port,
    parent: node.parent || '',
    platform: node.platform || platformName(),
    source,
    createdAt: new Date().toISOString(),
  };
  if (idx >= 0) registry[idx] = rec;
  else registry.push(rec);
  await writeRegistry(registry);
}


async function targetOfBinary(file) {
  const fd = fsp.openSync(file, 'r');
  const head = Buffer.alloc(4096);
  const n = fsp.readSync(fd, head, 0, 4096, 0);
  fsp.closeSync(fd);
  const b = head.subarray(0, n);
  if (n < 20) return null;
  if (b[0] === 0x7f && b[1] === 0x45 && b[2] === 0x4c && b[3] === 0x46) {
    const machine = b.readUInt16LE(18);
    const arch = { 0xb7: 'arm64', 0x3e: 'amd64', 0x28: 'arm', 0x03: '386' }[machine] || 'unknown';
    return `linux.${arch}`;
  }
  const le32 = b.readUInt32LE(0);
  const be32 = b.readUInt32BE(0);
  if (le32 === 0xfeedfacf || le32 === 0xfeedface || be32 === 0xfeedfacf || be32 === 0xfeedface) {
    const cpu = le32 === 0xfeedfacf || le32 === 0xfeedface ? b.readUInt32LE(4) : b.readUInt32BE(4);
    const arch = { 0x0100000c: 'arm64', 0x01000007: 'amd64', 12: 'arm', 7: '386' }[cpu] || 'unknown';
    return `darwin.${arch}`;
  }
  if (be32 === 0xcafebabe || le32 === 0xcafebabe) return 'darwin.universal';
  return null;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function downloadBinary(dir, { parent = '', target = '', server = DEFAULT_SERVER, filename = '', onLog = null } = {}) {
  const file = target ? binaryNameFor(target) : binaryName();
  // 指定镜像源后只从该源下载；不再静默回退到官方站，避免掩盖镜像配置错误。
  const bases = [server || DEFAULT_SERVER].map((u) => (u || '').replace(/\/$/, '')).filter(Boolean);
  const urls = [...new Set(bases.map((b) => `${b}/publish/${file}${filename ? `?filename=${encodeURIComponent(filename)}` : ''}`))];
  let last;
  for (const url of urls) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(60000) });
      if (!res.ok) { last = `HTTP ${res.status}`; continue; }
      const total = Number(res.headers.get('content-length') || 0);
      const chunks = [];
      let got = 0;
      let lastMark = 0;
      if (res.body?.getReader) {
        const reader = res.body.getReader();
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = Buffer.from(value);
          chunks.push(chunk);
          got += chunk.length;
          if (got - lastMark >= 1024 * 1024) {
            lastMark = got;
            const pct = total ? Math.min(99, Math.floor((got / total) * 100)) : 0;
            onLog?.(`[download] ${pct}% ${got}${total ? `/${total}` : ''} bytes\n`);
          }
        }
      } else {
        chunks.push(Buffer.from(await res.arrayBuffer()));
        got = chunks[0].length;
      }
      const buf = Buffer.concat(chunks);
      if (buf.length < 1024 * 1024) { last = `too small (${buf.length}B)`; continue; }
      await fs.writeFile(path.join(dir, 'bin', 'ice.bin'), buf, { mode: 0o755 });
      onLog?.(`[download] 100% ${buf.length} bytes\n`);
      return { url, size: buf.length };
    } catch (e) {
      last = String(e?.message || e);
    }
  }
  throw new Error(`download failed (${last}); tried ${urls.join(', ')}`);
}

export async function deployNode({
  port = 9188,
  name = '',
  mode = 'auto',
  method = '',
  parent = '',
  repo = '',
  codeSource = '',
  mirror = '',
  sourceBin = '',
  dir: installDir = '',
  target = '',
  server = '',
  ctxName = '',
  goPolicy = 'auto',
  dryRun = false,
} = {}) {
  port = Number(port);
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('port must be 1024..65535');

  const root = ctxRoot();
  const rawDir = installDir || ctxName || '';
  const dir = rawDir
    ? path.resolve(String(rawDir).replace(/^~(?=$|\/)/, HOME()))
    : path.join(path.dirname(root), `${path.basename(root)}-${port}`);
  if (path.resolve(dir) === path.resolve(root)) throw new Error('refuse to deploy over the running root');

  const targetInfo = normalizeTarget(target || platformName());
  const probeCwd = fsp.existsSync(dir) ? dir : root;
  const gitOk = (await runShell('git --version', probeCwd).catch(() => ({ code: 1 }))).code === 0;
  const goInfo = await findGo({ node: { dir } });
  const requested = method || (mode === 'copy' ? 'copy' : mode === 'source' ? 'source' : mode === 'download' || mode === 'binary' ? 'binary' : 'auto');
  const plan = buildInstallPlan({
    method: requested,
    target: targetInfo.id,
    git: gitOk,
    go: goInfo.ok,
    server: server || process.env.CTX_DEV || '',
    repo,
    codeSource,
    mirror,
    dir,
    ctxName,
    port,
    name,
    sourceBin,
    goPolicy,
  });
  if (dryRun) return { dryRun: true, plan };
  await resetDeployLog(port);
  const emit = (text) => { if (text) void appendDeployLog(port, text); };
  emit(`[deploy] port ${port} target ${plan.target.id} method ${plan.method} strategy ${plan.strategy}\n`);
  emit(`[deploy] dir ${dir}\n`);
  const log = [];
  const runLog = (cmd, impact) => {
    const item = { time: new Date().toISOString(), cmd, impact, status: 'running', detail: '' };
    log.push(item);
    emit(`\n$ ${cmd}\n`);
    return item;
  };

  if (!(await portFree(port))) throw new Error(`port ${port} is already in use`);
  const existing = (await listNodes()).find((n) => n.port === port && n.dir === dir);
  if (existing?.live) return { ...existing, reused: true };
  if (fsp.existsSync(path.join(dir, 'bin', 'ice.bin'))) {
    throw new Error(`directory ${dir} already has bin/ice.bin; choose another port or remove it yourself`);
  }

  let sourceTag = '';
  const hasRepo = fsp.existsSync(path.join(dir, '.git'));
  const cloneRepo = async () => {
    if (!gitOk) throw new Error('源码安装需要 git（未检测到 git）');
    if (fsp.existsSync(dir) && !hasRepo) {
      const entries = fsp.readdirSync(dir);
      if (entries.length) throw new Error(`directory ${dir} exists and is not a git repo`);
    }
    const targetRepo = plan.sourceRepo;
    const targetPath = `'${dir.replace(/'/g, "'\\''")}'`;
    const lg = runLog(`git clone --progress ${targetRepo} ${dir}`, '获取源码');
    const r = await runShell(`git clone --progress ${JSON.stringify(targetRepo)} ${targetPath}`, path.dirname(dir), { timeoutMs: 300000, onChunk: (chunk) => emit(chunk) });
    emit(`\n[exit] ${r.code}\n`);
    lg.status = r.code === 0 ? 'done' : 'failed';
    lg.detail = (r.code === 0 ? r.out : r.err).slice(-400);
    if (r.code !== 0) throw new Error(`git clone failed (${r.code}): ${r.err.slice(-400)}`);
  };

  if (plan.strategy === 'source') {
    if (!hasRepo) await cloneRepo();
    if (!fsp.existsSync(path.join(dir, 'etc', 'miss.sh'))) throw new Error('clone done but etc/miss.sh missing — not a ContextOS repo');
    let go = await findGo({ node: { dir } });
    if (!go.ok) {
      if (goPolicy === 'never') throw new Error('源码安装需要 Go（goPolicy=never）');
      const gl = runLog('ensureGo() / 下载 Go', '准备工具链');
      go = await ensureGo({ node: { dir } });
      gl.status = go.ok ? 'done' : 'failed';
      gl.detail = `${go.version || ''} ${go.bin || ''}`.trim();
    }
    const bl = runLog('. ./etc/miss.sh', '源码编译');
    const b = await runShell('. ./etc/miss.sh', dir, {
      timeoutMs: 900000,
      env: goEnv({ node: { dir }, go: go.bin }),
      onChunk: (chunk) => emit(chunk),
    });
    emit(`\n[exit] ${b.code}\n`);
    bl.status = b.code === 0 ? 'done' : 'failed';
    bl.detail = (b.code === 0 ? b.out : b.err).slice(-500);
    if (b.code !== 0) throw new Error(`build failed (${b.code}): ${b.err.slice(-500)}`);
    if (!fsp.existsSync(path.join(dir, 'bin', 'ice.bin'))) throw new Error('build produced no bin/ice.bin');
    sourceTag = `git:${plan.sourceRepo}+build${go.installed ? '+go-auto' : ''}`;
  } else {
    await fs.mkdir(path.join(dir, 'bin'), { recursive: true });
    let copied = '';
    // copy 才允许复制本机/同级节点二进制；binary 必须按目标平台下载。
    if (plan.strategy === 'copy') {
      try {
        const source = sourceBin || (await findRunningPublishBinary(plan.target.id)) || (await findBinary(root));
        const cl = runLog(`cp ${source} ${path.join(dir, 'bin', 'ice.bin')}`, '复制二进制');
        await fs.copyFile(source, path.join(dir, 'bin', 'ice.bin'));
        await fs.chmod(path.join(dir, 'bin', 'ice.bin'), 0o755);
        cl.status = 'done';
        copied = `copy:${source}`;
      } catch { /* try peers, then error */ }
      if (!copied) {
        const other = (await listNodes()).find((n) => n.port !== port && n.bin && fsp.existsSync(n.bin));
        if (other) {
          await fs.copyFile(other.bin, path.join(dir, 'bin', 'ice.bin'));
          await fs.chmod(path.join(dir, 'bin', 'ice.bin'), 0o755);
          copied = `copy:${other.dir}`;
        }
      }
      if (!copied) throw new Error('copy 模式没有可复制的本机 ice.bin');
    }
    if (!copied) {
      const dlLog = runLog(`curl -fL '${plan.binary?.url || plan.mirror}' -o '${path.join(dir, 'bin', 'ice.bin')}'`, '下载二进制');
      const dl = await downloadBinary(dir, { parent, target: plan.target.id, server: plan.mirror, filename: plan.binary?.filename, onLog: emit });
      dlLog.status = 'done';
      dlLog.detail = `${dl.size} bytes`;
      copied = `download:${dl.url}`;
    }
    if (plan.sameTarget) {
      const actual = await targetOfBinary(path.join(dir, 'bin', 'ice.bin'));
      if (actual && !actual.endsWith('.universal') && actual !== platformName()) {
        throw new Error(`platform mismatch: want ${platformName()}, got ${actual}`);
      }
    }
    sourceTag = copied;
  }

  const nodeName = name ? (/^ContextOS/i.test(name) ? name : `ContextOS-${name}`) : `ContextOS-${port}`;
  const node = {
    dir,
    bin: path.join(dir, 'bin', 'ice.bin'),
    name: nodeName,
    port,
    parent,
    platform: plan.target.id,
  };
  await writeLauncherMeta(node, sourceTag);
  if (plan.canStart) {
    emit('[wait] 等待 3s 后再探测节点…\n');
    await sleep(3000);
  }
  if (!plan.canStart) {
    return { ...node, source: sourceTag, method: plan.method, target: plan.target.id, codeSource: plan.codeSource, mirror: plan.mirror, prepared: true, canStart: false, plan, log };
  }
  const sl = runLog(`cd ${dir} && ./bin/ice.bin forever start port ${port}`, '启动节点');
  const started = await startNode({ port, node, onLog: emit });
  emit(`[start] ${started.state || ''} pid ${started.pid || ''} 就绪 ${started.upMs || 0}ms（${started.phase || 'fast'}）\n`);
  try {
    const boot = await fs.readFile(path.join(dir, 'var', 'log', 'deploy.log'), 'utf8');
    if (boot) emit(`\n[start log]\n${boot.slice(-50000)}\n`);
  } catch { /* startup log may not exist yet */ }
  sl.status = 'done';
  sl.detail = `pid ${started.pid || ''} · 就绪 ${started.upMs || 0}ms · ${started.phase || 'fast'}${started.assetsReady ? '' : ' · 静态资源加载中'}`;
  // 回读运行时：这一行以前只是 runLog 拼出来的展示文本，没人真发请求，
  // 用户看到 `$ GET /c/runtime` 之后就再无下文。现在真的再打一次 /c/runtime。
  const vl = runLog('验证节点运行时', '回读运行时');
  const back = await probe(port, 2000);
  vl.status = back.live ? 'done' : 'failed';
  vl.detail = back.live
    ? `${back.runtime?.version || 'unknown'} · pid ${started.pid || '-'} · :${port} · 就绪 ${started.upMs || 0}ms · assets ${back.assetsReady ? 'ready' : `loading(${back.cssBytes || 0}B)`}`
    : `回读失败：${describeProbe(back)}`;
  emit(`[runtime] ${vl.detail}\n`);
  await saveRecord(node, sourceTag);
  return { ...node, ...started, source: sourceTag, method: plan.method, target: plan.target.id, codeSource: plan.codeSource, mirror: plan.mirror, plan, log };
}

// ── 探活、启动与存活看门狗 ────────────────────────────────────
// 为什么需要看门狗：ContextOS 的 forever 守护语义是「子进程非零退出才重启」，
// 干净退出（exit 0）会打印 exit 后 break，永不再拉起（实证
// .ish/pluged/shylinux.com/x/icebergs/base/cli/forever.go:47-53）。
// 也就是说「起来了又没了」在内核侧不会被自动救回，DSH 侧必须自己兜底。
const WATCH_INTERVAL_MS = 15000;   // 每 15 秒 probe 一次
const WATCH_FAIL_LIMIT = 3;        // 连续 3 次失败判定已退出
const WATCH_RESTART_LIMIT = 3;     // 最多自动重启 3 次，之后标记 stale 交人工
const WATCHDOGS = new Map();

/** 探活失败的「人话」原因：区分连不上 / 有应答但运行时没起来。 */
function describeProbe(r) {
  if (!r) return '无应答';
  if (r.error) return `连接失败（${r.error}）`;
  if (!r.live) return `HTTP ${r.status || '?'} 有应答但运行时未就绪（version ${r.runtime?.version || '?'}）`;
  return runtimeLine(r);
}

/** 就绪后的一行摘要：版本 / 端口 / 静态资源状态。 */
function runtimeLine(r) {
  const rt = r?.runtime || {};
  const css = r?.cssBytes || 0;
  return `${rt.version || 'unknown'}${rt.builtAt ? ` built ${rt.builtAt}` : ''} · :${r.port} · assets ${r.assetsReady ? 'ready' : `loading(${css}B)`}`;
}

/** 拉起子进程（脱离会话）：cwd 固定节点目录，stdout/stderr 进节点自己的 deploy.log。 */
function spawnDetached(node) {
  const logDir = path.join(node.dir, 'var', 'log');
  fsp.mkdirSync(logDir, { recursive: true });
  const logPath = path.join(logDir, 'deploy.log');
  const out = fsp.openSync(logPath, 'a');
  const child = spawn(path.join(node.dir, 'bin', 'ice.bin'), launchArgs(node.port, node.parent), {
    cwd: node.dir,
    detached: true,
    stdio: ['ignore', out, out],
    env: { ...process.env },
  });
  child.unref();
  fsp.closeSync(out);
  return { child, logPath };
}

/**
 * 等节点起来：3 秒快探 + 最长 30 秒慢等，每次失败都把原因写进日志。
 * 旧实现是 75 秒静默 waitFor，界面只能干转圈，且期间没有任何进度。
 */
async function waitNodeUp(port, { onLog = null, fastMs = 5000, slowMs = 30000 } = {}) {
  const started = Date.now();
  const emit = (t) => { if (t) onLog?.(t); };
  let last = null;
  let fast = 0;
  try {
    const p = await waitFor(async () => {
      fast += 1;
      emit('[probe] probe\n');
      const r = await probe(port, 1000);
      last = r;
      return r.live ? r : null;
    }, { timeout: fastMs, interval: 1500, label: 'fast' });
    return { probe: p, ms: Date.now() - started, phase: 'fast', attempts: fast };
  } catch { /* 快探没等到，转入慢等 */ }
  emit(`[probe] ${Math.round(fastMs / 1000)}s 内探了 ${fast} 次未就绪（${describeProbe(last)}），转入最长 ${Math.round(slowMs / 1000)}s 慢等\n`);
  let n = 0;
  const p = await waitFor(async () => {
    n += 1;
    const r = await probe(port, 1500);
    last = r;
    const t = ((Date.now() - started) / 1000).toFixed(1);
    if (r.live) { emit(`[probe] #${n} t+${t}s 就绪 ${runtimeLine(r)}\n`); return r; }
    emit(`[probe] #${n} t+${t}s 未就绪：${describeProbe(r)}\n`);
    return null;
  }, { timeout: slowMs, interval: 2500, label: 'slow' });
  return { probe: p, ms: Date.now() - started, phase: 'slow', attempts: n };
}

/** 台账 state 落盘（stale = 台账此前谎报 running 的那一类）。 */
async function markRegistryState(port, state) {
  try {
    const registry = await readRegistry();
    const rec = registry.find((r) => Number(r.port) === Number(port));
    if (!rec || rec.state === state) return false;
    rec.state = state;
    rec.updatedAt = new Date().toISOString();
    await writeRegistry(registry);
    return true;
  } catch { return false; }
}

export function stopWatchdog(port) {
  const st = WATCHDOGS.get(Number(port));
  if (!st) return false;
  if (st.timer) clearInterval(st.timer);
  WATCHDOGS.delete(Number(port));
  return true;
}

export function watchdogState(port) {
  const st = WATCHDOGS.get(Number(port));
  return st ? { watching: true, fails: st.fails, restarts: st.restarts, stale: st.stale } : { watching: false };
}

/** 存活看门狗：每 15s probe，连续 3 次失败自动重启（最多 3 次），此后标 stale 停手。 */
export function startWatchdog(node, { onLog = null } = {}) {
  stopWatchdog(node.port);
  const emit = (t) => { if (t) { if (onLog) onLog(t); else void appendDeployLog(node.port, t); } };
  const state = { port: Number(node.port), fails: 0, restarts: 0, stale: false, busy: false, timer: null };
  const tick = async () => {
    if (state.busy || state.stale) return;
    state.busy = true;
    try {
      let dead = false;
      let why = '';
      try {
        const r = await probe(state.port, 2000, { checkAssets: false });
        if (r.live) {
          if (state.fails) emit(`[watchdog] :${state.port} 恢复正常，失败计数归零\n`);
          state.fails = 0;
          if (await markRegistryState(state.port, 'running')) emit(`[watchdog] :${state.port} 台账 state 已改回 running\n`);
          return;
        }
        dead = true;
        why = describeProbe(r);
      } catch (e) {
        dead = true;
        why = String(e?.message || e);
      }
      if (!dead) return;
      state.fails += 1;
      emit(`[watchdog] :${state.port} 第 ${state.fails}/${WATCH_FAIL_LIMIT} 次探活失败：${why}\n`);
      if (state.fails < WATCH_FAIL_LIMIT) return;
      if (state.restarts >= WATCH_RESTART_LIMIT) {
        state.stale = true;
        emit(`[watchdog] :${state.port} 连续 ${WATCH_FAIL_LIMIT} 次失败且已重启 ${state.restarts} 次，标记 stale 并停止守护（需人工介入）\n`);
        await markRegistryState(state.port, 'stale');
        if (state.timer) clearInterval(state.timer);
        state.timer = null;
        return;
      }
      // 进程还在但不应答（挂死）时不重复拉起：会撞端口，而且凭 ice.pid 去 kill 有误杀风险。
      await markRegistryState(state.port, 'stale');
      const pid = await pidAlive(node.dir);
      if (pid.alive) {
        state.fails = 0;
        emit(`[watchdog] :${state.port} pid ${pid.pid} 仍存活但 HTTP 无应答，不重复拉起（避免撞端口），等它自己退出或人工处理\n`);
        return;
      }
      state.restarts += 1;
      state.fails = 0;
      emit(`[watchdog] :${state.port} 判定已退出（forever 不会自己拉起 exit 0 的子进程），第 ${state.restarts}/${WATCH_RESTART_LIMIT} 次自动重启\n`);
      try {
        const { child, logPath } = spawnDetached(node);
        emit(`[watchdog] :${state.port} 已重新拉起 pid ${child.pid}，日志 ${logPath}\n`);
        const up = await waitNodeUp(node.port, { onLog: emit, fastMs: 10000, slowMs: 10000 });
        emit(`[watchdog] :${state.port} 重启成功 t+${up.ms}ms ${runtimeLine(up.probe)}\n`);
        await markRegistryState(state.port, 'running');
      } catch (e) {
        emit(`[watchdog] :${state.port} 重启后仍未就绪：${String(e?.message || e)}\n`);
      }
    } finally {
      state.busy = false;
    }
  };
  state.timer = setInterval(() => { void tick(); }, WATCH_INTERVAL_MS);
  state.timer.unref?.();
  WATCHDOGS.set(state.port, state);
  emit(`[watchdog] :${state.port} 已挂存活看门狗（每 ${WATCH_INTERVAL_MS / 1000}s 一次，连续 ${WATCH_FAIL_LIMIT} 次失败自动重启，最多 ${WATCH_RESTART_LIMIT} 次）\n`);
  return state;
}

export async function startNode({ port, node: direct = null, onLog = null } = {}) {
  const node = direct || (await listNodes()).find((n) => n.port === Number(port));
  if (!node) throw new Error(`node ${port} not found (deploy or register it first)`);
  if (node.state === 'running') return { port: node.port, state: 'running', note: 'already running' };
  if (!node.hasBin && !(await binExists(node))) throw new Error('no bin/ice.bin — deploy first');
  // stale = 进程还在但 HTTP 不应答：这时再 spawn 一个会撞端口，先把话说清楚。
  if (node.state === 'stale') {
    const pid = await pidAlive(node.dir);
    if (pid.alive) throw new Error(`node ${node.port} 进程还在（pid ${pid.pid}）但 HTTP 无应答，先 stop 再 start，别重复拉起`);
  }

  const emit = (t) => { if (t) { if (onLog) onLog(t); else void appendDeployLog(node.port, t); } };
  const { child, logPath } = spawnDetached(node);
  emit(`[start] spawn pid ${child.pid} cwd ${node.dir} args ${launchArgs(node.port, node.parent).join(' ')}\n`);

  let up;
  try {
    up = await waitNodeUp(node.port, { onLog: emit });
  } catch (e) {
    throw new Error(`node ${node.port} not ready: 30s 内未就绪 — log ${logPath}`);
  }
  const rt = up.probe.runtime || {};
  emit(`[start] 就绪 t+${up.ms}ms pid ${child.pid} ${runtimeLine(up.probe)}\n`);
  startWatchdog(node, { onLog: emit });
  return {
    port: node.port,
    state: 'running',
    dir: node.dir,
    url: `http://localhost:${node.port}/`,
    pid: child.pid,
    upMs: up.ms,
    phase: up.phase,
    version: rt.version || '',
    builtAt: rt.builtAt || '',
    assetsReady: !!up.probe.assetsReady,
    cssBytes: up.probe.cssBytes || 0,
    watchdog: watchdogState(node.port),
  };
}

export async function stopNode({ port } = {}) {
  // 先摘掉看门狗：否则「用户主动停止」会被存活看门狗判成「异常退出」又拉起来。
  const watching = stopWatchdog(Number(port));
  const node = (await listNodes()).find((n) => n.port === Number(port));
  if (!node) throw new Error(`node ${port} not found`);
  if (node.state !== 'running' && node.state !== 'stale') return { port: Number(port), state: 'stopped', note: 'already stopped', watchdog: watching ? 'removed' : 'none' };
  try {
    await http(Number(port), '/c/quit', { timeout: 3000 });
  } catch {
    /* quit endpoint may 405/close; fall through to pid */
  }
  try {
    await waitFor(async () => !(await probe(Number(port), 1000)).live, { timeout: 20000, interval: 500, label: `node ${port} down` });
  } catch {
    let pid = 0;
    try { pid = Number((await fs.readFile(path.join(node.dir, 'var', 'log', 'ice.pid'), 'utf8')).trim()); } catch { /* no pid file */ }
    if (pid > 1) { try { process.kill(pid, 'SIGTERM'); } catch {} }
    await waitFor(async () => !(await probe(Number(port), 1000)).live, { timeout: 15000, interval: 500, label: `node ${port} down (pid)` });
  }
  await markRegistryState(Number(port), 'stopped');
  return { port: Number(port), state: 'stopped', watchdog: watching ? 'removed' : 'none' };
}

export async function openNode({ port } = {}) {
  const node = (await listNodes()).find((n) => n.port === Number(port));
  if (!node) throw new Error(`node ${port} not found`);
  platformOpenBrowser(`http://localhost:${node.port}/`);
  return { opened: `http://localhost:${node.port}/` };
}

export async function openSpace({ node, space } = {}) {
  platformOpenBrowser(`http://localhost:${Number(node)}/s/${encodeURIComponent(space)}`);
  return { opened: `http://localhost:${Number(node)}/s/${space}` };
}

export async function openTerminalAt(dir) {
  const target = fsp.existsSync(dir) ? dir : path.join(dir);
  platformOpenTerminal(target);
  return { opened: target };
}

export async function nodeTerminal({ port } = {}) {
  const node = (await listNodes()).find((n) => n.port === Number(port));
  if (!node) throw new Error(`node ${port} not found`);
  return openTerminalAt(node.dir);
}

export async function spaceTerminal({ node, space } = {}) {
  const n = (await listNodes()).find((x) => x.port === Number(node));
  if (!n) throw new Error(`node ${node} not found`);
  return openTerminalAt(path.join(n.dir, 'usr', 'local', 'work', space));
}

export async function deleteNode({ port } = {}) {
  const n = (await listNodes()).find((x) => x.port === Number(port));
  if (!n) throw new Error(`node ${port} not found`);
  const root = path.resolve(ctxRoot());
  const dir = path.resolve(n.dir);
  if (dir === root || !dir.startsWith(path.dirname(root) + path.sep)) {
    throw new Error(`refuse to delete ${dir}: not a sibling node directory`);
  }
  try { await stopNode({ port: n.port }); } catch { /* already stopped */ }
  await fs.rm(dir, { recursive: true, force: true });
  const registry = (await readRegistry()).filter((x) => path.resolve(x.dir || '') !== dir && Number(x.port) !== n.port);
  await writeRegistry(registry);
  return { port: n.port, dir, deleted: true };
}

export async function deleteSpace({ node, space } = {}) {
  const n = (await listNodes()).find((x) => x.port === Number(node));
  if (!n) throw new Error(`node ${node} not found`);
  const base = path.resolve(n.dir, 'usr', 'local', 'work');
  const dir = path.resolve(base, space);
  if (!dir.startsWith(base + path.sep)) throw new Error('space path escapes work dir');
  try { await stopSpace({ node, space }); } catch { /* already stopped */ }
  await http(node, `/c/dream/action/remove?name=${encode(space)}`, { method: 'DELETE', timeout: 30000 });
  await fs.rm(dir, { recursive: true, force: true });
  return { node: Number(node), space, dir, deleted: true };
}

const OFFICIAL_SPACES = [
  { key: 'community', name: '云社区', prefix: '20240724', repo: 'https://shylinux.com/x/community' },
  { key: 'enterprise', name: '云办公', prefix: '20240724', repo: 'https://shylinux.com/x/enterprise' },
  { key: 'operation', name: '云研发', prefix: '20240903', repo: 'https://shylinux.com/x/operation' },
  { key: 'knowledge', name: '云知识', prefix: '20250520', repo: 'https://shylinux.com/x/knowledge' },
  { key: 'healthy', name: '云健康', prefix: '20250520', repo: 'https://shylinux.com/x/healthy' },
  { key: 'tourism', name: '云文旅', prefix: '20250520', repo: 'https://shylinux.com/x/tourism' },
  { key: 'charity', name: '云公益', prefix: '20250520', repo: 'https://shylinux.com/x/charity' },
  { key: 'education', name: '云教育', prefix: '20240724', repo: 'https://shylinux.com/x/education' },
  { key: 'industry', name: '云工业', prefix: '20250520', repo: 'https://shylinux.com/x/industry' },
  { key: 'agriculture', name: '云农业', prefix: '20250520', repo: 'https://shylinux.com/x/agriculture' },
];

function officialKey(value) {
  const text = String(value || '').trim();
  const found = OFFICIAL_SPACES.find((x) => x.key === text || x.name === text);
  return found?.key || '';
}

const PUBLISH_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

function spaceDirOf(nodeRow, space) {
  return path.join(nodeRow.dir, 'usr', 'local', 'work', space);
}

function spacePublishPath(nodeRow, space, target) {
  return path.join(spaceDirOf(nodeRow, space), 'usr', 'publish', binaryNameFor(target));
}

async function freshPublish(file) {
  const st = await fs.stat(file).catch(() => null);
  return !!st && st.isFile() && st.size > 5 * 1024 * 1024 && Date.now() - st.mtimeMs <= PUBLISH_MAX_AGE_MS;
}

async function ensureSpacePublished({ node, space, target = '', onLog = null }) {
  const row = (await listNodes()).find((n) => Number(n.port) === Number(node));
  if (!row?.dir) throw new Error(`node :${node} not found`);
  const t = normalizeTarget(target || row.platform || hostTarget().id);
  const file = spacePublishPath(row, space, t);
  if (await freshPublish(file)) return { file, target: t.id };
  onLog?.(`[publish] ${space} 缺少/过期 ${binaryNameFor(t)}，调用 /s/${space}/c/compile/${t.os}/${t.arch}\n`);
  const r = await http(node, `/s/${encode(space)}/c/compile/${t.os}/${t.arch}`, { method: 'POST', timeout: 180000, auth: false });
  if (r.status !== 200) throw new Error(`compile ${space} -> HTTP ${r.status}`);
  await waitFor(() => freshPublish(file), { timeout: 60000, interval: 1000, label: `${space} publish ${binaryNameFor(t)}` });
  return { file, target: t.id };
}

async function findStandardSpaceBinary({ node, exclude = '', space = '', target = '', onLog = null }) {
  const rows = await listNodes();
  const ordered = rows.filter((n) => Number(n.port) !== Number(node) && n.state === 'running');
  const official = new Set(OFFICIAL_SPACES.map((x) => x.key));
  for (const n of ordered) {
    if (!n?.dir) continue;
    let spaces = [];
    try { spaces = await listSpaces({ node: n.port }); } catch { continue; }
    for (const s of spaces) {
      const name = String(s.name || '');
      const key = OFFICIAL_SPACES.find((x) => name.endsWith(`-${x.key}`))?.key;
      if (!key || !official.has(key)) continue;
      if (space && name !== space) continue;
      if (Number(n.port) === Number(node) && name === exclude) continue;
      try {
        const t = normalizeTarget(target || n.platform || hostTarget().id);
        const file = path.join(n.dir, 'usr', 'local', 'work', name, 'usr', 'publish', binaryNameFor(t));
        if (await freshPublish(file)) return { file, space: name, node: n.port };
        onLog?.(`[publish] ${name} 没有可复制的 ${binaryNameFor(t)}\n`);
      } catch (e) {
        onLog?.(`[publish] ${name} 不可用：${String(e?.message || e)}\n`);
      }
    }
  }
  return null;
}

async function copyPublishIntoSpace({ node, space, target = '', onLog = null }) {
  const row = (await listNodes()).find((n) => Number(n.port) === Number(node));
  if (!row?.dir) throw new Error(`node :${node} not found`);
  const t = normalizeTarget(target || row.platform || hostTarget().id);
  const src = await findStandardSpaceBinary({ node, exclude: space, space, target: t.id, onLog });
  if (!src) throw new Error(`其他服务节点没有同名空间 ${space}`);
  const dir = spaceDirOf(row, space);
  const destPublish = path.join(dir, 'usr', 'publish', binaryNameFor(t));
  const destBin = path.join(dir, 'bin', 'ice.bin');
  await fs.mkdir(path.dirname(destPublish), { recursive: true });
  await fs.mkdir(path.dirname(destBin), { recursive: true });
  onLog?.(`$ cp -f ${JSON.stringify(src.file)} ${JSON.stringify(destPublish)}\n`);
  onLog?.(`$ cp -f ${JSON.stringify(src.file)} ${JSON.stringify(destBin)}\n`);
  await fs.copyFile(src.file, destPublish);
  await fs.copyFile(src.file, destBin);
  await fs.chmod(destPublish, 0o755);
  await fs.chmod(destBin, 0o755);
  onLog?.(`[copy] ${src.space || `node :${src.node}`}:${path.basename(src.file)} -> ${destPublish}\n`);
  return { source: src.file, sourceSpace: src.space, dest: destPublish, target: t.id };
}

function moduleTail(value) {
  const s = String(value || '').trim();
  const i = s.indexOf('//');
  return (i >= 0 ? s.slice(i + 2) : s).replace(/^\/+|\/+$/g, '');
}

async function verifySpaceModule({ node, space, repo, onLog = null }) {
  const r = await http(node, `/s/${encode(space)}/c/runtime`, { timeout: 15000, auth: false });
  if (r.status !== 200) throw new Error(`runtime HTTP ${r.status}`);
  let env;
  try { env = JSON.parse(r.text); } catch { throw new Error('runtime 不是 JSON'); }
  const raw = Array.isArray(env.result) ? env.result[0] : env.result;
  const body = typeof raw === 'string' ? JSON.parse(raw) : raw;
  const actual = body?.make?.module || body?.module || env?.make?.module || '';
  const want = moduleTail(repo);
  const got = moduleTail(actual);
  onLog?.(`[verify] ${space} make.module=${got || '-'} expected=${want}\n`);
  if (!got || got !== want) throw new Error(`空间 ${space} make.module=${got || '(空)'}，期望 ${want}`);
  return { module: got, expected: want };
}

async function stopStartSpace(node, space) {
  const q = encode(space);
  await http(node, `/c/dream/action/stop?name=${q}`, { method: 'POST', timeout: 120000, auth: false }).catch(() => null);
  await new Promise((r) => setTimeout(r, 1200));
  await http(node, `/c/dream/action/start?name=${q}`, { method: 'POST', timeout: 120000, auth: false });
  await waitFor(async () => {
    const r = await http(node, `/s/${q}/c/runtime`, { timeout: 5000, auth: false }).catch(() => null);
    return !!r && r.status === 200;
  }, { timeout: 60000, interval: 1200, label: `space ${space} started` });
}

export async function deployOfficialSpaces({ node, keys = [], binaryMode = false, copyMode = false, target = '', onProgress = null } = {}) {
  const wanted = new Set((keys || []).map(officialKey).filter(Boolean));
  if (!wanted.size) throw new Error('choose at least one official space');
  const existing = await listSpaces({ node });
  const out = [];
  const webBase = 'https://web.shylinux.com/s';
  let done = 0;
  const tick = (key, space = '', name = '') => {
    done += 1;
    onProgress?.({ done, total: wanted.size, key, name, space });
  };
  for (const item of OFFICIAL_SPACES.filter((x) => wanted.has(x.key))) {
    // Standard spaces keep their canonical date prefix (20240724/20240903/20250520),
    // not today's date; reuse only the exact prefixed name.
    const fullName = `${item.prefix}-${item.key}`;
    onProgress?.({ done, total: wanted.size, key: item.key, name: item.name, space: fullName, current: true });
    // 镜像/二进制安装：应用平台按空间给出完整 web 包，不再 dream build。
    // copy 模式不传 binary：先建 name+repos，再从已发布的标准空间复制程序文件。
    const binary = !copyMode && binaryMode ? `${webBase}/${fullName}` : '';
    const found = existing.find((s) => s.name === fullName);
    if (found) {
      let repaired = false;
      let warning = '';
      let copied = null;
      if (!binaryMode && !copyMode) {
        try {
          const nodeBin = path.join((await listNodes()).find((x) => x.port === Number(node))?.dir || '', 'bin', 'ice.bin');
          const spaceBin = path.join((await listNodes()).find((x) => x.port === Number(node))?.dir || '', 'usr', 'local', 'work', found.name, 'bin', 'ice.bin');
          const same = nodeBin && fsp.existsSync(nodeBin) && fsp.existsSync(spaceBin) && fsp.statSync(nodeBin).size === fsp.statSync(spaceBin).size;
          if (!fsp.existsSync(spaceBin) || same) { await buildSpace({ node, space: found.name }); repaired = true; }
        } catch (e) { warning = String(e?.message || e); }
      }
      if (copyMode) {
        try {
          copied = await copyPublishIntoSpace({ node, space: found.name, target, onLog: (t) => void appendDeployLog(Number(node), t) });
        } catch (e) {
          // 只有本机有该标准空间时没有同名源可复制；已有空间直接复用，不能因此中断整个初始化。
          await appendDeployLog(Number(node), `[copy] ${String(e?.message || e)}，复用本机已有空间 ${found.name}\n`);
          copied = { source: '', dest: '', reused: true };
        }
        await stopStartSpace(node, found.name);
        repaired = true;
      }
      const warm = await warmSpace({ node, space: found.name });
      let verified;
      try { verified = await verifySpaceModule({ node, space: found.name, repo: item.repo, onLog: (t) => void appendDeployLog(Number(node), t) }); }
      catch (e) { out.push({ ...item, space: found.name, reused: true, error: String(e?.message || e) }); tick(item.key, found.name, item.name); continue; }
      out.push({ ...item, space: found.name, reused: true, repaired, binary, copied, warning, warm, verified });
      tick(item.key, found.name, item.name);
      continue;
    }
    try {
      const webPackage = `${webBase}/${fullName}`;
      let created = null;
      let binaryUsed = binary;
      let built = false;
      let warning = '';
      let copied = null;
      if (copyMode) {
        const src = await findStandardSpaceBinary({ node, space: fullName, target, onLog: (t) => void appendDeployLog(Number(node), t) });
        if (src) {
          created = await createSpace({ node, name: fullName, repos: item.repo, soft: true });
          copied = await copyPublishIntoSpace({ node, space: created.name, target, onLog: (t) => void appendDeployLog(Number(node), t) });
          await stopStartSpace(node, created.name);
        } else {
          try {
            created = await createSpace({ node, name: fullName, repos: item.repo, binary: webPackage });
            binaryUsed = webPackage;
            await appendDeployLog(Number(node), `[copy] 其他节点没有同名空间，改用 binary：${webPackage}\n`);
          } catch (e) {
            warning = `binary 下载失败：${String(e?.message || e)}`;
            await appendDeployLog(Number(node), `[copy] ${warning}，改走 build\n`);
            created = await createSpace({ node, name: fullName, repos: item.repo });
            await buildSpace({ node, space: created.name });
            built = true;
          }
        }
      } else if (binaryMode) {
        try {
          created = await createSpace({ node, name: fullName, repos: item.repo, binary: webPackage });
        } catch (e) {
          warning = `binary 下载失败：${String(e?.message || e)}`;
          await appendDeployLog(Number(node), `[binary] ${warning}，改走 build\n`);
          created = await createSpace({ node, name: fullName, repos: item.repo });
          await buildSpace({ node, space: created.name });
          built = true;
        }
      } else {
        created = await createSpace({ node, name: fullName, repos: item.repo });
        await buildSpace({ node, space: created.name });
        built = true;
      }
      const warm = await warmSpace({ node, space: created.name });
      let verified;
      try { verified = await verifySpaceModule({ node, space: created.name, repo: item.repo, onLog: (t) => void appendDeployLog(Number(node), t) }); }
      catch (e) { out.push({ ...item, space: created.name, reused: false, error: String(e?.message || e) }); tick(item.key, created.name, item.name); continue; }
      out.push({ ...item, space: created.name, reused: false, built, binary: binaryUsed, copied, warning, warm, verified });
      tick(item.key, created.name, item.name);
    } catch (e) {
      out.push({ ...item, error: String(e?.message || e) });
      tick(item.key, '');
    }
  }
  return out;
}

/** 一条命令的容器引导：官方脚本在容器内下载/启动，容器 9020 映射到宿主端口。 */
export async function dockerBootstrap({ port = 9188, image = 'alpine:3.20', method = 'binary', server = '', ctxName = '', name = '' } = {}) {
  const p = Number(port) || 9188;
  const img = String(image || 'alpine:3.20');
  const cname = String(name || `contextos-${p}`);
  const mode = method === 'source' ? 'source' : 'binary';
  const dev = String(server || process.env.CTX_DEV || 'https://shylinux.com').replace(/'/g, "'\\''");
  const dirName = String(ctxName || 'ContextOS').replace(/[^A-Za-z0-9._-]/g, '') || 'ContextOS';
  const check = await runShell('docker version --format "{{.Server.Version}}"', undefined, { timeoutMs: 15000 });
  if (check.code !== 0) throw new Error(`Docker 不可用：${(check.err || check.out || '').trim().slice(0, 200)}`);
  await runShell(`docker rm -f ${JSON.stringify(cname)}`, undefined, { timeoutMs: 30000 });
  const deps = mode === 'source'
    ? 'apk add --no-cache git curl >/dev/null 2>&1 || apk add --no-cache git >/dev/null 2>&1 || true;'
    : 'apk add --no-cache curl >/dev/null 2>&1 || true;';
  const script = [
    'set -e',
    `export ctx_dev='${dev}' ctx_name='${dirName}'`,
    deps,
    'tmp=$(mktemp)',
    'if command -v curl >/dev/null 2>&1; then curl -o "$tmp" -fsSL "$ctx_dev"; else wget -O "$tmp" -q "$ctx_dev"; fi',
    `. "$tmp" ${mode}`,
  ].join('\n');
  const sq = (v) => `'${String(v).replace(/'/g, "'\\''")}'`;
  const cmd = `docker run -d --name ${JSON.stringify(cname)} --restart unless-stopped -p ${p}:9020 -w /root ${JSON.stringify(img)} sh -lc ${sq(script)}`;
  const emit = (t) => { if (t) void appendDeployLog(p, t); };
  emit(`\n$ ${cmd}\n`);
  const r = await runShell(cmd, undefined, { timeoutMs: 300000, onChunk: (s) => emit(s) });
  if (r.code !== 0) throw new Error(`容器启动失败：${(r.err || r.out || '').trim().slice(0, 300)}`);
  const id = (r.out || '').trim().split('\n').pop();
  const url = `http://127.0.0.1:${p}/c/runtime`;
  const deadline = Date.now() + 180000;
  let ok = false;
  let lastLog = '';
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(2500) });
      if (res.ok) { ok = true; break; }
    } catch { /* container booting */ }
    const logs = await runShell(`docker logs --tail 8 ${JSON.stringify(cname)} 2>&1`, undefined, { timeoutMs: 5000 }).catch(() => null);
    const text = (logs?.out || logs?.err || '').trim();
    if (text && text !== lastLog) { lastLog = text; emit(`[container]\n${text}\n`); }
    await new Promise((x) => setTimeout(x, 2000));
  }
  if (!ok) throw new Error(`容器已启动（${String(id).slice(0, 12)}），但 :${p} 的 /c/runtime 未就绪；docker logs ${cname}`);
  emit(`\n[container] ready ${cname} :${p}->9020 ${img} ${mode}\n`);
  return { container: cname, id, port: p, image: img, method: mode, url: `http://127.0.0.1:${p}/` };
}

export async function dockerDeploy({ port = 9188, dir = '', image = '', name = '' } = {}) {
  const p = Number(port) || 9188;
  const img = String(image || 'shylinux/contextos:latest');
  const check = await runShell('docker version --format "{{.Server.Version}}"', undefined, { timeoutMs: 15000 });
  if (check.code !== 0) throw new Error(`Docker 不可用：${(check.err || check.out || '').trim().slice(0, 160)}`);
  const cname = String(name || `contextos-${p}`);
  await runShell(`docker rm -f ${cname}`, undefined, { timeoutMs: 30000 });
  const hostDir = dir ? `-v ${JSON.stringify(String(dir))}:/data` : '';
  const r = await runShell(`docker run -d --name ${cname} -p ${p}:${p} ${hostDir} ${JSON.stringify(img)}`, undefined, { timeoutMs: 300000 });
  if (r.code !== 0) throw new Error(`容器启动失败：${(r.err || r.out || '').trim().slice(0, 240)}`);
  const id = (r.out || '').trim().split('\n').pop();
  const deadline = Date.now() + 60000;
  let ok = false;
  while (Date.now() < deadline) {
    const url = `http://127.0.0.1:${p}/c/runtime`;
    const started = Date.now();
    traceDeployRequest(p, 'GET', url);
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
      const text = await res.text();
      traceDeployResponse(p, { method: 'GET', url, status: res.status, ms: Date.now() - started, size: Buffer.byteLength(text), text });
      if (res.ok) { ok = true; break; }
    } catch (e) {
      traceDeployResponse(p, { method: 'GET', url, error: String(e?.message || e) });
    }
    await new Promise((x) => setTimeout(x, 1500));
  }
  if (!ok) throw new Error(`容器已启动（${id.slice(0, 12)}），但 :${p} 的 /c/runtime 未就绪，请检查镜像入口`);
  return { container: cname, id, port: p, image: img };
}

/** 远程部署：通过 ssh 在远端执行 docker run。 */
export async function remoteDeploy({ host = '', user = '', sshPort = 22, port = 9188, dir = '', image = '' } = {}) {
  if (!host) throw new Error('远程主机不能为空');
  const p = Number(port) || 9188;
  const img = String(image || 'shylinux/contextos:latest');
  const target = `${user ? `${user}@` : ''}${host}`;
  const script = `docker rm -f contextos-${p} >/dev/null 2>&1; docker run -d --name contextos-${p} -p ${p}:${p} ${dir ? `-v ${JSON.stringify(String(dir))}:/data` : ''} ${JSON.stringify(img)}`;
  const ssh = `ssh -p ${Number(sshPort) || 22} -o BatchMode=yes -o StrictHostKeyChecking=no -o ConnectTimeout=8 ${JSON.stringify(target)} ${JSON.stringify(script)}`;
  const r = await runShell(ssh, undefined, { timeoutMs: 120000 });
  if (r.code !== 0) throw new Error(`远程部署失败：${(r.err || r.out || '').trim().slice(0, 240)}`);
  return { host, port: p, target, id: (r.out || '').trim() };
}

/** 远程连接：登录远端节点换 sessid。 */
export async function remoteLogin({ url = '', user = '', pass = '' } = {}) {
  const base = String(url || '').trim().replace(/\/+$/, '');
  if (!/^https?:\/\//.test(base)) throw new Error('远程地址必须以 http:// 或 https:// 开头');
  const attempts = [];
  const pick = (headers, text) => {
    const cookie = headers.get('set-cookie') || '';
    const m = /sessid=([^;]+)/.exec(cookie);
    if (m) return m[1];
    try { const j = JSON.parse(text); return j.sessid || (j.data && j.data.sessid) || ''; } catch { return ''; }
  };
  const rp = Number(new URL(base).port) || (base.startsWith('https:') ? 443 : 80);
  const loginUrl = `${base}/c/aaa.user/action/login?name=${encodeURIComponent(user)}&pass=${encodeURIComponent(pass)}`;
  try {
    const started = Date.now();
    traceDeployRequest(rp, 'POST', loginUrl);
    const r = await fetch(loginUrl, { method: 'POST', redirect: 'manual', signal: AbortSignal.timeout(12000) });
    const text = await r.text();
    traceDeployResponse(rp, { method: 'POST', url: loginUrl, status: r.status, ms: Date.now() - started, size: Buffer.byteLength(text), text });
    const sid = pick(r.headers, text);
    if (sid) return { url: base, sessid: sid, user, via: 'login' };
    attempts.push(`login HTTP ${r.status}`);
  } catch (e) { traceDeployResponse(rp, { method: 'POST', url: loginUrl, error: String(e?.message || e) }); attempts.push(`login ${e.message}`); }
  const sessUrl = `${base}/c/aaa.sess/action/create/${encodeURIComponent(user || 'shy')}`;
  try {
    const started = Date.now();
    traceDeployRequest(rp, 'PUT', sessUrl);
    const r = await fetch(sessUrl, { method: 'PUT', signal: AbortSignal.timeout(12000) });
    const text = await r.text();
    traceDeployResponse(rp, { method: 'PUT', url: sessUrl, status: r.status, ms: Date.now() - started, size: Buffer.byteLength(text), text });
    const sid = pick(r.headers, text) || String(text || '').trim().split('\n').pop();
    if (sid && sid.length > 8) return { url: base, sessid: sid, user, via: 'sess' };
    attempts.push(`sess HTTP ${r.status}`);
  } catch (e) { traceDeployResponse(rp, { method: 'PUT', url: sessUrl, error: String(e?.message || e) }); attempts.push(`sess ${e.message}`); }
  throw new Error(`登录失败：${attempts.join(' / ')}`);
}

export async function runPipeline({ port = 9188, space = 'devops_demo', app = 'note' } = {}) {
  const steps = [];
  const step = async (name, fn) => {
    const started = Date.now();
    try {
      const value = await fn();
      steps.push({ step: name, ok: true, ms: Date.now() - started, value });
      return value;
    } catch (error) {
      steps.push({ step: name, ok: false, ms: Date.now() - started, error: String(error?.message || error) });
      throw Object.assign(new Error(`${name}: ${error?.message || error}`), { steps });
    }
  };

  const node = await step('deploy-node', () => deployNode({ port }));
  const created = await step('create-space', () => createSpace({ node: port, name: space }));
  const createdApp = await step('create-app', () => createApp({ node: port, space: created.name, name: app }));
  const written = await step('write-data', () =>
    writeData({
      node: port,
      space: created.name,
      command: createdApp.command,
      fields: { user_uid: 'root', title: 'ContextOS DevOps', content: `pipeline ${new Date().toISOString()}` },
    }),
  );
  await step('read-back', async () => {
    const data = await readData({ node: port, space: created.name, command: createdApp.command });
    const titles = data.rows.map((row) => row.title || '').join(' ');
    if (!data.rows.length || !/ContextOS DevOps/.test(titles)) {
      throw new Error(`read-back did not contain the written record (count ${data.count || 'empty'})`);
    }
    return data;
  });
  return {
    ok: true,
    node: port,
    space: created.name,
    app: createdApp,
    count: written.count,
    steps,
  };
}



// ── DSH intent layer ─────────────────────────────────────────────
// The chat op is a thin intent parser: DSH llm.stream turns one natural
// language line into {reply, action}; execution stays in the explicit ops.
