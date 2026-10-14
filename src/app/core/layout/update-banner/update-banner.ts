import { ChangeDetectionStrategy, Component, output } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';

/** A new version is ready: reloading is the user's choice. Native button, like the timer bar. */
@Component({
  selector: 'app-update-banner',
  imports: [TranslocoPipe],
  template: `
    <div class="update" role="status">
      <i class="pi pi-sparkles update__icon" aria-hidden="true"></i>
      <span class="update__text">{{ 'update.ready' | transloco }}</span>
      <button type="button" class="update__action" (click)="reload.emit()">
        {{ 'update.reload' | transloco }}
      </button>
    </div>
  `,
  styles: `
    .update {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.25rem 0.5rem 0.25rem 1rem;
      background: var(--jt-navy-light);
      color: var(--jt-on-chrome);
      font-size: 0.875rem;
    }
    .update__icon {
      color: var(--jt-accent-on-dark);
    }
    .update__text {
      flex: 1;
    }
    .update__action {
      min-height: 2.75rem;
      padding: 0 0.75rem;
      border: 0;
      border-radius: 8px;
      background: transparent;
      color: var(--jt-accent-on-dark);
      font: inherit;
      font-weight: 700;
      cursor: pointer;
    }
    .update__action:focus-visible {
      outline: 2px solid var(--jt-accent-on-dark);
      outline-offset: 2px;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UpdateBanner {
  readonly reload = output<void>();
}
