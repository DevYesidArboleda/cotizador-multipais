import type { SummaryCopy } from '../../core/contracts/strapi-contracts';
import { buildReadyConfig, fieldOf } from '../../testing/form-fixtures';
import { formatSummaryValue } from './format-summary-value';

const copy: SummaryCopy = { yes: 'Sí', no: 'No', notProvided: 'No informado' };
const config = buildReadyConfig();
const fmt = (role: Parameters<typeof fieldOf>[1], value: string | boolean | null | undefined, locale = 'es-CO') =>
  formatSummaryValue(fieldOf(config, role), value ?? undefined, locale, copy);

describe('[R-03.3] formatSummaryValue', () => {
  it('[R-03.3][AC-03.22] select muestra la etiqueta, nunca el value interno', () => {
    expect(fmt('vehicle_brand', 'mazda')).toBe('Mazda');
  });

  it('[R-03.3][AC-03.22] date usa el formato del país: 2008-11-23 -> 23/11/2008', () => {
    expect(fmt('birth_date', '2008-11-23')).toBe('23/11/2008');
  });

  it('[R-03.3][AC-03.22] checkbox -> Sí / No, también sin marcar', () => {
    expect(fmt('vehicle_use', true)).toBe('Sí');
    expect(fmt('vehicle_use', false)).toBe('No');
    expect(fmt('vehicle_use', undefined)).toBe('No');
  });

  it('[R-03.3][AC-03.22] opcional vacío -> No informado', () => {
    expect(fmt('phone', '')).toBe('No informado');
    expect(fmt('phone', undefined)).toBe('No informado');
  });

  it('[R-03.3][R-03.4] solo document_number se enmascara; el texto y el correo van tal cual (R-03.24)', () => {
    expect(fmt('document_number', '1020304050')).toBe('******4050');
    expect(fmt('email', 'ana.perez@example.com')).toBe('ana.perez@example.com');
    expect(fmt('full_name', 'Ana Pérez Demo')).toBe('Ana Pérez Demo');
  });
});
