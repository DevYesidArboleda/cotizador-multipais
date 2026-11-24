import { maskDocumentNumber } from './mask-document-number';

describe('[R-03.4] maskDocumentNumber', () => {
  it.each([
    ['1020304050', '******4050'],
    ['12.345.678-5', '******78-5'],
    ['1.000.005-K', '*****05-K'],
    ['1234', '***4'],
    ['12', '*2'],
    ['1', '*'],
    ['', ''],
    [' 1020 304 050 ', '******4050'],
  ])('[R-03.4][AC-03.7] %j -> %j', (input, expected) => {
    expect(maskDocumentNumber(input)).toBe(expected);
  });

  it('[R-03.4][AC-03.7] casos borde: 1020304050, 12.345.678-5, 1.000.005-K, 1234 y 12', () => {
    expect(['1020304050', '12.345.678-5', '1.000.005-K', '1234', '12'].map(maskDocumentNumber)).toEqual([
      '******4050', '******78-5', '*****05-K', '***4', '*2',
    ]);
  });

  it('[R-03.4][AC-03.6] el documento completo nunca queda en el resultado', () => {
    expect(maskDocumentNumber('1020304050')).not.toContain('1020304050');
    expect(maskDocumentNumber('1020304050')).toHaveLength(10);
  });
});
