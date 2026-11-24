import { expect, test } from '@playwright/test';

/** E2E-S de solo lectura: contrato público de `/api/countries` (F-PL.6, ADR-001 addendum `locale`). */
test.describe('[F-PL.6][R-01.1] contrato público de /api/countries', () => {
  for (const [code, locale] of [['co', 'es-CO'], ['cl', 'es-CL']] as const) {
    test(`@strapi [F-PL.6][R-02.5] ${code}: la respuesta pública expone locale ${locale} y no localeCode`, async ({ request }) => {
      const response = await request.get(`/api/countries?filters[code][$eq]=${code}`);
      expect(response.status()).toBe(200);
      const body = (await response.json()) as { data: Record<string, unknown>[] };
      expect(body.data).toHaveLength(1);
      expect(body.data[0]?.['locale']).toBe(locale);
      expect(body.data[0]).not.toHaveProperty('localeCode');
      expect(JSON.stringify(body)).not.toMatch(/token|authorization/i);
    });
  }
});

test.describe('[F-01.3][R-01.1] paso desconocido con país válido', () => {
  test('@strapi [F-01.3][R-01.1] /co/quote/step-9 y /co/foo redirigen a step-1, no a country-not-found', async ({ page }) => {
    await page.goto('/co/quote/step-9');
    await expect(page).toHaveURL(/\/co\/quote\/step-1$/);
    await page.goto('/cl/foo');
    await expect(page).toHaveURL(/\/cl\/quote\/step-1$/);
  });
});
