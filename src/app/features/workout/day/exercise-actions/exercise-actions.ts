import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';

/**
 * The extra actions of an exercise, for today only: do another one in its place, skip it, or
 * finish it with the sets done so far. The plan never changes from here.
 */
@Component({
  selector: 'app-exercise-actions',
  imports: [TranslocoPipe],
  templateUrl: './exercise-actions.html',
  styleUrl: './exercise-actions.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExerciseActions {
  /** Added during the workout: without sets it is removed rather than skipped. */
  readonly substitute = input(false);
  /** Sets recorded so far. */
  readonly recorded = input.required<number>();
  /** Every set is done: completing it is the main button of the card, not an extra action. */
  readonly allDone = input(false);

  readonly replace = output<void>();
  readonly skip = output<void>();
  readonly finishHere = output<void>();
  readonly removeSubstitute = output<void>();
}
