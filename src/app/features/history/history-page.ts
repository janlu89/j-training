import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { EmptyState } from '../../shared/ui/empty-state/empty-state';

@Component({
  selector: 'app-history-page',
  imports: [EmptyState, TranslocoPipe],
  template: `
    <app-empty-state
      icon="pi pi-history"
      [title]="'history.empty.title' | transloco"
      [message]="'history.empty.message' | transloco"
    />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HistoryPage {}
