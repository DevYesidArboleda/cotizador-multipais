import { defineConfig, devices } from '@playwright/test';

/**
 * E2E (SPEC-US-01 §6). Reglas:
 *  - E2E-S (`@strapi` en el título): leen el Strapi sembrado, solo lectura. Sin token de escritura (HITL-1).
 *  - E2E-M: simulan a Strapi con `page.route` (e2e/support/strapi-mock.ts).
 * `E2E_BASE_URL` apunta a la app (dev server o Nginx). Sin ella se levanta `npm start` (proxy /api -> Strapi).
 */
const baseURL = process.env['E2E_BASE_URL'] ?? 'http://localhost:4200';

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 1 : 0,
  workers: process.env['CI'] ? 2 : undefined,
  reporter: [['list'], ['html', { open: 'never' }]],
  timeout: 30_000,
  expect: { timeout: 7_000 },
  use: {
    baseURL,
    locale: 'es-CO',
    timezoneId: 'America/Bogota',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: process.env['E2E_BASE_URL']
    ? undefined
    : { command: 'npm start', url: baseURL, reuseExistingServer: true, timeout: 120_000 },
});
