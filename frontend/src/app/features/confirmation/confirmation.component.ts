import { ChangeDetectionStrategy, Component } from '@angular/core';
import { t } from '../../i18n/ui-copy';

/** Pantalla mínima de confirmación (SPEC-US-03 pendiente). Protegida por `confirmationGuard`. */
@Component({
  selector: 'app-confirmation',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="page">
      <h1 tabindex="-1">{{ title }}</h1>
      <p>{{ pending }}</p>
    </section>
  `,
  styles: `.page { padding: var(--space-5) 0 var(--space-6); }`,
})
export class ConfirmationComponent {
  protected readonly title = t('confirmation.title');
  protected readonly pending = t('placeholder.pending');
}
