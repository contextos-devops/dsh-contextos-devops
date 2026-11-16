// 一次性初始化作业：节点 → 标准空间 → 分身 → 场景 → 项目。
// 前端只负责发起和展示日志，不再自己串联每一步，避免“首页 200 但命令还没注册”的竞态。
import { appendDeployLog, resetDeployLog } from './deploy-log.js';
import { deployNode, startNode, dockerBootstrap } from './nodes.js';
import { deployOfficialSpaces } from './nodes.js';
import { buildSpace } from './spaces.js';
import { isCommandReady } from './apps.js';
import { listNodes } from '../base/registry.js';
import { waitFor } from '../misc/async.js';
import { listSpaces } from './spaces.js';
import {
  createAvatar, ensureProject, setAvatar,
  createBackground, updateBackground, setBackground,
} from './avatar.js';
import { pmCreateItem } from './project.js';

const PM_COMMAND = 'web.team.xiangmuguanli.portal';
const STEP_IDS = ['node', 'spaces', 'avatar', 'scene', 'project', 'chat'];
const JOBS = new Map();

function now() { return Date.now(); }
function log(port, text) { return appendDeployLog(port, text); }
function line(port, step, text) { return log(port, `\n[init:${step}] ${text}\n`); }

function publicJob(job) {
  return {
    state: job.state,
    port: job.port,
    current: job.current,
    steps: { ...job.steps },
    startedAt: job.startedAt,
    finishedAt: job.finishedAt,
    elapsedMs: (job.finishedAt || now()) - job.startedAt,
    error: job.error || '',
    result: job.result || null,
    spaces: job.spaces || null,
  };
}

export function getInitStatus(port) {
  const job = JOBS.get(Number(port));
  return job ? publicJob(job) : { state: 'idle', port: Number(port), steps: {}, current: '' };
}

async function mark(job, id, status, detail = '') {
  job.steps[id] = status;
  job.current = id;
  await line(job.port, id, `${status}${detail ? ' · ' + detail : ''}`);
}

async function runStep(job, id, fn) {
  await mark(job, id, 'running');
  try {
    const value = await fn();
    await mark(job, id, 'done', '');
    return value;
  } catch (e) {
    await mark(job, id, 'error', String(e?.message || e));
    throw e;
  }
}

async function waitPortal(node, binaryMode) {
  await waitFor(() => isCommandReady({ node, space: '20240724-enterprise', command: PM_COMMAND }), {
    timeout: 60000, interval: 800, label: '项目管理命令就绪',
  }).catch(async (e) => {
    if (binaryMode) throw e;
    await line(node, 'spaces', '项目管理命令未就绪，重编译 enterprise 后重试');
    await buildSpace({ node, space: '20240724-enterprise' });
    await waitFor(() => isCommandReady({ node, space: '20240724-enterprise', command: PM_COMMAND }), {
      timeout: 30000, interval: 800, label: '项目管理命令重建后就绪',
    });
  });
}

async function runJob(job, args) {
  const { node, cfg } = args;
  const port = node;
  try {
    await line(port, 'node', `start :${port} dir=${cfg.dir || ''} method=${cfg.method || 'auto'}`);

    await runStep(job, 'node', async () => {
      if (cfg.mode === 'docker') {
        const r = await dockerBootstrap({ port, image: cfg.image || 'alpine:3.20', method: cfg.method || 'binary', server: cfg.repo || '', ctxName: cfg.dir || '' });
        return r;
      }
      const nodes = await listNodes();
      const existing = nodes.find((n) => Number(n.port) === Number(port));
      if (existing?.state === 'running') {
        await line(port, 'node', `already running pid=${existing.pid || '-'}`);
        return { reused: true };
      }
      if (existing) {
        await line(port, 'node', `registered but ${existing.state || 'stopped'}; start existing dir`);
        return await startNode({ port, node: existing });
      }
      const r = await deployNode({
        port,
        dir: cfg.dir,
        repo: cfg.repo || '',
        codeSource: cfg.codeSource || '',
        mirror: cfg.mirror || '',
        mode: 'auto',
        method: cfg.method || 'auto',
        ctxName: cfg.dir || '',
        goPolicy: cfg.goPolicy || 'auto',
      });
      if (r?.canStart === false) throw new Error('目标平台二进制已准备，但当前机器不能启动；初始化只支持本机可启动目标');
      return r;
    });

    const nodeRec = (await listNodes()).find((x) => Number(x.port) === Number(port));
    const installed = String(nodeRec?.source || '');
    const method = cfg.method || 'auto';
    const copyMode = cfg.mode !== 'docker' && (method === 'copy' || (method === 'auto' && installed.startsWith('copy:')));
    await line(port, 'spaces', `method=${method} installed=${installed || '-'} copyMode=${copyMode} binaryMode=${cfg.binaryMode ? 'yes' : 'no'}`);
    let binaryMode = cfg.mode === 'docker' || copyMode || (method === 'auto' && installed.startsWith('download:')) ? true : !!cfg.binaryMode;
    if (!binaryMode) {
      // 源码安装需要 git；没有 git 时 deployNode 已经选了 binary，以实际计划为准。
      const nodes = await listNodes();
      const n = nodes.find((x) => Number(x.port) === Number(port));
      const env = await import('./installer.js').then((m) => m.detectInstallEnv({ dir: n?.dir || cfg.dir || '' }));
      binaryMode = !env.git;
      job.binaryMode = binaryMode;
      await line(port, 'spaces', `install source=${binaryMode ? 'binary' : 'source'} git=${env.git ? env.gitVersion || 'yes' : 'no'} go=${env.go ? env.goVersion || 'yes' : 'no'}`);
    }

    const wanted = (cfg.spaces?.length ? cfg.spaces : ['community', 'enterprise']);
    await runStep(job, 'spaces', async () => {
      const before = await listSpaces({ node: port });
      const has = (k) => before.some((s) => String(s.name || '').includes(k));
      const missing = wanted.filter((k) => !has(k));
      const processKeys = copyMode ? wanted : missing;
      const base = wanted.length - processKeys.length;
      job.spaces = { done: base, total: wanted.length, key: '', space: '' };
      const nodeRow = (await listNodes()).find((x) => Number(x.port) === Number(port));
      const target = nodeRow?.platform || '';
      if (processKeys.length) {
        const out = await deployOfficialSpaces({ node: port, keys: processKeys, binaryMode, copyMode, target, onProgress: ({ done, total, key, name, space }) => {
          job.spaces = { done: base + done, total: wanted.length, key, name, space };
        } });
        const bad = out.filter((x) => x.error);
        if (bad.length) throw new Error(bad.map((x) => `${x.key}: ${x.error}`).join('; '));
        await line(port, 'spaces', `created ${out.map((x) => x.space || x.key).join(', ')}`);
      } else {
        await line(port, 'spaces', 'already present');
      }
      job.spaces.done = wanted.length;
      if (wanted.includes('enterprise')) await waitPortal(port, binaryMode);
      return { keys: wanted, binaryMode };
    });

    const avatar = await runStep(job, 'avatar', async () => {
      const a = await createAvatar({
        node: port,
        name: cfg.avatar?.name || '我的数字分身',
        company: cfg.avatar?.company || '云轩领航',
        city: cfg.avatar?.city || '深圳市',
        persona: cfg.avatar?.persona || '专业、亲和、直接',
        preferences: cfg.avatar?.preferences || '技术、产品、效率',
        style: cfg.avatar?.style || '简洁、结构化',
        skipProject: true,
      });
      if (cfg.avatar?.image) {
        await import('./avatar.js').then((m) => m.updateAvatar({ node: port, uid: a.uid, patch: { image: cfg.avatar.image } })).catch(() => null);
      }
      await setAvatar({ node: port, uid: a.uid });
      await line(port, 'avatar', `uid=${a.uid}`);
      return a;
    });

    const scene = await runStep(job, 'scene', async () => {
      const b = await createBackground({ node: port, name: cfg.scene?.name || '我的赛博世界' });
      const id = b?.created?.id || b?.id || '';
      if (id && cfg.scene?.image) await updateBackground({ node: port, id, patch: { image: cfg.scene.image } }).catch(() => null);
      if (id) await setBackground({ node: port, id });
      await line(port, 'scene', `id=${id}`);
      return { id, name: cfg.scene?.name || '我的赛博世界' };
    });

    const project = await runStep(job, 'project', async () => {
      // createAvatar() may already have created the project; ensureProject returns it.
      let p = await ensureProject({ node: port, avatarUid: avatar.uid });
      if (!p?.place_uid) throw new Error('项目管理实例没有 place_uid');
      await line(port, 'project', `place_uid=${p.place_uid}`);
      const title = cfg.project?.name || '我的第一个项目';
      const t = await pmCreateItem({ node: port, avatarUid: avatar.uid, kind: 'target', title, content: cfg.project?.goal || '' });
      const plan = await pmCreateItem({ node: port, avatarUid: avatar.uid, kind: 'plan', targetUid: t.uid, title: `${title} · 计划`, content: cfg.project?.plan || '' });
      await line(port, 'project', `target=${t.uid} plan=${plan.uid}`);
      return { ...p, target_uid: t.uid, plan_uid: plan.uid };
    });

    await runStep(job, 'chat', async () => {
      job.result = { node: port, avatarUid: avatar.uid, projectUid: project.place_uid, space: project.space, targetUid: project.target_uid, planUid: project.plan_uid, sceneId: scene.id };
      job.state = 'done';
      job.finishedAt = now();
      await line(port, 'chat', 'ready');
      return job.result;
    });
  } catch (e) {
    job.state = 'error';
    job.error = String(e?.message || e);
    job.finishedAt = now();
    await line(port, job.current || 'node', `FAILED: ${job.error}`).catch(() => null);
  }
}

export async function startInit({ node, params = {} } = {}) {
  const port = Number(node);
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('invalid node port');
  const existing = JOBS.get(port);
  if (existing?.state === 'running') return { started: false, alreadyRunning: true, ...publicJob(existing) };
  const job = {
    state: 'running', port, current: 'node', steps: Object.fromEntries(STEP_IDS.map((id) => [id, 'wait'])),
    startedAt: now(), finishedAt: 0, error: '', result: null,
  };
  JOBS.set(port, job);
  await resetDeployLog(port);
  await line(port, 'node', `target :${port}`);
  // Run detached: the HTTP call returns immediately, deployLog/initStatus carry progress.
  void runJob(job, { node: port, cfg: params });
  return { started: true, ...publicJob(job) };
}
