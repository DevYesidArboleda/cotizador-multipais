import { expect, test } from '@playwright/test';
import { mockPlan } from './support/mock-fixtures';
import { countryMock, defaultMock, mockStrapi } from './support/strapi-mock';
import { acceptTerms, continueButton, continueToStep3, FIXED_NOW, fillCl, goToStep2, goToStep3, openStep1, payButton, submit } from './support/form-helpers';

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(FIXED_NOW);
});

test.describe('E2E-S términos contra el Strapi sembrado', () => {
  test('@strapi [R-03.7][R-03.9][AC-03.2] los términos de Colombia coinciden con Strapi, el pago está deshabilitado hasta aceptar y Chile muestra otro texto', async ({ page }) => {
    await goToStep3(page);
    const region = page.getByRole('region', { name: 'Términos y condiciones - Colombia' });
    await expect(region).toContainText('cotización simulada de seguro de autos para Colombia');
    await expect(page.getByText('Versión 2026-11')).toBeVisible();
    await expect(payButton(page)).toBeDisabled();
    await expect(page.getByText('Acepta los términos para continuar')).toBeVisible();
    await acceptTerms(page).check();
    await expect(payButton(page)).toBeEnabled();
    await expect(page.getByText('Acepta los términos para continuar')).toHaveCount(0);

    await openStep1(page, 'cl');
    await fillCl(page);
    await submit(page);
    await expect(page).toHaveURL(/\/cl\/quote\/step-2$/);
    await continueToStep3(page, 'Plus', 'cl');
    const regionCl = page.getByRole('region', { name: 'Términos y condiciones - Chile' });
    await expect(regionCl).toContainText('cotización simulada de seguro automotriz para Chile');
    await expect(page.getByText('para Colombia')).toHaveCount(0);
  });

  test('@strapi [R-03.8][R-03.20] la región de términos es alcanzable con teclado (tabindex 0) y la casilla usa label for', async ({ page }) => {
    await goToStep3(page);
    await expect(page.getByRole('region', { name: /Términos y condiciones/ })).toHaveAttribute('tabindex', '0');
    await expect(page.locator('label[for="terms-accept"]')).toHaveText('Acepto los términos y condiciones');
  });

  test('@strapi [R-03.8][AC-03.10] tras recargar, el resumen es el mismo, los términos sin aceptar y el pago deshabilitado', async ({ page }) => {
    await goToStep3(page);
    await acceptTerms(page).check();
    await expect(payButton(page)).toBeEnabled();
    await page.reload();
    await expect(page.getByRole('heading', { level: 1, name: 'Revisa tu cotización' })).toBeVisible();
    await expect(page.locator('.rows__item', { has: page.getByText('Nombre completo', { exact: true }) }).locator('dd')).toHaveText('Ana Pérez Demo');
    await expect(acceptTerms(page)).not.toBeChecked();
    await expect(payButton(page)).toBeDisabled();
  });

  test('@strapi [R-03.19][AC-03.24] /cl/quote/step-3 sin haber completado Chile redirige a step-1 y nunca muestra términos de Colombia', async ({ page }) => {
    await goToStep3(page);
    await page.goto('/cl/quote/step-3');
    await expect(page).toHaveURL(/\/cl\/quote\/step-1$/);
    await expect(page.getByText('para Colombia')).toHaveCount(0);
    await expect(page.getByText('Términos y condiciones - Colombia')).toHaveCount(0);
  });
});

test.describe('E2E-M términos con datos simulados', () => {
  test('[R-03.7][AC-03.16] los términos son texto plano: "<b>Aviso</b>" literal y dos párrafos', async ({ page }) => {
    const mock = defaultMock();
    countryMock(mock, 'co').country.termsContent = '<b>Aviso</b>\n\nSegundo párrafo <i>literal</i>';
    await mockStrapi(page, mock);
    await goToStep3(page);
    const region = page.getByRole('region', { name: 'T&C' });
    await expect(region.locator('p')).toHaveCount(2);
    await expect(region.locator('p').first()).toHaveText('<b>Aviso</b>');
    await expect(region.locator('b, i')).toHaveCount(0);
  });

  test('[R-03.7][R-03.18][AC-03.15] términos vacíos: error de configuración y el pago no está disponible', async ({ page }) => {
    const mock = defaultMock();
    countryMock(mock, 'co').country.termsContent = '   \n\n  ';
    await mockStrapi(page, mock);
    await goToStep2(page);
    await page.getByRole('radio', { name: /^Plus/ }).check();
    await continueButton(page).click();
    await expect(page.getByRole('alert')).toContainText('Error de configuración');
    await expect(page.getByRole('alert')).toContainText('términos y condiciones');
    await expect(payButton(page)).toHaveCount(0);
  });

  test('[R-03.18][AC-03.17] si la API de países falla hay alerta con "Reintentar" y sin pago; al recuperarse el resumen aparece con los datos', async ({ page }) => {
    const mock = defaultMock();
    const co = countryMock(mock, 'co');
    await mockStrapi(page, mock);
    await goToStep2(page);
    await page.getByRole('radio', { name: /^Plus/ }).check();
    co.countryStatus = 500;
    await continueButton(page).click();
    await expect(page).toHaveURL(/step-3$/);
    await expect(page.getByRole('alert')).toContainText('No pudimos cargar la información');
    await expect(payButton(page)).toHaveCount(0);
    co.countryStatus = undefined;
    await page.getByRole('button', { name: 'Reintentar' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toBeFocused();
    await expect(payButton(page)).toBeVisible();
    await expect(page.locator('.rows__item', { has: page.getByText('Nombre completo', { exact: true }) }).locator('dd')).toHaveText('Ana Pérez Demo');
  });

  test('[F-03.4][R-03.18] recargar /step-3 con la API de países caída muestra Reintentar en el resumen y, al recuperarse, el resumen', async ({ page }) => {
    const mock = defaultMock();
    const co = countryMock(mock, 'co');
    await mockStrapi(page, mock);
    await goToStep2(page);
    await page.getByRole('radio', { name: /^Plus/ }).check();
    await continueButton(page).click();
    await expect(page).toHaveURL(/step-3$/);
    co.countryStatus = 500;
    await page.reload();
    await expect(page).toHaveURL(/\/co\/quote\/step-3$/);
    await expect(page.getByRole('alert')).toContainText('No pudimos cargar la información');
    await expect(payButton(page)).toHaveCount(0);
    co.countryStatus = undefined;
    await page.getByRole('button', { name: 'Reintentar' }).click();
    await expect(page).toHaveURL(/\/co\/quote\/step-3$/);
    await expect(payButton(page)).toBeVisible();
  });

  test('[F-03.5][R-03.14][AC-03.19] recargar /confirmation con la API de países caída conserva número y plan', async ({ page }) => {
    const mock = defaultMock();
    const co = countryMock(mock, 'co');
    await mockStrapi(page, mock);
    await goToStep3(page);
    await acceptTerms(page).check();
    await payButton(page).click();
    await expect(page.locator('.number')).toHaveText(/^COT-CO-/);
    const number = (await page.locator('.number').textContent()) ?? '';
    co.countryStatus = 500;
    await page.reload();
    await expect(page.locator('.number')).toHaveText(number);
    await expect(page.getByText('Plus', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Nueva cotización' })).toBeVisible();
  });

  test('[R-03.18] si falla la API de planes también hay error recuperable con el pago bloqueado', async ({ page }) => {
    const mock = defaultMock();
    const co = countryMock(mock, 'co');
    await mockStrapi(page, mock);
    await goToStep2(page);
    await page.getByRole('radio', { name: /^Plus/ }).check();
    await expect.poll(() => page.evaluate(() => sessionStorage.getItem('auto_quote_v1_co') ?? '')).toContain('selectedPlan');
    co.plansStatus = 500;
    await page.goto('/co/quote/step-3');
    await expect(page.getByRole('alert')).toContainText('No pudimos cargar la información');
    await expect(payButton(page)).toHaveCount(0);
  });

  test('[R-03.19] una respuesta tardía de otro país se descarta: al pasar a Chile nunca aparecen términos de Colombia', async ({ page }) => {
    const mock = defaultMock();
    const co = countryMock(mock, 'co');
    co.country.termsContent = 'Texto exclusivo de Colombia.';
    countryMock(mock, 'cl').country.termsContent = 'Texto exclusivo de Chile.';
    countryMock(mock, 'cl').plans = [mockPlan({ slug: 'p-cl', name: 'Plan CL', basePrice: 250_000, currency: 'CLP' })];
    await mockStrapi(page, mock);
    await goToStep2(page);
    await page.getByRole('radio', { name: /^Plus/ }).check();
    co.countryDelayMs = 2_000;
    await continueButton(page).click();
    await expect(page.getByText('Cargando')).toBeVisible();
    await page.getByRole('link', { name: 'Chile' }).first().click();
    await expect(page).toHaveURL(/\/cl\/quote\/step-1$/);
    await page.waitForTimeout(2_500);
    await expect(page.getByText('Texto exclusivo de Colombia.')).toHaveCount(0);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Tus datos y los de tu vehículo');
  });
});
