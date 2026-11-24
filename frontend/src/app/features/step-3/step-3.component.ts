import { ChangeDetectionStrategy, Component, ElementRef, Injector, afterNextRender, computed, inject, input, signal, viewChild } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { of, startWith, switchMap, tap } from 'rxjs';
import { NOW } from '../../core/clock';
import type { PaymentResult, PaymentSimulationMode, SummaryCopy } from '../../core/contracts/strapi-contracts';
import { CountryStore } from '../../core/country/country.store';
import { QuoteStore } from '../../core/quote/quote.store';
import { canPay } from '../../domain/payment/can-pay';
import { PaymentSimulationService } from '../../domain/payment/payment-simulation.service';
import { validateStep1 } from '../../domain/form/validate-step1';
import { describeConfigIssue, t } from '../../i18n/ui-copy';
import { ConfigErrorStateComponent, ErrorStateComponent, LoadingStateComponent } from '../../shared/async-state/state-cards.component';
import {
  buildStep3View,
  finishPayment,
  findSelectedPlan,
  initialPaymentUi,
  resolveSelectedPricing,
  setMode,
  setTermsAccepted,
  startPayment,
} from './step-3-state';
import type { Step3Source } from './step-3-state';

/**
 * Paso 3 (R-03.18): resumen, términos y pago simulado. Solo orquesta; reglas en funciones puras (`buildStep3View`,
 * `canPay`, reductores de `PaymentUiState`) y la guardia de doble pago vive en `PaymentSimulationService`.
 * País y planes se piden SIEMPRE frescos al entrar; `switchMap` descarta respuestas de otro país (R-03.19).
 */
@Component({
  selector: 'app-step-3',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, LoadingStateComponent, ErrorStateComponent, ConfigErrorStateComponent],
  template: `
    <section class="page">
      <h1 #heading tabindex="-1">{{ title }}</h1>
      @if (view(); as v) {
        @switch (v.kind) {
          @case ('loading') {
            <app-loading-state [message]="loadingMessage" />
          }
          @case ('ready') {
            <div class="layout">
              <div class="layout__main">
                <section class="card block" aria-labelledby="h-policyholder">
                  <header class="block__head">
                    <h2 id="h-policyholder">{{ policyholderTitle }}</h2>
                    <a [routerLink]="['/', country(), 'quote', 'step-1']">{{ editLabel }}<span class="visually-hidden"> {{ editPolicyholderSr }}</span></a>
                  </header>
                  <dl class="rows">
                    @for (row of v.view.policyholder; track row.fieldDocumentId) {
                      <div class="rows__item"><dt>{{ row.label }}</dt><dd>{{ row.displayValue }}</dd></div>
                    }
                  </dl>
                </section>
                <section class="card block" aria-labelledby="h-vehicle">
                  <header class="block__head">
                    <h2 id="h-vehicle">{{ vehicleTitle }}</h2>
                    <a [routerLink]="['/', country(), 'quote', 'step-1']">{{ editLabel }}<span class="visually-hidden"> {{ editVehicleSr }}</span></a>
                  </header>
                  <dl class="rows">
                    @for (row of v.view.vehicle; track row.fieldDocumentId) {
                      <div class="rows__item"><dt>{{ row.label }}</dt><dd>{{ row.displayValue }}</dd></div>
                    }
                  </dl>
                </section>
                <section class="card block" aria-labelledby="h-plan">
                  <header class="block__head">
                    <h2 id="h-plan">{{ planTitle }}</h2>
                    <a [routerLink]="['/', country(), 'quote', 'step-2']">{{ changePlanLabel }}</a>
                  </header>
                  <p class="plan-name">{{ v.view.plan.name }}</p>
                  @if (v.view.plan.shortDescription) {
                    <p>{{ v.view.plan.shortDescription }}</p>
                  }
                  @if (v.view.plan.coverageNames.length > 0) {
                    <p><strong>{{ coveragesLabel }}:</strong> {{ v.view.plan.coverageNames.join(', ') }}</p>
                  }
                  <p class="price-line"><span>{{ finalPriceLabel }}</span> <strong class="price">{{ v.view.plan.finalPriceText }}</strong></p>
                </section>
                <section class="card block">
                  <header class="block__head">
                    <h2 id="h-terms">{{ v.terms.title }}</h2>
                    <span class="muted">{{ termsVersion(v.terms.version) }}</span>
                  </header>
                  <div class="terms" role="region" aria-labelledby="h-terms" tabindex="0">
                    @for (paragraph of v.terms.paragraphs; track $index) {
                      <p>{{ paragraph }}</p>
                    }
                  </div>
                  <div class="accept">
                    <input id="terms-accept" type="checkbox" [checked]="ui().termsAccepted" [disabled]="ui().isProcessing" (change)="onAccept($event)" />
                    <label for="terms-accept">{{ acceptLabel }}</label>
                  </div>
                </section>
              </div>
              <aside class="layout__pay" [attr.aria-label]="payBoxLabel" [attr.aria-busy]="ui().isProcessing ? 'true' : null">
                <fieldset class="simulation" [disabled]="ui().isProcessing">
                  <legend>{{ simulationLegend }}</legend>
                  <label class="simulation__option"><input type="radio" name="simulation" value="approved" [checked]="ui().mode === 'approved'" (change)="onMode('approved')" /> {{ approvedLabel }}</label>
                  <label class="simulation__option"><input type="radio" name="simulation" value="rejected" [checked]="ui().mode === 'rejected'" (change)="onMode('rejected')" /> {{ rejectedLabel }}</label>
                  <p class="muted">{{ simulationHint }}</p>
                </fieldset>
                <p class="price-line"><span>{{ totalLabel }}</span> <strong class="price">{{ v.view.plan.finalPriceText }}</strong></p>
                <div role="status">
                  @if (v.view.priceChangedNotice; as notice) {
                    <p class="state-card">{{ priceChanged(notice.newPriceText) }}</p>
                  }
                </div>
                @if (ui().rejected) {
                  <div class="state-card state-card--danger" role="alert">
                    <p class="state-card__title">{{ rejectedTitle }}</p>
                    <p>{{ rejectedBody }}</p>
                  </div>
                }
                @if (!payEnabled()) {
                  <p id="pay-help" class="muted">{{ helpText() }}</p>
                }
                <button
                  #payButton
                  type="button"
                  class="btn pay"
                  [disabled]="!payEnabled()"
                  [attr.aria-busy]="ui().isProcessing ? 'true' : null"
                  [attr.aria-describedby]="payEnabled() ? null : 'pay-help'"
                  (click)="pay()"
                >
                  {{ ui().isProcessing ? processingLabel : payLabel }}
                </button>
              </aside>
            </div>
          }
          @case ('error') {
            <app-error-state (retry)="retry()" />
          }
          @case ('config-error') {
            <app-config-error-state [messages]="configMessages()" (retry)="retry()" />
          }
        }
      }
    </section>
  `,
  styles: `
    .page { padding: var(--space-5) 0 var(--space-6); max-width: var(--form-max); margin: 0 auto; }
    .layout { display: grid; gap: var(--space-4); }
    .layout__main { display: grid; gap: var(--space-4); min-width: 0; }
    .layout__pay { display: grid; gap: var(--space-3); align-content: start; max-width: 36rem; }
    .block__head { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: baseline; gap: var(--space-3); margin-bottom: var(--space-3); }
    .block__head h2 { margin: 0; font-size: var(--font-size-lg); }
    .block__head a { display: inline-flex; align-items: center; min-height: var(--size-target-min); }
    .rows { margin: 0; display: grid; gap: var(--space-2); }
    .rows__item { display: grid; grid-template-columns: minmax(0, 1fr); gap: 0; }
    .rows dt { color: var(--color-text-muted); }
    .rows dd { margin: 0; font-weight: var(--font-weight-medium); overflow-wrap: anywhere; }
    .plan-name { font-weight: var(--font-weight-strong); font-size: var(--font-size-lg); margin: 0 0 var(--space-2); }
    .price-line { display: flex; flex-wrap: wrap; justify-content: space-between; gap: var(--space-3); margin: var(--space-2) 0; }
    .price { font-size: var(--font-size-lg); font-variant-numeric: tabular-nums; }
    .muted { color: var(--color-text-muted); margin: 0; }
    .terms { max-height: 16rem; overflow: auto; border: var(--border-width) solid var(--color-divider); border-radius: var(--radius-control); padding: var(--space-3) var(--space-4); }
    .terms p { margin: 0 0 var(--space-3); }
    .accept { display: flex; align-items: center; gap: var(--space-3); margin-top: var(--space-3); min-height: var(--size-target-min); }
    .accept input { width: 1.5rem; height: 1.5rem; accent-color: var(--color-accent); }
    .accept label { cursor: pointer; }
    .simulation { border: 2px dashed var(--color-border-control); border-radius: var(--radius-control); padding: var(--space-3) var(--space-4); margin: 0; min-width: 0; }
    .simulation legend { background: var(--color-warning-tint); padding: 0 var(--space-2); font-weight: var(--font-weight-strong); }
    .simulation__option { display: flex; align-items: center; gap: var(--space-3); min-height: var(--size-target-min); cursor: pointer; }
    .simulation__option input { width: 1.5rem; height: 1.5rem; accent-color: var(--color-accent); }
    .pay { width: 100%; }
    @media (min-width: 1024px) {
      .layout { grid-template-columns: minmax(0, 1fr) var(--aside-width, 20rem); align-items: start; }
      .page { max-width: 70rem; }
    }
    @media (min-width: 1024px) and (min-height: 720px) {
      .layout__pay { position: sticky; top: 24px; }
    }
  `,
})
export class Step3Component {
  /** Parámetro `:country` de la ruta (input binding). */
  readonly country = input.required<string>();

  private readonly store = inject(CountryStore);
  private readonly quote = inject(QuoteStore);
  private readonly router = inject(Router);
  private readonly now = inject(NOW);
  private readonly payment = inject(PaymentSimulationService);
  private readonly injector = inject(Injector);
  private readonly heading = viewChild.required<ElementRef<HTMLElement>>('heading');
  private readonly payButton = viewChild<ElementRef<HTMLButtonElement>>('payButton');

  private readonly attempt = signal(0);

  /** Aceptación y modo viven solo en memoria y se reinician al entrar (R-03.8, R-03.21). */
  protected readonly ui = signal(initialPaymentUi());

  private readonly source = toSignal(
    toObservable(computed(() => ({ code: this.country(), attempt: this.attempt() }))).pipe(
      switchMap(({ code }) => {
        this.ui.set(initialPaymentUi());
        return this.store.loadConfig(code, true).pipe(
          switchMap((result) => {
            if (result.kind === 'not-found') {
              void this.router.navigateByUrl('/country-not-found', { replaceUrl: true });
              return of<Step3Source | null>(null);
            }
            if (result.kind === 'config-error') return of<Step3Source | null>({ kind: 'config-error', issues: result.issues });
            if (result.kind !== 'ready') return of<Step3Source | null>({ kind: 'error' });
            const config = result.config;
            return this.store.loadPlans(config.country).pipe(
              tap((plans) => this.redirectIfInvalid(code, config, plans)),
              switchMap((plans) => of<Step3Source | null>({ kind: 'loaded', config, plans })),
            );
          }),
          startWith<Step3Source | null>(null),
        );
      }),
    ),
    { initialValue: null },
  );

  private readonly copy: SummaryCopy = { yes: t('summary.yes'), no: t('summary.no'), notProvided: t('summary.notInformed') };

  protected readonly view = computed(() =>
    buildStep3View({
      source: this.source(),
      values: this.quote.state().step1,
      selected: this.quote.state().selectedPlan,
      copy: this.copy,
      now: this.now(),
    }),
  );

  private readonly pricing = computed(() =>
    resolveSelectedPricing(this.source(), this.quote.state().step1, this.quote.state().selectedPlan, this.now()),
  );

  protected readonly configMessages = computed(() => {
    const v = this.view();
    return v.kind === 'config-error' ? v.issues.map(describeConfigIssue) : [];
  });

  /** `canPay` (R-03.9): términos cargados (vista `ready`), aceptados, sin proceso ni confirmación. */
  protected readonly payEnabled = computed(() =>
    canPay({
      termsLoaded: this.view().kind === 'ready',
      termsAccepted: this.ui().termsAccepted,
      isProcessing: this.ui().isProcessing,
      paymentConfirmed: this.quote.state().confirmation !== undefined,
      summaryValid: this.pricing() !== null,
    }),
  );

  protected readonly helpText = computed(() => {
    if (this.view().kind !== 'ready') return t('pay.help.loading');
    if (this.pricing() === null) return t('pay.help.summary');
    return t('pay.help.terms');
  });

  protected readonly title = t('step3.title');
  protected readonly loadingMessage = t('loading.generic');
  protected readonly policyholderTitle = t('summary.section.policyholder');
  protected readonly vehicleTitle = t('summary.section.vehicle');
  protected readonly planTitle = t('summary.section.plan');
  protected readonly editLabel = t('link.editData');
  protected readonly editPolicyholderSr = t('link.editData.policyholder.sr');
  protected readonly editVehicleSr = t('link.editData.vehicle.sr');
  protected readonly changePlanLabel = t('link.changePlan');
  protected readonly coveragesLabel = t('summary.plan.coverages');
  protected readonly finalPriceLabel = t('summary.plan.finalPrice');
  protected readonly acceptLabel = t('terms.accept');
  protected readonly payBoxLabel = t('pay.box.label');
  protected readonly totalLabel = t('pay.total');
  protected readonly simulationLegend = t('simulation.legend');
  protected readonly approvedLabel = t('simulation.approved');
  protected readonly rejectedLabel = t('simulation.rejected');
  protected readonly simulationHint = t('simulation.hint');
  protected readonly rejectedTitle = t('pay.rejected.title');
  protected readonly rejectedBody = t('pay.rejected.body');
  protected readonly payLabel = t('button.pay');
  protected readonly processingLabel = t('button.pay.processing');

  protected termsVersion(version: string): string {
    return t('terms.version', { version });
  }
  protected priceChanged(precio: string): string {
    return t('notice.price.changed', { precio });
  }

  protected onAccept(event: Event): void {
    const checked = event.target instanceof HTMLInputElement && event.target.checked;
    this.ui.update((s) => setTermsAccepted(s, checked));
  }

  protected onMode(mode: PaymentSimulationMode): void {
    this.ui.update((s) => setMode(s, mode));
  }

  /**
   * Pago simulado (R-03.11): `isProcessing` se activa de forma síncrona (barrera 1); el servicio mantiene una sola
   * promesa en vuelo (barrera 2) y, tras aprobar, `confirmation` persistido redirige cualquier ruta (barrera 3).
   */
  protected async pay(): Promise<void> {
    const pricing = this.pricing();
    if (!this.payEnabled() || pricing === null) return;
    this.ui.update(startPayment);
    let result: PaymentResult | null = null;
    try {
      result = await this.payment.pay({
        country: this.country(),
        planDocumentId: pricing.planDocumentId,
        finalPrice: pricing.finalPrice,
        mode: this.ui().mode,
      });
    } catch {
      result = null;
    }
    if (result?.status === 'approved') {
      this.quote.setConfirmation({
        quoteNumber: result.quoteNumber,
        planDocumentId: pricing.planDocumentId,
        planName: pricing.planName,
        finalPrice: pricing.finalPrice,
        paidAt: this.now().toISOString(),
      });
      this.ui.update((s) => finishPayment(s, result));
      await this.router.navigate(['/', this.country(), 'quote', 'confirmation']);
      return;
    }
    this.ui.update((s) => finishPayment(s, result));
    // Guía §6.5: tras un rechazo el foco vuelve a "Pagar" si se perdió al deshabilitarlo.
    afterNextRender(() => this.payButton()?.nativeElement.focus(), { injector: this.injector });
  }

  /** "Reintentar": foco al `h1`, refetch sin perder datos (R-03.18). */
  protected retry(): void {
    this.heading().nativeElement.focus();
    this.attempt.update((n) => n + 1);
  }

  /** Datos frescos inválidos: Paso 1 con campos tocados o Paso 2 si el plan ya no existe (R-03.1). */
  private redirectIfInvalid(code: string, config: Parameters<typeof validateStep1>[0], plans: Parameters<typeof findSelectedPlan>[0]): void {
    const state = this.quote.state();
    const errors = validateStep1(config, state.step1, this.now());
    if (errors.length > 0) {
      this.quote.setPendingTouch(errors.map((e) => e.fieldDocumentId));
      void this.router.navigate(['/', code, 'quote', 'step-1'], { replaceUrl: true });
      return;
    }
    if ((plans.kind === 'ok' || plans.kind === 'empty') && findSelectedPlan(plans, state.selectedPlan) === null) {
      void this.router.navigate(['/', code, 'quote', 'step-2'], { replaceUrl: true });
    }
  }
}
