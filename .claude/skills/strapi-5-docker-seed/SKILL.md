---
name: strapi-5-docker-seed
description: Convenciones Strapi 5+ del proyecto - modelado multi-país amigable para negocio (componentes en vez de JSON crudo), semanticRole, invariantes con Document Service middlewares, seed idempotente no destructivo CO/CL, permisos mínimos del rol Public, bloqueo de borradores y BD SQLite/Postgres por entorno.
---

# Skill: Strapi 5, Seed Idempotente y Seguridad (CMS Engineer)

> **Fuente de verdad:** `docs/contracts/strapi-contracts.ts`. Los enums de los esquemas de esta sección deben coincidir **1:1** con `SEMANTIC_ROLES`, `FIELD_TYPES`, `FORM_SECTIONS`, `VALIDATOR_KEYS` y `CURRENCY_CODES`, y el rango de `priceAdjustmentPct` con `CITY_ADJUSTMENT_PCT`. Decisiones: `ADR-001` (modelo, invariantes) y `ADR-002` (seguridad, seed). Si esta skill y el contrato difieren, gana el contrato y el conflicto se reporta en el Handoff.

## 1. Modelo de contenido
Draft & Publish **activado** en `form-field` e `insurance-plan`; **desactivado** en `country`. Nada de campos JSON crudos: negocio edita con formularios.

**Componentes** (`src/components/<categoría>/<nombre>.json`):
- `form.field-option` (R-01.3, R-01.16, R-02.21):
  - `label`: string, requerido.
  - `value`: string, requerido.
  - `validationPattern`: string, opcional. Regex del campo dependiente cuando esta opción está elegida (p. ej. el número según CC/CE).
  - `validationMessage`: string, opcional.
  - `priceAdjustmentPct`: **integer, opcional, `min: -10`, `max: 30`**. Descripción en el admin: "Ajuste simulado de precio en % para esta ciudad; vacío = sin ajuste". Solo tiene efecto en opciones del campo con rol `city` (HITL-1, GAP-02.18).
- `form.validation` (R-01.6, R-01.11, R-01.29):
  - `min`, `max`: integer.
  - `minLength`, `maxLength`: integer, `min: 0`.
  - `pattern`: string.
  - `validatorKey`: enumeration `none | legal_age | vehicle_year_range | cl_rut | depends_on_option_pattern`, requerido, default `none`.
  - `dependsOnRole`: enumeration con los valores de `semanticRole` **sin** `none`, opcional.
- `plan.coverage`: `name` (string, requerido), `description` (text), `limit` (string, p. ej. "Hasta 100 SMMLV").
- `plan.benefit`: `text` (string, requerido).

**Collection types** (`src/api/<tipo>/content-types/<tipo>/schema.json`):
1. **`country`** (sin Draft & Publish):
   - `code`: string, único, requerido, regex `^[a-z]{2}$`.
   - `name`: string, requerido.
   - `currencyCode`: string, requerido, regex `^[A-Z]{3}$`.
   - `locale`: string, requerido, BCP 47 (p. ej. `es-CO`).
   - `legalAge`: integer, requerido, `min: 0`, default 18.
   - `vehicleMaxAgeYears`: integer, requerido, `min: 0`, default 20.
   - `vehicleMaxFutureYears`: integer, requerido, `min: 0`, default 1.
   - `termsTitle`: string, requerido.
   - `termsContent`: text largo, **texto plano**, párrafos separados por una línea en blanco, sin HTML ni Markdown.
   - `termsVersion`: string, requerido.
2. **`form-field`** (Draft & Publish):
   - `key`: string, requerido, regex `^[a-zA-Z][a-zA-Z0-9_]*$`. Solo para el DOM.
   - `semanticRole`: enumeration `none | full_name | document_type | document_number | birth_date | email | phone | city | vehicle_plate | vehicle_brand | vehicle_model | vehicle_year | vehicle_use`, requerido, default `none`.
   - `section`: enumeration `policyholder | vehicle`, requerido.
   - `label`: string, requerido.
   - `type`: enumeration `text | number | select | date | checkbox`, requerido.
   - `required`: boolean, default false.
   - `order`: integer, requerido, default 0.
   - `placeholder`: string. `helpText`: text.
   - `errorMessage`: string, requerido.
   - `validation`: componente único `form.validation`.
   - `options`: componente repetible `form.field-option`.
   - `country`: relation manyToOne → `country`, requerida.
3. **`insurance-plan`** (Draft & Publish):
   - `slug`: string, requerido.
   - `name`: string, requerido.
   - `shortDescription`: text.
   - `basePrice`: integer, requerido, `min: 0`, en la moneda del país.
   - **`currency`: enumeration `COP | CLP`, requerido** (HITL-1, GAP-02.1 Opción B).
   - `coverages`: repetible `plan.coverage`. `benefits`: repetible `plan.benefit`.
   - `order`: integer, requerido, default 0.
   - `isRecommended`: boolean, default false.
   - `isActive`: boolean, default true.
   - `country`: relation manyToOne → `country`, requerida.

**Invariantes entre documentos** (ADR-001 §4.7). Se implementan con **Document Service middlewares** (`strapi.documents.use(...)` en `register()`), **no** con lifecycles de BD (en Strapi 5 los lifecycles se disparan varias veces con Draft & Publish). Filtrar por `context.uid` y `context.action ∈ {create, update, publish}`. Lanzar `errors.ValidationError` de `@strapi/utils` para que el admin muestre el mensaje. Al comparar con otros documentos, excluir siempre el propio `documentId`.
- **I0.** `form-field` e `insurance-plan` tienen `country` asignado. No confiar solo en `required` de la relación.
- **I1.** En cada país, cada `semanticRole ≠ none` aparece a lo sumo en un `form-field`. Mensaje: "Ya existe un campo con el rol X en este país".
- **I2.** A lo sumo un `insurance-plan` con `isRecommended && isActive` por país.
- **I3.** `insurance-plan.currency === country.currencyCode`. Si la moneda del país no está en el enum, el mensaje dice "requiere ampliar el enum de moneda (cambio de esquema)".
- **I4.** En `country` (`update`), rechazar un cambio de `currencyCode` si existen planes del país (borrador o publicados) con otra `currency`. Mensaje: "Actualice primero la moneda de los planes".
- **I5.** `validation.validatorKey` compatible con `semanticRole`:
  - `legal_age` → `birth_date`;
  - `vehicle_year_range` → `vehicle_year`;
  - `cl_rut` → `document_number`;
  - `depends_on_option_pattern` exige `dependsOnRole`.
  - El front lo vuelve a validar (R-01.11).

## 2. Seed idempotente y no destructivo (`src/index.ts` → `bootstrap`)
- Solo Document Service API, p. ej. `strapi.documents('api::country.country').findFirst({ filters: { code } })` y `.create({ data, status: 'published' })`. Prohibido `entityService`. El seed pasa por los middlewares I0 a I5, así que no puede violarlos.
- **Clave lógica:** `code` | `country.code + key` | `country.code + slug`. Si existe, **no se toca** (respeta las ediciones de negocio). Se controla con `SEED_ON_BOOT=true|false`.
- **Datos ficticios** (regla 5; correos `@example.com`). Patrones y textos editables por negocio después.

**Países:**
- CO: `es-CO`, `COP`, 18/20/1.
- CL: `es-CL`, `CLP`, 18/20/1.
- T&C distintos por país, con al menos dos párrafos y `termsVersion` (p. ej. `2026-11`).

**Campos CO** (rol → configuración; `section` entre paréntesis):
| Rol (sección) | Tipo y requerido | Validación y opciones |
| :--- | :--- | :--- |
| `full_name` (policyholder) | text, req | — |
| `document_type` (policyholder) | select, req | Opciones `CC` con `validationPattern` `^[0-9]{6,10}$` y `CE` con `^[0-9]{6,7}$`, cada una con su `validationMessage` |
| `document_number` (policyholder) | text, req | `validatorKey = depends_on_option_pattern`, `dependsOnRole = document_type` |
| `birth_date` (policyholder) | date, req | `validatorKey = legal_age` |
| `email` (policyholder) | text, req | `maxLength 254`, `pattern` `^[A-Za-z0-9._%+-]{1,64}@([A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,24}$` |
| `phone` (policyholder) | text, **opcional** | — |
| `city` (policyholder) | select, req | Bogotá D.C. `+8`, Medellín `+5`, Cali `+3`, "Otra ciudad" sin atributo |
| `none` (policyholder) | checkbox, **req** | "Autorizo el tratamiento de mis datos (simulado)"; cubre AC-01.27 en E2E-S |
| `vehicle_plate` (vehicle) | text, req | `pattern` `^[A-Z]{3}[0-9]{2}[0-9A-Z]$` (auto `AAA123` y moto `AAA12A`, HITL-1). `helpText` y `errorMessage` mencionan ambos formatos |
| `vehicle_brand` (vehicle) | select, req | Incluye "Mazda" (AC-01.20, AC-03.22) |
| `vehicle_model` (vehicle) | text, opcional | — |
| `vehicle_year` (vehicle) | number, req | `validatorKey = vehicle_year_range` |
| `vehicle_use` (vehicle) | checkbox, opcional | "Uso particular" (AC-03.22) |

**Campos CL:**
- Igual que CO, **sin** `document_type`.
- `document_number` con etiqueta "RUT" y `validatorKey = cl_rut`.
- `vehicle_plate` con etiqueta "Patente" y `pattern` `^([A-Z]{4}[0-9]{2}|[A-Z]{2}[0-9]{4})$`.
- `city`: Santiago `+8`, Valparaíso `+4`, Concepción `+2`, Punta Arenas `-5`.

**Planes por país:**
- 3 activos (uno de ellos llamado "Plus"; 1 recomendado) + 1 inactivo.
- `currency` = `COP` en CO y `CLP` en CL.
- `basePrice` entero.
- Coberturas con `limit` y beneficios.

## 3. Seguridad (en `bootstrap` y `config/`, idempotente; ADR-002 §4.2)
- **Rol Public:** solo `api::country.country.find`, `api::form-field.form-field.find` y `api::insurance-plan.insurance-plan.find`. Hay que revocar:
  - cualquier otro `api::*` (incluidos `findOne`, `create`, `update` y `delete`);
  - **todo** `plugin::users-permissions.*` (auth, register, forgot/reset password, user, role);
  - todo `plugin::upload.*`.
- Fijar `users-permissions` `advanced.allow_register = false`.
- **Solo publicado:** middleware en las rutas `find` de `form-field` e `insurance-plan` que fija `status = 'published'` sobre cualquier valor recibido. Evita que `?status=draft` exponga borradores al rol Public.
- **API tokens:** no crear ninguno (ni lectura, ni escritura, ni *transfer*). Ningún token en ningún entorno (HITL-1).
- **Primer admin:** si existen `STRAPI_ADMIN_EMAIL` y `STRAPI_ADMIN_PASSWORD` y no hay admins, crear el super-admin en `bootstrap`. Si faltan en producción, `strapi.log.warn`.
- **CORS:** `strapi::cors` con `origin` = `PUBLIC_URL`.

## 4. Base de datos por entorno (`config/database.ts`)
- `DATABASE_CLIENT=sqlite` (default, `DATABASE_FILENAME`) para local y Docker.
- `DATABASE_CLIENT=postgres` + `DATABASE_URL` + `DATABASE_SSL=true` para la nube (Neon). Dependencia `pg` incluida. El CI corre también un job con Postgres (ADR-003).

## 5. Consultas que consume Angular (rutas relativas vía proxy; idénticas a `STRAPI_QUERIES` del contrato)
- **País:** `GET /api/countries?filters[code][$eq]=<code>`
- **Lista de países:** `GET /api/countries?fields[0]=code&fields[1]=name&sort=name:asc&pagination[pageSize]=100`
- **Campos:** `GET /api/form-fields?filters[country][code][$eq]=<code>&status=published&populate[validation]=true&populate[options]=true&sort[0]=order:asc&sort[1]=createdAt:asc&pagination[pageSize]=100`
- **Planes:** `GET /api/insurance-plans?filters[country][code][$eq]=<code>&filters[isActive][$eq]=true&status=published&populate[coverages]=true&populate[benefits]=true&sort[0]=order:asc&sort[1]=createdAt:asc&pagination[pageSize]=100`

Reglas de las consultas:
- **Prohibido `populate=*`**: trae relaciones innecesarias y oculta qué componentes se necesitan.
- `currency` es escalar y viaja sin `populate`.
- `priceAdjustmentPct` viaja dentro de `populate[options]`.
- `meta.pagination.total > 100` es `config-error` en el front.
