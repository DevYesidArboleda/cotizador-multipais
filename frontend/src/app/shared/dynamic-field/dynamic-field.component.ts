import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import type { FieldError, FormFieldConfig, Step1Value } from '../../core/contracts/strapi-contracts';
import { inputAttributesForRole } from '../../domain/form/normalizers';
import { t } from '../../i18n/ui-copy';

/**
 * Control de un campo de Strapi, renderizado solo por `type` (R-01.3) con label, ayuda y error enlazados por
 * ARIA (R-01.4, R-01.25). El propósito de la entrada (`autocomplete`) sale del `semanticRole`, nunca del `key`
 * (R-01.30). El padre es dueño del valor y de la validación: este componente solo presenta y emite.
 */
@Component({
  selector: 'app-dynamic-field',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="field" [class.field--checkbox]="field().type === 'checkbox'" [class.field--invalid]="error() !== null">
      @if (field().type === 'checkbox') {
        <div class="field__check">
          <input
            type="checkbox"
            [id]="inputId()"
            [attr.name]="field().key"
            [checked]="value() === true"
            [attr.aria-required]="field().required ? 'true' : null"
            [attr.aria-invalid]="error() ? 'true' : null"
            [attr.aria-describedby]="describedBy()"
            (change)="onCheck($event)"
            (blur)="blurred.emit()"
          />
          <label [for]="inputId()">{{ field().label }}@if (field().required) { <span aria-hidden="true">{{ marker }}</span> }</label>
        </div>
      } @else {
        <label class="field__label" [for]="inputId()">{{ field().label }}@if (field().required) { <span aria-hidden="true">{{ marker }}</span> }</label>
        @switch (field().type) {
          @case ('select') {
            <select
              [id]="inputId()"
              [attr.name]="field().key"
              [attr.autocomplete]="attrs().autocomplete ?? null"
              [attr.aria-required]="field().required ? 'true' : null"
              [attr.aria-invalid]="error() ? 'true' : null"
              [attr.aria-describedby]="describedBy()"
              (change)="onInput($event)"
              (blur)="blurred.emit()"
            >
              <option value="" [selected]="text() === ''">{{ selectPlaceholder }}</option>
              @for (option of field().options; track option.value) {
                <option [value]="option.value" [selected]="option.value === text()">{{ option.label }}</option>
              }
            </select>
          }
          @case ('date') {
            <input
              type="date"
              [id]="inputId()"
              [attr.name]="field().key"
              [value]="text()"
              [attr.autocomplete]="attrs().autocomplete ?? null"
              [attr.aria-required]="field().required ? 'true' : null"
              [attr.aria-invalid]="error() ? 'true' : null"
              [attr.aria-describedby]="describedBy()"
              (input)="onInput($event)"
              (blur)="blurred.emit()"
            />
          }
          @case ('number') {
            <input
              type="number"
              inputmode="numeric"
              [id]="inputId()"
              [attr.name]="field().key"
              [value]="text()"
              [attr.placeholder]="field().placeholder"
              [attr.aria-required]="field().required ? 'true' : null"
              [attr.aria-invalid]="error() ? 'true' : null"
              [attr.aria-describedby]="describedBy()"
              (input)="onInput($event)"
              (blur)="blurred.emit()"
            />
          }
          @default {
            <input
              type="text"
              [id]="inputId()"
              [attr.name]="field().key"
              [value]="text()"
              [attr.placeholder]="field().placeholder"
              [attr.autocomplete]="attrs().autocomplete ?? null"
              [attr.inputmode]="attrs().inputmode ?? null"
              [attr.spellcheck]="spellcheck()"
              [attr.aria-required]="field().required ? 'true' : null"
              [attr.aria-invalid]="error() ? 'true' : null"
              [attr.aria-describedby]="describedBy()"
              (input)="onInput($event)"
              (blur)="blurred.emit()"
            />
          }
        }
      }
      @if (field().helpText) {
        <p class="field__help" [id]="helpId()">{{ field().helpText }}</p>
      }
      @if (error(); as e) {
        <p class="field__error" [id]="errorId()">{{ e.message }}</p>
      }
    </div>
  `,
  styles: `
    .field { display: flex; flex-direction: column; gap: var(--space-2); }
    .field__label, .field__check label { font-weight: var(--font-weight-strong); }
    input[type='text'], input[type='number'], input[type='date'], select {
      min-height: var(--size-button-height);
      padding: 0 var(--space-3);
      border: var(--border-width) solid var(--color-border-control);
      border-radius: var(--radius-control);
      background: var(--color-surface);
      color: var(--color-text);
      font: inherit;
      width: 100%;
    }
    input::placeholder { color: var(--color-text-muted); opacity: 1; }
    .field--invalid input:not([type='checkbox']), .field--invalid select { border: var(--border-width-strong) solid var(--color-danger); }
    .field__check { display: flex; align-items: center; gap: var(--space-3); min-height: var(--size-target-min); }
    .field__check input { width: 1.5rem; height: 1.5rem; margin: 0; accent-color: var(--color-accent); flex: none; }
    .field__check label { flex: 1; padding: var(--space-2) 0; cursor: pointer; }
    .field__help { margin: 0; color: var(--color-text-muted); font-size: var(--font-size-xs); }
    .field__error { margin: 0; color: var(--color-danger); font-size: var(--font-size-xs); font-weight: var(--font-weight-medium); display: flex; gap: var(--space-2); align-items: baseline; }
    .field__error::before {
      content: '!'; flex: none; display: inline-grid; place-items: center; width: 1.1rem; height: 1.1rem;
      border-radius: 50%; background: var(--color-danger); color: var(--color-text-on-accent); font-size: 0.75rem; font-weight: var(--font-weight-strong);
    }
  `,
})
export class DynamicFieldComponent {
  readonly field = input.required<FormFieldConfig>();
  readonly value = input<Step1Value>(null);
  /** Error ya filtrado por el padre: solo se pasa cuando debe verse (R-01.26). */
  readonly error = input<FieldError | null>(null);

  readonly valueChange = output<string | boolean>();
  readonly blurred = output<void>();

  protected readonly marker = t('form.requiredMarker');
  protected readonly selectPlaceholder = t('form.select.placeholder');

  protected readonly inputId = computed(() => `f-${this.field().documentId}`);
  protected readonly helpId = computed(() => `${this.inputId()}-help`);
  protected readonly errorId = computed(() => `${this.inputId()}-error`);
  protected readonly text = computed(() => (typeof this.value() === 'string' ? (this.value() as string) : ''));
  protected readonly attrs = computed(() => inputAttributesForRole(this.field().semanticRole));
  protected readonly spellcheck = computed(() => {
    const flag = this.attrs().spellcheck;
    return flag === undefined ? null : String(flag);
  });
  protected readonly describedBy = computed(() => {
    const ids = [this.field().helpText ? this.helpId() : null, this.error() ? this.errorId() : null].filter(
      (id): id is string => id !== null,
    );
    return ids.length > 0 ? ids.join(' ') : null;
  });

  protected onInput(event: Event): void {
    const el = event.target;
    if (el instanceof HTMLInputElement || el instanceof HTMLSelectElement) this.valueChange.emit(el.value);
  }

  protected onCheck(event: Event): void {
    const el = event.target;
    if (el instanceof HTMLInputElement) this.valueChange.emit(el.checked);
  }
}
