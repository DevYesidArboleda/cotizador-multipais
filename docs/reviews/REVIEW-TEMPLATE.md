# Code Review — US-XX (Título)

- **Fecha:** YYYY-MM-DD
- **Revisor:** `@qa-reviewer` (Claude Code) + Validación Humana (HITL-3)
- **Trazabilidad:** `US-XX` → `docs/specs/SPEC-US-XX.md` → `docs/adrs/ADR-001.md`
- **Resultado inicial:** `CAMBIOS REQUERIDOS` | `APROBADO`
- **Resultado final:** `APROBADO`

## Verificación de Suite de Pruebas
- **Unit tests:** `PASS / FAIL` (comando ejecutado y conteo de casos)
- **E2E tests:** `PASS / FAIL`
- **Lint / Build:** `PASS / FAIL`

## Auditoría Rápida de Cumplimiento
- [ ] Cumple todos los escenarios Gherkin de `SPEC-US-XX.md`
- [ ] Angular 21+ moderno (standalone, signals, `@if`/`@for`, sin `NgModules`)
- [ ] Cero tokens de escritura de Strapi en navegador o bundle
- [ ] Permisos del rol `Public` mínimos y justificados
- [ ] Navegación 100% por teclado y labels accesibles
- [ ] Responsive verificado en mobile y desktop

## Hallazgos

| ID | Severidad | Archivo / Línea | Descripción del hallazgo | Acción correctiva | Estado y Evidencia |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **F-01** | `BLOCKER` | `frontend/src/...` | *(Ejemplo: El pago permite doble envío al presionar Enter repetidamente)* | *(Bloquear en servicio + señal `isProcessing` + test unitario)* | `RESUELTO` — Commit `abc1234` / Test `payment.service.spec.ts` |

## Intervención Humana (HITL-3)
- **Decisión del humano:** *(Qué hallazgos priorizaste, qué ajustaste manualmente o qué le corregiste al agente)*
