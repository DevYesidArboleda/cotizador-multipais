# ADR-001: Estrategia de Diferenciación de Contenido Multi-País (Colombia y Chile)

- **Estado:** Propuesto (Pendiente HITL-2)
- **Fecha:** 2026-11-23
- **Trazabilidad:** `US-01`, `US-02`, `US-03`, `SPEC-US-01`, `SPEC-US-02`, `SPEC-US-03`

## Contexto y Problema
La insurtech lanzará un cotizador digital de seguros de autos para **Colombia (`co`)** y **Chile (`cl`)** usando una sola aplicación front-end y un solo build. El equipo de negocio (no técnico) debe poder agregar, eliminar y reordenar campos del formulario, administrar planes, coberturas y textos legales desde Strapi 5 sin solicitar despliegues.

Cada país difiere no solo en idioma/copy, sino en **estructura de datos y regulación**:
- Colombia requiere tipo de documento (CC/CE), número de documento y placa (formato `AAA123`), con precios en `COP`.
- Chile requiere RUT con dígito verificador y patente (formato `AAAA12` / `AA1234`), con precios en `CLP`.

## Drivers de Decisión
1. Un solo build de Angular 21+ y una sola instancia de Strapi 5+.
2. Cero despliegues cuando negocio modifica campos, planes o términos.
3. Soporte nativo para diferencias estructurales de campos entre países (no solo traducción 1:1).
4. Escalabilidad directa para futuros países (ej. Perú o México) sin cambiar código front-end.

## Alternativas Consideradas

### Alternativa 1: Plugin nativo `i18n` de Strapi (`es-CO` y `es-CL`)
- **Pros:** Filtrado simple (`?locale=es-CO`) y soporte integrado en Strapi 5.
- **Contras:** `i18n` está diseñado para traducir la misma entidad en varios idiomas. Cuando Colombia tiene un campo que Chile no tiene ("Tipo de documento"), los editores de negocio deben manejar colecciones asimétricas dentro de la interfaz de localización, aumentando el riesgo de errores operativos.

### Alternativa 2: Entidad `Country` + Contenido Relacional Filtrado por País (Elegida)
- **Pros:** Cada país gestiona libremente sus `FormField` e `InsurancePlan` con orden, validaciones y textos propios. Permite agregar un país nuevo creando sus registros en Strapi sin tocar Angular. Consultas REST explícitas y auditables (`filters[country][code][$eq]=co`).
- **Contras:** Exige que el editor seleccione el país al crear cada campo/plan y que el front-end resuelva el código de país en el enrutador.

### Alternativa 3: Dos builds de Angular o dos instancias de Strapi
- **Pros:** Aislamiento total por país.
- **Contras:** Descartada por violar explícitamente el alcance ("The same application and the same build serve Colombia and Chile") y duplicar costos de operación.

## Decisión
Adoptar la **Alternativa 2**:
- **En Strapi 5:**
  - `Country`: `code` (`co` | `cl`), `name`, `currencyCode` (`COP` | `CLP`), `locale` (`es-CO` | `es-CL`), `legalAge` (`18`), `termsTitle`, `termsContent`.
  - `FormField`: `key`, `section`, `label`, `type`, `required`, `order`, `helpText`, `errorMessage`, `validationRules`, `options`, relación obligatoria `country`.
  - `InsurancePlan`: `slug`, `name`, `shortDescription`, `basePrice`, `currency`, `coverages`, `benefits`, `order`, `isRecommended`, `isActive`, relación obligatoria `country`.
- **En Angular 21+:**
  - Enrutamiento por prefijo de país: `/co/quote` y `/cl/quote` (con redirección por defecto y selector de país en la barra superior).
  - Estado reactivo con `Signals` en `QuoteStore` y persistencia en `sessionStorage` particionada por país (`auto_quote_v1_co` / `auto_quote_v1_cl`).

## Consecuencias
- **Positivas:** Autonomía total para negocio; cero duplicación de código; alta claridad en pruebas unitarias y E2E.
- **Negativas y Mitigaciones:** Un editor podría olvidar asignar país a un campo → mitigado haciendo obligatoria (`required: true`) la relación `country` en los esquemas de Strapi.
