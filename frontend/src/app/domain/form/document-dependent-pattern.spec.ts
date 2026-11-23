import { buildReadyConfig, fieldOf, TODAY } from '../../testing/form-fixtures';
import { validateField } from './field-validators';
import { dependentFieldIds } from './validate-step1';

const config = buildReadyConfig();
const type = fieldOf(config, 'document_type');
const number = fieldOf(config, 'document_number');
const check = (docType: string | null, value: string) =>
  validateField(number, value, { config, values: { [type.documentId]: docType }, now: TODAY });

describe('[R-01.16] patrón del número según el tipo de documento', () => {
  it('[R-01.16][AC-01.12] con CC, 12345678 es válido; con CE es inválido con el mensaje de la opción', () => {
    expect(check('CC', '12345678')).toBeNull();
    const error = check('CE', '12345678');
    expect(error?.rule).toBe('dependent-pattern');
    expect(error?.message).toBe('Mensaje CE');
  });

  it('[R-01.17] CC acepta 6 a 10 dígitos y CE solo 6 o 7', () => {
    expect(check('CC', '12345')).not.toBeNull();
    expect(check('CC', '1234567890')).toBeNull();
    expect(check('CE', '1234567')).toBeNull();
  });

  it('[R-01.16] sin tipo seleccionado no se evalúa el patrón', () => {
    expect(check(null, 'abc')).toBeNull();
    expect(check('', 'abc')).toBeNull();
  });

  it('[R-01.16] sin patrón en la opción se usa el patrón del campo; sin ninguno, solo obligatoriedad', () => {
    const withFallback = buildReadyConfig({
      mutate: (fields) =>
        fields.map((f) =>
          f.semanticRole === 'document_type'
            ? { ...f, options: [{ label: 'Pasaporte', value: 'PA' }, ...(f.options ?? [])] }
            : f.semanticRole === 'document_number'
              ? { ...f, validation: { ...f.validation, validatorKey: 'depends_on_option_pattern' as const, dependsOnRole: 'document_type' as const, pattern: '^[A-Z]{2}[0-9]{4}$' } }
              : f,
        ),
    });
    const t = fieldOf(withFallback, 'document_type');
    const n = fieldOf(withFallback, 'document_number');
    const run = (v: string) => validateField(n, v, { config: withFallback, values: { [t.documentId]: 'PA' }, now: TODAY });
    expect(run('AB1234')).toBeNull();
    const bad = run('zzz');
    expect(bad?.message).toBe(n.errorMessage);

    const noPattern = buildReadyConfig();
    const n2 = fieldOf(noPattern, 'document_number');
    const t2 = fieldOf(noPattern, 'document_type');
    const open = { ...n2, validation: { ...n2.validation, pattern: null } };
    const ctx = { config: noPattern, values: { [t2.documentId]: 'PA' }, now: TODAY };
    expect(validateField(open, 'cualquier-cosa', ctx)).toBeNull();
    expect(validateField(open, '   ', ctx)?.rule).toBe('required');
  });

  it('[R-01.16][AC-01.13] cambiar el tipo identifica el número como campo a revalidar solo si tiene valor', () => {
    const withValue = { [number.documentId]: '12345678', [type.documentId]: 'CE' };
    expect(dependentFieldIds(config, type, withValue)).toEqual([number.documentId]);
    expect(dependentFieldIds(config, type, { [type.documentId]: 'CE' })).toEqual([]);
    expect(dependentFieldIds(config, number, withValue)).toEqual([]);
  });

  it('[AC-01.13] CC con 12345678 es válido, con CE pasa a inválido y al volver a CC el error desaparece', () => {
    expect(check('CC', '12345678')).toBeNull();
    expect(check('CE', '12345678')).not.toBeNull();
    expect(check('CC', '12345678')).toBeNull();
  });
});
