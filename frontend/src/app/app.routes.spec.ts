import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { appConfig } from './app.config';
import { SESSION_STORAGE } from './core/storage/quote-storage';

async function navigate(url: string): Promise<string> {
  TestBed.configureTestingModule({
    providers: [
      ...appConfig.providers,
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: SESSION_STORAGE, useValue: null },
    ],
  });
  await RouterTestingHarness.create(url);
  return TestBed.inject(Router).url;
}

describe('[R-01.1] rutas de entrada', () => {
  it.each([
    ['/', '/co/quote/step-1'],
    ['/cl', '/cl/quote/step-1'],
    ['/cl/quote', '/cl/quote/step-1'],
    ['/CL/quote/step-1', '/cl/quote/step-1'],
    ['/CL', '/cl/quote/step-1'],
  ])('[R-01.1][AC-01.6] %s termina en %s', async (entrada, destino) => {
    expect(await navigate(entrada)).toBe(destino);
  });

  it('[R-01.1] un código imposible o una ruta desconocida termina en /country-not-found', async () => {
    expect(await navigate('/xyz/quote/step-1')).toBe('/country-not-found');
  });

  it('[R-01.1] una ruta fuera de las cuatro válidas termina en /country-not-found', async () => {
    expect(await navigate('/co/otra-cosa')).toBe('/country-not-found');
  });
});
