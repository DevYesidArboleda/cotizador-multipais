import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const tokensCss = readFileSync(resolve(process.cwd(), 'src/styles/tokens.css'), 'utf8');

/** Prueba T4 de UI-UX-GUIDELINES §8.1: recalcula los contrastes de §2.4 desde `tokens.css` con la fórmula WCAG. */

function readTokens(css: string): Map<string, string> {
  const tokens = new Map<string, string>();
  for (const m of css.matchAll(/(--[\w-]+):\s*(#[0-9A-Fa-f]{6})\s*;/g)) tokens.set(m[1] as string, (m[2] as string).toUpperCase());
  return tokens;
}

function luminance(hex: string): number {
  const channel = (i: number): number => {
    const c = parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(0) + 0.7152 * channel(1) + 0.0722 * channel(2);
}

function ratio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

const tokens = readTokens(tokensCss);
const hex = (name: string): string => {
  const value = tokens.get(name);
  if (!value) throw new Error(`token ${name} no definido en tokens.css`);
  return value;
};

/** [código, primer plano, fondo, umbral] */
const TEXT_PAIRS: readonly (readonly [string, string, string])[] = [
  ['T1', '--color-text', '--color-surface'],
  ['T2', '--color-text', '--color-bg'],
  ['T3', '--color-text', '--color-accent-tint'],
  ['T4', '--color-text', '--color-warning-tint'],
  ['T5', '--color-text', '--color-danger-tint'],
  ['T6', '--color-text-muted', '--color-surface'],
  ['T7', '--color-text-muted', '--color-bg'],
  ['T8', '--color-text-muted', '--color-accent-tint'],
  ['T9', '--color-text-on-accent', '--color-accent'],
  ['T10', '--color-text-on-accent', '--color-accent-hover'],
  ['T11', '--color-accent', '--color-surface'],
  ['T12', '--color-accent', '--color-bg'],
  ['T13', '--color-accent', '--color-accent-tint'],
  ['T14', '--color-danger', '--color-surface'],
  ['T15', '--color-danger', '--color-bg'],
  ['T16', '--color-danger', '--color-danger-tint'],
  ['T17', '--color-success', '--color-success-tint'],
  ['T18', '--color-warning-text', '--color-warning-tint'],
  ['T19', '--color-text-on-accent', '--color-ink-badge'],
];

const UI_PAIRS: readonly (readonly [string, string, string])[] = [
  ['U1', '--color-border-control', '--color-surface'],
  ['U2', '--color-border-control', '--color-bg'],
  ['U3', '--color-border-control', '--color-accent-tint'],
  ['U4', '--color-focus', '--color-surface'],
  ['U5', '--color-focus', '--color-bg'],
  ['U6', '--color-focus', '--color-accent-tint'],
  ['U7', '--color-focus', '--color-danger-tint'],
  ['U8', '--color-focus', '--color-warning-tint'],
  ['U9', '--color-focus', '--color-success-tint'],
  ['U10', '--color-danger', '--color-surface'],
  ['U11a', '--color-accent', '--color-surface'],
  ['U11b', '--color-accent', '--color-bg'],
  ['U12', '--color-ink-badge', '--color-surface'],
  ['U13', '--color-accent', '--color-surface'],
  ['U14a', '--color-warning-border', '--color-warning-tint'],
  ['U14b', '--color-warning-border', '--color-surface'],
];

describe('[R-01.25] contraste de tokens (T4, WCAG 2.2 AA)', () => {
  it('[R-01.25] tokens.css define todos los tokens de color de la guía', () => {
    expect(tokens.size).toBeGreaterThanOrEqual(20);
  });

  it.each(TEXT_PAIRS)('[R-01.25] %s texto %s sobre %s ≥ 4.5:1', (_code, fg, bg) => {
    expect(ratio(hex(fg), hex(bg))).toBeGreaterThanOrEqual(4.5);
  });

  it.each(UI_PAIRS)('[R-01.25] %s componente %s sobre %s ≥ 3:1', (_code, fg, bg) => {
    expect(ratio(hex(fg), hex(bg))).toBeGreaterThanOrEqual(3);
  });

  it('[R-01.25] T20 botón deshabilitado (exento de 4.5) se mantiene sobre 3:1', () => {
    expect(ratio(hex('--color-text-disabled'), hex('--color-surface-sunken'))).toBeGreaterThanOrEqual(3);
  });

  it('[R-01.25] el foco se apoya en la superficie: sobre el acento solo da ~1.1:1, por eso el desplazamiento de 2 px es obligatorio', () => {
    expect(ratio(hex('--color-focus'), hex('--color-accent'))).toBeLessThan(1.5);
    expect(tokens.get('--color-focus')).toBe('#1E40AF');
  });
});
