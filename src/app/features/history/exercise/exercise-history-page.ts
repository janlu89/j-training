import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { ButtonDirective, ButtonIcon, ButtonLabel } from 'primeng/button';
import { HistoryRepository } from '../../../core/repositories/history.repository';
import { LanguageService } from '../../../core/services/language.service';
import { LocalDatePipe } from '../../../shared/pipes/local-date.pipe';
import { SetChips } from '../set-chips/set-chips';

/** Every saved session of one exact exercise name, across plans, most recent first. */
@Component({
  selector: 'app-exercise-history-page',
  imports: [
    RouterLink,
    TranslocoPipe,
    ButtonDirective,
    ButtonIcon,
    ButtonLabel,
    LocalDatePipe,
    SetChips,
  ],
  templateUrl: './exercise-history-page.html',
  styleUrl: './exercise-history-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExerciseHistoryPage {
  private readonly history = inject(HistoryRepository);

  /** Route parameter: the exercise name, decoded by the router. */
  readonly name = input.required<string>();

  protected readonly language = inject(LanguageService).current;
  protected readonly sessions = rxResource({
    params: () => this.name(),
    stream: ({ params: name }) => this.history.watchExerciseHistory(name),
  });
}
