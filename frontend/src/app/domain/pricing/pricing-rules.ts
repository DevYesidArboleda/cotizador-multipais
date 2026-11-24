import { CITY_ADJUSTMENT_PCT } from '../../core/contracts/strapi-contracts';

/**
 * ÚNICO módulo con los parámetros de la regla de ajuste SIMULADA y documentada (R-02.6, R-02.7, GAP-02.4).
 * Porcentajes enteros y aditivos sobre el precio base. El factor por ciudad NO vive aquí: lo trae Strapi en la
 * opción elegida del campo con rol `city` (GAP-02.18); aquí solo está su rango válido.
 */

/** Antigüedad del vehículo `v = añoActual - vehicle_year`: `v ≤ maxAge` → `pct`; el último tramo es el resto. */
export const VEHICLE_AGE_TIERS: readonly { readonly maxAge: number; readonly pct: number }[] = [
  { maxAge: 3, pct: 10 },
  { maxAge: 10, pct: 0 },
];
/** Antigüedad mayor que el último tramo. */
export const VEHICLE_OLDEST_PCT = 15;

/** Edad del tomador `e < youngerThan` → `pct`; en otro caso `0`. */
export const DRIVER_AGE_RULE = { youngerThan: 25, pct: 12 } as const;

/** Rango inclusivo del factor por ciudad (HITL-1): mismos números que `min`/`max` del esquema Strapi. */
export const CITY_ADJUSTMENT_MIN_PCT = CITY_ADJUSTMENT_PCT.min;
export const CITY_ADJUSTMENT_MAX_PCT = CITY_ADJUSTMENT_PCT.max;
