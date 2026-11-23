import type { FieldError, FormConfig, FormFieldConfig, Step1Values } from '../../core/contracts/strapi-contracts';
import { validateField } from './field-validators';

/**
 * Pura; la usan "Continuar" y los guards de Paso 2 y 3 (R-01.10). Devuelve los errores en orden de campos.
 * Un valor ausente en `values` equivale a vacío.
 */
export function validateStep1(config: FormConfig, values: Step1Values, now: Date): readonly FieldError[] {
  const errors: FieldError[] = [];
  for (const field of config.fields) {
    const error = validateField(field, values[field.documentId] ?? null, { config, values, now });
    if (error) errors.push(error);
  }
  return errors;
}

/**
 * Campos cuyo patrón depende del rol del campo que cambió (R-01.16, AC-01.13): se revalidan de inmediato
 * si tienen valor.
 */
export function dependentFieldIds(config: FormConfig, changed: FormFieldConfig, values: Step1Values): readonly string[] {
  if (changed.semanticRole === 'none') return [];
  return config.fields
    .filter(
      (f) =>
        f.validation.validatorKey === 'depends_on_option_pattern' &&
        f.validation.dependsOnRole === changed.semanticRole &&
        typeof values[f.documentId] === 'string' &&
        (values[f.documentId] as string).trim() !== '',
    )
    .map((f) => f.documentId);
}
