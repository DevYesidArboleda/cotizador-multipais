import type { FormConfig, PaymentResult, Step1Values, SummaryCopy } from '../../core/contracts/strapi-contracts';
import type { PlansLoadResult } from '../../core/country/plans-load';
import { buildReadyConfig, fieldOf, validValues } from '../../testing/form-fixtures';
import { validPlanOf } from '../../testing/plan-fixtures';
import {
  buildStep3View,
  finishPayment,
  initialPaymentUi,
  resolveSelectedPricing,
  setMode,
  setTermsAccepted,
  startPayment,
} from './step-3-state';
import type { Step3Source } from './step-3-state';

const NOW = new Date(2026, 10, 23, 12);
const copy: SummaryCopy = { yes: 'Sí', no: 'No', notProvided: 'No informado' };
const plan = validPlanOf({ documentId: 'p1', basePrice: 1_000_000, name: 'Plus', shortDescription: 'Corta' });

function loaded(config: FormConfig, plans: PlansLoadResult): Step3Source {
  return { kind: 'loaded', config, plans };
}
const okPlans: PlansLoadResult = { kind: 'ok', plans: [plan], recommendedDocumentId: null };

function view(overrides: { config?: FormConfig; plans?: PlansLoadResult; source?: Step3Source | null; values?: Step1Values; seen?: number } = {}) {
  const config = overrides.config ?? buildReadyConfig();
  return buildStep3View({
    source: overrides.source === undefined ? loaded(config, overrides.plans ?? okPlans) : overrides.source,
    values: overrides.values ?? validValues(config),
    selected: { planDocumentId: 'p1', priceSeenAtSelection: overrides.seen ?? 1_080_000 },
    copy,
    now: NOW,
  });
}

describe('[R-03.18] unión discriminada del Paso 3', () => {
  it('[R-03.18] loading mientras no hay datos', () => {
    expect(view({ source: null }).kind).toBe('loading');
  });

  it('[R-03.18] error de red (país o planes) -> error recuperable', () => {
    expect(view({ source: { kind: 'error' } })).toEqual({ kind: 'error', retryable: true });
    expect(view({ plans: { kind: 'error' } })).toEqual({ kind: 'error', retryable: true });
  });

  it('[R-03.18] ready exige términos y planes cargados y trae resumen y términos', () => {
    const v = view();
    expect(v.kind).toBe('ready');
    if (v.kind !== 'ready') return;
    expect(v.view.plan).toMatchObject({ name: 'Plus', shortDescription: 'Corta' });
    expect(v.terms.paragraphs.length).toBeGreaterThan(0);
    expect(v.terms.version).toBe('1');
  });

  it('[R-03.7][R-03.18] términos vacíos -> config-error y sin precio', () => {
    const config = buildReadyConfig({ countryOverrides: { termsContent: '   \n\n  ' } });
    const v = view({ config });
    expect(v).toEqual({ kind: 'config-error', issues: [{ code: 'empty-terms' }] });
  });
});

describe('[R-03.17] aviso de cambio de precio', () => {
  it('[R-03.17] si el precio recalculado difiere del visto, trae aviso con el nuevo precio y no bloquea', () => {
    const v = view({ seen: 900_000 });
    expect(v.kind === 'ready' && v.view.priceChangedNotice?.newPriceText).toMatch(/1\.080\.000/);
  });

  it('[R-03.17] si coincide, no hay aviso', () => {
    const v = view({ seen: 1_080_000 });
    expect(v.kind === 'ready' && v.view.priceChangedNotice).toBeNull();
  });
});

describe('[R-03.25][AC-03.28] moneda y ciudad inválidas bloquean el pago', () => {
  it('[R-03.25][AC-03.28] plan con moneda incoherente -> config-error del plan (resultado de la carga)', () => {
    const issue = { code: 'plan-currency-mismatch', planDocumentId: 'p1', planName: 'Plus', planCurrency: 'COP', countryCurrency: 'CLP' } as const;
    const v = view({ plans: { kind: 'config-error', issues: [issue] } });
    expect(v).toEqual({ kind: 'config-error', issues: [issue] });
  });

  it.each([31, -11])('[R-03.25][AC-03.28] priceAdjustmentPct %i -> config-error que nombra campo y opción, sin precio', (pct) => {
    const config = buildReadyConfig({
      mutate: (fields) =>
        fields.map((f) => (f.semanticRole === 'city' ? { ...f, options: [{ label: 'Ciudad X', value: 'x', priceAdjustmentPct: pct }] } : f)),
    });
    const values = { ...validValues(config), [fieldOf(config, 'city').documentId]: 'x' };
    const v = view({ config, values });
    expect(v.kind).toBe('config-error');
    expect(v.kind === 'config-error' && v.issues[0]).toMatchObject({ code: 'invalid-city-adjustment', optionLabel: 'Ciudad X' });
    expect(resolveSelectedPricing(loaded(config, okPlans), values, { planDocumentId: 'p1', priceSeenAtSelection: 1 }, NOW)).toBeNull();
  });
});

describe('[R-03.8][R-03.12][R-03.21] interacción de pago', () => {
  it('[R-03.8][R-03.21] entra con términos desmarcados y modo "approved" por defecto', () => {
    expect(initialPaymentUi()).toEqual({ termsAccepted: false, mode: 'approved', isProcessing: false, rejected: false });
  });

  it('[R-03.11] startPayment activa isProcessing en el mismo paso y oculta el rechazo anterior', () => {
    const s = startPayment({ ...initialPaymentUi(), rejected: true });
    expect(s).toMatchObject({ isProcessing: true, rejected: false });
  });

  it('[R-03.12] tras un rechazo isProcessing es false y se conservan aceptación y modo', () => {
    const base = setMode(setTermsAccepted(initialPaymentUi(), true), 'rejected');
    const result: PaymentResult = { status: 'rejected', code: 'SIMULATED_REJECTION' };
    const s = finishPayment(startPayment(base), result);
    expect(s).toEqual({ termsAccepted: true, mode: 'rejected', isProcessing: false, rejected: true });
  });

  it('[R-03.12] una excepción inesperada (null) se trata igual que un rechazo', () => {
    const s = finishPayment(startPayment(setTermsAccepted(initialPaymentUi(), true)), null);
    expect(s).toMatchObject({ isProcessing: false, rejected: true, termsAccepted: true });
  });

  it('[R-03.12][R-03.21] un reintento aprobado limpia el rechazo y el modo no se persiste', () => {
    const s = finishPayment(startPayment(setMode(initialPaymentUi(), 'approved')), { status: 'approved', quoteNumber: 'COT-CO-20261123-0000' });
    expect(s.rejected).toBe(false);
    expect(JSON.stringify(s)).not.toContain('quoteNumber');
  });
});
