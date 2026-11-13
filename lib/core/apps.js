// 核心业务：应用（模板生成/代码/实例/商店/最近应用）。
import fs from 'node:fs/promises';
import fsp from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { http, encode, baseUrl, envelopeRows } from '../base/http.js';
import { listNodes } from '../base/registry.js';
import { ctxRoot } from '../base/env.js';
import { fieldSegments } from '../base/field.js';
import { waitFor } from '../misc/async.js';
import { initSpace, buildSpace, ensureSpaceProcess } from './spaces.js';
import { ensureUser } from './users.js';

export async function storeApps({ node, lang = 'zh' } = {}) {
  const uid = await ensureUser(node);
  const r = await http(node, `/s/20240724-community/c/web.team.gonganxitong.service?user.uid=${encode(uid)}`, { timeout: 15000 });
  if (r.status !== 200) throw new Error(`service store failed: HTTP ${r.status}`);
  const { rows } = envelopeRows(r.text);
  return rows.map((row) => {
    const status = row.service_status || 'offline';
    const actions = ['create', 'code', 'conf', 'data', ...(status === 'online' ? ['offline'] : ['online'])];
    return {
      uid: row.uid || '',
      name: row.name || '',
      title: row.name || '',
      space: row.space || '',
      command: row.index || '',
      place: row.place_key || '',
      module: row.module || '',
      version: row.version || '',
      icon: row.icon || '',
      status,
      status_label: status === 'online' ? (lang === 'zh' ? '已上架' : 'online') : (lang === 'zh' ? '待上架' : 'offline'),
      actions,
    };
  }).filter((x) => x.name && x.command);
}

export async function storeAction({ node, space = '20240724-community', serviceUid = '', action = '' } = {}) {
  if (!/^(online|offline|code|conf|data)$/.test(action)) throw new Error('unsupported store action');
  const uid = await ensureUser(node);
  const r = await http(node, `/s/${encode(space)}/c/web.team.gonganxitong.service/action/${action}?uid=${encode(serviceUid)}&user.uid=${encode(uid)}`, { method: 'POST', timeout: 20000 });
  if (r.status !== 200) throw new Error(`store ${action} failed: HTTP ${r.status}`);
  return { action, serviceUid, status: r.status };
}

export async function createStoreInstance({ node, service = {}, name = '', city = '深圳市', company = '云轩领航', uid = '' } = {}) {
  if (!service.space || !service.command) throw new Error('service space/command is required');
  const title = name || String(service.name || '').split(/\s+/)[0] || '我的应用';
  const r = await createInstance({ node, space: service.space, command: service.command, place: service.place || '', name: title, city, company, serviceUid: service.uid, uid });
  return { ...r, service };
}

export async function listApps({ node, space, avatarUid = '' } = {}) {
  const n = (await listNodes()).find((x) => x.port === Number(node));
  if (!n) throw new Error(`node ${node} not found`);
  const uid = avatarUid;
  if (!uid) return [];
  const r = await http(node, `/s/20240724-community/c/web.team.gonganxitong.portal/action/run/web.team.gonganxitong.recent?user.uid=${encode(uid)}`, { timeout: 12000 });
  if (r.status !== 200) {
    // A node without the community space still gets a filesystem view.
    return scanApps({ node, space });
  }
  const { rows } = envelopeRows(r.text);
  const seen = new Set();
  const apps = [];
  for (const row of rows) {
    const command = String(row.index || '');
    if (!command) continue;
    const name = command.split('.')[2] || '';
    const key = `${row.space}|${command}|${row.place_uid}`;
    if (seen.has(key)) continue;
    seen.add(key);
    let place = '';
    let functions = [];
    if (name && row.space) {
      try {
        const portal = JSON.parse(await fs.readFile(path.join(n.dir, 'usr', 'local', 'work', row.space, 'src', name, 'portal.json'), 'utf8'));
        place = Object.keys(portal.input || {}).find((k) => /_name$/.test(k)) || '';
        functions = Object.keys(portal).filter((k) => !['portal', 'input', 'value'].includes(k));
      } catch { /* app may not be on this disk */ }
    }
    apps.push({
      name,
      title: row.place_name || row.service_name || name,
      service: row.service_name || '',
      service_name: row.service_name || '',
      city_name: row.city_name || '',
      company_name: row.company_name || row.street_name || '',
      command,
      space: row.space || space || '',
      place_uid: row.place_uid || '',
      user_uid: uid,
      updated: row.updated_at || '',
      icon: row.place_avatar || row.service_icon || '',
      place_avatar: row.place_avatar || '',
      path: name ? `src/${name}/portal.json` : '',
      place,
      functions,
      recent: true,
    });
  }
  return apps;
}

export async function scanApps({ node, space } = {}) {
  const n = (await listNodes()).find((x) => x.port === Number(node));
  if (!n) throw new Error(`node ${node} not found`);
  if (!/^[A-Za-z0-9_-]+$/.test(space || '')) throw new Error('bad space name');
  const src = path.join(n.dir, 'usr', 'local', 'work', space, 'src');
  let entries = [];
  try { entries = await fs.readdir(src, { withFileTypes: true }); } catch { return []; }
  const apps = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const portalPath = path.join(src, entry.name, 'portal.json');
    let portal;
    try { portal = JSON.parse(await fs.readFile(portalPath, 'utf8')); } catch { continue; }
    const stat = await fs.stat(portalPath);
    apps.push({
      name: entry.name,
      title: portal.portal || entry.name,
      command: `web.team.${entry.name}.portal`,
      path: `src/${entry.name}/portal.json`,
      port: Number(node),
      space,
      updated: stat.mtime.toISOString(),
      functions: Object.keys(portal).filter((k) => !['portal', 'input', 'value'].includes(k)),
      place: Object.keys(portal.input || {}).find((k) => /_name$/.test(k)) || '',
    });
  }
  return apps.sort((a, b) => String(b.updated).localeCompare(String(a.updated)));
}

export async function autogenApp({ node, space, name, help = '', place = 'profile', value = 'profile', trans = '' } = {}) {
  if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(name || '')) throw new Error('app name must match [a-zA-Z][a-zA-Z0-9_]*');
  if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(place || '')) throw new Error('place must match [a-zA-Z][a-zA-Z0-9_]*');
  const n = (await listNodes()).find((x) => x.port === Number(node));
  if (!n) throw new Error(`node ${node} not found`);
  const dir = path.join(n.dir, 'usr', 'local', 'work', space);
  if (!fsp.existsSync(path.join(dir, '.git'))) await initSpace({ node, space });
  const title = help || name;
  // service/autogen splits trans on Chinese ，、; normalize ASCII commas so a
  // 6-value app with 6 Chinese names never renders an out-of-range index.
  const transText = String(trans || value).replace(/,/g, '，');
  const q = new URLSearchParams({ name, help: title, place, value, trans: transText, space });
  const r = await http(node, `/s/20240724-community/c/web.team.gonganxitong.service/action/autogen?${q}`, {
    method: 'POST',
    timeout: 60000,
  });
  if (r.status !== 200) throw new Error(`autogen failed: HTTP ${r.status}`);
  const portalFile = path.join(dir, 'src', name, 'portal.json');
  await waitFor(async () => fsp.existsSync(portalFile), { timeout: 20000, interval: 500, label: `app ${name}/portal.json` });
  const work = await ensureGoWork(dir).catch((e) => ({ used: false, error: String(e?.message || e) }));
  let built = false;
  let warning = '';
  try {
    await buildSpace({ node, space });
    built = true;
  } catch (e) {
    warning = String(e?.message || e);
  }
  return {
    node: Number(node),
    space,
    name,
    help: title,
    place,
    command: `web.team.${name}.portal`,
    path: `src/${name}/portal.json`,
    built,
    warning,
    goWork: work,
  };
}

export async function createInstance({ node, space, command, place = '', name = '我的应用', city = '深圳市', company = '云轩领航', serviceUid = '', uid = '' } = {}) {
  if (!space || !command) throw new Error('space and command are required');
  const actorUid = uid || await ensureUser(node);
  const placeKey = /_name$/.test(place) ? place : `${place || 'place'}_name`;
  const fields = { city_name: city, company_name: company, [placeKey]: name };
  const seg = fieldSegments(fields);
  const extra = serviceUid ? `&service_uid=${encode(serviceUid)}` : '';
  const r = await http(node, `/s/${encode(space)}/c/${command}/action/placeCreate/${seg}?user.uid=${encode(actorUid)}&user_uid=${encode(actorUid)}${extra}`, { method: 'POST', timeout: 30000 });
  if (r.status !== 200) throw new Error(`placeCreate failed: HTTP ${r.status}`);
  let placeUid = '';
  try {
    const env = JSON.parse(r.text);
    placeUid = env.place_uid?.[0] || env._place_uid?.[0] || '';
  } catch { /* redirect/html response */ }
  if (!placeUid) {
    try {
      const recent = await listApps({ node, avatarUid: actorUid });
      placeUid = recent.find((a) => a.command === command && a.space === space && a.title === name)?.place_uid || '';
    } catch { /* recent is best effort */ }
  }
  if (!placeUid) {
    try {
      const page = await http(node, `/s/${encode(space)}/c/${command}?user.uid=${encode(actorUid)}`, { timeout: 12000 });
      const { rows } = envelopeRows(page.text);
      const hit = rows.find((x) => String(x.name || x.title || x.project_name || '') === name);
      placeUid = hit?.place_uid || hit?.uid || '';
    } catch { /* portal list may require place */ }
  }
  // A fresh user has no recent row until it is created explicitly; read
  // service_uid from the instance portal, then add the row for this user.
  let foundServiceUid = '';
  if (placeUid) {
    try {
      const page = await http(node, `/s/${encode(space)}/c/${command}/${encode(placeUid)}?user.uid=${encode(actorUid)}`, { timeout: 12000 });
      const env = JSON.parse(page.text);
      foundServiceUid = env.service_uid?.[0] || '';
    } catch { /* portal may be html */ }
  }
  if (placeUid && foundServiceUid) {
    try {
      await http(node, `/s/20240724-community/c/web.team.gonganxitong.recent/action/create/place_uid/${encode(placeUid)}/service_uid/${encode(foundServiceUid)}?user.uid=${encode(actorUid)}&user_uid=${encode(actorUid)}`, { method: 'PUT', timeout: 12000 });
    } catch { /* recent is best effort */ }
  }
  return { node: Number(node), space, command, place: placeKey, name, city, company, uid: actorUid, place_uid: placeUid, service_uid: foundServiceUid || serviceUid, created: true };
}

function moduleSource({ zone, name }) {
  const type = name.replace(/[^a-zA-Z0-9_]/g, '');
  return `package ${zone}

import "shylinux.com/x/ice"

type ${type} struct {
\tice.Hash
\tshort  string \`data:"index,title"\`
\tfield  string \`data:"time,index,title,content,user_uid"\`
\tcreate string \`name:"create title* content* user_uid"\`
\tlist   string \`name:"list index auto"\`
}

func init() { ice.Cmd("web.chat.${zone}.${type}", ${type}{}) }
`;
}

async function modulePath(space, dir) {
  try {
    const goMod = await fs.readFile(path.join(dir, 'usr', 'local', 'work', space, 'go.mod'), 'utf8');
    return /^module\s+(\S+)/m.exec(goMod)?.[1] || space.replace(/^\d{8}-/, '');
  } catch {
    return space.replace(/^\d{8}-/, '');
  }
}

async function ensureGoWork(dir) {
  const work = path.join(ctxRoot(), 'go.work');
  if (!fsp.existsSync(work)) return { used: false, reason: 'no go.work' };
  const code = await new Promise((resolve) => {
    const child = spawn('go', ['work', 'use', dir], { cwd: ctxRoot(), stdio: ['ignore', 'pipe', 'pipe'] });
    let err = '';
    child.stderr.on('data', (d) => { err += String(d); });
    child.on('close', (c) => resolve({ code: c, err }));
    child.on('error', (e) => resolve({ code: -1, err: String(e) }));
  });
  return { used: code.code === 0, code: code.code, error: code.err.trim() };
}

async function ensureMainImport({ node, space, dir, module, zone }) {
  const mainPath = path.join(dir, 'usr', 'local', 'work', space, 'src', 'main.go');
  let current = '';
  try {
    current = await fs.readFile(mainPath, 'utf8');
  } catch {
    /* template missing; write the canonical bootstrap */
  }
  const imports = new Set([`${module}/src/${zone}`]);
  for (const match of current.matchAll(/^\s*_\s+"([^"]+)"/gm)) imports.add(match[1]);
  const body = `package main\n\nimport (\n${[...imports].map((i) => `\t_ "${i}"`).join('\n')}\n\n\t"shylinux.com/x/ice"\n)\n\nfunc main() { print(ice.Run()) }\n`;
  if (body === current) return;
  const pod = encode(space);
  const saved = await http(
    node,
    `/s/${pod}/c/web.code.vimer/action/save?path=${encode('src/')}&file=main.go&content=${encode(body)}&space.noecho=true`,
    { method: 'POST', timeout: 30000 },
  );
  if (saved.status !== 200) throw new Error(`main.go save failed: HTTP ${saved.status}`);
}

async function ensureGoMod({ node, space, dir, module }) {
  const goModPath = path.join(dir, 'usr', 'local', 'work', space, 'go.mod');
  let current = '';
  try {
    current = await fs.readFile(goModPath, 'utf8');
  } catch {
    /* create it */
  }
  if (/shylinux\.com\/x\/ice\s+v/.test(current)) return;
  const body = `module ${module}\n\ngo 1.13\n\nrequire shylinux.com/x/ice v1.6.6\n`;
  const saved = await http(
    node,
    `/s/${encode(space)}/c/web.code.vimer/action/save?path=&file=go.mod&content=${encode(body)}&space.noecho=true`,
    { method: 'POST', timeout: 30000 },
  );
  if (saved.status !== 200) throw new Error(`go.mod save failed: HTTP ${saved.status}`);
}

export async function createApp({ node, space, name, zone = 'devops', help = '' }) {
  if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(name || '')) throw new Error('app name must match [a-zA-Z][a-zA-Z0-9_]*');
  if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(zone)) throw new Error('zone must match [a-zA-Z][a-zA-Z0-9_]*');
  const pod = encode(space);
  const short = space.replace(/^\d{8}-/, '');
  const init = await http(
    node,
    `/s/${pod}/c/web.code.git.status/action/init?remote=${encode(`${baseUrl(node)}/x/${short}`)}&space.noecho=true`,
    { method: 'POST', timeout: 30000 },
  );
  if (init.status !== 200) throw new Error(`git init failed: HTTP ${init.status}`);

  const mod = await http(
    node,
    `/s/${pod}/c/web.code.vimer/action/module?name=${encode(name)}&zone=${encode(zone)}&type=Hash&help=${encode(help || name)}&space.noecho=true`,
    { method: 'POST', timeout: 30000 },
  );
  if (mod.status !== 200) throw new Error(`module scaffold failed: HTTP ${mod.status}`);

  const save = await http(
    node,
    `/s/${pod}/c/web.code.vimer/action/save?path=${encode(`src/${zone}/`)}&file=${encode(`${name}.go`)}&content=${encode(moduleSource({ zone, name }))}&space.noecho=true`,
    { method: 'POST', timeout: 30000 },
  );
  if (save.status !== 200) throw new Error(`save failed: HTTP ${save.status}`);

  const nodeDir = (await listNodes()).find((n) => n.port === Number(node))?.dir || path.join(path.dirname(ctxRoot()), `${path.basename(ctxRoot())}-${node}`);
  const module = await modulePath(space, nodeDir);
  await ensureGoMod({ node, space, dir: nodeDir, module });
  await ensureMainImport({ node, space, dir: nodeDir, module, zone });

  // vimer compile builds bin/ice.bin; the process then exits for the daemon to
  // pull it back. On a fresh download-binary space that pull does not always
  // happen, so start it explicitly and verify the pid.
  await http(node, `/s/${pod}/c/web.code.vimer/action/compile?space.noecho=true`, { method: 'POST', timeout: 120000 });
  await ensureSpaceProcess({ node, space, dir: nodeDir });

  const command = `web.chat.${zone}.${name}`;
  const reachable = async () => {
    const r = await http(node, `/s/${pod}/c/${command}`, { timeout: 5000 });
    // A restarting space answers 200 with a `space.dial` envelope; that is not
    // the app answering yet.
    return r.status === 200 && r.text.includes(command) && !r.text.includes('space.dial') && !r.text.includes('from.space');
  };
  try {
    await waitFor(reachable, { timeout: 40000, interval: 1000, label: `app ${command}` });
  } catch {
    // compile exits the process for the daemon to pull back; if that did not
    // happen, start the space explicitly and wait once more.
    await ensureSpaceProcess({ node, space, dir: nodeDir });
    await waitFor(reachable, { timeout: 25000, interval: 1000, label: `app ${command}` });
  }
  await new Promise((r) => setTimeout(r, 1200));
  return { node, space, name, zone, command, path: `src/${zone}/${name}.go` };
}
