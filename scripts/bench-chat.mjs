#!/usr/bin/env node
// Prompt budget gate: the chat prompt is the slowest, most repeated payload in
// the plugin. This measures it offline (no model call) and fails when a change
// makes the cached system block or the per-turn payload grow past budget.
import { buildChatPrompt, compactContext } from '../lib/core/copilot.js';

const ctx = {
  node: 9197,
  space: '20240724-enterprise',
  background: { id: 'bg1', name: 'My Cyber World', theme: 'dark' },
  scene: { id: 'bg1', name: 'My Cyber World', theme: 'dark', language: 'zh', timezone: 'Asia/Shanghai', location: 'Shenzhen' },
  avatar: { uid: '74a5dcb4532d5a243bd31cec795c5f38', name: 'My Digital Avatar', city: 'Shenzhen', company: 'Yunxuan' },
  apps: Array.from({ length: 14 }, (_, i) => ({ name: `app${i}`, title: `应用${i}`, command: `web.team.x.f${i}` })),
  functions: {
    target: { uid: 'a'.repeat(32), title: 'My first project' },
    plan: { uid: 'b'.repeat(32), title: '123' },
    task: null, report: null, feedback: null,
  },
};
const history = Array.from({ length: 10 }, (_, i) => ({ role: i % 2 ? 'ai' : 'user', text: 'x'.repeat(2000) }));
const BUDGET = { system: 12000, user: 8000, context: 2000, history: 4200 };

const rows = [];
for (const mode of ['avatar', 'factory', 'iot']) {
  const b = buildChatPrompt({ mode, context: ctx, history, message: '给云办公添加一条供应商' });
  rows.push({
    mode,
    system: Buffer.byteLength(b.systemText),
    user: Buffer.byteLength(b.userText),
    context: Buffer.byteLength(b.contextText),
    history: Buffer.byteLength(b.historyText),
  });
}
const a = buildChatPrompt({ mode: 'avatar', context: ctx, history: [], message: 'hi' });
const b2 = buildChatPrompt({ mode: 'avatar', context: { ...ctx, node: 9188 }, history: [{ role: 'user', text: 'prev' }], message: 'other' });
const stable = a.systemText === b2.systemText;
const compact = compactContext(ctx, '你好');

const lines = [];
const fail = [];
for (const r of rows) {
  lines.push(`${r.mode.padEnd(8)} system ${String(r.system).padStart(6)}  user ${String(r.user).padStart(5)}  ctx ${String(r.context).padStart(4)}  hist ${String(r.history).padStart(5)}`);
  for (const k of ['system', 'user', 'context', 'history']) {
    if (r[k] > BUDGET[k]) fail.push(`${r.mode}.${k} ${r[k]} > ${BUDGET[k]}`);
  }
}
if (!stable) fail.push('system block 不随轮次稳定（前缀缓存会失效）');
if (compact.background) fail.push('compactContext 仍带 background（与 scene 重复）');
if (Array.isArray(compact.apps) && compact.apps.length > 8) fail.push('compactContext 未截断 apps');
if (compact.appsExtra) fail.push('compactContext 未丢弃未知字段');

if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ rows, stable, budget: BUDGET, fail }, null, 2));
} else {
  for (const l of lines) console.log(l);
  console.log(`system 稳定=${stable}  context 压缩后=${Buffer.byteLength(JSON.stringify(compact))}B`);
}
if (fail.length) {
  for (const f of fail) console.error(`FAIL ${f}`);
  process.exit(1);
}
if (!process.argv.includes('--json')) console.log('PASS chat prompt 在预算内');
