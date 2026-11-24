import { canPay } from './can-pay';

const ok = { termsLoaded: true, termsAccepted: true, isProcessing: false, paymentConfirmed: false, summaryValid: true };

describe('[R-03.9] canPay', () => {
  it('[R-03.9] habilita solo cuando todas las condiciones se cumplen', () => {
    expect(canPay(ok)).toBe(true);
  });

  it.each([
    ['términos sin cargar', { termsLoaded: false }],
    ['términos sin aceptar', { termsAccepted: false }],
    ['procesando', { isProcessing: true }],
    ['ya confirmado', { paymentConfirmed: true }],
    ['resumen inválido', { summaryValid: false }],
  ])('[R-03.9] %s deshabilita el pago', (_name, override) => {
    expect(canPay({ ...ok, ...override })).toBe(false);
  });
});
