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
