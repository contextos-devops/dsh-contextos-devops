// 数据备份与监控采样：内核还没有这套能力，插件侧先做「能救命」的部分。
import path from 'node:path';
import fsp from 'node:fs';
import os from 'node:os';
import { listNodes } from '../base/registry.js';
import { probe } from '../base/http.js';
import { spaceBase } from './spaces.js';

export function backupRoot() {
  return path.join(os.homedir(), '.contextos', 'backups');
}

function stamp() {
  const d = new Date();
  const p = (v) => String(v).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

/** 备份一个空间的数据目录（var/db），写 manifest，返回路径与文件清单。 */
export async function backupSpace({ node, space, tag = '' } = {}) {
  if (!space) throw new Error('backupSpace needs a space');
  const n = (await listNodes()).find((x) => x.port === Number(node));
  if (!n) throw new Error(`node ${node} not found`);
  const base = spaceBase ? path.join(n.dir, 'usr', 'local', 'work', space) : '';
  const dbDir = path.join(base, 'var', 'db');
  const out = path.join(backupRoot(), `${node}-${space}${tag ? '-' + tag : ''}-${stamp()}`);
  await fsp.promises.mkdir(out, { recursive: true });
  const files = [];
  try {
    for (const f of await fsp.promises.readdir(dbDir)) {
      if (!f.endsWith('.db')) continue;
      await fsp.promises.copyFile(path.join(dbDir, f), path.join(out, f));
      const st = await fsp.promises.stat(path.join(out, f));
      files.push({ name: f, size: st.size });
    }
  } catch (e) {
    throw new Error(`备份失败：${dbDir} 不可读（${e.message}）`);
  }
  const manifest = { node: Number(node), space, dir: base, at: new Date().toISOString(), files };
  await fsp.promises.writeFile(path.join(out, 'manifest.json'), JSON.stringify(manifest, null, 2));
  return { ...manifest, backupDir: out, count: files.length, size: files.reduce((a, b) => a + b.size, 0) };
}

/** 列出已有备份（按时间倒序）。 */
export async function listBackups({ limit = 20 } = {}) {
  const root = backupRoot();
  let dirs = [];
  try { dirs = await fsp.promises.readdir(root); } catch { return []; }
  const out = [];
  for (const d of dirs.sort().reverse().slice(0, limit)) {
    try {
      const m = JSON.parse(await fsp.promises.readFile(path.join(root, d, 'manifest.json'), 'utf8'));
      out.push({ ...m, backupDir: path.join(root, d) });
    } catch { /* 跳过不完整目录 */ }
  }
  return out;
}

/** 节点健康采样：一次拿到端口、存活、版本、耗时。 */
export async function sampleNodes() {
  const nodes = await listNodes();
  const rows = [];
  for (const n of nodes) {
    const started = Date.now();
    let ok = false, version = '';
    try { const p = await probe(n.port); ok = !!p.live; version = p.version || ''; } catch { /* offline */ }
    rows.push({ port: n.port, name: n.name, ok, version, ms: Date.now() - started });
  }
  return { at: new Date().toISOString(), nodes: rows, up: rows.filter((r) => r.ok).length, total: rows.length };
}

import { http, encode, envelopeShape } from '../base/http.js';
import { methodOf } from '../base/url.js';
import { parseFixedTable } from '../base/table.js';

/** 监控面板的统一取数入口：节点/空间 + 命令 + 参数。 */
export async function monitorQuery({ node, space = '', command, action = '', params = {} } = {}) {
  if (!command) throw new Error('monitorQuery needs a command');
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params || {})) if (v !== '' && v != null) qs.set(k, v);
  const base = space ? `/s/${encode(space)}/c/${command}` : `/c/${command}`;
  const path = `${base}${action ? `/action/${action}` : ''}${qs.toString() ? `?${qs}` : ''}`;
  const started = Date.now();
  const r = await http(node, path, { method: methodOf({ action }), timeout: 15000 });
  const shape = envelopeShape(r.text);
  let count = '';
  try {
    const env = JSON.parse(r.text);
    const st = JSON.parse(env._status?.[0] || '[]');
    count = st.find((x) => x.name === 'count')?.value || '';
  } catch { /* 非报文回执 */ }
  const result = shape.env?.result?.[0] ?? shape.env?.result ?? '';
  let columns = shape.columns || [];
  let rows = shape.rows || [];
  if (shape.kind === 'text') {
    // 有些命令直接回文本表格（终端视图），解析成列/行
    try { const t = parseFixedTable(r.text); columns = t.columns; rows = t.rows; } catch { /* 保留空 */ }
  }
  return {
    node, space, command, action, status: r.status, ms: Date.now() - started,
    shape: shape.kind === 'text' && rows.length ? 'list' : shape.kind,
    columns, rows: rows.slice(0, 50),
    fields: shape.fields || null, result: typeof result === 'string' ? result : '', count,
  };
}
