import type {
  FormConfig,
  FormFieldConfig,
  HydrationResult,
  Step1Value,
  Step1Values,
} from '../../core/contracts/strapi-contracts';

function isCompatible(field: FormFieldConfig, value: Step1Value): boolean {
  if (value === null) return true;
  if (field.type === 'checkbox') return typeof value === 'boolean';
  if (typeof value !== 'string') return false;
  if (field.type === 'select') return value === '' || field.options.some((o) => o.value === value);
  return true;
}

/**
 * Hidratación tolerante (R-01.9, GAP-01.11): ignora `documentId` sin campo publicado, descarta valores de
 * tipo distinto y de `select` con opción inexistente; los campos sin valor quedan vacíos (ausentes).
 */
export function hydrateValues(config: FormConfig, stored: Step1Values): HydrationResult {
  const byId = new Map(config.fields.map((f) => [f.documentId, f]));
  const values: Record<string, Step1Value> = {};
  const discarded: string[] = [];
  for (const [documentId, value] of Object.entries(stored)) {
    const field = byId.get(documentId);
    if (!field || !isCompatible(field, value)) {
      discarded.push(documentId);
      continue;
    }
    values[documentId] = value;
  }
  return { values, discardedFieldDocumentIds: discarded };
}

/** Valor inicial de control: checkbox `false`, el resto texto vacío. */
export function initialControlValue(field: FormFieldConfig, stored: Step1Value | undefined): string | boolean {
  if (field.type === 'checkbox') return stored === true;
  return typeof stored === 'string' ? stored : '';
}
