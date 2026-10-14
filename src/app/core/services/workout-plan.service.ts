import { Injectable, inject } from '@angular/core';
import { Observable, map, of, switchMap } from 'rxjs';
import { PlanDetail, Session } from '../models';
import { PlanRepository } from '../repositories/plan.repository';
import { SessionRepository } from '../repositories/session.repository';
import { CLOCK } from './clock';
import { DaySuggestion, isoWeekday, suggestDay } from './day-suggestion';

export interface TodayPlan {
  plan: PlanDetail;
  suggestion: DaySuggestion | undefined;
  /** The most recent finished session (completed or skipped) of each day, by day id. */
  lastSessions: ReadonlyMap<number, Session>;
}

/** The active plan together with the day proposed for today. */
@Injectable({ providedIn: 'root' })
export class WorkoutPlanService {
  private readonly plans = inject(PlanRepository);
  private readonly sessions = inject(SessionRepository);
  private readonly clock = inject(CLOCK);

  /** Emits null when there is no active plan; re-emits on every data change. */
  watchToday(): Observable<TodayPlan | null> {
    return this.plans.watchActivePlan().pipe(
      switchMap((plan) =>
        plan
          ? this.sessions.watchByPhase(plan.phase.id).pipe(
              map((sessions) => {
                // A draft does not move the rotation: only saved or skipped days do.
                const finished = sessions.filter((session) => session.endedAt !== undefined);
                return {
                  plan,
                  suggestion: suggestDay(
                    plan.days,
                    isoWeekday(new Date(this.clock())),
                    finished[0]?.dayId,
                  ),
                  lastSessions: lastSessionByDay(finished),
                };
              }),
            )
          : of(null),
      ),
    );
  }
}

/** `sessions` are ordered most recent first, so the first one seen for a day is its latest. */
function lastSessionByDay(sessions: readonly Session[]): Map<number, Session> {
  const byDay = new Map<number, Session>();
  for (const session of sessions) {
    if (!byDay.has(session.dayId)) {
      byDay.set(session.dayId, session);
    }
  }
  return byDay;
}
