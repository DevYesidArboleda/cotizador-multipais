/**
 * Fixtures de pruebas (datos FICTICIOS, regla 5). Replican la forma de las respuestas de Strapi 5 para
 * ejercitar mappers y reglas. No se importan desde código de aplicación.
 */
import type {
  BusinessRole,
  FormConfig,
  FormFieldConfig,
  StrapiCountryDto,
  StrapiFormFieldDto,
  StrapiListResponse,
  Step1Values,
} from '../core/contracts/strapi-contracts';
import { buildFormConfig, toCountryConfig } from '../core/http/mappers';

export const EMAIL_PATTERN = '^[A-Za-z0-9._%+-]{1,64}@([A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?\\.)+[A-Za-z]{2,24}$';
export const CO_PLATE_PATTERN = '^[A-Z]{3}[0-9]{2}[0-9A-Z]$';
export const CL_PLATE_PATTERN = '^([A-Z]{4}[0-9]{2}|[A-Z]{2}[0-9]{4})$';

/** "Hoy" de las pruebas: 2026-11-23 (fecha calendario local). */
export const TODAY = new Date(2026, 10, 23, 12, 0, 0);

export function listOf<T>(data: T[], total = data.length): StrapiListResponse<T> {
  return { data, meta: { pagination: { page: 1, pageSize: 100, pageCount: 1, total } } };
}

let counter = 0;

export function fieldDto(
  partial: Partial<StrapiFormFieldDto> & Pick<StrapiFormFieldDto, 'key' | 'semanticRole' | 'type'>,
): StrapiFormFieldDto {
  counter += 1;
  return {
    id: counter,
    documentId: `doc-${partial.key}`,
    section: 'policyholder',
    label: partial.key,
    required: true,
    order: counter * 10,
    errorMessage: `Error de ${partial.key}`,
    createdAt: `2026-01-01T00:00:${String(counter % 60).padStart(2, '0')}.000Z`,
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...partial,
  };
}

const sel = (label: string, value: string, extra: Record<string, unknown> = {}) => ({ label, value, ...extra });

export function coFields(): StrapiFormFieldDto[] {
  return [
    fieldDto({ key: 'fullName', semanticRole: 'full_name', type: 'text', order: 10 }),
    fieldDto({
      key: 'documentType', semanticRole: 'document_type', type: 'select', order: 20, errorMessage: 'Seleccione el tipo de documento.',
      options: [
        sel('Cédula de ciudadanía', 'CC', { validationPattern: '^[0-9]{6,10}$', validationMessage: 'Mensaje CC' }),
        sel('Cédula de extranjería', 'CE', { validationPattern: '^[0-9]{6,7}$', validationMessage: 'Mensaje CE' }),
      ],
    }),
    fieldDto({
      key: 'documentNumber', semanticRole: 'document_number', type: 'text', order: 30,
      validation: { validatorKey: 'depends_on_option_pattern', dependsOnRole: 'document_type' },
    }),
    fieldDto({ key: 'birthDate', semanticRole: 'birth_date', type: 'date', order: 40, validation: { validatorKey: 'legal_age' } }),
    fieldDto({
      key: 'email', semanticRole: 'email', type: 'text', order: 50, errorMessage: 'Ingrese un correo electrónico válido.',
      validation: { maxLength: 254, pattern: EMAIL_PATTERN, validatorKey: 'none' },
    }),
    fieldDto({ key: 'phone', semanticRole: 'phone', type: 'text', order: 60, required: false }),
    fieldDto({
      key: 'city', semanticRole: 'city', type: 'select', order: 70,
      options: [sel('Bogotá D.C.', 'bogota', { priceAdjustmentPct: 8 }), sel('Otra ciudad', 'otra')],
    }),
    fieldDto({ key: 'dataConsent', semanticRole: 'none', type: 'checkbox', order: 80 }),
    fieldDto({
      key: 'vehiclePlate', semanticRole: 'vehicle_plate', type: 'text', section: 'vehicle', order: 100,
      validation: { pattern: CO_PLATE_PATTERN, validatorKey: 'none' },
    }),
    fieldDto({ key: 'vehicleBrand', semanticRole: 'vehicle_brand', type: 'select', section: 'vehicle', order: 110, options: [sel('Mazda', 'mazda'), sel('Kia', 'kia')] }),
    fieldDto({ key: 'vehicleYear', semanticRole: 'vehicle_year', type: 'number', section: 'vehicle', order: 130, validation: { validatorKey: 'vehicle_year_range' } }),
    fieldDto({ key: 'vehicleUse', semanticRole: 'vehicle_use', type: 'checkbox', section: 'vehicle', order: 140, required: false }),
  ];
}

export function clFields(): StrapiFormFieldDto[] {
  return coFields()
    .filter((f) => f.semanticRole !== 'document_type')
    .map((f) => {
      if (f.semanticRole === 'document_number') return { ...f, key: 'rut', documentId: 'doc-rut', validation: { validatorKey: 'cl_rut' as const } };
      if (f.semanticRole === 'vehicle_plate') return { ...f, validation: { pattern: CL_PLATE_PATTERN, validatorKey: 'none' as const } };
      return f;
    });
}

export function countryDto(overrides: Partial<StrapiCountryDto> = {}): StrapiCountryDto {
  return {
    id: 1, documentId: 'doc-country-co', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
    code: 'co', name: 'Colombia', currencyCode: 'COP', locale: 'es-CO',
    legalAge: 18, vehicleMaxAgeYears: 20, vehicleMaxFutureYears: 1,
    termsTitle: 'T&C', termsContent: 'Contenido', termsVersion: '1',
    ...overrides,
  };
}

export interface BuildOptions {
  readonly country?: 'co' | 'cl';
  readonly countryOverrides?: Partial<StrapiCountryDto>;
  readonly mutate?: (fields: StrapiFormFieldDto[]) => StrapiFormFieldDto[];
}

/** Construye un `FormConfig` por el camino real (DTO → mappers). Falla si la configuración no es `ready`. */
export function buildReadyConfig(options: BuildOptions = {}): FormConfig {
  const country = toCountryConfig(listOf([countryDto({ code: options.country ?? 'co', ...options.countryOverrides })]));
  if (country.kind !== 'ok') throw new Error('fixture de país inválido');
  const base = options.country === 'cl' ? clFields() : coFields();
  const result = buildFormConfig(country.country, listOf((options.mutate ?? ((f) => f))(base)));
  if (result.kind !== 'ready') throw new Error(`fixture no ready: ${JSON.stringify(result)}`);
  return result.config;
}

export function fieldOf(config: FormConfig, role: BusinessRole): FormFieldConfig {
  const field = config.roles[role];
  if (!field) throw new Error(`sin campo con rol ${role}`);
  return field;
}

/** Valores válidos de un solicitante adulto (CO), indexados por documentId y localizados por rol. */
export function validValues(config: FormConfig): Step1Values {
  const set = (role: BusinessRole, value: string | boolean): [string, string | boolean] => [fieldOf(config, role).documentId, value];
  const entries: [string, string | boolean][] = [
    set('full_name', 'Ana Pérez Demo'),
    set('document_number', config.roles.document_type ? '12345678' : '12345678-5'),
    set('birth_date', '1990-05-10'),
    set('email', 'ana.perez@example.com'),
    set('city', config.roles.city?.options[0]?.value ?? ''),
    set('vehicle_plate', config.roles.vehicle_plate?.validation.pattern?.source === CL_PLATE_PATTERN ? 'BCDF12' : 'ABC123'),
    set('vehicle_brand', config.roles.vehicle_brand?.options[0]?.value ?? ''),
    set('vehicle_year', '2020'),
  ];
  if (config.roles.document_type) entries.push(set('document_type', 'CC'));
  const consent = config.fields.find((f) => f.type === 'checkbox' && f.required);
  if (consent) entries.push([consent.documentId, true]);
  return Object.fromEntries(entries);
}
