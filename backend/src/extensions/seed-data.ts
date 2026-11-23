/**
 * Datos SEMILLA ficticios (regla 5). Negocio los edita luego en el admin; el seed nunca los pisa.
 * Los enums coinciden con docs/contracts/strapi-contracts.ts.
 */
export type Dict = Record<string, unknown>;

export interface FieldSeed {
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
  validation?: Dict;
  options?: Dict[];
}

export interface PlanSeed {
  slug: string;
  name: string;
  shortDescription: string;
  basePrice: number;
  order: number;
  isRecommended: boolean;
  isActive: boolean;
  coverages: Array<{ name: string; description: string; limit: string }>;
  benefits: Array<{ text: string }>;
}

export interface CountrySeed {
  code: string;
  name: string;
  currencyCode: 'COP' | 'CLP';
  locale: string;
  legalAge: number;
  vehicleMaxAgeYears: number;
  vehicleMaxFutureYears: number;
  termsTitle: string;
  termsVersion: string;
  termsContent: string;
  fields: FieldSeed[];
  plans: PlanSeed[];
}

const opt = (label: string, value: string, extra: Dict = {}): Dict => ({ label, value, ...extra });
const city = (label: string, value: string, pct?: number): Dict =>
  opt(label, value, pct === undefined ? {} : { priceAdjustmentPct: pct });

const EMAIL_PATTERN = '^[A-Za-z0-9._%+-]{1,64}@([A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?\\.)+[A-Za-z]{2,24}$';

/** Campos comunes a CO y CL (los distintos se construyen en cada país). */
const commonBefore = (): FieldSeed[] => [
  { key: 'fullName', semanticRole: 'full_name', section: 'policyholder', label: 'Nombre completo', type: 'text', required: true, order: 10, placeholder: 'Ej.: Ana Pérez Demo', errorMessage: 'Ingrese su nombre completo.' },
];

const commonMiddle = (cities: Dict[]): FieldSeed[] => [
  { key: 'birthDate', semanticRole: 'birth_date', section: 'policyholder', label: 'Fecha de nacimiento', type: 'date', required: true, order: 40, errorMessage: 'Ingrese una fecha de nacimiento válida. Debe ser mayor de edad.', validation: { validatorKey: 'legal_age' } },
  { key: 'email', semanticRole: 'email', section: 'policyholder', label: 'Correo electrónico', type: 'text', required: true, order: 50, placeholder: 'nombre@example.com', errorMessage: 'Ingrese un correo electrónico válido.', validation: { maxLength: 254, pattern: EMAIL_PATTERN, validatorKey: 'none' } },
  { key: 'phone', semanticRole: 'phone', section: 'policyholder', label: 'Teléfono', type: 'text', required: false, order: 60, placeholder: 'Opcional', errorMessage: 'Ingrese un teléfono válido.' },
  { key: 'city', semanticRole: 'city', section: 'policyholder', label: 'Ciudad', type: 'select', required: true, order: 70, errorMessage: 'Seleccione una ciudad.', options: cities },
  { key: 'dataConsent', semanticRole: 'none', section: 'policyholder', label: 'Autorizo el tratamiento de mis datos (simulado)', type: 'checkbox', required: true, order: 80, errorMessage: 'Debe autorizar el tratamiento de datos para continuar.' },
];

const commonVehicle = (plate: FieldSeed, brands: Dict[]): FieldSeed[] => [
  plate,
  { key: 'vehicleBrand', semanticRole: 'vehicle_brand', section: 'vehicle', label: 'Marca', type: 'select', required: true, order: 110, errorMessage: 'Seleccione la marca del vehículo.', options: brands },
  { key: 'vehicleModel', semanticRole: 'vehicle_model', section: 'vehicle', label: 'Modelo', type: 'text', required: false, order: 120, placeholder: 'Opcional', errorMessage: 'Ingrese un modelo válido.' },
  { key: 'vehicleYear', semanticRole: 'vehicle_year', section: 'vehicle', label: 'Año del vehículo', type: 'number', required: true, order: 130, placeholder: 'Ej.: 2020', errorMessage: 'Ingrese un año de vehículo dentro del rango permitido.', validation: { validatorKey: 'vehicle_year_range' } },
  { key: 'vehicleUse', semanticRole: 'vehicle_use', section: 'vehicle', label: 'Uso particular', type: 'checkbox', required: false, order: 140, errorMessage: 'Valor no válido.' },
];

export const COUNTRY_SEEDS: CountrySeed[] = [
  {
    code: 'co',
    name: 'Colombia',
    currencyCode: 'COP',
    locale: 'es-CO',
    legalAge: 18,
    vehicleMaxAgeYears: 20,
    vehicleMaxFutureYears: 1,
    termsTitle: 'Términos y condiciones - Colombia',
    termsVersion: '2026-11',
    termsContent: [
      'Esta es una cotización simulada de seguro de autos para Colombia con fines demostrativos. No constituye una oferta vinculante ni un contrato de seguro.',
      'Los precios mostrados son ficticios, están expresados en pesos colombianos (COP) y pueden variar según la ciudad, la edad del tomador y el año del vehículo.',
      'Los datos ingresados se conservan únicamente en su navegador durante la sesión y no se envían a ningún servidor ni pasarela de pago real.',
      'Al aceptar, declara que comprende que el pago es una simulación y que no se realizará ningún cobro.',
    ].join('\n\n'),
    fields: [
      ...commonBefore(),
      {
        key: 'documentType', semanticRole: 'document_type', section: 'policyholder', label: 'Tipo de documento', type: 'select', required: true, order: 20, errorMessage: 'Seleccione el tipo de documento.',
        options: [
          opt('Cédula de ciudadanía', 'CC', { validationPattern: '^[0-9]{6,10}$', validationMessage: 'La cédula de ciudadanía debe tener entre 6 y 10 dígitos.' }),
          opt('Cédula de extranjería', 'CE', { validationPattern: '^[0-9]{6,7}$', validationMessage: 'La cédula de extranjería debe tener 6 o 7 dígitos.' }),
        ],
      },
      { key: 'documentNumber', semanticRole: 'document_number', section: 'policyholder', label: 'Número de documento', type: 'text', required: true, order: 30, errorMessage: 'Ingrese un número de documento válido.', validation: { validatorKey: 'depends_on_option_pattern', dependsOnRole: 'document_type' } },
      ...commonMiddle([
        city('Bogotá D.C.', 'bogota', 8),
        city('Medellín', 'medellin', 5),
        city('Cali', 'cali', 3),
        city('Otra ciudad', 'otra'),
      ]),
      ...commonVehicle(
        { key: 'vehiclePlate', semanticRole: 'vehicle_plate', section: 'vehicle', label: 'Placa', type: 'text', required: true, order: 100, placeholder: 'ABC123', helpText: 'Auto: 3 letras y 3 números (ABC123). Moto: 3 letras, 2 números y 1 letra (ABC12D).', errorMessage: 'Ingrese una placa válida: auto (ABC123) o moto (ABC12D).', validation: { pattern: '^[A-Z]{3}[0-9]{2}[0-9A-Z]$', validatorKey: 'none' } },
        [opt('Mazda', 'mazda'), opt('Chevrolet', 'chevrolet'), opt('Renault', 'renault'), opt('Toyota', 'toyota'), opt('Kia', 'kia')],
      ),
    ],
    plans: [
      { slug: 'basico', name: 'Básico', shortDescription: 'Protección esencial frente a daños a terceros.', basePrice: 1200000, order: 10, isRecommended: false, isActive: true,
        coverages: [
          { name: 'Responsabilidad civil', description: 'Daños a bienes y personas de terceros.', limit: 'Hasta 100 SMMLV' },
          { name: 'Asistencia en carretera', description: 'Grúa y auxilio mecánico básico.', limit: '2 eventos por año' },
        ],
        benefits: [{ text: 'Línea de atención 24/7' }, { text: 'Pago en cuotas sin recargo' }] },
      { slug: 'plus', name: 'Plus', shortDescription: 'El equilibrio entre cobertura y precio.', basePrice: 1850000, order: 20, isRecommended: true, isActive: true,
        coverages: [
          { name: 'Responsabilidad civil', description: 'Daños a bienes y personas de terceros.', limit: 'Hasta 200 SMMLV' },
          { name: 'Pérdida parcial por daños', description: 'Reparación del vehículo asegurado.', limit: 'Deducible 10 %' },
          { name: 'Asistencia en carretera', description: 'Grúa y auxilio mecánico.', limit: '4 eventos por año' },
        ],
        benefits: [{ text: 'Vehículo de reemplazo por 5 días' }, { text: 'Línea de atención 24/7' }, { text: 'Pago en cuotas sin recargo' }] },
      { slug: 'premium', name: 'Premium', shortDescription: 'Cobertura total con los mejores beneficios.', basePrice: 2600000, order: 30, isRecommended: false, isActive: true,
        coverages: [
          { name: 'Responsabilidad civil', description: 'Daños a bienes y personas de terceros.', limit: 'Hasta 400 SMMLV' },
          { name: 'Pérdida total y parcial', description: 'Daños y hurto del vehículo asegurado.', limit: 'Sin deducible' },
          { name: 'Asistencia en carretera', description: 'Grúa, auxilio y conductor elegido.', limit: 'Ilimitada' },
        ],
        benefits: [{ text: 'Vehículo de reemplazo por 15 días' }, { text: 'Cobertura de accesorios' }, { text: 'Línea de atención 24/7' }] },
      { slug: 'legado', name: 'Legado (descontinuado)', shortDescription: 'Plan inactivo de ejemplo; no se muestra al usuario.', basePrice: 900000, order: 40, isRecommended: false, isActive: false,
        coverages: [{ name: 'Responsabilidad civil', description: 'Plan antiguo.', limit: 'Hasta 50 SMMLV' }],
        benefits: [{ text: 'Sin beneficios adicionales' }] },
    ],
  },
  {
    code: 'cl',
    name: 'Chile',
    currencyCode: 'CLP',
    locale: 'es-CL',
    legalAge: 18,
    vehicleMaxAgeYears: 20,
    vehicleMaxFutureYears: 1,
    termsTitle: 'Términos y condiciones - Chile',
    termsVersion: '2026-11',
    termsContent: [
      'Esta es una cotización simulada de seguro automotriz para Chile con fines demostrativos. No constituye una oferta vinculante ni un contrato de seguro.',
      'Los valores mostrados son ficticios, están expresados en pesos chilenos (CLP) y pueden variar según la comuna, la edad del asegurado y el año del vehículo.',
      'El RUT y los demás datos ingresados se mantienen solo en su navegador durante la sesión y no se transmiten a ningún sistema ni pasarela de pago real.',
      'Al aceptar, reconoce que el pago es una simulación y que no se efectuará ningún cargo.',
    ].join('\n\n'),
    fields: [
      ...commonBefore(),
      { key: 'rut', semanticRole: 'document_number', section: 'policyholder', label: 'RUT', type: 'text', required: true, order: 30, placeholder: '12.345.678-5', errorMessage: 'Ingrese un RUT válido.', validation: { validatorKey: 'cl_rut' } },
      ...commonMiddle([
        city('Santiago', 'santiago', 8),
        city('Valparaíso', 'valparaiso', 4),
        city('Concepción', 'concepcion', 2),
        city('Punta Arenas', 'punta-arenas', -5),
      ]),
      ...commonVehicle(
        { key: 'vehiclePlate', semanticRole: 'vehicle_plate', section: 'vehicle', label: 'Patente', type: 'text', required: true, order: 100, placeholder: 'BCDF12', helpText: 'Formato actual: 4 letras y 2 números (BCDF12). Formato antiguo: 2 letras y 4 números (AB1234).', errorMessage: 'Ingrese una patente válida: BCDF12 o AB1234.', validation: { pattern: '^([A-Z]{4}[0-9]{2}|[A-Z]{2}[0-9]{4})$', validatorKey: 'none' } },
        [opt('Mazda', 'mazda'), opt('Chevrolet', 'chevrolet'), opt('Toyota', 'toyota'), opt('Hyundai', 'hyundai'), opt('Suzuki', 'suzuki')],
      ),
    ],
    plans: [
      { slug: 'basico', name: 'Básico', shortDescription: 'Protección esencial frente a daños a terceros.', basePrice: 250000, order: 10, isRecommended: false, isActive: true,
        coverages: [
          { name: 'Responsabilidad civil', description: 'Daños a terceros en bienes y personas.', limit: 'Hasta 500 UF' },
          { name: 'Asistencia en ruta', description: 'Grúa y auxilio mecánico básico.', limit: '2 eventos por año' },
        ],
        benefits: [{ text: 'Atención telefónica 24/7' }, { text: 'Pago en cuotas sin interés' }] },
      { slug: 'plus', name: 'Plus', shortDescription: 'El equilibrio entre cobertura y precio.', basePrice: 380000, order: 20, isRecommended: true, isActive: true,
        coverages: [
          { name: 'Responsabilidad civil', description: 'Daños a terceros en bienes y personas.', limit: 'Hasta 1.000 UF' },
          { name: 'Daños propios', description: 'Reparación del vehículo asegurado.', limit: 'Deducible 3 UF' },
          { name: 'Asistencia en ruta', description: 'Grúa y auxilio mecánico.', limit: '4 eventos por año' },
        ],
        benefits: [{ text: 'Auto de reemplazo por 7 días' }, { text: 'Atención telefónica 24/7' }, { text: 'Pago en cuotas sin interés' }] },
      { slug: 'premium', name: 'Premium', shortDescription: 'Cobertura total con los mejores beneficios.', basePrice: 520000, order: 30, isRecommended: false, isActive: true,
        coverages: [
          { name: 'Responsabilidad civil', description: 'Daños a terceros en bienes y personas.', limit: 'Hasta 2.000 UF' },
          { name: 'Pérdida total y daños propios', description: 'Daños y robo del vehículo asegurado.', limit: 'Sin deducible' },
          { name: 'Asistencia en ruta', description: 'Grúa, auxilio y conductor de reemplazo.', limit: 'Ilimitada' },
        ],
        benefits: [{ text: 'Auto de reemplazo por 20 días' }, { text: 'Cobertura de accesorios' }, { text: 'Atención telefónica 24/7' }] },
      { slug: 'legado', name: 'Legado (descontinuado)', shortDescription: 'Plan inactivo de ejemplo; no se muestra al usuario.', basePrice: 180000, order: 40, isRecommended: false, isActive: false,
        coverages: [{ name: 'Responsabilidad civil', description: 'Plan antiguo.', limit: 'Hasta 300 UF' }],
        benefits: [{ text: 'Sin beneficios adicionales' }] },
    ],
  },
];
