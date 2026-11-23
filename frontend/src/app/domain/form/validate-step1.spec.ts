import { buildReadyConfig, fieldDto, fieldOf, TODAY, validValues } from '../../testing/form-fixtures';
import { validateStep1 } from './validate-step1';

describe('[R-01.10] validateStep1 (pura, compartida con los guards)', () => {
  const config = buildReadyConfig();

  it('[R-01.10] con datos completos no devuelve errores', () => {
    expect(validateStep1(config, validValues(config), TODAY)).toEqual([]);
  });

  it('[R-01.10] con el Paso 1 vacío devuelve un error por cada campo requerido, en orden de campos', () => {
    const errors = validateStep1(config, {}, TODAY);
    const required = config.fields.filter((f) => f.required).map((f) => f.documentId);
    expect(errors.map((e) => e.fieldDocumentId)).toEqual(required);
  });

  it('[R-01.10] es determinista: misma entrada, mismo resultado, y no muta los valores', () => {
    const values = { ...validValues(config), [fieldOf(config, 'email').documentId]: 'x' };
    const snapshot = JSON.stringify(values);
    expect(validateStep1(config, values, TODAY)).toEqual(validateStep1(config, values, TODAY));
    expect(JSON.stringify(values)).toBe(snapshot);
  });

  it('[R-01.10][AC-01.21] un campo nuevo requerido publicado después hace inválido el Paso 1 ya completado', () => {
    const before = validValues(config);
    expect(validateStep1(config, before, TODAY)).toEqual([]);
    const withNew = buildReadyConfig({
      mutate: (f) => [...f, fieldDto({ key: 'nuevo', semanticRole: 'none', type: 'text', errorMessage: 'Campo nuevo requerido' })],
    });
    const errors = validateStep1(withNew, before, TODAY);
    expect(errors).toHaveLength(1);
    expect(errors[0]?.message).toBe('Campo nuevo requerido');
  });
});
