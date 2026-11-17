// 核心业务：DSH 用户（每个节点一个 dsh_copilot_<port>，uid 持久化）。
import fs from 'node:fs/promises';
import path from 'node:path';
import { stateDir } from '../base/env.js';
import { http, encode, USER_CACHE, assertOk } from '../base/http.js';

let USERS_LOADED = false;
const PENDING = new Map();

export function usersFile() {
  return path.join(stateDir(), 'users.json');
}

export async function loadUsers() {
  if (USERS_LOADED) return;
  USERS_LOADED = true;
  try {
    const raw = JSON.parse(await fs.readFile(usersFile(), 'utf8'));
    for (const [port, value] of Object.entries(raw || {})) {
      if (value && value.uid) USER_CACHE.set(Number(port), value);
    }
  } catch { /* first run */ }
}

export async function saveUsers() {
  await fs.mkdir(stateDir(), { recursive: true });
  const out = {};
  for (const [port, value] of USER_CACHE.entries()) out[String(port)] = value;
  await fs.writeFile(usersFile(), JSON.stringify(out, null, 2));
}

export async function ensureUser(node) {
  const port = Number(node);
  if (!port) throw new Error('node is required');
  await loadUsers();
  const found = USER_CACHE.get(port);
  if (found?.uid) return found.uid;
  if (PENDING.has(port)) return PENDING.get(port);
  const job = (async () => {
    const username = `dsh_copilot_${port}`;
    const r = await http(port, `/c/aaa.user/action/create/userrole/tech/username/${encode(username)}/usernick/${encode('DSH Copilot')}`, { method: 'PUT', timeout: 15000 });
    assertOk(r, 'create user');
    const uid = r.text.trim();
    if (!/^[0-9a-f]{32}$/i.test(uid)) throw new Error(`create user returned no uid: ${r.text.slice(0, 120)}`);
    USER_CACHE.set(port, { uid, username, created: new Date().toISOString() });
    await saveUsers();
    return uid;
  })().finally(() => PENDING.delete(port));
  PENDING.set(port, job);
  return job;
}
