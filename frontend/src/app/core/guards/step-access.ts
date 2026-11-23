import type { StepAccessContext, StepAccessDecision, QuoteStep } from '../contracts/strapi-contracts';

const toStep1 = (context: StepAccessContext): StepAccessDecision => ({
  kind: 'redirect',
  to: 'step-1',
  touchFieldDocumentIds: context.step1Errors.map((e) => e.fieldDocumentId),
  notice: null,
});

/**
 * Decisión pura de acceso (R-01.10): el Paso 2 y 3 revalidan el Paso 1 contra la configuración vigente; no existe
 * flag de "Paso 1 completo". El orden del Paso 3 y la confirmación se completa en SPEC-US-02/03.
 */
export function decideStepAccess(target: QuoteStep, context: StepAccessContext): StepAccessDecision {
  const { state, step1Errors, activePlanDocumentIds } = context;
  if (target === 'step-1') return { kind: 'allow' };
  if (target === 'confirmation') {
    if (state.confirmation) return { kind: 'allow' };
  } else if (target === 'step-3' && state.confirmation) {
    return { kind: 'redirect', to: 'confirmation', touchFieldDocumentIds: [], notice: null };
  }
  if (step1Errors.length > 0) return toStep1(context);
  if (target === 'step-2') return { kind: 'allow' };
  const plan = state.selectedPlan;
  if (!plan) return { kind: 'redirect', to: 'step-2', touchFieldDocumentIds: [], notice: null };
  if (activePlanDocumentIds && !activePlanDocumentIds.has(plan.planDocumentId)) {
    return { kind: 'redirect', to: 'step-2', touchFieldDocumentIds: [], notice: 'plan-unavailable' };
  }
  return target === 'confirmation'
    ? { kind: 'redirect', to: 'step-3', touchFieldDocumentIds: [], notice: null }
    : { kind: 'allow' };
}
