import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { ButtonDirective, ButtonIcon, ButtonLabel } from 'primeng/button';
import { PlanRepository } from '../../core/repositories/plan.repository';
import { LanguageService } from '../../core/services/language.service';
import { EmptyState } from '../../shared/ui/empty-state/empty-state';
import { PlanCard } from './plan-card/plan-card';

/** Archive of every imported plan; entry point of the CSV import. */
@Component({
  selector: 'app-plans-page',
  imports: [
    RouterLink,
    TranslocoPipe,
    ButtonDirective,
    ButtonIcon,
    ButtonLabel,
    EmptyState,
    PlanCard,
  ],
  templateUrl: './plans-page.html',
  styleUrl: './plans-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlansPage {
  private readonly plans = inject(PlanRepository);
  private readonly router = inject(Router);

  protected readonly language = inject(LanguageService).current;
  protected readonly summaries = toSignal(this.plans.watchSummaries());

  protected async activate(phaseId: number): Promise<void> {
    await this.plans.activate(phaseId);
    await this.router.navigateByUrl('/workout');
  }
}
