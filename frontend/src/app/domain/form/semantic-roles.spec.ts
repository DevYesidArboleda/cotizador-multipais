import { buildFormConfig, toCountryConfig } from '../../core/http/mappers';
import type { ConfigIssue, StrapiFormFieldDto } from '../../core/contracts/strapi-contracts';
import { buildReadyConfig, coFields, countryDto, fieldDto, fieldOf, listOf, TODAY, validValues } from '../../testing/form-fixtures';
import { validateStep1 } from './validate-step1';

function build(mutate: (f: StrapiFormFieldDto[]) => StrapiFormFieldDto[]) {
  const country = toCountryConfig(listOf([countryDto()]));
  if (country.kind !== 'ok') throw new Error('país');
  return buildFormConfig(country.country, listOf(mutate(coFields())));
}
const issuesOf = (r: ReturnType<typeof build>): readonly ConfigIssue[] => (r.kind === 'config-error' ? r.issues : []);

describe('[R-01.11] roles semánticos requeridos', () => {
  it.each(['birth_date', 'vehicle_year', 'document_number'] as const)('[R-01.11][AC-01.7] falta el rol %s → config-error que lo nombra', (role) => {
    const result = build((f) => f.filter((x) => x.semanticRole !== role));
    expect(result.kind).toBe('config-error');
    expect(issuesOf(result)).toContainEqual({ code: 'role-missing', role });
  });

  it('[R-01.11] rol duplicado → config-error que lo nombra', () => {
    const result = build((f) => [...f, fieldDto({ key: 'dup', semanticRole: 'birth_date', type: 'date' })]);
    expect(issuesOf(result).map((i) => i.code)).toContain('role-duplicated');
  });

  it('[R-01.11] tipo distinto del esperado para el rol → config-error', () => {
    const result = build((f) => f.map((x) => (x.semanticRole === 'birth_date' ? { ...x, type: 'text' as const } : x)));
    expect(issuesOf(result)).toContainEqual(expect.objectContaining({ code: 'role-type-mismatch', role: 'birth_date', expected: 'date', actual: 'text' }));
  });

  it('[R-01.11] validatorKey incompatible con el rol → config-error', () => {
    const result = build((f) => f.map((x) => (x.semanticRole === 'full_name' ? { ...x, validation: { validatorKey: 'legal_age' as const } } : x)));
    expect(issuesOf(result)).toContainEqual(expect.objectContaining({ code: 'validator-role-mismatch', validatorKey: 'legal_age' }));
  });

  it('[R-01.11] depends_on_option_pattern sin dependsOnRole que apunte a un select → config-error', () => {
    const result = build((f) =>
      f.map((x) => (x.semanticRole === 'document_number' ? { ...x, validation: { validatorKey: 'depends_on_option_pattern' as const } } : x)),
    );
    expect(issuesOf(result).map((i) => i.code)).toContain('dependent-role-invalid');
  });

  it('[R-01.11] un patrón que no compila → config-error en ese campo, sin excepción', () => {
    const result = build((f) => f.map((x) => (x.semanticRole === 'full_name' ? { ...x, validation: { pattern: '([', validatorKey: 'none' as const } } : x)));
    expect(issuesOf(result)).toContainEqual(expect.objectContaining({ code: 'invalid-pattern', source: 'field' }));
  });
});

describe('[R-01.28] rol email', () => {
  it('[R-01.28] dos campos con rol email → config-error que nombra el rol', () => {
    const result = build((f) => [...f, fieldDto({ key: 'email2', semanticRole: 'email', type: 'text' })]);
    expect(issuesOf(result)).toContainEqual(expect.objectContaining({ code: 'role-duplicated', role: 'email' }));
  });

  it('[R-01.28] un campo email con type distinto de text → config-error', () => {
    const result = build((f) => f.map((x) => (x.semanticRole === 'email' ? { ...x, type: 'number' as const } : x)));
    expect(issuesOf(result)).toContainEqual(expect.objectContaining({ code: 'role-type-mismatch', role: 'email', expected: 'text' }));
  });

  it('[R-01.28] sin campo email el cotizador sigue operando (el rol no es requerido)', () => {
    expect(build((f) => f.filter((x) => x.semanticRole !== 'email')).kind).toBe('ready');
  });
});

describe('[R-01.12] la lógica localiza por rol, nunca por key', () => {
  it('[R-01.12][AC-01.8] renombrar todas las key produce los mismos errores de validación', () => {
    const original = buildReadyConfig();
    const renamed = buildReadyConfig({ mutate: (f) => f.map((x, i) => ({ ...x, key: `zzz_${i}` })) });
    const bad = (config: typeof original) => ({
      ...validValues(config),
      [fieldOf(config, 'birth_date').documentId]: '2015-01-01',
      [fieldOf(config, 'vehicle_year').documentId]: '1999',
    });
    const roles = (config: typeof original) =>
      validateStep1(config, bad(config), TODAY).map((e) => ({ rule: e.rule, role: config.fields.find((f) => f.documentId === e.fieldDocumentId)?.semanticRole }));
    expect(roles(renamed)).toEqual(roles(original));
    expect(roles(original).map((r) => r.role)).toEqual(['birth_date', 'vehicle_year']);
  });

  it('[R-01.12] la persistencia usa documentId: renombrar la key no cambia el índice de valores', () => {
    const a = buildReadyConfig();
    const b = buildReadyConfig({ mutate: (f) => f.map((x) => ({ ...x, key: `k_${x.documentId}` })) });
    expect(Object.keys(validValues(a)).sort()).toEqual(Object.keys(validValues(b)).sort());
  });
});
