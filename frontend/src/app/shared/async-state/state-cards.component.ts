import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { t } from '../../i18n/ui-copy';

/** `loading` (guía §5, R-01.22): texto con `role="status"` + skeleton decorativo (`aria-hidden`). */
@Component({
  selector: 'app-loading-state',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="loading" aria-busy="true">
      <p role="status" class="loading__text">{{ message() }}</p>
      <div aria-hidden="true" class="loading__skeleton">
        @for (row of rows; track row) {
          <span class="skeleton loading__label"></span>
          <span class="skeleton loading__control"></span>
        }
      </div>
    </div>
  `,
  styles: `
    .loading__text { margin: 0 0 var(--space-4); color: var(--color-text-muted); }
    .loading__skeleton { display: grid; gap: var(--space-2); }
    .loading__label { height: 1rem; width: 8rem; }
    .loading__control { height: var(--size-button-height); margin-bottom: var(--space-3); }
  `,
})
export class LoadingStateComponent {
  readonly message = input.required<string>();
  protected readonly rows = [1, 2, 3, 4, 5, 6];
}

/** `error` recuperable (red, timeout, 4xx/5xx): `role="alert"` + "Reintentar" (R-01.22, AC-01.22). */
@Component({
  selector: 'app-error-state',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="state-card state-card--danger" role="alert">
      <p class="state-card__title">{{ title }}</p>
      <p>{{ body }}</p>
      <button type="button" class="btn btn--secondary" (click)="retry.emit()">{{ retryLabel }}</button>
    </div>
  `,
})
export class ErrorStateComponent {
  readonly retry = output<void>();
  protected readonly title = t('error.network.title');
  protected readonly body = t('error.network.body');
  protected readonly retryLabel = t('button.retry');
}

/** `config-error`: nombra el problema (rol, campo, parámetro) sin formulario ni avance (R-01.11, guía §4.6). */
@Component({
  selector: 'app-config-error-state',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="state-card state-card--danger" role="alert">
      <p class="state-card__title">{{ title }}</p>
      @for (message of messages(); track $index) {
        <p>{{ message }}</p>
      }
      <p>{{ hint }}</p>
      <button type="button" class="btn btn--secondary" (click)="retry.emit()">{{ retryLabel }}</button>
    </div>
  `,
})
export class ConfigErrorStateComponent {
  readonly messages = input.required<readonly string[]>();
  readonly retry = output<void>();
  protected readonly title = t('config.title');
  protected readonly hint = t('config.hint');
  protected readonly retryLabel = t('button.retry');
}
