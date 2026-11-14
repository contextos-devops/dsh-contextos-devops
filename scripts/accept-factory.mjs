#!/usr/bin/env node
// 软件工厂端到端验收：创建一次性空间 → 生成应用 → 写读回环 → 清理。
// 用法: node scripts/accept-factory.mjs --url http://127.0.0.1:60749 --node 9197
import process from 'node:process';

const args = Object.fromEntries(process.argv.slice(2).reduce((out, arg, i, all) => {
  if (arg.startsWith('--')) out.push([arg.slice(2), all[i + 1] && !all[i + 1].startsWith('--') ? all[i + 1] : 'true']);
  return out;
}, []));
const base = String(args.url || process.env.DSH_WEB_URL || 'http://127.0.0.1:60749').replace(/\/$/, '');
const node = Number(args.node || 9197);
const short = `verify${Date.now().toString(36)}`;
const app = 'verifyapp';
const command = `web.chat.devops.${app}`;
let space = '';

async function api(op, body = {}) {
  const res = await fetch(`${base}/contextos-devops-dsh/api`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ op, node, ...body }),
    signal: AbortSignal.timeout(180000),
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { throw new Error(`${op}: HTTP ${res.status} ${text.slice(0, 300)}`); }
  if (!json.ok) throw new Error(`${op}: ${json.error || text.slice(0, 300)}`);
  return json.data;
}

let exit = 1;
try {
  const created = await api('createSpace', { name: short });
  space = created.name;
  console.log(`L1 createSpace: ${space}`);

  const generated = await api('createApp', { space, name: app, zone: 'devops', help: 'acceptance probe' });
  console.log(`L1 createApp: ${generated.command}`);

  const written = await api('writeData', {
    space,
    command,
    fields: { title: 'acceptance', content: 'probe' },
  });
  const row = (written.rows || [])[0] || {};
  if (row.title !== 'acceptance' || row.content !== 'probe') {
    throw new Error(`write/read mismatch: ${JSON.stringify(written.rows || []).slice(0, 500)}`);
  }
  console.log(`L1 read-back: title=${row.title} content=${row.content} count=${written.count}`);

  const page = `http://localhost:${node}/s/${space}/c/${command}`;
  console.log(`L2 browser target: ${page}`);
  console.log('ACCEPT factory: PASS');
  console.log(JSON.stringify({ space, command, row, page }, null, 2));
  exit = 0;
} catch (error) {
  console.error(`ACCEPT factory: FAIL — ${error.message}`);
} finally {
  if (space) {
    try {
      const removed = await api('deleteSpace', { space });
      console.log(`cleanup: ${removed.deleted ? 'deleted' : 'not deleted'} ${space}`);
    } catch (error) {
      console.error(`cleanup failed: ${error.message}`);
      exit = 2;
    }
  }
}
process.exit(exit);
