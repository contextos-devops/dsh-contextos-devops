// 节点台账与磁盘扫描：~/.contextos/nodes.json（与 macOS 客户端共用）。
import fs from 'node:fs/promises';
import path from 'node:path';
import { HOME, stateDir } from './env.js';
import { platformTriple } from './platform.js';
import { probe } from './http.js';

export function registryPath() {
  return process.env.CTX_NODES_FILE || path.join(HOME(), '.contextos', 'nodes.json');
}

export async function readRegistry() {
  let list = [];
  try {
    const d = JSON.parse(await fs.readFile(registryPath(), 'utf8'));
    list = Array.isArray(d) ? d : Array.isArray(d.nodes) ? d.nodes : [];
  } catch {
    /* no registry yet */
  }
  if (list.length) return list;
  // 老版本插件的台账迁移一次
  try {
    const d = JSON.parse(await fs.readFile(path.join(stateDir(), 'nodes.json'), 'utf8'));
    const old = Array.isArray(d.nodes) ? d.nodes : [];
    list = old.map((n) => ({ dir: n.dir, name: n.name, port: n.port, source: 'record', createdAt: n.createdAt }));
  } catch {
    /* nothing to migrate */
  }
  return list;
}

export async function writeRegistry(nodes) {
  await fs.mkdir(path.dirname(registryPath()), { recursive: true });
  await fs.writeFile(registryPath(), JSON.stringify(nodes, null, 2));
}

/** 把探到的运行信息回写到磁盘台账（~/.contextos/nodes.json），供下次直接读取 */
export async function saveNodeInfo(nodes) {
  const prev = await readRegistry();
  const byDir = new Map(prev.filter((x) => x && x.dir).map((x) => [x.dir, x]));
  const merged = nodes.map((n) => {
    const old = byDir.get(n.dir) || {};
    return {
      ...old,
      dir: n.dir, name: n.name, port: n.port, platform: n.platform, source: n.source,
      version: n.version || old.version || '',
      builtAt: n.builtAt || old.builtAt || '',
      sizeText: n.sizeText || old.sizeText || '',
      state: n.state || old.state || '',
      updatedAt: new Date().toISOString(),
    };
  });
  // 磁盘上还有但这次没扫到的记录保留下来，不丢台账
  for (const [dir, rec] of byDir) if (!merged.some((m) => m.dir === dir)) merged.push(rec);
  await fs.mkdir(path.dirname(registryPath()), { recursive: true });
  await fs.writeFile(registryPath(), JSON.stringify({ updatedAt: new Date().toISOString(), nodes: merged }, null, 2));
  return merged;
}

export async function refreshNodes() {
  const nodes = await listNodes();
  await saveNodeInfo(nodes).catch(() => null);
  return nodes;
}

/** 从目录名 / ContextOS-<port> 尾部推端口；读 var/log/ice.port 优先。 */
export async function portOnDisk(dir) {
  try {
    const p = Number((await fs.readFile(path.join(dir, 'var', 'log', 'ice.port'), 'utf8')).trim());
    if (p > 0 && p <= 65535) return p;
  } catch {
    /* fall through */
  }
  const m = /(\d+)$/.exec(path.basename(dir));
  return m ? Number(m[1]) : 0;
}

/** 磁盘扫描：任何含 bin/ice.bin 的 ~/ContextOS* 目录都是一个节点（对齐 CtxDeployer.scanLocalInstalls）。 */
export async function scanLocalNodes() {
  const out = [];
  let subs = [];
  try {
    subs = await fs.readdir(HOME());
  } catch {
    return out;
  }
  for (const sub of subs) {
    if (!/^ContextOS/.test(sub)) continue;
    const dir = path.join(HOME(), sub);
    let st;
    try {
      st = await fs.stat(path.join(dir, 'bin', 'ice.bin'));
      if (!st.isFile()) continue;
    } catch {
      continue;
    }
    out.push({
      dir,
      bin: path.join(dir, 'bin', 'ice.bin'),
      name: sub,
      port: (await portOnDisk(dir)) || 9020,
      source: 'scan',
      platform: platformTriple(),
      size: st.size,
    });
  }
  return out;
}

export async function binExists(node) {
  try {
    return (await fs.stat(node.bin || path.join(node.dir, 'bin', 'ice.bin'))).isFile();
  } catch {
    return false;
  }
}

export async function pidAlive(dir) {
  try {
    const pid = Number((await fs.readFile(path.join(dir, 'var', 'log', 'ice.pid'), 'utf8')).trim());
    if (!(pid > 1)) return { alive: false, pid: 0 };
    process.kill(pid, 0);
    return { alive: true, pid };
  } catch {
    return { alive: false, pid: 0 };
  }
}

export async function listNodes() {
  const registry = await readRegistry();
  const scanned = await scanLocalNodes();
  const byDir = new Map();
  for (const sc of scanned) byDir.set(sc.dir, { ...sc });
  for (const rec of registry) {
    if (!rec.dir) continue;
    const base = byDir.get(rec.dir) || {
      dir: rec.dir,
      bin: path.join(rec.dir, 'bin', 'ice.bin'),
      name: path.basename(rec.dir),
      port: rec.port || 9020,
      source: 'record',
      platform: rec.platform || platformTriple(),
    };
    for (const k of ['name', 'port', 'parent', 'platform', 'source', 'container', 'image', 'resident', 'env', 'createdAt']) {
      if (rec[k] !== undefined && rec[k] !== null && rec[k] !== '') base[k] = rec[k];
    }
    if (rec.source) base.source = rec.source;
    if (!base.port) base.port = (await portOnDisk(rec.dir)) || 9020;
    byDir.set(rec.dir, base);
  }
  const nodes = [...byDir.values()];
  const out = await Promise.all(nodes.map(async (n) => {
    const st = await probe(n.port, 1500);
    const isContainer = !!n.container;
    const hasBin = isContainer ? true : await binExists(n);
    const pid = await pidAlive(n.dir);
    const running = isContainer ? st.live : pid.pid > 1 ? pid.alive : st.live;
    const iconFile = ['src/main.png', 'src/main.jpg', 'src/main.ico'].find((rel) => {
      try { return fs.existsSync(path.join(n.dir, rel)); } catch { return false; }
    });
    const image = iconFile ? `http://127.0.0.1:${n.port}/p/${iconFile}?pod=${encodeURIComponent(n.name || '')}` : '';
    // 版本/编译时间/大小统一从 /c/runtime 取（boot + make），拿不到才退回本地文件
    const rt = st.runtime || {};
    const versionText = String(st.version || '');
    const ver = String(rt.version || (versionText.match(/v\d+\.\d+\.\d+(?:-[0-9A-Za-z.]+)+/) || [''])[0] || '');
    let builtAt = String(rt.builtAt || '');
    let sizeText = String(rt.sizeText || '');
    if (!builtAt || !sizeText) {
      try {
        const bst = await fs.stat(path.join(n.dir, 'bin', 'ice.bin'));
        if (!builtAt) builtAt = bst.mtime.toISOString();
        if (!sizeText) sizeText = `${Math.round(bst.size / 1048576)}M`;
      } catch { /* ignore */ }
    }
    return { ...n, ...st, version: ver, versionText, builtAt, sizeText, image, hasBin, pid: pid.pid, pidAlive: pid.alive, url: `http://localhost:${n.port}/`, state: running ? 'running' : isContainer || hasBin ? 'stopped' : 'missing' };
  }));
  // 排序：运行中优先，其次名称倒序（ContextOS-9191 在 ContextOS-9090 之前）
  out.sort((a, b) => {
    const ar = a.state === 'running', br = b.state === 'running';
    if (ar !== br) return ar ? -1 : 1;
    return String(b.name || '').localeCompare(String(a.name || ''), 'zh-CN', { numeric: true });
  });
  // 每次探测完顺手落盘，台账始终是最新的运行信息
  await saveNodeInfo(out).catch(() => null);
  return out;
}
