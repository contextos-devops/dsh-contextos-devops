// 服务端操作注册表：op → { method, noUser, run(body, ctx) }。
//
// 这里是插件 HTTP API 的**唯一入口清单**：index.js 只做分发，不再写业务分支。
// - method 与客户端 api() 的传输方法一一对应（GET 查询 / PUT 创建 / POST 其余），
//   由 scripts/op-check.mjs 交叉校验，防止两端漂移。
// - noUser: true 表示不预先 ensureUser(node)。这些操作在“节点还没起来”时也要能用
//   （探活、扫描、git 状态、启停节点本身），提前建用户会卡 15s。
// - run() 抛错即失败；index.js 统一回 { ok: false, error }。
import fs from 'node:fs/promises';
import path from 'node:path';
import { ctxRoot, stateDir } from '../base/env.js';
import { registryPath, listNodes, refreshNodes } from '../base/registry.js';
import { writeData, readData, removeData } from './data.js';
import { discoverDevices } from './device.js';
import { storeApps, storeAction, createStoreInstance, listApps, autogenApp, autogenService, autogenSpec, uniqueAppName, createInstance, createApp, appFields, isCommandReady } from './apps.js';
import { freePort, fieldOptions, pmCreateItem, pmModifyItem, pmRemoveItem, pmActItem, pmList, pmLog, projectStatus, seedProject } from './project.js';
import { listAvatars, ensureProject, createAvatar, setAvatar, updateAvatar, deleteAvatar, listBackgrounds, createBackground, setBackground, updateBackground, deleteBackground, saveUserMedia } from './avatar.js';
import { chatWithDSH, getLlm, planProject, chatProviders, appFunctionPlan, resolveWrite, codegenPlan } from './copilot.js';
import { appRoute } from './appindex.js';
import { listDir, readFile, writeFile, listTree, makeDir, renamePath, removePath, gitStatus } from './files.js';
import { deployNode, startNode, stopNode, openNode, openSpace, nodeTerminal, deleteNode, deleteSpace, deployOfficialSpaces, dockerDeploy, dockerBootstrap, remoteDeploy, remoteLogin, runPipeline, sshHosts, sysControl, spaceTerminal } from './nodes.js';
import { checkUpdate } from './update.js';
import { deployOptions } from './installer.js';
import { readDeployLog } from './deploy-log.js';
import { startInit, getInitStatus } from './init.js';
import { listDataFiles, readDataFile, migrateStateKeys } from '../base/state.js';
import { spaceDir, startSpace, stopSpace, compileSpace, listSpaces, createSpace, initSpace, buildSpace, openTerminal } from './spaces.js';
import { codegenList, codegenRender, codegenPath, codegenWrite, codegenMerge, moduleInfo, renderFields, renderModel, detectClass, modelFields as readModelFields } from './codegen.js';
import { checkField } from './vocab.js';
import { http } from '../base/http.js';

const bodyUid = (body, name) => body[`${name}_uid`] || body[`${name}UID`] || body[`${name}Id`] || '';
const itemUid = (body) => body.item_uid || body.itemUID || body.itemId || '';
const str = (v) => (v == null ? '' : String(v));

/** 读节点根目录：优先用注册表里的 dir，找不到退回主仓根。 */
async function nodeRoot(node) {
  const hit = (await listNodes()).find((n) => Number(n.port) === Number(node));
  return (hit && hit.dir) || ctxRoot();
}

export const OPS = {
  // ---- 探活与注册表 ----
  health: { method: 'GET', noUser: true, run: async () => ({ ctxRoot: ctxRoot(), nodes: await listNodes() }) },
  nodes: { method: 'GET', noUser: true, run: async () => ({ ctxRoot: ctxRoot(), nodes: await listNodes() }) },
  refreshNodes: { method: 'POST', noUser: true, run: async () => { const nodes = await refreshNodes(); return { count: nodes.length, nodes, file: registryPath() }; } },

  // ---- 本机能力 ----
  sshHosts: { method: 'GET', noUser: true, run: async () => await sshHosts() },
  sysControl: { method: 'POST', noUser: true, run: async (b) => await sysControl({ action: b.action, value: b.value }) },

  // ---- 文件与 git（节点没起来也要能看代码）----
  git: { method: 'GET', noUser: true, run: async (b, c) => await gitStatus({ node: c.node, space: b.space }) },
  listDir: { method: 'GET', noUser: true, run: async (b, c) => await listDir({ node: c.node, space: b.space, path: str(b.path) }) },
  mkdir: { method: 'POST', noUser: true, run: async (b, c) => await makeDir({ node: c.node, space: b.space, path: str(b.path) }) },
  renamePath: { method: 'POST', noUser: true, run: async (b, c) => await renamePath({ node: c.node, space: b.space, from: str(b.from), to: str(b.to) }) },
  removePath: { method: 'POST', noUser: true, run: async (b, c) => await removePath({ node: c.node, space: b.space, path: str(b.path) }) },
  tree: { method: 'GET', noUser: true, run: async (b, c) => await listTree({ node: c.node, space: b.space, path: str(b.path) }) },
  spaceDir: { method: 'POST', noUser: true, run: async (b, c) => await spaceDir({ node: c.node, space: b.space }) },
  readFile: { method: 'GET', noUser: true, run: async (b, c) => await readFile({ node: c.node, space: b.space, path: str(b.path) }) },
  writeFile: { method: 'POST', noUser: true, run: async (b, c) => await writeFile({ node: c.node, space: b.space, path: b.path, content: str(b.content) }) },
  compile: { method: 'POST', noUser: true, run: async (b, c) => await compileSpace({ node: c.node, space: b.space }) },

  // ---- 节点 ----
  deployLog: { method: 'POST', noUser: true, run: async (b) => await readDeployLog(b.port) },
  initProject: { method: 'POST', noUser: true, run: async (b) => await startInit({ node: b.node, params: b.params || b }) },
  initStatus: { method: 'POST', noUser: true, run: async (b) => getInitStatus(b.port) },
  deployOptions: { method: 'POST', noUser: true, run: async (b) => await deployOptions({ dir: b.dir || '', repo: b.repo || '', codeSource: b.codeSource || '', mirror: b.mirror || '', server: b.server || '' }) },
  containerBootstrap: { method: 'POST', noUser: true, run: async (b) => await dockerBootstrap({ port: b.port, image: b.image || '', method: b.method || 'binary', server: b.server || '', ctxName: b.ctxName || b.dir || '', name: b.name || '' }) },
  deploy: { method: 'POST', noUser: true, run: async (b) => await deployNode({ port: b.port, name: b.name, mode: b.mode || 'auto', method: b.method || '', parent: b.parent || '', repo: b.repo || '', codeSource: b.codeSource || '', mirror: b.mirror || '', sourceBin: b.sourceBin || '', dir: b.dir || '', target: b.target || '', server: b.server || '', ctxName: b.ctxName || '', goPolicy: b.goPolicy || 'auto', dryRun: !!b.dryRun }) },
  start: { method: 'POST', noUser: true, run: async (b) => await startNode({ port: b.port }) },
  stop: { method: 'POST', noUser: true, run: async (b) => await stopNode({ port: b.port }) },
  openNode: { method: 'POST', noUser: true, run: async (b) => await openNode({ port: b.port }) },
  nodeTerminal: { method: 'POST', noUser: true, run: async (b) => await nodeTerminal({ port: b.port }) },
  deleteNode: { method: 'POST', run: async (b) => await deleteNode({ port: b.port }) },
  dockerDeploy: { method: 'POST', run: async (b) => await dockerDeploy({ port: b.port, dir: b.dir || '', image: b.image || '', name: b.name || '' }) },
  remoteDeploy: { method: 'POST', run: async (b) => await remoteDeploy({ host: b.host || '', user: b.user || '', sshPort: b.ssh_port || 22, port: b.port, dir: b.dir || '', image: b.image || '' }) },
  remoteLogin: { method: 'POST', run: async (b) => await remoteLogin({ url: b.url || '', user: b.user || '', pass: b.pass || '' }) },
  pipeline: { method: 'POST', run: async (b) => await runPipeline({ port: Number(b.port) || 9188, space: b.space || 'devops_demo', app: b.app || 'note' }) },

  // ---- 空间 ----
  spaces: { method: 'GET', run: async (b, c) => await listSpaces({ node: c.node }) },
  createSpace: { method: 'POST', run: async (b, c) => await createSpace({ node: c.node, name: b.name, repos: b.repos || '' }) },
  initSpace: { method: 'POST', run: async (b, c) => await initSpace({ node: c.node, space: b.space, repos: b.repos || '' }) },
  buildSpace: { method: 'POST', run: async (b, c) => await buildSpace({ node: c.node, space: b.space }) },
  spaceStart: { method: 'POST', noUser: true, run: async (b, c) => await startSpace({ node: c.node, space: b.space }) },
  spaceStop: { method: 'POST', noUser: true, run: async (b, c) => await stopSpace({ node: c.node, space: b.space }) },
  spaceOpen: { method: 'POST', noUser: true, run: async (b, c) => await openSpace({ node: c.node, space: b.space }) },
  spaceTerminal: { method: 'POST', noUser: true, run: async (b, c) => await spaceTerminal({ node: c.node, space: b.space }) },
  openTerminal: { method: 'POST', run: async (b, c) => await openTerminal({ node: c.node, space: b.space || '' }) },
  deleteSpace: { method: 'POST', run: async (b, c) => await deleteSpace({ node: c.node, space: b.space }) },
  officialSpaces: { method: 'POST', run: async (b, c) => await deployOfficialSpaces({ node: c.node, keys: b.keys || [], binaryMode: !!b.binaryMode, copyMode: !!b.copyMode, target: b.target || '' }) },
  spaceReady: { method: 'POST', run: async (b, c) => ({ ready: await isCommandReady({ node: c.node, space: b.space, command: b.command }) }) },
  storageCheck: { method: 'POST', run: async (b, c) => { const { storageReady } = await import('./spaces.js'); return await storageReady({ node: c.node }); } },
  backupSpace: { method: 'POST', run: async (b, c) => { const { backupSpace } = await import('./backup.js'); return await backupSpace({ node: c.node, space: b.space, tag: b.tag || '' }); } },
  backups: { method: 'POST', run: async (b) => { const { listBackups } = await import('./backup.js'); return await listBackups({ limit: Number(b.limit) || 20 }); } },
  sampleNodes: { method: 'POST', run: async () => { const { sampleNodes } = await import('./backup.js'); return await sampleNodes(); } },
  // ---- 工具链（git 自带，go 按需下载）----
  envDoctor: { method: 'GET', noUser: true, run: async (b, c) => { const { envDoctor } = await import('./toolchain.js'); return await envDoctor({ node: { port: c.node, dir: (await nodeRoot(c.node)) } }); } },
  goEnsure: { method: 'POST', noUser: true, run: async (b, c) => { const { ensureGo } = await import('./toolchain.js'); return await ensureGo({ node: { port: c.node, dir: (await nodeRoot(c.node)) }, min: b.min || undefined }); } },
  monitorQuery: { method: 'POST', run: async (b, c) => { const { monitorQuery } = await import('./backup.js'); return await monitorQuery({ node: c.node, space: b.space || '', command: b.command, action: b.action || '', params: b.params || {} }); } },

  // ---- 应用 ----
  apps: { method: 'GET', run: async (b, c) => await listApps({ node: c.node, space: b.space, avatarUid: b.uid || '' }) },
  createApp: { method: 'POST', run: async (b, c) => await createApp({ node: c.node, space: b.space, name: b.name, zone: b.zone || 'devops', help: b.help || '' }) },
  createInstance: { method: 'POST', run: async (b, c) => await createInstance({ node: c.node, space: b.space, command: b.command, place: b.place || '', name: b.name || '我的应用', city: b.city || '深圳市', company: b.company || '云轩领航', uid: b.uid || '' }) },
  nameCheck: { method: 'POST', run: async (b, c) => await uniqueAppName({ node: c.node, space: b.space, name: b.name }) },
  appFields: { method: 'POST', run: async (b, c) => await appFields({ node: c.node, space: b.space, command: b.command || '' }) },
  autogenSpec: { method: 'POST', run: async (b, c) => await autogenSpec({ node: c.node }) },
  autogenApp: { method: 'POST', run: async (b, c) => { const args = { node: c.node, space: b.space, name: b.name, help: b.help || '', place: b.place || b.name, value: b.value || 'profile', trans: b.trans || '' }; let data = null; try { data = await autogenService(args); } catch { data = null; } if (!data || !data.created) data = await autogenApp(args); return data; } },
  appPlan: { method: 'POST', run: async (b) => await appFunctionPlan({ name: b.name || '', help: b.help || '', text: b.text || '' }) },
  resolveWrite: { method: 'POST', run: async (b) => await resolveWrite({ text: b.text || '', apps: b.apps || [], mode: b.mode === 'read' ? 'read' : 'write' }) },
  appRoute: { method: 'POST', run: async (b, c) => await appRoute({ node: c.node, uid: b.uid || '', text: b.text || '', mode: b.mode === 'read' ? 'read' : b.mode === 'create' ? 'create' : 'write', space: b.space || '', apps: b.apps || null }) },

  // ---- 应用商店 ----
  storeApps: { method: 'GET', run: async (b, c) => await storeApps({ node: c.node, lang: b.lang || 'zh' }) },
  storeAction: { method: 'POST', run: async (b, c) => await storeAction({ node: c.node, space: b.space || '20240724-community', serviceUid: b.service_uid || '', action: b.action || '' }) },
  createStoreInstance: { method: 'POST', run: async (b, c) => await createStoreInstance({ node: c.node, service: b.service || {}, name: b.name || '', city: b.city || '深圳市', company: b.company || '云轩领航' }) },

  // ---- 代码生成 ----
  codegenList: { method: 'POST', run: async () => codegenList() },
  codegenRender: { method: 'POST', run: async (b) => codegenRender({ template: b.template, vars: b.vars || {} }) },
  codegenInspect: { method: 'POST', run: async (b) => {
    const root = await nodeRoot(b.node);
    const file = `${b.zone || 'devops'}/${b.module}.go`;
    const src = await fs.readFile(codegenPath({ root, space: b.space, file }), 'utf8');
    const info = moduleInfo(src);
    let modelFields = [];
    if (info.class === 'platform') {
      const mf = `${b.zone || 'devops'}/model/model.go`;
      try { modelFields = readModelFields(await fs.readFile(codegenPath({ root, space: b.space, file: mf }), 'utf8')); } catch { modelFields = []; }
    }
    return { ...info, file, modelFields };
  } },
  codegenPlan: { method: 'POST', run: async (b) => await codegenPlan({ text: b.text || '', module: b.module || '', fields: b.fields || [] }) },
  codegenApply: { method: 'POST', run: async (b) => {
    const root = await nodeRoot(b.node);
    const rawVars = { ...(b.vars || {}) };
    if (b.field && !rawVars.field) rawVars.field = b.field;
    if (b.template === 'field') {
      const cf0 = checkField(rawVars.field || b.field);
      if (!cf0.ok) throw new Error(`字段名「${rawVars.field || b.field}」不在框架通用词表里，请改用：${cf0.suggest}`);
      rawVars.field = cf0.name; b.field = cf0.name;
    }
    if (b.type && !rawVars.type) rawVars.type = b.type;
    if (!rawVars.type) rawVars.type = 'string';
    if (!rawVars.class) {
      try { rawVars.class = detectClass(await fs.readFile(codegenPath({ root, space: b.space, file: `${rawVars.zone || 'devops'}/${rawVars.module}.go` }), 'utf8')); } catch { rawVars.class = 'system'; }
    }
    if (b.zone && !rawVars.zone) rawVars.zone = b.zone;
    if (b.module && !rawVars.module) rawVars.module = b.module;
    for (const k of ['role', 'style', 'icon', 'help', 'label', 'Action', 'action', 'params']) if (b[k] && !rawVars[k]) rawVars[k] = b[k];

    const out = codegenRender({ template: b.template, vars: rawVars });
    if (!out.file) throw new Error('this template has no file; paste the snippet manually');
    const target = codegenPath({ root, space: b.space, file: out.file });
    let existing = '';
    try { existing = await fs.readFile(target, 'utf8'); } catch { existing = ''; }

    if (out.template === 'field') {
      if (!existing) throw new Error(`module file not found: ${out.file}`);
      const want = b.field || out.field;
      const cf = checkField(want);
      if (!cf.ok) throw new Error(`字段名「${want}」不在框架通用词表里，请改用：${cf.suggest}`);
      const fname = cf.name;
      const cls = detectClass(existing);
      const content = renderFields(existing, fname, cls);
      const w = await codegenWrite({ root, space: b.space, file: out.file, content });
      let modelChanged = false;
      if (cls === 'platform') {
        const modelFile = `${str(out.file).split('/')[0]}/model/model.go`;
        try {
          const mp = codegenPath({ root, space: b.space, file: modelFile });
          const msrc = await fs.readFile(mp, 'utf8');
          const next = renderModel(msrc, fname, b.type || 'string', b.module || str(out.file).split('/')[1]?.replace(/\.go$/, '') || '');
          if (next !== msrc) { await codegenWrite({ root, space: b.space, file: modelFile, content: next }); modelChanged = true; }
        } catch { modelChanged = false; }
      }
      let built = false; let buildNote = '';
      if (b.build !== false) { try { await buildSpace({ node: b.node, space: b.space }); built = true; } catch (e) { buildNote = e.message; } }
      return { file: out.file, bytes: w.bytes, class: cls, field: fname, renamed: !!cf.renamed, fields: moduleInfo(content).fields, modelChanged, built, buildNote };
    }

    let content;
    if (!existing) content = (out.body || '') + (out.actionMethod || '') + (out.method || '');
    else if (out.whole) throw new Error(`refuse to overwrite existing file: ${out.file}`);
    else content = codegenMerge({ existing, decl: out.body, methods: (out.actionMethod || '') + (out.method || '') });
    const w = await codegenWrite({ root, space: b.space, file: out.file, content });
    let build = null;
    if (b.build !== false) build = await buildSpace({ node: b.node, space: b.space });
    return { ...w, template: out.template, built: !!(build && build.rebuilt), build };
  } },

  // ---- 项目管理（PM）----
  seedProject: { method: 'POST', run: async (b, c) => await seedProject({ node: c.node, avatarUid: b.uid || '' }) },
  pmList: { method: 'GET', run: async (b, c) => await pmList({ node: c.node, avatarUid: b.uid || '', lang: b.lang || 'zh', targetUid: bodyUid(b, 'target'), planUid: bodyUid(b, 'plan'), taskUid: bodyUid(b, 'task'), reportUid: bodyUid(b, 'report'), scope: b.scope || 'target', focusKind: String(b.focus_kind || ''), focusUid: String(b.focus_uid || '') }) },
  pmTree: { method: 'GET', run: async (b, c) => await pmList({ node: c.node, avatarUid: b.uid || '', lang: b.lang || 'zh', targetUid: bodyUid(b, 'target'), planUid: bodyUid(b, 'plan'), taskUid: bodyUid(b, 'task'), reportUid: bodyUid(b, 'report'), scope: b.scope || 'target', focusKind: String(b.focus_kind || ''), focusUid: String(b.focus_uid || '') }) },
  pmCreate: { method: 'PUT', run: async (b, c) => await pmCreateItem({ node: c.node, avatarUid: b.uid || '', kind: b.kind || '', title: b.title || '', content: b.content || '', targetUid: bodyUid(b, 'target'), planUid: bodyUid(b, 'plan'), taskUid: bodyUid(b, 'task'), reportUid: bodyUid(b, 'report'), beginTime: b.begin_time || '', endTime: b.end_time || '', reportType: b.report_type || 'daily', score: b.score || '5', feedbackStatus: b.feedback_status || 'canFinish', uidOptions: b.uid_options || {} }) },
  pmModify: { method: 'POST', run: async (b, c) => await pmModifyItem({ node: c.node, avatarUid: b.uid || '', kind: b.kind || '', uid: itemUid(b), title: b.title || '', content: b.content || '', beginTime: b.begin_time || '', endTime: b.end_time || '', reportType: b.report_type || '', score: b.score || '', feedbackStatus: b.feedback_status || '', uidOptions: b.uid_options || {} }) },
  pmUpdate: { method: 'POST', run: async (b, c) => await pmModifyItem({ node: c.node, avatarUid: b.uid || '', kind: b.kind || '', uid: itemUid(b), title: b.title || '', content: b.content || '', beginTime: b.begin_time || '', endTime: b.end_time || '', reportType: b.report_type || '', score: b.score || '', feedbackStatus: b.feedback_status || '', uidOptions: b.uid_options || {} }) },
  pmDelete: { method: 'POST', run: async (b, c) => await pmRemoveItem({ node: c.node, avatarUid: b.uid || '', kind: b.kind || '', uid: itemUid(b), uidOptions: b.uid_options || {} }) },
  pmRemove: { method: 'POST', run: async (b, c) => await pmRemoveItem({ node: c.node, avatarUid: b.uid || '', kind: b.kind || '', uid: itemUid(b), uidOptions: b.uid_options || {} }) },
  pmAct: { method: 'POST', run: async (b, c) => await pmActItem({ node: c.node, avatarUid: b.uid || '', kind: b.kind || '', uid: itemUid(b), action: b.action || '', uidOptions: b.uid_options || {} }) },
  pmLog: { method: 'POST', run: async (b, c) => await pmLog({ node: c.node, space: b.space || '', logId: b.log_id || '' }) },
  projectStatus: { method: 'GET', run: async (b, c) => await projectStatus({ node: c.node, avatarUid: b.uid || '' }) },
  fieldOptions: { method: 'GET', run: async (b, c) => await fieldOptions({ node: c.node, space: b.space || '', command: b.command || '', field: b.field || '', projectUid: b.project_uid || '', uid: b.uid || '', sessid: b.sessid || '' }) },
  freePort: { method: 'POST', run: async (b) => await freePort({ start: b.start || 9188 }) },
  planProject: { method: 'POST', run: async (b, c) => await planProject({ node: c.node, avatarUid: b.uid || '', goal: b.goal || '' }) },

  // ---- 分身与背景 ----
  avatars: { method: 'GET', run: async (b, c) => await listAvatars({ node: c.node }) },
  ensureProject: { method: 'POST', run: async (b, c) => await ensureProject({ node: c.node, avatarUid: b.uid || '' }) },
  createAvatar: { method: 'POST', run: async (b, c) => await createAvatar({ node: c.node, name: b.name || '', city: b.city || '深圳市', company: b.company || '云轩领航', persona: b.persona || '', preferences: b.preferences || '', style: b.style || '', bio: b.bio || '' }) },
  setAvatar: { method: 'POST', run: async (b, c) => await setAvatar({ node: c.node, uid: b.uid }) },
  updateAvatar: { method: 'POST', run: async (b, c) => await updateAvatar({ node: c.node, uid: b.uid, patch: b.patch || {} }) },
  deleteAvatar: { method: 'POST', run: async (b, c) => await deleteAvatar({ node: c.node, uid: b.uid }) },
  backgrounds: { method: 'GET', run: async (b, c) => await listBackgrounds({ node: c.node }) },
  createBackground: { method: 'POST', run: async (b, c) => await createBackground({ node: c.node, name: b.name || '' }) },
  setBackground: { method: 'POST', run: async (b, c) => await setBackground({ node: c.node, id: b.id || '' }) },
  updateBackground: { method: 'POST', run: async (b, c) => await updateBackground({ node: c.node, id: b.id || '', patch: b.patch || {} }) },
  deleteBackground: { method: 'POST', run: async (b, c) => await deleteBackground({ node: c.node, id: b.id || '' }) },
  saveUserMedia: { method: 'POST', run: async (b, c) => await saveUserMedia({ node: c.node, uid: b.uid || '', kind: b.kind || 'avatar', dataUrl: b.dataUrl || '', name: b.name || '' }) },

  // ---- 设备 ----
  devices: { method: 'GET', run: async (b, c) => await discoverDevices({ node: c.node }) },

  // ---- 数据 ----
  readData: { method: 'GET', run: async (b, c) => {
    const sc = b.scope || {};
    const inst = str(b.inst || sc.system_uid || sc.project_uid || Object.entries(sc).find(([k, v]) => /_uid$/.test(k) && k !== 'user_uid' && v)?.[1] || '');
    const actor = str(b.uid || sc['user.uid'] || sc.user_uid || '');
    return await readData({ node: c.node, space: b.space, command: b.command, query: actor ? { 'user.uid': actor } : {}, inst, record: str(b.record) });
  } },
  writeData: { method: 'POST', run: async (b, c) => await writeData({ node: c.node, space: b.space, command: b.command, fields: b.fields || {}, scope: b.scope || {} }) },
  removeData: { method: 'POST', run: async (b) => await removeData(b) },

  // ---- AI ----
  llmInfo: { method: 'GET', run: async () => {
    const info = [];
    for (const p of chatProviders()) {
      let models = [];
      try { models = await getLlm().listModels(p.id); } catch { /* adapter without catalog */ }
      info.push({ id: p.id, name: p.name, models: models.slice(0, 8).map((m) => m.id) });
    }
    return { mounted: !!getLlm(), providers: info };
  } },
  chat: { method: 'POST', run: async (b) => await chatWithDSH({ message: b.message, history: b.history || [], context: b.context || {}, provider: b.provider || '', model: b.model || '', mode: b.mode || 'factory' }) },

  // ---- IAM ----
  iamList: { method: 'POST', run: async (b, c) => { const { iamList } = await import('./iam.js'); return await iamList({ node: c.node, level: b.level || 'system', kind: b.kind || 'user', space: b.space || '', mod: b.mod || '', uid: b.uid || '' }); } },
  iamCall: { method: 'POST', run: async (b, c) => { const { iamCall } = await import('./iam.js'); return await iamCall({ node: c.node, level: b.level || 'system', kind: b.kind || 'user', space: b.space || '', mod: b.mod || '', action: b.action || 'create', fields: b.fields || {}, args: b.args || [], uid: b.uid || '' }); } },
  iamSubjects: { method: 'POST', run: async (b, c) => {
    const { SUBJECTS, FUND, commandExists } = await import('./iam.js');
    const space = b.space || '20240724-community';
    const rows = async (list) => Promise.all(list.map(async (x) => ({ ...x, exists: await commandExists({ node: c.node, space, command: x.command }), url: `http://127.0.0.1:${c.node}/s/${space}/c/${x.command}` })));
    return { space, subjects: await rows(SUBJECTS), funds: await rows(FUND) };
  } },
  iamEndpoints: { method: 'POST', run: async (b, c) => { const { iamEndpoints } = await import('./iam.js'); return iamEndpoints({ node: c.node, space: b.space || '20240724-community', mod: b.mod || '' }); } },
  nodeAuth: { method: 'POST', run: async (b, c) => {
    const { ensureNodeAuth, peekNodeAuth, adminSessid, toolToken } = await import('./auth.js');
    if (b.kind === 'admin') return { node: Number(c.node), kind: 'admin', sessid: await adminSessid({ node: c.node, username: b.username || '' }) };
    if (b.kind === 'tool') return { node: Number(c.node), kind: 'tool', token: await toolToken({ node: c.node }) };
    if (b.kind === 'app') {
      const { appSession } = await import('./auth.js');
      const space = b.space || '20240724-community';
      const s0 = await appSession({ node: c.node, space, userUid: b.userUid || b.uid || '' });
      return { node: Number(c.node), space, sessid: s0.sessid, cookie: s0.cookie, kind: 'app' };
    }
    return b.peek ? peekNodeAuth({ node: c.node }) : await ensureNodeAuth({ node: c.node, username: b.username || '', force: !!b.force });
  } },

  // ---- 命令自省与数据文件 ----
  scanCommands: { method: 'POST', run: async (b, c) => {
    const { listApps, scanApps } = await import('./apps.js');
    const node = Number(c.node || b.node);
    const space = b.space || '';
    const out = [];
    try { out.push(...(await listApps({ node, space }))); } catch {}
    try { out.push(...(await scanApps({ node, space }))); } catch {}
    const seen = new Set();
    const items = [];
    for (const a of out) {
      const command = a.command || a.name || '';
      if (!command || seen.has(command)) continue;
      seen.add(command);
      items.push({ command, title: a.title || a.help || a.name || command, space: a.space || space, place_uid: a.place_uid || '' });
    }
    return { node, space, items };
  } },
  commandStyle: { method: 'POST', run: async (b, c) => {
    const r = await http(c.node, `/c/command/${b.command || 'dream'}`, { timeout: 8000 });
    let style = {};
    try { style = JSON.parse((JSON.parse(r.text).meta || [])[0] || '{}')._style || {}; } catch { style = {}; }
    return { command: b.command || 'dream', style };
  } },
  files: { method: 'GET', run: async () => await listDataFiles() },
  file: { method: 'GET', run: async (b) => await readDataFile({ name: b.name || '' }) },

  // ---- 状态存储（state.json）----
  stateGet: { method: 'GET', noUser: true, run: async () => {
    const file = path.join(stateDir(), 'state.json');
    let data = {};
    try { data = JSON.parse(await fs.readFile(file, 'utf8')); } catch { return {}; }
    const before = JSON.stringify(data);
    migrateStateKeys(data);
    if (JSON.stringify(data) !== before) { try { await fs.writeFile(file, JSON.stringify(data)); } catch { /* read-only fs */ } }
    return data;
  } },
  stateSet: { method: 'POST', noUser: true, run: async (b) => {
    const name = str(b.name);
    if (!name) throw new Error('name is required');
    const file = path.join(stateDir(), 'state.json');
    let data = {};
    try { data = JSON.parse(await fs.readFile(file, 'utf8')); } catch { /* first write */ }
    migrateStateKeys(data);
    data[name] = b.value;
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, JSON.stringify(data));
    return { saved: name };
  } },

  // ---- 客户端上报 ----
  // ---- 版本与更新 ----
  checkUpdate: { method: 'GET', noUser: true, run: async (b) => await checkUpdate({ force: b.force === true || /^(1|true|yes|on)$/i.test(String(b.force ?? '')) }) },

  clientError: { method: 'POST', noUser: true, run: async (b) => {
    try { await fs.appendFile(path.join(stateDir(), 'client-errors.log'), `[${new Date().toISOString()}] ${str(b.error)}\n`); } catch { /* ignore */ }
    return { logged: true };
  } },
};

/** 供 UI/索引使用：按名字分组，便于 docs/CODE-INDEX.md 生成。 */
export function opIndex() {
  const rows = [];
  for (const [op, entry] of Object.entries(OPS)) {
    const source = String(entry.run).slice(0, 400);
    rows.push({ op, method: entry.method, noUser: !!entry.noUser, source });
  }
  return rows;
}
