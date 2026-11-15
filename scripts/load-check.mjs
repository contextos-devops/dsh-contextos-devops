#!/usr/bin/env node
// 加载门禁：产物必须能真正「被模块加载器执行」。
//
// 背景（2026-11-15）：build/client.mjs 的片段列表曾硬编码，08-store.js 与
// 49-msg.js 没进产物，client.js 里 xRead 未定义 → factory 抛 ReferenceError，
// 整个插件在界面里加载失败。静态门禁全绿也发现不了，因为没人执行过 factory。
//
// 三道断言：
//   1. 产物头部 @parts 清单 == src/client/parts 目录（名称 + 内容哈希）
//   2. client.js 能在模拟宿主里求值，并注册到 __ModuleLoader__
//   3. 调用 factory(require) 不抛错，且导出 apply / inject
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const errs = [];

// ---- 1) 片段清单一致 ----
const src = fs.readFileSync(path.join(root, 'client.js'), 'utf8');
const partsDir = path.join(root, 'src/client/parts');
const want = fs.readdirSync(partsDir)
  .filter((f) => f.endsWith('.js'))
  .sort((a, b) => a.localeCompare(b, 'en'))
  .map((f) => `${f}:${crypto.createHash('sha256').update(fs.readFileSync(path.join(partsDir, f))).digest('hex').slice(0, 8)}`);
const line = /^\/\/ @parts (.+)$/m.exec(src);
if (!line) errs.push('client.js 缺少 @parts 清单（build/client.mjs 未生成？）');
else {
  const got = line[1].split(',');
  const missing = want.filter((w) => !got.includes(w));
  const extra = got.filter((g) => !want.includes(g));
  if (missing.length) errs.push(`产物缺少/过期片段：${missing.join(', ')}`);
  if (extra.length) errs.push(`产物包含目录里不存在的片段：${extra.join(', ')}`);
}

// ---- 2) + 3) 模拟加载 ----
const noop = () => {};
const rect = { width: 0, height: 0, left: 0, top: 0, bottom: 0, right: 0 };
const makeEl = () => ({
  dataset: {}, style: { setProperty: noop, getPropertyValue: () => '', getPropertyPriority: () => '' },
  setAttribute: noop, appendChild: noop, addEventListener: noop, removeEventListener: noop,
  classList: { add: noop, remove: noop, toggle: noop, contains: () => false },
  querySelector: () => null, querySelectorAll: () => [], getBoundingClientRect: () => rect,
  focus: noop, blur: noop, remove: noop, insertAdjacentHTML: noop, contains: () => false,
  getContext: () => null, clientWidth: 0, clientHeight: 0, scrollTop: 0, scrollLeft: 0,
});
const React = {
  createElement: (type, props) => ({ type, props }),
  useState: (v) => [typeof v === 'function' ? v() : v, noop],
  useEffect: noop, useLayoutEffect: noop, useCallback: (f) => f, useRef: (v) => ({ current: v }),
  useMemo: (f) => f(), useId: () => 'id',
  createContext: (v) => ({ Provider: null, Consumer: null, _v: v }),
  memo: (c) => c, forwardRef: (f) => f, Fragment: '#fragment', StrictMode: '#strict',
  Component: class { constructor(props) { this.props = props || {}; this.state = {}; } setState(u) { this.state = { ...this.state, ...(typeof u === 'function' ? u(this.state) : u) }; } forceUpdate() {} render() { return null; } },
  PureComponent: class { constructor(props) { this.props = props || {}; } render() { return null; } },
};
let registered = null;
const store = new Map();
const sandbox = {
  console: { log: noop, warn: noop, error: noop, info: noop, debug: noop },
  setTimeout, clearTimeout, setInterval, clearInterval, queueMicrotask,
  URL, URLSearchParams, TextEncoder, TextDecoder, Promise, Math, Date, JSON, Intl, RegExp,
  fetch: async () => ({ ok: true, status: 200, json: async () => ({}), text: async () => '' }),
  WebSocket: class { constructor() { this.readyState = 1; } close() {} send() {} addEventListener() {} },
  ResizeObserver: class { observe() {} unobserve() {} disconnect() {} },
  IntersectionObserver: class { observe() {} unobserve() {} disconnect() {} },
  MutationObserver: class { observe() {} disconnect() {} },
  requestAnimationFrame: noop, cancelAnimationFrame: noop,
  getComputedStyle: () => ({ getPropertyValue: () => '' }),
  localStorage: { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) },
  location: { hostname: '127.0.0.1', href: 'http://127.0.0.1/', protocol: 'http:', search: '' },
  navigator: { language: 'zh-CN', userAgent: 'load-check' },
  matchMedia: () => ({ matches: false, addEventListener: noop, removeEventListener: noop }),
  innerWidth: 1440, innerHeight: 900, devicePixelRatio: 2,
  addEventListener: noop, removeEventListener: noop, dispatchEvent: () => true,
  scrollTo: noop, open: () => null, alert: noop, confirm: () => true,
};
sandbox.window = sandbox;
sandbox.self = sandbox;
sandbox.globalThis = sandbox;
sandbox.top = sandbox;
sandbox.parent = sandbox;
sandbox.document = {
  createElement: makeEl, querySelector: () => null, querySelectorAll: () => [],
  addEventListener: noop, removeEventListener: noop, getElementById: () => null,
  head: makeEl(), body: makeEl(), documentElement: makeEl(),
  createTextNode: (t) => ({ text: t }),
};
sandbox.window.__ModuleLoader__ = { load: (m) => { registered = m; } };

try {
  vm.createContext(sandbox);
  vm.runInContext(src, sandbox, { filename: 'client.js' });
} catch (e) {
  errs.push(`client.js 求值失败：${e.message}`);
}
if (!registered) errs.push('client.js 未向 __ModuleLoader__ 注册模块');
else {
  if (registered.id !== 'dsh-contextos-devops') errs.push(`模块 id 异常：${registered.id}`);
  let out = null;
  try {
    out = registered.factory((name) => {
      if (name === 'react') return React;
      if (name === 'react-dom' || name === 'react-dom/client') return { createPortal: (n) => n, createRoot: () => ({ render: noop }) };
      return {};
    });
  } catch (e) {
    errs.push(`factory() 抛错（插件会在界面加载失败）：${e.message}`);
  }
  if (out) {
    if (typeof out.apply !== 'function') errs.push('factory 未导出 apply()');
    if (!Array.isArray(out.inject)) errs.push('factory 未导出 inject 数组');
  }
}

if (errs.length) {
  console.error('FAIL  client bundle 无法安全加载：');
  for (const e of errs) console.error('  - ' + e);
  process.exit(1);
}
console.log(`PASS  client bundle 可加载（${want.length} 片段、factory 正常导出 apply/inject）`);
