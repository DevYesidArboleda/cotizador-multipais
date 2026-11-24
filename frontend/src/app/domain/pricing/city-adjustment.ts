import type { CityAdjustmentResult, FormConfig, Step1Values } from '../../core/contracts/strapi-contracts';
import { CITY_ADJUSTMENT_MAX_PCT, CITY_ADJUSTMENT_MIN_PCT } from './pricing-rules';

/**
 * Factor de la OPCIÓN ELEGIDA del único campo con rol `city` (R-02.21 a R-02.23, GAP-02.19).
 * Ausencia legítima (sin campo, sin valor, opción inexistente, sin atributo) → 0. Valor presente pero inválido
 * (no entero, texto, fuera de `[-10, +30]`) → `config-error` que nombra el campo y la opción.
 */
export function resolveCityAdjustment(config: FormConfig, values: Step1Values): CityAdjustmentResult {
  const field = config.roles.city;
  if (!field) return { kind: 'ok', pct: 0 };
  const selected = values[field.documentId];
  if (typeof selected !== 'string' || selected === '') return { kind: 'ok', pct: 0 };
  const option = field.options.find((o) => o.value === selected);
  if (!option) return { kind: 'ok', pct: 0 };
  const pct = option.priceAdjustmentPct;
  if (pct === null || pct === undefined) return { kind: 'ok', pct: 0 };
  if (typeof pct !== 'number' || !Number.isInteger(pct) || pct < CITY_ADJUSTMENT_MIN_PCT || pct > CITY_ADJUSTMENT_MAX_PCT) {
    return {
      kind: 'config-error',
      issue: { code: 'invalid-city-adjustment', fieldDocumentId: field.documentId, fieldLabel: field.label, optionLabel: option.label, value: pct },
    };
  }
  return { kind: 'ok', pct };
}
