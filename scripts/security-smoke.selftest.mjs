#!/usr/bin/env node
// Autoprueba de scripts/security-smoke.mjs: levanta un "proxy" y un "Strapi" simulados y comprueba que
// el smoke pasa con un servidor correcto y FALLA (exit 1) con cada vulnerabilidad simulada. Sin dependencias.
import { createServer } from 'node:http';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';

const here = dirname(fileURLToPath(import.meta.url));
const smoke = join(here, 'security-smoke.mjs');

const SPA = '<!doctype html><html><body><app-root></app-root></body></html>';
const ADMIN = '<!doctype html><html><head><title>Strapi Admin</title></head><body></body></html>';

function json(res, status, body) {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(body));
}

function strapiHandler(mode) {
  const published = [{ documentId: 'abc123', key: 'k1', publishedAt: '2026-01-01T00:00:00.000Z' }];
  const drafts = [...published, { documentId: 'def456', key: 'k2', publishedAt: null }];
  return (req, res) => {
    const url = req.url;
    const path = url.split('?')[0];
    if (path === '/_health') { res.writeHead(204); return res.end(); }
    if (path === '/api/countries' && req.method === 'GET') return json(res, 200, { data: [{ code: 'co' }], meta: { pagination: { total: 1 } } });
    if (/^\/api\/(form-fields|insurance-plans)$/.test(path)) {
      if (req.method !== 'GET') return json(res, mode === 'write-open' ? 200 : 403, {});
      if (/publicationState=/.test(url) && mode !== 'draft-leak-ps') return json(res, 400, { error: { name: 'ValidationError' } });
      if (/publicationState=/.test(url)) return json(res, 200, { data: drafts, meta: { pagination: { total: drafts.length } } });
      const evade = mode === 'draft-leak' && /st%61tus=draft/.test(url);
      const rows = evade ? drafts : published;
      return json(res, 200, { data: rows, meta: { pagination: { total: rows.length } } });
    }
    if (/^\/api\/form-fields\/[^/]+$/.test(path)) return json(res, mode === 'findone-open' ? 200 : 403, {});
    if (path === '/api/auth/local/register') return mode === 'register-open' ? json(res, 200, { jwt: 'x', user: { id: 1 } }) : json(res, 403, {});
    if (path === '/api/users-permissions/roles') return json(res, mode === 'roles-open' ? 200 : 403, {});
    json(res, 404, {});
  };
}

function proxyHandler(mode, strapi) {
  return (req, res) => {
    const path = req.url.split('?')[0];
    if (path === '/healthz') { res.writeHead(200); return res.end('ok'); }
    if (path.startsWith('/api/')) {
      if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return json(res, mode === 'proxy-write-open' ? 200 : 403, {});
      return strapi(req, res);
    }
    res.writeHead(200, { 'content-type': 'text/html' });
    res.end(path === '/admin' && mode === 'admin-exposed' ? ADMIN : SPA);
  };
}

const listen = (handler) => new Promise((ok) => { const s = createServer(handler); s.listen(0, '127.0.0.1', () => ok(s)); });

function run(mode, bundleDir) {
  return listen(strapiHandler(mode)).then(async (strapiSrv) => {
    const proxySrv = await listen(proxyHandler(mode, strapiHandler(mode)));
    const env = {
      ...process.env,
      APP_URL: `http://127.0.0.1:${proxySrv.address().port}`,
      STRAPI_URL: `http://127.0.0.1:${strapiSrv.address().port}`,
      SMOKE_BUNDLE_DIR: bundleDir,
      GITHUB_ACTIONS: '',
    };
    const r = await new Promise((done) => {
      import('node:child_process').then(({ spawn }) => {
        const p = spawn(process.execPath, [smoke], { env });
        let out = '';
        p.stdout.on('data', (d) => (out += d));
        p.stderr.on('data', (d) => (out += d));
        p.on('close', (code) => done({ code, out }));
      });
    });
    strapiSrv.close(); proxySrv.close();
    return r;
  });
}

const cleanBundle = mkdtempSync(join(tmpdir(), 'smoke-clean-'));
writeFileSync(join(cleanBundle, 'main.js'), 'console.log("hola")');
const dirtyBundle = mkdtempSync(join(tmpdir(), 'smoke-dirty-'));
writeFileSync(join(dirtyBundle, 'main.js'), 'fetch("/x",{headers:{Authorization:"Bearer abc"}})');

const cases = [
  { mode: 'ok', bundle: cleanBundle, expect: 0 },
  { mode: 'draft-leak', bundle: cleanBundle, expect: 1, marker: '[4]' },
  { mode: 'draft-leak-ps', bundle: cleanBundle, expect: 1, marker: '[4]' },
  { mode: 'write-open', bundle: cleanBundle, expect: 1, marker: '[3]' },
  { mode: 'proxy-write-open', bundle: cleanBundle, expect: 1, marker: '[2]' },
  { mode: 'findone-open', bundle: cleanBundle, expect: 1, marker: '[5]' },
  { mode: 'register-open', bundle: cleanBundle, expect: 1, marker: '[6]' },
  { mode: 'admin-exposed', bundle: cleanBundle, expect: 1, marker: '[7]' },
  { mode: 'roles-open', bundle: cleanBundle, expect: 1, marker: '[8]' },
  { mode: 'ok', bundle: dirtyBundle, expect: 1, marker: '[9]', label: 'bundle-con-token' },
];

let bad = 0;
for (const t of cases) {
  const { code, out } = await run(t.mode, t.bundle);
  const failLines = out.split('\n').filter((l) => l.startsWith('FAIL'));
  const detected = t.expect === 0 || failLines.some((l) => l.includes(`${t.marker}`));
  const okCase = code === t.expect && detected;
  if (!okCase) { bad++; console.log(out); }
  console.log(`${okCase ? 'OK  ' : 'MAL '} ${t.label || t.mode}: exit=${code} (esperado ${t.expect})${t.marker ? ` FAIL en ${t.marker}: ${detected}` : ''}`);
}
if (bad) { console.log(`\nselftest: ${bad} caso(s) incorrecto(s)`); process.exit(1); }
console.log('\nselftest: el smoke detecta cada vulnerabilidad simulada');
