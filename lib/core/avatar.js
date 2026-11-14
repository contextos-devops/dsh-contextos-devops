// 核心业务：数字分身 / 背景 / 用户媒体。
import fs from 'node:fs/promises';
import path from 'node:path';
import { stateDir } from '../base/env.js';
import { http, encode } from '../base/http.js';
import { listNodes } from '../base/registry.js';
import { buildSpace, listSpaces, warmSpace } from './spaces.js';
import { createInstance } from './apps.js';
import { ensureUser } from './users.js';

export function avatarsFile() {
  return path.join(stateDir(), 'avatars.json');
}

export async function readAvatars() {
  try { return JSON.parse(await fs.readFile(avatarsFile(), 'utf8')) || {}; } catch { return {}; }
}

export async function writeAvatars(state) {
  await fs.mkdir(stateDir(), { recursive: true });
  await fs.writeFile(avatarsFile(), JSON.stringify(state, null, 2));
}

export async function defaultAvatar(node) {
  const uid = await ensureUser(node);
  return {
    id: uid,
    uid,
    username: `dsh_copilot_${node}`,
    name: '我的分身',
    city: '深圳市',
    company: '云轩领航',
    persona: '专业、稳重、直接',
    preferences: '技术、产品、效率',
    style: '简洁、结构化',
    bio: '',
    created: new Date().toISOString(),
  };
}

export async function listAvatars({ node } = {}) {
  const port = String(Number(node));
  const state = await readAvatars();
  let bucket = state[port];
  if (!bucket || !Array.isArray(bucket.items) || !bucket.items.length) {
    const first = await defaultAvatar(node);
    bucket = { active: first.uid, items: [first] };
    state[port] = bucket;
    await writeAvatars(state);
  }
  let changed = false;
  for (const item of bucket.items) {
    if (!item.persona) { item.persona = '专业、稳重、直接'; changed = true; }
    if (!item.preferences) { item.preferences = '技术、产品、效率'; changed = true; }
    if (!item.style) { item.style = '简洁、结构化'; changed = true; }
  }
  const activeItem = bucket.items.find((x) => x.uid === bucket.active) || bucket.items[0];
  if (activeItem && (!activeItem.project || !activeItem.project.place_uid) && !activeItem.project?.error) {
    try {
      activeItem.project = await createProjectForAvatar(node, activeItem);
    } catch (e) {
      activeItem.project = { error: String(e?.message || e) };
    }
    changed = true;
  }
  if (changed) await writeAvatars(state);
  return { active: bucket.active || bucket.items[0]?.uid || '', items: bucket.items };
}

export async function createProjectForAvatar(node, avatar) {
  const spaces = await listSpaces({ node });
  const space = spaces.find((s) => s.name === '20240724-enterprise')
    || spaces.find((s) => s.name.endsWith('-enterprise'))
    || spaces.find((s) => s.status === 'start');
  if (!space) return { error: 'no enterprise/space available' };
  await warmSpace({ node, space: space.name });
  const create = () => createInstance({
    node,
    space: space.name,
    command: 'web.team.xiangmuguanli.portal',
    place: 'project_name',
    name: `${avatar.name} 的项目管理`,
    city: avatar.city || '深圳市',
    company: avatar.company || '云轩领航',
    uid: avatar.uid,
  });
  let r = await create();
  if (!r?.place_uid) {
    // The space process may still run the binary it booted with, in which case
    // placeCreate is a silent no-op ("not found index"). Rebuild restarts it
    // with the freshly compiled binary before retrying once.
    let rebuild = '';
    try { await buildSpace({ node, space: space.name }); } catch (e) { rebuild = String(e?.message || e); }
    r = await create();
    if (!r?.place_uid) throw new Error(`project instance has no place_uid${rebuild ? ' (rebuild failed: ' + rebuild + ')' : ''}: ${r?.hint || ''}`);
  }
  return { space: r.space, command: r.command, place_uid: r.place_uid, name: r.name, created: true };
}

/** Ensure an avatar has a usable PM instance; used by init and DSH tools. */
export async function ensureProject({ node, avatarUid = '' } = {}) {
  const port = String(Number(node));
  const state = await readAvatars();
  const bucket = state[port];
  const item = bucket?.items?.find((x) => x.uid === (avatarUid || bucket.active));
  if (!item) throw new Error('avatar not found');
  if (item.project?.place_uid) return item.project;
  item.project = await createProjectForAvatar(node, item);
  await writeAvatars(state);
  return item.project;
}

export async function createAvatar({ node, name = '', city = '深圳市', company = '云轩领航', persona = '', preferences = '', style = '', bio = '' } = {}) {
  const port = String(Number(node));
  const state = await readAvatars();
  const bucket = state[port] || (state[port] = { active: '', items: [] });
  const username = `dsh_avatar_${port}_${Date.now().toString(36)}`;
  const r = await http(node, `/c/aaa.user/action/create/userrole/tech/username/${encode(username)}/usernick/${encode(name || '我的分身')}`, { method: 'PUT', timeout: 15000 });
  if (r.status !== 200) throw new Error(`create avatar user failed: HTTP ${r.status}`);
  const uid = r.text.trim();
  if (!/^[0-9a-f]{32}$/i.test(uid)) throw new Error(`create avatar returned no uid: ${r.text.slice(0, 120)}`);
  const item = {
    id: uid, uid, username,
    name: name || `分身 ${bucket.items.length + 1}`,
    city: city || '深圳市', company: company || '云轩领航',
    persona: persona || '专业、亲和',
    preferences: preferences || '', style: style || '简洁、直接', bio: bio || '',
    created: new Date().toISOString(),
  };
  bucket.items.push(item);
  if (!bucket.active) bucket.active = uid;
  state[port] = bucket;
  await writeAvatars(state);
  try {
    item.project = await createProjectForAvatar(node, item);
    await writeAvatars(state);
  } catch (e) {
    item.project = { error: String(e?.message || e) };
    await writeAvatars(state);
  }
  return item;
}

export async function setAvatar({ node, uid } = {}) {
  const port = String(Number(node));
  const state = await readAvatars();
  const bucket = state[port];
  if (!bucket || !bucket.items.some((x) => x.uid === uid)) throw new Error('avatar not found');
  bucket.active = uid;
  await writeAvatars(state);
  return bucket;
}

export async function updateAvatar({ node, uid, patch = {} } = {}) {
  const port = String(Number(node));
  const state = await readAvatars();
  const bucket = state[port];
  const item = bucket?.items?.find((x) => x.uid === uid);
  if (!item) throw new Error('avatar not found');
  for (const key of ['name', 'city', 'company', 'persona', 'preferences', 'style', 'bio', 'image']) {
    if (typeof patch[key] === 'string' && patch[key].trim()) item[key] = patch[key].trim();
  }
  if (Array.isArray(patch.skills)) item.skills = patch.skills.filter((x) => typeof x === 'string' && x.trim()).slice(0, 20);
  await writeAvatars(state);
  return item;
}

export async function deleteAvatar({ node, uid } = {}) {
  const port = String(Number(node));
  const state = await readAvatars();
  const bucket = state[port];
  if (!bucket) return { deleted: false };
  bucket.items = bucket.items.filter((x) => x.uid !== uid);
  if (!bucket.items.length) {
    const first = await defaultAvatar(node);
    bucket.items = [first];
    bucket.active = first.uid;
  } else if (bucket.active === uid) {
    bucket.active = bucket.items[0].uid;
  }
  await writeAvatars(state);
  return bucket;
}

/* ── 我的背景：每个用户可以建任意多个背景，每个背景可上传一张照片作为赛博世界 ── */
export function backgroundsFile() {
  return path.join(stateDir(), 'backgrounds.json');
}
export async function readBackgrounds() {
  try { return JSON.parse(await fs.readFile(backgroundsFile(), 'utf8')) || {}; } catch { return {}; }
}
export async function writeBackgrounds(state) {
  await fs.mkdir(stateDir(), { recursive: true });
  await fs.writeFile(backgroundsFile(), JSON.stringify(state, null, 2));
}
const DEFAULT_BACKGROUND = { id: 'default', name: '默认赛博世界', image: '', builtin: true };

export async function listBackgrounds({ node } = {}) {
  const port = String(Number(node));
  const state = await readBackgrounds();
  let bucket = state[port];
  if (!bucket || !Array.isArray(bucket.items) || !bucket.items.length) {
    bucket = { active: DEFAULT_BACKGROUND.id, items: [{ ...DEFAULT_BACKGROUND }] };
    state[port] = bucket;
    await writeBackgrounds(state);
  }
  return { active: bucket.active || bucket.items[0].id, items: bucket.items };
}
export async function createBackground({ node, name = '' } = {}) {
  const port = String(Number(node));
  const state = await readBackgrounds();
  const bucket = state[port] || (state[port] = { active: '', items: [] });
  const item = { id: `bg_${Date.now().toString(36)}`, name: name || `背景 ${bucket.items.length + 1}`, image: '', params: {}, created: new Date().toISOString() };
  bucket.items.push(item);
  bucket.active = item.id;
  await writeBackgrounds(state);
  return { active: bucket.active, items: bucket.items, created: item };
}
export async function setBackground({ node, id } = {}) {
  const port = String(Number(node));
  const state = await readBackgrounds();
  const bucket = state[port];
  if (!bucket || !bucket.items.some((x) => x.id === id)) throw new Error('background not found');
  bucket.active = id;
  await writeBackgrounds(state);
  return bucket;
}
export async function updateBackground({ node, id, patch = {} } = {}) {
  const port = String(Number(node));
  const state = await readBackgrounds();
  const bucket = state[port];
  const item = bucket?.items?.find((x) => x.id === id);
  if (!item) throw new Error('background not found');
  for (const k of ['name', 'image']) if (patch[k] !== undefined) item[k] = patch[k];
  if (patch.params && typeof patch.params === 'object') {
    const p = item.params || (item.params = {});
    for (const k of ['theme', 'lang', 'timezone', 'location']) {
      if (patch.params[k] !== undefined) p[k] = String(patch.params[k] || '');
    }
  }
  await writeBackgrounds(state);
  return bucket;
}
export async function deleteBackground({ node, id } = {}) {
  const port = String(Number(node));
  const state = await readBackgrounds();
  const bucket = state[port];
  if (!bucket) return { deleted: false };
  bucket.items = bucket.items.filter((x) => x.id !== id);
  if (!bucket.items.length) bucket.items = [{ ...DEFAULT_BACKGROUND }];
  if (bucket.active === id || !bucket.items.some((x) => x.id === bucket.active)) bucket.active = bucket.items[0].id;
  await writeBackgrounds(state);
  return bucket;
}


/** 把头像/背景图落到节点磁盘，并写入 web.team.gonganxitong.user（avatar/background 列）。 */
export async function saveUserMedia({ node, uid = '', kind = 'avatar', dataUrl = '', name = '' } = {}) {
  if (!uid) throw new Error('uid is required');
  const m = /^data:image\/([a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=\s]+)$/.exec(String(dataUrl || ''));
  if (!m) throw new Error('invalid image data url');
  const ext = m[1] === 'jpeg' ? 'jpg' : m[1].replace(/[^a-zA-Z0-9]/g, '') || 'jpg';
  const nodes = await listNodes();
  const n = nodes.find((x) => Number(x.port) === Number(node));
  if (!n?.dir) throw new Error('node not found');
  const dir = path.join(n.dir, 'var', 'media');
  await fs.mkdir(dir, { recursive: true });
  const file = `${uid}-${kind}.${ext}`;
  await fs.writeFile(path.join(dir, file), Buffer.from(m[2].replace(/\s/g, ''), 'base64'));
  const rel = `var/media/${file}`;
  const field = kind === 'background' ? 'background' : 'avatar';
  let updated = false;
  try {
    const spaces = await listSpaces({ node });
    const space = spaces.find((x) => /-community$/.test(x.name)) || spaces[0];
    if (space?.name) {
      const base = `/s/${space.name}/c/web.team.gonganxitong.user/action`;
      // upsert 档案行（open_id = 分身 uid），再补 background/avatar
      await http(node, `${base}/create?open_id=${encode(uid)}&avatar=${encode(rel)}&usernick=${encode(name || '我的数字分身')}`, { method: 'PUT', timeout: 12000 }).catch(() => null);
      const r = await http(node, `${base}/modify?user_uid=${encode(uid)}&name=${encode(name || '我的数字分身')}&${field}=${encode(rel)}`, { method: 'POST', timeout: 12000 }).catch(() => null);
      updated = !!r && r.status === 200;
    }
  } catch { /* 平台不可用时只落盘 */ }
  return { path: rel, url: `http://127.0.0.1:${node}/p/${rel}`, updated };
}

/** One persistent DSH user per node; created on first request and reused. */
// 节点台账与 macOS 客户端共用一份：~/.contextos/nodes.json（数组格式，字段对齐
// CtxNodeRegistry 的 dictionaryValue：dir/name/port/parent/platform/source/container/image/resident/env）。
