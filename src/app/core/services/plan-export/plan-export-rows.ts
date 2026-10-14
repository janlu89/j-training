import {
  Entity,
  Exercise,
  PlanRecords,
  PlanRow,
  PlanSetRow,
  SetRow,
  TrainingDay,
} from '../../models';

/** Visible exercises in plan order: day by day, then by position in the day. */
export function planRows({ days, exercises }: PlanRecords): PlanRow[] {
  return days.flatMap((day) =>
    inDay(day, exercises)
      .filter((exercise) => exercise.stato !== 'rimosso')
      .map((exercise) => ({ day, exercise })),
  );
}

/** Every set as a training diary: workout by workout, exercises in plan order, sets in order. */
export function setRows(records: PlanRecords): SetRow[] {
  const sessions = byId(records.sessions);
  const days = byId(records.days);
  const exercises = byId(records.exercises);
  const position = planPositions(records);
  return records.setLogs
    .flatMap((set) => {
      const session = sessions.get(set.sessionId);
      return session
        ? [{ session, set, day: days.get(session.dayId), exercise: exercises.get(set.exerciseId) }]
        : [];
    })
    .sort(
      (a, b) =>
        a.session.startedAt - b.session.startedAt ||
        a.session.id - b.session.id ||
        position(a.set.exerciseId) - position(b.set.exerciseId) ||
        a.set.exerciseId - b.set.exerciseId ||
        a.set.setNo - b.set.setNo,
    );
}

/**
 * One flat table, the plan expanded with its history: for each exercise in plan order, one row per
 * performed set (oldest first) or a single row without set when it was never performed. Sets of
 * exercises deleted with their day close the table, so no set is left out.
 */
export function planSetRows(records: PlanRecords): PlanSetRow[] {
  const sets = setRows(records);
  const days = byId(records.days);
  const rows = planOrder(records).flatMap((exercise): PlanSetRow[] => {
    const day = days.get(exercise.dayId);
    const performed = sets.filter((row) => row.exercise === exercise);
    if (!performed.length) {
      return exercise.stato === 'rimosso' ? [] : [{ day, exercise }];
    }
    return performed.map(({ session, set }) => ({ day, exercise, session, set }));
  });
  const orphans = sets
    .filter((row) => !row.exercise)
    .map(({ session, set, day }) => ({ day, session, set }));
  return [...rows, ...orphans];
}

function inDay(day: TrainingDay, exercises: readonly Exercise[]): Exercise[] {
  return exercises
    .filter((exercise) => exercise.dayId === day.id)
    .sort((a, b) => a.ordine - b.ordine || a.id - b.id);
}

/** All exercises of the plan, removed ones included, in plan order. */
function planOrder({ days, exercises }: PlanRecords): Exercise[] {
  return days.flatMap((day) => inDay(day, exercises));
}

/** Position of an exercise in the plan; exercises no longer in it go last. */
function planPositions(records: PlanRecords): (exerciseId: number) => number {
  const positions = new Map(planOrder(records).map((exercise, index) => [exercise.id, index]));
  return (exerciseId) => positions.get(exerciseId) ?? Number.MAX_SAFE_INTEGER;
}

function byId<T extends Entity>(records: readonly T[]): Map<number, T> {
  return new Map(records.map((record) => [record.id, record]));
}
