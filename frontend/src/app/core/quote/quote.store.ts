import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import type { QuoteConfirmation, QuoteState, SelectedPlan, Step1Values } from '../contracts/strapi-contracts';
import { clearQuoteState, emptyQuoteState, readQuoteState, SESSION_STORAGE, writeQuoteState } from '../storage/quote-storage';

interface Slot {
  country: string | null;
  state: QuoteState;
  /** `true` solo tras un cambio del usuario: leer o activar un país nunca escribe (R-01.20, R-01.24). */
  persist: boolean;
}

/**
 * Estado del cotizador del país activo, en `sessionStorage['auto_quote_v1_<country>']` (R-01.8).
 * Solo lee y escribe la clave del país activo (aislamiento, R-01.20). El `effect` es solo persistencia.
 */
@Injectable({ providedIn: 'root' })
export class QuoteStore {
  private readonly storage = inject(SESSION_STORAGE);
  private readonly slot = signal<Slot>({ country: null, state: emptyQuoteState(), persist: false });

  readonly countryCode = computed(() => this.slot().country);
  readonly state = computed(() => this.slot().state);

  /** Campos a marcar como tocados al volver al Paso 1 por un guard (R-01.10). Solo en memoria. */
  private readonly pendingTouch = signal<readonly string[]>([]);

  constructor() {
    effect(() => {
      const { country, state, persist } = this.slot();
      if (persist && country) writeQuoteState(this.storage, country, state);
    });
  }

  /** Activa un país (idempotente): lee su clave y descarta el estado en memoria del anterior. */
  activate(code: string): void {
    const current = untracked(this.slot);
    if (current.country === code) return;
    if (current.persist && current.country) writeQuoteState(this.storage, current.country, current.state);
    this.slot.set({ country: code, state: readQuoteState(this.storage, code), persist: false });
  }

  /** Guarda los valores del Paso 1 indexados por `documentId` (R-01.8, R-01.9). */
  setStep1Values(values: Step1Values): void {
    this.slot.update((s) => ({ ...s, state: { ...s.state, step1: values }, persist: true }));
  }

  /** Guarda la selección única de plan en el mismo `QuoteState` (R-02.11, R-02.17). */
  setSelectedPlan(plan: SelectedPlan): void {
    this.slot.update((s) => ({ ...s, state: { ...s.state, selectedPlan: plan }, persist: true }));
  }

  /** Limpia la selección (plan que ya no existe, R-02.12). */
  clearSelectedPlan(): void {
    this.slot.update((s) => {
      const next: QuoteState = { ...s.state };
      delete next.selectedPlan;
      return { ...s, state: next, persist: true };
    });
  }

  /** Guarda la confirmación tras un pago aprobado (R-03.14). */
  setConfirmation(confirmation: QuoteConfirmation): void {
    this.slot.update((s) => ({ ...s, state: { ...s.state, confirmation }, persist: true }));
  }

  /** "Nueva cotización": borra SOLO la clave del país activo y deja el estado vacío sin reescribirlo (R-03.15). */
  reset(): void {
    const current = untracked(this.slot);
    if (current.country) clearQuoteState(this.storage, current.country);
    this.slot.set({ country: current.country, state: emptyQuoteState(), persist: false });
  }

  setPendingTouch(ids: readonly string[]): void {
    this.pendingTouch.set(ids);
  }

  /** Devuelve y limpia los campos pendientes de marcar como tocados. */
  consumePendingTouch(): readonly string[] {
    const ids = untracked(this.pendingTouch);
    if (ids.length > 0) this.pendingTouch.set([]);
    return ids;
  }
}
