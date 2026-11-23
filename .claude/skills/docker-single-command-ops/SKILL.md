---
name: docker-single-command-ops
description: Estándar de plataforma - docker compose de un solo comando, imágenes multi-stage de producción idénticas en local y nube, Nginx con upstream por variable de entorno, healthchecks, aislamiento de secretos y pipelines GitHub Actions (CI con puertas de calidad, CD a GHCR).
---

# Skill: Docker de Un Solo Comando + CI/CD (DevOps)

## 1. Orquestación local
- `docker compose up --build` levanta `strapi` (SQLite en volumen, seed automático) y `frontend` (Nginx) sin pasos manuales. `.env` es opcional: el compose trae defaults ficticios de desarrollo.
- `strapi`: `NODE_ENV=production` (Content-Type Builder deshabilitado: schemas como código), healthcheck `/_health`, usuario no root.
- `frontend`: `depends_on: strapi: condition: service_healthy`, puerto `4200:8080`.

## 2. Nginx (`frontend/nginx/default.conf.template`, envsubst de la imagen oficial)
- `listen ${PORT}` (default 8080; Render inyecta `PORT`).
- `location /api/ { proxy_pass ${STRAPI_UPSTREAM}/api/; }` con `proxy_set_header Host $proxy_host;` y `proxy_ssl_server_name on;` (soporta upstream HTTPS en la nube). Solo se proxea `/api/`, **nunca** `/admin`.
- SPA fallback `try_files $uri $uri/ /index.html`, caché larga para assets con hash, `no-cache` para `index.html`.
- Cabeceras: CSP estricta (`default-src 'self'`), `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `X-Frame-Options: DENY`.

## 3. Secretos
- Claves de Strapi solo al servicio `strapi`. El frontend no recibe ninguna variable secreta, ni en build ni en runtime.
- `.env` en `.gitignore`; `gitleaks` en CI.

## 4. CI (`.github/workflows/ci.yml`) — puertas que bloquean el merge
1. `governance`: `node scripts/trace-check.mjs` + `gitleaks`.
2. `frontend`: `npm ci` → lint → unit tests → build de producción.
3. `backend`: `npm ci` → `npm run build`.
4. `e2e`: `docker compose up -d --build --wait` → Playwright contra `http://localhost:4200` → artefacto del reporte.
5. `security`: `npm audit --audit-level=high` (informativo) y escaneo de imágenes con Trivy.

## 5. CD (`.github/workflows/cd.yml`)
- En `main` tras CI verde: build & push a `ghcr.io/<owner>/cotizador-multipais-{frontend,backend}:{sha,latest}`, luego deploy hooks de Render con `imgURL` (solo si existen los secrets).

## 6. Verificación de arranque limpio (HITL)
```bash
docker compose down -v && docker compose up --build
```
Ambos servicios `healthy`; `http://localhost:4200/co/quote/step-1` muestra campos desde Strapi.
