import { Injectable, inject, signal } from '@angular/core';
import type { Observable } from 'rxjs';
import { catchError, defer, forkJoin, map, of, tap } from 'rxjs';
import { StrapiApiService } from '../api/strapi-api.service';
import type { CountryLink } from '../contracts/strapi-contracts';
import { toCountryLinks } from '../http/mappers';
import type { ConfigLoadResult } from './config-load';
import { resolveConfigLoad } from './config-load';

export type CountryListState =
  | { kind: 'loading' }
  | { kind: 'ready'; countries: readonly CountryLink[] }
  | { kind: 'empty' }
  | { kind: 'error'; retryable: true };

/**
 * Datos de país de esta carga de la app (R-01.1, R-01.21): lista de países (header y /country-not-found) y
 * configuración del Paso 1 por código. La caché vive solo en memoria: una recarga siempre vuelve a pedir
 * todo a Strapi; "Reintentar" fuerza la petición.
 */
@Injectable({ providedIn: 'root' })
export class CountryStore {
  private readonly api = inject(StrapiApiService);
  private readonly cache = new Map<string, ConfigLoadResult>();
  private listRequested = false;

  private readonly listState = signal<CountryListState>({ kind: 'loading' });
  readonly list = this.listState.asReadonly();

  /** Último resultado cargado, para stepper y título (nunca para lógica de reglas). */
  private readonly currentState = signal<{ code: string; result: ConfigLoadResult } | null>(null);
  readonly current = this.currentState.asReadonly();

  /** Carga la lista de países (una sola vez por carga de la app salvo `force`). */
  loadList(force = false): void {
    if (!force && this.listRequested) return;
    this.listRequested = true;
    this.listState.set({ kind: 'loading' });
    this.api
      .countryList()
      .pipe(
        map((raw): CountryListState => {
          const links = toCountryLinks(raw);
          if (links === null) return { kind: 'error', retryable: true };
          return links.length === 0 ? { kind: 'empty' } : { kind: 'ready', countries: links };
        }),
        catchError(() => of<CountryListState>({ kind: 'error', retryable: true })),
      )
      .subscribe((state) => this.listState.set(state));
  }

  /** País + campos en paralelo; error de red/timeout → `error` recuperable (no `not-found`) (GAP-01.1, GAP-01.15). */
  loadConfig(code: string, force = false): Observable<ConfigLoadResult> {
    return defer(() => {
      const cached = this.cache.get(code);
      if (cached && !force) {
        this.currentState.set({ code, result: cached });
        return of(cached);
      }
      return forkJoin({ country: this.api.country(code), fields: this.api.formFields(code) }).pipe(
        map(({ country, fields }) => resolveConfigLoad(country, fields)),
        catchError(() => of<ConfigLoadResult>({ kind: 'error' })),
        tap((result) => {
          if (result.kind === 'ready' || result.kind === 'empty') this.cache.set(code, result);
          else this.cache.delete(code);
          this.currentState.set({ code, result });
        }),
      );
    });
  }
}
