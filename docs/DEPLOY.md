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
   - `cotizador-strapi` → `DATABASE_URL` = connection string de Neon; `PUBLIC_URL` = `https://cotizador-strapi.onrender.com` (la URL real que te asigne Render).
   - `cotizador-frontend` → `STRAPI_UPSTREAM` = la misma URL de Strapi, sin barra final.
3. Espera el primer deploy (el seed CO/CL se crea solo).
4. Crea tu usuario admin en `https://<strapi>.onrender.com/admin` (solo para editar contenido; nunca se expone por el frontend).

## 4. Conectar el CD
En GitHub → *Settings → Secrets and variables → Actions*:
| Tipo | Nombre | Valor |
| :--- | :--- | :--- |
| Secret | `RENDER_DEPLOY_HOOK_BACKEND` | Render → cotizador-strapi → Settings → Deploy Hook |
| Secret | `RENDER_DEPLOY_HOOK_FRONTEND` | Render → cotizador-frontend → Settings → Deploy Hook |
| Variable | `PUBLIC_APP_URL` | `https://cotizador-frontend.onrender.com` |

Crea también el *Environment* `production` (Settings → Environments) si quieres aprobación manual antes de cada deploy (**HITL-4 opcional**).

## 5. Protección de `main` (recomendado)
Settings → Branches → *Add rule* `main`: requerir PR, 1 aprobación (CODEOWNERS) y checks `Gobierno`, `Frontend`, `Backend`, `E2E`.

## 6. Verificación (HITL-4)
```bash
APP=https://cotizador-frontend.onrender.com
curl -fsS "$APP/api/countries?filters%5Bcode%5D%5B%24eq%5D=co"              # 200 con "code":"co"
curl -s -o /dev/null -w "%{http_code}\n" -X POST "$APP/api/form-fields"         # 403
curl -s "$APP/admin" | grep -c "<app-root"                                      # 1 → es la SPA, no el admin
```
Abre `$APP/co/quote/step-1` y `$APP/cl/quote/step-1`. Registra el resultado en `docs/hitl/HITL-4-deploy.md`.

## Limitaciones conocidas de la capa gratuita
- Los servicios se suspenden tras 15 min sin tráfico: el primer acceso tarda ~1 min.
- Si Strapi se reinicia por memoria (OOM) en 512 MB: sube solo `cotizador-strapi` a Starter (ver ADR-003, plan B).
