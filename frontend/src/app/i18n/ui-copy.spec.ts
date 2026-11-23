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
