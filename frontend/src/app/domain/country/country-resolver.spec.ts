import { decideCountrySegment, normalizeCountryCode, parseQuoteUrl } from './country-resolver';

describe('[R-01.1] resolvedor de país', () => {
  it('[R-01.1] normaliza mayúsculas a minúsculas y exige dos letras', () => {
    expect(normalizeCountryCode('CL')).toBe('cl');
    expect(normalizeCountryCode(' co ')).toBe('co');
    expect(normalizeCountryCode('col')).toBeNull();
    expect(normalizeCountryCode('c1')).toBeNull();
    expect(normalizeCountryCode('')).toBeNull();
  });

  it('[R-01.1][AC-01.6] el código en mayúsculas redirige a minúsculas; el imposible va a /country-not-found', () => {
    expect(decideCountrySegment('cl')).toEqual({ kind: 'ok', code: 'cl' });
    expect(decideCountrySegment('CL')).toEqual({ kind: 'redirect-lowercase', code: 'cl' });
    expect(decideCountrySegment('pe1')).toEqual({ kind: 'not-found' });
  });

  it('[R-01.1] interpreta las URLs del wizard sin lista de países en el código', () => {
    expect(parseQuoteUrl('/co/quote/step-2?x=1')).toEqual({ kind: 'step', country: 'co', step: 2 });
    expect(parseQuoteUrl('/zz/quote/confirmation')).toEqual({ kind: 'confirmation', country: 'zz' });
    expect(parseQuoteUrl('/country-not-found')).toEqual({ kind: 'country-not-found' });
    expect(parseQuoteUrl('/')).toEqual({ kind: 'other' });
  });
});
