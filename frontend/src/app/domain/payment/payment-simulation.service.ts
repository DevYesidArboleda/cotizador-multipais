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
 * llamada concurrente del MISMO país la reutiliza) y, tras `approved`, no ejecuta nada más en ese país (R-03.11).
 */
@Injectable({ providedIn: 'root' })
export class PaymentSimulationService implements PaymentSimulationPort {
  private readonly latencyMs = inject(PAYMENT_LATENCY_MS);
  private readonly random = inject(RANDOM_BYTES);
  private readonly now = inject(NOW);

  /** Guardia por país (F-03.1, R-03.19): el estado de un país nunca se reutiliza en otro. */
  private readonly inFlight = new Map<string, Promise<PaymentResult>>();
  private readonly approved = new Map<string, PaymentResult>();
  private runs = 0;

  /** Número de simulaciones realmente ejecutadas (para las pruebas de doble envío). */
  get executions(): number {
    return this.runs;
  }

  pay(request: PaymentRequest): Promise<PaymentResult> {
    const country = request.country;
    const done = this.approved.get(country);
    if (done) return Promise.resolve(done);
    const pending = this.inFlight.get(country);
    if (pending) return pending;
    this.runs += 1;
    const run = new Promise<PaymentResult>((resolve) => {
      setTimeout(() => {
        resolve(
          request.mode === 'approved'
            ? { status: 'approved', quoteNumber: generateQuoteNumber(this.now(), this.random, country) }
            : { status: 'rejected', code: 'SIMULATED_REJECTION' },
        );
      }, this.latencyMs);
    });
    const tracked = run.then((result) => {
      this.inFlight.delete(country);
      if (result.status === 'approved') this.approved.set(country, result);
      return result;
    });
    this.inFlight.set(country, tracked);
    return tracked;
  }

  /** Reinicia la guardia del país (al iniciar una nueva cotización) o la de todos. */
  reset(country?: string): void {
    if (country === undefined) {
      this.inFlight.clear();
      this.approved.clear();
      return;
    }
    this.inFlight.delete(country);
    this.approved.delete(country);
  }
}
