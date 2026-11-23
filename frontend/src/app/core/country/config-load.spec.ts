import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TimeoutError } from 'rxjs';
import { StrapiApiService } from '../api/strapi-api.service';
import { HTTP_TIMEOUT_MS } from '../contracts/strapi-contracts';
import { clFields, coFields, countryDto, listOf } from '../../testing/form-fixtures';
import { resolveConfigLoad } from './config-load';

describe('[R-01.23] respuesta de campos', () => {
  it('[R-01.23] meta.pagination.total > 100 produce config-error (nunca se trunca en silencio)', () => {
    const result = resolveConfigLoad(listOf([countryDto()]), listOf(coFields(), 101));
    expect(result.kind).toBe('config-error');
    if (result.kind === 'config-error') expect(result.issues).toEqual([{ code: 'too-many-results', resource: 'formFields', total: 101 }]);
  });

  it('[R-01.23] una respuesta con forma inválida es config-error, no una excepción', () => {
    expect(resolveConfigLoad(listOf([countryDto()]), { nope: true }).kind).toBe('config-error');
    expect(resolveConfigLoad({}, listOf([])).kind).toBe('config-error');
    expect(resolveConfigLoad(listOf([countryDto()]), listOf([{ id: 1 }])).kind).toBe('config-error');
  });

  it('[R-01.23] el timeout de 10 000 ms termina en error recuperable', () => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    vi.useFakeTimers();
    try {
      let failure: unknown;
      TestBed.inject(StrapiApiService).country('co').subscribe({ error: (e: unknown) => (failure = e) });
      vi.advanceTimersByTime(HTTP_TIMEOUT_MS - 1);
      expect(failure).toBeUndefined();
      vi.advanceTimersByTime(1);
      expect(failure).toBeInstanceOf(TimeoutError);
      TestBed.inject(HttpTestingController).match(() => true);
    } finally {
      vi.useRealTimers();
    }
  });

  it('[R-01.23] las peticiones salen con ruta relativa y sin cabecera Authorization', () => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    TestBed.inject(StrapiApiService).formFields('co').subscribe();
    const req = TestBed.inject(HttpTestingController).expectOne((r) => r.url.startsWith('/api/form-fields'));
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush(listOf([]));
  });
});

describe('[R-01.1] país no encontrado vs error', () => {
  it('[R-01.1] 0 países → not-found; la lista de campos de otro país no influye', () => {
    expect(resolveConfigLoad(listOf([]), listOf(coFields())).kind).toBe('not-found');
  });

  it('[R-01.1] país válido sin campos → empty (no not-found)', () => {
    expect(resolveConfigLoad(listOf([countryDto()]), listOf([])).kind).toBe('empty');
  });

  it('[R-01.1] CO y CL producen configuraciones distintas desde el mismo código', () => {
    const co = resolveConfigLoad(listOf([countryDto()]), listOf(coFields()));
    const cl = resolveConfigLoad(listOf([countryDto({ code: 'cl' })]), listOf(clFields()));
    expect(co.kind).toBe('ready');
    expect(cl.kind).toBe('ready');
    if (co.kind === 'ready' && cl.kind === 'ready') {
      expect(co.config.roles.document_type).toBeDefined();
      expect(cl.config.roles.document_type).toBeUndefined();
    }
  });
});
