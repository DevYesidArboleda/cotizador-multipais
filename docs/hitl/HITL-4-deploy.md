# HITL-4 — Despliegue público (Render Free + Neon Free)

- **Fecha:** 2026-11-23 23:05–23:32 · **Humano:** Yesid Arboleda · **Ejecución:** Orquestador en el Chrome del humano (Claude in Chrome), por pedido literal: *"hazlo tu todo esta en el navegador"*.
- **URLs:** app `https://cotizador-frontend-8qqo.onrender.com` (ej. `/co/quote/step-1`, `/cl/quote/step-1`) · Strapi `https://cotizador-strapi.onrender.com` · BD Neon proyecto `long-water-42821780`.

## Qué hizo el Orquestador y qué el humano
| Paso | Quién | Detalle |
| :--- | :--- | :--- |
| Proyecto Neon | Humano | Ya creado al empezar. |
| Imágenes GHCR públicas | Verificado por el Orquestador | Ya eran públicas; comprobado con pull anónimo de manifiestos (HTTP 200 en backend y frontend). |
| Servicios Render | Orquestador | Se usaron **servicios image-backed** (Existing Image desde GHCR) en vez del Blueprint: el Blueprint exigía conectar GitHub a Render (permiso OAuth sobre un repo privado). Plan **Free**. Variables no secretas cargadas; las 6 claves internas de Strapi generadas con el botón **Generate** de Render (el agente no escribió ningún secreto); health checks `/_health` y `/healthz`. |
| Credenciales | Humano | `DATABASE_URL`, `STRAPI_ADMIN_EMAIL`, `STRAPI_ADMIN_PASSWORD` pegadas por el humano (el agente no introduce credenciales). |

## Incidencias
1. **Primer deploy de Strapi falló:** `password authentication failed for user 'neondb_owner'`. El Orquestador descartó el código comprobando con `pg@8.23.1` que la contraseña de `DATABASE_URL` prevalece sobre los valores por defecto de `config/database.ts`; la causa era el valor pegado. Además, el humano había pegado la cadena con contraseña en el chat → se **reseteó la contraseña en Neon** y se pegó la nueva en Render. Segundo deploy: **Live**. (La contraseña expuesta no se guardó en ningún archivo del repo.)
2. Se pidió quitar `&channel_binding=require` de la cadena de Neon por compatibilidad del cliente `pg`.

## Verificación en producción (desde el navegador, contra la URL pública)
| Comprobación | Resultado |
| :--- | :--- |
| `GET /api/countries?filters[code][$eq]=co` vía proxy | 200 · Colombia, COP, `legalAge` 18, `locale: es-CO` (seed en Postgres/Neon) |
| `POST /api/form-fields` anónimo vía proxy | **403** |
| `?status=draft` | solo devuelve publicados |
| `/admin` en el dominio del frontend | sirve la SPA (no el admin de Strapi) |
| Planes activos CO | `basico`, `plus`, `premium` en COP (el inactivo `legado` excluido) |
| Campos CO | 13 |
| Pantalla `/co/quote/step-1` | renderiza (captura `evidence/HITL-4-1-app-publica-render.jpg`) |

## Pendiente (opcional)
- Conectar el CD automático: añadir en GitHub los secrets `RENDER_DEPLOY_HOOK_BACKEND`/`RENDER_DEPLOY_HOOK_FRONTEND` y las variables `PUBLIC_APP_URL`/`PUBLIC_STRAPI_URL` (ver `docs/DEPLOY.md` §4). Sin ellos, el CD publica imágenes pero no redespliega.
