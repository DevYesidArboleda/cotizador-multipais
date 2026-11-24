import { buildReadyConfig, fieldOf } from '../../testing/form-fixtures';
import { calculateAdjustedPrice, driverAdjustmentPct, resolvePricingFactors, vehicleAdjustmentPct } from './pricing';

const NOW = new Date(2026, 10, 23, 12, 0, 0);
const price = (basePrice: number, vehicleYear: number, birthDate: string, cityAdjustmentPct = 0): number =>
  calculateAdjustedPrice({ basePrice, vehicleYear, birthDate, cityAdjustmentPct, now: NOW });

describe('[R-02.6][AC-02.6] regla de precio sin ajuste de ciudad', () => {
  it.each([
    [1_000_000, 2025, '2005-01-01', 1_220_000],
    [850_000, 2020, '1990-05-10', 850_000],
    [1_234_567, 2012, '2004-12-01', 1_567_900],
    [1_010, 2010, '1990-01-01', 1_162],
    [450_000, 2027, '1980-01-01', 495_000],
  ])('[R-02.6][AC-02.6] base %i, año %i, nacido %s -> %i', (base, year, birth, expected) => {
    expect(price(base, year, birth)).toBe(expected);
  });

  it('[R-02.6][AC-02.6] fronteras de antigüedad del vehículo', () => {
    expect(vehicleAdjustmentPct(3)).toBe(10);
    expect(vehicleAdjustmentPct(4)).toBe(0);
    expect(vehicleAdjustmentPct(10)).toBe(0);
    expect(vehicleAdjustmentPct(11)).toBe(15);
    expect(vehicleAdjustmentPct(-1)).toBe(10);
    expect(price(100_000, 2023, '1990-01-01')).toBe(110_000);
    expect(price(100_000, 2022, '1990-01-01')).toBe(100_000);
    expect(price(100_000, 2016, '1990-01-01')).toBe(100_000);
    expect(price(100_000, 2015, '1990-01-01')).toBe(115_000);
  });

  it('[R-02.6][AC-02.6] fronteras de edad del tomador (25 hoy = 0, 24 hoy = +12)', () => {
    expect(driverAdjustmentPct(25)).toBe(0);
    expect(driverAdjustmentPct(24)).toBe(12);
    expect(price(100_000, 2020, '2001-11-23')).toBe(100_000);
    expect(price(100_000, 2020, '2001-11-24')).toBe(112_000);
  });
});

describe('[R-02.6][AC-02.22] regla de precio con ajuste de ciudad', () => {
  it.each([
    [1_000_000, 2025, '1990-01-01', 8, 1_180_000],
    [1_000_000, 2025, '2005-01-01', 8, 1_300_000],
    [850_000, 2020, '1990-05-10', 5, 892_500],
    [1_234_567, 2012, '2004-12-01', 3, 1_604_937],
    [1_010, 2020, '1990-01-01', 5, 1_061],
    [1_000_000, 2020, '1990-01-01', -5, 950_000],
    [100_000, 2015, '2001-11-24', 30, 157_000],
    [100_000, 2020, '1990-01-01', -10, 90_000],
  ])('[R-02.6][AC-02.22] base %i año %i nacido %s ciudad %i -> %i', (base, year, birth, pct, expected) => {
    expect(price(base, year, birth, pct)).toBe(expected);
  });
});

describe('[R-02.7][R-02.8] localización por rol y errores tipados', () => {
  const config = buildReadyConfig();
  const values = (year: string, birth: string, city = '') => ({
    [fieldOf(config, 'vehicle_year').documentId]: year,
    [fieldOf(config, 'birth_date').documentId]: birth,
    [fieldOf(config, 'city').documentId]: city,
  });

  it('[R-02.7] los factores se localizan por semanticRole', () => {
    const result = resolvePricingFactors(config, values('2020', '1990-01-01', 'bogota'));
    expect(result).toEqual({ kind: 'ok', factors: { vehicleYear: 2020, birthDate: '1990-01-01', cityAdjustmentPct: 8 } });
  });

  it('[R-02.7] renombrar el key de los campos no cambia el resultado', () => {
    const renamed = buildReadyConfig({
      mutate: (fields) => fields.map((f) => ({ ...f, key: `k_${Math.random().toString(36).slice(2)}` })),
    });
    const v = {
      [fieldOf(renamed, 'vehicle_year').documentId]: '2020',
      [fieldOf(renamed, 'birth_date').documentId]: '1990-01-01',
    };
    expect(resolvePricingFactors(renamed, v).kind).toBe('ok');
  });

  it('[R-02.8] año no entero, vacío o fecha inválida producen config-error, nunca NaN', () => {
    expect(resolvePricingFactors(config, values('20x0', '1990-01-01'))).toMatchObject({ kind: 'config-error', issue: { code: 'invalid-pricing-input', role: 'vehicle_year' } });
    expect(resolvePricingFactors(config, values('', '1990-01-01')).kind).toBe('config-error');
    expect(resolvePricingFactors(config, values('2020', '1990-02-31'))).toMatchObject({ kind: 'config-error', issue: { role: 'birth_date' } });
  });

  it('[R-02.8] el resultado es siempre un entero >= 0', () => {
    for (const base of [0, 1, 99, 1_010, 123_457]) {
      const p = price(base, 2015, '2001-11-24', 30);
      expect(Number.isInteger(p) && p >= 0).toBe(true);
    }
  });
});
