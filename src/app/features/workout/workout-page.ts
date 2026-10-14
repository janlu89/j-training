import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { ButtonDirective, ButtonIcon, ButtonLabel } from 'primeng/button';
import { LanguageService } from '../../core/services/language.service';
import { WorkoutPlanService } from '../../core/services/workout-plan.service';
import { WorkoutSessionService } from '../../core/services/workout-session.service';
import { LocalDatePipe } from '../../shared/pipes/local-date.pipe';
import { EmptyState } from '../../shared/ui/empty-state/empty-state';
import { BackupReminder } from './backup-reminder/backup-reminder';
import { DayBadge, WorkoutDayItem } from './day-item/workout-day-item';

/** The days of the active plan, today's one highlighted; ▶ opens the workout of a day. */
@Component({
  selector: 'app-workout-page',
  imports: [
    RouterLink,
    TranslocoPipe,
    ButtonDirective,
    ButtonIcon,
    ButtonLabel,
    LocalDatePipe,
    EmptyState,
    WorkoutDayItem,
    BackupReminder,
  ],
  templateUrl: './workout-page.html',
  styleUrl: './workout-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkoutPage {
  protected readonly language = inject(LanguageService).current;
  /** undefined while loading, null when there is no active plan. */
  protected readonly today = toSignal(inject(WorkoutPlanService).watchToday(), {
    initialValue: undefined,
  });
  protected readonly openSession = toSignal(inject(WorkoutSessionService).watchOpenSession());

  protected readonly suggestedDayId = computed(() => this.today()?.suggestion?.day.day.id);
  protected readonly badge = computed<DayBadge>(() =>
    this.today()?.suggestion?.reason === 'today' ? 'today' : 'next',
  );
}
