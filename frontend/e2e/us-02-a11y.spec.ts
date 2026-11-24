import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { continueButton, FIXED_NOW, goToStep2, planRadio } from './support/form-helpers';

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(FIXED_NOW);
});

test.describe('[R-02.18][AC-02.13] accesibilidad del Paso 2', () => {
  test('[R-02.18] el grupo tiene fieldset/legend, el foco inicial va al h1 y no hay violaciones axe', async ({ page }) => {
    await goToStep2(page);
    await expect(page.getByRole('group', { name: 'Planes disponibles para Colombia' })).toBeVisible();
    await expect(page.locator('fieldset > legend')).toHaveText('Planes disponibles para Colombia');
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag22aa']).analyze();
    expect(results.violations).toEqual([]);
  });

  test('[R-02.18] cada radio se describe con su precio y la etiqueta "Recomendado"', async ({ page }) => {
    await goToStep2(page);
    const plus = planRadio(page, 'Plus');
    await expect(plus).toHaveAccessibleDescription(/Precio final.*\$.*Recomendado/s);
    await expect(planRadio(page, 'Básico')).not.toHaveAccessibleDescription(/Recomendado/);
  });

  test('[R-02.18] "Continuar" deshabilitado muestra texto de ayuda visible y asociado', async ({ page }) => {
    await goToStep2(page);
    await expect(page.getByText('Elige un plan para continuar')).toBeVisible();
    await expect(continueButton(page)).toBeDisabled();
    await expect(continueButton(page)).toHaveAccessibleDescription('Elige un plan para continuar');
  });

  test('[R-02.18][AC-02.13] solo con teclado: flechas, Space, anuncio aria-live y Tab hasta "Continuar al resumen"', async ({ page }) => {
    await goToStep2(page);
    await planRadio(page, 'Básico').focus();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Space');
    await expect(planRadio(page, 'Plus')).toBeChecked();
    await expect(planRadio(page, 'Plus')).toBeFocused();
    await expect(page.locator('[aria-live="polite"]')).toContainText('Plan elegido: Plus');
    // Orden del DOM = orden visual: primero "Volver", después "Continuar al resumen".
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: 'Volver' })).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(continueButton(page)).toBeFocused();
    await expect(continueButton(page)).toBeEnabled();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/co\/quote\/step-3$/);
  });

  test('[R-02.18] el recomendado no depende solo del color: texto visible y borde grueso', async ({ page }) => {
    await goToStep2(page);
    await expect(page.locator('.plan--highlighted')).toContainText('Recomendado');
    await expect(page.locator('.plan--highlighted')).toHaveCSS('border-top-width', '3px');
  });

  test('[R-02.18] sin desbordamiento horizontal en móvil (360 px)', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await goToStep2(page);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(overflow).toBe(false);
  });
});
