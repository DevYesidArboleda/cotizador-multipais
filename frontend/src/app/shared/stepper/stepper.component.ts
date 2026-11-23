import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NOW } from '../../core/clock';
import type { UiCopyKey } from '../../i18n/ui-copy.es';
import { CountryStore } from '../../core/country/country.store';
import { QuoteStore } from '../../core/quote/quote.store';
import { validateStep1 } from '../../domain/form/validate-step1';
import { t } from '../../i18n/ui-copy';

type StepStatus = 'completed' | 'current' | 'pending';
interface StepItem {
  n: 1 | 2 | 3;
  name: string;
  status: StepStatus;
  label: string;
}

const STEP_NAME_KEYS: Record<1 | 2 | 3, UiCopyKey> = { 1: 'stepper.step1', 2: 'stepper.step2', 3: 'stepper.step3' };
const STATUS_KEYS: Record<StepStatus, UiCopyKey> = {
  completed: 'stepper.item.completed',
  current: 'stepper.item.current',
  pending: 'stepper.item.pending',
};

/**
 * Stepper accesible (guía §3.2). El estado de cada paso se DERIVA de los datos vigentes (`validateStep1`, plan
 * elegido), nunca de un flag guardado (R-01.10). Completado = enlace; actual = `aria-current="step"`;
 * pendiente = texto sin enlace.
 */
@Component({
  selector: 'app-stepper',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <nav class="stepper container" [attr.aria-label]="navLabel">
      <ol class="stepper__list">
        @for (item of items(); track item.n) {
          <li class="stepper__item" [class.stepper__item--current]="item.status === 'current'" [class.stepper__item--completed]="item.status === 'completed'">
            @if (item.status === 'completed') {
              <a class="stepper__step" [routerLink]="['/', country(), 'quote', 'step-' + item.n]">
                <span class="visually-hidden">{{ item.label }}</span>
                <span class="stepper__num" aria-hidden="true">{{ item.n }}</span>
                <span class="stepper__name" aria-hidden="true">{{ item.name }}</span>
              </a>
            } @else {
              <span class="stepper__step" [attr.aria-current]="item.status === 'current' ? 'step' : null">
                <span class="visually-hidden">{{ item.label }}</span>
                <span class="stepper__num" aria-hidden="true">{{ item.n }}</span>
                <span class="stepper__name" aria-hidden="true">{{ item.name }}</span>
              </span>
            }
          </li>
        }
      </ol>
      <p class="stepper__progress">{{ progress() }}</p>
    </nav>
  `,
  styles: `
    .stepper { padding-top: var(--space-4); padding-bottom: var(--space-2); }
    .stepper__list { display: flex; align-items: center; gap: var(--space-2); list-style: none; margin: 0; padding: 0; }
    .stepper__item { display: flex; align-items: center; flex: 1; gap: var(--space-2); }
    .stepper__item:not(:last-child)::after { content: ''; flex: 1; border-top: 2px dashed var(--color-divider); min-width: 1rem; }
    .stepper__step { display: inline-flex; align-items: center; gap: var(--space-2); min-height: var(--size-target-min); color: var(--color-text); text-decoration: none; font-weight: var(--font-weight-medium); }
    a.stepper__step { color: var(--color-accent); }
    .stepper__num { display: inline-grid; place-items: center; width: 2rem; height: 2rem; border-radius: 50%; border: 2px solid var(--color-border-control); background: var(--color-surface); font-weight: var(--font-weight-strong); }
    .stepper__item--current .stepper__num, .stepper__item--completed .stepper__num { background: var(--color-accent); border-color: var(--color-accent); color: var(--color-text-on-accent); }
    .stepper__progress { margin: 0; font-size: var(--font-size-xs); color: var(--color-text-muted); }
    @media (max-width: 767px) {
      .stepper__item:not(.stepper__item--current) .stepper__name { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
    }
  `,
})
export class StepperComponent {
  readonly country = input.required<string>();
  readonly current = input.required<1 | 2 | 3>();

  private readonly countryStore = inject(CountryStore);
  private readonly quote = inject(QuoteStore);
  private readonly now = inject(NOW);

  protected readonly navLabel = t('stepper.label');

  private readonly step1Complete = computed(() => {
    const loaded = this.countryStore.current();
    if (!loaded || loaded.code !== this.country() || loaded.result.kind !== 'ready') return false;
    return validateStep1(loaded.result.config, this.quote.state().step1, this.now()).length === 0;
  });

  private readonly step2Complete = computed(() => this.quote.state().selectedPlan !== undefined);

  protected readonly items = computed<readonly StepItem[]>(() => {
    const current = this.current();
    const complete: Record<1 | 2 | 3, boolean> = { 1: this.step1Complete(), 2: this.step2Complete(), 3: false };
    return ([1, 2, 3] as const).map((n) => {
      const status: StepStatus = n === current ? 'current' : complete[n] ? 'completed' : 'pending';
      const name = t(STEP_NAME_KEYS[n]);
      return { n, name, status, label: t(STATUS_KEYS[status], { n, nombre: name }) };
    });
  });

  protected readonly progress = computed(() =>
    t('stepper.progress', { n: this.current(), total: 3, nombre: t(STEP_NAME_KEYS[this.current()]) }),
  );
}
