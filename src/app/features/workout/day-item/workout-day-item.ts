import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { Tag } from 'primeng/tag';
import { PlanDay, Session } from '../../../core/models';
import { LocalDatePipe } from '../../../shared/pipes/local-date.pipe';

/** How a day is highlighted in the list: proposed for today, or the next one to train. */
export type DayBadge = 'today' | 'next';

/** One day of the active plan: its label, when it was last trained, and ▶ to open it. */
@Component({
  selector: 'app-workout-day-item',
  imports: [RouterLink, TranslocoPipe, Tag, LocalDatePipe],
  templateUrl: './workout-day-item.html',
  styleUrl: './workout-day-item.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkoutDayItem {
  readonly planDay = input.required<PlanDay>();
  readonly language = input.required<string>();
  readonly badge = input<DayBadge>();
  readonly inProgress = input(false);
  readonly lastSession = input<Session>();
}
