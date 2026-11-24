import type { CanPayInput } from '../../core/contracts/strapi-contracts';

/** `canPay = termsLoaded && termsAccepted && !isProcessing && !paymentConfirmed && summaryValid` (R-03.9). */
export function canPay(input: CanPayInput): boolean {
  return input.termsLoaded && input.termsAccepted && !input.isProcessing && !input.paymentConfirmed && input.summaryValid;
}
