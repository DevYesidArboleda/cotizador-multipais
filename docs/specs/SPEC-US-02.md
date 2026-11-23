# SPEC-US-02 — Listado y Selección de Planes

- **Historia origen:** `US-02`
- **ADRs relacionados:** `ADR-001`, `ADR-002`
- **Estado:** Borrador (Pendiente HITL-1)

## 1. Vacíos Detectados en `US-02` y Decisiones Propuestas
1. **Navegación directa al Paso 2 sin completar Paso 1:** Route guard `step2Guard` redirige automáticamente a `/:country/quote/step-1`.
2. **Regla simulada de ajuste de precio (documentada):** La historia permite ajustar el precio base con datos del Paso 1 si se documenta la regla. Se implementa la función pura `calculateAdjustedPrice(basePrice, vehicleYear, birthDate, now)`:
   - Antigüedad del vehículo (`vehicleAge = now.getFullYear() - vehicleYear`):
     - `<= 3` años: `+10%` (mayor valor comercial asegurado)
     - `4` a `10` años: `0%` (tarifa base)
     - `> 10` años: `+15%` (mayor siniestralidad y costo de repuestos)
   - Edad del tomador:
     - `< 25` años: `+12%`
     - `>= 25` años: `0%`
   - Fórmula: `Math.round(basePrice * (1 + vehicleFactor + ageFactor))` (sin decimales para COP y CLP).
3. **Recálculo reactivo al volver al Paso 1:** Si el usuario vuelve al Paso 1 y cambia el año del vehículo o fecha de nacimiento, el precio de los planes y del plan elegido se recalcula automáticamente vía `computed()`.
4. **Diferenciación accesible del plan recomendado:** Etiqueta textual visible ("Recomendado") + estilo de borde destacado (no depender únicamente del color).
5. **Estado vacío vs error de API:**
   - `plans.length === 0`: Mensaje claro "No hay planes disponibles para tu país en este momento" + botón "Volver al formulario".
   - Error HTTP: Alerta recuperable con botón "Reintentar".

## 2. Contrato API (Strapi 5 → Angular)
`GET /api/insurance-plans?filters[country][code][$eq]=:country&filters[isActive][$eq]=true&sort=order:asc`

```ts
export interface StrapiInsurancePlan {
  documentId: string;
  slug: string;
  name: string;
  shortDescription: string;
  basePrice: number;
  currency: 'COP' | 'CLP';
  coverages: string[];
  benefits: string[];
  order: number;
  isRecommended: boolean;
  isActive: boolean;
}
```

## 3. Formato de Moneda
- **Colombia (`COP`):** `Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })`.
- **Chile (`CLP`):** `Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 })`.
- Usar `tabular-nums` para alinear cifras.

## 4. Selección y Accesibilidad
- Selección única (solo un plan activo a la vez) implementada con controles semánticos operables con teclado (`role="radiogroup"` o radio inputs accesibles).
- Botón "Continuar al resumen" deshabilitado hasta seleccionar un plan.
- Botón "Volver" regresa al Paso 1 conservando todos los datos ingresados.

## 5. Matriz de Verificación (Tests)
- **Unit:** `PricingService` cubre todos los tramos de antigüedad y edad; formateador de moneda COP/CLP; selección única reemplaza la anterior.
- **E2E:** Muestra solo planes activos y publicados en el orden configurado; plan recomendado distinguido visualmente; estado vacío muestra mensaje claro; seleccionar un plan habilita el avance al Paso 3.
