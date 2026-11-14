import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { ctxRoot } from './lib/base/env.js';
import { listNodes } from './lib/base/registry.js';
import { writeData, readData } from './lib/core/data.js';
import { createApp } from './lib/core/apps.js';
import { ensureUser } from './lib/core/users.js';
import { setLlm } from './lib/core/copilot.js';
import { deployNode, startNode, stopNode, openNode, openSpace, openTerminalAt, nodeTerminal, spaceTerminal, runPipeline } from './lib/core/nodes.js';
import { migrateStateOnce } from './lib/base/state.js';
import { makeStatic } from './lib/misc/static.js';
import { terminalUpgrade } from './lib/core/terminal2.js';
import { startSpace, stopSpace, listSpaces, createSpace } from './lib/core/spaces.js';
import { HTTP_DEBUG, http } from './lib/base/http.js';
import { OPS } from './lib/core/ops.js';

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

    // origin 需要连接本机端口，拿不到就退回 Host 头：只有这一条留在路由层。
    if (op === 'origin') {
      let host = '';
      try { const a = server && server.address && server.address(); if (a && a.port) host = `${!a.address || a.address === '::' || a.address === '::1' ? '127.0.0.1' : a.address}:${a.port}`; } catch {}
      if (!host) { try { host = String(req.headers.host || ''); } catch {} }
      return send(res, 200, { ok: true, data: { host } });
    }

    const entry = OPS[op];
    if (!entry) return send(res, 404, { ok: false, error: `unknown op ${op}` });
    // 节点已启动的操作先确保 DSH Copilot 用户存在（15s 超时，失败不阻断）。
    if (node && !entry.noUser) await ensureUser(node).catch(() => {});
    return send(res, 200, { ok: true, data: await entry.run(body, { node, req }) });
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

















