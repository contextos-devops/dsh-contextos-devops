// 唯一身份：创建、访问、最近应用、打开网页都用同一个 user.uid。
// 解析顺序：显式传入 → 节点上「当前分身」→ 节点自有账号。
import fs from 'node:fs/promises';
import path from 'node:path';
import { stateDir } from '../base/env.js';
import { ensureUser } from './users.js';

const FILE = () => path.join(stateDir(), 'avatars.json');

export async function activeAvatarUid(node) {
  try {
    const all = JSON.parse(await fs.readFile(FILE(), 'utf8'));
    const bucket = all[String(Number(node))] || {};
    const items = Array.isArray(bucket.items) ? bucket.items : [];
    const hit = items.find((x) => x && x.uid === bucket.active) || items[0];
    return hit && hit.uid ? String(hit.uid) : '';
  } catch { return ''; }
}

export async function resolveActorUid(node, uid = '') {
  return uid || await activeAvatarUid(node) || await ensureUser(node);
}
