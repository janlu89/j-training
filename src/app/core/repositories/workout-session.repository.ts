import { Injectable, inject } from '@angular/core';
import Dexie, { liveQuery } from 'dexie';
import { Observable, from } from 'rxjs';
import { AppDatabase } from '../db/app-database';
import {
  ClosedExercise,
  EpochMs,
  Exercise,
  ExerciseSubstitute,
  LoadUpdate,
  NewEntity,
  OpenSession,
  Session,
  SetLog,
  SetValues,
  TrainingDay,
  WorkoutDay,
} from '../models';

/** A set ready to be stored: the session it belongs to is resolved by the repository. */
export type NewSet = Omit<NewEntity<SetLog>, 'sessionId'>;

/** A set cannot be recorded on a day while another day has a workout in progress. */
export class OpenSessionConflictError extends Error {
  constructor(readonly openDayId: number) {
    super(`A workout is already in progress on training day ${openDayId}`);
    this.name = 'OpenSessionConflictError';
  }
}

/**
 * Aggregate repository of a workout: sessions and their sets. At most one session is open (a draft)
 * at any time; it is created by the first recorded set and every set is written immediately,
 * so an interrupted workout can always be resumed.
 */
@Injectable({ providedIn: 'root' })
export class WorkoutSessionRepository {
  private readonly db = inject(AppDatabase);

  /**
   * A training day with its exercises, today's draft and the previous sets of each exercise. The
   * exercises added to the draft in place of others follow the planned ones.
   */
  getDay(dayId: number): Promise<WorkoutDay | undefined> {
    const { db } = this;
    return db.transaction(
      'r',
      db.phases,
      db.days,
      db.exercises,
      db.sessions,
      db.setLogs,
      async () => {
        const day = await db.days.get(dayId);
        const phase = day && (await db.phases.get(day.phaseId));
        if (!day || !phase) {
          return undefined;
        }
        const open = await this.findOpen();
        const session = open?.dayId === dayId ? open : undefined;
        const sets = session
          ? await db.setLogs.where('sessionId').equals(session.id).toArray()
          : [];
        const planned = await db.exercises
          .where('[dayId+ordine]')
          .between([dayId, Dexie.minKey], [dayId, Dexie.maxKey])
          .filter((exercise) => exercise.stato !== 'rimosso')
          .toArray();
        const exercises: { exercise: Exercise; replaces?: number }[] = [
          ...planned.map((exercise) => ({ exercise })),
          ...(await this.substitutesOf(session)),
        ];
        return {
          phase,
          day,
          session,
          otherOpenSession: open && !session ? await this.withDay(open) : undefined,
          exercises: await Promise.all(
            exercises.map(async ({ exercise, replaces }) => ({
              exercise,
              sets: bySetNo(sets.filter((set) => set.exerciseId === exercise.id)),
              previous: await this.previousSets(exercise.esercizio, session?.id),
              replaces,
            })),
          ),
        };
      },
    );
  }

  watchDay(dayId: number): Observable<WorkoutDay | undefined> {
    return from(liveQuery(() => this.getDay(dayId)));
  }

  /** The workout in progress, if any, wherever it is. */
  watchOpenSession(): Observable<OpenSession | undefined> {
    return from(
      liveQuery(async () => {
        const open = await this.findOpen();
        return open && this.withDay(open);
      }),
    );
  }

  /**
   * Records a set in the draft of its day; the first set starts the session, so opening a day
   * without training leaves nothing behind. Recording the same set again overwrites it.
   */
  recordSet(day: TrainingDay, set: NewSet): Promise<number> {
    const { db } = this;
    return db.transaction('rw', db.sessions, db.setLogs, async () => {
      const sessionId = await this.openSessionFor(day, set.date);
      return this.putSet(sessionId, set);
    });
  }

  async updateSet(setLogId: number, { kg, rip }: SetValues): Promise<void> {
    await this.db.setLogs.update(setLogId, { kg, rip });
  }

  /** Removes a recorded set; a draft left empty is removed too. */
  removeSet(setLogId: number): Promise<void> {
    const { db } = this;
    return db.transaction('rw', db.sessions, db.setLogs, async () => {
      const log = await db.setLogs.get(setLogId);
      if (!log) {
        return;
      }
      await db.setLogs.delete(setLogId);
      await this.removeIfEmpty(log.sessionId);
    });
  }

  /**
   * Moves an exercise to the finished ones of the day's draft, last in order; closing it again
   * only moves it to the end. Starts the draft when needed, like the first recorded set.
   */
  closeExercise(day: TrainingDay, closed: ClosedExercise, at: EpochMs): Promise<void> {
    const { db } = this;
    return db.transaction('rw', db.sessions, async () => {
      const sessionId = await this.openSessionFor(day, at);
      const session = await db.sessions.get(sessionId);
      const others = (session?.closedExercises ?? []).filter(
        ({ exerciseId }) => exerciseId !== closed.exerciseId,
      );
      await db.sessions.update(sessionId, { closedExercises: [...others, closed] });
    });
  }

  /**
   * Replaces an exercise for this workout only: the new one comes after it and the replaced one is
   * closed as skipped, keeping any set it recorded. A substitute without sets is swapped instead,
   * so trying another machine leaves no trace. Starts the draft when needed.
   */
  replaceExercise(day: TrainingDay, substitute: ExerciseSubstitute, at: EpochMs): Promise<void> {
    const { db } = this;
    return db.transaction('rw', db.sessions, db.setLogs, async () => {
      const sessionId = await this.openSessionFor(day, at);
      const session = await db.sessions.get(sessionId);
      const substitutes = session?.substitutes ?? [];
      if (substitutes.some(({ exerciseId }) => exerciseId === substitute.exerciseId)) {
        return;
      }
      const swapped = substitutes.find(({ exerciseId }) => exerciseId === substitute.replaces);
      if (swapped && !(await this.hasSets(sessionId, swapped.exerciseId))) {
        await db.sessions.update(sessionId, {
          substitutes: [
            ...substitutes.filter((item) => item !== swapped),
            { exerciseId: substitute.exerciseId, replaces: swapped.replaces },
          ],
        });
        return;
      }
      const closed = (session?.closedExercises ?? []).filter(
        ({ exerciseId }) => exerciseId !== substitute.replaces,
      );
      await db.sessions.update(sessionId, {
        substitutes: [...substitutes, substitute],
        closedExercises: [...closed, { exerciseId: substitute.replaces, outcome: 'skipped' }],
      });
    });
  }

  /** Takes an added exercise without sets out of the workout, as if it had never been added. */
  removeSubstitute(day: TrainingDay, exerciseId: number): Promise<void> {
    const { db } = this;
    return db.transaction('rw', db.sessions, db.setLogs, async () => {
      const open = await this.findOpen();
      if (open?.dayId !== day.id || (await this.hasSets(open.id, exerciseId))) {
        return;
      }
      await db.sessions.update(open.id, {
        substitutes: (open.substitutes ?? []).filter((item) => item.exerciseId !== exerciseId),
        closedExercises: (open.closedExercises ?? []).filter(
          (closed) => closed.exerciseId !== exerciseId,
        ),
      });
      await this.removeIfEmpty(open.id);
    });
  }

  /** Brings a finished exercise back among those to do; a draft left empty is removed. */
  reopenExercise(day: TrainingDay, exerciseId: number): Promise<void> {
    const { db } = this;
    return db.transaction('rw', db.sessions, db.setLogs, async () => {
      const open = await this.findOpen();
      if (open?.dayId !== day.id) {
        return;
      }
      await db.sessions.update(open.id, {
        closedExercises: (open.closedExercises ?? []).filter(
          (closed) => closed.exerciseId !== exerciseId,
        ),
      });
      await this.removeIfEmpty(open.id);
    });
  }

  /**
   * Saves the day atomically: the given sets (filled in but not ticked, when the user chose to
   * include them) join the draft, which is created if nothing was ticked; then the session is
   * closed as completed and the chosen loads are copied into the plan. Returns the session id.
   */
  saveDay(
    day: TrainingDay,
    sets: readonly NewSet[],
    endedAt: EpochMs,
    loads: readonly LoadUpdate[],
  ): Promise<number> {
    const { db } = this;
    return db.transaction('rw', db.sessions, db.setLogs, db.exercises, async () => {
      const hasDraft = (await this.findOpen())?.dayId === day.id;
      if (!hasDraft && !sets.length) {
        throw new Error(`Training day ${day.id} has no sets to save`);
      }
      const sessionId = await this.openSessionFor(day, sets[0]?.date ?? endedAt);
      for (const set of sets) {
        await this.putSet(sessionId, set);
      }
      await db.sessions.update(sessionId, { endedAt, outcome: 'completed' });
      for (const { exerciseId, ultimoKg } of loads) {
        await db.exercises.update(exerciseId, { ultimoKg });
      }
      return sessionId;
    });
  }

  /** Records a skipped day: a finished session without sets, so the rotation moves on. */
  skipDay(day: TrainingDay, at: EpochMs): Promise<number> {
    const { db } = this;
    return db.transaction('rw', db.sessions, async () => {
      if ((await this.findOpen())?.dayId === day.id) {
        throw new Error(`Training day ${day.id} has a workout in progress`);
      }
      return db.sessions.add({
        phaseId: day.phaseId,
        dayId: day.id,
        startedAt: at,
        endedAt: at,
        outcome: 'skipped',
      });
    });
  }

  /** Deletes a draft with its sets. Finished sessions are history and are never discarded. */
  discardSession(sessionId: number): Promise<void> {
    const { db } = this;
    return db.transaction('rw', db.sessions, db.setLogs, async () => {
      const session = await db.sessions.get(sessionId);
      if (!session || session.endedAt !== undefined) {
        return;
      }
      await db.setLogs.where('sessionId').equals(sessionId).delete();
      await db.sessions.delete(sessionId);
    });
  }

  /** The draft of the day, created when missing. Only one day can have a draft at a time. */
  private async openSessionFor(day: TrainingDay, startedAt: EpochMs): Promise<number> {
    const open = await this.findOpen();
    if (open && open.dayId !== day.id) {
      throw new OpenSessionConflictError(open.dayId);
    }
    return open?.id ?? this.db.sessions.add({ phaseId: day.phaseId, dayId: day.id, startedAt });
  }

  /** Adds a set to a session, or overwrites the one with the same exercise and number. */
  private async putSet(sessionId: number, set: NewSet): Promise<number> {
    const existing = await this.db.setLogs
      .where('sessionId')
      .equals(sessionId)
      .filter((log) => log.exerciseId === set.exerciseId && log.setNo === set.setNo)
      .first();
    if (existing) {
      await this.db.setLogs.update(existing.id, { kg: set.kg, rip: set.rip, date: set.date });
      return existing.id;
    }
    return this.db.setLogs.add({ ...set, sessionId });
  }

  /** A draft without sets, finished or added exercises goes, as if the day was never started. */
  private async removeIfEmpty(sessionId: number): Promise<void> {
    const session = await this.db.sessions.get(sessionId);
    if (
      !session ||
      session.endedAt !== undefined ||
      session.closedExercises?.length ||
      session.substitutes?.length
    ) {
      return;
    }
    if ((await this.db.setLogs.where('sessionId').equals(sessionId).count()) === 0) {
      await this.db.sessions.delete(sessionId);
    }
  }

  private async hasSets(sessionId: number, exerciseId: number): Promise<boolean> {
    const set = await this.db.setLogs
      .where('sessionId')
      .equals(sessionId)
      .filter((log) => log.exerciseId === exerciseId)
      .first();
    return set !== undefined;
  }

  /** The exercises added to a draft, with the one each replaces; deleted ones are left out. */
  private async substitutesOf(
    session: Session | undefined,
  ): Promise<{ exercise: Exercise; replaces: number }[]> {
    const substitutes = session?.substitutes ?? [];
    const exercises = await this.db.exercises.bulkGet(
      substitutes.map(({ exerciseId }) => exerciseId),
    );
    return substitutes.flatMap(({ replaces }, index) => {
      const exercise = exercises[index];
      return exercise ? [{ exercise, replaces }] : [];
    });
  }

  /** `endedAt` is not indexed: a scan, cheap for the few hundred sessions of a personal log. */
  private findOpen(): Promise<Session | undefined> {
    return this.db.sessions.filter((session) => session.endedAt === undefined).first();
  }

  private async withDay(session: Session): Promise<OpenSession | undefined> {
    const day = await this.db.days.get(session.dayId);
    return day && { session, day };
  }

  /** Sets of the most recent session, other than the current one, with this exercise name. */
  private async previousSets(esercizio: string, currentSessionId?: number): Promise<SetLog[]> {
    const logs = await this.db.setLogs
      .where('[esercizio+date]')
      .between([esercizio, Dexie.minKey], [esercizio, Dexie.maxKey])
      .reverse()
      .toArray();
    const lastSessionId = logs.find((log) => log.sessionId !== currentSessionId)?.sessionId;
    return lastSessionId === undefined
      ? []
      : bySetNo(logs.filter((log) => log.sessionId === lastSessionId));
  }
}

function bySetNo(sets: SetLog[]): SetLog[] {
  return [...sets].sort((a, b) => a.setNo - b.setNo);
}
