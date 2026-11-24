import { expect, test } from '@playwright/test';
import { mockPlan } from './support/mock-fixtures';
import { countryMock, defaultMock, mockStrapi } from './support/strapi-mock';
import { choosePlan, continueButton, continueToStep3, field, FIXED_NOW, fillCo, goToStep2, goToStep3, openStep1, payButton, planRadio, submit } from './support/form-helpers';

const digits = (text: string | null): string => (text ?? '').replace(/\D/g, '');
const dd = (page: import('@playwright/test').Page, label: string) =>
  page.locator('.rows__item', { has: page.getByText(label, { exact: true }) }).locator('dd');

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(FIXED_NOW);
});

test.describe('E2E-S resumen contra el Strapi sembrado', () => {
  test('[R-03.2][AC-03.1][R-03.6] tres bloques en orden (tomador, vehículo, plan) y mismo precio que el Paso 2', async ({ page }) => {
    await goToStep2(page);
    const priceStep2 = digits(await page.locator('.plan', { has: page.getByText('Plus', { exact: true }) }).locator('.plan__price-value').textContent());
    await continueToStep3(page, 'Plus');
    const headings = await page.locator('main h2').allTextContents();
    expect(headings.slice(0, 3)).toEqual(['Datos del tomador', 'Datos del vehículo', 'Tu plan']);
    await expect(dd(page, 'Nombre completo')).toHaveText('Ana Pérez Demo');
    await expect(dd(page, 'Placa')).toHaveText('ABC123');
    await expect(page.locator('.plan-name')).toHaveText('Plus');
    await expect(page.getByText('El equilibrio entre cobertura y precio.')).toBeVisible();
    await expect(page.getByText('Pérdida parcial por daños')).toBeVisible();
    expect(digits(await page.locator('.price-line .price').first().textContent())).toBe(priceStep2);
    expect(priceStep2).toBe('1998000');
  });

  test('[R-03.1][AC-03.5] sin plan elegido, /step-3 redirige a /step-2', async ({ page }) => {
    await goToStep2(page);
    await page.goto('/co/quote/step-3');
    await expect(page).toHaveURL(/\/co\/quote\/step-2$/);
  });

  test('[R-03.1] sin completar el Paso 1, /step-3 redirige a /step-1', async ({ page }) => {
    await page.goto('/co/quote/step-3');
    await expect(page).toHaveURL(/\/co\/quote\/step-1$/);
  });

  test('[R-03.3][AC-03.22] valores legibles: etiqueta de la marca, fecha del país, Sí/No y "No informado"', async ({ page }) => {
    await openStep1(page, 'co');
    await fillCo(page, { birth: '2008-11-23', brand: 'mazda' });
    await page.getByLabel('Uso particular').check();
    await submit(page);
    await expect(page).toHaveURL(/step-2$/);
    await continueToStep3(page, 'Plus');
    await expect(dd(page, 'Marca')).toHaveText('Mazda');
    await expect(dd(page, 'Fecha de nacimiento')).toHaveText('23/11/2008');
    await expect(dd(page, 'Uso particular')).toHaveText('Sí');
    await expect(dd(page, 'Teléfono')).toHaveText('No informado');
    const body = await page.locator('main').innerText();
    expect(body).not.toMatch(/\btrue\b|\bfalse\b/);
    await expect(page.getByText('2008-11-23')).toHaveCount(0);
  });

  test('[R-03.24][AC-03.27] el correo se ve completo en el tomador y el documento enmascarado', async ({ page }) => {
    await goToStep2(page, { docNumber: '1020304050', email: 'ana.perez@example.com' });
    await continueToStep3(page, 'Plus');
    await expect(dd(page, 'Correo electrónico')).toHaveText('ana.perez@example.com');
    await expect(dd(page, 'Número de documento')).toHaveText('******4050');
  });

  test('[R-03.16][AC-03.13] "Editar datos" conserva los datos; al volver el precio se recalcula y los términos están sin aceptar', async ({ page }) => {
    await goToStep3(page, { city: 'otra', year: '2020' });
    await page.getByLabel('Acepto los términos y condiciones').check();
    const before = digits(await page.locator('.price-line .price').first().textContent());
    await page.getByRole('link', { name: /^Editar datos del tomador/ }).click();
    await expect(page).toHaveURL(/step-1$/);
    await expect(field(page, 'Nombre completo')).toHaveValue('Ana Pérez Demo');
    await field(page, 'Año del vehículo').fill('2025');
    await submit(page);
    await expect(page).toHaveURL(/step-2$/);
    await expect(planRadio(page, 'Plus')).toBeChecked();
    await continueButton(page).click();
    await expect(page).toHaveURL(/step-3$/);
    const after = digits(await page.locator('.price-line .price').first().textContent());
    expect(before).toBe('1850000');
    expect(after).toBe('2035000');
    await expect(page.getByLabel('Acepto los términos y condiciones')).not.toBeChecked();
    await expect(payButton(page)).toBeDisabled();
  });

  test('[R-03.16][AC-03.14] "Cambiar plan" lleva al Paso 2 con el plan marcado y el resumen refleja el nuevo plan', async ({ page }) => {
    await goToStep3(page, { city: 'otra' }, 'Plus');
    await page.getByRole('link', { name: 'Cambiar plan' }).click();
    await expect(page).toHaveURL(/step-2$/);
    await expect(planRadio(page, 'Plus')).toBeChecked();
    await choosePlan(page, 'Premium');
    await continueButton(page).click();
    await expect(page).toHaveURL(/step-3$/);
    await expect(page.locator('.plan-name')).toHaveText('Premium');
    expect(digits(await page.locator('.price-line .price').first().textContent())).toBe('2600000');
  });
});

test.describe('E2E-M resumen con datos simulados', () => {
  test('[R-03.6][AC-03.29] mismo precio con ajuste por ciudad: 1.180.000 en el Paso 2 y en el resumen', async ({ page }) => {
    const mock = defaultMock();
    countryMock(mock, 'co').plans = [mockPlan({ slug: 'unico', name: 'Único', basePrice: 1_000_000 })];
    await mockStrapi(page, mock);
    await goToStep2(page, { year: '2025', birth: '1990-01-01', city: 'bogota' });
    await expect(page.locator('.plan__price-value')).toContainText(/1\.180\.000/);
    await continueToStep3(page, 'Único');
    expect(digits(await page.locator('.price-line .price').first().textContent())).toBe('1180000');
  });

  test('[R-03.3][R-03.2] el resumen sale de la configuración vigente: un campo con key renombrada y orden distinto se refleja', async ({ page }) => {
    const mock = defaultMock();
    const co = countryMock(mock, 'co');
    co.fields = co.fields.map((f) => (f.semanticRole === 'vehicle_brand' ? { ...f, key: 'zzz_marca', label: 'Marca del auto' } : f));
    await mockStrapi(page, mock);
    await openStep1(page, 'co');
    await fillCo(page);
    await field(page, 'Marca del auto').selectOption('kia');
    await submit(page);
    await continueToStep3(page, 'Plus');
    await expect(dd(page, 'Marca del auto')).toHaveText('Kia');
  });
});
