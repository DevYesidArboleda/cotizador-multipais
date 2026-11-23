import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  inject,
  input,
  linkedSignal,
  untracked,
} from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { NOW } from '../../core/clock';
import { FORM_SECTIONS } from '../../core/contracts/strapi-contracts';
import type { FieldError, FormConfig, FormFieldConfig, FormSection, Step1Values } from '../../core/contracts/strapi-contracts';
import { QuoteStore } from '../../core/quote/quote.store';
import { isErrorVisible, normalizeFieldValue } from '../../domain/form/field-validators';
import { hydrateValues, initialControlValue } from '../../domain/form/form-hydration';
import { dependentFieldIds, validateStep1 } from '../../domain/form/validate-step1';
import type { UiCopyKey } from '../../i18n/ui-copy.es';
import { t, validationSummary } from '../../i18n/ui-copy';
import { DynamicFieldComponent } from '../../shared/dynamic-field/dynamic-field.component';

type FormControls = Record<string, FormControl<string | boolean>>;

const SECTION_COPY: Record<FormSection, UiCopyKey> = {
  policyholder: 'form.section.policyholder',
  vehicle: 'form.section.vehicle',
};

/**
 * Formulario dinámico del Paso 1 (R-01.2, R-01.3, R-01.7, R-01.8). Solo orquesta: la validación es la función
 * pura `validateStep1`, los valores viven en un `FormGroup` tipado construido desde la configuración y se
 * persisten por `documentId` en el `QuoteStore`.
 */
@Component({
  selector: 'app-step-1-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DynamicFieldComponent],
  template: `
    <form class="form card" novalidate (submit)="onSubmit($event)">
      <p class="form__note">{{ requiredNote }}</p>
      @for (section of sections(); track section.section) {
        <fieldset class="form__section">
          <legend class="form__legend">{{ section.title }}</legend>
          <div class="form__grid">
            @for (row of section.rows; track row.field.documentId) {
              <div class="form__cell" [class.form__cell--wide]="row.field.type === 'checkbox'">
                <app-dynamic-field
                  [field]="row.field"
                  [value]="row.value"
                  [error]="row.error"
                  (valueChange)="onValueChange(row.field, $event)"
                  (blurred)="onBlur(row.field)"
                />
              </div>
            }
          </div>
        </fieldset>
      }
      <div class="form__actions">
        <p class="form__summary" aria-live="polite" aria-atomic="true">{{ summary() }}</p>
        <button type="submit" class="btn">{{ continueLabel }}</button>
      </div>
    </form>
  `,
  styles: `
    .form { max-width: var(--form-max); margin: 0 auto var(--space-6); }
    .form__note { margin: 0 0 var(--space-4); color: var(--color-text-muted); font-size: var(--font-size-xs); }
    .form__section { border: 0; margin: 0 0 var(--space-5); padding: 0; min-width: 0; }
    .form__legend { padding: 0; margin-bottom: var(--space-3); font-size: var(--font-size-h2); font-weight: var(--font-weight-strong); }
    .form__grid { display: grid; grid-template-columns: 1fr; gap: var(--space-4); }
    .form__actions { display: flex; flex-direction: column; gap: var(--space-3); }
    .form__actions .btn { width: 100%; }
    .form__summary { margin: 0; min-height: 1.5rem; color: var(--color-danger); font-weight: var(--font-weight-medium); }
    @media (min-width: 768px) {
      .form__grid { grid-template-columns: 1fr 1fr; gap: var(--space-4) var(--space-5); }
      .form__cell--wide { grid-column: 1 / -1; }
      .form__actions { flex-direction: row-reverse; align-items: center; justify-content: space-between; }
      .form__actions .btn { width: auto; }
    }
  `,
})
export class Step1FormComponent {
  readonly config = input.required<FormConfig>();
  /** Código de país de la ruta, para navegar al Paso 2. */
  readonly country = input.required<string>();

  private readonly quote = inject(QuoteStore);
  private readonly router = inject(Router);
  private readonly now = inject(NOW);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);

  protected readonly requiredNote = t('form.requiredNote');
  protected readonly continueLabel = t('button.continue');

  /** Campos que un guard marcó como tocados (se consumen una sola vez, R-01.10). */
  private readonly guardTouched = this.quote.consumePendingTouch();

  /** Hidratación tolerante: solo claves vigentes de tipo compatible (R-01.9); nada se escribe hasta el primer cambio. */
  protected readonly form = computed(() => {
    const config = this.config();
    const { values } = hydrateValues(config, untracked(() => this.quote.state().step1));
    const controls: FormControls = {};
    for (const field of config.fields) {
      controls[field.documentId] = new FormControl(initialControlValue(field, values[field.documentId]), {
        nonNullable: true,
      });
    }
    return new FormGroup<FormControls>(controls);
  });

  protected readonly values = linkedSignal<FormGroup<FormControls>, Step1Values>({
    source: this.form,
    computation: (group) => group.getRawValue(),
  });
  private readonly touched = linkedSignal<FormGroup<FormControls>, ReadonlySet<string>>({
    source: this.form,
    computation: () => new Set(this.guardTouched),
  });
  private readonly submitted = linkedSignal<FormGroup<FormControls>, boolean>({
    source: this.form,
    computation: () => this.guardTouched.length > 0,
  });

  private readonly errors = computed(() => validateStep1(this.config(), this.values(), this.now()));
  private readonly errorById = computed(() => new Map(this.errors().map((e) => [e.fieldDocumentId, e])));

  protected readonly summary = computed(() => (this.submitted() ? validationSummary(this.errors().length) : ''));

  protected readonly sections = computed(() =>
    FORM_SECTIONS.map((section) => ({
      section,
      title: t(SECTION_COPY[section]),
      rows: this.config()
        .fields.filter((f) => f.section === section)
        .map((field) => ({
          field,
          value: this.values()[field.documentId] ?? null,
          error: this.visibleError(field),
        })),
    })).filter((s) => s.rows.length > 0),
  );

  private visibleError(field: FormFieldConfig): FieldError | null {
    const error = this.errorById().get(field.documentId) ?? null;
    return isErrorVisible(error, this.touched().has(field.documentId), this.submitted()) ? error : null;
  }

  protected onValueChange(field: FormFieldConfig, value: string | boolean): void {
    this.form().controls[field.documentId]?.setValue(value);
    this.sync();
    // Cambiar el tipo de documento revalida de inmediato el número si ya tiene valor (R-01.16, AC-01.13).
    const dependents = dependentFieldIds(this.config(), field, this.values());
    if (dependents.length > 0) this.touched.update((set) => new Set([...set, ...dependents]));
  }

  protected onBlur(field: FormFieldConfig): void {
    this.touched.update((set) => new Set(set).add(field.documentId));
    this.normalize([field]);
  }

  protected onSubmit(event: Event): void {
    event.preventDefault();
    this.normalize(this.config().fields);
    this.submitted.set(true);
    if (this.errors().length > 0) {
      afterNextRender(
        () => this.host.nativeElement.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(),
        { injector: this.injector },
      );
      return;
    }
    void this.router.navigate(['/', this.country(), 'quote', 'step-2']);
  }

  /** Aplica la normalización por rol (placa, correo, RUT) al valor guardado (R-01.18, R-01.19, R-01.29). */
  private normalize(fields: readonly FormFieldConfig[]): void {
    const group = this.form();
    for (const field of fields) {
      const control = group.controls[field.documentId];
      if (!control) continue;
      const normalized = normalizeFieldValue(field, control.value);
      if (normalized !== control.value && normalized !== null) control.setValue(normalized);
    }
    this.sync();
  }

  /** Refleja el grupo en la señal de valores y lo persiste por `documentId` (R-01.8). */
  private sync(): void {
    const raw = this.form().getRawValue();
    this.values.set(raw);
    this.quote.setStep1Values(raw);
  }
}
