import { STRAPI_QUERIES } from '../contracts/strapi-contracts';
import type { StrapiResource } from '../contracts/strapi-contracts';

/**
 * Sustituye `{code}` en `STRAPI_QUERIES[resource]`; `code` ya normalizado (R-01.23).
 * Solo produce rutas relativas `/api/...` (CLAUDE.md §7): nunca origen ni token.
 */
export function buildStrapiUrl(resource: StrapiResource, code = ''): string {
  return STRAPI_QUERIES[resource].replace('{code}', encodeURIComponent(code));
}

/** Una URL permitida para el navegador: relativa, bajo `/api/` y sin esquema ni protocolo implícito. */
export function isAllowedApiUrl(url: string): boolean {
  return url.startsWith('/api/') && !url.startsWith('//');
}
