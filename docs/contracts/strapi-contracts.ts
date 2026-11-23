/**
 * Contrato único Strapi 5 ↔ Angular — Cotizador Multi-País (CO/CL)
 * =================================================================
 * Fuente única (ADR-001 §4.8–4.9). `@cms-engineer` alinea los `schema.json` de Strapi con los enums
 * y DTOs de este archivo; `@frontend-engineer` lo copia sin cambios a
 * `frontend/src/app/core/contracts/strapi-contracts.ts` e implementa las funciones declaradas al final
 * en los módulos indicados por las specs.
 *
 * Reglas de este archivo:
 *  - TypeScript `strict`, sin `any` (CLAUDE.md §7). Entradas de red = `unknown` + type guards.
 *  - Solo tipos, constantes técnicas y firmas `export declare function` (sin implementación).
 *  - PROHIBIDO añadir aquí datos de negocio: patrones de placa/correo/documento, ciudades, factores por
 *    ciudad, edad legal 18, rango 20/+1, nombres de campos (`key`) o países. Viven en Strapi
 *    (CLAUDE.md regla 2; R-01.12, R-01.15, R-01.31, R-02.21).
 *  - Strapi 5 responde plano: `{ data, meta: { pagination } }`, cada documento con `id` y `documentId`,
 *    sin `attributes` (GAP-01.18, GAP-02.2).
 *
 * Trazabilidad: SPEC-US-01 §4, SPEC-US-02 §4, SPEC-US-03 §4 (v3, Aprobado), HITL-1, ADR-001, ADR-002.
 */

// ─────────────────────────────────────────────────────────────────────────────
// 0. Utilidades
// ─────────────────────────────────────────────────────────────────────────────

/** Valor escalar JSON tal como puede llegar de la red (para validar y nombrar errores). */
export type JsonScalar = string | number | boolean | null;

// ─────────────────────────────────────────────────────────────────────────────
// 1. Enums compartidos (tuplas `as const` + unión derivada: usables en type guards y en schema.json)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Rol semántico de un campo. La lógica localiza campos SOLO por rol, nunca por `key`
 * (CLAUDE.md regla 3; R-01.11, R-01.12, GAP-01.2). Debe coincidir 1:1 con el enum
 * `form-field.semanticRole` y `form.validation.dependsOnRole` en Strapi.
 */
export const SEMANTIC_ROLES = [
  'none',
  'full_name',
  'document_type',
  'document_number',
  'birth_date',
  'email',
  'phone',
  'city',
  'vehicle_plate',
  'vehicle_brand',
  'vehicle_model',
  'vehicle_year',
  'vehicle_use',
] as const;
export type SemanticRole = (typeof SEMANTIC_ROLES)[number];
/** Rol con significado de negocio (excluye `none`). */
export type BusinessRole = Exclude<SemanticRole, 'none'>;

/** Tipo de control (R-01.3). Enum `form-field.type`. */
export const FIELD_TYPES = ['text', 'number', 'select', 'date', 'checkbox'] as const;
export type FieldType = (typeof FIELD_TYPES)[number];

/** Sección del Paso 1; orden fijo policyholder → vehicle (R-01.2, R-03.2, GAP-01.13). Enum `form-field.section`. */
export const FORM_SECTIONS = ['policyholder', 'vehicle'] as const;
export type FormSection = (typeof FORM_SECTIONS)[number];
/** Alias con el nombre usado en SPEC-US-01 §4. */
export type FieldSection = FormSection;

/**
 * Validadores con lógica propia (R-01.11, R-01.13, R-01.14, R-01.16, R-01.18).
 * Enum `form.validation.validatorKey`. `legal_age` y `vehicle_year_range` son redundantes:
 * la validación de edad y año se aplica siempre por rol (GAP-01.3).
 */
export const VALIDATOR_KEYS = [
  'none',
  'legal_age',
  'vehicle_year_range',
  'cl_rut',
  'depends_on_option_pattern',
] as const;
export type ValidatorKey = (typeof VALIDATOR_KEYS)[number];

/**
 * Monedas admitidas en `insurance-plan.currency` (HITL-1, GAP-02.1 Opción B; R-02.19).
 * Enum fijo: otra moneda exige cambio de esquema Strapi + este contrato (ADR-001 N3).
 */
export const CURRENCY_CODES = ['COP', 'CLP'] as const;
export type CurrencyCode = (typeof CURRENCY_CODES)[number];

// ─────────────────────────────────────────────────────────────────────────────
// 2. Constantes técnicas y tablas de compatibilidad (no son datos de negocio)
// ─────────────────────────────────────────────────────────────────────────────

/** Roles requeridos por el motor: exactamente uno publicado por país (R-01.11; HITL-1: `email` NO es requerido). */
export const REQUIRED_SEMANTIC_ROLES = ['birth_date', 'vehicle_year', 'document_number'] as const;
export type RequiredSemanticRole = (typeof REQUIRED_SEMANTIC_ROLES)[number];

/**
 * Tipo de campo exigido para un rol cuando el rol está presente.
 * Distinto → `config-error` que nombra el rol (R-01.11, R-01.28, R-02.22).
 */
export const ROLE_EXPECTED_TYPE = {
  birth_date: 'date',
  vehicle_year: 'number',
  document_number: 'text',
  email: 'text',
  city: 'select',
} as const satisfies Partial<Record<BusinessRole, FieldType>>;

/**
 * Rol obligatorio para cada `validatorKey` con lógica atada a un rol (R-01.11).
 * `depends_on_option_pattern` no está aquí: exige `dependsOnRole` apuntando a un campo `select` (R-01.16).
 */
export const VALIDATOR_REQUIRED_ROLE = {
  legal_age: 'birth_date',
  vehicle_year_range: 'vehicle_year',
  cl_rut: 'document_number',
} as const satisfies Partial<Record<ValidatorKey, BusinessRole>>;

/**
 * Rango inclusivo de `form.field-option.priceAdjustmentPct` (HITL-1 cierre; GAP-02.18, R-02.22).
 * Mismos números que `min`/`max` del esquema Strapi. `pricing-rules.ts` los reexporta (R-02.7).
 */
export const CITY_ADJUSTMENT_PCT = { min: -10, max: 30 } as const;

/** `pagination[pageSize]` de toda lista; `meta.pagination.total` mayor → `config-error` (R-01.23, R-02.2). */
export const STRAPI_MAX_PAGE_SIZE = 100;
/** Timeout de cada petición HTTP a `/api` (R-01.23, R-02.2, R-03.18). */
export const HTTP_TIMEOUT_MS = 10_000;
/** Latencia simulada del pago, sobrescribible por token de inyección en tests (R-03.10). */
export const PAYMENT_SIMULATED_LATENCY_MS = 1_000;

/** Persistencia por país en sessionStorage (CLAUDE.md regla 6; R-01.8, R-01.20, R-01.24). */
export const QUOTE_STORAGE_KEY_PREFIX = 'auto_quote_v1_';
export const QUOTE_SCHEMA_VERSION = 1;
export type QuoteStorageKey = `${typeof QUOTE_STORAGE_KEY_PREFIX}${string}`;

/** Código de país válido en ruta y en Strapi (R-01.1). */
export const COUNTRY_CODE_PATTERN = /^[a-z]{2}$/;
/** Formato del número de cotización (R-03.13, AC-03.21). */
export const QUOTE_NUMBER_PATTERN = /^COT-[A-Z]{2}-[0-9]{8}-[0-9A-F]{4}$/;

/**
 * Queries REST exactas (rutas relativas vía proxy; sin token; R-01.23, R-02.2, GAP-01.14, GAP-02.9).
 * `{code}` = código de país ya normalizado a minúsculas. Prohibido `populate=*`.
 * Sin Draft & Publish en `country` → sin `status`. El servidor fuerza `published` (ADR-002 §4.2).
 */
export const STRAPI_QUERIES = {
  country: '/api/countries?filters[code][$eq]={code}',
  countryList: '/api/countries?fields[0]=code&fields[1]=name&sort=name:asc&pagination[pageSize]=100',
  formFields:
    '/api/form-fields?filters[country][code][$eq]={code}&status=published' +
    '&populate[validation]=true&populate[options]=true' +
    '&sort[0]=order:asc&sort[1]=createdAt:asc&pagination[pageSize]=100',
  insurancePlans:
    '/api/insurance-plans?filters[country][code][$eq]={code}&filters[isActive][$eq]=true&status=published' +
    '&populate[coverages]=true&populate[benefits]=true' +
    '&sort[0]=order:asc&sort[1]=createdAt:asc&pagination[pageSize]=100',
} as const;
export type StrapiResource = keyof typeof STRAPI_QUERIES;

// ─────────────────────────────────────────────────────────────────────────────
// 3. Tipos CRUDOS de Strapi 5 (DTO). Describen la respuesta REST real.
//    Los atributos cuyo valor inválido debe producir un `config-error` CON NOMBRE se tipan de forma
//    tolerante (p. ej. `currency: string | null`) para no rechazar la respuesta completa.
// ─────────────────────────────────────────────────────────────────────────────

/** `meta.pagination` de Strapi 5 (paginación por página). */
export interface StrapiPagination {
  page: number;
  pageSize: number;
  pageCount: number;
  total: number;
}

/** Respuesta de lista de Strapi 5: plana, sin `attributes` (ADR-001 §4.8). */
export interface StrapiListResponse<T> {
  data: T[];
  meta: { pagination: StrapiPagination };
}

/** Cuerpo de error de Strapi 5 (4xx/5xx) → estado `error` (R-01.22, R-02.15, R-03.18). */
export interface StrapiErrorResponse {
  data: null;
  error: { status: number; name: string; message: string; details?: unknown };
}

/** Campos comunes de un documento Strapi 5. `documentId` es el identificador estable (GAP-01.11). */
export interface StrapiDocumentDto {
  id: number;
  documentId: string;
  createdAt: string;
  updatedAt: string;
  /** `null` solo en borradores; el servidor nunca debe devolverlos al rol Public (ADR-002 §4.2). */
  publishedAt?: string | null;
}

/** Componente `form.field-option` (R-01.3, R-01.16, GAP-01.6, GAP-01.22). */
export interface StrapiFieldOptionDto {
  id?: number;
  label: string;
  value: string;
  /** Patrón del campo dependiente cuando esta opción está elegida (p. ej. CC/CE). R-01.16. */
  validationPattern?: string | null;
  validationMessage?: string | null;
  /**
   * Ajuste simulado de precio en % (solo se lee en el campo con rol `city`). Entero en [-10, 30]
   * según el esquema; tolerante aquí porque un valor inválido es `config-error` nombrado
   * (R-02.21–R-02.23, AC-02.24).
   */
  priceAdjustmentPct?: JsonScalar;
}

/** Componente `form.validation` (R-01.6, R-01.11, R-01.16, R-01.29). */
export interface StrapiFieldValidationDto {
  id?: number;
  min?: number | null;
  max?: number | null;
  minLength?: number | null;
  maxLength?: number | null;
  pattern?: string | null;
  validatorKey?: ValidatorKey | null;
  dependsOnRole?: SemanticRole | null;
}

/** Documento `form-field` (con Draft & Publish). R-01.2, R-01.3, R-01.11, GAP-01.18. */
export interface StrapiFormFieldDto extends StrapiDocumentDto {
  /** Renombrable por negocio: solo para `id`/`name` del DOM. NUNCA en lógica ni persistencia (R-01.12). */
  key: string;
  semanticRole: SemanticRole;
  section: FormSection;
  label: string;
  type: FieldType;
  required: boolean;
  order: number;
  placeholder?: string | null;
  helpText?: string | null;
  errorMessage: string;
  validation?: StrapiFieldValidationDto | null;
  options?: StrapiFieldOptionDto[] | null;
}

/** Documento `country` (sin Draft & Publish). R-01.1, R-01.15, R-02.5, R-03.7, GAP-01.3. */
export interface StrapiCountryDto extends StrapiDocumentDto {
  code: string;
  name: string;
  /** ISO 4217; única fuente para formatear (R-02.5). */
  currencyCode: string;
  /** BCP 47 (p. ej. `es-CO`). Inválido → `config-error` (GAP-02.11). */
  locale: string;
  /** Enteros ≥ 0; tolerantes para nombrar el `config-error` (R-01.15). */
  legalAge: JsonScalar;
  vehicleMaxAgeYears: JsonScalar;
  vehicleMaxFutureYears: JsonScalar;
  termsTitle?: string | null;
  /** Texto plano; párrafos separados por línea en blanco. Vacío → `config-error` (R-03.7). */
  termsContent?: string | null;
  termsVersion?: string | null;
}

/** Fila de `/country-not-found` (`fields[0]=code&fields[1]=name`). R-01.1, AC-01.5. */
export interface StrapiCountryListItemDto {
  id: number;
  documentId: string;
  code: string;
  name: string;
}

/** Componente `plan.coverage` (R-02.14, GAP-02.17). */
export interface StrapiPlanCoverageDto {
  id?: number;
  name: string;
  description?: string | null;
  /** p. ej. "Hasta 100 SMMLV". */
  limit?: string | null;
}

/** Componente `plan.benefit` (R-02.14). */
export interface StrapiPlanBenefitDto {
  id?: number;
  text: string;
}

/** Documento `insurance-plan` (con Draft & Publish). R-02.3, R-02.4, R-02.10, R-02.19. */
export interface StrapiInsurancePlanDto extends StrapiDocumentDto {
  /** Editable por negocio: no se usa para persistir (la selección usa `documentId`). */
  slug: string;
  /** Ausente/vacío → plan excluido con `console.warn` (R-02.4). */
  name?: string | null;
  shortDescription?: string | null;
  /** Entero ≥ 0 en la moneda del país; inválido → plan excluido (R-02.4, AC-02.17). */
  basePrice: JsonScalar;
  /**
   * Esquema: enum `CurrencyCode` obligatorio (HITL-1, Opción B). Tolerante aquí: ausente, nulo o
   * fuera del enum (p. ej. `USD`) → `config-error` que nombra el plan y las monedas (R-02.19, AC-02.21).
   */
  currency?: string | null;
  coverages?: StrapiPlanCoverageDto[] | null;
  benefits?: StrapiPlanBenefitDto[] | null;
  order: number;
  isRecommended?: boolean | null;
  /** Filtrado en la query; el cliente además descarta `isActive !== true` (R-02.3). */
  isActive?: boolean | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Modelos de DOMINIO (producidos por los mappers; la UI y las funciones puras solo usan estos)
// ─────────────────────────────────────────────────────────────────────────────

/** Parámetros de reglas por país, ya validados como enteros ≥ 0 (R-01.15, GAP-01.3). */
export interface CountryRules {
  legalAge: number;
  vehicleMaxAgeYears: number;
  vehicleMaxFutureYears: number;
}
export type CountryRuleParam = keyof CountryRules;

/** T&C del país, texto plano (R-03.7, GAP-03.3). `content` puede ser vacío: lo valida el Paso 3. */
export interface CountryTerms {
  title: string;
  content: string;
  version: string;
}

/** País resuelto desde la ruta + Strapi (R-01.1, R-01.15, R-02.5, R-03.7). */
export interface CountryConfig {
  documentId: string;
  /** Minúsculas, `COUNTRY_CODE_PATTERN`. */
  code: string;
  name: string;
  currencyCode: string;
  locale: string;
  rules: CountryRules;
  terms: CountryTerms;
}

/** Elemento del selector de `/country-not-found` (R-01.1, AC-01.5). */
export interface CountryLink {
  code: string;
  name: string;
}

/** Regex compilada una sola vez al construir la configuración; patrón inválido → `config-error` (R-01.6). */
export interface CompiledPattern {
  /** Texto del patrón tal como lo escribió negocio. */
  source: string;
  regex: RegExp;
}

/** Opción de `select` en dominio (R-01.3, R-01.16, R-02.21). */
export interface FormFieldOption {
  label: string;
  value: string;
  validationPattern: CompiledPattern | null;
  validationMessage: string | null;
  /** Sin validar: lo valida `resolveCityAdjustment` solo en la opción elegida (R-02.22, GAP-02.19). `null` = ausente. */
  priceAdjustmentPct: JsonScalar;
}

/** Validación declarativa en dominio (R-01.5, R-01.6, R-01.29; precedencia GAP-01.12). */
export interface FieldValidationConfig {
  min: number | null;
  max: number | null;
  minLength: number | null;
  maxLength: number | null;
  pattern: CompiledPattern | null;
  validatorKey: ValidatorKey;
  dependsOnRole: BusinessRole | null;
}

/** Campo del Paso 1 en dominio (R-01.2, R-01.3, R-01.4, R-01.11). */
export interface FormFieldConfig {
  documentId: string;
  /**
   * @deprecated Solo para atributos `id`/`name` del DOM. Prohibido en lógica, persistencia y tests
   * de reglas (R-01.12; revisión estática de `@qa-reviewer`).
   */
  key: string;
  semanticRole: SemanticRole;
  section: FormSection;
  type: FieldType;
  label: string;
  required: boolean;
  order: number;
  createdAt: string;
  placeholder: string | null;
  helpText: string | null;
  errorMessage: string;
  validation: FieldValidationConfig;
  /** Orden de Strapi (R-01.3). Vacío salvo en `select`. */
  options: readonly FormFieldOption[];
}

/** Índice rol → campo (único por construcción; R-01.11). Solo roles presentes. */
export type RoleIndex = Readonly<Partial<Record<BusinessRole, FormFieldConfig>>>;

/** Configuración del Paso 1 válida para operar (todos los roles requeridos resueltos). */
export interface FormConfig {
  country: CountryConfig;
  /** Ordenados: sección (policyholder → vehicle), `order` asc, `createdAt` asc (R-01.2, AC-01.26). */
  fields: readonly FormFieldConfig[];
  roles: RoleIndex & Readonly<Record<RequiredSemanticRole, FormFieldConfig>>;
}

/** Cobertura y beneficio en dominio (R-02.14, R-03.6). */
export interface PlanCoverage {
  name: string;
  description: string | null;
  limit: string | null;
}
export interface PlanBenefit {
  text: string;
}

/** Plan tal como llegó (antes de `sanitizePlans`); conserva valores dudosos para validarlos. */
export interface InsurancePlan {
  documentId: string;
  slug: string;
  name: string | null;
  shortDescription: string | null;
  basePrice: JsonScalar;
  /** Solo para la aserción `assertPlanCurrency`; NUNCA para formatear (R-02.19). */
  declaredCurrency: string | null;
  coverages: readonly PlanCoverage[];
  benefits: readonly PlanBenefit[];
  order: number;
  isRecommended: boolean;
  isActive: boolean;
  createdAt: string;
}

/** Plan apto para listar y cotizar (R-02.3, R-02.4). */
export interface ValidInsurancePlan extends Omit<InsurancePlan, 'name' | 'basePrice' | 'declaredCurrency'> {
  name: string;
  /** Entero ≥ 0. */
  basePrice: number;
  declaredCurrency: CurrencyCode;
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. Errores de configuración tipados (el texto visible sale del catálogo `ui-copy.es.ts`, R-01.27)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Motivo de un estado `config-error` (R-01.11, R-01.6, R-01.15, R-01.23, R-02.5, R-02.8, R-02.19,
 * R-02.22, R-03.7, R-03.25). Lleva los parámetros que el mensaje debe nombrar (rol, plan, monedas, opción).
 */
export type ConfigIssue =
  | { code: 'role-missing'; role: RequiredSemanticRole }
  | { code: 'role-duplicated'; role: BusinessRole; fieldDocumentIds: readonly string[] }
  | {
      code: 'role-type-mismatch';
      role: BusinessRole;
      expected: FieldType;
      actual: FieldType;
      fieldDocumentId: string;
    }
  | { code: 'validator-role-mismatch'; validatorKey: ValidatorKey; role: SemanticRole; fieldDocumentId: string }
  | { code: 'dependent-role-invalid'; fieldDocumentId: string; dependsOnRole: SemanticRole | null }
  | {
      code: 'invalid-pattern';
      fieldDocumentId: string;
      fieldLabel: string;
      source: 'field' | 'option';
      optionLabel: string | null;
    }
  | { code: 'invalid-country-param'; param: CountryRuleParam; value: JsonScalar }
  | { code: 'invalid-locale-or-currency'; locale: string; currencyCode: string }
  | { code: 'too-many-results'; resource: StrapiResource; total: number }
  | { code: 'malformed-response'; resource: StrapiResource }
  | {
      code: 'plan-currency-mismatch';
      planDocumentId: string;
      planName: string;
      planCurrency: string | null;
      countryCurrency: string;
    }
  | {
      code: 'invalid-city-adjustment';
      fieldDocumentId: string;
      fieldLabel: string;
      optionLabel: string;
      value: JsonScalar;
    }
  | { code: 'invalid-pricing-input'; role: 'birth_date' | 'vehicle_year' }
  | { code: 'empty-terms' };

// ─────────────────────────────────────────────────────────────────────────────
// 6. Estado persistido (sessionStorage['auto_quote_v1_<country>'])
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Valor de un campo del Paso 1. `checkbox` → boolean; los demás tipos → string TAL COMO SE ESCRIBIÓ
 * (incluido `number`: `"2020.5"` o `"1e3"` deben poder validarse y restaurarse; R-01.8, R-01.14).
 * `null` = vacío. Tipo distinto del esperado por el campo → descartado al hidratar (R-01.9).
 */
export type Step1Value = string | boolean | null;

/** Valores del Paso 1 indexados por `documentId`, nunca por `key` (R-01.8, GAP-01.11). */
export type Step1Values = Readonly<Record<string, Step1Value>>;

/** Selección del Paso 2 (R-02.11, R-02.13). */
export interface SelectedPlan {
  planDocumentId: string;
  /** Precio final entero visto al elegir; se actualiza al pulsar "Continuar al resumen" (R-02.13). */
  priceSeenAtSelection: number;
}

/** Confirmación persistida tras pago aprobado (R-03.14, GAP-03.10). Sin documento ni correo (R-03.5, R-03.24). */
export interface QuoteConfirmation {
  quoteNumber: string;
  planDocumentId: string;
  planName: string;
  finalPrice: number;
  /** ISO 8601. */
  paidAt: string;
}

/**
 * Estado del cotizador por país (CLAUDE.md regla 6; R-01.8, R-01.24, R-02.17, R-03.14, R-03.15).
 * No contiene aceptación de T&C ni modo de simulación (solo memoria: R-03.8, R-03.21).
 */
export interface QuoteState {
  schemaVersion: typeof QUOTE_SCHEMA_VERSION;
  step1: Step1Values;
  selectedPlan?: SelectedPlan;
  confirmation?: QuoteConfirmation;
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. Validación del Paso 1
// ─────────────────────────────────────────────────────────────────────────────

/** Fecha calendario local sin hora ni zona (R-01.13, GAP-01.4). `month` 1–12. */
export interface CalendarDate {
  year: number;
  month: number;
  day: number;
}

/** Regla que falló; precedencia de GAP-01.12 (se detiene en el primer fallo). */
export type ValidationRule =
  | 'required'
  | 'numeric'
  | 'min'
  | 'max'
  | 'min-length'
  | 'max-length'
  | 'pattern'
  | 'legal-age'
  | 'vehicle-year-range'
  | 'cl-rut'
  | 'dependent-pattern';

/** Error de un campo: exactamente un mensaje de Strapi (R-01.4). */
export interface FieldError {
  fieldDocumentId: string;
  rule: ValidationRule;
  /** `errorMessage` del campo o `validationMessage` de la opción (patrón dependiente). */
  message: string;
}

/** Contexto para validar un campo que depende de otros (R-01.16) o del reloj (R-01.13, R-01.14). */
export interface FieldValidationContext {
  config: FormConfig;
  values: Step1Values;
  /** Reloj inyectable; se usa su fecha calendario LOCAL. */
  now: Date;
}

/** Atributos HTML derivados del rol, nunca de la `key` (R-01.30, WCAG 1.3.5). */
export interface InputAttributes {
  autocomplete?: string;
  inputmode?: 'text' | 'email' | 'numeric' | 'tel';
  spellcheck?: boolean;
}

/** Resultado de construir la configuración del Paso 1 (R-01.11, R-01.22, R-01.23). */
export type FormConfigResult =
  | { kind: 'ready'; config: FormConfig }
  | { kind: 'empty' }
  | { kind: 'config-error'; issues: readonly ConfigIssue[] };

/** Resultado de mapear el país (R-01.1, R-01.15, GAP-02.11). */
export type CountryConfigResult =
  | { kind: 'ok'; country: CountryConfig }
  | { kind: 'not-found' }
  | { kind: 'config-error'; issues: readonly ConfigIssue[] };

/** Resultado de hidratar valores guardados contra la configuración vigente (R-01.9, AC-01.19, AC-01.20). */
export interface HydrationResult {
  values: Step1Values;
  /** `documentId` descartados (huérfanos, tipo distinto u opción inexistente); se purgan al guardar. */
  discardedFieldDocumentIds: readonly string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. Precio (SPEC-US-02)
// ─────────────────────────────────────────────────────────────────────────────

/** Ajuste por ciudad resuelto (R-02.21–R-02.23). `pct = 0` si falta. */
export type CityAdjustmentResult =
  | { kind: 'ok'; pct: number }
  | { kind: 'config-error'; issue: ConfigIssue };

/** Factores del Paso 1 que afectan el precio, localizados por rol y validados (R-02.7, R-02.8). */
export interface PricingFactors {
  vehicleYear: number;
  /** `YYYY-MM-DD` válido. */
  birthDate: string;
  cityAdjustmentPct: number;
}

export type PricingFactorsResult =
  | { kind: 'ok'; factors: PricingFactors }
  | { kind: 'config-error'; issue: ConfigIssue };

/** Entrada de la regla de precio ya validada (SPEC-US-02 §4). */
export interface PricingInput extends PricingFactors {
  basePrice: number;
  /** Reloj inyectable. */
  now: Date;
}

/** Formateo de moneda; `Intl` con locale o moneda inválidos → `config-error` (R-02.5, GAP-02.11). */
export type FormatPriceResult =
  | { kind: 'ok'; text: string }
  | { kind: 'config-error'; issue: ConfigIssue };

/** Resultado de depurar planes (R-02.3, R-02.4). */
export interface SanitizedPlans {
  valid: readonly ValidInsurancePlan[];
  excludedDocumentIds: readonly string[];
}

/** Plan con precio calculado para la vista (R-02.5, R-02.6, R-02.10, R-02.14). */
export interface PricedPlan {
  plan: ValidInsurancePlan;
  finalPrice: number;
  finalPriceText: string;
  /** Presente solo si difiere del final (GAP-02.5). */
  basePriceText: string | null;
  /** Solo el primero con `isRecommended` (R-02.10). */
  highlighted: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// 9. Resumen, pago y confirmación (SPEC-US-03)
// ─────────────────────────────────────────────────────────────────────────────

/** Fila del resumen ya formateada y, si aplica, enmascarada (R-03.2–R-03.4, R-03.24). */
export interface SummaryRow {
  fieldDocumentId: string;
  label: string;
  displayValue: string;
}

/** Textos del catálogo que necesita el formateo del resumen (R-03.3, R-03.22). */
export interface SummaryCopy {
  yes: string;
  no: string;
  notProvided: string;
}

export interface SummaryBlocks {
  policyholder: readonly SummaryRow[];
  vehicle: readonly SummaryRow[];
}

/** Vista del Paso 3 (SPEC-US-03 §4). */
export interface Step3ViewModel extends SummaryBlocks {
  plan: { name: string; shortDescription: string | null; coverageNames: readonly string[]; finalPriceText: string };
  priceChangedNotice: { newPriceText: string } | null;
}

/** Términos listos para render como `<p>` de texto plano (R-03.7, AC-03.16). */
export interface TermsView {
  title: string;
  version: string;
  paragraphs: readonly string[];
}

/** Condición de habilitación de "Pagar" (R-03.9, GAP-03.13). */
export interface CanPayInput {
  termsLoaded: boolean;
  termsAccepted: boolean;
  isProcessing: boolean;
  paymentConfirmed: boolean;
  summaryValid: boolean;
}

/** Modo de simulación, solo en memoria (R-03.21). */
export type PaymentSimulationMode = 'approved' | 'rejected';

/** Solicitud al simulador: sin datos de tarjeta ni red (R-03.10, R-03.23). */
export interface PaymentRequest {
  /** Código en minúsculas. */
  country: string;
  planDocumentId: string;
  finalPrice: number;
  mode: PaymentSimulationMode;
}

/** Resultado del pago simulado (R-03.10, R-03.12, AC-03.3, AC-03.4). */
export type PaymentResult =
  | { status: 'approved'; quoteNumber: string }
  | { status: 'rejected'; code: 'SIMULATED_REJECTION' };

/**
 * Servicio de simulación con guardia de una sola promesa en vuelo (R-03.11, GAP-03.6):
 * llamadas concurrentes reutilizan la misma promesa; tras `approved` no ejecuta nada más.
 */
export interface PaymentSimulationPort {
  pay(request: PaymentRequest): Promise<PaymentResult>;
}

/** Fuente de aleatoriedad inyectable (por defecto `crypto.getRandomValues`) (R-03.13). */
export type RandomBytesSource = (length: number) => Uint8Array;

// ─────────────────────────────────────────────────────────────────────────────
// 10. Navegación y estados de vista (uniones discriminadas, CLAUDE.md §7)
// ─────────────────────────────────────────────────────────────────────────────

export type QuoteStep = 'step-1' | 'step-2' | 'step-3' | 'confirmation';

/** Entrada de los guards (R-01.10, R-02.1, R-03.1, R-03.14). */
export interface StepAccessContext {
  state: QuoteState;
  /** Resultado de `validateStep1` contra la configuración vigente. */
  step1Errors: readonly FieldError[];
  /** `documentId` de planes activos frescos; `null` si el destino no los requiere. */
  activePlanDocumentIds: ReadonlySet<string> | null;
}

export type StepAccessDecision =
  | { kind: 'allow' }
  | {
      kind: 'redirect';
      to: QuoteStep;
      /** Campos a marcar como tocados al volver al Paso 1 (R-01.10). */
      touchFieldDocumentIds: readonly string[];
      notice: 'plan-unavailable' | null;
    };

/** Paso 1 (R-01.22). */
export type Step1ViewState =
  | { kind: 'loading' }
  | { kind: 'ready'; config: FormConfig }
  | { kind: 'empty' }
  | { kind: 'error'; retryable: true }
  | { kind: 'config-error'; issues: readonly ConfigIssue[] };

/** Paso 2 (R-02.15). */
export type Step2ViewState =
  | { kind: 'loading' }
  | {
      kind: 'ready';
      plans: readonly PricedPlan[];
      selectedPlanDocumentId: string | null;
      notice: 'plan-unavailable' | 'price-changed' | null;
    }
  | { kind: 'empty' }
  | { kind: 'error'; retryable: true }
  | { kind: 'config-error'; issues: readonly ConfigIssue[] };

/** Paso 3 (R-03.18; `empty` no aplica). */
export type Step3State =
  | { kind: 'loading' }
  | { kind: 'ready'; view: Step3ViewModel; terms: TermsView }
  | { kind: 'error'; retryable: true }
  | { kind: 'config-error'; issues: readonly ConfigIssue[] };

// ─────────────────────────────────────────────────────────────────────────────
// 11. Firmas de mappers y funciones puras (implementación en frontend/src/app/{core,domain}/...)
// ─────────────────────────────────────────────────────────────────────────────

// 11.1 Red y mapeo (core/http) — R-01.23, R-02.2, GAP-01.14, GAP-02.9
/** Sustituye `{code}` en `STRAPI_QUERIES[resource]`; `code` ya normalizado. */
export declare function buildStrapiUrl(resource: StrapiResource, code?: string): string;
export declare function isStrapiListResponse(raw: unknown): raw is StrapiListResponse<unknown>;
export declare function isStrapiCountryDto(value: unknown): value is StrapiCountryDto;
export declare function isStrapiCountryListItemDto(value: unknown): value is StrapiCountryListItemDto;
export declare function isStrapiFormFieldDto(value: unknown): value is StrapiFormFieldDto;
export declare function isStrapiInsurancePlanDto(value: unknown): value is StrapiInsurancePlanDto;
/** `/api/countries?filters[code]...` → país, `not-found` (0 elementos) o `config-error` (R-01.1, R-01.15). */
export declare function toCountryConfig(raw: unknown): CountryConfigResult;
/** Lista para `/country-not-found` (R-01.1). */
export declare function toCountryLinks(raw: unknown): readonly CountryLink[] | null;
/** Campos → configuración validada: roles, tipos, validadores, patrones, total ≤ 100 (R-01.2, R-01.6, R-01.11, R-01.23). */
export declare function buildFormConfig(country: CountryConfig, raw: unknown): FormConfigResult;
/** Planes crudos → dominio; `total > 100` o forma inválida → `config-error` (R-02.2). */
export declare function toInsurancePlans(
  raw: unknown,
): { kind: 'ok'; plans: readonly InsurancePlan[] } | { kind: 'config-error'; issues: readonly ConfigIssue[] };

// 11.2 País (domain/country) — R-01.1, AC-01.6
/** Minúsculas + `COUNTRY_CODE_PATTERN`; `null` si no es un código posible. */
export declare function normalizeCountryCode(raw: string): string | null;

// 11.3 Formulario (domain/form) — SPEC-US-01
export declare function sortFieldsForLayout(fields: readonly FormFieldConfig[]): readonly FormFieldConfig[];
export declare function resolveRoles(
  fields: readonly FormFieldConfig[],
): { kind: 'ok'; roles: FormConfig['roles'] } | { kind: 'config-error'; issues: readonly ConfigIssue[] };
/** Único acceso a campos de negocio: por rol, nunca por `key` (R-01.12). */
export declare function getFieldByRole(config: FormConfig, role: BusinessRole): FormFieldConfig | undefined;
/** Primer fallo según la precedencia de GAP-01.12; `null` si es válido (R-01.4–R-01.6, R-01.13–R-01.19, R-01.29). */
export declare function validateField(
  field: FormFieldConfig,
  value: Step1Value,
  context: FieldValidationContext,
): FieldError | null;
/** Pura; la usan "Continuar" y los guards de Paso 2 y 3 (R-01.10, R-02.1, R-03.1). */
export declare function validateStep1(config: FormConfig, values: Step1Values, now: Date): readonly FieldError[];
/** `YYYY-MM-DD` sin `new Date(string)`; fecha inexistente → `null` (R-01.13). */
export declare function parseIsoDate(value: string): CalendarDate | null;
export declare function toLocalCalendarDate(now: Date): CalendarDate;
/** Años cumplidos por fecha calendario local; 29-feb cumple el 1-mar en no bisiestos (R-01.13, R-02.7). */
export declare function calculateAge(birth: CalendarDate, today: CalendarDate): number;
/** Trim, sin puntos ni espacios, `k`→`K`, con guion antes del DV (R-01.18). */
export declare function normalizeRut(raw: string): string;
/** Forma `^[0-9]{7,8}-?[0-9K]$` + Módulo 11 sobre el valor normalizado (R-01.18). */
export declare function isValidRut(normalized: string): boolean;
/** Trim, sin espacios ni guiones, mayúsculas (R-01.19). */
export declare function normalizePlate(raw: string): string;
/** Solo `trim()` (R-01.29). */
export declare function normalizeEmail(raw: string): string;
export declare function inputAttributesForRole(role: SemanticRole): InputAttributes;
export declare function hydrateValues(config: FormConfig, stored: Step1Values): HydrationResult;

// 11.4 Almacenamiento (core/storage) — R-01.8, R-01.20, R-01.24, R-03.15
export declare function quoteStorageKey(countryCode: string): QuoteStorageKey;
/** JSON inválido o `schemaVersion !== 1` → `null` (el llamador borra la clave). */
export declare function parseQuoteState(raw: string | null): QuoteState | null;
export declare function emptyQuoteState(): QuoteState;

// 11.5 Precio (domain/pricing) — SPEC-US-02
/** Factor de la opción elegida en el campo con rol `city` (R-02.21–R-02.23). */
export declare function resolveCityAdjustment(config: FormConfig, values: Step1Values): CityAdjustmentResult;
/** Localiza `vehicle_year`, `birth_date` y `city` por rol y los valida (R-02.7, R-02.8). */
export declare function resolvePricingFactors(config: FormConfig, values: Step1Values): PricingFactorsResult;
/** `Math.floor((basePrice * (100 + pctVehículo + pctEdad + pctCiudad) + 50) / 100)`; entero ≥ 0 (R-02.6). */
export declare function calculateAdjustedPrice(input: PricingInput): number;
/** `Intl.NumberFormat(country.locale, { style: 'currency', currency: country.currencyCode, 0 decimales })` (R-02.5). */
export declare function formatPrice(
  amount: number,
  country: Pick<CountryConfig, 'locale' | 'currencyCode'>,
): FormatPriceResult;
/** Excluye `isActive !== true`, `basePrice` no entero/negativo/nulo y sin `name` (R-02.3, R-02.4). */
export declare function sanitizePlans(plans: readonly InsurancePlan[]): SanitizedPlans;
/** `documentId` del primer `isRecommended`, o `null` (R-02.10). */
export declare function pickRecommended(plans: readonly ValidInsurancePlan[]): string | null;
/** Primer plan con `declaredCurrency !== country.currencyCode` (incluye ausente o fuera del enum) → issue; si no, `null` (R-02.19, R-03.25). */
export declare function assertPlanCurrency(
  plans: readonly InsurancePlan[],
  country: Pick<CountryConfig, 'currencyCode'>,
): ConfigIssue | null;

// 11.6 Resumen y pago (domain/summary, domain/payment) — SPEC-US-03
export declare function buildSummaryRows(
  config: FormConfig,
  values: Step1Values,
  copy: SummaryCopy,
): SummaryBlocks;
/** Formato por tipo (R-03.3); enmascara solo el rol `document_number` (R-03.4); `email` sin máscara (R-03.24). */
export declare function formatSummaryValue(
  field: FormFieldConfig,
  value: Step1Value,
  locale: string,
  copy: SummaryCopy,
): string;
/** Sobre el valor normalizado (trim, sin puntos ni espacios): 0→'', 1→'*', 2–4→'*'×(n-1)+último, >4→'*'×(n-4)+últimos 4 (R-03.4). */
export declare function maskDocumentNumber(value: string): string;
/** Divide por `\n{2,}`, recorta y descarta bloques vacíos (R-03.7). */
export declare function splitTerms(content: string): readonly string[];
export declare function canPay(input: CanPayInput): boolean;
/** `COT-<PAÍS>-<YYYYMMDD local>-<4 HEX>` (R-03.13). */
export declare function generateQuoteNumber(now: Date, random: RandomBytesSource, countryCode: string): string;

// 11.7 Guards (core/guards) — R-01.10, R-02.1, R-03.1, R-03.14
export declare function decideStepAccess(target: QuoteStep, context: StepAccessContext): StepAccessDecision;
