import {
  ChangeDetectionStrategy,
  Component,
  input,
  linkedSignal,
  model,
  output,
} from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { ButtonDirective, ButtonIcon, ButtonLabel } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { Message } from 'primeng/message';
import { LoadUpdate } from '../../../../core/models';
import { LoadProposal } from '../../../../core/services/workout/load-updates';
import { LocalNumberPipe } from '../../../../shared/pipes/local-number.pipe';

/** End of the day: what will be saved, and which loads used today should go into the plan. */
@Component({
  selector: 'app-finish-day-dialog',
  imports: [
    TranslocoPipe,
    ButtonDirective,
    ButtonIcon,
    ButtonLabel,
    Dialog,
    Message,
    LocalNumberPipe,
  ],
  templateUrl: './finish-day-dialog.html',
  styleUrl: './finish-day-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FinishDayDialog {
  readonly visible = model(false);
  readonly proposals = input.required<readonly LoadProposal[]>();
  readonly recorded = input.required<number>();
  readonly pending = input.required<number>();
  readonly language = input.required<string>();
  readonly busy = input(false);
  readonly save = output<LoadUpdate[]>();

  /** Every proposal starts selected: the plan should follow what was really lifted. */
  protected readonly selected = linkedSignal(
    () => new Set(this.proposals().map(({ exercise }) => exercise.id)),
  );

  protected setSelected(exerciseId: number, checked: boolean): void {
    this.selected.update((selected) => {
      const next = new Set(selected);
      if (checked) {
        next.add(exerciseId);
      } else {
        next.delete(exerciseId);
      }
      return next;
    });
  }

  protected confirm(): void {
    this.save.emit(
      this.proposals()
        .filter(({ exercise }) => this.selected().has(exercise.id))
        .map(({ exercise, proposed }) => ({ exerciseId: exercise.id, ultimoKg: proposed })),
    );
  }
}
