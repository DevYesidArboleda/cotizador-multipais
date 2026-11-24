import type { CountryConfig, FormatPriceResult } from '../../core/contracts/strapi-contracts';

/**
 * `Intl.NumberFormat(country.locale, { style: 'currency', currency: country.currencyCode, 0 decimales })` (R-02.5).
 * Sin `if` por país. Locale o moneda inválidos → `config-error` (GAP-02.11), nunca una excepción.
 */
export function formatPrice(amount: number, country: Pick<CountryConfig, 'locale' | 'currencyCode'>): FormatPriceResult {
  const fail: FormatPriceResult = {
    kind: 'config-error',
    issue: { code: 'invalid-locale-or-currency', locale: country.locale, currencyCode: country.currencyCode },
  };
  if (!/^[A-Z]{3}$/.test(country.currencyCode)) return fail;
  try {
    const text = new Intl.NumberFormat(country.locale, {
      style: 'currency',
      currency: country.currencyCode,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
    return { kind: 'ok', text };
  } catch {
    return fail;
  }
}
