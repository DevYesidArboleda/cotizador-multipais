import { buildReadyConfig, fieldOf, TODAY, validValues } from '../../testing/form-fixtures';
import { calculateAge, parseIsoDate, toLocalCalendarDate } from './calendar';
import { validateField } from './field-validators';

const config = buildReadyConfig();
const birth = fieldOf(config, 'birth_date');
const check = (value: string, now: Date = TODAY) =>
  validateField(birth, value, { config, values: validValues(config), now });

describe('[R-01.13] mayoría de edad por fecha calendario local', () => {
  it.each([
    ['2008-11-22', true],
    ['2008-11-23', true],
    ['2008-11-24', false],
    ['2027-01-01', false],
    ['2008-02-30', false],
  ])('[R-01.13][AC-01.9] %s con legalAge 18 y hoy 2026-11-23 → válido=%s', (value, valid) => {
    expect(check(value) === null).toBe(valid);
  });

  it('[R-01.13] un valor que no es YYYY-MM-DD es inválido', () => {
    expect(check('23/11/2008')).not.toBeNull();
    expect(check('2008-13-01')).not.toBeNull();
  });

  it('[R-01.13] el 29-feb se cumple el 1-mar en años no bisiestos', () => {
    const born = parseIsoDate('2008-02-29');
    expect(born).not.toBeNull();
    if (!born) return;
    expect(calculateAge(born, { year: 2026, month: 2, day: 28 })).toBe(17);
    expect(calculateAge(born, { year: 2026, month: 3, day: 1 })).toBe(18);
    expect(calculateAge(born, { year: 2028, month: 2, day: 29 })).toBe(20);
  });

  it('[R-01.13] usa la fecha calendario LOCAL: no depende de UTC', () => {
    const lateNight = new Date(2026, 10, 23, 23, 59, 59);
    expect(toLocalCalendarDate(lateNight)).toEqual({ year: 2026, month: 11, day: 23 });
    expect(check('2008-11-23', lateNight)).toBeNull();
    const justBefore = new Date(2026, 10, 22, 23, 59, 59);
    expect(check('2008-11-23', justBefore)).not.toBeNull();
  });

  it('[R-01.13] parseIsoDate rechaza fechas inexistentes sin usar Date(string)', () => {
    expect(parseIsoDate('2024-02-29')).toEqual({ year: 2024, month: 2, day: 29 });
    expect(parseIsoDate('2026-02-29')).toBeNull();
    expect(parseIsoDate('2026-04-31')).toBeNull();
  });
});
