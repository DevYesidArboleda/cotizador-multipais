import type { Routes } from '@angular/router';
import { confirmationGuard, countryGuard, step1Guard, step2Guard, step3Guard } from './core/guards/step-guards';
import { DEFAULT_COUNTRY_CODE } from './domain/country/country-resolver';

/** Rutas únicas válidas (CLAUDE.md §4). `/` y `/:country` redirigen a `step-1`; país inválido → /country-not-found. */
export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: `${DEFAULT_COUNTRY_CODE}/quote/step-1` },
  {
    path: 'country-not-found',
    loadComponent: () =>
      import('./features/country-not-found/country-not-found.component').then((m) => m.CountryNotFoundComponent),
  },
  {
    path: ':country',
    canActivate: [countryGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'quote/step-1' },
      {
        path: 'quote',
        children: [
          { path: '', pathMatch: 'full', redirectTo: 'step-1' },
          { path: 'step-1', canActivate: [step1Guard], loadComponent: () => import('./features/step-1/step-1.component').then((m) => m.Step1Component) },
          {
            path: 'step-2',
            canActivate: [step2Guard],
            loadComponent: () => import('./features/step-2/step-2.component').then((m) => m.Step2Component),
          },
          {
            path: 'step-3',
            canActivate: [step3Guard],
            loadComponent: () => import('./features/step-3/step-3.component').then((m) => m.Step3Component),
          },
          {
            path: 'confirmation',
            canActivate: [confirmationGuard],
            loadComponent: () =>
              import('./features/confirmation/confirmation.component').then((m) => m.ConfirmationComponent),
          },
        ],
      },
    ],
  },
  { path: '**', redirectTo: 'country-not-found' },
];
