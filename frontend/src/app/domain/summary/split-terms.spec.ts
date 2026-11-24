import { splitTerms } from './split-terms';

describe('[R-03.7] splitTerms', () => {
  it('[R-03.7][AC-03.16] divide por líneas en blanco y conserva el texto literal sin interpretar HTML', () => {
    expect(splitTerms('<b>Aviso</b>\n\nSegundo párrafo')).toEqual(['<b>Aviso</b>', 'Segundo párrafo']);
  });

  it('[R-03.7] varias líneas en blanco, espacios y CRLF cuentan como un solo separador', () => {
    expect(splitTerms('Uno\r\n\r\n\r\n  \nDos')).toEqual(['Uno', 'Dos']);
  });

  it('[R-03.7] un salto simple no separa párrafos', () => {
    expect(splitTerms('Línea 1\nLínea 2')).toEqual(['Línea 1\nLínea 2']);
  });

  it('[R-03.7] vacío o solo espacios produce lista vacía (config-error aguas arriba)', () => {
    expect(splitTerms('')).toEqual([]);
    expect(splitTerms('  \n\n  \t ')).toEqual([]);
  });
});
