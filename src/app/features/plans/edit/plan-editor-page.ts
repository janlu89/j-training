import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  numberAttribute,
  signal,
} from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { ConfirmationService } from 'primeng/api';
import { ButtonDirective, ButtonIcon, ButtonLabel } from 'primeng/button';
import { ConfirmDialog } from 'primeng/confirmdialog';
import { Message } from 'primeng/message';
import { MoveDirection, PlanDay, PlanInput, Weekday } from '../../../core/models';
import { PlanEditorRepository } from '../../../core/repositories/plan-editor.repository';
import { PlanRepository } from '../../../core/repositories/plan.repository';
import { EmptyState } from '../../../shared/ui/empty-state/empty-state';
import { EditorDay, ExerciseMove } from './editor-day';
import { PlanDetailsForm } from './plan-details-form';

/** Edits a plan by hand: details, days and the order of exercises. */
@Component({
  selector: 'app-plan-editor-page',
  imports: [
    RouterLink,
    TranslocoPipe,
    ButtonDirective,
    ButtonIcon,
    ButtonLabel,
    ConfirmDialog,
    Message,
    EmptyState,
    EditorDay,
    PlanDetailsForm,
  ],
  providers: [ConfirmationService],
  templateUrl: './plan-editor-page.html',
  styleUrl: './plan-editor-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlanEditorPage {
  private readonly editor = inject(PlanEditorRepository);
  private readonly plans = inject(PlanRepository);
  private readonly confirmation = inject(ConfirmationService);
  private readonly transloco = inject(TranslocoService);
  private readonly router = inject(Router);

  /** Route parameter, bound by `withComponentInputBinding`. */
  readonly id = input.required({ transform: numberAttribute });

  protected readonly plan = rxResource({
    params: () => this.id(),
    stream: ({ params: id }) => this.plans.watchPlan(id),
  });
  protected readonly cannotDelete = signal(false);

  protected savePlan(plan: PlanInput): Promise<void> {
    return this.editor.updatePlan(this.id(), plan);
  }

  protected async addDay(): Promise<void> {
    await this.editor.addDay(this.id(), { csvGiorno: '' });
  }

  protected renameDay(planDay: PlanDay, csvGiorno: string): Promise<void> {
    return this.editor.updateDay(planDay.day.id, { csvGiorno, weekday: planDay.day.weekday });
  }

  protected changeWeekday(planDay: PlanDay, weekday: Weekday | undefined): Promise<void> {
    return this.editor.updateDay(planDay.day.id, { csvGiorno: planDay.day.csvGiorno, weekday });
  }

  protected moveDay(planDay: PlanDay, direction: MoveDirection): Promise<void> {
    return this.editor.moveDay(planDay.day.id, direction);
  }

  protected moveExercise({ exerciseId, direction }: ExerciseMove): Promise<void> {
    return this.editor.moveExercise(exerciseId, direction);
  }

  protected confirmDeleteDay(planDay: PlanDay): void {
    const day = this.transloco.translate('plan.day', { number: planDay.day.ordine });
    this.confirm('editor.day.deleteConfirm', { day }, () => this.editor.deleteDay(planDay.day.id));
  }

  protected confirmDeletePlan(name: string): void {
    this.confirm('editor.plan.deleteConfirm', { name }, async () => {
      const result = await this.editor.deletePlan(this.id());
      if (result === 'hasSessions') {
        this.cannotDelete.set(true);
        return;
      }
      await this.router.navigateByUrl('/plans');
    });
  }

  private confirm(
    key: string,
    params: Record<string, unknown>,
    accept: () => Promise<unknown>,
  ): void {
    this.confirmation.confirm({
      header: this.transloco.translate('editor.confirm.title'),
      message: this.transloco.translate(key, params),
      acceptLabel: this.transloco.translate('editor.confirm.delete'),
      rejectLabel: this.transloco.translate('editor.confirm.cancel'),
      acceptButtonProps: { severity: 'danger' },
      rejectButtonProps: { severity: 'secondary' },
      accept: () => void accept(),
    });
  }
}
