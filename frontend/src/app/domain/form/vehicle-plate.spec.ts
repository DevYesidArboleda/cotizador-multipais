import { buildReadyConfig, CO_PLATE_PATTERN, fieldOf, TODAY } from '../../testing/form-fixtures';
import { normalizeFieldValue, validateField } from './field-validators';
import { normalizePlate } from './normalizers';

const co = buildReadyConfig();
const cl = buildReadyConfig({ country: 'cl' });
const run = (config: typeof co, value: string) =>
  validateField(fieldOf(config, 'vehicle_plate'), value, { config, values: {}, now: TODAY }) === null;

describe('[R-01.19] placa y patente', () => {
  it.each([
    ['abc123', true],
    ['ABC-123', true],
    ['ABC12D', true],
    ['xyz 12a', true],
    ['AB12', false],
    ['ABCD123', false],
    ['ABC1234', false],
    ['ABC1D2', false],
    ['AB123C', false],
    ['ABC12', false],
  ])('[R-01.19][AC-01.15][AC-01.31] CO %s → válido=%s', (value, expected) => {
    expect(run(co, value)).toBe(expected);
  });

  it.each([
    ['BBBB12', true],
    ['BB1234', true],
    ['bb-12-34', true],
    ['BBB123', false],
    ['BB123', false],
  ])('[R-01.19][AC-01.15] CL %s → válido=%s', (value, expected) => {
    expect(run(cl, value)).toBe(expected);
  });

  it('[R-01.19] se normaliza antes del patrón y se guarda normalizada', () => {
    expect(normalizePlate('  ab-c 12d ')).toBe('ABC12D');
    expect(normalizeFieldValue(fieldOf(co, 'vehicle_plate'), 'xyz-12a')).toBe('XYZ12A');
  });

  it('[R-01.31][AC-01.31] AAA123 y AAA12A son válidas con el patrón de auto y moto', () => {
    expect(run(co, 'AAA123')).toBe(true);
    expect(run(co, 'AAA12A')).toBe(true);
    expect(run(co, 'xyz-12a')).toBe(true);
  });

  it('[R-01.31][AC-01.32] si negocio cambia el patrón a solo auto, ABC12D pasa a inválida sin tocar el código', () => {
    const autoOnly = buildReadyConfig({
      mutate: (fields) =>
        fields.map((f) =>
          f.semanticRole === 'vehicle_plate' ? { ...f, validation: { validatorKey: 'none' as const, pattern: '^[A-Z]{3}[0-9]{3}$' } } : f,
        ),
    });
    expect(run(autoOnly, 'ABC12D')).toBe(false);
    expect(run(autoOnly, 'ABC123')).toBe(true);
    expect(CO_PLATE_PATTERN).toBe('^[A-Z]{3}[0-9]{2}[0-9A-Z]$');
  });
});
