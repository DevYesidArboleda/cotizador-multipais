import { buildReadyConfig, fieldOf, TODAY, validValues } from '../../testing/form-fixtures';
import { validateField } from './field-validators';

const config = buildReadyConfig();
const year = fieldOf(config, 'vehicle_year');
const check = (value: string) => validateField(year, value, { config, values: validValues(config), now: TODAY });

describe('[R-01.14] año del vehículo', () => {
  it.each([
    ['2005', false],
    ['2006', true],
    ['2027', true],
    ['2028', false],
    ['2020.5', false],
    ['-2020', false],
    ['1e3', false],
    ['abc', false],
  ])('[R-01.14][AC-01.10] %s con año actual 2026, 20 y 1 → válido=%s', (value, valid) => {
    expect(check(value) === null).toBe(valid);
  });

  it('[R-01.14] el año tecleado como 202 (3 dígitos) es inválido', () => {
    expect(check('202')).not.toBeNull();
  });
});
