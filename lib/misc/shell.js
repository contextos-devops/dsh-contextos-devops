// 外部辅助工具（叶子层）：进程执行与平台 shell 参数。misc 不 import base/core。
import { spawn } from 'node:child_process';

export const isWin = process.platform === 'win32';

/** shell 执行参数：Unix 用 /bin/sh -c，Windows 用 cmd /c。 */
export function shellArgs(script) {
  return isWin ? ['cmd.exe', ['/d', '/s', '/c', script]] : ['/bin/sh', ['-c', script]];
}

export function runShell(script, cwd, { timeoutMs = 900000 } = {}) {
  const [cmd, args] = shellArgs(script);
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { cwd, env: { ...process.env }, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    let err = '';
    child.stdout.on('data', (d) => { out += d; if (out.length > 65536) out = out.slice(-32768); });
    child.stderr.on('data', (d) => { err += d; if (err.length > 65536) err = err.slice(-32768); });
    const t = setTimeout(() => { try { child.kill('SIGKILL'); } catch {} reject(new Error('shell timeout')); }, timeoutMs);
    child.on('error', (e) => { clearTimeout(t); reject(e); });
    child.on('close', (code) => { clearTimeout(t); resolve({ code, out, err }); });
  });
}

export function spawnDetached(cmd, args) {
  try { spawn(cmd, args, { detached: true, stdio: 'ignore' }).unref(); } catch { /* 打不开就静默 */ }
}
