# Log 14 — Ronda de correcciones HITL-3: @frontend-engineer

- **Fecha:** 2026-11-23 · continuado con SendMessage · en paralelo con @cms-engineer, @devops-engineer y @spec-analyst
- Mensajes e informe copiados **sin editar**.

## Mensaje de despacho (literal)

```text
Ronda de correcciones HITL-3 (frontend). Commit base 78f2ec1. Lee primero (rutas exactas): /home/claude/cotizador-multipais/docs/hitl/HITL-3-review.md (decisiones humanas vinculantes), /home/claude/cotizador-multipais/docs/reviews/REVIEW-US-01.md, /home/claude/cotizador-multipais/docs/reviews/REVIEW-US-02.md, /home/claude/cotizador-multipais/docs/reviews/REVIEW-US-03.md, /home/claude/cotizador-multipais/docs/reviews/REVIEW-PLATFORM.md (solo F-PL.1 y F-PL.6).

Corrige en frontend/ (solo ahí) estos hallazgos, cada uno con un test de regresión cuyo título cite el ID del hallazgo y la regla (p. ej. it('[F-03.1][R-03.19] ...')):
- F-03.1 (BLOCKER): aislamiento del estado de pago por país; incluye un E2E que reproduzca exactamente el escenario del revisor (pagar CO, cambiar a CL sin recargar, pagar Rechazado → debe mostrarse rechazo y ningún número de CO).
- F-PL.1 (BLOCKER): que el bundle de producción no contenga el literal que dispara el punto [9] del smoke, sin debilitar el smoke ni la protección (no toques scripts/). Verifica con `SMOKE_BUNDLE_DIR=frontend/dist/frontend/browser node scripts/security-smoke.mjs` contra tu stack.
- F-03.2 (MAJOR): estabiliza el E2E de teclado esperando el estado habilitado de forma determinista (sin sleeps arbitrarios); prueba con `--repeat-each=12 --workers=2` → 12/12.
- F-02.1 (MAJOR): el primer Tab desde el grupo de planes llega a "Continuar al resumen" (AC-02.13), manteniendo orden DOM = orden visual (reubica el botón visualmente si hace falta) y corrige el test para que haga un solo Tab.
- MINOR: F-01.2, F-01.3, F-02.2, F-02.3, F-03.4, F-03.5 según la acción correctiva de cada reporte; F-PL.6: un E2E-S que verifique que la respuesta pública de /api/countries expone `locale` (contrato) para co y cl.
Puertos: usa Strapi en 1337 y ng serve en 4200 (otros agentes usan puertos distintos). Verificación obligatoria (salida literal): lint, unit, build prod, trace-check (los IDs nuevos de hallazgo no deben romperlo), E2E completo contra el stack real (todo en verde) y el smoke con SMOKE_BUNDLE_DIR (0 FAIL). Detén procesos y limpia. No hagas commit ni edites docs/reviews/. Termina con el Handoff de CLAUDE.md §6 indicando, por hallazgo, archivo modificado y test que lo prueba.
```

## Mensajes complementarios del Orquestador durante la ronda (literal)

```text
Tarea adicional en esta misma ronda (hallazgo del Orquestador al verificar F-PL.4): el job e2e-postgres de CI ahora ejecuta `npx playwright test --grep @strapi`, siguiendo la convención que documenta el comentario de frontend/playwright.config.ts ("E2E-S (`@strapi` en el título)"). Pero `grep -rl "@strapi" frontend/e2e` devuelve 0 archivos: ningún test aplica la convención y ese job fallaría con "No tests found". Añade la etiqueta `@strapi` al título de TODOS los E2E-S (los que leen el Strapi sembrado, sin page.route), sin tocar los E2E-M. Incluye en tu verificación final: `npx playwright test --grep @strapi --list | tail -1` (número de tests > 0) y que `--grep-invert @strapi` liste solo E2E-M. Repórtalo en el Handoff como F-PL.4 (complemento).

Complemento menor (F-01.1, aceptado en HITL-3 y ya enmendado en SPEC-US-01 v3.1): añade un test unitario `[F-01.1][R-01.6] patrón sin anclas exige coincidencia completa` (con `[0-9]{6}`: `123456` válido, `abc123456` inválido). Inclúyelo en tu Handoff.
```

## Informe (literal)

## Handoff
- **Agente:** @frontend-engineer · **Fase:** 5 (ronda de correcciones HITL-3, base 78f2ec1) · **Entradas leídas:** docs/hitl/HITL-3-review.md, docs/reviews/REVIEW-US-01.md, REVIEW-US-02.md, REVIEW-US-03.md, REVIEW-PLATFORM.md (F-PL.1 y F-PL.6), más los mensajes del coordinador sobre @strapi y F-01.1.
- **Archivos modificados:** solo bajo /home/claude/cotizador-multipais/frontend/. No toqué scripts/, docs/ ni backend/, y no hice commit. (Los otros cambios que muestra `git status` son de otros agentes.)
- **Por hallazgo (archivo, test que lo prueba):**
  - **F-03.1 (BLOCKER).** `src/app/domain/payment/payment-simulation.service.ts`: la memoización de `approved` y la promesa en vuelo ahora se guardan por país, y `reset(country?)` limpia solo ese país. También `features/confirmation/confirmation.component.ts`, que llama `reset(country)`. Tests: `payment-simulation.service.spec.ts` › `[F-03.1][R-03.13][R-03.19]` (en cl tras aprobar en co, nueva simulación con COT-CL), `[F-03.1][R-03.12]` (rechazado en cl rechaza y espera la latencia), `[F-03.1][R-03.11]` y `[F-03.1][R-03.15]`. E2E: `e2e/us-03-payment.spec.ts` › `[F-03.1][R-03.19][R-03.12] pagar CO, cambiar a CL por el header sin recargar y pagar con Rechazado...`: verifica alerta de rechazo, ningún número de CO en el DOM ni en auto_quote_v1_cl, y luego un aprobado con COT-CL.
  - **F-PL.1 (BLOCKER).** `core/http/api-url.interceptor.ts`: eliminado el literal `Authorization` (la app nunca añade esa cabecera y Nginx ya la anula). Test: `core/http/api-url.interceptor.spec.ts` › `[F-PL.1][R-01.23]`. Verificado contra el stack: grep del bundle de producción con el patrón del smoke da 0 archivos, y `SMOKE_BUNDLE_DIR=frontend/dist/frontend/browser node scripts/security-smoke.mjs` da "18 PASS, 0 FAIL, 1 SKIP" (el [9] pasa; el SKIP es gitleaks) y "security-smoke: OK".
  - **F-03.2 (MAJOR).** `e2e/us-03-a11y.spec.ts` y `e2e/full-flow-co.spec.ts`: esperan el foco del h1, la región de términos visible y `payButton toBeEnabled()` antes de tabular, sin sleeps. Prueba: `--repeat-each=12 --workers=2` sobre los tests de teclado dio "72 passed" (6 tests × 12), 12/12 cada uno. Esa corrida se hizo antes de añadir `@strapi`, que solo cambia títulos; sí se reejecutó la suite completa después.
  - **F-02.1 (MAJOR).** `features/step-2/step-2.component.ts`: "Volver" se movió sobre el grupo de planes (DOM igual al orden visual) y la barra de acciones solo tiene "Continuar al resumen". Tests: `e2e/us-02-a11y.spec.ts` › `[F-02.1][R-02.18][AC-02.13] solo con teclado...` (un solo Tab desde el grupo llega a Continuar) y `[F-02.1][AC-02.13] "Volver" va antes del grupo`; `full-flow-co.spec.ts` ajustado.
  - **F-01.2 (MINOR).** `core/quote/quote.store.ts`: `commit()` escribe en sessionStorage en la misma llamada de setStep1Values, setSelectedPlan, clearSelectedPlan y setConfirmation (el `effect` queda de respaldo). Unit: `quote.store.spec.ts` › `[F-01.2][R-01.8] la escritura ocurre en la misma llamada` y `[F-01.2][R-01.20]`. Retiré la espera por polling de `choosePlan` en `e2e/support/form-helpers.ts`.
  - **F-01.3 (MINOR).** `app.routes.ts`: comodines `**` bajo `:country/quote` (a step-1) y bajo `:country` (a quote/step-1). Tests: `app.routes.spec.ts` › `[F-01.3][R-01.1]` (2 casos y país inválido sigue en country-not-found) y E2E-S `e2e/platform-contract.spec.ts` › `[F-01.3][R-01.1]`.
  - **F-02.2 (MINOR).** `step-2.component.ts`: las insignias salen del `<label>` (el nombre accesible del radio es solo el del plan), "Elegido" lleva `aria-hidden` y "Recomendado" queda solo en `aria-describedby`. Test: `e2e/us-02-a11y.spec.ts` › `[F-02.2][R-02.18]`.
  - **F-02.3 (MINOR).** Opción "propagar": `quote.store.ts` (`setPendingNotice` y `consumePendingNotice`), `core/guards/step-guards.ts` (guarda `decision.notice`) y `step-2.component.ts` (lo consume al cargar). Test: `quote.store.spec.ts` › `[F-02.3][R-02.12]`; el flujo ya lo cubre `us-03-plan-changes` › `[R-03.1][AC-03.11]`.
  - **F-03.4 (MINOR).** `core/guards/step-guards.ts`: con `result.kind === 'error'` y destino step-3, el guard deja entrar y el Paso 3 muestra su error con Reintentar. Test: `e2e/us-03-terms.spec.ts` › `[F-03.4][R-03.18] recargar /step-3 con la API de países caída muestra Reintentar en el resumen...`.
  - **F-03.5 (MINOR).** `features/confirmation/confirmation.component.ts`: número y plan se muestran siempre desde `QuoteState.confirmation`; solo el precio se omite si la configuración no carga (se retiraron los estados loading/error de esa pantalla). Test: `e2e/us-03-terms.spec.ts` › `[F-03.5][R-03.14][AC-03.19] recargar /confirmation con la API de países caída conserva número y plan`.
  - **F-PL.6 (MINOR, E2E-S).** `e2e/platform-contract.spec.ts` › `@strapi [F-PL.6][R-02.5] co/cl: la respuesta pública expone locale (es-CO / es-CL) y no localeCode`, con comprobación de que no aparecen token ni authorization.
  - **F-01.1 (complemento).** `core/http/mappers.spec.ts` › `[F-01.1][R-01.6] patrón sin anclas exige coincidencia completa` (`[0-9]{6}`: `123456` válido, `abc123456` y `123456abc` inválidos).
  - **F-PL.4 (complemento, etiqueta `@strapi`).** Añadí `@strapi` al título de los 85 E2E-S (sin `mockStrapi` ni `page.route`) en 12 archivos; los E2E-M quedan sin etiqueta. `npx playwright test --grep @strapi --list | tail -1` → "Total: 127 tests in 12 files". `--grep-invert @strapi --list | tail -1` → "Total: 73 tests in 11 files"; ninguno de esos 73 contiene `@strapi`, y todos usan `mockStrapi` (el grep `-l mockStrapi` da 11 archivos). 127 + 73 = 200, igual que el total de la suite.
- **Verificación ejecutada (salida literal):**
  - `npm run lint` → "All files pass linting."
  - `npm test -- --watch=false` → "Test Files 40 passed (40)", "Tests 365 passed (365)".
  - `npm run build -- --configuration production` → "Initial total | 307.67 kB | 83.48 kB" y "Application bundle generation complete."
  - `node scripts/trace-check.mjs` → "trace-check: 3 specs · 167 IDs · 57 archivos de test · 17 hallazgos" y "trace-check FALLÓ con 6 error(es)". Los 6 son solo de estado en `docs/reviews/` (F-PL.1, F-PL.2, F-PL.3, F-02.1, F-03.1, F-03.2 "no está RESUELTO ni ACEPTADO"); no hay IDs sin test ni IDs rotos. Mis IDs `F-` nuevos no lo rompen. Cerrarlos exige que @qa-reviewer o el Orquestador actualicen esos reportes.
  - E2E completo contra el stack real (Strapi de backend/ en producción, SQLite temporal, puerto 1337, más `npm start` en 4200): "200 passed (4.0m)", todo en verde. Una corrida previa dio 199 de 200: falló la espera de Tab hacia "Volver" por un Tab pulsado antes de que el Paso 2 terminara de cargar. Lo corregí esperando el estado listo y lo confirmé con las 12 repeticiones.
  - Smoke del bundle: "Resumen: 18 PASS, 0 FAIL, 1 SKIP" y "security-smoke: OK".
  - Procesos detenidos (0 restantes); eliminados dist, .angular, test-results, playwright-report y /tmp/e2e-strapi.
- **Pendientes / riesgos:**
  1. F-03.3 y F-01.1 fueron aceptados en HITL-3 (enmiendas de spec a cargo de @spec-analyst). F-PL.2 a F-PL.5 son de otros agentes.
  2. Con F-03.4 el guard deja entrar al Paso 3 con la API de países caída sin validar el Paso 1. La validación y la redirección ocurren en el componente al reintentar con éxito (`redirectIfInvalid`).
  3. F-02.3: el aviso `plan-unavailable` ahora llega por un campo en memoria del `QuoteStore` y se consume una vez. Si se prefiere eliminar `notice` del contrato, hay que cambiar `docs/contracts` (no es mío).
  4. El comentario en `playwright.config.ts` ya describe la convención `@strapi`; no lo modifiqué. `retries: 1` en CI sigue ocultando flakes (F-03.2 sugería `--fail-on-flaky-tests`). Eso está en CI/devops, fuera de frontend/.
- **Requiere HITL:** No.

---

## Verificación independiente del Orquestador (todo el árbol de la ronda: frontend + backend + plataforma + specs)
- Frontend: `npm run lint` exit 0; `Test Files 40 passed (40)` · `Tests 365 passed (365)`; build `Initial total 307.67 kB`.
- `npx playwright test --grep @strapi --list` → `Total: 127 tests in 12 files` (F-PL.4 ya tiene tests que ejecutar).
- Backend `npm run build` → exit 0.
- **Smoke de seguridad con el bundle de producción** (`SMOKE_BUNDLE_DIR=frontend/dist/frontend/browser`, proxy `ng serve` + Strapi directo) → `Resumen: 18 PASS, 0 FAIL, 1 SKIP` · `security-smoke: OK` (F-PL.1).
- **E2E completo** contra stack real → `200 passed (3.9m)`.
- Pendiente para la re-auditoría: riesgo 4 (`retries: 1` en CI oculta inestabilidad).
