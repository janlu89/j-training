import { ChangeDetectionStrategy, Component, computed, inject, linkedSignal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { ButtonDirective, ButtonIcon, ButtonLabel } from 'primeng/button';
import { TrainingDayRepository } from '../../core/repositories/training-day.repository';
import { LanguageService } from '../../core/services/language.service';
import { WorkoutPlanService } from '../../core/services/workout-plan.service';
import { EmptyState } from '../../shared/ui/empty-state/empty-state';
import { PlanDays, WeekdayChange } from '../../shared/ui/plan-days/plan-days';
import { DayPicker } from './day-picker/day-picker';

/** The day to train today, from the active plan; another day can be picked. */
@Component({
  selector: 'app-workout-page',
  imports: [
    RouterLink,
    TranslocoPipe,
    ButtonDirective,
    ButtonIcon,
    ButtonLabel,
    EmptyState,
    PlanDays,
    DayPicker,
  ],
  templateUrl: './workout-page.html',
  styleUrl: './workout-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkoutPage {
  private readonly days = inject(TrainingDayRepository);

  protected readonly language = inject(LanguageService).current;
  /** undefined while loading, null when there is no active plan. */
  protected readonly today = toSignal(inject(WorkoutPlanService).watchToday(), {
    initialValue: undefined,
  });

  /** Follows the suggestion until the user picks another day. */
  protected readonly selectedDayId = linkedSignal(() => this.today()?.suggestion?.day.day.id);
  protected readonly selectedDay = computed(() =>
    this.today()?.plan.days.find(({ day }) => day.id === this.selectedDayId()),
  );
  protected readonly isSuggested = computed(
    () => this.selectedDayId() === this.today()?.suggestion?.day.day.id,
  );

  protected async onWeekdayChange({ dayId, weekday }: WeekdayChange): Promise<void> {
    await this.days.update(dayId, { weekday });
  }
}
