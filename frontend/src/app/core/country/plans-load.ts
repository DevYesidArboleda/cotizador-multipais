import type { ConfigIssue, CountryConfig, ValidInsurancePlan } from '../contracts/strapi-contracts';
import { toInsurancePlans } from '../http/mappers';
import { formatPrice } from '../../domain/pricing/format-price';
import { assertPlanCurrency, pickRecommended, sanitizePlans } from '../../domain/pricing/plans';

/** Resultado de cargar y depurar los planes del país (R-02.2 a R-02.4, R-02.15, R-02.19). */
export type PlansLoadResult =
  | { kind: 'ok'; plans: readonly ValidInsurancePlan[]; recommendedDocumentId: string | null }
  | { kind: 'empty' }
  | { kind: 'error' }
  | { kind: 'config-error'; issues: readonly ConfigIssue[] };

/** Respuesta cruda → resultado discriminado. `empty` solo con 200 y 0 planes válidos (GAP-02.15). */
export function resolvePlansLoad(rawPlans: unknown, country: CountryConfig): PlansLoadResult {
  const mapped = toInsurancePlans(rawPlans);
  if (mapped.kind === 'config-error') return mapped;
  const formatCheck = formatPrice(0, country);
  if (formatCheck.kind === 'config-error') return { kind: 'config-error', issues: [formatCheck.issue] };
  const currencyIssue = assertPlanCurrency(mapped.plans, country);
  if (currencyIssue) return { kind: 'config-error', issues: [currencyIssue] };
  const { valid } = sanitizePlans(mapped.plans);
  if (valid.length === 0) return { kind: 'empty' };
  return { kind: 'ok', plans: valid, recommendedDocumentId: pickRecommended(valid) };
}
