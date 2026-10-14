import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { Tag } from 'primeng/tag';
import { WorkoutExercise } from '../../../../core/models';
import { formatRest } from '../../../../core/services/rest-timer/rest-timer.service';
import { statusSeverity } from '../../../../shared/ui/exercise-item/exercise-status';
import { SetInput, SetRow } from '../set-rows';

/** The running rest, when it belongs to this exercise. */
export interface ExerciseRest {
  afterSet?: number;
  /** Time left, formatted ("1:45"). */
  remaining: string;
  finished: boolean;
}

export interface SetInputChange {
  setNo: number;
  input: SetInput;
}

/**
 * One exercise of the workout: the plan at a glance, a row per set with kg, reps and ✓, and the
 * rest between the sets (live while it runs).
 */
@Component({
  selector: 'app-exercise-log',
  imports: [RouterLink, TranslocoPipe, Tag],
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
  readonly rest = input<ExerciseRest | null>(null);

  readonly inputChange = output<SetInputChange>();
  readonly doneToggle = output<number>();
  readonly addSet = output<void>();
  readonly removeSet = output<void>();
  readonly markAll = output<void>();
  /** The set the rest follows, or undefined when started from the plan line. */
  readonly startRest = output<number | undefined>();

  protected readonly exercise = computed(() => this.entry().exercise);
  protected readonly headingId = computed(() => `exercise-${this.exercise().id}`);
  protected readonly statusSeverity = computed(() => statusSeverity(this.exercise().stato));
  protected readonly equipment = computed(() =>
    [this.exercise().attrezzo, this.exercise().posizione].filter(Boolean).join(' · '),
  );
  /** The planned rest as a clock ("2:30"), shown between the sets. */
  protected readonly restLabel = computed(() => formatRest((this.exercise().recSec ?? 0) * 1000));
  /** "All done" is offered when at least two complete sets are still to be marked. */
  protected readonly canMarkAll = computed(
    () => this.rows().filter((row) => row.logId === undefined && row.values).length > 1,
  );
}
