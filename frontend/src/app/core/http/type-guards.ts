import {
  FIELD_TYPES,
  FORM_SECTIONS,
  SEMANTIC_ROLES,
  VALIDATOR_KEYS,
} from '../contracts/strapi-contracts';
import type {
  StrapiCountryDto,
  StrapiCountryListItemDto,
  StrapiFormFieldDto,
  StrapiInsurancePlanDto,
  StrapiListResponse,
} from '../contracts/strapi-contracts';

type Rec = Record<string, unknown>;

export function isRecord(value: unknown): value is Rec {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isOneOf<T extends string>(list: readonly T[], value: unknown): value is T {
  return typeof value === 'string' && (list as readonly string[]).includes(value);
}

const isOptionalString = (v: unknown): boolean => v === undefined || v === null || typeof v === 'string';
const isOptionalNumber = (v: unknown): boolean => v === undefined || v === null || typeof v === 'number';

export function isStrapiListResponse(raw: unknown): raw is StrapiListResponse<unknown> {
  if (!isRecord(raw) || !Array.isArray(raw['data'])) return false;
  const meta = raw['meta'];
  if (!isRecord(meta)) return false;
  const pagination = meta['pagination'];
  return isRecord(pagination) && typeof pagination['total'] === 'number';
}

function hasDocumentIdentity(v: Rec): boolean {
  return typeof v['id'] === 'number' && typeof v['documentId'] === 'string' && v['documentId'] !== '';
}

export function isStrapiCountryDto(value: unknown): value is StrapiCountryDto {
  return (
    isRecord(value) &&
    hasDocumentIdentity(value) &&
    typeof value['code'] === 'string' &&
    typeof value['name'] === 'string' &&
    typeof value['currencyCode'] === 'string' &&
    typeof value['locale'] === 'string' &&
    'legalAge' in value &&
    'vehicleMaxAgeYears' in value &&
    'vehicleMaxFutureYears' in value &&
    isOptionalString(value['termsTitle']) &&
    isOptionalString(value['termsContent']) &&
    isOptionalString(value['termsVersion'])
  );
}

export function isStrapiCountryListItemDto(value: unknown): value is StrapiCountryListItemDto {
  return (
    isRecord(value) &&
    hasDocumentIdentity(value) &&
    typeof value['code'] === 'string' &&
    typeof value['name'] === 'string'
  );
}

function isOptionDto(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value['label'] === 'string' &&
    typeof value['value'] === 'string' &&
    isOptionalString(value['validationPattern']) &&
    isOptionalString(value['validationMessage'])
  );
}

function isValidationDto(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  return (
    isRecord(value) &&
    isOptionalNumber(value['min']) &&
    isOptionalNumber(value['max']) &&
    isOptionalNumber(value['minLength']) &&
    isOptionalNumber(value['maxLength']) &&
    isOptionalString(value['pattern']) &&
    (value['validatorKey'] === undefined || value['validatorKey'] === null || isOneOf(VALIDATOR_KEYS, value['validatorKey'])) &&
    (value['dependsOnRole'] === undefined || value['dependsOnRole'] === null || isOneOf(SEMANTIC_ROLES, value['dependsOnRole']))
  );
}

export function isStrapiFormFieldDto(value: unknown): value is StrapiFormFieldDto {
  if (!isRecord(value) || !hasDocumentIdentity(value)) return false;
  const options = value['options'];
  return (
    typeof value['key'] === 'string' &&
    isOneOf(SEMANTIC_ROLES, value['semanticRole']) &&
    isOneOf(FORM_SECTIONS, value['section']) &&
    typeof value['label'] === 'string' &&
    isOneOf(FIELD_TYPES, value['type']) &&
    typeof value['required'] === 'boolean' &&
    typeof value['order'] === 'number' &&
    typeof value['errorMessage'] === 'string' &&
    typeof value['createdAt'] === 'string' &&
    isOptionalString(value['placeholder']) &&
    isOptionalString(value['helpText']) &&
    isValidationDto(value['validation']) &&
    (options === undefined || options === null || (Array.isArray(options) && options.every(isOptionDto)))
  );
}

export function isStrapiInsurancePlanDto(value: unknown): value is StrapiInsurancePlanDto {
  return (
    isRecord(value) &&
    hasDocumentIdentity(value) &&
    typeof value['slug'] === 'string' &&
    typeof value['order'] === 'number' &&
    'basePrice' in value
  );
}
