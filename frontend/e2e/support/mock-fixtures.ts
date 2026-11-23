/**
 * Fixtures FICTICIAS para los E2E-M (regla 5): reproducen la forma de la respuesta de Strapi 5 con `page.route`.
 * Ningún token ni escritura: solo se simulan lecturas (HITL-1).
 */
export interface MockOption {
  label: string;
  value: string;
  validationPattern?: string;
  validationMessage?: string;
  priceAdjustmentPct?: number;
}

export interface MockField {
  id: number;
  documentId: string;
  key: string;
  semanticRole: string;
  section: 'policyholder' | 'vehicle';
  label: string;
  type: 'text' | 'number' | 'select' | 'date' | 'checkbox';
  required: boolean;
  order: number;
  placeholder?: string;
  helpText?: string;
  errorMessage: string;
  validation?: Record<string, unknown>;
  options?: MockOption[];
  createdAt: string;
  updatedAt: string;
}

export interface MockCountry {
  id: number;
  documentId: string;
  code: string;
  name: string;
  currencyCode: string;
  locale: string;
  legalAge: number;
  vehicleMaxAgeYears: number;
  vehicleMaxFutureYears: number;
  termsTitle: string;
  termsContent: string;
  termsVersion: string;
  createdAt: string;
  updatedAt: string;
}

export const EMAIL_PATTERN = '^[A-Za-z0-9._%+-]{1,64}@([A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?\\.)+[A-Za-z]{2,24}$';

let seq = 0;
export function mockField(partial: Partial<MockField> & Pick<MockField, 'key' | 'semanticRole' | 'type' | 'label'>): MockField {
  seq += 1;
  return {
    id: seq,
    documentId: `mock-${partial.key}`,
    section: 'policyholder',
    required: true,
    order: seq * 10,
    errorMessage: `Revisa el campo ${partial.label}.`,
    createdAt: `2026-01-01T00:00:${String(seq % 60).padStart(2, '0')}.000Z`,
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...partial,
  };
}

export function mockCountry(overrides: Partial<MockCountry> = {}): MockCountry {
  return {
    id: 1, documentId: 'mock-country-co', code: 'co', name: 'Colombia', currencyCode: 'COP', locale: 'es-CO',
    legalAge: 18, vehicleMaxAgeYears: 20, vehicleMaxFutureYears: 1,
    termsTitle: 'T&C', termsContent: 'Contenido ficticio', termsVersion: '1',
    createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

export function mockCoFields(): MockField[] {
  return [
    mockField({ key: 'fullName', semanticRole: 'full_name', type: 'text', label: 'Nombre completo', order: 10 }),
    mockField({
      key: 'documentType', semanticRole: 'document_type', type: 'select', label: 'Tipo de documento', order: 20,
      options: [
        { label: 'Cédula de ciudadanía', value: 'CC', validationPattern: '^[0-9]{6,10}$', validationMessage: 'La cédula de ciudadanía debe tener entre 6 y 10 dígitos.' },
        { label: 'Cédula de extranjería', value: 'CE', validationPattern: '^[0-9]{6,7}$', validationMessage: 'La cédula de extranjería debe tener 6 o 7 dígitos.' },
      ],
    }),
    mockField({
      key: 'documentNumber', semanticRole: 'document_number', type: 'text', label: 'Número de documento', order: 30,
      validation: { validatorKey: 'depends_on_option_pattern', dependsOnRole: 'document_type' },
    }),
    mockField({ key: 'birthDate', semanticRole: 'birth_date', type: 'date', label: 'Fecha de nacimiento', order: 40, validation: { validatorKey: 'legal_age' }, errorMessage: 'Debes ser mayor de edad.' }),
    mockField({
      key: 'email', semanticRole: 'email', type: 'text', label: 'Correo electrónico', order: 50, errorMessage: 'Ingresa un correo electrónico válido.',
      validation: { maxLength: 254, pattern: EMAIL_PATTERN, validatorKey: 'none' },
    }),
    mockField({
      key: 'city', semanticRole: 'city', type: 'select', label: 'Ciudad', order: 70,
      options: [{ label: 'Bogotá D.C.', value: 'bogota', priceAdjustmentPct: 8 }, { label: 'Otra ciudad', value: 'otra' }],
    }),
    mockField({ key: 'dataConsent', semanticRole: 'none', type: 'checkbox', label: 'Autorizo el tratamiento de mis datos', order: 80, errorMessage: 'Debes autorizar el tratamiento de datos.' }),
    mockField({
      key: 'vehiclePlate', semanticRole: 'vehicle_plate', type: 'text', label: 'Placa', section: 'vehicle', order: 100,
      errorMessage: 'Ingresa una placa válida.', validation: { pattern: '^[A-Z]{3}[0-9]{2}[0-9A-Z]$', validatorKey: 'none' },
    }),
    mockField({ key: 'vehicleBrand', semanticRole: 'vehicle_brand', type: 'select', label: 'Marca', section: 'vehicle', order: 110, options: [{ label: 'Mazda', value: 'mazda' }, { label: 'Kia', value: 'kia' }] }),
    mockField({ key: 'vehicleYear', semanticRole: 'vehicle_year', type: 'number', label: 'Año del vehículo', section: 'vehicle', order: 130, validation: { validatorKey: 'vehicle_year_range' }, errorMessage: 'Ingresa un año dentro del rango.' }),
    mockField({ key: 'vehicleUse', semanticRole: 'vehicle_use', type: 'checkbox', label: 'Uso particular', section: 'vehicle', order: 140, required: false }),
  ];
}

export function mockClFields(): MockField[] {
  return mockCoFields()
    .filter((f) => f.semanticRole !== 'document_type')
    .map((f) => {
      if (f.semanticRole === 'document_number') return { ...f, key: 'rut', documentId: 'mock-rut', label: 'RUT', validation: { validatorKey: 'cl_rut' } };
      if (f.semanticRole === 'vehicle_plate') return { ...f, documentId: 'mock-patente', label: 'Patente', validation: { pattern: '^([A-Z]{4}[0-9]{2}|[A-Z]{2}[0-9]{4})$', validatorKey: 'none' } };
      return f;
    });
}
