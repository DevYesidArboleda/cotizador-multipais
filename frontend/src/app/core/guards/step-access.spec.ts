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
