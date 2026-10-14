import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Tag } from 'primeng/tag';
import { Exercise } from '../../../core/models';
import { LocalNumberPipe } from '../../pipes/local-number.pipe';
import { statusSeverity } from './exercise-status';

/** One planned exercise: name, sets × reps, load, rest and notes. */
@Component({
  selector: 'app-exercise-item',
  imports: [Tag, TranslocoPipe, LocalNumberPipe],
  templateUrl: './exercise-item.html',
  styleUrl: './exercise-item.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExerciseItem {
  readonly exercise = input.required<Exercise>();
  readonly language = input.required<string>();

  protected readonly statusSeverity = computed(() => statusSeverity(this.exercise().stato));
  protected readonly equipment = computed(() =>
    [this.exercise().attrezzo, this.exercise().posizione].filter(Boolean).join(' · '),
  );
}
