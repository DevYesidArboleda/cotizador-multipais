import type { RandomBytesSource } from '../../core/contracts/strapi-contracts';

const pad = (n: number, width: number): string => String(n).padStart(width, '0');

/** Fuente por defecto: `crypto.getRandomValues` (R-03.13). */
export const cryptoRandomBytes: RandomBytesSource = (length) => crypto.getRandomValues(new Uint8Array(length));

/**
 * `COT-<PAÍS>-<YYYYMMDD local>-<4 HEX>` (R-03.13). La fecha es la calendario LOCAL (no UTC); los 4 hex salen de 2 bytes
 * de la fuente inyectable.
 */
export function generateQuoteNumber(now: Date, random: RandomBytesSource, countryCode: string): string {
  const date = `${pad(now.getFullYear(), 4)}${pad(now.getMonth() + 1, 2)}${pad(now.getDate(), 2)}`;
  const hex = Array.from(random(2))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();
  return `COT-${countryCode.toUpperCase()}-${date}-${hex}`;
}
