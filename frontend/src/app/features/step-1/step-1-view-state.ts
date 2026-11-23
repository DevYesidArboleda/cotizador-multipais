import type { ConfigLoadResult } from '../../core/country/config-load';
import type { Step1ViewState } from '../../core/contracts/strapi-contracts';

/**
 * Unión discriminada del Paso 1 (R-01.22): `null` = petición en curso. `not-found` es transitorio: el componente
 * ya navegó a /country-not-found, así que mientras tanto se mantiene `loading`.
 */
export function toStep1ViewState(result: ConfigLoadResult | null): Step1ViewState {
  if (result === null) return { kind: 'loading' };
  switch (result.kind) {
    case 'ready':
      return { kind: 'ready', config: result.config };
    case 'empty':
      return { kind: 'empty' };
    case 'error':
      return { kind: 'error', retryable: true };
    case 'config-error':
      return { kind: 'config-error', issues: result.issues };
    case 'not-found':
      return { kind: 'loading' };
  }
}

/** Solo el estado `ready` ofrece el botón de avance (AC-01.23, R-01.11). */
export function canShowContinue(view: Step1ViewState): boolean {
  return view.kind === 'ready';
}
