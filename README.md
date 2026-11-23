# Cotizador Multi-País de Seguro Automotriz (Colombia y Chile)

Una sola aplicación **Angular 21+** y un solo build que cotiza seguros de autos para Colombia y Chile, con contenido 100 % configurable desde **Strapi 5**, construida con un flujo agéntico **Spec-Driven Development** (ver [`FLOW.md`](./FLOW.md)) y con **CI/CD** hacia una capa gratuita (Render + Neon).

## Arranque en un solo comando

**Prerrequisito:** Docker Desktop (o Docker Engine) con Compose v2.

```bash
docker compose up --build
```

No hace falta `.env`: el compose trae valores **ficticios** de desarrollo (puedes partir de `.env.example` para cambiarlos).

| Qué | URL |
| :--- | :--- |
| App — Colombia | http://localhost:4200/co/quote/step-1 |
| App — Chile | http://localhost:4200/cl/quote/step-1 |
| Strapi Admin | http://localhost:1337/admin (crea tu usuario admin la primera vez) |

El seed de Colombia y Chile se crea automáticamente al arrancar, de forma **idempotente y no destructiva** (no duplica ni pisa cambios hechos en el admin). Reinicio limpio: `docker compose down -v && docker compose up --build`.

## Validar "cambio en Strapi sin deploy"
1. Strapi Admin → **Content Manager → Form Field → Create new entry**.
2. Completa etiqueta, `key`, tipo, orden y país → **Publish**.
3. Recarga `http://localhost:4200/co/quote/step-1`: el campo aparece sin reconstruir nada.

## Desarrollo sin Docker
```bash
cd backend && npm ci && npm run develop       # Strapi en :1337 (SQLite)
cd frontend && npm ci && npm start            # Angular en :4200 con proxy /api → :1337
```

## Pruebas
```bash
cd frontend && npm test -- --watch=false      # Unit (títulos con IDs R-/AC- de las specs)
cd frontend && npx playwright test            # E2E flujo completo (requiere el stack arriba)
node scripts/trace-check.mjs                  # Trazabilidad US → SPEC → ADR → tests → review
```

## DevOps
| Pieza | Archivo |
| :--- | :--- |
| CI (puertas de calidad) | [`.github/workflows/ci.yml`](./.github/workflows/ci.yml) |
| CD (GHCR → Render) | [`.github/workflows/cd.yml`](./.github/workflows/cd.yml) |
| Blueprint Render | [`render.yaml`](./render.yaml) |
| Guía de despliegue | [`docs/DEPLOY.md`](./docs/DEPLOY.md) |
| Decisión | [`ADR-003`](./docs/adrs/ADR-003-cicd-and-free-tier-deploy.md) |

## Mapa del flujo agéntico
| Artefacto | Ruta |
| :--- | :--- |
| Flujo y diagrama | [`FLOW.md`](./FLOW.md) |
| Contexto global | [`CLAUDE.md`](./CLAUDE.md) |
| Subagentes | [`.claude/agents/`](./.claude/agents/) |
| Skills | [`.claude/skills/`](./.claude/skills/) |
| Historias originales | [`docs/user-stories/`](./docs/user-stories/) |
| Specs | [`docs/specs/`](./docs/specs/) |
| ADRs | [`docs/adrs/`](./docs/adrs/) |
| Decisiones humanas (HITL) | [`docs/hitl/`](./docs/hitl/) |
| Code reviews | [`docs/reviews/`](./docs/reviews/) |
| Matriz de trazabilidad | [`docs/TRACEABILITY.md`](./docs/TRACEABILITY.md) |
| Logs sin editar | [`docs/logs/`](./docs/logs/) |

## Requisitos no cumplidos o adaptados
- *(Se completa al cierre.)* Adaptación conocida: la plataforma gratuita suspende los servicios tras 15 min sin tráfico (primer acceso ~1 min). Ver `ADR-003`.
