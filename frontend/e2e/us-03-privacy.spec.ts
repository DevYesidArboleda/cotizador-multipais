import { expect, test } from '@playwright/test';
import { acceptTerms, continueToStep3, FIXED_NOW, fillCo, goToStep2, openStep1, payButton, QUOTE_NUMBER, simulationRadio, submit } from './support/form-helpers';
import { captureConsole } from './support/strapi-mock';

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(FIXED_NOW);
});

const DOC = '1020304050';

test.describe('[R-03.5][AC-03.6] documento enmascarado', () => {
  test('@strapi [R-03.5][AC-03.6] el resumen muestra ******4050 y el documento completo no está en el DOM, atributos ni título', async ({ page }) => {
    await goToStep2(page, { docNumber: DOC });
    await continueToStep3(page, 'Plus');
    await expect(page.getByText('******4050')).toBeVisible();
    const html = await page.content();
    expect(html).not.toContain(DOC);
    expect(await page.title()).not.toContain(DOC);
    const attrs = await page.evaluate(() =>
      [...document.querySelectorAll('*')].flatMap((el) => [...el.attributes].map((a) => a.value)).join('|'),
    );
    expect(attrs).not.toContain(DOC);
  });

  test('@strapi [R-03.5] la confirmación tampoco contiene el documento ni el correo', async ({ page }) => {
    await goToStep2(page, { docNumber: DOC, email: 'ana.perez@example.com' });
    await continueToStep3(page, 'Plus');
    await acceptTerms(page).check();
    await payButton(page).click();
    await expect(page.locator('.number')).toHaveText(QUOTE_NUMBER);
    const html = await page.content();
    expect(html).not.toContain(DOC);
    expect(html).not.toContain('ana.perez@example.com');
    await expect(page.getByText('******4050')).toHaveCount(0);
  });

  test('@strapi [R-03.5][AC-03.27] el correo solo aparece como texto visible del Paso 3, no en title, aria-label ni data-*', async ({ page }) => {
    await goToStep2(page, { email: 'ana.perez@example.com' });
    await continueToStep3(page, 'Plus');
    const leaked = await page.evaluate(() =>
      [...document.querySelectorAll('*')].some((el) =>
        ['title', 'aria-label', ...el.getAttributeNames().filter((n) => n.startsWith('data-'))].some((n) => (el.getAttribute(n) ?? '').includes('ana.perez@example.com')),
      ),
    );
    expect(leaked).toBe(false);
  });
});

test.describe('[R-03.23][AC-03.23] sin datos personales en consola', () => {
  test('@strapi [R-03.23][AC-03.23] el flujo completo (incluido un rechazo) no escribe documento, fecha de nacimiento, nombre ni correo en consola', async ({ page }) => {
    const sink = captureConsole(page);
    await openStep1(page, 'co');
    await fillCo(page, { docNumber: DOC, name: 'Ana Pérez Demo', birth: '1990-05-10', email: 'ana.perez@example.com' });
    await submit(page);
    await expect(page).toHaveURL(/step-2$/);
    await continueToStep3(page, 'Plus');
    await acceptTerms(page).check();
    await simulationRadio(page, 'Rechazado').check();
    await payButton(page).click();
    await expect(page.getByRole('alert')).toContainText('Pago rechazado');
    await simulationRadio(page, 'Aprobado').check();
    await payButton(page).click();
    await expect(page.locator('.number')).toHaveText(QUOTE_NUMBER);
    const joined = sink.all.join('\n');
    for (const secret of [DOC, 'Ana Pérez', '1990-05-10', 'ana.perez@example.com']) expect(joined).not.toContain(secret);
    expect(sink.errors).toEqual([]);
  });
});
