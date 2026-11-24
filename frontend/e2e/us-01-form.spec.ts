import { expect, test } from '@playwright/test';
import { field, FIXED_NOW, fillCo, invalid, openStep1, setText, submit, valid } from './support/form-helpers';

/** E2E-S de SPEC-US-01: leen el Strapi sembrado (solo lectura, sin token de escritura; HITL-1). */

test.describe('[R-01.2][R-01.3][AC-01.1] formulario configurado por país', () => {
  test('@strapi [R-01.2][R-01.3][AC-01.1] Colombia: tomador primero y vehículo después; controles por tipo', async ({ page }) => {
    await openStep1(page, 'co');
    const legends = await page.locator('fieldset legend').allTextContents();
    expect(legends).toEqual(['Datos del tomador', 'Datos del vehículo']);

    const labels = await page.locator('app-dynamic-field label').allTextContents();
    const names = labels.map((l) => l.replace(/\s*\*\s*$/, '').trim());
    expect(names.indexOf('Número de documento')).toBeLessThan(names.indexOf('Placa'));
    expect(names.indexOf('Nombre completo')).toBeLessThan(names.indexOf('Correo electrónico'));
    expect(names.indexOf('Correo electrónico')).toBeLessThan(names.indexOf('Año del vehículo'));

    await expect(field(page, 'Nombre completo')).toHaveAttribute('type', 'text');
    await expect(field(page, 'Fecha de nacimiento')).toHaveAttribute('type', 'date');
    await expect(field(page, 'Año del vehículo')).toHaveAttribute('type', 'number');
    await expect(field(page, 'Año del vehículo')).toHaveAttribute('inputmode', 'numeric');
    await expect(page.getByLabel(/^Autorizo el tratamiento/)).toHaveAttribute('type', 'checkbox');
    const documentType = field(page, 'Tipo de documento');
    expect(await documentType.evaluate((el) => el.tagName)).toBe('SELECT');
    await expect(documentType.locator('option').first()).toHaveText('Selecciona una opción');
    await expect(documentType.locator('option').first()).toHaveAttribute('value', '');
    await expect(field(page, 'Placa')).toHaveAttribute('placeholder', 'ABC123');
    await expect(page.getByText('Auto: 3 letras y 3 números')).toBeVisible();
  });

  test('@strapi [AC-01.1][R-01.2] Chile: RUT y Patente en lugar de Tipo de documento y Placa', async ({ page }) => {
    await openStep1(page, 'cl');
    await expect(field(page, 'RUT')).toBeVisible();
    await expect(field(page, 'Patente')).toBeVisible();
    await expect(page.getByLabel(/^Tipo de documento/)).toHaveCount(0);
    await expect(page.getByLabel(/^Placa/)).toHaveCount(0);
  });
});

test.describe('[R-01.1][AC-01.5][AC-01.6] rutas', () => {
  for (const [entrada, destino] of [
    ['/', '/co/quote/step-1'],
    ['/cl', '/cl/quote/step-1'],
    ['/cl/quote', '/cl/quote/step-1'],
    ['/CL/quote/step-1', '/cl/quote/step-1'],
  ] as const) {
    test(`@strapi [R-01.1][AC-01.6] ${entrada} termina en ${destino}`, async ({ page }) => {
      await page.goto(entrada);
      await expect(page).toHaveURL(destino);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    });
  }

  test('@strapi [R-01.1][AC-01.5] /pe/quote/step-1 redirige a /country-not-found con un enlace por país de Strapi', async ({ page }) => {
    await page.goto('/pe/quote/step-1');
    await expect(page).toHaveURL('/country-not-found');
    await expect(page.getByRole('heading', { level: 1, name: 'No encontramos ese país' })).toBeFocused();
    const nav = page.getByRole('navigation', { name: 'Países disponibles' });
    await expect(nav.getByRole('link', { name: 'Colombia' })).toHaveAttribute('href', '/co/quote/step-1');
    await expect(nav.getByRole('link', { name: 'Chile' })).toHaveAttribute('href', '/cl/quote/step-1');
    await expect(nav.getByRole('link')).toHaveCount(2);
  });
});

test.describe('[R-01.4][R-01.7][AC-01.2] validación de campo y envío', () => {
  test('@strapi [R-01.7][AC-01.2][R-01.4] con errores la URL sigue en step-1, el foco va al primer inválido y se anuncia el conteo', async ({ page }) => {
    await openStep1(page, 'co');
    await submit(page);
    await expect(page).toHaveURL('/co/quote/step-1');
    const first = field(page, 'Nombre completo');
    await expect(first).toBeFocused();
    await invalid(first);
    await expect(first).toHaveAttribute('aria-describedby', /-error$/);
    await expect(page.getByText('Ingrese su nombre completo.')).toBeVisible();
    await expect(page.locator('[aria-live="polite"]').filter({ hasText: /Hay \d+ errores en el formulario/ })).toBeVisible();
  });

  test('@strapi [R-01.7] sin errores se navega a step-2', async ({ page }) => {
    await openStep1(page, 'co');
    await fillCo(page);
    await submit(page);
    await expect(page).toHaveURL('/co/quote/step-2');
  });
});

test.describe('[R-01.16][R-01.17][AC-01.12][AC-01.13] número de documento según tipo (CC vs CE)', () => {
  test('@strapi [AC-01.12][R-01.16][R-01.17] CC acepta 12345678 y CE muestra el mensaje de la opción', async ({ page }) => {
    await openStep1(page, 'co');
    await field(page, 'Tipo de documento').selectOption('CC');
    const number = await setText(page, 'Número de documento', '12345678');
    await valid(number);
    await field(page, 'Tipo de documento').selectOption('CE');
    await invalid(number);
    await expect(page.getByText('La cédula de extranjería debe tener 6 o 7 dígitos.')).toBeVisible();
    await field(page, 'Tipo de documento').selectOption('CC');
    await setText(page, 'Número de documento', '12345');
    await invalid(number);
    await expect(page.getByText('La cédula de ciudadanía debe tener entre 6 y 10 dígitos.')).toBeVisible();
    await field(page, 'Tipo de documento').selectOption('CE');
    await setText(page, 'Número de documento', '1234567');
    await valid(number);
  });

  test('@strapi [AC-01.13][R-01.16] cambiar el tipo revalida el número de inmediato y volver a CC limpia el error', async ({ page }) => {
    await openStep1(page, 'co');
    await field(page, 'Tipo de documento').selectOption('CC');
    const number = await setText(page, 'Número de documento', '12345678');
    await valid(number);
    await field(page, 'Tipo de documento').selectOption('CE');
    await invalid(number);
    await field(page, 'Tipo de documento').selectOption('CC');
    await valid(number);
  });
});

test.describe('[R-01.18][AC-01.14] RUT de Chile', () => {
  for (const [rut, esValido] of [
    ['12.345.678-5', true],
    ['1.000.005-K', true],
    ['1000005k', true],
    ['9.000.002-0', true],
    ['12.345.678-K', false],
    ['12.345.678', false],
  ] as const) {
    test(`@strapi [AC-01.14][R-01.18] RUT ${rut} → ${esValido ? 'válido' : 'inválido'}`, async ({ page }) => {
      await openStep1(page, 'cl');
      const control = await setText(page, 'RUT', rut);
      await (esValido ? valid(control) : invalid(control));
    });
  }

  test('@strapi [R-01.18] el valor válido se guarda normalizado con guion', async ({ page }) => {
    await openStep1(page, 'cl');
    const control = await setText(page, 'RUT', '12.345.678-5');
    await expect(control).toHaveValue('12345678-5');
  });
});

test.describe('[R-01.19][R-01.31][AC-01.15][AC-01.31] placa y patente', () => {
  for (const [valor, esValido] of [
    ['abc123', true],
    ['ABC-123', true],
    ['ABC12D', true],
    ['ABC1D2', false],
  ] as const) {
    test(`@strapi [AC-01.15][R-01.19] CO ${valor} → ${esValido ? 'válido' : 'inválido'}`, async ({ page }) => {
      await openStep1(page, 'co');
      const control = await setText(page, 'Placa', valor);
      await (esValido ? valid(control) : invalid(control));
    });
  }

  for (const [valor, esValido] of [
    ['BBBB12', true],
    ['bb-12-34', true],
    ['BBB123', false],
  ] as const) {
    test(`@strapi [AC-01.15][R-01.19] CL ${valor} → ${esValido ? 'válido' : 'inválido'}`, async ({ page }) => {
      await openStep1(page, 'cl');
      const control = await setText(page, 'Patente', valor);
      await (esValido ? valid(control) : invalid(control));
    });
  }

  for (const [valor, esValido] of [
    ['ABC123', true],
    ['XYZ12A', true],
    ['xyz-12a', true],
    ['ABC1D2', false],
    ['AB123C', false],
    ['ABC12', false],
  ] as const) {
    test(`@strapi [AC-01.31][R-01.31] placa de auto y moto en Colombia: ${valor} → ${esValido ? 'válido' : 'inválido'}`, async ({ page }) => {
      await openStep1(page, 'co');
      const control = await setText(page, 'Placa', valor);
      await (esValido ? valid(control) : invalid(control));
      if (esValido) await expect(control).toHaveValue(valor.replace('-', '').toUpperCase());
    });
  }
});

test.describe('[R-01.28][R-01.29][AC-01.28][AC-01.29] correo del tomador', () => {
  for (const country of ['co', 'cl'] as const) {
    test(`@strapi [AC-01.28][R-01.28] ${country}: vacío es inválido y ana.perez@example.com es válido`, async ({ page }) => {
      await openStep1(page, country);
      await submit(page);
      await expect(page).toHaveURL(`/${country}/quote/step-1`);
      await expect(page.getByText('Ingrese un correo electrónico válido.')).toBeVisible();
      const email = await setText(page, 'Correo electrónico', 'ana.perez@example.com');
      await valid(email);
    });
  }

  test('@strapi [AC-01.28][R-01.28] solo espacios es inválido y el mensaje es el de Strapi', async ({ page }) => {
    await openStep1(page, 'co');
    const email = await setText(page, 'Correo electrónico', '   ');
    await invalid(email);
    await expect(page.getByText('Ingrese un correo electrónico válido.')).toBeVisible();
  });

  for (const [valor, esValido] of [
    ['ana.perez@example.com', true],
    ['a+b@correo.co', true],
    ['ANA@Example.CL', true],
    ['maria_1@mail.dominio.com.co', true],
    ['  ana@example.com  ', true],
    ['ana@', false],
    ['@example.com', false],
    ['ana@example', false],
    ['ana@@example.com', false],
    ['ana perez@example.com', false],
    ['ana@example..com', false],
    ['ana@example.c', false],
    ['ana@example.com.', false],
  ] as const) {
    test(`@strapi [AC-01.29][R-01.29] ${JSON.stringify(valor)} → ${esValido ? 'válido' : 'inválido'}`, async ({ page }) => {
      await openStep1(page, 'co');
      const email = await setText(page, 'Correo electrónico', valor);
      await (esValido ? valid(email) : invalid(email));
      if (esValido) await expect(email).toHaveValue(valor.trim());
    });
  }
});

test.describe('[AC-01.27] checkbox requerido', () => {
  test('@strapi [AC-01.27] sin marcar el consentimiento no se avanza; "Uso particular" no requerido nunca bloquea', async ({ page }) => {
    await openStep1(page, 'co');
    await fillCo(page, { consent: false });
    await submit(page);
    await expect(page).toHaveURL('/co/quote/step-1');
    const consent = page.getByLabel(/^Autorizo el tratamiento/);
    await expect(consent).toBeFocused();
    await invalid(consent);
    await expect(page.getByLabel('Uso particular')).not.toBeChecked();
    await valid(page.getByLabel('Uso particular'));
    await consent.check();
    await submit(page);
    await expect(page).toHaveURL('/co/quote/step-2');
  });
});

test.describe('[R-01.8][AC-01.4][AC-01.18] datos que se conservan', () => {
  test('@strapi [AC-01.4][R-01.8] volver del Paso 2 conserva todos los datos, incluidos selects y checkbox', async ({ page }) => {
    await openStep1(page, 'co');
    await fillCo(page, { docType: 'CE', docNumber: '1234567', city: 'bogota' });
    await page.getByLabel('Uso particular').check();
    await submit(page);
    await expect(page).toHaveURL('/co/quote/step-2');
    await expect(page.getByRole('heading', { level: 1 })).toBeFocused();
    await page.getByRole('link', { name: 'Volver' }).click();
    await expect(page).toHaveURL('/co/quote/step-1');
    await expect(field(page, 'Nombre completo')).toHaveValue('Ana Pérez Demo');
    await expect(field(page, 'Tipo de documento')).toHaveValue('CE');
    await expect(field(page, 'Número de documento')).toHaveValue('1234567');
    await expect(field(page, 'Ciudad')).toHaveValue('bogota');
    await expect(field(page, 'Año del vehículo')).toHaveValue('2020');
    await expect(page.getByLabel(/^Autorizo el tratamiento/)).toBeChecked();
    await expect(page.getByLabel('Uso particular')).toBeChecked();
    await expect(field(page, 'Nombre completo')).not.toHaveAttribute('aria-invalid', 'true');
  });

  test('@strapi [AC-01.18][R-01.8][R-01.21] la recarga restaura valores (también inválidos) y vuelve a pedir la configuración', async ({ page }) => {
    const pedidos: string[] = [];
    page.on('request', (r) => { if (r.url().includes('/api/form-fields')) pedidos.push(r.url()); });
    await openStep1(page, 'co');
    await field(page, 'Nombre completo').fill('Ana Parcial');
    await field(page, 'Año del vehículo').fill('1800');
    await field(page, 'Año del vehículo').blur();
    await page.getByLabel('Uso particular').check();
    await page.waitForTimeout(150);
    await page.reload();
    await expect(field(page, 'Nombre completo')).toHaveValue('Ana Parcial');
    await expect(field(page, 'Año del vehículo')).toHaveValue('1800');
    await expect(page.getByLabel('Uso particular')).toBeChecked();
    expect(pedidos.length).toBeGreaterThanOrEqual(2);
    const stored = await page.evaluate(() => sessionStorage.getItem('auto_quote_v1_co'));
    expect(JSON.parse(stored ?? '{}').schemaVersion).toBe(1);
  });
});

test.describe('[AC-01.9][AC-01.10] bordes de fecha y año con el reloj fijado en 2026-11-23', () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.setFixedTime(FIXED_NOW);
  });

  for (const [fecha, esValida] of [
    ['2008-11-22', true],
    ['2008-11-23', true],
    ['2008-11-24', false],
    ['2027-01-01', false],
    ['2008-02-30', false],
  ] as const) {
    test(`@strapi [AC-01.9][R-01.13] fecha de nacimiento ${fecha} → ${esValida ? 'válido' : 'inválido'}`, async ({ page }) => {
      await openStep1(page, 'co');
      const control = await setText(page, 'Fecha de nacimiento', fecha);
      await (esValida ? valid(control) : invalid(control));
    });
  }

  for (const [anio, esValido] of [
    ['2005', false],
    ['2006', true],
    ['2027', true],
    ['2028', false],
    ['2020.5', false],
  ] as const) {
    test(`@strapi [AC-01.10][R-01.14] año del vehículo ${anio} → ${esValido ? 'válido' : 'inválido'}`, async ({ page }) => {
      await openStep1(page, 'co');
      const control = await setText(page, 'Año del vehículo', anio);
      await (esValido ? valid(control) : invalid(control));
    });
  }
});
