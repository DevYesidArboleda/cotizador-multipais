# SPEC-US-03 — Resumen, Términos y Pago Simulado

- **Historia origen:** `US-03`
- **ADRs relacionados:** `ADR-001`, `ADR-002`
- **Estado:** Borrador (Pendiente HITL-1)

## 1. Vacíos Detectados en `US-03` y Decisiones Propuestas
1. **Acceso directo sin Paso 1 o 2 completos:** `step3Guard` redirige al paso pendiente correspondiente.
2. **Regla exacta de enmascaramiento parcial (`maskDocumentNumber`):**
   - Muestra únicamente los últimos 4 caracteres y sustituye los anteriores por `*` (ej. `1020304050` → `******4050`; `12.345.678-K` → `********78-K`).
   - Caso borde: cadenas de longitud `<= 4` enmascaran todo excepto el último carácter (`1234` → `***4`).
3. **Simulación determinista de pago rechazado (sin azar ni tarjetas reales):**
   - El servicio `PaymentSimulationService` (latencia simulada ~1000 ms) acepta un selector explícito de modo de prueba ficticio en UI (`Aprobado` / `Rechazado`) claramente etiquetado como simulación, permitiendo validar de forma repetible en QA y E2E tanto el pago exitoso como el rechazado.
4. **Prevención estricta de doble envío:**
   - Doble barrera: `isProcessing = signal(true)` deshabilita el botón inmediatamente (`disabled` + `aria-busy="true"`) **y** guardia en `PaymentSimulationService` ignora llamadas concurrentes o posteriores a un pago ya confirmado.
5. **Formato del número de cotización simulado:**
   - `COT-{COUNTRY}-{YYYYMMDD}-{4_HEX}` (ej. `COT-CO-20261123-7B2E`).
6. **Edición desde el resumen:**
   - "Editar datos" navega al Paso 1 preservando datos y plan (recalculando precio al regresar).
   - "Cambiar plan" navega al Paso 2 manteniendo la selección previa marcada.
7. **Post-confirmación:** Al confirmar el pago, mostrar pantalla de confirmación con el número de cotización y acción "Nueva cotización" que limpia `sessionStorage` del país actual.

## 2. Contrato de Términos y Condiciones (Strapi 5 → Angular)
`GET /api/countries?filters[code][$eq]=:country`
Campos consumidos: `termsTitle`, `termsContent`.

## 3. Reglas de Interfaz y Accesibilidad
- Resumen organizado en 3 bloques claros: Datos del tomador (con documento parcialmente enmascarado), Datos del vehículo y Plan seleccionado con precio final formateado.
- Contenedor legible para Términos y Condiciones con foco por teclado + checkbox obligatorio "Acepto los términos y condiciones".
- Botón "Pagar": habilitado **únicamente** cuando `termsAccepted() && !isProcessing() && !paymentConfirmed()`.
- En pago rechazado: alerta con `role="alert"` explicando el fallo simulado, manteniendo intactos todos los datos del usuario, el plan elegido y la opción de reintentar de inmediato.

## 4. Matriz de Verificación (Tests)
- **Unit:** `maskDocumentNumber` (CO, CL con guión, cadenas cortas); bloqueo de doble llamada concurrente en `PaymentSimulationService`; generación de formato `COT-...`; estado del botón según aceptación de T&C.
- **E2E (flujo completo):** Paso 1 → Paso 2 → Paso 3 (verifica resumen, documento enmascarado y T&C del país) → botón bloqueado sin T&C → pago rechazado mantiene datos → reintento aprobado muestra número de cotización.
