# CLAUDE.md — Cotizador Multi-País de Seguro Automotriz (CO / CL)

## Propósito del Producto
Una sola aplicación front-end y un solo build que cotiza seguros de autos para **Colombia (`co`)** y **Chile (`cl`)**, donde el equipo de negocio (no técnico) configura campos del formulario, planes, coberturas y términos y condiciones desde **Strapi 5** sin solicitar despliegues.

## Stack Obligatorio
- **Front-end (`frontend/`):** Angular 21+ con standalone components, signals (`signal`, `computed`), control flow nativo (`@if`, `@for`), `ChangeDetectionStrategy.OnPush` y **cero `NgModules`**.
- **Backend de contenido (`backend/`):** Strapi 5+ (Document Service API) con datos semilla idempotentes para Colombia y Chile.
- **Entorno (`docker-compose.yml`):** Todo el proyecto arranca con un solo comando (`docker compose up --build`).

## Reglas Inquebrantables
1. **Spec-Driven Development (SDD):** Ningún subagente puede escribir código de aplicación sin una Spec aprobada en `docs/specs/SPEC-US-XX.md`.
2. **100% Configurable desde Strapi:** Prohibido hardcodear campos del Paso 1, opciones de `select`, planes, coberturas, beneficios o términos legales en Angular.
3. **Seguridad Strapi:** Ningún token de Strapi con permisos de escritura puede llegar al navegador ni al repositorio. El rol `Public` tiene únicamente permiso `find` sobre `country`, `form-field` e `insurance-plan`.
4. **Datos ficticios:** Usar solo datos ficticios. Prohibido incluir datos personales reales, tarjetas reales o credenciales reales.
5. **Persistencia front-end:** Persistir el estado del cotizador únicamente en el navegador (`sessionStorage` particionado por país). No crear base de datos para cotizaciones ni integrar pasarelas de pago reales.
6. **Accesibilidad y Responsive:** Todo el wizard debe completarse exclusivamente con teclado (`Tab`, `Shift+Tab`, `Enter`, `Space`), con etiquetas accesibles y diseño mobile + desktop.
7. **Trazabilidad obligatoria:** Todo artefacto, test y reporte de review debe enlazar `US-XX → SPEC-US-XX → ADR-XXX → Código → Tests → Review`.

## Equipo de Subagentes y Skills (Claude Code)
- `@spec-analyst` + `spec-gap-checklist` → Analiza historias y redacta `docs/specs/SPEC-US-XX.md`.
- `@architect` + `software-architecture-madr` → Diseña ADRs (`docs/adrs/`) y contratos TypeScript/API.
- `@ui-ux-designer` + `ui-ux-accessibility-system` → Define sistema visual, estados, responsive y accesibilidad WCAG AA.
- `@cms-engineer` + `strapi-5-docker-seed` → Modela Content-Types, permisos mínimos y seed idempotente en `backend/`.
- `@frontend-engineer` + `angular-21-dynamic-forms` → Implementa wizard dinámico, signals y tests unitarios/E2E en `frontend/`.
- `@devops-engineer` + `docker-single-command-ops` → Mantiene `docker-compose.yml`, Dockerfiles, healthchecks y proxy Nginx.
- `@qa-reviewer` + `qa-security-code-review` → Audita código en modo solo lectura y genera `docs/reviews/REVIEW-US-XX.md`.

## Convenciones Técnicas
- TypeScript en modo estricto (`strict: true`, prohibido `any`).
- Funciones puras desacopladas de componentes UI para toda regla de negocio (validaciones, ajuste de precio simulado, enmascaramiento de documento, prevención de doble pago).
- Pruebas unitarias obligatorias para toda lógica relevante y al menos una prueba E2E de flujo completo para un país.
