import type { ConfigIssue } from '../core/contracts/strapi-contracts';
import { UI_COPY } from './ui-copy.es';
import { describeConfigIssue, t, validationSummary } from './ui-copy';

describe('[R-01.27] catálogo de copy ui-copy.es', () => {
  it('[R-01.27] contiene las claves de chrome de la guía §7 que usa el Paso 1', () => {
    for (const key of [
      'button.continue', 'button.retry', 'form.select.placeholder', 'form.requiredNote', 'form.section.policyholder',
      'form.section.vehicle', 'loading.step1', 'error.network.title', 'empty.step1.title', 'config.title',
      'config.role.missing', 'countryNotFound.title', 'stepper.label', 'a11y.skipLink', 'footer.disclaimer',
    ] as const) {
      expect(UI_COPY[key].length, key).toBeGreaterThan(0);
    }
  });

  it('[R-01.27] interpola {parametros} y deja visible el que falta', () => {
    expect(t('stepper.item.current', { n: 1, nombre: 'Tus datos' })).toBe('Paso 1: Tus datos, paso actual');
    expect(t('empty.step1.title')).toContain('{pais}');
  });

  it('[R-01.27] el resumen de errores usa singular y plural por clave', () => {
    expect(validationSummary(1)).toBe('Hay 1 error en el formulario. Revísalo para continuar.');
    expect(validationSummary(2)).toBe('Hay 2 errores en el formulario. Revísalos para continuar.');
    expect(validationSummary(0)).toBe('');
  });

  it('[R-01.27][R-01.11] el config-error nombra el rol y sale del catálogo, no de literales', () => {
    const issue: ConfigIssue = { code: 'role-missing', role: 'birth_date' };
    expect(describeConfigIssue(issue)).toBe('Falta el campo con rol birth_date.');
  });

  it('[R-01.27] ningún texto de campo de negocio vive en el catálogo (sin etiquetas de seed)', () => {
    const all = Object.values(UI_COPY).join('|');
    for (const businessText of ['Nombre completo', 'Fecha de nacimiento', 'Correo electrónico', 'Placa']) {
      expect(all).not.toContain(businessText);
    }
  });
});

describe('[R-02.20] catálogo del Paso 2', () => {
  it('[R-02.20] contiene los textos de planes, avisos y estados del Paso 2', () => {
    for (const key of ['plans.group.legend', 'plan.recommended', 'plan.selected', 'notice.price.changed', 'notice.plan.unavailable', 'empty.step2.title', 'button.continueToSummary', 'plans.select.help'] as const) {
      expect(t(key).length).toBeGreaterThan(0);
    }
  });

  it('[R-02.20] interpola precio y país; los config-error de plan salen del catálogo', () => {
    expect(t('notice.price.changed', { precio: '$ 1' })).toBe('El precio de tu plan cambió. Ahora es $ 1.');
    expect(describeConfigIssue({ code: 'plan-currency-mismatch', planDocumentId: 'd', planName: 'P', planCurrency: 'CLP', countryCurrency: 'COP' })).toContain('CLP');
  });
});

describe('[R-03.22] catálogo del Paso 3 y la confirmación', () => {
  it('[R-03.22] contiene los textos de resumen, términos, pago, simulación y confirmación', () => {
    for (const key of ['summary.section.policyholder', 'terms.accept', 'pay.help.terms', 'pay.rejected.body', 'simulation.legend', 'button.pay', 'button.pay.processing', 'button.newQuote', 'confirmation.announce', 'confirmation.simulationNote', 'link.changePlan'] as const) {
      expect(t(key).length).toBeGreaterThan(0);
    }
    expect(t('simulation.legend')).toBe('Simulación de pago (solo pruebas)');
    expect(t('confirmation.announce', { numero: 'COT-CO-20261123-7B2E' })).toBe('Tu cotización COT-CO-20261123-7B2E fue confirmada.');
  });

  it('[R-03.22] el error de términos vacíos y de moneda salen del catálogo', () => {
    expect(describeConfigIssue({ code: 'empty-terms' })).toBe(t('config.terms.empty'));
  });
});
