import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe } from '@jsverse/transloco';
import { ToggleSwitch } from 'primeng/toggleswitch';

/**
 * Active / archived state of a plan as a switch. Turning a plan on archives the active one, so
 * exactly one plan stays active by construction; turning it off leaves no active plan.
 */
@Component({
  selector: 'app-plan-active-switch',
  imports: [FormsModule, TranslocoPipe, ToggleSwitch],
  template: `
    <label class="switch">
      <span class="switch__state" aria-hidden="true">
        {{ (active() ? 'plans.status.active' : 'plans.status.archived') | transloco }}
      </span>
      <p-toggleswitch
        [ngModel]="active()"
        [ariaLabel]="'plans.activeToggle' | transloco: { name: name() }"
        (onChange)="activeChange.emit($event.checked)"
      />
    </label>
  `,
  styles: `
    .switch {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      min-height: 2.75rem;
      cursor: pointer;
    }
    .switch__state {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--p-text-muted-color);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlanActiveSwitch {
  readonly name = input.required<string>();
  readonly active = input.required<boolean>();
  readonly activeChange = output<boolean>();
}
