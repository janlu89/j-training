import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { RestTimer } from '../../models';

/** Seconds added or removed by the ± buttons. */
export const REST_STEP_SECONDS = 15;

/**
 * The running rest above the bottom navigation: time left, ±15 s, stop. In the last seconds the
 * alarm starts, and a "stop the alarm" button replaces the other controls once the rest is over.
 * Native buttons only: the bar is part of the shell, so it must not pull PrimeNG into the
 * initial bundle.
 */
@Component({
  selector: 'app-rest-timer-bar',
  imports: [TranslocoPipe],
  templateUrl: './rest-timer-bar.html',
  styleUrl: './rest-timer-bar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RestTimerBar {
  readonly timer = input.required<RestTimer>();
  /** Time left, already formatted ("1:45"). */
  readonly remaining = input.required<string>();
  /** Elapsed share of the rest, from 0 to 1. */
  readonly progress = input.required<number>();
  readonly finished = input(false);
  /** The alarm is sounding: from the last seconds until the user stops it. */
  readonly ringing = input(false);

  readonly adjust = output<number>();
  readonly stop = output<void>();

  protected readonly step = REST_STEP_SECONDS;
}
