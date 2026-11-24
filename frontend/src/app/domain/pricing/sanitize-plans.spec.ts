import { planOf } from '../../testing/plan-fixtures';
import { sanitizePlans } from './plans';

describe('[R-02.3][R-02.4] depuración de planes', () => {
  beforeEach(() => vi.spyOn(console, 'warn').mockImplementation(() => undefined));
  afterEach(() => vi.restoreAllMocks());

  it('[R-02.3] descarta isActive distinto de true y conserva el orden recibido', () => {
    const a = planOf({ documentId: 'a' });
    const b = planOf({ documentId: 'b', isActive: false });
    const c = planOf({ documentId: 'c' });
    const r = sanitizePlans([c, b, a]);
    expect(r.valid.map((p) => p.documentId)).toEqual(['c', 'a']);
    expect(r.excludedDocumentIds).toEqual(['b']);
  });

  it('[R-02.4][AC-02.17] excluye precio no entero, negativo, nulo o sin nombre, con console.warn', () => {
    const bad = [
      planOf({ documentId: 'x1', basePrice: 10.5 }),
      planOf({ documentId: 'x2', basePrice: -1 }),
      planOf({ documentId: 'x3', basePrice: null }),
      planOf({ documentId: 'x4', name: '  ' }),
      planOf({ documentId: 'x5', name: null }),
    ];
    const ok = planOf({ documentId: 'ok' });
    const r = sanitizePlans([...bad, ok]);
    expect(r.valid.map((p) => p.documentId)).toEqual(['ok']);
    expect(console.warn).toHaveBeenCalledTimes(5);
  });

  it('[R-02.4] un plan sin coberturas ni beneficios es válido', () => {
    expect(sanitizePlans([planOf({ coverages: [], benefits: [] })]).valid).toHaveLength(1);
  });

  it('[R-02.4][AC-02.17] si ninguno es válido la lista queda vacía', () => {
    expect(sanitizePlans([planOf({ basePrice: -5 })]).valid).toEqual([]);
  });
});
