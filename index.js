import fs from 'node:fs/promises';
import fsp from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { openBrowser as platformOpenBrowser, openTerminalAt as platformOpenTerminal, sqliteBin, ptySupported, platformTriple } from './lib/base/platform.js';
import { runShell } from './lib/misc/shell.js';
import { HOME, ctxRoot, stateDir } from './lib/base/env.js';
import { registryPath, readRegistry, writeRegistry, portOnDisk, scanLocalNodes, binExists, pidAlive, listNodes, refreshNodes } from './lib/base/registry.js';
import { decodeCell, parseTable } from './lib/base/table.js';
import { fieldSegments } from './lib/base/field.js';
import { writeData, readData, removeData } from './lib/core/data.js';
import { discoverDevices } from './lib/core/device.js';
import { codegenList, codegenRender, codegenWrite, codegenPath, codegenMerge, moduleInfo, renderFields, renderModel, detectClass, modelFields as modelFields_ } from './lib/core/codegen.js';
import { codegenPlan } from './lib/core/copilot.js';
import { checkField, checkAction } from './lib/core/vocab.js';
import { storeApps, storeAction, createStoreInstance, listApps, scanApps, autogenApp, autogenService, autogenSpec, uniqueAppName, createInstance, createApp, appFields, isCommandReady } from './lib/core/apps.js';
import { loadUsers, saveUsers, ensureUser } from './lib/core/users.js';
import { pmList, pmLog, freePort, fieldOptions, pmCreateItem, pmModifyItem, pmRemoveItem, pmActItem, seedProject, projectStatus } from './lib/core/project.js';
import { avatarsFile, readAvatars, writeAvatars, defaultAvatar, listAvatars, createProjectForAvatar, ensureProject, createAvatar, setAvatar, updateAvatar, deleteAvatar, backgroundsFile, readBackgrounds, writeBackgrounds, listBackgrounds, createBackground, setBackground, updateBackground, deleteBackground, saveUserMedia } from './lib/core/avatar.js';
import { chatWithDSH, llmJson, planProject, setLlm, getLlm, appFunctionPlan, resolveWrite } from './lib/core/copilot.js';
import { listDir, readFile, writeFile, listTree, makeDir, renamePath, removePath, gitStatus } from './lib/core/files.js';
import { deployNode, startNode, stopNode, openNode, openSpace, openTerminalAt, nodeTerminal, spaceTerminal, deleteNode, deleteSpace, deployOfficialSpaces, dockerDeploy, remoteDeploy, remoteLogin, runPipeline, sshHosts, sysControl } from './lib/core/nodes.js';
import { listDataFiles, readDataFile, migrateStateOnce } from './lib/base/state.js';
import { makeStatic } from './lib/misc/static.js';
import { terminalUpgrade } from './lib/core/terminal2.js';
import { waitFor } from './lib/misc/async.js';
import { baseDirOf, spaceBase, spaceDir, startSpace, stopSpace, compileSpace, listSpaces, createSpace, initSpace, buildSpace, openTerminal, ensureSpaceProcess } from './lib/core/spaces.js';
import { USER_CACHE, HTTP_DEBUG, baseUrl, encode, envelopeRows, http, probe, portFree } from './lib/base/http.js';

/**
 * ContextOS DevOps core.
 *
 * Every mutation goes through ContextOS' own HTTP API (SPEC-CICD.md §0.2,
 * USER-API.md §7/§8) or through the documented node bootstrap
 * (`bin/ice.bin serve start`, SPEC-CICD.md §2). No shell wrapping, no private
 * storage formats; node directories stay siblings of the main checkout.
 */


/** 插件用到的数据文件（JSON）清单。 */
/** 读取插件数据文件内容（仅限 state 目录内、单文件 512KB 以内）。 */
/** 把旧版状态目录迁移到新目录（一次性）。 */
const ROUTE = '/contextos-devops-dsh/api';

const text = (value) => [{ type: 'text', text: JSON.stringify(value, null, 2) }];
const output = {
  schema: { type: 'object', properties: {}, additionalProperties: true },
  render: (_args, value) => text(value),
};

const tools = [
  {
    name: 'contextos_deploy_node',
    description:
      'Deploy a local ContextOS service node. mode=copy (default, copy a local bin/ice.bin), mode=download (fetch ice.<os>.<arch> from a /publish source), mode=source (git clone + source etc/miss.sh build). Then bin/ice.bin forever start port <p>, and verify /c/runtime + /v/index.css.',
    parameters: {
      type: 'object',
      properties: {
        port: { type: 'number', description: 'TCP port for the new node (default 9188).' },
        name: { type: 'string', description: 'Optional label for the node registry.' },
        mode: { type: 'string', description: "Deploy mode: 'copy' | 'download' | 'source' (default copy)." },
        parent: { type: 'string', description: "Parent node URL for download source and 'dev <parent>' launch." },
        repo: { type: 'string', description: 'Git repo URL for source mode.' },
        sourceBin: { type: 'string', description: 'Local bin/ice.bin path for copy mode.' },
      },
    },
    async execute(args) {
      return deployNode({
        port: args?.port ?? 9188,
        name: args?.name ?? '',
        mode: args?.mode ?? 'copy',
        parent: args?.parent ?? '',
        repo: args?.repo ?? '',
        sourceBin: args?.sourceBin ?? '',
      });
    },
  },
  {
    name: 'contextos_list_nodes',
    description: 'List ContextOS nodes managed by this plugin with live health (process/HTTP/static assets) and their version.',
    parameters: { type: 'object', properties: {} },
    async execute() {
      return { ctxRoot: ctxRoot(), nodes: await listNodes() };
    },
  },
  {
    name: 'contextos_stop_node',
    description: 'Stop a ContextOS node managed by this plugin by its own var/log/ice.pid; never kills other processes.',
    parameters: {
      type: 'object',
      properties: { port: { type: 'number', description: 'Port of the managed node.' } },
      required: ['port'],
    },
    async execute(args) {
      return stopNode({ port: args.port });
    },
  },
  {
    name: 'contextos_start_node',
    description: "Start a stopped ContextOS node: ./bin/ice.bin forever start port <p> in its directory, then wait for /c/runtime.",
    parameters: { type: 'object', properties: { port: { type: 'number', description: 'Node port.' } }, required: ['port'] },
    async execute(args) { return startNode({ port: args.port }); },
  },
  {
    name: 'contextos_open_node',
    description: "Open a node's home page (http://localhost:<port>/) in the system browser.",
    parameters: { type: 'object', properties: { port: { type: 'number', description: 'Node port.' } }, required: ['port'] },
    async execute(args) { return openNode({ port: args.port }); },
  },
  {
    name: 'contextos_node_terminal',
    description: "Open a macOS Terminal window at the node's directory.",
    parameters: { type: 'object', properties: { port: { type: 'number', description: 'Node port.' } }, required: ['port'] },
    async execute(args) { return nodeTerminal({ port: args.port }); },
  },
  {
    name: 'contextos_space_start',
    description: 'Start a project space: POST /c/dream/action/start?name=<space>.',
    parameters: { type: 'object', properties: { node: { type: 'number' }, space: { type: 'string' } }, required: ['node', 'space'] },
    async execute(args) { return startSpace({ node: args.node, space: args.space }); },
  },
  {
    name: 'contextos_space_stop',
    description: 'Stop a project space: POST /c/dream/action/stop?name=<space>.',
    parameters: { type: 'object', properties: { node: { type: 'number' }, space: { type: 'string' } }, required: ['node', 'space'] },
    async execute(args) { return stopSpace({ node: args.node, space: args.space }); },
  },
  {
    name: 'contextos_space_open',
    description: "Open a project space's home page (http://localhost:<node>/s/<space>/) in the system browser.",
    parameters: { type: 'object', properties: { node: { type: 'number' }, space: { type: 'string' } }, required: ['node', 'space'] },
    async execute(args) { return openSpace({ node: args.node, space: args.space }); },
  },
  {
    name: 'contextos_space_terminal',
    description: "Open a macOS Terminal window at the space's directory (<node>/usr/local/work/<space>).",
    parameters: { type: 'object', properties: { node: { type: 'number' }, space: { type: 'string' } }, required: ['node', 'space'] },
    async execute(args) { return spaceTerminal({ node: args.node, space: args.space }); },
  },
  {
    name: 'contextos_list_spaces',
    description: 'List project spaces on a node (GET /c/dream): full dated name, status, module, version.',
    parameters: {
      type: 'object',
      properties: { node: { type: 'number', description: 'Node port.' } },
      required: ['node'],
    },
    async execute(args) {
      return { node: args.node, spaces: await listSpaces({ node: args.node }) };
    },
  },
  {
    name: 'contextos_create_space',
    description:
      'Create a project space with PUT /c/dream/action/create, wait for the dated name to appear in /c/dream, and wait until the space serves /c/runtime.',
    parameters: {
      type: 'object',
      properties: {
        node: { type: 'number', description: 'Node port.' },
        name: { type: 'string', description: 'Short space name, [a-zA-Z0-9_-]+.' },
      },
      required: ['node', 'name'],
    },
    async execute(args) {
      return createSpace({ node: args.node, name: args.name });
    },
  },
  {
    name: 'contextos_create_app',
    description:
      'Create a real ContextOS app inside a space: git init, vimer module scaffold (Hash), save a CRUD command, compile, and verify the command answers. Returns the command path used for data.',
    parameters: {
      type: 'object',
      properties: {
        node: { type: 'number', description: 'Node port.' },
        space: { type: 'string', description: 'Full dated space name (see contextos_list_spaces).' },
        name: { type: 'string', description: 'App name, [a-zA-Z][a-zA-Z0-9_]*.' },
        zone: { type: 'string', description: 'Module zone / package directory (default devops).' },
        help: { type: 'string', description: 'Command help text.' },
      },
      required: ['node', 'space', 'name'],
    },
    async execute(args) {
      return createApp({
        node: args.node,
        space: args.space,
        name: args.name,
        zone: args.zone ?? 'devops',
        help: args.help ?? '',
      });
    },
  },
  {
    name: 'contextos_write_data',
    description:
      'Write one record through a ContextOS app command with PUT /action/create. Field values must not contain "/" (the URL path separator). Reads the table back and returns the rows.',
    parameters: {
      type: 'object',
      properties: {
        node: { type: 'number', description: 'Node port.' },
        space: { type: 'string', description: 'Full dated space name.' },
        command: { type: 'string', description: 'Command name, e.g. web.chat.devops.note.' },
        fields: { type: 'object', description: 'Field/value pairs, for example {title, content, user_uid}.' },
      },
      required: ['node', 'space', 'command', 'fields'],
    },
    async execute(args) {
      return writeData({ node: args.node, space: args.space, command: args.command, fields: args.fields ?? {} });
    },
  },
  {
    name: 'contextos_read_data',
    description: 'List records of a ContextOS app command (GET /s/<space>/c/<command>) and return the parsed table plus the row count.',
    parameters: {
      type: 'object',
      properties: {
        node: { type: 'number', description: 'Node port.' },
        space: { type: 'string', description: 'Full dated space name.' },
        command: { type: 'string', description: 'Command name.' },
      },
      required: ['node', 'space', 'command'],
    },
    async execute(args) {
      return readData({ node: args.node, space: args.space, command: args.command });
    },
  },
  {
    name: 'contextos_pipeline',
    description:
      'Run the end-to-end CI/CD loop: deploy node -> create space -> create app -> write a record -> read it back. Returns each step with status and elapsed time.',
    parameters: {
      type: 'object',
      properties: {
        port: { type: 'number', description: 'Node port (default 9188).' },
        space: { type: 'string', description: 'Short space name (default devops_demo; no "-").' },
        app: { type: 'string', description: 'App name (default note).' },
      },
    },
    async execute(args) {
      return runPipeline({ port: args?.port ?? 9188, space: args?.space ?? 'devops_demo', app: args?.app ?? 'note' });
    },
  },
];

async function readBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 2 * 1024 * 1024) throw new Error('request body too large');
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

function send(res, status, payload) {
  const calls = HTTP_DEBUG.getStore();
  if (calls && calls.length) payload = { ...payload, debug: calls.slice(-80) };
  const logId = crypto.randomUUID();
  const body = JSON.stringify(payload);
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'log-id': logId });
  res.end(body);
}

const bodyUid = (body, name) => body[`${name}_uid`] || body[`${name}UID`] || body[`${name}Id`] || '';

async function route(req, res) {
  try {
    await migrateStateOnce();
    const incoming = Object.fromEntries(new URL(req.url || '/', 'http://x').searchParams.entries());
    const body = { ...incoming, ...(await readBody(req)) };
    const op = String(body.op || 'health');
    const node = Number(body.node);
    if (op === 'health' || op === 'nodes') {
      return send(res, 200, { ok: true, data: { ctxRoot: ctxRoot(), nodes: await listNodes() } });
    }
    // 强制重扫所有节点（/c/runtime）并写回 ~/.contextos/nodes.json
    if (op === 'refreshNodes') {
      const nodes = await refreshNodes();
      return send(res, 200, { ok: true, data: { count: nodes.length, nodes, file: registryPath() } });
    }
    if (op === 'sshHosts') return send(res, 200, { ok: true, data: await sshHosts() });
    if (op === 'sysControl') return send(res, 200, { ok: true, data: await sysControl({ action: body.action, value: body.value }) });
    if (op === 'git') return send(res, 200, { ok: true, data: await gitStatus({ node, space: body.space }) });
    if (op === 'origin') {
      let host = '';
      try { const a = server && server.address && server.address(); if (a && a.port) host = `${!a.address || a.address === '::' || a.address === '::1' ? '127.0.0.1' : a.address}:${a.port}`; } catch {}
      if (!host) { try { host = String(req.headers.host || ''); } catch {} }
      return send(res, 200, { ok: true, data: { host } });
    }
    if (op === 'stateGet') {
      try { return send(res, 200, { ok: true, data: JSON.parse(await fs.readFile(path.join(stateDir(), 'state.json'), 'utf8')) }); }
      catch { return send(res, 200, { ok: true, data: {} }); }
    }
    if (op === 'stateSet') {
      const name = String(body.name || '');
      if (!name) throw new Error('name is required');
      const file = path.join(stateDir(), 'state.json');
      let data = {};
      try { data = JSON.parse(await fs.readFile(file, 'utf8')); } catch {}
      data[name] = body.value;
      await fs.mkdir(path.dirname(file), { recursive: true });
      await fs.writeFile(file, JSON.stringify(data));
      return send(res, 200, { ok: true, data: { saved: name } });
    }
    if (op === 'deploy') {
      return send(res, 200, {
        ok: true,
        data: await deployNode({ port: body.port, name: body.name, mode: body.mode || 'copy', parent: body.parent || '', repo: body.repo || '', sourceBin: body.sourceBin || '', dir: body.dir || '' }),
      });
    }
    if (op === 'start') return send(res, 200, { ok: true, data: await startNode({ port: body.port }) });
    if (op === 'stop') return send(res, 200, { ok: true, data: await stopNode({ port: body.port }) });
    if (op === 'openNode') return send(res, 200, { ok: true, data: await openNode({ port: body.port }) });
    if (op === 'nodeTerminal') return send(res, 200, { ok: true, data: await nodeTerminal({ port: body.port }) });
    if (op === 'spaceStart') return send(res, 200, { ok: true, data: await startSpace({ node, space: body.space }) });
    if (op === 'spaceStop') return send(res, 200, { ok: true, data: await stopSpace({ node, space: body.space }) });
    if (op === 'spaceOpen') return send(res, 200, { ok: true, data: await openSpace({ node, space: body.space }) });
    if (op === 'spaceTerminal') return send(res, 200, { ok: true, data: await spaceTerminal({ node, space: body.space }) });
    if (op === 'listDir') return send(res, 200, { ok: true, data: await listDir({ node, space: body.space, path: body.path || '' }) });
    if (op === 'mkdir') return send(res, 200, { ok: true, data: await makeDir({ node, space: body.space, path: body.path || '' }) });
    if (op === 'renamePath') return send(res, 200, { ok: true, data: await renamePath({ node, space: body.space, from: body.from || '', to: body.to || '' }) });
    if (op === 'removePath') return send(res, 200, { ok: true, data: await removePath({ node, space: body.space, path: body.path || '' }) });
    if (op === 'compile') return send(res, 200, { ok: true, data: await compileSpace({ node, space: body.space }) });
    if (op === 'tree') return send(res, 200, { ok: true, data: await listTree({ node, space: body.space, path: body.path || '' }) });
    if (op === 'spaceDir') return send(res, 200, { ok: true, data: await spaceDir({ node, space: body.space }) });
    if (op === 'readFile') return send(res, 200, { ok: true, data: await readFile({ node, space: body.space, path: body.path || '' }) });
    if (op === 'writeFile') return send(res, 200, { ok: true, data: await writeFile({ node, space: body.space, path: body.path, content: body.content || '' }) });
    if (op === 'clientError') {
      try {
        await fs.appendFile(path.join(stateDir(), 'client-errors.log'), `[${new Date().toISOString()}] ${String(body.error || '')}\n`);
      } catch {}
      return send(res, 200, { ok: true, data: { logged: true } });
    }
    if (node) await ensureUser(node).catch(() => {});
    if (op === 'spaces') return send(res, 200, { ok: true, data: await listSpaces({ node }) });
    if (op === 'llmInfo') {
      const providers = chatProviders();
      const info = [];
      for (const p of providers) {
        let models = [];
        try { models = await getLlm().listModels(p.id); } catch {}
        info.push({ id: p.id, name: p.name, models: models.slice(0, 8).map((m) => m.id) });
      }
      return send(res, 200, { ok: true, data: { mounted: !!getLlm(), providers: info } });
    }
    if (op === 'chat') {
      return send(res, 200, {
        ok: true,
        data: await chatWithDSH({ message: body.message, history: body.history || [], context: body.context || {}, provider: body.provider || '', model: body.model || '', mode: body.mode || 'factory' }),
      });
    }
    if (op === 'avatars') return send(res, 200, { ok: true, data: await listAvatars({ node }) });
    if (op === 'ensureProject') return send(res, 200, { ok: true, data: await ensureProject({ node, avatarUid: body.uid || '' }) });
    if (op === 'createAvatar') return send(res, 200, { ok: true, data: await createAvatar({ node, name: body.name || '', city: body.city || '深圳市', company: body.company || '云轩领航', persona: body.persona || '', preferences: body.preferences || '', style: body.style || '', bio: body.bio || '' }) });
    if (op === 'setAvatar') return send(res, 200, { ok: true, data: await setAvatar({ node, uid: body.uid }) });
    if (op === 'updateAvatar') return send(res, 200, { ok: true, data: await updateAvatar({ node, uid: body.uid, patch: body.patch || {} }) });
    if (op === 'projectStatus') return send(res, 200, { ok: true, data: await projectStatus({ node, avatarUid: body.uid || '' }) });
    if (op === 'pmList' || op === 'pmTree') return send(res, 200, { ok: true, data: await pmList({ node, avatarUid: body.uid || '', lang: body.lang || 'zh', targetUid: bodyUid(body, 'target'), planUid: bodyUid(body, 'plan'), taskUid: bodyUid(body, 'task'), reportUid: bodyUid(body, 'report'), scope: body.scope || 'target' }) });
    if (op === 'fieldOptions') return send(res, 200, { ok: true, data: await fieldOptions({ node, space: body.space || '', command: body.command || '', field: body.field || '', projectUid: body.project_uid || '', uid: body.uid || '', sessid: body.sessid || '' }) });
    if (op === 'pmCreate') return send(res, 200, { ok: true, data: await pmCreateItem({ node, avatarUid: body.uid || '', kind: body.kind || '', title: body.title || '', content: body.content || '', targetUid: bodyUid(body, 'target'), planUid: bodyUid(body, 'plan'), taskUid: bodyUid(body, 'task'), reportUid: bodyUid(body, 'report'), beginTime: body.begin_time || '', endTime: body.end_time || '', reportType: body.report_type || 'daily', score: body.score || '5', feedbackStatus: body.feedback_status || 'canFinish', uidOptions: body.uid_options || {} }) });
    if (op === 'freePort') return send(res, 200, { ok: true, data: await freePort({ start: body.start || 9188 }) });
    if (op === 'pmLog') return send(res, 200, { ok: true, data: await pmLog({ node, space: body.space || '', logId: body.log_id || '' }) });
    if (op === 'pmModify' || op === 'pmUpdate') return send(res, 200, { ok: true, data: await pmModifyItem({ node, avatarUid: body.uid || '', kind: body.kind || '', uid: body.item_uid || body.itemUID || body.itemId || '', title: body.title || '', content: body.content || '', beginTime: body.begin_time || '', endTime: body.end_time || '', reportType: body.report_type || '', score: body.score || '', feedbackStatus: body.feedback_status || '', uidOptions: body.uid_options || {} }) });
    if (op === 'pmDelete' || op === 'pmRemove') return send(res, 200, { ok: true, data: await pmRemoveItem({ node, avatarUid: body.uid || '', kind: body.kind || '', uid: body.item_uid || body.itemUID || body.itemId || '', uidOptions: body.uid_options || {} }) });
    if (op === 'pmAct') return send(res, 200, { ok: true, data: await pmActItem({ node, avatarUid: body.uid || '', kind: body.kind || '', uid: body.item_uid || body.itemUID || body.itemId || '', action: body.action || '', uidOptions: body.uid_options || {} }) });
    if (op === 'planProject') return send(res, 200, { ok: true, data: await planProject({ node, avatarUid: body.uid || '', goal: body.goal || '' }) });
    if (op === 'deleteAvatar') return send(res, 200, { ok: true, data: await deleteAvatar({ node, uid: body.uid }) });
    if (op === 'backgrounds') return send(res, 200, { ok: true, data: await listBackgrounds({ node }) });
    if (op === 'createBackground') return send(res, 200, { ok: true, data: await createBackground({ node, name: body.name || '' }) });
    if (op === 'setBackground') return send(res, 200, { ok: true, data: await setBackground({ node, id: body.id || '' }) });
    if (op === 'updateBackground') return send(res, 200, { ok: true, data: await updateBackground({ node, id: body.id || '', patch: body.patch || {} }) });
    if (op === 'deleteBackground') return send(res, 200, { ok: true, data: await deleteBackground({ node, id: body.id || '' }) });
    if (op === 'dockerDeploy') return send(res, 200, { ok: true, data: await dockerDeploy({ port: body.port, dir: body.dir || '', image: body.image || '', name: body.name || '' }) });
    if (op === 'remoteDeploy') return send(res, 200, { ok: true, data: await remoteDeploy({ host: body.host || '', user: body.user || '', sshPort: body.ssh_port || 22, port: body.port, dir: body.dir || '', image: body.image || '' }) });
    if (op === 'remoteLogin') return send(res, 200, { ok: true, data: await remoteLogin({ url: body.url || '', user: body.user || '', pass: body.pass || '' }) });
    if (op === 'files') return send(res, 200, { ok: true, data: await listDataFiles() });
    if (op === 'file') return send(res, 200, { ok: true, data: await readDataFile({ name: body.name || '' }) });
    if (op === 'saveUserMedia') return send(res, 200, { ok: true, data: await saveUserMedia({ node, uid: body.uid || '', kind: body.kind || 'avatar', dataUrl: body.dataUrl || '', name: body.name || '' }) });
    if (op === 'devices') return send(res, 200, { ok: true, data: await discoverDevices({ node }) });
    if (op === 'apps') return send(res, 200, { ok: true, data: await listApps({ node, space: body.space, avatarUid: body.uid || '' }) });
    if (op === 'createInstance') {
      return send(res, 200, {
        ok: true,
        data: await createInstance({ node, space: body.space, command: body.command, place: body.place || '', name: body.name || '我的应用', city: body.city || '深圳市', company: body.company || '云轩领航', uid: body.uid || '' }),
      });
    }
    if (op === 'initSpace') {
      const repos = body.repos || '';
      return send(res, 200, { ok: true, data: await initSpace({ node, space: body.space, repos }) });
    }
    if (op === 'nameCheck') {
      const { node, space, name } = body || {};
      return send(res, 200, { ok: true, data: await uniqueAppName({ node, space, name }) });
    }
    if (op === 'codegenList') {
      // 代码生成模板清单
      return send(res, 200, { ok: true, data: codegenList() });
    }
    if (op === 'codegenRender') {
      // 按模板 + 变量渲染代码（不落盘）
      try {
        return send(res, 200, { ok: true, data: codegenRender({ template: body.template, vars: body.vars || {} }) });
      } catch (e) {
        return send(res, 200, { ok: false, error: e.message });
      }
    }
    if (op === 'codegenInspect') {
      // 读模块，判断系统级(ice.Hash)还是平台级(db.Table)，列出字段与动作
      try {
        const hit = (await listNodes()).find((n) => Number(n.port) === Number(body.node));
        const root = (hit && hit.dir) || ctxRoot();
        const file = `${body.zone || 'devops'}/${body.module}.go`;
        const src = await fs.readFile(codegenPath({ root, space: body.space, file }), 'utf8');
        const info = moduleInfo(src);
        let modelFields = [];
        if (info.class === 'platform') {
          const mf = `${body.zone || 'devops'}/model/model.go`;
          try {
            const msrc = await fs.readFile(codegenPath({ root, space: body.space, file: mf }), 'utf8');
            modelFields = modelFields_(msrc);
          } catch (e) { modelFields = []; }
        }
        return send(res, 200, { ok: true, data: { ...info, file, modelFields } });
      } catch (e) {
        return send(res, 200, { ok: false, error: e.message });
      }
    }
    if (op === 'codegenPlan') {
      // 解析「工具栏加个驳回键」「当状态=待审时显示通过键」→ 模板 + 变量
      try {
        return send(res, 200, { ok: true, data: await codegenPlan({ text: body.text || '', module: body.module || '', fields: body.fields || [] }) });
      } catch (e) {
        return send(res, 200, { ok: false, error: e.message });
      }
    }
    if (op === 'codegenApply') {
      // 渲染 + 落盘（只允许 <space>/src/<zone>/<file>.go），可选编译
      try {
        const rawVars = { ...(body.vars || {}) };
        if (body.field && !rawVars.field) rawVars.field = body.field;
        // 字段名先按框架词表归一，再进模板校验
        if (body.template === 'field') {
          const cf0 = checkField(rawVars.field || body.field);
          if (!cf0.ok) throw new Error(`字段名「${rawVars.field || body.field}」不在框架通用词表里，请改用：${cf0.suggest}`);
          rawVars.field = cf0.name;
          body.field = cf0.name;
        }
        if (body.type && !rawVars.type) rawVars.type = body.type;
        if (!rawVars.type) rawVars.type = 'string';
        if (!rawVars.class) {
          try { rawVars.class = detectClass(await fs.readFile(codegenPath({ root, space: body.space, file: `${rawVars.zone || 'devops'}/${rawVars.module}.go` }), 'utf8')); } catch (e) { rawVars.class = 'system'; }
        }
        if (body.zone && !rawVars.zone) rawVars.zone = body.zone;
        if (body.module && !rawVars.module) rawVars.module = body.module;
        for (const k of ['role', 'style', 'icon', 'help', 'label', 'Action', 'action', 'params']) {
          if (body[k] && !rawVars[k]) rawVars[k] = body[k];
        }
        const out = codegenRender({ template: body.template, vars: rawVars });
        if (!out.file) throw new Error('this template has no file; paste the snippet manually');
        const hit = (await listNodes()).find((n) => Number(n.port) === Number(body.node));
        const root = (hit && hit.dir) || ctxRoot();
        const target = codegenPath({ root, space: body.space, file: out.file });
        let existing = '';
        try { existing = await fs.readFile(target, 'utf8'); } catch { existing = ''; }
        let content;
        if (out.template === 'field') {
          // 字段：系统级改 field data 标签；平台级改 fields + model/model.go
          if (!existing) throw new Error(`module file not found: ${out.file}`);
          const want = body.field || out.field;
          const cf = checkField(want);
          if (!cf.ok) throw new Error(`字段名「${want}」不在框架通用词表里，请改用：${cf.suggest}`);
          const fname = cf.name;
          const cls = detectClass(existing);
          content = renderFields(existing, fname, cls);
          const w = await codegenWrite({ root, space: body.space, file: out.file, content });
          let modelChanged = false;
          if (cls === 'platform') {
            const modelFile = `${(out.file || '').split('/')[0]}/model/model.go`;
            try {
              const mp = codegenPath({ root, space: body.space, file: modelFile });
              const msrc = await fs.readFile(mp, 'utf8');
              const next = renderModel(msrc, fname, body.type || 'string', body.module || (out.file || '').split('/')[1]?.replace(/\.go$/, '') || '');
              if (next !== msrc) { await codegenWrite({ root, space: body.space, file: modelFile, content: next }); modelChanged = true; }
            } catch (e) { modelChanged = false; }
          }
          let built = false; let buildNote = '';
          if (body.build !== false) {
            try { await buildSpace({ node: body.node, space: body.space }); built = true; } catch (e) { buildNote = e.message; }
          }
          return send(res, 200, { ok: true, data: { file: out.file, bytes: w.bytes, class: cls, field: fname, renamed: !!cf.renamed, fields: moduleInfo(content).fields, modelChanged, built, buildNote } });
        }
        if (!existing) {
          content = (out.body || '') + (out.actionMethod || '') + (out.method || '');
        } else if (out.whole) {
          throw new Error(`refuse to overwrite existing file: ${out.file}`);
        } else {
          content = codegenMerge({ existing, decl: out.body, methods: (out.actionMethod || '') + (out.method || '') });
        }
        const w = await codegenWrite({ root, space: body.space, file: out.file, content });
        let build = null;
        if (body.build !== false) build = await buildSpace({ node: body.node, space: body.space });
        return send(res, 200, { ok: true, data: { ...w, template: out.template, built: !!(build && build.rebuilt), build } });
      } catch (e) {
        return send(res, 200, { ok: false, error: e.message });
      }
    }
    if (op === 'autogenSpec') {
      // 创建应用的参数表直接来自 service autogen 的 role 定义
      return send(res, 200, { ok: true, data: await autogenSpec({ node }) });
    }
    if (op === 'appPlan') {
      // 生成应用前：AI 调研需求与竞品，给出五个功能及依赖，供用户确认/修改。
      return send(res, 200, { ok: true, data: await appFunctionPlan({ name: body.name || '', help: body.help || '', text: body.text || '' }) });
    }
    if (op === 'resolveWrite') {
      // 写数据前：在最近应用里认出「哪个应用 + 哪个功能 + 能抽到的字段值」
      return send(res, 200, { ok: true, data: await resolveWrite({ text: body.text || '', apps: body.apps || [], mode: body.mode === 'read' ? 'read' : 'write' }) });
    }
    if (op === 'autogenApp') {
      // 生成应用模板优先调云社区服务 autogen；服务不可用时退回本地 Go 生成。
      const args = { node, space: body.space, name: body.name, help: body.help || '', place: body.place || body.name, value: body.value || 'profile', trans: body.trans || '' };
      let data = null;
      try { data = await autogenService(args); } catch (e) { data = null; }
      if (!data || !data.created) data = await autogenApp(args);
      return send(res, 200, { ok: true, data });
    }
    if (op === 'deleteNode') return send(res, 200, { ok: true, data: await deleteNode({ port: body.port }) });
    if (op === 'deleteSpace') return send(res, 200, { ok: true, data: await deleteSpace({ node, space: body.space }) });
    if (op === 'officialSpaces') return send(res, 200, { ok: true, data: await deployOfficialSpaces({ node, keys: body.keys || [] }) });
    if (op === 'storeAction') return send(res, 200, { ok: true, data: await storeAction({ node, space: body.space || '20240724-community', serviceUid: body.service_uid || '', action: body.action || '' }) });
    if (op === 'storeApps') return send(res, 200, { ok: true, data: await storeApps({ node, lang: body.lang || 'zh' }) });
    if (op === 'spaceReady') return send(res, 200, { ok: true, data: { ready: await isCommandReady({ node, space: body.space, command: body.command }) } });
    if (op === 'storageCheck') { const { storageReady } = await import('./lib/core/spaces.js'); return send(res, 200, { ok: true, data: await storageReady({ node }) }); }
    if (op === 'backupSpace') { const { backupSpace } = await import('./lib/core/backup.js'); return send(res, 200, { ok: true, data: await backupSpace({ node, space: body.space, tag: body.tag || '' }) }); }
    if (op === 'backups') { const { listBackups } = await import('./lib/core/backup.js'); return send(res, 200, { ok: true, data: await listBackups({ limit: Number(body.limit) || 20 }) }); }
    if (op === 'sampleNodes') { const { sampleNodes } = await import('./lib/core/backup.js'); return send(res, 200, { ok: true, data: await sampleNodes() }); }
    if (op === 'monitorQuery') { const { monitorQuery } = await import('./lib/core/backup.js'); return send(res, 200, { ok: true, data: await monitorQuery({ node, space: body.space || '', command: body.command, action: body.action || '', params: body.params || {} }) }); }
    if (op === 'createStoreInstance') return send(res, 200, { ok: true, data: await createStoreInstance({ node, service: body.service || {}, name: body.name || '', city: body.city || '深圳市', company: body.company || '云轩领航' }) });
    if (op === 'createSpace') {
      const wanted = body.repos || '';
      return send(res, 200, { ok: true, data: await createSpace({ node, name: body.name, repos: wanted }) });
    }
    if (op === 'buildSpace') return send(res, 200, { ok: true, data: await buildSpace({ node, space: body.space }) });
    if (op === 'commandStyle') {
      // 按钮样式来自命令自省：meta._style[action] === 'danger' 就是危险操作
      const r = await http(node, `/c/command/${body.command || 'dream'}`, { timeout: 8000 });
      let style = {};
      try {
        const env = JSON.parse(r.text);
        style = JSON.parse((env.meta || [])[0] || '{}')._style || {};
      } catch { style = {}; }
      return send(res, 200, { ok: true, data: { command: body.command || 'dream', style } });
    }
    if (op === 'iamList') {
      const { iamList } = await import('./lib/core/iam.js');
      return send(res, 200, { ok: true, data: await iamList({ node, level: body.level || 'system', kind: body.kind || 'user', space: body.space || '', mod: body.mod || '', uid: body.uid || '' }) });
    }
    if (op === 'iamCall') {
      const { iamCall } = await import('./lib/core/iam.js');
      return send(res, 200, { ok: true, data: await iamCall({ node, level: body.level || 'system', kind: body.kind || 'user', space: body.space || '', mod: body.mod || '', action: body.action || 'create', fields: body.fields || {}, args: body.args || [], uid: body.uid || '' }) });
    }
    if (op === 'iamSubjects') {
      // 五种主体 + 资金三类，逐个查命令是否存在（不猜）
      const { SUBJECTS, FUND, commandExists, subjectEndpoints } = await import('./lib/core/iam.js');
      const space = body.space || '20240724-community';
      const subjects = await Promise.all(SUBJECTS.map(async (x) => ({ ...x, exists: await commandExists({ node, space, command: x.command }), url: `http://127.0.0.1:${node}/s/${space}/c/${x.command}` })));
      const funds = await Promise.all(FUND.map(async (x) => ({ ...x, exists: await commandExists({ node, space, command: x.command }), url: `http://127.0.0.1:${node}/s/${space}/c/${x.command}` })));
      return send(res, 200, { ok: true, data: { space, subjects, funds } });
    }
    if (op === 'iamEndpoints') {
      const { iamEndpoints } = await import('./lib/core/iam.js');
      return send(res, 200, { ok: true, data: iamEndpoints({ node, space: body.space || '20240724-community', mod: body.mod || '' }) });
    }
    if (op === 'nodeAuth') {
      // 远程 / 容器节点：取 token 或 sessid（本机节点免登录，不需要）
      const { ensureNodeAuth, peekNodeAuth, appSessid, adminSessid, toolToken } = await import('./lib/core/auth.js');
      if (body.kind === 'admin') {
        try { return send(res, 200, { ok: true, data: { node: Number(node), kind: 'admin', sessid: await adminSessid({ node, username: body.username || '' }) } }); }
        catch (e) { return send(res, 200, { ok: false, error: String(e?.message || e) }); }
      }
      if (body.kind === 'tool') {
        try { return send(res, 200, { ok: true, data: { node: Number(node), kind: 'tool', token: await toolToken({ node }) } }); }
        catch (e) { return send(res, 200, { ok: false, error: String(e?.message || e) }); }
      }
      if (body.kind === 'app') {
        // 应用级 sessid：/s/<space>/c/web.team.gonganxitong.sess/action/create
        try {
          const { appSession } = await import('./lib/core/auth.js');
          const s0 = await appSession({ node, space: body.space || '20240724-community', userUid: body.userUid || body.uid || '' });
          return send(res, 200, { ok: true, data: { node: Number(node), space: body.space || '20240724-community', sessid: s0.sessid, cookie: s0.cookie, kind: 'app' } });
        } catch (e) {
          return send(res, 200, { ok: false, error: String(e?.message || e) });
        }
      }
      try {
        const data = body.peek ? peekNodeAuth({ node }) : await ensureNodeAuth({ node, username: body.username || '', force: !!body.force });
        return send(res, 200, { ok: true, data });
      } catch (e) {
        return send(res, 200, { ok: false, error: String(e?.message || e) });
      }
    }
    if (op === 'openTerminal') return send(res, 200, { ok: true, data: await openTerminal({ node, space: body.space || '' }) });
    if (op === 'createApp') {
      return send(res, 200, {
        ok: true,
        data: await createApp({ node, space: body.space, name: body.name, zone: body.zone || 'devops', help: body.help || '' }),
      });
    }
    if (op === 'readData') {
      const sc = body.scope || {};
      const inst = String(body.inst || sc.system_uid || sc.project_uid || Object.entries(sc).find(([k, v]) => /_uid$/.test(k) && k !== 'user_uid' && v)?.[1] || '');
      const actor = String(body.uid || sc['user.uid'] || sc.user_uid || '');
      const query = { ...(actor ? { 'user.uid': actor } : {}) };
      return send(res, 200, { ok: true, data: await readData({ node, space: body.space, command: body.command, query, inst, record: String(body.record || '') }) });
    }
    if (op === 'appFields') return send(res, 200, { ok: true, data: await appFields({ node, space: body.space, command: body.command || '' }) });
    if (op === 'writeData') {
      return send(res, 200, {
        ok: true,
        data: await writeData({ node, space: body.space, command: body.command, fields: body.fields || {}, scope: body.scope || {} }),
      });
    }
    if (op === 'removeData') return send(res, 200, { ok: true, data: await removeData(body) });
    if (op === 'pipeline') {
      return send(res, 200, {
        ok: true,
        data: await runPipeline({ port: Number(body.port) || 9188, space: body.space || 'devops_demo', app: body.app || 'note' }),
      });
    }
    return send(res, 404, { ok: false, error: `unknown op ${op}` });
  } catch (error) {
    return send(res, 200, { ok: false, error: String(error?.message || error), steps: error?.steps });
  }
}

// webServer must be ready before apply, otherwise the plugin registers its
// tools but silently loses the HTTP route the Web page calls.
export const inject = ['tools', 'webServer', 'llm'];

export function apply(ctx) {
  setLlm(ctx.llm || (ctx.get && ctx.get('llm')) || null);
  for (const tool of tools) {
    ctx.effect(() =>
      ctx.tools.register({
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
        output,
        execute: tool.execute,
        isConcurrencySafe: () => false,
      }),
    );
  }

  const pluginDir = path.dirname(fileURLToPath(import.meta.url));
  const monacoRoot = process.env.CTX_MONACO_DIR || path.join(ctxRoot(), 'usr', 'macos-app', 'Resources', 'monaco');
  const xtermRoot = path.join(pluginDir, 'vendor', 'xterm');
  const threeRoot = path.join(pluginDir, 'vendor', 'three');
  const leafletRoot = path.join(pluginDir, 'vendor', 'leaflet');
  const assetsRoot = path.join(pluginDir, 'assets');

  const server = ctx.webServer || ctx.get('webServer');
  if (server) {
    ctx.effect(() => server.registerUpgrade({ path: '/contextos-devops-dsh/terminal', handler: terminalUpgrade }));
    ctx.effect(() =>
      server.register({
        kind: 'exact',
        path: ROUTE,
        handler: (req, res) => {
          HTTP_DEBUG.run([], () => {
            route(req, res).catch((error) => send(res, 200, { ok: false, error: String(error?.message || error) }));
          });
        },
      }),
    );
    ctx.effect(() => server.register({ kind: 'prefix', path: '/contextos-devops-dsh/monaco', handler: makeStatic('/contextos-devops-dsh/monaco', monacoRoot) }));
    ctx.effect(() => server.register({ kind: 'prefix', path: '/contextos-devops-dsh/xterm', handler: makeStatic('/contextos-devops-dsh/xterm', xtermRoot) }));
    ctx.effect(() => server.register({ kind: 'prefix', path: '/contextos-devops-dsh/three', handler: makeStatic('/contextos-devops-dsh/three', threeRoot) }));
    ctx.effect(() => server.register({ kind: 'prefix', path: '/contextos-devops-dsh/leaflet', handler: makeStatic('/contextos-devops-dsh/leaflet', leafletRoot) }));
    ctx.effect(() => server.register({ kind: 'prefix', path: '/contextos-devops-dsh/assets', handler: makeStatic('/contextos-devops-dsh/assets', assetsRoot) }));
  }
}

















