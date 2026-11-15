#!/usr/bin/env node
// 两个远端一次推完，并按主机挑选正确的 GitHub 账号。
//
// 为什么需要它：~/.git-credentials 里同时存着 shylinux 与 contextos-devops 两个
// GitHub 令牌，git 默认取第一条 → 推 contextos-devops 组织仓库会 403。
// 这里按「远端主机 → 用户名」显式挑一条，避免每次手改凭据。
//
// 用法：node scripts/push-all.mjs [分支]   （默认 master）
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const BRANCH = process.argv[2] || 'master';
const CRED = path.join(os.homedir(), '.git-credentials');
// 主机 → 期望的用户名；没列出的主机走系统默认凭据
const USER_BY_HOST = { 'github.com': 'contextos-devops' };

// 任何一步都不许停下来要口令：拿不到凭据就失败，卡住会让整轮任务挂死
const ENV = { ...process.env, GIT_TERMINAL_PROMPT: '0', GIT_ASKPASS: '/usr/bin/true', SSH_ASKPASS: '/usr/bin/true' };
// 本机存在会拖死 github.com 的代理配置；显式清空后 TLS 直连只需 ~1s
const NO_PROXY = ['-c', 'http.proxy=', '-c', 'https.proxy='];
// GitHub push over this network stalls on HTTP/2 and small fixed buffers:
//   "Failed to connect to github.com port 443 after 75003 ms"
// ls-remote works, so force HTTP/1.1 and a large post buffer for pushes.
const PUSH_TUNING = ['-c', 'http.version=HTTP/1.1', '-c', 'http.postBuffer=524288000'];

function git(args, opts = {}) {
  return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], env: ENV, timeout: 45000, ...opts }).trim();
}

function readCredentials() {
  const out = new Map();
  let text = '';
  try { text = fs.readFileSync(CRED, 'utf8'); } catch { return out; }
  for (const line of text.split('\n')) {
    const m = line.trim().match(/^https:\/\/([^:]+):([^@]+)@(.+)$/);
    if (!m) continue;
    const [, user, token, host] = m;
    if (!out.has(host)) out.set(host, new Map());
    const perHost = out.get(host);
    if (!perHost.has(user)) perHost.set(user, token);
  }
  return out;
}

function helperFor(host, creds) {
  const want = USER_BY_HOST[host];
  const perHost = creds.get(host);
  if (!want || !perHost || !perHost.get(want)) return null;
  const token = perHost.get(want);
  const quoted = token.replace(/'/g, `'\\''`);
  // 先清空其它 helper（否则 store 会抢先返回错的用户名），只留这一条
  return ['-c', 'credential.helper=', '-c', `credential.helper=!f() { echo username=${want}; echo "password=${quoted}"; }; f`];
}

function remotes() {
  const rows = git(['remote', '-v']).split('\n').filter(Boolean);
  const seen = new Map();
  for (const row of rows) {
    const [name, url] = row.split(/\s+/);
    if (!seen.has(name)) seen.set(name, url);
  }
  return seen;
}

function hostOf(url) {
  try { return new URL(url).host; } catch { return ''; }
}

const creds = readCredentials();
const list = remotes();
let failed = 0;
for (const [name, url] of list) {
  const host = hostOf(url);
  const helper = helperFor(host, creds);
  const args = [...NO_PROXY, ...PUSH_TUNING, ...(helper || []), 'push', name, BRANCH];
  console.log(`PUSH  ${name} (${host}) …`);
  try {
    const out = execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], env: ENV, timeout: 240000 });
    console.log(`PASS  ${name} (${host})${helper ? ' — 凭据 contextos-devops' : ''}`);
    const tail = out.trim().split('\n').slice(-1)[0];
    if (tail) console.log(`      ${tail}`);
  } catch (e) {
    failed += 1;
    console.log(`FAIL  ${name} (${host})`);
    const err = String(e.stderr || e.message || '').trim().split('\n').slice(-2).join(' / ');
    if (err) console.log(`      ${err}`);
  }
}

// 推完核对：各远端 HEAD 必须与本地一致
let local = '';
try { local = git(['rev-parse', 'HEAD']); } catch { /* ignore */ }
for (const [name, url] of list) {
  try {
    const head = git([...NO_PROXY, 'ls-remote', name, BRANCH]).split(/\s+/)[0];
    const ok = head && local && head.startsWith(local.slice(0, 8));
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${name} HEAD ${head.slice(0, 8)} ${ok ? '= 本地' : '≠ 本地' + local.slice(0, 8)}`);
    if (!ok) failed += 1;
  } catch {
    console.log(`FAIL  ${name} 无法读取 HEAD`);
    failed += 1;
  }
}

if (failed) { console.log(`\n${failed} 项失败`); process.exit(1); }
console.log('\n两个远端都与本地一致');
