import { SetValues, WorkoutExercise } from '../../../core/models';
import { SetDraft, prefillSet, toSetValues } from '../../../core/services/workout/set-prefill';

/**
 * Text of a set row exactly as typed. Inputs are bound to text, not numbers, so they never
 * rewrite what the user is typing ("62," on the way to "62,5").
 */
export interface SetInput {
  kg: string;
  rip: string;
}

export interface SetRow {
  setNo: number;
  input: SetInput;
  /** Parsed values; null while the row is incomplete or invalid. */
  values: SetValues | null;
  /** Id of the recorded set; undefined while the set is not marked as done. */
  logId?: number;
}

/** What the user typed on a day and the sets added beyond the plan, per exercise. */
export interface DayDraft {
  inputs: ReadonlyMap<string, SetInput>;
  extraSets: ReadonlyMap<number, number>;
}

export const EMPTY_DAY_DRAFT: DayDraft = { inputs: new Map(), extraSets: new Map() };

export function setKey(exerciseId: number, setNo: number): string {
  return `${exerciseId}:${setNo}`;
}

/**
 * Rows of an exercise: the planned sets plus any added or recorded beyond the plan. Each row shows
 * what the user typed, else the recorded set, else the prefilled proposal.
 */
export function buildRows(entry: WorkoutExercise, draft: DayDraft, language: string): SetRow[] {
  const { exercise, sets } = entry;
  const recorded = new Map(sets.map((set) => [set.setNo, set]));
  const count = Math.max(
    exercise.serie + (draft.extraSets.get(exercise.id) ?? 0),
    sets.at(-1)?.setNo ?? 0,
  );
  return Array.from({ length: count }, (_, index) => {
    const setNo = index + 1;
    const log = recorded.get(setNo);
    const input =
      draft.inputs.get(setKey(exercise.id, setNo)) ??
      formatInput(log ?? prefillSet(entry, setNo), language);
    return { setNo, input, values: parseInput(input), logId: log?.id };
  });
}

export function formatInput({ kg, rip }: SetDraft, language: string): SetInput {
  const number = new Intl.NumberFormat(language, { maximumFractionDigits: 2, useGrouping: false });
  return { kg: kg === null ? '' : number.format(kg), rip: rip === null ? '' : String(rip) };
}

/** Accepts both decimal separators, "62,5" and "62.5": phone keyboards differ. */
export function parseInput({ kg, rip }: SetInput): SetValues | null {
  return toSetValues({ kg: parseNumber(kg), rip: parseNumber(rip) });
}

function parseNumber(text: string): number | null {
  const normalized = text.trim().replace(',', '.');
  return /^\d+(\.\d+)?$/.test(normalized) ? Number(normalized) : null;
}
