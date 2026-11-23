# Guía de Prompts para Operar el Equipo en Claude Code

Abre una terminal en la raíz del repositorio y ejecuta `claude`. Usa estos prompts en orden respetando los checkpoints humanos (**HITL**).

> **Importante:** Al terminar cada fase, ejecuta `/export` en Claude Code (o copia el archivo `.jsonl` sin editar desde `~/.claude/projects/`) y guárdalo en `docs/logs/` (ej. `docs/logs/01-specs-session.txt`).

---

## Fase 1 — Validación y refinamiento de Specs (Analista)
```text
Usa el subagente @spec-analyst con la skill spec-gap-checklist.
Revisa docs/specs/SPEC-US-01.md, SPEC-US-02.md y SPEC-US-03.md frente al enunciado de la prueba técnica.
Identifica si falta algún caso borde de validación para Colombia o Chile, accesibilidad o estado de error. No escribas código aún.
```
**Checkpoint HITL 1:** Lee las specs, haz al menos 1–2 correcciones reales según tu criterio de negocio y aprueba.

---

## Fase 2 — Arquitectura, Contratos y Diseño UI/UX
```text
1) Usa @architect con software-architecture-madr para revisar docs/adrs/ADR-001 y ADR-002 y generar los contratos TypeScript compartidos en docs/contracts/strapi-contracts.ts.
2) Usa @ui-ux-designer con ui-ux-accessibility-system para generar docs/specs/UI-UX-GUIDELINES.md cubriendo los 3 pasos del wizard, mobile/desktop y navegación 100% por teclado.
```
**Checkpoint HITL 2:** Aprueba contratos y lineamientos visuales antes de iniciar la implementación.

---

## Fase 3 — Infraestructura Docker + Backend Strapi 5
```text
Usa @cms-engineer con strapi-5-docker-seed para inicializar Strapi 5 en backend/ con:
- Content-Types: Country, FormField (con componente repetible para options) e InsurancePlan.
- Bootstrap idempotente que cree datos semilla ficticios para Colombia (co) y Chile (cl), incluyendo un plan recomendado y un plan inactivo para pruebas.
- Permisos del rol Public limitados estrictamente a find sobre las 3 colecciones.
Luego usa @devops-engineer con docker-single-command-ops para verificar backend/Dockerfile y docker-compose.yml.
```
**Verificación humana:** Corre `docker compose up --build strapi` y prueba `GET http://localhost:1337/api/form-fields?filters[country][code][$eq]=co&populate=options&sort=order:asc`.

---

## Fase 4 — Frontend Angular 21+ (por Historia de Usuario)
Ejecuta historia por historia para mantener trazabilidad limpia:

```text
Usa @frontend-engineer con angular-21-dynamic-forms y docs/specs/UI-UX-GUIDELINES.md.
Inicializa Angular 21+ (standalone, signals, @if/@for, sin NgModules) en frontend/ e implementa SPEC-US-01 con sus pruebas unitarias para DynamicFormBuilderService y validadores (legal_age, vehicle_year_range, cl_rut).
```

```text
Usa @frontend-engineer para implementar SPEC-US-02 (listado de planes por país, moneda COP/CLP, PricingService con la regla documentada, plan recomendado, selección única, estado vacío) y sus pruebas unitarias.
```

```text
Usa @frontend-engineer para implementar SPEC-US-03 (resumen con documento enmascarado, T&C desde Strapi por país, bloqueo doble envío, pago simulado exitoso y rechazado sin perder datos), pruebas unitarias y una prueba E2E completa con Playwright para Colombia o Chile.
```

---

## Fase 5 — Code Review Independiente y Cierre
```text
Usa @qa-reviewer con qa-security-code-review.
Audita backend/ y frontend/ contra SPEC-US-01, SPEC-US-02, SPEC-US-03, ADR-001, ADR-002 y CLAUDE.md.
Ejecuta los tests unitarios y E2E, verifica ausencia de tokens de escritura y accesibilidad por teclado, y escribe tus hallazgos en docs/reviews/REVIEW-US-01.md, REVIEW-US-02.md y REVIEW-US-03.md sin editar código fuente.
```
**Checkpoint HITL 3:** Pide a `@frontend-engineer` o `@cms-engineer` corregir todos los hallazgos `BLOCKER` y `MAJOR`, vuelve a correr `@qa-reviewer` para marcar cada hallazgo como `RESUELTO` con trazabilidad al commit/test.
