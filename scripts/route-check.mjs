#!/usr/bin/env node
// 门禁：应用三级路由（最近应用 → 应用商店 → 软件工厂）的确定性落点。
// 抓过的事故：resolveWrite 每轮调模型，模型挂起即整轮卡死；商店无匹配时 list[0] 盲选，
// 用户要「客户管理」却建出「项目管理」实例。这里用固定夹具断言落点，不连节点、不调模型。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { planRoute, usableFunctions, pickStore } = await import(path.join(root, 'lib/core/appindex.js'));

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
// 9) 客户端不再调用会挂起的 resolveWrite
{
  const chat = fs.readFileSync(path.join(root, 'src/client/parts/50-chat.js'), 'utf8');
  check(!chat.includes("api('resolveWrite'"), 'client does not call resolveWrite');
  check(chat.includes("api('appRoute'"), 'client calls appRoute');
  check(!/list\[0\]/.test(chat.split('createAppFromStore')[1] || ''), 'createAppFromStore has no list[0] blind pick');
}
if (failed) { console.error(`route-check: ${failed} failed`); process.exit(1); }
console.log('route-check: passed');
