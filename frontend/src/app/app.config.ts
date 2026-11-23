import type { ApplicationConfig } from '@angular/core';
import { provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { provideRouter, withComponentInputBinding, withRouterConfig } from '@angular/router';
import { apiUrlInterceptor } from './core/http/api-url.interceptor';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // `paramsInheritanceStrategy: 'always'`: `:country` llega como input a cada paso (input binding).
    provideRouter(routes, withComponentInputBinding(), withRouterConfig({ paramsInheritanceStrategy: 'always' })),
    provideHttpClient(withFetch(), withInterceptors([apiUrlInterceptor])),
  ],
};
