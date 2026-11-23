# SPEC-US-01 — Formulario Dinámico de Datos del Tomador y Vehículo

- **Historia origen:** `US-01`
- **ADRs relacionados:** `ADR-001`, `ADR-002`
- **Estado:** Borrador (Pendiente HITL-1)

## 1. Vacíos Detectados en `US-01` y Decisiones Propuestas
1. **Resolución del país:** La historia habla de "contexto de un país" sin definir el mecanismo. Se establece enrutamiento `/:country/quote` (`co` | `cl`), redirigiendo `/` a `/co/quote` y códigos desconocidos a una pantalla/alerta con selector válido.
2. **Cambio de país en mitad del flujo:** Los datos se persisten por país (`auto_quote_v1_co` / `auto_quote_v1_cl`) para que cambiar de país no mezcle ni corrompa formularios.
3. **Cálculo exacto de mayoría de edad:** Se valida edad calendario local `>= 18` años (sin desfase UTC; quien cumple 18 hoy es válido; quien cumple mañana no).
4. **Extremos del año del vehículo:** Rango inclusivo `[currentYear - 20, currentYear + 1]`.
5. **Mutación de campos en Strapi con datos cacheados:** Si negocio elimina un campo que existía en `sessionStorage`, el hidratador ignora claves huérfanas; si agrega uno nuevo publicado, aparece vacío en el orden configurado al recargar sin deploy.
6. **Validación local de documentos y placas:** Validadores declarativos desde Strapi (`pattern`, `minLength`, `maxLength`) combinados con validadores tipados por clave (`legal_age`, `vehicle_year_range`, `cl_rut`).
7. **Resiliencia de red:** Si Strapi falla al cargar los campos, mostrar error claro con `role="alert"` y botón "Reintentar".

## 2. Contrato API (Strapi 5 → Angular)
`GET /api/form-fields?filters[country][code][$eq]=:country&populate=options&sort=order:asc`

```ts
export type FieldType = 'text' | 'number' | 'select' | 'date' | 'checkbox';

export interface FormFieldOption {
  label: string;
  value: string;
}

export interface FieldValidationRules {
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  validatorKey?: 'legal_age' | 'vehicle_year_range' | 'cl_rut';
}

export interface StrapiFormField {
  documentId: string;
  key: string;
  section: 'policyholder' | 'vehicle';
  label: string;
  type: FieldType;
  required: boolean;
  order: number;
  helpText?: string;
  errorMessage: string;
  validationRules?: FieldValidationRules;
  options?: FormFieldOption[];
}
```

## 3. Datos Semilla Ficticios por País
- **Colombia (`co`):** Tipo de documento (`select`: CC, CE), Número de documento (`text`), Nombre completo (`text`), Fecha de nacimiento (`date`, `legal_age`), Ciudad (`select`: Bogotá, Medellín, Cali), Placa (`text`, `^[A-Za-z]{3}[0-9]{3}$`), Marca (`select`), Año del vehículo (`number`, `vehicle_year_range`), Uso particular (`checkbox`).
- **Chile (`cl`):** RUT (`text`, `cl_rut`), Nombre completo (`text`), Fecha de nacimiento (`date`, `legal_age`), Región (`select`: Metropolitana, Valparaíso, Biobío), Patente (`text`, `^[A-Za-z]{4}[0-9]{2}$|^[A-Za-z]{2}[0-9]{4}$`), Marca (`select`), Año del vehículo (`number`, `vehicle_year_range`), Uso particular (`checkbox`).

## 4. Comportamiento UI y Accesibilidad
- Renderizar campos exactamente en el `order` devuelto por Strapi.
- Mostrar `errorMessage` configurado en Strapi junto al campo inválido y bloquear avance al Paso 2 moviendo el foco al primer control con error.
- Guardar valores en `sessionStorage` para restaurarlos intactos al volver desde Paso 2 o 3.
- Etiquetas `<label for>`, `aria-describedby` (ayuda + error) y `aria-invalid` en todos los controles.

## 5. Matriz de Verificación (Tests)
- **Unit:** `DynamicFormBuilderService` ordena y tipa controles; `legal_age` (18 exactos vs 17+364d); `vehicle_year_range` (límites `-20`, `+1`, `-21`, `+2`); `cl_rut` (dígito verificador válido e inválido).
- **E2E:** Campos distintos entre `/co/quote` y `/cl/quote`; error impide avanzar; volver desde Paso 2 conserva datos; publicar un campo nuevo en Strapi y recargar lo muestra sin deploy.
