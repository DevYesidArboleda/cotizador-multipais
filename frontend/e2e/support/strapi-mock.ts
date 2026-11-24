import type { Page, Request, Route } from '@playwright/test';
import type { MockCountry, MockField, MockPlan } from './mock-fixtures';
import { mockClFields, mockClPlans, mockCoFields, mockCoPlans, mockCountry } from './mock-fixtures';

export interface CountryMock {
  country: MockCountry;
  fields: MockField[];
  /** Latencia simulada de la respuesta de campos (ms). */
  fieldsDelayMs?: number;
  /** Estado HTTP forzado de la respuesta de campos (p. ej. 500). */
  fieldsStatus?: number;
  /** `meta.pagination.total` forzado. */
  fieldsTotal?: number;
  /** Planes tal como los devolvería Strapi (el test decide qué incluir). */
  plans: MockPlan[];
  plansDelayMs?: number;
  plansStatus?: number;
  plansTotal?: number;
}

export interface StrapiMock {
  /** Configuración viva por código: mutarla simula que negocio cambió Strapi. */
  countries: Map<string, CountryMock>;
  requests: { origin: string; url: string; headers: Record<string, string> }[];
}

export function defaultMock(): StrapiMock {
  return {
    countries: new Map<string, CountryMock>([
      ['co', { country: mockCountry(), fields: mockCoFields(), plans: mockCoPlans() }],
      ['cl', { country: mockCountry({ id: 2, documentId: 'mock-country-cl', code: 'cl', name: 'Chile', currencyCode: 'CLP', locale: 'es-CL' }), fields: mockClFields(), plans: mockClPlans() }],
    ]),
    requests: [],
  };
}

const page1 = (total: number) => ({ page: 1, pageSize: 100, pageCount: 1, total });

/** Simula las lecturas de Strapi con `page.route` (E2E-M). No existe ninguna escritura ni token. */
export async function mockStrapi(page: Page, mock: StrapiMock = defaultMock()): Promise<StrapiMock> {
  const handle = async (route: Route, request: Request): Promise<void> => {
    const url = new URL(request.url());
    mock.requests.push({ origin: url.origin, url: url.pathname + url.search, headers: await request.allHeaders() });
    const json = (status: number, body: unknown) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

    if (url.pathname === '/api/countries') {
      const code = url.searchParams.get('filters[code][$eq]');
      if (code !== null) {
        const found = mock.countries.get(code);
        return json(200, { data: found ? [found.country] : [], meta: { pagination: page1(found ? 1 : 0) } });
      }
      const list = [...mock.countries.values()].map((c) => ({ id: c.country.id, documentId: c.country.documentId, code: c.country.code, name: c.country.name }));
      return json(200, { data: list, meta: { pagination: page1(list.length) } });
    }
    if (url.pathname === '/api/form-fields') {
      const code = url.searchParams.get('filters[country][code][$eq]') ?? '';
      const found = mock.countries.get(code);
      if (found?.fieldsDelayMs) await new Promise((resolve) => setTimeout(resolve, found.fieldsDelayMs));
      if (found?.fieldsStatus && found.fieldsStatus >= 400) {
        return json(found.fieldsStatus, { data: null, error: { status: found.fieldsStatus, name: 'InternalServerError', message: 'simulado' } });
      }
      const data = found?.fields ?? [];
      return json(200, { data, meta: { pagination: page1(found?.fieldsTotal ?? data.length) } });
    }
    if (url.pathname === '/api/insurance-plans') {
      const code = url.searchParams.get('filters[country][code][$eq]') ?? '';
      const found = mock.countries.get(code);
      if (found?.plansDelayMs) await new Promise((resolve) => setTimeout(resolve, found.plansDelayMs));
      if (found?.plansStatus && found.plansStatus >= 400) {
        return json(found.plansStatus, { data: null, error: { status: found.plansStatus, name: 'InternalServerError', message: 'simulado' } });
      }
      const data = found?.plans ?? [];
      return json(200, { data, meta: { pagination: page1(found?.plansTotal ?? data.length) } });
    }
    return route.fulfill({ status: 404, contentType: 'application/json', body: '{}' });
  };
  await page.route((url) => url.pathname.startsWith('/api/'), (route, request) => handle(route, request));
  return mock;
}

/** Errores de consola y excepciones de la página (AC-01.7, R-01.24). */
export function captureConsole(page: Page): { errors: string[]; all: string[] } {
  const sink = { errors: [] as string[], all: [] as string[] };
  page.on('console', (message) => {
    sink.all.push(message.text());
    if (message.type() === 'error') sink.errors.push(message.text());
  });
  page.on('pageerror', (error) => sink.errors.push(error.message));
  return sink;
}

export function countryMock(mock: StrapiMock, code: string): CountryMock {
  const found = mock.countries.get(code);
  if (!found) throw new Error(`mock sin país ${code}`);
  return found;
}

/** Sustituye las opciones del campo con rol `city` (E2E-M del ajuste por ciudad). */
export function setCityOptions(mock: StrapiMock, code: string, options: NonNullable<MockField['options']>): void {
  const city = countryMock(mock, code).fields.find((f) => f.semanticRole === 'city');
  if (!city) throw new Error('mock sin campo city');
  city.options = options;
}
