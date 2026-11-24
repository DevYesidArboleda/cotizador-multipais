import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { startWith, switchMap } from 'rxjs';
import { CountryStore } from '../../core/country/country.store';
import type { ConfigLoadResult } from '../../core/country/config-load';
import { QuoteStore } from '../../core/quote/quote.store';
import { PaymentSimulationService } from '../../domain/payment/payment-simulation.service';
import { formatPrice } from '../../domain/pricing/format-price';
import { t } from '../../i18n/ui-copy';

/**
 * Confirmación (R-03.14): número, plan y precio final (nunca documento ni correo, R-03.5, R-03.24). Los datos salen de
 * `QuoteState.confirmation`, así que sobreviven a una recarga. La configuración del país solo se usa para formatear el
 * precio: si no carga, se degrada solo el precio y el número y el plan siguen visibles (F-03.5). Región `role="status"` presente desde el inicio.
 */
@Component({
  selector: 'app-confirmation',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  template: `
    <section class="page">
      <h1 tabindex="-1"><span class="check" aria-hidden="true">&#10003;</span> {{ title }}</h1>
      <div role="status" class="announce">
        @if (confirmation(); as c) {
          <p class="state-card state-card--success">{{ announce(c.quoteNumber) }}</p>
        }
      </div>
      @if (confirmation(); as c) {
        <div class="card">
          <dl class="facts">
            <div><dt>{{ numberLabel }}</dt><dd class="number">{{ c.quoteNumber }}</dd></div>
            <div><dt>{{ planLabel }}</dt><dd>{{ c.planName }}</dd></div>
            @if (priceText()) {
              <div><dt>{{ priceLabel }}</dt><dd class="price">{{ priceText() }}</dd></div>
            }
          </dl>
          <p class="muted">{{ note }}</p>
          <button type="button" class="btn" (click)="newQuote()">{{ newQuoteLabel }}</button>
        </div>
      }
    </section>
  `,
  styles: `
    .page { padding: var(--space-5) 0 var(--space-6); max-width: 36rem; margin: 0 auto; }
    .check { color: var(--color-success); }
    .state-card--success { border-left-color: var(--color-success); background: var(--color-success-tint); }
    .facts { margin: 0 0 var(--space-4); display: grid; gap: var(--space-3); }
    .facts dt { color: var(--color-text-muted); }
    .facts dd { margin: 0; font-weight: var(--font-weight-medium); }
    .number { font-size: 1.75rem; font-variant-numeric: tabular-nums; overflow-wrap: anywhere; }
    .price { font-variant-numeric: tabular-nums; }
    .muted { color: var(--color-text-muted); }
  `,
})
export class ConfirmationComponent {
  /** Parámetro `:country` de la ruta (input binding). */
  readonly country = input.required<string>();

  private readonly store = inject(CountryStore);
  private readonly quote = inject(QuoteStore);
  private readonly router = inject(Router);
  private readonly payment = inject(PaymentSimulationService);
  private readonly attempt = signal(0);

  protected readonly confirmation = computed(() => this.quote.state().confirmation);

  private readonly config = toSignal(
    toObservable(computed(() => ({ code: this.country(), attempt: this.attempt() }))).pipe(
      switchMap(({ code, attempt }) =>
        this.store.loadConfig(code, attempt > 0).pipe(startWith<ConfigLoadResult | null>(null)),
      ),
    ),
    { initialValue: null },
  );

  protected readonly priceText = computed(() => {
    const result = this.config();
    const c = this.confirmation();
    if (result?.kind !== 'ready' || !c) return '';
    const formatted = formatPrice(c.finalPrice, result.config.country);
    return formatted.kind === 'ok' ? formatted.text : '';
  });

  protected readonly title = t('confirmation.title');
  protected readonly numberLabel = t('confirmation.number.label');
  protected readonly planLabel = t('confirmation.plan.label');
  protected readonly priceLabel = t('confirmation.price.label');
  protected readonly note = t('confirmation.simulationNote');
  protected readonly newQuoteLabel = t('button.newQuote');

  protected announce(numero: string): string {
    return t('confirmation.announce', { numero });
  }

  /** "Nueva cotización": borra solo la clave del país actual y vuelve al Paso 1 vacío (R-03.15). */
  protected newQuote(): void {
    this.payment.reset(this.country());
    this.quote.reset();
    void this.router.navigate(['/', this.country(), 'quote', 'step-1']);
  }
}
