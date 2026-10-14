import { Injectable, computed, inject } from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { map, of } from 'rxjs';
import { LoadUpdate, OpenSession, WorkoutExercise } from '../../../core/models';
import { LanguageService } from '../../../core/services/language.service';
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
  readonly pendingCount = computed(() => this.rows().filter((row) => !isDone(row)).length);
  /** A recorded set edited into an invalid value would be saved with its previous value. */
  readonly hasInvalidRecorded = computed(() =>
    this.rows().some((row) => isDone(row) && !row.values),
  );
  readonly loadProposals = computed(() => proposeLoadUpdates(this.workout()?.exercises ?? []));

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

  /** Marks a set as done (recording it) or not done (removing it, keeping the values shown). */
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
      await this.record(exerciseId, row);
    }
  }

  /** Records every complete set not done yet: the "fill in at the end" way of logging. */
  async markAllDone(exerciseId: number): Promise<void> {
    const rows = this.exercises().find(({ entry }) => entry.exercise.id === exerciseId)?.rows ?? [];
    for (const row of rows.filter((item) => !isDone(item) && item.values)) {
      await this.record(exerciseId, row);
    }
  }

  addSet(exerciseId: number): void {
    const dayId = this.workout()?.day.id;
    if (dayId !== undefined) {
      this.drafts.addSet(dayId, exerciseId);
    }
  }

  async complete(loads: readonly LoadUpdate[]): Promise<void> {
    const workout = this.workout();
    if (workout) {
      await this.sessions.completeDay(workout, loads);
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
    const exercise = workout?.exercises.find((entry) => entry.exercise.id === exerciseId)?.exercise;
    if (workout && exercise && row.values) {
      await this.sessions.recordSet(workout, exercise, row.setNo, row.values);
    }
  }

  private findRow(exerciseId: number, setNo: number): SetRow | undefined {
    return this.exercises()
      .find(({ entry }) => entry.exercise.id === exerciseId)
      ?.rows.find((row) => row.setNo === setNo);
  }
}

function isDone(row: SetRow): boolean {
  return row.logId !== undefined;
}
