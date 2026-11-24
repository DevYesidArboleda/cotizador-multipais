import { planOf } from '../../testing/plan-fixtures';
import { assertPlanCurrency } from './plans';

describe('[R-02.19][AC-02.21] moneda del plan frente a la del país', () => {
  const country = { currencyCode: 'COP' } as const;

  it('[R-02.19] planes coherentes no producen issue', () => {
    expect(assertPlanCurrency([planOf(), planOf()], country)).toBeNull();
  });

  it('[R-02.19][AC-02.21] moneda distinta nombra al plan y a las dos monedas', () => {
    const issue = assertPlanCurrency([planOf(), planOf({ name: 'Plan X', declaredCurrency: 'CLP' })], country);
    expect(issue).toMatchObject({ code: 'plan-currency-mismatch', planName: 'Plan X', planCurrency: 'CLP', countryCurrency: 'COP' });
  });

  it('[R-02.19][AC-02.21] moneda ausente, nula o fuera del enum también es config-error', () => {
    expect(assertPlanCurrency([planOf({ declaredCurrency: null })], country)).not.toBeNull();
    expect(assertPlanCurrency([planOf({ declaredCurrency: 'USD' })], country)).not.toBeNull();
  });

  it('[R-02.19] un plan inactivo no dispara el error', () => {
    expect(assertPlanCurrency([planOf({ isActive: false, declaredCurrency: 'CLP' })], country)).toBeNull();
  });
});
