import { ChangeDetectionStrategy, Component, inject, input, numberAttribute } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { ButtonDirective, ButtonIcon, ButtonLabel } from 'primeng/button';
import { PlanRepository } from '../../../core/repositories/plan.repository';
import { TrainingDayRepository } from '../../../core/repositories/training-day.repository';
import { LanguageService } from '../../../core/services/language.service';
import { LocalDatePipe } from '../../../shared/pipes/local-date.pipe';
import { EmptyState } from '../../../shared/ui/empty-state/empty-state';
import { PlanDays, WeekdayChange } from '../../../shared/ui/plan-days/plan-days';
import { PlanActiveSwitch } from '../active-switch/plan-active-switch';

/** Any plan of the archive, with a switch to make it the active one. */
@Component({
  selector: 'app-plan-detail-page',
  imports: [
    RouterLink,
    TranslocoPipe,
    ButtonDirective,
    ButtonIcon,
    ButtonLabel,
    LocalDatePipe,
    EmptyState,
    PlanDays,
    PlanActiveSwitch,
  ],
  templateUrl: './plan-detail-page.html',
  styleUrl: './plan-detail-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlanDetailPage {
  private readonly plans = inject(PlanRepository);
  private readonly days = inject(TrainingDayRepository);

  /** Route parameter, bound by `withComponentInputBinding`. */
  readonly id = input.required({ transform: numberAttribute });

  protected readonly language = inject(LanguageService).current;
  protected readonly plan = rxResource({
    params: () => this.id(),
    stream: ({ params: id }) => this.plans.watchPlan(id),
  });

  /** Switching a plan on archives the active one; switching it off leaves no active plan. */
  protected setActive(phaseId: number, active: boolean): Promise<void> {
    return active ? this.plans.activate(phaseId) : this.plans.deactivate(phaseId);
  }

  protected async onWeekdayChange({ dayId, weekday }: WeekdayChange): Promise<void> {
    await this.days.update(dayId, { weekday });
  }
}
