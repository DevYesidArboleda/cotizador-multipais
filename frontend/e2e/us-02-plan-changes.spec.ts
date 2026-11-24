import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { mockCoPlans } from './support/mock-fixtures';
import { countryMock, defaultMock, mockStrapi, setCityOptions } from './support/strapi-mock';
import { continueButton, FIXED_NOW, goToStep2, choosePlan, planRadio } from './support/form-helpers';

const digits = (text: string | null): string => (text ?? '').replace(/\D/g, '');

async function namesOf(page: Page): Promise<string[]> {
  await expect(page.locator('.plan__name').first()).toBeVisible();
  return page.locator('.plan__name').allTextContents();
}

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(FIXED_NOW);
});

test.describe('[R-02.12][AC-02.9] plan elegido despublicado', () => {
  test('[R-02.12][AC-02.9] al recargar sin el plan: ninguno marcado, aviso y continuar deshabilitado', async ({ page }) => {
    const mock = defaultMock();
    const co = countryMock(mock, 'co');
    await mockStrapi(page, mock);
    await goToStep2(page, { city: 'otra' });
    await choosePlan(page, 'Plus');
    co.plans = co.plans.filter((p) => p.slug !== 'plus');
    await page.reload();
    await expect(planRadio(page, 'Básico')).toBeVisible();
    await expect(page.getByRole('radio', { checked: true })).toHaveCount(0);
    await expect(page.getByRole('status').filter({ hasText: 'ya no está disponible' })).toBeVisible();
    await expect(continueButton(page)).toBeDisabled();
    const stored = await page.evaluate(() => sessionStorage.getItem('auto_quote_v1_co'));
    expect(stored).not.toContain('selectedPlan');
  });

  test('[R-02.12] el aviso desaparece al elegir otro plan', async ({ page }) => {
    const mock = defaultMock();
    const co = countryMock(mock, 'co');
    await mockStrapi(page, mock);
    await goToStep2(page);
    await choosePlan(page, 'Plus');
    co.plans = co.plans.filter((p) => p.slug !== 'plus');
    await page.reload();
    await choosePlan(page, 'Básico');
    await expect(page.getByText('ya no está disponible')).toHaveCount(0);
    await expect(continueButton(page)).toBeEnabled();
  });

  test('[R-02.12] al entrar al Paso 3 con el plan retirado se vuelve al Paso 2 con el aviso', async ({ page }) => {
    const mock = defaultMock();
    const co = countryMock(mock, 'co');
    await mockStrapi(page, mock);
    await goToStep2(page);
    await choosePlan(page, 'Plus');
    co.plans = co.plans.filter((p) => p.slug !== 'plus');
    await page.goto('/co/quote/step-3');
    await expect(page).toHaveURL(/\/co\/quote\/step-2$/);
    await expect(page.getByRole('status').filter({ hasText: 'ya no está disponible' })).toBeVisible();
  });
});

test.describe('[R-02.13][AC-02.10] cambio de precio del plan elegido', () => {
  test('[R-02.13][AC-02.10] nuevo precio, aviso role=status y selección conservada; al continuar se actualiza el precio visto', async ({ page }) => {
    const mock = defaultMock();
    const co = countryMock(mock, 'co');
    await mockStrapi(page, mock);
    await goToStep2(page, { city: 'otra' });
    await choosePlan(page, 'Plus');
    co.plans = co.plans.map((p) => (p.slug === 'plus' ? { ...p, basePrice: 1_960_000 } : p));
    await page.reload();
    await expect(planRadio(page, 'Plus')).toBeChecked();
    const notice = page.getByRole('status').filter({ hasText: 'El precio de tu plan cambió' });
    await expect(notice).toBeVisible();
    expect(digits(await notice.textContent())).toBe('1960000');
    await continueButton(page).click();
    await expect(page).toHaveURL(/\/co\/quote\/step-3$/);
    const stored = await page.evaluate(() => sessionStorage.getItem('auto_quote_v1_co'));
    expect(JSON.parse(stored ?? '{}').selectedPlan).toEqual({ planDocumentId: 'mock-plan-plus', priceSeenAtSelection: 1_960_000 });
  });
});

test.describe('[R-02.24][AC-02.19][AC-02.26] cambios de negocio sin despliegue', () => {
  test('[R-02.3][R-02.12][AC-02.19] reordenar y desactivar planes se refleja al recargar', async ({ page }) => {
    const mock = defaultMock();
    const co = countryMock(mock, 'co');
    await mockStrapi(page, mock);
    await goToStep2(page);
    const [basico, plus, premium] = mockCoPlans();
    if (!basico || !plus || !premium) throw new Error('fixtures');
    co.plans = [premium, plus];
    await page.reload();
    await expect(planRadio(page, 'Premium')).toBeVisible();
    expect(await namesOf(page)).toEqual(['Premium', 'Plus']);
    await expect(page.getByText('Básico', { exact: true })).toHaveCount(0);
  });

  test('[R-02.24][AC-02.26] cambiar el priceAdjustmentPct de una ciudad se refleja al recargar, sin mostrar porcentajes', async ({ page }) => {
    const mock = defaultMock();
    await mockStrapi(page, mock);
    await goToStep2(page, { city: 'bogota' });
    expect(digits(await page.locator('.plan', { has: page.getByText('Plus', { exact: true }) }).locator('.plan__price-value').textContent())).toBe('1998000');
    setCityOptions(mock, 'co', [{ label: 'Bogotá D.C.', value: 'bogota', priceAdjustmentPct: 20 }, { label: 'Otra ciudad', value: 'otra' }]);
    mock.requests.length = 0;
    await page.reload();
    expect(digits(await page.locator('.plan', { has: page.getByText('Plus', { exact: true }) }).locator('.plan__price-value').textContent())).toBe('2220000');
    expect(mock.requests.some((r) => r.url.startsWith('/api/form-fields'))).toBe(true);
    await expect(page.locator('body')).not.toContainText('%');
  });

  test('[R-02.24] agregar una ciudad nueva con su factor funciona sin cambios de código', async ({ page }) => {
    const mock = defaultMock();
    setCityOptions(mock, 'co', [{ label: 'Ciudad nueva', value: 'nueva', priceAdjustmentPct: 12 }, { label: 'Otra ciudad', value: 'otra' }]);
    await mockStrapi(page, mock);
    await goToStep2(page, { city: 'nueva' });
    expect(digits(await page.locator('.plan', { has: page.getByText('Plus', { exact: true }) }).locator('.plan__price-value').textContent())).toBe('2072000');
  });
});
