import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Tag } from 'primeng/tag';
import { ClosedRows, recordedSummary } from '../exercise-sections';

type ClosedLabel = 'completed' | 'skipped' | 'replaced';

const LABEL_SEVERITY: Record<ClosedLabel, 'success' | 'secondary' | 'info'> = {
  completed: 'success',
  skipped: 'secondary',
  replaced: 'info',
};

/** A skipped exercise with something done in its place reads as replaced. */
function labelOf({ outcome, replacedBy }: ClosedRows): ClosedLabel {
  return outcome === 'skipped' && replacedBy.length ? 'replaced' : outcome;
}

/**
 * The finished exercises at the bottom of the workout page: collapsed, one compact row each, so
 * the exercises still to do stay at hand. Any of them can be moved back up.
 */
@Component({
  selector: 'app-closed-exercises',
  imports: [TranslocoPipe, Tag],
  templateUrl: './closed-exercises.html',
  styleUrl: './closed-exercises.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClosedExercises {
  /** Finished exercises, in the order they were closed. */
  readonly items = input.required<readonly ClosedRows[]>();
  readonly language = input.required<string>();
  /** Read-only while another day has a workout in progress. */
  readonly locked = input(false);

  /** Id of the exercise to bring back among those to do. */
  readonly reopen = output<number>();

  protected readonly rows = computed(() =>
    this.items().map((item) => {
      const label = labelOf(item);
      return {
        item,
        exercise: item.entry.exercise,
        label,
        severity: LABEL_SEVERITY[label],
        summary: recordedSummary(item.rows, this.language()),
      };
    }),
  );
}
