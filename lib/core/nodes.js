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
import { listNodes, readRegistry, writeRegistry } from '../base/registry.js';
import { buildSpace, createSpace, listSpaces, startSpace, stopSpace, warmSpace } from './spaces.js';

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

async function downloadBinary(dir, parent) {
  const file = binaryName();
  const bases = [parent, 'https://shylinux.com'].map((u) => (u || '').replace(/\/$/, '')).filter(Boolean);
  const urls = [...new Set(bases.map((b) => `${b}/publish/${file}`))];
  let last;
  for (const url of urls) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(60000) });
      if (!res.ok) { last = `HTTP ${res.status}`; continue; }
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length < 1024 * 1024) { last = `too small (${buf.length}B)`; continue; }
      await fs.writeFile(path.join(dir, 'bin', 'ice.bin'), buf, { mode: 0o755 });
      return { url, size: buf.length };
    } catch (e) {
      last = String(e?.message || e);
    }
  }
  throw new Error(`download failed (${last}); tried ${urls.join(', ')}`);
}

export async function deployNode({ port = 9188, name = '', mode = 'auto', parent = '', repo = '', sourceBin = '', dir: installDir = '' } = {}) {
  port = Number(port);
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('port must be 1024..65535');
  if (!(await portFree(port))) throw new Error(`port ${port} is already in use`);

  const root = ctxRoot();
  const dir = installDir
    ? path.resolve(String(installDir).replace(/^~(?=$|\/)/, HOME()))
    : path.join(path.dirname(root), `${path.basename(root)}-${port}`);
  if (path.resolve(dir) === path.resolve(root)) throw new Error('refuse to deploy over the running root');
  const existing = (await listNodes()).find((n) => n.port === port && n.dir === dir);
  if (existing?.live) return { ...existing, reused: true };
  if (fsp.existsSync(path.join(dir, 'bin', 'ice.bin'))) {
    throw new Error(`directory ${dir} already has bin/ice.bin; choose another port or remove it yourself`);
  }

  let sourceTag = '';
  const gitOk = (await runShell('git --version', dir).catch(() => ({ code: 1 }))).code === 0;
  const goOk = (await runShell('go version', dir).catch(() => ({ code: 1 }))).code === 0;
  const hasRepo = fsp.existsSync(path.join(dir, '.git'));
  const canBuild = hasRepo && goOk && fsp.existsSync(path.join(dir, 'etc', 'miss.sh'));
  const cloneRepo = async () => {
    const targetRepo = repo || 'https://shylinux.com/x/ContextOS';
    if (fsp.existsSync(dir) && !hasRepo) {
      const entries = fsp.readdirSync(dir);
      if (entries.length) throw new Error(`directory ${dir} exists and is not a git repo`);
    }
    const target = `'${dir.replace(/'/g, "'\\''")}'`;
    const r = await runShell(`git clone --progress ${JSON.stringify(targetRepo)} ${target}`, path.dirname(dir), { timeoutMs: 300000 });
    if (r.code !== 0) throw new Error(`git clone failed (${r.code}): ${r.err.slice(-400)}`);
  };
  if (mode === 'auto' || mode === 'source') {
    if (!hasRepo) await cloneRepo();
    if (!fsp.existsSync(path.join(dir, 'etc', 'miss.sh'))) throw new Error('clone done but etc/miss.sh missing — not a ContextOS repo');
  }
  if (mode === 'source') {
    if (!goOk) throw new Error('go is required for source mode');
    const b = await runShell('source ./etc/miss.sh', dir, { timeoutMs: 600000 });
    if (b.code !== 0) throw new Error(`build failed (${b.code}): ${b.err.slice(-500)}`);
    if (!fsp.existsSync(path.join(dir, 'bin', 'ice.bin'))) throw new Error('build produced no bin/ice.bin');
    sourceTag = `git:${repo || 'default'}+build`;
  } else if (mode === 'auto' && canBuild) {
    const b = await runShell('source ./etc/miss.sh', dir, { timeoutMs: 600000 });
    if (b.code === 0 && fsp.existsSync(path.join(dir, 'bin', 'ice.bin'))) sourceTag = `git:${repo || 'default'}+build`;
    else sourceTag = '';
  }
  if (!sourceTag && mode !== 'source') {
    await fs.mkdir(path.join(dir, 'bin'), { recursive: true });
    let copied = '';
    try {
      const source = sourceBin || (await findBinary(root));
      await fs.copyFile(source, path.join(dir, 'bin', 'ice.bin'));
      await fs.chmod(path.join(dir, 'bin', 'ice.bin'), 0o755);
      copied = `copy:${source}`;
    } catch { /* try other nodes, then download */ }
    if (!copied) {
      const other = (await listNodes()).find((n) => n.port !== port && n.bin && fsp.existsSync(n.bin));
      if (other) {
        await fs.copyFile(other.bin, path.join(dir, 'bin', 'ice.bin'));
        await fs.chmod(path.join(dir, 'bin', 'ice.bin'), 0o755);
        copied = `copy:${other.dir}`;
      }
    }
    if (!copied) {
      const dl = await downloadBinary(dir, parent);
      copied = `download:${dl.url}`;
    }
    const actual = await targetOfBinary(path.join(dir, 'bin', 'ice.bin'));
    if (actual && !actual.endsWith('.universal') && actual !== platformName()) throw new Error(`platform mismatch: want ${platformName()}, got ${actual}`);
    sourceTag = copied;
  }
  const nodeName = name ? (/^ContextOS/i.test(name) ? name : `ContextOS-${name}`) : `ContextOS-${port}`;
  const node = { dir, bin: path.join(dir, 'bin', 'ice.bin'), name: nodeName, port, parent };
  await writeLauncherMeta(node, sourceTag);
  const started = await startNode({ port });
  await saveRecord(node, sourceTag);
  return { ...node, ...started, source: sourceTag, mode };
}

export async function startNode({ port } = {}) {
  const node = (await listNodes()).find((n) => n.port === Number(port));
  if (!node) throw new Error(`node ${port} not found (deploy or register it first)`);
  if (node.state === 'running') return { port: node.port, state: 'running', note: 'already running' };
  if (!node.hasBin && !(await binExists(node))) throw new Error('no bin/ice.bin — deploy first');

  await fs.mkdir(path.join(node.dir, 'var', 'log'), { recursive: true });
  const logPath = path.join(node.dir, 'var', 'log', 'deploy.log');
  const out = fsp.openSync(logPath, 'a');
  const child = spawn(path.join(node.dir, 'bin', 'ice.bin'), launchArgs(node.port, node.parent), {
    cwd: node.dir,
    detached: true,
    stdio: ['ignore', out, out],
    env: { ...process.env },
  });
  child.unref();
  fsp.closeSync(out);

  try {
    await waitFor(async () => (await probe(node.port, 1000)).live, { timeout: 75000, interval: 1000, label: `node ${node.port} up` });
  } catch (e) {
    throw new Error(`node ${node.port} not ready: ${String(e?.message || e)} — log ${logPath}`);
  }
  return { port: node.port, state: 'running', dir: node.dir, url: `http://localhost:${node.port}/`, pid: child.pid };
}

export async function stopNode({ port } = {}) {
  const node = (await listNodes()).find((n) => n.port === Number(port));
  if (!node) throw new Error(`node ${port} not found`);
  if (node.state !== 'running') return { port: Number(port), state: 'stopped', note: 'already stopped' };
  try {
    await http(Number(port), '/c/quit', { timeout: 3000 });
  } catch {
    /* quit endpoint may 405/close; fall through to pid */
  }
  try {
    await waitFor(async () => !(await probe(Number(port), 1000)).live, { timeout: 20000, interval: 500, label: `node ${port} down` });
  } catch {
    const pid = Number((await fs.readFile(path.join(node.dir, 'var', 'log', 'ice.pid'), 'utf8')).trim());
    if (pid > 1) { try { process.kill(pid, 'SIGTERM'); } catch {} }
    await waitFor(async () => !(await probe(Number(port), 1000)).live, { timeout: 15000, interval: 500, label: `node ${port} down (pid)` });
  }
  return { port: Number(port), state: 'stopped' };
}

export async function openNode({ port } = {}) {
  const node = (await listNodes()).find((n) => n.port === Number(port));
  if (!node) throw new Error(`node ${port} not found`);
  platformOpenBrowser(`http://localhost:${node.port}/`);
  return { opened: `http://localhost:${node.port}/` };
}

export async function openSpace({ node, space } = {}) {
  platformOpenBrowser(`http://localhost:${Number(node)}/s/${encodeURIComponent(space)}/`);
  return { opened: `http://localhost:${Number(node)}/s/${space}/` };
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
  { key: 'education', name: '云教育', prefix: '20240724', repo: 'https://shylinux.com/x/education' },
  { key: 'healthy', name: '云健康', prefix: '20250520', repo: 'https://shylinux.com/x/healthy' },
  { key: 'tourism', name: '云文旅', prefix: '20250520', repo: 'https://shylinux.com/x/tourism' },
  { key: 'charity', name: '云公益', prefix: '20250520', repo: 'https://shylinux.com/x/charity' },
  { key: 'industry', name: '云工业', prefix: '20250520', repo: 'https://shylinux.com/x/industry' },
  { key: 'agriculture', name: '云农业', prefix: '20250520', repo: 'https://shylinux.com/x/agriculture' },
];

function officialKey(value) {
  const text = String(value || '').trim();
  const found = OFFICIAL_SPACES.find((x) => x.key === text || x.name === text);
  return found?.key || '';
}

export async function deployOfficialSpaces({ node, keys = [] } = {}) {
  const wanted = new Set((keys || []).map(officialKey).filter(Boolean));
  if (!wanted.size) throw new Error('choose at least one official space');
  const existing = await listSpaces({ node });
  const out = [];
  for (const item of OFFICIAL_SPACES.filter((x) => wanted.has(x.key))) {
    // Standard spaces keep their canonical date prefix (20240724/20240903/20250520),
    // not today's date; reuse only the exact prefixed name.
    const fullName = `${item.prefix}-${item.key}`;
    const found = existing.find((s) => s.name === fullName);
    if (found) {
      let repaired = false;
      let warning = '';
      try {
        const nodeBin = path.join((await listNodes()).find((x) => x.port === Number(node))?.dir || '', 'bin', 'ice.bin');
        const spaceBin = path.join((await listNodes()).find((x) => x.port === Number(node))?.dir || '', 'usr', 'local', 'work', found.name, 'bin', 'ice.bin');
        const same = nodeBin && fsp.existsSync(nodeBin) && fsp.existsSync(spaceBin) && fsp.statSync(nodeBin).size === fsp.statSync(spaceBin).size;
        if (!fsp.existsSync(spaceBin) || same) { await buildSpace({ node, space: found.name }); repaired = true; }
      } catch (e) { warning = String(e?.message || e); }
      const warm = await warmSpace({ node, space: found.name });
      out.push({ ...item, space: found.name, reused: true, repaired, warning, warm });
      continue;
    }
    try {
      const created = await createSpace({ node, name: fullName, repos: item.repo });
      let built = false;
      let warning = '';
      try { await buildSpace({ node, space: created.name }); built = true; }
      catch (e) { warning = String(e?.message || e); }
      const warm = await warmSpace({ node, space: created.name });
      out.push({ ...item, space: created.name, reused: false, built, warning, warm });
    } catch (e) {
      out.push({ ...item, error: String(e?.message || e) });
    }
  }
  return out;
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
    try {
      const res = await fetch(`http://127.0.0.1:${p}/c/runtime`, { signal: AbortSignal.timeout(3000) });
      if (res.ok) { ok = true; break; }
    } catch { /* retry */ }
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
  try {
    const r = await fetch(`${base}/c/aaa.user/action/login?name=${encodeURIComponent(user)}&pass=${encodeURIComponent(pass)}`, { method: 'POST', redirect: 'manual', signal: AbortSignal.timeout(12000) });
    const text = await r.text();
    const sid = pick(r.headers, text);
    if (sid) return { url: base, sessid: sid, user, via: 'login' };
    attempts.push(`login HTTP ${r.status}`);
  } catch (e) { attempts.push(`login ${e.message}`); }
  try {
    const r = await fetch(`${base}/c/aaa.sess/action/create/${encodeURIComponent(user || 'shy')}`, { method: 'PUT', signal: AbortSignal.timeout(12000) });
    const text = await r.text();
    const sid = pick(r.headers, text) || String(text || '').trim().split('\n').pop();
    if (sid && sid.length > 8) return { url: base, sessid: sid, user, via: 'sess' };
    attempts.push(`sess HTTP ${r.status}`);
  } catch (e) { attempts.push(`sess ${e.message}`); }
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
