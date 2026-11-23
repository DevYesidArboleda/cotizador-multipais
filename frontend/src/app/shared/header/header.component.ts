import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CountryStore } from '../../core/country/country.store';
import { t } from '../../i18n/ui-copy';

/**
 * Header (guía §3): wordmark (no es enlace) y selector de país como lista de ENLACES alimentada por
 * `GET /api/countries` (R-01.1, GAP-01.9). Si la lista no carga, muestra el país actual como texto plano y
 * el error recuperable lo presenta el contenido principal. En `/country-not-found` no hay selector.
 */
@Component({
  selector: 'app-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <header class="header">
      <div class="container header__inner">
        <p class="header__brand"><span class="header__lane" aria-hidden="true"></span>{{ brandName }}<span class="header__tagline">{{ tagline }}</span></p>
        @if (showSelector()) {
          <div class="header__country">
            @if (countries(); as list) {
              <nav [attr.aria-label]="countryLabel">
                <ul class="header__list">
                  @for (country of list; track country.code) {
                    <li>
                      <a
                        class="header__link"
                        [routerLink]="['/', country.code, 'quote', 'step-1']"
                        [attr.aria-current]="country.code === countryCode() ? 'true' : null"
                        >{{ country.name }}</a
                      >
                    </li>
                  }
                </ul>
              </nav>
              <p class="header__hint">{{ hint }}</p>
            } @else if (countryCode(); as code) {
              <p class="header__current"><span class="visually-hidden">{{ currentLabel }}: </span>{{ code.toUpperCase() }}</p>
            }
          </div>
        }
      </div>
    </header>
  `,
  styles: `
    .header { background: var(--color-surface); border-bottom: var(--border-width) solid var(--color-divider); }
    .header__inner { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: var(--space-2) var(--space-5); padding-top: var(--space-3); padding-bottom: var(--space-3); }
    .header__brand { margin: 0; font-weight: var(--font-weight-strong); font-size: var(--font-size-lg); display: flex; align-items: baseline; gap: var(--space-2); }
    .header__lane { display: inline-block; width: 1.25rem; border-top: 3px dashed var(--color-accent); transform: translateY(-0.25rem); }
    .header__tagline { font-weight: var(--font-weight-regular); font-size: var(--font-size-xs); color: var(--color-text-muted); margin-left: var(--space-2); }
    .header__country { display: flex; flex-direction: column; align-items: flex-end; }
    .header__list { display: flex; flex-wrap: wrap; gap: var(--space-2); list-style: none; margin: 0; padding: 0; }
    .header__link { display: inline-flex; align-items: center; min-height: var(--size-target-min); padding: 0 var(--space-3); border-radius: var(--radius-control); text-decoration: none; font-weight: var(--font-weight-medium); }
    .header__link:hover { text-decoration: underline; }
    .header__link[aria-current='true'] { background: var(--color-accent); color: var(--color-text-on-accent); }
    .header__hint { margin: 0; font-size: var(--font-size-xs); color: var(--color-text-muted); }
    .header__current { margin: 0; font-weight: var(--font-weight-strong); }
  `,
})
export class HeaderComponent {
  /** Código de país de la ruta actual; `null` fuera del wizard. */
  readonly countryCode = input<string | null>(null);
  /** `false` en `/country-not-found` (la lista es el contenido). */
  readonly showSelector = input(true);

  private readonly store = inject(CountryStore);
  protected readonly countries = computed(() => {
    const list = this.store.list();
    return list.kind === 'ready' ? list.countries : null;
  });

  protected readonly brandName = t('brand.name');
  protected readonly tagline = t('brand.tagline');
  protected readonly countryLabel = t('header.country.label');
  protected readonly hint = t('header.country.hint');
  protected readonly currentLabel = t('header.country.current');

  constructor() {
    this.store.loadList();
  }
}
