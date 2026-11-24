# Code Review — US-01 (Formulario dinámico multi-país)

- **Fecha:** 2026-11-23
- **Revisor:** `@qa-reviewer` (modelo: opus; re-auditoría en sonnet, ver nota) + validación humana (HITL-3 parte 2, pendiente de firma)
- **Alcance:** commits `5158d5b..3c331af` (HEAD `3c331af`, árbol de trabajo limpio)
- **Trazabilidad:** `US-01` → `SPEC-US-01 v3 (Aprobado)` → `ADR-001`, `ADR-002` → código → tests
- **Resultado inicial:** `APROBADO CON OBSERVACIONES`
- **Resultado final:** `APROBADO` — 3/3 hallazgos cerrados (F-01.2 y F-01.3 RESUELTOS; F-01.1 ACEPTADO en HITL-3). Sujeto a la verificación manual y firma humana de HITL-3 parte 2.

## Ejecución real de la suite
| Comando | Resultado literal |
| :--- | :--- |
| `npm run lint` (frontend) | `exit 0` · "Linting \"frontend\"... All files pass linting." |
| `npm test -- --watch=false` (frontend) | `exit 0` · "Test Files 38 passed (38)" · "Tests 353 passed (353)" (Vitest 5.1.1, 1.28 s) |
| `npm run build -- --configuration production` (frontend) | `exit 0` · "Initial total 307.30 kB (83.43 kB transfer)" · "Application bundle generation complete." · `step-3-component 16.50 kB`, `step-2-component 11.38 kB`, `step-1-component 32.43 kB` |
| `npm run build` (backend) | `exit 0` · "✔ Compiling TS (3860ms)" · "✔ Building build context (968ms)" · "✔ Building admin panel (30622ms)" |
| `npx playwright test` (E2E_BASE_URL=http://127.0.0.1:4200) | Stack real: Strapi 5.63.0 `NODE_ENV=production` + SQLite temporal `/tmp`, `SEED_ON_BOOT=true`, secretos ficticios, :1337 + `ng serve` :4200 (proxy `/api`). Corrida 1: "192 passed (3.8m)" · Corrida 2: "192 passed (3.8m)" · Estrés `e2e/us-03-a11y.spec.ts:39 --repeat-each=12 --workers=2`: "2 failed · 10 passed (32.3s)" (ver F-03.2) |
| `node scripts/trace-check.mjs` | `exit=1` (esperado mientras haya BLOCKER/MAJOR abiertos) · "trace-check: 3 specs · 167 IDs · 54 archivos de test · 17 hallazgos" · "✖ F-PL.1 (BLOCKER) en docs/reviews/REVIEW-PLATFORM.md no está RESUELTO ni ACEPTADO." · "✖ F-PL.2 (MAJOR) en docs/reviews/REVIEW-PLATFORM.md no está RESUELTO ni ACEPTADO." · "✖ F-PL.3 (MAJOR) en docs/reviews/REVIEW-PLATFORM.md no está RESUELTO ni ACEPTADO." · "✖ F-02.1 (MAJOR) en docs/reviews/REVIEW-US-02.md no está RESUELTO ni ACEPTADO." · "✖ F-03.1 (BLOCKER) en docs/reviews/REVIEW-US-03.md no está RESUELTO ni ACEPTADO." · "✖ F-03.2 (MAJOR) en docs/reviews/REVIEW-US-03.md no está RESUELTO ni ACEPTADO." · "trace-check FALLÓ con 6 error(es)." · Antes de esta review (sin REVIEW-*.md): "trace-check: 3 specs · 167 IDs · 54 archivos de test · 0 hallazgos" · "trace-check OK" |

## Revisión estática (checklist §2 de la skill)
| Revisión estática | Resultado |
| :--- | :--- |
| Angular prohibidos: `grep -rnE "NgModule\|\*ngIf\|\*ngFor\|: any\b\|as any\|<any>" frontend/src` | 0 coincidencias (`exit=1`) |
| `OnPush` en todo `@Component` | 12/12 componentes con `ChangeDetectionStrategy.OnPush` |
| `(click)` en elementos no interactivos | 0 (solo `<a>` del skip link y `<button>`) |
| `innerHTML` / `bypassSecurityTrust*` | 0 |
| R-01.12: literales de `key` del seed en `domain/` y `features/` | 0. `key` solo se usa como atributo HTML `name` (`dynamic-field.component.ts:21`), nunca en lógica; la lógica usa `config.roles[...]` (`semantic-roles.ts:19`, `pricing.ts:21`, `field-validators.ts:87-106`) |
| R-01.15 / CLAUDE regla 2: constantes 18 / 20 / 1 de negocio | 0 fuera de tests: edad y rango vienen de `country.rules` (`field-validators.ts:90,99-100`) |
| R-01.27: literales de UI en plantillas | 0: todo texto pasa por `t()` sobre `i18n/ui-copy.es.ts` |
| Contrato `frontend/src/app/core/contracts/strapi-contracts.ts` vs `docs/contracts/strapi-contracts.ts` | `diff` sin diferencias (copia exacta) |
| Consola: `console.*` fuera de tests | 5 sitios; ninguno con valores del formulario (solo `documentId` o conteos): `mappers.ts:138,146`, `plans.ts:27,38`, `main.ts:6` |

## Cobertura de la spec
63 IDs (R-01.1–R-01.31, AC-01.1–AC-01.32): **63 con test que los cita en el título, 0 faltantes.** La columna de código muestra la primera referencia con ID en código no-test (las AC son escenarios y se implementan vía sus R-).

| ID | Evidencia en código | Test (archivo:línea › título) (n.º de tests que lo citan) | Estado |
| :--- | :--- | :--- | :--- |
| R-01.1 | `src/app/core/country/config-load.ts:4` | `src/app/app.routes.spec.ts:22` › [R-01.1] rutas de entrada (14) | OK (ver F-01.3, ruta de paso desconocida) |
| R-01.2 | `src/app/core/http/mappers.ts:167` | `src/app/domain/form/form-layout.spec.ts:4` › [R-01.2] orden del formulario (6) | OK |
| R-01.3 | `src/app/features/step-1/step-1-form.component.ts:34` | `e2e/us-01-form.spec.ts:6` › [R-01.2][R-01.3][AC-01.1] formulario configurado por país (2) | OK |
| R-01.4 | `src/app/domain/form/field-validators.ts:47` | `src/app/domain/form/field-validators.spec.ts:81` › [R-01.4] un solo mensaje por campo (5) | OK |
| R-01.5 | `src/app/domain/form/field-validators.ts:57` | `src/app/domain/form/field-validators.spec.ts:18` › [R-01.5] obligatoriedad (4) | OK |
| R-01.6 | `src/app/core/http/mappers.ts:34` | `src/app/domain/form/field-validators.spec.ts:48` › [R-01.6] validadores declarativos (5) | Desvío menor (F-01.1) |
| R-01.7 | `src/app/features/step-1/step-1-form.component.ts:34` | `e2e/us-01-form.spec.ts:65` › [R-01.4][R-01.7][AC-01.2] validación de campo y envío (3) | OK |
| R-01.8 | `src/app/core/quote/quote.store.ts:13` | `src/app/core/quote/quote.store.spec.ts:22` › [R-01.8] QuoteStore persiste cada cambio por país (10) | OK con riesgo (F-01.2) |
| R-01.9 | `src/app/core/quote/quote.store.ts:42` | `src/app/domain/form/form-hydration.spec.ts:6` › [R-01.9] hidratación tolerante (10) | OK |
| R-01.10 | `src/app/core/guards/step-access.ts:11` | `src/app/core/guards/step-access.spec.ts:13` › [R-01.10] guard de acceso a los pasos (15) | OK |
| R-01.11 | `src/app/core/country/config-load.ts:4` | `src/app/domain/form/semantic-roles.spec.ts:13` › [R-01.11] roles semánticos requeridos (11) | OK |
| R-01.12 | `src/app/domain/form/semantic-roles.ts:18` | `src/app/domain/form/semantic-roles.spec.ts:64` › [R-01.12] la lógica localiza por rol, nunca por key (5) | OK |
| R-01.13 | `src/app/core/clock.ts:3` | `src/app/domain/form/legal-age.spec.ts:10` › [R-01.13] mayoría de edad por fecha calendario local (6) | OK |
| R-01.14 | `src/app/domain/form/field-validators.ts:94` | `src/app/domain/form/vehicle-year-range.spec.ts:8` › [R-01.14] año del vehículo (3) | OK |
| R-01.15 | `src/app/core/http/mappers.ts:50` | `src/app/domain/form/country-params.spec.ts:5` › [R-01.15] parámetros de reglas por país (6) | OK |
| R-01.16 | `src/app/domain/form/field-validators.ts:105` | `src/app/domain/form/document-dependent-pattern.spec.ts:11` › [R-01.16] patrón del número según el tipo de documento (8) | OK |
| R-01.17 | `backend/src/extensions/seed-data.ts:98-99` (patrones CC/CE del seed) | `src/app/domain/form/document-dependent-pattern.spec.ts:19` › [R-01.17] CC acepta 6 a 10 dígitos y CE solo 6 o 7 (3) | OK |
| R-01.18 | `src/app/domain/form/field-validators.ts:27` | `src/app/domain/form/cl-rut.spec.ts:9` › [R-01.18] RUT chileno (Módulo 11) (7) | OK |
| R-01.19 | `src/app/domain/form/field-validators.ts:27` | `src/app/domain/form/vehicle-plate.spec.ts:10` › [R-01.19] placa y patente (5) | OK |
| R-01.20 | `src/app/core/api/strapi-api.service.ts:11` | `src/app/core/quote/quote.store.spec.ts:50` › [R-01.20] QuoteStore aísla los países (10) | OK |
| R-01.21 | `src/app/core/country/country.store.ts:20` | `e2e/us-01-config-mutations.spec.ts:13` › [R-01.21][AC-01.3] cambio de configuración sin despliegue (3) | OK (E2E-M); prueba en vivo pendiente en HITL-3 |
| R-01.22 | `src/app/core/country/config-load.ts:4` | `src/app/features/step-1/step-1-view-state.spec.ts:5` › [R-01.22] estados de la vista del Paso 1 (9) | OK |
| R-01.23 | `src/app/core/api/strapi-api.service.ts:10` | `src/app/core/country/config-load.spec.ts:10` › [R-01.23] respuesta de campos (14) | OK |
| R-01.24 | `src/app/core/quote/quote.store.ts:8` | `src/app/core/quote/quote.store.spec.ts:74` › [R-01.24] QuoteStore con almacenamiento corrupto (10) | OK |
| R-01.25 | `src/app/app.ts:88` | `src/app/shared/design-tokens.spec.ts:76` › [R-01.25] contraste de tokens (T4, WCAG 2.2 AA) (12) | OK |
| R-01.26 | `src/app/domain/form/field-validators.ts:120` | `src/app/domain/form/field-validators.spec.ts:97` › [R-01.26] momento de validación (5) | OK |
| R-01.27 | `src/app/i18n/ui-copy.es.ts:2` | `src/app/i18n/ui-copy.spec.ts:5` › [R-01.27] catálogo de copy ui-copy.es (6) | OK |
| R-01.28 | `src/app/domain/form/semantic-roles.ts:28` | `src/app/domain/form/email-field.spec.ts:54` › [R-01.28] correo obligatorio por configuración (10) | OK |
| R-01.29 | `src/app/domain/form/field-validators.ts:27` | `src/app/domain/form/email-field.spec.ts:9` › [R-01.29] formato del correo (6) | OK |
| R-01.30 | `src/app/domain/form/normalizers.ts:39` | `src/app/domain/form/input-attributes.spec.ts:3` › [R-01.30] atributos de propósito de la entrada (derivados del rol) (6) | OK |
| R-01.31 | `backend/src/extensions/seed-data.ts:110` (patrón de placa CO); sin lógica en Angular | `src/app/domain/form/vehicle-plate.spec.ts:41` › [R-01.31][AC-01.31] AAA123 y AAA12A son válidas con el patrón de auto y moto (6) | OK |
| AC-01.1 | Escenario: ver las R- citadas en el título del test | `e2e/us-01-form.spec.ts:6` › [R-01.2][R-01.3][AC-01.1] formulario configurado por país (3) | OK |
| AC-01.2 | Escenario: ver las R- citadas en el título del test | `e2e/us-01-form.spec.ts:65` › [R-01.4][R-01.7][AC-01.2] validación de campo y envío (2) | OK |
| AC-01.3 | Escenario: ver las R- citadas en el título del test | `e2e/us-01-config-mutations.spec.ts:13` › [R-01.21][AC-01.3] cambio de configuración sin despliegue (2) | OK (E2E-M); prueba en vivo pendiente en HITL-3 |
| AC-01.4 | Escenario: ver las R- citadas en el título del test | `src/app/core/storage/quote-storage.spec.ts:17` › [R-01.8][AC-01.4] la clave es auto_quote_v1_<country> y los datos hacen ida y vuelta, incl (3) | OK |
| AC-01.5 | `src/app/features/country-not-found/country-not-found.component.ts:8` | `e2e/us-01-form.spec.ts:40` › [R-01.1][AC-01.5][AC-01.6] rutas (2) | OK |
| AC-01.6 | `src/app/core/guards/step-guards.ts:14` | `src/app/domain/country/country-resolver.spec.ts:12` › [R-01.1][AC-01.6] el código en mayúsculas redirige a minúsculas; el imposible va a /countr (3) | OK |
| AC-01.7 | Escenario: ver las R- citadas en el título del test | `src/app/domain/form/semantic-roles.spec.ts:14` › [R-01.11][AC-01.7] falta el rol %s → config-error que lo nombra (4) | OK |
| AC-01.8 | Escenario: ver las R- citadas en el título del test | `src/app/domain/form/semantic-roles.spec.ts:65` › [R-01.12][AC-01.8] renombrar todas las key produce los mismos errores de validación (3) | OK |
| AC-01.9 | Escenario: ver las R- citadas en el título del test | `e2e/us-01-form.spec.ts:281` › [AC-01.9][AC-01.10] bordes de fecha y año con el reloj fijado en 2026-11-23 (2) | OK |
| AC-01.10 | Escenario: ver las R- citadas en el título del test | `e2e/us-01-form.spec.ts:281` › [AC-01.9][AC-01.10] bordes de fecha y año con el reloj fijado en 2026-11-23 (2) | OK |
| AC-01.11 | Escenario: ver las R- citadas en el título del test | `src/app/domain/form/country-params.spec.ts:6` › [R-01.15][AC-01.11] con legalAge 21 una persona de 20 años es inválida (4) | OK |
| AC-01.12 | Escenario: ver las R- citadas en el título del test | `src/app/domain/form/document-dependent-pattern.spec.ts:12` › [R-01.16][AC-01.12] con CC, 12345678 es válido; con CE es inválido con el mensaje de la op (3) | OK |
| AC-01.13 | `src/app/domain/form/validate-step1.ts:18` | `src/app/domain/form/document-dependent-pattern.spec.ts:57` › [R-01.16][AC-01.13] cambiar el tipo identifica el número como campo a revalidar solo si ti (4) | OK |
| AC-01.14 | Escenario: ver las R- citadas en el título del test | `e2e/us-01-form.spec.ts:116` › [R-01.18][AC-01.14] RUT de Chile (2) | OK |
| AC-01.15 | Escenario: ver las R- citadas en el título del test | `e2e/us-01-form.spec.ts:139` › [R-01.19][R-01.31][AC-01.15][AC-01.31] placa y patente (3) | OK |
| AC-01.16 | Escenario: ver las R- citadas en el título del test | `src/app/core/quote/quote.store.spec.ts:51` › [R-01.20][AC-01.16] los datos de CO no aparecen en CL y vuelven al regresar a CO (4) | OK |
| AC-01.17 | `src/app/core/api/strapi-api.service.ts:11` | `e2e/us-01-country-isolation.spec.ts:49` › [R-01.20][AC-01.17] respuesta tardía de otro país (E2E-M) (2) | OK |
| AC-01.18 | Escenario: ver las R- citadas en el título del test | `src/app/core/quote/quote.store.spec.ts:31` › [R-01.8][AC-01.18] tras recargar (nuevo store) los valores se restauran (3) | OK |
| AC-01.19 | Escenario: ver las R- citadas en el título del test | `src/app/domain/form/form-hydration.spec.ts:17` › [R-01.9][AC-01.19] un documentId sin campo publicado se ignora y se informa para purgarlo (3) | OK |
| AC-01.20 | Escenario: ver las R- citadas en el título del test | `src/app/domain/form/form-hydration.spec.ts:32` › [R-01.9][AC-01.20] una opción de select eliminada se descarta y el campo queda vacío sin e (3) | OK |
| AC-01.21 | Escenario: ver las R- citadas en el título del test | `src/app/domain/form/validate-step1.spec.ts:24` › [R-01.10][AC-01.21] un campo nuevo requerido publicado después hace inválido el Paso 1 ya  (3) | OK |
| AC-01.22 | `src/app/shared/async-state/state-cards.component.ts:31` | `src/app/features/step-1/step-1-view-state.spec.ts:31` › [AC-01.22] un error recuperable ofrece reintentar y no pierde datos (el estado no los cont (3) | OK |
| AC-01.23 | `src/app/features/step-1/step-1-view-state.ts:24` | `src/app/features/step-1/step-1-view-state.spec.ts:19` › [R-01.22][AC-01.23] solo el estado ready ofrece avanzar (empty, error y config-error no) (2) | OK |
| AC-01.24 | Escenario: ver las R- citadas en el título del test | `e2e/us-01-a11y.spec.ts:60` › [AC-01.24] Paso 1 solo con teclado (3) | OK |
| AC-01.25 | `src/app/core/storage/quote-storage.ts:31` | `src/app/core/quote/quote.store.spec.ts:75` › [R-01.24][AC-01.25] JSON inválido → estado vacío, clave eliminada y reemplazada al escribi (3) | OK |
| AC-01.26 | `src/app/domain/form/form-layout.ts:6` | `src/app/domain/form/form-layout.spec.ts:24` › [AC-01.26] desempate de order (3) | OK |
| AC-01.27 | Escenario: ver las R- citadas en el título del test | `src/app/domain/form/field-validators.spec.ts:28` › [R-01.5][AC-01.27] un checkbox requerido sin marcar falla y marcado pasa; uno no requerido (3) | OK |
| AC-01.28 | Escenario: ver las R- citadas en el título del test | `src/app/domain/form/email-field.spec.ts:67` › [R-01.28][AC-01.28] ana.perez@example.com es válido en CO y CL (4) | OK |
| AC-01.29 | Escenario: ver las R- citadas en el título del test | `e2e/us-01-form.spec.ts:182` › [R-01.28][R-01.29][AC-01.28][AC-01.29] correo del tomador (2) | OK |
| AC-01.30 | Escenario: ver las R- citadas en el título del test | `src/app/domain/form/input-attributes.spec.ts:4` › [R-01.30][AC-01.30] el rol email declara autocomplete=email, inputmode=email y spellcheck= (4) | OK |
| AC-01.31 | Escenario: ver las R- citadas en el título del test | `src/app/domain/form/vehicle-plate.spec.ts:41` › [R-01.31][AC-01.31] AAA123 y AAA12A son válidas con el patrón de auto y moto (3) | OK |
| AC-01.32 | Escenario: ver las R- citadas en el título del test | `src/app/domain/form/vehicle-plate.spec.ts:47` › [R-01.31][AC-01.32] si negocio cambia el patrón a solo auto, ABC12D pasa a inválida sin to (3) | OK (E2E-M); prueba en vivo pendiente en HITL-3 |

## Hallazgos
| ID | Severidad | Archivo / Línea | Regla afectada | Descripción | Acción correctiva | Estado y evidencia |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **F-01.1** | `MINOR` | `frontend/src/app/core/http/mappers.ts:36-42` | R-01.6 | `compilePattern` envuelve el patrón de Strapi como `^(?:patrón)$`. R-01.6 dice "aplicada al valor completo tal como se escribió el patrón". Con los patrones del seed (anclados) el resultado es idéntico, pero con un patrón sin anclas que escriba negocio (p. ej. `[0-9]{6}`) el comportamiento cambia: el envoltorio rechaza "abc123456" que la `RegExp` literal aceptaría por subcadena. Es más estricto y probablemente deseable, pero no es la letra de la regla y ningún test documenta el caso no anclado. | Decidir en HITL-3: (a) aceptar el envoltorio y enmendar R-01.6 ("se exige coincidencia completa aunque el patrón no esté anclado") más un test `[R-01.6] patrón sin anclas exige coincidencia completa`; o (b) quitar el envoltorio (`new RegExp(source)`). Recomendado: (a). | ACEPTADO — HITL-3 (se mantiene el envoltorio `^(?:…)$`, más estricto y deseado; R-01.6 enmendada en SPEC-US-01 v3.1). Test de respaldo verificado: `frontend/src/app/core/http/mappers.spec.ts › [F-01.1][R-01.6] patrón sin anclas exige coincidencia completa` |
| **F-01.2** | `MINOR` | `frontend/src/app/core/quote/quote.store.ts:27-31` | R-01.8, R-02.11, R-03.14, CLAUDE regla 6 | La persistencia en `sessionStorage` ocurre en un `effect` (en el siguiente tick de detección de cambios), no en la mutación. Hay una ventana de milisegundos en la que el estado en memoria y el almacenamiento difieren; los E2E la esquivan con esperas explícitas (`choosePlan` espera la clave; "~150 ms" en log 08). Para un humano es prácticamente inalcanzable, pero hace a los tests dependientes de tiempos y viola la intención "cada cambio se guarda". | Escribir de forma síncrona en `setStep1Values`, `setSelectedPlan`, `clearSelectedPlan` y `setConfirmation` (ya se hace en `activate`) y dejar el `effect` solo si se quiere como respaldo. Añadir unit `[R-01.8] la escritura ocurre en la misma llamada` y retirar las esperas de los E2E. | RESUELTO — commit a246e40, test `frontend/src/app/core/quote/quote.store.spec.ts › [F-01.2][R-01.8] setStep1Values, setSelectedPlan, clearSelectedPlan y setConfirmation escriben sin esperar al effect` (+ `[F-01.2][R-01.20]`); retirada la espera por polling de `choosePlan` |
| **F-01.3** | `MINOR` | `frontend/src/app/app.routes.ts:43` | R-01.1, CLAUDE §4 | Con país válido y paso inexistente (`/co/quote/step-9`, `/co/foo`) el comodín `**` lleva a `/country-not-found` con el título "No encontramos ese país", mensaje falso (el país existe). Verificado con Playwright: `/co/quote/step-9 -> /country-not-found`. La spec no define este caso. | Añadir `{ path: '**', redirectTo: 'step-1' }` bajo `:country/quote` (y bajo `:country`) y un test `[R-01.1] paso desconocido con país válido redirige a step-1`. | RESUELTO — commit a246e40, test `frontend/src/app/app.routes.spec.ts › [F-01.3][R-01.1]` y `frontend/e2e/platform-contract.spec.ts › [F-01.3][R-01.1]` |

## Verificación manual pendiente (HITL-3)
- R-01.21 / AC-01.3 / AC-01.32: publicar un campo nuevo y cambiar el patrón de placa de CO desde el admin de Strapi y recargar (sin token, sin deploy).
- T9 de la guía (lector de pantalla) no automatizado.

## Intervención humana (HITL-3)
- **Decisión:** pendiente. El humano debe, por cada hallazgo `BLOCKER`/`MAJOR`, exigir la corrección (cierre `RESUELTO — commit <sha>, test <archivo › título>`) o aceptarlo con motivo (`ACEPTADO — decisión humana HITL-3 (<motivo>)`).
- Los tres hallazgos son `MINOR` (no bloquean CI). Recomendación del revisor: aceptar F-01.1 con enmienda de R-01.6 y corregir F-01.2 y F-01.3 en la misma iteración que los BLOCKER de US-03/plataforma.

## Re-auditoría (2026-11-23, modelo sonnet por límite de uso de opus)
- **Commit auditado:** `a246e40` (base de la review: `722ee49`; decisiones humanas: `docs/hitl/HITL-3-review.md`).
- **Nota de modelo:** Modelo: la re-auditoría corre en `sonnet` (no `opus`) por límite de uso del modelo opus, por decisión humana; se pierde parte de la independencia respecto de los implementadores (también `sonnet`) y se compensa verificando todo con ejecución real, reproduciendo cada escenario con sondas propias y sin aceptar los Handoffs.

### Ejecución real
| Comando (re-auditoría) | Resultado literal |
| :--- | :--- |
| `npm run build` (backend, `NODE_ENV=production`) | "✔ Building build context (126ms)" · "✔ Building admin panel (21963ms)" |
| Arranque 1 Strapi (SQLite en `/tmp`, `SEED_ON_BOOT=true`, secretos y admin ficticios por env) | "[security] Permisos Public: 3 concedidos, 8 revocados (solo find en 3 tipos)." · "[seed] Creados: 2 paises, 25 campos, 8 planes (un pais existente no se vuelve a sembrar)." |
| `npm run lint` (frontend) | "All files pass linting." |
| `npm test -- --watch=false` | "Test Files  40 passed (40)" · "Tests  365 passed (365)" |
| `npm run build -- --configuration production` | "Initial total \| 307.67 kB \| 83.48 kB" · "Application bundle generation complete." |
| `grep -rnE "NgModule\|\*ngIf\|\*ngFor\|: any\b\|as any" frontend/src` | vacío |
| `grep -rniE "bearer\|api[_-]?token\|STRAPI_.*(TOKEN\|SECRET)\|localhost:1337\|authorization" frontend/src frontend/dist` | solo 5 líneas en `*.spec.ts` (tests que afirman la AUSENCIA de la cabecera); 0 en `frontend/dist` |
| `SMOKE_BUNDLE_DIR=frontend/dist/frontend/browser node scripts/security-smoke.mjs` (proxy `ng serve` :4200 + Strapi :1337) | "PASS  [9] Bundle …/frontend/dist/frontend/browser sin Bearer/api_token/STRAPI_*TOKEN/Authorization" · "SKIP  [10] … gitleaks" · "Resumen: 18 PASS, 0 FAIL, 1 SKIP" · "security-smoke: OK" |
| `node scripts/security-smoke.selftest.mjs` | "OK   bundle-con-token: exit=1 (esperado 1) FAIL en [9]: true" · "selftest: el smoke detecta cada vulnerabilidad simulada" |
| `npx playwright test e2e/us-03-a11y.spec.ts e2e/full-flow-co.spec.ts --repeat-each=12 --workers=2` | "108 passed (2.6m)" (9 tests × 12, 0 fallos) |
| `npx playwright test` (E2E completo, Strapi real + `ng serve`) | "200 passed (4.0m)" |
| `npx playwright test --grep @strapi --list \| tail -1` · `--grep-invert @strapi` · sin filtro | "Total: 127 tests in 12 files" · "Total: 73 tests in 11 files" · "Total: 200 tests in 17 files" (los 73 sin etiqueta están en los 11 archivos que usan `mockStrapi`; intersección con archivos sin `mockStrapi`: vacía) |
| `docker compose config -q` (base y con `docker-compose.postgres.yml`) · `grep -rn hashFiles .github \| wc -l` | `base-ok` · `pg-ok` · `0` |
| `node scripts/trace-check.mjs --write` y `node scripts/trace-check.mjs` | "✔ docs/TRACEABILITY.md regenerado" · "trace-check: 3 specs · 167 IDs · 57 archivos de test · 21 hallazgos" · "trace-check OK" (exit 0) |

### Reproducciones independientes
- **F-03.1** (sonda propia, no el E2E del implementador; reutiliza solo los helpers de formulario): "CO confirmación: Tu cotización COT-CO-20261123-5BBB fue confirmada." → header → Chile sin recarga → Rechazado → "rechazo tras 1336 ms; URL http://127.0.0.1:4200/cl/quote/step-3" · "auto_quote_v1_cl contiene confirmation: false | contiene número CO: false" · "body contiene número CO: false". Antes del fix: "confirmation (41 ms)" con el número de CO persistido; ahora hay simulación (≈1,3 s), alerta de rechazo y ningún número de CO.
- **F-PL.2** (admin ficticio creado por `STRAPI_ADMIN_EMAIL/PASSWORD`, `content-manager` con el JWT de admin): antes → "campos CO 13 | phone presente: true", "planes CO 4 [basico, plus, premium, legado]"; cambios → renombrar `premium`→`premium-2027` "Premium 2027" (PUT 200 + publish 200) y borrar `phone` (DELETE 200) → "campos CO 12 | phone presente: False"; reinicio (proceso anterior detenido y puerto comprobado libre) → "[security] Permisos Public: 0 concedidos, 0 revocados" · "[seed] Creados: 0 paises, 0 campos, 0 planes (un pais existente no se vuelve a sembrar)." → "campos CO 12 | phone presente: false" · "planes CO 4 [basico, plus, legado, premium-2027]" · "campos CL 12 paises 2". Sin duplicados ni reaparición. (Primer intento de publicar con una URL equivocada dio 400; corregido el script, no el sistema.)
- La BD temporal se recreó desde cero antes de los E2E (para no heredar los cambios de negocio de la prueba). Al terminar se detuvieron solo mis procesos (Strapi :1337 y `ng serve` :4200) y se eliminaron `frontend/dist`, `.angular`, `test-results`, `playwright-report`, la BD en `/tmp` y `backend/.tmp`.

### Cierre de hallazgos de este reporte
| Hallazgo | Sev. | Estado | Evidencia |
| :--- | :--- | :--- | :--- |
| `F-01.1` | MINOR | ACEPTADO (HITL-3) | R-01.6 enmendada (SPEC-US-01 v3.1); test `mappers.spec.ts › [F-01.1][R-01.6] patrón sin anclas exige coincidencia completa` pasa dentro de los 365 unit |
| `F-01.2` | MINOR | RESUELTO | `quote.store.spec.ts › [F-01.2][R-01.8]…` y `[F-01.2][R-01.20]`; 200 E2E verdes sin la espera por polling |
| `F-01.3` | MINOR | RESUELTO | `app.routes.spec.ts › [F-01.3][R-01.1]` y `platform-contract.spec.ts › [F-01.3][R-01.1]` |
