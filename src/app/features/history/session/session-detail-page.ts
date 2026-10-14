import { ChangeDetectionStrategy, Component, inject, input, numberAttribute } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { Tag } from 'primeng/tag';
import { HistoryRepository } from '../../../core/repositories/history.repository';
import { LanguageService } from '../../../core/services/language.service';
import { LocalDatePipe } from '../../../shared/pipes/local-date.pipe';
import { EmptyState } from '../../../shared/ui/empty-state/empty-state';
import { SetChips } from '../set-chips/set-chips';

/** One saved workout: every exercise with the sets actually done. */
@Component({
  selector: 'app-session-detail-page',
  imports: [RouterLink, TranslocoPipe, Tag, LocalDatePipe, EmptyState, SetChips],
  templateUrl: './session-detail-page.html',
  styleUrl: './session-detail-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SessionDetailPage {
  private readonly history = inject(HistoryRepository);

  /** Route parameter, bound by `withComponentInputBinding`. */
  readonly sessionId = input.required({ transform: numberAttribute });

  protected readonly language = inject(LanguageService).current;
  protected readonly detail = rxResource({
    params: () => this.sessionId(),
    stream: ({ params: id }) => this.history.watchSession(id),
  });
}
