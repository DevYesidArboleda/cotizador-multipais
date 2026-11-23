import { STRAPI_MAX_PAGE_SIZE } from '../contracts/strapi-contracts';
import type {
  BusinessRole,
  CompiledPattern,
  ConfigIssue,
  CountryConfig,
  CountryConfigResult,
  CountryLink,
  CountryRuleParam,
  CountryRules,
  FieldValidationConfig,
  FormConfigResult,
  FormFieldConfig,
  FormFieldOption,
  JsonScalar,
  StrapiFieldOptionDto,
  StrapiFieldValidationDto,
  StrapiFormFieldDto,
} from '../contracts/strapi-contracts';
import { normalizeCountryCode } from '../../domain/country/country-resolver';
import { sortFieldsForLayout } from '../../domain/form/form-layout';
import { resolveRoles } from '../../domain/form/semantic-roles';
import {
  isStrapiCountryDto,
  isStrapiCountryListItemDto,
  isStrapiFormFieldDto,
  isStrapiListResponse,
} from './type-guards';

/**
 * Compila el patrón de negocio una sola vez. Se aplica al valor completo (`^(?:patrón)$`): los patrones de
 * Strapi ya vienen anclados, y uno sin anclas no puede aceptar solo una parte del valor (R-01.6).
 */
export function compilePattern(source: string): CompiledPattern | null {
  try {
    return { source, regex: new RegExp(`^(?:${source})$`) };
  } catch {
    return null;
  }
}

const RULE_PARAMS: readonly CountryRuleParam[] = ['legalAge', 'vehicleMaxAgeYears', 'vehicleMaxFutureYears'];

function isNonNegativeInteger(v: JsonScalar | undefined): v is number {
  return typeof v === 'number' && Number.isInteger(v) && v >= 0;
}

/** `/api/countries?filters[code]...` → país, `not-found` (0 elementos) o `config-error` (R-01.1, R-01.15). */
export function toCountryConfig(raw: unknown): CountryConfigResult {
  if (!isStrapiListResponse(raw)) return { kind: 'config-error', issues: [{ code: 'malformed-response', resource: 'country' }] };
  const first = raw.data[0];
  if (first === undefined) return { kind: 'not-found' };
  if (!isStrapiCountryDto(first)) return { kind: 'config-error', issues: [{ code: 'malformed-response', resource: 'country' }] };

  const code = normalizeCountryCode(first.code);
  if (code === null) return { kind: 'not-found' };

  const issues: ConfigIssue[] = [];
  for (const param of RULE_PARAMS) {
    if (!isNonNegativeInteger(first[param])) issues.push({ code: 'invalid-country-param', param, value: first[param] });
  }
  if (issues.length > 0) return { kind: 'config-error', issues };

  const rules: CountryRules = {
    legalAge: first.legalAge as number,
    vehicleMaxAgeYears: first.vehicleMaxAgeYears as number,
    vehicleMaxFutureYears: first.vehicleMaxFutureYears as number,
  };
  const country: CountryConfig = {
    documentId: first.documentId,
    code,
    name: first.name,
    currencyCode: first.currencyCode,
    locale: first.locale,
    rules,
    terms: { title: first.termsTitle ?? '', content: first.termsContent ?? '', version: first.termsVersion ?? '' },
  };
  return { kind: 'ok', country };
}

/** Lista para `/country-not-found` y el selector del header (R-01.1). `null` si la forma es inválida. */
export function toCountryLinks(raw: unknown): readonly CountryLink[] | null {
  if (!isStrapiListResponse(raw)) return null;
  const links: CountryLink[] = [];
  for (const item of raw.data) {
    if (!isStrapiCountryListItemDto(item)) return null;
    const code = normalizeCountryCode(item.code);
    if (code !== null) links.push({ code, name: item.name });
  }
  return links;
}

function mapOption(dto: StrapiFieldOptionDto, fieldDocumentId: string, fieldLabel: string, issues: ConfigIssue[]): FormFieldOption {
  let validationPattern: CompiledPattern | null = null;
  if (dto.validationPattern) {
    validationPattern = compilePattern(dto.validationPattern);
    if (!validationPattern) {
      issues.push({ code: 'invalid-pattern', fieldDocumentId, fieldLabel, source: 'option', optionLabel: dto.label });
    }
  }
  return {
    label: dto.label,
    value: dto.value,
    validationPattern,
    validationMessage: dto.validationMessage ?? null,
    priceAdjustmentPct: dto.priceAdjustmentPct ?? null,
  };
}

function mapValidation(dto: StrapiFormFieldDto, issues: ConfigIssue[]): FieldValidationConfig {
  const v: StrapiFieldValidationDto = dto.validation ?? {};
  let pattern: CompiledPattern | null = null;
  if (v.pattern) {
    pattern = compilePattern(v.pattern);
    if (!pattern) {
      issues.push({ code: 'invalid-pattern', fieldDocumentId: dto.documentId, fieldLabel: dto.label, source: 'field', optionLabel: null });
    }
  }
  const dependsOnRole: BusinessRole | null = v.dependsOnRole && v.dependsOnRole !== 'none' ? v.dependsOnRole : null;
  return {
    min: v.min ?? null,
    max: v.max ?? null,
    minLength: v.minLength ?? null,
    maxLength: v.maxLength ?? null,
    pattern,
    validatorKey: v.validatorKey ?? 'none',
    dependsOnRole,
  };
}

/** GAP-01.12: validadores que no aplican al tipo se ignoran con aviso (sin datos personales). */
function warnIgnoredValidators(dto: StrapiFormFieldDto, validation: FieldValidationConfig): void {
  const numericOnly = validation.min !== null || validation.max !== null;
  const textOnly = validation.minLength !== null || validation.maxLength !== null || validation.pattern !== null;
  const ignored = (numericOnly && dto.type !== 'number') || (textOnly && dto.type !== 'text');
  if (ignored) console.warn(`[form-config] validadores ignorados por tipo en el campo ${dto.documentId}`);
}

function mapField(dto: StrapiFormFieldDto, issues: ConfigIssue[]): FormFieldConfig {
  const validation = mapValidation(dto, issues);
  warnIgnoredValidators(dto, validation);
  return {
    documentId: dto.documentId,
    key: dto.key,
    semanticRole: dto.semanticRole,
    section: dto.section,
    type: dto.type,
    label: dto.label,
    required: dto.required,
    order: dto.order,
    createdAt: dto.createdAt,
    placeholder: dto.placeholder ?? null,
    helpText: dto.helpText ?? null,
    errorMessage: dto.errorMessage,
    validation,
    options:
      dto.type === 'select' ? (dto.options ?? []).map((o) => mapOption(o, dto.documentId, dto.label, issues)) : [],
  };
}

/** Campos → configuración validada: roles, tipos, validadores, patrones, total ≤ 100 (R-01.2, R-01.6, R-01.11, R-01.23). */
export function buildFormConfig(country: CountryConfig, raw: unknown): FormConfigResult {
  if (!isStrapiListResponse(raw)) return { kind: 'config-error', issues: [{ code: 'malformed-response', resource: 'formFields' }] };
  const total = raw.meta.pagination.total;
  if (total > STRAPI_MAX_PAGE_SIZE || raw.data.length > STRAPI_MAX_PAGE_SIZE) {
    return { kind: 'config-error', issues: [{ code: 'too-many-results', resource: 'formFields', total }] };
  }
  if (!raw.data.every(isStrapiFormFieldDto)) {
    return { kind: 'config-error', issues: [{ code: 'malformed-response', resource: 'formFields' }] };
  }
  if (raw.data.length === 0) return { kind: 'empty' };

  const issues: ConfigIssue[] = [];
  const fields = sortFieldsForLayout(raw.data.map((dto) => mapField(dto, issues)));
  const resolved = resolveRoles(fields);
  if (resolved.kind === 'config-error') issues.push(...resolved.issues);
  if (issues.length > 0 || resolved.kind !== 'ok') return { kind: 'config-error', issues };
  return { kind: 'ready', config: { country, fields, roles: resolved.roles } };
}
