---
name: angular-21-dynamic-forms
description: Estándar de implementación en Angular 21+ para formularios dinámicos desde Strapi, estado reactivo con Signals, enrutamiento multi-país, accesibilidad por teclado y pruebas unitarias/E2E.
---

# Skill: Angular 21+ y Formularios Dinámicos (Frontend Engineer)

## 1. Reglas de Angular 21+ Moderno
- 100% **standalone components** (`bootstrapApplication`, `provideRouter`, `provideHttpClient`). Prohibido `NgModule`.
- Control flow moderno: `@if`, `@else`, `@for (...; track item.id)`, `@switch`. Prohibido `*ngIf` / `*ngFor`.
- Reactividad basada en **Signals**: `signal()`, `computed()`, `effect()`, `input()`, `output()`, `inject()`, `ChangeDetectionStrategy.OnPush`.

## 2. Motor de Formulario Dinámico (`DynamicFormBuilderService`)
- Recibir `StrapiFormField[]` ordenados por `order ASC` y construir un `FormGroup` tipado dinámicamente.
- Mapear validadores de manera pura y testeable:
  - `field.required` → `Validators.required` (o `Validators.requiredTrue` si `type === 'checkbox'` y obligatorio).
  - `validationRules.min / max / minLength / maxLength / pattern` → validadores nativos de Angular.
  - `validationRules.validatorKey`:
    - `legal_age`: fecha válida y edad calendario `>= 18`.
    - `vehicle_year_range`: entero en `[currentYear - 20, currentYear + 1]`.
    - `cl_rut`: formato RUT chileno + validación de dígito verificador Módulo 11.
- Hidratación segura desde `sessionStorage`: restaurar únicamente valores cuyas claves existan en el schema actual de Strapi (resiste campos eliminados/agregados sin deploy).

## 3. Gestión de Estado y Navegación (`QuoteStore`)
- Clave de persistencia por país: `auto_quote_v1_${countryCode}`.
- Route guards:
  - `countryGuard`: valida `co` | `cl`.
  - `step2Guard`: exige Paso 1 válido.
  - `step3Guard`: exige Paso 1 válido + plan seleccionado.
- Cero llamadas directas a `http://localhost:1337` hardcodeadas en componentes: consumir `/api/...` vía `StrapiApiService` (proxiado por Nginx en Docker y `proxy.conf.json` en dev local).

## 4. Tests Requeridos
- Unit tests: validadores (`legal_age`, `vehicle_year_range`, `cl_rut`), `DynamicFormBuilderService`, `PricingService`, `maskDocumentNumber`, bloqueo doble envío en `PaymentSimulationService`.
- E2E (Playwright): flujo completo de un país desde Paso 1 hasta confirmación con número de cotización, incluyendo prueba de pago rechazado y recuperación sin pérdida de datos.
