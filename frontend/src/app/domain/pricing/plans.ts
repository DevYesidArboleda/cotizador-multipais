import { CURRENCY_CODES } from '../../core/contracts/strapi-contracts';
import type {
  ConfigIssue,
  CountryConfig,
  InsurancePlan,
  SanitizedPlans,
  ValidInsurancePlan,
} from '../../core/contracts/strapi-contracts';

function isCurrencyCode(v: string | null): v is (typeof CURRENCY_CODES)[number] {
  return v !== null && (CURRENCY_CODES as readonly string[]).includes(v);
}

/**
 * Excluye con `console.warn` (sin datos personales) los planes con `isActive !== true`, `basePrice` no entero,
 * negativo o nulo, o sin `name` (R-02.3, R-02.4, AC-02.17). Conserva el orden recibido.
 */
export function sanitizePlans(plans: readonly InsurancePlan[]): SanitizedPlans {
  const valid: ValidInsurancePlan[] = [];
  const excluded: string[] = [];
  for (const plan of plans) {
    const { basePrice, name, declaredCurrency } = plan;
    const okPrice = typeof basePrice === 'number' && Number.isInteger(basePrice) && basePrice >= 0;
    const okName = typeof name === 'string' && name.trim() !== '';
    if (!plan.isActive || !okPrice || !okName || !isCurrencyCode(declaredCurrency)) {
      excluded.push(plan.documentId);
      if (plan.isActive) console.warn(`[plans] plan excluido por datos inválidos: ${plan.documentId}`);
      continue;
    }
    valid.push({ ...plan, name: name.trim(), basePrice, declaredCurrency });
  }
  return { valid, excludedDocumentIds: excluded };
}

/** `documentId` del PRIMER plan `isRecommended`; si hay más de uno, aviso y se ignoran los demás (R-02.10). */
export function pickRecommended(plans: readonly ValidInsurancePlan[]): string | null {
  const flagged = plans.filter((p) => p.isRecommended);
  if (flagged.length > 1) console.warn(`[plans] ${flagged.length} planes recomendados: solo se destaca el primero`);
  return flagged[0]?.documentId ?? null;
}

/**
 * Primer plan ACTIVO con `declaredCurrency !== country.currencyCode` (incluye ausente o fuera del enum) → issue;
 * si no, `null` (R-02.19). Nunca se excluye en silencio ni se usa para formatear.
 */
export function assertPlanCurrency(plans: readonly InsurancePlan[], country: Pick<CountryConfig, 'currencyCode'>): ConfigIssue | null {
  const bad = plans.find((p) => p.isActive && p.declaredCurrency !== country.currencyCode);
  if (!bad) return null;
  return {
    code: 'plan-currency-mismatch',
    planDocumentId: bad.documentId,
    planName: bad.name ?? bad.slug,
    planCurrency: bad.declaredCurrency,
    countryCurrency: country.currencyCode,
  };
}
