import type { ConfigIssue } from '../core/contracts/strapi-contracts';
import type { CopyParams, UiCopyKey } from './ui-copy.es';
import { UI_COPY } from './ui-copy.es';

/** Texto del catálogo con interpolación `{nombre}`; un parámetro ausente se deja visible para detectarlo. */
export function t(key: UiCopyKey, params: CopyParams = {}): string {
  return UI_COPY[key].replace(/\{(\w+)\}/g, (whole, name: string) => {
    const value = params[name];
    return value === undefined ? whole : String(value);
  });
}

/** Resumen de errores del Paso 1: singular/plural por clave (`.one`/`.other`). */
export function validationSummary(count: number): string {
  if (count <= 0) return t('validation.summary.none');
  return count === 1 ? t('validation.summary.one') : t('validation.summary.other', { count });
}

/** Mensaje de un `config-error` que nombra el rol, campo o parámetro (R-01.11; el texto sale del catálogo). */
export function describeConfigIssue(issue: ConfigIssue): string {
  switch (issue.code) {
    case 'role-missing':
      return t('config.role.missing', { rol: issue.role });
    case 'role-duplicated':
      return t('config.role.duplicate', { rol: issue.role });
    case 'role-type-mismatch':
      return t('config.role.type', { rol: issue.role, tipoEsperado: issue.expected });
    case 'validator-role-mismatch':
      return t('config.validator.incompatible', { validador: issue.validatorKey, rol: issue.role });
    case 'dependent-role-invalid':
      return t('config.dependent.invalid', { campo: issue.fieldDocumentId });
    case 'invalid-pattern':
      return issue.source === 'option'
        ? t('config.pattern.invalidOption', { opcion: issue.optionLabel ?? '', campo: issue.fieldLabel })
        : t('config.pattern.invalid', { campo: issue.fieldLabel });
    case 'invalid-country-param':
      return t('config.country.params');
    case 'invalid-locale-or-currency':
      return t('config.locale.invalid');
    case 'too-many-results':
      return t('config.pagination');
    case 'malformed-response':
      return t('config.malformed', { recurso: issue.resource });
    case 'plan-currency-mismatch':
      return t('config.currency.mismatch', {
        plan: issue.planName,
        monedaPlan: issue.planCurrency ?? '',
        monedaPais: issue.countryCurrency,
      });
    case 'invalid-city-adjustment':
      return t('config.city.invalid', { opcion: issue.optionLabel, campo: issue.fieldLabel });
    case 'invalid-pricing-input':
      return t('config.pricing.missingInput', { rol: issue.role });
    case 'empty-terms':
      return t('config.terms.empty');
  }
}
