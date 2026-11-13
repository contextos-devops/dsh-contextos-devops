// 基础功能逻辑：OS 差异（可 import misc）。base 不 import core。
import { isWin, spawnDetached } from '../misc/shell.js';

export const isMac = process.platform === 'darwin';
export { isWin };
export const isLinux = process.platform === 'linux';
export const osName = isMac ? 'darwin' : isWin ? 'windows' : 'linux';
export const archName = process.arch === 'arm64' ? 'arm64' : process.arch === 'ia32' ? '386' : 'amd64';
export const platformTriple = () => `${osName}.${archName}`;

/** sqlite 可执行文件：Windows 走 PATH，macOS/Linux 用常见绝对路径并回退 PATH。 */
export function sqliteBin() {
  if (isWin) return 'sqlite3.exe';
  if (isMac) return '/usr/bin/sqlite3';
  return 'sqlite3';
}

/** 用系统浏览器打开 URL。 */
export function openBrowser(url) {
  if (isMac) return spawnDetached('open', [url]);
  if (isWin) return spawnDetached('cmd.exe', ['/c', 'start', '', url]);
  return spawnDetached('xdg-open', [url]);
}

/** 在指定目录打开系统终端。 */
export function openTerminalAt(dir) {
  if (isMac) return spawnDetached('open', ['-a', 'Terminal', dir]);
  if (isWin) return spawnDetached('cmd.exe', ['/c', 'start', 'cmd', '/k', `cd /d "${dir}"`]);
  return spawnDetached('x-terminal-emulator', ['-e', 'bash', '-c', `cd "${dir}" && exec bash`]);
}

/** 内嵌 PTY 是否可用（Windows 无 pty.fork，需要 ConPTY 后端）。 */
export const ptySupported = !isWin;
