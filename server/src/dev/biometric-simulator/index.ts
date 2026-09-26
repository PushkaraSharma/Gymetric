/**
 * Local ZKTeco/eSSL ADMS (iClock) device simulator.
 * Speaks the same protocol as a real entrance reader.
 *
 * Usage:
 *   BIOMETRIC_API_URL=http://localhost:8080 npm run sim:biometric
 *   Open http://localhost:5055
 */
import http from 'http';
import { URL } from 'url';

const API_BASE = process.env.BIOMETRIC_API_URL || 'http://localhost:8080';
const SIM_PORT = Number(process.env.BIOMETRIC_SIM_PORT || 5055);
const DEFAULT_SN = process.env.BIOMETRIC_SIM_SN || 'SIM-GYM-001';

type RosterUser = {
    pin: string;
    name: string;
    enabled: boolean;
    fingers: number[];
};

const state = {
    sn: DEFAULT_SN,
    online: true,
    roster: {} as Record<string, RosterUser>,
    lastPoll: null as string | null,
    lastPunch: null as string | null,
    lastDoor: null as 'OPEN' | 'DENIED' | 'UNKNOWN' | null,
    logs: [] as string[],
};

const log = (msg: string) => {
    const line = `[${new Date().toLocaleTimeString()}] ${msg}`;
    state.logs.unshift(line);
    if (state.logs.length > 80) state.logs.pop();
    console.log(line);
};

const applyCommand = (line: string) => {
    // C:ID:DATA USER PIN=1001\tName=Rahul\t...\tGrp=1
    if (line.includes('DATA USER') || line.includes('UPDATE USERINFO')) {
        const pin = line.match(/PIN=([^\t\s]+)/)?.[1];
        const name = line.match(/Name=([^\t]*)/)?.[1] || pin || '';
        const grp = line.match(/Grp=(\d+)/)?.[1];
        if (!pin) return;
        const existing = state.roster[pin] || { pin, name, enabled: true, fingers: [] };
        existing.name = name || existing.name;
        if (grp !== undefined) existing.enabled = grp !== '0';
        state.roster[pin] = existing;
        log(`CMD USER ${pin} (${existing.name}) enabled=${existing.enabled}`);
        return;
    }
    if (line.includes('DELETE USER') || line.includes('DEL_USER')) {
        const pin = line.match(/PIN=([^\t\s]+)/)?.[1];
        if (pin && state.roster[pin]) {
            delete state.roster[pin];
            log(`CMD DELETE ${pin}`);
        }
        return;
    }
    if (line.includes('ENROLL_FP')) {
        const pin = line.match(/PIN=([^\t\s]+)/)?.[1];
        if (!pin) return;
        if (!state.roster[pin]) {
            state.roster[pin] = { pin, name: pin, enabled: true, fingers: [] };
        }
        // Auto-enroll FID 0 for simulator (reception remote enroll)
        if (!state.roster[pin].fingers.includes(0)) {
            state.roster[pin].fingers.push(0);
        }
        log(`CMD ENROLL_FP ${pin} → finger stored (sim auto)`);
        // Notify API
        fetch(`${API_BASE}/api/biometric/dev/enrolled`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ SN: state.sn, pin }),
        }).then(() => log(`Reported enroll for ${pin}`))
            .catch((e) => log(`Enroll report failed: ${e.message}`));
    }
};

const pollCommands = async () => {
    if (!state.online) return;
    try {
        // Heartbeat
        await fetch(`${API_BASE}/iclock/cdata?SN=${encodeURIComponent(state.sn)}`);
        const res = await fetch(`${API_BASE}/iclock/getrequest?SN=${encodeURIComponent(state.sn)}`);
        const text = await res.text();
        state.lastPoll = new Date().toISOString();
        if (text && text.trim() !== 'OK') {
            const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
            for (const line of lines) applyCommand(line);
            // ACK
            const ids = lines.map((l) => l.match(/^C:(\d+):/)?.[1]).filter(Boolean);
            if (ids.length) {
                await fetch(`${API_BASE}/iclock/devicecmd?SN=${encodeURIComponent(state.sn)}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'text/plain' },
                    body: ids.map((id) => `ID=${id}&Return=0`).join('\n'),
                });
            }
        }
    } catch (e: any) {
        log(`Poll error: ${e.message}`);
    }
};

const sendPunch = async (pin: string) => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const deviceTime = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    const body = `${pin}\t${deviceTime}\t0\t1\t0\t0\t0\n`;
    await fetch(`${API_BASE}/iclock/cdata?SN=${encodeURIComponent(state.sn)}&table=ATTLOG`, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body,
    });
    state.lastPunch = `${pin} @ ${deviceTime}`;
    log(`ATTLOG sent for ${pin}`);
};

const scan = async (pin: string) => {
    const user = state.roster[pin];
    if (!user || user.fingers.length === 0) {
        state.lastDoor = 'UNKNOWN';
        log(`SCAN ${pin} → UNKNOWN (not enrolled)`);
        return { result: 'UNKNOWN', message: 'Fingerprint not enrolled' };
    }
    if (!user.enabled) {
        state.lastDoor = 'DENIED';
        log(`SCAN ${pin} → DENIED (disabled)`);
        // Still send punch so app can show denied attempt if membership mapping does
        try { await sendPunch(pin); } catch (e: any) { log(e.message); }
        return { result: 'DENIED', message: 'User disabled on device' };
    }
    state.lastDoor = 'OPEN';
    log(`SCAN ${pin} → DOOR OPEN`);
    try { await sendPunch(pin); } catch (e: any) { log(e.message); }
    return { result: 'OPEN', message: 'Door opened' };
};

const enrollManual = (pin: string, name?: string) => {
    if (!state.roster[pin]) {
        state.roster[pin] = { pin, name: name || pin, enabled: true, fingers: [] };
    }
    if (!state.roster[pin].fingers.includes(0)) state.roster[pin].fingers.push(0);
    if (name) state.roster[pin].name = name;
    log(`Manual enroll ${pin}`);
    fetch(`${API_BASE}/api/biometric/dev/enrolled`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ SN: state.sn, pin }),
    }).catch(() => { });
    return state.roster[pin];
};

const html = () => `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Gymetric Biometric Simulator</title>
<style>
  body { font-family: ui-sans-serif, system-ui; max-width: 720px; margin: 24px auto; padding: 0 16px; background: #0f1419; color: #e7ecf1; }
  h1 { font-size: 1.25rem; }
  .card { background: #1a2332; border: 1px solid #2a3544; border-radius: 12px; padding: 16px; margin-bottom: 16px; }
  label { display: block; font-size: 12px; color: #9aa8b8; margin-bottom: 4px; }
  input { width: 100%; padding: 10px; border-radius: 8px; border: 1px solid #2a3544; background: #0f1419; color: #fff; box-sizing: border-box; margin-bottom: 10px; }
  button { padding: 10px 14px; border-radius: 8px; border: none; cursor: pointer; margin-right: 8px; margin-bottom: 8px; font-weight: 600; }
  .primary { background: #22c55e; color: #052e16; }
  .warn { background: #f59e0b; color: #1c1403; }
  .danger { background: #ef4444; color: #fff; }
  .muted { background: #334155; color: #e2e8f0; }
  .door { font-size: 1.5rem; font-weight: 800; letter-spacing: 0.05em; }
  .open { color: #22c55e; } .denied { color: #ef4444; } .unknown { color: #f59e0b; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  td, th { text-align: left; padding: 6px 4px; border-bottom: 1px solid #2a3544; }
  pre { font-size: 11px; max-height: 180px; overflow: auto; background: #0f1419; padding: 8px; border-radius: 8px; }
  .row { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
  .status { font-size: 12px; color: #9aa8b8; }
</style>
</head>
<body>
  <h1>Entrance device simulator</h1>
  <p class="status">API: ${API_BASE} · SN: <strong id="sn">${state.sn}</strong> ·
    <span id="online">${state.online ? 'ONLINE' : 'OFFLINE'}</span> ·
    Door: <span class="door ${state.lastDoor === 'OPEN' ? 'open' : state.lastDoor === 'DENIED' ? 'denied' : 'unknown'}" id="door">${state.lastDoor || '—'}</span>
  </p>

  <div class="card">
    <label>Device serial (pair this in Gymetric Settings)</label>
    <input id="snInput" value="${state.sn}" />
    <div class="row">
      <button class="primary" onclick="setSn()">Set SN</button>
      <button class="muted" onclick="toggleOnline()">${state.online ? 'Go offline' : 'Go online'}</button>
      <button class="danger" onclick="factoryReset()">Factory reset</button>
    </div>
  </div>

  <div class="card">
    <label>PIN to enroll / scan (usually filled by remote ENROLL_FP from app)</label>
    <input id="pin" placeholder="1001" />
    <div class="row">
      <button class="primary" onclick="enroll()">Enroll fingerprint</button>
      <button class="primary" onclick="doScan()">Scan at door</button>
      <button class="warn" onclick="wipe()">Wipe fingerprint</button>
      <button class="muted" onclick="disable()">Disable user</button>
      <button class="muted" onclick="enable()">Enable user</button>
    </div>
  </div>

  <div class="card">
    <strong>Roster</strong>
    <table>
      <thead><tr><th>PIN</th><th>Name</th><th>Enabled</th><th>Fingers</th></tr></thead>
      <tbody>
        ${Object.values(state.roster).map((u) =>
        `<tr><td>${u.pin}</td><td>${u.name}</td><td>${u.enabled}</td><td>${u.fingers.join(',') || '—'}</td></tr>`
    ).join('') || '<tr><td colspan="4">Empty</td></tr>'}
      </tbody>
    </table>
  </div>

  <div class="card">
    <strong>Logs</strong>
    <pre>${state.logs.join('\n')}</pre>
  </div>

<script>
async function api(path, opts) {
  const res = await fetch(path, opts);
  const data = await res.json().catch(() => ({}));
  location.reload();
  return data;
}
function setSn() { api('/api/set-sn', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ sn: document.getElementById('snInput').value }) }); }
function toggleOnline() { api('/api/toggle-online', { method:'POST' }); }
function factoryReset() { api('/api/factory-reset', { method:'POST' }); }
function enroll() { api('/api/enroll', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ pin: document.getElementById('pin').value }) }); }
function doScan() { api('/api/scan', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ pin: document.getElementById('pin').value }) }); }
function wipe() { api('/api/wipe', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ pin: document.getElementById('pin').value }) }); }
function disable() { api('/api/set-enabled', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ pin: document.getElementById('pin').value, enabled: false }) }); }
function enable() { api('/api/set-enabled', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ pin: document.getElementById('pin').value, enabled: true }) }); }
setTimeout(() => location.reload(), 8000);
</script>
</body>
</html>`;

const readJson = async (req: http.IncomingMessage) => {
    const chunks: Buffer[] = [];
    for await (const c of req) chunks.push(c as Buffer);
    try { return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'); }
    catch { return {}; }
};

const server = http.createServer(async (req, res) => {
    const url = new URL(req.url || '/', `http://localhost:${SIM_PORT}`);

    if (url.pathname === '/' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(html());
        return;
    }

    if (url.pathname === '/api/set-sn' && req.method === 'POST') {
        const body = await readJson(req);
        if (body.sn) { state.sn = String(body.sn).toUpperCase().trim(); log(`SN set to ${state.sn}`); }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, sn: state.sn }));
        return;
    }
    if (url.pathname === '/api/toggle-online' && req.method === 'POST') {
        state.online = !state.online;
        log(state.online ? 'Online' : 'Offline');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, online: state.online }));
        return;
    }
    if (url.pathname === '/api/factory-reset' && req.method === 'POST') {
        state.roster = {};
        state.lastDoor = null;
        log('Factory reset');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
        return;
    }
    if (url.pathname === '/api/enroll' && req.method === 'POST') {
        const body = await readJson(req);
        const pin = String(body.pin || '').trim();
        if (!pin) { res.writeHead(400); res.end('{}'); return; }
        enrollManual(pin, body.name);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
        return;
    }
    if (url.pathname === '/api/scan' && req.method === 'POST') {
        const body = await readJson(req);
        const pin = String(body.pin || '').trim();
        const result = await scan(pin);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
        return;
    }
    if (url.pathname === '/api/wipe' && req.method === 'POST') {
        const body = await readJson(req);
        const pin = String(body.pin || '').trim();
        if (state.roster[pin]) {
            state.roster[pin].fingers = [];
            log(`Wiped fingers for ${pin}`);
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
        return;
    }
    if (url.pathname === '/api/set-enabled' && req.method === 'POST') {
        const body = await readJson(req);
        const pin = String(body.pin || '').trim();
        if (state.roster[pin]) {
            state.roster[pin].enabled = !!body.enabled;
            log(`${pin} enabled=${state.roster[pin].enabled}`);
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
        return;
    }

    res.writeHead(404);
    res.end('Not found');
});

server.listen(SIM_PORT, () => {
    console.log(`Biometric simulator UI → http://localhost:${SIM_PORT}`);
    console.log(`Talking to API → ${API_BASE}`);
    console.log(`Default SN → ${DEFAULT_SN} (pair this in the app)`);
    setInterval(pollCommands, 3000);
    pollCommands();
});
