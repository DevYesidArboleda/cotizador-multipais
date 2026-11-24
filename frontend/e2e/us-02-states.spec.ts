import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { mockCoPlans, mockPlan } from './support/mock-fixtures';
import { countryMock, defaultMock, mockStrapi, setCityOptions } from './support/strapi-mock';
import { continueButton, field, FIXED_NOW, fillCl, fillCo, goToStep2, openStep1, choosePlan, planRadio, submit } from './support/form-helpers';

async function namesOf(page: Page): Promise<string[]> {
  await expect(page.locator('.plan__name').first()).toBeVisible();
  return page.locator('.plan__name').allTextContents();
}

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(FIXED_NOW);
});

test.describe('[R-02.15][AC-02.4] estado vacío', () => {
  test('[R-02.15][AC-02.4] sin planes activos: mensaje, "Volver al formulario" y sin botón de continuar', async ({ page }) => {
    const mock = defaultMock();
    countryMock(mock, 'co').plans = [];
    await mockStrapi(page, mock);
    await goToStep2(page);
    await expect(page.getByText('No hay planes disponibles por ahora')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Volver al formulario' })).toBeVisible();
    await expect(continueButton(page)).toHaveCount(0);
    await page.getByRole('link', { name: 'Volver al formulario' }).click();
    await expect(page).toHaveURL(/\/co\/quote\/step-1$/);
  });
});

test.describe('[R-02.2][R-02.15][AC-02.11] error de red recuperable', () => {
  test('[R-02.15][AC-02.11] con 500 hay alerta con "Reintentar"; al responder, los planes aparecen sin perder datos', async ({ page }) => {
    const mock = defaultMock();
    const co = countryMock(mock, 'co');
    await mockStrapi(page, mock);
    await openStep1(page, 'co');
    await fillCo(page);
    co.plansStatus = 500;
    await submit(page);
    await expect(page.getByRole('alert')).toContainText('No pudimos cargar la información');
    await expect(continueButton(page)).toHaveCount(0);
    co.plansStatus = undefined;
    await page.getByRole('button', { name: 'Reintentar' }).click();
    await expect(planRadio(page, 'Plus')).toBeVisible();
    await expect(page.getByRole('heading', { level: 1 })).toBeFocused();
    await page.getByRole('link', { name: 'Volver' }).click();
    await expect(field(page, 'Nombre completo')).toHaveValue('Ana Pérez Demo');
  });

  test('[R-02.2] meta.pagination.total > 100 es un error de configuración', async ({ page }) => {
    const mock = defaultMock();
    countryMock(mock, 'co').plansTotal = 101;
    await mockStrapi(page, mock);
    await goToStep2(page);
    await expect(page.getByRole('alert')).toContainText('Error de configuración');
    await expect(page.getByText('más de 100')).toBeVisible();
  });

  test('[R-02.2] las peticiones son rutas relativas /api/... sin token ni cabecera Authorization', async ({ page }) => {
    const mock = defaultMock();
    await mockStrapi(page, mock);
    await goToStep2(page);
    const plans = mock.requests.filter((r) => r.url.startsWith('/api/insurance-plans'));
    expect(plans.length).toBeGreaterThan(0);
    for (const r of plans) {
      expect(r.url).toContain('filters[country][code][$eq]=co');
      expect(r.url).toContain('populate[coverages]=true');
      expect(r.headers['authorization']).toBeUndefined();
    }
    expect(new Set(mock.requests.map((r) => r.origin)).size).toBe(1);
  });

  test('[R-02.15] mientras carga hay un indicador role=status y aria-busy', async ({ page }) => {
    const mock = defaultMock();
    countryMock(mock, 'co').plansDelayMs = 1_200;
    await mockStrapi(page, mock);
    await openStep1(page, 'co');
    await fillCo(page);
    await submit(page);
    await expect(page.getByRole('status').filter({ hasText: 'Cargando los planes' })).toBeVisible();
    await expect(page.locator('[aria-busy="true"]')).toBeVisible();
    await expect(planRadio(page, 'Plus')).toBeVisible();
  });
});

test.describe('[R-02.8][AC-02.12] dato requerido ausente', () => {
  test('[R-02.8][AC-02.12] sin el rol vehicle_year el Paso 2 redirige al Paso 1 con el error de configuración y sin NaN', async ({ page }) => {
    const mock = defaultMock();
    const co = countryMock(mock, 'co');
    await mockStrapi(page, mock);
    await goToStep2(page);
    co.fields = co.fields.filter((f) => f.semanticRole !== 'vehicle_year');
    await page.goto('/co/quote/step-2');
    await expect(page).toHaveURL(/\/co\/quote\/step-1$/);
    await expect(page.getByRole('alert')).toContainText('vehicle_year');
    await expect(page.locator('body')).not.toContainText('NaN');
  });
});

test.describe('[R-02.16][AC-02.15] aislamiento por país', () => {
  test('[R-02.16][AC-02.15] el plan de Colombia no se ve en Chile y sigue marcado al volver', async ({ page }) => {
    await mockStrapi(page);
    await goToStep2(page);
    await choosePlan(page, 'Plus');
    await page.goto('/cl/quote/step-2');
    await expect(page).toHaveURL(/\/cl\/quote\/step-1$/);
    await openStep1(page, 'cl');
    await fillCl(page, { city: 'otra' });
    await submit(page);
    await expect(page).toHaveURL(/\/cl\/quote\/step-2$/);
    await expect(page.getByRole('radio', { checked: true })).toHaveCount(0);
    await page.goto('/co/quote/step-2');
    await expect(planRadio(page, 'Plus')).toBeChecked();
    const keys = await page.evaluate(() => Object.keys(sessionStorage).sort());
    expect(keys).toEqual(['auto_quote_v1_cl', 'auto_quote_v1_co']);
  });
});

test.describe('[R-02.3][R-02.4][AC-02.16][AC-02.17] planes mal configurados', () => {
  test('[R-02.10][AC-02.16] con dos recomendados solo el primero muestra "Recomendado"', async ({ page }) => {
    const mock = defaultMock();
    countryMock(mock, 'co').plans = mockCoPlans().map((p) => ({ ...p, isRecommended: p.slug !== 'basico' }));
    await mockStrapi(page, mock);
    await goToStep2(page);
    await expect(page.getByText('Recomendado', { exact: true })).toHaveCount(1);
    await expect(page.locator('.plan--highlighted .plan__name')).toHaveText('Plus');
  });

  test('[R-02.4][AC-02.17] un plan con basePrice negativo no aparece y los demás sí', async ({ page }) => {
    const mock = defaultMock();
    countryMock(mock, 'co').plans = [...mockCoPlans(), mockPlan({ slug: 'malo', name: 'Malo', basePrice: -5 })];
    await mockStrapi(page, mock);
    await goToStep2(page);
    expect(await namesOf(page)).toEqual(['Básico', 'Plus', 'Premium']);
  });

  test('[R-02.3] el cliente descarta un plan con isActive distinto de true aunque llegue en la respuesta', async ({ page }) => {
    const mock = defaultMock();
    countryMock(mock, 'co').plans = [...mockCoPlans(), mockPlan({ slug: 'off', name: 'Apagado', basePrice: 10, isActive: false })];
    await mockStrapi(page, mock);
    await goToStep2(page);
    await expect(page.getByText('Apagado')).toHaveCount(0);
  });

  test('[R-02.4][AC-02.17] si ninguno es válido se muestra el estado vacío', async ({ page }) => {
    const mock = defaultMock();
    countryMock(mock, 'co').plans = [mockPlan({ slug: 'malo', name: 'Malo', basePrice: -5 })];
    await mockStrapi(page, mock);
    await goToStep2(page);
    await expect(page.getByText('No hay planes disponibles por ahora')).toBeVisible();
  });
});

test.describe('[R-02.19][AC-02.21] moneda del plan', () => {
  for (const currency of ['COP', 'USD', undefined] as const) {
    test(`[R-02.19][AC-02.21] un plan de Chile con currency ${currency ?? '(ausente)'} es config-error sin precios`, async ({ page }) => {
      const mock = defaultMock();
      const cl = countryMock(mock, 'cl');
      cl.plans = [mockPlan({ slug: 'bueno', name: 'Bueno', basePrice: 250_000, currency: 'CLP' }), mockPlan({ slug: 'raro', name: 'Raro', basePrice: 380_000, currency })];
      await mockStrapi(page, mock);
      await openStep1(page, 'cl');
      await fillCl(page, { city: 'otra' });
      await submit(page);
      const alert = page.getByRole('alert');
      await expect(alert).toContainText('Raro');
      await expect(alert).toContainText('CLP');
      await expect(page.locator('.plan__price-value')).toHaveCount(0);
      await expect(continueButton(page)).toHaveCount(0);
    });
  }
});

test.describe('[R-02.22][AC-02.24] ajuste de ciudad inválido', () => {
  for (const pct of [31, -11, 2.5, 'abc']) {
    test(`[R-02.22][AC-02.24] priceAdjustmentPct ${JSON.stringify(pct)} es config-error que nombra campo y opción`, async ({ page }) => {
      const mock = defaultMock();
      setCityOptions(mock, 'co', [{ label: 'Ciudad rara', value: 'rara', priceAdjustmentPct: pct as number }, { label: 'Otra ciudad', value: 'otra' }]);
      await mockStrapi(page, mock);
      await goToStep2(page, { city: 'rara' });
      const alert = page.getByRole('alert');
      await expect(alert).toContainText('Ciudad rara');
      await expect(alert).toContainText('Ciudad');
      await expect(page.locator('.plan__price-value')).toHaveCount(0);
      await expect(continueButton(page)).toHaveCount(0);
    });
  }

  test('[R-02.22] solo se valida la opción elegida: otra opción inválida no afecta', async ({ page }) => {
    const mock = defaultMock();
    setCityOptions(mock, 'co', [{ label: 'Ciudad rara', value: 'rara', priceAdjustmentPct: 99 }, { label: 'Otra ciudad', value: 'otra' }]);
    await mockStrapi(page, mock);
    await goToStep2(page, { city: 'otra' });
    await expect(planRadio(page, 'Plus')).toBeVisible();
    await expect(page.getByRole('alert')).toHaveCount(0);
  });
});
