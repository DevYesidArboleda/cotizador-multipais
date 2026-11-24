import { Injectable, InjectionToken, inject } from '@angular/core';
import { NOW } from '../../core/clock';
import type { PaymentRequest, PaymentResult, PaymentSimulationPort, RandomBytesSource } from '../../core/contracts/strapi-contracts';
import { cryptoRandomBytes, generateQuoteNumber } from './generate-quote-number';

/** Latencia simulada del pago en ms (R-03.10); inyectable para los tests. */
export const PAYMENT_LATENCY_MS = new InjectionToken<number>('PAYMENT_LATENCY_MS', { providedIn: 'root', factory: () => 1_000 });
/** Aleatoriedad inyectable del número de cotización (R-03.13). */
export const RANDOM_BYTES = new InjectionToken<RandomBytesSource>('RANDOM_BYTES', { providedIn: 'root', factory: () => cryptoRandomBytes });

/**
 * Simulación de pago (R-03.10, R-03.11): sin red ni datos de tarjeta. Mantiene UNA sola promesa en vuelo (una segunda
 * llamada concurrente la reutiliza) y, tras `approved`, no ejecuta nada más (devuelve el mismo resultado).
 */
@Injectable({ providedIn: 'root' })
export class PaymentSimulationService implements PaymentSimulationPort {
  private readonly latencyMs = inject(PAYMENT_LATENCY_MS);
  private readonly random = inject(RANDOM_BYTES);
  private readonly now = inject(NOW);

  private inFlight: Promise<PaymentResult> | null = null;
  private approved: PaymentResult | null = null;
  private runs = 0;

  /** Número de simulaciones realmente ejecutadas (para las pruebas de doble envío). */
  get executions(): number {
    return this.runs;
  }

  pay(request: PaymentRequest): Promise<PaymentResult> {
    if (this.approved) return Promise.resolve(this.approved);
    if (this.inFlight) return this.inFlight;
    this.runs += 1;
    const run = new Promise<PaymentResult>((resolve) => {
      setTimeout(() => {
        resolve(
          request.mode === 'approved'
            ? { status: 'approved', quoteNumber: generateQuoteNumber(this.now(), this.random, request.country) }
            : { status: 'rejected', code: 'SIMULATED_REJECTION' },
        );
      }, this.latencyMs);
    });
    this.inFlight = run.then((result) => {
      this.inFlight = null;
      if (result.status === 'approved') this.approved = result;
      return result;
    });
    return this.inFlight;
  }

  /** Reinicia la guardia (al iniciar una nueva cotización). */
  reset(): void {
    this.inFlight = null;
    this.approved = null;
  }
}
