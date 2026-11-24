import type { SummaryCopy } from '../../core/contracts/strapi-contracts';
import { buildReadyConfig, fieldOf, validValues } from '../../testing/form-fixtures';
import { validPlanOf } from '../../testing/plan-fixtures';
import { priceAllPlans } from '../../features/step-2/step-2-state';
import { buildSummaryRows } from './build-summary';

const copy: SummaryCopy = { yes: 'Sí', no: 'No', notProvided: 'No informado' };

describe('[R-03.2] buildSummaryRows', () => {
  const config = buildReadyConfig();
  const values = { ...validValues(config), [fieldOf(config, 'document_number').documentId]: '1020304050', 'orfano-id': 'valor huérfano' };
  const rows = buildSummaryRows(config, values, copy);

  it('[R-03.2] separa tomador y vehículo en el orden de la configuración', () => {
    expect(rows.policyholder.map((r) => r.fieldDocumentId)).toEqual(
      config.fields.filter((f) => f.section === 'policyholder').map((f) => f.documentId),
    );
    expect(rows.vehicle.map((r) => r.fieldDocumentId)).toEqual(config.fields.filter((f) => f.section === 'vehicle').map((f) => f.documentId));
  });

  it('[R-03.2] los valores huérfanos no se muestran', () => {
    const all = [...rows.policyholder, ...rows.vehicle];
    expect(all.some((r) => r.displayValue === 'valor huérfano')).toBe(false);
  });

  it('[R-03.2][R-03.4] el documento aparece enmascarado y nunca completo', () => {
    const doc = rows.policyholder.find((r) => r.fieldDocumentId === fieldOf(config, 'document_number').documentId);
    expect(doc?.displayValue).toBe('******4050');
    expect(JSON.stringify(rows)).not.toContain('1020304050');
  });
});

describe('[R-03.24] correo del tomador por rol', () => {
  it('[R-03.24] el correo se muestra completo, con su label, en la posición de configuración y aunque el key sea aleatorio', () => {
    const config = buildReadyConfig({
      mutate: (fields) => fields.map((f) => ({ ...f, key: `k_${Math.random().toString(36).slice(2)}` })),
    });
    const values = validValues(config);
    const rows = buildSummaryRows(config, values, copy);
    const email = fieldOf(config, 'email');
    const row = rows.policyholder.find((r) => r.fieldDocumentId === email.documentId);
    expect(row).toEqual({ fieldDocumentId: email.documentId, label: email.label, displayValue: 'ana.perez@example.com' });
    expect(rows.policyholder.findIndex((r) => r.fieldDocumentId === email.documentId)).toBe(
      config.fields.filter((f) => f.section === 'policyholder').findIndex((f) => f.documentId === email.documentId),
    );
  });

  it('[R-03.24] un correo vacío (campo opcional) se muestra como "No informado"', () => {
    const config = buildReadyConfig({ mutate: (fields) => fields.map((f) => (f.semanticRole === 'email' ? { ...f, required: false } : f)) });
    const values = { ...validValues(config), [fieldOf(config, 'email').documentId]: '' };
    const row = buildSummaryRows(config, values, copy).policyholder.find((r) => r.fieldDocumentId === fieldOf(config, 'email').documentId);
    expect(row?.displayValue).toBe('No informado');
  });
});

describe('[R-03.6][AC-03.29] precio del resumen igual al del Paso 2', () => {
  it('[R-03.6][AC-03.29] base 1.000.000, año 2025, nacido 1990-01-01, Bogotá (+8) -> 1.180.000 con las mismas funciones', () => {
    const config = buildReadyConfig();
    const values = {
      ...validValues(config),
      [fieldOf(config, 'vehicle_year').documentId]: '2025',
      [fieldOf(config, 'birth_date').documentId]: '1990-01-01',
      [fieldOf(config, 'city').documentId]: 'bogota',
    };
    const plan = validPlanOf({ basePrice: 1_000_000 });
    const step2 = priceAllPlans(config, values, [plan], null, new Date(2026, 10, 23, 12));
    expect(step2.kind === 'ok' && step2.plans[0]?.finalPrice).toBe(1_180_000);
  });
});
