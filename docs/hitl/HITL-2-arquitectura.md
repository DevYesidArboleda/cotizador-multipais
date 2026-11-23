# HITL-2 — Arquitectura, contrato y guía UI/UX

- **Fecha:** 2026-11-23 · **Revisor humano:** Yesid Arboleda (@DevYesidArboleda)
- **Artefactos revisados (commit `6afc6a4`):** `docs/adrs/ADR-001..003`, `docs/contracts/strapi-contracts.ts`, `docs/specs/UI-UX-GUIDELINES.md`, logs `04` y `05`.
- **Verificación previa del Orquestador:** contrato compila con `tsc --strict` (exit 0); 32 contrastes WCAG recalculados sin diferencias; `trace-check` OK.
- **Canal:** selección explícita en la interfaz de Claude; respuestas transcritas literalmente.
- **Decisión:** `APROBADO`

## Decisiones
| Tema | Propuesta del agente | Decisión humana (literal) |
| :--- | :--- | :--- |
| ADR-001..003 + 4 controles de seguridad nuevos (forzar `published`, revocar rutas públicas de `users-permissions`, admin desde secrets, CORS limitado) + jobs de CI (tsc del contrato, `e2e-postgres`, smoke de seguridad post-deploy) | @architect | **"Apruebo todo"** → ADRs pasan a `Aceptado` |
| K1: arranque en frío de Render (~1 min) vs timeout de 10 s de la spec | @architect: no cambiar la spec | **"Aceptar 'Reintentar'"** → se documenta en README como limitación del plan gratuito |
| 4 refinamientos del contrato (Step1Value como texto; errores de configuración con código; `formatPrice` ok/error; precio separado de validación) | @architect | **"Acepto los 4"** → contrato congelado |
| UI/UX P1 foco vuelve a "Pagar" tras rechazo | @ui-ux-designer | **Aprobado** |
| UI/UX P2 botón "Reintentar" en `config-error` | @ui-ux-designer | **Aprobado** |
| UI/UX P3 `autocomplete` por rol | @ui-ux-designer | **Aprobado** |
| UI/UX P4 marca ficticia "Linde Auto" | @ui-ux-designer | **Aprobado** |
| UI/UX P5-P8 (woff2, stepper derivado, sticky, literales) | @ui-ux-designer | Sin objeción → se implementan tal como están en la guía |

## Siguiente checkpoint
**HITL-2b** (tras Fase 4): `docker compose down -v && docker compose up --build` en la máquina del humano + verificación de permisos Public en el admin.
