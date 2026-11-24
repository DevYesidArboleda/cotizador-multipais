import { generateQuoteNumber } from './generate-quote-number';

const fixed = (bytes: number[]) => () => Uint8Array.from(bytes);

describe('[R-03.13] generateQuoteNumber', () => {
  it('[R-03.13][AC-03.21] formato COT-<PAÍS>-<YYYYMMDD local>-<4 HEX mayúscula>', () => {
    const n = generateQuoteNumber(new Date(2026, 10, 23, 9, 0, 0), fixed([0x7b, 0x2e]), 'co');
    expect(n).toBe('COT-CO-20261123-7B2E');
    expect(n).toMatch(/^COT-[A-Z]{2}-[0-9]{8}-[0-9A-F]{4}$/);
  });

  it('[R-03.13] la fecha es la calendario local, no UTC (23:30 local sigue siendo el mismo día)', () => {
    const n = generateQuoteNumber(new Date(2026, 10, 23, 23, 30, 0), fixed([0, 10]), 'cl');
    expect(n).toBe('COT-CL-20261123-000A');
  });

  it('[R-03.13] rellena mes y día de un dígito y pide exactamente 2 bytes', () => {
    let asked = 0;
    const n = generateQuoteNumber(new Date(2027, 0, 5), (len) => { asked = len; return Uint8Array.from([255, 1]); }, 'co');
    expect(n).toBe('COT-CO-20270105-FF01');
    expect(asked).toBe(2);
  });

  it('[R-03.13] con la fuente real de crypto cumple el formato', () => {
    const n = generateQuoteNumber(new Date(2026, 10, 23), (len) => crypto.getRandomValues(new Uint8Array(len)), 'co');
    expect(n).toMatch(/^COT-CO-20261123-[0-9A-F]{4}$/);
  });
});
