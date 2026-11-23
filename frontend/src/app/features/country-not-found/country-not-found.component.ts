import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CountryStore } from '../../core/country/country.store';
import { t } from '../../i18n/ui-copy';
import { ErrorStateComponent, LoadingStateComponent } from '../../shared/async-state/state-cards.component';

/**
 * `/country-not-found` (R-01.1, AC-01.5): un enlace por país devuelto por `GET /api/countries`; ninguna lista
 * de países en el código. Estados `loading | ready | empty | error` (guía §4.5).
 */
@Component({
  selector: 'app-country-not-found',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, LoadingStateComponent, ErrorStateComponent],
  template: `
    <section class="page">
      <h1 tabindex="-1">{{ title }}</h1>
      <p>{{ body }}</p>
      @switch (state().kind) {
        @case ('loading') {
          <app-loading-state [message]="loadingMessage" />
        }
        @case ('error') {
          <app-error-state (retry)="retry()" />
        }
        @case ('empty') {
          <p class="state-card">{{ emptyMessage }}</p>
        }
        @default {
          <nav [attr.aria-label]="listLabel">
            <ul class="countries">
              @for (country of countries(); track country.code) {
                <li><a class="btn" [routerLink]="['/', country.code, 'quote', 'step-1']">{{ country.name }}</a></li>
              }
            </ul>
          </nav>
        }
      }
    </section>
  `,
  styles: `
    .page { padding: var(--space-5) 0 var(--space-6); }
    .countries { list-style: none; margin: 0; padding: 0; display: grid; gap: var(--space-3); }
    @media (min-width: 768px) { .countries { grid-template-columns: repeat(3, 1fr); } }
  `,
})
export class CountryNotFoundComponent {
  private readonly store = inject(CountryStore);
  protected readonly state = this.store.list;

  protected countries() {
    const s = this.state();
    return s.kind === 'ready' ? s.countries : [];
  }

  protected readonly title = t('countryNotFound.title');
  protected readonly body = t('countryNotFound.body');
  protected readonly listLabel = t('countryNotFound.list.label');
  protected readonly loadingMessage = t('loading.countries');
  protected readonly emptyMessage = t('countryNotFound.empty');

  constructor() {
    this.store.loadList();
  }

  protected retry(): void {
    this.store.loadList(true);
  }
}
