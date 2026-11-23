# SPEC-US-03 — Resumen, Términos y Pago Simulado

- **Historia origen:** `docs/user-stories/US-03.md` · **Versión:** v3 · **Estado:** Aprobado (HITL-1 cerrado 2026-11-23; v3 verificada por el Orquestador — `docs/logs/03-spec-analyst-specs-v3.md`)
- **ADRs relacionados:** `ADR-001`, `ADR-002` (`docs/adrs/`). `ADR-003` (despliegue gratuito) no aplica a esta spec.
- **Specs relacionadas:** `SPEC-US-01` (campos, roles, `validateStep1`, `QuoteState`, aislamiento por país), `SPEC-US-02` (plan elegido, `calculateAdjustedPrice` incluido el ajuste por ciudad, `formatPrice`, moneda del plan, avisos de precio).
- **Decisiones humanas vinculantes:** `docs/hitl/HITL-1-specs.md` (v3 aplica: aparición del correo en el resumen sin enmascarar, GAP-03.18; coherencia con moneda del plan y ajuste por ciudad, GAP-03.19; sin token de escritura en ningún entorno).
- **Contexto global:** `CLAUDE.md` §3 (reglas 2, 3, 4, 5, 6, 7), §4 (rutas, incluida `/:country/quote/confirmation`), §7 (funciones puras: `maskDocumentNumber`, `generateQuoteNumber`, guardia de doble pago).
- **Entradas para otros agentes:** el contrato TS de la sección 4 debe formalizarse en `docs/contracts/strapi-contracts.ts` (**entrada para `@architect`**; el archivo aún no existe). Para `@ui-ux-designer`: GAP-03.5 (selector de simulación), GAP-03.1 y GAP-03.18 (formato del resumen y fila del correo).

## 1. Vacíos detectados

`Sí` en la última columna = **DECISIÓN HUMANA REQUERIDA** (HITL-1).

| ID GAP | Pregunta | Riesgo si no se decide | Decisión propuesta | ¿Requiere humano? |
| :--- | :--- | :--- | :--- | :--- |
| GAP-03.1 | **DECISIÓN HUMANA REQUERIDA — Qué datos del Paso 1 se muestran en el resumen.** La historia dice "los datos del tomador y del vehículo". ¿Todos los campos publicados? ¿Los checkbox sin marcar? ¿Los opcionales vacíos? ¿Se oculta algún dato sensible aparte del documento? La v1 solo hablaba de 3 bloques sin definir contenido. | Un resumen que omite campos que el usuario llenó (o muestra `true`/`false`, o el `value` interno de un select) genera desconfianza; uno que muestra todo puede exponer más PII de la necesaria. | **Recomendación:** mostrar **todos los campos publicados del Paso 1** con valor, agrupados por sección (`policyholder` → bloque tomador, `vehicle` → bloque vehículo), en el orden de configuración, **sin hardcodear la lista** (regla 2). Checkbox: "Sí" / "No" (también cuando está sin marcar). Opcional vacío: "No informado". `select`: la **etiqueta** de la opción, no el `value`. `date`: formato del `country.locale` (p. ej. es-CO `23/11/2008`). Solo `document_number` va enmascarado. Email y teléfono se muestran completos (el usuario los acaba de escribir). Alternativa si negocio prefiere minimizar PII: ocultar también fecha de nacimiento; no cambia la lógica, solo el rol excluido. | Resuelto en HITL-1 (Acepto): todos los campos publicados, checkbox Sí/No, solo el documento enmascarado. |
| GAP-03.2 | Enmascaramiento: la v1 daba ejemplos inconsistentes (`12.345.678-K` → `********78-K` cuenta los puntos como caracteres) y no define la normalización, ni longitud 0 o 1, ni qué hace con espacios. ¿Cómo se localiza el campo? | Máscara distinta según cómo escribió el usuario; un documento de 1 carácter queda visible; búsqueda del campo por `key`. | `maskDocumentNumber` opera sobre el valor **normalizado** (trim, sin puntos ni espacios). Longitud 0 → `''`; 1 → `*`; 2 a 4 → `*` repetido (n-1) + último carácter; > 4 → `*` repetido (n-4) + últimos 4. Ej.: `1020304050` → `******4050`; `12.345.678-5` → `******78-5`; `1.000.005-K` → `*****05-K`; `1234` → `***4`. Campo localizado por el rol `document_number`. El valor completo no aparece en el DOM del Paso 3 ni de la confirmación. | No |
| GAP-03.3 | Términos y condiciones: ¿cómo se renderiza `termsContent` (HTML, Markdown, texto)? ¿Qué pasa si está vacío? ¿Y si falla la carga? ¿Y si cambia la versión? | `innerHTML` de contenido del CMS = vector de XSS; términos vacíos que se aceptan sin leer; pagar sin términos cargados. | Texto plano: se divide `termsContent` por líneas en blanco (`\n{2,}`) y cada bloque va en un `<p>`; nunca `innerHTML` ni Markdown. `termsTitle` como encabezado de la región. Si `termsContent` es vacío o solo espacios → `config-error` y el pago queda bloqueado. Si falla la carga → `error` recuperable con el pago bloqueado. Se muestra `termsVersion` junto al título. | No |
| GAP-03.4 | Aceptación de T&C: ¿se persiste? ¿Qué pasa tras recargar, tras "Editar datos" / "Cambiar plan" o si cambia la `termsVersion`? | Aceptación obsoleta aplicada a datos o términos distintos de los que el usuario vio. | La aceptación **vive solo en memoria** del Paso 3, ligada a la `termsVersion` cargada. Siempre inicia sin marcar al entrar al paso (incluida la recarga) y se reinicia al salir del Paso 3. Tras un pago rechazado se conserva marcada (el usuario sigue en la misma pantalla). | No |
| GAP-03.5 | **DECISIÓN HUMANA REQUERIDA — Cómo se provoca el pago rechazado.** La v1 propone un selector visible "Aprobado / Rechazado" en la UI. ¿Debe un usuario final ver esa opción? Alternativas: selector visible, derivación determinista de un dato, modo por variable de entorno en runtime. | Si no hay mecanismo, QA y revisores no pueden verificar el escenario "Rejected payment"; si es un selector visible, parece un control de producción raro; si depende de build/entorno, rompe 12-factor y cuesta E2E. | **Recomendación:** selector visible en el Paso 3, agrupado y etiquetado de forma inequívoca como **"Simulación de pago (solo pruebas)"**, con opciones "Aprobado" (por defecto) y "Rechazado". Razón: todo el pago es simulado (no hay tarjeta ni pasarela), el criterio de aceptación exige poder ver el rechazo de forma repetible y cualquier mecanismo oculto lo haría invisible a quien evalúa. El modo vive solo en memoria y vuelve a "Aprobado" al recargar. Si se rechaza el selector visible, la alternativa recomendada es un parámetro de runtime (no de build) leído por el servicio de simulación. | Resuelto en HITL-1 (Acepto): selector visible "Simulación de pago (solo pruebas)". |
| GAP-03.6 | Doble envío: la v1 solo trata el doble clic. ¿`Enter` desde el formulario? ¿Recarga durante el proceso? ¿Botón "Atrás" tras confirmar? ¿Otra pestaña? | Dos cotizaciones confirmadas; pagar de nuevo tras volver desde la confirmación. | Tres barreras: (1) señal `isProcessing` que deshabilita el botón (`disabled` + `aria-busy`) en el mismo ciclo; (2) el servicio mantiene una única promesa en vuelo: una segunda llamada concurrente se ignora y no ejecuta otra simulación; (3) tras la aprobación, una nueva llamada se ignora y el `confirmation` queda persistido, de modo que cualquier ruta de pasos 1 a 3 redirige a `/confirmation` hasta "Nueva cotización". Recarga durante el proceso: el pago simulado se pierde y el usuario puede pagar de nuevo (no hubo confirmación). Varias pestañas: fuera de alcance (`sessionStorage` es por pestaña). | No |
| GAP-03.7 | Guard del Paso 3: ¿qué debe cumplirse y a dónde se redirige? ¿Cómo se actúa si el plan se despublicó? ¿Y si ya hay una confirmación? | Pagar con datos incompletos o un plan inexistente; segundo pago. | `step3Guard`, en este orden: (1) hay `confirmation` → `/confirmation`; (2) `validateStep1` con errores → `step-1`; (3) no hay plan elegido o el `documentId` no está en la lista fresca de planes activos → `step-2` con aviso (SPEC-US-02 R-02.12); (4) el precio se recalcula con datos frescos (aviso si difiere, GAP-02.7). `confirmationGuard`: sin `confirmation` → redirige al paso pendiente (mismo orden). | No |
| GAP-03.8 | Coherencia del precio final entre pasos y cuando cambió el precio entre Paso 2 y 3. | El usuario paga un precio distinto del que vio. | El Paso 3 usa las mismas funciones puras que el Paso 2 (`calculateAdjustedPrice`, `formatPrice`) sobre datos frescos. Si el precio difiere del `priceSeenAtSelection`: aviso `role="status"` visible antes de pagar, sin bloquear el pago. Depende de la decisión humana de GAP-02.7. | No (depende de GAP-02.7) |
| GAP-03.9 | Número de cotización: la v1 usa `YYYYMMDD` sin precisar zona horaria ni la fuente de aleatoriedad; 4 hex = 65 536 combinaciones. ¿Es único? | Fecha incorrecta cerca de medianoche (UTC vs local); aleatoriedad no determinista imposible de testear. | `COT-<CÓDIGO_PAÍS_MAYÚSCULAS>-<YYYYMMDD local>-<4 hex mayúsculas>`; ej. `COT-CO-20261123-7B2E`. Fecha de la fecha calendario local. Los 4 hex salen de `crypto.getRandomValues`. Reloj y aleatoriedad inyectables. No hay garantía de unicidad (es una simulación; no hay persistencia de cotizaciones, regla 6). | No |
| GAP-03.10 | Post-confirmación: ¿qué muestra la pantalla? ¿Sobrevive a una recarga? ¿Qué hace "Nueva cotización"? ¿Qué pasa con el botón "Atrás"? | Pantalla vacía al recargar; datos de la cotización anterior que reaparecen en la siguiente. | La confirmación se persiste en `QuoteState.confirmation` (número, plan, precio final, fecha). `/confirmation` muestra el número, el nombre del plan y el precio final; no muestra el documento. Recarga: se mantiene. "Nueva cotización" borra solo la clave `auto_quote_v1_<country>` del país actual y navega a `step-1` vacío. "Atrás" hacia el Paso 3 redirige a `/confirmation`. | No |
| GAP-03.11 | Pago rechazado: ¿qué mensaje? ¿Dónde queda el foco? ¿Qué pasa si el servicio lanza una excepción inesperada? ¿Se desbloquea el botón? | Botón bloqueado para siempre; mensaje críptico; foco perdido; datos borrados. | Mensaje con `role="alert"` que dice que el pago fue rechazado en la simulación y que puede reintentar (copy del catálogo). El foco no se mueve (el anuncio llega por `role="alert"`). `isProcessing` se libera siempre (`finally`). Cualquier excepción inesperada se trata igual que un rechazo. Plan, datos, aceptación y modo de simulación se conservan. | No |
| GAP-03.12 | "Editar datos" / "Cambiar plan": ¿qué se conserva y a dónde se vuelve? | Pérdida de datos o de la selección. | "Editar datos" → `step-1` con todos los datos y la selección conservada. "Cambiar plan" → `step-2` con el plan marcado (si sigue disponible). Al volver al Paso 3 se reinicia la aceptación de T&C y se recalcula el precio. | No |
| GAP-03.13 | Habilitación del botón de pago: la v1 usa `termsAccepted() && !isProcessing() && !paymentConfirmed()`; no considera términos aún sin cargar ni un resumen inválido. ¿Qué semántica de accesibilidad tiene un botón deshabilitado? | Pagar antes de que carguen los términos; botón inactivo sin explicación. | `canPay = termsLoaded && termsAccepted && !isProcessing && !paymentConfirmed && summaryValid`. Se usa `disabled` nativo y un texto de ayuda visible adyacente ("Acepta los términos para continuar", del catálogo). | No |
| GAP-03.14 | Datos personales en consola, DOM, `aria-label`, atributos `data-*` y almacenamiento. | Fuga de PII (aunque sea ficticia, regla 5) por logs o por atributos ocultos. | Ningún valor del formulario ni el documento completo se escribe en `console`, en atributos del DOM ni en mensajes de error. El `sessionStorage` guarda los valores tal como se escribieron (necesario para restaurar) y se borra con "Nueva cotización". | No |
| GAP-03.15 | Formato de valores en el resumen (fecha, número, select, checkbox) y orden de bloques. | Valores crudos (`2008-11-23`, `true`) o inconsistentes entre países. | Formato por tipo según R-03.3. Orden de bloques fijo: tomador, vehículo, plan. | No |
| GAP-03.16 | Copy de UI no cubierto por Strapi ("Acepto los términos y condiciones", "Pagar", "Editar datos", "Cambiar plan", mensajes de rechazo y de éxito, "Nueva cotización"). | Literales repartidos por plantillas. | Cubierto por **GAP-01.17** (catálogo único `ui-copy.es.ts`). Los T&C (textos legales) sí vienen de Strapi. | No (depende de GAP-01.17) |
| GAP-03.17 | Cambio de país y respuestas obsoletas; estados de carga/error del resumen (términos y planes se piden en paralelo). | Términos de un país sobre el resumen de otro; resumen "a medias". | Mismo criterio que GAP-01.9: aislamiento por clave de país y descarte de respuestas del país anterior. El Paso 3 está `ready` solo cuando país (términos) y planes cargaron bien; un fallo de cualquiera → `error` recuperable con pago bloqueado. | No |
| GAP-03.18 | **Correo del tomador en el resumen (corrección humana 1, HITL-1).** El campo `email` (obligatorio en CO y CL, `SPEC-US-01` GAP-01.20) forma parte de los datos del tomador. ¿Se muestra y se enmascara? | Omitirlo contradice GAP-03.1 (todos los campos publicados); enmascararlo impide que el usuario detecte un error de tipeo antes de pagar y no está pedido por la historia (solo el documento va enmascarado). | Se muestra **completo y sin enmascarar** en el bloque del tomador, en la posición dada por la configuración (R-01.2), localizado por el rol `email`. Justificación: (1) HITL-1 aceptó en GAP-03.1 que solo el documento va enmascarado; (2) el propósito del resumen es que la persona confirme sus datos y un correo parcial no permite verificarlo; (3) la historia exige enmascarar únicamente el número de documento; (4) es un dato que la misma persona acaba de escribir en la misma pestaña y no se transmite ni se envía (el envío de correo está fuera de alcance). No aparece en la confirmación ni en consola, atributos del DOM, `title` o `aria-label` (GAP-03.14). Si negocio prefiere enmascararlo, es una decisión nueva que no está incluida en HITL-1. | No (consecuencia de GAP-03.1, aceptado en HITL-1) |
| GAP-03.19 | **Coherencia del Paso 3 con la moneda del plan y el ajuste por ciudad (HITL-1).** El Paso 3 usa los planes y los campos para recalcular el precio. | Un plan con moneda incoherente o un factor de ciudad inválido podrían producir un precio distinto o `NaN` en el resumen. | El Paso 3 usa las mismas funciones puras que el Paso 2 (`calculateAdjustedPrice`, `resolveCityAdjustment`, `assertPlanCurrency`, `formatPrice`) sobre datos frescos y aplica los mismos `config-error` de `SPEC-US-02` (R-02.19, R-02.22) con el pago bloqueado. | No |

## 2. Reglas de negocio

| ID R | Regla medible | Origen | Verificación |
| :--- | :--- | :--- | :--- |
| R-03.1 | `step3Guard` aplica, en orden: (1) hay `confirmation` → `/:country/quote/confirmation`; (2) `validateStep1` con errores → `step-1` marcando campos; (3) sin plan elegido o plan ausente de la lista fresca de planes activos → `step-2` con aviso; (4) si ninguna redirige, entra. `confirmationGuard`: sin `confirmation` redirige al paso pendiente con el mismo orden. | US-03 AC "Complete summary" (Dado: elegí un plan), GAP-03.7 | Unit + E2E |
| R-03.2 | El resumen tiene tres bloques en este orden: tomador (campos con `section = policyholder`), vehículo (`section = vehicle`) y plan elegido. Los campos salen de la configuración vigente de Strapi en el orden de US-01 (R-01.2); ningún nombre de campo está en el código. Valores huérfanos (sin campo publicado) no se muestran. | US-03 regla "summary shows policyholder's data, vehicle's data and the chosen plan", GAP-03.1 | Unit + E2E |
| R-03.3 | Formato por tipo (GAP-03.1 aceptado en HITL-1; el correo del rol `email` es `text` y se muestra tal cual, R-03.24): `select` → etiqueta de la opción; `date` → `Intl.DateTimeFormat(country.locale, { day: '2-digit', month: '2-digit', year: 'numeric' })` sobre la fecha calendario local (es-CO: `2008-11-23` → `23/11/2008`); `checkbox` → "Sí" / "No"; `number` y `text` → texto tal cual; valor opcional vacío → "No informado". El campo con rol `document_number` se muestra enmascarado (R-03.4). | GAP-03.1, GAP-03.15 | Unit + E2E |
| R-03.4 | `maskDocumentNumber(value)` sobre el valor normalizado (trim, sin puntos ni espacios): longitud 0 → `''`; 1 → `*`; 2 a 4 → `*` × (n-1) + último carácter; > 4 → `*` × (n-4) + últimos 4. `1020304050` → `******4050`; `12.345.678-5` → `******78-5`; `1.000.005-K` → `*****05-K`; `1234` → `***4`; `12` → `*2`; `1` → `*`; `' 1020 304 050 '` → `******4050`. El campo se localiza por rol `document_number`. | US-03 regla "document number is shown partially masked", GAP-03.2 | Unit |
| R-03.5 | El documento completo (normalizado o tal como se escribió) no aparece en el DOM de `step-3` ni de `confirmation` (texto, atributos, `aria-label`, `title`), ni en `console`, ni en mensajes de error. | CLAUDE regla 5, GAP-03.2, GAP-03.14 | E2E (inspección de `page.content()` y consola) |
| R-03.6 | Bloque del plan: `name`, `shortDescription`, nombres de las coberturas y precio final formateado con las mismas funciones del Paso 2 (`calculateAdjustedPrice`, `formatPrice`) sobre datos frescos. Para el mismo Paso 1 y plan, el precio es idéntico al del Paso 2, incluido el ajuste por ciudad (`SPEC-US-02` R-02.21 a R-02.23). | US-03 regla "chosen plan with its final price", GAP-03.8, GAP-03.19 | Unit + E2E |
| R-03.7 | Términos y condiciones: `termsTitle`, `termsVersion` y `termsContent` del registro `country` del país actual (`GET /api/countries?filters[code][$eq]=<country>`). `termsContent` se divide por `\n{2,}` y cada bloque se renderiza como `<p>` de texto plano (sin `innerHTML`, Markdown ni HTML). `termsContent` vacío o solo espacios → `config-error` con pago bloqueado. La región tiene nombre accesible y es alcanzable con teclado (`tabindex="0"`). | US-03 AC "Terms by country", GAP-03.3 | Unit + E2E |
| R-03.8 | Aceptación de T&C: casilla "Acepto los términos y condiciones" desmarcada al entrar al Paso 3 (incluida la recarga), solo en memoria, ligada a la `termsVersion` cargada y reiniciada al salir del paso; permanece marcada tras un pago rechazado. | US-03 contexto "must accept the terms", GAP-03.4 | Unit + E2E |
| R-03.9 | `canPay = termsLoaded && termsAccepted && !isProcessing && !paymentConfirmed && summaryValid`. El botón "Pagar" usa `disabled` nativo cuando `canPay` es falso y hay texto de ayuda visible adyacente. | US-03 regla "pay button is enabled only after accepting", GAP-03.13 | Unit + E2E |
| R-03.10 | `PaymentSimulationService.pay(request)` no hace llamadas de red ni recibe datos de tarjeta; espera una latencia simulada de 1 000 ms (valor inyectable por token para tests) y devuelve `approved` (con número de cotización) o `rejected` (código `SIMULATED_REJECTION`) según el modo (`approved` por defecto). | US-03 contexto "Payment is simulated", GAP-03.5 | Unit |
| R-03.11 | Doble envío: durante el procesamiento el botón está `disabled` con `aria-busy="true"` en el mismo ciclo de detección de cambios; dos clics, o clic más `Enter`, ejecutan **una sola** simulación (contador de ejecuciones = 1); una llamada posterior a un pago aprobado no ejecuta nada. | US-03 regla "payment cannot be submitted twice", GAP-03.6 | Unit + E2E |
| R-03.12 | Pago rechazado: aparece un mensaje con `role="alert"` que indica que el pago fue rechazado en la simulación; el botón se rehabilita (si la aceptación sigue marcada); datos del Paso 1, plan, aceptación y modo se conservan; un reintento posterior puede aprobarse. `isProcessing` vuelve a `false` en todos los casos (incluida una excepción inesperada). | US-03 AC "Rejected payment", GAP-03.11 | Unit + E2E |
| R-03.13 | Número de cotización con formato `^COT-[A-Z]{2}-[0-9]{8}-[0-9A-F]{4}$`, país en mayúsculas desde el código de ruta, fecha calendario local, 4 hex de `crypto.getRandomValues`; reloj y aleatoriedad inyectables. Ej.: `COT-CO-20261123-7B2E`. | US-03 regla "simulated quote number", GAP-03.9 | Unit |
| R-03.14 | Pago aprobado: se guarda `QuoteState.confirmation` y se navega a `/:country/quote/confirmation`, que muestra número de cotización, nombre del plan y precio final (no el documento) y enfoca su `h1` con anuncio `role="status"`. Recarga en `/confirmation` conserva el contenido. Cualquier acceso a `step-1`/`step-2`/`step-3` con `confirmation` presente redirige a `/confirmation`. | US-03 regla "On successful payment, a confirmation… is shown", GAP-03.6, GAP-03.10 | Unit + E2E |
| R-03.15 | "Nueva cotización" elimina únicamente la clave `auto_quote_v1_<country>` del país actual y navega a `step-1` con el formulario vacío; la clave del otro país no se toca. | CLAUDE regla 6, GAP-03.10 | Unit + E2E |
| R-03.16 | "Editar datos" navega a `step-1` y "Cambiar plan" a `step-2`, conservando datos y selección (marcada si sigue disponible); al volver al Paso 3 la aceptación está desmarcada y el precio se recalcula con datos frescos. | US-03 regla "can go back to edit their data or change the plan", GAP-03.12 | E2E |
| R-03.17 | Si el precio final recalculado difiere de `priceSeenAtSelection`, el Paso 3 muestra un aviso `role="status"` con el nuevo precio antes de pagar; no bloquea el pago (GAP-02.7 aceptado en HITL-1). | GAP-03.8, GAP-02.7 | Unit + E2E |
| R-03.18 | Vista del Paso 3 como unión discriminada `loading` / `ready` / `error` / `config-error` (el estado `empty` no aplica; la ausencia de plan es redirección). `ready` exige que países/términos y planes hayan cargado; error de cualquiera → `error` con `role="alert"` y "Reintentar" (sin perder datos) y pago bloqueado. Timeout de 10 000 ms. | CLAUDE §7, GAP-03.17 | Unit + E2E |
| R-03.19 | Aislamiento por país: respuestas de otro país se descartan, los términos y planes mostrados son siempre los del país de la ruta y el almacenamiento es `auto_quote_v1_<country>`. | CLAUDE regla 6, GAP-03.17 | Unit + E2E |
| R-03.20 | Accesibilidad: foco al `h1` al entrar al paso; checkbox de T&C con `<label for>`; región de términos con nombre accesible y alcanzable por teclado; `role="alert"` en rechazo; `aria-busy="true"` durante el procesamiento; el flujo completo (aceptar, pagar, reintentar) se completa solo con teclado (`Tab`, `Space`, `Enter`). | CLAUDE regla 7 | E2E de teclado + ARIA |
| R-03.21 | Selector de modo de simulación (GAP-03.5 aceptado en HITL-1): grupo de radios con nombre accesible "Simulación de pago (solo pruebas)", opciones "Aprobado" (por defecto) y "Rechazado", visible solo en el Paso 3; el modo no se persiste. | US-03 AC "Rejected payment", GAP-03.5 | Unit + E2E |
| R-03.22 | Todo texto de interfaz proviene del catálogo `ui-copy.es.ts`; los textos legales (T&C) provienen de Strapi. | CLAUDE regla 2, GAP-03.16 | Unit del catálogo + revisión estática |
| R-03.23 | Ningún valor del formulario se escribe en `console`; los datos de prueba (fixtures, seed) son ficticios; no existen campos de tarjeta ni se transmite nada de pago. | CLAUDE regla 5, GAP-03.14 | E2E (captura de consola) + revisión estática |
| R-03.24 | Correo del tomador en el resumen: el campo con rol `email` aparece en el bloque del tomador con su valor **completo y sin enmascarar**, en la posición de configuración (R-01.2) y con su `label` de Strapi; solo `document_number` se enmascara (R-03.4). Si el correo está vacío (campo opcional por configuración) se muestra "No informado". El correo no aparece en `/confirmation` ni en `console`, ni en atributos (`title`, `aria-label`, `data-*`); solo como texto visible del Paso 3. El campo se localiza por rol: con la `key` renombrada el resultado es idéntico. | Corrección humana 1 (HITL-1), GAP-03.1, GAP-03.18 | Unit (con `key` aleatorias) + E2E-S |
| R-03.25 | Moneda y ajuste de ciudad en el Paso 3: el Paso 3 aplica los `config-error` de `SPEC-US-02` (R-02.19: `plan.currency` ≠ `country.currencyCode`; R-02.22: `priceAdjustmentPct` inválido o rol `city` duplicado/no `select`); en ese caso no se muestra precio, aparece `role="alert"` que nombra el problema y el pago queda bloqueado. | HITL-1 (GAP-02.1 Opción B; corrección 3), GAP-03.19 | Unit + E2E-M |

## 3. Criterios de aceptación

### AC-03.1 — Resumen completo
```gherkin
Escenario: Resumen completo
  Dado que elegí un plan
  Cuando llego al resumen
  Entonces veo mis datos, los datos de mi vehículo y el plan elegido con su precio final
  Y el precio final es el mismo que vi en el paso de planes
```

### AC-03.2 — Términos por país
```gherkin
Escenario: Términos por país
  Dado que estoy en el resumen de /co/quote/step-3
  Cuando veo los términos y condiciones
  Entonces el texto coincide con el configurado en Strapi para Colombia
  Y el botón de pagar está deshabilitado hasta que los acepte
  Cuando abro el resumen de Chile
  Entonces veo el texto de Chile, distinto al de Colombia
```

### AC-03.3 — Pago exitoso
```gherkin
Escenario: Pago exitoso
  Dado que acepté los términos
  Cuando hago clic en pagar
  Entonces el botón queda bloqueado mientras se procesa el pago
  Y veo la confirmación con el número de cotización
```

### AC-03.4 — Pago rechazado
```gherkin
Escenario: Pago rechazado
  Dado que el pago simulado falla (modo "Rechazado")
  Cuando hago clic en pagar
  Entonces veo un mensaje de error claro
  Y puedo reintentar sin perder mi información
  Cuando cambio al modo "Aprobado" y reintento
  Entonces veo la confirmación con el número de cotización
```

### AC-03.5 — Acceso directo sin plan
```gherkin
Escenario: Entrar al resumen sin plan elegido
  Dado que completé el Paso 1 pero no elegí plan
  Cuando abro /co/quote/step-3
  Entonces soy redirigido a /co/quote/step-2
```

### AC-03.6 — Documento enmascarado
```gherkin
Escenario: Documento parcialmente oculto
  Dado que escribí el documento "1020304050" en Colombia
  Cuando llego al resumen
  Entonces veo "******4050"
  Y el documento completo no aparece en ninguna parte de la página
```

### AC-03.7 — Enmascaramiento en casos borde
```gherkin
Esquema del escenario: Reglas de enmascaramiento
  Dado que el documento ingresado es <entrada>
  Cuando llego al resumen
  Entonces veo <salida>

  Ejemplos:
    | entrada       | salida      |
    | 1020304050    | ******4050  |
    | 12.345.678-5  | ******78-5  |
    | 1.000.005-K   | *****05-K   |
    | 1234          | ***4        |
    | 12            | *2          |
```

### AC-03.8 — Doble clic en pagar
```gherkin
Escenario: Doble clic
  Dado que acepté los términos
  Cuando hago doble clic rápido en "Pagar"
  Entonces el botón está deshabilitado con aria-busy="true"
  Y solo se ejecuta un pago y se genera un único número de cotización
```

### AC-03.9 — Enter y clic combinados
```gherkin
Escenario: Enter más clic
  Dado que acepté los términos y el foco está en "Pagar"
  Cuando presiono Enter y de inmediato hago clic
  Entonces solo se ejecuta un pago
```

### AC-03.10 — Recarga en el resumen
```gherkin
Escenario: Recarga del resumen
  Dado que estoy en el resumen con los términos aceptados
  Cuando recargo el navegador
  Entonces veo el mismo resumen con mis datos
  Y los términos aparecen sin aceptar y el botón de pagar deshabilitado
```

### AC-03.11 — Plan despublicado antes del resumen
```gherkin
Escenario: El plan elegido ya no existe
  Dado que elegí un plan y negocio lo desactiva
  Cuando recargo el resumen
  Entonces soy redirigido a /co/quote/step-2
  Y veo un aviso de que el plan elegido ya no está disponible
```

### AC-03.12 — Precio cambió entre pasos
```gherkin
Escenario: Aviso de cambio de precio
  Dado que elegí un plan que costaba 1000000 y negocio lo cambia a 1100000
  Cuando llego al resumen
  Entonces veo el nuevo precio final y un aviso de que el precio cambió
  Y puedo pagar
```

### AC-03.13 — Editar datos
```gherkin
Escenario: Editar datos desde el resumen
  Dado que estoy en el resumen con los términos aceptados
  Cuando pulso "Editar datos"
  Entonces llego al Paso 1 con mis datos intactos
  Cuando cambio el año del vehículo y vuelvo al resumen
  Entonces el precio final está recalculado y los términos aparecen sin aceptar
```

### AC-03.14 — Cambiar plan
```gherkin
Escenario: Cambiar plan desde el resumen
  Dado que estoy en el resumen
  Cuando pulso "Cambiar plan"
  Entonces llego al Paso 2 con mi plan actual marcado
  Cuando elijo otro plan y continúo
  Entonces el resumen muestra el nuevo plan y su precio final
```

### AC-03.15 — Términos vacíos
```gherkin
Escenario: Términos sin contenido
  Dado que el texto de términos de mi país está vacío en Strapi
  Cuando llego al resumen
  Entonces veo un error de configuración
  Y el botón de pagar permanece deshabilitado
```

### AC-03.16 — Términos como texto plano
```gherkin
Escenario: Los términos no ejecutan HTML
  Dado que los términos contienen el texto "<b>Aviso</b>" y dos párrafos separados por línea en blanco
  Cuando los veo en el resumen
  Entonces se muestra el texto literal "<b>Aviso</b>" sin formato en negrita
  Y aparecen dos párrafos
```

### AC-03.17 — Error al cargar los términos
```gherkin
Escenario: La API de países falla en el resumen
  Dado que la API responde 500 al pedir los términos
  Cuando llego al resumen
  Entonces veo una alerta con "Reintentar" y el botón de pagar deshabilitado
  Cuando la API responde y pulso "Reintentar"
  Entonces veo el resumen sin perder mis datos
```

### AC-03.18 — Volver desde la confirmación
```gherkin
Escenario: No se puede pagar dos veces
  Dado que ya veo la confirmación de mi pago
  Cuando uso el botón "Atrás" del navegador o abro /co/quote/step-3
  Entonces soy redirigido a /co/quote/confirmation
  Y no existe ningún botón de pagar
```

### AC-03.19 — Recarga en la confirmación
```gherkin
Escenario: Recarga de la confirmación
  Dado que veo la confirmación con el número COT-CO-20261123-7B2E
  Cuando recargo el navegador
  Entonces sigo viendo el mismo número, el plan y el precio final
```

### AC-03.20 — Nueva cotización
```gherkin
Escenario: Nueva cotización
  Dado que estoy en la confirmación de Colombia y tengo datos guardados de Chile
  Cuando pulso "Nueva cotización"
  Entonces llego a /co/quote/step-1 con el formulario vacío
  Y los datos guardados de Chile siguen intactos
```

### AC-03.21 — Formato del número de cotización
```gherkin
Escenario: Número de cotización simulado
  Dado que el reloj local marca 2026-11-23 en Colombia
  Cuando el pago es aprobado
  Entonces el número cumple el formato COT-CO-20261123-XXXX con cuatro caracteres hexadecimales en mayúscula
```

### AC-03.22 — Formato de los datos del resumen
```gherkin
Escenario: Valores legibles en el resumen
  Dado que elegí la marca "Mazda", nací el 2008-11-23, marqué "Uso particular" y dejé "Teléfono" vacío
  Cuando llego al resumen de Colombia
  Entonces veo "Mazda", "23/11/2008", "Sí" para "Uso particular" y "No informado" para "Teléfono"
  Y no veo valores internos como "true" ni el value del select
```

### AC-03.23 — Sin datos personales en consola
```gherkin
Escenario: La consola no contiene datos personales
  Dado que recorro el flujo completo con el documento "1020304050"
  Cuando reviso los mensajes de consola
  Entonces ninguno contiene el documento, la fecha de nacimiento, el nombre ni el correo ingresados
```

### AC-03.24 — Aislamiento por país
```gherkin
Escenario: Cambio de país en el resumen
  Dado que estoy en el resumen de Colombia
  Cuando abro /cl/quote/step-3 sin haber completado Chile
  Entonces soy redirigido a /cl/quote/step-1
  Y nunca veo términos de Colombia bajo Chile
```

### AC-03.25 — Flujo completo con teclado
```gherkin
Escenario: Pagar solo con teclado
  Dado que uso únicamente teclado en el resumen
  Cuando llego a los términos con Tab, los leo por la región enfocable, marco la casilla con Space y pulso Enter en "Pagar"
  Entonces el pago se procesa y veo la confirmación con el foco en su encabezado
```

### AC-03.26 — Selector de simulación
```gherkin
Escenario: Control de simulación visible y etiquetado
  Dado que estoy en el resumen
  Entonces veo un grupo llamado "Simulación de pago (solo pruebas)" con "Aprobado" marcado por defecto y "Rechazado"
  Y al recargar el modo vuelve a "Aprobado"
```

### AC-03.27 — Correo visible y sin enmascarar
```gherkin
Escenario: El correo del tomador aparece completo en el resumen
  Dado que escribí el correo "ana.perez@example.com" y el documento "1020304050" en Colombia
  Cuando llego al resumen
  Entonces en el bloque del tomador veo "ana.perez@example.com" completo
  Y el documento se ve como "******4050"
  Cuando pago y llego a la confirmación
  Entonces la confirmación no muestra el correo
```

### AC-03.28 — Moneda o ajuste de ciudad inválidos en el resumen
```gherkin
Esquema del escenario: Configuración de precio inválida bloquea el pago
  Dado que <condición>
  Cuando llego al resumen
  Entonces veo un error de configuración que nombra el problema
  Y no se muestra ningún precio y el botón de pagar permanece deshabilitado

  Ejemplos:
    | condición                                                          |
    | el plan elegido de Chile llega con currency "COP"                  |
    | la opción de ciudad elegida trae priceAdjustmentPct igual a 31     |
```

### AC-03.29 — El precio con ajuste por ciudad coincide con el del Paso 2
```gherkin
Escenario: Mismo precio final con ajuste de ciudad
  Dado que hoy es 2026-11-23, el plan cuesta 1000000, el vehículo es de 2025, nací el 1990-01-01 y elegí la ciudad "Bogotá D.C." (+8)
  Cuando veo el plan en el Paso 2
  Entonces el precio final es 1180000
  Cuando llego al resumen
  Entonces el precio final del plan es el mismo 1180000
```

## 4. Contrato de datos

**Entrada para `@architect`:** formalizar en `docs/contracts/strapi-contracts.ts` (inexistente al escribir esta spec). `StrapiCountry`, `StrapiFormField`, `QuoteState` y `StrapiInsurancePlan` se definen en `SPEC-US-01` §4 y `SPEC-US-02` §4. Campos de `country` consumidos aquí: `code`, `locale`, `currencyCode`, `termsTitle`, `termsContent`, `termsVersion`.

```ts
export type PaymentSimulationMode = 'approved' | 'rejected';

export interface PaymentRequest {
  country: string;                       // código en minúsculas
  planDocumentId: string;
  finalPrice: number;
  mode: PaymentSimulationMode;           // solo en memoria
}

export type PaymentResult =
  | { status: 'approved'; quoteNumber: string }
  | { status: 'rejected'; code: 'SIMULATED_REJECTION' };

export interface Step3ViewModel {
  policyholder: SummaryRow[];
  vehicle: SummaryRow[];
  plan: { name: string; shortDescription?: string; coverageNames: string[]; finalPriceText: string };
  priceChangedNotice?: { newPriceText: string };
}

export interface SummaryRow {
  fieldDocumentId: string;
  label: string;
  displayValue: string;                  // ya formateado y, si aplica, enmascarado
}

export type Step3State =
  | { kind: 'loading' }
  | { kind: 'ready'; view: Step3ViewModel; terms: { title: string; version: string; paragraphs: string[] } }
  | { kind: 'error'; retryable: true }
  | { kind: 'config-error'; message: string };
```

**Queries REST exactas** (rutas relativas vía proxy; sin token en el navegador):

- País y T&C: `GET /api/countries?filters[code][$eq]=<country>`
- Campos (para el resumen): misma query que `SPEC-US-01` §4.
- Planes (para validar el plan y recalcular precio): misma query que `SPEC-US-02` §4.

Funciones puras previstas (CLAUDE §7), en `frontend/src/app/domain/payment/` y `domain/summary/`: `maskDocumentNumber`, `generateQuoteNumber(now, random, country)`, `splitTerms`, `buildSummaryRows`, `formatSummaryValue`, `canPay`; servicio `PaymentSimulationService` con guardia de una sola promesa en vuelo.

## 5. Estados de UI y accesibilidad

| Estado | Condición | Presentación |
| :--- | :--- | :--- |
| `loading` | Términos, campos o planes en curso | Indicador `role="status"` |
| `ready` | Todo cargó y el guard pasó | Resumen en tres bloques, términos, casilla, selector de simulación y "Pagar" |
| `processing` (subestado de `ready`) | Pago en curso | "Pagar" `disabled` con `aria-busy="true"` |
| `rejected` (subestado de `ready`) | Simulación rechazada | `role="alert"`; "Pagar" reactivado; datos intactos |
| `error` | Red, timeout, 4xx/5xx | `role="alert"` + "Reintentar"; pago bloqueado |
| `config-error` | Términos vacíos, rol `document_number` ausente, locale inválido, `plan.currency` distinta de `country.currencyCode`, `priceAdjustmentPct` inválido | `role="alert"` nombrando el problema; pago bloqueado |
| `confirmation` | Pago aprobado | Pantalla de confirmación con número, plan y precio; `h1` enfocado; "Nueva cotización" |

El estado `empty` no aplica al Paso 3: la ausencia de plan es una redirección al Paso 2. Accesibilidad: ver R-03.20.

## 6. Matriz de verificación

Tipos: **Unit** (runner por defecto del CLI), **E2E-S** (Playwright contra Strapi sembrado, **solo lectura**), **E2E-M** (Playwright con `page.route` para simular Strapi y el reloj con `page.clock`). El título de cada test incluye el ID. Regla (HITL-1): ningún token de escritura de Strapi existe en ningún entorno (local, CI, runner de E2E ni navegador); todo escenario que mute la configuración usa E2E-M (en esta spec ninguno requiere además prueba manual).

| ID | Tipo | Archivo planificado |
| :--- | :--- | :--- |
| R-03.1 | Unit + E2E-S | `frontend/src/app/core/guards/step-guards.spec.ts`; `frontend/e2e/us-03-summary-payment.spec.ts` |
| R-03.2 | Unit + E2E-S | `frontend/src/app/domain/summary/build-summary.spec.ts`; `frontend/e2e/us-03-summary-payment.spec.ts` |
| R-03.3 | Unit + E2E-M | `frontend/src/app/domain/summary/format-summary-value.spec.ts`; `frontend/e2e/us-03-summary-payment.spec.ts` |
| R-03.4 | Unit | `frontend/src/app/domain/payment/mask-document-number.spec.ts` |
| R-03.5 | E2E-S | `frontend/e2e/us-03-privacy.spec.ts` |
| R-03.6 | Unit + E2E-S | `frontend/src/app/domain/summary/build-summary.spec.ts`; `frontend/e2e/us-03-summary-payment.spec.ts` |
| R-03.7 | Unit + E2E-M | `frontend/src/app/domain/summary/split-terms.spec.ts`; `frontend/e2e/us-03-terms.spec.ts` |
| R-03.8 | Unit + E2E-S | `frontend/src/app/features/step-3/step-3-state.spec.ts`; `frontend/e2e/us-03-terms.spec.ts` |
| R-03.9 | Unit + E2E-S | `frontend/src/app/domain/payment/can-pay.spec.ts`; `frontend/e2e/us-03-terms.spec.ts` |
| R-03.10 | Unit | `frontend/src/app/domain/payment/payment-simulation.service.spec.ts` |
| R-03.11 | Unit + E2E-S | `frontend/src/app/domain/payment/payment-simulation.service.spec.ts`; `frontend/e2e/us-03-payment.spec.ts` |
| R-03.12 | Unit + E2E-S | `frontend/src/app/features/step-3/step-3-state.spec.ts`; `frontend/e2e/us-03-payment.spec.ts` |
| R-03.13 | Unit | `frontend/src/app/domain/payment/generate-quote-number.spec.ts` |
| R-03.14 | Unit + E2E-S | `frontend/src/app/core/guards/step-guards.spec.ts`; `frontend/e2e/us-03-payment.spec.ts` |
| R-03.15 | Unit + E2E-M | `frontend/src/app/core/storage/quote-storage.spec.ts`; `frontend/e2e/us-03-payment.spec.ts` |
| R-03.16 | E2E-S | `frontend/e2e/us-03-summary-payment.spec.ts` |
| R-03.17 | Unit + E2E-M | `frontend/src/app/features/step-3/step-3-state.spec.ts`; `frontend/e2e/us-03-plan-changes.spec.ts` |
| R-03.18 | Unit + E2E-M | `frontend/src/app/features/step-3/step-3-state.spec.ts`; `frontend/e2e/us-03-terms.spec.ts` |
| R-03.19 | Unit + E2E-M | `frontend/src/app/core/storage/quote-storage.spec.ts`; `frontend/e2e/us-03-terms.spec.ts` |
| R-03.20 | E2E-S | `frontend/e2e/us-03-a11y.spec.ts` |
| R-03.21 | Unit + E2E-S | `frontend/src/app/features/step-3/step-3-state.spec.ts`; `frontend/e2e/us-03-payment.spec.ts` |
| R-03.22 | Unit + revisión estática | `frontend/src/app/i18n/ui-copy.spec.ts`; `docs/reviews/REVIEW-US-03.md` (`@qa-reviewer`) |
| R-03.23 | E2E-S + revisión estática | `frontend/e2e/us-03-privacy.spec.ts`; `docs/reviews/REVIEW-US-03.md` (`@qa-reviewer`) |
| AC-03.1 | E2E-S | `frontend/e2e/us-03-summary-payment.spec.ts` |
| AC-03.2 | E2E-S | `frontend/e2e/us-03-terms.spec.ts` |
| AC-03.3 | E2E-S | `frontend/e2e/us-03-payment.spec.ts` |
| AC-03.4 | E2E-S | `frontend/e2e/us-03-payment.spec.ts` |
| AC-03.5 | E2E-S | `frontend/e2e/us-03-summary-payment.spec.ts` |
| AC-03.6 | Unit + E2E-S | `frontend/src/app/domain/payment/mask-document-number.spec.ts`; `frontend/e2e/us-03-privacy.spec.ts` |
| AC-03.7 | Unit | `frontend/src/app/domain/payment/mask-document-number.spec.ts` |
| AC-03.8 | Unit + E2E-S | `frontend/src/app/domain/payment/payment-simulation.service.spec.ts`; `frontend/e2e/us-03-payment.spec.ts` |
| AC-03.9 | E2E-S | `frontend/e2e/us-03-payment.spec.ts` |
| AC-03.10 | E2E-S | `frontend/e2e/us-03-terms.spec.ts` |
| AC-03.11 | E2E-M | `frontend/e2e/us-03-plan-changes.spec.ts` |
| AC-03.12 | E2E-M | `frontend/e2e/us-03-plan-changes.spec.ts` |
| AC-03.13 | E2E-S | `frontend/e2e/us-03-summary-payment.spec.ts` |
| AC-03.14 | E2E-S | `frontend/e2e/us-03-summary-payment.spec.ts` |
| AC-03.15 | E2E-M | `frontend/e2e/us-03-terms.spec.ts` |
| AC-03.16 | Unit + E2E-M | `frontend/src/app/domain/summary/split-terms.spec.ts`; `frontend/e2e/us-03-terms.spec.ts` |
| AC-03.17 | E2E-M | `frontend/e2e/us-03-terms.spec.ts` |
| AC-03.18 | E2E-S | `frontend/e2e/us-03-payment.spec.ts` |
| AC-03.19 | E2E-S | `frontend/e2e/us-03-payment.spec.ts` |
| AC-03.20 | E2E-S | `frontend/e2e/us-03-payment.spec.ts` |
| AC-03.21 | Unit + E2E-M | `frontend/src/app/domain/payment/generate-quote-number.spec.ts`; `frontend/e2e/us-03-payment.spec.ts` |
| AC-03.22 | Unit + E2E-S | `frontend/src/app/domain/summary/format-summary-value.spec.ts`; `frontend/e2e/us-03-summary-payment.spec.ts` |
| AC-03.23 | E2E-S | `frontend/e2e/us-03-privacy.spec.ts` |
| AC-03.24 | E2E-S | `frontend/e2e/us-03-terms.spec.ts` |
| AC-03.25 | E2E-S | `frontend/e2e/us-03-a11y.spec.ts` |
| AC-03.26 | E2E-S | `frontend/e2e/us-03-payment.spec.ts` |
| R-03.24 | Unit + E2E-S | `frontend/src/app/domain/summary/build-summary.spec.ts`; `frontend/e2e/us-03-summary-payment.spec.ts` |
| R-03.25 | Unit + E2E-M | `frontend/src/app/features/step-3/step-3-state.spec.ts`; `frontend/e2e/us-03-plan-changes.spec.ts` |
| AC-03.27 | E2E-S | `frontend/e2e/us-03-summary-payment.spec.ts` |
| AC-03.28 | Unit + E2E-M | `frontend/src/app/features/step-3/step-3-state.spec.ts`; `frontend/e2e/us-03-plan-changes.spec.ts` |
| AC-03.29 | Unit + E2E-M | `frontend/src/app/domain/summary/build-summary.spec.ts`; `frontend/e2e/us-03-summary-payment.spec.ts` (reloj fijado con `page.clock`) |

## 7. Fuera de alcance

- Pasarela de pago real, formulario de tarjeta, tokenización, 3-D Secure, impuestos, cuotas, comprobantes en PDF o envío de correo.
- Persistencia de cotizaciones o del número de cotización en un backend; garantía de unicidad del número.
- Lectura obligatoria de los términos hasta el final antes de aceptarlos; versionado histórico de aceptaciones.
- Soporte de varias pestañas simultáneas con el mismo `sessionStorage` (es por pestaña).
- Edición del copy de interfaz desde Strapi (GAP-01.17).
- Renderizado de Markdown o HTML en los términos (decisión de seguridad de GAP-03.3).
- Reenvío automático del pago interrumpido por una recarga.
- Enmascarar el correo del tomador, enviarlo por correo o mostrarlo en la confirmación (GAP-03.18).

## Changelog

### v3 → Aprobado (Orquestador, 2026-11-23)
- Cierre de HITL-1: el humano aprueba GAP-02.18/GAP-01.22 (opción A, rango [-10, +30]) y decide que el correo **no** sea rol requerido (lo controla Strapi). Estado → `Aprobado`. Sin cambios de contenido.

### v2 → v3 (HITL-1, 2026-11-23, `docs/hitl/HITL-1-specs.md`)
- **Estado:** `Aprobado con cambios (HITL-1, 2026-11-23) — v3 pendiente de verificación del Orquestador`. Los GAP decididos en HITL-1 (GAP-03.1, GAP-03.5) pasan a "Resuelto en HITL-1" sin cambio de contenido ("Acepto"); las marcas "a la espera" de R-03.3, R-03.17 y R-03.21 pasan a "aceptado en HITL-1".
- **Corrección humana 1 (correo):** GAP-03.18 (el correo se muestra completo y sin enmascarar, con justificación); R-03.24; AC-03.27. **Modificados:** R-03.3 (el correo es `text`), AC-03.23 (la consola tampoco contiene el correo), §7.
- **GAP-02.1 Opción B y corrección humana 3 (consecuencias en el Paso 3):** GAP-03.19; R-03.25; AC-03.28, AC-03.29. **Modificado:** R-03.6 (el precio idéntico incluye el ajuste por ciudad), §5 (`config-error`).
- **Decisión "Mock + prueba manual":** ningún E2E-S de esta spec muta Strapi, por lo que no cambia ninguna verificación; se añade a §6 la regla de que no existe token de escritura en ningún entorno.
- **IDs existentes:** ninguno renumerado ni eliminado.

### v1 → v2
- **Estado y formato:** se reescribe al formato de la skill `spec-gap-checklist` con IDs trazables y matriz de un renglón por ID. Estado permanece `Borrador (pendiente HITL-1)`.
- **Vacíos nuevos (la v1 no los detectaba):** contenido y formato del resumen (GAP-03.1, decisión humana), normalización y casos de longitud 0/1 del enmascaramiento (GAP-03.2), render seguro y estados vacío/error de los T&C (GAP-03.3), ciclo de vida de la aceptación (GAP-03.4), mecanismo del rechazo y exposición del selector al usuario final (GAP-03.5, decisión humana), doble envío por `Enter`, recarga y botón "Atrás" tras confirmar (GAP-03.6), guard completo del Paso 3 y de la confirmación (GAP-03.7), precio cambiado entre pasos (GAP-03.8), fecha local y aleatoriedad inyectable del número de cotización (GAP-03.9), persistencia de la confirmación (GAP-03.10), `canPay` con términos cargados y resumen válido (GAP-03.13), PII en consola y DOM (GAP-03.14).
- **Decisiones cambiadas respecto a v1:** los ejemplos de enmascaramiento pasan a operar sobre el valor normalizado (`12.345.678-5` → `******78-5`, antes se contaban los puntos); la regla de `<= 4` caracteres se desdobla en longitud 0, 1 y 2 a 4; `canPay` agrega `termsLoaded` y `summaryValid`; la aceptación nunca se persiste; tras confirmar, los pasos 1 a 3 redirigen a la confirmación hasta "Nueva cotización"; el estado de UI incluye `loading`/`error`/`config-error` y excluye `empty`.
- **Conservado de v1:** formato `COT-{PAÍS}-{YYYYMMDD}-{4 hex}`, latencia simulada de ~1 s, doble barrera contra doble envío, "Editar datos"/"Cambiar plan", "Nueva cotización" limpia solo el país actual.
- **Pendientes de HITL-1:** GAP-03.1 (datos del resumen), GAP-03.5 (mecanismo del rechazo), GAP-02.7 (compartido, precio cambiado), GAP-01.17 (copy de UI, compartido).
