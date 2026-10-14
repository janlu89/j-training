import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { PlanEditorRepository } from '../../../core/repositories/plan-editor.repository';
import { SetLogRepository } from '../../../core/repositories/set-log.repository';
import { CLOCK } from '../../../core/services/clock';
import { newExerciseInput } from '../../../core/testing/fixtures';
import { useTestDatabase } from '../../../core/testing/test-database';
import { provideTranslocoForTests } from '../../../core/testing/transloco-testing';
import { WorkoutDayStore } from './workout-day-store';

describe('WorkoutDayStore', () => {
  useTestDatabase();
  let store: WorkoutDayStore;
  let exerciseId: number;

  beforeEach(async () => {
    const params = new BehaviorSubject(convertToParamMap({}));
    TestBed.configureTestingModule({
      providers: [
        WorkoutDayStore,
        provideTranslocoForTests(),
        { provide: CLOCK, useValue: () => 1_000 },
        { provide: ActivatedRoute, useValue: { paramMap: params } },
      ],
    });
    const editor = TestBed.inject(PlanEditorRepository);
    const phaseId = await editor.createPlan({ name: 'Ottobre', fase: 1 }, true);
    const dayId = await editor.addDay(phaseId, { csvGiorno: 'A' });
    exerciseId = await editor.addExercise(
      dayId,
      newExerciseInput({ esercizio: 'Squat', serie: 3, rip: '8', ultimoKg: 80 }),
    );
    params.next(convertToParamMap({ dayId: String(dayId) }));
    store = TestBed.inject(WorkoutDayStore);
    await settled(() => store.exercises().length === 1);
  });

  /** Waits for the live query to deliver the state the test expects. */
  async function settled(condition: () => boolean): Promise<void> {
    await vi.waitFor(() => {
      TestBed.tick();
      expect(condition()).toBe(true);
    });
  }

  const rows = () => store.exercises()[0].rows;

  it('records a set and keeps what was typed when it is unticked', async () => {
    await store.setInput(exerciseId, 1, { kg: '82,5', rip: '6' });
    await store.toggleSet(exerciseId, 1);
    await settled(() => rows()[0].logId !== undefined);
    expect(store.recordedCount()).toBe(1);
    expect(await TestBed.inject(SetLogRepository).getAll()).toEqual([
      expect.objectContaining({ esercizio: 'Squat', setNo: 1, kg: 82.5, rip: 6 }),
    ]);

    await store.toggleSet(exerciseId, 1);
    await settled(() => rows()[0].logId === undefined);
    expect(rows()[0].input).toEqual({ kg: '82,5', rip: '6' });
    expect(store.workout()?.session).toBeUndefined();
  });

  it('updates a recorded set while the user types', async () => {
    await store.toggleSet(exerciseId, 1);
    await settled(() => rows()[0].logId !== undefined);

    await store.setInput(exerciseId, 1, { kg: '85', rip: '8' });

    expect(await TestBed.inject(SetLogRepository).getById(rows()[0].logId!)).toMatchObject({
      kg: 85,
    });
  });

  it('flags a recorded set edited into an invalid value', async () => {
    await store.toggleSet(exerciseId, 1);
    await settled(() => rows()[0].logId !== undefined);

    await store.setInput(exerciseId, 1, { kg: '', rip: '8' });

    expect(store.hasInvalidRecorded()).toBe(true);
  });

  it('marks every complete set as done, including added ones', async () => {
    store.addSet(exerciseId);
    await settled(() => rows().length === 4);

    await store.markAllDone(exerciseId);

    await settled(() => store.recordedCount() === 4);
    expect(store.pendingCount()).toBe(0);
  });

  it('proposes the load used today for the plan', async () => {
    await store.setInput(exerciseId, 1, { kg: '90', rip: '5' });
    await store.toggleSet(exerciseId, 1);
    await settled(() => store.loadProposals().length === 1);
    expect(store.loadProposals()[0]).toMatchObject({ current: 80, proposed: 90 });
  });
});
