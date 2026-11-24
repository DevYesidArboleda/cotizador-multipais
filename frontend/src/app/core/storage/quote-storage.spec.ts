import { QUOTE_SCHEMA_VERSION } from '../contracts/strapi-contracts';
import { emptyQuoteState, parseQuoteState, pickStep1Values, quoteStorageKey, readQuoteState, writeQuoteState } from './quote-storage';

class FakeStorage implements Storage {
  readonly data = new Map<string, string>();
  readonly reads: string[] = [];
  readonly writes: string[] = [];
  get length(): number { return this.data.size; }
  clear(): void { this.data.clear(); }
  getItem(key: string): string | null { this.reads.push(key); return this.data.get(key) ?? null; }
  key(index: number): string | null { return [...this.data.keys()][index] ?? null; }
  removeItem(key: string): void { this.data.delete(key); }
  setItem(key: string, value: string): void { this.writes.push(key); this.data.set(key, value); }
}

describe('[R-01.8] almacenamiento por país', () => {
  it('[R-01.8][AC-01.4] la clave es auto_quote_v1_<country> y los datos hacen ida y vuelta, incluidos checkbox sin marcar', () => {
    expect(quoteStorageKey('co')).toBe('auto_quote_v1_co');
    const storage = new FakeStorage();
    const state = { ...emptyQuoteState(), step1: { 'doc-a': 'texto', 'doc-b': false, 'doc-c': null } };
    expect(writeQuoteState(storage, 'co', state)).toBe(true);
    expect(readQuoteState(storage, 'co')).toEqual(state);
  });

  it('[R-01.8] se indexa por documentId y se purgan los que ya no existen', () => {
    expect(pickStep1Values({ a: '1', huerfano: '2', c: false }, ['a', 'c', 'd'])).toEqual({ a: '1', c: false });
  });
});

describe('[R-01.20] aislamiento por país', () => {
  it('[R-01.20][AC-01.16] leer y escribir cl nunca toca la clave de co', () => {
    const storage = new FakeStorage();
    writeQuoteState(storage, 'co', { ...emptyQuoteState(), step1: { 'doc-a': 'Colombia' } });
    storage.reads.length = 0;
    storage.writes.length = 0;
    expect(readQuoteState(storage, 'cl').step1).toEqual({});
    writeQuoteState(storage, 'cl', { ...emptyQuoteState(), step1: { 'doc-b': 'Chile' } });
    expect(storage.reads).toEqual(['auto_quote_v1_cl']);
    expect(storage.writes).toEqual(['auto_quote_v1_cl']);
    expect(readQuoteState(storage, 'co').step1).toEqual({ 'doc-a': 'Colombia' });
    expect(storage.data.get('auto_quote_v1_cl')).not.toContain('Colombia');
  });
});

describe('[R-01.24] almacenamiento ilegible', () => {
  it.each([['texto que no es JSON'], ['{"schemaVersion":2,"step1":{}}'], ['{"schemaVersion":1}'], ['[]'], ['null']])(
    '[R-01.24][AC-01.25] %s → se trata como vacío y se elimina la clave',
    (raw) => {
      const storage = new FakeStorage();
      storage.data.set('auto_quote_v1_co', raw);
      expect(readQuoteState(storage, 'co')).toEqual(emptyQuoteState());
      expect(storage.data.has('auto_quote_v1_co')).toBe(false);
      writeQuoteState(storage, 'co', { ...emptyQuoteState(), step1: { x: 'ok' } });
      expect(parseQuoteState(storage.data.get('auto_quote_v1_co') ?? null)?.step1).toEqual({ x: 'ok' });
    },
  );

  it('[R-01.24] parseQuoteState exige schemaVersion 1', () => {
    expect(parseQuoteState(JSON.stringify({ schemaVersion: QUOTE_SCHEMA_VERSION, step1: { a: 'b' } }))?.step1).toEqual({ a: 'b' });
    expect(parseQuoteState(null)).toBeNull();
  });

  it('[R-01.24] un fallo de escritura (cuota) no lanza excepción', () => {
    const storage = new FakeStorage();
    storage.setItem = () => { throw new DOMException('cuota', 'QuotaExceededError'); };
    expect(() => writeQuoteState(storage, 'co', emptyQuoteState())).not.toThrow();
    expect(writeQuoteState(storage, 'co', emptyQuoteState())).toBe(false);
  });

  it('[R-01.24] sin sessionStorage (null) todo sigue en memoria sin excepción', () => {
    expect(readQuoteState(null, 'co')).toEqual(emptyQuoteState());
    expect(writeQuoteState(null, 'co', emptyQuoteState())).toBe(false);
  });

  it('[R-01.24] un getItem que lanza se trata como vacío', () => {
    const storage = new FakeStorage();
    storage.getItem = () => { throw new Error('bloqueado'); };
    expect(readQuoteState(storage, 'co')).toEqual(emptyQuoteState());
  });
});

describe('[R-02.16][R-02.17] selección de plan en el almacenamiento por país', () => {
  it('[R-02.17] la selección vive en el mismo QuoteState que el Paso 1 y hace ida y vuelta', () => {
    const raw = JSON.stringify({ schemaVersion: 1, step1: { a: 'x' }, selectedPlan: { planDocumentId: 'p1', priceSeenAtSelection: 5 } });
    expect(parseQuoteState(raw)).toEqual({ schemaVersion: 1, step1: { a: 'x' }, selectedPlan: { planDocumentId: 'p1', priceSeenAtSelection: 5 } });
  });

  it('[R-02.16] una selección malformada se descarta sin tocar el Paso 1', () => {
    const raw = JSON.stringify({ schemaVersion: 1, step1: { a: 'x' }, selectedPlan: { planDocumentId: 3 } });
    expect(parseQuoteState(raw)).toEqual({ schemaVersion: 1, step1: { a: 'x' } });
  });
});
