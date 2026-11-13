// 核心业务：项目空间生命周期（列表/启停/编译/路径）。
import path from 'node:path';
import fsp from 'node:fs';
import crypto from 'node:crypto';
import { http, encode, baseUrl } from '../base/http.js';
import { listNodes } from '../base/registry.js';
import { parseFixedTable } from '../base/table.js';
import { waitFor } from '../misc/async.js';

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
      size: row.size || '',
      dreamStatus: row.status || '',
      icons: (() => { try { return decodeURIComponent(row.icons || ''); } catch { return row.icons || ''; } })(),
    }));
}

export async function initSpace({ node, space } = {}) {
  const n = (await listNodes()).find((x) => x.port === Number(node));
  if (!n) throw new Error(`node ${node} not found`);
  if (!/^[A-Za-z0-9_-]+$/.test(space || '')) throw new Error('bad space name');
  const short = space.replace(/^\d{8}-/, '');
  const remote = `${baseUrl(node)}/x/${short}`;
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

export async function buildSpace({ node, space }) {
  const n = (await listNodes()).find((x) => x.port === Number(node));
  if (!n) throw new Error(`node ${node} not found`);
  let compile = null;
  let compileError = '';
  try { compile = await http(node, `/s/${encode(space)}/c/vimer/action/compile?space.noecho=true`, { method: 'POST', timeout: 240000 }); }
  catch (e) { compileError = String(e?.message || e); }
  if (compile && compile.status !== 200) compileError = `compile failed: HTTP ${compile.status}`;
  const bin = path.join(n.dir, 'usr', 'local', 'work', space, 'bin', 'ice.bin');
  const nodeBin = path.join(n.dir, 'bin', 'ice.bin');
  const bad = !fsp.existsSync(bin) || (fsp.existsSync(nodeBin) && hashFile(bin) === hashFile(nodeBin));
  if (bad) {
    const copied = await ensureSpaceBinary(n, space, { force: true, allowNode: false }).catch((e) => ({ error: String(e?.message || e) }));
    if (copied.error) throw new Error(compileError || copied.error);
  }
  await ensureSpaceProcess({ node, space, dir: n.dir });
  await waitFor(async () => (await http(node, `/s/${encode(space)}/c/version`, { timeout: 4000 })).status === 200, {
    timeout: 60000,
    interval: 800,
    label: `space ${space} back online`,
  });
  return { space, rebuilt: true };
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
    const r = await http(node, `/s/${encode(space)}/`, { timeout: 15000, headers: { accept: 'text/html', 'user-agent': 'Mozilla/5.0' } });
    return { status: r.status, bytes: r.size };
  } catch (e) {
    return { error: String(e?.message || e) };
  }
}

export async function createSpace({ node, name, repos = '' }) {
  if (!/^\d{8}-[A-Za-z0-9_]+$/.test(name || '') && !/^[a-zA-Z0-9_]+$/.test(name || '')) {
    throw new Error('space name must be short (letters/digits/_) or date-prefixed (YYYYMMDD-name)');
  }
  const fullName = /^\d{8}-[A-Za-z0-9_]+$/.test(name) ? name : `${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${name}`;
  const query = new URLSearchParams({ name: fullName, 'space.noecho': 'true' });
  if (repos) query.set('repos', repos);
  // Always point the space at this node's own ice.bin. Without it a freshly
  // deployed download-binary node starts the daemon but never materializes
  // src/bin, leaving the row in `begin`.
  const nodeDir = (await listNodes()).find((n) => n.port === Number(node))?.dir;
  const binary = nodeDir ? path.join(nodeDir, 'bin', 'ice.bin') : '';
  if (binary && fsp.existsSync(binary)) query.set('binary', binary);
  const full = fullName;
  let status = '';
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt) await new Promise((r) => setTimeout(r, 3000));
    await http(node, `/c/dream/action/create?${query}`, { method: 'PUT', timeout: 30000 });
    try {
      // The space registers its HTTP surface before the dream row flips from
      // `begin` to `start`; waiting for the pod avoids a 60s stall.
      await waitFor(async () => (await http(node, `/s/${encode(full)}/c/version`, { timeout: 4000 })).status === 200, {
        timeout: 12000,
        interval: 800,
        label: `space ${full} serving`,
      });
      const row = (await listSpaces({ node })).find((s) => s.name === full);
      status = row?.status || '';
      break;
    } catch {
      /* retry create once more */
    }
  }
  if (!status) throw new Error(`space ${name} did not answer /c/version`);
  const n = (await listNodes()).find((x) => x.port === Number(node));
  if (n) await ensureSpaceBinary(n, full);
  return { node, name: full, short: name, status };
}

/** Create a real ContextOS app: git init + vimer module + code save + compile. */
/** End-to-end pipeline: node -> space -> app -> record -> read-back. */
/** 容器部署：docker run 一个 ContextOS 节点，端口映射后等待 /c/version。 */
