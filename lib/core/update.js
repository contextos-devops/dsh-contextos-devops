// 检查更新：只问 npm registry，不信「本机能跑」。
// 设计约束：
// 1. 离线/超时必须 4s 内返回，且绝不抛错——头部徽标不能因为网络挂掉而消失；
// 2. 结果缓存 30 分钟，避免每次打开界面都打一次 registry；
// 3. 只做「发现 + 提示」，不在服务端执行更新（更新要用户确认，且 npm 装的是 profile）。
import fs from 'node:fs';
import path from 'node:path';

export const PKG_NAME = 'dsh-contextos-devops';
export const REGISTRY = 'https://registry.npmjs.org';
export const NPM_PAGE = `https://www.npmjs.com/package/${PKG_NAME}`;
export const REPO_PAGE = 'https://github.com/contextos-devops/dsh-contextos-devops';

const TTL_MS = 30 * 60 * 1000;
const TIMEOUT_MS = 4000;
let cache = { at: 0, value: null };

const str = (v) => (v === undefined || v === null ? '' : String(v));

/** 解析 semver（够用即可：1.48.35 / 1.48.35-rc.1 → [1,48,35] + prerel）。 */
export function parseVersion(v) {
  const m = String(v || '').trim().match(/^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?/);
  if (!m) return null;
  return { nums: [Number(m[1]), Number(m[2]), Number(m[3])], pre: m[4] || '' };
}

/** a>b → 1，a<b → -1，相等（不含预发布差异）→ 0；预发布 < 同号正式版。 */
export function compareVersion(a, b) {
  const pa = parseVersion(a);
  const pb = parseVersion(b);
  if (!pa || !pb) return 0;
  for (let i = 0; i < 3; i++) {
    if (pa.nums[i] !== pb.nums[i]) return pa.nums[i] > pb.nums[i] ? 1 : -1;
  }
  if (pa.pre === pb.pre) return 0;
  if (!pa.pre) return 1;
  if (!pb.pre) return -1;
  return pa.pre > pb.pre ? 1 : -1;
}

function pkgFile() {
  return path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..', 'package.json');
}

/** 本地版本以 package.json 为准（构建产物里的版本号可能旧）。 */
export function localVersion() {
  try {
    return str(JSON.parse(fs.readFileSync(pkgFile(), 'utf8')).version);
  } catch { return ''; }
}

async function fetchLatest(registry = REGISTRY) {
  const url = `${String(registry).replace(/\/+$/, '')}/${PKG_NAME}/latest`;
  const res = await fetch(url, {
    headers: { accept: 'application/json' },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return {
    latest: str(data.version),
    tarball: str(data.dist?.tarball),
    npm: NPM_PAGE,
  };
}

/**
 * 检查更新。
 * @param {{force?: boolean, registry?: string}} [opts]
 * @returns {Promise<{ok:boolean,name:string,local:string,latest:string,hasUpdate:boolean,checkedAt:string,source:string,error?:string,tarball?:string,publishedAt?:string}>}
 */
export async function checkUpdate({ force = false, registry = REGISTRY } = {}) {
  const local = localVersion();
  const base = { name: PKG_NAME, local, source: String(registry).replace(/\/+$/, ''), npm: NPM_PAGE, repo: REPO_PAGE };
  if (!force && cache.value && Date.now() - cache.at < TTL_MS) {
    return { ...cache.value, cached: true, local };
  }
  try {
    const hit = await fetchLatest(registry);
    const value = {
      ok: true,
      ...base,
      latest: hit.latest,
      tarball: hit.tarball,
      hasUpdate: compareVersion(hit.latest, local) > 0,
      checkedAt: new Date().toISOString(),
    };
    cache = { at: Date.now(), value };
    return value;
  } catch (e) {
    // 失败不覆盖缓存：上次成功的结果仍可展示（标 stale）
    const msg = str(e && (e.message || e));
    if (cache.value) return { ...cache.value, local, cached: true, stale: true, error: msg };
    return { ok: false, ...base, latest: '', hasUpdate: false, checkedAt: new Date().toISOString(), error: msg };
  }
}

/** 供测试与门禁用：清掉缓存。 */
export function resetUpdateCache() {
  cache = { at: 0, value: null };
}
