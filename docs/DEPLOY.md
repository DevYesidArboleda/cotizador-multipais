# Guía de Despliegue (Render Free + Neon Free) — ADR-003

Configuración única (≈ 15 min). Después, **cada push a `main` con CI en verde despliega solo**.

## 1. Base de datos (Neon)
1. Crea una cuenta en https://neon.com (sin tarjeta) → *New project* `cotizador-multipais`.
2. Copia la *connection string* (`postgres://...?...sslmode=require`).

## 2. Primer publish de imágenes (GitHub)
1. Sube el repo a `main`. El workflow **CD** publica las imágenes en GHCR al pasar el CI (o ejecútalo manualmente: *Actions → CD → Run workflow*).
2. En GitHub → *Packages* → cada paquete `cotizador-multipais-frontend/backend` → *Package settings* → **Change visibility → Public** (no contienen secretos; así Render los descarga sin credenciales).

## 3. Servicios en Render
1. https://dashboard.render.com → **New → Blueprint** → selecciona el repo (usa `render.yaml`).
2. Completa las variables marcadas `sync: false`:
   - `cotizador-strapi` → `DATABASE_URL` = connection string de Neon; `PUBLIC_URL` = `https://cotizador-strapi.onrender.com` (la URL real que te asigne Render; es el único origen que permite CORS en Strapi).
   - `cotizador-strapi` → `STRAPI_ADMIN_EMAIL` y `STRAPI_ADMIN_PASSWORD` (**secretos**, mín. 8 caracteres con mayúscula, minúscula y número). Con ellas el `bootstrap` crea el super-admin en el primer arranque y la pantalla de registro de `/admin` nunca queda abierta (ADR-002 §4.2). **Son obligatorias antes de publicar la URL**: sin ellas el `bootstrap` solo emite un `warn` y cualquiera podría registrarse como administrador.
   - `cotizador-frontend` → `STRAPI_UPSTREAM` = la misma URL de Strapi, sin barra final.
3. Espera el primer deploy (el seed CO/CL se crea solo).
4. Entra en `https://<strapi>.onrender.com/admin` con `STRAPI_ADMIN_EMAIL`/`STRAPI_ADMIN_PASSWORD` (solo para editar contenido; nunca se expone por el frontend). No crees API tokens: el sistema no usa ninguno (ADR-002; *Settings → API Tokens* debe quedar vacío).

## 4. Conectar el CD
En GitHub → *Settings → Secrets and variables → Actions*:
| Tipo | Nombre | Valor |
| :--- | :--- | :--- |
| Secret | `RENDER_DEPLOY_HOOK_BACKEND` | Render → cotizador-strapi → Settings → Deploy Hook |
| Secret | `RENDER_DEPLOY_HOOK_FRONTEND` | Render → cotizador-frontend → Settings → Deploy Hook |
| Variable | `PUBLIC_APP_URL` | `https://cotizador-frontend.onrender.com` |
| Variable | `PUBLIC_STRAPI_URL` | `https://cotizador-strapi.onrender.com` (opcional pero recomendada: habilita los puntos 3, 6 y 8 del smoke contra la URL directa) |

`STRAPI_ADMIN_*`, `DATABASE_URL` y las claves de Strapi viven **solo** en Render (Environment). Nunca como `build-arg`, ni en GitHub Variables, ni en el repo.

Crea también el *Environment* `production` (Settings → Environments) si quieres aprobación manual antes de cada deploy (**HITL-4 opcional**).

## 5. Protección de `main` (recomendado)
Settings → Branches → *Add rule* `main`: requerir PR, 1 aprobación (CODEOWNERS) y checks `Gobierno`, `Frontend`, `Backend`, `E2E` y `E2E Postgres`.

## 6. Verificación (HITL-4)
El CD ejecuta el smoke de seguridad tras cada deploy (espera hasta 10 min por el arranque en frío). Para repetirlo a mano (Node >= 20, sin dependencias):
```bash
APP_URL=https://cotizador-frontend.onrender.com \
STRAPI_URL=https://cotizador-strapi.onrender.com \
SMOKE_WAIT_SECONDS=600 \
node scripts/security-smoke.mjs
```
Cubre los puntos de ADR-002 §6 (el 9 solo con `SMOKE_BUNDLE_DIR=<carpeta del bundle>`; el 10 lo hace gitleaks en CI). Sale con código 1 si algo falla. Sin `STRAPI_URL` se omiten los puntos que requieren la URL directa (3, 6, 8).

Comprobación manual rápida:
```bash
APP=https://cotizador-frontend.onrender.com
curl -fsS "$APP/api/countries?filters%5Bcode%5D%5B%24eq%5D=co"              # 200 con "code":"co"
curl -s -o /dev/null -w "%{http_code}\n" -X POST "$APP/api/form-fields"         # 403
curl -s "$APP/admin" | grep -c "<app-root"                                      # 1 → es la SPA, no el admin
```
Abre `$APP/co/quote/step-1` y `$APP/cl/quote/step-1`. Registra el resultado en `docs/hitl/HITL-4-deploy.md`.

## 7. Probar Postgres en local (paridad con la nube)
```bash
docker compose -f docker-compose.yml -f docker-compose.postgres.yml up --build
```
En local, Strapi se publica solo en `127.0.0.1:1337` (admin accesible desde tu máquina, no desde la red) y el admin inicial usa credenciales ficticias de `docker-compose.yml`; cámbialas con `.env` si compartes el equipo. Las imágenes y variables son las mismas que en CI.

Mismas imágenes; el override solo añade un servicio `postgres` y cambia variables. Es lo que ejecuta el job `E2E Postgres` de CI: smoke de seguridad más los E2E de solo lectura (`playwright test --grep @strapi`), sin token de escritura.

## Limitaciones conocidas de la capa gratuita
- Los servicios se suspenden tras 15 min sin tráfico: el primer acceso tarda ~1 min.
- Si Strapi se reinicia por memoria (OOM) en 512 MB: sube solo `cotizador-strapi` a Starter (ver ADR-003, plan B).
