import { Injectable, inject } from '@angular/core';
import { Observable, map, of, switchMap } from 'rxjs';
import { PlanDetail } from '../models';
import { PlanRepository } from '../repositories/plan.repository';
import { SessionRepository } from '../repositories/session.repository';
import { CLOCK } from './clock';
import { DaySuggestion, isoWeekday, suggestDay } from './day-suggestion';

export interface TodayPlan {
  plan: PlanDetail;
  suggestion: DaySuggestion | undefined;
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
              map((sessions) => ({
                plan,
                suggestion: suggestDay(
                  plan.days,
                  isoWeekday(new Date(this.clock())),
                  sessions[0]?.dayId,
                ),
              })),
            )
          : of(null),
      ),
    );
  }
}
