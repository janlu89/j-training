import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { ParsedPlan } from '../../../core/models';

/** What the import will create: days with their exercise counts. */
@Component({
  selector: 'app-import-summary',
  imports: [TranslocoPipe],
  templateUrl: './import-summary.html',
  styleUrl: './import-summary.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImportSummary {
  readonly plan = input.required<ParsedPlan>();

  protected readonly days = computed(() =>
    this.plan().days.map((day) => ({
      ...day,
      exerciseCount: this.plan().exercises.filter((exercise) => exercise.dayKey === day.key).length,
    })),
  );
}
