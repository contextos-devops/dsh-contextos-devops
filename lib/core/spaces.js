// 核心业务：项目空间生命周期（列表/启停/编译/路径）。
import path from 'node:path';
import fsp from 'node:fs';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { http, encode, baseUrl } from '../base/http.js';
import { listNodes } from '../base/registry.js';
import { parseFixedTable } from '../base/table.js';
import { waitFor } from '../misc/async.js';
import { goTidyBuild } from './gobuild.js';
import { execFile as execFileCb } from 'node:child_process';
import { promisify } from 'node:util';
const execFileAsync = promisify(execFileCb);

/** 空间绝对路径：有 space 时落到 usr/local/work/<space>，否则节点根。 */
export function baseDirOf(n, space) {
  return space ? path.join(n.dir, 'usr', 'local', 'work', space) : n.dir;
}

function hashFile(file) {
  try { return crypto.createHash('sha256').update(fsp.readFileSync(file)).digest('hex'); } catch { return ''; }
}
async function ensureSpaceBinary(n, space, { force = false, allowNode = true } = {}) {
  const dir = path.join(n.dir, 'usr', 'local', 'work', space);
  const nodeBin = path.join(n.dir, 'bin', 'ice.bin');
  const spaceBin = path.join(dir, 'bin', 'ice.bin');
  if (!fsp.existsSync(nodeBin)) throw new Error(`node :${n.port} has no bin/ice.bin`);
  await fsp.promises.mkdir(path.join(dir, 'bin'), { recursive: true });
  const nodeHash = hashFile(nodeBin);
  const current = fsp.existsSync(spaceBin) ? hashFile(spaceBin) : '';
  if (!force && current && current !== nodeHash) return { path: spaceBin, from: 'existing' };
  const peers = await listNodes();
  const other = peers.filter((x) => x.port !== n.port && x.dir)
    .map((x) => ({ n: x, bin: path.join(x.dir, 'usr', 'local', 'work', space, 'bin', 'ice.bin') }))
    .find((x) => fsp.existsSync(x.bin) && hashFile(x.bin) !== hashFile(path.join(x.n.dir, 'bin', 'ice.bin')));
  if (other?.bin) {
    await fsp.promises.copyFile(other.bin, spaceBin);
    await fsp.promises.chmod(spaceBin, 0o755);
    return { path: spaceBin, from: `space:${other.n.dir}` };
  }
  if (!allowNode) throw new Error(`space ${space} has no compiled binary and no peer space binary to copy`);
  await fsp.promises.copyFile(nodeBin, spaceBin);
  await fsp.promises.chmod(spaceBin, 0o755);
  return { path: spaceBin, from: 'node-bootstrap' };
}

export async function spaceBase({ node, space }) {
  const n = (await listNodes()).find((x) => x.port === Number(node));
  if (!n) throw new Error(`node ${node} not found`);
  return baseDirOf(n, space);
}

/** 项目空间的绝对路径（终端 cwd 用）。 */
export async function spaceDir({ node, space } = {}) {
  const n = (await listNodes()).find((x) => x.port === Number(node));
  if (!n) throw new Error(`node ${node} not found`);
  return { dir: baseDirOf(n, space) };
}

export async function startSpace({ node, space } = {}) {
  await http(Number(node), `/c/dream/action/start?name=${encode(space)}&space.noecho=true`, { method: 'POST', timeout: 60000 });
  return { node: Number(node), space, state: 'start' };
}

export async function stopSpace({ node, space } = {}) {
  await http(Number(node), `/c/dream/action/stop?name=${encode(space)}&space.noecho=true`, { method: 'POST', timeout: 60000 });
  return { node: Number(node), space, state: 'stop' };
}

export async function compileSpace({ node, space } = {}) {
  const r = await http(node, `/s/${encode(space)}/c/vimer/action/compile`, { method: 'POST', timeout: 120000 });
  return { status: r.status, out: String(r.text || '').slice(0, 4000) };
}

export async function listSpaces({ node } = {}) {
  const r = await http(node, '/c/dream', { timeout: 10000 });
  const table = parseFixedTable(r.text);
  return table.rows
    .filter((row) => /^\d{8}-[A-Za-z0-9_-]+$/.test(row.name || ''))
    .map((row) => ({
      name: row.name,
      help: (() => { try { return decodeURIComponent(row.help || ''); } catch { return row.help || ''; } })(),
      type: row.type || '',
      status: row.status === 'start' ? 'start' : row.status === 'stop' ? 'stop' : row.status || '',
      running: row.status === 'start',
      version: row.version || '',
      builtAt: (() => {
        const raw = String(row.time || '');
        try { return decodeURIComponent(raw).replace(/\+/g, ' ').slice(0, 19); } catch { return raw.slice(0, 19); }
      })(),
      size: row.size || '',
      dreamStatus: row.status || '',
      icons: (() => { try { return decodeURIComponent(row.icons || ''); } catch { return row.icons || ''; } })(),
    }))
    // 排序：运行中优先，其次名称倒序（新日期在前）
    .sort((a, b) => {
      const ar = a.running ? 1 : 0, br = b.running ? 1 : 0;
      if (ar !== br) return br - ar;
      return String(b.name || '').localeCompare(String(a.name || ''), 'zh-CN', { numeric: true });
    });
}

export async function initSpace({ node, space, repos = '' } = {}) {
  const n = (await listNodes()).find((x) => x.port === Number(node));
  if (!n) throw new Error(`node ${node} not found`);
  if (!/^[A-Za-z0-9_-]+$/.test(space || '')) throw new Error('bad space name');
  const short = space.replace(/^\d{8}-/, '');
  // 必须用真实代码库地址：节点按 remote 推导 go.mod 的 module 路径，
  // 传 http://127.0.0.1:<port>/x/<name> 会得到 127.0.0.1 开头的错误模块名。
  const remote = repoUrl(repos) || `https://shylinux.com/x/${short}`;
  const r = await http(node, `/s/${encode(space)}/c/web.code.git.status/action/init?remote=${encode(remote)}&space.noecho=true`, {
    method: 'POST',
    timeout: 60000,
  });
  if (r.status !== 200) throw new Error(`init failed: HTTP ${r.status}`);
  const dir = path.join(n.dir, 'usr', 'local', 'work', space);
  await waitFor(async () => fsp.existsSync(path.join(dir, '.git')) && fsp.existsSync(path.join(dir, 'src', 'main.go')), {
    timeout: 20000,
    interval: 600,
    label: `skeleton in ${space}`,
  });
  await ensureSpaceBinary(n, space);
  return { node: Number(node), space, dir, remote, initialized: true };
}

// 在空间目录打开一个系统终端（macOS Terminal）
export async function openTerminal({ node, space = '' } = {}) {
  const n = (await listNodes()).find((x) => x.port === Number(node));
  if (!n) throw new Error(`node ${node} not found`);
  const dir = baseDirOf(n, space || '');
  const real = await fsp.promises.stat(dir).catch(() => null) ? dir : n.dir; // 目录没生成时退到节点根
  const target = real;
  const { spawn } = await import('node:child_process');
  const child = spawn('open', ['-a', 'Terminal', target], { detached: true, stdio: 'ignore' });
  child.unref();
  return { dir: target, opened: true };
}

// go.mod 兜底：框架偶尔会生成不完整的 go.mod（缺 module/go/require），
// 缺哪个补哪个；两个核心依赖固定为 ice v1.6.6 / icebergs v1.10.7。
const GO_MOD_DEPS = [
  ['shylinux.com/x/ice', 'v1.6.6'],
  ['shylinux.com/x/icebergs', 'v1.10.7'],
];

export function fillGoMod(text, module = 'shylinux.com/x/ContextOS') {
  const orig = String(text || '');
  let out = orig;
  const added = [];
  if (!/^\s*module\s+\S+/m.test(out)) {
    out = `module ${module}\n\n${out.trim()}\n`;
    added.push(`module ${module}`);
  }
  if (!/^\s*go\s+\d+(\.\d+)*/m.test(out)) {
    out = out.trimEnd() + '\n\ngo 1.25.0\n';
    added.push('go 1.25.0');
  }
  const missing = GO_MOD_DEPS.filter(([m]) => !new RegExp(`(^|\\s)${m.replace(/\./g, '\\.')}\\s+v`, 'm').test(out));
  if (missing.length) {
    const lines = missing.map(([m, v]) => `\t${m} ${v}`);
    if (/require\s*\(/.test(out)) {
      out = out.replace(/require\s*\(([\s\S]*?)\)/, (all, inner) => `require (${inner.replace(/\s*$/, '\n')}${lines.join('\n')}\n)`);
    } else if (/^\s*require\s+\S+\s+v\S+/m.test(out)) {
      const single = /^\s*require\s+(\S+)\s+(v\S+)\s*$/m.exec(out);
      out = out.replace(single[0], `require (\n\t${single[1]} ${single[2]}\n${lines.join('\n')}\n)`);
    } else {
      out = `${out.trimEnd()}\n\nrequire (\n${lines.join('\n')}\n)\n`;
    }
    added.push(...missing.map(([m, v]) => `${m} ${v}`));
  }
  return { text: out, changed: out !== orig, added };
}

export async function ensureGoMod({ node, space }) {
  const n = (await listNodes()).find((x) => x.port === Number(node));
  if (!n) throw new Error(`node ${node} not found`);
  const dir = baseDirOf(n, space);
  const file = path.join(dir, 'go.mod');
  let text = '';
  try { text = await fsp.promises.readFile(file, 'utf8'); } catch { throw new Error(`space is not initialised (no go.mod in ${dir})`); }
  const module = (/^\s*module\s+(\S+)/m.exec(text) || [])[1] || `shylinux.com/x/${space}`;
  const { text: fixed, changed, added } = fillGoMod(text, module);
  if (changed) await fsp.promises.writeFile(file, fixed);
  // 有源码时先 tidy 再补一次：tidy 会把「暂未用到」的依赖删掉，兜底必须以最终文件为准
  const hasSrc = await fsp.promises.stat(path.join(dir, 'src', 'main.go')).catch(() => null);
  if (changed && hasSrc) {
    try { await execFileAsync('go', ['mod', 'tidy'], { cwd: dir, timeout: 240000 }); } catch { /* tidy 失败不影响兜底 */ }
    const now = await fsp.promises.readFile(file, 'utf8').catch(() => '');
    const again = fillGoMod(now, module);
    if (again.changed) {
      await fsp.promises.writeFile(file, again.text);
      added.push(...again.added);
      return { file, changed: true, added };
    }
  }
  return { file, changed, added };
}

export async function buildSpace({ node, space }) {
  const n = (await listNodes()).find((x) => x.port === Number(node));
  if (!n) throw new Error(`node ${node} not found`);
  const dir = path.join(n.dir, 'usr', 'local', 'work', space);
  await ensureGoMod({ node, space }).catch(() => null); // go.mod 不完整时先补齐（框架已知 bug）
  // Canonical compile path: the node pulls the space repos and rebuilds its
  // own bin/ice.bin, then restarts the space. Building locally skips the repo
  // step and leaves the space on the node binary, which is what produced
  // "not found index" for commands the space never had.
  let apiError = '';
  const buildStartedAt = Date.now();
  try {
    const r = await http(node, `/c/dream/action/build?name=${encode(space)}`, { method: 'POST', timeout: 900000 });
    if (r.status !== 200) throw new Error(`HTTP ${r.status} ${String(r.text || '').slice(0, 160)}`);
    const body = String(r.text || '');
    if (/"warn"|warn:|"error"/i.test(body) && !/warn":\s*\[\]/.test(body)) {
      // A warn in the build reply means the compile did not fully succeed.
      if (!/build success|_status":\["\[\{"name":"time"/.test(body)) throw new Error(body.slice(0, 200));
    }
  } catch (e) {
    apiError = String(e?.message || e);
  }
  const bin = path.join(dir, 'bin', 'ice.bin');
  const nodeBin = path.join(n.dir, 'bin', 'ice.bin');
  // 仓库可能自带一份预编译 bin/ice.bin：只有「本次构建新写出」的文件才算数，
  // 否则会拿旧二进制冒充成功（旧二进制里没有新模块 → 命令回 echo）。
  const binStat = fsp.existsSync(bin) ? fsp.statSync(bin) : null;
  const stale = !binStat || binStat.mtimeMs < buildStartedAt - 2000;
  const bad = stale || (fsp.existsSync(nodeBin) && hashFile(bin) === hashFile(nodeBin));
  if (apiError || bad) {
    // Fallback: compile in place, then hard-restart the space so it runs the
    // fresh binary instead of whatever it booted with.
    try {
      await goTidyBuild(dir, { node: { dir: n.dir, port: n.port } });
    } catch (e) {
      throw new Error(apiError || String(e?.message || e));
    }
  }
  const finalStat = fsp.existsSync(bin) ? fsp.statSync(bin) : null;
  if (!finalStat || finalStat.mtimeMs < buildStartedAt - 2000 || (fsp.existsSync(nodeBin) && hashFile(bin) === hashFile(nodeBin))) {
    throw new Error(`space ${space} has no compiled bin/ice.bin${apiError ? ` (build api: ${apiError})` : ''}`);
  }
  await restartSpace({ node, space, dir: n.dir });
  return { space, rebuilt: true, via: apiError ? 'local' : 'dream' };
}

export async function restartSpace({ node, space, dir }) {
  await stopSpace({ node, space });
  const pidFile = path.join(dir, 'usr', 'local', 'work', space, 'var', 'log', 'ice.pid');
  const pidAlive = () => {
    if (!fsp.existsSync(pidFile)) return false;
    try { process.kill(Number(fsp.readFileSync(pidFile, 'utf8').trim()), 0); return true; } catch { return false; }
  };
  await waitFor(async () => !pidAlive(), { timeout: 15000, interval: 500, label: `space ${space} stopped` }).catch(() => {});
  // A stale space pid must not survive: it keeps the previous binary running,
  // so commands added by this build stay "not found" until it is replaced.
  if (pidAlive()) {
    try { process.kill(Number(fsp.readFileSync(pidFile, 'utf8').trim()), 'SIGTERM'); } catch {}
    await waitFor(async () => !pidAlive(), { timeout: 8000, interval: 300, label: `space ${space} terminated` }).catch(() => {});
  }
  if (pidAlive()) {
    try { process.kill(Number(fsp.readFileSync(pidFile, 'utf8').trim()), 'SIGKILL'); } catch {}
    await waitFor(async () => !pidAlive(), { timeout: 5000, interval: 200, label: `space ${space} killed` }).catch(() => {});
  }
  await startSpace({ node, space });
  await ensureSpaceProcess({ node, space, dir });
  // /c/runtime answers 200 from the node even when the space has no such
  // command, so it cannot prove the space is serving its own binary. Wait for
  // the space's own pid to be alive AND its homepage to answer instead.
  await waitFor(async () => {
    try {
      const pid = Number((await fsp.promises.readFile(pidFile, 'utf8')).trim());
      if (!(pid > 1)) return false;
      process.kill(pid, 0);
    } catch { return false; }
    const r = await http(node, `/s/${encode(space)}`, { timeout: 5000, headers: { accept: 'text/html', 'user-agent': 'Mozilla/5.0' } });
    return r.status === 200;
  }, { timeout: 45000, interval: 800, label: `space ${space} serving` });
}
export async function ensureSpaceProcess({ node, space, dir }) {
  const pidFile = path.join(dir, 'usr', 'local', 'work', space, 'var', 'log', 'ice.pid');
  const alive = async () => {
    try {
      const pid = Number((await fsp.promises.readFile(pidFile, 'utf8')).trim());
      if (!(pid > 1)) return false;
      process.kill(pid, 0);
      return true;
    } catch {
      return false;
    }
  };
  if (await alive()) return;
  await http(node, `/c/dream/action/start?name=${encode(space)}&space.noecho=true`, { method: 'POST', timeout: 60000 });
  await waitFor(alive, { timeout: 20000, interval: 700, label: `space ${space} process` });
}

export async function warmSpace({ node, space } = {}) {
  // Opening the space homepage runs its init/DB bootstrap; without this the
  // service/store tables can still be empty right after create/build.
  try {
    const r = await http(node, `/s/${encode(space)}`, { timeout: 15000, headers: { accept: 'text/html', 'user-agent': 'Mozilla/5.0' } });
    return { status: r.status, bytes: r.size };
  } catch (e) {
    return { error: String(e?.message || e) };
  }
}

// 代码库地址：允许直接给完整 URL（含 git@），否则按仓库名拼到默认代码服务器上。
// 默认服务器以后可以换成用户自己的：CX_GIT_BASE=https://git.example.com/x/
export function repoUrl(repos = '') {
  const v = String(repos || '').trim();
  if (!v) return '';
  if (/^(?:https?:\/\/|git@|ssh:\/\/|git:\/\/)/i.test(v)) return v;
  const base = (process.env.CX_GIT_BASE || 'https://shylinux.com/x/').replace(/\/?$/, '/');
  return base + v.replace(/^\/+/, '');
}

/** 节点用 go.work 管理时，把新空间加入 workspace（go work use，失败则文本插入）。 */
export async function joinNodeWork({ node, space }) {
  const n = (await listNodes()).find((x) => Number(x.port) === Number(node));
  if (!n?.dir) return { used: false, reason: 'node not found' };
  const root = n.dir;
  const work = path.join(root, 'go.work');
  if (!fsp.existsSync(work)) return { used: false, reason: 'no go.work' };
  const rel = `./usr/local/work/${space}`;
  let text = '';
  try { text = fsp.readFileSync(work, 'utf8'); } catch { return { used: false, reason: 'read failed' }; }
  if (text.includes(`usr/local/work/${space}`)) return { used: true, added: false, path: work };
  const run = await new Promise((resolve) => {
    const child = spawn('go', ['work', 'use', rel], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
    let err = '';
    child.stderr.on('data', (d) => { err += String(d); });
    child.on('close', (code) => resolve({ code, err }));
    child.on('error', (e) => resolve({ code: -1, err: String(e) }));
  });
  if (run.code === 0) {
    // go work use 可能因为环境（GOFLAGS/GOWORK/HOME）静默不写，必须回读确认
    try {
      const now = fsp.readFileSync(work, 'utf8');
      if (now.includes(`usr/local/work/${space}`)) return { used: true, added: true, via: 'go', path: work };
    } catch { /* fall through to text insert */ }
  }
  const line = `\t${rel}`;
  const next = /use\s*\(([\s\S]*?)\)/.test(text)
    ? text.replace(/use\s*\(([\s\S]*?)\)/, (m, body) => `use (${body.replace(/\s*$/, '')}\n${line}\n)`)
    : `${text.replace(/\s*$/, '')}\n\nuse ${rel}\n`;
  try { fsp.writeFileSync(work, next); } catch (e) { return { used: false, reason: String(e?.message || e) }; }
  return { used: true, added: true, via: 'text', path: work };
}

export async function createSpace({ node, name, repos = '', binary = '', soft = false }) {
  if (!/^\d{8}-[A-Za-z0-9_]+$/.test(name || '') && !/^[a-zA-Z0-9_]+$/.test(name || '')) {
    throw new Error('space name must be short (letters/digits/_) or date-prefixed (YYYYMMDD-name)');
  }
  const fullName = /^\d{8}-[A-Za-z0-9_]+$/.test(name) ? name : `${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${name}`;
  // A standard space is only a skeleton until it knows where its source lives:
  // dream/create clones `repos` into the space before the first build.
  const query = new URLSearchParams({ name: fullName });
  const repo = repoUrl(repos);
  if (repo) query.set('repos', repo);
  if (binary) query.set('binary', binary);
  const full = fullName;
  const nodeRow = (await listNodes()).find((x) => x.port === Number(node));
  const dir = baseDirOf(nodeRow, full);
  let status = '';
  // dream/create 先登记、后下载/克隆：回执 200 不等于空间就绪。
  // 源码空间等 go.mod（克隆完成）；二进制空间没有 go.mod，等空间自己响应
  // /c/runtime。旧逻辑对 binary 也等 go.mod，导致每次白等 180s 再重试。
  const readyForCreate = async () => {
    if (binary) {
      const r = await http(node, `/s/${encode(full)}/c/runtime`, { timeout: 5000, auth: false }).catch(() => null);
      return !!r && r.status === 200;
    }
    return !!(await fsp.promises.stat(path.join(dir, 'go.mod')).catch(() => null));
  };
  const attempts = binary ? 1 : 3;
  for (let attempt = 0; attempt < attempts; attempt++) {
    if (attempt) await new Promise((r) => setTimeout(r, 3000));
    const createTimeout = binary ? 240000 : 30000;
    await http(node, `/c/dream/action/create?${query}`, { method: 'PUT', timeout: createTimeout, auth: false });
    // dream/create 返回后编排器仍在落盘/启动；立刻探测只会刷一排 fetch failed。
    await new Promise((r) => setTimeout(r, 3000));
    try {
      await waitFor(readyForCreate, {
        timeout: binary ? 240000 : 120000,
        interval: 1500,
        label: binary ? `space ${full} runtime ready` : `space ${full} source cloned`,
      });
      const row = (await listSpaces({ node })).find((s) => s.name === full);
      if (row) { status = row.status || 'created'; break; }
      // copy 模式只需要骨架落盘，随后会复制二进制并 stop/start；
      // /c/dream 行可能晚于目录注册，不能因此重试 create 或报“源码未就位”。
      if (soft && (await fsp.promises.stat(path.join(dir, 'go.mod')).catch(() => null))) { status = 'created'; break; }
    } catch {
      /* 没完成就再 create 一次（幂等） */
    }
  }
  if (!status) {
    const hasDir = await fsp.promises.stat(dir).catch(() => null);
    if (!hasDir) throw new Error(`空间目录未生成：${dir}（仓库 ${repo || '空空间'} 可能不存在或克隆失败）`);
    const files = await fsp.promises.readdir(dir).catch(() => []);
    throw new Error(`空间源码未就位：${dir} 里没有 go.mod（已有 ${files.slice(0, 6).join(', ') || '空目录'}；仓库 ${repo || '空空间'}）`);
  }
  if (nodeRow) await ensureSpaceBinary(nodeRow, full);
  // 节点若用 go.work 管理多个空间，新空间必须加进去，否则它不在 workspace 里
  let work = null;
  try { work = await joinNodeWork({ node, space: full }); } catch (e) { work = { used: false, error: String(e?.message || e) }; }
  return { node, name: full, short: name, status, work };
}

/** Create a real ContextOS app: git init + vimer module + code save + compile. */
/** End-to-end pipeline: node -> space -> app -> record -> read-back. */
/** 容器部署：docker run 一个 ContextOS 节点，端口映射后等待 /c/runtime。 */

/** 文件存储依赖云研发空间（20240903-operation）：上传的文件由它统一管理。 */
export const STORAGE_SPACE = '20240903-operation';
export async function storageReady({ node } = {}) {
  let spaces = [];
  try { spaces = await listSpaces({ node }); } catch { /* node may be offline */ }
  const hit = spaces.find((s) => s.name === STORAGE_SPACE);
  return { node, space: STORAGE_SPACE, installed: !!hit, running: hit ? /^(start|running)$/i.test(String(hit.status || '')) : false, ready: !!(hit && /^(start|running)$/i.test(String(hit.status || ''))) };
}
