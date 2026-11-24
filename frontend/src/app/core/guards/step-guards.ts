import { inject } from '@angular/core';
import type { CanActivateFn, UrlTree } from '@angular/router';
import { PRIMARY_OUTLET, Router, UrlSegment } from '@angular/router';
import { map, of, switchMap } from 'rxjs';
import type { Observable } from 'rxjs';
import { decideCountrySegment } from '../../domain/country/country-resolver';
import { validateStep1 } from '../../domain/form/validate-step1';
import { NOW } from '../clock';
import type { QuoteStep } from '../contracts/strapi-contracts';
import { CountryStore } from '../country/country.store';
import { QuoteStore } from '../quote/quote.store';
import { decideStepAccess } from './step-access';

/** Valida el segmento `:country`: mayúsculas → minúsculas, código imposible → /country-not-found (R-01.1, AC-01.6). */
export const countryGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const decision = decideCountrySegment(route.paramMap.get('country') ?? '');
  switch (decision.kind) {
    case 'not-found':
      return router.createUrlTree(['/country-not-found']);
    case 'redirect-lowercase': {
      const tree = router.parseUrl(state.url);
      const primary = tree.root.children[PRIMARY_OUTLET];
      if (primary) primary.segments = [new UrlSegment(decision.code, {}), ...primary.segments.slice(1)];
      return tree;
    }
    case 'ok':
      inject(QuoteStore).activate(decision.code);
      return true;
  }
};

/** Paso 1: con `confirmation` presente redirige a /confirmation hasta "Nueva cotización" (R-03.14). Sin red. */
export const step1Guard: CanActivateFn = (route) => {
  const code = route.paramMap.get('country') ?? '';
  const quote = inject(QuoteStore);
  quote.activate(code);
  return quote.state().confirmation ? inject(Router).createUrlTree(['/', code, 'quote', 'confirmation']) : true;
};

/** Guard común de Paso 2, Paso 3 y confirmación: revalida el Paso 1 con la configuración vigente (R-01.10). */
function stepGuard(target: Exclude<QuoteStep, 'step-1'>): CanActivateFn {
  return (route) => {
    const router = inject(Router);
    const countryStore = inject(CountryStore);
    const quote = inject(QuoteStore);
    const now = inject(NOW);
    const code = route.paramMap.get('country') ?? '';
    quote.activate(code);
    const redirect = (to: QuoteStep): UrlTree => router.createUrlTree(['/', code, 'quote', to]);
    // R-03.14: con confirmación persistida solo existe /confirmation (sin red); sin ella, /confirmation sigue el orden común.
    if (quote.state().confirmation) return target === 'confirmation' ? true : redirect('confirmation');
    // R-02.24: la configuración de campos se refetchea al entrar al Paso 2 (incluida la recarga).
    return countryStore.loadConfig(code, target === 'step-2').pipe(
      switchMap((result): Observable<boolean | UrlTree> => {
        if (result.kind === 'not-found') return of(router.createUrlTree(['/country-not-found']));
        // Error de red, vacío o config-error: el Paso 1 es quien presenta ese estado (con "Reintentar").
        // F-03.4: el Paso 3 presenta su propio error recuperable (R-03.18) si la red falla al recargarlo.
        if (result.kind === 'error' && target === 'step-3') return of(true);
        if (result.kind !== 'ready') return of(redirect('step-1'));
        const state = quote.state();
        const step1Errors = validateStep1(result.config, state.step1, now());
        const decide = (activePlanDocumentIds: ReadonlySet<string> | null): boolean | UrlTree => {
          const decision = decideStepAccess(target, { state, step1Errors, activePlanDocumentIds });
          if (decision.kind === 'allow') return true;
          quote.setPendingTouch(decision.touchFieldDocumentIds);
          quote.setPendingNotice(decision.notice);
          return redirect(decision.to);
        };
        const needsPlans = target !== 'step-2' && step1Errors.length === 0 && state.selectedPlan !== undefined && !state.confirmation;
        if (!needsPlans) return of(decide(null));
        // R-02.12: planes siempre frescos antes de entrar al Paso 3.
        return countryStore.loadPlans(result.config.country).pipe(
          map((plans) => {
            if (plans.kind === 'ok') return decide(new Set(plans.plans.map((p) => p.documentId)));
            if (plans.kind === 'empty') return decide(new Set<string>());
            // config-error de moneda/ciudad: el Paso 3 lo presenta con el pago bloqueado (R-03.25).
            return decide(null);
          }),
        );
      }),
    );
  };
}

export const step2Guard = stepGuard('step-2');
export const step3Guard = stepGuard('step-3');
export const confirmationGuard = stepGuard('confirmation');
