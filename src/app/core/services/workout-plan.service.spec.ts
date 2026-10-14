import { TestBed } from '@angular/core/testing';
import { firstValueFrom, skip } from 'rxjs';
import { PlanRepository } from '../repositories/plan.repository';
import { SessionRepository } from '../repositories/session.repository';
import { newPlanExercise } from '../testing/fixtures';
import { useTestDatabase } from '../testing/test-database';
import { CLOCK } from './clock';
import { WorkoutPlanService } from './workout-plan.service';

/** Saturday 17 October 2026, midday local time. */
const SATURDAY = new Date('2026-10-17T12:00:00').getTime();

describe('WorkoutPlanService', () => {
  useTestDatabase();
  let service: WorkoutPlanService;
  let plans: PlanRepository;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [{ provide: CLOCK, useValue: () => SATURDAY }] });
    service = TestBed.inject(WorkoutPlanService);
    plans = TestBed.inject(PlanRepository);
  });

  async function savePlan(withWeekdays: boolean): Promise<number> {
    return plans.savePlan(
      {
        name: 'Luglio',
        fase: 7,
        importedAt: 1,
        days: [
          { key: 'a', ordine: 1, csvGiorno: 'A', ...(withWeekdays ? { weekday: 3 as const } : {}) },
          { key: 'b', ordine: 2, csvGiorno: 'B', ...(withWeekdays ? { weekday: 6 as const } : {}) },
        ],
        exercises: [newPlanExercise({ dayKey: 'a' }), newPlanExercise({ dayKey: 'b' })],
      },
      true,
    );
  }

  it('emits null without an active plan', async () => {
    expect(await firstValueFrom(service.watchToday())).toBeNull();
  });

  it("proposes the day assigned to today's weekday", async () => {
    await savePlan(true);
    const today = await firstValueFrom(service.watchToday());
    expect(today?.suggestion).toMatchObject({ reason: 'today', day: { day: { csvGiorno: 'B' } } });
  });

  it('follows the rotation after the last session', async () => {
    const phaseId = await savePlan(false);
    const first = await firstValueFrom(service.watchToday());
    expect(first?.suggestion?.day.day.csvGiorno).toBe('A');

    const next = firstValueFrom(service.watchToday().pipe(skip(1)));
    await firstValueFrom(service.watchToday());
    await TestBed.inject(SessionRepository).add({
      phaseId,
      dayId: first!.suggestion!.day.day.id,
      startedAt: SATURDAY - 3_600_000,
      endedAt: SATURDAY,
    });

    expect((await next)?.suggestion).toMatchObject({
      reason: 'rotation',
      day: { day: { csvGiorno: 'B' } },
    });
  });

  it('moves the rotation on after a skipped day but not while a workout is in progress', async () => {
    const phaseId = await savePlan(false);
    const today = (await firstValueFrom(service.watchToday()))!;
    const [a, b] = today.plan.days.map(({ day }) => day.id);
    const sessions = TestBed.inject(SessionRepository);
    await sessions.add({ phaseId, dayId: a, startedAt: 1, endedAt: 1, outcome: 'skipped' });
    await sessions.add({ phaseId, dayId: b, startedAt: 2 });

    const after = (await firstValueFrom(service.watchToday()))!;

    expect(after.suggestion?.day.day.id).toBe(b);
    expect(after.lastSessions.get(a)?.outcome).toBe('skipped');
    expect(after.lastSessions.has(b)).toBe(false);
  });

  it('keeps the most recent finished session of each day', async () => {
    const phaseId = await savePlan(false);
    const [a] = (await firstValueFrom(service.watchToday()))!.plan.days.map(({ day }) => day.id);
    const sessions = TestBed.inject(SessionRepository);
    await sessions.add({ phaseId, dayId: a, startedAt: 1, endedAt: 2, outcome: 'completed' });
    await sessions.add({ phaseId, dayId: a, startedAt: 5, endedAt: 5, outcome: 'skipped' });

    const today = (await firstValueFrom(service.watchToday()))!;

    expect(today.lastSessions.get(a)?.startedAt).toBe(5);
  });
});
