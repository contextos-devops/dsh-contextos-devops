// 路径与环境：所有目录推导只在这里，业务代码不拼 HOME。
import os from 'node:os';
import path from 'node:path';

export const HOME = () => os.homedir();

export function ctxRoot() {
  return process.env.CTX_ROOT || path.join(os.homedir(), 'ContextOS');
}

export function stateDir() {
  return process.env.CTX_DEVOPS_STATE || path.join(process.env.DSH_HOME || path.join(os.homedir(), '.dsh'), 'contextos-devops-dsh');
}
