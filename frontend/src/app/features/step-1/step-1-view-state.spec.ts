import { buildReadyConfig, countryDto } from '../../testing/form-fixtures';
import { toCountryConfig } from '../../core/http/mappers';
import { canShowContinue, toStep1ViewState } from './step-1-view-state';

describe('[R-01.22] estados de la vista del Paso 1', () => {
  const config = buildReadyConfig();

  it('[R-01.22] null → loading; ready, empty, error y config-error se mapean uno a uno', () => {
    expect(toStep1ViewState(null)).toEqual({ kind: 'loading' });
    expect(toStep1ViewState({ kind: 'ready', config })).toEqual({ kind: 'ready', config });
    const country = toCountryConfig({ data: [countryDto()], meta: { pagination: { page: 1, pageSize: 100, pageCount: 1, total: 1 } } });
    if (country.kind !== 'ok') throw new Error('país');
    expect(toStep1ViewState({ kind: 'empty', country: country.country })).toEqual({ kind: 'empty' });
    expect(toStep1ViewState({ kind: 'error' })).toEqual({ kind: 'error', retryable: true });
    const issues = [{ code: 'role-missing', role: 'birth_date' }] as const;
    expect(toStep1ViewState({ kind: 'config-error', issues })).toEqual({ kind: 'config-error', issues });
  });

  it('[R-01.22][AC-01.23] solo el estado ready ofrece avanzar (empty, error y config-error no)', () => {
    expect(canShowContinue({ kind: 'ready', config })).toBe(true);
    for (const view of [
      { kind: 'loading' },
      { kind: 'empty' },
      { kind: 'error', retryable: true },
      { kind: 'config-error', issues: [] },
    ] as const) {
      expect(canShowContinue(view)).toBe(false);
    }
  });

  it('[AC-01.22] un error recuperable ofrece reintentar y no pierde datos (el estado no los contiene)', () => {
    expect(toStep1ViewState({ kind: 'error' })).toMatchObject({ retryable: true });
  });

  it('[AC-01.7] un rol requerido ausente da config-error y no se muestra el formulario', () => {
    const view = toStep1ViewState({ kind: 'config-error', issues: [{ code: 'role-missing', role: 'birth_date' }] });
    expect(view.kind).toBe('config-error');
    expect(canShowContinue(view)).toBe(false);
  });
});
