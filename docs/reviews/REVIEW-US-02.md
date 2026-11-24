# Code Review — US-02 (Listado y selección de planes)

- **Fecha:** 2026-11-23
- **Revisor:** `@qa-reviewer` (modelo: opus) + validación humana (HITL-3, pendiente)
- **Alcance:** commits `5158d5b..3c331af` (HEAD `3c331af`, árbol de trabajo limpio)
- **Trazabilidad:** `US-02` → `SPEC-US-02 v3 (Aprobado)` → `ADR-001`, `ADR-002` → código → tests
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
| `node scripts/trace-check.mjs` | `exit=1` (esperado mientras haya BLOCKER/MAJOR abiertos) · "trace-check: 3 specs · 167 IDs · 54 archivos de test · 17 hallazgos" · "✖ F-PL.1 (BLOCKER) en docs/reviews/REVIEW-PLATFORM.md no está RESUELTO ni ACEPTADO." · "✖ F-PL.2 (MAJOR) en docs/reviews/REVIEW-PLATFORM.md no está RESUELTO ni ACEPTADO." · "✖ F-PL.3 (MAJOR) en docs/reviews/REVIEW-PLATFORM.md no está RESUELTO ni ACEPTADO." · "✖ F-02.1 (MAJOR) en docs/reviews/REVIEW-US-02.md no está RESUELTO ni ACEPTADO." · "✖ F-03.1 (BLOCKER) en docs/reviews/REVIEW-US-03.md no está RESUELTO ni ACEPTADO." · "✖ F-03.2 (MAJOR) en docs/reviews/REVIEW-US-03.md no está RESUELTO ni ACEPTADO." · "trace-check FALLÓ con 6 error(es)." · Antes de esta review (sin REVIEW-*.md): "trace-check: 3 specs · 167 IDs · 54 archivos de test · 0 hallazgos" · "trace-check OK" |

## Revisión estática
| Revisión estática | Resultado |
| :--- | :--- |
| R-02.21: ciudades, factores o planes literales en `frontend/src` (fuera de tests/fixtures) | 0 (`grep -niE "bogot\|medell\|cali\|santiago\|valpara\|punta arenas\|básico\|premium\|plus"`) |
| R-02.7: parámetros de la regla en un único módulo | `domain/pricing/pricing-rules.ts:10-22` (tramos +10/0/+15, edad <25 +12, rango ciudad desde el contrato) |
| R-02.6: aritmética entera half-up | `pricing.ts:36-42` usa `Math.floor((base * (100 + total) + 50) / 100)` |
| R-02.5 / GAP-02.11: sin `if` por país al formatear | `format-price.ts:7-24` usa `country.locale` y `country.currencyCode`; `RangeError` → `config-error` |
| R-02.19: `plan.currency` nunca formatea | `plans.ts:46-55` solo compara; `formatPrice` recibe el país |
| R-02.2: query exacta y sin token | `STRAPI_QUERIES.insurancePlans` idéntica a SPEC-US-02 §4; interceptor solo `/api/` relativo |

## Cobertura de la spec
50 IDs (R-02.1–R-02.24, AC-02.1–AC-02.26): **50 con test que los cita en el título, 0 faltantes.**

| ID | Evidencia en código | Test (archivo:línea › título) (n.º de tests que lo citan) | Estado |
| :--- | :--- | :--- | :--- |
| R-02.1 | `src/app/core/guards/step-guards.ts:42-84` | `src/app/core/guards/step-access.spec.ts:38` › [R-02.1][R-02.12] acceso al Paso 3 con planes activos (4) | OK |
| R-02.2 | `src/app/core/country/plans-load.ts:6` | `src/app/core/http/strapi-queries.spec.ts:29` › [R-02.2] consulta de planes (5) | OK |
| R-02.3 | `src/app/domain/pricing/plans.ts:16` | `src/app/domain/pricing/sanitize-plans.spec.ts:4` › [R-02.3][R-02.4] depuración de planes (7) | OK |
| R-02.4 | `src/app/core/country/plans-load.ts:6` | `src/app/domain/pricing/sanitize-plans.spec.ts:4` › [R-02.3][R-02.4] depuración de planes (7) | OK |
| R-02.5 | `src/app/domain/pricing/format-price.ts:4` | `src/app/domain/pricing/format-price.spec.ts:5` › [R-02.5][AC-02.7] formato de moneda por país (7) | OK |
| R-02.6 | `src/app/domain/pricing/pricing-rules.ts:4` | `src/app/domain/pricing/pricing.spec.ts:8` › [R-02.6][AC-02.6] regla de precio sin ajuste de ciudad (6) | OK |
| R-02.7 | `src/app/domain/form/calendar.ts:39` | `src/app/domain/pricing/pricing.spec.ts:54` › [R-02.7][R-02.8] localización por rol y errores tipados (3) | OK |
| R-02.8 | `src/app/domain/pricing/pricing.ts:17` | `src/app/domain/pricing/pricing.spec.ts:54` › [R-02.7][R-02.8] localización por rol y errores tipados (6) | OK |
| R-02.9 | `src/app/features/step-2/step-2-state.ts:29` | `src/app/features/step-2/step-2-state.spec.ts:39` › [R-02.9][AC-02.8][AC-02.25] precio derivado del Paso 1 (6) | OK |
| R-02.10 | `src/app/domain/pricing/plans.ts:35` | `src/app/domain/pricing/pick-recommended.spec.ts:4` › [R-02.10] plan recomendado (8) | OK |
| R-02.11 | `src/app/core/quote/quote.store.ts:47` | `src/app/core/quote/quote.store.spec.ts:95` › [R-02.11][R-02.16][R-02.17] selección de plan en el QuoteState (5) | OK |
| R-02.12 | `src/app/core/country/country.store.ts:75` | `src/app/core/guards/step-access.spec.ts:38` › [R-02.1][R-02.12] acceso al Paso 3 con planes activos (12) | OK |
| R-02.13 | `src/app/features/step-2/step-2.component.ts:274` | `src/app/features/step-2/step-2-state.spec.ts:72` › [R-02.11][R-02.12][R-02.13] selección (4) | OK |
| R-02.14 | `src/app/features/step-2/step-2.component.ts:43-98` | `e2e/us-02-plans.spec.ts:71` › [R-02.14][AC-02.20] cada plan muestra descripción, coberturas con límite y beneficios (1) | OK |
| R-02.15 | `src/app/core/country/plans-load.ts:6` | `src/app/features/step-2/step-2-state.spec.ts:23` › [R-02.15] unión discriminada del Paso 2 (8) | OK |
| R-02.16 | `src/app/features/step-2/step-2.component.ts:21` | `src/app/core/quote/quote.store.spec.ts:95` › [R-02.11][R-02.16][R-02.17] selección de plan en el QuoteState (6) | OK |
| R-02.17 | `src/app/core/quote/quote.store.ts:47` | `src/app/core/quote/quote.store.spec.ts:95` › [R-02.11][R-02.16][R-02.17] selección de plan en el QuoteState (7) | OK |
| R-02.18 | `src/app/features/step-2/step-2.component.ts:261` | `e2e/us-02-a11y.spec.ts:9` › [R-02.18][AC-02.13] accesibilidad del Paso 2 (7) | OK con observación (F-02.2) |
| R-02.19 | `src/app/core/country/plans-load.ts:6` | `src/app/domain/pricing/plan-currency.spec.ts:4` › [R-02.19][AC-02.21] moneda del plan frente a la del país (7) | OK |
| R-02.20 | `src/app/i18n/ui-copy.es.ts:84-86` | `src/app/i18n/ui-copy.spec.ts:40` › [R-02.20] catálogo del Paso 2 (3) | OK |
| R-02.21 | `src/app/core/http/mappers.ts:144` | `src/app/domain/pricing/city-adjustment.spec.ts:16` › [R-02.21][R-02.22] ajuste por ciudad (2) | OK |
| R-02.22 | `src/app/domain/pricing/city-adjustment.ts:18` | `src/app/domain/pricing/city-adjustment.spec.ts:16` › [R-02.21][R-02.22] ajuste por ciudad (7) | OK |
| R-02.23 | `src/app/domain/pricing/city-adjustment.ts:5` | `src/app/domain/pricing/city-adjustment.spec.ts:39` › [R-02.23] faltantes legítimos valen 0 (8) | OK |
| R-02.24 | `src/app/core/guards/step-guards.ts:53` | `e2e/us-02-plan-changes.spec.ts:81` › [R-02.24][AC-02.19][AC-02.26] cambios de negocio sin despliegue (3) | OK (E2E-M); prueba en vivo pendiente en HITL-3 |
| AC-02.1 | Escenario: ver las R- citadas en el título del test | `e2e/us-02-plans.spec.ts:20` › [R-02.1][R-02.3][AC-02.1] solo los planes activos de Colombia, en el orden de Strapi, sin  (1) | OK |
| AC-02.2 | Escenario: ver las R- citadas en el título del test | `e2e/us-02-plans.spec.ts:27` › [R-02.10][AC-02.2] solo el plan recomendado muestra "Recomendado" y un borde distintivo, s (1) | OK |
| AC-02.3 | Escenario: ver las R- citadas en el título del test | `e2e/us-02-plans.spec.ts:36` › [R-02.11][AC-02.3] la selección es única, se marca "Elegido" y habilita continuar (1) | OK |
| AC-02.4 | Escenario: ver las R- citadas en el título del test | `e2e/us-02-states.spec.ts:16` › [R-02.15][AC-02.4] estado vacío (2) | OK |
| AC-02.5 | Escenario: ver las R- citadas en el título del test | `e2e/us-02-plans.spec.ts:50` › [R-02.1][AC-02.5] sin completar el Paso 1, el acceso directo redirige a step-1 (1) | OK |
| AC-02.6 | Escenario: ver las R- citadas en el título del test | `src/app/domain/pricing/pricing.spec.ts:8` › [R-02.6][AC-02.6] regla de precio sin ajuste de ciudad (5) | OK |
| AC-02.7 | Escenario: ver las R- citadas en el título del test | `src/app/domain/pricing/format-price.spec.ts:5` › [R-02.5][AC-02.7] formato de moneda por país (4) | OK |
| AC-02.8 | Escenario: ver las R- citadas en el título del test | `src/app/features/step-2/step-2-state.spec.ts:39` › [R-02.9][AC-02.8][AC-02.25] precio derivado del Paso 1 (3) | OK |
| AC-02.9 | Escenario: ver las R- citadas en el título del test | `e2e/us-02-plan-changes.spec.ts:18` › [R-02.12][AC-02.9] plan elegido despublicado (2) | OK |
| AC-02.10 | Escenario: ver las R- citadas en el título del test | `e2e/us-02-plan-changes.spec.ts:61` › [R-02.13][AC-02.10] cambio de precio del plan elegido (2) | OK |
| AC-02.11 | Escenario: ver las R- citadas en el título del test | `e2e/us-02-states.spec.ts:30` › [R-02.2][R-02.15][AC-02.11] error de red recuperable (2) | OK |
| AC-02.12 | Escenario: ver las R- citadas en el título del test | `e2e/us-02-states.spec.ts:85` › [R-02.8][AC-02.12] dato requerido ausente (2) | OK |
| AC-02.13 | Escenario: ver las R- citadas en el título del test | `e2e/us-02-a11y.spec.ts:9` › [R-02.18][AC-02.13] accesibilidad del Paso 2 (2) | Desvío: la letra del AC no se cumple (F-02.1) |
| AC-02.14 | Escenario: ver las R- citadas en el título del test | `e2e/us-02-plans.spec.ts:99` › [R-02.12][AC-02.14] al recargar los planes se piden de nuevo y el plan sigue marcado (1) | OK |
| AC-02.15 | Escenario: ver las R- citadas en el título del test | `e2e/us-02-states.spec.ts:99` › [R-02.16][AC-02.15] aislamiento por país (2) | OK |
| AC-02.16 | Escenario: ver las R- citadas en el título del test | `src/app/domain/pricing/pick-recommended.spec.ts:18` › [R-02.10][AC-02.16] con más de uno solo se destaca el primero y se avisa (3) | OK |
| AC-02.17 | `src/app/domain/pricing/plans.ts:16` | `src/app/domain/pricing/sanitize-plans.spec.ts:17` › [R-02.4][AC-02.17] excluye precio no entero, negativo, nulo o sin nombre, con console.warn (5) | OK |
| AC-02.18 | Escenario: ver las R- citadas en el título del test | `e2e/us-02-plans.spec.ts:108` › [R-02.5][AC-02.18] Chile se muestra en CLP con formato es-CL (Punta Arenas -5) (1) | OK |
| AC-02.19 | Escenario: ver las R- citadas en el título del test | `e2e/us-02-plan-changes.spec.ts:81` › [R-02.24][AC-02.19][AC-02.26] cambios de negocio sin despliegue (2) | OK (E2E-M); prueba en vivo pendiente en HITL-3 |
| AC-02.20 | Escenario: ver las R- citadas en el título del test | `e2e/us-02-plans.spec.ts:71` › [R-02.14][AC-02.20] cada plan muestra descripción, coberturas con límite y beneficios (1) | OK |
| AC-02.21 | Escenario: ver las R- citadas en el título del test | `src/app/domain/pricing/plan-currency.spec.ts:4` › [R-02.19][AC-02.21] moneda del plan frente a la del país (5) | OK |
| AC-02.22 | Escenario: ver las R- citadas en el título del test | `src/app/domain/pricing/pricing.spec.ts:39` › [R-02.6][AC-02.22] regla de precio con ajuste de ciudad (2) | OK |
| AC-02.23 | Escenario: ver las R- citadas en el título del test | `src/app/domain/pricing/city-adjustment.spec.ts:40` › [R-02.23][AC-02.23] sin campo city, sin valor, opción inexistente o sin atributo (7) | OK |
| AC-02.24 | Escenario: ver las R- citadas en el título del test | `src/app/domain/pricing/city-adjustment.spec.ts:27` › [R-02.22][AC-02.24] %s produce config-error con campo y opción (3) | OK |
| AC-02.25 | Escenario: ver las R- citadas en el título del test | `src/app/features/step-2/step-2-state.spec.ts:39` › [R-02.9][AC-02.8][AC-02.25] precio derivado del Paso 1 (3) | OK |
| AC-02.26 | Escenario: ver las R- citadas en el título del test | `e2e/us-02-plan-changes.spec.ts:81` › [R-02.24][AC-02.19][AC-02.26] cambios de negocio sin despliegue (2) | OK (E2E-M); prueba en vivo pendiente en HITL-3 |

## Hallazgos
| ID | Severidad | Archivo / Línea | Regla afectada | Descripción | Acción correctiva | Estado y evidencia |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **F-02.1** | `MAJOR` | `frontend/src/app/features/step-2/step-2.component.ts:105-116`; `frontend/e2e/us-02-a11y.spec.ts:40-44` | AC-02.13, R-02.18, CLAUDE regla 7 | AC-02.13 (aprobado): "al presionar Tab llego a 'Continuar al resumen' habilitado". En el DOM el enlace "Volver" precede al botón, así que el primer `Tab` desde el grupo de radios cae en "Volver" y hace falta un segundo `Tab`. El test que cita `[AC-02.13]` fue escrito para la implementación (dos `Tab`, comentario en la línea 40), así que certifica un comportamiento distinto del aprobado: la matriz de trazabilidad marca AC-02.13 como cubierto sin que se cumpla. | Opción A (recomendada): mover "Volver" fuera de la barra de acciones (p. ej. enlace "Volver al formulario" sobre el grupo de planes, como en el estado vacío) para que el siguiente elemento enfocable tras el grupo sea "Continuar al resumen", conservando orden DOM = orden visual (WCAG 2.4.3); ajustar el E2E a un solo `Tab`. Opción B: enmendar AC-02.13 en HITL-3 ("Tab hasta Continuar, pasando por Volver"). | `ABIERTO` |
| **F-02.2** | `MINOR` | `frontend/src/app/features/step-2/step-2.component.ts:45-63` | R-02.18 | Las insignias "Recomendado" y "Elegido" están dentro del `<label>` del radio, por lo que forman parte de su nombre accesible ("Plus Recomendado Elegido") y "Recomendado" se repite en la descripción (`aria-describedby` → `plan-badge-*`). "Elegido" duplica el estado `checked` que ya anuncia el lector. axe no lo detecta (no es violación), pero el anuncio es redundante. | Sacar las insignias del `<label>` (o `aria-hidden="true"` en "Elegido") y dejar "Recomendado" solo en `aria-describedby`; test `[R-02.18] nombre accesible del radio = nombre del plan`. | `ABIERTO` |
| **F-02.3** | `MINOR` | `frontend/src/app/core/guards/step-guards.ts:62-66` | R-02.12, R-03.1 | `decideStepAccess` devuelve `notice: 'plan-unavailable'`, pero el guard la descarta (solo usa `decision.to`). Hoy funciona porque el Paso 2 recalcula el aviso al no encontrar el plan, así que el campo `notice` de la decisión es código muerto que sugiere un contrato que no existe. | Eliminar `notice` de `StepAccessDecision` o propagarlo (p. ej. `queryParams` o estado del store) y cubrirlo con un test. | `ABIERTO` |

## Verificación manual pendiente (HITL-3)
- R-02.24 / AC-02.19 / AC-02.26: reordenar y desactivar planes y cambiar el ajuste de "Cali" de +3 a +6 en el admin, y recargar el Paso 2.

## Intervención humana (HITL-3)
- **Decisión:** pendiente. El humano debe, por cada hallazgo `BLOCKER`/`MAJOR`, exigir la corrección (cierre `RESUELTO — commit <sha>, test <archivo › título>`) o aceptarlo con motivo (`ACEPTADO — decisión humana HITL-3 (<motivo>)`).
- F-02.1 (`MAJOR`) bloquea `trace-check` hasta que se corrija o se acepte con enmienda de AC-02.13.
