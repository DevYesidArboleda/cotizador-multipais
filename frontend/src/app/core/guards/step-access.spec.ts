import { emptyQuoteState } from '../storage/quote-storage';
import type { FieldError, StepAccessContext } from '../contracts/strapi-contracts';
import { decideStepAccess } from './step-access';

const error = (id: string): FieldError => ({ fieldDocumentId: id, rule: 'required', message: 'm' });
const context = (overrides: Partial<StepAccessContext> = {}): StepAccessContext => ({
  state: emptyQuoteState(),
  step1Errors: [],
  activePlanDocumentIds: null,
  ...overrides,
});

describe('[R-01.10] guard de acceso a los pasos', () => {
  it('[R-01.10] el Paso 1 siempre permite la entrada', () => {
    expect(decideStepAccess('step-1', context({ step1Errors: [error('a')] }))).toEqual({ kind: 'allow' });
  });

  it('[R-01.10] con ≥ 1 error del Paso 1, el Paso 2 redirige a step-1 marcando esos campos como tocados', () => {
    expect(decideStepAccess('step-2', context({ step1Errors: [error('a'), error('b')] }))).toEqual({
      kind: 'redirect', to: 'step-1', touchFieldDocumentIds: ['a', 'b'], notice: null,
    });
  });

  it('[R-01.10] sin errores, el Paso 2 entra: no existe flag persistido de "Paso 1 completo"', () => {
    expect(decideStepAccess('step-2', context())).toEqual({ kind: 'allow' });
    expect(Object.keys(emptyQuoteState())).toEqual(['schemaVersion', 'step1']);
  });

  it('[R-01.10] el Paso 3 también revalida el Paso 1 antes que cualquier otra condición', () => {
    expect(decideStepAccess('step-3', context({ step1Errors: [error('a')] }))).toMatchObject({ kind: 'redirect', to: 'step-1' });
  });

  it('el Paso 3 sin plan elegido vuelve al Paso 2 (pantalla mínima de esta iteración)', () => {
    expect(decideStepAccess('step-3', context())).toMatchObject({ kind: 'redirect', to: 'step-2' });
  });
});

describe('[R-02.1][R-02.12] acceso al Paso 3 con planes activos', () => {
  const state = { ...emptyQuoteState(), selectedPlan: { planDocumentId: 'p1', priceSeenAtSelection: 10 } };

  it('[R-02.1] sin plan elegido el Paso 3 redirige al Paso 2', () => {
    expect(decideStepAccess('step-3', context())).toMatchObject({ kind: 'redirect', to: 'step-2' });
  });

  it('[R-02.12] plan elegido ausente de los activos: redirige al Paso 2 con aviso plan-unavailable', () => {
    expect(decideStepAccess('step-3', context({ state, activePlanDocumentIds: new Set(['otro']) }))).toEqual({
      kind: 'redirect', to: 'step-2', touchFieldDocumentIds: [], notice: 'plan-unavailable',
    });
  });

  it('[R-02.12] plan elegido vigente: el Paso 3 permite la entrada', () => {
    expect(decideStepAccess('step-3', context({ state, activePlanDocumentIds: new Set(['p1']) }))).toEqual({ kind: 'allow' });
  });
});

describe('[R-03.1][R-03.14] orden de decisiones y confirmación', () => {
  const confirmed = {
    ...emptyQuoteState(),
    selectedPlan: { planDocumentId: 'p1', priceSeenAtSelection: 10 },
    confirmation: { quoteNumber: 'COT-CO-20261123-7B2E', planDocumentId: 'p1', planName: 'Plus', finalPrice: 10, paidAt: '2026-11-23T10:00:00.000Z' },
  };

  it.each(['step-1', 'step-2', 'step-3'] as const)('[R-03.14] con confirmación, %s redirige a /confirmation', (target) => {
    expect(decideStepAccess(target, context({ state: confirmed }))).toEqual({
      kind: 'redirect', to: 'confirmation', touchFieldDocumentIds: [], notice: null,
    });
  });

  it('[R-03.14] con confirmación, /confirmation permite la entrada incluso con errores del Paso 1', () => {
    expect(decideStepAccess('confirmation', context({ state: confirmed, step1Errors: [error('a')] }))).toEqual({ kind: 'allow' });
  });

  it('[R-03.1] la confirmación tiene prioridad sobre los errores del Paso 1', () => {
    expect(decideStepAccess('step-3', context({ state: confirmed, step1Errors: [error('a')] }))).toMatchObject({ to: 'confirmation' });
  });

  it('[R-03.1] sin confirmación: errores del Paso 1 -> step-1; sin plan -> step-2; plan retirado -> step-2 con aviso', () => {
    const withPlan = { ...emptyQuoteState(), selectedPlan: { planDocumentId: 'p1', priceSeenAtSelection: 10 } };
    expect(decideStepAccess('step-3', context({ state: withPlan, step1Errors: [error('a')] }))).toMatchObject({ to: 'step-1', touchFieldDocumentIds: ['a'] });
    expect(decideStepAccess('step-3', context())).toMatchObject({ to: 'step-2', notice: null });
    expect(decideStepAccess('step-3', context({ state: withPlan, activePlanDocumentIds: new Set() }))).toMatchObject({ to: 'step-2', notice: 'plan-unavailable' });
  });

  it('[R-03.1] sin confirmación, /confirmation vuelve al paso pendiente (Paso 3 si todo está listo)', () => {
    const withPlan = { ...emptyQuoteState(), selectedPlan: { planDocumentId: 'p1', priceSeenAtSelection: 10 } };
    expect(decideStepAccess('confirmation', context({ state: withPlan, activePlanDocumentIds: new Set(['p1']) }))).toMatchObject({ to: 'step-3' });
    expect(decideStepAccess('confirmation', context())).toMatchObject({ to: 'step-2' });
  });
});
