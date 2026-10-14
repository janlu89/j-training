import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { HistoryRepository } from '../../core/repositories/history.repository';
import { LanguageService } from '../../core/services/language.service';
import { LocalDatePipe } from '../../shared/pipes/local-date.pipe';
import { EmptyState } from '../../shared/ui/empty-state/empty-state';
import { SessionItem } from './session-item/session-item';

export type HistoryView = 'sessions' | 'exercises';

/** Query parameter `view`: anything but "exercises" shows the workouts. */
function toView(value: unknown): HistoryView {
  return value === 'exercises' ? 'exercises' : 'sessions';
}

/** Saved workouts by date, or the exercises trained, each leading to its details. */
@Component({
  selector: 'app-history-page',
  imports: [RouterLink, TranslocoPipe, LocalDatePipe, EmptyState, SessionItem],
  templateUrl: './history-page.html',
  styleUrl: './history-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HistoryPage {
  private readonly history = inject(HistoryRepository);

  /** Bound from the query parameter, so the chosen view survives reloads and back navigation. */
  readonly view = input<HistoryView, unknown>('sessions', { transform: toView });

  protected readonly language = inject(LanguageService).current;
  protected readonly sessions = toSignal(this.history.watchSessions());
  protected readonly exercises = toSignal(this.history.watchExercises(), { initialValue: [] });
}
