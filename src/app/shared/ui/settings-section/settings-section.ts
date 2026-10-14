import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** A titled block of the settings page; the control is projected as content. */
@Component({
  selector: 'app-settings-section',
  template: `
    <section class="section">
      <h2 class="section__title" [id]="headingId() || null">{{ title() }}</h2>
      @if (description()) {
        <p class="section__description">{{ description() }}</p>
      }
      <ng-content />
    </section>
  `,
  styles: `
    .section {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      padding: 1rem;
      border: 1px solid var(--p-content-border-color);
      border-radius: 12px;
      background: var(--p-content-background);
    }
    .section__title {
      margin: 0;
      font-size: 1rem;
    }
    .section__description {
      margin: 0;
      color: var(--p-text-muted-color);
      font-size: 0.875rem;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsSection {
  readonly title = input.required<string>();
  readonly description = input<string>('');
  /** Lets a projected control reference the title via aria-labelledby. */
  readonly headingId = input<string>('');
}
