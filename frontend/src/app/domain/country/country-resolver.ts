import { COUNTRY_CODE_PATTERN } from '../../core/contracts/strapi-contracts';

/** País por defecto de la ruta raíz `/` (CLAUDE.md §4: `/` → `co`). Única constante de país del código. */
export const DEFAULT_COUNTRY_CODE = 'co';

/** Minúsculas + `COUNTRY_CODE_PATTERN`; `null` si no es un código posible (R-01.1). */
export function normalizeCountryCode(raw: string): string | null {
  const code = raw.trim().toLowerCase();
  return COUNTRY_CODE_PATTERN.test(code) ? code : null;
}

export type CountryRouteDecision =
  | { kind: 'ok'; code: string }
  | { kind: 'redirect-lowercase'; code: string }
  | { kind: 'not-found' };

/** Decide qué hacer con el segmento `:country` antes de consultar a Strapi (R-01.1, AC-01.6). */
export function decideCountrySegment(raw: string): CountryRouteDecision {
  const code = normalizeCountryCode(raw);
  if (code === null) return { kind: 'not-found' };
  return code === raw ? { kind: 'ok', code } : { kind: 'redirect-lowercase', code };
}

export type QuoteRoute =
  | { kind: 'step'; country: string; step: 1 | 2 | 3 }
  | { kind: 'confirmation'; country: string }
  | { kind: 'country-not-found' }
  | { kind: 'other' };

/** Interpreta una URL del wizard (sin consultar el router) para stepper, título y selector de país. */
export function parseQuoteUrl(url: string): QuoteRoute {
  const path = url.split(/[?#]/, 1)[0] ?? '';
  const segments = path.split('/').filter((s) => s.length > 0);
  if (segments[0] === 'country-not-found') return { kind: 'country-not-found' };
  const country = segments[0] ? normalizeCountryCode(segments[0]) : null;
  if (country === null || segments[1] !== 'quote') return { kind: 'other' };
  switch (segments[2]) {
    case 'step-1':
      return { kind: 'step', country, step: 1 };
    case 'step-2':
      return { kind: 'step', country, step: 2 };
    case 'step-3':
      return { kind: 'step', country, step: 3 };
    case 'confirmation':
      return { kind: 'confirmation', country };
    default:
      return { kind: 'other' };
  }
}
