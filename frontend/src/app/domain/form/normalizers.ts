import type { InputAttributes, SemanticRole } from '../../core/contracts/strapi-contracts';

/** Trim, sin puntos ni espacios, `k`→`K`, con guion antes del DV (R-01.18). */
export function normalizeRut(raw: string): string {
  const compact = raw.trim().replace(/[.\s-]/g, '').replace(/k/g, 'K');
  if (compact.length < 2) return compact;
  return `${compact.slice(0, -1)}-${compact.slice(-1)}`;
}

const RUT_SHAPE = /^[0-9]{7,8}-?[0-9K]$/;
const RUT_SERIES = [2, 3, 4, 5, 6, 7] as const;

/** Forma `^[0-9]{7,8}-?[0-9K]$` + Módulo 11 sobre el valor normalizado (R-01.18). */
export function isValidRut(normalized: string): boolean {
  if (!RUT_SHAPE.test(normalized)) return false;
  const compact = normalized.replace('-', '');
  const body = compact.slice(0, -1);
  const dv = compact.slice(-1);
  let sum = 0;
  for (let i = 0; i < body.length; i++) {
    const digit = Number(body[body.length - 1 - i]);
    sum += digit * (RUT_SERIES[i % RUT_SERIES.length] ?? 2);
  }
  const check = 11 - (sum % 11);
  const expected = check === 11 ? '0' : check === 10 ? 'K' : String(check);
  return dv === expected;
}

/** Trim, sin espacios ni guiones, mayúsculas (R-01.19). */
export function normalizePlate(raw: string): string {
  return raw.trim().replace(/[\s-]/g, '').toUpperCase();
}

/** Solo `trim()` (R-01.29). */
export function normalizeEmail(raw: string): string {
  return raw.trim();
}

/** Atributos HTML derivados del rol, nunca de la `key` (R-01.30, WCAG 1.3.5, HITL-2 P3). */
export function inputAttributesForRole(role: SemanticRole): InputAttributes {
  switch (role) {
    case 'email':
      return { autocomplete: 'email', inputmode: 'email', spellcheck: false };
    case 'full_name':
      return { autocomplete: 'name' };
    case 'phone':
      return { autocomplete: 'tel', inputmode: 'tel' };
    case 'birth_date':
      return { autocomplete: 'bday' };
    case 'city':
      return { autocomplete: 'address-level2' };
    default:
      return {};
  }
}
