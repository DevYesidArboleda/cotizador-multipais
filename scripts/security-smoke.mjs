#!/usr/bin/env node
// Smoke de seguridad de 10 puntos (ADR-002 §6). Node >= 20, sin dependencias, sin tokens.
//
// Variables de entorno:
//   APP_URL              URL del proxy Nginx del frontend (default http://localhost:4200)
//   STRAPI_URL           URL directa de Strapi (opcional; sin ella se omiten los puntos 3, 6 y 8 y la mitad directa de 1, 4, 5)
//   SMOKE_COUNTRY        país semilla a consultar (default "co")
//   SMOKE_BUNDLE_DIR     carpeta del bundle para el punto 9 (default frontend/dist; se omite si no existe)
//   SMOKE_WAIT_SECONDS   espera de arranque en frío antes de empezar (default 0; en Render Free usar 600)
//   SMOKE_TIMEOUT_MS     timeout por petición (default 20000)
//
// Salida: una línea PASS/FAIL/SKIP por comprobación y exit 1 si algo falla.
// El punto 10 (gitleaks) lo ejecuta el job `governance`; aquí se informa como SKIP.
// Solo se usan peticiones sin credenciales: el POST de prueba usa datos ficticios (dominio example.com).

import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { randomBytes } from 'node:crypto';

const strip = (u) => (u ? u.replace(/\/+$/, '') : '');
const APP = strip(process.env.APP_URL || 'http://localhost:4200');
const STRAPI = strip(process.env.STRAPI_URL || '');
const COUNTRY = (process.env.SMOKE_COUNTRY || 'co').toLowerCase();
const BUNDLE_DIR = resolve(process.env.SMOKE_BUNDLE_DIR || 'frontend/dist');
const WAIT_S = Number(process.env.SMOKE_WAIT_SECONDS || 0);
const TIMEOUT = Number(process.env.SMOKE_TIMEOUT_MS || 20000);

const tty = process.stdout.isTTY;
const c = (code, s) => (tty ? `\x1b[${code}m${s}\x1b[0m` : s);
const results = [];
let failures = 0;

function record(status, id, title, detail = '') {
  results.push({ status, id, title, detail });
  const tag = status === 'PASS' ? c(32, 'PASS') : status === 'FAIL' ? c(31, 'FAIL') : c(33, 'SKIP');
  console.log(`${tag}  [${id}] ${title}${detail ? `\n        ${detail}` : ''}`);
  if (status === 'FAIL') {
    failures++;
    if (process.env.GITHUB_ACTIONS) console.log(`::error title=security-smoke ${id}::${title} ${detail}`);
  }
}

async function http(url, { method = 'GET', body, headers = {} } = {}) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), TIMEOUT);
  try {
    const res = await fetch(url, {
      method,
      headers: body ? { 'Content-Type': 'application/json', ...headers } : headers,
      body: body ? JSON.stringify(body) : undefined,
      redirect: 'manual',
      signal: ctl.signal,
    });
    const text = await res.text();
    let json;
    try { json = JSON.parse(text); } catch { json = undefined; }
    return { status: res.status, headers: res.headers, text, json };
  } catch (err) {
    return { status: 0, headers: new Headers(), text: '', json: undefined, error: String(err && err.message || err) };
  } finally {
    clearTimeout(timer);
  }
}

// Ejecuta una comprobación; cualquier excepción inesperada cuenta como FAIL (nunca silencioso).
async function check(id, title, fn) {
  try {
    const out = await fn();
    if (out === 'SKIP') return;
    if (out === true || out === undefined) record('PASS', id, title);
    else record('FAIL', id, title, String(out));
  } catch (err) {
    record('FAIL', id, title, `excepción: ${err && err.message || err}`);
  }
}

const skip = (id, title, why) => record('SKIP', id, title, why);

const bases = [['proxy', APP], ...(STRAPI ? [['strapi directo', STRAPI]] : [])];
const q = (country = COUNTRY) => `filters[country][code][$eq]=${country}&pagination[pageSize]=100`;

async function waitForStack() {
  if (!(WAIT_S > 0)) return;
  const deadline = Date.now() + WAIT_S * 1000;
  const targets = [`${APP}/api/countries?filters[code][$eq]=${COUNTRY}`, ...(STRAPI ? [`${STRAPI}/_health`] : [])];
  console.log(`Esperando arranque (hasta ${WAIT_S}s; capa gratuita puede tardar ~1 min)...`);
  for (let i = 1; Date.now() < deadline; i++) {
    const rs = await Promise.all(targets.map((t) => http(t)));
    if (rs.every((r) => r.status >= 200 && r.status < 300)) { console.log(`Listo tras ${i} intento(s).`); return; }
    console.log(`  intento ${i}: ${rs.map((r) => r.status || r.error).join(', ')}`);
    await new Promise((r) => setTimeout(r, 15000));
  }
  console.log('Se agotó la espera; se ejecutan las comprobaciones igualmente.');
}

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (/\.(js|mjs|css|html|json|map|txt)$/i.test(name)) out.push(p);
  }
  return out;
}

async function main() {
  console.log(`security-smoke  proxy=${APP}  strapi=${STRAPI || '(no definido)'}  país=${COUNTRY}\n`);
  await waitForStack();

  // 1. GET countries sin cabeceras -> 200 y exactamente 1
  for (const [name, base] of bases) {
    await check('1', `GET /api/countries?filters[code][$eq]=${COUNTRY} sin cabeceras (${name})`, async () => {
      const r = await http(`${base}/api/countries?filters[code][$eq]=${COUNTRY}`);
      if (r.status !== 200) return `esperado 200, recibido ${r.status}${r.error ? ` (${r.error})` : ''}`;
      const d = r.json && r.json.data;
      if (!Array.isArray(d) || d.length !== 1) return `esperado data.length === 1, recibido ${Array.isArray(d) ? d.length : 'sin data'}`;
      if (d[0].code !== COUNTRY) return `code esperado "${COUNTRY}", recibido "${d[0].code}"`;
      return true;
    });
  }

  // 2. POST form-fields vía proxy -> 403 (Nginx deny)
  await check('2', 'POST /api/form-fields vía proxy -> 403', async () => {
    const r = await http(`${APP}/api/form-fields`, { method: 'POST', body: { data: {} } });
    return r.status === 403 ? true : `esperado 403, recibido ${r.status}${r.error ? ` (${r.error})` : ''}`;
  });

  // 3. POST form-fields directo -> 403 (permisos)
  if (STRAPI) {
    await check('3', 'POST /api/form-fields directo a Strapi -> 403', async () => {
      const r = await http(`${STRAPI}/api/form-fields`, { method: 'POST', body: { data: {} } });
      return r.status === 403 ? true : `esperado 403, recibido ${r.status}${r.error ? ` (${r.error})` : ''}`;
    });
  } else skip('3', 'POST /api/form-fields directo a Strapi -> 403', 'STRAPI_URL no definido');

  // 4. Borradores nunca visibles: mismo total que published y todo publishedAt != null
  for (const [name, base] of bases) {
    for (const collection of ['form-fields', 'insurance-plans']) {
      await check('4', `status=draft no filtra borradores en /api/${collection} (${name})`, async () => {
        const pub = await http(`${base}/api/${collection}?status=published&${q()}`);
        if (pub.status !== 200) return `baseline published: esperado 200, recibido ${pub.status}`;
        const total = pub.json && pub.json.meta && pub.json.meta.pagination && pub.json.meta.pagination.total;
        if (typeof total !== 'number' || total < 1) return `baseline published sin elementos (total=${total}); ¿seed ausente?`;
        const variants = [
          `status=draft&${q()}`,
          `st%61tus=draft&${q()}`,
          `status[]=draft&${q()}`,
          `status=draft&publicationState=preview&${q()}`,
        ];
        for (const v of variants) {
          const r = await http(`${base}/api/${collection}?${v}`);
          // 400 = Strapi rechaza el parametro (p. ej. publicationState de Strapi 4): no devuelve datos, es seguro.
          if (r.status === 400) continue;
          if (r.status !== 200) return `?${v} -> HTTP ${r.status} (esperado 200 con solo publicados, o 400 de rechazo)`;
          const data = (r.json && r.json.data) || [];
          const t = r.json && r.json.meta && r.json.meta.pagination && r.json.meta.pagination.total;
          const bad = data.filter((x) => typeof x.publishedAt !== 'string');
          if (bad.length) return `?${v} devolvió ${bad.length} elemento(s) con publishedAt null/ausente`;
          if (t !== total) return `?${v} total=${t}, published total=${total}`;
        }
        return true;
      });
    }
  }

  // 5. findOne no permitido (403 o 404)
  for (const [name, base] of bases) {
    await check('5', `GET /api/form-fields/<documentId> -> 403/404 (${name})`, async () => {
      const list = await http(`${base}/api/form-fields?${q()}&pagination[pageSize]=1`);
      const id = list.json && list.json.data && list.json.data[0] && list.json.data[0].documentId;
      if (!id) return `no se pudo obtener un documentId (HTTP ${list.status})`;
      const r = await http(`${base}/api/form-fields/${encodeURIComponent(id)}`);
      return r.status === 403 || r.status === 404 ? true : `esperado 403/404, recibido ${r.status}`;
    });
  }

  // 6. Registro público cerrado (directo) y no creó usuario
  if (STRAPI) {
    await check('6', 'POST /api/auth/local/register directo -> 403/400 y sin jwt', async () => {
      const rnd = randomBytes(4).toString('hex');
      const r = await http(`${STRAPI}/api/auth/local/register`, {
        method: 'POST',
        body: { username: `smoke${rnd}`, email: `smoke-${rnd}@example.com`, password: `Ficticia-${rnd}-123` },
      });
      if (r.json && (r.json.jwt || r.json.user)) return `¡el registro CREÓ un usuario! (HTTP ${r.status})`;
      return r.status === 403 || r.status === 400 ? true : `esperado 403/400, recibido ${r.status}`;
    });
  } else skip('6', 'POST /api/auth/local/register directo -> 403/400', 'STRAPI_URL no definido');
  await check('6', 'POST /api/auth/local/register vía proxy -> 403', async () => {
    const r = await http(`${APP}/api/auth/local/register`, { method: 'POST', body: { username: 'x', email: 'x@example.com', password: 'x' } });
    return r.status === 403 ? true : `esperado 403, recibido ${r.status}`;
  });

  // 7. /admin vía proxy sirve el SPA, no el admin de Strapi
  await check('7', 'GET /admin vía proxy sirve el SPA (no el admin de Strapi)', async () => {
    const r = await http(`${APP}/admin`);
    if (r.status !== 200) return `esperado 200 (fallback SPA), recibido ${r.status}`;
    const ct = r.headers.get('content-type') || '';
    if (!/text\/html/i.test(ct)) return `content-type inesperado: ${ct}`;
    if (!/<app-root/i.test(r.text)) return 'la respuesta no contiene <app-root> (no parece el SPA)';
    if (/strapi/i.test(r.text)) return 'la respuesta menciona "strapi": podría ser el admin';
    return true;
  });

  // 8. users-permissions/roles denegado (directo; y vía proxy, donde además no debe devolver datos)
  if (STRAPI) {
    await check('8', 'GET /api/users-permissions/roles directo -> 403', async () => {
      const r = await http(`${STRAPI}/api/users-permissions/roles`);
      return r.status === 403 ? true : `esperado 403, recibido ${r.status}`;
    });
  } else skip('8', 'GET /api/users-permissions/roles directo -> 403', 'STRAPI_URL no definido');
  await check('8', 'GET /api/users-permissions/roles vía proxy -> 403/404', async () => {
    const r = await http(`${APP}/api/users-permissions/roles`);
    return r.status === 403 || r.status === 404 ? true : `esperado 403/404, recibido ${r.status}`;
  });

  // 7b/R7: populate de relaciones privadas no se filtra
  for (const [name, base] of bases) {
    await check('R7', `populate[createdBy] no expone createdBy (${name})`, async () => {
      const r = await http(`${base}/api/form-fields?${q()}&populate[createdBy]=true`);
      if (r.status >= 500) return `HTTP ${r.status}`;
      if (r.status !== 200) return true; // 400/403 también son seguros
      const leaks = ((r.json && r.json.data) || []).some((x) => 'createdBy' in x || 'updatedBy' in x);
      return leaks ? 'la respuesta incluye createdBy/updatedBy' : true;
    });
  }

  // 9. Bundle sin secretos
  const pattern = /Bearer |api_token|STRAPI_\w*TOKEN|Authorization/i;
  if (existsSync(BUNDLE_DIR) && statSync(BUNDLE_DIR).isDirectory()) {
    await check('9', `Bundle ${BUNDLE_DIR} sin Bearer/api_token/STRAPI_*TOKEN/Authorization`, async () => {
      const hits = [];
      for (const f of walk(BUNDLE_DIR)) {
        const m = readFileSync(f, 'utf8').match(pattern);
        if (m) hits.push(`${f} (${m[0].trim()})`);
      }
      return hits.length ? `coincidencias: ${hits.slice(0, 5).join('; ')}` : true;
    });
  } else skip('9', 'Bundle sin secretos', `${BUNDLE_DIR} no existe (se valida en el job frontend/e2e con SMOKE_BUNDLE_DIR)`);

  // 10. gitleaks
  skip('10', 'Repo sin hallazgos de gitleaks', 'lo ejecuta el job governance (gitleaks-action)');

  const pass = results.filter((r) => r.status === 'PASS').length;
  const sk = results.filter((r) => r.status === 'SKIP').length;
  console.log(`\nResumen: ${pass} PASS, ${failures} FAIL, ${sk} SKIP`);
  if (failures > 0) { console.log(c(31, 'security-smoke: FALLÓ')); process.exit(1); }
  console.log(c(32, 'security-smoke: OK'));
}

main().catch((err) => { console.error(`security-smoke: error fatal: ${err && err.stack || err}`); process.exit(1); });
