# Cotizador Multi-País de Seguro Automotriz (Colombia y Chile)

Una sola aplicación **Angular 22** (un solo build) que cotiza seguros de autos para Colombia y Chile, con formulario, planes, coberturas, precios y términos **100 % configurables desde Strapi 5**, construida con un flujo agéntico **Spec-Driven Development** con puntos de control humanos (ver [`FLOW.md`](./FLOW.md)) y con **CI/CD** hacia una capa gratuita (Render + Neon).

> Marca ficticia: **Linde Auto**. Todos los datos son ficticios.
>
> **Demo pública:** https://cotizador-frontend-8qqo.onrender.com/co/quote/step-1 · https://cotizador-frontend-8qqo.onrender.com/cl/quote/step-1 (Render Free: el primer acceso tras 15 min sin uso tarda ~1 min; si aparece "Reintentar", púlsalo).

## Arranque en un solo comando

**Prerrequisito:** Docker Desktop (o Docker Engine) con Compose v2, **iniciado**.

```bash
docker compose up --build
```

No hace falta `.env`: el compose trae valores **ficticios** de desarrollo (ver `.env.example` para cambiarlos). El primer build tarda ~5-8 min (instala dependencias y compila el admin de Strapi).

| Qué | URL |
| :--- | :--- |
| App — Colombia | http://localhost:4200/co/quote/step-1 |
| App — Chile | http://localhost:4200/cl/quote/step-1 |
| Strapi Admin (solo desde esta máquina) | http://localhost:1337/admin — usuario ficticio `admin@example.com` / `DevAdminPass1234567890` |

- El seed de Colombia y Chile se crea **solo la primera vez por país**: después manda el contenido que edite negocio (no se duplica ni reaparece lo borrado).
- Reinicio limpio (borra la BD local): `docker compose down -v && docker compose up --build`.

## Qué hace la aplicación
| Paso | Ruta | Contenido |
| :--- | :--- | :--- |
| 1. Datos | `/:country/quote/step-1` | Formulario generado desde Strapi (campos, tipos, orden, validaciones, ayudas y errores por país). Validaciones tipadas: mayoría de edad y rango de años desde el país, RUT con dígito verificador, CC/CE dependiente del tipo, placa CO (incl. moto) y patente CL, email. |
| 2. Planes | `/:country/quote/step-2` | Planes activos y publicados del país, en orden, con plan recomendado, precio ajustado (antigüedad del vehículo, edad del tomador y ciudad configurada en Strapi) en COP/CLP. |
| 3. Resumen y pago | `/:country/quote/step-3` | Resumen con documento enmascarado, términos del país, pago simulado (aprobado/rechazado) sin doble envío. |
| Confirmación | `/:country/quote/confirmation` | Número de cotización `COT-<PAÍS>-<AAAAMMDD>-<HEX>`. |

Estado del cotizador en `sessionStorage` aislado por país; navegable solo con teclado; responsive mobile/desktop.

## Validar "cambio en Strapi sin deploy"
1. Strapi Admin → **Content Manager → Form Field → Create new entry** (o edita un plan, una ciudad o los términos).
2. Completa los datos, asigna el país y pulsa **Publish**.
3. Recarga la app en ese país: el cambio aparece sin reconstruir nada.

## Desarrollo sin Docker
```bash
cd backend && npm ci && npm run develop       # Strapi en :1337 (SQLite)
cd frontend && npm ci && npm start            # Angular en :4200 con proxy /api → :1337
```

## Pruebas
```bash
cd frontend && npm test -- --watch=false      # 365 unit tests (títulos con IDs R-/AC-/F-)
cd frontend && npx playwright install chromium && npx playwright test   # 200 E2E (requiere el stack arriba)
cd frontend && npx playwright test e2e/full-flow-co.spec.ts             # E2E del flujo completo CO, solo teclado
node scripts/trace-check.mjs                  # Trazabilidad US → SPEC → ADR → tests → review
APP_URL=http://localhost:4200 STRAPI_URL=http://localhost:1337 node scripts/security-smoke.mjs   # Smoke de seguridad
```

## Seguridad (resumen, ver ADR-002)
- El navegador nunca recibe tokens de Strapi; el frontend llama `/api` en su mismo origen y Nginx solo deja pasar `GET/HEAD/OPTIONS`.
- Rol `Public` = solo `find` en `country`, `form-field`, `insurance-plan`; sin `findOne`, sin registro de usuarios, sin borradores (`?status=draft` bloqueado).
- Invariantes de negocio en Strapi (moneda del plan = moneda del país, un solo recomendado activo, un rol semántico por país…).
- `scripts/security-smoke.mjs` comprueba todo lo anterior contra el stack real en CI y tras cada despliegue.

## DevOps
| Pieza | Archivo |
| :--- | :--- |
| CI (puertas de calidad) | [`.github/workflows/ci.yml`](./.github/workflows/ci.yml) |
| CD (GHCR → Render) | [`.github/workflows/cd.yml`](./.github/workflows/cd.yml) |
| Blueprint Render | [`render.yaml`](./render.yaml) |
| Guía de despliegue | [`docs/DEPLOY.md`](./docs/DEPLOY.md) |
| Decisión | [`ADR-003`](./docs/adrs/ADR-003-cicd-and-free-tier-deploy.md) |

## Mapa del flujo agéntico (para el evaluador)
| Artefacto | Ruta |
| :--- | :--- |
| Flujo, diagrama y reflexiones | [`FLOW.md`](./FLOW.md) |
| Contexto global | [`CLAUDE.md`](./CLAUDE.md) |
| Subagentes (7) | [`.claude/agents/`](./.claude/agents/) |
| Skills propias (9) | [`.claude/skills/`](./.claude/skills/) |
| Historias originales | [`docs/user-stories/`](./docs/user-stories/) |
| Specs (167 IDs R-/AC-) | [`docs/specs/`](./docs/specs/) |
| ADRs | [`docs/adrs/`](./docs/adrs/) |
| Contrato TS | [`docs/contracts/strapi-contracts.ts`](./docs/contracts/strapi-contracts.ts) |
| Decisiones humanas (HITL) con evidencia | [`docs/hitl/`](./docs/hitl/) |
| Code reviews con hallazgos y cierre | [`docs/reviews/`](./docs/reviews/) |
| Matriz de trazabilidad (generada) | [`docs/TRACEABILITY.md`](./docs/TRACEABILITY.md) |
| Logs sin editar de los subagentes | [`docs/logs/`](./docs/logs/) |

## Requisitos no cumplidos o adaptados
- **Herramienta:** se usó Claude (app con subagentes nativos sobre Claude Agent SDK) en lugar de Claude Code CLI; las definiciones de `.claude/` son compatibles con el CLI. Ver `FLOW.md`.
- **Logs:** los logs de subagentes están en `docs/logs/` como prompt de despacho + informe final **sin editar**, más la verificación del Orquestador. La conversación con el Orquestador se transcribe por fase (`00-*`) y se complementa con la exportación de la conversación completa que adjunta el humano. No se incluyen transcripciones crudas de cada llamada a herramientas porque el entorno no las expone.
- **Diversidad de modelos en la re-auditoría:** la review inicial se hizo con `opus` (distinto de los implementadores en `sonnet`); la re-auditoría de cierre se ejecutó en `sonnet` por límite de uso de `opus`, por decisión humana registrada en HITL-3, con contraste del Orquestador (`opus`).
- **Verificación con Docker:** el entorno de los agentes no tiene daemon Docker. `docker compose up` se verifica en la máquina del humano (HITL-2b/HITL-3) y en el job `e2e` de CI; los E2E locales de los agentes corrieron contra Strapi y Angular reales sin contenedores.
- **Pruebas manuales:** lector de pantalla (T9) y "cambio de configuración en vivo" se verifican a mano en HITL-3 (no automatizables sin token de escritura, que por diseño no existe en ningún entorno).
- **Arranque en frío en la demo pública (aceptado en HITL-2):** Render Free suspende los servicios tras 15 min sin tráfico y el primer acceso tarda ~1 min. Como la spec fija un timeout de 10 s para cargar la configuración, ese primer visitante verá el estado de error con **"Reintentar"**; al reintentar, la app carga normalmente. En local no ocurre. Ver `ADR-003` (K1).
- **Seed tras un primer arranque interrumpido:** si el primer arranque se corta a mitad del seed de un país, ese país no se vuelve a sembrar automáticamente; se borra el país en el admin y se reinicia (ver `REVIEW-PLATFORM.md`).
