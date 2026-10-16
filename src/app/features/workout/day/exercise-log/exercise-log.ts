import {
  ChangeDetectionStrategy,
  Component,
  OutputEmitterRef,
  computed,
  input,
  output,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { ButtonDirective, ButtonIcon, ButtonLabel } from 'primeng/button';
import { Tag } from 'primeng/tag';
import { WorkoutExercise } from '../../../../core/models';
import { statusSeverity } from '../../../../shared/ui/exercise-item/exercise-status';
import { ExerciseActions } from '../exercise-actions/exercise-actions';
import { allSetsDone, recordedCount } from '../exercise-sections';
import { SetInput, SetRow } from '../set-rows';

export interface SetInputChange {
  setNo: number;
  input: SetInput;
}

/**
 * One exercise of the workout: the plan at a glance and a row per set with kg, reps and ✓. Extra
 * actions (replace, skip, finish early) stay folded behind a button, out of the way of the sets.
 */
@Component({
  selector: 'app-exercise-log',
  imports: [
    RouterLink,
    TranslocoPipe,
    ButtonDirective,
    ButtonIcon,
    ButtonLabel,
    Tag,
    ExerciseActions,
  ],
  templateUrl: './exercise-log.html',
  styleUrl: './exercise-log.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExerciseLog {
  readonly entry = input.required<WorkoutExercise>();
  readonly rows = input.required<readonly SetRow[]>();
  /** Rows are read-only while another day has a workout in progress. */
  readonly locked = input(false);
  /** URL of this workout day, so the exercise form comes back here after saving. */
  readonly returnTo = input.required<string>();
  /** Name of the exercise this one replaces, when it was added during the workout. */
  readonly replaces = input<string>();

  readonly inputChange = output<SetInputChange>();
  readonly doneToggle = output<number>();
  readonly addSet = output<void>();
  readonly removeSet = output<void>();
  readonly markAll = output<void>();
  readonly startRest = output<void>();
  /** Moves the exercise to the finished ones as completed: every set done, or ended early. */
  readonly complete = output<void>();
  /** Not done today: moves to the finished ones as not performed. */
  readonly skip = output<void>();
  /** Asks for an exercise to do in its place. */
  readonly replace = output<void>();
  /** Takes an exercise added during the workout, still without sets, out of it. */
  readonly removeSubstitute = output<void>();

  protected readonly exercise = computed(() => this.entry().exercise);
  protected readonly headingId = computed(() => `exercise-${this.exercise().id}`);
  protected readonly statusSeverity = computed(() => statusSeverity(this.exercise().stato));
  protected readonly equipment = computed(() =>
    [this.exercise().attrezzo, this.exercise().posizione].filter(Boolean).join(' · '),
  );
  protected readonly allDone = computed(() => allSetsDone(this.rows()));
  protected readonly recorded = computed(() => recordedCount(this.rows()));
  /** Added during the workout: it belongs to another day or plan, so it is not edited from here. */
  protected readonly isSubstitute = computed(() => this.entry().replaces !== undefined);
  protected readonly moreOpen = signal(false);
  protected readonly moreId = computed(() => `exercise-${this.exercise().id}-more`);
  /** "All done" is offered when at least two complete sets are still to be marked. */
  protected readonly canMarkAll = computed(
    () => this.rows().filter((row) => row.logId === undefined && row.values).length > 1,
  );

  /** Folds the extra actions away and runs the chosen one. */
  protected choose(action: OutputEmitterRef<void>): void {
    this.moreOpen.set(false);
    action.emit();
  }
}
