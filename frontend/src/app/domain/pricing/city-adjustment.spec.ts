import { buildReadyConfig, fieldOf } from '../../testing/form-fixtures';
import { resolveCityAdjustment } from './city-adjustment';

function configWith(pct: unknown) {
  return buildReadyConfig({
    mutate: (fields) =>
      fields.map((f) =>
        f.semanticRole === 'city'
          ? { ...f, key: `c_${Math.random().toString(36).slice(2)}`, options: [{ label: 'Ciudad A', value: 'a', priceAdjustmentPct: pct as number }, { label: 'Ciudad B', value: 'b' }] }
          : f,
      ),
  });
}
const pick = (config: ReturnType<typeof configWith>, value: string) => ({ [fieldOf(config, 'city').documentId]: value });

describe('[R-02.21][R-02.22] ajuste por ciudad', () => {
  it('[R-02.21] lee el factor de la opción elegida del campo con rol city, sin depender de key', () => {
    const config = configWith(8);
    expect(resolveCityAdjustment(config, pick(config, 'a'))).toEqual({ kind: 'ok', pct: 8 });
  });

  it.each([-10, 30, 0, -5])('[R-02.22] %i es válido (extremos inclusivos)', (pct) => {
    const config = configWith(pct);
    expect(resolveCityAdjustment(config, pick(config, 'a'))).toEqual({ kind: 'ok', pct });
  });

  it.each([-11, 31, 2.5, Number.NaN, 'abc'])('[R-02.22][AC-02.24] %s produce config-error con campo y opción', (pct) => {
    const config = configWith(pct);
    const r = resolveCityAdjustment(config, pick(config, 'a'));
    expect(r).toMatchObject({ kind: 'config-error', issue: { code: 'invalid-city-adjustment', optionLabel: 'Ciudad A' } });
  });

  it('[R-02.22] solo se valida la opción elegida', () => {
    const config = configWith(99);
    expect(resolveCityAdjustment(config, pick(config, 'b'))).toEqual({ kind: 'ok', pct: 0 });
  });
});

describe('[R-02.23] faltantes legítimos valen 0', () => {
  it('[R-02.23][AC-02.23] sin campo city, sin valor, opción inexistente o sin atributo', () => {
    const noCity = buildReadyConfig({ mutate: (f) => f.filter((x) => x.semanticRole !== 'city') });
    expect(resolveCityAdjustment(noCity, {})).toEqual({ kind: 'ok', pct: 0 });
    const config = configWith(8);
    expect(resolveCityAdjustment(config, {})).toEqual({ kind: 'ok', pct: 0 });
    expect(resolveCityAdjustment(config, pick(config, 'zzz'))).toEqual({ kind: 'ok', pct: 0 });
    expect(resolveCityAdjustment(config, pick(config, 'b'))).toEqual({ kind: 'ok', pct: 0 });
  });

  it('[R-02.23][AC-02.23] un factor 0 equivale a no tener ajuste', () => {
    const config = configWith(0);
    expect(resolveCityAdjustment(config, pick(config, 'a'))).toEqual({ kind: 'ok', pct: 0 });
  });
});
