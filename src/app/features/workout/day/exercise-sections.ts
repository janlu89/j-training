import { ClosedExercise, ExerciseOutcome, WorkoutExercise } from '../../../core/models';
import { SetRow } from './set-rows';

/** An exercise of the workout page with a row per set. */
export interface ExerciseRows {
  entry: WorkoutExercise;
  rows: SetRow[];
}

/** An exercise still to do. */
export interface ToDoRows extends ExerciseRows {
  /** Name of the exercise it replaces, when it was added during the workout. */
  replaces?: string;
}

/** A finished exercise and how it ended. */
export interface ClosedRows extends ExerciseRows {
  outcome: ExerciseOutcome;
  /** Names of the exercises done in its place. */
  replacedBy: string[];
}

/** The two parts of the workout page. */
export interface ExerciseSections {
  /** Still to do, in plan order, each added exercise right after the one it replaces. */
  toDo: ToDoRows[];
  /** Finished, in the order they were closed. */
  closed: ClosedRows[];
}

/** Splits the exercises of the day; a closed exercise no longer in the plan is left out. */
export function splitSections(
  exercises: readonly ExerciseRows[],
  closed: readonly ClosedExercise[],
): ExerciseSections {
  const byId = new Map(exercises.map((item) => [item.entry.exercise.id, item]));
  const closedIds = new Set(closed.map(({ exerciseId }) => exerciseId));
  const name = (id: number | undefined) =>
    id === undefined ? undefined : byId.get(id)?.entry.exercise.esercizio;
  return {
    toDo: inWorkoutOrder(exercises)
      .filter((item) => !closedIds.has(item.entry.exercise.id))
      .map((item) => ({ ...item, replaces: name(item.entry.replaces) })),
    closed: closed.flatMap(({ exerciseId, outcome }) => {
      const item = byId.get(exerciseId);
      const replacedBy = exercises.flatMap(({ entry }) =>
        entry.replaces === exerciseId ? [entry.exercise.esercizio] : [],
      );
      return item ? [{ ...item, outcome, replacedBy }] : [];
    }),
  };
}

/** Planned exercises in order, each followed by the exercises added in its place. */
function inWorkoutOrder(exercises: readonly ExerciseRows[]): ExerciseRows[] {
  const ordered: ExerciseRows[] = [];
  const placed = new Set<ExerciseRows>();
  const place = (item: ExerciseRows) => {
    if (placed.has(item)) {
      return;
    }
    placed.add(item);
    ordered.push(item);
    exercises
      .filter(({ entry }) => entry.replaces === item.entry.exercise.id)
      .forEach((substitute) => place(substitute));
  };
  exercises.filter(({ entry }) => entry.replaces === undefined).forEach(place);
  // An exercise added in place of one deleted from the plan meanwhile goes last.
  exercises.forEach(place);
  return ordered;
}

/** Every row is ticked: the exercise can be closed as completed. */
export function allSetsDone(rows: readonly SetRow[]): boolean {
  return rows.length > 0 && rows.every((row) => row.logId !== undefined);
}

/** How many sets of an exercise are recorded. */
export function recordedCount(rows: readonly SetRow[]): number {
  return rows.filter((row) => row.logId !== undefined).length;
}

/**
 * The sets recorded for a finished exercise, as shown in its compact row: how many and the load
 * range, "60" or "60–70" for a pyramid. Null load when nothing was recorded.
 */
export function recordedSummary(
  rows: readonly SetRow[],
  language: string,
): { sets: number; kg: string | null } {
  const loads = rows.flatMap((row) =>
    row.logId !== undefined && row.values ? [row.values.kg] : [],
  );
  if (!loads.length) {
    return { sets: 0, kg: null };
  }
  const number = new Intl.NumberFormat(language, { maximumFractionDigits: 2 });
  const [min, max] = [Math.min(...loads), Math.max(...loads)];
  return {
    sets: loads.length,
    kg: min === max ? number.format(min) : `${number.format(min)}–${number.format(max)}`,
  };
}
