---
name: angular-21-dynamic-forms
description: Estándar Angular 21+ del proyecto - formulario dinámico desde Strapi con semanticRole, validadores puros parametrizados por país, estado con signals y sessionStorage por país, guards, accesibilidad por teclado y tests con IDs de regla.
---

# Skill: Angular 21+ y Formularios Dinámicos (Frontend Engineer)

## 1. Angular moderno
- `bootstrapApplication` + `provideRouter(withComponentInputBinding())` + `provideHttpClient(withFetch(), withInterceptors([...]))`. Prohibido `NgModule`.
- `@if` / `@for (...; track x.documentId)` / `@switch`. Prohibido `*ngIf` / `*ngFor`.
- `signal`, `computed`, `effect` (solo para persistencia), `input()`, `output()`, `inject()`, `OnPush` en todo componente.
- Reactive Forms tipados; `FormGroup<Record<string, FormControl<unknown>>>` construido dinámicamente.

## 2. Estructura sugerida
```
src/app/
  core/ (api/strapi-api.service.ts, api/mappers.ts, country/country.store.ts, quote/quote.store.ts, guards/)
  domain/ (validators/, pricing/, masking/, payment/, semantic-roles.ts)  ← funciones puras + tests
  features/ (step-1-form/, step-2-plans/, step-3-summary/, confirmation/, country-not-found/)
  shared/ (stepper/, dynamic-field/, money.pipe.ts, async-state/)
```

## 3. Motor de formulario dinámico
- Campos ordenados por `order ASC` desde Strapi; agrupados por `section`.
- Mapeo de validadores (funciones puras, parametrizadas por `CountryConfig`):
  - `required` → `Validators.required` (`requiredTrue` si `checkbox`).
  - `validation.min/max/minLength/maxLength/pattern` → nativos.
  - `legal_age` → usa `country.legalAge`; compara fecha calendario local (sin UTC).
  - `vehicle_year_range` → `[año - vehicleMaxAgeYears, año + vehicleMaxFutureYears]` inclusivo.
  - `cl_rut` → formato + DV Módulo 11 (acepta con/sin puntos, `K` mayúscula/minúscula).
  - `depends_on_option_pattern` → aplica `validationPattern` de la opción elegida en el campo con rol `dependsOnRole` (validador a nivel de grupo, se re-evalúa al cambiar la dependencia).
- `getFieldByRole(fields, role)` es la única forma de localizar campos para precio, máscara o resumen. Rol requerido ausente → estado `config-error`.
- Hidratación desde `sessionStorage`: solo claves presentes en el schema actual; valores con tipo incompatible se descartan.

## 4. Estado, rutas y persistencia
- `QuoteStore` (signals) por país: `formValue`, `selectedPlanSlug`, `paymentStatus`, `quoteNumber`; persistido en `auto_quote_v1_<country>` vía `effect`.
- Rutas de `CLAUDE.md` §4. Guards funcionales: `countryGuard`, `step2Guard` (Paso 1 válido), `step3Guard` (+ plan seleccionado y vigente).
- HTTP solo `/api/...` mediante `StrapiApiService` + mappers a modelos de dominio (`docs/contracts/strapi-contracts.ts`).

## 5. Accesibilidad
- `<label [for]>`, `aria-describedby` (ayuda + error), `aria-invalid`, `aria-required`.
- Al enviar con errores: `markAllAsTouched` + foco al primer control inválido. Al cambiar de paso: foco al `<h1 tabindex="-1">`.
- Planes como `<input type="radio">` nativos dentro de `<fieldset>` con `<legend>`.

## 6. Tests
- Unit (títulos con IDs): validadores, builder, `getFieldByRole`, pricing (tramos y límites), moneda, máscara, número de cotización, guardia de doble pago, hidratación con campos eliminados, guards.
- E2E Playwright (`frontend/e2e/`): flujo completo CO (o CL) con pago rechazado → reintento aprobado; campos distintos CO vs CL; volver conserva datos.
