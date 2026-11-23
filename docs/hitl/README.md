# Registro de Intervención Humana (HITL)

Cada checkpoint deja un registro **escrito por la persona** (no por un agente). Es la evidencia de que el humano revisó, corrigió o rechazó la salida de los agentes.

| Checkpoint | Cuándo | Qué se revisa | Aprueba si… | Rechaza si… | Archivo |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **HITL-1** | Tras `@spec-analyst` | `SPEC-US-01..03` | Toda regla es medible, cada `R-`/`AC-` tiene test planificado, los `GAP-` con decisión humana están resueltos | Regla ambigua, vacío sin decidir, contradicción con `CLAUDE.md` | `HITL-1-specs.md` |
| **HITL-2** | Tras `@architect` + `@ui-ux-designer` | ADRs, contratos, guía UI/UX | ≥ 3 alternativas reales por ADR, contratos cubren todas las reglas, permisos justificados | Alternativa de paja, consecuencia sin mitigación, contrato incompleto | `HITL-2-arquitectura.md` |
| **HITL-2b** | Tras `@cms-engineer` + `@devops-engineer` | Strapi admin, permisos, `docker compose up` | Arranque limpio, Public solo `find`, seed CO/CL visible | Escritura anónima posible, arranque manual, secretos en imagen | `HITL-2b-plataforma.md` |
| **HITL-3** | Tras `@qa-reviewer` | Hallazgos `F-` y su cierre | 0 `BLOCKER`/`MAJOR` abiertos, prueba manual de teclado y "cambio sin deploy" OK | Hallazgo sin evidencia de cierre, test rojo | `HITL-3-review.md` |
| **HITL-4** | Tras CD | Despliegue en Render | Smoke test post-deploy OK | Smoke falla o expone `/admin` vía frontend | `HITL-4-deploy.md` |

**Ante un rechazo:** se anota el motivo, el Orquestador re-despacha al mismo subagente con el feedback literal, y la nueva versión registra el cambio en su `Changelog`.

Plantilla: [`HITL-TEMPLATE.md`](./HITL-TEMPLATE.md)
