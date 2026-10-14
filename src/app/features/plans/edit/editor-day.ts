import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { ButtonDirective, ButtonIcon, ButtonLabel } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { MoveDirection, PlanDay, WEEKDAYS, Weekday } from '../../../core/models';

export interface ExerciseMove {
  exerciseId: number;
  direction: MoveDirection;
}

/** One day in the editor: name, weekday, order, and its exercises with order and edit links. */
@Component({
  selector: 'app-editor-day',
  imports: [RouterLink, TranslocoPipe, ButtonDirective, ButtonIcon, ButtonLabel, InputText],
  templateUrl: './editor-day.html',
  styleUrl: './editor-day.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditorDay {
  readonly planDay = input.required<PlanDay>();
  readonly planId = input.required<number>();
  readonly isFirst = input(false);
  readonly isLast = input(false);

  readonly rename = output<string>();
  readonly weekdayChange = output<Weekday | undefined>();
  readonly move = output<MoveDirection>();
  readonly remove = output<void>();
  readonly moveExercise = output<ExerciseMove>();

  protected readonly weekdays = WEEKDAYS;

  protected onWeekday(value: string): void {
    this.weekdayChange.emit(value ? (Number(value) as Weekday) : undefined);
  }
}
