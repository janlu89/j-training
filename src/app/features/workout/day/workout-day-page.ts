import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { ConfirmationService } from 'primeng/api';
import { ButtonDirective, ButtonIcon, ButtonLabel } from 'primeng/button';
import { ConfirmDialog } from 'primeng/confirmdialog';
import { Message } from 'primeng/message';
import { Tag } from 'primeng/tag';
import { LoadUpdate, OpenSession, TrainingDay } from '../../../core/models';
import { LanguageService } from '../../../core/services/language.service';
import { formatRest } from '../../../core/services/rest-timer/rest-timer.service';
import { LocalDatePipe } from '../../../shared/pipes/local-date.pipe';
import { EmptyState } from '../../../shared/ui/empty-state/empty-state';
import { ExerciseLog } from './exercise-log/exercise-log';
import { FinishDayDialog } from './finish-day-dialog/finish-day-dialog';
import { WorkoutDayStore } from './workout-day-store';

/** The workout of one day: record sets during or after training, then save or skip the day. */
@Component({
  selector: 'app-workout-day-page',
  imports: [
    RouterLink,
    TranslocoPipe,
    ButtonDirective,
    ButtonIcon,
    ButtonLabel,
    ConfirmDialog,
    Message,
    Tag,
    LocalDatePipe,
    EmptyState,
    ExerciseLog,
    FinishDayDialog,
  ],
  providers: [WorkoutDayStore, ConfirmationService],
  templateUrl: './workout-day-page.html',
  styleUrl: './workout-day-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkoutDayPage {
  private readonly confirmation = inject(ConfirmationService);
  private readonly transloco = inject(TranslocoService);
  private readonly router = inject(Router);

  protected readonly store = inject(WorkoutDayStore);
  protected readonly language = inject(LanguageService).current;
  protected readonly finishing = signal(false);
  protected readonly busy = signal(false);
  protected readonly returnTo = computed(() => `/workout/day/${this.store.dayId()}`);
  protected readonly exerciseRestTime = computed(() =>
    formatRest(this.store.exerciseRestSeconds() * 1000),
  );

  protected async finish(loads: LoadUpdate[]): Promise<void> {
    await this.run(async () => {
      await this.store.save(loads);
      this.finishing.set(false);
      await this.router.navigateByUrl('/workout');
    });
  }

  protected confirmSkip(day: TrainingDay): void {
    this.confirmation.confirm({
      header: this.transloco.translate('workout.skip.title'),
      message: this.transloco.translate('workout.skip.confirm', { day: this.dayName(day) }),
      acceptLabel: this.transloco.translate('workout.skip.accept'),
      rejectLabel: this.transloco.translate('editor.confirm.cancel'),
      rejectButtonProps: { severity: 'secondary' },
      accept: () =>
        void this.run(async () => {
          await this.store.skip();
          await this.router.navigateByUrl('/workout');
        }),
    });
  }

  protected confirmDiscard(open: OpenSession): void {
    this.confirmation.confirm({
      header: this.transloco.translate('workout.discard.title'),
      message: this.transloco.translate('workout.discard.confirm', { day: this.dayName(open.day) }),
      acceptLabel: this.transloco.translate('workout.discard.accept'),
      rejectLabel: this.transloco.translate('editor.confirm.cancel'),
      acceptButtonProps: { severity: 'danger' },
      rejectButtonProps: { severity: 'secondary' },
      accept: () => void this.run(() => this.store.discard(open)),
    });
  }

  /** "Giorno 2 · Petto": the translated label plus the user's name for the day. */
  protected dayName(day: TrainingDay): string {
    const label = this.transloco.translate('plan.day', { number: day.ordine });
    return day.csvGiorno ? `${label} · ${day.csvGiorno}` : label;
  }

  private async run(action: () => Promise<void>): Promise<void> {
    this.busy.set(true);
    try {
      await action();
    } finally {
      this.busy.set(false);
    }
  }
}
