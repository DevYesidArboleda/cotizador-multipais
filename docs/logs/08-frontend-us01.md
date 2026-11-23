# Log 08 — @frontend-engineer: iteración 1 — núcleo + SPEC-US-01 (Fase 5)

- **Fecha:** 2026-11-23 · **Subagente nativo** `frontend-engineer` (sonnet) · **Duración:** ~29.5 min · 72 llamadas
- Prompt de despacho e informe final copiados **sin editar**.

## Prompt de despacho (literal)

```text
Fase 5 — Frontend, iteración 1: SPEC-US-01 (formulario dinámico) + núcleo compartido. Directorio: /home/claude/cotizador-multipais

Entradas (rutas exactas; léelas antes de escribir código):
1. /home/claude/cotizador-multipais/.claude/agents/frontend-engineer.md (tu definición)
2. /home/claude/cotizador-multipais/.claude/skills/angular-21-dynamic-forms/SKILL.md
3. /home/claude/cotizador-multipais/CLAUDE.md
4. /home/claude/cotizador-multipais/docs/specs/SPEC-US-01.md (v3, Aprobado) — fuente de verdad de esta iteración
5. /home/claude/cotizador-multipais/docs/specs/SPEC-US-02.md y /home/claude/cotizador-multipais/docs/specs/SPEC-US-03.md (solo para no cerrar puertas: QuoteState compartido, rutas, stepper)
6. /home/claude/cotizador-multipais/docs/specs/UI-UX-GUIDELINES.md (Aprobado en HITL-2: tokens, layout, estados, foco, microcopy ui-copy)
7. /home/claude/cotizador-multipais/docs/contracts/strapi-contracts.ts (contrato congelado: cópialo a frontend/src/app/core/contracts/ sin cambiar tipos)
8. /home/claude/cotizador-multipais/docs/adrs/ADR-001-multi-country-strategy.md, /home/claude/cotizador-multipais/docs/adrs/ADR-002-docker-and-strapi-security.md
9. /home/claude/cotizador-multipais/docs/hitl/HITL-1-specs.md, /home/claude/cotizador-multipais/docs/hitl/HITL-2-arquitectura.md
10. /home/claude/cotizador-multipais/frontend/Dockerfile, /home/claude/cotizador-multipais/frontend/nginx/default.conf.template (no los modifiques salvo que el build lo exija; repórtalo)
11. /home/claude/cotizador-multipais/scripts/trace-check.mjs (debe quedar en verde)

Tarea:
A) Crear el proyecto Angular (última 22.x) en frontend/ conservando Dockerfile, .dockerignore y nginx/. Nombre del proyecto `frontend` (el Dockerfile copia dist/frontend/browser). Standalone, sin NgModules, OnPush, signals, control flow nativo, TS strict. Runner de unit tests por defecto del CLI. Agrega ESLint (angular-eslint) con script `npm run lint`. `proxy.conf.json` para `/api` → http://localhost:1337 en `npm start`. Desactiva inlineCritical de estilos (CSP sin unsafe-inline para scripts, ADR-002). Playwright (`@playwright/test`) con `playwright.config.ts` que use `E2E_BASE_URL` (default http://localhost:4200) y carpeta `e2e/`.
B) Núcleo compartido: rutas de CLAUDE.md §4, CountryStore/QuoteStore con signals y sessionStorage `auto_quote_v1_<country>`, StrapiApiService + mappers según el contrato, catálogo ui-copy, tokens.css de la guía con el test de contraste T4, stepper accesible, header con selector de país por enlaces.
C) SPEC-US-01 completa: todas sus R-01.x y AC-01.x implementadas, cada una con al menos un test (unit o E2E) cuyo TÍTULO contenga el ID (p. ej. it('[R-01.14][AC-01.9] ...')). trace-check exigirá cobertura completa de SPEC-US-01 en cuanto exista un solo test que la cite. Los E2E-M usan page.route; los E2E-S leen el Strapi sembrado (solo lectura).
D) Paso 2 y Paso 3 quedan como pantallas mínimas (placeholder accesible) con sus guards de navegación, sin implementar sus specs.

Verificación obligatoria (salida literal en el Handoff):
- `npm run lint`, `npm test -- --watch=false` (o el equivalente no interactivo del runner), `npm run build -- --configuration production`.
- `node scripts/trace-check.mjs` desde la raíz → OK.
- E2E: intenta ejecutarlos contra un stack local real: Strapi desde /home/claude/cotizador-multipais/backend (ya tiene node_modules; NODE_ENV=production, SQLite temporal en /tmp, SEED_ON_BOOT=true, secrets ficticios por env, puerto 1337) + `npm start` del frontend. Si no se pueden instalar los navegadores de Playwright en este entorno, decláralo como no verificado con el error literal; no instales herramientas fuera de npm. Detén todos los procesos al terminar.
- grep que pruebe 0 coincidencias de: NgModule, *ngIf, *ngFor, `: any`, `as any`, localhost:1337 dentro de frontend/src, y ningún literal de campos/planes/edad 18/rango de años de negocio en frontend/src fuera de tests.
No hagas git commit. Termina con el bloque Handoff de CLAUDE.md §6.
```

## Informe final del subagente (literal)

## Handoff
- **Agente:** @frontend-engineer · **Fase:** 5 (iteración 1: SPEC-US-01 + núcleo compartido) · **Entradas leídas:** `.claude/agents/frontend-engineer.md`, `.claude/skills/angular-21-dynamic-forms/SKILL.md`, `CLAUDE.md`, `docs/specs/SPEC-US-01.md` (completa), `SPEC-US-02.md` y `SPEC-US-03.md` (solo R-02.1 y R-03.1 para no cerrar puertas), `docs/specs/UI-UX-GUIDELINES.md` (completa), `docs/contracts/strapi-contracts.ts`, `docs/adrs/ADR-001` y `ADR-002`, `docs/hitl/HITL-1-specs.md` y `HITL-2-arquitectura.md`, `frontend/Dockerfile`, `frontend/nginx/default.conf.template`, `scripts/trace-check.mjs`, `backend/src/extensions/seed-data.ts` (para saber qué ve E2E-S).
- **No se hizo git commit** (lo pediste así). Todo queda sin versionar en `frontend/`. `backend/`, `docs/`, `Dockerfile`, `.dockerignore` y `nginx/` no se tocaron.

### Archivos creados (todos bajo `/home/claude/cotizador-multipais/frontend/`)
- **Proyecto:** `package.json`, `package-lock.json`, `angular.json`, `tsconfig*.json` (strict + strictTemplates), `eslint.config.js` (angular-eslint, incluye `e2e/` y `playwright.config.ts`), `proxy.conf.json` (`/api` → `http://localhost:1337`, cableado en `serve.options.proxyConfig`), `playwright.config.ts` (`E2E_BASE_URL`, default `http://localhost:4200`, `testDir: 'e2e'`, TZ `America/Bogota`), `e2e/tsconfig.json`, `public/`.
- **Estilos:** `src/styles/tokens.css` (copia exacta de la guía §2.2), `src/styles.css` (foco global, botones, tarjetas de estado, skeleton). IBM Plex Sans autoalojada vía paquete npm `@fontsource/ibm-plex-sans` (latin y latin-ext 400/500/600).
- **Núcleo:** `src/app/core/contracts/strapi-contracts.ts` (copia sin cambios), `core/http/{strapi-queries,type-guards,mappers,api-url.interceptor}.ts`, `core/api/strapi-api.service.ts`, `core/country/{country.store,config-load}.ts`, `core/quote/quote.store.ts`, `core/storage/quote-storage.ts`, `core/guards/{step-access,step-guards}.ts`, `core/clock.ts`, `app.ts`, `app.config.ts`, `app.routes.ts`, `i18n/{ui-copy.es.ts,ui-copy.ts}` (catálogo completo de la guía §7 más 3 claves de título de documento).
- **Dominio puro:** `domain/country/country-resolver.ts`, `domain/form/{calendar,form-layout,semantic-roles,normalizers,field-validators,validate-step1,form-hydration}.ts`.
- **UI:** `shared/{header,stepper,dynamic-field,async-state}/`, `features/step-1/{step-1,step-1-form,step-1-view-state}`, `features/country-not-found/`, y pantallas mínimas `features/{step-2,step-3,confirmation}/` (h1 + texto `placeholder.pending` + "Volver"), todas con guards.
- **Tests:** 23 `*.spec.ts` unit en `src/app/**` más `src/app/testing/form-fixtures.ts` (fixtures ficticios). 5 specs E2E en `e2e/` (`us-01-form`, `us-01-config-mutations`, `us-01-country-isolation`, `us-01-states`, `us-01-a11y`) más `e2e/support/{mock-fixtures,strapi-mock,form-helpers}.ts`.

### IDs cubiertos
- **SPEC-US-01 completa:** R-01.1 a R-01.31 y AC-01.1 a AC-01.32. Los 63 IDs tienen al menos un test que los cita en el título (unit o E2E).
- **GAP-01.9, 01.10, 01.17, 01.19** (implementados). **HITL-2 P1 a P8:** P2 (Reintentar en config-error), P3 (autocomplete por rol), P5 (fuente autoalojada), P6 (stepper derivado), P4 (marca "Linde Auto").
- P1 y P7 corresponden a US-03, no aplican en esta iteración.
- Los tests de `decideStepAccess` para Paso 3/confirmación **no citan ningún ID de US-02/03** a propósito: citar uno pondría esa spec "en implementación" y `trace-check` exigiría cobertura completa.

### Verificación ejecutada (salida literal)
`$ npm run lint`
```
Linting "frontend"...

All files pass linting.
```
`$ npm test -- --watch=false` (runner por defecto del CLI 22: Vitest)
```
 Test Files  23 passed (23)
      Tests  216 passed (216)
```
`$ npm run build -- --configuration production`
```
Initial chunk files | Names                       |  Raw size | Estimated transfer size
main-2NM4OY5M.js    | main                        | 301.76 kB |                81.33 kB
styles-4DPXEUNI.css | styles                      |   6.24 kB |                 1.62 kB
                    | Initial total               | 308.00 kB |                82.95 kB
Lazy chunk files: step-1-component 32.45 kB, country-not-found-component 2.19 kB, step-2/step-3/confirmation < 1 kB
Application bundle generation complete.
Output location: /home/claude/cotizador-multipais/frontend/dist/frontend
```
`$ node scripts/trace-check.mjs` (desde la raíz)
```
trace-check: 3 specs · 167 IDs · 28 archivos de test · 0 hallazgos
trace-check OK
```
(Solo avisos `⚠` de AC-03.x sin test, que no son error porque SPEC-US-03 aún no está en implementación. SPEC-US-01 no genera ningún aviso.)

**E2E ejecutados de verdad**, dos corridas consecutivas, sin flakes:
- **Stack:**
  - Strapi desde `backend/`: `NODE_ENV=production`, SQLite temporal en `/tmp`, `SEED_ON_BOOT=true`, secretos ficticios por env, puerto 1337.
  - Frontend con `npm start` en :4200, `/api` por proxy.
  - Navegador: Chromium (headless shell) instalado con `npx playwright install chromium`, sin problemas.
- `$ npx playwright test --reporter=dot`
```
Running 91 tests using 1 worker
  91 passed (1.6m)      (2.ª corrida: 91 passed (1.7m))
```
- 60 E2E-S leen el Strapi sembrado en solo lectura, 22 E2E-M usan `page.route`, 9 son de accesibilidad (incluye `@axe-core/playwright` con wcag2a/aa/21aa/22aa en listo y con errores: 0 violaciones).
- **Extra:** corrí 16 de esos E2E contra el build de producción servido con la CSP de Nginx (`script-src 'self'`, sin `unsafe-inline` de scripts) mediante un servidor Node temporal en /tmp: 16 passed. `index.html` de producción no contiene `onload` ni `<style>`; `inlineCritical: false` está en `angular.json`.
- Se detuvieron Strapi, el dev server y el servidor temporal (0 procesos restantes) y se borraron `dist`, `.angular`, `test-results` y los temporales.

**Greps sobre `frontend/src` (0 coincidencias):**
- `NgModule|*ngIf|*ngFor|: any|as any|localhost:1337` → 0 (incluido el contrato copiado). `exit=1`.
- Literales de negocio fuera de `*.spec.ts` y de `src/app/testing/`:
  - 18 y 20 como valores → 0 (solo aparecen `legalAge`/`vehicleMaxAgeYears` como nombres de propiedad del contrato, leídos del país).
  - `key` de seed, etiquetas, planes, monedas, ciudades, marcas, "Colombia"/"Chile" → 0.
  - `'co'`/`'cl'` → solo `DEFAULT_COUNTRY_CODE = 'co'` en `domain/country/country-resolver.ts`, que exige CLAUDE.md §4 (`/` → `co`).

### Decisiones y desviaciones a revisar
1. **`pattern` se aplica como `^(?:patrón)$`** (valor completo, R-01.6). Con los patrones del seed, anclados, es equivalente a usarlo tal cual. Si QA lee "tal como se escribió" como "sin envolver", es un cambio de una línea en `compilePattern` (`core/http/mappers.ts`).
2. **Persistencia con `effect`** (como pide la skill) más un volcado síncrono al cambiar de país (`QuoteStore.activate`). Los E2E esperan ~150 ms tras escribir antes de recargar. Si un revisor quiere escritura 100 % síncrona, el cambio es mínimo.
3. **Valores del Paso 1:** todos son `string`/`boolean`, incluido `number` como texto tal cual se escribió. Así `2020.5` y `1e3` se validan según la spec; no se usa el accessor numérico de Angular.
4. **Lógica sin `FormControl.validators`:** `FormGroup` tipado construido dinámicamente como contenedor de valores; la validación es la función pura `validateStep1`/`validateField` sobre una señal de valores. Esto resuelve el patrón dependiente (CC/CE) sin validador de grupo.
5. **Guards:**
  - `countryGuard` solo normaliza y valida el código sin red.
  - La resolución real del país ocurre en el Paso 1, que navega a `/country-not-found` en `replaceUrl` si no existe. Así `loading` y `error` recuperable se ven dentro de la pantalla.
  - `step2/3/confirmationGuard` cargan país y campos, y revalidan con `validateStep1`.
  - Un error de red en un guard redirige a `step-1`, donde se ve el error con "Reintentar".
  - `decideStepAccess` está completo salvo la lista de planes activos (`null` hasta US-02).
6. **Dependencias npm añadidas** (todas vía npm): `@playwright/test`, `@axe-core/playwright`, `angular-eslint`, `@fontsource/ibm-plex-sans`, `@types/node@22` (el test T4 lee `tokens.css` con `node:fs`).
7. `Dockerfile`, `.dockerignore` y `nginx/` **sin cambios**: el build produce `dist/frontend/browser` y la CSP de Nginx funciona con el bundle.

### Pendientes / riesgos
- **No verificado:**
  - `docker build` / Nginx real (se simuló la CSP con un servidor Node).
  - Postgres (E2E solo contra SQLite).
  - Pruebas T5 a T8 de la guía §8 (reflow 320 px, espaciado de texto, reduced-motion/forced-colors, tamaño de objetivo): no escritas. Sí están T1 (axe), T2 parcial (teclado Tab/Enter/Space/flechas), T3 y T4.
  - T9 (lector de pantalla) y la parte manual de R-01.21, AC-01.3 y AC-01.32 (cambio en vivo desde el admin de Strapi) quedan para HITL-3.
- **Para `@qa-reviewer`:** revisión estática de R-01.12 y R-01.27 (grep de literales: ver arriba). `ui-copy.es.ts` incluye 3 claves fuera del §7 de la guía (`title.progress`, `title.confirmation`, `title.countryNotFound`), derivadas de §3.3, y claves `config.*` extra (`dependent.invalid`, `pattern.invalidOption`, `malformed`).
- El título del documento durante `loading` usa el código en mayúsculas hasta que llega la lista de países del header.
- Un `console.warn` sin datos personales (solo `documentId`) se emite cuando negocio configura `min/max` en un `text` o `minLength/maxLength/pattern` en un tipo no `text` (GAP-01.12). El seed no lo dispara.
- Las pantallas de Paso 2, Paso 3 y confirmación son placeholders con h1 y guards. El stepper ya deriva "completado" del plan elegido (`selectedPlan`), listo para US-02.
- **Requiere HITL:** No (HITL-3 llegará tras las 3 historias; la prueba manual de cambio de configuración en vivo de US-01 debe quedar en su checklist).

---

## Verificación independiente del Orquestador
- `npm run lint` → `All files pass linting.`
- `npm test -- --watch=false` → `Test Files 23 passed (23)` · `Tests 216 passed (216)`.
- `npm run build -- --configuration production` → `Initial total 308.00 kB` · `Application bundle generation complete.`
- `node scripts/trace-check.mjs` → `3 specs · 167 IDs · 28 archivos de test` · OK.
- Greps `NgModule|*ngIf|*ngFor|: any|as any|localhost:1337` en `frontend/src` → 0. `Bearer|api_token` → 1 coincidencia, revisada: es un test que **afirma la ausencia** de `Bearer` en la URL (`strapi-queries.spec.ts:21`); el bundle `dist/` no contiene ninguna.
- **E2E reproducidos** contra stack real (Strapi 5.63 en producción + `ng serve` con proxy): `91 passed (1.6m)`.
