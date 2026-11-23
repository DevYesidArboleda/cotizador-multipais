import { expect, test } from '@playwright/test';
import type { CountryMock } from './support/strapi-mock';
import { captureConsole, defaultMock, mockStrapi } from './support/strapi-mock';
import { mockField } from './support/mock-fixtures';
import { field, FIXED_NOW, fillCo, invalid, openStep1, setText, submit, valid } from './support/form-helpers';

/**
 * E2E-M de SPEC-US-01 (HITL-1 "Mock + prueba manual"): Strapi se simula con `page.route`. Mutar la configuración
 * = cambiar el mock entre recargas; no existe ningún token de escritura. La cadena real admin → API → front se
 * confirma una vez en vivo en HITL-3.
 */

test.describe('[R-01.21][AC-01.3] cambio de configuración sin despliegue', () => {
  test('[AC-01.3][R-01.21] un campo nuevo publicado aparece tras recargar en su posición y los valores se conservan', async ({ page }) => {
    const mock = await mockStrapi(page);
    await openStep1(page, 'co');
    await expect(page.getByLabel(/^Código de referido/)).toHaveCount(0);
    await field(page, 'Nombre completo').fill('Ana Persistente');
    await page.waitForTimeout(150);

    const co = mock.countries.get('co');
    if (!co) throw new Error('mock sin co');
    co.fields.push(mockField({ key: 'referral', semanticRole: 'none', type: 'text', label: 'Código de referido', order: 45, required: false }));
    const pedidosAntes = mock.requests.filter((r) => r.url.startsWith('/api/form-fields')).length;
    await page.reload();

    await expect(page.getByLabel(/^Código de referido/)).toBeVisible();
    expect(mock.requests.filter((r) => r.url.startsWith('/api/form-fields')).length).toBeGreaterThan(pedidosAntes);
    const labels = (await page.locator('app-dynamic-field label').allTextContents()).map((l) => l.replace(/\s*\*\s*$/, '').trim());
    expect(labels.indexOf('Código de referido')).toBe(labels.indexOf('Fecha de nacimiento') + 1);
    await expect(field(page, 'Nombre completo')).toHaveValue('Ana Persistente');
  });
});

test.describe('[R-01.11][AC-01.7] rol requerido ausente', () => {
  test('[AC-01.7][R-01.11] sin birth_date: error de configuración que lo nombra, sin formulario ni "Continuar" y sin errores de consola', async ({ page }) => {
    const consola = captureConsole(page);
    const mock = defaultMock();
    const co = mock.countries.get('co');
    if (!co) throw new Error('mock sin co');
    co.fields = co.fields.filter((f) => f.semanticRole !== 'birth_date');
    await mockStrapi(page, mock);
    await page.goto('/co/quote/step-1');
    const alerta = page.getByRole('alert');
    await expect(alerta).toContainText('Error de configuración');
    await expect(alerta).toContainText('Falta el campo con rol birth_date.');
    await expect(page.getByRole('button', { name: 'Continuar' })).toHaveCount(0);
    await expect(page.locator('form')).toHaveCount(0);
    expect(consola.errors).toEqual([]);
  });

  for (const [titulo, mutar] of [
    ['rol duplicado', (f: CountryMock) => f.fields.push(mockField({ key: 'dup', semanticRole: 'vehicle_year', type: 'number', label: 'Otro año', section: 'vehicle' }))],
    ['tipo incorrecto', (f: CountryMock) => { f.fields = f.fields.map((x) => (x.semanticRole === 'birth_date' ? { ...x, type: 'text' as const } : x)); }],
  ] as const) {
    test(`[R-01.11] ${titulo} produce config-error y no avanza`, async ({ page }) => {
      const mock = defaultMock();
      const co = mock.countries.get('co');
      if (!co) throw new Error('mock sin co');
      mutar(co);
      await mockStrapi(page, mock);
      await page.goto('/co/quote/step-1');
      await expect(page.getByRole('alert')).toContainText('Error de configuración');
      await expect(page.getByRole('button', { name: 'Continuar' })).toHaveCount(0);
    });
  }
});

test.describe('[R-01.12][AC-01.8] renombrar la key no rompe la lógica', () => {
  test('[AC-01.8][R-01.12] con birth_date renombrado a zzz_1 la mayoría de edad se valida y los datos se conservan', async ({ page }) => {
    const mock = defaultMock();
    const co = mock.countries.get('co');
    if (!co) throw new Error('mock sin co');
    await mockStrapi(page, mock);
    await page.clock.setFixedTime(FIXED_NOW);
    await openStep1(page, 'co');
    await field(page, 'Nombre completo').fill('Ana Renombrada');
    await page.waitForTimeout(150);

    co.fields = co.fields.map((f) => (f.semanticRole === 'birth_date' ? { ...f, key: 'zzz_1' } : f));
    await page.reload();
    const birth = await setText(page, 'Fecha de nacimiento', '2015-01-01');
    await invalid(birth);
    await expect(page.getByText('Debes ser mayor de edad.')).toBeVisible();
    await setText(page, 'Fecha de nacimiento', '1990-01-01');
    await valid(birth);
    await expect(field(page, 'Nombre completo')).toHaveValue('Ana Renombrada');
    await expect(birth).toHaveAttribute('name', 'zzz_1');
  });
});

test.describe('[R-01.15][AC-01.11] parámetros por país', () => {
  test('[AC-01.11][R-01.15] con legalAge 21 y vehicleMaxAgeYears 10 una persona de 20 años y el año 2015 son inválidos', async ({ page }) => {
    const mock = defaultMock();
    const co = mock.countries.get('co');
    if (!co) throw new Error('mock sin co');
    co.country = { ...co.country, legalAge: 21, vehicleMaxAgeYears: 10 };
    await mockStrapi(page, mock);
    await page.clock.setFixedTime(FIXED_NOW);
    await openStep1(page, 'co');
    await invalid(await setText(page, 'Fecha de nacimiento', '2006-11-23'));
    await invalid(await setText(page, 'Año del vehículo', '2015'));
    await valid(await setText(page, 'Fecha de nacimiento', '2005-11-23'));
    await valid(await setText(page, 'Año del vehículo', '2016'));
  });
});

test.describe('[R-01.9][AC-01.19][AC-01.20] datos guardados frente a configuración mutada', () => {
  test('[AC-01.19][R-01.9] un campo despublicado no aparece y su valor antiguo se purga en el siguiente guardado', async ({ page }) => {
    const mock = defaultMock();
    const co = mock.countries.get('co');
    if (!co) throw new Error('mock sin co');
    await mockStrapi(page, mock);
    await openStep1(page, 'co');
    await field(page, 'Ciudad').selectOption('bogota');
    await page.waitForTimeout(150);
    const ciudadId = co.fields.find((f) => f.semanticRole === 'city')?.documentId ?? '';
    expect(await page.evaluate(() => sessionStorage.getItem('auto_quote_v1_co'))).toContain(ciudadId);

    co.fields = co.fields.filter((f) => f.semanticRole !== 'city');
    await page.reload();
    await expect(page.getByLabel(/^Ciudad/)).toHaveCount(0);
    await field(page, 'Nombre completo').fill('Ana');
    await page.waitForTimeout(150);
    expect(await page.evaluate(() => sessionStorage.getItem('auto_quote_v1_co'))).not.toContain(ciudadId);
  });

  test('[AC-01.20][R-01.9] la opción eliminada deja el select sin selección y sin error hasta intentar continuar', async ({ page }) => {
    const mock = defaultMock();
    const co = mock.countries.get('co');
    if (!co) throw new Error('mock sin co');
    await mockStrapi(page, mock);
    await openStep1(page, 'co');
    await field(page, 'Marca').selectOption('mazda');
    await page.waitForTimeout(150);

    co.fields = co.fields.map((f) => (f.semanticRole === 'vehicle_brand' ? { ...f, options: (f.options ?? []).filter((o) => o.value !== 'mazda') } : f));
    await page.reload();
    const marca = field(page, 'Marca');
    await expect(marca).toHaveValue('');
    await valid(marca);
    await submit(page);
    await invalid(marca);
  });
});

test.describe('[R-01.10][AC-01.21] el guard revalida contra la configuración vigente', () => {
  test('[AC-01.21][R-01.10] un campo nuevo requerido publicado tras completar el Paso 1 redirige a step-1 y lo marca con su mensaje', async ({ page }) => {
    const mock = defaultMock();
    const co = mock.countries.get('co');
    if (!co) throw new Error('mock sin co');
    await mockStrapi(page, mock);
    await openStep1(page, 'co');
    await fillCo(page);
    await submit(page);
    await expect(page).toHaveURL('/co/quote/step-2');

    co.fields.push(mockField({ key: 'extra', semanticRole: 'none', type: 'text', label: 'Dato adicional', order: 85, errorMessage: 'El dato adicional es obligatorio.' }));
    await page.reload();
    await expect(page).toHaveURL('/co/quote/step-1');
    const extra = field(page, 'Dato adicional');
    await invalid(extra);
    await expect(page.getByText('El dato adicional es obligatorio.')).toBeVisible();
    await expect(page.locator('[aria-live="polite"]').filter({ hasText: 'Hay 1 error en el formulario' })).toBeVisible();
    await expect(field(page, 'Nombre completo')).toHaveValue('Ana Pérez Demo');
  });

  test('[R-01.10] sin datos guardados, entrar directo al Paso 2 redirige a step-1 marcando los campos requeridos', async ({ page }) => {
    await mockStrapi(page);
    await page.goto('/co/quote/step-2');
    await expect(page).toHaveURL('/co/quote/step-1');
    await expect(field(page, 'Nombre completo')).toHaveAttribute('aria-invalid', 'true');
  });
});

test.describe('[R-01.31][AC-01.32] negocio cambia el patrón de la placa sin despliegue', () => {
  test('[AC-01.32][R-01.31] con el patrón solo auto, ABC12D pasa a inválida con el mensaje de Strapi tras recargar', async ({ page }) => {
    const mock = defaultMock();
    const co = mock.countries.get('co');
    if (!co) throw new Error('mock sin co');
    await mockStrapi(page, mock);
    await openStep1(page, 'co');
    await valid(await setText(page, 'Placa', 'ABC12D'));

    co.fields = co.fields.map((f) => (f.semanticRole === 'vehicle_plate' ? { ...f, validation: { pattern: '^[A-Z]{3}[0-9]{3}$', validatorKey: 'none' } } : f));
    await page.reload();
    const placa = field(page, 'Placa');
    await placa.fill('ABC12D');
    await placa.blur();
    await invalid(placa);
    await expect(page.getByText('Ingresa una placa válida.')).toBeVisible();
    await valid(await setText(page, 'Placa', 'ABC123'));
  });
});
