import { inject } from '@angular/core';
import type { CanActivateFn, UrlTree } from '@angular/router';
import { PRIMARY_OUTLET, Router, UrlSegment } from '@angular/router';
import { map } from 'rxjs';
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
    return countryStore.loadConfig(code).pipe(
      map((result) => {
        if (result.kind === 'not-found') return router.createUrlTree(['/country-not-found']);
        // Error de red, vacío o config-error: el Paso 1 es quien presenta ese estado (con "Reintentar").
        if (result.kind !== 'ready') return redirect('step-1');
        const state = quote.state();
        const decision = decideStepAccess(target, {
          state,
          step1Errors: validateStep1(result.config, state.step1, now()),
          activePlanDocumentIds: null,
        });
        if (decision.kind === 'allow') return true;
        quote.setPendingTouch(decision.touchFieldDocumentIds);
        return redirect(decision.to);
      }),
    );
  };
}

export const step2Guard = stepGuard('step-2');
export const step3Guard = stepGuard('step-3');
export const confirmationGuard = stepGuard('confirmation');
