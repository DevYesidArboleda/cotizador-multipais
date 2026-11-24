# Code Review — US-03 (Resumen, términos y pago simulado)

- **Fecha:** 2026-11-23
- **Revisor:** `@qa-reviewer` (modelo: opus) + validación humana (HITL-3, pendiente)
- **Alcance:** commits `5158d5b..3c331af` (HEAD `3c331af`, árbol de trabajo limpio)
- **Trazabilidad:** `US-03` → `SPEC-US-03 v3 (Aprobado)` → `ADR-001`, `ADR-002` → código → tests
- **Resultado inicial:** `CAMBIOS REQUERIDOS`
- **Resultado final:** `PENDIENTE` (hasta re-auditoría y HITL-3)

## Ejecución real de la suite
| Comando | Resultado literal |
| :--- | :--- |
| `npm run lint` (frontend) | `exit 0` · "Linting \"frontend\"... All files pass linting." |
| `npm test -- --watch=false` (frontend) | `exit 0` · "Test Files 38 passed (38)" · "Tests 353 passed (353)" (Vitest 5.1.1, 1.28 s) |
| `npm run build -- --configuration production` (frontend) | `exit 0` · "Initial total 307.30 kB (83.43 kB transfer)" · "Application bundle generation complete." · `step-3-component 16.50 kB`, `step-2-component 11.38 kB`, `step-1-component 32.43 kB` |
| `npm run build` (backend) | `exit 0` · "✔ Compiling TS (3860ms)" · "✔ Building build context (968ms)" · "✔ Building admin panel (30622ms)" |
| `npx playwright test` (E2E_BASE_URL=http://127.0.0.1:4200) | Stack real: Strapi 5.63.0 `NODE_ENV=production` + SQLite temporal `/tmp`, `SEED_ON_BOOT=true`, secretos ficticios, :1337 + `ng serve` :4200 (proxy `/api`). Corrida 1: "192 passed (3.8m)" · Corrida 2: "192 passed (3.8m)" · Estrés `e2e/us-03-a11y.spec.ts:39 --repeat-each=12 --workers=2`: "2 failed · 10 passed (32.3s)" (ver F-03.2) |
| Sonda de aislamiento del pago (`/tmp/qa/probe-payment.mjs`, Playwright sobre el mismo stack) | "CO confirmación: COT-CO-20261123-0CF8" · "CL resultado con modo Rechazado: confirmation (41 ms)" · "auto_quote_v1_cl.confirmation: {\"quoteNumber\":\"COT-CO-20261123-0CF8\",...,\"planName\":\"Plus\",\"finalPrice\":410400}" (ver F-03.1) |
| `node scripts/trace-check.mjs` | `exit=1` (esperado mientras haya BLOCKER/MAJOR abiertos) · "trace-check: 3 specs · 167 IDs · 54 archivos de test · 17 hallazgos" · "✖ F-PL.1 (BLOCKER) en docs/reviews/REVIEW-PLATFORM.md no está RESUELTO ni ACEPTADO." · "✖ F-PL.2 (MAJOR) en docs/reviews/REVIEW-PLATFORM.md no está RESUELTO ni ACEPTADO." · "✖ F-PL.3 (MAJOR) en docs/reviews/REVIEW-PLATFORM.md no está RESUELTO ni ACEPTADO." · "✖ F-02.1 (MAJOR) en docs/reviews/REVIEW-US-02.md no está RESUELTO ni ACEPTADO." · "✖ F-03.1 (BLOCKER) en docs/reviews/REVIEW-US-03.md no está RESUELTO ni ACEPTADO." · "✖ F-03.2 (MAJOR) en docs/reviews/REVIEW-US-03.md no está RESUELTO ni ACEPTADO." · "trace-check FALLÓ con 6 error(es)." · Antes de esta review (sin REVIEW-*.md): "trace-check: 3 specs · 167 IDs · 54 archivos de test · 0 hallazgos" · "trace-check OK" |

## Revisión estática
| Revisión estática | Resultado |
| :--- | :--- |
| R-03.7 / GAP-03.3: `innerHTML`, Markdown o HTML en términos | 0; `splitTerms` + interpolación de texto (`step-3.component.ts:87-90`) |
| R-03.5: documento completo en DOM/atributos | Solo se renderiza `maskDocumentNumber` (`format-summary-value.ts:13-16`); E2E `us-03-privacy.spec.ts` inspecciona `page.content()` |
| R-03.10: red o datos de tarjeta en el pago | 0 llamadas HTTP en `payment-simulation.service.ts`; sin campos de tarjeta |
| R-03.13: aleatoriedad | `crypto.getRandomValues` inyectable (`generate-quote-number.ts:6`) |
| R-03.22 / R-03.23: literales y consola | 0 literales de UI; 0 `console.*` con valores del formulario |

## Cobertura de la spec
54 IDs (R-03.1–R-03.25, AC-03.1–AC-03.29): **54 con test que los cita en el título, 0 faltantes.** La cobertura nominal es completa, pero los hallazgos F-03.1 y F-03.2 muestran que "tener test" no equivale a "cumplir": ningún test cubre dos países en la misma pestaña tras un pago.

| ID | Evidencia en código | Test (archivo:línea › título) (n.º de tests que lo citan) | Estado |
| :--- | :--- | :--- | :--- |
| R-03.1 | `src/app/core/guards/step-access.ts:12` | `src/app/core/guards/step-access.spec.ts:56` › [R-03.1][R-03.14] orden de decisiones y confirmación (8) | OK |
| R-03.2 | `src/app/domain/summary/build-summary.ts:5` | `src/app/domain/summary/build-summary.spec.ts:9` › [R-03.2] buildSummaryRows (6) | OK |
| R-03.3 | `src/app/domain/summary/format-summary-value.ts:6` | `src/app/domain/summary/format-summary-value.spec.ts:10` › [R-03.3] formatSummaryValue (8) | OK |
| R-03.4 | `src/app/domain/payment/mask-document-number.ts:2` | `src/app/domain/payment/mask-document-number.spec.ts:3` › [R-03.4] maskDocumentNumber (5) | OK |
| R-03.5 | `src/app/features/confirmation/confirmation.component.ts:14` | `e2e/us-03-privacy.spec.ts:11` › [R-03.5][AC-03.6] documento enmascarado (4) | OK |
| R-03.6 | `src/app/features/step-3/step-3-state.ts:38` | `src/app/domain/summary/build-summary.spec.ts:56` › [R-03.6][AC-03.29] precio del resumen igual al del Paso 2 (4) | OK |
| R-03.7 | `src/app/domain/summary/split-terms.ts:1` | `src/app/domain/summary/split-terms.spec.ts:3` › [R-03.7] splitTerms (9) | OK |
| R-03.8 | `src/app/features/step-3/step-3-state.ts:72` | `src/app/features/step-3/step-3-state.spec.ts:94` › [R-03.8][R-03.12][R-03.21] interacción de pago (4) | OK |
| R-03.9 | `src/app/domain/payment/can-pay.ts:3` | `src/app/domain/payment/can-pay.spec.ts:5` › [R-03.9] canPay (3) | OK |
| R-03.10 | `src/app/domain/payment/payment-simulation.service.ts:6` | `src/app/domain/payment/payment-simulation.service.spec.ts:17` › [R-03.10] PaymentSimulationService (4) | ROTA en navegación entre países (F-03.1) |
| R-03.11 | `src/app/domain/payment/payment-simulation.service.ts:12` | `src/app/domain/payment/payment-simulation.service.spec.ts:49` › [R-03.11][AC-03.8] guardia de doble envío (10) | OK dentro de un país; la memoización causa F-03.1 |
| R-03.12 | `src/app/features/step-3/step-3-state.ts:89` | `src/app/domain/payment/payment-simulation.service.spec.ts:73` › [R-03.11][R-03.12] tras un rechazo se puede reintentar y aprobar (8) | ROTA en navegación entre países (F-03.1) |
| R-03.13 | `src/app/domain/payment/generate-quote-number.ts:5` | `src/app/domain/payment/generate-quote-number.spec.ts:5` › [R-03.13] generateQuoteNumber (5) | ROTA en navegación entre países (F-03.1) |
| R-03.14 | `src/app/core/guards/step-access.ts:16` | `src/app/core/guards/step-access.spec.ts:56` › [R-03.1][R-03.14] orden de decisiones y confirmación (11) | OK con observación (F-03.5) |
| R-03.15 | `src/app/core/quote/quote.store.ts:66` | `src/app/core/quote/quote.store.spec.ts:128` › [R-03.14][R-03.15] confirmación y nueva cotización (8) | OK |
| R-03.16 | `src/app/features/step-3/step-3.component.ts:49,60,71` | `e2e/us-03-summary-payment.spec.ts:64` › [R-03.16][AC-03.13] "Editar datos" conserva los datos; al volver el precio se recalcula y  (2) | OK |
| R-03.17 | `src/app/features/step-3/step-3-state.ts:66` | `src/app/features/step-3/step-3-state.spec.ts:62` › [R-03.17] aviso de cambio de precio (5) | OK |
| R-03.18 | `src/app/features/step-3/step-3-state.ts:16` | `src/app/features/step-3/step-3-state.spec.ts:36` › [R-03.18] unión discriminada del Paso 3 (8) | OK vía SPA; recarga directa difiere (F-03.4) |
| R-03.19 | `src/app/features/step-3/step-3.component.ts:29` | `src/app/core/storage/quote-storage.spec.ts:94` › [R-03.15][R-03.19] borrado y aislamiento por país (4) | ROTA en navegación entre países (F-03.1) |
| R-03.20 | `src/app/features/step-3/step-3.component.ts:87,98,125` | `e2e/full-flow-co.spec.ts:9` › [R-03.20][AC-03.25] flujo completo de Colombia solo con teclado (13) | Test inestable (F-03.2) |
| R-03.21 | `src/app/features/step-3/step-3-state.ts:72` | `src/app/features/step-3/step-3-state.spec.ts:94` › [R-03.8][R-03.12][R-03.21] interacción de pago (5) | OK |
| R-03.22 | `src/app/i18n/ui-copy.es.ts:36` | `src/app/i18n/ui-copy.spec.ts:53` › [R-03.22] catálogo del Paso 3 y la confirmación (3) | OK |
| R-03.23 | Revisión estática: 0 `console.*` con datos (ver tabla anterior) | `e2e/us-03-privacy.spec.ts:49` › [R-03.23][AC-03.23] sin datos personales en consola (2) | OK |
| R-03.24 | `src/app/domain/summary/format-summary-value.ts:7` | `src/app/domain/summary/build-summary.spec.ts:33` › [R-03.24] correo del tomador por rol (5) | OK |
| R-03.25 | `src/app/core/guards/step-guards.ts:74` | `src/app/features/step-3/step-3-state.spec.ts:74` › [R-03.25][AC-03.28] moneda y ciudad inválidas bloquean el pago (6) | OK |
| AC-03.1 | Escenario: ver las R- citadas en el título del test | `e2e/us-03-summary-payment.spec.ts:15` › [R-03.2][AC-03.1][R-03.6] tres bloques en orden (tomador, vehículo, plan) y mismo precio q (1) | OK |
| AC-03.2 | Escenario: ver las R- citadas en el título del test | `e2e/us-03-terms.spec.ts:11` › [R-03.7][R-03.9][AC-03.2] los términos de Colombia coinciden con Strapi, el pago está desh (1) | OK |
| AC-03.3 | Escenario: ver las R- citadas en el título del test | `e2e/us-03-payment.spec.ts:11` › [R-03.14][AC-03.3] pago aprobado (2) | OK |
| AC-03.4 | Escenario: ver las R- citadas en el título del test | `e2e/us-03-payment.spec.ts:33` › [R-03.12][AC-03.4][R-03.21] pago rechazado y reintento (2) | ROTA en navegación entre países (F-03.1) |
| AC-03.5 | Escenario: ver las R- citadas en el título del test | `e2e/us-03-summary-payment.spec.ts:30` › [R-03.1][AC-03.5] sin plan elegido, /step-3 redirige a /step-2 (1) | OK |
| AC-03.6 | Escenario: ver las R- citadas en el título del test | `src/app/domain/payment/mask-document-number.spec.ts:23` › [R-03.4][AC-03.6] el documento completo nunca queda en el resultado (3) | OK |
| AC-03.7 | Escenario: ver las R- citadas en el título del test | `src/app/domain/payment/mask-document-number.spec.ts:17` › [R-03.4][AC-03.7] casos borde: 1020304050, 12.345.678-5, 1.000.005-K, 1234 y 12 (1) | OK |
| AC-03.8 | Escenario: ver las R- citadas en el título del test | `src/app/domain/payment/payment-simulation.service.spec.ts:49` › [R-03.11][AC-03.8] guardia de doble envío (3) | OK |
| AC-03.9 | Escenario: ver las R- citadas en el título del test | `e2e/us-03-payment.spec.ts:87` › [R-03.11][AC-03.9] Enter más clic inmediato ejecutan un solo pago (1) | OK |
| AC-03.10 | Escenario: ver las R- citadas en el título del test | `e2e/us-03-terms.spec.ts:38` › [R-03.8][AC-03.10] tras recargar, el resumen es el mismo, los términos sin aceptar y el pa (1) | OK |
| AC-03.11 | Escenario: ver las R- citadas en el título del test | `e2e/us-03-plan-changes.spec.ts:12` › [R-03.1][AC-03.11] plan despublicado antes del resumen (2) | OK |
| AC-03.12 | Escenario: ver las R- citadas en el título del test | `e2e/us-03-plan-changes.spec.ts:26` › [R-03.17][AC-03.12] cambio de precio entre pasos (2) | OK |
| AC-03.13 | Escenario: ver las R- citadas en el título del test | `e2e/us-03-summary-payment.spec.ts:64` › [R-03.16][AC-03.13] "Editar datos" conserva los datos; al volver el precio se recalcula y  (1) | OK |
| AC-03.14 | Escenario: ver las R- citadas en el título del test | `e2e/us-03-summary-payment.spec.ts:84` › [R-03.16][AC-03.14] "Cambiar plan" lleva al Paso 2 con el plan marcado y el resumen reflej (1) | OK |
| AC-03.15 | Escenario: ver las R- citadas en el título del test | `e2e/us-03-terms.spec.ts:70` › [R-03.7][R-03.18][AC-03.15] términos vacíos: error de configuración y el pago no está disp (1) | Desvío de redacción (F-03.3) |
| AC-03.16 | Escenario: ver las R- citadas en el título del test | `src/app/domain/summary/split-terms.spec.ts:4` › [R-03.7][AC-03.16] divide por líneas en blanco y conserva el texto literal sin interpretar (2) | OK |
| AC-03.17 | Escenario: ver las R- citadas en el título del test | `e2e/us-03-terms.spec.ts:82` › [R-03.18][AC-03.17] si la API de países falla hay alerta con "Reintentar" y sin pago; al r (1) | Desvío de redacción (F-03.3) y recarga (F-03.4) |
| AC-03.18 | Escenario: ver las R- citadas en el título del test | `e2e/us-03-payment.spec.ts:99` › [R-03.14][AC-03.18][AC-03.19][AC-03.20] confirmación y nueva cotización (2) | OK |
| AC-03.19 | Escenario: ver las R- citadas en el título del test | `e2e/us-03-payment.spec.ts:99` › [R-03.14][AC-03.18][AC-03.19][AC-03.20] confirmación y nueva cotización (2) | OK con observación (F-03.5) |
| AC-03.20 | Escenario: ver las R- citadas en el título del test | `e2e/us-03-payment.spec.ts:99` › [R-03.14][AC-03.18][AC-03.19][AC-03.20] confirmación y nueva cotización (2) | OK |
| AC-03.21 | Escenario: ver las R- citadas en el título del test | `src/app/domain/payment/generate-quote-number.spec.ts:6` › [R-03.13][AC-03.21] formato COT-<PAÍS>-<YYYYMMDD local>-<4 HEX mayúscula> (2) | ROTA en navegación entre países (F-03.1) |
| AC-03.22 | Escenario: ver las R- citadas en el título del test | `src/app/domain/summary/format-summary-value.spec.ts:11` › [R-03.3][AC-03.22] select muestra la etiqueta, nunca el value interno (5) | OK |
| AC-03.23 | Escenario: ver las R- citadas en el título del test | `e2e/us-03-privacy.spec.ts:49` › [R-03.23][AC-03.23] sin datos personales en consola (2) | OK |
| AC-03.24 | Escenario: ver las R- citadas en el título del test | `e2e/us-03-terms.spec.ts:49` › [R-03.19][AC-03.24] /cl/quote/step-3 sin haber completado Chile redirige a step-1 y nunca  (1) | OK |
| AC-03.25 | Escenario: ver las R- citadas en el título del test | `e2e/full-flow-co.spec.ts:9` › [R-03.20][AC-03.25] flujo completo de Colombia solo con teclado (3) | Test inestable (F-03.2) |
| AC-03.26 | Escenario: ver las R- citadas en el título del test | `e2e/us-03-payment.spec.ts:52` › [R-03.21][AC-03.26] el selector está etiquetado "Simulación de pago (solo pruebas)", con " (1) | OK |
| AC-03.27 | Escenario: ver las R- citadas en el título del test | `e2e/us-03-privacy.spec.ts:37` › [R-03.5][AC-03.27] el correo solo aparece como texto visible del Paso 3, no en title, aria (2) | OK |
| AC-03.28 | Escenario: ver las R- citadas en el título del test | `src/app/features/step-3/step-3-state.spec.ts:74` › [R-03.25][AC-03.28] moneda y ciudad inválidas bloquean el pago (6) | Desvío de redacción (F-03.3) |
| AC-03.29 | Escenario: ver las R- citadas en el título del test | `src/app/domain/summary/build-summary.spec.ts:56` › [R-03.6][AC-03.29] precio del resumen igual al del Paso 2 (3) | OK |

## Hallazgos
| ID | Severidad | Archivo / Línea | Regla afectada | Descripción | Acción correctiva | Estado y evidencia |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **F-03.1** | `BLOCKER` | `frontend/src/app/domain/payment/payment-simulation.service.ts:22,31,45`; `frontend/src/app/features/confirmation/confirmation.component.ts:129` | R-03.10, R-03.12, R-03.13, R-03.19, AC-03.4, AC-03.21, R-01.20, CLAUDE regla 6 | `PaymentSimulationService` es un singleton `providedIn: 'root'` que memoriza el primer resultado `approved` y lo devuelve para siempre; solo "Nueva cotización" lo limpia. Si tras pagar en Colombia el usuario cambia a Chile desde el selector del header (navegación SPA, sin recarga) y completa el flujo, el pago de Chile **no ejecuta simulación**: ignora el modo "Rechazado", no espera la latencia y persiste en `auto_quote_v1_cl` una confirmación con el número de Colombia. Evidencia real (sonda Playwright contra el stack): "CO confirmación: COT-CO-20261123-0CF8" → en CL con modo Rechazado "confirmation (41 ms)" y `auto_quote_v1_cl.confirmation.quoteNumber = "COT-CO-20261123-0CF8"`. Rompe el formato por país (R-03.13), el rechazo (R-03.12/AC-03.4), la simulación por modo (R-03.10) y el aislamiento por país (R-03.19). Los unit y E2E no lo detectan porque cada test empieza con una página nueva. | Quitar la memoización `approved` del servicio y dejar solo la barrera de promesa en vuelo (barrera 2); la barrera 3 ya existe y es por país: `confirmation` persistida + guards. Si se quiere conservar la memoización, indexarla por país y por `planDocumentId` y limpiarla en `QuoteStore.activate`. Tests: unit `[R-03.13][R-03.19] tras aprobar en co, un pago en cl ejecuta una nueva simulación con COT-CL` y `[R-03.12] tras aprobar en co, el modo rechazado en cl rechaza`; E2E `[R-03.19] pagar CO, cambiar a CL por el header y pagar con Rechazado muestra role=alert`. | `ABIERTO` |
| **F-03.2** | `MAJOR` | `frontend/e2e/us-03-a11y.spec.ts:39-51`; `frontend/playwright.config.ts:15` | R-03.20, AC-03.25, CLAUDE regla 7 y regla 8 | El E2E obligatorio de teclado es inestable. Reproducido: `--repeat-each=12 --workers=2` → "2 failed, 10 passed"; ambos fallos en la línea 51 (`payButton toBeFocused`, "unexpected value inactive", con el botón aún `disabled` en el primer sondeo). Causa: tras `Space` en la casilla el test pulsa `Tab` dos veces sin esperar a que el re-render (zoneless, asíncrono) habilite "Pagar"; si el `Tab` llega antes, el foco salta el botón deshabilitado. Tampoco espera el estado `ready` ni el foco del `h1` antes de los 4 `Tab` iniciales. En CI `retries: 1` oculta la inestabilidad: un fallo intermitente se reporta verde. | En el test: `await expect(page.getByRole('heading', { level: 1 })).toBeFocused()` y esperar la región de términos antes de tabular; `await expect(payButton(page)).toBeEnabled()` tras `Space`. En CI: ejecutar con `--fail-on-flaky-tests` (o `retries: 0`) para que un test inestable rompa la puerta. Revisar el mismo patrón en `e2e/full-flow-co.spec.ts`. Cierre: 30/30 en `--repeat-each=30 --workers=2`. | `ABIERTO` |
| **F-03.3** | `MINOR` | `frontend/src/app/features/step-3/step-3.component.ts:43-138`; `frontend/e2e/us-03-terms.spec.ts:79,92`; `frontend/e2e/us-03-plan-changes.spec.ts:63,82` | AC-03.15, AC-03.17, AC-03.28, R-03.9 | Los AC dicen "el botón de pagar permanece deshabilitado"; en `error`/`config-error` el botón **no existe** (solo se renderiza en `ready`) y los tests afirman `toHaveCount(0)`. El efecto (pago inalcanzable) es igual o más seguro, y la spec es ambigua (R-03.18 dice "pago bloqueado"; AC-03.18 usa "no existe"), pero no es la letra de tres AC. | Recomendado: aceptar en HITL-3 y enmendar los tres AC a "no se puede pagar (el botón no está disponible)". Alternativa: renderizar "Pagar" `disabled` con su texto de ayuda también en `error`/`config-error`. | `ABIERTO` |
| **F-03.4** | `MINOR` | `frontend/src/app/core/guards/step-guards.ts:57-58` | R-03.18, AC-03.17 | Si se **recarga** `/step-3` con la API de países caída, el guard redirige a `step-1` (donde aparece el error con "Reintentar"); tras reintentar el usuario queda en el Paso 1, no en el resumen. R-03.18 pide `error` recuperable en el Paso 3. El E2E de AC-03.17 solo cubre la llegada por navegación SPA (riesgo 2 declarado en log 10). No hay pérdida de datos. | Para `step-3`/`confirmation`, dejar entrar con `result.kind === 'error'` y que el componente muestre el error (el Paso 3 ya refetchea con `force`); E2E `[R-03.18] recarga en step-3 con países 500 muestra Reintentar en el resumen`. | `ABIERTO` |
| **F-03.5** | `MINOR` | `frontend/src/app/features/confirmation/confirmation.component.ts:24-52` | R-03.14, AC-03.19 | Tras recargar `/confirmation`, número y plan (persistidos) solo se muestran si la configuración del país carga (se necesita solo para formatear el precio). Con Strapi caído el usuario ve un error y pierde de vista su número de cotización, aunque esté en `sessionStorage`. | Mostrar siempre número y plan desde `QuoteState.confirmation` y degradar solo el precio (o formatearlo con datos guardados en la confirmación); test E2E-M de recarga con países 500. | `ABIERTO` |

## Intervención humana (HITL-3)
- **Decisión:** pendiente. El humano debe, por cada hallazgo `BLOCKER`/`MAJOR`, exigir la corrección (cierre `RESUELTO — commit <sha>, test <archivo › título>`) o aceptarlo con motivo (`ACEPTADO — decisión humana HITL-3 (<motivo>)`).
- F-03.1 (`BLOCKER`) es un defecto funcional real verificado en el stack: debe corregirse (no se recomienda aceptarlo).
- F-03.2 (`MAJOR`): corregir el test y endurecer la puerta de CI.
- F-03.3: decidir redacción de los AC (aceptación recomendada).
