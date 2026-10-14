import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { LoadUnit, SetLog } from '../../../core/models';
import { LocalNumberPipe } from '../../../shared/pipes/local-number.pipe';

/** The sets of an exercise as compact "kg × reps" chips, with the load unit always shown. */
@Component({
  selector: 'app-set-chips',
  imports: [TranslocoPipe, LocalNumberPipe],
  template: `
    <div class="sets">
      <span class="sets__unit">{{ 'history.unit.' + unit() | transloco }}</span>
      <ol class="sets__list">
        @for (set of sets(); track set.id) {
          @let kg = set.kg | localNumber: language();
          <li
            class="sets__chip"
            [attr.aria-label]="'history.set' | transloco: { set: set.setNo, kg, rip: set.rip }"
          >
            {{ kg }} × {{ set.rip }}
          </li>
        }
      </ol>
    </div>
  `,
  styles: `
    .sets {
      display: flex;
      flex-wrap: wrap;
      align-items: baseline;
      gap: 0.375rem;
    }
    .sets__unit {
      font-size: 0.8125rem;
      color: var(--p-text-muted-color);
    }
    .sets__list {
      display: flex;
      flex-wrap: wrap;
      gap: 0.375rem;
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .sets__chip {
      padding: 0.125rem 0.5rem;
      border-radius: 999px;
      background: var(--p-surface-100);
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SetChips {
  readonly sets = input.required<readonly SetLog[]>();
  readonly unit = input.required<LoadUnit>();
  readonly language = input.required<string>();
}
