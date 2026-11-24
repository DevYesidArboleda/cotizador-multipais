# Log 09 — @frontend-engineer: iteración 2 — SPEC-US-02 (Fase 5)

- **Fecha:** 2026-11-23 · mismo subagente de la iteración 1 (continuado con SendMessage) · **Interrupción:** límite de uso de la API (5 h) a las ~16:43; reanudado a las 19:58 a pedido del humano
- Mensajes del Orquestador e informe final copiados **sin editar**.

## Mensaje de despacho (literal)

```text
Iteración 2 — SPEC-US-02 (listado y selección de planes). Tu iteración 1 quedó verificada por el Orquestador (lint, 216 unit, build, 91 E2E reproducidos) y está en el commit e60a014.

Entradas (rutas exactas):
1. /home/claude/cotizador-multipais/docs/specs/SPEC-US-02.md (v3, Aprobado) — fuente de verdad
2. /home/claude/cotizador-multipais/docs/specs/UI-UX-GUIDELINES.md (layout Paso 2, estados empty/error/plan no disponible/aviso de precio cambiado role=status, plan recomendado con insignia textual + borde, plan elegido)
3. /home/claude/cotizador-multipais/docs/hitl/HITL-1-specs.md (currency en el plan validada contra el país; priceAdjustmentPct por ciudad en [-10,30]; aviso sin bloquear si el precio cambia; E2E de cambios de Strapi con page.route + manual HITL-3)
4. /home/claude/cotizador-multipais/docs/contracts/strapi-contracts.ts (resolvePricingFactors, calculateAdjustedPrice, formatPrice, assertPlanCurrency…)
5. /home/claude/cotizador-multipais/docs/specs/SPEC-US-03.md (solo para no cerrar puertas)

Tarea: implementar SPEC-US-02 completa sobre tu núcleo, reemplazando el placeholder del Paso 2: TODAS las R-02.x y AC-02.x, cada una con al menos un test cuyo título contenga el ID. Regla de precio en módulo único `pricing-rules.ts` + funciones puras; formato de moneda por country.locale/currencyCode; selección única con radios nativos en fieldset/legend; estado vacío; plan seleccionado que desaparece o cambia de precio entre pasos; actualizar decideStepAccess con la lista de planes activos. Sin literales de planes, precios, monedas ni ciudades en frontend/src fuera de tests.

Verificación obligatoria (salida literal en el Handoff): npm run lint; npm test -- --watch=false; npm run build -- --configuration production; node scripts/trace-check.mjs (SPEC-US-02 debe quedar con cobertura completa); E2E completos (US-01 + US-02) contra el stack real como en la iteración 1; greps de la iteración 1. Detén todos los procesos y limpia dist/.angular/test-results al terminar. No hagas git commit. Termina con el bloque Handoff de CLAUDE.md §6.
```

## Mensaje de reanudación tras el límite de uso (literal)

```text
Te detuviste por un límite de uso de la API (ya restablecido) cuando ibas por "Now the stores, guards and pure Step 2 state." Continúa la iteración 2 (SPEC-US-02) exactamente desde donde quedaste, con las mismas instrucciones y la misma verificación obligatoria (lint, unit, build, trace-check con cobertura completa de SPEC-US-02, E2E US-01+US-02 contra el stack real, greps; detener procesos y limpiar). No hagas git commit. Termina con el bloque Handoff de CLAUDE.md §6, mencionando la interrupción.
```

## Informe final del subagente (literal)

## Handoff
- **Agente:** @frontend-engineer · **Fase:** 5 (iteración 2, SPEC-US-02) · **Entradas leídas:** docs/specs/SPEC-US-02.md, docs/specs/UI-UX-GUIDELINES.md, docs/hitl/HITL-1-specs.md, docs/contracts/strapi-contracts.ts, docs/specs/SPEC-US-03.md (solo para no cerrar puertas), backend/src/extensions/seed-data.ts (valores del seed para los E2E-S).
- **Interrupción:** la ejecución se detuvo por un límite de uso de la API cuando iba por "Now the stores, guards and pure Step 2 state". Retomé desde ahí sin rehacer lo anterior. Toda la verificación de abajo se ejecutó DESPUÉS de retomar.
- **Archivos creados/modificados (todos bajo /home/claude/cotizador-multipais/frontend/, sin commit):**
  - Dominio de precio, nuevo en src/app/domain/pricing/: pricing-rules.ts (módulo único de tramos y rango), city-adjustment.ts, pricing.ts (calculateAdjustedPrice y resolvePricingFactors), format-price.ts, plans.ts (sanitizePlans, pickRecommended, assertPlanCurrency).
  - Datos y estado: src/app/core/country/plans-load.ts (nuevo), core/country/country.store.ts (loadPlans sin caché), core/api/strapi-api.service.ts (insurancePlans), core/http/mappers.ts (toInsurancePlans y warn de priceAdjustmentPct fuera del rol city), core/http/type-guards.ts (isStrapiInsurancePlanDto más estricto), core/quote/quote.store.ts (setSelectedPlan, clearSelectedPlan), core/guards/step-guards.ts.
  - Guards: step2Guard refetchea campos (R-02.24). step3Guard y confirmationGuard piden planes frescos y pasan activePlanDocumentIds a decideStepAccess. Con config-error de planes redirigen a step-2. Con error de red de planes, el Paso 3 decide por sí mismo.
  - Paso 2: features/step-2/step-2-state.ts (funciones puras buildStep2View, reconcileSelection, priceAllPlans) y features/step-2/step-2.component.ts (reemplaza el placeholder).
  - Componente del Paso 2: radios nativos en fieldset/legend, badge "Recomendado" más borde de 3px, "Elegido", avisos role="status", región aria-live, estados loading/ready/empty/error/config-error, foco al h1 en "Reintentar".
  - Tests unit nuevos: domain/pricing/{pricing,format-price,sanitize-plans,pick-recommended,plan-currency,city-adjustment}.spec.ts, features/step-2/step-2-state.spec.ts, testing/plan-fixtures.ts. Extendidos: step-access.spec, strapi-queries.spec, quote.store.spec, quote-storage.spec, ui-copy.spec.
  - E2E: e2e/us-02-plans.spec.ts, us-02-states.spec.ts, us-02-plan-changes.spec.ts, us-02-a11y.spec.ts. Soporte ampliado: mock-fixtures.ts (MockPlan, mockPlan, mockCoPlans, mockClPlans), strapi-mock.ts (ruta /api/insurance-plans con delay/status/total, setCityOptions, countryMock), form-helpers.ts (fillCl, goToStep2, planRadio, continueButton, choosePlan).
- **IDs cubiertos:** R-02.1 a R-02.24 y AC-02.1 a AC-02.26, todos con al menos un test que los cita en el título. trace-check lo confirma: "3 specs · 167 IDs · 39 archivos de test · 0 hallazgos". Los únicos avisos son los AC-03.x de SPEC-US-03, aún no implementada. No se citó ningún ID de SPEC-US-03 en tests.
- **Verificación ejecutada (literal, tras retomar):**
  - `npm run lint` → "All files pass linting."
  - `npm test -- --watch=false` → "Test Files 30 passed (30) / Tests 284 passed (284)" (216 de la iteración 1 más 68 nuevos).
  - `npm run build -- --configuration production` → "Application bundle generation complete." Initial total 311.81 kB raw / 83.84 kB transfer; chunk step-2-component 14.23 kB.
  - `node scripts/trace-check.mjs` (desde la raíz) → "trace-check: 3 specs · 167 IDs · 39 archivos de test · 0 hallazgos" / "trace-check OK" (exit 0).
  - E2E completo US-01 + US-02 contra el stack real: Strapi de /home/claude/cotizador-multipais/backend en producción, SQLite temporal en /tmp, SEED_ON_BOOT=true, secretos ficticios por env, puerto 1337, más `npm start` del frontend, con E2E_BASE_URL=http://localhost:4200. Resultado: "146 passed (2.2m)" (91 de la iteración 1 más 55 nuevos). Una corrida previa dio 137 de 146; los 9 fallos eran de mis tests y los corregí antes de la corrida final (ver riesgos).
  - Greps en frontend/src: 0 coincidencias de NgModule, `*ngIf`/`*ngFor`, `: any`/`as any`/`<any>` y localhost:1337. Sin literales de ciudades, planes, monedas o precios fuera de tests/fixtures y del contrato. La única coincidencia de "COP" es `UI_COPY` (el catálogo de textos).
  - Procesos (Strapi, ng serve, vite) detenidos (0 restantes). Eliminados dist, .angular, test-results, playwright-report y /tmp/e2e-strapi.
- **Pendientes / riesgos:**
  1. Orden de Tab en el Paso 2: el DOM es "Volver" y luego "Continuar al resumen". El E2E de teclado (AC-02.13) hace Tab dos veces desde el radio: primero Volver y después Continuar habilitado. Mantuve DOM igual al orden visual por WCAG 2.4.3. Si el spec exige un solo Tab hasta Continuar, @qa-reviewer debe decidirlo.
  2. Ciudad guardada que ya no existe: el guard compara los valores guardados con la config vigente, así que el Paso 2 devuelve al Paso 1 (campo ciudad vacío). Es comportamiento de la iteración 1 (R-01.9/R-01.10). El caso "pct = 0 sin error" está cubierto en unit (city-adjustment.spec), y el E2E verifica descarte, redirección y precio base tras reelegir.
  3. La persistencia a sessionStorage es asíncrona (effect de QuoteStore). Los E2E usan `choosePlan`, que espera la clave. No es un defecto de usuario, pero un reload inmediato tras elegir podría perder la selección por milisegundos.
  4. R-02.24 y AC-02.19/AC-02.26 se verifican con E2E-M (`page.route`). Falta la prueba manual en vivo contra Strapi: checklist "cambio de configuración en vivo" de HITL-3.
  5. Los atributos `currency` y `priceAdjustmentPct` los trae el seed del backend (verificado con curl y en los E2E-S). No toqué backend/ ni docs/reviews/.
  6. Sin git commit, como se pidió. Cambios sin commitear en frontend/.
- **Requiere HITL:** No (HITL-3 manual de R-02.24/AC-02.19/AC-02.26 ya previsto en el spec).

---

## Verificación independiente del Orquestador
- `npm run lint` → exit 0 (`All files pass linting.`); `npm test -- --watch=false` → `Test Files 30 passed (30)` · `Tests 284 passed (284)`; build prod → `Initial total 311.81 kB`, `Application bundle generation complete.`
- `node scripts/trace-check.mjs` → `3 specs · 167 IDs · 39 archivos de test · 0 hallazgos` · OK.
- Greps de patrones prohibidos en `frontend/src` → 0.
- **E2E reproducidos** contra stack real (Strapi 5.63 producción + `ng serve`): `146 passed (2.2m)`.
- Riesgos 1 y 3 se derivan a `@qa-reviewer` (Fase 6).
