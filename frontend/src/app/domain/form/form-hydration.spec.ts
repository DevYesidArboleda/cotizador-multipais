import { buildReadyConfig, fieldOf, validValues } from '../../testing/form-fixtures';
import { hydrateValues, initialControlValue } from './form-hydration';

const config = buildReadyConfig();

describe('[R-01.9] hidratación tolerante', () => {
  it('[R-01.9] conserva valores válidos, incluido un checkbox sin marcar y un valor aún inválido', () => {
    const consent = config.fields.find((f) => f.type === 'checkbox' && f.required);
    const stored = { ...validValues(config), [fieldOf(config, 'vehicle_year').documentId]: '1800', [fieldOf(config, 'vehicle_use').documentId]: false };
    const { values, discardedFieldDocumentIds } = hydrateValues(config, stored);
    expect(values[fieldOf(config, 'vehicle_year').documentId]).toBe('1800');
    expect(values[fieldOf(config, 'vehicle_use').documentId]).toBe(false);
    expect(consent && values[consent.documentId]).toBe(true);
    expect(discardedFieldDocumentIds).toEqual([]);
  });

  it('[R-01.9][AC-01.19] un documentId sin campo publicado se ignora y se informa para purgarlo', () => {
    const { values, discardedFieldDocumentIds } = hydrateValues(config, { 'doc-city-despublicada': 'bogota', ...validValues(config) });
    expect(values['doc-city-despublicada']).toBeUndefined();
    expect(discardedFieldDocumentIds).toEqual(['doc-city-despublicada']);
  });

  it('[R-01.9] un valor de tipo distinto del type del campo se descarta', () => {
    const consent = config.fields.find((f) => f.type === 'checkbox' && f.required);
    const yearId = fieldOf(config, 'vehicle_year').documentId;
    const { values, discardedFieldDocumentIds } = hydrateValues(config, { [yearId]: true, [consent?.documentId ?? '']: 'si' });
    expect(values[yearId]).toBeUndefined();
    expect(discardedFieldDocumentIds).toContain(yearId);
    expect(discardedFieldDocumentIds).toContain(consent?.documentId);
  });

  it('[R-01.9][AC-01.20] una opción de select eliminada se descarta y el campo queda vacío sin error', () => {
    const brand = fieldOf(config, 'vehicle_brand');
    const { values, discardedFieldDocumentIds } = hydrateValues(config, { [brand.documentId]: 'marca-eliminada' });
    expect(values[brand.documentId]).toBeUndefined();
    expect(discardedFieldDocumentIds).toEqual([brand.documentId]);
    expect(initialControlValue(brand, values[brand.documentId])).toBe('');
  });

  it('[R-01.9] un campo publicado sin valor queda vacío', () => {
    const { values } = hydrateValues(config, {});
    expect(values).toEqual({});
    expect(initialControlValue(fieldOf(config, 'full_name'), undefined)).toBe('');
    expect(initialControlValue(fieldOf(config, 'vehicle_use'), undefined)).toBe(false);
  });
});
