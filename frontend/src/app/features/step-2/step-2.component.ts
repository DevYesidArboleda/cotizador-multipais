import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { t } from '../../i18n/ui-copy';

/** Pantalla mínima del Paso 2 (SPEC-US-02 pendiente de implementar). Protegida por `step2Guard`. */
@Component({
  selector: 'app-step-2',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <section class="page">
      <h1 tabindex="-1">{{ title }}</h1>
      <p>{{ pending }}</p>
      <a class="btn btn--secondary" [routerLink]="['/', country(), 'quote', 'step-1']">{{ back }}</a>
    </section>
  `,
  styles: `.page { padding: var(--space-5) 0 var(--space-6); }`,
})
export class Step2Component {
  readonly country = input.required<string>();
  protected readonly title = t('step2.title');
  protected readonly pending = t('placeholder.pending');
  protected readonly back = t('button.back');
}
