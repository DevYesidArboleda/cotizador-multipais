# SPEC-US-01 — Formulario Dinámico de Datos del Tomador y Vehículo

- **Historia origen:** `docs/user-stories/US-01.md` · **Versión:** v3 · **Estado:** Aprobado (HITL-1 cerrado 2026-11-23; v3 verificada por el Orquestador — `docs/logs/03-spec-analyst-specs-v3.md`)
- **ADRs relacionados:** `ADR-001`, `ADR-002` (`docs/adrs/`). `ADR-003` (despliegue gratuito) no aplica a esta spec.
- **Specs relacionadas:** `SPEC-US-02` (guard del Paso 2 reutiliza `validateStep1`, precio usa roles `birth_date` y `vehicle_year`), `SPEC-US-03` (resumen enmascara `document_number` y muestra `email` sin enmascarar). La opción de `city` aporta `priceAdjustmentPct` al precio de `SPEC-US-02` (GAP-01.22).
- **Decisiones humanas vinculantes:** `docs/hitl/HITL-1-specs.md` (v3 las aplica: GAP-01.20 correo, GAP-01.21 placa de moto CO, GAP-01.22 contrato de ciudad; E2E de mutación de Strapi con respuesta simulada, sin token de escritura).
- **Contexto global:** `CLAUDE.md` §3 (reglas 2, 3, 4, 6, 7), §4 (rutas e IDs), §7 (funciones puras, estados como unión discriminada).
- **Entradas para otros agentes:** el contrato TS de la sección 4 debe formalizarse en `docs/contracts/strapi-contracts.ts` (**entrada para `@architect`**; el archivo aún no existe). Observaciones para `@cms-engineer` en GAP-01.14, GAP-01.18, GAP-01.20, GAP-01.21 y GAP-01.22.

## 1. Vacíos detectados

Convención: `Sí` en la última columna = **DECISIÓN HUMANA REQUERIDA** (HITL-1). Las decisiones marcadas `No` son propuestas que el humano puede revertir al revisar la spec.

| ID GAP | Pregunta | Riesgo si no se decide | Decisión propuesta | ¿Requiere humano? |
| :--- | :--- | :--- | :--- | :--- |
| GAP-01.1 | ¿Qué es un "país válido"? ¿Lista fija `co`/`cl` en Angular o lista leída de Strapi? ¿Qué pasa con `/CO/quote/step-1`, `/co`, `/co/quote`, `/pe/...`? | Hardcodear países contradice la regla 2 (agregar un país exigiría deploy). Mayúsculas o rutas parciales terminan en 404 inconsistentes. | País válido = existe un registro `country` publicado en Strapi (`GET /api/countries?filters[code][$eq]=<code>` devuelve 1 elemento). Código en mayúsculas → redirección a minúsculas. `/` → `/co/quote/step-1`; `/:country` y `/:country/quote` → `/:country/quote/step-1`. Código inexistente o fallo al consultar el país → `/country-not-found` con selector alimentado por `GET /api/countries` (un enlace por país). Si Strapi cae al resolver el país: estado `error` recuperable (no `/country-not-found`). | No |
| GAP-01.2 | **Acoplamiento semántico.** ¿Qué roles necesita la lógica de negocio para funcionar y qué ocurre si negocio los borra, los duplica o los asigna a un campo de tipo incorrecto? La v1 ni siquiera incluía `semanticRole` en el contrato. | Edad, año, precio, enmascaramiento y validación cruzada fallarían en silencio (`NaN`, precio sin ajuste, documento sin máscara) o con crash. | Roles **requeridos** para operar el cotizador: `birth_date` (type `date`), `vehicle_year` (type `number`), `document_number` (type `text`). Roles **opcionales** (la lógica degrada con elegancia): `document_type`, `vehicle_plate`, `full_name`, `email`, `phone`, `city`, `vehicle_brand`, `vehicle_model`, `vehicle_use`. Ausente / duplicado / tipo incompatible / `validatorKey` incompatible con el rol → estado `config-error` que nombra el rol (p. ej. "Falta el campo con rol `birth_date`"), sin renderizar el formulario ni permitir avanzar. Nunca se busca un campo por `key`. | Resuelto en HITL-1 ("Acepto todas"): sin cambios. El rol `email` sigue siendo opcional para el motor (ver GAP-01.20). |
| GAP-01.3 | ¿De dónde salen mayoría de edad (18) y rango de años (20 atrás, +1)? La v1 los fijaba en código. ¿Qué papel juega `validatorKey` frente al rol? | Violación de la regla 2; un país con edad legal distinta exigiría deploy. Doble fuente de verdad (`validatorKey` vs rol). | Los parámetros se leen del registro `country` (`legalAge`, `vehicleMaxAgeYears`, `vehicleMaxFutureYears`); el código no contiene las constantes 18/20/1. La validación de edad y de año se aplica **siempre por rol** (`birth_date`, `vehicle_year`), porque la regla de negocio de la historia es incondicional. `validatorKey` `legal_age` / `vehicle_year_range` se acepta (redundante) solo si el rol coincide; en otro rol → `config-error`. Parámetros no enteros o negativos → `config-error`. | No |
| GAP-01.4 | Mayoría de edad: ¿cómo se compara la fecha sin sesgo UTC? ¿Cumpleaños 29-feb? ¿Fecha futura? ¿Formato de entrada? | `new Date('2008-11-23')` es UTC y en America/Bogota o America/Santiago retrocede un día: el límite de 18 años falla ±1 día. | Fecha como cadena `YYYY-MM-DD` parseada a (año, mes, día) **sin** `Date(string)`; comparación por tuplas contra la fecha calendario local de `now` (inyectable). Cumple la edad el día `(mes, día)` ≥ cumpleaños; quien nació un 29-feb alcanza la edad el **1-mar** en años no bisiestos. Fecha futura o inexistente (`2008-02-30`) → inválida. | No |
| GAP-01.5 | Año del vehículo: ¿extremos inclusivos? ¿entero? ¿qué reloj? "No más de 20 años de antigüedad": ¿20 años exactos es válido? | Ambigüedad ±1 en los extremos; `2020.5`, `1e3`, `-2020` aceptados por un `input[type=number]`. | Intervalo inclusivo `[añoActual - vehicleMaxAgeYears, añoActual + vehicleMaxFutureYears]`, año actual = año de la fecha calendario local. Solo enteros de 4 dígitos (`^[0-9]{4}$` sobre la cadena ingresada). Con 2026: válido 2006 y 2027; inválido 2005 y 2028. | No |
| GAP-01.6 | **Colombia: CC vs CE.** ¿Cómo se valida el número según el tipo elegido? ¿Qué pasa si aún no hay tipo? ¿Cambiar el tipo revalida? ¿Qué mensaje se muestra? ¿Cuáles son los patrones de cada tipo? La v1 no lo trató (solo `pattern` estático). | Un único patrón aceptaría números inválidos para uno de los dos tipos, o rechazaría válidos. | Modelo `form.field-option.validationPattern` / `validationMessage` + `validation.validatorKey = depends_on_option_pattern` con `dependsOnRole = document_type`. Patrón efectivo = el de la opción seleccionada; si la opción no tiene → `validation.pattern` del campo; si tampoco → solo obligatoriedad. Mensaje: `validationMessage` de la opción, si no `errorMessage` del campo. Sin tipo seleccionado: no se evalúa el patrón (el tipo ya es obligatorio). Al cambiar el tipo se revalida el número si el campo fue tocado o tiene valor. Patrones semilla ficticios: CC `^[0-9]{6,10}$`, CE `^[0-9]{6,7}$`. | Resuelto en HITL-1 (Acepto): patrones semilla CC `^[0-9]{6,10}$` y CE `^[0-9]{6,7}$`, editables luego desde Strapi sin deploy (datos ficticios, regla 5). |
| GAP-01.7 | Chile RUT: ¿qué formatos de entrada se aceptan (puntos, guion, `k` minúscula)? ¿Largo del cuerpo? ¿Qué se guarda? | Rechazar `12.345.678-5` (formato habitual) o aceptar RUT con DV incorrecto. | Normalizar (trim, quitar puntos y espacios, `k` → `K`) antes de validar; forma `^[0-9]{7,8}-?[0-9K]$`; DV por Módulo 11 (serie 2,3,4,5,6,7 cíclica sobre dígitos de derecha a izquierda; `DV = 11 - (suma mod 11)`; 11 → `0`, 10 → `K`). Se guarda el valor **normalizado con guion** (`12345678-5`). Se aplica cuando `validatorKey = cl_rut`, que solo es válido sobre el rol `document_number` (si no, `config-error`). | No |
| GAP-01.8 | Placa CO / patente CL: ¿mayúsculas/minúsculas, guiones, espacios? ¿Placas de moto o diplomáticas? | Rechazar `abc-123` válido o aceptar `ab1234 ` con espacios. La v1 usaba `[A-Za-z]` en el patrón (frágil). | Para el rol `vehicle_plate`: trim, quitar espacios y guiones, mayúsculas **antes** de aplicar `validation.pattern`; se guarda normalizado. Los patrones de Strapi se escriben en mayúsculas. CO (v3, GAP-01.21): `^[A-Z]{3}[0-9]{2}[0-9A-Z]$`, es decir auto `AAA123` y moto `AAA12A`. CL: formato nuevo `BBBB12` y antiguo `BB1234` en un solo patrón. Placas diplomáticas, de carga y motos de Chile: fuera de alcance. | No |
| GAP-01.9 | **Cambio de país a mitad del wizard** (selector, edición de URL, botón atrás del navegador): ¿aislamiento o aviso? ¿Qué pasa con respuestas HTTP en vuelo del país anterior? | Mezclar datos CO/CL, mostrar campos de un país con datos de otro, condición de carrera entre respuestas. | **Aislamiento total** (clave `auto_quote_v1_<country>`); cambiar de país siempre aterriza en `step-1` del nuevo país y nunca lee ni borra el almacenamiento del otro. Los datos del país anterior se conservan y reaparecen al volver. Sin aviso modal. Las respuestas HTTP del país anterior se descartan (la solicitud se cancela al cambiar la ruta). Si la UI ofrece un selector de país dentro del wizard lo decide `@ui-ux-designer`. | No |
| GAP-01.10 | **Recarga del navegador en cada paso.** ¿Qué se restaura? ¿Se confía en un flag "paso 1 completado" guardado? | Si negocio agrega un campo requerido tras completar el Paso 1, un flag guardado dejaría pasar datos incompletos al Paso 2 o 3. | Se rehidrata desde `sessionStorage` y se **revalida contra la configuración vigente** con la función pura `validateStep1`; no existe flag persistido de "completado". Los guards de Paso 2 y 3 usan esa misma función. Recarga en Paso 1 refetchea la configuración y restaura valores. | No |
| GAP-01.11 | **Mutación de configuración con datos guardados:** campo despublicado/eliminado, tipo cambiado, opción de `select` eliminada, `key` renombrada, campo nuevo requerido. | Valores huérfanos aparecen en resumen o precio; renombrar `key` borra datos del usuario si se persiste por `key`. | Persistir por `documentId` (estable ante renombres de `key`). Hidratación tolerante: huérfanos ignorados (no se renderizan ni entran al resumen/precio) y eliminados en el siguiente guardado; valor cuyo tipo ya no coincide → descartado; valor de `select` que ya no existe en las opciones → descartado; campo nuevo aparece vacío. Los errores de campos descartados solo se muestran tras intento de avance. | No |
| GAP-01.12 | Semántica de validación por tipo: ¿`required` en checkbox? ¿precedencia de reglas? ¿mensaje cuando falla `required`? ¿validadores que no aplican al tipo (`min` en `text`)? | Mensajes inconsistentes; "Uso particular" opcional bloqueado o términos requeridos sin marcar aceptados. | Un solo mensaje por campo: `errorMessage` (también para vacío requerido), salvo `validationMessage` de opción en patrón dependiente. `required` en checkbox exige estar marcado. Precedencia: obligatorio → tipo numérico → `min`/`max` → `minLength`/`maxLength` → `pattern` → reglas por rol/`validatorKey` → patrón dependiente (se detiene en el primer fallo). `min`/`max` solo para `number`; `minLength`/`maxLength`/`pattern` solo para `text`; en otro tipo se ignoran con `console.warn` sin datos personales. Campo opcional vacío omite el resto. | No |
| GAP-01.13 | Orden: la historia dice "en el orden definido", pero hay `section` y `order`. ¿Orden global o por sección? ¿Empates de `order`? | Orden no determinista entre recargas con `order` repetido; campos de vehículo antes que los del tomador. | Secciones en orden fijo (`policyholder`, luego `vehicle`); dentro de cada sección `order` ascendente y desempate por `createdAt` ascendente (`sort[0]=order:asc&sort[1]=createdAt:asc`). | No |
| GAP-01.14 | Consulta REST exacta: `status`, `populate`, paginación. La v1 omitía `validation`, `semanticRole`, `placeholder` y no fijaba paginación (Strapi corta en 25 por defecto). Divergencia con la skill `strapi-5-docker-seed` §5, que usa `populate=*`. | Campos truncados en silencio; `populate=options` no trae el componente `validation`; `populate=*` arrastra relaciones innecesarias. | Query de la sección 4 (`status=published`, `populate[validation]=true`, `populate[options]=true`, `pageSize=100`). Si `meta.pagination.total > 100` → `config-error` (no truncar en silencio). **Para `@cms-engineer`/`@architect`:** la skill usa `populate=*`; se propone alinearla con esta query. | No |
| GAP-01.15 | Resiliencia: ¿timeout? ¿fallo parcial (país ok, campos error)? ¿qué es "vacío"? ¿recuperación sin perder lo escrito? | Spinner infinito; pantalla en blanco; pérdida de datos al reintentar. | Timeout 10 s → `error`. 4xx/5xx/red → `error` con `role="alert"` y "Reintentar" que refetchea sin recargar página ni perder valores guardados. País con 0 campos publicados → `empty` (mensaje, sin botón de avance). Fallo en `country` o en `form-fields` es un `error` único. Configuración inválida → `config-error`. | No |
| GAP-01.16 | `sessionStorage` no disponible, corrupto, con `schemaVersion` distinto o con cuota llena. ¿Qué datos personales guarda? | Crash al parsear JSON; pérdida silenciosa; datos personales en logs. | Lectura fallida o `schemaVersion !== 1` → tratar como vacío y borrar la clave corrupta. Escritura fallida → continuar con estado en memoria. Se almacena solo lo necesario (valores por `documentId`, plan elegido, confirmación). Datos ficticios (regla 5); nunca se loguean valores. | No |
| GAP-01.17 | **Copy de UI no cubierto por Strapi:** títulos de paso, "Continuar", "Reintentar", placeholder de `select`, "Cargando…", mensajes de `config-error`, resumen de errores. La regla 2 lista campos, opciones, planes, textos legales, edad y rango, pero no el "chrome" de la UI. | Interpretación ambigua de "100 % configurable": textos de interfaz repartidos por componentes (difícil de auditar) o llamadas extra a Strapi sin modelo de contenido. | Todo texto de interfaz que no sea contenido de negocio vive en **un catálogo único de copy** (`frontend/src/app/i18n/ui-copy.es.ts`), idioma `es`, sin literales sueltos en plantillas. No se agrega modelo Strapi para chrome (costo de un tipo adicional y del permiso Public extra, hoy limitado a tres tipos por la regla 4). | Resuelto en HITL-1 (Acepto): catálogo estático `ui-copy.es.ts`. Si negocio necesita editar el chrome sin deploy, abrir una historia nueva con un single type `ui-copy` (requiere ampliar permisos Public, es decisión de seguridad). |
| GAP-01.18 | El contrato v1 diverge del modelo de contenido: `validationRules` vs componente `validation`; faltan `semanticRole`, `placeholder`, `validationPattern/Message`, `dependsOnRole`; `validatorKey` sin `depends_on_option_pattern`. | Tipos del front que no representan la respuesta real de Strapi. | Contrato v2 en la sección 4, alineado al modelo de `strapi-5-docker-seed`. Respuesta Strapi 5 aplanada (sin `attributes`). **Entrada para `@architect`.** | No |
| GAP-01.19 | Accesibilidad del flujo de error: ¿cuándo se valida? ¿Dónde va el foco? ¿Cómo se anuncian los errores? | Errores prematuros en campos sin tocar; lector de pantalla sin aviso; foco perdido al navegar. | Validar al salir del campo (`blur`) y al pulsar "Continuar"; limpiar el error en cuanto el valor es válido. Al fallar el envío: foco al primer control inválido (orden del DOM) y anuncio `aria-live="polite"` con la cantidad de errores. Al entrar al paso: foco al `h1` del paso. | No |
| GAP-01.20 | **Correo del tomador (corrección humana 1, HITL-1).** El correo debe ser obligatorio en CO y CL, configurado en Strapi y con validación. ¿Qué tipo, rol y patrón usa? ¿Cómo se normaliza? ¿Qué pasa si negocio lo despublica o lo hace opcional? | Un `input[type=email]` nativo muestra mensajes del navegador y no el de Strapi (rompe R-01.4); un patrón permisivo acepta `a@b`; un patrón con retroceso catastrófico congela la pestaña; que "obligatorio" viva en código violaría la regla 2. | Campo `form-field` publicado en `co` y en `cl` con `semanticRole = email` (el rol ya existe en el modelo), `type = text`, `section = policyholder`, `required = true`, `validation.maxLength = 254` y `validation.pattern` editable por negocio: `^[A-Za-z0-9._%+-]{1,64}@([A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,24}$`. Se usa `type = text` (no `input[type=email]`) para que el único mensaje sea el `errorMessage` de Strapi. Normalización: solo `trim()` (no cambia mayúsculas); se guarda recortado. Valida **formato**, no existencia ni entregabilidad. La obligatoriedad es **configuración** del seed (`required = true`), no una constante del código: el rol `email` permanece opcional para el motor (GAP-01.2 aceptado sin cambios) y si negocio lo despublica o lo vuelve opcional el cotizador sigue operando. Duplicado o con `type ≠ text` → `config-error`. Datos semilla ficticios con dominio `example.com` (regla 5). | No — decidido en HITL-1 (corrección 1). El patrón es propuesta editable desde Strapi. |
| GAP-01.21 | **Placa de Colombia con formato de moto `AAA12A` (corrección humana 2, HITL-1).** La v2 la excluía (GAP-01.8: "la historia asegura my car"). ¿Cómo se acepta sin convertir el producto en un seguro de motos y sin lógica nueva? | Hardcodear una excepción por tipo de vehículo en Angular (viola reglas 2 y 3); que la aceptación sugiera cobertura de motos; que `ABC12D`, antes inválida, ahora sea válida y los tests antiguos fallen. | Solo cambia el patrón `validation.pattern` del campo `vehicle_plate` de CO en Strapi (y su seed): `^[A-Z]{3}[0-9]{2}[0-9A-Z]$`. **Cero lógica nueva en Angular:** la normalización de GAP-01.8 y el validador genérico por patrón bastan; no hay campo de tipo de vehículo ni ramas por tipo. **El producto sigue siendo un seguro de autos:** planes, coberturas, precio y textos son de autos (`SPEC-US-02`/`SPEC-US-03` sin cambios por esto). Se acepta igualmente porque es una **decisión de negocio** registrada en HITL-1 (corrección 2), no una ampliación de cobertura, y negocio puede revertirla editando el patrón en Strapi sin deploy. Chile no cambia. Consecuencia: `ABC12D` pasa de inválida a válida (R-01.19 y AC-01.15 actualizados). Sugerencia a `@cms-engineer`: `helpText` y `errorMessage` del seed mencionan ambos formatos. | No — decidido en HITL-1 (corrección 2). |
| GAP-01.22 | **Contrato de la ciudad para el ajuste de precio (corrección humana 3, HITL-1).** El factor por ciudad/región vive como atributo opcional de la opción del `select` con rol `city`. ¿Cómo afecta el contrato y el formulario de US-01? | Hardcodear ciudades en Angular (regla 2); que el formulario interprete o muestre el factor. | Se agrega `priceAdjustmentPct` (entero opcional) a `FormFieldOption` (componente `form.field-option`). Solo lo lee el precio (`SPEC-US-02` R-02.21 a R-02.24) a través del rol `city`; el Paso 1 lo ignora (no se renderiza ni valida; `label`/`value` siguen igual). La query de campos ya lo trae con `populate[options]=true` (sin cambios). Decisión de fondo, rango y alternativas: GAP-02.18 en `SPEC-US-02`. | Resuelto en cierre de HITL-1: el humano aprueba opción A y rango [-10, +30] (`docs/hitl/HITL-1-specs.md`). |

## 2. Reglas de negocio

| ID R | Regla medible | Origen | Verificación |
| :--- | :--- | :--- | :--- |
| R-01.1 | Rutas: `/` redirige a `/co/quote/step-1`; `/:country` y `/:country/quote` redirigen a `/:country/quote/step-1`; código con mayúsculas redirige a minúsculas; un `code` sin registro `country` en Strapi redirige a `/country-not-found`, que lista un enlace por cada país devuelto por `GET /api/countries`. Ninguna lista de países en el código. | US-01 contexto, GAP-01.1 | Unit del resolvedor de país + E2E |
| R-01.2 | Solo se muestran campos publicados del país. Orden: sección `policyholder` primero, luego `vehicle`; dentro de la sección, `order` ascendente; empate resuelto por `createdAt` ascendente. | US-01 AC "Form configured by country", GAP-01.13 | Unit de ordenamiento + E2E |
| R-01.3 | Render por tipo: `text` → `input[type=text]`; `number` → `input[type=number]` con `inputmode="numeric"`; `select` → `select` con opciones en el orden de Strapi y una opción vacía inicial; `date` → `input[type=date]`; `checkbox` → `input[type=checkbox]`. Se muestran `label`, `placeholder` y `helpText` configurados. | US-01 regla "Each field is configured with…" | E2E |
| R-01.4 | Cada fallo de validación muestra exactamente un mensaje junto al campo: `errorMessage` del campo (o `validationMessage` de la opción para patrón dependiente), vinculado con `aria-describedby` y `aria-invalid="true"`. | US-01 AC "Field validation", GAP-01.12 | Unit + E2E |
| R-01.5 | Obligatoriedad: `text`/`number`/`date`/`select` requeridos fallan si el valor tras `trim()` es vacío; `checkbox` requerido falla si no está marcado; campo opcional vacío no ejecuta otros validadores. | GAP-01.12 | Unit |
| R-01.6 | Validadores declarativos (extremos inclusivos): `min`/`max` sobre número; `minLength`/`maxLength` sobre la longitud del texto recortado; `pattern` como `RegExp` aplicada al valor completo tal como se escribió el patrón. Un `pattern` que no compila → `config-error` en ese campo (sin excepción no controlada). | US-01 regla "validations", GAP-01.12 | Unit |
| R-01.7 | Al pulsar "Continuar" se validan todos los campos; si hay ≥ 1 error: la URL sigue en `step-1`, el foco va al primer control inválido en orden DOM y una región `aria-live="polite"` anuncia "N errores" (copy en catálogo). Si no hay errores se navega a `step-2`. | US-01 AC "Field validation", GAP-01.19 | E2E |
| R-01.8 | Cada cambio de valor se guarda en `sessionStorage['auto_quote_v1_<country>']` con forma `QuoteState` (sección 4), indexado por `documentId`. Volver desde Paso 2 o 3, o recargar, restaura todos los valores (incluidos checkbox sin marcar y valores aún inválidos). | US-01 AC "Keep data when going back", CLAUDE regla 6 | Unit de almacenamiento + E2E |
| R-01.9 | Hidratación tolerante: `documentId` sin campo publicado → ignorado y purgado en el siguiente guardado; tipo del valor distinto del `type` del campo → descartado; valor de `select` ausente de las opciones vigentes → descartado; campo publicado sin valor → vacío. | GAP-01.11 | Unit + E2E |
| R-01.10 | `validateStep1(config, values, now)` es una función pura que devuelve la lista de errores por `documentId`; la usan el botón "Continuar" y los guards de Paso 2 y 3. No existe flag persistido de "Paso 1 completo". Si devuelve ≥ 1 error, el guard redirige a `step-1` y marca esos campos como tocados. | GAP-01.10 | Unit + E2E |
| R-01.11 | Roles requeridos `birth_date` (type `date`), `vehicle_year` (type `number`) y `document_number` (type `text`): cada uno debe aparecer exactamente una vez entre los campos publicados. Ausente, duplicado o con tipo distinto → estado `config-error` que nombra el rol; no se renderiza el formulario ni se permite avanzar. `validatorKey` incompatible con el rol (`legal_age` fuera de `birth_date`, `vehicle_year_range` fuera de `vehicle_year`, `cl_rut` fuera de `document_number`, `depends_on_option_pattern` sin `dependsOnRole` apuntando a un `select`) → `config-error`. | CLAUDE regla 3, GAP-01.2, GAP-01.3 | Unit + E2E |
| R-01.12 | La lógica de negocio localiza campos solo por `semanticRole`. Un mismo conjunto de campos con `key` distintas (p. ej. renombradas a `zzz_1`) produce los mismos resultados de validación y los mismos errores. Ningún archivo bajo `frontend/src/app/domain/` ni de componentes referencia literales de `key` de seed (`documentType`, `birthDate`, etc.). | CLAUDE regla 3, GAP-01.2 | Unit con `key` aleatorias + revisión estática en `@qa-reviewer` (búsqueda de literales) |
| R-01.13 | Mayoría de edad (rol `birth_date`): válido si la edad calendario local ≥ `country.legalAge`. Con `legalAge = 18` y hoy `2026-11-23`: `2008-11-23` válido, `2008-11-22` válido, `2008-11-24` inválido; fecha futura inválida; `2008-02-30` inválida. Nacidos el 29-feb alcanzan la edad el 1-mar. Prohibido `new Date('YYYY-MM-DD')`. | US-01 regla "legal age", GAP-01.4 | Unit |
| R-01.14 | Año del vehículo (rol `vehicle_year`): entero de 4 dígitos con `añoActual - vehicleMaxAgeYears ≤ año ≤ añoActual + vehicleMaxFutureYears` (extremos inclusivos). Con 2026, 20 y 1: `2006` y `2027` válidos; `2005`, `2028`, `2020.5`, `-2020`, `1e3` inválidos. | US-01 regla "vehicle year", GAP-01.5 | Unit |
| R-01.15 | `legalAge`, `vehicleMaxAgeYears`, `vehicleMaxFutureYears` provienen del registro `country`. Con `legalAge = 21` una persona de 20 años es inválida; con `vehicleMaxAgeYears = 10` y año actual 2026, `2015` es inválido. Valor no entero o negativo → `config-error`. No existen las constantes 18, 20 ni 1 como parámetros en el código de reglas. | CLAUDE regla 2, GAP-01.3 | Unit |
| R-01.16 | Patrón dependiente: con `validatorKey = depends_on_option_pattern` y `dependsOnRole = document_type`, el patrón es `validationPattern` de la opción seleccionada; sin patrón en la opción se usa `validation.pattern`; si no existe, solo obligatoriedad. Mensaje: `validationMessage` de la opción, si no `errorMessage`. Sin tipo seleccionado no se evalúa patrón. Cambiar el tipo revalida el número si fue tocado o tiene valor. | GAP-01.6 | Unit + E2E |
| R-01.17 | Datos semilla CO (ficticios, pendientes de confirmación humana): CC `^[0-9]{6,10}$`, CE `^[0-9]{6,7}$`. Con tipo CC, `12345678` es válido y `12345` inválido; con tipo CE, `12345678` es inválido y `1234567` válido. | GAP-01.6 | E2E (Strapi sembrado) |
| R-01.18 | RUT (`cl_rut`): tras normalizar, forma `^[0-9]{7,8}-?[0-9K]$` y DV por Módulo 11. Válidos: `12.345.678-5`, `12345678-5`, `1.000.005-K`, `1000005k`, `9.000.002-0`. Inválidos: `12.345.678-K` (DV), `12.345.678` (sin DV), `1.234-5` (cuerpo corto), `abc`. El valor guardado es el normalizado con guion. | US-01 contexto (RUT), GAP-01.7 | Unit |
| R-01.19 | Placa/patente (rol `vehicle_plate`): se aplica trim, eliminación de espacios y guiones y mayúsculas antes del `pattern`; se guarda normalizado. CO (patrón `^[A-Z]{3}[0-9]{2}[0-9A-Z]$`, GAP-01.21): `abc123`, `ABC-123`, `ABC12D` y `xyz 12a` válidos; `AB12`, `ABCD123`, `ABC1234`, `ABC1D2`, `AB123C`, `ABC12` inválidos. CL: `BBBB12`, `BB1234`, `bb-12-34` válidos; `BBB123`, `BB123` inválidos. | US-01 contexto (placa/patente), GAP-01.8, GAP-01.21 | Unit + E2E |
| R-01.20 | Aislamiento por país: abrir `/cl/...` nunca lee ni escribe la clave `auto_quote_v1_co` y viceversa; cambiar de país navega a `step-1` del país nuevo; una respuesta HTTP que llega tras cambiar de país se descarta (no se renderiza). | CLAUDE regla 6, GAP-01.9 | Unit + E2E |
| R-01.21 | Frescura: cada carga completa de la aplicación (incluida la recarga) solicita campos y país a Strapi; no hay caché persistente entre cargas. Un campo nuevo publicado aparece tras recargar sin cambios de código. | US-01 AC "Configuration change without deployment", GAP-01.10, HITL-1 (mock + prueba manual) | E2E-M (respuesta de Strapi simulada con `page.route`: sin campo → con campo tras recargar) + prueba manual en vivo en HITL-3. Sin token de escritura en ningún entorno |
| R-01.22 | La vista del Paso 1 es una unión discriminada `loading` / `ready` / `empty` / `error` / `config-error`. `loading`: indicador con `role="status"`. `error`: `role="alert"` y botón "Reintentar" que refetchea sin perder valores. `empty` (0 campos publicados): mensaje y sin botón de avance. | CLAUDE §7, GAP-01.15 | Unit del estado + E2E |
| R-01.23 | Petición exacta de la sección 4 (solo rutas relativas `/api/...`); timeout 10 000 ms → `error`; `meta.pagination.total > 100` → `config-error`; ningún token ni cabecera `Authorization` en el navegador. | CLAUDE reglas 4 y §7, GAP-01.14 | Unit de construcción de URL + E2E (inspección de petición) |
| R-01.24 | `sessionStorage` ilegible, JSON inválido o `schemaVersion ≠ 1` → se trata como vacío y se elimina la clave; fallo de escritura → estado en memoria sin excepción. Ningún valor del formulario se escribe en `console`. | GAP-01.16, CLAUDE regla 5 | Unit + E2E (captura de consola) |
| R-01.25 | Accesibilidad: cada control tiene `<label for>`; ayuda y error enlazados con `aria-describedby`; `aria-invalid` en inválidos; `aria-required="true"` en requeridos; el estado de error no depende solo del color (texto visible); foco al `h1` al entrar al paso; completable solo con teclado (`Tab`, `Shift+Tab`, `Enter`, `Space`). | CLAUDE regla 7, GAP-01.19 | E2E de teclado + atributos ARIA |
| R-01.26 | Momento de validación: al `blur` y al enviar; un campo sin tocar no muestra error antes del primer envío; el error desaparece al instante en que el valor pasa a válido. | GAP-01.19 | Unit + E2E |
| R-01.27 | Todo texto de interfaz no proveniente de Strapi sale del catálogo `ui-copy.es.ts`; ninguna plantilla contiene literales de texto de UI. Todo texto de campo (label, ayuda, error, opciones) proviene de Strapi. | CLAUDE regla 2, GAP-01.17 | Unit del catálogo + revisión estática en `@qa-reviewer` |
| R-01.28 | Correo obligatorio y configurado en Strapi: para `co` y `cl` existe exactamente un campo publicado con `semanticRole = email`, `type = text`, `section = policyholder`, `required = true` (seed). Con el valor vacío o solo espacios el Paso 1 no avanza y muestra el `errorMessage` del campo. Dos campos con rol `email`, o un campo `email` con `type ≠ text` → `config-error` que nombra el rol. La obligatoriedad sale de `required` en Strapi, no de una constante del código; el rol no pertenece a la lista de roles requeridos del motor (GAP-01.2). | Corrección humana 1 (HITL-1), GAP-01.20 | Unit + E2E-S (seed CO y CL) |
| R-01.29 | Formato del correo: `trim()` antes de validar; se guarda recortado y sin cambiar mayúsculas. Precedencia de GAP-01.12: obligatorio → `maxLength` 254 (inclusivo) → `pattern` `^[A-Za-z0-9._%+-]{1,64}@([A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,24}$`. Válidos: `ana.perez@example.com`, `a+b@correo.co`, `ANA@Example.CL`, `maria_1@mail.dominio.com.co`, `  ana@example.com  ` (se recorta). Inválidos: `ana@`, `@example.com`, `ana@example`, `ana@@example.com`, `ana perez@example.com`, `ana@example..com`, `ana@example.c`, `ana@-example.com`, `ana@example.com.`, `ñandu@example.com` y toda cadena de 255 caracteres. El mensaje es el `errorMessage` del campo. Un cambio del patrón en Strapi se aplica tras recargar, sin deploy. | Corrección humana 1 (HITL-1), GAP-01.20 | Unit + E2E-S |
| R-01.30 | Atributos del control del rol `email` (identificar el propósito del campo, WCAG 1.3.5): `autocomplete="email"`, `inputmode="email"` y `spellcheck="false"`; el control sigue siendo `input[type=text]` (R-01.3) para que el mensaje sea el de Strapi y no el del navegador. Los atributos se derivan del `semanticRole`, nunca del `key`. | Corrección humana 1 (HITL-1), GAP-01.20, CLAUDE regla 7 | E2E-S (atributos ARIA/HTML) + Unit |
| R-01.31 | Placa de moto en Colombia: con el patrón de GAP-01.21 en el campo `vehicle_plate` de CO, `AAA123` y `AAA12A` son válidas tras normalizar. El código de Angular no contiene ese patrón ni ramas por tipo de vehículo (R-01.12 aplica). Si negocio cambia el patrón en Strapi a `^[A-Z]{3}[0-9]{3}$`, `ABC12D` pasa a inválida tras recargar, sin deploy. Chile no cambia. El producto sigue siendo seguro de autos: esta regla no agrega campos, planes ni precios. | Corrección humana 2 (HITL-1), GAP-01.21 | Unit + E2E-M |

## 3. Criterios de aceptación

### AC-01.1 — Formulario configurado por país
```gherkin
Escenario: Formulario configurado por país
  Dado que hay campos publicados en Strapi para Colombia y para Chile
  Cuando abro /co/quote/step-1
  Entonces veo solo los campos configurados para Colombia
  Y aparecen primero los de la sección tomador y luego los del vehículo, cada sección por "order" ascendente
  Cuando abro /cl/quote/step-1
  Entonces veo solo los campos configurados para Chile (RUT y Patente en lugar de Tipo de documento y Placa)
```

### AC-01.2 — Validación de campo
```gherkin
Escenario: Validación de campo
  Dado que estoy llenando el formulario del Paso 1
  Cuando un campo no cumple su validación configurada
  Entonces veo el mensaje de error configurado en Strapi junto a ese campo
  Y no puedo pasar al Paso 2 (la URL sigue en /co/quote/step-1)
  Y el foco queda en el primer control inválido
```

### AC-01.3 — Cambio de configuración sin despliegue
```gherkin
Escenario: Cambio de configuración sin despliegue
  Dado que negocio agrega un campo nuevo publicado en Strapi para Colombia
  Cuando recargo la aplicación
  Entonces el campo nuevo aparece en la posición definida por su "order" sin cambios de código
  Y los valores que ya había escrito en otros campos se conservan
```
*Verificación (HITL-1, "Mock + prueba manual"):* E2E con la respuesta de Strapi simulada (Playwright `route`: la primera respuesta sin el campo, la posterior a la recarga con el campo) y prueba manual en vivo en HITL-3 (publicar un campo desde el admin de Strapi y recargar). Ningún token de escritura en ningún entorno.

### AC-01.4 — Conservar datos al volver
```gherkin
Escenario: Conservar datos al volver
  Dado que completé el Paso 1 y avancé al Paso 2
  Cuando vuelvo al Paso 1
  Entonces todos mis datos siguen diligenciados, incluidos selects y checkbox
```

### AC-01.5 — País inexistente
```gherkin
Escenario: Código de país inválido
  Dado que no existe un país "pe" en Strapi
  Cuando abro /pe/quote/step-1
  Entonces soy redirigido a /country-not-found
  Y veo un selector con un enlace por cada país configurado en Strapi
```

### AC-01.6 — Redirecciones de entrada
```gherkin
Esquema del escenario: Redirecciones de entrada
  Cuando abro <entrada>
  Entonces termino en <destino>

  Ejemplos:
    | entrada            | destino             |
    | /                  | /co/quote/step-1    |
    | /cl                | /cl/quote/step-1    |
    | /cl/quote          | /cl/quote/step-1    |
    | /CL/quote/step-1   | /cl/quote/step-1    |
```

### AC-01.7 — Rol requerido ausente
```gherkin
Escenario: Falta un rol semántico requerido
  Dado que negocio despublica el campo con semanticRole "birth_date" de Colombia
  Cuando abro /co/quote/step-1
  Entonces veo un error de configuración que nombra el rol "birth_date"
  Y no se muestra el formulario ni el botón para continuar
  Y la aplicación no lanza excepciones en consola
```

### AC-01.8 — Renombrar la key no rompe la lógica
```gherkin
Escenario: Renombrar la key de un campo
  Dado que negocio cambia la key del campo con rol "birth_date" a "zzz_1"
  Cuando recargo y escribo una fecha de nacimiento de un menor de edad
  Entonces veo el mensaje de error de ese campo
  Y la validación de mayoría de edad sigue funcionando
  Y los datos que ya había escrito se conservan
```

### AC-01.9 — Mayoría de edad en el borde
```gherkin
Esquema del escenario: Mayoría de edad con fecha calendario local
  Dado que la edad legal de Colombia es 18 y hoy es 2026-11-23 en America/Bogota
  Cuando escribo la fecha de nacimiento <fecha>
  Entonces el campo es <resultado>

  Ejemplos:
    | fecha      | resultado |
    | 2008-11-22 | válido    |
    | 2008-11-23 | válido    |
    | 2008-11-24 | inválido  |
    | 2027-01-01 | inválido  |
    | 2008-02-30 | inválido  |
```

### AC-01.10 — Año del vehículo en los extremos
```gherkin
Esquema del escenario: Rango del año del vehículo
  Dado que el año actual es 2026, el máximo de antigüedad es 20 y el máximo a futuro es 1
  Cuando escribo el año <año>
  Entonces el campo es <resultado>

  Ejemplos:
    | año    | resultado |
    | 2005   | inválido  |
    | 2006   | válido    |
    | 2027   | válido    |
    | 2028   | inválido  |
    | 2020.5 | inválido  |
```

### AC-01.11 — Parámetros por país
```gherkin
Escenario: La edad legal y el rango salen del país
  Dado que Strapi configura legalAge = 21 y vehicleMaxAgeYears = 10 para Colombia
  Cuando escribo una fecha de nacimiento de una persona de 20 años y el año 2015
  Entonces ambos campos muestran su mensaje de error
```

### AC-01.12 — Número de documento según tipo (CC vs CE)
```gherkin
Escenario: Patrón del número según el tipo de documento
  Dado que estoy en /co/quote/step-1
  Cuando selecciono "CC" y escribo "12345678"
  Entonces el número es válido
  Cuando selecciono "CE" con el mismo número "12345678"
  Entonces veo el mensaje de validación configurado en la opción "CE"
```

### AC-01.13 — Cambiar el tipo revalida el número
```gherkin
Escenario: Cambio de tipo de documento revalida el número
  Dado que seleccioné "CC" y escribí "12345678" sin errores
  Cuando cambio el tipo a "CE"
  Entonces el campo número pasa a inválido de inmediato
  Y si vuelvo a "CC" el error desaparece
```

### AC-01.14 — Validación de RUT
```gherkin
Esquema del escenario: Dígito verificador del RUT
  Dado que estoy en /cl/quote/step-1
  Cuando escribo el RUT <rut>
  Entonces el campo es <resultado>

  Ejemplos:
    | rut          | resultado |
    | 12.345.678-5 | válido    |
    | 1.000.005-K  | válido    |
    | 1000005k     | válido    |
    | 9.000.002-0  | válido    |
    | 12.345.678-K | inválido  |
    | 12.345.678   | inválido  |
```

### AC-01.15 — Placa y patente
```gherkin
Esquema del escenario: Formatos de placa y patente
  Dado que estoy en el formulario de <país>
  Cuando escribo <valor> en placa o patente
  Entonces el campo es <resultado>

  Ejemplos:
    | país | valor     | resultado |
    | co   | abc123    | válido    |
    | co   | ABC-123   | válido    |
    | co   | ABC12D    | válido    |
    | co   | ABC1D2    | inválido  |
    | cl   | BBBB12    | válido    |
    | cl   | bb-12-34  | válido    |
    | cl   | BBB123    | inválido  |
```

### AC-01.16 — Cambio de país a mitad del flujo
```gherkin
Escenario: Los datos de cada país están aislados
  Dado que llené el Paso 1 de Colombia
  Cuando abro /cl/quote/step-1
  Entonces el formulario de Chile aparece vacío
  Cuando vuelvo a /co/quote/step-1
  Entonces mis datos de Colombia siguen ahí
  Y el almacenamiento "auto_quote_v1_cl" no contiene valores de Colombia
```

### AC-01.17 — Respuesta del país anterior descartada
```gherkin
Escenario: Respuesta tardía de otro país
  Dado que la respuesta de campos de Colombia tarda 3 segundos
  Cuando cambio a /cl/quote/step-1 antes de que llegue
  Entonces nunca veo campos de Colombia en la pantalla de Chile
```

### AC-01.18 — Recarga en el Paso 1
```gherkin
Escenario: Recarga con datos guardados
  Dado que escribí datos en el Paso 1 y no avancé
  Cuando recargo el navegador
  Entonces los valores siguen en su lugar y la configuración se vuelve a pedir a Strapi
```

### AC-01.19 — Campo despublicado con datos guardados
```gherkin
Escenario: Campo despublicado
  Dado que había diligenciado el campo "Ciudad" y luego negocio lo despublica
  Cuando recargo el Paso 1
  Entonces el campo "Ciudad" no aparece
  Y su valor antiguo no se usa en ninguna parte de la aplicación
```

### AC-01.20 — Opción de select eliminada
```gherkin
Escenario: Opción de select ya no existe
  Dado que había elegido la marca "Mazda" y negocio elimina esa opción
  Cuando recargo el Paso 1
  Entonces el select aparece sin selección
  Y no se muestra error hasta que intente continuar
```

### AC-01.21 — Campo requerido nuevo tras completar el Paso 1
```gherkin
Escenario: Guard revalida contra la configuración vigente
  Dado que completé el Paso 1 y estoy en el Paso 2
  Y negocio publica un campo nuevo requerido
  Cuando recargo el Paso 2
  Entonces soy redirigido a /co/quote/step-1
  Y el campo nuevo aparece marcado con su mensaje de error
```

### AC-01.22 — Error de red recuperable
```gherkin
Escenario: Strapi no responde
  Dado que la API de campos responde 500
  Cuando abro /co/quote/step-1
  Entonces veo una alerta con un botón "Reintentar"
  Cuando la API vuelve a responder y pulso "Reintentar"
  Entonces el formulario se muestra sin recargar la página
  Y los datos que ya había guardado se conservan
```

### AC-01.23 — Sin campos publicados
```gherkin
Escenario: País sin campos
  Dado que Strapi no tiene campos publicados para Colombia
  Cuando abro /co/quote/step-1
  Entonces veo un mensaje de estado vacío
  Y no hay botón para continuar
```

### AC-01.24 — Teclado y lector de pantalla
```gherkin
Escenario: Completar el Paso 1 solo con teclado
  Dado que uso únicamente teclado
  Cuando recorro el formulario con Tab y completo todos los campos
  Y presiono Enter en "Continuar" con un campo inválido
  Entonces el foco pasa al primer control inválido
  Y ese control tiene aria-invalid="true" y aria-describedby apuntando a su error
  Y una región aria-live anuncia la cantidad de errores
```

### AC-01.25 — Almacenamiento corrupto
```gherkin
Escenario: sessionStorage con JSON inválido
  Dado que "auto_quote_v1_co" contiene texto que no es JSON
  Cuando abro /co/quote/step-1
  Entonces veo el formulario vacío sin errores en consola
  Y la clave corrupta es reemplazada al escribir
```

### AC-01.26 — Desempate de orden
```gherkin
Escenario: Dos campos con el mismo order
  Dado que dos campos de la sección tomador tienen order = 5
  Cuando recargo varias veces
  Entonces siempre aparecen en el mismo orden (el más antiguo primero)
```

### AC-01.27 — Checkbox requerido
```gherkin
Escenario: Checkbox requerido sin marcar
  Dado que un checkbox está configurado como requerido
  Cuando intento continuar sin marcarlo
  Entonces veo su mensaje de error y no avanzo
  Y un checkbox no requerido sin marcar no bloquea el avance
```

### AC-01.28 — Correo obligatorio en Colombia y Chile
```gherkin
Esquema del escenario: El correo del tomador es obligatorio
  Dado que estoy en el formulario de <país> con el campo de correo configurado en Strapi como requerido
  Cuando dejo el correo con el valor <valor> y pulso "Continuar"
  Entonces el campo es <resultado>
  Y si es inválido veo el mensaje de error configurado en Strapi y la URL sigue en step-1

  Ejemplos:
    | país | valor                 | resultado |
    | co   | (vacío)               | inválido  |
    | co   | "   " (solo espacios) | inválido  |
    | co   | ana.perez@example.com | válido    |
    | cl   | (vacío)               | inválido  |
    | cl   | ana.perez@example.com | válido    |
```

### AC-01.29 — Formato del correo
```gherkin
Esquema del escenario: Formato medible del correo
  Dado que estoy en el formulario de Colombia o de Chile
  Cuando escribo el correo <valor>
  Entonces el campo es <resultado>

  Ejemplos:
    | valor                       | resultado |
    | ana.perez@example.com       | válido    |
    | a+b@correo.co               | válido    |
    | ANA@Example.CL              | válido    |
    | maria_1@mail.dominio.com.co | válido    |
    | "  ana@example.com  "       | válido    |
    | ana@                        | inválido  |
    | @example.com                | inválido  |
    | ana@example                 | inválido  |
    | ana@@example.com            | inválido  |
    | ana perez@example.com       | inválido  |
    | ana@example..com            | inválido  |
    | ana@example.c               | inválido  |
    | ana@example.com.            | inválido  |
```

### AC-01.30 — Propósito del campo de correo
```gherkin
Escenario: El control de correo declara su propósito
  Dado que la clave del campo con rol "email" fue renombrada por negocio a "zzz_9"
  Cuando abro el formulario
  Entonces el control tiene autocomplete="email", inputmode="email" y es un input de texto
  Y un correo inválido muestra el mensaje de Strapi y no el del navegador
```

### AC-01.31 — Placa de moto en Colombia
```gherkin
Esquema del escenario: Placa de auto y de moto en Colombia
  Dado que estoy en /co/quote/step-1 y el patrón de placa configurado en Strapi es el de auto y moto
  Cuando escribo <valor> en la placa
  Entonces el campo es <resultado>

  Ejemplos:
    | valor    | resultado |
    | ABC123   | válido    |
    | XYZ12A   | válido    |
    | xyz-12a  | válido    |
    | ABC1D2   | inválido  |
    | AB123C   | inválido  |
    | ABC12    | inválido  |
```

### AC-01.32 — Negocio revierte el formato de moto sin despliegue
```gherkin
Escenario: El patrón de placa se edita desde Strapi
  Dado que negocio cambia el patrón de la placa de Colombia a solo auto (tres letras y tres dígitos)
  Cuando recargo /co/quote/step-1 y escribo "ABC12D"
  Entonces el campo es inválido con el mensaje configurado en Strapi
  Y no hay ningún cambio de código ni de despliegue
```
*Verificación:* E2E-M con la respuesta de Strapi simulada (sin token de escritura); la prueba en vivo se agrega al checklist manual de HITL-3.

## 4. Contrato de datos

**Entrada para `@architect`:** formalizar en `docs/contracts/strapi-contracts.ts` (archivo inexistente al escribir esta spec). Los tipos reflejan la respuesta REST de Strapi 5 (atributos aplanados, sin `attributes`) y el modelo de `strapi-5-docker-seed`.

```ts
export type SemanticRole =
  | 'none' | 'full_name' | 'document_type' | 'document_number' | 'birth_date'
  | 'email' | 'phone' | 'city' | 'vehicle_plate' | 'vehicle_brand'
  | 'vehicle_model' | 'vehicle_year' | 'vehicle_use';

export type FieldType = 'text' | 'number' | 'select' | 'date' | 'checkbox';
export type FieldSection = 'policyholder' | 'vehicle';
export type ValidatorKey =
  | 'none' | 'legal_age' | 'vehicle_year_range' | 'cl_rut' | 'depends_on_option_pattern';

export interface FormFieldOption {
  label: string;
  value: string;
  validationPattern?: string | null;
  validationMessage?: string | null;
  /** Solo lo lee el precio (SPEC-US-02) y solo en opciones del campo con rol `city`. Entero en [-10, +30]; ausente/null = sin ajuste. El Paso 1 lo ignora (GAP-01.22). */
  priceAdjustmentPct?: number | null;
}

export interface FormFieldValidation {
  min?: number | null;
  max?: number | null;
  minLength?: number | null;
  maxLength?: number | null;
  pattern?: string | null;
  validatorKey: ValidatorKey;
  dependsOnRole?: SemanticRole | null;
}

export interface StrapiFormField {
  id: number;
  documentId: string;
  key: string;                 // renombrable por negocio: NUNCA usar en lógica
  semanticRole: SemanticRole;
  section: FieldSection;
  label: string;
  type: FieldType;
  required: boolean;
  order: number;
  placeholder?: string | null;
  helpText?: string | null;
  errorMessage: string;
  validation?: FormFieldValidation | null;
  options?: FormFieldOption[];
  createdAt: string;
}

export interface StrapiCountry {
  id: number;
  documentId: string;
  code: string;                // ^[a-z]{2}$
  name: string;
  currencyCode: string;        // ^[A-Z]{3}$
  locale: string;              // BCP 47, p. ej. es-CO
  legalAge: number;
  vehicleMaxAgeYears: number;
  vehicleMaxFutureYears: number;
  termsTitle: string;
  termsContent: string;
  termsVersion: string;
}

export interface StrapiListResponse<T> {
  data: T[];
  meta: { pagination: { page: number; pageSize: number; pageCount: number; total: number } };
}

/** Valores del Paso 1 indexados por documentId (no por key). */
export type Step1Values = Record<string, string | number | boolean | null>;

/** Estado persistido en sessionStorage['auto_quote_v1_<country>'] (compartido por US-01/02/03). */
export interface QuoteState {
  schemaVersion: 1;
  step1: Step1Values;
  selectedPlan?: { planDocumentId: string; priceSeenAtSelection: number };
  confirmation?: {
    quoteNumber: string;
    planDocumentId: string;
    planName: string;
    finalPrice: number;
    paidAt: string;            // ISO 8601
  };
}
```

El rol `email` ya existe en `SemanticRole`: el correo del tomador (GAP-01.20) no cambia el contrato. Funciones puras nuevas: `normalizeEmail` (solo `trim`) y los atributos de entrada derivados del rol (`inputAttributesForRole`).

**Queries REST exactas** (rutas relativas, vía proxy; sin token en el navegador):

- País: `GET /api/countries?filters[code][$eq]=<country>` (el tipo `country` no tiene Draft & Publish).
- Lista de países para `/country-not-found`: `GET /api/countries?fields[0]=code&fields[1]=name&sort=name:asc&pagination[pageSize]=100`.
- Campos: `GET /api/form-fields?filters[country][code][$eq]=<country>&status=published&populate[validation]=true&populate[options]=true&sort[0]=order:asc&sort[1]=createdAt:asc&pagination[pageSize]=100`.

Funciones puras previstas (CLAUDE §7), en `frontend/src/app/domain/form/`: `resolveRoles`, `validateField`, `validateStep1`, `parseIsoDate`, `calculateAge`, `normalizeRut`, `isValidRut`, `normalizePlate`, `hydrateValues`.

## 5. Estados de UI y accesibilidad

| Estado | Condición | Presentación |
| :--- | :--- | :--- |
| `loading` | Petición de país o campos en curso | Indicador con `role="status"`; sin formulario |
| `ready` | Config válida con ≥ 1 campo | Formulario por secciones; botón "Continuar" |
| `empty` | 0 campos publicados | Mensaje informativo; sin "Continuar" |
| `error` | Red, timeout, 4xx/5xx | `role="alert"` + "Reintentar" (no pierde datos) |
| `config-error` | Rol requerido ausente/duplicado/incompatible, patrón inválido, parámetros de país inválidos, `total > 100` | `role="alert"` nombrando el problema; sin "Continuar" |

Accesibilidad: ver R-01.25 y R-01.26. Contraste y tamaño de objetivo táctil según WCAG 2.2 AA (detalle visual: `@ui-ux-designer`).

## 6. Matriz de verificación

Tipos: **Unit** (runner por defecto del CLI de Angular), **E2E-S** (Playwright contra Strapi sembrado, **solo lectura**), **E2E-M** (Playwright con `page.route` para simular respuestas de Strapi), **Manual-HITL3** (prueba en vivo del humano en HITL-3). El título de cada test incluye el ID (p. ej. `it('[R-01.13] ...')`).

Regla (HITL-1): ningún token de escritura de Strapi existe en ningún entorno (local, CI, runner de E2E ni navegador). Todo escenario que requiera *mutar* la configuración de Strapi se verifica con E2E-M y se confirma una vez en vivo con Manual-HITL3. Justificación de la prueba manual: la cadena real admin de Strapi → API → front no se puede automatizar sin una credencial de escritura, prohibida por la decisión humana y por `CLAUDE.md` regla 4.

| ID | Tipo | Archivo planificado |
| :--- | :--- | :--- |
| R-01.1 | Unit + E2E-S | `frontend/src/app/domain/country/country-resolver.spec.ts`; `frontend/e2e/us-01-form.spec.ts` |
| R-01.2 | Unit + E2E-S | `frontend/src/app/domain/form/form-layout.spec.ts`; `frontend/e2e/us-01-form.spec.ts` |
| R-01.3 | E2E-S | `frontend/e2e/us-01-form.spec.ts` |
| R-01.4 | Unit + E2E-S | `frontend/src/app/domain/form/field-validators.spec.ts`; `frontend/e2e/us-01-form.spec.ts` |
| R-01.5 | Unit | `frontend/src/app/domain/form/field-validators.spec.ts` |
| R-01.6 | Unit | `frontend/src/app/domain/form/field-validators.spec.ts` |
| R-01.7 | E2E-S | `frontend/e2e/us-01-form.spec.ts` |
| R-01.8 | Unit + E2E-S | `frontend/src/app/core/storage/quote-storage.spec.ts`; `frontend/e2e/us-01-form.spec.ts` |
| R-01.9 | Unit + E2E-M | `frontend/src/app/domain/form/form-hydration.spec.ts`; `frontend/e2e/us-01-config-mutations.spec.ts` |
| R-01.10 | Unit + E2E-M | `frontend/src/app/domain/form/validate-step1.spec.ts`; `frontend/e2e/us-01-config-mutations.spec.ts` |
| R-01.11 | Unit + E2E-M | `frontend/src/app/domain/form/semantic-roles.spec.ts`; `frontend/e2e/us-01-config-mutations.spec.ts` |
| R-01.12 | Unit + revisión estática | `frontend/src/app/domain/form/semantic-roles.spec.ts`; `docs/reviews/REVIEW-US-01.md` (`@qa-reviewer`) |
| R-01.13 | Unit | `frontend/src/app/domain/form/legal-age.spec.ts` |
| R-01.14 | Unit | `frontend/src/app/domain/form/vehicle-year-range.spec.ts` |
| R-01.15 | Unit | `frontend/src/app/domain/form/country-params.spec.ts` |
| R-01.16 | Unit + E2E-S | `frontend/src/app/domain/form/document-dependent-pattern.spec.ts`; `frontend/e2e/us-01-form.spec.ts` |
| R-01.17 | E2E-S | `frontend/e2e/us-01-form.spec.ts` |
| R-01.18 | Unit | `frontend/src/app/domain/form/cl-rut.spec.ts` |
| R-01.19 | Unit + E2E-S | `frontend/src/app/domain/form/vehicle-plate.spec.ts`; `frontend/e2e/us-01-form.spec.ts` |
| R-01.20 | Unit + E2E-M | `frontend/src/app/core/storage/quote-storage.spec.ts`; `frontend/e2e/us-01-country-isolation.spec.ts` |
| R-01.21 | E2E-M + Manual-HITL3 | `frontend/e2e/us-01-config-mutations.spec.ts`; checklist "cambio de configuración en vivo" en el registro de HITL-3 (`docs/hitl/`) |
| R-01.22 | Unit + E2E-M | `frontend/src/app/features/step-1/step-1-view-state.spec.ts`; `frontend/e2e/us-01-states.spec.ts` |
| R-01.23 | Unit + E2E-M | `frontend/src/app/core/http/strapi-queries.spec.ts`; `frontend/e2e/us-01-states.spec.ts` |
| R-01.24 | Unit + E2E-M | `frontend/src/app/core/storage/quote-storage.spec.ts`; `frontend/e2e/us-01-states.spec.ts` |
| R-01.25 | E2E-S | `frontend/e2e/us-01-a11y.spec.ts` |
| R-01.26 | Unit + E2E-S | `frontend/src/app/domain/form/field-validators.spec.ts`; `frontend/e2e/us-01-a11y.spec.ts` |
| R-01.27 | Unit + revisión estática | `frontend/src/app/i18n/ui-copy.spec.ts`; `docs/reviews/REVIEW-US-01.md` (`@qa-reviewer`) |
| AC-01.1 | E2E-S | `frontend/e2e/us-01-form.spec.ts` |
| AC-01.2 | E2E-S | `frontend/e2e/us-01-form.spec.ts` |
| AC-01.3 | E2E-M + Manual-HITL3 | `frontend/e2e/us-01-config-mutations.spec.ts` (respuesta de Strapi simulada con `page.route`); checklist "cambio de configuración en vivo" en el registro de HITL-3 (`docs/hitl/`) |
| AC-01.4 | E2E-S | `frontend/e2e/us-01-form.spec.ts` |
| AC-01.5 | E2E-S | `frontend/e2e/us-01-form.spec.ts` |
| AC-01.6 | E2E-S | `frontend/e2e/us-01-form.spec.ts` |
| AC-01.7 | E2E-M | `frontend/e2e/us-01-config-mutations.spec.ts` |
| AC-01.8 | E2E-M | `frontend/e2e/us-01-config-mutations.spec.ts` |
| AC-01.9 | Unit + E2E-M | `frontend/src/app/domain/form/legal-age.spec.ts`; `frontend/e2e/us-01-form.spec.ts` (reloj fijado con `page.clock`) |
| AC-01.10 | Unit + E2E-M | `frontend/src/app/domain/form/vehicle-year-range.spec.ts`; `frontend/e2e/us-01-form.spec.ts` |
| AC-01.11 | E2E-M | `frontend/e2e/us-01-config-mutations.spec.ts` |
| AC-01.12 | E2E-S | `frontend/e2e/us-01-form.spec.ts` |
| AC-01.13 | E2E-S | `frontend/e2e/us-01-form.spec.ts` |
| AC-01.14 | Unit + E2E-S | `frontend/src/app/domain/form/cl-rut.spec.ts`; `frontend/e2e/us-01-form.spec.ts` |
| AC-01.15 | Unit + E2E-S | `frontend/src/app/domain/form/vehicle-plate.spec.ts`; `frontend/e2e/us-01-form.spec.ts` |
| AC-01.16 | E2E-S | `frontend/e2e/us-01-country-isolation.spec.ts` |
| AC-01.17 | E2E-M | `frontend/e2e/us-01-country-isolation.spec.ts` |
| AC-01.18 | E2E-S | `frontend/e2e/us-01-form.spec.ts` |
| AC-01.19 | E2E-M | `frontend/e2e/us-01-config-mutations.spec.ts` |
| AC-01.20 | E2E-M | `frontend/e2e/us-01-config-mutations.spec.ts` |
| AC-01.21 | E2E-M | `frontend/e2e/us-01-config-mutations.spec.ts` |
| AC-01.22 | E2E-M | `frontend/e2e/us-01-states.spec.ts` |
| AC-01.23 | E2E-M | `frontend/e2e/us-01-states.spec.ts` |
| AC-01.24 | E2E-S | `frontend/e2e/us-01-a11y.spec.ts` |
| AC-01.25 | Unit + E2E-M | `frontend/src/app/core/storage/quote-storage.spec.ts`; `frontend/e2e/us-01-states.spec.ts` |
| AC-01.26 | Unit | `frontend/src/app/domain/form/form-layout.spec.ts` |
| AC-01.27 | Unit + E2E-S | `frontend/src/app/domain/form/field-validators.spec.ts`; `frontend/e2e/us-01-form.spec.ts` |
| R-01.28 | Unit + E2E-S | `frontend/src/app/domain/form/semantic-roles.spec.ts`; `frontend/e2e/us-01-form.spec.ts` |
| R-01.29 | Unit + E2E-S | `frontend/src/app/domain/form/email-field.spec.ts`; `frontend/e2e/us-01-form.spec.ts` |
| R-01.30 | Unit + E2E-S | `frontend/src/app/domain/form/input-attributes.spec.ts`; `frontend/e2e/us-01-a11y.spec.ts` |
| R-01.31 | Unit + E2E-M | `frontend/src/app/domain/form/vehicle-plate.spec.ts`; `frontend/e2e/us-01-config-mutations.spec.ts` |
| AC-01.28 | E2E-S | `frontend/e2e/us-01-form.spec.ts` |
| AC-01.29 | Unit + E2E-S | `frontend/src/app/domain/form/email-field.spec.ts`; `frontend/e2e/us-01-form.spec.ts` |
| AC-01.30 | E2E-S | `frontend/e2e/us-01-a11y.spec.ts` |
| AC-01.31 | Unit + E2E-S | `frontend/src/app/domain/form/vehicle-plate.spec.ts`; `frontend/e2e/us-01-form.spec.ts` |
| AC-01.32 | E2E-M + Manual-HITL3 | `frontend/e2e/us-01-config-mutations.spec.ts`; checklist de HITL-3 (`docs/hitl/`) |

## 7. Fuera de alcance

- Placas de motos (salvo el formato `AAA12A` de Colombia, aceptado por decisión de negocio en HITL-1, GAP-01.21), diplomáticas o de vehículos de carga; cobertura de motos (el producto sigue siendo seguro de autos); validación de existencia real de placa, cédula o RUT contra registros oficiales.
- Validación de existencia, entregabilidad o verificación (OTP, enlace) del correo; correos con caracteres no ASCII; enmascarar el correo (ver `SPEC-US-03` GAP-03.18).
- Edición del copy de interfaz (chrome) desde Strapi (ver GAP-01.17).
- Más países que los sembrados `co` y `cl`; sí se soporta agregar uno desde Strapi sin deploy si cumple el modelo.
- Persistencia fuera de `sessionStorage`, cifrado del almacenamiento y sincronización entre pestañas.
- Autocompletado de ciudad/marca desde APIs externas; máscaras de entrada mientras se escribe.
- Cota máxima de edad plausible (p. ej. 120 años) y validación de nombres; no hay parámetro de negocio definido.
- Internacionalización a idiomas distintos de `es`.

## Changelog

### v3 → Aprobado (Orquestador, 2026-11-23)
- Cierre de HITL-1: el humano aprueba GAP-02.18/GAP-01.22 (opción A, rango [-10, +30]) y decide que el correo **no** sea rol requerido (lo controla Strapi). Estado → `Aprobado`. Sin cambios de contenido.

### v2 → v3 (HITL-1, 2026-11-23, `docs/hitl/HITL-1-specs.md`)
- **Estado:** `Aprobado con cambios (HITL-1, 2026-11-23) — v3 pendiente de verificación del Orquestador`. Las marcas "Sí/pendiente" de los GAP decididos en HITL-1 (GAP-01.2, GAP-01.6, GAP-01.17) pasan a "Resuelto en HITL-1" sin cambio de contenido ("Acepto").
- **Decisión "Mock + prueba manual" (riesgo 5 del Handoff v2):** AC-01.3 y R-01.21 pasan de E2E-S con token de escritura a **E2E-M (respuesta de Strapi simulada) + Manual-HITL3**; se elimina toda mención a token de escritura en CI/runner; la matriz documenta la regla y su justificación. Todos los demás E2E-S son de solo lectura.
- **Corrección humana 1 (correo):** GAP-01.20; R-01.28, R-01.29, R-01.30; AC-01.28, AC-01.29, AC-01.30. Campo `email` obligatorio en CO y CL configurado en Strapi, `type = text`, patrón y `maxLength` medibles; contrato sin cambios (el rol ya existía).
- **Corrección humana 2 (placa de moto CO):** GAP-01.21; R-01.31; AC-01.31, AC-01.32. **Modificados:** GAP-01.8 (patrón CO), R-01.19 y AC-01.15 (`ABC12D` pasa de inválido a válido; se agregan inválidos `ABC1D2`, `AB123C`, `ABC1234`, `ABC12`), §7 (fuera de alcance). Solo patrón configurable en Strapi; el producto sigue siendo seguro de autos.
- **Corrección humana 3 (ajuste por ciudad), parte de US-01:** GAP-01.22; el contrato `FormFieldOption` agrega `priceAdjustmentPct?` (lo consume `SPEC-US-02`). Sin cambios en el formulario.
- **IDs existentes:** ninguno renumerado ni eliminado.
- **Pendientes tras v3:** GAP-01.22/GAP-02.18 (ubicación y rango del factor por ciudad, confirmación humana).

### v1 → v2
- **Estado y formato:** se reescribe al formato de la skill `spec-gap-checklist` (IDs `GAP-`/`R-`/`AC-` trazables, matriz con un renglón por ID). Estado permanece `Borrador (pendiente HITL-1)`.
- **Vacíos nuevos (la v1 no los detectaba):** acoplamiento por `semanticRole` y `config-error` (GAP-01.2), parámetros por país en lugar de constantes 18/20/1 (GAP-01.3), parseo de fecha sin sesgo UTC y 29-feb (GAP-01.4), validación CC vs CE dependiente del tipo (GAP-01.6), normalización de RUT y placa (GAP-01.7, GAP-01.8), recarga con revalidación contra configuración vigente (GAP-01.10), persistencia por `documentId` y mutaciones de configuración con datos guardados (GAP-01.11), semántica de checkbox requerido y precedencia de validadores (GAP-01.12), desempate de `order` y orden por sección (GAP-01.13), query con `status`, `populate` de `validation` y paginación (GAP-01.14), copy de UI fuera de Strapi (GAP-01.17), contrato v1 inconsistente con el modelo (GAP-01.18).
- **Decisiones cambiadas respecto a v1:** el rango del año pasa de constantes a `country.vehicleMaxAgeYears/MaxFutureYears`; los validadores de edad y año se aplican por rol y no por `validatorKey`; la "clave huérfana ignorada" de v1 se refina a persistencia por `documentId` en lugar de `key`; la v1 derivaba "país inválido" a una pantalla con selector sin decir de dónde sale la lista (ahora Strapi).
- **Eliminado de v1:** el contrato `validationRules` (renombrado a `validation` según el modelo de contenido) y los patrones de placa con `[A-Za-z]` (ahora se normaliza a mayúsculas antes de validar).
- **Pendientes de HITL-1:** GAP-01.2 (roles requeridos), GAP-01.6 (patrones CC/CE), GAP-01.17 (copy de UI).
