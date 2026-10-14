import { SetValues, WorkoutExercise } from '../../models';

/** Values of a set row before it is recorded: either may still be empty. */
export interface SetDraft {
  kg: number | null;
  rip: number | null;
}

const MAX_KG = 1000;
const MAX_REPS = 999;

/**
 * Reps planned for a set, read from the free-text plan: "10" gives 10 for every set, a range
 * "8-10" its lower bound, a pyramid "12-10-8" one value per set (the last one repeated when there
 * are more sets). Text without numbers ("max") gives null: the user types the reps.
 */
export function plannedReps(rip: string, setNo: number): number | null {
  const numbers = (rip.match(/\d+/g) ?? []).map(Number);
  if (!numbers.length) {
    return null;
  }
  const isRange = numbers.length === 2 && numbers[0] < numbers[1];
  return isRange ? numbers[0] : numbers[Math.min(setNo, numbers.length) - 1];
}

/**
 * Proposed values for a set not recorded yet. Reps: the plan target, which may change from one
 * plan to the next. Load: see `proposedKg`, else the plan load; an active exercise without a plan
 * load is bodyweight work (0 kg), while one still to be tested is left empty for the user.
 */
export function prefillSet(entry: WorkoutExercise, setNo: number): SetDraft {
  const { exercise } = entry;
  const planKg = exercise.ultimoKg ?? (exercise.stato === 'da_testare' ? null : 0);
  return { kg: proposedKg(entry, setNo) ?? planKg, rip: plannedReps(exercise.rip, setNo) };
}

/**
 * Load from the recorded history. Today's latest earlier set gives the level and the last session
 * the steps between sets, so a pyramid keeps its shape (last time 60 → 65, today 62.5 → 67.5) and
 * straight sets follow today's load. Without sets today: the same set of the last session, else
 * its last set.
 */
function proposedKg({ sets, previous }: WorkoutExercise, setNo: number): number | null {
  const lastTime = (no: number) => previous.find((set) => set.setNo === no) ?? previous.at(-1);
  const earlier = sets.filter((set) => set.setNo < setNo).at(-1);
  if (!earlier) {
    return lastTime(setNo)?.kg ?? null;
  }
  const step = (lastTime(setNo)?.kg ?? 0) - (lastTime(earlier.setNo)?.kg ?? 0);
  return Math.max(0, Math.round((earlier.kg + step) * 100) / 100);
}

/** A set can be recorded once it has a load (0 for bodyweight work) and at least one rep. */
export function toSetValues({ kg, rip }: SetDraft): SetValues | null {
  const validKg = kg !== null && Number.isFinite(kg) && kg >= 0 && kg <= MAX_KG;
  const validRip = rip !== null && Number.isInteger(rip) && rip >= 1 && rip <= MAX_REPS;
  return validKg && validRip ? { kg, rip } : null;
}
