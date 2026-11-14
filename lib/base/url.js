// 两种 URL 严格区分，任何地方都不许再手拼：
//   接口 URL（读写数据）  /s/<pod>/c/<portal>/action/run/<cmd>/action/<action>/<k>/<v>/...
//                         ?user.uid=<当前分身>&<place>_uid=<实例>&uid=<记录>   ← uid 只用于改/删
//   网页 URL（浏览器打开） /s/<pod>/c/<portal>?debug=true&<place>_uid=<实例>#<实例>:<cmd>:<记录>
// 空间一律用名称 pod，绝不用空间 uid。
export const DEFAULT_PLACE = 'system';

export function portalOf(command) {
  const parts = String(command || '').split('.');
  return parts.length >= 3 ? `${parts.slice(0, -1).join('.')}.portal` : '';
}

export function placeUidKey(place) {
  const p = String(place || DEFAULT_PLACE).replace(/_(uid|name)$/, '');
  return `${p || DEFAULT_PLACE}_uid`;
}

// 接口 URL：seg 是已经编码好的 k/v 路径段，scope 是查询参数
export function apiPath({ pod, command, action = 'create', seg = '', scope = {}, portal }) {
  const portalOn = portal === undefined ? portalOf(command) : portal;
  const usePortal = !!portalOn;
  const base = usePortal
    ? `/s/${encodeURIComponent(pod)}/c/${portalOn}/action/run/${command}/action/${action}`
    : `/s/${encodeURIComponent(pod)}/c/${command}/action/${action}`;
  const query = new URLSearchParams();
  for (const [k, v] of Object.entries(scope || {})) if (v !== '' && v != null) query.set(k, v);
  const qs = query.toString();
  return `${base}${seg ? `/${seg}` : ''}${qs ? `?${qs}` : ''}`;
}

// 平台数据接口（唯一形态，别自己拼）：
//   写：   /s/<pod>/c/<portal>/action/run/<cmd>/action/<action>/<k>/<v>…?user.uid=&<place>_uid=
//   列表： /s/<pod>/c/<portal>/action/run/<cmd>/<place_uid>?user.uid=
//   详情： /s/<pod>/c/<portal>/action/run/<cmd>/<place_uid>/<uid>?user.uid=
export function dataPath({ pod, command, action = 'create', seg = '', inst = '', record = '', portal, scope = {} }) {
  const portalOn = portal === undefined ? portalOf(command) : portal;
  if (!portalOn) throw new Error(`not a platform command: ${command}`);
  const base = `/s/${encodeURIComponent(pod)}/c/${portalOn}/action/run/${command}`;
  const query = new URLSearchParams();
  for (const [k, v] of Object.entries(scope || {})) if (v !== '' && v != null) query.set(k, v);
  const qs = query.toString();
  const tail = qs ? `?${qs}` : '';
  if (!action) {
    const path = inst ? `/${encodeURIComponent(inst)}${record ? `/${encodeURIComponent(record)}` : ''}` : '';
    return `${base}${path}${tail}`;
  }
  return `${base}/action/${action}${seg ? `/${seg}` : ''}${tail}`;
}

// 网页 URL：给浏览器打开某个实例（或某条记录）
export function webUrl({ node, pod, command, place = DEFAULT_PLACE, placeUid = '', recordUid = '' }) {
  const portal = portalOf(command) || command;
  const key = placeUidKey(place);
  const hash = recordUid ? `#${placeUid || ''}:${command}:${recordUid}` : '';
  return `http://127.0.0.1:${node}/s/${encodeURIComponent(pod)}/c/${portal}?debug=true&${key}=${encodeURIComponent(placeUid || '')}${hash}`;
}

// ── 两种接口层：系统级 / 平台级 ───────────────────────────────────────────
// 系统级：节点自身的命令，直连 /c/<cmd>；空间命令 /s/<pod>/c/<cmd>（不经过门户、不查成员权限）
// 平台级：应用平台（云社区/云办公…）把门户当入口，/s/<pod>/c/<portal>/action/run/<cmd>
//         批量命令走门户时会先检查成员权限（member/apply/allow）
export function systemUrl({ node, command, action = '', seg = '', scope = {} }) {
  const base = `/c/${command}${action ? `/action/${action}` : ''}`;
  const query = new URLSearchParams();
  for (const [k, v] of Object.entries(scope || {})) if (v !== '' && v != null) query.set(k, v);
  const qs = query.toString();
  return `http://127.0.0.1:${node}${base}${seg ? `/${seg}` : ''}${qs ? `?${qs}` : ''}`;
}

export function spaceUrl({ node, pod, command, action = '', seg = '', scope = {} }) {
  const base = `/s/${encodeURIComponent(pod)}/c/${command}${action ? `/action/${action}` : ''}`;
  const query = new URLSearchParams();
  for (const [k, v] of Object.entries(scope || {})) if (v !== '' && v != null) query.set(k, v);
  const qs = query.toString();
  return `http://127.0.0.1:${node}${base}${seg ? `/${seg}` : ''}${qs ? `?${qs}` : ''}`;
}

// 平台级：门户 + 内部命令（会做成员权限检查）
export function platformUrl({ node, pod, command, portal, action = '', seg = '', scope = {} }) {
  const p = portal || portalOf(command);
  const base = `/s/${encodeURIComponent(pod)}/c/${p}${command ? `/action/run/${command}` : ''}${action ? `/action/${action}` : ''}`;
  const query = new URLSearchParams();
  for (const [k, v] of Object.entries(scope || {})) if (v !== '' && v != null) query.set(k, v);
  const qs = query.toString();
  return `http://127.0.0.1:${node}${base}${seg ? `/${seg}` : ''}${qs ? `?${qs}` : ''}`;
}

// 五种使用形式：同一条命令，五个入口
//   参数三类：位置参数 arg（URL Path）、选项参数 opt（URL Query）、锚定参数 hash（URL Hash）
//   内部 CMD：本进程 m.Cmd("<cmd>", <arg>, map[string]string{<opt>})
//             其它空间 m.Cmd("space", "<pod>", "<cmd>", <arg>, map[string]string{<opt>})
//   命令 CLI：本进程 ./bin/ice.bin <cmd> <arg>；发给服务节点 ./bin/ice.bin admin <cmd> <arg>
export function goOpt(opt = {}) {
  const pairs = Object.entries(opt || {}).map(([k, v]) => `"${k}": "${String(v).replace(/"/g, '\\"')}"`);
  return pairs.length ? `map[string]string{${pairs.join(', ')}}` : '';
}

export function commandForms({ node, pod = '', command, portal = '', arg = '', opt = {}, hash = '' }) {
  const a = String(arg || '');
  const goArgs = [a ? `"${a}"` : '', goOpt(opt)].filter(Boolean).join(', ');
  const goOpts = goArgs ? `, ${goArgs}` : '';
  return {
    web: (pod ? spaceUrl({ node, pod, command, seg: a, scope: opt }) : systemUrl({ node, command, seg: a, scope: opt })) + (hash ? `#${hash}` : ''),
    api: pod ? spaceUrl({ node, pod, command, seg: a, scope: opt }) : systemUrl({ node, command, seg: a, scope: opt }),
    platform: pod && portal ? platformUrl({ node, pod, command, portal, seg: a, scope: opt }) : '',
    inner: pod ? `m.Cmd("space", "${pod}", "${command}"${goOpts})` : `m.Cmd("${command}"${goOpts})`,
    cli: `./bin/ice.bin ${command}${a ? ` ${a}` : ''}`,
    cliAdmin: `./bin/ice.bin admin ${command}${a ? ` ${a}` : ''}`,
    mcp: `mcp://contextos/${command}${pod ? `?pod=${pod}` : ''}`,
  };
}

// 参数三类与 URL 的对应关系
export function paramKinds({ arg = '', opt = {}, hash = '' }) {
  return {
    arg: { url: 'Path', value: arg },
    opt: { url: 'Query', value: opt },
    hash: { url: 'Hash', value: hash },
  };
}

// ── 方法语义（严格按 URL 结构判断，不许凭感觉选） ─────────────────────────
//   最后一段命令后面没有 /action/            → GET
//   有 /action/ 且 action 是 create 或以 Create 结尾 → PUT
//   有 /action/ 且 action 是 remove/trash 或以 Remove 结尾 → DELETE
//   其它                                      → POST
export function methodOf({ action = '' } = {}) {
  const a = String(action || '');
  if (!a) return 'GET';
  if (a === 'create' || /Create$/.test(a)) return 'PUT';
  if (a === 'remove' || a === 'trash' || /Remove$/.test(a)) return 'DELETE';
  return 'POST';
}

export function methodOfUrl(url = '') {
  const m = String(url).match(/\/action\/([^/?#]+)/);
  return methodOf({ action: m ? m[1] : '' });
}

// ── 文件上传：平台级接口 ────────────────────────────────────────────────
//   POST /s/<pod>/c/<portal>/action/run/<cmd>/action/upload   （multipart/form-data）
//   门户先查成员权限，再转给内部命令的 upload
export function uploadUrl({ node, pod = '', command, portal = '', scope = {} }) {
  const p = portal || portalOf(command);
  const base = pod && p
    ? `/s/${encodeURIComponent(pod)}/c/${p}/action/run/${command}/action/upload`
    : `/c/${command}/action/upload`;
  const query = new URLSearchParams();
  for (const [k, v] of Object.entries(scope || {})) if (v !== '' && v != null) query.set(k, v);
  const qs = query.toString();
  return `http://127.0.0.1:${node}${base}${qs ? `?${qs}` : ''}`;
}

// ── 网页转发：web.chat.action ────────────────────────────────────────────
// 前端页面把命令串交给 web.chat.action，由它按 cmds 转发到真实命令。
//   POST /chat/action/?_index=<cmd>
//   form-data: cmds=action&cmds=run&cmds=<portal>&cmds=action&cmds=run&cmds=<cmd>&cmds=action&cmds=<action>
export const CHAT_ACTION = 'web.chat.action';

export function chatActionUrl({ node, index = '', scope = {} }) {
  const query = new URLSearchParams();
  if (index) query.set('_index', index);
  for (const [k, v] of Object.entries(scope || {})) if (v !== '' && v != null) query.set(k, v);
  const qs = query.toString();
  return `http://127.0.0.1:${node}/chat/action/${qs ? `?${qs}` : ''}`;
}

// cmds 链：门户 → 内部命令 → 动作
export function cmdsChain({ portal = '', command = '', action = '' }) {
  const out = [];
  if (portal) out.push('action', 'run', portal);
  if (command) out.push('action', 'run', command);
  if (action) out.push('action', action);
  return out;
}

// 全局参数：系统按用户语言与主题返回数据
export const GLOBAL_PARAMS = ['user.lang', 'sess.theme', 'sess.bg', 'sess.fg', 'sess.daemon'];
