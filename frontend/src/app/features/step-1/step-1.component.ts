import { ChangeDetectionStrategy, Component, ElementRef, computed, inject, input, signal, viewChild } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { startWith, switchMap, tap } from 'rxjs';
import { CountryStore } from '../../core/country/country.store';
import { describeConfigIssue, t } from '../../i18n/ui-copy';
import {
  ConfigErrorStateComponent,
  ErrorStateComponent,
  LoadingStateComponent,
} from '../../shared/async-state/state-cards.component';
import { Step1FormComponent } from './step-1-form.component';
import { toStep1ViewState } from './step-1-view-state';

/**
 * Paso 1 (R-01.22): carga país + campos y presenta la unión `loading | ready | empty | error | config-error`.
 * `switchMap` cancela la petición en vuelo al cambiar de país: una respuesta tardía nunca se renderiza (R-01.20).
 */
@Component({
  selector: 'app-step-1',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Step1FormComponent, LoadingStateComponent, ErrorStateComponent, ConfigErrorStateComponent],
  template: `
    <section class="page">
      <h1 #heading tabindex="-1">{{ title }}</h1>
      @if (view(); as v) {
        @switch (v.kind) {
          @case ('loading') {
            <app-loading-state [message]="loadingMessage" />
          }
          @case ('ready') {
            <app-step-1-form [config]="v.config" [country]="country()" />
          }
          @case ('empty') {
            <div class="state-card">
              <p class="state-card__title">{{ emptyTitle() }}</p>
              <p>{{ emptyBody }}</p>
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
  `,
})
export class Step1Component {
  /** Parámetro `:country` de la ruta (input binding). */
  readonly country = input.required<string>();

  private readonly store = inject(CountryStore);
  private readonly router = inject(Router);
  private readonly heading = viewChild.required<ElementRef<HTMLElement>>('heading');

  private readonly attempt = signal(0);
  private lastAttempt = 0;

  private readonly result = toSignal(
    toObservable(computed(() => ({ code: this.country(), attempt: this.attempt() }))).pipe(
      switchMap(({ code, attempt }) => {
        const force = attempt !== this.lastAttempt;
        this.lastAttempt = attempt;
        return this.store.loadConfig(code, force).pipe(
          tap((r) => {
            if (r.kind === 'not-found') void this.router.navigateByUrl('/country-not-found', { replaceUrl: true });
          }),
          startWith(null),
        );
      }),
    ),
    { initialValue: null },
  );

  protected readonly view = computed(() => toStep1ViewState(this.result()));
  protected readonly configMessages = computed(() => {
    const v = this.view();
    return v.kind === 'config-error' ? v.issues.map(describeConfigIssue) : [];
  });
  protected readonly emptyTitle = computed(() => {
    const current = this.store.current();
    const name = current?.result.kind === 'empty' ? current.result.country.name : this.country().toUpperCase();
    return t('empty.step1.title', { pais: name });
  });

  protected readonly title = t('step1.title');
  protected readonly loadingMessage = t('loading.step1');
  protected readonly emptyBody = t('empty.step1.body');

  /** "Reintentar": refetch sin perder lo guardado; el foco vuelve al `h1` (guía §6.6). */
  protected retry(): void {
    this.heading().nativeElement.focus();
    this.attempt.update((n) => n + 1);
  }
}
