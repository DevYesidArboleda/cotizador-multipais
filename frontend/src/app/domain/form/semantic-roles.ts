import {
  REQUIRED_SEMANTIC_ROLES,
  ROLE_EXPECTED_TYPE,
  VALIDATOR_REQUIRED_ROLE,
} from '../../core/contracts/strapi-contracts';
import type {
  BusinessRole,
  ConfigIssue,
  FormConfig,
  FormFieldConfig,
  SemanticRole,
} from '../../core/contracts/strapi-contracts';

export function isBusinessRole(role: SemanticRole): role is BusinessRole {
  return role !== 'none';
}

/** Único acceso a campos de negocio: por rol, nunca por `key` (R-01.12). */
export function getFieldByRole(config: FormConfig, role: BusinessRole): FormFieldConfig | undefined {
  return config.roles[role];
}

function isKeyOf<T extends object>(obj: T, key: PropertyKey): key is keyof T {
  return key in obj;
}

/**
 * Valida roles (R-01.11, R-01.28): requeridos presentes una sola vez, duplicados, tipo esperado,
 * compatibilidad `validatorKey` ↔ rol y dependencia de un `select`.
 */
export function resolveRoles(
  fields: readonly FormFieldConfig[],
): { kind: 'ok'; roles: FormConfig['roles'] } | { kind: 'config-error'; issues: readonly ConfigIssue[] } {
  const issues: ConfigIssue[] = [];
  const byRole = new Map<BusinessRole, FormFieldConfig[]>();
  for (const field of fields) {
    if (!isBusinessRole(field.semanticRole)) continue;
    byRole.set(field.semanticRole, [...(byRole.get(field.semanticRole) ?? []), field]);
  }

  for (const role of REQUIRED_SEMANTIC_ROLES) {
    if (!byRole.has(role)) issues.push({ code: 'role-missing', role });
  }
  for (const [role, group] of byRole) {
    if (group.length > 1) {
      issues.push({ code: 'role-duplicated', role, fieldDocumentIds: group.map((f) => f.documentId) });
      continue;
    }
    const only = group[0];
    if (only && isKeyOf(ROLE_EXPECTED_TYPE, role) && only.type !== ROLE_EXPECTED_TYPE[role]) {
      issues.push({
        code: 'role-type-mismatch',
        role,
        expected: ROLE_EXPECTED_TYPE[role],
        actual: only.type,
        fieldDocumentId: only.documentId,
      });
    }
  }

  for (const field of fields) {
    const { validatorKey, dependsOnRole } = field.validation;
    if (isKeyOf(VALIDATOR_REQUIRED_ROLE, validatorKey) && field.semanticRole !== VALIDATOR_REQUIRED_ROLE[validatorKey]) {
      issues.push({ code: 'validator-role-mismatch', validatorKey, role: field.semanticRole, fieldDocumentId: field.documentId });
    }
    if (validatorKey === 'depends_on_option_pattern') {
      const target = dependsOnRole === null ? undefined : byRole.get(dependsOnRole);
      const valid = target !== undefined && target.length === 1 && target[0]?.type === 'select';
      if (!valid) issues.push({ code: 'dependent-role-invalid', fieldDocumentId: field.documentId, dependsOnRole });
    }
  }

  if (issues.length > 0) return { kind: 'config-error', issues };

  const roles: Partial<Record<BusinessRole, FormFieldConfig>> = {};
  for (const [role, group] of byRole) {
    const first = group[0];
    if (first) roles[role] = first;
  }
  const { birth_date, vehicle_year, document_number } = roles;
  if (!birth_date || !vehicle_year || !document_number) {
    return { kind: 'config-error', issues: [] }; // inalcanzable: los roles requeridos ya se verificaron
  }
  return { kind: 'ok', roles: { ...roles, birth_date, vehicle_year, document_number } };
}
