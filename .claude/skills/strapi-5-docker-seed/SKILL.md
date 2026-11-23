---
name: strapi-5-docker-seed
description: Convenciones Strapi 5+ del proyecto - modelado multi-país amigable para negocio (componentes en vez de JSON crudo), semanticRole, Document Service API, seed idempotente no destructivo CO/CL, permisos mínimos del rol Public y BD SQLite/Postgres por entorno.
---

# Skill: Strapi 5, Seed Idempotente y Seguridad (CMS Engineer)

## 1. Modelo de contenido (todo con Draft & Publish salvo `country`)
**Componentes** (`src/components/`), para que negocio edite con formularios y no con JSON:
- `form.field-option`: `label` (string, req), `value` (string, req), `validationPattern` (string, opcional — regex que aplica al campo dependiente, p. ej. número según tipo de documento), `validationMessage` (string, opcional).
- `form.validation`: `min`, `max` (integer), `minLength`, `maxLength` (integer), `pattern` (string), `validatorKey` (enum: `none`, `legal_age`, `vehicle_year_range`, `cl_rut`, `depends_on_option_pattern`), `dependsOnRole` (enum de `semanticRole`, opcional).
- `plan.coverage`: `name` (string, req), `description` (text), `limit` (string, p. ej. "Hasta 100 SMMLV").
- `plan.benefit`: `text` (string, req).

**Collection types** (`src/api/`):
1. `country`: `code` (string único, regex `^[a-z]{2}$`), `name`, `currencyCode` (string `^[A-Z]{3}$`), `locale`, `legalAge` (int, def 18), `vehicleMaxAgeYears` (int, def 20), `vehicleMaxFutureYears` (int, def 1), `termsTitle`, `termsContent` (text largo; párrafos separados por línea en blanco), `termsVersion` (string).
2. `form-field`: `key` (string, regex `^[a-zA-Z][a-zA-Z0-9_]*$`), `semanticRole` (enum: `none`, `full_name`, `document_type`, `document_number`, `birth_date`, `email`, `phone`, `city`, `vehicle_plate`, `vehicle_brand`, `vehicle_model`, `vehicle_year`, `vehicle_use`; def `none`), `section` (enum `policyholder`, `vehicle`), `label`, `type` (enum `text`, `number`, `select`, `date`, `checkbox`), `required`, `order`, `placeholder`, `helpText`, `errorMessage` (req), `validation` (componente único), `options` (componente repetible), `country` (manyToOne, req).
3. `insurance-plan`: `slug`, `name`, `shortDescription`, `basePrice` (integer ≥ 0, en la moneda del país), `coverages` (repetible `plan.coverage`), `benefits` (repetible `plan.benefit`), `order`, `isRecommended`, `isActive`, `country` (manyToOne, req). **Sin campo `currency`**: se deriva de `country.currencyCode`.

Lifecycles mínimos: un solo `semanticRole` distinto de `none` por país; a lo sumo un plan `isRecommended` activo por país (validar en `beforeCreate/beforeUpdate` con error legible en el admin).

## 2. Seed idempotente y no destructivo (`src/index.ts` → `bootstrap`)
- Solo Document Service API: `strapi.documents('api::country.country').findFirst({ filters: { code } })` y `.create({ data, status: 'published' })`. Prohibido `entityService`.
- Clave lógica: `code` | `country.code + key` | `country.code + slug`. Si existe → **no tocar** (respeta ediciones de negocio). Controlado por `SEED_ON_BOOT=true|false`.
- Datos para CO y CL: todos los campos del Paso 1 con `semanticRole`, 3 planes activos (1 recomendado) + 1 inactivo, T&C ficticios distintos por país.

## 3. Permisos del rol Public (en `bootstrap`, idempotente)
Solo `api::country.country.find`, `api::form-field.form-field.find`, `api::insurance-plan.insurance-plan.find`. Revocar cualquier otro permiso de `api::*` en el rol Public. Ni `findOne` ni escritura.

## 4. Base de datos por entorno (`config/database.ts`)
- `DATABASE_CLIENT=sqlite` (default, `DATABASE_FILENAME`) para local/Docker.
- `DATABASE_CLIENT=postgres` + `DATABASE_URL` + `DATABASE_SSL=true` para nube (Neon). Dependencia `pg` incluida.

## 5. Consultas que consume Angular (rutas relativas vía proxy)
- `GET /api/countries?filters[code][$eq]=co`
- `GET /api/form-fields?filters[country][code][$eq]=co&populate=*&sort=order:asc&pagination[pageSize]=100`
- `GET /api/insurance-plans?filters[country][code][$eq]=co&filters[isActive][$eq]=true&populate=*&sort=order:asc`
