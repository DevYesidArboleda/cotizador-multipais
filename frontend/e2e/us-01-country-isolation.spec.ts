import { expect, test } from '@playwright/test';
import { defaultMock, mockStrapi } from './support/strapi-mock';
import { field, fillCo, openStep1 } from './support/form-helpers';

test.describe('[R-01.20][AC-01.16] aislamiento por país (Strapi sembrado)', () => {
  test('@strapi [AC-01.16][R-01.20] los datos de Colombia no aparecen en Chile y reaparecen al volver', async ({ page }) => {
    await openStep1(page, 'co');
    await fillCo(page);
    await page.waitForTimeout(150);
    await page.getByRole('navigation', { name: 'País' }).getByRole('link', { name: 'Chile' }).click();
    await expect(page).toHaveURL('/cl/quote/step-1');
    await expect(page.getByRole('heading', { level: 1 })).toBeFocused();
    await expect(field(page, 'Nombre completo')).toHaveValue('');
    await expect(field(page, 'RUT')).toHaveValue('');
    const storageCl = await page.evaluate(() => sessionStorage.getItem('auto_quote_v1_cl'));
    expect(storageCl ?? '').not.toContain('Ana Pérez Demo');
    await page.getByRole('navigation', { name: 'País' }).getByRole('link', { name: 'Colombia' }).click();
    await expect(page).toHaveURL('/co/quote/step-1');
    await expect(field(page, 'Nombre completo')).toHaveValue('Ana Pérez Demo');
    await expect(field(page, 'Número de documento')).toHaveValue('12345678');
  });

  test('@strapi [R-01.20] abrir /cl nunca lee ni escribe la clave auto_quote_v1_co', async ({ page }) => {
    await openStep1(page, 'co');
    await fillCo(page);
    await page.waitForTimeout(150);
    await page.addInitScript(() => {
      const w = window as unknown as { __claves: string[] };
      w.__claves = [];
      for (const metodo of ['getItem', 'setItem', 'removeItem'] as const) {
        const original = Storage.prototype[metodo] as (this: Storage, ...args: string[]) => unknown;
        Storage.prototype[metodo] = function (this: Storage, ...args: string[]) {
          w.__claves.push(String(args[0]));
          return original.apply(this, args);
        } as never;
      }
    });
    await page.goto('/cl/quote/step-1');
    await expect(page.getByRole('button', { name: 'Continuar' })).toBeVisible();
    await field(page, 'Nombre completo').fill('Persona Chile');
    await page.waitForTimeout(200);
    const claves = await page.evaluate(() => (window as unknown as { __claves: string[] }).__claves);
    expect(claves.length).toBeGreaterThan(0);
    expect(claves.every((c) => c === 'auto_quote_v1_cl')).toBe(true);
    expect(await page.evaluate(() => sessionStorage.getItem('auto_quote_v1_co'))).toContain('Ana Pérez Demo');
  });
});

test.describe('[R-01.20][AC-01.17] respuesta tardía de otro país (E2E-M)', () => {
  test('[AC-01.17][R-01.20] la respuesta de campos de Colombia que llega tarde nunca se pinta en la pantalla de Chile', async ({ page }) => {
    const mock = defaultMock();
    const co = mock.countries.get('co');
    if (!co) throw new Error('mock sin co');
    co.fieldsDelayMs = 3_000;
    await mockStrapi(page, mock);
    await page.goto('/co/quote/step-1');
    await expect(page.getByRole('status')).toContainText('Cargando el formulario');
    await page.getByRole('navigation', { name: 'País' }).getByRole('link', { name: 'Chile' }).click();
    await expect(page).toHaveURL('/cl/quote/step-1');
    await expect(field(page, 'RUT')).toBeVisible();
    await page.waitForTimeout(3_500);
    await expect(page.getByLabel(/^Tipo de documento/)).toHaveCount(0);
    await expect(field(page, 'RUT')).toBeVisible();
    expect(page.url()).toContain('/cl/quote/step-1');
  });
});
