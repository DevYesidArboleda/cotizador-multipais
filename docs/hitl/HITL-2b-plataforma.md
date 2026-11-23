# HITL-2b — Plataforma: Strapi en Docker Desktop del humano

- **Fecha:** 2026-11-23 15:52–16:06 · **Revisor humano:** Yesid Arboleda (@DevYesidArboleda)
- **Commit verificado:** `cadaaf4` · **Comando:** `docker compose up --build strapi` (el frontend aún no existe: Fase 5)
- **Decisión:** `APROBADO` — literal: *"esta funcionando bien, veo todo desplegado y de acuerdo a lo solicitado, ya puedes seguir con el front"*

## Incidencia durante la verificación
- Primer intento: `failed to connect to the docker API at npipe:////./pipe/dockerDesktopLinuxEngine` → Docker Desktop no estaba iniciado (entorno, no proyecto). Resuelto por el humano al abrir Docker Desktop.

## Evidencia aportada por el humano
| # | Qué muestra | Archivo |
| :--- | :--- | :--- |
| 1 | Admin creado desde `STRAPI_ADMIN_EMAIL` (Super Admin `admin@example.com`), 35 entradas publicadas = 2 países + 25 campos + 8 planes (incluye el plan inactivo `legado`, publicado pero filtrado por `isActive`) | `evidence/HITL-2b-1-admin-dashboard.png` |
| 2 | Roles: Authenticated y Public, 0 usuarios (registro cerrado) | `evidence/HITL-2b-2-roles.png` |
| 3 | Invariante I3 en vivo: *"La moneda del plan (CLP) debe coincidir con la moneda del país (COP)."* | `evidence/HITL-2b-3-invariante-moneda.png` |
| 4 | `GET /api/countries?filters[code][$eq]=co` → Colombia, COP, `legalAge` 18, rango de años, T&C, `locale: es-CO` (expuesto desde `localeCode`) | `evidence/HITL-2b-4-api-countries-co.png` |

## Nota del Orquestador
- La captura 2 muestra la lista de roles pero no el detalle de permisos del rol Public. Ese punto quedó cubierto de forma automática por `scripts/security-smoke.mjs` contra el stack real (17 PASS: escritura 403, findOne 403, registro cerrado, borradores bloqueados; log 06b) y se volverá a comprobar en HITL-3.
- Primera ejecución real de la imagen Docker de backend (build multi-stage, usuario no root, healthcheck) en una máquina distinta a la del agente: **OK**.
