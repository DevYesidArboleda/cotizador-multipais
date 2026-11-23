# Evidencia de Sesiones con Agentes (Sin Editar)

## Cómo se capturan en este proyecto
| Fuente | Cómo se guarda | Archivos |
| :--- | :--- | :--- |
| **Orquestador** (sesión principal con el humano) | Mensajes del humano y respuestas del orquestador copiados literalmente al cerrar cada fase; además el humano exporta la conversación completa desde la app (Compartir/Exportar) y la adjunta aquí. | `00-orquestador-*.md`, `orquestador-export.*` |
| **Subagentes** | El prompt de despacho y el informe final del subagente se guardan **verbatim** (sin editar) por el orquestador apenas el subagente termina. | `NN-<agente>-<fase>.md` |
| **Claude Code CLI** (si el flujo se reproduce en terminal) | `/export docs/logs/<nombre>.txt` o copia de `~/.claude/projects/<proyecto>/*.jsonl` | `cli-*.txt` / `*.jsonl` |

## Convención de nombres
`NN-<agente>-<fase>.md` — p. ej. `02-spec-analyst-specs-v2.md`, `06-qa-reviewer-review-us01.md`.

> **Regla de seguridad:** antes de commitear, revisar que no haya contraseñas, tokens ni datos personales reales.
