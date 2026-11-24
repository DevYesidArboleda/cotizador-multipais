import type {
  FormConfig,
  PricedPlan,
  SelectedPlan,
  Step1Values,
  Step2ViewState,
  ValidInsurancePlan,
} from '../../core/contracts/strapi-contracts';
import type { ConfigLoadResult } from '../../core/country/config-load';
import type { PlansLoadResult } from '../../core/country/plans-load';
import { formatPrice } from '../../domain/pricing/format-price';
import { calculateAdjustedPrice, resolvePricingFactors } from '../../domain/pricing/pricing';

/** Origen de datos del Paso 2: `null` mientras carga (R-02.15). */
export type Step2Source =
  | { kind: 'config'; result: Exclude<ConfigLoadResult, { kind: 'ready' }> }
  | { kind: 'plans'; config: FormConfig; plans: PlansLoadResult };

/** Selección guardada frente a los planes vigentes: si ya no existe se limpia (R-02.12). */
export function reconcileSelection(
  stored: SelectedPlan | undefined,
  plans: readonly Pick<ValidInsurancePlan, 'documentId'>[],
): { selected: SelectedPlan | undefined; unavailable: boolean } {
  if (!stored) return { selected: undefined, unavailable: false };
  const exists = plans.some((p) => p.documentId === stored.planDocumentId);
  return exists ? { selected: stored, unavailable: false } : { selected: undefined, unavailable: true };
}

/** Planes con precio derivado del Paso 1 persistido y del plan (R-02.5, R-02.6, R-02.9, R-02.10). */
export function priceAllPlans(
  config: FormConfig,
  values: Step1Values,
  plans: readonly ValidInsurancePlan[],
  recommendedDocumentId: string | null,
  now: Date,
): { kind: 'ok'; plans: readonly PricedPlan[] } | Extract<Step2ViewState, { kind: 'config-error' }> {
  const factors = resolvePricingFactors(config, values);
  if (factors.kind === 'config-error') return { kind: 'config-error', issues: [factors.issue] };
  const priced: PricedPlan[] = [];
  for (const plan of plans) {
    const finalPrice = calculateAdjustedPrice({ ...factors.factors, basePrice: plan.basePrice, now });
    const final = formatPrice(finalPrice, config.country);
    if (final.kind === 'config-error') return { kind: 'config-error', issues: [final.issue] };
    let basePriceText: string | null = null;
    if (finalPrice !== plan.basePrice) {
      const base = formatPrice(plan.basePrice, config.country);
      if (base.kind === 'config-error') return { kind: 'config-error', issues: [base.issue] };
      basePriceText = base.text;
    }
    priced.push({ plan, finalPrice, finalPriceText: final.text, basePriceText, highlighted: plan.documentId === recommendedDocumentId });
  }
  return { kind: 'ok', plans: priced };
}

export interface Step2Inputs {
  source: Step2Source | null;
  values: Step1Values;
  selected: SelectedPlan | undefined;
  /** El plan guardado desapareció en esta carga (R-02.12). */
  unavailable: boolean;
  now: Date;
}

/** Vista del Paso 2 como unión discriminada (R-02.15). Sin `NaN` ni precios cuando hay `config-error` (R-02.8). */
export function buildStep2View({ source, values, selected, unavailable, now }: Step2Inputs): Step2ViewState {
  if (source === null) return { kind: 'loading' };
  if (source.kind === 'config') {
    const r = source.result;
    if (r.kind === 'config-error') return { kind: 'config-error', issues: r.issues };
    if (r.kind === 'empty') return { kind: 'empty' };
    return { kind: 'error', retryable: true };
  }
  const load = source.plans;
  if (load.kind === 'empty') return { kind: 'empty' };
  if (load.kind === 'error') return { kind: 'error', retryable: true };
  if (load.kind === 'config-error') return { kind: 'config-error', issues: load.issues };
  const priced = priceAllPlans(source.config, values, load.plans, load.recommendedDocumentId, now);
  if (priced.kind === 'config-error') return priced;
  const current = selected ? priced.plans.find((p) => p.plan.documentId === selected.planDocumentId) : undefined;
  let notice: 'plan-unavailable' | 'price-changed' | null = null;
  if (unavailable) notice = 'plan-unavailable';
  else if (current && selected && current.finalPrice !== selected.priceSeenAtSelection) notice = 'price-changed';
  return { kind: 'ready', plans: priced.plans, selectedPlanDocumentId: current ? current.plan.documentId : null, notice };
}
