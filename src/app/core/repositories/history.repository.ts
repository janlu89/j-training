import { Injectable, inject } from '@angular/core';
import Dexie, { liveQuery } from 'dexie';
import { Observable, from } from 'rxjs';
import { AppDatabase } from '../db/app-database';
import {
  ExerciseSession,
  ExerciseSummary,
  Session,
  SessionDetail,
  SessionExercise,
  SessionSummary,
  SetLog,
  TrainingDay,
} from '../models';

/**
 * Read side of the workout history: saved and skipped sessions, never drafts. Sets carry the
 * exercise name and phase, so the history stays complete after plans, days or exercises change.
 */
@Injectable({ providedIn: 'root' })
export class HistoryRepository {
  private readonly db = inject(AppDatabase);

  /** Finished sessions, most recent first. */
  getSessions(): Promise<SessionSummary[]> {
    const { db } = this;
    return db.transaction('r', db.sessions, db.phases, db.days, db.setLogs, async () => {
      const sessions = (await db.sessions.orderBy('startedAt').reverse().toArray()).filter(
        isFinished,
      );
      const [planNames, days, logs] = await Promise.all([
        this.planNames(),
        this.daysById(sessions),
        db.setLogs
          .where('sessionId')
          .anyOf(sessions.map((session) => session.id))
          .toArray(),
      ]);
      return sessions.map((session) => {
        const sets = logs.filter((log) => log.sessionId === session.id);
        return {
          session,
          planName: planNames.get(session.phaseId) ?? '',
          day: days.get(session.dayId),
          setCount: sets.length,
          exerciseCount: new Set(sets.map((set) => set.exerciseId)).size,
        };
      });
    });
  }

  watchSessions(): Observable<SessionSummary[]> {
    return from(liveQuery(() => this.getSessions()));
  }

  /** A finished session with its sets grouped by exercise, in plan order. */
  getSession(sessionId: number): Promise<SessionDetail | undefined> {
    const { db } = this;
    return db.transaction(
      'r',
      db.sessions,
      db.phases,
      db.days,
      db.exercises,
      db.setLogs,
      async () => {
        const session = await db.sessions.get(sessionId);
        if (!session || !isFinished(session)) {
          return undefined;
        }
        const [phase, day, logs] = await Promise.all([
          db.phases.get(session.phaseId),
          db.days.get(session.dayId),
          db.setLogs.where('sessionId').equals(sessionId).toArray(),
        ]);
        return {
          session,
          planName: phase?.name ?? '',
          day,
          exercises: await this.groupByExercise(logs),
        };
      },
    );
  }

  watchSession(sessionId: number): Observable<SessionDetail | undefined> {
    return from(liveQuery(() => this.getSession(sessionId)));
  }

  /** Every exercise name ever saved, alphabetically. Names are exact: "Squat" ≠ "Squat bulgaro". */
  getExercises(): Promise<ExerciseSummary[]> {
    const { db } = this;
    return db.transaction('r', db.sessions, db.setLogs, async () => {
      const logs = await this.finishedLogs(await db.setLogs.toArray());
      const byName = new Map<string, SetLog[]>();
      for (const log of logs) {
        byName.set(log.esercizio, [...(byName.get(log.esercizio) ?? []), log]);
      }
      return [...byName]
        .map(([esercizio, sets]) => ({
          esercizio,
          sessionCount: new Set(sets.map((set) => set.sessionId)).size,
          lastDate: Math.max(...sets.map((set) => set.date)),
        }))
        .sort((a, b) => a.esercizio.localeCompare(b.esercizio));
    });
  }

  watchExercises(): Observable<ExerciseSummary[]> {
    return from(liveQuery(() => this.getExercises()));
  }

  /** The saved sessions of an exact exercise name, most recent first, sets in order. */
  getExerciseHistory(esercizio: string): Promise<ExerciseSession[]> {
    const { db } = this;
    return db.transaction('r', db.sessions, db.setLogs, async () => {
      const logs = await this.finishedLogs(
        await db.setLogs
          .where('[esercizio+date]')
          .between([esercizio, Dexie.minKey], [esercizio, Dexie.maxKey])
          .toArray(),
      );
      const bySession = new Map<number, SetLog[]>();
      for (const log of logs) {
        bySession.set(log.sessionId, [...(bySession.get(log.sessionId) ?? []), log]);
      }
      return [...bySession]
        .map(([sessionId, sets]) => ({
          sessionId,
          date: Math.min(...sets.map((set) => set.date)),
          fase: sets[0].fase,
          unitaCarico: sets[0].unitaCarico,
          sets: sets.sort((a, b) => a.setNo - b.setNo),
        }))
        .sort((a, b) => b.date - a.date || b.sessionId - a.sessionId);
    });
  }

  watchExerciseHistory(esercizio: string): Observable<ExerciseSession[]> {
    return from(liveQuery(() => this.getExerciseHistory(esercizio)));
  }

  private async planNames(): Promise<Map<number, string>> {
    const phases = await this.db.phases.toArray();
    return new Map(phases.map((phase) => [phase.id, phase.name]));
  }

  private async daysById(sessions: readonly Session[]): Promise<Map<number, TrainingDay>> {
    const ids = [...new Set(sessions.map((session) => session.dayId))];
    const days = await this.db.days.bulkGet(ids);
    return new Map(days.flatMap((day) => (day ? [[day.id, day] as const] : [])));
  }

  /** Drops the sets of a workout still in progress: the history shows saved days only. */
  private async finishedLogs(logs: SetLog[]): Promise<SetLog[]> {
    const ids = [...new Set(logs.map((log) => log.sessionId))];
    const sessions = await this.db.sessions.bulkGet(ids);
    const finished = new Set(
      sessions.flatMap((session) => (session && isFinished(session) ? [session.id] : [])),
    );
    return logs.filter((log) => finished.has(log.sessionId));
  }

  /** Groups sets by exercise, in plan order; exercises no longer in the plan go last. */
  private async groupByExercise(logs: SetLog[]): Promise<SessionExercise[]> {
    const ids = [...new Set(logs.map((log) => log.exerciseId))];
    const exercises = await this.db.exercises.bulkGet(ids);
    const order = new Map(
      exercises.flatMap((exercise) => (exercise ? [[exercise.id, exercise.ordine] as const] : [])),
    );
    return ids
      .map((exerciseId) => {
        const sets = logs
          .filter((log) => log.exerciseId === exerciseId)
          .sort((a, b) => a.setNo - b.setNo);
        return { exerciseId, esercizio: sets[0].esercizio, unitaCarico: sets[0].unitaCarico, sets };
      })
      .sort(
        (a, b) =>
          (order.get(a.exerciseId) ?? Infinity) - (order.get(b.exerciseId) ?? Infinity) ||
          a.exerciseId - b.exerciseId,
      );
  }
}

function isFinished(session: Session): boolean {
  return session.endedAt !== undefined;
}
