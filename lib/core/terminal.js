// 核心业务：内嵌终端（WebSocket + Python pty.fork 真 PTY）。
import crypto from 'node:crypto';
import os from 'node:os';
import fsp from 'node:fs';
import { spawn } from 'node:child_process';
import { ptySupported } from '../base/platform.js';

  // ---- embedded terminal (WebSocket + PTY via /usr/bin/script) ----
function wsAccept(key) {
    return crypto.createHash('sha1').update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
  }
function wsFrame(data) {
    const payload = Buffer.isBuffer(data) ? data : Buffer.from(String(data), 'utf8');
    const len = payload.length;
    let header;
    if (len < 126) header = Buffer.from([0x81, len]);
    else if (len < 65536) header = Buffer.from([0x81, 126, (len >> 8) & 0xff, len & 0xff]);
    else {
      header = Buffer.alloc(10);
      header[0] = 0x81; header[1] = 127;
      header.writeBigUInt64BE(BigInt(len), 2);
    }
    return Buffer.concat([header, payload]);
  }
const PTY_HELPER = `
import os, sys, pty, select, fcntl, termios, struct, signal
def main():
    cwd = sys.argv[1]
    shell = sys.argv[2] if len(sys.argv) > 2 else (os.environ.get('SHELL') or '/bin/zsh')
    os.chdir(cwd)
    pid, fd = pty.fork()
    if pid == 0:
        os.environ['TERM'] = 'xterm-256color'
        os.execvp(shell, [shell])
    def nonblock(f):
        fcntl.fcntl(f, fcntl.F_SETFL, fcntl.fcntl(f, fcntl.F_GETFL) | os.O_NONBLOCK)
    nonblock(fd); nonblock(0)
    while True:
        r, _, _ = select.select([fd, 0], [], [])
        if fd in r:
            try:
                data = os.read(fd, 65536)
                if not data: break
                os.write(1, data)
            except OSError:
                pass
        if 0 in r:
            try:
                data = os.read(0, 65536)
                if not data: break
                if data.startswith(b'\\x00CTX_RESIZE '):
                    try:
                        cols, rows = data.decode().strip().split(' ')[1:3]
                        fcntl.ioctl(fd, termios.TIOCSWINSZ, struct.pack('HHHH', int(rows), int(cols), 0, 0))
                        os.kill(pid, signal.SIGWINCH)
                    except Exception:
                        pass
                else:
                    os.write(fd, data)
            except OSError:
                pass
main()
`;

export function terminalUpgrade(req, socket, head) {
    const key = req.headers['sec-websocket-key'];
    if (!key) { socket.destroy(); return; }
    if (!ptySupported) {
      // Windows 无 pty.fork：明确拒绝，客户端会回落为「用 DSH 自带终端」。
      socket.write('HTTP/1.1 501 Not Implemented\r\nConnection: close\r\n\r\n');
      socket.end();
      return;
    }
    socket.write(
      'HTTP/1.1 101 Switching Protocols\r\n' +
      'Upgrade: websocket\r\n' +
      'Connection: Upgrade\r\n' +
      `Sec-WebSocket-Accept: ${wsAccept(key)}\r\n\r\n`,
    );
    let cwd = os.homedir();
    try {
      const p = new URL(req.url || '/', 'http://x').searchParams.get('cwd');
      if (p) cwd = decodeURIComponent(p);
    } catch { /* keep home */ }
    if (!fsp.existsSync(cwd)) cwd = os.homedir();

    const shell = process.env.SHELL || '/bin/zsh';
    const python = process.env.PYTHON || 'python3';
    const child = spawn(python, ['-c', PTY_HELPER, cwd, shell], {
      env: { ...process.env }, stdio: ['pipe', 'pipe', 'pipe'],
    });

    let buf = Buffer.alloc(0);
    const feed = (chunk) => {
      buf = Buffer.concat([buf, chunk]);
      while (buf.length >= 2) {
        const b0 = buf[0], b1 = buf[1];
        const opcode = b0 & 0x0f;
        const masked = (b1 & 0x80) !== 0;
        let len = b1 & 0x7f, off = 2;
        if (len === 126) { if (buf.length < 4) return; len = buf.readUInt16BE(2); off = 4; }
        else if (len === 127) { if (buf.length < 10) return; len = Number(buf.readBigUInt64BE(2)); off = 10; }
        let mask;
        if (masked) { if (buf.length < off + 4) return; mask = buf.subarray(off, off + 4); off += 4; }
        if (buf.length < off + len) return;
        const payload = Buffer.from(buf.subarray(off, off + len));
        buf = buf.subarray(off + len);
        if (masked) for (let i = 0; i < payload.length; i++) payload[i] ^= mask[i & 3];
        if (opcode === 0x8) { try { child.kill(); } catch {} return; }
        if (opcode === 0x9) { socket.write(wsFrame(Buffer.concat([Buffer.from([0x8a, 0]), payload]))); continue; }
        if (opcode === 0x2 || opcode === 0x1) { try { child.stdin.write(payload); } catch {} }
      }
    };
    let rxN = 0, ptyAcc = Buffer.alloc(0), ptyTimer = 0;
    const flushPty = () => {
      ptyTimer = 0;
      const raw = ptyAcc.toString('utf8');
      ptyAcc = Buffer.alloc(0);
      // zsh PROMPT_SP：清行标记，某些终端渲染会把它显示成乱码，直接丢弃
      const clean = raw.replace(/\x1b\[1m\x1b\[7m%\x1b\[27m\x1b\[1m\x1b\[0m *\r \r/g, '');
      if (!clean) return;
      if (rxN < 3) {
        rxN++;
        try { fsp.appendFileSync('/tmp/cx-term-rx.log', `--- chunk ${rxN} len=${clean.length} text=${JSON.stringify(clean.slice(0, 120))}\n`); } catch {}
      }
      try { socket.write(wsFrame(Buffer.from(clean, 'utf8'))); } catch {}
    };
    child.stdout.on('data', (d) => { ptyAcc = Buffer.concat([ptyAcc, d]); if (!ptyTimer) ptyTimer = setTimeout(flushPty, 30); });
    child.stderr.on('data', (d) => { try { socket.write(wsFrame(d)); } catch {} });
    child.on('exit', () => { try { socket.end(); } catch {} });
    socket.on('data', feed);
    socket.on('error', () => { try { child.kill(); } catch {} });
    socket.on('close', () => { try { child.kill(); } catch {} });
    if (head && head.length) feed(head);
  }


