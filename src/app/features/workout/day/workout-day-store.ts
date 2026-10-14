import { Injectable, computed, inject, linkedSignal } from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { map, of } from 'rxjs';
import { LoadUpdate, OpenSession, SetEntry, WorkoutExercise } from '../../../core/models';
import { LanguageService } from '../../../core/services/language.service';
import { RestTimerService, formatRest } from '../../../core/services/rest-timer/rest-timer.service';
import { proposeLoadUpdates } from '../../../core/services/workout/load-updates';
import { WorkoutSessionService } from '../../../core/services/workout-session.service';
import { SetInput, SetRow, buildRows } from './set-rows';
import { WorkoutDrafts } from './workout-drafts';

export interface ExerciseRows {
  entry: WorkoutExercise;
  rows: SetRow[];
}

/**
 * State of the workout page of one day: the live data from the database merged with what the
 * user is typing. Provided by the page, so it lives exactly as long as the page.
 */
@Injectable()
export class WorkoutDayStore {
  private readonly sessions = inject(WorkoutSessionService);
  private readonly drafts = inject(WorkoutDrafts);
  private readonly restTimer = inject(RestTimerService);
  private readonly language = inject(LanguageService).current;

  readonly dayId = toSignal(
    inject(ActivatedRoute).paramMap.pipe(map((params) => Number(params.get('dayId')))),
    { requireSync: true },
  );

  private readonly source = rxResource({
    params: () => this.dayId(),
    stream: ({ params: dayId }) =>
      Number.isInteger(dayId) ? this.sessions.watchDay(dayId) : of(undefined),
  });

  readonly workout = this.source.value;
  readonly isLoading = this.source.isLoading;

  readonly exercises = computed<ExerciseRows[]>(() => {
    const workout = this.workout();
    if (!workout) {
      return [];
    }
    const draft = this.drafts.forDay(workout.day.id);
    return workout.exercises.map((entry) => ({
      entry,
      rows: buildRows(entry, draft, this.language()),
    }));
  });

  /** Another day has a workout in progress: this one cannot be recorded until it is resolved. */
  readonly locked = computed(() => !!this.workout()?.otherOpenSession);
  readonly recordedCount = computed(() => this.rows().filter(isDone).length);
  /** Sets filled in but not ticked: they can be saved with the day ("fill in at the end"). */
  readonly untickedEntries = computed<SetEntry[]>(() =>
    this.exercises().flatMap(({ entry, rows }) =>
      rows.flatMap((row) =>
        !isDone(row) && row.values
          ? [{ exercise: entry.exercise, setNo: row.setNo, values: row.values }]
          : [],
      ),
    ),
  );
  /** Whether saving also keeps the unticked sets: the default when nothing was ticked. */
  readonly includeUnticked = linkedSignal(() => this.recordedCount() === 0);
  /** A recorded set edited into an invalid value would be saved with its previous value. */
  readonly hasInvalidRecorded = computed(() =>
    this.rows().some((row) => isDone(row) && !row.values),
  );
  readonly canSave = computed(
    () =>
      !this.hasInvalidRecorded() && (this.recordedCount() > 0 || this.untickedEntries().length > 0),
  );
  /** Loads that will be saved, compared with the plan. */
  readonly loadProposals = computed(() =>
    proposeLoadUpdates(
      this.exercises().map(({ entry, rows }) => ({
        exercise: entry.exercise,
        loads: rows.flatMap((row) =>
          row.values && (isDone(row) || this.includeUnticked()) ? [row.values.kg] : [],
        ),
      })),
    ),
  );

  /** The running rest, shown between the sets of its exercise. */
  readonly activeRest = computed(() => {
    const timer = this.restTimer.timer();
    return timer
      ? {
          exerciseId: timer.target.exerciseId,
          afterSet: timer.target.afterSet,
          remaining: formatRest(this.restTimer.remainingMs()),
          finished: this.restTimer.finished(),
        }
      : null;
  });

  private readonly rows = computed(() => this.exercises().flatMap(({ rows }) => rows));

  /** Keeps what the user types; a set already recorded is updated in the database at once. */
  async setInput(exerciseId: number, setNo: number, input: SetInput): Promise<void> {
    const dayId = this.workout()?.day.id;
    if (dayId === undefined) {
      return;
    }
    this.drafts.setInput(dayId, exerciseId, setNo, input);
    const row = this.findRow(exerciseId, setNo);
    if (row?.logId !== undefined && row.values) {
      await this.sessions.updateSet(row.logId, row.values);
    }
  }

  /**
   * Marks a set as done (recording it and starting the rest) or not done (removing it, keeping
   * the values shown).
   */
  async toggleSet(exerciseId: number, setNo: number): Promise<void> {
    const workout = this.workout();
    const row = this.findRow(exerciseId, setNo);
    if (!workout || !row) {
      return;
    }
    if (row.logId !== undefined) {
      this.drafts.setInput(workout.day.id, exerciseId, setNo, row.input);
      await this.sessions.removeSet(row.logId);
    } else if (row.values) {
      // Started before the write, still inside the user's tap: browsers then allow the alarm.
      this.startRest(exerciseId, setNo);
      await this.record(exerciseId, row);
    }
  }

  /**
   * Starts the rest planned for the exercise, after the given set when it runs between two sets.
   * Nothing happens when the exercise has no rest time.
   */
  startRest(exerciseId: number, afterSet?: number): void {
    const exercise = this.findExercise(exerciseId)?.entry.exercise;
    if (exercise?.recSec) {
      this.restTimer.start({
        exerciseId,
        exercise: exercise.esercizio,
        seconds: exercise.recSec,
        ...(afterSet === undefined ? {} : { afterSet }),
      });
    }
  }

  /** Records every complete set not done yet, one exercise at a time. */
  async markAllDone(exerciseId: number): Promise<void> {
    for (const row of this.findExercise(exerciseId)?.rows ?? []) {
      if (!isDone(row) && row.values) {
        await this.record(exerciseId, row);
      }
    }
  }

  addSet(exerciseId: number): void {
    const item = this.findExercise(exerciseId);
    if (item) {
      this.resize(item, item.rows.length + 1);
    }
  }

  /** Removes the last set of an exercise; if it was already recorded, the record goes too. */
  async removeLastSet(exerciseId: number): Promise<void> {
    const item = this.findExercise(exerciseId);
    const last = item?.rows.at(-1);
    if (!item || !last) {
      return;
    }
    this.resize(item, item.rows.length - 1);
    if (last.logId !== undefined) {
      await this.sessions.removeSet(last.logId);
    }
  }

  /** Saves the day; unticked sets are included when the user chose so in the summary. */
  async save(loads: readonly LoadUpdate[]): Promise<void> {
    const workout = this.workout();
    if (workout) {
      const unticked = this.includeUnticked() ? this.untickedEntries() : [];
      await this.sessions.saveDay(workout, unticked, loads);
      this.drafts.clearDay(workout.day.id);
    }
  }

  async skip(): Promise<void> {
    const workout = this.workout();
    if (workout) {
      await this.sessions.skipDay(workout);
      this.drafts.clearDay(workout.day.id);
    }
  }

  /** Discards a draft: this day's or, when it blocks this one, another day's. */
  async discard({ session, day }: OpenSession): Promise<void> {
    await this.sessions.discardDraft(session.id);
    this.drafts.clearDay(day.id);
  }

  private async record(exerciseId: number, row: SetRow): Promise<void> {
    const workout = this.workout();
    const exercise = this.findExercise(exerciseId)?.entry.exercise;
    if (workout && exercise && row.values) {
      await this.sessions.recordSet(workout, { exercise, setNo: row.setNo, values: row.values });
    }
  }

  /** The number of rows is kept as a difference from the plan, so plan edits still apply. */
  private resize({ entry }: ExerciseRows, count: number): void {
    const dayId = this.workout()?.day.id;
    if (dayId !== undefined) {
      this.drafts.setSetDelta(dayId, entry.exercise.id, count - entry.exercise.serie);
    }
  }

  private findExercise(exerciseId: number): ExerciseRows | undefined {
    return this.exercises().find(({ entry }) => entry.exercise.id === exerciseId);
  }

  private findRow(exerciseId: number, setNo: number): SetRow | undefined {
    return this.findExercise(exerciseId)?.rows.find((row) => row.setNo === setNo);
  }
}

function isDone(row: SetRow): boolean {
  return row.logId !== undefined;
}
