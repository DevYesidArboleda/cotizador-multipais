import type { FormConfig, Step1Values } from '../../core/contracts/strapi-contracts';
import type { PlansLoadResult } from '../../core/country/plans-load';
import { buildReadyConfig, fieldOf } from '../../testing/form-fixtures';
import { validPlanOf } from '../../testing/plan-fixtures';
import { buildStep2View, reconcileSelection } from './step-2-state';
import type { Step2Source } from './step-2-state';

const NOW = new Date(2026, 10, 23, 12, 0, 0);
const config: FormConfig = buildReadyConfig();
const valuesOf = (year: string, birth: string, city = ''): Step1Values => ({
  [fieldOf(config, 'vehicle_year').documentId]: year,
  [fieldOf(config, 'birth_date').documentId]: birth,
  [fieldOf(config, 'city').documentId]: city,
});
const okSource = (...plans: ReturnType<typeof validPlanOf>[]): Step2Source => ({
  kind: 'plans',
  config,
  plans: { kind: 'ok', plans, recommendedDocumentId: plans.find((p) => p.isRecommended)?.documentId ?? null },
});
const view = (over: Partial<Parameters<typeof buildStep2View>[0]>) =>
  buildStep2View({ source: null, values: valuesOf('2020', '1990-01-01'), selected: undefined, unavailable: false, now: NOW, ...over });

describe('[R-02.15] unión discriminada del Paso 2', () => {
  it('[R-02.15] loading, empty, error y config-error', () => {
    expect(view({}).kind).toBe('loading');
    expect(view({ source: { kind: 'plans', config, plans: { kind: 'empty' } } }).kind).toBe('empty');
    expect(view({ source: { kind: 'plans', config, plans: { kind: 'error' } } }).kind).toBe('error');
    const cfg: PlansLoadResult = { kind: 'config-error', issues: [{ code: 'invalid-locale-or-currency', locale: 'x', currencyCode: 'y' }] };
    expect(view({ source: { kind: 'plans', config, plans: cfg } }).kind).toBe('config-error');
    expect(view({ source: { kind: 'config', result: { kind: 'error' } } }).kind).toBe('error');
  });

  it('[R-02.15] ready lista los planes en el orden recibido', () => {
    const v = view({ source: okSource(validPlanOf({ documentId: 'b' }), validPlanOf({ documentId: 'a' })) });
    expect(v.kind === 'ready' && v.plans.map((p) => p.plan.documentId)).toEqual(['b', 'a']);
  });
});

describe('[R-02.9][AC-02.8][AC-02.25] precio derivado del Paso 1', () => {
  const plan = validPlanOf({ documentId: 'p', basePrice: 1_000_000 });

  it('[R-02.9][AC-02.8] cambiar vehicle_year o birth_date cambia el precio', () => {
    const a = view({ source: okSource(plan), values: valuesOf('2020', '1990-01-01') });
    const b = view({ source: okSource(plan), values: valuesOf('2025', '1990-01-01') });
    expect(a.kind === 'ready' && a.plans[0]?.finalPrice).toBe(1_000_000);
    expect(b.kind === 'ready' && b.plans[0]?.finalPrice).toBe(1_100_000);
  });

  it('[R-02.9][AC-02.25] cambiar la ciudad recalcula el precio', () => {
    const v = view({ source: okSource(plan), values: valuesOf('2020', '1990-01-01', 'bogota') });
    expect(v.kind === 'ready' && v.plans[0]?.finalPrice).toBe(1_080_000);
  });

  it('[R-02.9] el precio base solo se muestra si difiere del final', () => {
    const same = view({ source: okSource(plan) });
    const diff = view({ source: okSource(plan), values: valuesOf('2025', '1990-01-01') });
    expect(same.kind === 'ready' && same.plans[0]?.basePriceText).toBeNull();
    expect(diff.kind === 'ready' && diff.plans[0]?.basePriceText).not.toBeNull();
  });

  it('[R-02.8][R-02.9] dato inválido produce config-error sin precios', () => {
    expect(view({ source: okSource(plan), values: valuesOf('', '1990-01-01') }).kind).toBe('config-error');
  });

  it('[R-02.10] el recomendado se destaca sin preseleccionar', () => {
    const v = view({ source: okSource(validPlanOf({ documentId: 'a' }), validPlanOf({ documentId: 'b', isRecommended: true })) });
    expect(v.kind === 'ready' && v.plans.map((p) => p.highlighted)).toEqual([false, true]);
    expect(v.kind === 'ready' && v.selectedPlanDocumentId).toBeNull();
  });
});

describe('[R-02.11][R-02.12][R-02.13] selección', () => {
  const plan = validPlanOf({ documentId: 'p', basePrice: 1_000_000 });

  it('[R-02.11] la selección guardada se refleja como única', () => {
    const v = view({ source: okSource(plan), selected: { planDocumentId: 'p', priceSeenAtSelection: 1_000_000 } });
    expect(v.kind === 'ready' && v.selectedPlanDocumentId).toBe('p');
    expect(v.kind === 'ready' && v.notice).toBeNull();
  });

  it('[R-02.12] un plan guardado que ya no existe se limpia y se avisa', () => {
    expect(reconcileSelection({ planDocumentId: 'zzz', priceSeenAtSelection: 1 }, [plan])).toEqual({ selected: undefined, unavailable: true });
    expect(reconcileSelection({ planDocumentId: 'p', priceSeenAtSelection: 1 }, [plan]).unavailable).toBe(false);
    expect(reconcileSelection(undefined, [plan])).toEqual({ selected: undefined, unavailable: false });
    const v = view({ source: okSource(plan), unavailable: true });
    expect(v.kind === 'ready' && v.notice).toBe('plan-unavailable');
    expect(v.kind === 'ready' && v.selectedPlanDocumentId).toBeNull();
  });

  it('[R-02.13] si el precio recalculado difiere del visto, aviso y selección conservada', () => {
    const v = view({ source: okSource(plan), selected: { planDocumentId: 'p', priceSeenAtSelection: 900_000 } });
    expect(v.kind === 'ready' && v.notice).toBe('price-changed');
    expect(v.kind === 'ready' && v.selectedPlanDocumentId).toBe('p');
  });
});
