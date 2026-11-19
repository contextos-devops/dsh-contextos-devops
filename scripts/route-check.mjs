#!/usr/bin/env node
// 门禁：应用三级路由（最近应用 → 应用商店 → 软件工厂）的确定性落点。
// 抓过的事故：resolveWrite 每轮调模型，模型挂起即整轮卡死；商店无匹配时 list[0] 盲选，
// 用户要「客户管理」却建出「项目管理」实例。这里用固定夹具断言落点，不连节点、不调模型。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { planRoute, usableFunctions, pickStore, extractValues } = await import(path.join(root, 'lib/core/appindex.js'));

let failed = 0;
const check = (ok, label) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}`); if (!ok) failed++; };

const apps = [
  { name: 'xiangmuguanli', title: '我的分身 的项目管理', command: 'web.team.xiangmuguanli.portal', space: '20240724-enterprise', place_uid: '31813c0e6898705a8952c45e719993fd', place: 'system', functions: ['target', 'plan', 'task', 'report', 'feedback'] },
  { name: 'huiyiguanli', title: '会议管理', command: 'web.team.huiyiguanli.portal', space: '20240724-enterprise', place_uid: 'f68dc1a13c594e0970b0b0393f3f99eb', place: 'system', functions: ['meeting', 'room'] },
];
const fnMap = {
  'web.team.xiangmuguanli.portal': [
    { name: 'target', label: '目标', order: 1 }, { name: 'plan', label: '计划', order: 2 },
    { name: 'task', label: '任务', order: 3 }, { name: 'report', label: '报告', order: 4 },
    { name: 'feedback', label: '反馈', order: 5 },
  ],
  'web.team.huiyiguanli.portal': [
    { name: 'meeting', label: '会议', order: 1 }, { name: 'room', label: '会议室', order: 2 },
  ],
};
const store = [
  { uid: 's1', name: '项目管理', title: '项目管理', command: 'web.team.xiangmuguanli.portal', space: '20240724-enterprise', module: 'xiangmuguanli' },
  { uid: 's2', name: '客户管理', title: '客户管理', command: 'web.team.kehu.portal', space: '20240724-enterprise', module: 'kehu' },
];

// 1) 最近应用命中：创建任务 → 项目管理 / task / pmCreate
{
  const p = planRoute({ text: '创建三个随机的任务', apps, fnMap });
  check(p.tier === 'app' && p.app.name === 'xiangmuguanli', `recent app: ${p.tier}/${p.app && p.app.name}`);
  check(p.fn === 'task' && p.op === 'pmCreate' && p.args.kind === 'task', `recent fn/op: ${p.fn}/${p.op}/${p.args.kind}`);
  check(p.command === 'web.team.xiangmuguanli.task', `recent command: ${p.command}`);
}
// 2) 只读：看目标 → pmList
{
  const p = planRoute({ text: '看看目标进展', mode: 'read', apps, fnMap });
  check(p.tier === 'app' && p.fn === 'target' && p.op === 'pmList', `read target: ${p.tier}/${p.fn}/${p.op}`);
}
// 3) 同义词：安排会议 → 会议管理 / meeting（不是项目管理的 plan）
{
  const p = planRoute({ text: '帮我安排一个会议', apps, fnMap });
  check(p.tier === 'app' && p.app.name === 'huiyiguanli' && p.fn === 'meeting', `meeting: ${p.app && p.app.name}/${p.fn}`);
}
// 4) 商店命中：客户管理应用 → kehu 模板
{
  const p = planRoute({ text: '帮我做一个客户管理应用', apps, fnMap, store });
  check(p.tier === 'store' && p.store.command === 'web.team.kehu.portal', `store hit: ${p.tier}/${p.store && p.store.command}`);
  check(p.op === 'createStoreInstance', `store op: ${p.op}`);
}
// 5) 商店无匹配：绝不 list[0] 盲选 → 软件工厂，且名字来自业务词
{
  const p = planRoute({ text: '帮我做一个量子纠缠实验台应用', apps, fnMap, store: [store[0]] });
  check(p.tier === 'factory', `store miss → factory: ${p.tier}`);
  check(p.factory && /^app[a-z0-9]{3,6}$/.test(p.factory.name), `factory name: ${p.factory && p.factory.name}`);
}
// 6) 普通读写没有落点：返回 none，不生成应用
{
  const p = planRoute({ text: '加一条记录', apps, fnMap, store });
  check(p.tier === 'none', `vague write stays none: ${p.tier}`);
}
// 7) 功能 order 过滤：只留 0<order<=400
{
  const rows = [
    { order: '1', index: 'web.team.x.target', name: '目标' },
    { order: '3', index: 'web.team.x.task', name: '任务' },
    { order: '401', index: 'web.team.x.credit', name: '服务名片' },
    { order: '501', index: 'web.team.x.qrcode', name: '场景码' },
    { order: '0', index: 'web.team.x.portal', name: '入口' },
  ];
  const fns = usableFunctions(rows);
  check(fns.length === 2 && fns[0].name === 'target', `usable fns: ${fns.map((f) => f.name).join(',')}`);
}
// 8b) 结构性功能名不算业务命中：place1/「应用」不能把「做一个客户管理应用」拉到系统运维
{
  const platform = { name: 'operation', title: '系统运维', command: 'web.team.operation.portal', space: '20240903-operation', place_uid: 'p1', place: 'system', functions: ['place1'] };
  const pm = { 'web.team.operation.portal': [{ name: 'place1', label: '应用', order: 1 }, { name: 'value1', label: '功能', order: 2 }] };
  const p = planRoute({ text: '帮我做一个客户管理应用', apps: [...apps, platform], fnMap: { ...fnMap, ...pm }, store });
  check(p.tier === 'store' && p.store.command === 'web.team.kehu.portal', `generic fn ignored: ${p.tier}/${p.store && p.store.command}`);
}
// 8) 商店打分必须过阈值：不相干模板不硬凑
{
  const hit = pickStore('帮我做一个量子纠缠实验台应用', store);
  check(!hit, `store threshold: ${hit ? hit.tpl.name : 'null'}`);
}

// 10) 表单预填：从原话抽标题/内容/起止时间/地点，减少输入
{
  const NOW = new Date('2026-11-19T12:20:00+08:00');   // 周四中午
  const v1 = extractValues('明天见投资人，帮我创建一个会议安排', NOW);
  check(v1.title === '见投资人', `prefill title: ${v1.title}`);
  check(v1.begin_time === '2026-11-20 09:00' && v1.end_time === '2026-11-20 10:00', `prefill tomorrow: ${v1.begin_time}~${v1.end_time}`);
  const v2 = extractValues('明天下午3点见投资人，帮我创建一个会议安排', NOW);
  check(v2.begin_time === '2026-11-20 15:00' && v2.end_time === '2026-11-20 16:00', `prefill 3pm: ${v2.begin_time}~${v2.end_time}`);
  const v3 = extractValues('下周一上午10点评审会', NOW);
  check(v3.begin_time === '2026-11-23 10:00' && v3.title === '评审会', `prefill next mon: ${v3.begin_time}/${v3.title}`);
  const v4 = extractValues('12月5日下午2点半客户拜访', NOW);
  check(v4.begin_time === '2026-12-05 14:30', `prefill date+half: ${v4.begin_time}`);
  const v5 = extractValues('三点半开会', NOW);
  check(v5.begin_time === '2026-11-19 15:30', `prefill bare hour → pm: ${v5.begin_time}`);
  const v6 = extractValues('明天在会议室A开会，讨论Q4预算', NOW);
  check(v6.title === '讨论Q4预算' && v6.address === '会议室A', `prefill addr/agenda: ${v6.title}/${v6.address}`);
  const v7 = extractValues('帮我创建一个任务', NOW);
  check(!v7.begin_time && !v7.end_time, `prefill no invented time: ${JSON.stringify(v7)}`);
  const m2 = planRoute({ text: '下周一上午10点评审会', apps, fnMap, now: NOW });
  check(m2.tier === 'app' && m2.fn === 'meeting' && m2.values.begin_time === '2026-11-23 10:00', `评审会→会议: ${m2.tier}/${m2.fn}/${m2.values.begin_time}`);
  const p = planRoute({ text: '明天见投资人，帮我创建一个会议安排', apps, fnMap, now: NOW });
  check(p.tier === 'app' && p.op === 'writeData' && p.values.begin_time === '2026-11-20 09:00' && p.values.title === '见投资人', `plan values: ${p.op}/${JSON.stringify(p.values)}`);
}
// 9) 客户端不再调用会挂起的 resolveWrite
{
  const chat = fs.readFileSync(path.join(root, 'src/client/parts/50-chat.js'), 'utf8');
  check(!chat.includes("api('resolveWrite'"), 'client does not call resolveWrite');
  check(chat.includes("api('appRoute'"), 'client calls appRoute');
  check(!/list\[0\]/.test(chat.split('createAppFromStore')[1] || ''), 'createAppFromStore has no list[0] blind pick');
}

// 10) 写回执判定：正常回执 detail 是路径段，不能当「空间没启动」；否则每次写白等 2.5s×3 还重复建记录
{
  const { isEcho } = await import(path.join(root, 'lib/core/data.js'));
  const ok = JSON.stringify({ detail: ['web.s', 'pod'], _status: ['[{"name":"count","value":"1x12"}]'], append: ['uid'], uid: ['a1'] });
  check(isEcho(ok) === false, 'write receipt with _status is not echo');
  check(isEcho('{"detail":["web.s"],"_handle":["true"],"_process":["_cookie"]}') === true, 'echo receipt (detail only) is echo');
  check(isEcho('') === true, 'empty body is echo');
  const data = fs.readFileSync(path.join(root, 'lib/core/data.js'), 'utf8');
  check(!/"detail"\s*:/.test(data.split('export function isEcho')[0]), 'data.js no longer runs the detail heuristic');
  check(data.includes('const instUid = inst ||'), 'readData derives instance uid from query');
}
if (failed) { console.error(`route-check: ${failed} failed`); process.exit(1); }
console.log('route-check: passed');
