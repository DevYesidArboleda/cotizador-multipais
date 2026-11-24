import { TestBed } from '@angular/core/testing';
import { SESSION_STORAGE } from '../storage/quote-storage';
import { QuoteStore } from './quote.store';

class MemoryStorage implements Storage {
  readonly data = new Map<string, string>();
  get length(): number { return this.data.size; }
  clear(): void { this.data.clear(); }
  getItem(key: string): string | null { return this.data.get(key) ?? null; }
  key(index: number): string | null { return [...this.data.keys()][index] ?? null; }
  removeItem(key: string): void { this.data.delete(key); }
  setItem(key: string, value: string): void { this.data.set(key, value); }
}

function setup(seed: Record<string, string> = {}) {
  const storage = new MemoryStorage();
  for (const [k, v] of Object.entries(seed)) storage.data.set(k, v);
  TestBed.configureTestingModule({ providers: [{ provide: SESSION_STORAGE, useValue: storage }] });
  return { storage, store: TestBed.inject(QuoteStore) };
}

describe('[R-01.8] QuoteStore persiste cada cambio por país', () => {
  it('[R-01.8] cada cambio de valor se guarda en auto_quote_v1_<country> indexado por documentId', () => {
    const { storage, store } = setup();
    store.activate('co');
    store.setStep1Values({ 'doc-a': 'hola', 'doc-b': false });
    TestBed.tick();
    expect(JSON.parse(storage.data.get('auto_quote_v1_co') ?? '{}')).toEqual({ schemaVersion: 1, step1: { 'doc-a': 'hola', 'doc-b': false } });
  });

  it('[R-01.8][AC-01.18] tras recargar (nuevo store) los valores se restauran', () => {
    const first = setup();
    first.store.activate('co');
    first.store.setStep1Values({ 'doc-a': 'persistido' });
    TestBed.tick();
    TestBed.resetTestingModule();
    const second = setup(Object.fromEntries(first.storage.data));
    second.store.activate('co');
    expect(second.store.state().step1).toEqual({ 'doc-a': 'persistido' });
  });

  it('[R-01.8] activar un país solo lee: no escribe nada hasta que el usuario cambia algo', () => {
    const { storage, store } = setup();
    store.activate('co');
    TestBed.tick();
    expect(storage.data.size).toBe(0);
  });
});

describe('[R-01.20] QuoteStore aísla los países', () => {
  it('[R-01.20][AC-01.16] los datos de CO no aparecen en CL y vuelven al regresar a CO', () => {
    const { storage, store } = setup();
    store.activate('co');
    store.setStep1Values({ 'doc-a': 'Colombia' });
    TestBed.tick();
    store.activate('cl');
    expect(store.state().step1).toEqual({});
    TestBed.tick();
    expect(storage.data.has('auto_quote_v1_cl')).toBe(false);
    store.activate('co');
    expect(store.state().step1).toEqual({ 'doc-a': 'Colombia' });
  });

  it('[R-01.20] un cambio aún no escrito de un país se guarda antes de cambiar de país', () => {
    const { storage, store } = setup();
    store.activate('co');
    store.setStep1Values({ 'doc-a': 'sin-flush' });
    store.activate('cl');
    expect(JSON.parse(storage.data.get('auto_quote_v1_co') ?? '{}').step1).toEqual({ 'doc-a': 'sin-flush' });
    expect(storage.data.has('auto_quote_v1_cl')).toBe(false);
  });
});

describe('[R-01.24] QuoteStore con almacenamiento corrupto', () => {
  it('[R-01.24][AC-01.25] JSON inválido → estado vacío, clave eliminada y reemplazada al escribir', () => {
    const { storage, store } = setup({ auto_quote_v1_co: '%%% no es json' });
    store.activate('co');
    expect(store.state().step1).toEqual({});
    expect(storage.data.has('auto_quote_v1_co')).toBe(false);
    store.setStep1Values({ 'doc-a': 'nuevo' });
    TestBed.tick();
    expect(JSON.parse(storage.data.get('auto_quote_v1_co') ?? '{}').step1).toEqual({ 'doc-a': 'nuevo' });
  });
});

describe('[R-01.10] campos pendientes de marcar tras la redirección de un guard', () => {
  it('[R-01.10] se consumen una sola vez', () => {
    const { store } = setup();
    store.setPendingTouch(['a', 'b']);
    expect(store.consumePendingTouch()).toEqual(['a', 'b']);
    expect(store.consumePendingTouch()).toEqual([]);
  });
});

describe('[R-02.11][R-02.16][R-02.17] selección de plan en el QuoteState', () => {
  it('[R-02.11][R-02.17] la selección se guarda junto al Paso 1 en la clave del país', () => {
    const { storage, store } = setup();
    store.activate('co');
    store.setStep1Values({ 'doc-a': 'x' });
    store.setSelectedPlan({ planDocumentId: 'p1', priceSeenAtSelection: 100 });
    TestBed.tick();
    expect(JSON.parse(storage.data.get('auto_quote_v1_co') ?? '{}')).toEqual({
      schemaVersion: 1, step1: { 'doc-a': 'x' }, selectedPlan: { planDocumentId: 'p1', priceSeenAtSelection: 100 },
    });
  });

  it('[R-02.12] limpiar la selección conserva el Paso 1', () => {
    const { store } = setup();
    store.activate('co');
    store.setStep1Values({ 'doc-a': 'x' });
    store.setSelectedPlan({ planDocumentId: 'p1', priceSeenAtSelection: 100 });
    store.clearSelectedPlan();
    expect(store.state().selectedPlan).toBeUndefined();
    expect(store.state().step1).toEqual({ 'doc-a': 'x' });
  });

  it('[R-02.16] la selección de un país no se ve en el otro', () => {
    const { storage, store } = setup();
    store.activate('co');
    store.setSelectedPlan({ planDocumentId: 'p1', priceSeenAtSelection: 100 });
    TestBed.tick();
    store.activate('cl');
    expect(store.state().selectedPlan).toBeUndefined();
    expect(storage.data.has('auto_quote_v1_cl')).toBe(false);
  });
});

describe('[R-03.14][R-03.15] confirmación y nueva cotización', () => {
  const confirmation = { quoteNumber: 'COT-CO-20261123-7B2E', planDocumentId: 'p1', planName: 'Plus', finalPrice: 10, paidAt: '2026-11-23T10:00:00.000Z' };

  it('[R-03.14] setConfirmation persiste la confirmación junto al Paso 1', () => {
    const { storage, store } = setup();
    store.activate('co');
    store.setStep1Values({ 'doc-a': 'x' });
    store.setConfirmation(confirmation);
    TestBed.tick();
    expect(JSON.parse(storage.data.get('auto_quote_v1_co') ?? '{}').confirmation).toEqual(confirmation);
  });

  it('[R-03.15] reset borra solo la clave del país activo y deja el estado vacío sin reescribirlo', () => {
    const { storage, store } = setup({ auto_quote_v1_cl: JSON.stringify({ schemaVersion: 1, step1: { b: 'y' } }) });
    store.activate('co');
    store.setStep1Values({ 'doc-a': 'x' });
    store.setConfirmation(confirmation);
    TestBed.tick();
    store.reset();
    TestBed.tick();
    expect(storage.data.has('auto_quote_v1_co')).toBe(false);
    expect(storage.data.has('auto_quote_v1_cl')).toBe(true);
    expect(store.state()).toEqual({ schemaVersion: 1, step1: {} });
  });
});

describe('[F-01.2][R-01.8] la escritura ocurre en la misma llamada', () => {
  it('[F-01.2][R-01.8] setStep1Values, setSelectedPlan, clearSelectedPlan y setConfirmation escriben sin esperar al effect', () => {
    const { storage, store } = setup();
    store.activate('co');
    const stored = () => JSON.parse(storage.data.get('auto_quote_v1_co') ?? '{}');
    store.setStep1Values({ 'doc-a': 'x' });
    expect(stored().step1).toEqual({ 'doc-a': 'x' });
    store.setSelectedPlan({ planDocumentId: 'p1', priceSeenAtSelection: 5 });
    expect(stored().selectedPlan).toEqual({ planDocumentId: 'p1', priceSeenAtSelection: 5 });
    store.clearSelectedPlan();
    expect(stored().selectedPlan).toBeUndefined();
    store.setConfirmation({ quoteNumber: 'COT-CO-20261123-7B2E', planDocumentId: 'p1', planName: 'Plus', finalPrice: 1, paidAt: '2026-11-23T10:00:00.000Z' });
    expect(stored().confirmation.quoteNumber).toBe('COT-CO-20261123-7B2E');
  });

  it('[F-01.2][R-01.20] activar un país no escribe (solo los cambios del usuario)', () => {
    const { storage, store } = setup();
    store.activate('co');
    expect(storage.data.size).toBe(0);
  });
});

describe('[F-02.3][R-02.12] aviso pendiente de un guard', () => {
  it('[F-02.3][R-02.12] el aviso se consume una sola vez', () => {
    const { store } = setup();
    store.setPendingNotice('plan-unavailable');
    expect(store.consumePendingNotice()).toBe('plan-unavailable');
    expect(store.consumePendingNotice()).toBeNull();
  });
});
