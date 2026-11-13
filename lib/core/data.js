// 核心业务：应用数据读写（create/modify/remove + 回读）。
import { http, encode } from '../base/http.js';
import { parseTable } from '../base/table.js';
import { fieldSegments, splitFields } from '../base/field.js';
import { waitFor } from '../misc/async.js';

export async function writeData({ node, space, command, fields = {}, action = 'create', uid = '' }) {
  const base = `/s/${encode(space)}/c/${command}/action/${action}`;
  const parts = splitFields(fields);
  const seg = fieldSegments(parts.path);
  const query = new URLSearchParams({ 'space.noecho': 'true' });
  if (uid) query.set('uid', uid);
  for (const [k, v] of Object.entries(parts.query)) query.set(k, v);
  let after;
  for (let attempt = 0; attempt < 2 && !after; attempt++) {
    if (attempt) await new Promise((r) => setTimeout(r, 3000));
    await http(node, `${base}${seg ? '/' + seg : ''}?${query}`, { method: 'PUT', timeout: 30000 });
    try {
      after = await waitFor(async () => {
        const data = await readData({ node, space, command });
        return data.count && !/^0x/.test(data.count) ? data : undefined;
      }, { timeout: 15000, interval: 700, label: `record in ${command}` });
    } catch {
      /* the space may still be restarting after compile; retry the write once */
    }
  }
  if (!after) throw new Error(`record in ${command} did not appear; the space may still be restarting`);
  return { ...after, write: { action, fields } };
}

export async function readData({ node, space, command }) {
  const r = await http(node, `/s/${encode(space)}/c/${command}`, { timeout: 10000 });
  let count = '';
  let columns = [];
  let rows = [];
  try {
    const envelope = JSON.parse(r.text);
    if (envelope && !Array.isArray(envelope)) {
      try {
        const status = JSON.parse(envelope._status?.[0] || '[]');
        count = status.find((row) => row.name === 'count')?.value || '';
      } catch {
        /* count stays empty */
      }
      columns = Array.isArray(envelope.append) ? envelope.append : [];
      const height = Array.isArray(envelope[columns[0]]) ? envelope[columns[0]].length : 0;
      rows = Array.from({ length: height }, (_, i) => {
        const row = {};
        for (const c of columns) row[c] = Array.isArray(envelope[c]) ? envelope[c][i] : '';
        return row;
      });
    }
  } catch {
    const table = parseTable(r.text);
    columns = table.columns;
    rows = table.rows;
  }
  return { node, space, command, status: r.status, columns, rows, count, raw: r.text.slice(0, 4000) };
}

export async function removeData({ node, space, command, uid, fields = {} }) {
  const seg = fieldSegments(fields);
  const query = new URLSearchParams({ 'space.noecho': 'true', uid });
  const r = await http(node, `/s/${encode(space)}/c/${command}/action/remove${seg ? '/' + seg : ''}?${query}`, {
    method: 'DELETE',
    timeout: 30000,
  });
  return { status: r.status, removed: r.text.slice(0, 500) };
}
