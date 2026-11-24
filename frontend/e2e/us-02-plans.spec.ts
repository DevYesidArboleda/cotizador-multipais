import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { mockCoPlans, mockPlan } from './support/mock-fixtures';
import { countryMock, defaultMock, mockStrapi, setCityOptions } from './support/strapi-mock';
import { continueButton, field, FIXED_NOW, fillCl, goToStep2, openStep1, choosePlan, planRadio, submit } from './support/form-helpers';

/** Texto de precio sin espacios especiales para comparar cifras. */
const digits = (text: string | null): string => (text ?? '').replace(/\D/g, '');
const namesOf = async (page: Page): Promise<string[]> => {
  await expect(page.locator('.plan__name').first()).toBeVisible();
  return page.locator('.plan__name').allTextContents();
};
const priceOf = (page: Page, name: string) => page.locator('.plan', { has: page.getByText(name, { exact: true }) }).locator('.plan__price-value');

test.describe('E2E-S contra el Strapi sembrado (solo lectura)', () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.setFixedTime(FIXED_NOW);
  });

  test('@strapi [R-02.1][R-02.3][AC-02.1] solo los planes activos de Colombia, en el orden de Strapi, sin el inactivo', async ({ page }) => {
    await goToStep2(page);
    const names = await namesOf(page);
    expect(names).toEqual(['Básico', 'Plus', 'Premium']);
    await expect(page.getByText('Legado')).toHaveCount(0);
  });

  test('@strapi [R-02.10][AC-02.2] solo el plan recomendado muestra "Recomendado" y un borde distintivo, sin preselección', async ({ page }) => {
    await goToStep2(page);
    await expect(page.getByText('Recomendado', { exact: true })).toHaveCount(1);
    await expect(page.locator('.plan--highlighted .plan__name')).toHaveText('Plus');
    await expect(page.locator('.plan--highlighted')).toHaveCSS('border-top-width', '3px');
    await expect(page.getByRole('radio', { checked: true })).toHaveCount(0);
    await expect(continueButton(page)).toBeDisabled();
  });

  test('@strapi [R-02.11][AC-02.3] la selección es única, se marca "Elegido" y habilita continuar', async ({ page }) => {
    await goToStep2(page);
    await choosePlan(page, 'Básico');
    await expect(planRadio(page, 'Básico')).toBeChecked();
    await expect(continueButton(page)).toBeEnabled();
    await choosePlan(page, 'Premium');
    await expect(planRadio(page, 'Premium')).toBeChecked();
    await expect(planRadio(page, 'Básico')).not.toBeChecked();
    await expect(page.getByRole('radio', { checked: true })).toHaveCount(1);
    await expect(page.getByText('Elegido', { exact: true })).toHaveCount(1);
    await continueButton(page).click();
    await expect(page).toHaveURL(/\/co\/quote\/step-3$/);
  });

  test('@strapi [R-02.1][AC-02.5] sin completar el Paso 1, el acceso directo redirige a step-1', async ({ page }) => {
    await page.goto('/co/quote/step-2');
    await expect(page).toHaveURL(/\/co\/quote\/step-1$/);
  });

  test('@strapi [R-02.5][AC-02.7][R-02.23][AC-02.23] precios en COP con formato es-CO, sin decimales (Bogotá +8)', async ({ page }) => {
    await goToStep2(page);
    expect(digits(await priceOf(page, 'Básico').textContent())).toBe('1296000');
    expect(digits(await priceOf(page, 'Plus').textContent())).toBe('1998000');
    expect(digits(await priceOf(page, 'Premium').textContent())).toBe('2808000');
    await expect(priceOf(page, 'Plus')).toHaveText(/^\$\s?1\.998\.000$/);
    await expect(priceOf(page, 'Plus')).toHaveCSS('font-variant-numeric', /tabular-nums/);
  });

  test('@strapi [R-02.23][AC-02.23] "Otra ciudad" no tiene ajuste: el precio final es el base y no hay error', async ({ page }) => {
    await goToStep2(page, { city: 'otra' });
    expect(digits(await priceOf(page, 'Plus').textContent())).toBe('1850000');
    await expect(page.getByRole('alert')).toHaveCount(0);
    await expect(page.getByText('Precio base')).toHaveCount(0);
  });

  test('@strapi [R-02.14][AC-02.20] cada plan muestra descripción, coberturas con límite y beneficios', async ({ page }) => {
    await goToStep2(page);
    const plus = page.locator('.plan', { has: page.getByText('Plus', { exact: true }) });
    await expect(plus).toContainText('El equilibrio entre cobertura y precio.');
    await expect(plus).toContainText('Pérdida parcial por daños');
    await expect(plus).toContainText('Límite: Hasta 200 SMMLV');
    await expect(plus).toContainText('Vehículo de reemplazo por 5 días');
    const items = await plus.locator('.plan__item-name').allTextContents();
    expect(items).toEqual(['Responsabilidad civil', 'Pérdida parcial por daños', 'Asistencia en carretera']);
  });

  test('@strapi [R-02.9][R-02.17][AC-02.8][AC-02.25] cambiar año y ciudad en el Paso 1 recalcula los precios y el plan sigue elegido', async ({ page }) => {
    await goToStep2(page, { year: '2025' });
    await choosePlan(page, 'Plus');
    expect(digits(await priceOf(page, 'Plus').textContent())).toBe('2183000');
    await page.getByRole('link', { name: 'Volver' }).click();
    await expect(page).toHaveURL(/\/co\/quote\/step-1$/);
    await expect(field(page, 'Año del vehículo')).toHaveValue('2025');
    await field(page, 'Año del vehículo').fill('2015');
    await field(page, 'Ciudad').selectOption('medellin');
    await submit(page);
    await expect(page).toHaveURL(/\/co\/quote\/step-2$/);
    // 2015: v=11 (+15) y Medellín (+5) => +20 sobre 1.850.000
    expect(digits(await priceOf(page, 'Plus').textContent())).toBe('2220000');
    await expect(planRadio(page, 'Plus')).toBeChecked();
    await expect(page.getByRole('status').filter({ hasText: 'cambió' })).toHaveCount(1);
  });

  test('@strapi [R-02.12][AC-02.14] al recargar los planes se piden de nuevo y el plan sigue marcado', async ({ page }) => {
    await goToStep2(page);
    await choosePlan(page, 'Premium');
    const request = page.waitForRequest((r) => r.url().includes('/api/insurance-plans'));
    await page.reload();
    await request;
    await expect(planRadio(page, 'Premium')).toBeChecked();
  });

  test('@strapi [R-02.5][AC-02.18] Chile se muestra en CLP con formato es-CL (Punta Arenas -5)', async ({ page }) => {
    await openStep1(page, 'cl');
    await fillCl(page, { city: 'punta-arenas' });
    await submit(page);
    await expect(page).toHaveURL(/\/cl\/quote\/step-2$/);
    await expect(priceOf(page, 'Básico')).toBeVisible();
    expect(digits(await priceOf(page, 'Básico').textContent())).toBe('237500');
    await expect(priceOf(page, 'Básico')).toHaveText(/^\$\s?237\.500$/);
  });
});

test.describe('E2E-M reloj fijado y datos simulados', () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.setFixedTime(FIXED_NOW);
  });

  const rows: [number, string, string, string, number][] = [
    [1_000_000, '2025', '2005-01-01', 'bogota', 1_300_000],
    [1_000_000, '2025', '1990-01-01', 'bogota', 1_180_000],
    [850_000, '2020', '1990-05-10', 'medellin', 892_500],
    [1_234_567, '2012', '2004-12-01', 'cali', 1_604_937],
    [1_010, '2020', '1990-01-01', 'medellin', 1_061],
    [100_000, '2015', '2001-11-24', 'mas30', 157_000],
    [100_000, '2020', '1990-01-01', 'menos10', 90_000],
  ];
  for (const [base, year, birth, city, expected] of rows) {
    test(`[R-02.6][AC-02.6][AC-02.22] base ${base}, año ${year}, nacido ${birth}, ciudad ${city} -> ${expected}`, async ({ page }) => {
      const mock = defaultMock();
      countryMock(mock, 'co').plans = [mockPlan({ slug: 'unico', name: 'Único', basePrice: base })];
      setCityOptions(mock, 'co', [
        { label: 'Bogotá D.C.', value: 'bogota', priceAdjustmentPct: 8 },
        { label: 'Medellín', value: 'medellin', priceAdjustmentPct: 5 },
        { label: 'Cali', value: 'cali', priceAdjustmentPct: 3 },
        { label: 'Ciudad máxima', value: 'mas30', priceAdjustmentPct: 30 },
        { label: 'Ciudad mínima', value: 'menos10', priceAdjustmentPct: -10 },
      ]);
      await mockStrapi(page, mock);
      await goToStep2(page, { year, birth, city });
      expect(digits(await priceOf(page, 'Único').textContent())).toBe(String(expected));
    });
  }

  test('[R-02.6][AC-02.6] sin ajuste de ciudad el precio sigue la tabla por tramos', async ({ page }) => {
    const mock = defaultMock();
    countryMock(mock, 'co').plans = [mockPlan({ slug: 'unico', name: 'Único', basePrice: 1_000_000 })];
    await mockStrapi(page, mock);
    await goToStep2(page, { year: '2025', birth: '2005-01-01', city: 'otra' });
    expect(digits(await priceOf(page, 'Único').textContent())).toBe('1220000');
  });

  test('[R-02.23][AC-02.23] sin campo con rol city, el precio es el base y no hay error', async ({ page }) => {
    const mock = defaultMock();
    const co = countryMock(mock, 'co');
    co.plans = [mockPlan({ slug: 'unico', name: 'Único', basePrice: 1_000_000 })];
    co.fields = co.fields.filter((f) => f.semanticRole !== 'city');
    await mockStrapi(page, mock);
    await openStep1(page, 'co');
    await fillCoWithoutCity(page);
    await submit(page);
    await expect(page).toHaveURL(/\/co\/quote\/step-2$/);
    expect(digits(await priceOf(page, 'Único').textContent())).toBe('1000000');
    await expect(page.getByRole('alert')).toHaveCount(0);
  });

  test('[R-02.23][AC-02.23] opciones sin atributo o con 0 no cambian el precio', async ({ page }) => {
    const mock = defaultMock();
    countryMock(mock, 'co').plans = [mockPlan({ slug: 'unico', name: 'Único', basePrice: 1_000_000 })];
    setCityOptions(mock, 'co', [{ label: 'Sin ajuste', value: 'sin' }, { label: 'Cero', value: 'cero', priceAdjustmentPct: 0 }]);
    await mockStrapi(page, mock);
    await goToStep2(page, { city: 'cero' });
    expect(digits(await priceOf(page, 'Único').textContent())).toBe('1000000');
    await page.getByRole('link', { name: 'Volver' }).click();
    await field(page, 'Ciudad').selectOption('sin');
    await submit(page);
    expect(digits(await priceOf(page, 'Único').textContent())).toBe('1000000');
  });

  test('[R-02.23][AC-02.23] una ciudad guardada que ya no existe se descarta (R-01.9) y, sin ajuste, el precio es el base', async ({ page }) => {
    const mock = defaultMock();
    countryMock(mock, 'co').plans = [mockPlan({ slug: 'unico', name: 'Único', basePrice: 1_000_000 })];
    await mockStrapi(page, mock);
    await goToStep2(page, { city: 'bogota' });
    expect(digits(await priceOf(page, 'Único').textContent())).toBe('1080000');
    setCityOptions(mock, 'co', [{ label: 'Otra ciudad', value: 'otra' }, { label: 'Sin ajuste', value: 'sin' }]);
    await page.reload();
    // La opción guardada ya no existe: el guard devuelve al Paso 1, donde el valor se descartó.
    await expect(page).toHaveURL(/\/co\/quote\/step-1$/);
    await expect(field(page, 'Ciudad')).toHaveValue('');
    await field(page, 'Ciudad').selectOption('sin');
    await submit(page);
    await expect(page).toHaveURL(/\/co\/quote\/step-2$/);
    expect(digits(await priceOf(page, 'Único').textContent())).toBe('1000000');
    await expect(page.getByRole('alert')).toHaveCount(0);
  });

  test('[R-02.3][R-02.10] el orden y el recomendado vienen de la respuesta de Strapi', async ({ page }) => {
    const mock = defaultMock();
    const [basico, plus, premium] = mockCoPlans();
    if (!basico || !plus || !premium) throw new Error('fixtures');
    countryMock(mock, 'co').plans = [premium, { ...plus, isRecommended: false }, { ...basico, isRecommended: true }];
    await mockStrapi(page, mock);
    await goToStep2(page);
    expect(await namesOf(page)).toEqual(['Premium', 'Plus', 'Básico']);
    await expect(page.locator('.plan--highlighted .plan__name')).toHaveText('Básico');
  });
});

async function fillCoWithoutCity(page: Page): Promise<void> {
  await field(page, 'Nombre completo').fill('Ana Pérez Demo');
  await field(page, 'Tipo de documento').selectOption('CC');
  await field(page, 'Número de documento').fill('12345678');
  await field(page, 'Fecha de nacimiento').fill('1990-05-10');
  await field(page, 'Correo electrónico').fill('ana.perez@example.com');
  await field(page, 'Placa').fill('ABC123');
  await field(page, 'Marca').selectOption('mazda');
  await field(page, 'Año del vehículo').fill('2020');
  await page.getByLabel(/^Autorizo el tratamiento/).check();
}

test.describe('[R-02.17] Volver conserva los datos', () => {
  test('@strapi [R-02.17] "Volver" navega al Paso 1 sin perder lo escrito', async ({ page }) => {
    await goToStep2(page);
    await page.getByRole('link', { name: 'Volver' }).click();
    await expect(page).toHaveURL(/\/co\/quote\/step-1$/);
    await expect(field(page, 'Nombre completo')).toHaveValue('Ana Pérez Demo');
  });
});
