import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { EmptyState } from '../../shared/ui/empty-state/empty-state';

@Component({
  selector: 'app-schedule-page',
  imports: [EmptyState, TranslocoPipe],
  template: `
    <app-empty-state
      icon="pi pi-list"
      [title]="'schedule.empty.title' | transloco"
      [message]="'schedule.empty.message' | transloco"
    />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SchedulePage {}
