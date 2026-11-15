// 基础功能：插件状态目录（数据文件清单/读取/旧目录迁移）。
import fs from 'node:fs/promises';
import fsp from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { stateDir } from './env.js';

let STATE_MIGRATED = false;

export async function listDataFiles() {
  const dir = stateDir();
  const out = [];
  try {
    const names = await fs.readdir(dir);
    for (const name of names) {
      try {
        const st = await fs.stat(path.join(dir, name));
        out.push({ name, size: st.size, mtime: st.mtime.toISOString() });
      } catch { /* skip */ }
    }
  } catch { /* dir missing */ }
  out.sort((a, b) => a.name.localeCompare(b.name));
  return { dir, files: out };
}

export async function readDataFile({ name = '' } = {}) {
  const safe = path.basename(String(name));
  if (!safe || safe !== String(name) || !/^[A-Za-z0-9._-]+$/.test(safe)) throw new Error('invalid file name');
  const full = path.join(stateDir(), safe);
  const st = await fs.stat(full);
  if (!st.isFile()) throw new Error('not a file');
  if (st.size > 512 * 1024) throw new Error('file too large');
  return { name: safe, size: st.size, content: await fs.readFile(full, 'utf8') };
}

// 改名兼容：state.json 里的 chat:/scroll: 键带着旧插件前缀（contextos-devops-dsh: 或更早的
// contextos-devops:）。不迁移的话，改名前保存的对话与滚动位置在新版本里读不到。
export function migrateStateKeys(data) {
  if (!data || typeof data !== 'object') return data;
  const LEGACY = ['contextos-devops-dsh:', 'contextos-devops:'];
  const NEXT = 'dsh-contextos-devops:';
  let moved = 0;
  for (const key of Object.keys(data)) {
    if (!key.startsWith('chat:') && !key.startsWith('scroll:')) continue;
    for (const pre of LEGACY) {
      if (!key.includes(':' + pre)) continue;
      const next = key.replace(':' + pre, ':' + NEXT);
      if (!(next in data)) { data[next] = data[key]; moved += 1; }
      delete data[key];
      break;
    }
  }
  if (moved) data.migratedKeys = (Number(data.migratedKeys) || 0) + moved;
  return data;
}

export async function migrateStateOnce() {
  if (STATE_MIGRATED) return;
  STATE_MIGRATED = true;
  try {
    const dir = stateDir();
    const home = process.env.DSH_HOME || path.join(os.homedir(), '.dsh');
    const old = path.join(home, 'contextos-devops');
    if (old !== dir && fsp.existsSync(old) && !fsp.existsSync(dir)) await fs.rename(old, dir);
  } catch { /* keep old */ }
}
