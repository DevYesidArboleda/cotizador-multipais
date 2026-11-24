import { validPlanOf } from '../../testing/plan-fixtures';
import { pickRecommended } from './plans';

describe('[R-02.10] plan recomendado', () => {
  beforeEach(() => vi.spyOn(console, 'warn').mockImplementation(() => undefined));
  afterEach(() => vi.restoreAllMocks());

  it('[R-02.10] sin recomendado devuelve null', () => {
    expect(pickRecommended([validPlanOf(), validPlanOf()])).toBeNull();
  });

  it('[R-02.10] un recomendado se devuelve sin aviso ni reordenar', () => {
    const plans = [validPlanOf({ documentId: 'a' }), validPlanOf({ documentId: 'b', isRecommended: true })];
    expect(pickRecommended(plans)).toBe('b');
    expect(console.warn).not.toHaveBeenCalled();
  });

  it('[R-02.10][AC-02.16] con más de uno solo se destaca el primero y se avisa', () => {
    const plans = [
      validPlanOf({ documentId: 'a', isRecommended: true }),
      validPlanOf({ documentId: 'b', isRecommended: true }),
    ];
    expect(pickRecommended(plans)).toBe('a');
    expect(console.warn).toHaveBeenCalledTimes(1);
  });
});
