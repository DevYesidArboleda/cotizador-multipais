import { formatPrice } from './format-price';

const norm = (s: string): string => s.replace(/[\s\u00a0\u202f]+/g, ' ');

describe('[R-02.5][AC-02.7] formato de moneda por país', () => {
  it('[R-02.5][AC-02.7] COP con es-CO', () => {
    const r = formatPrice(1_220_000, { locale: 'es-CO', currencyCode: 'COP' });
    expect(r.kind === 'ok' && norm(r.text)).toMatch(/^\$ ?1\.220\.000$/);
  });

  it('[R-02.5][AC-02.7] CLP con es-CL', () => {
    const r = formatPrice(1_220_000, { locale: 'es-CL', currencyCode: 'CLP' });
    expect(r.kind === 'ok' && norm(r.text)).toMatch(/^\$ ?1\.220\.000$/);
  });

  it('[R-02.5] sin decimales', () => {
    const r = formatPrice(1_162, { locale: 'es-CO', currencyCode: 'COP' });
    expect(r.kind === 'ok' && r.text).not.toMatch(/,/);
  });

  it('[R-02.5] locale o moneda inválidos producen config-error', () => {
    expect(formatPrice(1, { locale: 'xx-INVALID-zz-', currencyCode: 'COP' }).kind).toBe('config-error');
    expect(formatPrice(1, { locale: 'es-CO', currencyCode: 'ZZ' as never }).kind).toBe('config-error');
    expect(formatPrice(1, { locale: 'es-CO', currencyCode: 'cop' as never }).kind).toBe('config-error');
  });
});
