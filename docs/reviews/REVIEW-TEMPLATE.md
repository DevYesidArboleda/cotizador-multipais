# Code Review — US-XX (Título)

- **Fecha:** YYYY-MM-DD
- **Revisor:** `@qa-reviewer` (modelo: opus) + validación humana (HITL-3)
- **Alcance:** commits `<sha_inicio>..<sha_fin>`
- **Trazabilidad:** `US-XX` → `SPEC-US-XX vN` → `ADR-00X` → código → tests
- **Resultado inicial:** `CAMBIOS REQUERIDOS` | `APROBADO`
- **Resultado final:** `APROBADO` | `PENDIENTE`

## Ejecución real de la suite
| Comando | Resultado literal |
| :--- | :--- |
| `npm test -- --watch=false` | |
| `npm run build` | |
| `npx playwright test` | |
| `node scripts/trace-check.mjs` | |

## Cobertura de la spec
| ID | Evidencia en código | Test | Estado |
| :--- | :--- | :--- | :--- |
| R-XX.1 | `archivo.ts:12` | `x.spec.ts › [R-XX.1] ...` | OK / Falta |

## Hallazgos
| ID | Severidad | Archivo / Línea | Regla afectada | Descripción | Acción correctiva | Estado y evidencia |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **F-XX.1** | `MAJOR` | `frontend/src/...:NN` | R-XX.n | ... | ... | `ABIERTO` |

## Intervención humana (HITL-3)
- **Decisión:** ...
