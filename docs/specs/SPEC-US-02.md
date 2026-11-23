# SPEC-US-02 — Listado y Selección de Planes

- **Historia origen:** `docs/user-stories/US-02.md` · **Versión:** v3 · **Estado:** Aprobado (HITL-1 cerrado 2026-11-23; v3 verificada por el Orquestador — `docs/logs/03-spec-analyst-specs-v3.md`)
- **ADRs relacionados:** `ADR-001`, `ADR-002` (`docs/adrs/`). `ADR-003` (despliegue gratuito) no aplica a esta spec.
- **Specs relacionadas:** `SPEC-US-01` (roles `birth_date` y `vehicle_year`, función `validateStep1`, `QuoteState`, resolvedor de país), `SPEC-US-03` (consume el plan elegido y el precio final). El precio también lee el rol `city` y su `priceAdjustmentPct` (contrato en `SPEC-US-01` §4, GAP-01.22).
- **Decisiones humanas vinculantes:** `docs/hitl/HITL-1-specs.md` (v3 aplica: GAP-02.1 Opción B `currency` en el plan; E2E de mutación de Strapi con respuesta simulada y sin token de escritura; corrección 3, ajuste por ciudad, GAP-02.18 y GAP-02.19).
- **Contexto global:** `CLAUDE.md` §3 (reglas 2, 3, 4, 6, 7), §4 (rutas), §7 (funciones puras, estados como unión discriminada).
- **Entradas para otros agentes:** el contrato TS de la sección 4 debe formalizarse en `docs/contracts/strapi-contracts.ts` (**entrada para `@architect`**; el archivo aún no existe). Para `@cms-engineer`: GAP-02.1 (campo `currency` y lifecycle), GAP-02.9, GAP-02.12 y GAP-02.18 (atributo `priceAdjustmentPct` con `min -10` y `max 30`).

## 1. Vacíos detectados

`Sí` en la última columna = **DECISIÓN HUMANA REQUERIDA** (HITL-1).

| ID GAP | Pregunta | Riesgo si no se decide | Decisión propuesta | ¿Requiere humano? |
| :--- | :--- | :--- | :--- | :--- |
| GAP-02.1 | **Moneda del plan (decidido en HITL-1: Opción B).** La historia dice que cada plan se configura en Strapi con `currency`. La v2 proponía derivarla de `country.currencyCode` (Opción A, sin campo en el plan). | Si negocio pudiera poner `COP` en un plan de Chile, se mostraría un precio con moneda incoherente con el país. | **Decisión humana HITL-1: Opción B** ("B: currency en el plan"; el humano rechazó la recomendación A del agente). `insurance-plan.currency` (enum `COP`, `CLP`, obligatorio) configurado en Strapi + lifecycle `beforeCreate/beforeUpdate` que exige `currency === country.currencyCode` (error legible en el admin). El front formatea con `country.currencyCode` (única fuente para `Intl`), usa `plan.currency` solo como aserción y trata cualquier diferencia (incluye ausente, nula o fuera del enum) como `config-error` (R-02.19), sin mostrar precios. Cumple la historia a la letra. Costo asumido: redundancia y un error más posible para negocio, mitigado por el lifecycle. Para `@cms-engineer`: el seed trae `currency` (`COP` en CO, `CLP` en CL); el lifecycle del plan no se dispara al editar el país, por lo que se sugiere también impedir en `country` un cambio de `currencyCode` con planes de otra moneda (el `config-error` del front es la red de seguridad); `strapi-5-docker-seed` §1 dice "Sin campo `currency`" y debe actualizarse. Enum fijo: otra moneda exige ampliarlo (cambio de esquema). | Resuelto en HITL-1 (Opción B) |
| GAP-02.2 | El contrato v1 diverge del modelo: `coverages: string[]` y `benefits: string[]` (el modelo usa componentes `plan.coverage {name, description, limit}` y `plan.benefit {text}`), incluye `currency` y omite la consulta del `country`. | Tipos que no representan la respuesta real; coberturas sin `limit`; formateo de moneda sin datos del país. | Contrato v2 (sección 4) alineado al modelo. El front pide además el registro `country` (`currencyCode`, `locale`, `legalAge`...). **Entrada para `@architect`.** | No |
| GAP-02.3 | Regla de ajuste simulada: ¿aditiva o multiplicativa? ¿cómo se calcula la edad del vehículo (solo año) y la del tomador (fecha completa)? ¿el redondeo `Math.round(base * (1 + a + b))` es seguro con flotantes? ¿qué pasa con vehículo de año futuro (edad -1)? ¿ejemplos? | `1000000 * (1 + 0.1 + 0.12)` produce `1220000.0000000002` y los empates `.5` pueden redondear distinto según el flotante; inconsistencias entre Paso 2 y 3. | Factores como **porcentajes enteros** aditivos y fórmula entera `Math.floor((base * (100 + pct) + 50) / 100)` (redondeo half-up, resultado entero, sin decimales). Edad del vehículo = `añoActual - vehicle_year` (puede ser negativa → tramo `≤ 3`). Edad del tomador = `calculateAge(birth_date, hoy)` por fecha calendario local (misma función de US-01). Reloj inyectable. Tabla y ejemplos en R-02.6 y R-02.7. | No |
| GAP-02.4 | **DECISIÓN HUMANA REQUERIDA — Parámetros de la regla de ajuste.** Los tramos (`≤ 3`, `4–10`, `> 10`, `< 25`) y porcentajes (`+10`, `0`, `+15`, `+12`) ¿viven en código o en Strapi? La regla 2 de `CLAUDE.md` prohíbe hardcodear edad mínima o rango de años, pero no menciona factores de precio; la historia dice "la regla está documentada" (apunta a regla fija y documentada). | Si es código: cambiar un factor exige deploy (tensión con el espíritu de 100 % configurable). Si es Strapi: requiere un tipo nuevo y permisos Public extra (regla 4 limita a tres tipos). | **Recomendación:** constantes en **un único módulo** `frontend/src/app/domain/pricing/pricing-rules.ts` (datos, no lógica dispersa), documentadas en esta spec y en JSDoc; la historia exige que la regla sea "simulada y documentada". Mover los factores a Strapi se registra como mejora futura. | Resuelto en HITL-1 (Acepto): constantes documentadas en un solo módulo para vehículo y edad. El factor por ciudad se resuelve aparte (GAP-02.18). |
| GAP-02.5 | ¿Qué precio ve el usuario: solo el final o también el base? ¿Se explica el ajuste? | El usuario no entiende por qué el precio difiere del de otra persona; o se expone una regla de riesgo sin contexto. | Mostrar el precio final de forma destacada y, solo cuando difiere del base, un texto secundario "Precio base {base}" (copy del catálogo). No se muestran porcentajes. | No |
| GAP-02.6 | **Acoplamiento semántico del precio:** el cálculo necesita los roles `birth_date` y `vehicle_year`. ¿Qué pasa si falta alguno, si la fecha es inválida o el año no es numérico? | `NaN` en pantalla o plan sin ajuste en silencio. | El cálculo localiza los datos solo por rol. Si falta rol, el valor es inválido o la regla produce `NaN` → `config-error` del Paso 2 (no se muestra ningún precio). Normalmente el guard ya redirigió al Paso 1 (R-02.1). | No |
| GAP-02.7 | **DECISIÓN HUMANA REQUERIDA — Plan elegido que cambia entre pasos.** (a) Se despublica o desactiva (`isActive = false`) tras elegirlo; (b) su `basePrice` cambia; (c) los datos del Paso 1 cambian y por ende el precio final. ¿Qué ve el usuario y se le exige elegir de nuevo? | Pagar un plan inexistente; pagar un precio distinto al que vio sin enterarse. | (a) Al entrar al Paso 2 o 3 se refetchea; si el plan guardado (por `documentId`) ya no está → se limpia la selección, aviso `role="status"` ("El plan elegido ya no está disponible") y en Paso 3 se redirige al Paso 2. (b) y (c): el precio mostrado siempre se recalcula con datos frescos; si difiere del `priceSeenAtSelection` guardado, se muestra aviso `role="status"` "El precio de tu plan cambió" con el nuevo valor y la selección se conserva. No se bloquea el pago. | Resuelto en HITL-1 (Acepto): aviso `role="status"` sin bloquear el pago. Si negocio prefiere forzar nueva selección cuando suba el precio, solo cambia R-02.13. |
| GAP-02.8 | Entrada directa al Paso 2 sin Paso 1 válido, o recarga del Paso 2: ¿qué se restaura? ¿Se confía en un flag? | Plan con datos incompletos; precio sin ajuste. | `step2Guard` ejecuta `validateStep1` (SPEC-US-01 R-01.10) contra la configuración vigente; inválido → `step-1` con campos marcados. En recarga se refetchean planes y país y se hidrata la selección por `documentId`. | No |
| GAP-02.9 | Query REST exacta: la v1 omitía `status=published`, el `populate` de componentes, `pageSize` (default 25) y un desempate de `order`. La skill `strapi-5-docker-seed` usa `populate=*`. | Planes truncados en silencio a 25; coberturas sin traer; orden no determinista con `order` repetido. | Query de la sección 4 con `status=published`, `populate[coverages]=true`, `populate[benefits]=true`, `pageSize=100`, `sort[0]=order:asc&sort[1]=createdAt:asc`. `meta.pagination.total > 100` → `config-error`. **Para `@cms-engineer`:** alinear la skill con esta query. | No |
| GAP-02.10 | Varios planes `isRecommended`: el lifecycle de Strapi los limita a uno activo por país, pero un import o seed puede violarlo. ¿Y el recomendado no es el primero? | Varios destacados (pierde sentido) o ninguna regla de desempate. | Se destaca **solo el primero** (por orden de lista) con `isRecommended = true`; los demás se muestran normales y se emite `console.warn`. El recomendado no se preselecciona ni se reordena (manda `order`). | No |
| GAP-02.11 | Formato de moneda: la v1 usaba `if` por país (`es-CO`/`es-CL`) en el código. ¿De dónde salen locale y moneda? ¿Y si Strapi trae un locale o moneda inválidos (`Intl` lanza `RangeError`)? El símbolo `$` es el mismo en COP y CLP. | Hardcode por país contradice la regla 2; excepción no controlada al renderizar. | `Intl.NumberFormat(country.locale, { style: 'currency', currency: country.currencyCode, minimumFractionDigits: 0, maximumFractionDigits: 0 })`. Locale o moneda inválidos → `config-error`. Se acepta el símbolo `$` que entrega `Intl` (los espacios no separables varían por versión de ICU: los tests normalizan espacios). | No |
| GAP-02.12 | `basePrice` inválido (no entero, negativo, nulo), plan sin `name`, o plan sin coberturas. ¿Se rompe la lista o se omite el plan? | `NaN` o `$ -5`; lista vacía por un plan mal configurado sin que nadie lo vea. | Plan con `basePrice` no entero o negativo, o sin `name`, se excluye de la lista y se emite `console.warn` (sin datos personales). Si tras excluir queda vacía, estado `empty`. Plan sin coberturas o sin beneficios es válido: la sección correspondiente se omite. Se sugiere a `@cms-engineer` validar esto también en lifecycle. | No |
| GAP-02.13 | Selección accesible: ¿qué semántica usar? ¿Se puede deseleccionar? ¿Cómo se comunica que "Continuar" está deshabilitado? | Selección solo por clic; lectores de pantalla sin saber qué plan está elegido; usuario sin saber por qué no avanza. | Grupo de radios nativos (`fieldset` + `legend`, o `role="radiogroup"`); flechas cambian la selección, `Space` la marca; no se puede deseleccionar. "Continuar al resumen" con `disabled` nativo hasta elegir, con texto de ayuda visible junto al botón. | No |
| GAP-02.14 | Cambio de país con peticiones en vuelo y selección guardada. | Planes de un país bajo moneda de otro. | Mismo criterio que GAP-01.9: clave de almacenamiento por país, respuestas del país anterior descartadas, cambio de país aterriza en `step-1`. | No |
| GAP-02.15 | Estados de red: ¿qué distingue `empty` de `error`? ¿Se pierde la selección al reintentar? | Mostrar "no hay planes" cuando en realidad cayó la API. | `empty` solo si la respuesta fue 200 con 0 planes válidos. Red, timeout (10 s) o 4xx/5xx → `error` con `role="alert"` y "Reintentar" que conserva datos y selección. Datos inválidos → `config-error`. | No |
| GAP-02.16 | Copy de UI no cubierto por Strapi ("Recomendado", "No hay planes disponibles…", "Continuar al resumen", "Volver al formulario", "Precio base", avisos). | Literales repartidos por plantillas. | Cubierto por **GAP-01.17** (catálogo único `ui-copy.es.ts`). La decisión humana es la misma y se registra una sola vez. | No (depende de GAP-01.17) |
| GAP-02.17 | Presentación de coberturas y beneficios: ¿qué campos se muestran y en qué orden? | Datos del modelo (`limit`, `description`) sin usar; orden arbitrario. | Cobertura: `name`, `limit` (si existe) y `description` (si existe), en el orden de Strapi del componente repetible. Beneficio: `text`. `shortDescription` bajo el nombre del plan. | No |
| GAP-02.18 | **Ajuste de precio simulado por ciudad/región (corrección humana 3, HITL-1).** El factor debe documentarse en la regla de precio. ¿Dónde vive sin hardcodear ciudades en Angular (regla 2 de `CLAUDE.md`), cómo se lee sin depender del `key` (regla 3), qué límites tiene y qué granularidad? | Literales de ciudad en `pricing-rules.ts` (negocio no puede agregar ni cambiar ciudades sin deploy); un factor sin límites permitiría precios absurdos o negativos por un error de tipeo (`-100`); un modelo nuevo choca con la regla 4 (Public solo con tres tipos). | **Alternativas evaluadas:** (A) atributo opcional `priceAdjustmentPct` en `form.field-option`, leído de la opción elegida en el campo con rol `city`; (B) tipo nuevo `city-adjustment` o relación en `country`; (C) constantes por ciudad en `pricing-rules.ts`; (D) JSON crudo en `country`. **Recomendada: A.** Razones: las ciudades ya viven como opciones del `select` `city` por país en Strapi, así que el factor se edita en el mismo formulario donde negocio edita la opción; cero modelos nuevos y el rol Public sigue con tres tipos (el componente viaja en la query existente de `form-field`, `populate[options]=true`); (B) exigiría un 4.º tipo con `find` público (viola la regla 4 salvo ampliarla); (C) viola la regla 2; (D) JSON crudo lo prohíbe la skill de Strapi. Contras de A, mitigados: el atributo existe en todas las opciones, por eso solo se lee del campo con rol `city` y se ignora con `console.warn` en otros (R-02.23); mezcla un dato de precio en un componente de formulario, por eso la descripción del atributo en el admin dice "Ajuste simulado de precio en % para esta ciudad; vacío = sin ajuste". Atributo: entero `priceAdjustmentPct`, `min -10`, `max 30` (validación nativa de Strapi) y el front lo revalida. Es **aditivo** con los demás factores (R-02.6). **Rango `[-10, +30]` inclusivo:** el piso `-10` deja el precio en ≥ 90 % del base (nunca negativo ni cercano a 0), el techo `+30` mantiene el total máximo en `+57` (15 + 12 + 30), del mismo orden que los demás factores; las constantes viven en `pricing-rules.ts` (GAP-02.4 aceptado). **Granularidad** = la de las opciones (ciudad o región; p. ej. "Otra ciudad" sin atributo). **Semilla ficticia editable:** CO Bogotá D.C. `+8`, Medellín `+5`, Cali `+3`, "Otra ciudad" sin atributo; CL Santiago `+8`, Valparaíso `+4`, Concepción `+2`, Punta Arenas `-5`. El factor viaja en la API pública (la regla es simulada y documentada). | Resuelto en cierre de HITL-1: el humano aprueba opción A y rango [-10, +30] (`docs/hitl/HITL-1-specs.md`). |
| GAP-02.19 | **Faltantes e inválidos del ajuste por ciudad.** ¿Qué pasa si no hay campo `city`, no hay selección, la opción no trae atributo o el valor es inválido? | Precio sin ajuste en silencio, `NaN`, o `config-error` espurio en un país sin campo ciudad. | La ausencia legítima es neutra y el valor presente pero inválido es `config-error` (coherente con GAP-02.6): rol `city` ausente → `0` (rol opcional, GAP-01.2); campo sin valor o valor huérfano descartado por R-01.9 → `0`; opción elegida sin `priceAdjustmentPct` (nulo/ausente) → `0`; entero en `[-10, +30]` → ese valor; no entero, texto, `NaN`, `< -10` o `> 30` en la **opción elegida** → `config-error` que nombra el campo y la opción; rol `city` duplicado o con `type ≠ select` → `config-error`; atributo en opciones de otros campos → ignorado con `console.warn`. Solo se valida la opción elegida (Strapi ya limita el rango al guardar). | No |

## 2. Reglas de negocio

| ID R | Regla medible | Origen | Verificación |
| :--- | :--- | :--- | :--- |
| R-02.1 | `step2Guard` ejecuta `validateStep1(config, values, now)`; con ≥ 1 error redirige a `/:country/quote/step-1` y marca esos campos como tocados. No se usa ningún flag persistido. | US-02 AC "Plans for the country" (Dado: completé el Paso 1), GAP-02.8 | Unit + E2E |
| R-02.2 | Peticiones exactas de la sección 4 (país, planes y los campos de `SPEC-US-01` §4 para leer el rol `city`), solo rutas relativas `/api/...`; el fallo de cualquiera es un `error` único; timeout 10 000 ms → `error`; `meta.pagination.total > 100` → `config-error`; sin token en el navegador. | CLAUDE reglas 4 y §7, GAP-02.9 | Unit de construcción de URL + E2E |
| R-02.3 | La lista muestra solo planes publicados, con `isActive = true` y del país, en el orden de la respuesta (`order` asc, empate `createdAt` asc). Defensivamente, el cliente descarta cualquier plan con `isActive !== true`. | US-02 regla "Only published and active plans", GAP-02.9 | Unit + E2E |
| R-02.4 | Un plan con `basePrice` no entero, negativo o nulo, o sin `name` se excluye y se emite `console.warn`; si no queda ninguno, estado `empty`. Un plan sin coberturas o sin beneficios es válido y su sección se omite. | GAP-02.12 | Unit |
| R-02.5 | Formato de precio: `Intl.NumberFormat(country.locale, { style: 'currency', currency: country.currencyCode, minimumFractionDigits: 0, maximumFractionDigits: 0 })`. COP `1220000` con `es-CO` produce un texto equivalente (espacios normalizados) a `$ 1.220.000`; CLP `1220000` con `es-CL` equivale a `$1.220.000`. Sin decimales. Locale o moneda inválidos → `config-error`. Cifras con `tabular-nums`. | US-02 regla "price in the country's currency and format", GAP-02.11 | Unit + E2E |
| R-02.6 | Regla simulada de ajuste (porcentajes enteros aditivos). Antigüedad del vehículo `v = añoActual - vehicle_year`: `v ≤ 3` → `+10`; `4 ≤ v ≤ 10` → `0`; `v > 10` → `+15`. Edad del tomador `e` (años cumplidos): `e < 25` → `+12`; `e ≥ 25` → `0`. Ciudad/región: `pctCiudad` = `priceAdjustmentPct` de la opción elegida en el campo con rol `city` (R-02.21 a R-02.23), entero en `[-10, +30]`, `0` si falta. `precio = Math.floor((basePrice * (100 + pctVehículo + pctEdad + pctCiudad) + 50) / 100)`; el total de porcentajes está siempre en `[-10, +57]`, por lo que el precio nunca es negativo. Ejemplos **sin ajuste de ciudad (`pctCiudad = 0`)** con año actual 2026 y hoy `2026-11-23`: base 1 000 000, año 2025, nacido `2005-01-01` → `1 220 000`; base 850 000, año 2020, nacido `1990-05-10` → `850 000`; base 1 234 567, año 2012, nacido `2004-12-01` → `1 567 900`; base 1 010, año 2010, nacido `1990-01-01` → `1 162`; base 450 000, año 2027 (`v = -1`), nacido `1980-01-01` → `495 000`. Frontera: año 2023 (`v = 3`) `+10`, 2022 (`v = 4`) `0`, 2016 (`v = 10`) `0`, 2015 (`v = 11`) `+15`; nacido `2001-11-23` (25 hoy) `0`, `2001-11-24` (24 hoy) `+12`. **Ejemplos con ciudad** (mismo reloj): base 1 000 000, año 2025 (`+10`), nacido `1990-01-01` (`0`), Bogotá D.C. (`+8`) → total `+18` → `1 180 000`; base 1 000 000, año 2025, nacido `2005-01-01` (`+12`), Bogotá D.C. → total `+30` → `1 300 000`; base 850 000, año 2020 (`0`), nacido `1990-05-10`, Medellín (`+5`) → `892 500`; base 1 234 567, año 2012 (`+15`), nacido `2004-12-01` (`+12`), Cali (`+3`) → total `+30` → `1 604 937`; base 1 010, año 2020, nacido `1990-01-01`, Medellín (`+5`) → `1 061` (empate `.5`, half-up); base 1 000 000, año 2020, nacido `1990-01-01`, Punta Arenas (`-5`) → `950 000`. Límites: base 100 000, año 2015 (`+15`), nacido `2001-11-24` (`+12`), ciudad `+30` → total `+57` → `157 000`; base 100 000, año 2020, nacido `1990-01-01`, ciudad `-10` → `90 000`. | US-02 regla "final price may be adjusted by a simulated rule… documented", GAP-02.3, GAP-02.18, HITL-1 corrección 3 | Unit |
| R-02.7 | Entradas de la regla: `vehicle_year`, `birth_date` y `city` se localizan solo por `semanticRole`; la edad del tomador usa `calculateAge` de US-01 (fecha calendario local, sin UTC); el reloj es inyectable. Los tramos y porcentajes de vehículo y edad, y el rango `[-10, +30]` del ajuste de ciudad, viven en un único módulo `pricing-rules.ts` (GAP-02.4 aceptado en HITL-1); el factor de cada ciudad vive en Strapi. | CLAUDE regla 3, GAP-02.3, GAP-02.4, GAP-02.18 | Unit |
| R-02.8 | El resultado de la regla es siempre un entero ≥ 0. Si falta el rol `birth_date` o `vehicle_year`, la fecha no es válida, el año no es entero o el ajuste de ciudad es inválido (R-02.22), el cálculo devuelve un error tipado y la vista pasa a `config-error` (nunca se renderiza `NaN` ni un precio sin ajuste). | GAP-02.6, GAP-02.19 | Unit + E2E |
| R-02.9 | El precio mostrado es una señal derivada (`computed`) del Paso 1 persistido y del plan: si el usuario vuelve al Paso 1 y cambia `vehicle_year`, `birth_date` o la opción del campo `city`, el precio de todos los planes y del plan elegido refleja el cambio al volver al Paso 2 sin recargar. | US-02 regla de ajuste, GAP-02.3 | Unit + E2E |
| R-02.10 | Plan recomendado: se destaca con texto visible "Recomendado" (del catálogo) **y** borde distintivo, sin depender solo del color; se destaca únicamente el primero con `isRecommended = true` (los demás sin destacar, con `console.warn`). No se preselecciona ni se reordena. | US-02 AC "Recommended plan", GAP-02.10 | Unit + E2E |
| R-02.11 | Selección única: grupo de radios nativos con una única opción marcada; elegir B desmarca A; no hay deselección; se guarda `selectedPlan.planDocumentId` y `priceSeenAtSelection` en `QuoteState`. "Continuar al resumen" está `disabled` hasta que hay selección válida y navega a `/:country/quote/step-3`. | US-02 regla "Only one plan can be selected", AC "Plan selection", GAP-02.13 | Unit + E2E |
| R-02.12 | Al entrar al Paso 2 (incluida la recarga) se refetchean planes; si el `documentId` guardado no está en la lista vigente, se limpia la selección, se anuncia aviso `role="status"` y "Continuar" queda deshabilitado. | GAP-02.7 | Unit + E2E |
| R-02.13 | Si el precio final recalculado del plan guardado difiere de `priceSeenAtSelection`, se muestra aviso `role="status"` con el nuevo valor; la selección se conserva y `priceSeenAtSelection` se actualiza cuando el usuario pulsa "Continuar al resumen" (GAP-02.7 aceptado en HITL-1). | GAP-02.7 | Unit + E2E |
| R-02.14 | Cada plan muestra: `name`, `shortDescription`, precio final, coberturas (`name`, `limit` y `description` si existen) y beneficios (`text`), en el orden devuelto por Strapi para cada lista. | US-02 regla "Each plan is configured… coverages, benefits", GAP-02.17 | E2E |
| R-02.15 | Vista del Paso 2 como unión discriminada `loading` / `ready` / `empty` / `error` / `config-error`. `empty`: mensaje "No hay planes disponibles…" (catálogo) y botón "Volver al formulario". `error`: `role="alert"` y "Reintentar" que refetchea sin perder datos ni selección. `empty` solo con respuesta 200 y 0 planes válidos. | US-02 AC "No plans available", GAP-02.15 | Unit + E2E |
| R-02.16 | Aislamiento por país: el almacenamiento es `auto_quote_v1_<country>`; los planes de un país nunca se muestran bajo otro; una respuesta tardía de otro país se descarta; cambiar de país aterriza en `step-1`. | CLAUDE regla 6, GAP-02.14 | Unit + E2E |
| R-02.17 | La selección vive en el mismo `QuoteState` que el Paso 1; "Volver" navega a `step-1` sin perder datos; "Nueva cotización" (US-03) la elimina junto con el resto. | CLAUDE regla 6 | Unit + E2E |
| R-02.18 | Accesibilidad del Paso 2: `legend`/nombre accesible del grupo de planes; cada radio con nombre, precio y etiqueta "Recomendado" asociados vía `aria-describedby`; foco al `h1` al entrar; navegación con flechas, `Space` para marcar, `Tab` hasta el botón; avisos de selección/precio en regiones `aria-live`; "Continuar" deshabilitado con texto de ayuda visible. | CLAUDE regla 7, GAP-02.13 | E2E de teclado + ARIA |
| R-02.19 | Moneda del plan (Opción B de GAP-02.1, HITL-1): `insurance-plan.currency` ∈ {`COP`, `CLP`} es obligatorio en Strapi y su lifecycle exige `currency === country.currencyCode`. El front formatea siempre con `country.currencyCode` (R-02.5) y verifica cada plan recibido: `plan.currency !== country.currencyCode` (incluye ausente, nulo o fuera del enum) → `config-error` del Paso 2 (y del Paso 3) que nombra al plan y las dos monedas; no se renderiza ningún precio y el plan no se excluye en silencio (R-02.4 no aplica). `plan.currency` nunca se usa para formatear. | US-02 regla "currency" y "price in the country's currency", GAP-02.1, HITL-1 | Unit + E2E-M |
| R-02.20 | Todo texto de interfaz proviene del catálogo `ui-copy.es.ts`; el contenido de planes (nombre, descripción, coberturas, beneficios) proviene de Strapi. | CLAUDE regla 2, GAP-02.16 | Unit del catálogo + revisión estática |
| R-02.21 | Fuente del ajuste por ciudad: el factor es `priceAdjustmentPct` de la opción **elegida** en el único campo publicado con `semanticRole = city` (opciones del componente `form.field-option`, ya traídas por la query de campos de `SPEC-US-01` §4). Ninguna ciudad, región ni factor por ciudad aparece como literal en el código de Angular (búsqueda estática en `domain/` y `features/`); renombrar el `key` del campo o de la opción no cambia el precio. Un factor en una opción de un campo con otro rol se ignora con `console.warn`. | Corrección humana 3 (HITL-1), CLAUDE reglas 2 y 3, GAP-02.18 | Unit con `key` aleatorias + revisión estática en `@qa-reviewer` |
| R-02.22 | Validez del factor: `priceAdjustmentPct` de la opción elegida debe ser entero en `[-10, +30]` con extremos inclusivos (constantes en `pricing-rules.ts`). `-10` y `30` válidos; `-11`, `31`, `2.5`, `NaN` y texto (`"abc"`) → `config-error` que nombra el campo y la opción, sin precio. Rol `city` duplicado o con `type ≠ select` → `config-error`. Solo se valida la opción elegida. Strapi aplica el mismo rango (`min -10`, `max 30`) al guardar. | GAP-02.18, GAP-02.19 | Unit + E2E-M |
| R-02.23 | Comportamiento si falta: rol `city` ausente, campo `city` sin valor (opcional), valor guardado cuya opción ya no existe (descartado por R-01.9), opción elegida sin `priceAdjustmentPct` (nulo/ausente) o con `0` → `pctCiudad = 0`, sin error ni aviso, y el precio es idéntico al de la regla sin ciudad. | GAP-02.19 | Unit + E2E-M |
| R-02.24 | Cambio sin despliegue: modificar `priceAdjustmentPct` de una opción en Strapi (o agregar una ciudad con su factor) se refleja en el precio tras recargar el Paso 2, sin cambios de código; la configuración de campos se refetchea al entrar al Paso 2 (incluida la recarga). El factor no se muestra al usuario (GAP-02.5: sin porcentajes). | Corrección humana 3 (HITL-1), US-02 contexto "managed by the business team", GAP-02.18 | E2E-M (respuesta de Strapi simulada) + Manual-HITL3 |

## 3. Criterios de aceptación

### AC-02.1 — Planes del país
```gherkin
Escenario: Planes del país
  Dado que completé el formulario del Paso 1 en /co/quote/step-1
  Cuando llego al paso de planes
  Entonces veo solo los planes publicados y activos de Colombia
  Y aparecen en el orden configurado en Strapi
  Y no aparece el plan inactivo ni ningún plan de Chile
```

### AC-02.2 — Plan recomendado
```gherkin
Escenario: Plan recomendado
  Dado que un plan está marcado como recomendado en Strapi
  Cuando veo la lista de planes
  Entonces ese plan muestra la etiqueta "Recomendado" y un borde distintivo
  Y ningún otro plan muestra esa etiqueta
```

### AC-02.3 — Selección de plan
```gherkin
Escenario: Selección de plan
  Dado que estoy en la lista de planes
  Cuando selecciono un plan
  Entonces queda marcado como elegido
  Y puedo continuar al resumen
  Cuando selecciono otro plan
  Entonces solo el último queda marcado
```

### AC-02.4 — Sin planes disponibles
```gherkin
Escenario: Sin planes disponibles
  Dado que no hay planes activos para mi país
  Cuando llego al paso de planes
  Entonces veo un mensaje que explica que no hay planes disponibles
  Y veo un botón para volver al formulario
  Y no hay botón para continuar al resumen
```

### AC-02.5 — Acceso directo sin Paso 1
```gherkin
Escenario: Entrar al Paso 2 sin completar el Paso 1
  Dado que no he diligenciado el Paso 1
  Cuando abro /co/quote/step-2
  Entonces soy redirigido a /co/quote/step-1
```

### AC-02.6 — Precio ajustado por tramos
```gherkin
Esquema del escenario: Ajuste simulado del precio
  Dado que hoy es 2026-11-23 y el plan tiene precio base <base>
  Y completé el Paso 1 con año del vehículo <año> y fecha de nacimiento <nacimiento>
  Y la ciudad elegida no tiene ajuste configurado
  Cuando veo el plan
  Entonces su precio final es <final>

  Ejemplos:
    | base    | año  | nacimiento | final   |
    | 1000000 | 2025 | 2005-01-01 | 1220000 |
    | 850000  | 2020 | 1990-05-10 | 850000  |
    | 1234567 | 2012 | 2004-12-01 | 1567900 |
    | 1010    | 2010 | 1990-01-01 | 1162    |
    | 450000  | 2027 | 1980-01-01 | 495000  |
    | 100000  | 2023 | 1990-01-01 | 110000  |
    | 100000  | 2022 | 1990-01-01 | 100000  |
    | 100000  | 2016 | 1990-01-01 | 100000  |
    | 100000  | 2015 | 1990-01-01 | 115000  |
    | 100000  | 2020 | 2001-11-23 | 100000  |
    | 100000  | 2020 | 2001-11-24 | 112000  |
```

### AC-02.7 — Formato de moneda
```gherkin
Esquema del escenario: Formato de moneda por país
  Dado que el precio final de un plan es 1220000 en <país>
  Cuando veo el plan
  Entonces el precio se muestra como <texto> sin decimales

  Ejemplos:
    | país | texto        |
    | co   | $ 1.220.000  |
    | cl   | $1.220.000   |
```

### AC-02.8 — Recálculo al volver al Paso 1
```gherkin
Escenario: Cambiar datos que afectan el precio
  Dado que estoy en el Paso 2 con un plan elegido
  Cuando vuelvo al Paso 1, cambio el año del vehículo de 2025 a 2015 y regreso al Paso 2
  Entonces el precio de todos los planes y del plan elegido se recalcula
  Y el plan sigue elegido
```

### AC-02.9 — Plan elegido despublicado entre pasos
```gherkin
Escenario: El plan elegido deja de estar disponible
  Dado que elegí el plan "Plus" y negocio lo desactiva en Strapi
  Cuando recargo el Paso 2
  Entonces ningún plan aparece marcado
  Y veo un aviso de que el plan elegido ya no está disponible
  Y "Continuar al resumen" está deshabilitado
```

### AC-02.10 — Cambio de precio del plan elegido
```gherkin
Escenario: El precio del plan cambió
  Dado que elegí un plan que costaba 1000000 y negocio lo cambia a 1100000
  Cuando recargo el Paso 2
  Entonces veo el nuevo precio final
  Y veo un aviso de que el precio de mi plan cambió
  Y el plan sigue elegido
```

### AC-02.11 — Error de red recuperable
```gherkin
Escenario: La API de planes falla
  Dado que la API de planes responde 500
  Cuando llego al paso de planes
  Entonces veo una alerta con un botón "Reintentar"
  Cuando la API responde y pulso "Reintentar"
  Entonces veo los planes sin perder mis datos
```

### AC-02.12 — Dato requerido para el precio ausente
```gherkin
Escenario: Falta el rol vehicle_year
  Dado que negocio despublica el campo con rol "vehicle_year"
  Cuando abro el Paso 2 con datos previamente guardados
  Entonces soy redirigido al Paso 1 donde se informa el error de configuración
  Y nunca se muestra un precio con valor NaN
```

### AC-02.13 — Selección con teclado
```gherkin
Escenario: Elegir plan solo con teclado
  Dado que uso únicamente teclado en la lista de planes
  Cuando muevo el foco al grupo y presiono la flecha abajo y luego Space
  Entonces el plan correspondiente queda marcado y anunciado
  Y al presionar Tab llego a "Continuar al resumen" habilitado
```

### AC-02.14 — Recarga en el Paso 2
```gherkin
Escenario: Recarga con plan elegido
  Dado que elegí un plan en el Paso 2
  Cuando recargo el navegador
  Entonces los planes se piden de nuevo a Strapi y el mismo plan sigue marcado
```

### AC-02.15 — Aislamiento por país
```gherkin
Escenario: Cambio de país en el Paso 2
  Dado que elegí un plan en Colombia
  Cuando abro /cl/quote/step-2
  Entonces soy redirigido a /cl/quote/step-1
  Y al volver a /co/quote/step-2 mi plan de Colombia sigue marcado
```

### AC-02.16 — Más de un recomendado
```gherkin
Escenario: Datos con dos recomendados
  Dado que Strapi devuelve dos planes con isRecommended = true
  Cuando veo la lista
  Entonces solo el primero muestra "Recomendado"
```

### AC-02.17 — Plan con precio inválido
```gherkin
Escenario: Plan mal configurado
  Dado que un plan tiene basePrice negativo
  Cuando veo la lista de planes
  Entonces ese plan no aparece
  Y los demás planes siguen mostrándose
```

### AC-02.18 — Moneda del plan coherente con el país
```gherkin
Escenario: La moneda del plan coincide con la del país
  Dado que los planes de Chile traen currency "CLP" y el país Chile tiene currencyCode "CLP"
  Cuando abro la lista de planes de Chile
  Entonces todos los precios se muestran en pesos chilenos con formato es-CL
  Y los planes de Colombia (currency "COP") se muestran con formato es-CO
```

### AC-02.19 — Cambios de negocio sin despliegue
```gherkin
Escenario: Reordenar y desactivar planes
  Dado que negocio cambia el orden de dos planes y desactiva otro
  Cuando recargo el Paso 2
  Entonces veo el nuevo orden y no aparece el plan desactivado
```
*Verificación (HITL-1, "Mock + prueba manual"):* E2E con la respuesta de Strapi simulada (Playwright `route`) y prueba manual en vivo en HITL-3. Ningún token de escritura en ningún entorno.

### AC-02.20 — Coberturas y beneficios
```gherkin
Escenario: Detalle del plan
  Dado que un plan tiene coberturas con límite y beneficios en Strapi
  Cuando veo la lista de planes
  Entonces cada plan muestra sus coberturas con su límite y sus beneficios en el orden de Strapi
```

### AC-02.21 — Moneda del plan distinta de la del país
```gherkin
Esquema del escenario: Moneda incoherente es un error de configuración
  Dado que Strapi devuelve un plan de Chile (currencyCode "CLP") con currency <moneda>
  Cuando abro la lista de planes de Chile
  Entonces veo un error de configuración que nombra al plan y las monedas
  Y no se muestra ningún precio ni el botón "Continuar al resumen"

  Ejemplos:
    | moneda   |
    | "COP"    |
    | "USD"    |
    | (ausente)|
```

### AC-02.22 — Ajuste de precio por ciudad
```gherkin
Esquema del escenario: Ajuste simulado según la ciudad elegida
  Dado que hoy es 2026-11-23 y el plan tiene precio base <base>
  Y completé el Paso 1 con año del vehículo <año>, fecha de nacimiento <nacimiento> y la ciudad <ciudad>
  Cuando veo el plan
  Entonces su precio final es <final>

  Ejemplos:
    | base    | año  | nacimiento | ciudad (ajuste)         | final   |
    | 1000000 | 2025 | 1990-01-01 | Bogotá D.C. (+8)        | 1180000 |
    | 1000000 | 2025 | 2005-01-01 | Bogotá D.C. (+8)        | 1300000 |
    | 850000  | 2020 | 1990-05-10 | Medellín (+5)           | 892500  |
    | 1234567 | 2012 | 2004-12-01 | Cali (+3)               | 1604937 |
    | 1010    | 2020 | 1990-01-01 | Medellín (+5)           | 1061    |
    | 1000000 | 2020 | 1990-01-01 | Punta Arenas (-5)       | 950000  |
    | 100000  | 2015 | 2001-11-24 | opción con ajuste +30   | 157000  |
    | 100000  | 2020 | 1990-01-01 | opción con ajuste -10   | 90000   |
```

### AC-02.23 — Sin ajuste de ciudad configurado
```gherkin
Esquema del escenario: La ausencia de ajuste no cambia el precio
  Dado que hoy es 2026-11-23, el plan cuesta 1000000, el año del vehículo es 2020 y nací el 1990-01-01
  Y <situación>
  Cuando veo el plan
  Entonces su precio final es 1000000 y no veo ningún error

  Ejemplos:
    | situación                                                |
    | el país no tiene un campo con rol city                   |
    | el campo de ciudad no es obligatorio y está vacío        |
    | la opción elegida no tiene priceAdjustmentPct            |
    | la opción elegida tiene priceAdjustmentPct igual a 0     |
    | la ciudad guardada ya no existe entre las opciones       |
```

### AC-02.24 — Ajuste de ciudad inválido
```gherkin
Esquema del escenario: Un factor fuera de rango o no entero es un error de configuración
  Dado que la opción de ciudad elegida trae priceAdjustmentPct <valor>
  Cuando abro la lista de planes
  Entonces veo un error de configuración que nombra el campo de ciudad y la opción
  Y no se muestra ningún precio

  Ejemplos:
    | valor |
    | 31    |
    | -11   |
    | 2.5   |
    | "abc" |
```

### AC-02.25 — Cambiar la ciudad recalcula el precio
```gherkin
Escenario: La ciudad del Paso 1 afecta el precio
  Dado que estoy en el Paso 2 con un plan elegido y la ciudad "Bogotá D.C."
  Cuando vuelvo al Paso 1, cambio la ciudad a "Medellín" y regreso al Paso 2
  Entonces el precio de todos los planes y del plan elegido se recalcula con el ajuste de "Medellín"
  Y el plan sigue elegido
```

### AC-02.26 — Cambiar el factor de una ciudad sin despliegue
```gherkin
Escenario: Negocio edita el ajuste de una ciudad
  Dado que negocio cambia el ajuste de "Cali" de +3 a +6 en Strapi
  Cuando recargo el Paso 2 con la ciudad "Cali" elegida
  Entonces el precio final usa el ajuste +6 sin cambios de código
```
*Verificación:* E2E-M con la respuesta de Strapi simulada y prueba manual en vivo en HITL-3 (sin token de escritura en ningún entorno).

## 4. Contrato de datos

**Entrada para `@architect`:** formalizar en `docs/contracts/strapi-contracts.ts` (inexistente al escribir esta spec). `StrapiCountry`, `StrapiListResponse`, `QuoteState` y `SemanticRole` se definen en `SPEC-US-01` §4.

```ts
export interface PlanCoverage {
  name: string;
  description?: string | null;
  limit?: string | null;         // p. ej. "Hasta 100 SMMLV"
}

export interface PlanBenefit {
  text: string;
}

export interface StrapiInsurancePlan {
  id: number;
  documentId: string;            // identificador estable de la selección
  slug: string;                  // editable por negocio: no se usa para persistir
  name: string;
  shortDescription?: string | null;
  basePrice: number;             // entero >= 0, en la moneda del país
  currency: 'COP' | 'CLP';       // obligatorio; === country.currencyCode (lifecycle) y aserción del front (R-02.19)
  coverages?: PlanCoverage[];
  benefits?: PlanBenefit[];
  order: number;
  isRecommended: boolean;
  isActive: boolean;
  createdAt: string;
}

export interface PricingInput {
  basePrice: number;
  vehicleYear: number;           // valor del rol vehicle_year
  birthDate: string;             // YYYY-MM-DD, valor del rol birth_date
  cityAdjustmentPct: number;     // ya resuelto y validado por resolveCityAdjustment; 0 si falta (R-02.23)
  now: Date;                     // reloj inyectable
}

/** Resultado tipado: nunca NaN ni precio silencioso (R-02.8). */
export type CityAdjustmentResult =
  | { kind: 'ok'; pct: number }
  | { kind: 'config-error'; message: string };
```

**Queries REST exactas** (rutas relativas vía proxy; sin token en el navegador):

- País: `GET /api/countries?filters[code][$eq]=<country>`
- Campos (rol `city` y su `priceAdjustmentPct`): misma query que `SPEC-US-01` §4 (`populate[options]=true` ya trae el atributo; sin cambios de query). `currency` del plan es un atributo escalar y viaja sin `populate`.
- Planes: `GET /api/insurance-plans?filters[country][code][$eq]=<country>&filters[isActive][$eq]=true&status=published&populate[coverages]=true&populate[benefits]=true&sort[0]=order:asc&sort[1]=createdAt:asc&pagination[pageSize]=100`

Funciones puras previstas (CLAUDE §7), en `frontend/src/app/domain/pricing/`: `calculateAdjustedPrice(input): number`, `formatPrice(amount, country): string`, `pickRecommended(plans)`, `sanitizePlans(plans)`, `assertPlanCurrency(plans, country)`, `resolveCityAdjustment(config, values): CityAdjustmentResult` (en `city-adjustment.ts`); constantes (tramos de vehículo y edad, `CITY_ADJUSTMENT_MIN_PCT = -10`, `CITY_ADJUSTMENT_MAX_PCT = 30`) en `pricing-rules.ts`.

## 5. Estados de UI y accesibilidad

| Estado | Condición | Presentación |
| :--- | :--- | :--- |
| `loading` | Petición de país o planes en curso | Indicador `role="status"` |
| `ready` | ≥ 1 plan válido | Grupo de radios con tarjetas de plan; "Volver" y "Continuar al resumen" |
| `empty` | 200 con 0 planes válidos | Mensaje explicativo + "Volver al formulario" |
| `error` | Red, timeout, 4xx/5xx | `role="alert"` + "Reintentar" (sin pérdida de datos/selección) |
| `config-error` | Rol de precio ausente, locale/moneda inválidos, `plan.currency` distinta de `country.currencyCode`, `priceAdjustmentPct` inválido o rol `city` duplicado/con tipo distinto de `select`, `total > 100` | `role="alert"` nombrando el problema |

Accesibilidad: ver R-02.18. El plan recomendado no depende solo del color (R-02.10).

## 6. Matriz de verificación

Tipos: **Unit** (runner por defecto del CLI), **E2E-S** (Playwright contra Strapi sembrado, **solo lectura**), **E2E-M** (Playwright con `page.route`), **Manual-HITL3** (prueba en vivo del humano en HITL-3). El título de cada test incluye el ID.

Regla (HITL-1): ningún token de escritura de Strapi existe en ningún entorno (local, CI, runner de E2E ni navegador). Todo escenario que requiera *mutar* la configuración de Strapi se verifica con E2E-M y se confirma una vez en vivo con Manual-HITL3 (la cadena real admin → API → front no se automatiza sin una credencial de escritura, prohibida por la decisión humana y por `CLAUDE.md` regla 4).

| ID | Tipo | Archivo planificado |
| :--- | :--- | :--- |
| R-02.1 | Unit + E2E-M | `frontend/src/app/core/guards/step-guards.spec.ts`; `frontend/e2e/us-02-plans.spec.ts` |
| R-02.2 | Unit + E2E-M | `frontend/src/app/core/http/strapi-queries.spec.ts`; `frontend/e2e/us-02-states.spec.ts` |
| R-02.3 | Unit + E2E-S | `frontend/src/app/domain/pricing/sanitize-plans.spec.ts`; `frontend/e2e/us-02-plans.spec.ts` |
| R-02.4 | Unit | `frontend/src/app/domain/pricing/sanitize-plans.spec.ts` |
| R-02.5 | Unit + E2E-S | `frontend/src/app/domain/pricing/format-price.spec.ts`; `frontend/e2e/us-02-plans.spec.ts` |
| R-02.6 | Unit | `frontend/src/app/domain/pricing/pricing.spec.ts` |
| R-02.7 | Unit | `frontend/src/app/domain/pricing/pricing.spec.ts` |
| R-02.8 | Unit + E2E-M | `frontend/src/app/domain/pricing/pricing.spec.ts`; `frontend/e2e/us-02-states.spec.ts` |
| R-02.9 | Unit + E2E-S | `frontend/src/app/features/step-2/step-2-state.spec.ts`; `frontend/e2e/us-02-plans.spec.ts` |
| R-02.10 | Unit + E2E-S | `frontend/src/app/domain/pricing/pick-recommended.spec.ts`; `frontend/e2e/us-02-plans.spec.ts` |
| R-02.11 | Unit + E2E-S | `frontend/src/app/features/step-2/step-2-state.spec.ts`; `frontend/e2e/us-02-plans.spec.ts` |
| R-02.12 | Unit + E2E-M | `frontend/src/app/features/step-2/step-2-state.spec.ts`; `frontend/e2e/us-02-plan-changes.spec.ts` |
| R-02.13 | Unit + E2E-M | `frontend/src/app/features/step-2/step-2-state.spec.ts`; `frontend/e2e/us-02-plan-changes.spec.ts` |
| R-02.14 | E2E-S | `frontend/e2e/us-02-plans.spec.ts` |
| R-02.15 | Unit + E2E-M | `frontend/src/app/features/step-2/step-2-state.spec.ts`; `frontend/e2e/us-02-states.spec.ts` |
| R-02.16 | Unit + E2E-M | `frontend/src/app/core/storage/quote-storage.spec.ts`; `frontend/e2e/us-02-states.spec.ts` |
| R-02.17 | Unit + E2E-S | `frontend/src/app/core/storage/quote-storage.spec.ts`; `frontend/e2e/us-02-plans.spec.ts` |
| R-02.18 | E2E-S | `frontend/e2e/us-02-a11y.spec.ts` |
| R-02.19 | Unit + E2E-M | `frontend/src/app/domain/pricing/plan-currency.spec.ts`; `frontend/e2e/us-02-states.spec.ts` |
| R-02.20 | Unit + revisión estática | `frontend/src/app/i18n/ui-copy.spec.ts`; `docs/reviews/REVIEW-US-02.md` (`@qa-reviewer`) |
| R-02.21 | Unit + revisión estática | `frontend/src/app/domain/pricing/city-adjustment.spec.ts`; `docs/reviews/REVIEW-US-02.md` (`@qa-reviewer`) |
| R-02.22 | Unit + E2E-M | `frontend/src/app/domain/pricing/city-adjustment.spec.ts`; `frontend/e2e/us-02-states.spec.ts` |
| R-02.23 | Unit + E2E-M | `frontend/src/app/domain/pricing/city-adjustment.spec.ts`; `frontend/e2e/us-02-plans.spec.ts` |
| R-02.24 | E2E-M + Manual-HITL3 | `frontend/e2e/us-02-plan-changes.spec.ts`; checklist "cambio de configuración en vivo" en el registro de HITL-3 (`docs/hitl/`) |
| AC-02.1 | E2E-S | `frontend/e2e/us-02-plans.spec.ts` |
| AC-02.2 | E2E-S | `frontend/e2e/us-02-plans.spec.ts` |
| AC-02.3 | E2E-S | `frontend/e2e/us-02-plans.spec.ts` |
| AC-02.4 | E2E-M | `frontend/e2e/us-02-states.spec.ts` |
| AC-02.5 | E2E-S | `frontend/e2e/us-02-plans.spec.ts` |
| AC-02.6 | Unit + E2E-M | `frontend/src/app/domain/pricing/pricing.spec.ts`; `frontend/e2e/us-02-plans.spec.ts` (reloj fijado con `page.clock`) |
| AC-02.7 | Unit + E2E-S | `frontend/src/app/domain/pricing/format-price.spec.ts`; `frontend/e2e/us-02-plans.spec.ts` |
| AC-02.8 | Unit + E2E-S | `frontend/src/app/features/step-2/step-2-state.spec.ts`; `frontend/e2e/us-02-plans.spec.ts` |
| AC-02.9 | E2E-M | `frontend/e2e/us-02-plan-changes.spec.ts` |
| AC-02.10 | E2E-M | `frontend/e2e/us-02-plan-changes.spec.ts` |
| AC-02.11 | E2E-M | `frontend/e2e/us-02-states.spec.ts` |
| AC-02.12 | E2E-M | `frontend/e2e/us-02-states.spec.ts` |
| AC-02.13 | E2E-S | `frontend/e2e/us-02-a11y.spec.ts` |
| AC-02.14 | E2E-S | `frontend/e2e/us-02-plans.spec.ts` |
| AC-02.15 | E2E-S | `frontend/e2e/us-02-states.spec.ts` |
| AC-02.16 | Unit + E2E-M | `frontend/src/app/domain/pricing/pick-recommended.spec.ts`; `frontend/e2e/us-02-states.spec.ts` |
| AC-02.17 | Unit + E2E-M | `frontend/src/app/domain/pricing/sanitize-plans.spec.ts`; `frontend/e2e/us-02-states.spec.ts` |
| AC-02.18 | E2E-S | `frontend/e2e/us-02-plans.spec.ts` |
| AC-02.19 | E2E-M + Manual-HITL3 | `frontend/e2e/us-02-plan-changes.spec.ts` (respuesta de Strapi simulada con `page.route`); checklist "cambio de configuración en vivo" en el registro de HITL-3 (`docs/hitl/`) |
| AC-02.20 | E2E-S | `frontend/e2e/us-02-plans.spec.ts` |
| AC-02.21 | Unit + E2E-M | `frontend/src/app/domain/pricing/plan-currency.spec.ts`; `frontend/e2e/us-02-states.spec.ts` |
| AC-02.22 | Unit + E2E-M | `frontend/src/app/domain/pricing/pricing.spec.ts`; `frontend/e2e/us-02-plans.spec.ts` (reloj fijado con `page.clock`) |
| AC-02.23 | Unit + E2E-M | `frontend/src/app/domain/pricing/city-adjustment.spec.ts`; `frontend/e2e/us-02-plans.spec.ts` |
| AC-02.24 | Unit + E2E-M | `frontend/src/app/domain/pricing/city-adjustment.spec.ts`; `frontend/e2e/us-02-states.spec.ts` |
| AC-02.25 | Unit + E2E-S | `frontend/src/app/features/step-2/step-2-state.spec.ts`; `frontend/e2e/us-02-plans.spec.ts` |
| AC-02.26 | E2E-M + Manual-HITL3 | `frontend/e2e/us-02-plan-changes.spec.ts`; checklist de HITL-3 (`docs/hitl/`) |

## 7. Fuera de alcance

- Edición de los tramos y porcentajes de vehículo y edad desde Strapi (ver GAP-02.4; mejora futura). El factor por ciudad sí se edita en Strapi (GAP-02.18).
- Comparador de planes, filtros, ordenación elegida por el usuario y paginación de la lista.
- Cotización multi-plan o selección múltiple; cálculo de impuestos, cuotas o descuentos.
- Precio calculado en el servidor o persistido: el precio es 100 % derivado en el front-end.
- Soporte de más de una moneda por país o conversión de moneda. Monedas distintas de `COP`/`CLP` exigen ampliar el enum de `insurance-plan.currency` (cambio de esquema de Strapi, no solo de contenido).
- Ajuste por ciudad multiplicativo, por código postal o por ciudades no listadas como opciones; mostrar al usuario el porcentaje de ajuste; mover a Strapi los tramos de vehículo y edad (siguen en `pricing-rules.ts`, GAP-02.4).
- Edición del copy de interfaz desde Strapi (GAP-01.17).

## Changelog

### v3 → Aprobado (Orquestador, 2026-11-23)
- Cierre de HITL-1: el humano aprueba GAP-02.18/GAP-01.22 (opción A, rango [-10, +30]) y decide que el correo **no** sea rol requerido (lo controla Strapi). Estado → `Aprobado`. Sin cambios de contenido.

### v2 → v3 (HITL-1, 2026-11-23, `docs/hitl/HITL-1-specs.md`)
- **Estado:** `Aprobado con cambios (HITL-1, 2026-11-23) — v3 pendiente de verificación del Orquestador`. Los GAP decididos en HITL-1 (GAP-02.1, GAP-02.4, GAP-02.7) pasan a "Resuelto en HITL-1"; las marcas "a la espera" de R-02.7 y R-02.13 pasan a "aceptado en HITL-1".
- **GAP-02.1 → Opción B (decisión humana, rechaza la recomendación A):** `insurance-plan.currency` (enum `COP`/`CLP`) validada por lifecycle contra `country.currencyCode`; el front formatea con `country.currencyCode` y una discrepancia es `config-error`. **Modificados:** GAP-02.1, R-02.19, AC-02.18 (ahora "moneda coherente"), contrato (`currency` en `StrapiInsurancePlan`), §5, matriz, §7. **Nuevo:** AC-02.21 (moneda incoherente).
- **Decisión "Mock + prueba manual":** AC-02.19 pasa de E2E-S con token de escritura a **E2E-M + Manual-HITL3**; se elimina toda mención a token de escritura en CI/runner. Los demás E2E-S son de solo lectura.
- **Corrección humana 3 (ajuste por ciudad):** GAP-02.18 (ubicación y límites, **requiere confirmación humana**), GAP-02.19 (faltantes e inválidos); R-02.21, R-02.22, R-02.23, R-02.24; AC-02.22 a AC-02.26. **Modificados:** R-02.2 (también consulta campos), R-02.6 (fórmula con `pctCiudad` y ejemplos numéricos nuevos), R-02.7, R-02.8, R-02.9, contrato (`PricingInput.cityAdjustmentPct`, `CityAdjustmentResult`), funciones puras, §5, matriz, §7, y la precondición de AC-02.6 ("ciudad sin ajuste"; sus ejemplos no cambian).
- **IDs existentes:** ninguno renumerado ni eliminado.
- **Pendientes tras v3:** GAP-02.18 (ubicación A y rango `[-10, +30]`).

### v1 → v2
- **Estado y formato:** se reescribe al formato de la skill `spec-gap-checklist` con IDs trazables y matriz de un renglón por ID. Estado permanece `Borrador (pendiente HITL-1)`.
- **Vacíos nuevos (la v1 no los detectaba):** desviación de moneda frente a la historia (GAP-02.1, decisión humana), contrato v1 con `coverages: string[]`/`currency` inconsistente con el modelo (GAP-02.2), flotantes y redondeo de la fórmula (GAP-02.3), ubicación de los parámetros de la regla (GAP-02.4, decisión humana), plan elegido despublicado o con precio cambiado entre pasos (GAP-02.7, decisión humana), acoplamiento semántico del precio (GAP-02.6), `status=published`, `populate`, paginación y desempate de orden (GAP-02.9), varios recomendados (GAP-02.10), formato con `country.locale`/`currencyCode` sin `if` por país y `RangeError` de `Intl` (GAP-02.11), planes mal configurados (GAP-02.12), accesibilidad del botón deshabilitado (GAP-02.13).
- **Decisiones cambiadas respecto a v1:** la fórmula `Math.round(base * (1 + a + b))` pasa a aritmética entera `Math.floor((base * (100 + pct) + 50) / 100)`; el formato de moneda deja de decidirse por país en código y usa el registro `country`; `currency` desaparece del contrato del plan; el avance dice "resumen" (Paso 3) en lugar de solo "Paso 3"; el estado vacío solo ocurre con respuesta 200 y 0 planes válidos.
- **Conservado de v1:** guard del Paso 2, tramos y porcentajes de la regla (ahora con ejemplos y fronteras), etiqueta "Recomendado" más borde, estado vacío con "Volver al formulario", error recuperable.
- **Pendientes de HITL-1:** GAP-02.1 (moneda), GAP-02.4 (parámetros de la regla), GAP-02.7 (plan o precio cambiado entre pasos), GAP-01.17 (copy de UI, compartido).
