import type { PricingFactorsResult, PricingInput, FormConfig, Step1Values } from '../../core/contracts/strapi-contracts';
import { calculateAge, parseIsoDate, toLocalCalendarDate } from '../form/calendar';
import { resolveCityAdjustment } from './city-adjustment';
import { DRIVER_AGE_RULE, VEHICLE_AGE_TIERS, VEHICLE_OLDEST_PCT } from './pricing-rules';

/** Porcentaje por antigüedad del vehículo (puede ser negativa para un año futuro → primer tramo). */
export function vehicleAdjustmentPct(vehicleAge: number): number {
  for (const tier of VEHICLE_AGE_TIERS) if (vehicleAge <= tier.maxAge) return tier.pct;
  return VEHICLE_OLDEST_PCT;
}

export function driverAdjustmentPct(age: number): number {
  return age < DRIVER_AGE_RULE.youngerThan ? DRIVER_AGE_RULE.pct : 0;
}

/**
 * Localiza `vehicle_year`, `birth_date` y `city` por rol y los valida (R-02.7, R-02.8). Dato ausente, fecha
 * inválida, año no entero o ajuste de ciudad inválido → error tipado (nunca `NaN`).
 */
export function resolvePricingFactors(config: FormConfig, values: Step1Values): PricingFactorsResult {
  const yearRaw = values[config.roles.vehicle_year.documentId];
  const birthRaw = values[config.roles.birth_date.documentId];
  const yearText = typeof yearRaw === 'string' ? yearRaw.trim() : '';
  if (!/^[0-9]{4}$/.test(yearText)) return { kind: 'config-error', issue: { code: 'invalid-pricing-input', role: 'vehicle_year' } };
  const birthText = typeof birthRaw === 'string' ? birthRaw.trim() : '';
  if (parseIsoDate(birthText) === null) return { kind: 'config-error', issue: { code: 'invalid-pricing-input', role: 'birth_date' } };
  const city = resolveCityAdjustment(config, values);
  if (city.kind === 'config-error') return city;
  return { kind: 'ok', factors: { vehicleYear: Number(yearText), birthDate: birthText, cityAdjustmentPct: city.pct } };
}

/**
 * `Math.floor((base * (100 + pctVehículo + pctEdad + pctCiudad) + 50) / 100)`: enteros, half-up, sin flotantes
 * (R-02.6). La edad usa `calculateAge` de US-01 sobre la fecha calendario local; el reloj es inyectable.
 */
export function calculateAdjustedPrice(input: PricingInput): number {
  const today = toLocalCalendarDate(input.now);
  const birth = parseIsoDate(input.birthDate);
  const age = birth ? calculateAge(birth, today) : Number.NaN;
  const total = vehicleAdjustmentPct(today.year - input.vehicleYear) + driverAdjustmentPct(age) + input.cityAdjustmentPct;
  return Math.floor((input.basePrice * (100 + total) + 50) / 100);
}
