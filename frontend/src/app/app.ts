import { ChangeDetectionStrategy, Component, Injector, afterNextRender, computed, inject } from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { Title } from '@angular/platform-browser';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { CountryStore } from './core/country/country.store';
import { parseQuoteUrl } from './domain/country/country-resolver';
import type { QuoteRoute } from './domain/country/country-resolver';
import { t } from './i18n/ui-copy';
import type { UiCopyKey } from './i18n/ui-copy.es';
import { HeaderComponent } from './shared/header/header.component';
import { StepperComponent } from './shared/stepper/stepper.component';

const STEP_TITLE_KEYS: Record<1 | 2 | 3, UiCopyKey> = { 1: 'step1.title', 2: 'step2.title', 3: 'step3.title' };

/** Cascarón: skip link, header, stepper, `main`, pie. Foco al `h1` y título del documento en cada navegación. */
@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, HeaderComponent, StepperComponent],
  template: `
    <a class="skip-link" href="#main" (click)="skipToMain($event)">{{ skipLabel }}</a>
    <app-header [countryCode]="countryCode()" [showSelector]="route().kind !== 'country-not-found'" />
    @if (stepInfo(); as info) {
      <app-stepper [country]="info.country" [current]="info.step" />
    }
    <main id="main" class="container" tabindex="-1">
      <router-outlet />
    </main>
    <footer class="footer">
      <p class="container">{{ disclaimer }}</p>
    </footer>
  `,
  styles: `
    :host { display: flex; flex-direction: column; min-height: 100vh; }
    main { flex: 1; width: 100%; }
    main:focus { outline: none; }
    .skip-link { position: absolute; left: var(--space-3); top: -4rem; z-index: 10; padding: var(--space-3) var(--space-4); background: var(--color-surface); border-radius: var(--radius-control); font-weight: var(--font-weight-strong); }
    .skip-link:focus { top: var(--space-3); }
    .footer { border-top: var(--border-width) dashed var(--color-divider); padding: var(--space-4) 0; color: var(--color-text-muted); font-size: var(--font-size-xs); }
    .footer p { margin: 0; }
  `,
})
export class App {
  private readonly router = inject(Router);
  private readonly injector = inject(Injector);
  private readonly titleService = inject(Title);
  private readonly countryStore = inject(CountryStore);

  protected readonly skipLabel = t('a11y.skipLink');
  protected readonly disclaimer = t('footer.disclaimer');

  protected readonly route = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((): QuoteRoute => parseQuoteUrl(this.router.url)),
    ),
    { initialValue: parseQuoteUrl(this.router.url) },
  );

  protected readonly countryCode = computed(() => {
    const r = this.route();
    return r.kind === 'step' || r.kind === 'confirmation' ? r.country : null;
  });

  protected readonly stepInfo = computed(() => {
    const r = this.route();
    return r.kind === 'step' ? { country: r.country, step: r.step } : null;
  });

  private readonly documentTitle = computed(() => {
    const r = this.route();
    if (r.kind === 'country-not-found') return t('title.countryNotFound');
    if (r.kind === 'other') return t('brand.name');
    const list = this.countryStore.list();
    const listed = list.kind === 'ready' ? list.countries.find((c) => c.code === r.country)?.name : undefined;
    const pais = listed ?? r.country.toUpperCase();
    if (r.kind === 'confirmation') return t('title.confirmation', { pais });
    return t('title.pattern', {
      titulo: t(STEP_TITLE_KEYS[r.step]),
      progreso: t('title.progress', { n: r.step, total: 3 }),
      pais,
    });
  });

  constructor() {
    toObservable(this.documentTitle).pipe(takeUntilDestroyed()).subscribe((text) => this.titleService.setTitle(text));
    // Al entrar a una pantalla (enlace, atrás/adelante, redirección de guard) el foco va al `h1` (R-01.25, guía §6).
    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => afterNextRender(() => this.focusHeading(), { injector: this.injector }));
  }

  protected skipToMain(event: Event): void {
    event.preventDefault();
    document.getElementById('main')?.focus();
  }

  private focusHeading(): void {
    document.querySelector<HTMLElement>('main h1')?.focus();
  }
}
