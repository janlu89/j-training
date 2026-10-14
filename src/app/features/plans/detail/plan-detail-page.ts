import { ChangeDetectionStrategy, Component, inject, input, numberAttribute } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { ButtonDirective, ButtonIcon, ButtonLabel } from 'primeng/button';
import { Tag } from 'primeng/tag';
import { PlanRepository } from '../../../core/repositories/plan.repository';
import { TrainingDayRepository } from '../../../core/repositories/training-day.repository';
import { LanguageService } from '../../../core/services/language.service';
import { LocalDatePipe } from '../../../shared/pipes/local-date.pipe';
import { EmptyState } from '../../../shared/ui/empty-state/empty-state';
import { PlanDays, WeekdayChange } from '../../../shared/ui/plan-days/plan-days';

/** Any plan of the archive, with the option to make it the active one. */
@Component({
  selector: 'app-plan-detail-page',
  imports: [
    RouterLink,
    TranslocoPipe,
    ButtonDirective,
    ButtonIcon,
    ButtonLabel,
    Tag,
    LocalDatePipe,
    EmptyState,
    PlanDays,
  ],
  templateUrl: './plan-detail-page.html',
  styleUrl: './plan-detail-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlanDetailPage {
  private readonly plans = inject(PlanRepository);
  private readonly days = inject(TrainingDayRepository);
  private readonly router = inject(Router);

  /** Route parameter, bound by `withComponentInputBinding`. */
  readonly id = input.required({ transform: numberAttribute });

  protected readonly language = inject(LanguageService).current;
  protected readonly plan = rxResource({
    params: () => this.id(),
    stream: ({ params: id }) => this.plans.watchPlan(id),
  });

  protected async activate(phaseId: number): Promise<void> {
    await this.plans.activate(phaseId);
    await this.router.navigateByUrl('/workout');
  }

  protected async onWeekdayChange({ dayId, weekday }: WeekdayChange): Promise<void> {
    await this.days.update(dayId, { weekday });
  }
}
