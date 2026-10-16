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
import { Exercise } from '../../../../core/models';

/**
 * Choice of an exercise to do in place of another, for today only: any exercise of any plan,
 * from a native select as in the analytics page (the phone shows its own list).
 */
@Component({
  selector: 'app-replace-exercise-dialog',
  imports: [TranslocoPipe, ButtonDirective, ButtonIcon, ButtonLabel, Dialog],
  templateUrl: './replace-exercise-dialog.html',
  styleUrl: './replace-exercise-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReplaceExerciseDialog {
  readonly visible = model(false);
  /** Name of the exercise being replaced. */
  readonly exercise = input.required<string>();
  readonly options = input.required<readonly Exercise[]>();
  readonly busy = input(false);
  /** Id of the chosen exercise. */
  readonly choose = output<number>();

  /** Nothing is chosen each time the dialog opens: the user picks on purpose. */
  protected readonly selected = linkedSignal<boolean, number | null>({
    source: this.visible,
    computation: () => null,
  });

  protected select(value: string): void {
    this.selected.set(value ? Number(value) : null);
  }

  protected confirm(): void {
    const selected = this.selected();
    if (selected !== null) {
      this.choose.emit(selected);
    }
  }
}
