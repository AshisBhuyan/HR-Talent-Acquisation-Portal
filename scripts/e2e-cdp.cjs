/**
 * Headless smoke driver: loads every module route in headless Chrome via CDP,
 * collects console errors and uncaught exceptions, and optionally runs
 * in-page action scripts. Exits non-zero if any page reports an error.
 *
 * Usage: node scripts/e2e-cdp.cjs
 */
const { spawn, spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

process.chdir(path.join(__dirname, '..'));

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PREVIEW_PORT = 4173;
const DEBUG_PORT = 9333;

const ROUTES = [
  '/hr/talent-acquisition/dashboard',
  '/hr/talent-acquisition/applications',
  '/hr/talent-acquisition/applications/APP-0017',
  '/hr/talent-acquisition/screening',
  '/hr/talent-acquisition/shortlisting',
  '/hr/talent-acquisition/interviews',
  '/hr/talent-acquisition/final-selection',
  '/hr/talent-acquisition/approvals',
  '/hr/talent-acquisition/offers',
  '/hr/talent-acquisition/joining',
  '/hr/talent-acquisition/reports',
  '/hr/employee-databank/current',
  '/hr/employee-databank/former',
  '/hr/employee-databank/all',
  '/employee-invite/e2e-invalid-token',
  '/candidate/offer-response/e2e-invalid-token',
  '/candidate/document-submission/e2e-invalid-token',
];

const ACTIONS = [
  { route: '/hr/talent-acquisition/applications', label: 'click refresh', script: `(() => { const b=[...document.querySelectorAll('button')].find(x=>/refresh data/i.test(x.textContent)); if(!b) return 'refresh-button-not-found'; b.click(); return 'clicked'; })()` },
  { route: '/hr/talent-acquisition/dashboard', label: 'dashboard renders stats', script: `(() => document.querySelectorAll('.stat-card').length)()` },
  { route: '/hr/talent-acquisition/applications', label: 'applications table rows', script: `(() => document.querySelectorAll('tbody tr').length)()` },
  { route: '/hr/talent-acquisition/reports', label: 'reports metrics', script: `(() => document.querySelectorAll('.ta-metric').length)()` },
];

function httpJson(method, url) {
  return new Promise((resolve, reject) => {
    const req = require('http').request(url, { method }, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(body) }); }
        catch (e) { resolve({ status: res.statusCode, body }); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForDebugger(target_port, retries = 40) {
  for (let i = 0; i < retries; i += 1) {
    try {
      const res = await httpJson('GET', `http://127.0.0.1:${DEBUG_PORT}/json/version`);
      if (res.status === 200) return true;
    } catch {
      // not ready
    }
    await wait(250);
  }
  return false;
}

function cdpClient(wsUrl) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    let id = 0;
    const pending = new Map();
    const events = [];

    ws.addEventListener('open', () => {
      resolve({
        send(method, params = {}) {
          return new Promise((res, rej) => {
            const messageId = ++id;
            pending.set(messageId, { res, rej });
            ws.send(JSON.stringify({ id: messageId, method, params }));
          });
        },
        events,
        close() { ws.close(); },
      });
    });
    ws.addEventListener('error', reject);
    ws.addEventListener('message', (event) => {
      const message = JSON.parse(event.data.toString());
      if (message.id && pending.has(message.id)) {
        const { res, rej } = pending.get(message.id);
        pending.delete(message.id);
        if (message.error) rej(new Error(message.error.message));
        else res(message.result);
        return;
      }
      events.push(message);
    });
  });
}

(async () => {
  const tmpProfile = fs.mkdtempSync(path.join(os.tmpdir(), 'chrome-cdp-'));
  console.log('Temporary Chrome profile:', tmpProfile);

  const preview = spawn('npx', ['vite', 'preview', '--host', '127.0.0.1', '--port', String(PREVIEW_PORT), '--strictPort'], {
    stdio: 'ignore',
    shell: true,
    cwd: process.cwd(),
  });

  // Wait for preview server to answer
  let previewReady = false;
  for (let i = 0; i < 60; i += 1) {
    try {
      const res = await fetch(`http://127.0.0.1:${PREVIEW_PORT}/hr/talent-acquisition/dashboard`);
      if (res.ok) { previewReady = true; break; }
    } catch {
      // not ready
    }
    await wait(300);
  }
  if (!previewReady) {
    console.error('Preview server did not start.');
    preview.kill();
    process.exit(1);
  }
  console.log('Preview server is ready.');

  const chrome = spawn(CHROME, [
    '--headless=new',
    `--remote-debugging-port=${DEBUG_PORT}`,
    `--user-data-dir=${tmpProfile}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-extensions',
    '--disable-gpu',
    '--window-size=1400,900',
    'about:blank',
  ], { stdio: 'ignore', detached: true });

  const debugReady = await waitForDebugger();
  if (!debugReady) {
    console.error('Chrome DevTools endpoint did not come up.');
    chrome.kill();
    preview.kill();
    process.exit(1);
  }
  console.log('Chrome DevTools endpoint is ready.');

  let failures = 0;

  for (const route of ROUTES) {
    let targetId = null;
    try {
      const created = await httpJson('PUT', `http://127.0.0.1:${DEBUG_PORT}/json/new?url=${encodeURIComponent('http://127.0.0.1:' + PREVIEW_PORT + route)}`);
      targetId = created.body?.id;
      const wsUrl = created.body?.webSocketDebuggerUrl;
      const client = await cdpClient(wsUrl);
      await client.send('Runtime.enable');
      await client.send('Page.enable');
      await wait(2200);

      const errors = client.events
        .filter((e) => e.method === 'Runtime.consoleAPICalled'
          ? ['error', 'assert'].includes(e.params?.type)
          : e.method === 'Runtime.exceptionThrown')
        .map((e) => {
          if (e.method === 'Runtime.exceptionThrown') {
            const detail = e.params?.exceptionDetails;
            return `exception: ${detail?.exception?.description || detail?.text || 'unknown'}`;
          }
          return `console.${e.params?.type}: ${(e.params?.args || [])
            .map((a) => a.value ?? a.description ?? '')
            .join(' ')}`;
        })
        .filter((line) => !/favicon/i.test(line));

      if (errors.length) {
        failures += 1;
        console.log(`FAIL ${route}`);
        errors.forEach((line) => console.log(`     ${line}`));
      } else {
        console.log(`PASS ${route}`);
      }

      // Report page content sanity
      const probe = await client.send('Runtime.evaluate', {
        expression: 'document.body ? document.body.innerText.slice(0, 120) : ""',
        returnByValue: true,
      });
      const head = (probe.result?.value || '').replace(/\s+/g, ' ').trim();
      console.log(`     content: ${head.slice(0, 100)}`);

      client.close();
    } catch (error) {
      failures += 1;
      console.log(`FAIL ${route} — driver error: ${error.message}`);
    } finally {
      if (targetId) {
        await httpJson('GET', `http://127.0.0.1:${DEBUG_PORT}/json/close/${targetId}`).catch(() => {});
      }
    }
  }

  // In-page action probes
  for (const action of ACTIONS) {
    try {
      const created = await httpJson('PUT', `http://127.0.0.1:${DEBUG_PORT}/json/new?url=${encodeURIComponent('http://127.0.0.1:' + PREVIEW_PORT + action.route)}`);
      const wsUrl = created.body?.webSocketDebuggerUrl;
      const client = await cdpClient(wsUrl);
      await client.send('Runtime.enable');
      await client.send('Page.enable');
      await wait(2500);
      const result = await client.send('Runtime.evaluate', {
        expression: action.script,
        returnByValue: true,
      });
      console.log(`ACTION [${action.label}] => ${JSON.stringify(result.result?.value)}`);
      client.close();
      await httpJson('GET', `http://127.0.0.1:${DEBUG_PORT}/json/close/${created.body?.id}`).catch(() => {});
    } catch (error) {
      console.log(`ACTION [${action.label}] failed: ${error.message}`);
      failures += 1;
    }
  }

  chrome.kill();
  preview.kill();
  console.log(failures === 0 ? '\nE2E smoke passed — no page errors found.' : `\n${failures} issue(s) found.`);
  process.exit(failures === 0 ? 0 : 1);
})().catch((error) => {
  console.error('E2E driver crashed:', error);
  process.exit(1);
});
