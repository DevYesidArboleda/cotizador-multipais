import type { FormConfig, Step1Values, SummaryBlocks, SummaryCopy, SummaryRow } from '../../core/contracts/strapi-contracts';
import { formatSummaryValue } from './format-summary-value';

/**
 * Bloques tomador y vehículo desde la configuración vigente, en su orden (R-03.2). Ningún nombre de campo está en el
 * código; los valores huérfanos (sin campo publicado) no se muestran.
 */
export function buildSummaryRows(config: FormConfig, values: Step1Values, copy: SummaryCopy): SummaryBlocks {
  const rowOf = (field: FormConfig['fields'][number]): SummaryRow => ({
    fieldDocumentId: field.documentId,
    label: field.label,
    displayValue: formatSummaryValue(field, values[field.documentId], config.country.locale, copy),
  });
  return {
    policyholder: config.fields.filter((f) => f.section === 'policyholder').map(rowOf),
    vehicle: config.fields.filter((f) => f.section === 'vehicle').map(rowOf),
  };
}
