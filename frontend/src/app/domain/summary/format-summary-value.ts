import type { FormFieldConfig, Step1Value, SummaryCopy } from '../../core/contracts/strapi-contracts';
import { parseIsoDate } from '../form/calendar';
import { maskDocumentNumber } from '../payment/mask-document-number';

/**
 * Formato por tipo (R-03.3): select -> etiqueta, date -> formato del país, checkbox -> Sí/No, opcional vacío ->
 * "No informado". Solo el rol `document_number` se enmascara (R-03.4); el correo se muestra tal cual (R-03.24).
 */
export function formatSummaryValue(field: FormFieldConfig, value: Step1Value | undefined, locale: string, copy: SummaryCopy): string {
  if (field.type === 'checkbox') return value === true ? copy.yes : copy.no;
  const text = typeof value === 'string' ? value.trim() : '';
  if (text === '') return copy.notProvided;
  if (field.semanticRole === 'document_number') {
    const masked = maskDocumentNumber(text);
    return masked === '' ? copy.notProvided : masked;
  }
  if (field.type === 'select') return field.options.find((o) => o.value === text)?.label ?? copy.notProvided;
  if (field.type === 'date') {
    const date = parseIsoDate(text);
    if (!date) return text;
    const local = new Date(date.year, date.month - 1, date.day);
    try {
      return new Intl.DateTimeFormat(locale, { day: '2-digit', month: '2-digit', year: 'numeric' }).format(local);
    } catch {
      return text;
    }
  }
  return text;
}
