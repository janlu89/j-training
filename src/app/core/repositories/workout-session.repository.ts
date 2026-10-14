import { Injectable, inject } from '@angular/core';
import Dexie, { liveQuery } from 'dexie';
import { Observable, from } from 'rxjs';
import { AppDatabase } from '../db/app-database';
import {
  EpochMs,
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

  /** A training day with its exercises, today's draft and the previous sets of each exercise. */
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
        const exercises = await db.exercises
          .where('[dayId+ordine]')
          .between([dayId, Dexie.minKey], [dayId, Dexie.maxKey])
          .filter((exercise) => exercise.stato !== 'rimosso')
          .toArray();
        return {
          phase,
          day,
          session,
          otherOpenSession: open && !session ? await this.withDay(open) : undefined,
          exercises: await Promise.all(
            exercises.map(async (exercise) => ({
              exercise,
              sets: bySetNo(sets.filter((set) => set.exerciseId === exercise.id)),
              previous: await this.previousSets(exercise.esercizio, session?.id),
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
      const open = await this.findOpen();
      if (open && open.dayId !== day.id) {
        throw new OpenSessionConflictError(open.dayId);
      }
      const sessionId =
        open?.id ??
        (await db.sessions.add({ phaseId: day.phaseId, dayId: day.id, startedAt: set.date }));
      const existing = await db.setLogs
        .where('sessionId')
        .equals(sessionId)
        .filter((log) => log.exerciseId === set.exerciseId && log.setNo === set.setNo)
        .first();
      if (existing) {
        await db.setLogs.update(existing.id, { kg: set.kg, rip: set.rip, date: set.date });
        return existing.id;
      }
      return db.setLogs.add({ ...set, sessionId });
    });
  }

  async updateSet(setLogId: number, { kg, rip }: SetValues): Promise<void> {
    await this.db.setLogs.update(setLogId, { kg, rip });
  }

  /** Removes a recorded set; a draft left without sets is removed too. */
  removeSet(setLogId: number): Promise<void> {
    const { db } = this;
    return db.transaction('rw', db.sessions, db.setLogs, async () => {
      const log = await db.setLogs.get(setLogId);
      if (!log) {
        return;
      }
      await db.setLogs.delete(setLogId);
      const session = await db.sessions.get(log.sessionId);
      const remaining = await db.setLogs.where('sessionId').equals(log.sessionId).count();
      if (session && session.endedAt === undefined && remaining === 0) {
        await db.sessions.delete(session.id);
      }
    });
  }

  /** Closes the draft as completed and copies the chosen loads into the plan, atomically. */
  completeSession(
    sessionId: number,
    endedAt: EpochMs,
    loads: readonly LoadUpdate[],
  ): Promise<void> {
    const { db } = this;
    return db.transaction('rw', db.sessions, db.exercises, async () => {
      const session = await db.sessions.get(sessionId);
      if (!session || session.endedAt !== undefined) {
        throw new Error(`Session ${sessionId} is not in progress`);
      }
      await db.sessions.update(sessionId, { endedAt, outcome: 'completed' });
      for (const { exerciseId, ultimoKg } of loads) {
        await db.exercises.update(exerciseId, { ultimoKg });
      }
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
