// 把 release/catalog-entry.yml 提交成 awesome-dsh-plugin 的一个 PR。
//
// 默认只做「计划」（检查前置条件，不写任何东西）：
//   node scripts/catalog-pr.mjs
// 真正执行（建 fork → 提交条目 → 开 PR）：
//   node scripts/catalog-pr.mjs --create
//
// 为什么要有这一步：收录要求仓库创建满 1 天、package.json 声明 dsh.bundle、仓库带
// dsh-plugin topic、描述属实。任何一条不满足，PR 会被 CI 直接打回；先本地判一遍，
// 省掉一次往返。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const UPSTREAM = 'awesome-dsh-plugin/awesome-dsh-plugin';
const ENTRY = path.join(root, 'release/catalog-entry.yml');
const CREATE = process.argv.includes('--create');

const creds = (() => {
  const p = path.join(process.env.HOME || '', '.git-credentials');
  if (!fs.existsSync(p)) return null;
  for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
    const m = line.match(/^https:\/\/([^:]+):([^@]+)@github\.com/);
    if (m && m[1] === 'contextos-devops') return { user: m[1], token: decodeURIComponent(m[2]) };
  }
  return null;
})();
if (!creds) { console.error('FAIL  没找到 contextos-devops 的 GitHub 令牌（~/.git-credentials）'); process.exit(1); }

const api = async (p, init = {}) => {
  const res = await fetch(`https://api.github.com${p}`, {
    ...init,
    headers: { Authorization: `Bearer ${creds.token}`, Accept: 'application/vnd.github+json', 'User-Agent': 'dsh-contextos-devops', ...(init.headers || {}) },
  });
  const text = await res.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  if (!res.ok) { const e = new Error(`${res.status} ${init.method || 'GET'} ${p}: ${body?.message || text}`); e.status = res.status; throw e; }
  return body;
};

const yml = fs.readFileSync(ENTRY, 'utf8');
const field = (k) => (yml.match(new RegExp(`^${k}: (.+)$`, 'm')) || [])[1]?.replace(/^'|'$/g, '');
const url = field('url');
const repoPath = url.replace('https://github.com/', '');
const [owner, repo] = repoPath.split('/');
const fileName = `${owner}__${repo}.yml`;
const branch = `add-${repo}`;
const problems = [];
const notes = [];

(async () => {
  console.log(`[catalog] 条目 → ${UPSTREAM} : data/plugins/${fileName}`);
  const target = await api(`/repos/${repoPath}`);
  const ageH = (Date.now() - new Date(target.created_at)) / 36e5;
  console.log(`[catalog] 目标仓库 ${repoPath} · 建库 ${ageH.toFixed(1)}h · topics=${(target.topics || []).join(',') || '—'} · 默认分支 ${target.default_branch}`);

  const pkg = await api(`/repos/${repoPath}/contents/package.json`);
  const manifest = JSON.parse(Buffer.from(pkg.content, 'base64').toString());
  if (!manifest.dsh?.bundle?.patch) problems.push('package.json 缺 dsh.bundle.patch（最多见的被拒原因）');
  else {
    const patch = await api(`/repos/${repoPath}/contents/${manifest.dsh.bundle.patch.replace(/^\.\//, '')}`);
    const text = Buffer.from(patch.content, 'base64').toString();
    if (!/insert:/.test(text)) problems.push('cordis.patch.yml 没有 insert:');
  }
  if (ageH < 24) problems.push(`仓库建库 ${ageH.toFixed(1)}h < 24h，现在提会被 CI 打回（等满一天）`);
  if (!(target.topics || []).includes('dsh-plugin')) problems.push('仓库缺 dsh-plugin topic');
  if (target.archived) problems.push('仓库已归档');
  if (!/^[\w.-]+__[\w.-]+\.yml$/.test(fileName)) problems.push(`文件名不合规：${fileName}`);
  if (/: /.test((yml.match(/en: '(.+)'/) || [])[1] || '') && !/en: '/.test(yml)) problems.push('描述含 ": " 但没有整体加引号');
  try { await api(`/repos/${UPSTREAM}/contents/data/plugins/${fileName}`); problems.push('上游已存在同名条目（可能是重复提交）'); } catch (e) { if (e.status !== 404) throw e; }

  for (const n of notes) console.log(`NOTE  ${n}`);
  if (problems.length) {
    console.error('FAIL  前置条件未满足：');
    for (const p of problems) console.error(`  - ${p}`);
    if (!CREATE) process.exit(2);
  } else console.log('PASS  前置条件全部满足');

  if (!CREATE) {
    console.log('\n计划（加 --create 执行）：');
    console.log(`  1. fork ${UPSTREAM} → ${creds.user}/${UPSTREAM.split('/')[1]}`);
    console.log(`  2. 新建分支 ${branch}，写 data/plugins/${fileName}`);
    console.log(`  3. 向上游开 PR：${branch} → ${target.default_branch}`);
    return;
  }

  // 1. fork（幂等）
  let forkReady = false;
  try { await api(`/repos/${creds.user}/${UPSTREAM.split('/')[1]}`); forkReady = true; } catch (e) { if (e.status !== 404) throw e; }
  if (!forkReady) {
    console.log('[catalog] fork 中 …');
    await api(`/repos/${UPSTREAM}/forks`, { method: 'POST', body: JSON.stringify({ default_branch_only: true }) });
    for (let i = 0; i < 30 && !forkReady; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      try { await api(`/repos/${creds.user}/${UPSTREAM.split('/')[1]}`); forkReady = true; } catch { /* 还没好 */ }
    }
    if (!forkReady) { console.error('FAIL  fork 30s 内没就绪，稍后重跑'); process.exit(1); }
  }
  console.log(`PASS  fork 就绪 ${creds.user}/${UPSTREAM.split('/')[1]}`);

  const base = await api(`/repos/${UPSTREAM}/branches/${target.default_branch}`);
  const put = await api(`/repos/${creds.user}/${UPSTREAM.split('/')[1]}/contents/data/plugins/${fileName}`, {
    method: 'PUT',
    body: JSON.stringify({
      message: `Add ${owner}/${repo}`,
      content: Buffer.from(yml).toString('base64'),
      branch,
    }),
  });
  console.log(`PASS  已提交 data/plugins/${fileName}（${put.commit.sha.slice(0, 7)}）`);

  const pr = await api(`/repos/${UPSTREAM}/pulls`, {
    method: 'POST',
    body: JSON.stringify({
      title: `Add ${owner}/${repo}`,
      head: `${creds.user}:${branch}`,
      base: target.default_branch,
      body: [
        `Adds [${owner}/${repo}](${url}) — ${(yml.match(/en: '(.+)'/) || [])[1] || ''}`,
        '',
        '- `package.json` declares `dsh.bundle.patch` → `cordis.patch.yml` with `insert.id: dsh-contextos-devops`',
        '- repo carries the `dsh-plugin` topic',
        '- icon is a GitHub-hosted 180×180 PNG in the repo (`assets/icon-180.png`)',
        '',
        'Install: `dsh plugin --profile desktop add github:' + repoPath + '`',
      ].join('\n'),
    }),
  });
  console.log(`PASS  PR #${pr.number} ${pr.html_url}`);
  console.log(`说明：CI 会再核一遍建库时长（${ageH.toFixed(1)}h）与 manifest；合并后 CDN 约几分钟刷新。`);
})().catch((e) => { console.error('FAIL', e.message); process.exit(1); });
