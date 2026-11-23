import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';
import { timeout } from 'rxjs';
import { HTTP_TIMEOUT_MS } from '../contracts/strapi-contracts';
import { buildStrapiUrl } from '../http/strapi-queries';

/**
 * Única puerta HTTP hacia Strapi (solo `/api/...` relativo, sin token). Devuelve JSON crudo `unknown`:
 * los mappers lo validan y lo convierten a dominio. El timeout de 10 s produce un error recuperable (R-01.23).
 * Al desuscribirse la petición se cancela (R-01.20, AC-01.17).
 */
@Injectable({ providedIn: 'root' })
export class StrapiApiService {
  private readonly http = inject(HttpClient);

  country(code: string): Observable<unknown> {
    return this.get(buildStrapiUrl('country', code));
  }

  countryList(): Observable<unknown> {
    return this.get(buildStrapiUrl('countryList'));
  }

  formFields(code: string): Observable<unknown> {
    return this.get(buildStrapiUrl('formFields', code));
  }

  private get(url: string): Observable<unknown> {
    return this.http.get<unknown>(url).pipe(timeout(HTTP_TIMEOUT_MS));
  }
}
