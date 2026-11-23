---
name: docker-single-command-ops
description: Estándar DevOps para empaquetar Strapi 5 y Angular 21+ con arranque en un solo comando (docker compose up), healthchecks, Nginx reverse proxy y aislamiento estricto de secretos.
---

# Skill: Docker de Un Solo Comando y Proxy Seguro (DevOps)

## 1. Requisitos de Orquestación
- Un solo comando `docker compose up --build` debe levantar todo el entorno listo para usar sin scripts manuales adicionales.
- Dos servicios en una red interna compartida (`app-net`):
  1. `strapi`: Node 20/22 Alpine, puerto `1337`, volumen persistente `strapi_data` para SQLite, `healthcheck` contra `http://localhost:1337/_health`.
  2. `frontend`: Build multi-stage (Node build Angular → Nginx Alpine), puerto `4200:80`, `depends_on: strapi (condition: service_healthy)`.

## 2. Reverse Proxy en Nginx (`frontend/nginx.conf`)
- Servir rutas SPA de Angular (`/co/quote`, `/cl/quote`) con `try_files $uri $uri/ /index.html;`.
- Proxiar `location /api/` hacia `http://strapi:1337/api/` para que el navegador solo hable con su propio origen (cero errores CORS, cero URLs internas filtradas).

## 3. Aislamiento de Variables y Secretos
- Proveer `.env.example` con valores ficticios seguros para desarrollo local.
- Las claves de Strapi (`APP_KEYS`, `API_TOKEN_SALT`, `ADMIN_JWT_SECRET`, `TRANSFER_TOKEN_SALT`, `JWT_SECRET`) se inyectan **exclusivamente** al servicio `strapi`.
- El servicio `frontend` **no recibe** ningún token de Strapi.

## 4. Verificación de Arranque Limpio
Antes de dar por cerrado el trabajo de infraestructura, validar:
```bash
docker compose down -v
docker compose up --build
```
Confirmar que ambos servicios reportan estado saludable y que `http://localhost:4200/co/quote` carga los campos desde Strapi sin intervención manual.
