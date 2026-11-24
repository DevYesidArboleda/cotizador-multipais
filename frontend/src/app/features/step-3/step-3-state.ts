import type {
  FormConfig,
  PaymentResult,
  PaymentSimulationMode,
  SelectedPlan,
  Step1Values,
  Step3State,
  SummaryCopy,
  ValidInsurancePlan,
} from '../../core/contracts/strapi-contracts';
import type { PlansLoadResult } from '../../core/country/plans-load';
import { buildSummaryRows } from '../../domain/summary/build-summary';
import { splitTerms } from '../../domain/summary/split-terms';
import { priceAllPlans } from '../step-2/step-2-state';

/** Origen de datos del Paso 3: `null` mientras carga (R-03.18). Término y planes se piden juntos (GAP-03.17). */
export type Step3Source =
  | { kind: 'error' }
  | { kind: 'config-error'; issues: Extract<Step3State, { kind: 'config-error' }>['issues'] }
  | { kind: 'loaded'; config: FormConfig; plans: PlansLoadResult };

export interface Step3Inputs {
  source: Step3Source | null;
  values: Step1Values;
  selected: SelectedPlan | undefined;
  copy: SummaryCopy;
  now: Date;
}

/** Plan elegido (si sigue publicado) dentro de la carga; `null` -> el componente redirige al Paso 2 (R-03.1). */
export function findSelectedPlan(plans: PlansLoadResult, selected: SelectedPlan | undefined): ValidInsurancePlan | null {
  if (plans.kind !== 'ok' || !selected) return null;
  return plans.plans.find((p) => p.documentId === selected.planDocumentId) ?? null;
}

/**
 * Vista del Paso 3 como unión discriminada (R-03.18). Usa las mismas funciones puras que el Paso 2 sobre datos
 * frescos (R-03.6, R-03.25): un `config-error` de moneda, ciudad o términos no muestra precio y bloquea el pago.
 */
export function buildStep3View({ source, values, selected, copy, now }: Step3Inputs): Step3State {
  if (source === null) return { kind: 'loading' };
  if (source.kind === 'error') return { kind: 'error', retryable: true };
  if (source.kind === 'config-error') return source;
  const { config, plans } = source;
  if (plans.kind === 'error') return { kind: 'error', retryable: true };
  if (plans.kind === 'config-error') return { kind: 'config-error', issues: plans.issues };
  const paragraphs = splitTerms(config.country.terms.content);
  if (paragraphs.length === 0) return { kind: 'config-error', issues: [{ code: 'empty-terms' }] };
  const plan = findSelectedPlan(plans, selected);
  if (plans.kind !== 'ok' || !plan || !selected) return { kind: 'loading' };
  const priced = priceAllPlans(config, values, [plan], null, now);
  if (priced.kind === 'config-error') return priced;
  const current = priced.plans[0];
  if (!current) return { kind: 'loading' };
  const rows = buildSummaryRows(config, values, copy);
  return {
    kind: 'ready',
    view: {
      ...rows,
      plan: {
        name: plan.name,
        shortDescription: plan.shortDescription,
        coverageNames: plan.coverages.map((c) => c.name),
        finalPriceText: current.finalPriceText,
      },
      priceChangedNotice: current.finalPrice !== selected.priceSeenAtSelection ? { newPriceText: current.finalPriceText } : null,
    },
    terms: { title: config.country.terms.title, version: config.country.terms.version, paragraphs },
  };
}

/** Estado de la interacción de pago: solo en memoria (R-03.8, R-03.21). */
export interface PaymentUiState {
  termsAccepted: boolean;
  mode: PaymentSimulationMode;
  isProcessing: boolean;
  rejected: boolean;
}

export const initialPaymentUi = (): PaymentUiState => ({ termsAccepted: false, mode: 'approved', isProcessing: false, rejected: false });

export const setTermsAccepted = (state: PaymentUiState, accepted: boolean): PaymentUiState => ({ ...state, termsAccepted: accepted });
export const setMode = (state: PaymentUiState, mode: PaymentSimulationMode): PaymentUiState => ({ ...state, mode });
/** Inicio del pago: `isProcessing` en el mismo ciclo y se oculta el rechazo anterior (R-03.11). */
export const startPayment = (state: PaymentUiState): PaymentUiState => ({ ...state, isProcessing: true, rejected: false });

/**
 * Fin del pago: `isProcessing` vuelve a `false` en todos los casos. Un rechazo (o una excepción inesperada: `null`)
 * conserva aceptación y modo para poder reintentar (R-03.12).
 */
export function finishPayment(state: PaymentUiState, result: PaymentResult | null): PaymentUiState {
  return { ...state, isProcessing: false, rejected: result === null || result.status === 'rejected' };
}

/** Datos numéricos del plan elegido para registrar el pago y la confirmación (R-03.14). */
export function resolveSelectedPricing(
  source: Step3Source | null,
  values: Step1Values,
  selected: SelectedPlan | undefined,
  now: Date,
): { planDocumentId: string; planName: string; finalPrice: number } | null {
  if (source?.kind !== 'loaded') return null;
  const plan = findSelectedPlan(source.plans, selected);
  if (!plan) return null;
  const priced = priceAllPlans(source.config, values, [plan], null, now);
  const current = priced.kind === 'ok' ? priced.plans[0] : undefined;
  return current ? { planDocumentId: plan.documentId, planName: plan.name, finalPrice: current.finalPrice } : null;
}
