import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { formatRest } from '../../../../core/services/rest-timer/rest-timer.service';

/**
 * The rest between two sets: the planned time, which starts the rest when tapped, or the live
 * countdown while this rest is running.
 */
@Component({
  selector: 'app-set-rest',
  imports: [TranslocoPipe],
  template: `
    @if (running()) {
      <span class="rest rest--running">
        <i class="pi pi-stopwatch" aria-hidden="true"></i>
        {{ finished() ? ('timer.over' | transloco) : remaining() }}
      </span>
    } @else {
      <button
        type="button"
        class="rest"
        [disabled]="locked()"
        [attr.aria-label]="'timer.startAfter' | transloco: { sec: seconds(), set: afterSet() }"
        (click)="restStart.emit()"
      >
        <i class="pi pi-stopwatch" aria-hidden="true"></i>
        {{ planned() }}
      </button>
    }
  `,
  styles: `
    .rest {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      min-height: 1.75rem;
      padding: 0 0.75rem;
      border: 0;
      border-radius: 999px;
      background: none;
      color: var(--p-text-muted-color);
      font: inherit;
      font-size: 0.8125rem;
      font-variant-numeric: tabular-nums;
    }
    .rest i {
      font-size: 0.6875rem;
    }
    button.rest {
      cursor: pointer;
    }
    button.rest:hover:not(:disabled) {
      background: var(--p-content-hover-background);
    }
    button.rest:focus-visible {
      outline: 2px solid var(--p-primary-color);
      outline-offset: 1px;
    }
    .rest--running {
      background: var(--p-primary-50);
      color: var(--p-primary-800);
      font-weight: 700;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SetRest {
  readonly seconds = input.required<number>();
  readonly afterSet = input.required<number>();
  readonly running = input(false);
  /** Time left while running, already formatted. */
  readonly remaining = input('');
  readonly finished = input(false);
  readonly locked = input(false);
  readonly restStart = output<void>();

  protected readonly planned = computed(() => formatRest(this.seconds() * 1000));
}
