// ContextOS 的系统级列表（/c/aaa.user 等）返回等宽文本表：
//   time                        userrole username       usernick
//   2026-11-14+10%3A48%3A09.375 tech     dsh_copilot_9090 DSH Copilot
// 列为空格填充的固定宽度；这里按表头的列起始位置切片解析。
export function parseTextTable(text) {
  const raw = String(text || '').replace(/\r/g, '');
  const lines = raw.split('\n').filter((l) => l.trim() !== '');
  if (lines.length < 1) return { columns: [], rows: [] };
  const header = lines[0];
  const starts = [];
  for (let i = 0; i < header.length; i++) {
    if (header[i] !== ' ' && (i === 0 || header[i - 1] === ' ')) starts.push(i);
  }
  const columns = starts.map((s, i) => header.slice(s, i + 1 < starts.length ? starts[i + 1] : header.length).trim());
  const rows = lines.slice(1).map((line) => {
    const row = {};
    starts.forEach((s, i) => {
      const end = i + 1 < starts.length ? starts[i + 1] : line.length;
      let v = line.slice(s, end).trim();
      try { v = decodeURIComponent(v.replace(/\+/g, ' ')); } catch { /* 原样保留 */ }
      row[columns[i]] = v;
    });
    return row;
  });
  return { columns, rows };
}
