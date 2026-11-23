# ADR-002: Entorno Docker de un solo comando y modelo de seguridad de Strapi

- **Estado:** Aceptado (HITL-2, 2026-11-23 — `docs/hitl/HITL-2-arquitectura.md`)
- **Fecha:** 2026-11-23 (revisión v2 de `@architect`, Fase 3; alineada con `docker-compose.yml` y `frontend/nginx/default.conf.template` ya implementados)
- **Decisores:** `@architect` (propuesta) → humano (HITL-2). Implementación: `@devops-engineer` (compose, Nginx) y `@cms-engineer` (permisos, middlewares, seed).
- **Trazabilidad:**
  - CLAUDE.md reglas 4, 5 y 6 y §7 (rutas relativas `/api`, 12-factor); `docs/hitl/HITL-1-specs.md` ("ningún token de escritura en ningún entorno").
  - Reglas: R-01.21, R-01.23, R-01.24, R-02.2, R-03.5, R-03.7, R-03.23.
  - Vacíos: GAP-01.14, GAP-01.15, GAP-02.9, GAP-03.3, GAP-03.14.
  - ADRs: `ADR-001` §4.8, `ADR-003`.

## 1. Contexto y problema
- **Arranque:** el sistema debe arrancar con `docker compose up --build` y con seed CO/CL.
- **Tokens (regla 4):** ningún token de Strapi llega al navegador, al bundle ni al repositorio, y el rol `Public` solo tiene `find` sobre `country`, `form-field` e `insurance-plan`.
- **Sin escritura (HITL-1):** prohíbe además cualquier token de escritura, también en CI y en el runner E2E.
- **Lo ya implementado (Fase 4 temprana):**
  - Strapi corre con `NODE_ENV=production` y BD elegida por `DATABASE_CLIENT`/`DATABASE_URL`.
  - Nginx solo proxea `/api/` con `GET|HEAD|OPTIONS`, borra `Authorization` y `Cookie` y nunca expone `/admin`.
  - Strapi publica `1337` al host solo para el admin local.

**Riesgos detectados en esta revisión que el borrador no cubría:**
1. **Borradores legibles por anónimos:** en Strapi 5, el parámetro `status=draft` de la API REST devuelve la versión borrador a cualquiera que tenga permiso `find`. No existe un permiso separado para borradores. Hay reportes públicos del problema ([issue strapi#12309](https://github.com/strapi/strapi/issues/12309), [ejemplo 1](https://github.com/Department-of-Motor-Traffic/dmt-site/issues/13), [ejemplo 2](https://github.com/LucaNerlich/m10z/issues/726), [ejemplo de corrección](https://github.com/WhyThatFunction/ssegning-com/pull/27); [doc `status`](https://docs.strapi.io/cms/api/rest/status)). Un campo o plan en borrador (trabajo en curso de negocio) sería público.
2. **Strapi expuesto directamente en la nube** (`https://cotizador-strapi.onrender.com`, ADR-003): las restricciones de método de Nginx **no** protegen esa URL. La única barrera allí son los permisos de Strapi.
3. **Rutas por defecto del plugin `users-permissions`** (`/api/auth/local/register`, `forgot-password`, ...) habilitadas para `Public`: violan "Public = solo 3 `find`" y permitirían crear usuarios en la URL directa.
4. **Primer administrador:** en una instancia nueva, la primera visita a `/admin` registra al super-admin. En la nube, cualquiera que llegue primero podría tomar el panel ([foro Strapi](https://forum.strapi.io/t/hard-code-the-strapi-administrator/1074)).

## 2. Drivers de decisión (priorizados)
1. **S1.** Cero tokens o secretos en el navegador, en el bundle y en el repo (regla 4). Cero tokens de escritura en cualquier entorno (HITL-1).
2. **S2.** Superficie pública mínima y **justificada permiso por permiso**. Ningún borrador es público.
3. **S3.** Un comando, arranque determinista, seed idempotente y no destructivo.
4. **S4.** Mismas imágenes en local, CI y nube. Solo cambian variables de entorno (12-factor, ADR-003).
5. **S5.** Sin CORS para el navegador: mismo origen vía proxy (CLAUDE §7).

## 3. Alternativas consideradas

### 3.1 Cómo accede el navegador al contenido
| Opción | Pros | Contras | Veredicto |
| :--- | :--- | :--- | :--- |
| **P1. Rol `Public` con `find` en 3 tipos + Nginx en el mismo origen (`/api/` → Strapi), solo GET/HEAD/OPTIONS, sin `Authorization` ni `Cookie`** | Ningún secreto en ningún lado. El contenido es público por naturaleza (formulario, planes, T&C). Sin CORS. Es lo que exige la regla 4. | La URL directa de Strapi también sirve el contenido (aceptable: es público). Depende de configurar bien los permisos (de ahí el smoke de §6). | **Elegida** |
| P2. Rol `Public` vacío + Nginx inyecta un token **de solo lectura** (`proxy_set_header Authorization "Bearer ${STRAPI_READ_TOKEN}"`) | El token no llega al navegador. La URL directa de Strapi no devuelve contenido sin token. `Public` queda en cero permisos. | Un secreto más que rotar, en el contenedor del frontend. **No aporta confidencialidad:** el proxy expone exactamente los mismos datos a cualquiera. Contradice la redacción de la regla 4 ("Public solo tiene `find` sobre…") y añade un token que HITL-1 pidió evitar. | Rechazada (sin beneficio real + choca con regla 4) |
| P3. BFF/SSR (Angular SSR o un Node intermedio que consulta Strapi) | Permite caché, agregación (1 petición por paso) y ocultar Strapi por completo. | Otro runtime Node en 512 MB (ADR-003). Más superficie, latencia y complejidad. Las specs fijan llamadas `/api/...` desde el navegador con `page.route` en E2E-M. | Rechazada (costo operativo sin requisito) |
| P4. Token (lectura o escritura) en `environment.ts` del SPA | Trivial de implementar. | Todo lo que va en el bundle es extraíble con DevTools. **Viola la regla 4 y HITL-1.** | Rechazada (viola requisito) |

### 3.2 Cómo se evita que `Public` lea borradores (`?status=draft`)
| Opción | Pros | Contras | Veredicto |
| :--- | :--- | :--- | :--- |
| **D1. Middleware global de Strapi sobre la API de contenido que fuerza `status=published`** (sobrescribe cualquier valor recibido) en las rutas `find` de `form-field` e `insurance-plan` | Protege tanto el proxy como la URL directa de Render. No depende de cómo se codifique la query (Strapi ya la parseó con `qs`). Es una pieza pequeña y testeable. | Código propio que mantener en upgrades de Strapi. Si en el futuro se necesita "preview" de borradores, habrá que usar una ruta autenticada distinta. | **Elegida** |
| D2. Regla Nginx que rechaza `status` en la query (`if ($arg_status ...)`) | No toca Strapi. | **Evadible:** `$arg_` compara el nombre crudo, por lo que `st%61tus=draft` o `status[]=draft` llegan a `qs`, que los decodifica. No cubre la URL directa de Strapi en la nube. | Rechazada como control, **aceptable** como defensa adicional opcional |
| D3. Desactivar Draft & Publish en `form-field` e `insurance-plan` | Elimina el problema de raíz. | Negocio pierde el flujo borrador → publicado que las specs asumen (R-01.2 "solo publicados", AC-01.19, AC-02.9). Todo cambio sería inmediato en producción. | Rechazada (viola specs) |

### 3.3 Base de datos por entorno
| Opción | Pros | Contras | Veredicto |
| :--- | :--- | :--- | :--- |
| **B1. SQLite en volumen `strapi_data` en local/CI; Postgres gestionado en la nube; mismo código, elegido por `DATABASE_CLIENT`** | Arranque local rápido, sin contenedor extra. La nube persiste las ediciones de negocio (ADR-003). Ya implementado en `docker-compose.yml`. | Paridad dev/prod imperfecta: SQL distinto (orden, comparación de texto, tipos). | **Elegida** |
| B2. Postgres también en compose (servicio `db`) | Paridad total con la nube. | Otro contenedor, más arranque y otro healthcheck. Más memoria en la máquina del evaluador. | Rechazada como default; **se usa como job de CI** (mitigación R1) |
| B3. SQLite en todos los entornos (disco persistente en la nube) | Un solo motor. | Disco persistente no gratuito en Render Free (ADR-003). Sin réplicas. | Rechazada |

### 3.4 Modo de ejecución de Strapi en Docker
| Opción | Pros | Contras | Veredicto |
| :--- | :--- | :--- | :--- |
| **M1. `NODE_ENV=production` + `strapi start` con admin precompilado en la imagen** | Misma imagen que la nube. Content-Type Builder **desactivado**: nadie altera el esquema (y con ello el contrato) desde el admin. Menos memoria. | Cambiar el esquema exige un PR y un build. Sin recarga en caliente. | **Elegida (ya implementada)** |
| M2. `strapi develop` en compose | Recarga en caliente. Content-Type Builder activo. | Imagen distinta a producción. Un evaluador podría editar el esquema y romper el contrato. | Rechazada para compose (válida para desarrollo fuera de Docker) |
| M3. Imagen dev para local + imagen prod para nube | Lo mejor de ambos. | Dos imágenes: viola S4. | Rechazada |

### 3.5 Seed
| Opción | Pros | Contras | Veredicto |
| :--- | :--- | :--- | :--- |
| **E1. `bootstrap` con Document Service API, idempotente y no destructivo (clave lógica `code`, `code+key`, `code+slug`), controlado por `SEED_ON_BOOT`** | Pasa por los mismos middlewares de invariantes (ADR-001 §4.7): el seed no puede violar I1 a I5. Respeta las ediciones de negocio. | Código de seed que mantener. | **Elegida** |
| E2. `strapi import` / `strapi transfer` de un archivo exportado | Herramienta oficial. | Sobrescribe (destructivo) o exige un token de transferencia (contra HITL-1). Archivo binario poco revisable. | Rechazada |
| E3. Dump SQL | Rápido. | Atado al motor (SQLite ≠ Postgres). Se salta las validaciones de Strapi. | Rechazada |

## 4. Decisión

### 4.1 Topología (ya implementada; se ratifica)
- `strapi` (imagen `backend`, `NODE_ENV=production`, healthcheck `/_health`, volumen `strapi_data`).
- `frontend` (Nginx, puerto 8080 → host 4200, espera a `strapi` saludable, sin secretos, solo `STRAPI_UPSTREAM`).
- Nginx:
  - `location /api/` con `limit_except GET HEAD OPTIONS { deny all; }`.
  - `proxy_set_header Authorization ""` y `Cookie ""`.
  - Sin `location /admin`.
  - CSP `default-src 'self'` con `connect-src 'self'`: el navegador solo puede llamar a su mismo origen, lo que refuerza R-01.23.

### 4.2 Permisos y controles de Strapi (para `@cms-engineer`, idempotente en `bootstrap`)
**Rol `Public`: justificación permiso por permiso (S2).** Cada permiso existe porque una regla lo necesita. Nada más.

| Permiso | Lo consume | Por qué no basta menos |
| :--- | :--- | :--- |
| `api::country.country.find` | R-01.1 (resolver país, `/country-not-found` con lista), R-01.15 (edad y rango), R-02.5 (`locale`, `currencyCode`), R-02.19 (aserción de moneda), R-03.7 (T&C). También lo exige el filtro por relación `filters[country][code][$eq]` de las otras dos queries. | Sin él no hay país, ni parámetros, ni T&C. `findOne` no se usa: el front filtra por `code`, no por `documentId`. |
| `api::form-field.form-field.find` | R-01.2 a R-01.31 (formulario del Paso 1), R-02.21 (opción de `city` y `priceAdjustmentPct`), R-03.2 (resumen). | Es la única fuente del formulario. Sin `findOne`: siempre se pide la lista filtrada por país. |
| `api::insurance-plan.insurance-plan.find` | R-02.3 a R-02.19 (planes), R-03.1 y R-03.6 (guard y precio del Paso 3). | Igual que el anterior. |

**Denegado explícitamente** (el `bootstrap` revoca y el smoke lo comprueba):
- `findOne`, `create`, `update`, `delete` de los tres tipos.
- Cualquier otro `api::*`.
- **Todas** las acciones de `plugin::users-permissions.*` para `Public` (`auth.register`, `auth.callback`, `auth.forgotPassword`, `auth.resetPassword`, `auth.emailConfirmation`, `auth.sendEmailConfirmation`, `auth.connect`, `user.*`, `role.*`), y además `advanced.allow_register = false`.
- `plugin::upload.*` para `Public`.

**API tokens:** no se crea **ninguno** (ni de lectura ni de escritura; tampoco *transfer tokens*). Ningún componente del sistema los necesita. La lista *Settings → API Tokens* vacía es un ítem del checklist de HITL-4.

**Middleware "solo publicado"** (§3.2 D1):
- En las rutas `find` de `form-field` e `insurance-plan`, el servidor fija `status=published` sobre lo que llegue.
- `country` no tiene Draft & Publish, por lo que no aplica.
- El front igualmente envía `status=published` (contrato, `STRAPI_QUERIES`).

**Primer administrador:**
- Si existen `STRAPI_ADMIN_EMAIL` y `STRAPI_ADMIN_PASSWORD` (Render Secrets, nunca en el repo) y no hay ningún admin, el `bootstrap` crea el super-admin. Así la pantalla de registro nunca queda abierta en la nube.
- En local se registra a mano en `http://localhost:1337/admin` con credenciales ficticias (regla 5).
- Si las variables faltan en la nube, el `bootstrap` registra un `warn` y el checklist de HITL-4 exige registrar el admin **antes** de publicar la URL.

**CORS de Strapi:** `strapi::cors` con `origin` limitado a `PUBLIC_URL` (el propio admin). El navegador del cotizador nunca hace llamadas cross-origin a Strapi (S5).

**Secretos** (`APP_KEYS`, `API_TOKEN_SALT`, `ADMIN_JWT_SECRET`, `TRANSFER_TOKEN_SALT`, `JWT_SECRET`, `ENCRYPTION_KEY`, credenciales de BD y del admin):
- En local: valores **ficticios** por defecto en compose (solo dev), sobrescribibles por un `.env` ignorado.
- En la nube: Render Secrets y GitHub Secrets.
- Nunca en el bundle ni en la imagen del frontend.

### 4.3 Seed (para `@cms-engineer`)
- E1 con los datos definidos en la skill `strapi-5-docker-seed` §2: correo requerido, patrón de placa CO con moto, ciudades con `priceAdjustmentPct`, `currency` por plan, CC/CE y RUT.
- Todos los datos son ficticios (dominio `example.com`, regla 5).

## 5. Consecuencias

### 5.1 Positivas
- No hay ningún token que filtrar: el riesgo de fuga de credenciales del navegador es nulo por diseño (S1).
- Defensa en capas para la escritura:
  - Nginx rechaza métodos distintos de lectura.
  - Strapi rechaza por permisos (y es la única barrera en la URL directa).
  - No existe ningún token que pudiera saltarse ambas.
- Borradores protegidos aunque el atacante evite el proxy.
- `docker compose up --build` con imágenes idénticas a las de la nube.

### 5.2 Negativas, mitigación y verificación
| # | Consecuencia | Mitigación | Cómo se verifica |
| :--- | :--- | :--- | :--- |
| R1 | SQLite local ≠ Postgres nube (orden por `createdAt`, comparación de texto en `filters[code][$eq]`). | Códigos siempre en minúsculas (regex del esquema `^[a-z]{2}$` y `normalizeCountryCode` en el front). Job de CI con servicio `postgres` que corre el smoke y el E2E-S (ADR-003). | Job `e2e-postgres` en verde. |
| R2 | La URL directa de Strapi en la nube sirve el contenido público y el admin. | El contenido es público por diseño. El admin está protegido por login + super-admin creado por `bootstrap`. Opcional: MFA si el plan de Strapi lo ofrece (fuera de alcance). | Smoke de §6 contra la URL directa. Checklist HITL-4. |
| R3 | El middleware "solo publicado" depende de internals de Strapi (`ctx.query`) y puede romperse en un upgrade. | Fijar la versión menor de Strapi en `package.json`. El smoke de seguridad corre en cada CI y detecta la regresión. | Paso `security-smoke` (§6, punto 4). |
| R4 | `NODE_ENV=production` en compose: no se edita el esquema desde el admin. | Es intencional (protege el contrato). Los cambios de esquema van por PR (ADR-001 N3). | N/A |
| R5 | Puerto `1337` publicado en el host en local. | Solo local. En Render el frontend es otro servicio. Documentado en compose. | Revisión de `docker-compose.yml` en REVIEW. |
| R6 | Credenciales ficticias por defecto en compose. | Son valores de desarrollo obviamente ficticios. La nube **exige** Secrets: el CD falla si faltan (ADR-003). gitleaks las tiene en allowlist **solo** en `docker-compose.yml`. | Job `governance` (gitleaks). |
| R7 | Un `?populate=` arbitrario del atacante podría intentar traer relaciones privadas (`createdBy`). | Strapi sanea la query según permisos y atributos privados. `country` es el único tipo relacionado y ya es público. | Smoke: `GET /api/form-fields?populate[createdBy]=true` no devuelve `createdBy`. |

## 6. Cómo se verifica (smoke de seguridad, ejecutable sin token)
Script de CI (`@devops-engineer`, p. ej. `scripts/security-smoke.mjs`) contra **el proxy** (`http://localhost:4200`) y contra **Strapi directo** (`http://localhost:1337`). En la nube, contra ambas URLs de Render (ADR-003 CD).

| # | Petición | Resultado esperado |
| :--- | :--- | :--- |
| 1 | `GET /api/countries?filters[code][$eq]=co` sin cabeceras | 200, `data.length === 1` |
| 2 | `POST /api/form-fields` vía proxy | 403 (Nginx `deny`) |
| 3 | `POST /api/form-fields` directo a Strapi | 403 (permisos) |
| 4 | `GET /api/form-fields?status=draft&filters[country][code][$eq]=co` y la variante `st%61tus=draft` | Todos los elementos con `publishedAt !== null`, mismo `total` que con `status=published` |
| 5 | `GET /api/form-fields/<documentId>` | 403 o 404 (sin `findOne`) |
| 6 | `POST /api/auth/local/register` directo | 403 o 400 con registro deshabilitado; ningún usuario creado |
| 7 | `GET /admin` vía proxy del frontend | Sirve `index.html` del SPA (no el admin de Strapi) |
| 8 | `GET /api/users-permissions/roles` directo | 403 |
| 9 | Bundle `frontend/dist/**` | grep sin coincidencias de `Bearer`, `api_token`, `STRAPI_.*TOKEN`, `Authorization` |
| 10 | Repo | gitleaks sin hallazgos |

Además, en E2E (R-01.23): inspección de peticiones del navegador sin cabecera `Authorization` y siempre con rutas relativas `/api/...`.

## 7. Fuentes (consultadas 2026-11-23)
- Strapi 5, parámetro `status` de la API REST: https://docs.strapi.io/cms/api/rest/status
- Draft & Publish: https://docs.strapi.io/cms/features/draft-and-publish
- Permisos separados para borradores (no existen; solicitud abierta): https://github.com/strapi/strapi/issues/12309
- Reportes de borradores legibles por anónimos con `?status=draft` en Strapi 5: https://github.com/Department-of-Motor-Traffic/dmt-site/issues/13 · https://github.com/LucaNerlich/m10z/issues/726 · https://github.com/WhyThatFunction/ssegning-com/pull/27
- Endurecimiento de roles y registro público (referencia de comunidad): https://github.com/richard2701/suyai-back/issues/60 · https://strapi.io/blog/strapi-api-403-forbidden
- Configuración del admin: https://docs.strapi.io/cms/configurations/admin-panel
- Creación del administrador por código (foro): https://forum.strapi.io/t/hard-code-the-strapi-administrator/1074
- Configuración de la API REST (límites): https://docs.strapi.io/cms/configurations/api
