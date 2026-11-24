import { ChangeDetectionStrategy, Component, ElementRef, computed, inject, input, signal, viewChild } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { of, startWith, switchMap, tap } from 'rxjs';
import { NOW } from '../../core/clock';
import type { PricedPlan } from '../../core/contracts/strapi-contracts';
import { CountryStore } from '../../core/country/country.store';
import { QuoteStore } from '../../core/quote/quote.store';
import { describeConfigIssue, t } from '../../i18n/ui-copy';
import {
  ConfigErrorStateComponent,
  ErrorStateComponent,
  LoadingStateComponent,
} from '../../shared/async-state/state-cards.component';
import { buildStep2View, reconcileSelection } from './step-2-state';
import type { Step2Source } from './step-2-state';

/**
 * Paso 2 (R-02.15): lista de planes con precio derivado (`computed`) del Paso 1 persistido. Solo orquesta:
 * reglas en funciones puras (`buildStep2View`, `reconcileSelection`, `calculateAdjustedPrice`). Los planes se
 * piden siempre frescos al entrar (R-02.12) y `switchMap` descarta respuestas tardías de otro país (R-02.16).
 */
@Component({
  selector: 'app-step-2',
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
            <div class="notices" role="status">
              @if (noticeText(); as text) {
                <p class="state-card">{{ text }}</p>
              }
            </div>
            <fieldset class="plans">
              <legend class="plans__legend">{{ legend() }}</legend>
              @for (item of v.plans; track item.plan.documentId) {
                <div class="plan" [class.plan--highlighted]="item.highlighted" [class.plan--selected]="item.plan.documentId === v.selectedPlanDocumentId">
                  <label class="plan__head" [for]="'plan-' + item.plan.documentId">
                    <input
                      type="radio"
                      name="plan"
                      class="plan__radio"
                      [id]="'plan-' + item.plan.documentId"
                      [value]="item.plan.documentId"
                      [checked]="item.plan.documentId === v.selectedPlanDocumentId"
                      [attr.aria-describedby]="describedBy(item)"
                      (change)="select(item)"
                    />
                    <span class="plan__name">{{ item.plan.name }}</span>
                    @if (item.highlighted) {
                      <span class="plan__badge" [id]="'plan-badge-' + item.plan.documentId">{{ recommendedLabel }}</span>
                    }
                    @if (item.plan.documentId === v.selectedPlanDocumentId) {
                      <span class="plan__badge plan__badge--selected">{{ selectedLabel }}</span>
                    }
                  </label>
                  @if (item.plan.shortDescription) {
                    <p class="plan__desc">{{ item.plan.shortDescription }}</p>
                  }
                  <p class="plan__price" [id]="'plan-price-' + item.plan.documentId">
                    <span class="plan__price-label">{{ finalLabel }}</span>
                    <strong class="plan__price-value">{{ item.finalPriceText }}</strong>
                    @if (item.basePriceText) {
                      <span class="plan__price-base">{{ baseLabel(item.basePriceText) }}</span>
                    }
                  </p>
                  @if (item.plan.coverages.length > 0) {
                    <h2 class="plan__sub">{{ coveragesLabel }}</h2>
                    <ul class="plan__list">
                      @for (c of item.plan.coverages; track $index) {
                        <li>
                          <span class="plan__item-name">{{ c.name }}</span>
                          @if (c.limit) {
                            <span class="plan__item-meta">{{ limitLabel(c.limit) }}</span>
                          }
                          @if (c.description) {
                            <span class="plan__item-meta">{{ c.description }}</span>
                          }
                        </li>
                      }
                    </ul>
                  }
                  @if (item.plan.benefits.length > 0) {
                    <h2 class="plan__sub">{{ benefitsLabel }}</h2>
                    <ul class="plan__list">
                      @for (b of item.plan.benefits; track $index) {
                        <li>{{ b.text }}</li>
                      }
                    </ul>
                  }
                </div>
              }
            </fieldset>
            <p class="visually-hidden" aria-live="polite">{{ announcement() }}</p>
            @if (v.selectedPlanDocumentId === null) {
              <p id="plans-help" class="help">{{ helpText }}</p>
            }
            <div class="actions">
              <a class="btn btn--secondary" [routerLink]="['/', country(), 'quote', 'step-1']">{{ back }}</a>
              <button
                type="button"
                class="btn"
                [disabled]="v.selectedPlanDocumentId === null"
                [attr.aria-describedby]="v.selectedPlanDocumentId === null ? 'plans-help' : null"
                (click)="continueToSummary(v.plans)"
              >
                {{ continueLabel }}
              </button>
            </div>
          }
          @case ('empty') {
            <div class="state-card">
              <p class="state-card__title">{{ emptyTitle }}</p>
              <p>{{ emptyBody() }}</p>
              <a class="btn btn--secondary" [routerLink]="['/', country(), 'quote', 'step-1']">{{ backToForm }}</a>
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
    .plans { border: 0; padding: 0; margin: 0 0 var(--space-4); display: grid; gap: var(--space-4); min-width: 0; }
    .plans__legend { font-size: var(--font-size-lg); font-weight: var(--font-weight-strong); padding: 0; margin-bottom: var(--space-3); }
    .plan { background: var(--color-surface); border: var(--border-width) solid var(--color-divider); border-radius: var(--radius-card); padding: var(--space-4) var(--space-5); }
    .plan--highlighted { border: 3px solid var(--color-accent); }
    .plan--selected { background: var(--color-accent-tint); }
    .plan__head { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-3); cursor: pointer; font-weight: var(--font-weight-strong); }
    .plan__radio { width: 1.5rem; height: 1.5rem; accent-color: var(--color-accent); }
    .plan__badge { background: var(--color-accent); color: var(--color-surface); border-radius: var(--radius-card); padding: 0 var(--space-3); font-size: var(--font-size-sm); }
    .plan__badge--selected { background: var(--color-text); }
    .plan__desc { margin: var(--space-2) 0; }
    .plan__price { display: flex; flex-wrap: wrap; align-items: baseline; gap: var(--space-3); margin: var(--space-2) 0; }
    .plan__price-value { font-size: var(--font-size-lg); font-variant-numeric: tabular-nums; }
    .plan__price-base { color: var(--color-text-muted); font-variant-numeric: tabular-nums; text-decoration: line-through; }
    .plan__sub { font-size: var(--font-size-base); margin: var(--space-3) 0 var(--space-2); }
    .plan__list { margin: 0; padding-left: var(--space-5); }
    .plan__item-meta { display: block; color: var(--color-text-muted); }
    .help { color: var(--color-text-muted); margin: 0 0 var(--space-3); }
    .actions { display: flex; flex-wrap: wrap; gap: var(--space-3); justify-content: space-between; }
    .notices:empty, .notices { margin: 0; }
  `,
})
export class Step2Component {
  /** Parámetro `:country` de la ruta (input binding). */
  readonly country = input.required<string>();

  private readonly store = inject(CountryStore);
  private readonly quote = inject(QuoteStore);
  private readonly router = inject(Router);
  private readonly now = inject(NOW);
  private readonly heading = viewChild.required<ElementRef<HTMLElement>>('heading');

  private readonly attempt = signal(0);
  private lastAttempt = 0;
  private readonly unavailable = signal(false);
  protected readonly announcement = signal('');

  private readonly source = toSignal(
    toObservable(computed(() => ({ code: this.country(), attempt: this.attempt() }))).pipe(
      switchMap(({ code, attempt }) => {
        const force = attempt !== this.lastAttempt;
        this.lastAttempt = attempt;
        this.unavailable.set(false);
        return this.store.loadConfig(code, force).pipe(
          switchMap((result) => {
            if (result.kind === 'not-found') {
              void this.router.navigateByUrl('/country-not-found', { replaceUrl: true });
              return of<Step2Source | null>(null);
            }
            if (result.kind !== 'ready') return of<Step2Source | null>({ kind: 'config', result });
            const config = result.config;
            return this.store.loadPlans(config.country).pipe(
              tap((plans) => {
                if (plans.kind !== 'ok') return;
                const { selected, unavailable } = reconcileSelection(this.quote.state().selectedPlan, plans.plans);
                if (unavailable && !selected) {
                  this.quote.clearSelectedPlan();
                  this.unavailable.set(true);
                }
              }),
              switchMap((plans) => of<Step2Source | null>({ kind: 'plans', config, plans })),
            );
          }),
          startWith<Step2Source | null>(null),
        );
      }),
    ),
    { initialValue: null },
  );

  protected readonly view = computed(() =>
    buildStep2View({
      source: this.source(),
      values: this.quote.state().step1,
      selected: this.quote.state().selectedPlan,
      unavailable: this.unavailable(),
      now: this.now(),
    }),
  );

  protected readonly configMessages = computed(() => {
    const v = this.view();
    return v.kind === 'config-error' ? v.issues.map(describeConfigIssue) : [];
  });

  private readonly countryName = computed(() => {
    const current = this.store.current();
    if (current?.result.kind === 'ready') return current.result.config.country.name;
    if (current?.result.kind === 'empty') return current.result.country.name;
    return this.country().toUpperCase();
  });
  protected readonly legend = computed(() => t('plans.group.legend', { pais: this.countryName() }));
  protected readonly emptyBody = computed(() => t('empty.step2.body', { pais: this.countryName() }));

  protected readonly noticeText = computed(() => {
    const v = this.view();
    if (v.kind !== 'ready') return null;
    if (v.notice === 'plan-unavailable') return t('notice.plan.unavailable');
    if (v.notice === 'price-changed') {
      const current = v.plans.find((p) => p.plan.documentId === v.selectedPlanDocumentId);
      return current ? t('notice.price.changed', { precio: current.finalPriceText }) : null;
    }
    return null;
  });

  protected readonly title = t('step2.title');
  protected readonly loadingMessage = t('loading.plans');
  protected readonly recommendedLabel = t('plan.recommended');
  protected readonly selectedLabel = t('plan.selected');
  protected readonly finalLabel = t('plan.price.final');
  protected readonly coveragesLabel = t('plan.coverages');
  protected readonly benefitsLabel = t('plan.benefits');
  protected readonly helpText = t('plans.select.help');
  protected readonly back = t('button.back');
  protected readonly backToForm = t('button.backToForm');
  protected readonly continueLabel = t('button.continueToSummary');
  protected readonly emptyTitle = t('empty.step2.title');

  protected baseLabel(precio: string): string {
    return t('plan.price.base', { precio });
  }
  protected limitLabel(limite: string): string {
    return t('plan.coverage.limit', { limite });
  }

  /** Nombre accesible adicional: precio y etiqueta "Recomendado" (R-02.18). */
  protected describedBy(item: PricedPlan): string {
    const id = item.plan.documentId;
    return item.highlighted ? `plan-price-${id} plan-badge-${id}` : `plan-price-${id}`;
  }

  /** Selección única: guarda `documentId` y precio visto (R-02.11) y anuncia en región `aria-live`. */
  protected select(item: PricedPlan): void {
    this.quote.setSelectedPlan({ planDocumentId: item.plan.documentId, priceSeenAtSelection: item.finalPrice });
    this.unavailable.set(false);
    this.announcement.set(t('plans.selected.announce', { plan: item.plan.name, precio: item.finalPriceText }));
  }

  /** Actualiza `priceSeenAtSelection` al continuar (R-02.13) y navega al Paso 3. */
  protected continueToSummary(plans: readonly PricedPlan[]): void {
    const selectedId = this.quote.state().selectedPlan?.planDocumentId;
    const current = plans.find((p) => p.plan.documentId === selectedId);
    if (!current) return;
    this.quote.setSelectedPlan({ planDocumentId: current.plan.documentId, priceSeenAtSelection: current.finalPrice });
    void this.router.navigate(['/', this.country(), 'quote', 'step-3']);
  }

  /** "Reintentar": refetch sin perder datos ni selección; el foco vuelve al `h1`. */
  protected retry(): void {
    this.heading().nativeElement.focus();
    this.attempt.update((n) => n + 1);
  }
}
