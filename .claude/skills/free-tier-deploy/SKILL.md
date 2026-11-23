---
name: free-tier-deploy
description: Procedimiento para desplegar el cotizador (Strapi 5 + Angular/Nginx) en capa gratuita - Render (web services desde imágenes GHCR) + Postgres gestionado gratuito (Neon), con limitaciones conocidas, variables y verificación post-deploy.
---

# Skill: Despliegue en Capa Gratuita (DevOps)

## 1. Topología objetivo
```
Navegador ──HTTPS──▶ Render web service "cotizador-frontend" (imagen GHCR frontend, Nginx)
                         └─ /api/* ──HTTPS──▶ Render web service "cotizador-strapi" (imagen GHCR backend)
                                                 └─ TLS ──▶ Neon Postgres (free)
```
- Mismas imágenes que en local. El frontend solo conoce `STRAPI_UPSTREAM=https://cotizador-strapi.onrender.com`.

## 2. Limitaciones conocidas (documentar en README y ADR-003)
- Render Free: el servicio se suspende tras 15 min sin tráfico; el primer request tarda ~1 min. Disco efímero → por eso Postgres externo (con SQLite se perderían las ediciones de negocio).
- Memoria limitada (512 MB): Strapi corre con el admin precompilado en la imagen y `NODE_OPTIONS=--max-old-space-size=384`. Si no alcanza: plan B documentado (instancia Starter o proveedor alternativo).
- Postgres gratuito tiene límites de almacenamiento; el contenido del cotizador es de pocos KB.

## 3. Variables (Render → Environment, nunca en el repo)
- `cotizador-strapi`: `DATABASE_CLIENT=postgres`, `DATABASE_URL`, `DATABASE_SSL=true`, `APP_KEYS`, `API_TOKEN_SALT`, `ADMIN_JWT_SECRET`, `TRANSFER_TOKEN_SALT`, `JWT_SECRET`, `ENCRYPTION_KEY`, `SEED_ON_BOOT=true`, `PUBLIC_URL`.
- `cotizador-frontend`: `STRAPI_UPSTREAM`.
- GitHub Secrets: `RENDER_DEPLOY_HOOK_BACKEND`, `RENDER_DEPLOY_HOOK_FRONTEND`.

## 4. Verificación post-deploy (smoke)
```bash
curl -fsS https://<frontend>/api/countries?filters[code][\$eq]=co | jq '.data[0].code'   # "co"
curl -s -o /dev/null -w "%{http_code}" -X POST https://<frontend>/api/form-fields         # 403/405
curl -s -o /dev/null -w "%{http_code}" https://<frontend>/admin                            # no debe servir el admin
```
