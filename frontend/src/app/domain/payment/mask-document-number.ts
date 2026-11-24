/**
 * Enmascara el número de documento sobre el valor normalizado (trim, sin puntos ni espacios) (R-03.4):
 * 0 -> '', 1 -> '*', 2 a 4 -> '*' x (n-1) + último, > 4 -> '*' x (n-4) + últimos 4.
 */
export function maskDocumentNumber(value: string): string {
  const normalized = value.replace(/[.\s]/g, '');
  const n = normalized.length;
  if (n === 0) return '';
  if (n === 1) return '*';
  if (n <= 4) return '*'.repeat(n - 1) + normalized.slice(-1);
  return '*'.repeat(n - 4) + normalized.slice(-4);
}
