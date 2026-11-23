# ADR-003: CI/CD con GitHub Actions y Despliegue en Capa Gratuita (Render + Neon)

- **Estado:** Propuesto (pendiente HITL-2)
- **Fecha:** 2026-11-23
- **Decisores:** Orquestador (borrador) → `@architect` (revisión) → humano (HITL-2)
- **Trazabilidad:** Requisitos técnicos *Environment* y *Security*; requerimiento del usuario: "desplegar en una app gratuita" e "implementar DevOps"; `ADR-002`.

## Contexto y problema
El proyecto debe (1) arrancar en local con un solo comando y (2) publicarse en una plataforma **gratuita** para que el evaluador lo use sin instalar nada. Además, el flujo agéntico necesita **puertas automáticas** que impidan integrar código sin trazabilidad, con tests rojos o con secretos.

Restricciones reales:
- Strapi necesita una base de datos persistente: en contenedores con disco efímero, SQLite pierde las ediciones del equipo de negocio.
- Compilar el admin de Strapi consume mucha memoria; los planes gratuitos dan poca RAM.
- El navegador no puede recibir tokens (ADR-002): el frontend debe seguir llamando a `/api` en su mismo origen.

## Drivers de decisión
1. Costo $0 y sin tarjeta para el evaluador.
2. **Las mismas imágenes** en local, CI y nube (sin "funciona en mi máquina").
3. Puertas de calidad automáticas alineadas con el flujo SDD (trazabilidad, tests, secretos).
4. Simplicidad operativa para una persona.

## Alternativas consideradas

### A. Hosting de la aplicación
| Opción | Pros | Contras |
| :--- | :--- | :--- |
| **A1. Render web services *image-backed* (Free) + imágenes de GHCR** *(elegida)* | Gratis; despliega imágenes ya construidas (Render no compila → no sufre por RAM en build); deploy hooks con `imgURL` para desplegar un tag inmutable; TLS automático; Blueprint `render.yaml` versionado. | Se suspende tras 15 min sin tráfico y tarda ~1 min en despertar; disco efímero; 512 MB de RAM, justos para Strapi. |
| A2. Render Git-backed (build en Render) | Cero configuración de registry. | El build del admin de Strapi en la capa gratuita es lento/inestable por memoria; imágenes distintas a las probadas en CI. |
| A3. VM gratuita (Oracle Cloud Always Free) con `docker compose` | Siempre encendida, más RAM, idéntico a local. | Requiere tarjeta, administrar SO, parches, TLS y firewall: alta carga operativa para la prueba. |
| A4. Frontend estático (Render Static / Netlify) + Strapi aparte | Frontend siempre encendido. | El proxy `/api` pasa a reglas de rewrite específicas del proveedor; diverge de la imagen Nginx probada (CSP, bloqueo de escrituras). |

### B. Base de datos en la nube
| Opción | Pros | Contras |
| :--- | :--- | :--- |
| **B1. Neon Postgres Free** *(elegida)* | Gratuito permanente sin tarjeta, 1 GB por proyecto (el contenido pesa KB), escala a cero. | Arranque en frío del compute; límite mensual de CU-horas. |
| B2. Render Postgres Free | Misma plataforma. | Las instancias gratuitas expiran tras un periodo fijo: el evaluador podría encontrar la BD borrada. |
| B3. SQLite en el contenedor | Cero dependencias. | Disco efímero: cada suspensión borra los cambios de negocio (el seed reaparece, pero la demo "cambio sin deploy" no persiste). |

### C. CI/CD
| Opción | Pros | Contras |
| :--- | :--- | :--- |
| **C1. GitHub Actions + GHCR** *(elegida)* | Integrado con el repo; GHCR gratis para paquetes públicos; caché de capas `type=gha`. | Minutos limitados en repos privados. |
| C2. Auto-deploy nativo de Render | Más simple. | Sin puertas de calidad previas; despliega aunque falle la trazabilidad. |
| C3. GitLab CI / CircleCI | Potentes. | Otro proveedor y otra cuenta sin beneficio para un repo en GitHub. |

## Decisión
- **CI (`.github/workflows/ci.yml`)**, bloqueante en PR y `main`:
  `governance` (actionlint, `trace-check`, gitleaks, grep de tokens) → `frontend` (lint, unit, build, bundle sin secretos) + `backend` (build) → `e2e` (`docker compose up --wait` + Playwright + smoke de permisos) + `images` (build + Trivy).
- **CD (`.github/workflows/cd.yml`)**: al terminar CI en verde sobre `main`, publica `ghcr.io/devyesidarboleda/cotizador-multipais-{frontend,backend}:{sha,latest}` (linux/amd64) y dispara los deploy hooks de Render con `imgURL=<tag sha>` (despliegue inmutable y rollback por tag). Luego un smoke test post-deploy. Todo paso de despliegue se omite con *warning* si sus secrets no existen, para que el CI funcione en forks.
- **Runtime en la nube:** `cotizador-frontend` (Nginx, `STRAPI_UPSTREAM=https://cotizador-strapi.onrender.com`) → `cotizador-strapi` (`DATABASE_CLIENT=postgres`, `DATABASE_URL` de Neon, `SEED_ON_BOOT=true`, `NODE_OPTIONS=--max-old-space-size=384`).
- **Configuración 12-factor:** Nginx usa plantilla `envsubst` (`PORT`, `STRAPI_UPSTREAM`, DNS del contenedor) y Strapi elige BD por variables. Ningún build distinto por entorno.

## Consecuencias
- **Positivas:** Un evaluador puede abrir una URL pública; cada despliegue corresponde a un commit que pasó todas las puertas; rollback = redeploy del tag anterior; la trazabilidad pasa a ser un check de CI.
- **Negativas y mitigaciones:**
  - *Arranque en frío (~1 min):* documentado en README; el smoke del CD reintenta hasta 10 min.
  - *Memoria de Strapi en 512 MB:* admin precompilado en la imagen y heap limitado. **Plan B** si hay OOM: subir solo `cotizador-strapi` al plan Starter o mover a A3; se registra en HITL-4.
  - *Imágenes GHCR privadas:* hacer públicos los paquetes (no contienen secretos) o registrar credencial de GHCR en Render.
  - *Docker no disponible en el entorno del agente:* `docker compose up` local se verifica en HITL-2b por el humano y automáticamente en el job `e2e` del CI.
- **Verificación:** jobs de CI en verde; `docs/hitl/HITL-4-deploy.md` con el resultado del smoke (`GET /api/countries` 200, `POST /api/form-fields` ≥ 400, `/admin` no servido por el frontend).

## Fuentes (consultadas 2026-11-23)
- Render Free (suspensión 15 min, disco efímero): https://render.com/docs/free
- Render imágenes preconstruidas y deploy hook con `imgURL`: https://render.com/docs/deploying-an-image · https://render.com/docs/deploy-hooks
- Neon Free plan (1 GB/proyecto, sin tarjeta, scale-to-zero): https://neon.com/faqs/free-plan-limits-and-quotas
