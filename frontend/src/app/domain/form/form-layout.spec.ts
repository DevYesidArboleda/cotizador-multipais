import { buildReadyConfig, fieldDto, coFields } from '../../testing/form-fixtures';
import { sortFieldsForLayout } from './form-layout';

describe('[R-01.2] orden del formulario', () => {
  it('[R-01.2] la sección tomador va antes que vehículo y dentro de cada una por order ascendente', () => {
    const config = buildReadyConfig({ mutate: (fields) => [...fields].reverse() });
    const sections = config.fields.map((f) => f.section);
    expect(sections.indexOf('vehicle')).toBe(sections.filter((s) => s === 'policyholder').length);
    for (const section of ['policyholder', 'vehicle'] as const) {
      const orders = config.fields.filter((f) => f.section === section).map((f) => f.order);
      expect(orders).toEqual([...orders].sort((a, b) => a - b));
    }
  });

  it('[R-01.2] un campo de vehículo con order bajo no precede a los del tomador', () => {
    const config = buildReadyConfig({
      mutate: (fields) => [...fields, fieldDto({ key: 'extra', semanticRole: 'none', type: 'text', section: 'vehicle', order: 1 })],
    });
    const firstVehicle = config.fields.findIndex((f) => f.section === 'vehicle');
    expect(config.fields.slice(0, firstVehicle).every((f) => f.section === 'policyholder')).toBe(true);
  });
});

describe('[AC-01.26] desempate de order', () => {
  it('[AC-01.26] con el mismo order gana el más antiguo (createdAt) y el resultado es estable', () => {
    const newer = fieldDto({ key: 'newer', semanticRole: 'none', type: 'text', order: 5, createdAt: '2026-06-01T00:00:00.000Z' });
    const older = fieldDto({ key: 'older', semanticRole: 'none', type: 'text', order: 5, createdAt: '2026-01-01T00:00:00.000Z' });
    const build = (extra: typeof newer[]) => buildReadyConfig({ mutate: (f) => [...f, ...extra] });
    const a = build([newer, older]).fields.filter((f) => f.order === 5).map((f) => f.documentId);
    const b = build([older, newer]).fields.filter((f) => f.order === 5).map((f) => f.documentId);
    expect(a).toEqual([older.documentId, newer.documentId]);
    expect(b).toEqual(a);
  });

  it('[AC-01.26] sortFieldsForLayout no muta la entrada', () => {
    const config = buildReadyConfig();
    const input = [...config.fields].reverse();
    const snapshot = [...input];
    sortFieldsForLayout(input);
    expect(input).toEqual(snapshot);
    expect(coFields().length).toBeGreaterThan(0);
  });
});
