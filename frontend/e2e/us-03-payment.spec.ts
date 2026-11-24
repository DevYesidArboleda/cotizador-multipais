import { expect, test } from '@playwright/test';
import { acceptTerms, countQuoteNumbers, FIXED_NOW, goToStep3, openStep1, payButton, QUOTE_NUMBER, quoteDraws, simulationRadio, fillCl, submit } from './support/form-helpers';
import { defaultMock, mockStrapi } from './support/strapi-mock';

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(FIXED_NOW);
});

const confirmationNumber = (page: import('@playwright/test').Page) => page.locator('.number');

test.describe('[R-03.14][AC-03.3] pago aprobado', () => {
  test('@strapi [R-03.11][AC-03.3] al pagar el botón queda bloqueado con aria-busy y luego aparece la confirmación con el número', async ({ page }) => {
    await goToStep3(page);
    await acceptTerms(page).check();
    await payButton(page).click();
    await expect(payButton(page)).toBeDisabled();
    await expect(payButton(page)).toHaveAttribute('aria-busy', 'true');
    await expect(page).toHaveURL(/\/co\/quote\/confirmation$/);
    await expect(confirmationNumber(page)).toHaveText(QUOTE_NUMBER);
    await expect(page.getByRole('status').filter({ hasText: /fue confirmada/ })).toBeVisible();
    await expect(page.getByRole('heading', { level: 1 })).toBeFocused();
    await expect(page.getByRole('button', { name: /Pagar/ })).toHaveCount(0);
  });

  test('@strapi [R-03.14][AC-03.21] el número cumple COT-CO-20261123-XXXX con el reloj local fijado', async ({ page }) => {
    await goToStep3(page);
    await acceptTerms(page).check();
    await payButton(page).click();
    await expect(confirmationNumber(page)).toHaveText(/^COT-CO-20261123-[0-9A-F]{4}$/);
  });
});

test.describe('[R-03.12][AC-03.4][R-03.21] pago rechazado y reintento', () => {
  test('@strapi [R-03.12][AC-03.4] el rechazo muestra role=alert, conserva datos y aceptación, devuelve el foco a "Pagar" y un reintento aprobado confirma', async ({ page }) => {
    await goToStep3(page);
    await acceptTerms(page).check();
    await simulationRadio(page, 'Rechazado').check();
    await payButton(page).click();
    const alert = page.getByRole('alert');
    await expect(alert).toContainText('Pago rechazado');
    await expect(acceptTerms(page)).toBeChecked();
    await expect(simulationRadio(page, 'Rechazado')).toBeChecked();
    await expect(payButton(page)).toBeEnabled();
    await expect(payButton(page)).toBeFocused();
    await expect(page.locator('.rows__item', { has: page.getByText('Nombre completo', { exact: true }) }).locator('dd')).toHaveText('Ana Pérez Demo');
    await simulationRadio(page, 'Aprobado').check();
    await payButton(page).click();
    await expect(page).toHaveURL(/\/confirmation$/);
    await expect(confirmationNumber(page)).toHaveText(QUOTE_NUMBER);
  });

  test('@strapi [R-03.21][AC-03.26] el selector está etiquetado "Simulación de pago (solo pruebas)", con "Aprobado" por defecto y vuelve a "Aprobado" al recargar', async ({ page }) => {
    await goToStep3(page);
    await expect(page.getByRole('group', { name: 'Simulación de pago (solo pruebas)' })).toBeVisible();
    await expect(simulationRadio(page, 'Aprobado')).toBeChecked();
    await simulationRadio(page, 'Rechazado').check();
    await page.reload();
    await expect(simulationRadio(page, 'Aprobado')).toBeChecked();
    const stored = await page.evaluate(() => sessionStorage.getItem('auto_quote_v1_co') ?? '');
    expect(stored).not.toContain('rejected');
  });
});

test.describe('[R-03.11] doble envío', () => {
  test('@strapi [R-03.11][AC-03.8] doble clic rápido: un solo pago y un único número de cotización', async ({ page }) => {
    await countQuoteNumbers(page);
    await goToStep3(page);
    await acceptTerms(page).check();
    await payButton(page).dblclick();
    await expect(payButton(page)).toHaveAttribute('aria-busy', 'true');
    await expect(page).toHaveURL(/\/confirmation$/);
    expect(await quoteDraws(page)).toBe(1);
  });

  test('@strapi [R-03.11] dos clics síncronos (antes de que el DOM se deshabilite) ejecutan un solo pago', async ({ page }) => {
    await countQuoteNumbers(page);
    await goToStep3(page);
    await acceptTerms(page).check();
    await payButton(page).evaluate((button: HTMLElement) => {
      button.click();
      button.click();
    });
    await expect(page).toHaveURL(/\/confirmation$/);
    expect(await quoteDraws(page)).toBe(1);
  });

  test('@strapi [R-03.11][AC-03.9] Enter más clic inmediato ejecutan un solo pago', async ({ page }) => {
    await countQuoteNumbers(page);
    await goToStep3(page);
    await acceptTerms(page).check();
    await payButton(page).focus();
    await page.keyboard.press('Enter');
    await payButton(page).evaluate((button: HTMLElement) => button.click());
    await expect(page).toHaveURL(/\/confirmation$/);
    expect(await quoteDraws(page)).toBe(1);
  });
});

test.describe('[R-03.14][AC-03.18][AC-03.19][AC-03.20] confirmación y nueva cotización', () => {
  async function pay(page: import('@playwright/test').Page): Promise<string> {
    await goToStep3(page);
    await acceptTerms(page).check();
    await payButton(page).click();
    await expect(confirmationNumber(page)).toHaveText(QUOTE_NUMBER);
    return (await confirmationNumber(page).textContent()) ?? '';
  }

  test('@strapi [R-03.14][AC-03.18] "Atrás" o abrir /step-3 tras confirmar redirige a /confirmation y no hay botón de pagar', async ({ page }) => {
    await pay(page);
    await page.goBack();
    await expect(page).toHaveURL(/\/co\/quote\/confirmation$/);
    await page.goto('/co/quote/step-3');
    await expect(page).toHaveURL(/\/co\/quote\/confirmation$/);
    await expect(page.getByRole('button', { name: /Pagar/ })).toHaveCount(0);
    for (const step of ['step-1', 'step-2']) {
      await page.goto(`/co/quote/${step}`);
      await expect(page).toHaveURL(/\/co\/quote\/confirmation$/);
    }
  });

  test('@strapi [R-03.14][AC-03.19] al recargar la confirmación se ven el mismo número, plan y precio, sin documento ni correo', async ({ page }) => {
    const number = await pay(page);
    await page.reload();
    await expect(confirmationNumber(page)).toHaveText(number);
    await expect(page.getByText('Plus', { exact: true })).toBeVisible();
    await expect(page.locator('.price')).toContainText(/1\.998\.000/);
    const text = await page.locator('main').innerText();
    expect(text).not.toContain('12345678');
    expect(text).not.toContain('ana.perez@example.com');
  });

  test('@strapi [R-03.15][AC-03.20] "Nueva cotización" borra solo la clave del país actual y deja los datos de Chile intactos', async ({ page }) => {
    await openStep1(page, 'cl');
    await fillCl(page);
    await submit(page);
    await expect(page).toHaveURL(/\/cl\/quote\/step-2$/);
    await pay(page);
    await page.getByRole('button', { name: 'Nueva cotización' }).click();
    await expect(page).toHaveURL(/\/co\/quote\/step-1$/);
    await expect(page.getByLabel(/^Nombre completo/)).toHaveValue('');
    const keys = await page.evaluate(() => Object.keys(sessionStorage).sort());
    expect(keys).toEqual(['auto_quote_v1_cl']);
    await page.goto('/cl/quote/step-1');
    await expect(page.getByLabel(/^Nombre completo/)).toHaveValue('Ana Pérez Demo');
  });
});

test.describe('[R-03.15] E2E-M nueva cotización con datos simulados', () => {
  test('[R-03.15] tras "Nueva cotización" se puede cotizar de nuevo y pagar otra vez', async ({ page }) => {
    await mockStrapi(page, defaultMock());
    await goToStep3(page);
    await acceptTerms(page).check();
    await payButton(page).click();
    await expect(confirmationNumber(page)).toHaveText(QUOTE_NUMBER);
    await page.getByRole('button', { name: 'Nueva cotización' }).click();
    await expect(page).toHaveURL(/step-1$/);
    await expect(page.getByLabel(/^Nombre completo/)).toHaveValue('');
    await goToStep3(page);
    await acceptTerms(page).check();
    await payButton(page).click();
    await expect(confirmationNumber(page)).toHaveText(QUOTE_NUMBER);
  });
});

test.describe('[F-03.1][R-03.19] aislamiento del estado de pago por país', () => {
  test('@strapi [F-03.1][R-03.19][R-03.12] pagar CO, cambiar a CL por el header sin recargar y pagar con Rechazado muestra rechazo y ningún número de CO', async ({ page }) => {
    // 1) Pago aprobado en Colombia.
    await goToStep3(page);
    await acceptTerms(page).check();
    await payButton(page).click();
    await expect(confirmationNumber(page)).toHaveText(QUOTE_NUMBER);
    const coNumber = (await confirmationNumber(page).textContent()) ?? '';
    expect(coNumber).toContain('COT-CO-');

    // 2) Cambio de país por el selector del header (navegación SPA, SIN recarga).
    await page.evaluate(() => { (window as unknown as { __spa: boolean }).__spa = true; });
    await page.getByRole('link', { name: 'Chile' }).first().click();
    await expect(page).toHaveURL(/\/cl\/quote\/step-1$/);
    await fillCl(page);
    await submit(page);
    await expect(page).toHaveURL(/\/cl\/quote\/step-2$/);
    await page.getByRole('radio', { name: /^Plus/ }).check();
    await page.getByRole('button', { name: 'Continuar al resumen' }).click();
    await expect(page).toHaveURL(/\/cl\/quote\/step-3$/);

    // 3) Rechazado en Chile: se ejecuta una simulación nueva, hay alerta y no se persiste ninguna confirmación.
    await acceptTerms(page).check();
    await simulationRadio(page, 'Rechazado').check();
    await payButton(page).click();
    await expect(page.getByRole('alert')).toContainText('Pago rechazado');
    await expect(page).toHaveURL(/\/cl\/quote\/step-3$/);
    await expect(page.locator('body')).not.toContainText(coNumber);
    const cl = await page.evaluate(() => sessionStorage.getItem('auto_quote_v1_cl') ?? '');
    expect(cl).not.toContain('confirmation');
    expect(cl).not.toContain(coNumber);
    expect(await page.evaluate(() => (window as unknown as { __spa?: boolean }).__spa)).toBe(true);

    // 4) Aprobado en Chile: número con prefijo COT-CL, distinto al de Colombia.
    await simulationRadio(page, 'Aprobado').check();
    await payButton(page).click();
    await expect(confirmationNumber(page)).toHaveText(/^COT-CL-\d{8}-[0-9A-F]{4}$/);
  });
});
