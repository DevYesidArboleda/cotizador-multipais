---
name: strapi-5-docker-seed
description: Convenciones técnicas para Strapi 5+: modelado de colecciones multi-país, Document Service API, bootstrap seed idempotente para Colombia y Chile y endurecimiento de permisos del rol Public.
---

# Skill: Strapi 5, Seed Idempotente y Seguridad (CMS Engineer)

## 1. Esquemas en Strapi 5
Crear 3 Collection Types en `backend/src/api/` y 1 componente compartido `form.field-option` (`label`, `value`):
1. **`country`:** `code` (uid/string único: `co` | `cl`), `name`, `currencyCode` (`COP` | `CLP`), `locale` (`es-CO` | `es-CL`), `legalAge` (integer, default 18), `termsTitle`, `termsContent` (richtext/text).
2. **`form-field`:** `key` (string), `section` (enum: `policyholder`, `vehicle`), `label`, `type` (enum: `text`, `number`, `select`, `date`, `checkbox`), `required` (boolean), `order` (integer), `helpText`, `errorMessage`, `validationRules` (json), `options` (componente repetible `form.field-option`), `country` (relación `manyToOne` obligatoria a `country`).
3. **`insurance-plan`:** `slug` (string), `name`, `shortDescription`, `basePrice` (integer), `currency` (enum: `COP`, `CLP`), `coverages` (json string[]), `benefits` (json string[]), `order` (integer), `isRecommended` (boolean), `isActive` (boolean), `country` (relación `manyToOne` obligatoria a `country`).

## 2. Seed Idempotente (Strapi 5 Document Service API)
En `backend/src/index.ts` (`bootstrap({ strapi })`):
- Usar siempre `strapi.documents('api::country.country').findMany(...)` y `.create({ data, status: 'published' })`. **No usar `strapi.entityService` (deprecado de Strapi 4).**
- Antes de crear cada país, campo o plan, comprobar si ya existe por clave lógica (`code`, `country + key`, `country + slug`). Si existe, omitir para garantizar idempotencia en reinicios de Docker.
- Incluir para **CO y CL**:
  - Campos completos del Paso 1 con orden explícito y opciones reales ficticias para `select`.
  - 3 planes activos (uno con `isRecommended: true`) + 1 plan con `isActive: false` para comprobar que el filtro lo excluye.
  - Textos de Términos y Condiciones diferenciados por país (referencia normativa ficticia de CO vs CL).

## 3. Permisos Mínimos del Rol Public
En el mismo `bootstrap`, consultar el rol `type: 'public'` del plugin `users-permissions` y asegurar que **solo** existan permisos `find` para:
- `api::country.country.find`
- `api::form-field.form-field.find`
- `api::insurance-plan.insurance-plan.find`

Cero permisos de `create`, `update`, `delete` o endpoints internos.
