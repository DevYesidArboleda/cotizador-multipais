import { FORM_SECTIONS } from '../../core/contracts/strapi-contracts';
import type { FormFieldConfig } from '../../core/contracts/strapi-contracts';

/**
 * Secciones en orden fijo (policyholder, vehicle); dentro de cada una `order` asc y desempate por
 * `createdAt` asc (R-01.2, GAP-01.13, AC-01.26). `documentId` es el último desempate: orden determinista.
 */
export function sortFieldsForLayout(fields: readonly FormFieldConfig[]): readonly FormFieldConfig[] {
  const sectionRank = (f: FormFieldConfig): number => FORM_SECTIONS.indexOf(f.section);
  const compareText = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);
  return [...fields].sort(
    (a, b) =>
      sectionRank(a) - sectionRank(b) ||
      a.order - b.order ||
      compareText(a.createdAt, b.createdAt) ||
      compareText(a.documentId, b.documentId),
  );
}
