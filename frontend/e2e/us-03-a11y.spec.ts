import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { acceptTerms, FIXED_NOW, goToStep3, payButton, QUOTE_NUMBER, simulationRadio } from './support/form-helpers';

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(FIXED_NOW);
});

const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'];

test.describe('[R-03.20] accesibilidad del Paso 3', () => {
  test('@strapi [R-03.20] foco al h1 al entrar, regiones con nombre y cero violaciones axe en estado ready', async ({ page }) => {
    await goToStep3(page);
    await expect(page.getByRole('heading', { level: 1, name: 'Revisa tu cotización' })).toBeFocused();
    await expect(page.getByRole('complementary', { name: 'Pago' })).toBeVisible();
    const results = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
    expect(results.violations).toEqual([]);
  });

  test('@strapi [R-03.20] cero violaciones axe con el pago rechazado y role=alert visible', async ({ page }) => {
    await goToStep3(page);
    await acceptTerms(page).check();
    await simulationRadio(page, 'Rechazado').check();
    await payButton(page).click();
    await expect(page.getByRole('alert')).toBeVisible();
    const results = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
    expect(results.violations).toEqual([]);
  });

  test('@strapi [R-03.20] aria-busy="true" en el botón y en la caja de pago durante el procesamiento', async ({ page }) => {
    await goToStep3(page);
    await acceptTerms(page).check();
    await payButton(page).click();
    await expect(payButton(page)).toHaveAttribute('aria-busy', 'true');
    await expect(page.getByRole('complementary', { name: 'Pago' })).toHaveAttribute('aria-busy', 'true');
    await expect(page.getByRole('checkbox', { name: 'Acepto los términos y condiciones' })).toBeDisabled();
  });

  test('@strapi [F-03.2][R-03.20][AC-03.25] solo con teclado: región de términos (Tab), casilla (Space), Pagar (Enter) y confirmación con el foco en su h1', async ({ page }) => {
    await goToStep3(page);
    const region = page.getByRole('region', { name: /Términos y condiciones/ });
    await expect(page.getByRole('heading', { level: 1 })).toBeFocused(); // F-03.2: estado estable antes de tabular
    await expect(region).toBeVisible();
    for (let i = 0; i < 4; i += 1) await page.keyboard.press('Tab');
    await expect(region).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(acceptTerms(page)).toBeFocused();
    await page.keyboard.press('Space');
    await expect(acceptTerms(page)).toBeChecked();
    await expect(payButton(page)).toBeEnabled(); // F-03.2: esperar el re-render, no un Tab a ciegas
    await page.keyboard.press('Tab');
    await expect(simulationRadio(page, 'Aprobado')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(payButton(page)).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/confirmation$/);
    await expect(page.locator('.number')).toHaveText(QUOTE_NUMBER);
    await expect(page.getByRole('heading', { level: 1 })).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: 'Nueva cotización' })).toBeFocused();
  });

  test('@strapi [R-03.20] la confirmación pasa axe sin violaciones', async ({ page }) => {
    await goToStep3(page);
    await acceptTerms(page).check();
    await payButton(page).click();
    await expect(page.locator('.number')).toHaveText(QUOTE_NUMBER);
    const results = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
    expect(results.violations).toEqual([]);
  });
});

test.describe('[R-03.20] reflow y objetivos táctiles (guía §8, T5 y T8)', () => {
  test('@strapi [R-03.20] T5: a 320 px de ancho no hay scroll horizontal en el resumen', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 256 });
    await goToStep3(page);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(overflow).toBe(false);
    await expect(payButton(page)).toBeVisible();
  });

  test('@strapi [R-03.20] T5: a 320 px tampoco hay scroll horizontal en la confirmación', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 256 });
    await goToStep3(page);
    await acceptTerms(page).check();
    await payButton(page).click();
    await expect(page.locator('.number')).toHaveText(QUOTE_NUMBER);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(overflow).toBe(false);
  });

  test('@strapi [R-03.20] T8: en móvil los objetivos interactivos del resumen miden al menos 44 x 44 px', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await goToStep3(page);
    const targets = [
      page.getByRole('link', { name: /^Editar datos del tomador/ }),
      page.getByRole('link', { name: /^Editar datos del vehículo/ }),
      page.getByRole('link', { name: 'Cambiar plan' }),
      payButton(page),
      page.locator('.accept'),
      page.locator('.simulation__option').first(),
      page.locator('.simulation__option').last(),
    ];
    for (const target of targets) {
      const box = await target.boundingBox();
      expect(box, 'objetivo visible').not.toBeNull();
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
      expect(box?.width ?? 0).toBeGreaterThanOrEqual(44);
    }
  });
});
