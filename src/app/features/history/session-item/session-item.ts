import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { Tag } from 'primeng/tag';
import { SessionSummary } from '../../../core/models';
import { LocalDatePipe } from '../../../shared/pipes/local-date.pipe';

/** One workout of the history list, linking to its detail. */
@Component({
  selector: 'app-session-item',
  imports: [RouterLink, TranslocoPipe, Tag, LocalDatePipe],
  templateUrl: './session-item.html',
  styleUrl: './session-item.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SessionItem {
  readonly item = input.required<SessionSummary>();
  readonly language = input.required<string>();
}
