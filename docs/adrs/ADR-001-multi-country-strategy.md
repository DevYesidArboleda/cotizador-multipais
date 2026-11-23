# ADR-001: Estrategia multi-país (CO/CL) con un solo build, modelo de contenido Strapi 5 y acoplamiento semántico

- **Estado:** Aceptado (HITL-2, 2026-11-23 — `docs/hitl/HITL-2-arquitectura.md`)
- **Fecha:** 2026-11-23 (revisión v2 de `@architect`, Fase 3; reemplaza el borrador del Orquestador)
- **Decisores:** `@architect` (propuesta) → humano (HITL-2). Decisiones heredadas de HITL-1 marcadas como **[HITL-1]** (no se reabren aquí).
- **Trazabilidad:**
  - Historias/specs: `US-01..03`, `SPEC-US-01` v3, `SPEC-US-02` v3, `SPEC-US-03` v3, `docs/hitl/HITL-1-specs.md`.
  - Reglas: R-01.1, R-01.2, R-01.9, R-01.11, R-01.12, R-01.15, R-01.16, R-01.21, R-01.23, R-01.28, R-01.31, R-02.2, R-02.3, R-02.5, R-02.19, R-02.21, R-02.22, R-02.24, R-03.7, R-03.25.
  - Vacíos: GAP-01.1, GAP-01.2, GAP-01.3, GAP-01.11, GAP-01.14, GAP-01.18, GAP-01.20, GAP-01.21, GAP-01.22, GAP-02.1, GAP-02.2, GAP-02.9, GAP-02.18, GAP-02.19, GAP-03.3.
  - Contrato: `docs/contracts/strapi-contracts.ts` (fuente única para `@cms-engineer` y `@frontend-engineer`).
  - Conflictos del log `docs/logs/03-spec-analyst-specs-v3.md` §(b) resueltos aquí: punto 3 (skill desactualizada), 4 (ADR desactualizado), 6 (enum COP/CLP), 7 (validación de moneda al editar el país).

## 1. Contexto y problema
Una sola aplicación Angular (un build) y una sola instancia Strapi 5 sirven Colombia (`co`) y Chile (`cl`). Negocio (no técnico) configura campos, opciones, validaciones, planes, coberturas, beneficios y términos sin despliegues (CLAUDE.md regla 2).

Los países difieren en **estructura**, no solo en textos:
- **CO:** tipo de documento (CC/CE) con patrón del número dependiente del tipo (R-01.16). Placa `AAA123` o `AAA12A` (moto, decisión de negocio [HITL-1], R-01.31). Moneda `COP`.
- **CL:** RUT con dígito verificador Módulo 11 (R-01.18). Patente `BBBB12`/`BB1234`. Sin tipo de documento. Moneda `CLP`.
- **Ambos:** correo obligatorio por configuración (R-01.28), ajuste de precio por ciudad (R-02.21) y edad legal y rango de años parametrizados (R-01.15).

Además, la lógica (edad, año, precio, máscara, resumen) necesita localizar campos que negocio puede **renombrar** (`key`), reordenar o despublicar sin que la app falle en silencio (regla 3, R-01.11, R-01.12).

## 2. Drivers de decisión (priorizados)
1. **D1. Un build y una instancia** (requisito explícito del producto).
2. **D2. Cero deploy por cambios de negocio** en campos, opciones, planes, términos, edad legal, rango de años y factor por ciudad (regla 2; AC-01.3, AC-02.19, AC-02.26).
3. **D3. Diferencias estructurales por país**, no traducción 1:1 (AC-01.1).
4. **D4. Robustez ante mutaciones de configuración:** identificadores estables por elemento (R-01.9, R-02.12) y `config-error` explícito, nunca `NaN` ni fallos silenciosos (R-01.11, R-02.8).
5. **D5. Superficie pública mínima:** solo `find` sobre tres tipos (regla 4). Ningún modelo nuevo que exija ampliar permisos.
6. **D6. Editable por personas no técnicas:** formularios del admin, no JSON crudo (skill `strapi-5-docker-seed`).
7. **D7. Agregar un país** creando registros en Strapi sin tocar Angular (GAP-01.1, R-01.1).

## 3. Alternativas consideradas

### A1. Plugin `i18n` de Strapi con locales `es-CO` y `es-CL`
- **Pros:** nativo en Strapi 5. Filtro por `?locale=` sin relaciones. El editor ve las variantes de un mismo documento lado a lado.
- **Contras:**
  - `i18n` modela **la misma entidad traducida**. Campos que solo existen en un país (tipo de documento CO) quedan como documentos con una localización vacía o "huérfana". Negocio debe entender que un locale es un país.
  - Moneda, edad legal y T&C no son traducciones sino **parámetros** del país, así que haría falta igualmente un tipo `country`.
  - Mezcla idioma con jurisdicción. Un futuro `en-CL` sería ambiguo.
- **Consecuencia operativa:** riesgo de error editorial alto (D6) y modelo conceptual incorrecto (D3).

### A2. Tipo `country` + colecciones `form-field` e `insurance-plan` relacionadas (manyToOne obligatoria) y componentes para la estructura interna (**elegida**)
- **Pros:**
  - Cada campo y cada plan es un **documento** con `documentId` estable, Draft & Publish propio y orden propio. Esto cumple D4: persistencia por `documentId` (GAP-01.11) y detección de un plan despublicado (R-02.12).
  - Agregar un país = crear un `country` y sus registros (D7).
  - Queries REST explícitas y auditables (`filters[country][code][$eq]=co`).
  - Exactamente tres tipos públicos (D5).
- **Contras:**
  - El editor debe asignar el país a cada campo y plan.
  - Hay invariantes entre documentos que Strapi no expresa en el esquema: un rol por país, un solo recomendado, moneda del plan igual a la del país. Exigen código del lado de Strapi (§5.4).
  - Son tres peticiones por paso en lugar de una.

### A3. Un documento agregado por país (`country` con componentes repetibles `fields[]` y `plans[]` o *dynamic zone*)
- **Pros:**
  - Una sola petición por país.
  - Publicación atómica de toda la configuración, sin estados intermedios.
  - Sin filtros por relación.
- **Contras:**
  - Los componentes **no tienen `documentId`** ni Draft & Publish propio. Al editar, el `id` de un componente no es un identificador de negocio estable, por lo que la persistencia por elemento (R-01.8, R-01.9, R-02.11, R-02.12) quedaría atada a `key` o `slug`, que negocio puede renombrar (viola R-01.12).
  - No se puede despublicar un solo campo o plan (AC-01.19, AC-02.9). Habría que inventar un booleano `isPublished`.
  - El formulario del admin sería muy largo, con riesgo de edición concurrente (dos editores sobrescriben el documento completo).
  - El `populate` sería profundo y anidado.
- **Consecuencia operativa:** más simple en red, pero rompe D4 y la granularidad editorial que asumen las specs.

### A4. Un `country` con la configuración del formulario y de los planes como campo JSON (esquema tipo JSON Schema)
- **Pros:**
  - Máxima flexibilidad: cualquier estructura sin cambios de esquema Strapi.
  - Una sola petición.
- **Contras:**
  - Negocio edita JSON a mano (viola D6; lo prohíbe la skill `strapi-5-docker-seed`).
  - No hay validación nativa de tipos ni de rangos (`priceAdjustmentPct ∈ [-10, 30]`, `basePrice ≥ 0`).
  - Un error de sintaxis tumba el país completo.
  - Tampoco existen `documentId` por elemento.

### A5. Dos builds de Angular o dos instancias de Strapi
- **Descartada por requisito explícito (D1):** "la misma aplicación y el mismo build sirven Colombia y Chile". Además duplica la operación y los costos.

## 4. Decisión
Se adopta **A2**: `country` relacional + componentes + `semanticRole` + parámetros de reglas en `country`. El diseño concreto queda congelado en `docs/contracts/strapi-contracts.ts` y en la skill `.claude/skills/strapi-5-docker-seed/SKILL.md` §1 y §5. Sub-decisiones:

### 4.1 Resolución del país en runtime (D1, D7; R-01.1, GAP-01.1)
- El país sale **solo de la ruta** `/:country/quote/...`. `normalizeCountryCode` convierte mayúsculas a minúsculas y valida `^[a-z]{2}$`.
- Un `CountryStore` (signal) se alimenta de `GET /api/countries?filters[code][$eq]=<code>`.
- `data.length === 0` → `/country-not-found`. Error de red → estado `error` recuperable.
- Ninguna lista de países en el código. El selector de `/country-not-found` usa `GET /api/countries?fields[0]=code&fields[1]=name&sort=name:asc&pagination[pageSize]=100`.

### 4.2 Acoplamiento semántico por `semanticRole` (regla 3; R-01.11, R-01.12, GAP-01.2)
- `form-field.semanticRole` es un **enum de Strapi** (`none`, `full_name`, `document_type`, `document_number`, `birth_date`, `email`, `phone`, `city`, `vehicle_plate`, `vehicle_brand`, `vehicle_model`, `vehicle_year`, `vehicle_use`). Negocio lo elige de una lista y no puede escribir un valor arbitrario.
- **Roles requeridos por el motor:** `birth_date`/`date`, `vehicle_year`/`number`, `document_number`/`text`. Si falta uno, está duplicado o tiene otro tipo → `config-error` que nombra el rol.
- **Roles opcionales con tipo exigido si existen:** `email`/`text` (R-01.28), `city`/`select` (R-02.22).
- **El correo no es rol requerido [HITL-1, cierre]:** su obligatoriedad es `required = true` en el seed.
- La compatibilidad `validatorKey` ↔ rol está tabulada en el contrato (`VALIDATOR_REQUIRED_ROLE`).
- `key` solo se usa para atributos `id`/`name` del DOM. Persistencia, lógica y tests usan `documentId` y `semanticRole`. El contrato lo marca con JSDoc `@deprecated`, de modo que el linter avisa si se usa en lógica.

### 4.3 Componentes en lugar de JSON (D6; GAP-01.18, GAP-02.2)
- `form.validation` (único), `form.field-option` (repetible), `plan.coverage` (repetible) y `plan.benefit` (repetible).
- `form.field-option` incluye `validationPattern`/`validationMessage` (patrón dependiente CC/CE, R-01.16) y `priceAdjustmentPct` (ver 4.6).

### 4.4 Parámetros de reglas en `country` (regla 2; R-01.15, GAP-01.3)
- `legalAge`, `vehicleMaxAgeYears` y `vehicleMaxFutureYears` son atributos `integer` con `min: 0` y valores por defecto 18/20/1 **en el esquema de Strapi**, no en Angular.
- Angular revalida: no entero o negativo → `config-error` (R-01.15).
- T&C (`termsTitle`, `termsContent` como texto plano y `termsVersion`) también viven en `country` (R-03.7).
- `locale` y `currencyCode` alimentan `Intl.NumberFormat`/`DateTimeFormat` (R-02.5, R-03.3). No hay `if` por país.

### 4.5 Moneda del plan: `insurance-plan.currency` validada contra el país [HITL-1, GAP-02.1 Opción B]
El humano rechazó la recomendación A. Alternativas registradas para la trazabilidad:
- **(a) Derivar de `country.currencyCode`.** Sin redundancia, pero no cumple la historia a la letra. Rechazada en HITL-1.
- **(b) `currency` enum `COP | CLP` obligatorio en el plan + validación servidor + aserción del front.** Elegida en HITL-1.
- **(c) `currency` string libre `^[A-Z]{3}$` + validación.** Admite monedas nuevas sin cambio de esquema, pero negocio podría escribir códigos ISO inexistentes. HITL-1 fijó enum.

Diseño:
1. **Servidor:** al crear, actualizar o publicar un plan, se exige `plan.currency === country.currencyCode` y, si no, se lanza un error legible en el admin.
2. **Servidor (conflicto 7 del log):** al actualizar `country.currencyCode`, se **rechaza** el cambio si existen planes (borrador o publicados) de ese país con otra moneda. El mensaje indica que primero se migren los planes. Sin esto, la regla de 1 se viola editando el otro lado de la relación.
3. **Front (red de seguridad):** `assertPlanCurrency(plans, country)` produce un `config-error` que nombra el plan y ambas monedas (R-02.19, AC-02.21, R-03.25). Incluye `currency` ausente, nula o fuera del enum (p. ej. `USD` en un mock). **El formateo usa siempre `country.currencyCode`**: `plan.currency` nunca llega a `Intl`.

### 4.6 Ajuste por ciudad: `form.field-option.priceAdjustmentPct` [HITL-1, GAP-01.22/GAP-02.18 opción A, rango [-10, +30]]
- Atributo `integer`, opcional, con `min: -10` y `max: 30` (validación nativa de Strapi). Descripción en el admin: "Ajuste simulado de precio en % para esta ciudad; vacío = sin ajuste".
- Solo se lee en la **opción elegida** del único campo con rol `city` (`resolveCityAdjustment`).
- Casos:
  - Ausente o nulo → `0`.
  - Inválido → `config-error` que nombra el campo y la opción.
  - En opciones de otros roles → ignorado con `console.warn` (R-02.21 a R-02.23).
- Viaja en la query existente de `form-field` (`populate[options]=true`), así que no requiere un cuarto tipo público (D5).
- El rango vive una sola vez en el contrato (`CITY_ADJUSTMENT_PCT`). `pricing-rules.ts` lo reexporta (R-02.7) y el esquema Strapi usa los mismos números.

### 4.7 Invariantes entre documentos: Document Service middlewares (no lifecycles de BD)
Las specs dicen "lifecycle `beforeCreate/beforeUpdate`". En Strapi 5, los *lifecycle hooks* de base de datos **se disparan de forma distinta con los métodos del Document Service**: publicar crea o actualiza filas de la versión publicada, de modo que un hook puede ejecutarse varias veces o con datos parciales. Strapi recomienda extender el comportamiento con **Document Service middlewares** ([breaking change](https://docs.strapi.io/cms/migration/v4-to-v5/breaking-changes/lifecycle-hooks-document-service), [middlewares](https://docs.strapi.io/cms/api/document-service/middlewares.md), [blog de Strapi](https://strapi.io/blog/what-are-document-service-middleware-and-what-happened-to-lifecycle-hooks-1)).

Alternativas evaluadas:

| Opción | Pros | Contras |
| :--- | :--- | :--- |
| **Document Service middleware** (`strapi.documents.use` en `register`) **(elegida)** | Ve la acción real (`create`/`update`/`publish`) y el `uid`. Lo recomienda Strapi 5. Cubre el admin, el seed y cualquier llamada interna. | Corre en todas las acciones de todos los tipos, por lo que hay que filtrar por `uid` y acción. Errores mal lanzados devuelven 500 en lugar de un mensaje legible. |
| Lifecycle hooks de BD (`lifecycles.ts`) | Patrón conocido de v4. Es lo que dicen las specs. | Disparos múltiples o parciales con Draft & Publish. Difícil saber si un evento es borrador o publicación. |
| Controlador o ruta personalizada | Control total. | El admin usa el Content Manager y **no** pasa por controladores de la API de contenido: no protege la edición de negocio. |

Se cumple la intención de las specs ("validar al guardar con error legible en el admin") con el mecanismo recomendado en Strapi 5. No es un cambio de comportamiento, solo de mecanismo.

Invariantes (detalle para `@cms-engineer` en la skill §1):
- **I1.** Cada `semanticRole ≠ none` aparece a lo sumo una vez por país, excluyendo el propio `documentId`.
- **I2.** A lo sumo un plan `isRecommended && isActive` por país.
- **I3.** `plan.currency === country.currencyCode`.
- **I4.** No se cambia `country.currencyCode` si hay planes con otra moneda.
- **I5.** `validatorKey` es compatible con el rol.

Los errores se lanzan con `errors.ValidationError` de `@strapi/utils` para que el admin muestre el mensaje.

### 4.8 Consultas REST y tipos crudos (GAP-01.14, GAP-02.9; R-01.23, R-02.2)
- Strapi 5 responde con formato **plano**: `{ data, meta: { pagination } }`, sin `attributes`, y cada documento con `id` y `documentId` ([nuevo formato de respuesta](https://docs.strapi.io/cms/migration/v4-to-v5/breaking-changes/new-response-format)).
- **Relaciones y componentes no se pueblan por defecto:** se exige `populate` explícito por componente. Se prohíbe `populate=*` porque arrastraría la relación `country` innecesariamente ([populate y selección de campos](https://docs.strapi.io/cms/api/rest/populate-select), [guía de populate](https://docs.strapi.io/cms/api/rest/guides/understanding-populate)).
- **Paginación por defecto de 25 elementos y máximo configurable `api.rest.maxLimit`** (100 por defecto). Se pide `pagination[pageSize]=100` y `meta.pagination.total > 100` → `config-error` (nunca se trunca en silencio) ([ordenamiento y paginación](https://docs.strapi.io/cms/api/rest/sort-pagination), [configuración de la API](https://docs.strapi.io/cms/configurations/api)).
- `status=published` explícito en tipos con Draft & Publish. El parámetro `status` reemplaza a `publicationState` de v4 ([REST status](https://docs.strapi.io/cms/api/rest/status), [migración](https://docs.strapi.io/cms/migration/v4-to-v5/breaking-changes/publication-state-removed.md)). El servidor además **fuerza** `published` (ADR-002 §4.2).
- Queries exactas: constantes `STRAPI_QUERIES` del contrato y skill §5.

### 4.9 Front: tipos crudos separados del dominio
- DTOs (`Strapi*Dto`) tolerantes en los atributos cuyo valor inválido debe producir un `config-error` **con nombre**: `currency`, `basePrice`, `priceAdjustmentPct` y parámetros del país.
- Mappers y *type guards* (`unknown` → DTO → dominio) devuelven `Result` con un `ConfigIssue` tipado. El texto sale del catálogo `ui-copy.es.ts` (R-01.27).
- Estado del cotizador en `sessionStorage['auto_quote_v1_<country>']` (`QuoteState`, `schemaVersion: 1`), indexado por `documentId` (R-01.8, R-01.20).

## 5. Consecuencias

### 5.1 Positivas
- Negocio agrega, reordena o despublica campos, opciones, planes, ciudades y factores, y cambia edad legal, rango de años o T&C sin deploy (D2).
- Renombrar `key` o `slug` no rompe la lógica ni pierde datos del usuario (R-01.12, AC-01.8).
- Las reglas de integridad se validan dos veces: el servidor evita el error editorial y el front lo detecta si aun así llega (p. ej. un import directo a la BD).
- El contrato TS único elimina la divergencia spec ↔ skill ↔ código (GAP-01.18).

### 5.2 Negativas, mitigación y verificación

| # | Consecuencia negativa | Mitigación | Cómo se verifica |
| :--- | :--- | :--- | :--- |
| N1 | Tres peticiones por paso (país, campos, planes). | Se lanzan en paralelo y forman un estado `error` único. Cuerpos pequeños (KB). | Unit `strapi-queries.spec.ts` (R-01.23, R-02.2); E2E-M `us-02-states.spec.ts`. |
| N2 | Invariantes entre documentos requieren código en Strapi (middlewares). | I1 a I5 en un solo módulo `backend/src/extensions/document-invariants.ts` (nombre orientativo). El front tiene la misma regla como red. | Prueba manual HITL-3: crear un plan CLP en CO → error legible. Unit del front: `plan-currency.spec.ts`, `semantic-roles.spec.ts`. |
| N3 | **Enum `currency` COP/CLP (conflicto 6):** un país con otra moneda exige ampliar el enum, es decir, cambiar el esquema y **desplegar el backend**. Contradice parcialmente D7. Con `NODE_ENV=production` el Content-Type Builder está desactivado, así que solo se cambia por código. | Aceptado en [HITL-1]. Documentado en `SPEC-US-02` §7. I3 da un mensaje explícito ("La moneda X del país no existe en el enum de planes: requiere cambio de esquema"). La ampliación es un PR de una línea en `schema.json` + `CurrencyCode` del contrato + seed. Si se vuelve frecuente, un ADR nuevo puede migrar a la opción (c). | Checklist HITL-3: crear un país `pe` con `PEN` y comprobar el error del plan. |
| N4 | Editar `country.currencyCode` con planes existentes queda bloqueado (I4). | Mensaje que indica el orden correcto: primero los planes, luego el país. Es intencional: evita una ventana de precios incoherentes. | Checklist HITL-3. Front: AC-02.21 (E2E-M). |
| N5 | `priceAdjustmentPct` existe en **todas** las opciones (también marca o tipo de documento). | Descripción del atributo en el admin. El front solo lo lee del rol `city` y emite `console.warn` en otros (R-02.21). Opcionalmente, I5 extendido lo rechaza fuera de `city` (decisión de `@cms-engineer`, no bloqueante). | Unit `city-adjustment.spec.ts` (R-02.21 a R-02.23). |
| N6 | `semanticRole` enum: un rol nuevo exige cambio de esquema + contrato + front. | Es deseable: un rol nuevo implica lógica nueva (que sí requiere deploy). Los campos sin lógica usan `none`. | Revisión en `@qa-reviewer` (R-01.12). |
| N7 | El factor por ciudad y los parámetros de reglas son públicos vía API. | Es una regla **simulada y documentada** (SPEC-US-02 GAP-02.18). No es información sensible. | N/A (aceptado). |
| N8 | Un borrador de `form-field` podría filtrarse por `?status=draft` (ver ADR-002). | Middleware de servidor que fuerza `published` (ADR-002 §4.2). | Smoke de seguridad de ADR-002. |

## 6. Cómo se verifica esta decisión (resumen)
- **Contrato:** `docs/contracts/strapi-contracts.ts` compila con `strict` y sin `any`. `@frontend-engineer` lo copia a `frontend/src/app/core/contracts/`. Si se agrega a CI, `tsc --noEmit --strict docs/contracts/strapi-contracts.ts` lo verifica (lo propone ADR-003).
- **Esquema ↔ contrato:** `@qa-reviewer` compara los enums (`SEMANTIC_ROLES`, `VALIDATOR_KEYS`, `FIELD_TYPES`, `FORM_SECTIONS`, `CURRENCY_CODES`) con los `schema.json` de Strapi (revisión estática en REVIEW-US-01/02).
- **Comportamiento:** tests listados en las matrices de las specs (R-01.11, R-01.12, R-01.15, R-02.19, R-02.21 a R-02.24, R-03.25). Cambios sin deploy: E2E-M + Manual-HITL3 (AC-01.3, AC-01.32, AC-02.19, AC-02.26).

## 7. Fuentes (consultadas 2026-11-23)
- Strapi 5, formato de respuesta plano con `documentId`: https://docs.strapi.io/cms/migration/v4-to-v5/breaking-changes/new-response-format
- Strapi 5, populate (sin poblar por defecto) y selección de campos: https://docs.strapi.io/cms/api/rest/populate-select · https://docs.strapi.io/cms/api/rest/guides/understanding-populate
- Strapi 5, ordenamiento y paginación (`pageSize` por defecto, `maxLimit`): https://docs.strapi.io/cms/api/rest/sort-pagination · https://docs.strapi.io/cms/configurations/api
- Strapi 5, parámetro `status` y retiro de `publicationState`: https://docs.strapi.io/cms/api/rest/status · https://docs.strapi.io/cms/migration/v4-to-v5/breaking-changes/publication-state-removed.md
- Strapi 5, lifecycle hooks con el Document Service y middlewares: https://docs.strapi.io/cms/migration/v4-to-v5/breaking-changes/lifecycle-hooks-document-service · https://docs.strapi.io/cms/api/document-service/middlewares.md · https://strapi.io/blog/what-are-document-service-middleware-and-what-happened-to-lifecycle-hooks-1
- Draft & Publish: https://docs.strapi.io/cms/features/draft-and-publish
