import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  linkedSignal,
} from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { HistoryRepository } from '../../core/repositories/history.repository';
import {
  ProgressionPoint,
  loadProgression,
  repCounts,
  weeklyReps,
} from '../../core/services/analytics/exercise-analytics';
import { CLOCK } from '../../core/services/clock';
import { LanguageService } from '../../core/services/language.service';
import { LocalDatePipe } from '../../shared/pipes/local-date.pipe';
import { LocalNumberPipe } from '../../shared/pipes/local-number.pipe';
import { EmptyState } from '../../shared/ui/empty-state/empty-state';
import { ProgressionChart } from './progression-chart/progression-chart';
import { WeeklyRepsChart } from './weekly-reps-chart/weekly-reps-chart';

const WEEKS_SHOWN = 12;

/** Progress of one exercise: load at equal reps over time, and reps per week. */
@Component({
  selector: 'app-analytics-page',
  imports: [
    TranslocoPipe,
    LocalDatePipe,
    LocalNumberPipe,
    EmptyState,
    ProgressionChart,
    WeeklyRepsChart,
  ],
  templateUrl: './analytics-page.html',
  styleUrl: './analytics-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnalyticsPage {
  private readonly history = inject(HistoryRepository);
  private readonly router = inject(Router);
  private readonly clock = inject(CLOCK);

  /** Query parameter: the exercise to analyse, so a link from the history opens it directly. */
  readonly exercise = input<string>();

  protected readonly language = inject(LanguageService).current;
  /** undefined while loading. */
  protected readonly exercises = toSignal(this.history.watchExercises());

  /** The exercise in the URL, else the one trained most recently. */
  protected readonly selected = computed(() => {
    const exercises = this.exercises() ?? [];
    const wanted = this.exercise();
    if (exercises.some((item) => item.esercizio === wanted)) {
      return wanted;
    }
    return [...exercises].sort((a, b) => b.lastDate - a.lastDate)[0]?.esercizio;
  });

  private readonly sessions = rxResource({
    params: () => this.selected(),
    stream: ({ params: name }) => this.history.watchExerciseHistory(name),
  });
  private readonly sessionList = computed(() => this.sessions.value() ?? []);

  protected readonly repOptions = computed(() => repCounts(this.sessionList()));
  /** Follows the most frequent rep count until the user picks another. */
  protected readonly reps = linkedSignal<number | undefined>(() => this.repOptions()[0]);
  protected readonly progression = computed(() => {
    const reps = this.reps();
    return reps === undefined ? [] : loadProgression(this.sessionList(), reps);
  });
  protected readonly latest = computed(() => this.progression().at(-1));
  protected readonly best = computed(() =>
    this.progression().reduce<ProgressionPoint | undefined>(
      (best, point) => (!best || point.kg > best.kg ? point : best),
      undefined,
    ),
  );
  protected readonly weeks = computed(() =>
    weeklyReps(this.sessionList(), this.clock(), WEEKS_SHOWN),
  );
  /** The load unit of the latest session: always shown next to the values. */
  protected readonly unitKey = computed(
    () => `history.unit.${this.sessionList()[0]?.unitaCarico ?? 'totale'}`,
  );

  protected selectExercise(esercizio: string): void {
    void this.router.navigate([], { queryParams: { exercise: esercizio }, replaceUrl: true });
  }

  protected selectReps(value: string): void {
    this.reps.set(Number(value));
  }
}
