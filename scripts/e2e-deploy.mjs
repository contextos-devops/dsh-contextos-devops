#!/usr/bin/env node
// 端到端部署验收：部署节点 → 标准空间 → 分身 → 世界 → 项目。
// 用法：node scripts/e2e-deploy.mjs [--port 9205] [--keep] [--spaces community,enterprise]
// 退出码：0 全部通过；1 有步骤失败；2 无法执行（端口占用/环境不满足）。
import path from 'node:path';
import fsp from 'node:fs/promises';
import { deployNode, stopNode, deployOfficialSpaces } from '../lib/core/nodes.js';
import { listNodes } from '../lib/base/registry.js';
import { listSpaces } from '../lib/core/spaces.js';
import { createAvatar, createBackground, ensureProject, listAvatars } from '../lib/core/avatar.js';
import { http } from '../lib/base/http.js';

const args = process.argv.slice(2);
const flag = (name, def = '') => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? (args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : 'true') : def;
};
const port = Number(flag('port', '9205'));
const keep = args.includes('--keep');
const spaceKeys = String(flag('spaces', 'community,enterprise')).split(',').map((s) => s.trim()).filter(Boolean);

const rows = [];
let failed = 0;
const t0 = Date.now();

async function step(name, fn, { optional = false } = {}) {
  const started = Date.now();
  process.stdout.write(`▶ ${name} … `);
  try {
    const out = await fn();
    const ms = Date.now() - started;
    rows.push({ name, ok: true, ms, detail: summarize(out) });
    console.log(`✓ ${ms}ms ${summarize(out)}`);
    return out;
  } catch (e) {
    const ms = Date.now() - started;
    const msg = String(e?.message || e).replace(/\s+/g, ' ').slice(0, 300);
    rows.push({ name, ok: false, ms, detail: msg });
    console.log(`${optional ? '⚠' : '✗'} ${ms}ms ${msg}`);
    if (!optional) failed += 1;
    return null;
  }
}

function summarize(v) {
  if (v == null) return '';
  if (typeof v === 'string') return v.slice(0, 160);
  if (Array.isArray(v)) return `${v.length} 项`;
  const keys = ['port', 'space', 'place_uid', 'uid', 'name', 'state', 'version', 'dir', 'rebuilt', 'via', 'count'];
  const pick = {};
  for (const k of keys) if (v[k] !== undefined && v[k] !== '') pick[k] = v[k];
  const s = JSON.stringify(pick);
  return s === '{}' ? JSON.stringify(v).slice(0, 160) : s.slice(0, 200);
}

const dir = path.join(path.dirname(process.cwd()), `ContextOS-${port}`);

console.log(`\n== E2E 部署验收 ==\nport ${port} · dir ${dir} · spaces ${spaceKeys.join(',')}\n`);

// 0) 端口/目录预检
const nodes0 = await listNodes().catch(() => []);
const busy = nodes0.some((n) => Number(n.port) === port);
if (busy) {
  console.error(`端口 ${port} 已有节点在跑，换 --port 或先停掉它`);
  process.exit(2);
}
try {
  await fsp.access(dir);
  console.error(`目录 ${dir} 已存在，换 --port 或先删除它`);
  process.exit(2);
} catch { /* 不存在才继续 */ }

// 1) 部署节点（copy 模式：本机复制二进制，最快验证启动链路）
await step('部署节点', async () => deployNode({ port, mode: 'copy', name: `e2e${port}` }));
await step('节点运行', async () => {
  const r = await http(port, '/c/runtime', { timeout: 30000 });
  if (r.status !== 200) throw new Error(`HTTP ${r.status}`);
  const rt = JSON.parse(r.text || '{}');
  if (!rt.boot && !rt.make) throw new Error('runtime 无 boot/make');
  return { port, version: rt.make?.version || '' };
});

// 2) 标准空间（含建仓 + 编译 + 启动）
await step(`标准空间 ${spaceKeys.join('+')}`, async () => {
  const r = await deployOfficialSpaces({ node: port, keys: spaceKeys });
  const bad = (r || []).filter((x) => x && (x.error || x.state === 'failed'));
  if (bad.length) throw new Error(bad.map((x) => `${x.space || x.name}: ${x.error || 'failed'}`).join('; '));
  return { count: (r || []).length };
}, { optional: false });

await step('空间列表回读', async () => {
  const list = await listSpaces({ node: port });
  if (!list.length) throw new Error('listSpaces 为空');
  return list.map((s) => s.name);
});

// 3) 分身 / 世界 / 项目
await step('创建分身', async () => createAvatar({ node: port, name: 'E2E 分身' }));
await step('分身列表回读', async () => {
  const list = await listAvatars({ node: port });
  if (!list?.items?.length) throw new Error('listAvatars 为空');
  return list;
});
await step('创建赛博世界', async () => createBackground({ node: port, name: 'E2E 世界' }));
await step('创建项目实例', async () => ensureProject({ node: port }));

// 4) 汇总
const total = Date.now() - t0;
console.log('\n== 结果 ==');
for (const r of rows) console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${String(r.ms).padStart(6)}ms  ${r.name}  ${r.detail}`);
console.log(`\n总计 ${rows.filter((r) => r.ok).length}/${rows.length} 通过 · ${(total / 1000).toFixed(1)}s · exit ${failed ? 1 : 0}`);

if (!keep) {
  console.log('\n清理：停止节点并删除目录');
  await stopNode({ port }).catch(() => null);
  await fsp.rm(dir, { recursive: true, force: true }).catch(() => null);
} else {
  console.log(`\n保留：${dir}（--keep）`);
}

process.exit(failed ? 1 : 0);
