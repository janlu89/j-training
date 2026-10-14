import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { PlanDay } from '../../../core/models';

/** Compact row of day buttons ("G1 G2 G3"); the suggested day carries a dot. */
@Component({
  selector: 'app-day-picker',
  imports: [TranslocoPipe],
  templateUrl: './day-picker.html',
  styleUrl: './day-picker.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DayPicker {
  readonly days = input.required<readonly PlanDay[]>();
  readonly selectedId = input<number>();
  readonly suggestedId = input<number>();
  readonly selectedIdChange = output<number>();
}
