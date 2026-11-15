// 核心业务：用本地 Go 工具链构建空间，不依赖宿主进程的 PATH。
import path from 'node:path';
import fsp from 'node:fs';
import { spawn } from 'node:child_process';
import { ctxRoot } from '../base/env.js';
import { ensureGo, goEnv } from './toolchain.js';

export function goBinary(node = null) {
  const candidates = [
    process.env.GO,
    node && node.dir ? path.join(node.dir, 'usr', 'local', 'go', 'bin', 'go') : '',
    path.join(ctxRoot(), 'usr', 'local', 'go', 'bin', 'go'),
    '/usr/local/go/bin/go',
  ].filter(Boolean);
  return candidates.find((p) => fsp.existsSync(p)) || '';
}

export function runGo(args, { cwd, timeout = 120000, env = null, go = '' } = {}) {
  go = go || goBinary();
  if (!go) return Promise.reject(new Error('Go toolchain not found; set GO or install usr/local/go'));
  return new Promise((resolve, reject) => {
    const child = spawn(go, args, {
      cwd,
      env: {
        ...process.env,
        ...(env || {}),
        PATH: `${path.dirname(go)}:/usr/local/bin:/usr/bin:/bin`,
        CGO_ENABLED: '0',
        GOPROXY: process.env.GOPROXY || 'https://goproxy.cn,direct',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let out = '';
    let err = '';
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error(`go ${args[0]} timed out`));
    }, timeout);
    child.stdout.on('data', (d) => { out += String(d); });
    child.stderr.on('data', (d) => { err += String(d); });
    child.on('error', (e) => { clearTimeout(timer); reject(e); });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0) resolve({ out, err });
      else reject(new Error(`go ${args.join(' ')} failed (${code}): ${(err || out).trim().slice(-1200)}`));
    });
  });
}

/** Build `bin/ice.bin` for one space. */
export async function goTidyBuild(dir, { node = null } = {}) {
  // 空间是独立模块：必须关掉节点的 go.work，否则 go 会把「主模块」认成
  // shylinux.com/x/ContextOS，报 "main module ... does not contain package".
  const real = await fsp.promises.realpath(dir).catch(() => dir);
  if (!fsp.existsSync(path.join(real, 'go.mod'))) {
    throw new Error(`space is not initialised (no go.mod in ${real})`);
  }
  // git 由 ContextOS 自带；go 缺失时首次编译自动下载到 <node>/usr/local/go。
  const tool = await ensureGo({ node: node || { dir: path.dirname(path.dirname(real)) } });
  const env = goEnv({ node, go: tool.bin });
  await runGo(['mod', 'tidy'], { cwd: real, timeout: 180000, env, go: tool.bin });
  await runGo(['build', '-ldflags', '-w -s', '-o', 'bin/ice.bin', './src'], {
    go: tool.bin,
    cwd: real,
    timeout: 300000,
    env,
  });
}
