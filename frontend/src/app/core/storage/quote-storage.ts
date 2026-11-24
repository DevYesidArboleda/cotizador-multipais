import { InjectionToken } from '@angular/core';
import { QUOTE_SCHEMA_VERSION, QUOTE_STORAGE_KEY_PREFIX } from '../contracts/strapi-contracts';
import type { QuoteState, QuoteStorageKey, Step1Value, Step1Values } from '../contracts/strapi-contracts';
import { isRecord } from '../http/type-guards';

/** `sessionStorage` inyectable; `null` si el navegador lo bloquea (R-01.24). */
export const SESSION_STORAGE = new InjectionToken<Storage | null>('SESSION_STORAGE', {
  providedIn: 'root',
  factory: () => {
    try {
      return typeof sessionStorage === 'undefined' ? null : sessionStorage;
    } catch {
      return null;
    }
  },
});

/** `auto_quote_v1_<country>` (CLAUDE.md regla 6; R-01.8, R-01.20). */
export function quoteStorageKey(countryCode: string): QuoteStorageKey {
  return `${QUOTE_STORAGE_KEY_PREFIX}${countryCode}`;
}

export function emptyQuoteState(): QuoteState {
  return { schemaVersion: QUOTE_SCHEMA_VERSION, step1: {} };
}

function isStep1Value(v: unknown): v is Step1Value {
  return v === null || typeof v === 'string' || typeof v === 'boolean';
}

/** JSON inválido o `schemaVersion !== 1` → `null` (el llamador borra la clave) (R-01.24, AC-01.25). */
export function parseQuoteState(raw: string | null): QuoteState | null {
  if (raw === null) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isRecord(parsed) || parsed['schemaVersion'] !== QUOTE_SCHEMA_VERSION || !isRecord(parsed['step1'])) return null;
  const step1: Record<string, Step1Value> = {};
  for (const [id, value] of Object.entries(parsed['step1'])) {
    if (isStep1Value(value)) step1[id] = value;
  }
  const state: QuoteState = { schemaVersion: QUOTE_SCHEMA_VERSION, step1 };
  const selected = parsed['selectedPlan'];
  if (isRecord(selected) && typeof selected['planDocumentId'] === 'string' && typeof selected['priceSeenAtSelection'] === 'number') {
    state.selectedPlan = { planDocumentId: selected['planDocumentId'], priceSeenAtSelection: selected['priceSeenAtSelection'] };
  }
  const c = parsed['confirmation'];
  if (
    isRecord(c) &&
    typeof c['quoteNumber'] === 'string' &&
    typeof c['planDocumentId'] === 'string' &&
    typeof c['planName'] === 'string' &&
    typeof c['finalPrice'] === 'number' &&
    typeof c['paidAt'] === 'string'
  ) {
    state.confirmation = {
      quoteNumber: c['quoteNumber'],
      planDocumentId: c['planDocumentId'],
      planName: c['planName'],
      finalPrice: c['finalPrice'],
      paidAt: c['paidAt'],
    };
  }
  return state;
}

/** Lee SOLO la clave del país indicado; ilegible o corrupta → vacío y se elimina la clave (R-01.20, R-01.24). */
export function readQuoteState(storage: Storage | null, countryCode: string): QuoteState {
  if (!storage) return emptyQuoteState();
  const key = quoteStorageKey(countryCode);
  try {
    const raw = storage.getItem(key);
    const parsed = parseQuoteState(raw);
    if (parsed) return parsed;
    if (raw !== null) storage.removeItem(key);
  } catch {
    // Almacenamiento inaccesible: se continúa con estado vacío en memoria.
  }
  return emptyQuoteState();
}

/** Escribe solo la clave del país; un fallo (cuota, bloqueo) no lanza: el estado sigue en memoria (R-01.24). */
export function writeQuoteState(storage: Storage | null, countryCode: string, state: QuoteState): boolean {
  if (!storage) return false;
  try {
    storage.setItem(quoteStorageKey(countryCode), JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

/** Valores del Paso 1 sin referencias a campos que ya no existen (se purga al guardar, R-01.9). */
export function pickStep1Values(values: Step1Values, validIds: readonly string[]): Step1Values {
  const picked: Record<string, Step1Value> = {};
  for (const id of validIds) {
    const v = values[id];
    if (v !== undefined) picked[id] = v;
  }
  return picked;
}

/** Elimina SOLO la clave del país indicado (R-03.15); un fallo del almacenamiento no lanza. */
export function clearQuoteState(storage: Storage | null, countryCode: string): void {
  if (!storage) return;
  try {
    storage.removeItem(quoteStorageKey(countryCode));
  } catch {
    // Sin acceso al almacenamiento: nada que borrar.
  }
}
