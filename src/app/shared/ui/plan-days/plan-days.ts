import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { TranslocoPipe } from '@jsverse/transloco';
import { PlanDay, WEEKDAYS, Weekday } from '../../../core/models';
import { ExerciseItem } from '../exercise-item/exercise-item';

export interface WeekdayChange {
  dayId: number;
  weekday: Weekday | undefined;
}

/** The days of a plan, each with its exercises and an optional weekday. */
@Component({
  selector: 'app-plan-days',
  imports: [NgTemplateOutlet, ExerciseItem, TranslocoPipe],
  templateUrl: './plan-days.html',
  styleUrl: './plan-days.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlanDays {
  readonly days = input.required<readonly PlanDay[]>();
  readonly language = input.required<string>();
  /** False when a single day is shown on its own (workout page). */
  readonly collapsible = input(true);
  readonly weekdayChange = output<WeekdayChange>();

  protected readonly weekdays = WEEKDAYS;

  protected onWeekdaySelected(dayId: number, value: string): void {
    this.weekdayChange.emit({ dayId, weekday: value ? (Number(value) as Weekday) : undefined });
  }
}
