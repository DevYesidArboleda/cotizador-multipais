import { buildReadyConfig, fieldOf, TODAY } from '../../testing/form-fixtures';
import { normalizeFieldValue, validateField } from './field-validators';
import { isValidRut, normalizeRut } from './normalizers';

const config = buildReadyConfig({ country: 'cl' });
const rut = fieldOf(config, 'document_number');
const valid = (raw: string) => validateField(rut, raw, { config, values: {}, now: TODAY }) === null;

describe('[R-01.18] RUT chileno (Módulo 11)', () => {
  it.each([
    ['12.345.678-5', true],
    ['12345678-5', true],
    ['1.000.005-K', true],
    ['1000005k', true],
    ['9.000.002-0', true],
    ['12.345.678-K', false],
    ['12.345.678', false],
    ['1.234-5', false],
    ['abc', false],
  ])('[R-01.18][AC-01.14] %s → válido=%s', (raw, expected) => {
    expect(valid(raw)).toBe(expected);
  });

  it('[R-01.18] normaliza: sin puntos ni espacios, K mayúscula y guion antes del DV', () => {
    expect(normalizeRut(' 12.345.678-5 ')).toBe('12345678-5');
    expect(normalizeRut('1000005k')).toBe('1000005-K');
    expect(isValidRut('1000005-K')).toBe(true);
    expect(isValidRut('1000005K')).toBe(true);
  });

  it('[R-01.18] el valor guardado es el normalizado con guion, pero un RUT inválido no se deforma', () => {
    expect(normalizeFieldValue(rut, '12.345.678-5')).toBe('12345678-5');
    expect(normalizeFieldValue(rut, '12.345.678-K')).toBe('12.345.678-K');
  });

  it('[R-01.18] el RUT es obligatorio: vacío falla con el mensaje del campo', () => {
    const error = validateField(rut, '  ', { config, values: {}, now: TODAY });
    expect(error?.rule).toBe('required');
    expect(error?.message).toBe(rut.errorMessage);
  });
});
