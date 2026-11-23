# ADR-003: CI/CD con GitHub Actions y despliegue en capa gratuita (Render + Neon)

- **Estado:** Propuesto (pendiente HITL-2)
- **Fecha:** 2026-11-23 (revisión v2 de `@architect`, Fase 3)
- **Decisores:** Orquestador (borrador) → `@architect` (revisión) → humano (HITL-2). Implementación: `@devops-engineer`.
- **Trazabilidad:**
  - Requisitos técnicos *Environment* y *Security*; requerimiento del usuario "desplegar en una app gratuita" e "implementar DevOps".
  - CLAUDE.md §2, regla 4, regla 8 (`trace-check` falla CI) y §7 (12-factor).
  - `docs/hitl/HITL-1-specs.md`: E2E de mutación con mocks + prueba manual en vivo; ningún token de escritura en ningún entorno.
  - Reglas y criterios: R-01.21, R-01.23, R-02.24, AC-01.3, AC-01.32, AC-02.19, AC-02.26 (verificación Manual-HITL3 en vivo, que exige BD persistente); GAP-01.15 (timeout de 10 s frente al arranque en frío).
  - ADRs: `ADR-001`, `ADR-002` (smoke de seguridad).

## 1. Contexto y problema
El proyecto debe:
1. Arrancar en local con un solo comando (ADR-002).
2. Publicarse en una plataforma **gratuita** para que el evaluador lo use sin instalar nada.
3. Tener **puertas automáticas** que impidan integrar código sin trazabilidad, con tests rojos, con secretos o con permisos públicos abiertos.

Restricciones reales:
- Strapi necesita BD persistente. En contenedores de disco efímero, SQLite pierde las ediciones de negocio, y la prueba en vivo "cambio sin deploy" (AC-01.3, AC-02.19, AC-02.26 en HITL-3) dejaría de ser demostrable tras una suspensión.
- Compilar el admin de Strapi consume mucha memoria. Los planes gratuitos dan poca RAM.
- El navegador no recibe tokens (ADR-002): el frontend sigue llamando a `/api` en su mismo origen (R-01.23).
- El front tiene un **timeout de 10 s** por petición (R-01.23, GAP-01.15), mientras que un servicio gratuito suspendido tarda del orden de un minuto en despertar.

## 2. Drivers de decisión (priorizados)
1. **C1.** Costo $0 y sin tarjeta para el evaluador.
2. **C2.** **Las mismas imágenes** en local, CI y nube.
3. **C3.** Puertas de calidad automáticas alineadas con SDD (trazabilidad, tests, secretos, permisos).
4. **C4.** Persistencia de las ediciones de negocio en la nube (demos de HITL-3).
5. **C5.** Simplicidad operativa para una persona.

## 3. Alternativas consideradas

### A. Hosting de la aplicación
| Opción | Pros | Contras |
| :--- | :--- | :--- |
| **A1. Render web services *image-backed* (Free) + imágenes de GHCR** *(elegida)* | Gratis. Despliega imágenes ya construidas: Render no compila, así que no sufre por RAM en el build. Deploy hooks con `imgURL` para desplegar un tag inmutable. TLS automático. Blueprint `render.yaml` versionado. | Se suspende tras 15 min sin tráfico y tarda en despertar. Disco efímero. RAM limitada (512 MB), justa para Strapi. |
| A2. Render Git-backed (build en Render) | Cero configuración de registry. | El build del admin de Strapi en la capa gratuita es lento o inestable por memoria. Las imágenes serían distintas de las probadas en CI (viola C2). |
| A3. VM gratuita (p. ej. Oracle Cloud Always Free) con `docker compose` | Siempre encendida, más RAM, idéntica a local. | Requiere tarjeta (viola C1). Hay que administrar SO, parches, TLS y firewall (viola C5). |
| A4. Frontend estático (Render Static / Netlify) + Strapi aparte | Frontend siempre encendido. | El proxy `/api` pasa a reglas de rewrite propias del proveedor: diverge de la imagen Nginx probada (CSP, `limit_except`, borrado de `Authorization`), lo que debilita ADR-002 y C2. |

### B. Base de datos en la nube
| Opción | Pros | Contras |
| :--- | :--- | :--- |
| **B1. Neon Postgres Free** *(elegida)* | Plan gratuito sin tarjeta. Almacenamiento por proyecto muy superior a lo que pesa el contenido (KB). Escala a cero. | Arranque en frío del compute. Cuota mensual de cómputo. Los límites cambian con frecuencia (verificar en HITL-4). |
| B2. Render Postgres Free | Misma plataforma, una sola cuenta. | Las instancias gratuitas **expiran** tras un periodo fijo: el evaluador podría encontrar la BD borrada (viola C4). |
| B3. SQLite en el contenedor | Cero dependencias. | Disco efímero: cada suspensión o redeploy borra los cambios de negocio. El seed reaparece, pero la demo "cambio sin deploy" no persiste (viola C4). |

### C. CI/CD
| Opción | Pros | Contras |
| :--- | :--- | :--- |
| **C1. GitHub Actions + GHCR** *(elegida)* | Integrado con el repo. GHCR gratis para paquetes públicos. Caché de capas `type=gha`. | Minutos limitados en repos privados. |
| C2. Auto-deploy nativo de Render | Más simple. | Sin puertas de calidad previas: despliega aunque fallen la trazabilidad o los tests (viola C3). |
| C3. GitLab CI / CircleCI | Potentes. | Otro proveedor y otra cuenta sin beneficio para un repo en GitHub (viola C5). |

## 4. Decisión

### 4.1 CI (`.github/workflows/ci.yml`), bloqueante en PR y en `main`
1. **`governance`:**
   - `actionlint`.
   - `node scripts/trace-check.mjs` (regla 8).
   - gitleaks (allowlist solo para los valores ficticios de `docker-compose.yml`, ADR-002 R6).
   - grep de tokens.
   - **`tsc --noEmit --strict docs/contracts/strapi-contracts.ts`**: el contrato compila sin `any` (ADR-001 §6).
2. **`frontend`:** lint, unit (runner por defecto del CLI; en Angular 21+ es Vitest, ver [guía de unit tests](https://angular.dev/guide/testing/unit-tests) y [migración a Vitest](https://angular.dev/guide/testing/migrating-to-vitest)), build y comprobación de que el bundle no contiene secretos (ADR-002 §6, punto 9).
3. **`backend`:** build (admin precompilado).
4. **`e2e`:**
   - `docker compose up --build --wait` (SQLite).
   - Playwright E2E-S (solo lectura) + E2E-M (`page.route`, `page.clock`).
   - **`security-smoke`** de ADR-002 §6 contra proxy y Strapi directo.
   - **Sin token de escritura** (HITL-1): ningún test muta Strapi.
5. **`e2e-postgres`:** mismo smoke + E2E-S con un servicio `postgres` de Actions y `DATABASE_CLIENT=postgres` (ADR-002 R1). Detecta divergencias de dialecto antes de la nube.
6. **`images`:** build de las dos imágenes `linux/amd64` + Trivy (falla con CRITICAL corregibles).

### 4.2 CD (`.github/workflows/cd.yml`)
- Al terminar CI en verde sobre `main`, publica `ghcr.io/<owner>/cotizador-multipais-{frontend,backend}:{sha,latest}`.
- Dispara los deploy hooks de Render con `imgURL=<tag sha>`: despliegue inmutable y rollback por tag.
- Después corre un **smoke post-deploy**: el `security-smoke` contra las dos URLs públicas más `GET /` 200. Reintenta hasta 10 min por el arranque en frío.
- Los pasos de despliegue se omiten con *warning* si faltan sus secrets (los forks pueden correr CI). **Pero** si `RENDER_DEPLOY_HOOK_*` existe y faltan `STRAPI_ADMIN_EMAIL`/`STRAPI_ADMIN_PASSWORD` en Render, el checklist de HITL-4 lo marca como bloqueante (ADR-002 §4.2).

### 4.3 Runtime en la nube (mismas imágenes; solo variables)
- `cotizador-frontend` (Nginx): `PORT` (de Render), `STRAPI_UPSTREAM=https://cotizador-strapi.onrender.com`, `NGINX_RESOLVER`. Sin secretos.
- `cotizador-strapi`:
  - BD: `NODE_ENV=production`, `DATABASE_CLIENT=postgres`, `DATABASE_URL` (Neon, secret), `DATABASE_SSL=true`.
  - Arranque: `SEED_ON_BOOT=true` (idempotente y no destructivo), `NODE_OPTIONS=--max-old-space-size=384`, `PUBLIC_URL`.
  - Secretos de Strapi y del admin inicial: en Render Secrets.

### 4.4 Configuración 12-factor
- Nginx usa una plantilla `envsubst` (`PORT`, `STRAPI_UPSTREAM`, `NGINX_RESOLVER`).
- Strapi elige la BD por variables.
- Ningún build distinto por entorno.
- El front no tiene `environment.ts` con URLs: solo rutas relativas.

## 5. Consecuencias

### 5.1 Positivas
- El evaluador abre una URL pública. Cada despliegue corresponde a un commit que pasó todas las puertas.
- Rollback = redeploy del tag anterior.
- La trazabilidad, el contrato y los permisos públicos son checks de CI, no promesas.

### 5.2 Negativas, mitigación y verificación
| # | Consecuencia | Mitigación | Cómo se verifica |
| :--- | :--- | :--- | :--- |
| K1 | **Arranque en frío vs. timeout de 10 s del front (R-01.23, GAP-01.15):** el primer usuario tras una suspensión verá el estado `error` en el Paso 1 aunque el sistema esté sano. Ambos servicios Render se suspenden, y Neon también escala a cero. | Comportamiento correcto según la spec: estado `error` con "Reintentar" que no pierde datos (R-01.22, AC-01.22). README y página de la entrega indican "primera carga hasta ~1 min: pulse Reintentar". El smoke del CD "despierta" los servicios tras cada deploy. **No** se sube el timeout: cambiaría una regla aprobada; si el humano lo quiere, es un cambio de spec. | HITL-4: abrir la URL tras más de 15 min de inactividad y comprobar `error` → "Reintentar" → formulario. |
| K2 | Memoria de Strapi en 512 MB. | Admin precompilado en la imagen y heap limitado a 384 MB. **Plan B** si hay OOM: subir solo `cotizador-strapi` al plan de pago mínimo o mover a A3. Se registra en HITL-4. | Logs de Render sin `OOMKilled` durante el smoke. Registro en `docs/hitl/HITL-4-deploy.md`. |
| K3 | Imágenes GHCR privadas no son accesibles para Render. | Hacer públicos los paquetes (no contienen secretos: ADR-002 §6, puntos 9 y 10) o registrar la credencial de GHCR en Render. | El deploy hook responde y Render arranca con el tag `sha`. |
| K4 | Docker no disponible en el entorno del agente. | `docker compose up` local se verifica en HITL-2b por el humano y automáticamente en el job `e2e`. | Job `e2e` en verde. |
| K5 | Límites de Neon/Render cambiantes. | Se citan las páginas oficiales. HITL-4 reverifica los límites vigentes el día del despliegue. El contenido pesa KB y el tráfico de evaluación es mínimo. | Checklist HITL-4: captura de la página de límites. |
| K6 | La URL directa de Strapi es pública (admin + API). | ADR-002 §4.2: permisos mínimos, middleware "solo publicado", registro de usuarios cerrado, super-admin creado por `bootstrap`. | `security-smoke` post-deploy contra la URL directa. |
| K7 | La prueba manual de "cambio sin deploy" (AC-01.3, AC-01.32, AC-02.19, AC-02.26) necesita editar en el admin de la nube. | La hace el humano en HITL-3 con su cuenta de admin. **No** existe token de escritura (HITL-1). Neon persiste el cambio. | Registro en `docs/hitl/HITL-3-*.md`. |

## 6. Cómo se verifica
- Jobs de CI en verde: `governance`, `frontend`, `backend`, `e2e`, `e2e-postgres`, `images`.
- `docs/hitl/HITL-4-deploy.md` registra:
  - el resultado del smoke post-deploy (los 10 puntos de ADR-002 §6 contra ambas URLs);
  - la prueba de arranque en frío (K1);
  - la lista de API tokens vacía;
  - el admin creado por `bootstrap`;
  - los límites vigentes de Render y Neon (K5).

## 7. Fuentes (consultadas 2026-11-23)
- Render, capa gratuita (suspensión por inactividad, disco efímero, expiración de Postgres Free): https://render.com/docs/free · https://render.com/free
- Render, imágenes preconstruidas y deploy hook con `imgURL`: https://render.com/docs/deploying-an-image · https://render.com/docs/deploy-hooks
- Render FAQ: https://render.com/docs/faq
- Neon, plan gratuito y cuotas: https://neon.com/docs/introduction/plans · https://neon.com/faqs/free-plan-limits-and-quotas · https://neon.com/blog/neon-free-plan-1-gb-per-project
- Angular, unit tests con el runner por defecto (Vitest): https://angular.dev/guide/testing/unit-tests · https://angular.dev/guide/testing/migrating-to-vitest
- Nota: la búsqueda web de esta revisión devolvió las páginas oficiales pero no su texto. Las cifras concretas (15 min, 512 MB, almacenamiento de Neon) provienen del borrador del Orquestador y de los títulos y URLs oficiales. **Se reverifican en HITL-4 (K5).**
