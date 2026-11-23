---
name: traceability-matrix
description: Procedimiento y script para verificar automáticamente la cadena US → SPEC (R-/AC-) → ADR → código → tests → review, y regenerar docs/TRACEABILITY.md. Úsala al cerrar cada fase, en code review y en CI.
---

# Skill: Matriz de Trazabilidad Verificable

## Por qué existe
La trazabilidad declarada a mano se desactualiza. Esta skill la convierte en un **check ejecutable**: si una regla aprobada no tiene test, o un hallazgo no tiene cierre, el pipeline falla.

## Cómo funciona `scripts/trace-check.mjs`
1. Lee `docs/specs/SPEC-US-*.md` y extrae IDs `R-xx.n` y `AC-xx.n` definidos en tablas/encabezados.
2. Busca esos IDs en títulos de tests (`frontend/src/**/*.spec.ts`, `frontend/e2e/**/*.spec.ts`).
3. Lee `docs/reviews/REVIEW-*.md` y extrae hallazgos `F-xx.n` con su estado.
4. Verifica que cada spec referencie al menos un ADR existente en `docs/adrs/`.
5. Reglas de fallo (exit 1):
   - Spec en estado `Aprobado` **y en implementación** (algún test ya cita uno de sus IDs) con `R-`/`AC-` sin test. Antes de que la historia entre en implementación es advertencia, porque las historias se implementan una a una (ajuste de Fase 5).
   - Hallazgo `BLOCKER`/`MAJOR` en estado distinto de `RESUELTO` o `ACEPTADO`.
   - Spec que referencia un ADR inexistente.
6. `--write` regenera `docs/TRACEABILITY.md` (tabla ID → spec → tests → hallazgos).

## Uso
```bash
node scripts/trace-check.mjs          # verificación (CI)
node scripts/trace-check.mjs --write  # regenera la matriz
```

## Convenciones que el script asume (definidas en CLAUDE.md §4)
- Títulos de tests: `it('[R-01.3][AC-01.2] descripción', ...)`.
- Hallazgos en tablas de review: `| **F-01.2** | \`MAJOR\` | ... | RESUELTO — ... |`.
