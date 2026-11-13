// 核心业务：周边设备发现（ContextOS 节点 / WiFi / 蓝牙 / 局域网）。
import { runShell } from '../misc/shell.js';
import { listNodes } from '../base/registry.js';

const DEVICE_ADAPTERS = [
  { kind: 'contextos', label: 'ContextOS 节点', supported: true, reason: '' },
  { kind: 'wifi', label: 'WiFi / 局域网', supported: process.platform === 'darwin' || process.platform === 'linux', reason: '' },
  { kind: 'bluetooth', label: '蓝牙', supported: process.platform === 'darwin' || process.platform === 'linux', reason: '' },
  { kind: 'infrared', label: '红外', supported: false, reason: '当前宿主无红外适配器；预留 IR 适配层' },
];

function walkBluetooth(value, out) {
  if (!value || typeof value !== 'object') return;
  if (Array.isArray(value)) { for (const x of value) walkBluetooth(x, out); return; }
  const keys = Object.keys(value);
  const name = value.device_name || value._name || value.name || value.device_title;
  const addr = value.device_address || value.address || value.device_addr;
  if (name || addr) out.push({ name: String(name || addr), address: String(addr || ''), raw: value });
  for (const k of keys) {
    if (typeof value[k] === 'object') walkBluetooth(value[k], out);
  }
}

async function scanWifiNetworks() {
  const candidates = [
    '/System/Library/PrivateFrameworks/Apple80211.framework/Versions/Current/Resources/airport -s 2>/dev/null',
    'airport -s 2>/dev/null',
  ];
  for (const cmd of candidates) {
    const r = await runShell(cmd, process.cwd(), { timeoutMs: 8000 }).catch(() => null);
    if (!r || r.code !== 0 || !String(r.out || '').trim()) continue;
    const rows = [];
    for (const line of r.out.split('\n').slice(1)) {
      const t = line.trim();
      if (!t) continue;
      const m = /^(.*?)\s+([0-9a-f:]{17})\s+(-?\d+)\s+(\d+)(?:\s+.*)?$/i.exec(t);
      if (m) rows.push({ ssid: m[1].trim(), bssid: m[2].toLowerCase(), rssi: Number(m[3]), channel: Number(m[4]) });
    }
    if (rows.length) return rows;
  }
  // 新版 macOS 无 airport：从 system_profiler 的 “Other Local Wi-Fi Networks” 解析
  const prof = await runShell('/usr/sbin/system_profiler SPAirPortDataType 2>/dev/null', process.cwd(), { timeoutMs: 10000 }).catch(() => null);
  if (prof && prof.code === 0) {
    const lines = String(prof.out || '').split('\n');
    const start = lines.findIndex((l) => /Other Local Wi-Fi Networks:/i.test(l));
    const rows = [];
    let cur = null;
    for (let i = start + 1; start >= 0 && i < lines.length; i += 1) {
      const raw = lines[i];
      const t = raw.trim();
      if (!t) continue;
      if (/^[a-z]+\d+:$/.test(t)) break;
      if (/^[A-Za-z].*:$/.test(t) && /^(Interfaces|Current Network|Other Local|Software|AirPort|Wake|AirDrop|Auto|Status)/i.test(t)) break;
      if (/^<redacted>:$/.test(t) || /^.+:$/.test(t) && !/^([A-Z][A-Za-z /]+):/.test(t)) {
        if (cur) rows.push(cur);
        cur = { ssid: /<redacted>/.test(t) ? `网络 ${rows.length + 1}` : t.replace(/:$/, ''), bssid: '', rssi: null, channel: null };
        continue;
      }
      if (!cur) continue;
      const ch = /Channel:\s*(\d+)/i.exec(t); if (ch) cur.channel = Number(ch[1]);
      const sg = /Signal \/ Noise:\s*(-?\d+)/i.exec(t); if (sg) cur.rssi = Number(sg[1]);
    }
    if (cur) rows.push(cur);
    if (rows.length) return rows;
  }
  return [];
}

async function scanBluetoothNearby() {
  const r = await runShell('blueutil --inquiry 5 --format json 2>/dev/null', process.cwd(), { timeoutMs: 12000 }).catch(() => null);
  if (r && r.code === 0 && String(r.out || '').trim()) {
    try {
      const arr = JSON.parse(r.out);
      if (Array.isArray(arr)) return arr.map((d) => ({ name: d.name || d.address || 'BLE', address: d.address || '', rssi: d.rssi ?? null, nearby: true }));
    } catch { /* fall through */ }
  }
  return [];
}

async function scanLanHosts() {
  const r = await runShell('/usr/sbin/arp -a 2>/dev/null', process.cwd(), { timeoutMs: 4000 }).catch(() => null);
  const hosts = [];
  if (r && r.code === 0) {
    for (const line of String(r.out || '').split('\n')) {
      const m = /^(\S+)\s+\(([^)]+)\)\s+at\s+([0-9a-f:]+)/i.exec(line.trim());
      if (!m) continue;
      hosts.push({ ip: m[2], mac: m[3], name: m[1] === '?' ? '' : m[1] });
    }
  }
  return hosts;
}

export async function discoverDevices({ node } = {}) {
  const devices = [];
  const adapters = DEVICE_ADAPTERS.map((x) => ({ ...x }));
  const nodes = await listNodes();
  for (const n of nodes) {
    devices.push({
      id: `contextos:${n.port}`,
      name: n.name || `ContextOS-${n.port}`,
      kind: 'contextos',
      address: `127.0.0.1:${n.port}`,
      status: n.state,
      controllable: true,
      meta: { dir: n.dir, env: n.env || '', version: n.version || '' },
    });
  }
  const wifi = await runShell('/usr/sbin/arp -a 2>/dev/null', process.cwd(), { timeoutMs: 4000 }).catch(() => null);
  if (wifi && wifi.code === 0) {
    for (const line of wifi.out.split('\n')) {
      const m = /^(\S+)\s+\(([^)]+)\)\s+at\s+([0-9a-f:]+)/i.exec(line.trim());
      if (!m) continue;
      devices.push({ id: `wifi:${m[2]}:${m[3]}`, name: m[1] === '?' ? `WiFi ${m[2]}` : m[1], kind: 'wifi', address: m[2], status: 'online', controllable: false, meta: { mac: m[3], raw: line.trim() } });
    }
  } else {
    const a = adapters.find((x) => x.kind === 'wifi');
    if (a) { a.supported = false; a.reason = 'arp 不可用或超时'; }
  }
  const bt = await runShell(process.platform === 'darwin' ? 'system_profiler SPBluetoothDataType -json 2>/dev/null' : 'bluetoothctl devices 2>/dev/null', process.cwd(), { timeoutMs: 8000 }).catch(() => null);
  if (bt && bt.code === 0 && bt.out.trim()) {
    let found = [];
    try {
      const json = JSON.parse(bt.out);
      walkBluetooth(json, found);
    } catch {
      for (const line of bt.out.split('\n')) {
        const m = /Device\s+([0-9A-F:]{17})\s+(.+)$/i.exec(line.trim());
        if (m) found.push({ name: m[2], address: m[1] });
      }
    }
    const seen = new Set();
    for (const d of found) {
      const key = `${d.address}:${d.name}`;
      if (seen.has(key)) continue;
      seen.add(key);
      devices.push({ id: `bluetooth:${d.address || d.name}`, name: d.name, kind: 'bluetooth', address: d.address || '', status: 'paired', controllable: false, meta: {} });
    }
  } else {
    const a = adapters.find((x) => x.kind === 'bluetooth');
    if (a) { a.reason = bt ? '蓝牙不可用或超时' : '蓝牙扫描失败'; }
  }
  const [wifiNetworks, btNearby, lanHosts] = await Promise.all([scanWifiNetworks(), scanBluetoothNearby(), scanLanHosts()]);
  return {
    adapters, devices, wifiNetworks, bluetoothNearby: btNearby, lanHosts,
    scannedAt: new Date().toISOString(),
    note: 'macOS 会隐藏未授权的 Wi-Fi 名称（显示为 网络 N）；附近蓝牙需要安装 blueutil；局域网来自 arp 邻居表；ContextOS 节点可控制。',
  };
}
