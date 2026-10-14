import { ChangeDetectionStrategy, Component, effect, inject, input, output } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslocoPipe } from '@jsverse/transloco';
import { ButtonDirective, ButtonLabel } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { Phase, PlanInput } from '../../../core/models';

/** Name and phase number of a plan. */
@Component({
  selector: 'app-plan-details-form',
  imports: [ReactiveFormsModule, TranslocoPipe, ButtonDirective, ButtonLabel, InputText],
  templateUrl: './plan-details-form.html',
  styleUrl: './plan-details-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlanDetailsForm {
  readonly phase = input.required<Phase>();
  readonly save = output<PlanInput>();

  protected readonly form = inject(NonNullableFormBuilder).group({
    name: ['', [Validators.required, Validators.maxLength(60)]],
    fase: [1, [Validators.required, Validators.min(1)]],
  });

  constructor() {
    // The plan is a live query: refresh the fields from storage unless the user is editing them.
    effect(() => {
      const { name, fase } = this.phase();
      if (!this.form.dirty) {
        this.form.reset({ name, fase });
      }
    });
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { name, fase } = this.form.getRawValue();
    this.save.emit({ name: name.trim(), fase });
    this.form.markAsPristine();
  }
}
