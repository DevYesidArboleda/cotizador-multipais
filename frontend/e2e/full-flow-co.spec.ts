import { expect, test } from '@playwright/test';
import { FIXED_NOW } from './support/form-helpers';

/**
 * E2E obligatorio: flujo completo de Colombia con SOLO teclado (Tab, Shift+Tab, Space, Enter, flechas), contra el
 * Strapi sembrado: Paso 1 -> Paso 2 -> Paso 3 -> pago rechazado -> reintento -> confirmación con número de cotización.
 * Cubre CLAUDE.md regla 7 y SPEC-US-03 R-03.20 / AC-03.25 sin usar el ratón en ningún punto.
 */
test.describe('[R-03.20][AC-03.25] flujo completo de Colombia solo con teclado', () => {
  test('[R-03.20][AC-03.25][R-03.12][R-03.14] Paso 1 -> 2 -> 3 -> rechazo -> reintento -> confirmación con número', async ({ page }) => {
    await page.clock.setFixedTime(FIXED_NOW);
    await page.goto('/co/quote/step-1');
    await expect(page.getByRole('heading', { level: 1, name: 'Tus datos y los de tu vehículo' })).toBeVisible();

    // Paso 1 (la fecha nativa se teclea por sub-campos; 10/10/1990 no depende del orden dd/mm o mm/dd).
    await page.getByLabel(/^Nombre completo/).focus();
    await page.keyboard.type('Ana Teclado Demo');
    await page.keyboard.press('Tab');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Tab');
    await page.keyboard.type('1020304050');
    await page.keyboard.press('Tab');
    await page.keyboard.type('10101990');
    await expect(page.getByLabel(/^Fecha de nacimiento/)).toHaveValue('1990-10-10');
    // Tras la fecha, el icono del selector nativo también es una parada de Tab: se avanza hasta el correo.
    for (let i = 0; i < 3; i += 1) {
      await page.keyboard.press('Tab');
      if (await page.getByLabel(/^Correo electrónico/).evaluate((el) => el === document.activeElement)) break;
    }
    await expect(page.getByLabel(/^Correo electrónico/)).toBeFocused();
    await page.keyboard.type('ana.teclado@example.com');
    await expect(page.getByLabel(/^Correo electrónico/)).toHaveValue('ana.teclado@example.com');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await expect(page.getByLabel(/^Ciudad/)).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Space');
    await expect(page.getByLabel(/^Autorizo el tratamiento/)).toBeChecked();
    await page.keyboard.press('Tab');
    await page.keyboard.type('abc123');
    await page.keyboard.press('Tab');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.type('2020');
    await page.keyboard.press('Enter');

    // Paso 2: flechas para elegir, Tab hasta "Continuar al resumen", Enter.
    await expect(page).toHaveURL(/\/co\/quote\/step-2$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Elige tu plan' })).toBeFocused();
    await page.keyboard.press('Tab'); // Radio del primer plan (grupo de una sola parada)
    await expect(page.getByRole('radio').first()).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Space');
    await expect(page.getByRole('radio', { name: /^Plus/ })).toBeChecked();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: 'Volver' })).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: 'Continuar al resumen' })).toBeFocused();
    await page.keyboard.press('Enter');

    // Paso 3: términos, casilla, simulación "Rechazado" con flechas, Pagar.
    await expect(page).toHaveURL(/\/co\/quote\/step-3$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Revisa tu cotización' })).toBeFocused();
    await expect(page.getByText('******4050')).toBeVisible();
    for (let i = 0; i < 4; i += 1) await page.keyboard.press('Tab');
    await expect(page.getByRole('region', { name: /Términos y condiciones/ })).toBeFocused();
    await page.keyboard.press('Tab');
    await page.keyboard.press('Space');
    await expect(page.getByLabel('Acepto los términos y condiciones')).toBeChecked();
    await page.keyboard.press('Tab');
    await page.keyboard.press('ArrowDown');
    await expect(page.getByRole('radio', { name: 'Rechazado' })).toBeChecked();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: 'Pagar' })).toBeFocused();
    await page.keyboard.press('Enter');

    // Rechazo: alerta, datos conservados y el foco vuelve a "Pagar".
    await expect(page.getByRole('alert')).toContainText('Pago rechazado');
    await expect(page.getByRole('button', { name: 'Pagar' })).toBeFocused();
    await expect(page.getByLabel('Acepto los términos y condiciones')).toBeChecked();

    // Reintento: Shift+Tab al grupo de simulación, flecha a "Aprobado", Tab a Pagar y Enter.
    await page.keyboard.press('Shift+Tab');
    await expect(page.getByRole('radio', { name: 'Rechazado' })).toBeFocused();
    await page.keyboard.press('ArrowUp');
    await expect(page.getByRole('radio', { name: 'Aprobado' })).toBeChecked();
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');

    // Confirmación con número, foco en el h1 y sin documento ni correo.
    await expect(page).toHaveURL(/\/co\/quote\/confirmation$/);
    await expect(page.locator('.number')).toHaveText(/^COT-CO-20261123-[0-9A-F]{4}$/);
    await expect(page.getByRole('heading', { level: 1, name: /Cotización confirmada/ })).toBeFocused();
    await expect(page.getByRole('status').filter({ hasText: /fue confirmada/ })).toBeVisible();
    const html = await page.content();
    expect(html).not.toContain('1020304050');
    expect(html).not.toContain('ana.teclado@example.com');
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: 'Nueva cotización' })).toBeFocused();
  });
});
