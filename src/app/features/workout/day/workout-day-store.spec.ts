import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { PlanEditorRepository } from '../../../core/repositories/plan-editor.repository';
import { SetLogRepository } from '../../../core/repositories/set-log.repository';
import { CLOCK } from '../../../core/services/clock';
import { RestTimerService } from '../../../core/services/rest-timer/rest-timer.service';
import { newExerciseInput } from '../../../core/testing/fixtures';
import { useTestDatabase } from '../../../core/testing/test-database';
import { provideTranslocoForTests } from '../../../core/testing/transloco-testing';
import { WorkoutDayStore } from './workout-day-store';

describe('WorkoutDayStore', () => {
  useTestDatabase();
  let store: WorkoutDayStore;
  let exerciseId: number;
  let startRest: ReturnType<typeof vi.fn>;
  let dayId: number;

  beforeEach(async () => {
    const params = new BehaviorSubject(convertToParamMap({}));
    startRest = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        WorkoutDayStore,
        provideTranslocoForTests(),
        { provide: CLOCK, useValue: () => 1_000 },
        { provide: ActivatedRoute, useValue: { paramMap: params } },
        { provide: RestTimerService, useValue: { start: startRest } },
      ],
    });
    const editor = TestBed.inject(PlanEditorRepository);
    const phaseId = await editor.createPlan({ name: 'Ottobre', fase: 1 }, true);
    dayId = await editor.addDay(phaseId, { csvGiorno: 'A' });
    exerciseId = await editor.addExercise(
      dayId,
      newExerciseInput({ esercizio: 'Squat', serie: 3, rip: '8', ultimoKg: 80, recSec: 150 }),
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

  it('does not start any rest by itself when a set is ticked', async () => {
    await store.toggleSet(exerciseId, 1);
    await settled(() => rows()[0].logId !== undefined);
    expect(startRest).not.toHaveBeenCalled();
  });

  it('starts the rest between sets by hand, with the exercise rest time', () => {
    store.startRest(exerciseId);
    expect(startRest).toHaveBeenCalledWith({
      kind: 'sets',
      exerciseId,
      exercise: 'Squat',
      seconds: 150,
    });
  });

  it('starts the rest before an exercise by hand, 2 minutes by default', async () => {
    const bench = await TestBed.inject(PlanEditorRepository).addExercise(
      dayId,
      newExerciseInput({ esercizio: 'Panca piana', serie: 2, recSec: 90 }),
    );
    await settled(() => store.exercises().length === 2);

    store.startExerciseRest(bench);

    expect(startRest).toHaveBeenCalledWith({
      kind: 'exercises',
      exerciseId: bench,
      exercise: 'Panca piana',
      seconds: 120,
    });
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
    expect(store.untickedEntries()).toEqual([]);
  });

  it('removes the last set, also below the plan and also when it was recorded', async () => {
    await store.removeLastSet(exerciseId);
    await settled(() => rows().length === 2);

    await store.toggleSet(exerciseId, 2);
    await settled(() => store.recordedCount() === 1);
    await store.removeLastSet(exerciseId);

    await settled(() => rows().length === 1 && store.recordedCount() === 0);
    expect(store.workout()?.session).toBeUndefined();
  });

  it('saves a day filled in at the end, without ticking any set', async () => {
    await store.setInput(exerciseId, 1, { kg: '85', rip: '8' });
    expect(store.includeUnticked()).toBe(true);
    expect(store.canSave()).toBe(true);
    expect(store.loadProposals()[0]).toMatchObject({ current: 80, proposed: 85 });

    await store.save([]);

    const logs = await TestBed.inject(SetLogRepository).getAll();
    expect(logs.map((log) => [log.setNo, log.kg])).toEqual([
      [1, 85],
      [2, 80],
      [3, 80],
    ]);
  });

  it('saves only the ticked sets when the user leaves the others out', async () => {
    await store.toggleSet(exerciseId, 1);
    await settled(() => store.recordedCount() === 1);
    expect(store.includeUnticked()).toBe(false);

    await store.save([]);

    expect(await TestBed.inject(SetLogRepository).getAll()).toHaveLength(1);
  });

  it('moves an exercise to the finished ones and back, keeping its sets', async () => {
    await store.markAllDone(exerciseId);
    await settled(() => store.recordedCount() === 3);

    await store.complete(exerciseId);
    await settled(() => store.sections().closed.length === 1);
    expect(store.sections().toDo).toEqual([]);
    expect(store.sections().closed[0].outcome).toBe('completed');

    await store.reopen(exerciseId);
    await settled(() => store.sections().toDo.length === 1);
    expect(store.sections().closed).toEqual([]);
    expect(store.recordedCount()).toBe(3);
  });

  it('saves only the recorded sets of a finished exercise', async () => {
    await TestBed.inject(PlanEditorRepository).addExercise(
      dayId,
      newExerciseInput({ esercizio: 'Panca piana', serie: 2, rip: '10', ultimoKg: 60 }),
    );
    await settled(() => store.exercises().length === 2);
    await store.toggleSet(exerciseId, 1);
    await store.complete(exerciseId);
    await settled(() => store.sections().closed.length === 1);

    store.includeUnticked.set(true);
    expect(store.untickedEntries().map(({ exercise }) => exercise.esercizio)).toEqual([
      'Panca piana',
      'Panca piana',
    ]);
    await store.save([]);

    const logs = await TestBed.inject(SetLogRepository).getAll();
    expect(logs.map((log) => [log.esercizio, log.setNo])).toEqual([
      ['Squat', 1],
      ['Panca piana', 1],
      ['Panca piana', 2],
    ]);
  });

  it('skips an exercise: its prefilled sets are not saved with the day', async () => {
    await TestBed.inject(PlanEditorRepository).addExercise(
      dayId,
      newExerciseInput({ esercizio: 'Panca piana', serie: 2, rip: '10', ultimoKg: 60 }),
    );
    await settled(() => store.exercises().length === 2);

    await store.skipExercise(exerciseId);
    await settled(() => store.sections().closed.length === 1);

    expect(store.sections().closed[0].outcome).toBe('skipped');
    expect(store.includeUnticked()).toBe(true);
    await store.save([]);
    const logs = await TestBed.inject(SetLogRepository).getAll();
    expect(logs.map((log) => log.esercizio)).toEqual(['Panca piana', 'Panca piana']);
  });

  it('replaces an exercise with one of another day, leaving the plan load alone', async () => {
    const editor = TestBed.inject(PlanEditorRepository);
    const otherDay = await editor.addDay(store.workout()!.phase.id, { csvGiorno: 'B' });
    const hack = await editor.addExercise(
      otherDay,
      newExerciseInput({ esercizio: 'Hack squat', serie: 2, rip: '10', ultimoKg: 100 }),
    );
    await editor.addExercise(otherDay, newExerciseInput({ esercizio: 'Squat' }));
    await settled(() => store.replacementOptions().length === 1);
    expect(store.replacementOptions()[0].id).toBe(hack);

    await store.replace(exerciseId, hack);
    await settled(() => store.sections().toDo[0].entry.exercise.id === hack);

    expect(store.sections().toDo[0]).toMatchObject({ replaces: 'Squat' });
    expect(store.sections().closed[0].replacedBy).toEqual(['Hack squat']);
    expect(store.replacementOptions()).toEqual([]);
    await store.setInput(hack, 1, { kg: '110', rip: '10' });
    await store.toggleSet(hack, 1);
    await settled(() => store.recordedCount() === 1);
    expect(store.loadProposals()).toEqual([]);
  });

  it('proposes the load used today for the plan', async () => {
    await store.setInput(exerciseId, 1, { kg: '90', rip: '5' });
    await store.toggleSet(exerciseId, 1);
    await settled(() => store.loadProposals().length === 1);
    expect(store.loadProposals()[0]).toMatchObject({ current: 80, proposed: 90 });
  });
});
