import type { FormFieldConfig } from '../../core/contracts/strapi-contracts';
import { buildReadyConfig, fieldDto, fieldOf, TODAY } from '../../testing/form-fixtures';
import { isEmptyValue, isErrorVisible, validateField } from './field-validators';

function configWith(...extra: ReturnType<typeof fieldDto>[]) {
  return buildReadyConfig({ mutate: (f) => [...f, ...extra] });
}
function run(field: FormFieldConfig, value: string | boolean | null, config = buildReadyConfig()) {
  return validateField(field, value, { config, values: {}, now: TODAY });
}
function extraField(partial: Parameters<typeof fieldDto>[0]) {
  const config = configWith(fieldDto(partial));
  const field = config.fields.find((f) => f.documentId === `doc-${partial.key}`);
  if (!field) throw new Error('campo no encontrado');
  return { config, field };
}

describe('[R-01.5] obligatoriedad', () => {
  it('[R-01.5] text/number/date/select requeridos fallan si el valor recortado es vacío', () => {
    const config = buildReadyConfig();
    for (const role of ['full_name', 'vehicle_year', 'birth_date', 'city'] as const) {
      const field = fieldOf(config, role);
      expect(run(field, '   ', config)?.rule).toBe('required');
      expect(run(field, null, config)?.rule).toBe('required');
    }
  });

  it('[R-01.5][AC-01.27] un checkbox requerido sin marcar falla y marcado pasa; uno no requerido nunca bloquea', () => {
    const { config, field } = extraField({ key: 'terms', semanticRole: 'none', type: 'checkbox', required: true });
    expect(run(field, false, config)?.message).toBe(field.errorMessage);
    expect(run(field, null, config)?.rule).toBe('required');
    expect(run(field, true, config)).toBeNull();
    const optional = fieldOf(buildReadyConfig(), 'vehicle_use');
    expect(run(optional, false)).toBeNull();
    expect(isEmptyValue(optional, false)).toBe(true);
  });

  it('[R-01.5] un campo opcional vacío no ejecuta otros validadores', () => {
    const { config, field } = extraField({
      key: 'opt', semanticRole: 'none', type: 'text', required: false,
      validation: { pattern: '^[0-9]+$', minLength: 5, validatorKey: 'none' },
    });
    expect(run(field, '', config)).toBeNull();
    expect(run(field, 'abc', config)).not.toBeNull();
  });
});

describe('[R-01.6] validadores declarativos', () => {
  it('[R-01.6] min y max son inclusivos y solo aplican a number', () => {
    const { config, field } = extraField({ key: 'n', semanticRole: 'none', type: 'number', validation: { min: 1, max: 5, validatorKey: 'none' } });
    expect(run(field, '1', config)).toBeNull();
    expect(run(field, '5', config)).toBeNull();
    expect(run(field, '0', config)?.rule).toBe('min');
    expect(run(field, '6', config)?.rule).toBe('max');
    expect(run(field, 'abc', config)?.rule).toBe('numeric');
  });

  it('[R-01.6] minLength y maxLength miden el texto recortado, inclusivos', () => {
    const { config, field } = extraField({ key: 't', semanticRole: 'none', type: 'text', validation: { minLength: 2, maxLength: 4, validatorKey: 'none' } });
    expect(run(field, ' ab ', config)).toBeNull();
    expect(run(field, 'a', config)?.rule).toBe('min-length');
    expect(run(field, 'abcde', config)?.rule).toBe('max-length');
  });

  it('[R-01.6] el patrón se aplica al valor completo, no a una parte', () => {
    const { config, field } = extraField({ key: 'p', semanticRole: 'none', type: 'text', validation: { pattern: '[0-9]+', validatorKey: 'none' } });
    expect(run(field, '123', config)).toBeNull();
    expect(run(field, '123abc', config)?.rule).toBe('pattern');
  });

  it('[R-01.6] min/max en un campo text se ignoran con aviso sin datos personales', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { config, field } = extraField({ key: 'w', semanticRole: 'none', type: 'text', validation: { min: 1, validatorKey: 'none' } });
    expect(run(field, 'abc', config)).toBeNull();
    expect(warn).toHaveBeenCalledOnce();
    expect(String(warn.mock.calls[0]?.[0])).not.toContain('abc');
    warn.mockRestore();
  });
});

describe('[R-01.4] un solo mensaje por campo', () => {
  it('[R-01.4] cada fallo devuelve exactamente el errorMessage del campo', () => {
    const config = buildReadyConfig();
    const year = fieldOf(config, 'vehicle_year');
    for (const bad of ['', 'abc', '1999', '2999']) {
      const error = run(year, bad, config);
      expect(error?.message).toBe(year.errorMessage);
    }
  });

  it('[R-01.4] un valor de select ausente de las opciones es inválido', () => {
    const config = buildReadyConfig();
    expect(run(fieldOf(config, 'city'), 'no-existe', config)).not.toBeNull();
  });
});

describe('[R-01.26] momento de validación', () => {
  it('[R-01.26] un campo sin tocar no muestra error antes del primer envío', () => {
    const error = { fieldDocumentId: 'x', rule: 'required' as const, message: 'm' };
    expect(isErrorVisible(error, false, false)).toBe(false);
    expect(isErrorVisible(error, true, false)).toBe(true);
    expect(isErrorVisible(error, false, true)).toBe(true);
  });

  it('[R-01.26] el error desaparece en el instante en que el valor pasa a válido', () => {
    const config = buildReadyConfig();
    const email = fieldOf(config, 'email');
    expect(isErrorVisible(run(email, 'ana@', config), true, false)).toBe(true);
    expect(isErrorVisible(run(email, 'ana@example.com', config), true, false)).toBe(false);
  });
});
