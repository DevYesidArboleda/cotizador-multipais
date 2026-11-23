import { toCountryConfig } from '../../core/http/mappers';
import { buildReadyConfig, countryDto, fieldOf, listOf, TODAY, validValues } from '../../testing/form-fixtures';
import { validateField } from './field-validators';

describe('[R-01.15] parámetros de reglas por país', () => {
  it('[R-01.15][AC-01.11] con legalAge 21 una persona de 20 años es inválida', () => {
    const config = buildReadyConfig({ countryOverrides: { legalAge: 21 } });
    const birth = fieldOf(config, 'birth_date');
    const ctx = { config, values: validValues(config), now: TODAY };
    expect(validateField(birth, '2006-11-23', ctx)).not.toBeNull(); // 20 años
    expect(validateField(birth, '2005-11-23', ctx)).toBeNull(); // 21 años
  });

  it('[R-01.15][AC-01.11] con vehicleMaxAgeYears 10 y año actual 2026, 2015 es inválido y 2016 válido', () => {
    const config = buildReadyConfig({ countryOverrides: { vehicleMaxAgeYears: 10, vehicleMaxFutureYears: 0 } });
    const year = fieldOf(config, 'vehicle_year');
    const ctx = { config, values: validValues(config), now: TODAY };
    expect(validateField(year, '2015', ctx)).not.toBeNull();
    expect(validateField(year, '2016', ctx)).toBeNull();
    expect(validateField(year, '2027', ctx)).not.toBeNull();
  });

  it.each([
    ['legalAge', -1],
    ['legalAge', 18.5],
    ['legalAge', '18'],
    ['vehicleMaxAgeYears', null],
    ['vehicleMaxFutureYears', -3],
  ])('[R-01.15] %s = %s produce config-error con el parámetro nombrado', (param, value) => {
    const result = toCountryConfig(listOf([countryDto({ [param]: value })]));
    expect(result.kind).toBe('config-error');
    if (result.kind === 'config-error') {
      expect(result.issues).toEqual([{ code: 'invalid-country-param', param, value }]);
    }
  });

  it('[R-01.15] un país sin registro es not-found (no config-error)', () => {
    expect(toCountryConfig(listOf([]))).toEqual({ kind: 'not-found' });
  });
});
