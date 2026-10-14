import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { ButtonDirective, ButtonIcon, ButtonLabel } from 'primeng/button';
import { map } from 'rxjs';
import { PlanRepository } from '../../core/repositories/plan.repository';
import { TrainingDayRepository } from '../../core/repositories/training-day.repository';
import { LanguageService } from '../../core/services/language.service';
import { EmptyState } from '../../shared/ui/empty-state/empty-state';
import { PlanDays, WeekdayChange } from '../../shared/ui/plan-days/plan-days';

/** The active plan: the starting point of every workout. */
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
  ],
  templateUrl: './workout-page.html',
  styleUrl: './workout-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkoutPage {
  private readonly days = inject(TrainingDayRepository);

  protected readonly language = inject(LanguageService).current;
  /** undefined while loading, null when there is no active plan. */
  protected readonly plan = toSignal(
    inject(PlanRepository)
      .watchActivePlan()
      .pipe(map((plan) => plan ?? null)),
    { initialValue: undefined },
  );

  protected async onWeekdayChange({ dayId, weekday }: WeekdayChange): Promise<void> {
    await this.days.update(dayId, { weekday });
  }
}
