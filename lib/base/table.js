// 基础功能：ContextOS 固定宽度表格解析。
export function decodeCell(v) {
  if (typeof v !== 'string' || !v.includes('%')) return v;
  try {
    return decodeURIComponent(v.replace(/\+/g, ' '));
  } catch {
    return v;
  }
}

/** Fixed-width table: use header column offsets, not a 2+ space split. */
export function parseFixedTable(text) {
  const lines = String(text || '').split('\n').filter((l) => l.trim() !== '');
  if (lines.length < 1) return { columns: [], rows: [] };
  const header = lines[0];
  const heads = [];
  const starts = [];
  for (const m of header.matchAll(/\S+/g)) {
    heads.push(m[0]);
    starts.push(m.index);
  }
  const rows = lines.slice(1).map((line) => {
    const row = {};
    heads.forEach((head, i) => {
      const start = starts[i];
      const end = i + 1 < starts.length ? starts[i + 1] : line.length;
      row[head] = decodeCell(String(line.slice(start, end)).trim());
    });
    return row;
  });
  return { columns: heads, rows };
}

/** 空格分隔的表格（非固定宽度）。 */
export function parseTable(text) {
  const lines = String(text || '').split('\n').filter((l) => l.trim() !== '');
  if (lines.length === 0) return { columns: [], rows: [] };
  const cut = (line) => line.trim().split(/\s{2,}/);
  const columns = cut(lines[0]);
  const rows = lines.slice(1).map((line) => {
    const cells = cut(line);
    const row = {};
    columns.forEach((c, i) => { row[c] = decodeCell(cells[i] ?? ''); });
    return row;
  });
  return { columns, rows };
}
