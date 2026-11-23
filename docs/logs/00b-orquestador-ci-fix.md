# Log 00b — Orquestador: primer run de GitHub Actions fallido y corrección

- **Fecha:** 2026-11-23 14:50 · **Herramienta:** Claude (Opus) como Orquestador

## [Humano] 14:50 (literal)
> como puedo corregir guiame en esto, ahora veo que estan fallando algunos procesos en en git hub actions, dime de que forma te puedo ayudar
>
> ten en cuenta las reglas que expone el pdf que esa es la base para el desarrollo, ademas lo que ya se ha montado

*(Adjuntó 2 capturas: lista de 14 runs con 8 PRs de Dependabot en rojo, y el run #1 de `ci.yml` sobre `c71d390` con la anotación de error).*

Anotación de GitHub (transcrita de la captura):
```
Invalid workflow file: .github/workflows/ci.yml#L1
(Line: 45, Col: 9): Unrecognized function: 'hashFiles'. Located at position 1 within expression: hashFiles('frontend/package.json') != '',
(Line: 69, Col: 9): Unrecognized function: 'hashFiles'. Located at position 1 within expression: hashFiles('backend/package.json') != '',
(Line: 89, Col: 9): Unrecognized function: 'hashFiles'. Located at position 1 within expression: hashFiles('frontend/e2e/**') != ''
```

## Diagnóstico del Orquestador
1. **Causa raíz (error del agente):** `hashFiles()` no está disponible en `jobs.<id>.if`; solo en pasos. El workflow completo era inválido, por eso todos los runs (incluidos los de Dependabot) fallaron en ~0 s.
2. **Por qué no se detectó antes:** la política del entorno denegó ejecutar `actionlint` (binario descargado) y también instalar `check-jsonschema`; la validación quedó en "YAML parsea", que no detecta errores de expresiones.
3. **Ruido de Dependabot:** 8 PRs individuales al habilitar el repo; dos proponen `node:26-alpine` (no LTS; Strapi 5 soporta solo LTS).

## Corrección aplicada
- `ci.yml`: job `detect` con outputs `frontend`/`backend`/`e2e`; jobs condicionados con `needs.detect.outputs.*`; escrituras a `$GITHUB_OUTPUT` agrupadas; actionlint vía imagen oficial `rhysd/actionlint` (incluye shellcheck).
- `cd.yml`: contextos `${{ }}` movidos a `env:` en scripts (evita inyección y avisos de shellcheck).
- `dependabot.yml`: PRs agrupados por ecosistema, límite de PRs abiertos, ignorar *majors* de Node/Angular/Strapi.
- Lección añadida a `.claude/agents/devops-engineer.md` (punto 4) y a `FLOW.md` §Reflexiones-2.

## Verificación
- `grep hashFiles .github/` → sin coincidencias; YAML parsea.
- **No verificado localmente con actionlint** (denegado en el entorno) → la verificación es el próximo run de Actions, revisado por el humano.
