import type { ConfigIssue, CountryConfig, FormConfig } from '../contracts/strapi-contracts';
import { buildFormConfig, toCountryConfig } from '../http/mappers';

/** Resultado de cargar país + campos (R-01.1, R-01.11, R-01.22, R-01.23). */
export type ConfigLoadResult =
  | { kind: 'ready'; config: FormConfig }
  | { kind: 'empty'; country: CountryConfig }
  | { kind: 'not-found' }
  | { kind: 'error' }
  | { kind: 'config-error'; issues: readonly ConfigIssue[] };

/** Combina las dos respuestas crudas de Strapi en un único resultado discriminado. */
export function resolveConfigLoad(rawCountry: unknown, rawFields: unknown): ConfigLoadResult {
  const country = toCountryConfig(rawCountry);
  if (country.kind === 'not-found') return { kind: 'not-found' };
  if (country.kind === 'config-error') return country;
  const form = buildFormConfig(country.country, rawFields);
  if (form.kind === 'empty') return { kind: 'empty', country: country.country };
  return form;
}
