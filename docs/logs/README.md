# Evidencia de Sesiones con Agentes (Sin Editar)

La prueba técnica requiere entregar **logs o exportaciones sin editar** de las sesiones con los agentes de IA.

## Cómo exportar sesiones desde Claude Code
1. Dentro de una sesión activa de Claude Code, ejecuta el comando:
   ```text
   /export docs/logs/01-spec-analyst.txt
   ```
2. Alternativamente, puedes copiar los archivos de transcripción crudos (`.jsonl`) que Claude Code guarda automáticamente en:
   - macOS / Linux: `~/.claude/projects/<nombre-del-proyecto>/*.jsonl`
   - Windows: `%USERPROFILE%\.claude\projects\<nombre-del-proyecto>\*.jsonl`

## Convención sugerida de nombres
- `01-specs-y-hitl1.txt`
- `02-arquitectura-y-ux.txt`
- `03-strapi-y-docker.txt`
- `04-angular-us01-us02-us03.txt`
- `05-qa-review-y-correcciones.txt`

> **Regla de seguridad:** Revisa antes de subir a Git que no hayas pegado accidentalmente contraseñas, API keys personales ni datos personales reales dentro del chat.
