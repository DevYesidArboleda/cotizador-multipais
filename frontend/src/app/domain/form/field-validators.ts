import type {
  FieldError,
  FieldValidationContext,
  FormFieldConfig,
  Step1Value,
  ValidationRule,
} from '../../core/contracts/strapi-contracts';
import { calculateAge, isAfter, parseIsoDate, toLocalCalendarDate } from './calendar';
import { isValidRut, normalizeEmail, normalizePlate, normalizeRut } from './normalizers';

const NUMERIC_LITERAL = /^-?[0-9]+(\.[0-9]+)?$/;
const FOUR_DIGITS = /^[0-9]{4}$/;

function fail(field: FormFieldConfig, rule: ValidationRule, message = field.errorMessage): FieldError {
  return { fieldDocumentId: field.documentId, rule, message };
}

/** Valor tal como se valida: recortado y normalizado por rol (placa, correo). */
export function comparableText(field: FormFieldConfig, value: Step1Value): string {
  if (typeof value !== 'string') return '';
  if (field.semanticRole === 'vehicle_plate') return normalizePlate(value);
  if (field.semanticRole === 'email') return normalizeEmail(value);
  return value.trim();
}

/**
 * Valor que se guarda tras `blur`/envío (R-01.18, R-01.19, R-01.29): placa normalizada, correo recortado,
 * RUT con guion solo si es válido (no se deforma una entrada incompleta).
 */
export function normalizeFieldValue(field: FormFieldConfig, value: Step1Value): Step1Value {
  if (typeof value !== 'string') return value;
  if (field.semanticRole === 'vehicle_plate') return normalizePlate(value);
  if (field.semanticRole === 'email') return normalizeEmail(value);
  if (field.validation.validatorKey === 'cl_rut') {
    const rut = normalizeRut(value);
    return isValidRut(rut) ? rut : value;
  }
  return value;
}

export function isEmptyValue(field: FormFieldConfig, value: Step1Value): boolean {
  if (field.type === 'checkbox') return value !== true;
  return typeof value !== 'string' || value.trim() === '';
}

/**
 * Primer fallo según la precedencia de GAP-01.12; `null` si es válido (R-01.4–R-01.6, R-01.13–R-01.19, R-01.29).
 * Un solo mensaje por campo: `errorMessage` o, para el patrón dependiente, `validationMessage` de la opción.
 */
export function validateField(
  field: FormFieldConfig,
  value: Step1Value,
  context: FieldValidationContext,
): FieldError | null {
  const v = field.validation;

  // 1. Obligatoriedad (R-01.5)
  if (isEmptyValue(field, value)) return field.required ? fail(field, 'required') : null;
  if (field.type === 'checkbox') return null;
  const text = comparableText(field, value);

  // 2. Tipo y rangos declarativos (R-01.6): cada validador solo aplica a su tipo
  if (field.type === 'select') {
    return field.options.some((o) => o.value === text) ? null : fail(field, 'required');
  }
  if (field.type === 'number') {
    if (!NUMERIC_LITERAL.test(text)) return fail(field, 'numeric');
    const n = Number(text);
    if (v.min !== null && n < v.min) return fail(field, 'min');
    if (v.max !== null && n > v.max) return fail(field, 'max');
  }
  if (field.type === 'text') {
    if (v.minLength !== null && text.length < v.minLength) return fail(field, 'min-length');
    if (v.maxLength !== null && text.length > v.maxLength) return fail(field, 'max-length');
    // El patrón dependiente reemplaza al patrón estático (GAP-01.6): se evalúa al final.
    if (v.pattern && v.validatorKey !== 'depends_on_option_pattern' && !v.pattern.regex.test(text)) {
      return fail(field, 'pattern');
    }
  }
  if (field.type === 'date') {
    const date = parseIsoDate(text);
    if (!date) return fail(field, field.semanticRole === 'birth_date' ? 'legal-age' : 'pattern');
  }

  // 3. Reglas por rol / validatorKey (siempre por rol: GAP-01.3, nunca por `key`)
  const { country } = context.config;
  if (field.semanticRole === 'birth_date') {
    const birth = parseIsoDate(text);
    const today = toLocalCalendarDate(context.now);
    if (!birth || isAfter(birth, today) || calculateAge(birth, today) < country.rules.legalAge) {
      return fail(field, 'legal-age');
    }
  }
  if (field.semanticRole === 'vehicle_year') {
    const year = Number(text);
    const current = toLocalCalendarDate(context.now).year;
    const inRange =
      FOUR_DIGITS.test(text) &&
      year >= current - country.rules.vehicleMaxAgeYears &&
      year <= current + country.rules.vehicleMaxFutureYears;
    if (!inRange) return fail(field, 'vehicle-year-range');
  }
  if (v.validatorKey === 'cl_rut' && !isValidRut(normalizeRut(text))) return fail(field, 'cl-rut');

  // 4. Patrón dependiente de la opción elegida en el campo `dependsOnRole` (R-01.16)
  if (v.validatorKey === 'depends_on_option_pattern' && v.dependsOnRole !== null) {
    const source = context.config.roles[v.dependsOnRole];
    const selected = source ? context.values[source.documentId] : null;
    if (source && typeof selected === 'string' && selected !== '') {
      const option = source.options.find((o) => o.value === selected);
      const pattern = option?.validationPattern ?? v.pattern;
      if (pattern && !pattern.regex.test(text)) {
        return fail(field, 'dependent-pattern', option?.validationMessage ?? field.errorMessage);
      }
    }
  }
  return null;
}

/** ¿Debe verse el error? Solo tras `blur` del campo o tras un intento de envío (R-01.26, GAP-01.19). */
export function isErrorVisible(error: FieldError | null, touched: boolean, submitted: boolean): boolean {
  return error !== null && (touched || submitted);
}
