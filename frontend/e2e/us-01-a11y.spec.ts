import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { defaultMock, mockStrapi } from './support/strapi-mock';
import { field, openStep1, setText, submit, valid } from './support/form-helpers';

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'];

test.describe('[R-01.25] accesibilidad del Paso 1 (Strapi sembrado)', () => {
  test('[R-01.25] cada control tiene label, aria-required en los requeridos y el h1 recibe el foco al entrar', async ({ page }) => {
    await openStep1(page, 'co');
    await expect(page.getByRole('heading', { level: 1 })).toBeFocused();
    await expect(page).toHaveTitle('Tus datos y los de tu vehículo · Paso 1 de 3 · Linde Auto (Colombia)');
    await expect(page.locator('html')).toHaveAttribute('lang', 'es');

    const controles = page.locator('app-dynamic-field input, app-dynamic-field select');
    const total = await controles.count();
    expect(total).toBeGreaterThan(8);
    for (let i = 0; i < total; i++) {
      const control = controles.nth(i);
      const id = await control.getAttribute('id');
      expect(id).toBeTruthy();
      await expect(page.locator(`label[for="${id}"]`)).toHaveCount(1);
    }
    await expect(field(page, 'Nombre completo')).toHaveAttribute('aria-required', 'true');
    await expect(field(page, 'Teléfono')).not.toHaveAttribute('aria-required', 'true');
    await expect(page.getByLabel('Uso particular')).not.toHaveAttribute('aria-required', 'true');
  });

  test('[R-01.25] cero violaciones axe (WCAG 2.2 AA) en loading-ready y con errores visibles', async ({ page }) => {
    await openStep1(page, 'co');
    const listo = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
    expect(listo.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
    await submit(page);
    await expect(page.locator('[aria-invalid="true"]').first()).toBeFocused();
    const conErrores = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
    expect(conErrores.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
  });

  test('[R-01.25] el error no depende solo del color: hay texto visible y borde de 2 px', async ({ page }) => {
    await openStep1(page, 'co');
    const nombre = field(page, 'Nombre completo');
    await nombre.focus();
    await nombre.blur();
    await expect(page.getByText('Ingrese su nombre completo.')).toBeVisible();
    expect(await nombre.evaluate((el) => getComputedStyle(el).borderTopWidth)).toBe('2px');
  });

  test('[R-01.25] el skip link lleva el foco al contenido principal', async ({ page }) => {
    await openStep1(page, 'co');
    await page.keyboard.press('Shift+Tab');
    const skip = page.getByRole('link', { name: 'Saltar al contenido principal' });
    await skip.focus();
    await expect(skip).toBeVisible();
    await page.keyboard.press('Enter');
    await expect(page.locator('main')).toBeFocused();
    await expect(page).toHaveURL('/co/quote/step-1');
  });
});

test.describe('[AC-01.24] Paso 1 solo con teclado', () => {
  test('[AC-01.24][R-01.25] Tab recorre los campos y Enter en "Continuar" con un inválido enfoca el primero, con aria-invalid, aria-describedby y aria-live', async ({ page }) => {
    await openStep1(page, 'co');
    await expect(page.getByRole('heading', { level: 1 })).toBeFocused();
    const boton = page.getByRole('button', { name: 'Continuar' });
    let pasos = 0;
    while (!(await boton.evaluate((el) => el === document.activeElement)) && pasos < 40) {
      await page.keyboard.press('Tab');
      pasos++;
    }
    expect(pasos).toBeLessThan(40);
    await expect(boton).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL('/co/quote/step-1');
    const primero = field(page, 'Nombre completo');
    await expect(primero).toBeFocused();
    await expect(primero).toHaveAttribute('aria-invalid', 'true');
    const describedBy = await primero.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
    for (const id of (describedBy ?? '').split(' ')) await expect(page.locator(`[id="${id}"]`)).toBeVisible();
    const region = page.locator('[aria-live="polite"][aria-atomic="true"]');
    await expect(region).toContainText(/Hay \d+ errores en el formulario/);
  });

  test('[AC-01.24] el formulario completo se llena con teclado (Tab, Space en checkbox, flechas en select) y avanza con Enter', async ({ page }) => {
    await openStep1(page, 'co');
    await field(page, 'Nombre completo').focus();
    await page.keyboard.type('Ana Teclado');
    await page.keyboard.press('Tab');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Tab');
    await page.keyboard.type('12345678');
    await page.keyboard.press('Tab');
    // El control de fecha nativo tiene sub-campos (día/mes/año): se completa y se retoma el foco en el siguiente campo.
    await field(page, 'Fecha de nacimiento').fill('1990-05-10');
    await field(page, 'Correo electrónico').focus();
    await page.keyboard.type('ana@example.com');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
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
    await expect(page).toHaveURL('/co/quote/step-2');
  });
});

test.describe('[R-01.26] momento de validación', () => {
  test('[R-01.26] sin tocar no hay error; al blur aparece; al corregir desaparece al instante', async ({ page }) => {
    await openStep1(page, 'co');
    await expect(page.locator('.field__error')).toHaveCount(0);
    const email = field(page, 'Correo electrónico');
    await email.fill('ana@');
    await expect(page.locator('.field__error')).toHaveCount(0);
    await email.blur();
    await expect(email).toHaveAttribute('aria-invalid', 'true');
    await expect(page.getByText('Ingrese un correo electrónico válido.')).toBeVisible();
    await email.fill('ana@example.com');
    await valid(email);
    await expect(page.locator('.field__error')).toHaveCount(0);
  });
});

test.describe('[R-01.30][AC-01.30] propósito del campo de correo', () => {
  test('[R-01.30][AC-01.30] el control de correo es input de texto con autocomplete, inputmode y spellcheck; el error es el de Strapi, no el del navegador', async ({ page }) => {
    await openStep1(page, 'cl');
    const email = field(page, 'Correo electrónico');
    await expect(email).toHaveAttribute('type', 'text');
    await expect(email).toHaveAttribute('autocomplete', 'email');
    await expect(email).toHaveAttribute('inputmode', 'email');
    await expect(email).toHaveAttribute('spellcheck', 'false');
    await email.fill('esto-no-es-un-correo');
    await email.blur();
    await expect(page.getByText('Ingrese un correo electrónico válido.')).toBeVisible();
    expect(await email.evaluate((el: HTMLInputElement) => el.validationMessage)).toBe('');
  });

  test('[AC-01.30][R-01.30] con la key renombrada a zzz_9 los atributos siguen (derivan del rol, no de la key)', async ({ page }) => {
    const mock = defaultMock();
    const co = mock.countries.get('co');
    if (!co) throw new Error('mock sin co');
    co.fields = co.fields.map((f) => (f.semanticRole === 'email' ? { ...f, key: 'zzz_9' } : f));
    await mockStrapi(page, mock);
    await openStep1(page, 'co');
    const email = field(page, 'Correo electrónico');
    await expect(email).toHaveAttribute('name', 'zzz_9');
    await expect(email).toHaveAttribute('type', 'text');
    await expect(email).toHaveAttribute('autocomplete', 'email');
    await expect(email).toHaveAttribute('inputmode', 'email');
    await setText(page, 'Correo electrónico', 'mal');
    await expect(page.getByText('Ingresa un correo electrónico válido.')).toBeVisible();
  });
});
