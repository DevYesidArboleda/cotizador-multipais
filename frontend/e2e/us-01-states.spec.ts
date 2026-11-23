import { expect, test } from '@playwright/test';
import { captureConsole, defaultMock, mockStrapi } from './support/strapi-mock';
import { field, openStep1 } from './support/form-helpers';

test.describe('[R-01.22][AC-01.22] error de red recuperable', () => {
  test('[AC-01.22][R-01.22] con 500 se ve una alerta con "Reintentar"; al volver Strapi el formulario aparece sin recargar y los datos siguen', async ({ page }) => {
    const mock = defaultMock();
    const co = mock.countries.get('co');
    if (!co) throw new Error('mock sin co');
    await mockStrapi(page, mock);
    await openStep1(page, 'co');
    await field(page, 'Nombre completo').fill('Ana Guardada');
    await page.waitForTimeout(150);

    co.fieldsStatus = 500;
    await page.reload();
    const alerta = page.getByRole('alert');
    await expect(alerta).toContainText('No pudimos cargar la información');
    await expect(page.getByRole('button', { name: 'Continuar' })).toHaveCount(0);
    await page.evaluate(() => { (window as unknown as { __sinRecarga: boolean }).__sinRecarga = true; });

    co.fieldsStatus = undefined;
    await page.getByRole('button', { name: 'Reintentar' }).click();
    await expect(page.getByRole('button', { name: 'Continuar' })).toBeVisible();
    await expect(field(page, 'Nombre completo')).toHaveValue('Ana Guardada');
    expect(await page.evaluate(() => (window as unknown as { __sinRecarga?: boolean }).__sinRecarga)).toBe(true);
    await expect(page.getByRole('heading', { level: 1 })).toBeFocused();
  });
});

test.describe('[R-01.22] loading y empty', () => {
  test('[R-01.22] mientras llega la respuesta hay un indicador role=status y aria-busy, sin formulario', async ({ page }) => {
    const mock = defaultMock();
    const co = mock.countries.get('co');
    if (!co) throw new Error('mock sin co');
    co.fieldsDelayMs = 1_500;
    await mockStrapi(page, mock);
    await page.goto('/co/quote/step-1');
    await expect(page.getByRole('status')).toHaveText('Cargando el formulario…');
    await expect(page.locator('[aria-busy="true"]')).toBeVisible();
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.locator('form')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Continuar' })).toBeVisible();
  });

  test('[AC-01.23][R-01.22] sin campos publicados se ve el estado vacío y no hay botón para continuar', async ({ page }) => {
    const mock = defaultMock();
    const co = mock.countries.get('co');
    if (!co) throw new Error('mock sin co');
    co.fields = [];
    await mockStrapi(page, mock);
    await page.goto('/co/quote/step-1');
    await expect(page.getByText('Aún no hay campos configurados para Colombia')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Continuar' })).toHaveCount(0);
    await expect(page.getByRole('alert')).toHaveCount(0);
  });
});

test.describe('[R-01.23] peticiones a Strapi', () => {
  test('[R-01.23] solo rutas relativas /api/..., sin cabecera Authorization y con la consulta exacta de la spec', async ({ page }) => {
    const mock = await mockStrapi(page);
    await openStep1(page, 'co');
    const campos = mock.requests.find((r) => r.url.startsWith('/api/form-fields'));
    expect(campos).toBeDefined();
    expect(decodeURIComponent(campos?.url ?? '')).toBe(
      '/api/form-fields?filters[country][code][$eq]=co&status=published&populate[validation]=true&populate[options]=true&sort[0]=order:asc&sort[1]=createdAt:asc&pagination[pageSize]=100',
    );
    expect(mock.requests.length).toBeGreaterThanOrEqual(3);
    const origen = new URL(page.url()).origin;
    for (const r of mock.requests) {
      expect(r.origin).toBe(origen);
      expect(r.url.startsWith('/api/')).toBe(true);
      expect(r.headers['authorization']).toBeUndefined();
    }
  });

  test('[R-01.23] meta.pagination.total > 100 produce un config-error (no se trunca en silencio)', async ({ page }) => {
    const mock = defaultMock();
    const co = mock.countries.get('co');
    if (!co) throw new Error('mock sin co');
    co.fieldsTotal = 101;
    await mockStrapi(page, mock);
    await page.goto('/co/quote/step-1');
    await expect(page.getByRole('alert')).toContainText('Hay más de 100 elementos configurados');
    await expect(page.getByRole('button', { name: 'Continuar' })).toHaveCount(0);
  });

  test('[R-01.23][R-01.22] sin respuesta en 10 s la petición expira y se ve el error recuperable', async ({ page }) => {
    test.setTimeout(40_000);
    const mock = defaultMock();
    const co = mock.countries.get('co');
    if (!co) throw new Error('mock sin co');
    co.fieldsDelayMs = 12_000;
    await mockStrapi(page, mock);
    await page.goto('/co/quote/step-1');
    await expect(page.getByRole('alert')).toContainText('No pudimos cargar la información', { timeout: 15_000 });
    await expect(page.getByRole('button', { name: 'Reintentar' })).toBeVisible();
  });
});

test.describe('[R-01.24][AC-01.25] almacenamiento corrupto y datos fuera de la consola', () => {
  test('[AC-01.25][R-01.24] con JSON inválido el formulario aparece vacío sin errores de consola y la clave se reemplaza al escribir', async ({ page }) => {
    const consola = captureConsole(page);
    await mockStrapi(page);
    await page.addInitScript(() => {
      if (!sessionStorage.getItem('__sembrado')) {
        sessionStorage.setItem('__sembrado', '1');
        sessionStorage.setItem('auto_quote_v1_co', '%%% esto no es JSON');
      }
    });
    await openStep1(page, 'co');
    await expect(field(page, 'Nombre completo')).toHaveValue('');
    expect(consola.errors).toEqual([]);
    await field(page, 'Nombre completo').fill('Ana Nueva');
    await page.waitForTimeout(200);
    const guardado = await page.evaluate(() => sessionStorage.getItem('auto_quote_v1_co'));
    expect(JSON.parse(guardado ?? 'null')).toMatchObject({ schemaVersion: 1 });
  });

  test('[R-01.24] ningún valor del formulario se escribe en la consola', async ({ page }) => {
    const consola = captureConsole(page);
    await mockStrapi(page);
    await openStep1(page, 'co');
    await field(page, 'Nombre completo').fill('Secreto-Ficticio-123');
    await field(page, 'Correo electrónico').fill('secreto@example.com');
    await field(page, 'Correo electrónico').blur();
    await page.getByRole('button', { name: 'Continuar' }).click();
    await page.waitForTimeout(200);
    expect(consola.all.join('\n')).not.toMatch(/Secreto-Ficticio-123|secreto@example\.com/);
  });
});
