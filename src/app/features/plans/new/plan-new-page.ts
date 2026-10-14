import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { ButtonDirective, ButtonIcon, ButtonLabel } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { PhaseRepository } from '../../../core/repositories/phase.repository';
import { PlanEditorRepository } from '../../../core/repositories/plan-editor.repository';

/** Creates an empty plan, then opens the editor to add days and exercises. */
@Component({
  selector: 'app-plan-new-page',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    TranslocoPipe,
    ButtonDirective,
    ButtonIcon,
    ButtonLabel,
    InputText,
  ],
  templateUrl: './plan-new-page.html',
  styleUrl: './plan-new-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlanNewPage implements OnInit {
  private readonly editor = inject(PlanEditorRepository);
  private readonly phases = inject(PhaseRepository);
  private readonly router = inject(Router);

  protected readonly busy = signal(false);
  protected readonly form = inject(NonNullableFormBuilder).group({
    name: ['', [Validators.required, Validators.maxLength(60)]],
    fase: [1, [Validators.required, Validators.min(1)]],
    activate: [true],
  });

  /** Proposes the phase after the highest one already stored. */
  async ngOnInit(): Promise<void> {
    const highest = (await this.phases.getAll()).reduce(
      (max, phase) => Math.max(max, phase.fase),
      0,
    );
    if (this.form.controls.fase.pristine) {
      this.form.controls.fase.setValue(highest + 1);
    }
  }

  protected async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { name, fase, activate } = this.form.getRawValue();
    this.busy.set(true);
    try {
      const id = await this.editor.createPlan({ name: name.trim(), fase }, activate);
      await this.router.navigate(['/plans', id, 'edit']);
    } finally {
      this.busy.set(false);
    }
  }
}
