// 基础功能：字段 → ContextOS 路径段（key/value/key/value）。
import { encode } from './http.js';

export function fieldSegments(fields) {
  const out = [];
  for (const [key, value] of Object.entries(fields || {})) {
    if (!/^[a-zA-Z_][a-zA-Z0-9_.]*$/.test(key)) throw new Error(`bad field name: ${key}`);
    if (value === undefined || value === null || String(value) === '') continue;
    if (String(value).includes('/')) throw new Error(`field ${key}: ContextOS splits URL paths on "/", use a full-width ／ instead`);
    out.push(`${encode(key)}/${encode(value)}`);
  }
  return out.join('/');
}

// 修改类请求：只有表单字段进路径；*_uid 结尾的进查询参数
export function splitFields(fields) {
  const path = {};
  const query = {};
  for (const [key, value] of Object.entries(fields || {})) {
    if (value === undefined || value === null || String(value) === '') continue;
    if (/_uid$/.test(key)) query[key] = String(value);
    else path[key] = value;
  }
  return { path, query };
}
