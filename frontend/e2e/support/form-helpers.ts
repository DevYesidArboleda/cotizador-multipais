import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

/** Hoy fijo de las pruebas: 2026-11-23 en America/Bogota (la zona la fija playwright.config.ts). */
export const FIXED_NOW = new Date('2026-11-23T10:00:00-05:00');

/** Control por etiqueta visible (el `*` obligatorio es decorativo y no cuenta). */
export function field(page: Page, label: string): Locator {
  return page.getByLabel(new RegExp(`^${label}`));
}

export async function setText(page: Page, label: string, value: string): Promise<Locator> {
  const control = field(page, label);
  await control.fill(value);
  await control.blur();
  return control;
}

export const invalid = (control: Locator) => expect(control).toHaveAttribute('aria-invalid', 'true');
export const valid = (control: Locator) => expect(control).not.toHaveAttribute('aria-invalid', 'true');

export async function openStep1(page: Page, country: string): Promise<void> {
  await page.goto(`/${country}/quote/step-1`);
  await expect(page.getByRole('heading', { level: 1, name: 'Tus datos y los de tu vehículo' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Continuar' })).toBeVisible();
}

export interface CoValues {
  name?: string;
  docType?: string;
  docNumber?: string;
  birth?: string;
  email?: string;
  city?: string;
  plate?: string;
  brand?: string;
  year?: string;
  consent?: boolean;
}

const CO_DEFAULTS: Required<CoValues> = {
  name: 'Ana Pérez Demo', docType: 'CC', docNumber: '12345678', birth: '1990-05-10', email: 'ana.perez@example.com',
  city: 'bogota', plate: 'ABC123', brand: 'mazda', year: '2020', consent: true,
};

/** Completa el formulario de Colombia (seed o mock) con datos ficticios válidos. */
export async function fillCo(page: Page, overrides: CoValues = {}): Promise<void> {
  const v = { ...CO_DEFAULTS, ...overrides };
  await field(page, 'Nombre completo').fill(v.name);
  await field(page, 'Tipo de documento').selectOption(v.docType);
  await field(page, 'Número de documento').fill(v.docNumber);
  await field(page, 'Fecha de nacimiento').fill(v.birth);
  await field(page, 'Correo electrónico').fill(v.email);
  await field(page, 'Ciudad').selectOption(v.city);
  await field(page, 'Placa').fill(v.plate);
  await field(page, 'Marca').selectOption(v.brand);
  await field(page, 'Año del vehículo').fill(v.year);
  const consent = page.getByLabel(/^Autorizo el tratamiento/);
  if (v.consent) await consent.check();
}

export async function submit(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Continuar' }).click();
}

export interface ClValues {
  name?: string;
  rut?: string;
  birth?: string;
  email?: string;
  city?: string;
  plate?: string;
  brand?: string;
  year?: string;
}

const CL_DEFAULTS: Required<ClValues> = {
  name: 'Ana Pérez Demo', rut: '12.345.678-5', birth: '1990-05-10', email: 'ana.perez@example.com',
  city: 'santiago', plate: 'BCDF12', brand: 'mazda', year: '2020',
};

/** Completa el formulario de Chile (seed o mock) con datos ficticios válidos. */
export async function fillCl(page: Page, overrides: ClValues = {}): Promise<void> {
  const v = { ...CL_DEFAULTS, ...overrides };
  await field(page, 'Nombre completo').fill(v.name);
  await field(page, 'RUT').fill(v.rut);
  await field(page, 'Fecha de nacimiento').fill(v.birth);
  await field(page, 'Correo electrónico').fill(v.email);
  await field(page, 'Ciudad').selectOption(v.city);
  await field(page, 'Patente').fill(v.plate);
  await field(page, 'Marca').selectOption(v.brand);
  await field(page, 'Año del vehículo').fill(v.year);
  await page.getByLabel(/^Autorizo el tratamiento/).check();
}

/** Completa el Paso 1 de Colombia y llega al Paso 2. */
export async function goToStep2(page: Page, overrides: CoValues = {}): Promise<void> {
  await openStep1(page, 'co');
  await fillCo(page, overrides);
  await submit(page);
  await expect(page).toHaveURL(/\/co\/quote\/step-2$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Elige tu plan' })).toBeVisible();
}

export const planRadio = (page: Page, name: string): Locator => page.getByRole('radio', { name: new RegExp(`^${name}`) });
export const continueButton = (page: Page): Locator => page.getByRole('button', { name: 'Continuar al resumen' });

/** Elige un plan y espera a que la selección esté persistida en sessionStorage (el guardado es asíncrono). */
export async function choosePlan(page: Page, name: string, country = 'co'): Promise<void> {
  await planRadio(page, name).check();
  await expect(page.getByText('Elegido', { exact: true })).toHaveCount(1);
  await expect
    .poll(() => page.evaluate((key) => sessionStorage.getItem(key) ?? '', `auto_quote_v1_${country}`))
    .toContain('selectedPlan');
}

export const payButton = (page: Page): Locator => page.getByRole('button', { name: /^(Pagar|Procesando pago)/ });
export const acceptTerms = (page: Page): Locator => page.getByLabel('Acepto los términos y condiciones');
export const simulationRadio = (page: Page, name: 'Aprobado' | 'Rechazado'): Locator => page.getByRole('radio', { name });
export const QUOTE_NUMBER = /COT-[A-Z]{2}-\d{8}-[0-9A-F]{4}/;

/** Del Paso 2 al Paso 3 eligiendo un plan (el resumen exige plan elegido). */
export async function continueToStep3(page: Page, plan = 'Plus', country = 'co'): Promise<void> {
  await choosePlan(page, plan, country);
  await continueButton(page).click();
  await expect(page).toHaveURL(new RegExp(`/${country}/quote/step-3$`));
  await expect(page.getByRole('heading', { level: 1, name: 'Revisa tu cotización' })).toBeVisible();
  await expect(payButton(page)).toBeVisible();
}

/** Flujo de Colombia hasta el resumen. */
export async function goToStep3(page: Page, overrides: CoValues = {}, plan = 'Plus'): Promise<void> {
  await goToStep2(page, overrides);
  await continueToStep3(page, plan);
}

/** Cuenta las llamadas a `crypto.getRandomValues(2 bytes)`: una por cada simulación de pago aprobada. */
export async function countQuoteNumbers(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const w = window as unknown as { __quoteDraws: number };
    w.__quoteDraws = 0;
    const original = crypto.getRandomValues.bind(crypto);
    crypto.getRandomValues = ((array: ArrayBufferView) => {
      if (array.byteLength === 2) w.__quoteDraws += 1;
      return original(array as Uint8Array<ArrayBuffer>);
    }) as typeof crypto.getRandomValues;
  });
}
export const quoteDraws = (page: Page): Promise<number> => page.evaluate(() => (window as unknown as { __quoteDraws: number }).__quoteDraws);
