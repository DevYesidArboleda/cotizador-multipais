# Guía de Prompts para Operar el Equipo

El Orquestador (sesión principal) despacha cada subagente con un prompt que **siempre** incluye: (1) la ruta **exacta** de su definición en `.claude/agents/` como primera entrada (omitirla ocurrió en el log 04), (2) sus entradas exactas, (3) el entregable y (4) el bloque de Handoff de `CLAUDE.md` §6. Al terminar, el informe se guarda verbatim en `docs/logs/`.

En **Claude Code CLI** los mismos prompts funcionan anteponiendo `@<agente>` (las definiciones de `.claude/agents/` se registran como subagentes).

---

## Fase 2 — Specs v2 (`@spec-analyst`)
```text
Actúa como el subagente definido en .claude/agents/spec-analyst.md y aplica .claude/skills/spec-gap-checklist/SKILL.md.
Entradas (rutas exactas): docs/user-stories/US-01.md, docs/user-stories/US-02.md, docs/user-stories/US-03.md, CLAUDE.md, docs/adrs/ADR-001-multi-country-strategy.md, docs/adrs/ADR-002-docker-and-strapi-security.md, docs/adrs/ADR-003-cicd-and-free-tier-deploy.md, docs/specs/SPEC-US-0{1,2,3}.md.
Reescribe docs/specs/SPEC-US-01.md, -02.md y -03.md al formato v2 (GAP/R/AC con IDs, matriz de verificación, Changelog vs v1).
Marca como "DECISIÓN HUMANA REQUERIDA" los GAP que dependan de criterio de negocio. No escribas código. Termina con el Handoff.
```
**HITL-1:** el humano resuelve los GAP, corrige y registra `docs/hitl/HITL-1-specs.md`.

## Fase 3 — Arquitectura y UX
```text
@architect: revisa ADR-001..003 contra las specs aprobadas, actualízalos (≥3 alternativas reales, fuentes) y genera docs/contracts/strapi-contracts.ts. Handoff.
@ui-ux-designer: genera docs/specs/UI-UX-GUIDELINES.md (tokens con contraste, layout por paso, estados, foco, matriz WCAG 2.2 AA). Handoff.
```
**HITL-2:** `docs/hitl/HITL-2-arquitectura.md`.

## Fase 4 — Backend y plataforma
```text
@cms-engineer: implementa backend/ según strapi-5-docker-seed, contratos y ADRs; arranca Strapi y pega la respuesta real de los 3 endpoints y del POST anónimo. Handoff.
@devops-engineer: ajusta Docker/CI/CD al backend y frontend reales; valida con docker compose config. Handoff.
```
**HITL-2b:** `docker compose down -v && docker compose up --build` en la máquina del humano → `docs/hitl/HITL-2b-plataforma.md`.

## Fase 5 — Frontend (una historia por despacho)
```text
@frontend-engineer: implementa SPEC-US-01 (aprobada) con angular-21-dynamic-forms y UI-UX-GUIDELINES. Tests con IDs en el título. Ejecuta lint, test y build y pega el resultado. Commit con Refs. Handoff.
```
(Repetir para SPEC-US-02 y SPEC-US-03; en US-03 añadir el E2E Playwright del flujo completo.)

## Fase 6 — Review independiente
```text
@qa-reviewer: audita en solo lectura contra las specs aprobadas, ADRs y CLAUDE.md; ejecuta tests, build, E2E y trace-check; escribe REVIEW-US-01..03 y REVIEW-PLATFORM; regenera TRACEABILITY.md. Handoff.
```
**HITL-3:** el humano prioriza hallazgos → `@frontend-engineer`/`@cms-engineer` corrigen → `@qa-reviewer` re-audita y cierra cada `F-` con commit + test.

## Fase 7-8 — CI/CD
Push a `main` → CI → CD. **HITL-4:** smoke post-deploy (`docs/DEPLOY.md` §6).
