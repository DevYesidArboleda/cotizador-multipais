# Log 05 — @architect: ADRs MADR, contrato TS y skill Strapi (Fase 3)

- **Fecha:** 2026-11-23 · **Subagente nativo** `architect` (modelo opus, herramientas Read/Write/Edit/Glob/Grep/WebSearch) · **Duración:** ~10.8 min · 31 llamadas · en paralelo con `@ui-ux-designer`
- Prompt de despacho e informe final copiados **sin editar**.

## Prompt de despacho (literal)

```text
Fase 3 — Arquitectura. Directorio: /home/claude/cotizador-multipais

Sigue tu definición (.claude/agents/architect.md) y la skill /home/claude/cotizador-multipais/.claude/skills/software-architecture-madr/SKILL.md.

Entradas (rutas exactas, léelas todas):
- /home/claude/cotizador-multipais/CLAUDE.md
- /home/claude/cotizador-multipais/docs/specs/SPEC-US-01.md (v3, Aprobado)
- /home/claude/cotizador-multipais/docs/specs/SPEC-US-02.md (v3, Aprobado)
- /home/claude/cotizador-multipais/docs/specs/SPEC-US-03.md (v3, Aprobado)
- /home/claude/cotizador-multipais/docs/hitl/HITL-1-specs.md (decisiones humanas vinculantes)
- /home/claude/cotizador-multipais/docs/adrs/ADR-001-multi-country-strategy.md
- /home/claude/cotizador-multipais/docs/adrs/ADR-002-docker-and-strapi-security.md
- /home/claude/cotizador-multipais/docs/adrs/ADR-003-cicd-and-free-tier-deploy.md
- /home/claude/cotizador-multipais/.claude/skills/strapi-5-docker-seed/SKILL.md
- /home/claude/cotizador-multipais/docker-compose.yml
- /home/claude/cotizador-multipais/frontend/nginx/default.conf.template
- /home/claude/cotizador-multipais/docs/logs/03-spec-analyst-specs-v3.md (sección (b): conflictos que te tocan: puntos 3, 4, 6, 7)

Tareas:
1. Revisa y actualiza ADR-001, ADR-002 y ADR-003 para que sean coherentes con las specs v3 aprobadas y con lo ya implementado (compose con NODE_ENV=production, Nginx que solo proxea /api con GET/HEAD/OPTIONS, Postgres por env). Cada ADR: formato MADR de la skill, ≥3 alternativas reales con pros/contras, consecuencias con mitigación y "cómo se verifica", trazabilidad a R-/AC-/GAP- concretos, y Fuentes. Usa WebSearch para verificar afirmaciones sobre Strapi 5 (Document Service API, REST: status/populate/paginación por defecto, lifecycles en Strapi 5) y cítalas. En ADR-001 incorpora: semanticRole, componentes en lugar de JSON, currency en el plan validada contra el país (HITL-1, opción B), priceAdjustmentPct por ciudad, parámetros de reglas en Country, y la limitación del enum COP/CLP. Estado de los tres: "Propuesto (pendiente HITL-2)".
2. Crea /home/claude/cotizador-multipais/docs/contracts/strapi-contracts.ts: tipos crudos Strapi 5 (DTOs con id y documentId, respuesta {data, meta.pagination}), modelos de dominio, enums SemanticRole / ValidatorKey / FieldType / FormSection / CurrencyCode, QuoteState persistido, PaymentResult, y firmas (solo declaraciones `export declare function`, sin implementación) de los mappers y funciones puras que las specs nombran (validateStep1, calculateAdjustedPrice, maskDocumentNumber, generateQuoteNumber, assertPlanCurrency, getFieldByRole...). Comenta cada tipo con los IDs R-/AC- que lo motivan. Debe compilar con TypeScript strict sin `any`.
3. Actualiza /home/claude/cotizador-multipais/.claude/skills/strapi-5-docker-seed/SKILL.md (§1 modelo y §5 queries) para que coincida exactamente con el contrato (currency en el plan, priceAdjustmentPct [-10,30] en form.field-option, email, patrón placa CO, queries con populate explícito, status=published, pageSize=100). Es la fuente que usará @cms-engineer.

No escribas código de aplicación en frontend/ ni backend/. Responde con un resumen de decisiones y el bloque Handoff de CLAUDE.md §6.
```

## Informe final del subagente (literal)

Terminé la Fase 3. Reescribí los tres ADRs al formato MADR, creé el contrato `docs/contracts/strapi-contracts.ts` y alineé la skill de Strapi con él. El contrato no está compilado: no tengo Bash, así que no corrí `tsc --strict` ni `trace-check`. Los tres ADRs quedan en "Propuesto (pendiente HITL-2)".

## Lo que decidí

**ADR-001 (multi-país):**
- **Modelo:** se mantiene `country` con `form-field` e `insurance-plan` relacionados, y componentes en lugar de JSON.
- **Alternativas evaluadas:** i18n, un documento agregado por país, JSON en `country` y dos builds.
  - El documento agregado se descarta porque los componentes no tienen `documentId` ni borrador/publicado propio. Eso rompe la persistencia por `documentId` (R-01.9, R-02.12) y la despublicación de un solo campo (AC-01.19).
  - Los dos builds se descartan por el requisito explícito de un solo build.
- **Incorpora:** `semanticRole` como enum con tablas de roles requeridos y tipos; parámetros de reglas en `country`.
- **Moneda (decidida en HITL-1, opción B):** `currency` en el plan, validada contra el país.
- **Limitación del enum COP/CLP:** queda documentada como consecuencia N3, con mitigación y prueba en HITL-3.
- **Ajuste por ciudad:** `priceAdjustmentPct` en la opción de ciudad, rango [-10, 30].
- **Cambio de mecanismo (sin cambio de comportamiento):** las specs dicen "lifecycle", pero en Strapi 5 los [lifecycle hooks se disparan distinto con el Document Service](https://docs.strapi.io/cms/migration/v4-to-v5/breaking-changes/lifecycle-hooks-document-service) y Strapi [recomienda los Document Service middlewares](https://docs.strapi.io/cms/api/document-service/middlewares.md). Definí cinco reglas de integridad (I1 a I5).
  - La I4 cierra el conflicto 7 del log: rechaza cambiar la moneda del país si hay planes con otra moneda.
- **Formato REST de Strapi 5:** [respuesta plana con `documentId`](https://docs.strapi.io/cms/migration/v4-to-v5/breaking-changes/new-response-format), [`populate` explícito](https://docs.strapi.io/cms/api/rest/populate-select), [paginación de 25 por defecto con máximo de 100](https://docs.strapi.io/cms/api/rest/sort-pagination) y [parámetro `status`](https://docs.strapi.io/cms/api/rest/status).

**ADR-002 (Docker y seguridad).** Ratifica lo ya implementado: compose con `NODE_ENV=production` y un Nginx que solo deja pasar GET/HEAD/OPTIONS en `/api` y borra `Authorization` y `Cookie`. Justifica cada uno de los tres permisos `find` de Public con las reglas que lo necesitan. Además encontré cuatro riesgos que el borrador no cubría:
1. **Borradores visibles para anónimos.** Con `?status=draft`, cualquiera con permiso `find` lee borradores; no existe un permiso aparte ([strapi#12309](https://github.com/strapi/strapi/issues/12309), [un reporte](https://github.com/Department-of-Motor-Traffic/dmt-site/issues/13), [otro](https://github.com/LucaNerlich/m10z/issues/726)). Decido un middleware en Strapi que fuerza `published`. Una regla en Nginx se evade codificando el parámetro y no protege la URL directa de Strapi.
2. **URL directa de Strapi en Render:** las restricciones de método de Nginx no la protegen; ahí la única barrera son los permisos de Strapi.
3. **Rutas `users-permissions` abiertas a Public** (registro de usuarios, reseteo de contraseña): se revocan y se fija `allow_register=false`.
4. **Primer administrador:** en una instancia nueva, quien entre primero a `/admin` toma el panel. Se crea en `bootstrap` desde `STRAPI_ADMIN_EMAIL`/`STRAPI_ADMIN_PASSWORD` guardados en Render Secrets.

Incluye un smoke de seguridad de 10 puntos que corre sin token, contra el proxy y contra Strapi directo.

**ADR-003 (CI/CD y despliegue gratuito):**
- **Jobs de CI nuevos:**
  - `tsc --strict` sobre el contrato;
  - `e2e-postgres`, porque SQLite local y Postgres en la nube se comportan distinto;
  - el smoke de seguridad, también después de cada deploy.
- **Consecuencia K1:** tras una suspensión de Render, la primera carga choca con el timeout de 10 s que exige la spec y el usuario ve el estado de error con "Reintentar". No subí el timeout porque cambiaría una regla aprobada.
- **Límites de Render y Neon:** la búsqueda solo devolvió URLs oficiales, sin texto. Las cifras (15 min, 512 MB, almacenamiento de Neon) vienen del borrador y quedan para reverificar en HITL-4.

**Contrato:** separa los tipos crudos de Strapi de los modelos de dominio. Incluye los enums con sus tablas de roles y tipos, `QuoteState`, `PaymentResult`, estados de vista y 40 firmas `export declare`. No incluye a propósito patrones, ciudades, 18/20/1 ni `key`, porque el front lo copia tal cual y eso violaría R-01.15, R-01.31 y R-02.21.

**Skill §1, §2, §3 y §5:** ahora coincide con el contrato en `currency`, `priceAdjustmentPct` [-10, 30], el correo con su patrón, la placa CO con moto, las ciudades semilla, I0 a I5 y las queries exactas sin `populate=*`. También toqué §2 y §3, que no estaban pedidas: el seed y la seguridad debían reflejar los ADRs.

## Handoff
- **Agente:** @architect · **Fase:** 3 · **Entradas leídas:**
  - `/home/claude/cotizador-multipais/CLAUDE.md`
  - `/home/claude/cotizador-multipais/.claude/agents/architect.md`
  - `/home/claude/cotizador-multipais/.claude/skills/software-architecture-madr/SKILL.md`
  - `/home/claude/cotizador-multipais/docs/specs/SPEC-US-01.md`, `SPEC-US-02.md`, `SPEC-US-03.md`
  - `/home/claude/cotizador-multipais/docs/hitl/HITL-1-specs.md`
  - `/home/claude/cotizador-multipais/docs/adrs/ADR-001-multi-country-strategy.md`, `ADR-002-docker-and-strapi-security.md`, `ADR-003-cicd-and-free-tier-deploy.md`
  - `/home/claude/cotizador-multipais/.claude/skills/strapi-5-docker-seed/SKILL.md`
  - `/home/claude/cotizador-multipais/docker-compose.yml`
  - `/home/claude/cotizador-multipais/frontend/nginx/default.conf.template`
  - `/home/claude/cotizador-multipais/docs/logs/03-spec-analyst-specs-v3.md`
- **Archivos creados/modificados:**
  - `/home/claude/cotizador-multipais/docs/adrs/ADR-001-multi-country-strategy.md` (reescrito)
  - `/home/claude/cotizador-multipais/docs/adrs/ADR-002-docker-and-strapi-security.md` (reescrito)
  - `/home/claude/cotizador-multipais/docs/adrs/ADR-003-cicd-and-free-tier-deploy.md` (revisado)
  - `/home/claude/cotizador-multipais/docs/contracts/strapi-contracts.ts` (nuevo)
  - `/home/claude/cotizador-multipais/.claude/skills/strapi-5-docker-seed/SKILL.md` (§1, §2, §3 y §5)
- **IDs cubiertos:**
  - **GAP:** GAP-01.1, 01.2, 01.3, 01.11, 01.14, 01.18, 01.20, 01.21, 01.22; GAP-02.1, 02.2, 02.9, 02.18, 02.19; GAP-03.3.
  - **R-01:** R-01.1, 01.2, 01.8 a 01.16, 01.18, 01.19, 01.21 a 01.24, 01.28 a 01.31.
  - **R-02:** R-02.1 a 02.8, 02.10, 02.11, 02.13 a 02.15, 02.19, 02.21 a 02.24.
  - **R-03:** R-03.1 a 03.5, 03.7, 03.9 a 03.14, 03.18, 03.21, 03.23 a 03.25.
  - **AC:** AC-01.3, 01.5, 01.27, 01.32, AC-02.19, 02.21, 02.24, 02.26 y AC-03.16 (cubiertos en los ADRs o en el contrato), más los AC que cada R anterior ya enlaza en las specs.
  - **Conflictos 3, 4, 6 y 7** del log 03.
- **Verificación ejecutada:** N/A, agente sin Bash.
  - No ejecuté `tsc --strict` ni `node scripts/trace-check.mjs`. Revisé a mano que solo use tipos, `as const satisfies` (TS ≥ 5.0) y `export declare function`, sin `any`.
  - Corregí a mano una cita errónea en el contrato (R-01.12 en lugar de GAP-01.12).
  - Las WebSearch devolvieron URLs oficiales sin el texto de las páginas: las afirmaciones van citadas por URL.
- **Pendientes / riesgos:**
  1. **Refinamientos del contrato respecto al §4 de las specs, para que HITL-2 los acepte explícitamente:**
     - `Step1Value = string | boolean | null` (sin `number`), para validar `"2020.5"` y `"1e3"` como texto, según R-01.14.
     - `CityAdjustmentResult`, `Step3State` y los demás `config-error` llevan un error tipado con código y parámetros en lugar de un `message: string`; el texto sale del catálogo (R-01.27).
     - `formatPrice` devuelve un resultado (ok o `config-error`) en lugar de `string`, por GAP-02.11.
     - `calculateAdjustedPrice(input): number` queda como aritmética pura; la validación por rol pasa a `resolvePricingFactors`, por R-02.8.
  2. **"Lifecycle" de las specs:** se implementa con Document Service middleware. Mismo comportamiento, distinto mecanismo.
  3. **Para @cms-engineer**, lo nuevo que no tenía la skill:
     - middleware que fuerza `published` en las rutas `find`;
     - revocar `users-permissions` y `upload` para Public;
     - admin creado en `bootstrap` desde variables de entorno;
     - CORS limitado al `PUBLIC_URL`;
     - un checkbox requerido en el seed (si no existe, AC-01.27 no puede ser E2E-S);
     - patrón de patente CL propuesto `^([A-Z]{4}[0-9]{2}|[A-Z]{2}[0-9]{4})$`.
  4. **Para @devops-engineer:**
     - job `e2e-postgres`;
     - `tsc` del contrato en `governance`;
     - `scripts/security-smoke.mjs` en CI y después de cada deploy;
     - allowlist de gitleaks limitada a `docker-compose.yml`;
     - secrets `STRAPI_ADMIN_*` en Render.
  5. **Límites de Render y Neon:** no los pude leer; se reverifican en HITL-4 (K5).
  6. **Arranque en frío de Render frente al timeout de 10 s:** el primer usuario tras una suspensión ve "Reintentar" (K1). Si el humano no lo acepta, es un cambio de spec.
  7. **Enum COP/CLP:** un país con otra moneda requiere cambiar el esquema y desplegar el backend (N3, aceptado en HITL-1).
- **Requiere HITL:** Sí (HITL-2). Hay que aprobar ADR-001, ADR-002, ADR-003, el contrato y los refinamientos del punto 1.

---

## Verificación del Orquestador (posterior al informe)
- `npx tsc@5.9.3 --strict --noEmit --exactOptionalPropertyTypes --noUncheckedIndexedAccess docs/contracts/strapi-contracts.ts` → **exit 0** (878 líneas; las 2 apariciones de "any" están en comentarios).
- ADRs: 3, 6 y 4 secciones de alternativas; estado `Propuesto (pendiente HITL-2)` en los tres.
- `git status`: cambios solo en `docs/adrs/`, `docs/contracts/` y la skill `strapi-5-docker-seed` (alcance pedido; §2 y §3 de la skill tocadas por iniciativa del agente y declaradas en su informe).
- `trace-check` → OK.
- Las cifras de Render/Neon del ADR-003 fueron verificadas por el Orquestador en la Fase 1 con búsqueda web (ver log 00); el agente no pudo leer el texto de las páginas.
