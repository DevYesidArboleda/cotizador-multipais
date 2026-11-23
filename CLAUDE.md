# CLAUDE.md — Cotizador Multi-País de Seguro Automotriz (CO / CL)

> Contexto global obligatorio para **todos** los agentes y subagentes. Si una instrucción de un subagente o skill contradice este archivo, gana este archivo y el conflicto se reporta en el bloque de Handoff.

## 1. Propósito del Producto
Una sola aplicación front-end y un solo build que cotiza seguros de autos para **Colombia (`co`)** y **Chile (`cl`)**. El equipo de negocio (no técnico) configura campos del formulario, opciones, validaciones, planes, coberturas, beneficios y términos desde **Strapi 5** sin solicitar despliegues.

## 2. Stack Obligatorio
- **Front-end (`frontend/`):** Angular 21+ (actual: 22.x) — standalone components, signals (`signal`, `computed`, `effect`), `input()`/`output()`, `inject()`, control flow (`@if`, `@for` con `track`, `@switch`), `ChangeDetectionStrategy.OnPush`, **cero `NgModules`**. Unit tests con el runner por defecto del CLI; E2E con Playwright.
- **Backend de contenido (`backend/`):** Strapi 5+ (Document Service API). SQLite en local, PostgreSQL en la nube (seleccionado por variables de entorno, mismo código).
- **Entorno:** `docker compose up --build` levanta todo con seed CO/CL.
- **DevOps:** GitHub Actions (CI + CD), imágenes en GHCR, despliegue gratuito en Render + Postgres gestionado gratuito (ver `ADR-003`).

## 3. Reglas Inquebrantables
1. **SDD:** Ningún subagente escribe código de aplicación sin `docs/specs/SPEC-US-XX.md` en estado `Aprobado` (HITL-1 registrado en `docs/hitl/`).
2. **100 % configurable desde Strapi:** Prohibido hardcodear en Angular campos del Paso 1, opciones de `select`, planes, coberturas, beneficios, textos legales, edad mínima o rango de años del vehículo.
3. **Acoplamiento semántico, nunca por `key`:** La lógica de negocio (precio, enmascaramiento, validaciones cruzadas, resumen) localiza campos por `semanticRole` (`document_type`, `document_number`, `birth_date`, `vehicle_year`, `vehicle_plate`, `full_name`, ...), **nunca** por el `key` que el negocio puede renombrar. Si falta un rol requerido, la app muestra un error de configuración claro, no un fallo silencioso.
4. **Seguridad Strapi:** Ningún token de Strapi llega al navegador, al bundle ni al repositorio. El rol `Public` solo tiene `find` sobre `country`, `form-field` e `insurance-plan`. Los secretos solo viven en `.env` local (ignorado) y en GitHub/Render Secrets.
5. **Datos ficticios:** Prohibidos datos personales reales, tarjetas reales o credenciales reales (también en logs y fixtures).
6. **Persistencia front-end:** Estado del cotizador solo en `sessionStorage` particionado por país (`auto_quote_v1_<country>`). Sin base de datos para cotizaciones ni pasarelas reales.
7. **Accesibilidad y responsive:** Wizard completable solo con teclado (`Tab`, `Shift+Tab`, `Enter`, `Space`, flechas en grupos de radio), labels accesibles, WCAG 2.2 AA, mobile + desktop.
8. **Trazabilidad verificable:** `US-XX → SPEC-US-XX (R-/AC-) → ADR-XXX → código → tests → REVIEW-US-XX → commit`. Se valida automáticamente con `node scripts/trace-check.mjs` (falla CI si se rompe).

## 4. Convenciones de Identificadores (trazabilidad)
| Artefacto | Formato | Ejemplo |
| :--- | :--- | :--- |
| Regla de negocio | `R-<US>.<n>` | `R-01.3` |
| Criterio de aceptación | `AC-<US>.<n>` | `AC-02.4` |
| Vacío detectado | `GAP-<US>.<n>` | `GAP-03.2` |
| Hallazgo de review | `F-<US>.<n>` | `F-01.2` |
| Decisión humana | `HITL-<n>` | `HITL-1` |

- **Tests:** el título del `describe`/`it`/`test` incluye los IDs que cubre: `it('[R-01.3] rechaza menores de edad', ...)`.
- **Commits:** Conventional Commits + pie de trazabilidad: `feat(frontend): stepper accesible` / `Refs: US-01, SPEC-US-01, R-01.2`.
- **Rutas Angular (únicas válidas):** `/:country/quote/step-1`, `/:country/quote/step-2`, `/:country/quote/step-3`, `/:country/quote/confirmation`. `/` y `/:country` redirigen a `step-1` (`/` → `co`). País inválido → `/country-not-found` con selector.

## 5. Orquestación y Equipo
La **sesión principal actúa como Orquestador**: no escribe código de aplicación; despacha subagentes, valida sus Handoffs, ejecuta `trace-check`, guarda los logs verbatim en `docs/logs/` y detiene el flujo en cada HITL.

**Regla de despacho (aprendida en Fase 2, ver `docs/logs/02-*`):** todo prompt de despacho enumera las **rutas exactas** de cada entrada (nunca globs como `docs/adrs/*.md`), porque un subagente sin herramientas de listado no puede descubrirlas y termina trabajando sin contexto.

| Subagente | Skill(s) | Escribe en | Fase |
| :--- | :--- | :--- | :--- |
| `@spec-analyst` | `spec-gap-checklist` | `docs/specs/SPEC-US-*.md` | 2 |
| `@architect` | `software-architecture-madr` | `docs/adrs/`, `docs/contracts/` | 3 |
| `@ui-ux-designer` | `ui-ux-accessibility-system`, `frontend-design` | `docs/specs/UI-UX-GUIDELINES.md` | 3 |
| `@devops-engineer` | `docker-single-command-ops`, `free-tier-deploy` | `docker-compose.yml`, `Dockerfile`s, `.github/`, `render.yaml` | 4 |
| `@cms-engineer` | `strapi-5-docker-seed` | `backend/` | 4 |
| `@frontend-engineer` | `angular-21-dynamic-forms` | `frontend/` | 5 |
| `@qa-reviewer` | `qa-security-code-review`, `traceability-matrix` | `docs/reviews/`, `docs/TRACEABILITY.md` | 6 |

## 6. Contrato de Handoff (obligatorio al final de cada subagente)
```md
## Handoff
- **Agente:** @nombre · **Fase:** N · **Entradas leídas:** [rutas]
- **Archivos creados/modificados:** [rutas]
- **IDs cubiertos:** [R-.., AC-.., GAP-..]
- **Verificación ejecutada:** [comandos + resultado literal] (o "N/A — agente sin Bash")
- **Pendientes / riesgos:** [...]
- **Requiere HITL:** Sí (HITL-n) | No
```

## 7. Convenciones Técnicas
- TypeScript `strict: true`; prohibido `any` (usar `unknown` + type guards).
- Reglas de negocio como **funciones puras** fuera de componentes (validadores, `calculateAdjustedPrice`, `maskDocumentNumber`, `generateQuoteNumber`, guardia de doble pago).
- Toda vista con estados `loading`, `ready`, `empty`, `error` modelados como unión discriminada.
- Llamadas HTTP solo a rutas relativas `/api/...` (proxy Nginx en Docker/Render, `proxy.conf.json` en dev).
- Configuración 12-factor: todo lo que cambia entre entornos va por variables de entorno, nunca por builds distintos.
