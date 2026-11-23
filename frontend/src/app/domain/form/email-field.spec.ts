import { buildReadyConfig, EMAIL_PATTERN, fieldOf, TODAY } from '../../testing/form-fixtures';
import { normalizeFieldValue, validateField } from './field-validators';
import { normalizeEmail } from './normalizers';

const config = buildReadyConfig();
const email = fieldOf(config, 'email');
const check = (value: string) => validateField(email, value, { config, values: {}, now: TODAY });

describe('[R-01.29] formato del correo', () => {
  it.each([
    ['ana.perez@example.com', true],
    ['a+b@correo.co', true],
    ['ANA@Example.CL', true],
    ['maria_1@mail.dominio.com.co', true],
    ['  ana@example.com  ', true],
    ['ana@', false],
    ['@example.com', false],
    ['ana@example', false],
    ['ana@@example.com', false],
    ['ana perez@example.com', false],
    ['ana@example..com', false],
    ['ana@example.c', false],
    ['ana@-example.com', false],
    ['ana@example.com.', false],
    ['ñandu@example.com', false],
  ])('[R-01.29][AC-01.29] %j → válido=%s', (value, expected) => {
    expect(check(value) === null).toBe(expected);
  });

  it('[R-01.29] una cadena de 255 caracteres es inválida por maxLength (254 inclusive)', () => {
    const local = 'a'.repeat(64);
    const domain = `${'b'.repeat(63)}.${'c'.repeat(63)}.${'d'.repeat(57)}.com`;
    const exactly254 = `${local}@${domain}`;
    expect(exactly254).toHaveLength(254);
    expect(check(exactly254)?.rule).not.toBe('max-length');
    const tooLong = `${'x'.repeat(255 - 12)}@example.com`;
    expect(tooLong).toHaveLength(255);
    expect(check(tooLong)?.rule).toBe('max-length');
  });

  it('[R-01.29] se recorta con trim, se conserva la capitalización y el mensaje es el errorMessage de Strapi', () => {
    expect(normalizeEmail('  ANA@Example.CL ')).toBe('ANA@Example.CL');
    expect(normalizeFieldValue(email, ' ana@example.com ')).toBe('ana@example.com');
    expect(check('ana@')?.message).toBe(email.errorMessage);
  });

  it('[R-01.29] el patrón con 10 000 caracteres de entrada no se cuelga (sin retroceso catastrófico)', () => {
    const started = Date.now();
    new RegExp(EMAIL_PATTERN).test(`${'a'.repeat(10_000)}@${'b-'.repeat(5_000)}`);
    expect(Date.now() - started).toBeLessThan(1_000);
  });
});

describe('[R-01.28] correo obligatorio por configuración', () => {
  it.each([
    ['', 'co'],
    ['   ', 'co'],
    ['', 'cl'],
  ] as const)('[R-01.28][AC-01.28] el valor %j en %s es inválido con el errorMessage del campo', (value, country) => {
    const cfg = buildReadyConfig({ country });
    const field = fieldOf(cfg, 'email');
    const error = validateField(field, value, { config: cfg, values: {}, now: TODAY });
    expect(error?.rule).toBe('required');
    expect(error?.message).toBe(field.errorMessage);
  });

  it('[R-01.28][AC-01.28] ana.perez@example.com es válido en CO y CL', () => {
    for (const country of ['co', 'cl'] as const) {
      const cfg = buildReadyConfig({ country });
      expect(validateField(fieldOf(cfg, 'email'), 'ana.perez@example.com', { config: cfg, values: {}, now: TODAY })).toBeNull();
    }
  });

  it('[R-01.28] la obligatoriedad sale de required en Strapi: si negocio lo hace opcional, vacío es válido', () => {
    const cfg = buildReadyConfig({ mutate: (f) => f.map((x) => (x.semanticRole === 'email' ? { ...x, required: false } : x)) });
    expect(validateField(fieldOf(cfg, 'email'), '', { config: cfg, values: {}, now: TODAY })).toBeNull();
  });
});
