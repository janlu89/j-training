import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { EmptyState } from '../../shared/ui/empty-state/empty-state';

@Component({
  selector: 'app-analytics-page',
  imports: [EmptyState, TranslocoPipe],
  template: `
    <app-empty-state
      icon="pi pi-chart-line"
      [title]="'analytics.empty.title' | transloco"
      [message]="'analytics.empty.message' | transloco"
    />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnalyticsPage {}
