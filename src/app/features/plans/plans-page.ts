import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
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
    NgTemplateOutlet,
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

  protected readonly language = inject(LanguageService).current;
  protected readonly summaries = toSignal(this.plans.watchSummaries());

  /** Switching a plan on archives the active one; switching it off leaves no active plan. */
  protected setActive(phaseId: number, active: boolean): Promise<void> {
    return active ? this.plans.activate(phaseId) : this.plans.deactivate(phaseId);
  }
}
