// 路径与环境：所有目录推导只在这里，业务代码不拼 HOME。
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';

export const HOME = () => os.homedir();

export function ctxRoot() {
  return process.env.CTX_ROOT || path.join(os.homedir(), 'ContextOS');
}

export function stateDir() {
  if (process.env.CTX_DEVOPS_STATE) return process.env.CTX_DEVOPS_STATE;
  const home = process.env.DSH_HOME || path.join(os.homedir(), '.dsh');
  const dir = path.join(home, 'dsh-contextos-devops');
  const legacy = path.join(home, 'contextos-devops-dsh');
  // 改名一次性迁移：旧目录里的节点缓存/会话/请求日志不能随插件改名丢掉
  try {
    if (!fs.existsSync(dir) && fs.existsSync(legacy)) fs.renameSync(legacy, dir);
  } catch {}
  return dir;
}
