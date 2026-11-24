import { expect, test } from '@playwright/test';
import { mockClPlans, mockCoPlans } from './support/mock-fixtures';
import { countryMock, defaultMock, mockStrapi } from './support/strapi-mock';
import { acceptTerms, choosePlan, continueButton, FIXED_NOW, fillCl, goToStep2, goToStep3, openStep1, payButton, submit } from './support/form-helpers';

const digits = (text: string | null): string => (text ?? '').replace(/\D/g, '');

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(FIXED_NOW);
});

test.describe('[R-03.1][AC-03.11] plan despublicado antes del resumen', () => {
  test('[R-03.1][AC-03.11] al recargar el resumen sin el plan se vuelve a /step-2 con el aviso de plan no disponible', async ({ page }) => {
    const mock = defaultMock();
    const co = countryMock(mock, 'co');
    await mockStrapi(page, mock);
    await goToStep3(page, { city: 'otra' });
    co.plans = co.plans.filter((p) => p.slug !== 'plus');
    await page.reload();
    await expect(page).toHaveURL(/\/co\/quote\/step-2$/);
    await expect(page.getByRole('status').filter({ hasText: 'ya no está disponible' })).toBeVisible();
    await expect(continueButton(page)).toBeDisabled();
  });
});

test.describe('[R-03.17][AC-03.12] cambio de precio entre pasos', () => {
  test('[R-03.17][AC-03.12] el resumen muestra el nuevo precio, un aviso role=status y permite pagar', async ({ page }) => {
    const mock = defaultMock();
    const co = countryMock(mock, 'co');
    await mockStrapi(page, mock);
    await goToStep2(page, { city: 'otra' });
    await choosePlan(page, 'Plus');
    co.plans = co.plans.map((p) => (p.slug === 'plus' ? { ...p, basePrice: 2_035_000 } : p));
    await continueButton(page).click();
    await expect(page).toHaveURL(/step-3$/);
    const notice = page.getByRole('status').filter({ hasText: 'El precio de tu plan cambió' });
    await expect(notice).toBeVisible();
    expect(digits(await notice.textContent())).toBe('2035000');
    expect(digits(await page.locator('.price-line .price').first().textContent())).toBe('2035000');
    await acceptTerms(page).check();
    await expect(payButton(page)).toBeEnabled();
  });
});

test.describe('[R-03.25][AC-03.28] moneda o ajuste de ciudad inválidos en el resumen', () => {
  test('[R-03.25][AC-03.28] plan de Chile con currency "COP": error de configuración que nombra plan y monedas, sin precio ni pago', async ({ page }) => {
    const mock = defaultMock();
    const cl = countryMock(mock, 'cl');
    await mockStrapi(page, mock);
    await openStep1(page, 'cl');
    await fillCl(page, { city: 'otra' });
    await submit(page);
    await expect(page).toHaveURL(/\/cl\/quote\/step-2$/);
    await choosePlan(page, 'Plus', 'cl');
    cl.plans = mockClPlans().map((p) => ({ ...p, currency: 'COP' }));
    await continueButton(page).click();
    await expect(page).toHaveURL(/\/cl\/quote\/step-3$/);
    const alert = page.getByRole('alert');
    await expect(alert).toContainText('Error de configuración');
    await expect(alert).toContainText('COP');
    await expect(alert).toContainText('CLP');
    await expect(page.locator('.price')).toHaveCount(0);
    await expect(payButton(page)).toHaveCount(0);
  });

  test('[R-03.25][AC-03.28] priceAdjustmentPct 31 en la ciudad elegida: error que nombra campo y opción, sin precio ni pago', async ({ page }) => {
    const mock = defaultMock();
    const co = countryMock(mock, 'co');
    await mockStrapi(page, mock);
    await goToStep2(page, { city: 'bogota' });
    await choosePlan(page, 'Plus');
    const city = co.fields.find((f) => f.semanticRole === 'city');
    if (!city) throw new Error('sin ciudad');
    city.options = [{ label: 'Bogotá D.C.', value: 'bogota', priceAdjustmentPct: 31 }, { label: 'Otra ciudad', value: 'otra' }];
    co.plans = mockCoPlans();
    await continueButton(page).click();
    await expect(page).toHaveURL(/step-3$/);
    const alert = page.getByRole('alert');
    await expect(alert).toContainText('Bogotá D.C.');
    await expect(alert).toContainText('Ciudad');
    await expect(page.locator('.price')).toHaveCount(0);
    await expect(payButton(page)).toHaveCount(0);
  });
});
