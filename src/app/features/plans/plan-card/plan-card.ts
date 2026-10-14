import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { ButtonDirective, ButtonLabel } from 'primeng/button';
import { Tag } from 'primeng/tag';
import { PlanSummary } from '../../../core/models';
import { LocalDatePipe } from '../../../shared/pipes/local-date.pipe';

/** One plan of the archive with its key figures. */
@Component({
  selector: 'app-plan-card',
  imports: [RouterLink, TranslocoPipe, ButtonDirective, ButtonLabel, Tag, LocalDatePipe],
  templateUrl: './plan-card.html',
  styleUrl: './plan-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlanCard {
  readonly summary = input.required<PlanSummary>();
  readonly language = input.required<string>();
  readonly activate = output<number>();
}
