import { compilePattern } from './mappers';

describe('[F-01.1][R-01.6] patrones de Strapi', () => {
  it('[F-01.1][R-01.6] patrón sin anclas exige coincidencia completa', () => {
    const compiled = compilePattern('[0-9]{6}');
    expect(compiled?.regex.test('123456')).toBe(true);
    expect(compiled?.regex.test('abc123456')).toBe(false);
    expect(compiled?.regex.test('123456abc')).toBe(false);
  });

  it('[F-01.1][R-01.6] un patrón inválido devuelve null (config-error aguas arriba)', () => {
    expect(compilePattern('(')).toBeNull();
  });
});
