# Log 07 — @cms-engineer: Backend Strapi 5 (Fase 4a)

- **Fecha:** 2026-11-23 · **Subagente nativo** `cms-engineer` (sonnet) · **Duración:** ~13.9 min · 34 llamadas · en paralelo con `@devops-engineer`
- Prompt de despacho e informe final copiados **sin editar**.

## Prompt de despacho (literal)

```text
Fase 4a — Backend Strapi 5. Directorio del repo: /home/claude/cotizador-multipais

Entradas (rutas exactas; léelas antes de empezar):
1. /home/claude/cotizador-multipais/.claude/agents/cms-engineer.md (tu definición)
2. /home/claude/cotizador-multipais/.claude/skills/strapi-5-docker-seed/SKILL.md (fuente principal del modelo, invariantes, seed, permisos y queries)
3. /home/claude/cotizador-multipais/CLAUDE.md
4. /home/claude/cotizador-multipais/docs/contracts/strapi-contracts.ts (contrato congelado en HITL-2)
5. /home/claude/cotizador-multipais/docs/adrs/ADR-001-multi-country-strategy.md
6. /home/claude/cotizador-multipais/docs/adrs/ADR-002-docker-and-strapi-security.md
7. /home/claude/cotizador-multipais/docs/adrs/ADR-003-cicd-and-free-tier-deploy.md
8. /home/claude/cotizador-multipais/docs/hitl/HITL-1-specs.md y /home/claude/cotizador-multipais/docs/hitl/HITL-2-arquitectura.md
9. /home/claude/cotizador-multipais/docs/specs/SPEC-US-01.md, SPEC-US-02.md, SPEC-US-03.md (aprobadas; consulta las R-/AC- que afectan al seed y a la API)
10. /home/claude/cotizador-multipais/docker-compose.yml y /home/claude/cotizador-multipais/backend/Dockerfile (solo lectura: los mantiene @devops-engineer)

Tarea: crear el proyecto Strapi 5 (TypeScript, última 5.x) en /home/claude/cotizador-multipais/backend/ — hoy solo contiene Dockerfile y .dockerignore, que NO debes modificar — e implementar todo lo que la skill y los ADR-001/002 exigen:
- Scaffold no interactivo (p. ej. `npx create-strapi@latest` con flags de no-interacción, sin cuenta cloud, sin ejemplo, sin git init, sqlite). Si el scaffold no acepta un directorio no vacío, créalo en un temporal y mueve el contenido conservando Dockerfile y .dockerignore. Agrega la dependencia `pg`.
- Content-types y componentes exactos de la skill §1 (incluye currency en el plan, priceAdjustmentPct [-10,30] en form.field-option, semanticRole, validation como componente).
- Invariantes I0-I5 con Document Service middlewares (ADR-001), con errores legibles en el admin.
- Middleware que fuerza status=published en las rutas find públicas (ADR-002, riesgo 1).
- bootstrap idempotente: permisos Public = solo find en country, form-field, insurance-plan; revocar todo lo demás de Public (incl. users-permissions y upload); allow_register=false; admin inicial desde STRAPI_ADMIN_EMAIL/STRAPI_ADMIN_PASSWORD si ambas existen y no hay admins; seed CO/CL no destructivo controlado por SEED_ON_BOOT, con todos los datos de la skill y de las specs (email requerido, placa CO con moto, ciudades con priceAdjustmentPct, 3 planes activos con 1 recomendado + 1 inactivo por país, currency por plan, T&C ficticios distintos, al menos un checkbox requerido). Solo datos ficticios.
- config/database.ts (sqlite ↔ postgres por env, DATABASE_URL + DATABASE_SSL), config/server.ts (url = PUBLIC_URL, proxy true), CORS limitado.
- .gitignore de backend coherente (no subir .tmp, dist, .env, node_modules).

Verificación obligatoria (pega la salida literal en el Handoff, usa timeouts para no colgarte y detén Strapi al terminar):
a) `npm run build` en backend/.
b) Arranca Strapi (producción o develop) en segundo plano contra una BD sqlite temporal y comprueba con curl:
   - GET /api/countries?filters[code][$eq]=co y =cl → datos del país
   - GET /api/form-fields?... (query exacta de la skill §5) para co y cl → campos ordenados con semanticRole
   - GET /api/insurance-plans?... para co → solo activos, ordenados, con currency
   - GET ...&status=draft → no devuelve borradores
   - POST /api/form-fields sin token → 403/405
   - POST /api/auth/local/register → bloqueado
   - Reinicia Strapi y repite un GET: el seed NO se duplica (cuenta de registros igual).
c) No hagas git commit (lo hace el Orquestador).

Prohibido modificar frontend/, docker-compose.yml, backend/Dockerfile, .github/. Si necesitas cambios en ellos, descríbelos en Pendientes. Termina con el bloque Handoff de CLAUDE.md §6.
```

## Informe final del subagente (literal)

Backend Strapi 5.63.0 (TypeScript) creado en `/home/claude/cotizador-multipais/backend/`. `npm run build` pasa y todo lo verificado por curl y por el admin dio lo esperado. Dos desvíos del contrato/skill, dos riesgos para HITL-2b y tres pendientes (en Pendientes / riesgos). No toqué `Dockerfile` ni `.dockerignore` de backend, ni `frontend/`, `docker-compose.yml` ni `.github/`. Strapi está detenido y no hay `.tmp/` ni `.env` en el repo.

## Handoff
- **Agente:** @cms-engineer · **Fase:** 4a · **Entradas leídas:** `.claude/agents/cms-engineer.md`, `.claude/skills/strapi-5-docker-seed/SKILL.md`, `CLAUDE.md`, `docs/contracts/strapi-contracts.ts`, `docs/adrs/ADR-001..003`, `docs/hitl/HITL-1-specs.md` y `HITL-2-arquitectura.md`, `docker-compose.yml`, `backend/Dockerfile`.
  - Las specs `SPEC-US-01..03` no las leí completas: usé la skill y los ADR como fuente de seed y API. `ADR-003` solo lo leí en parte.

- **Archivos creados/modificados** (todo bajo `/home/claude/cotizador-multipais/backend/`):
  - `package.json` (con `pg`), `package-lock.json`, `tsconfig.json`, `.gitignore` y `.env.example`. El `.gitignore` excluye `.tmp`, `dist`, `.env*` (salvo `.env.example`), `node_modules` y `.strapi`.
  - `public/uploads/.gitkeep`.
  - `config/`: `database.ts`, `server.ts`, `middlewares.ts`.
  - `src/components/form/{field-option,validation}.json` y `src/components/plan/{coverage,benefit}.json`.
  - `src/api/{country,form-field,insurance-plan}/`: schema, controller, service y route de cada tipo. El controller de country mapea `localeCode` a `locale` (ver el primer desvío).
  - `src/middlewares/force-published.ts`.
  - `src/extensions/document-invariants.ts` (I0 a I5), `security.ts`, `seed-data.ts`, `seed.ts`.
  - `src/index.ts`: `register` con las invariantes; `bootstrap` con admin, `allow_register`, permisos, tokens y seed.
  - Archivos autogenerados que no hay que subir: `package-lock.json` sí; `dist/`, `.strapi/` y `.strapi-updater.json` no (ya están ignorados).

- **IDs cubiertos:** ADR-001 §4.7 (I0 a I5), ADR-002 §3.2 D1 y §4.2, ADR-002 §4.3 (seed); HITL-1 (sin tokens, email requerido, placa CO con moto, `currency` por plan, `priceAdjustmentPct` entre -10 y 30). No usé R-/AC- de las specs una a una; el seed cubre las condiciones que la skill cita para AC-01.27, AC-01.20, AC-03.22 y GAP-02.18.

- **Verificación ejecutada:** Strapi en producción (`NODE_ENV=production`, puerto 1338) contra SQLite temporal en `/tmp/sq/data.db`.
  - **a) Build.**
    - `npm run build` termina con `✔ Compiling TS`, `✔ Building build context` y `✔ Building admin panel`.
  - **b) Arranque limpio.**
    - El log de seguridad dice: `allow_register = false`, `Permisos Public: 3 concedidos, 8 revocados (solo find en 3 tipos)`, y los tokens por defecto "Read Only" y "Full Access" revocados.
    - El seed dice: `[seed] Creados: 2 paises, 25 campos, 8 planes`.
    - Con `STRAPI_ADMIN_EMAIL` y `STRAPI_ADMIN_PASSWORD` definidos: `Administrador inicial creado desde variables de entorno`.
    - Sin esas variables, no se crea admin y sale un `warn`.
  - **c) Países.**
    - `GET /api/countries?filters[code][$eq]=co` devuelve `code: co`, `name: Colombia`, `currencyCode: COP`, `legalAge: 18`, `vehicleMaxAgeYears: 20`, `vehicleMaxFutureYears: 1`, `termsVersion: 2026-11` y `termsContent` con 4 párrafos separados por `\n\n`.
    - Con `cl` devuelve `Chile`, `CLP`, `locale: es-CL` y T&C distintos.
    - La lista de países (`fields[0]=code&fields[1]=name&sort=name:asc`) devuelve `cl` y `co`, con `meta.pagination.total: 2`.
  - **d) Campos** (query exacta de la skill §5).
    - `co` devuelve 13 campos ordenados por `order`: `full_name`, `document_type`, `document_number`, `birth_date`, `email`, `phone`, `city`, `none` (checkbox requerido), `vehicle_plate`, `vehicle_brand`, `vehicle_model`, `vehicle_year`, `vehicle_use`.
    - `co`: `document_type` tiene opciones CC y CE, y `document_number` usa `depends_on_option_pattern`.
    - `co`: `city` tiene Bogotá +8, Medellín +5, Cali +3 y "Otra ciudad" sin ajuste.
    - `cl` devuelve 12 campos, sin `document_type`. `document_number` tiene `cl_rut` y `city` tiene Santiago +8, Valparaíso +4, Concepción +2 y Punta Arenas -5.
  - **e) Planes** (query exacta de la skill §5).
    - `co` devuelve 3 planes activos: `basico` 1200000 COP, `plus` 1850000 COP (recomendado) y `premium` 2600000 COP. Cada uno trae coberturas con `limit` y beneficios.
    - `cl` devuelve `basico` 250000 CLP, `plus` 380000 CLP (recomendado) y `premium` 520000 CLP.
    - El plan inactivo "Legado" no aparece en ninguno de los dos.
  - **f) Borradores.** `status=draft`, `status[]=draft` y `st%61tus=draft` devuelven solo filas con `publishedAt` no nulo (13 campos de `co`, 4 planes de `co` incluido el inactivo).
  - **g) Escritura anónima: `403` en todas.**
    - `POST /api/form-fields`, `POST /api/insurance-plans`, `PUT /api/countries/xyz` y `DELETE /api/form-fields/xyz`.
    - `GET /api/countries/<documentId>` (findOne), `POST /api/auth/local/register`, `POST /api/auth/local`, `POST /api/auth/forgot-password`, `GET /api/users` y `GET /api/upload/files`.
  - **h) Otras comprobaciones públicas.**
    - `populate[createdBy]=true` devuelve `400 Invalid key createdBy`.
    - Un `Origin` externo no recibe cabeceras `access-control-*`.
  - **i) Reinicio.**
    - Conteos en la BD antes: `countries 2, fields 50, plans 16, opts 40`; después: idénticos. Los 50 y 16 son borrador más publicado de 25 y 8 documentos.
    - Log del segundo arranque: `Permisos Public: 0 concedidos, 0 revocados` y `Seed: Creados: 0 paises, 0 campos, 0 planes`.
    - El GET sigue devolviendo 13 campos de `co` y 3 planes activos de `cl`.
  - **j) Invariantes** (creando y editando con el JWT del admin, vía content-manager; todas devuelven mensajes legibles).
    - I1: `Ya existe un campo con el rol email en este país`.
    - I0: `El campo debe tener un país asignado.`
    - I5: rechaza `legal_age` en un campo sin rol `birth_date`, y `depends_on_option_pattern` sin `dependsOnRole`.
    - I3: `La moneda del plan (CLP) debe coincidir con la moneda del país (COP).`
    - I2: `Ya existe un plan recomendado y activo en este país...`; también al editar un plan existente.
    - I4: `Actualice primero la moneda de los planes...`
    - Un plan válido se crea, se edita y se publica sin error.
    - `priceAdjustmentPct: 40` falla con `must be less than or equal to 30`.
    - Con el admin inicial creado, la lista de API tokens tiene 0 entradas.
  - **No verifiqué:** Postgres (el código existe pero no lo ejecuté), el build de la imagen Docker, ni la comparación mecánica de los enums del esquema con el contrato.

- **Pendientes / riesgos:**
  1. **Desvío del contrato: `locale` es un nombre reservado en Strapi 5.63.**
     - Con ese nombre el atributo se guarda, pero queda oculto en toda respuesta y `fields[]=locale` da 400.
     - Lo guardé como `localeCode` en el esquema de `country` y el controller (`src/api/country/controllers/country.ts`) lo expone como `locale`. El JSON público cumple `StrapiCountryDto`. Si algo filtra por `locale` en la query, no funcionaría; el contrato solo lo lee.
     - Pido que el Orquestador o `@architect` anoten esto en la skill y en ADR-001. `@qa-reviewer` debe saber que el atributo del esquema se llama `localeCode`.
  2. **Desvío de la skill: tokens por defecto.** Strapi crea solos los tokens "Read Only" y "Full Access". El bootstrap los revoca en cada arranque; si encuentra otro token, avisa con un `warn` y no lo borra.
  3. **Rutas por defecto.** Dejé las rutas por defecto de los tres tipos para que la escritura anónima dé `403` por permisos y no `404`, que es lo que pide el smoke de ADR-002 §6. El middleware `global::force-published` está solo en el `find` de `form-field` e `insurance-plan`.
  4. **Seed y borrados.** El seed trata como existente un campo con la misma `key` o el mismo `semanticRole` en ese país, para no chocar con I1 si negocio renombra una `key`. Consecuencia: si negocio borra un campo o plan a propósito, el siguiente arranque con `SEED_ON_BOOT=true` lo recrea. Sugiero poner `SEED_ON_BOOT=false` tras el primer despliegue en la nube; en `docker-compose.yml` el default es `true`.
  5. **Seguridad dependiente del código.** El middleware "solo publicado" depende de internals de Strapi (R3 del ADR-002); las versiones de Strapi quedaron fijadas en exacto (5.63.0) y el smoke de seguridad de CI debe correr contra esto. El rol Public se reconcilia en cada arranque: permisos que alguien otorgue a mano en el admin se revocan al reiniciar.
  6. **Para `@devops-engineer` (no modifiqué nada de ello).**
     - `docker-compose.yml` ya pasa lo necesario (`DATABASE_FILENAME` absoluto, `PUBLIC_URL`, `SEED_ON_BOOT`). Debe añadir `STRAPI_ADMIN_EMAIL` y `STRAPI_ADMIN_PASSWORD` (solo en nube, desde Secrets).
     - Para Postgres: `DATABASE_CLIENT=postgres`, `DATABASE_URL`, `DATABASE_SSL=true`. `config/database.ts` acepta `DATABASE_FILENAME` absoluto o relativo; con la versión original de Strapi la ruta absoluta de compose habría quedado mal.
     - El `Dockerfile` hace `npm ci`: el `package-lock.json` está en `backend/` y debe subirse al repo.
     - El healthcheck `/_health` funciona (204).
  7. **Postgres sin probar.** `pg` está en `package.json` y `database.ts` tiene la rama de Postgres, pero no la ejecuté. El job `e2e-postgres` de CI es quien debe validarlo.
  8. **Content-manager.** Los errores de invariantes salen como `ValidationError` por la API de content-manager (400); esa respuesta es la que muestra el admin. No abrí el panel en un navegador.

- **Requiere HITL:** No. Sí conviene que la revisión de HITL-2b incluya los permisos Public en el admin.

---

## Verificación del Orquestador (posterior al informe) — prueba de integración real
Strapi del agente en `NODE_ENV=production` (puerto 1339, SQLite temporal) detrás de la plantilla Nginx de `@devops-engineer` (renderizada con `STRAPI_UPSTREAM=http://127.0.0.1:1339`, puerto 8090), y `scripts/security-smoke.mjs` real:
- Arranque: `allow_register = false`, `Permisos Public: 3 concedidos, 8 revocados`, `[seed] Creados: 2 paises, 25 campos, 8 planes`.
- Smoke: **13 PASS, 4 FAIL, 2 SKIP**. Los 4 FAIL (punto 4) son un **falso positivo del smoke**, no del backend: la variante `publicationState=preview` (parámetro de Strapi 4) recibe `400 Invalid key publicationState` (rechazo seguro, sin datos) y el script exige 200; además su mensaje mostraba la variante equivocada. Las variantes `status=draft`, `st%61tus=draft`, `status[]=draft` → 200, total 13 = published, todos con `publishedAt`. Devuelto a `@devops-engineer` (log 06b).
- Hallazgo de integración: ninguno de los dos agentes podía detectarlo por separado (uno probó contra Strapi real sin el smoke, el otro probó el smoke contra un servidor simulado).
