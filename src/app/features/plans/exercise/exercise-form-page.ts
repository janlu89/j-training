import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  numberAttribute,
  resource,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { ConfirmationService } from 'primeng/api';
import { ButtonDirective, ButtonIcon, ButtonLabel } from 'primeng/button';
import { ConfirmDialog } from 'primeng/confirmdialog';
import { InputText } from 'primeng/inputtext';
import { ExerciseRepository } from '../../../core/repositories/exercise.repository';
import { PlanEditorRepository } from '../../../core/repositories/plan-editor.repository';
import { PlanRepository } from '../../../core/repositories/plan.repository';
import {
  EQUIPMENT,
  EXERCISE_TYPES,
  defaultRestFor,
} from '../../../core/services/exercise-defaults';
import {
  EDITABLE_STATUSES,
  LOAD_UNITS,
  REST_PRESETS,
  buildExerciseForm,
  toExerciseInput,
  toFormValue,
} from './exercise-form';

/** Route ids are optional here: `dayId` for a new exercise, `exerciseId` when editing. */
function optionalId(value: unknown): number | undefined {
  return value === undefined || value === null || value === '' ? undefined : numberAttribute(value);
}

/** Adds or edits one exercise of a plan. */
@Component({
  selector: 'app-exercise-form-page',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    TranslocoPipe,
    ButtonDirective,
    ButtonIcon,
    ButtonLabel,
    ConfirmDialog,
    InputText,
  ],
  providers: [ConfirmationService],
  templateUrl: './exercise-form-page.html',
  styleUrl: './exercise-form-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExerciseFormPage {
  private readonly plans = inject(PlanRepository);
  private readonly exercises = inject(ExerciseRepository);
  private readonly editor = inject(PlanEditorRepository);
  private readonly confirmation = inject(ConfirmationService);
  private readonly transloco = inject(TranslocoService);
  private readonly router = inject(Router);

  /** Route parameters, bound by `withComponentInputBinding`. */
  readonly id = input.required({ transform: numberAttribute });
  readonly dayId = input(undefined, { transform: optionalId });
  readonly exerciseId = input(undefined, { transform: optionalId });

  protected readonly types = EXERCISE_TYPES;
  protected readonly equipment = EQUIPMENT;
  protected readonly statuses = EDITABLE_STATUSES;
  protected readonly loadUnits = LOAD_UNITS;
  protected readonly restPresets = REST_PRESETS;
  protected readonly form = buildExerciseForm(inject(FormBuilder));
  protected readonly busy = signal(false);

  protected readonly data = resource({
    params: () => ({ planId: this.id(), exerciseId: this.exerciseId() }),
    loader: async ({ params }) => ({
      plan: await this.plans.getPlan(params.planId),
      exercise: params.exerciseId ? await this.exercises.getById(params.exerciseId) : undefined,
    }),
  });
  protected readonly isEdit = computed(() => this.exerciseId() !== undefined);
  protected readonly days = computed(
    () => this.data.value()?.plan?.days.map(({ day }) => day) ?? [],
  );

  constructor() {
    // Fill the form once the data is loaded: the stored exercise, or the day from the route.
    effect(() => {
      const exercise = this.data.value()?.exercise;
      const dayId = this.dayId();
      if (this.form.dirty) {
        return;
      }
      if (exercise) {
        this.form.reset(toFormValue(exercise));
      } else if (dayId) {
        this.form.controls.dayId.setValue(dayId);
      }
    });

    // Rest defaults follow the exercise type until the user sets the rest explicitly.
    this.form.controls.tipo.valueChanges.pipe(takeUntilDestroyed()).subscribe((tipo) => {
      const rest = defaultRestFor(tipo);
      if (rest !== undefined && this.form.controls.recSec.pristine) {
        this.form.controls.recSec.setValue(rest);
      }
    });
  }

  protected setRest(seconds: number): void {
    this.form.controls.recSec.setValue(seconds);
    this.form.controls.recSec.markAsDirty();
  }

  protected async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const exercise = toExerciseInput(value);
    this.busy.set(true);
    try {
      const exerciseId = this.exerciseId();
      if (exerciseId) {
        await this.editor.updateExercise(exerciseId, exercise, value.dayId);
      } else {
        await this.editor.addExercise(value.dayId, exercise);
      }
      await this.backToEditor();
    } finally {
      this.busy.set(false);
    }
  }

  protected confirmRemove(): void {
    const exerciseId = this.exerciseId();
    if (!exerciseId) {
      return;
    }
    this.confirmation.confirm({
      header: this.transloco.translate('editor.confirm.title'),
      message: this.transloco.translate('editor.exercise.deleteConfirm', {
        exercise: this.form.controls.esercizio.value,
      }),
      acceptLabel: this.transloco.translate('editor.confirm.delete'),
      rejectLabel: this.transloco.translate('editor.confirm.cancel'),
      acceptButtonProps: { severity: 'danger' },
      rejectButtonProps: { severity: 'secondary' },
      accept: async () => {
        await this.editor.removeExercise(exerciseId);
        await this.backToEditor();
      },
    });
  }

  private backToEditor(): Promise<boolean> {
    return this.router.navigate(['/plans', this.id(), 'edit']);
  }
}
