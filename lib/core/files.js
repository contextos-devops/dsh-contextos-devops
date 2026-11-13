// 核心业务：空间文件操作（列目录/读写/树/新建/改名/删除/git 状态）。
import fs from 'node:fs/promises';
import fsp from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { listNodes } from '../base/registry.js';
import { spaceBase, baseDirOf } from './spaces.js';

export async function listDir({ node, space, path: sub = '' } = {}) {
  const n = (await listNodes()).find((x) => x.port === Number(node));
  if (!n) throw new Error(`node ${node} not found`);
  const base = path.join(n.dir, 'usr', 'local', 'work', space);
  const dir = sub ? path.join(base, ...sub.split('/').filter(Boolean)) : base;
  if (dir !== base && !dir.startsWith(base + path.sep)) throw new Error('path escapes the space');
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch (e) {
    throw new Error(`cannot read ${dir}: ${String(e?.message || e)}`);
  }
  const out = [];
  for (const ent of entries) {
    if (ent.name === '.git') continue;
    const p = path.join(dir, ent.name);
    let st = null;
    try { st = await fs.stat(p); } catch {}
    out.push({
      name: ent.name,
      type: ent.isDirectory() ? 'dir' : 'file',
      size: st?.size ?? 0,
      mtime: st ? st.mtime.toISOString() : '',
      path: sub ? `${sub}/${ent.name}` : ent.name,
    });
  }
  const ORDER = ['src', 'etc', 'bin', 'var', 'usr'];
  const rank = (e) => { const i = ORDER.indexOf(e.name); return i < 0 ? 99 : i; };
  out.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
    if (a.type === 'dir') {
      const ra = rank(a), rb = rank(b);
      if (ra !== rb) return ra - rb;
    }
    return a.name.localeCompare(b.name);
  });
  return { node: Number(node), space, path: sub || '', entries: out.filter((e) => !e.name.startsWith('.')) };
}

export async function readFile({ node, space, path: p } = {}) {
  const n = (await listNodes()).find((x) => x.port === Number(node));
  if (!n) throw new Error(`node ${node} not found`);
  const base = baseDirOf(n, space);
  const file = path.join(base, ...String(p || '').replace(/^\/+/, '').split('/').filter(Boolean));
  if (file !== base && !file.startsWith(base + path.sep)) throw new Error('path escapes the space');
  let content;
  try {
    content = await fs.readFile(file, 'utf8');
  } catch (e) {
    throw new Error(`cannot read ${file}: ${String(e?.message || e)}`);
  }
  return { node: Number(node), space, path: p || '', content };
}

export async function writeFile({ node, space, path: p, content = '' } = {}) {
  const n = (await listNodes()).find((x) => x.port === Number(node));
  if (!n) throw new Error(`node ${node} not found`);
  const base = baseDirOf(n, space);
  const file = path.join(base, ...String(p || '').replace(/^\/+/, '').split('/').filter(Boolean));
  if (file !== base && !file.startsWith(base + path.sep)) throw new Error('path escapes the space');
  await fs.writeFile(file, content, 'utf8');
  return { node: Number(node), space, path: p || '', saved: true };
}

/** 列出项目空间内的目录项（IDE 文件树用）。 */
export async function listTree({ node, space, path: p = '' } = {}) {
  const n = (await listNodes()).find((x) => x.port === Number(node));
  if (!n) throw new Error(`node ${node} not found`);
  const base = baseDirOf(n, space);
  const dir = path.join(base, ...String(p || '').replace(/^\/+/, '').split('/').filter(Boolean));
  if (dir !== base && !dir.startsWith(base + path.sep)) throw new Error('path escapes the space');
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const skip = new Set(['.git', 'var', 'bin', 'node_modules']);
  return entries
    .filter((e) => !skip.has(e.name))
    .map((e) => ({ name: e.name, type: e.isDirectory() ? 'dir' : 'file', path: [p, e.name].filter(Boolean).join('/') }))
    .sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === 'dir' ? -1 : 1));
}

/** 项目空间内路径解析（防越界）。 */
function resolveIn(base, p) {
  const full = path.join(base, ...String(p || '').split('/').filter(Boolean));
  if (full !== base && !full.startsWith(base + path.sep)) throw new Error('path escapes the space');
  return full;
}
export async function makeDir({ node, space, path: p = '' } = {}) {
  const base = await spaceBase({ node, space });
  await fs.mkdir(resolveIn(base, p), { recursive: true });
  return { path: p, created: true };
}
export async function renamePath({ node, space, from = '', to = '' } = {}) {
  const base = await spaceBase({ node, space });
  if (!from || !to) throw new Error('from/to are required');
  await fs.rename(resolveIn(base, from), resolveIn(base, to));
  return { from, to, renamed: true };
}
export async function removePath({ node, space, path: p = '' } = {}) {
  const base = await spaceBase({ node, space });
  if (!p) throw new Error('path is required');
  await fs.rm(resolveIn(base, p), { recursive: true, force: true });
  return { path: p, removed: true };
}
export async function gitStatus({ node, space } = {}) {
  const base = await spaceBase({ node, space });
  const run = (args) => new Promise((resolve) => {
    const child = spawn('git', ['-C', base, ...args], { stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    child.stdout.on('data', (d) => { out += d; });
    child.stderr.on('data', (d) => { out += d; });
    child.on('close', (code) => resolve({ code, out }));
    child.on('error', () => resolve({ code: -1, out: '' }));
  });
  const st = await run(['status', '--porcelain=v1', '-b']);
  if (st.code !== 0) return { branch: '', ahead: 0, behind: 0, files: {}, changed: 0, commits: 0, error: st.out.slice(0, 200) };
  const files = {};
  let branch = '', ahead = 0, behind = 0;
  st.out.split('\n').forEach((line) => {
    if (!line) return;
    if (line.startsWith('## ')) {
      const head = line.slice(3);
      const m = head.match(/^[^.\s]+/);
      branch = m ? m[0] : '';
      const a = head.match(/ahead (\d+)/); if (a) ahead = Number(a[1]);
      const b = head.match(/behind (\d+)/); if (b) behind = Number(b[1]);
      return;
    }
    const xy = line.slice(0, 2).trim();
    let file = line.slice(3);
    if (file.includes(' -> ')) file = file.split(' -> ').pop();
    if (xy) files[file] = xy;
  });
  const hist = await run(['rev-list', '--count', 'HEAD']);
  const log = await run(['log', '-n', '40', '--pretty=format:%h%x1f%s%x1f%an%x1f%ar']);
  const history = log.code === 0
    ? log.out.split('\n').filter(Boolean).map((line) => { const [hash, subject, author, when] = line.split('\x1f'); return { hash, subject, author, when }; })
    : [];
  return { branch, ahead, behind, files, changed: Object.keys(files).length, commits: Number((hist.out || '').trim()) || 0, history };
}

/** 项目空间的绝对路径（终端 cwd 用）。 */
/** Node-level recent apps: gonganxitong.recent for the persistent DSH user. */
/** Filesystem fallback: every src/<name>/portal.json is one app. */
/** git init after dream create: required remote, otherwise no skeleton is written. */
/** Platform-style app: service/autogen, then compile + verify portal. */
