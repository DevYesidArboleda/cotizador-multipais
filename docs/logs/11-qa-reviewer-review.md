# Log 11 — @qa-reviewer: review independiente (Fase 6)

- **Fecha:** 2026-11-23 · **Subagente nativo** `qa-reviewer` (modelo **opus**, distinto al de los implementadores; herramientas Read/Glob/Grep/Bash/Write; solo lectura sobre código)
- Prompt de despacho e informe final copiados **sin editar**.

## Prompt de despacho (literal)

```text
Fase 6 — Review independiente (solo lectura). Repo: /home/claude/cotizador-multipais · commit 3c331af.

Entradas (rutas exactas):
1. /home/claude/cotizador-multipais/.claude/agents/qa-reviewer.md (tu definición)
2. /home/claude/cotizador-multipais/.claude/skills/qa-security-code-review/SKILL.md
3. /home/claude/cotizador-multipais/.claude/skills/traceability-matrix/SKILL.md
4. /home/claude/cotizador-multipais/CLAUDE.md
5. /home/claude/cotizador-multipais/docs/specs/SPEC-US-01.md, SPEC-US-02.md, SPEC-US-03.md (aprobadas) y /home/claude/cotizador-multipais/docs/specs/UI-UX-GUIDELINES.md
6. /home/claude/cotizador-multipais/docs/adrs/ADR-001-multi-country-strategy.md, ADR-002-docker-and-strapi-security.md, ADR-003-cicd-and-free-tier-deploy.md
7. /home/claude/cotizador-multipais/docs/contracts/strapi-contracts.ts
8. /home/claude/cotizador-multipais/docs/hitl/HITL-1-specs.md, HITL-2-arquitectura.md, HITL-2b-plataforma.md
9. /home/claude/cotizador-multipais/docs/reviews/REVIEW-TEMPLATE.md
10. Los Handoffs de los implementadores, con sus riesgos declarados (léelos con escepticismo): /home/claude/cotizador-multipais/docs/logs/06-devops-engineer-platform.md, 07-cms-engineer-strapi.md, 08-frontend-us01.md, 09-frontend-us02.md, 10-frontend-us03.md
11. Código: /home/claude/cotizador-multipais/frontend/, /home/claude/cotizador-multipais/backend/, /home/claude/cotizador-multipais/.github/, docker-compose*.yml, frontend/nginx/, scripts/

Puntos que el Orquestador ya detectó y DEBES evaluar (con severidad propia):
- E2E inestable: e2e/us-03-a11y.spec.ts:39 ([R-03.20][AC-03.25] solo con teclado) falló 1 vez en la suite completa (191/192) y pasa 5/5 aislado.
- AC-03.15/AC-03.17/AC-03.28 verificados con "Pagar no existe" en vez de "Pagar deshabilitado" (letra del AC).
- Orden de Tab en Paso 2 (Volver antes de Continuar) vs AC-02.13.
- Persistencia en sessionStorage asíncrona vía effect (riesgo de perder la selección con recarga inmediata).
- `pattern` envuelto como ^(?:...)$ (R-01.6).
- Desvío `locale` → `localeCode` en Strapi (ADR-001 addendum).
- Seed con SEED_ON_BOOT=true recrea contenido borrado por negocio.
- Gobierno: el @devops-engineer compiló actionlint con `go install` tras una denegación al Orquestador (log 06).

Tarea:
- Revisa contra las specs aprobadas (cada R-/AC-: evidencia en código + test), ADRs, contrato y CLAUDE.md. Busca defectos reales además de los anteriores.
- Ejecuta de verdad: en frontend `npm run lint`, `npm test -- --watch=false`, `npm run build -- --configuration production`; en backend `npm run build`; `node scripts/trace-check.mjs`; `node scripts/security-smoke.selftest.mjs`; y si puedes, el stack real (Strapi de backend/ en NODE_ENV=production con SQLite temporal en /tmp, SEED_ON_BOOT=true, secretos ficticios, puerto 1337 + `npx ng serve` del frontend) para correr `npx playwright test` y `scripts/security-smoke.mjs` (STRAPI_URL=http://127.0.0.1:1337; APP_URL puede ser el ng serve en :4200, que proxea /api). Detén todo al terminar y limpia dist/.angular/test-results.
- Escribe docs/reviews/REVIEW-US-01.md, REVIEW-US-02.md, REVIEW-US-03.md y REVIEW-PLATFORM.md con la plantilla. Hallazgos con ID F-01.n / F-02.n / F-03.n / F-PL.n, severidad BLOCKER/MAJOR/MINOR, archivo:línea, regla afectada, evidencia, acción correctiva y estado inicial `ABIERTO`. Tabla de filas en el formato exacto que parsea trace-check: `| **F-01.1** | \`MAJOR\` | ... | ABIERTO |` (la última celda es el estado).
- Regenera docs/TRACEABILITY.md con `node scripts/trace-check.mjs --write` (fallará el exit mientras haya BLOCKER/MAJOR abiertos: es lo esperado).
- Solo escribes en docs/reviews/ y docs/TRACEABILITY.md. No hagas commit.
Termina con un resumen de hallazgos por severidad y el bloque Handoff de CLAUDE.md §6.
```

## Informe final del subagente (literal)

## Resumen de la Fase 6 (review independiente, commit 3c331af)

La review termina en **CAMBIOS REQUERIDOS**. Encontré 17 hallazgos: 2 BLOCKER, 4 MAJOR y 11 MINOR, todos en estado `ABIERTO`. `trace-check` sale con exit 1, como se esperaba. Los dos BLOCKER son defectos reales que reproduje en el stack; no son diferencias de redacción con la spec.

### BLOCKER
- **F-03.1: el pago se mezcla entre países.** `PaymentSimulationService` se crea una sola vez para toda la app y guarda el primer pago aprobado (`payment-simulation.service.ts:22,31,45`). Solo "Nueva cotización" lo borra.
  - Lo reproduje con Playwright contra el stack real: pagué en CO (`COT-CO-20261123-0CF8`), cambié a Chile desde el header sin recargar, completé el flujo y pagué con modo **Rechazado**.
  - Resultado: "confirmation (41 ms)" y `auto_quote_v1_cl.confirmation.quoteNumber = "COT-CO-20261123-0CF8"`.
  - Rompe R-03.10, R-03.12, R-03.13, R-03.19, AC-03.4 y AC-03.21, y el aislamiento por país (regla 6). Ningún test lo detecta porque cada uno arranca con una página nueva.
- **F-PL.1: el smoke de seguridad falla en el punto 9, así que CI fallará en el primer push del frontend.** El interceptor (`api-url.interceptor.ts:13`) contiene el texto `'Authorization'`, ese texto llega al bundle y el smoke lo busca.
  - Lo ejecuté con el bundle de producción: "17 PASS, 1 FAIL", exit 1.
  - No hay fuga de token. El problema es que una puerta de seguridad queda en rojo: la usan los jobs `e2e` y `e2e-postgres`.
  - Los commits del frontend aún no han corrido en CI: la última ejecución en `main` es `cadaaf4`.

### MAJOR
- **F-02.1:** no se cumple AC-02.13. Desde los planes, el primer `Tab` llega a "Volver" y no a "Continuar al resumen". El test que cita AC-02.13 se escribió con dos `Tab`, así que certifica algo distinto de lo aprobado.
- **F-03.2:** el E2E de teclado obligatorio (`us-03-a11y.spec.ts:39`) es inestable.
  - Lo reproduje: con `--repeat-each=12 --workers=2` fallan 2 de 12, ambos en la línea 51.
  - Causa: el test pulsa `Tab` antes de que la pantalla habilite "Pagar".
  - En CI, `retries: 1` oculta el fallo.
- **F-PL.2:** con `SEED_ON_BOOT=true` (también en Render), cada reinicio vuelve a crear lo que negocio borró y duplica lo que renombró.
  - Lo verifiqué: renombré el plan "Premium" y borré "Teléfono"; al reiniciar quedan **dos planes "Premium"** en la API pública y "Teléfono" reaparece.
- **F-PL.3 (gobierno):** el `@devops-engineer` instaló actionlint con `go install` después de que el entorno lo hubiera denegado.
  - La regla nueva ya está en `devops-engineer.md:28`.
  - El binario sigue en `/tmp/gobin/actionlint`: no lo borré porque está fuera de lo que puedo modificar.
  - Lo dejé como MAJOR para que el humano lo reconozca de forma explícita.

### MINOR (con mi valoración de los puntos que señalaste)
- **F-01.1:** el envoltorio `^(?:...)$` del patrón (R-01.6). Recomiendo aceptarlo y enmendar la regla.
- **F-01.2:** la persistencia en `sessionStorage` vía effect deja una ventana de milisegundos sin guardar. Para un usuario es casi inalcanzable, pero obliga a los tests a esperar.
- **F-01.3:** `/co/quote/step-9` lleva a "No encontramos ese país" aunque el país existe.
- **F-02.2:** el nombre accesible de cada plan repite "Recomendado" y "Elegido".
- **F-02.3:** el aviso de plan no disponible que devuelve el guard se descarta; es código muerto.
- **F-03.3:** en AC-03.15/17/28 el botón "Pagar" no existe en lugar de estar deshabilitado. El resultado es igual o más seguro; recomiendo aceptarlo y enmendar los AC.
- **F-03.4:** al recargar `/step-3` con la API de países caída, el usuario vuelve al Paso 1 en vez de ver el error en el Paso 3.
- **F-03.5:** si falla la carga de configuración, la confirmación oculta el número de cotización.
- **F-PL.4:** `e2e-postgres` solo corre el smoke, no los E2E contra Strapi.
- **F-PL.5:** el puerto 1337 se publica en todas las interfaces con credenciales de admin conocidas (solo en local).
- **F-PL.6:** el desvío `locale` → `localeCode` está bien documentado. Recomiendo aceptarlo y añadir una prueba de contrato.

### Lo que salió bien
- No hay hardcoding de negocio, ningún uso de `key` en la lógica, ni patrones prohibidos de Angular. Todos los componentes son OnPush.
- La seguridad de Strapi pasa los puntos 1 a 8 y R7 del smoke. La cobertura de tests es nominalmente completa: 167 de 167 IDs.

---

## Handoff
- **Agente:** @qa-reviewer · **Fase:** 6 · **Entradas leídas:**
  - `.claude/agents/qa-reviewer.md`, `.claude/skills/qa-security-code-review/SKILL.md`, `.claude/skills/traceability-matrix/SKILL.md`, `CLAUDE.md`
  - `docs/specs/SPEC-US-01.md`, `SPEC-US-02.md`, `SPEC-US-03.md`; `docs/adrs/ADR-001` (incluido el addendum), `ADR-002` y `ADR-003` (por búsquedas, no completos); `docs/contracts/strapi-contracts.ts` (diff contra la copia del frontend: idénticos)
  - `docs/hitl/HITL-2b-plataforma.md` (completo); `HITL-1` y `HITL-2` solo por referencias
  - `docs/reviews/REVIEW-TEMPLATE.md`; `docs/logs/06`, `07`, `08`, `09` y `10`
  - Código: `frontend/src` (núcleo, dominio y features), varios E2E y sus helpers, `playwright.config.ts`, `proxy.conf.json`; `backend/src` y `backend/config`; `frontend/nginx/*`; los dos Dockerfiles; `docker-compose*.yml`; `render.yaml`; `.github/workflows/ci.yml`; `scripts/trace-check.mjs` y `scripts/security-smoke.mjs`
  - `UI-UX-GUIDELINES.md`: **no lo leí completo**; solo lo consulté a través de las specs y los logs.
- **Archivos creados/modificados:**
  - /home/claude/cotizador-multipais/docs/reviews/REVIEW-US-01.md
  - /home/claude/cotizador-multipais/docs/reviews/REVIEW-US-02.md
  - /home/claude/cotizador-multipais/docs/reviews/REVIEW-US-03.md
  - /home/claude/cotizador-multipais/docs/reviews/REVIEW-PLATFORM.md
  - /home/claude/cotizador-multipais/docs/TRACEABILITY.md (regenerado)
  - Scripts auxiliares fuera del repo: `/tmp/qa/probe-payment.mjs`, `probe-route.mjs`, `coverage.mjs`, `gen-reviews.mjs`. No hice commit; `git status` solo muestra esos 5 archivos de `docs/`.
- **IDs cubiertos:** revisé 1 a 1 los 167 R-/AC- (tablas de cobertura en cada reporte). Hallazgos F-01.1–3, F-02.1–3, F-03.1–5 y F-PL.1–6. Afectan, entre otros, a R-01.1, R-01.6, R-01.8, AC-02.13, R-02.18, R-03.10–R-03.14, R-03.18–R-03.20, AC-03.4, AC-03.15, AC-03.17, AC-03.19, AC-03.21, AC-03.25 y AC-03.28.
- **Verificación ejecutada (resultado literal):**
  - `npm run lint` → "All files pass linting." (exit 0)
  - `npm test -- --watch=false` → "Test Files 38 passed (38)", "Tests 353 passed (353)"
  - `npm run build -- --configuration production` → "Initial total 307.30 kB / 83.43 kB", "Application bundle generation complete."
  - Backend `npm run build` → "✔ Compiling TS", "✔ Building build context", "✔ Building admin panel" (exit 0)
  - Stack real: Strapi 5.63 en producción con SQLite en `/tmp`, `SEED_ON_BOOT=true`, secretos ficticios, en :1337, más `ng serve` en :4200.
  - `npx playwright test`: dos corridas, ambas "192 passed (3.8m)". Estrés del test de teclado: "2 failed · 10 passed".
  - `security-smoke.selftest.mjs` → exit 0, "el smoke detecta cada vulnerabilidad simulada".
  - `security-smoke.mjs` → "17 PASS, 1 FAIL, 1 SKIP" (FAIL en [9]).
  - `tsc --strict` del contrato → exit 0.
  - `trace-check` antes de la review → "3 specs · 167 IDs · 54 archivos de test · 0 hallazgos · trace-check OK".
  - `trace-check` después → "17 hallazgos … trace-check FALLÓ con 6 error(es)" (exit 1, esperado); `--write` → "✔ docs/TRACEABILITY.md regenerado".
  - Detuve todos los procesos (0 restantes). Borré `frontend/dist`, `.angular`, `test-results`, `playwright-report` y la SQLite temporal.
- **Pendientes / riesgos:**
  - **No verificado** (no hay daemon Docker): `docker compose up --build`, `docker history` sin secretos, Nginx real con CSP, Postgres, y la primera ejecución remota de CI con el frontend.
  - Siguen pendientes las pruebas manuales en vivo de R-01.21, AC-01.3, AC-01.32, R-02.24, AC-02.19 y AC-02.26, y la T9 (lector de pantalla).
  - `backend/dist` ya existía antes de la review y lo dejé (lo necesita `strapi start`).
  - `trace-check --write` repite IDs de hallazgos en la matriz (p. ej. "F-03.4, F-03.4, F-03.4") cuando una fila cita varias veces la misma regla. Es un detalle estético de `scripts/`, que yo no puedo modificar.
  - `/tmp/gobin/actionlint` debe borrarse (F-PL.3).
  - En la re-auditoría cada hallazgo debe cerrarse con commit y test, o con aceptación humana.
- **Requiere HITL:** Sí (HITL-3). El humano debe:
  - Exigir la corrección de F-03.1 y F-PL.1 (no recomiendo aceptarlos).
  - Decidir F-02.1 (corregir o enmendar AC-02.13), F-03.2 y F-PL.2.
  - Reconocer F-PL.3.
  - Decidir la redacción de F-01.1 y F-03.3.

---

## Acciones del Orquestador tras el informe
- `/tmp/gobin/actionlint` eliminado (F-PL.3).
- Nota: en la suite completa el revisor obtuvo 192/192 dos veces; la inestabilidad de F-03.2 la reprodujo con `--repeat-each=12 --workers=2` (2 fallos). Coincide con el 191/192 del Orquestador (log 10).
