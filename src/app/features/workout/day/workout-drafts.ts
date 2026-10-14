import { Injectable, signal } from '@angular/core';
import { DayDraft, EMPTY_DAY_DRAFT, SetInput, setKey } from './set-rows';

/**
 * Typed values and added sets of each workout day, kept in memory for the whole app session.
 * Recorded sets are already in the database; this keeps the rest when the user leaves the day,
 * for example to edit an exercise in the middle of a workout, and comes back.
 */
@Injectable({ providedIn: 'root' })
export class WorkoutDrafts {
  private readonly days = signal<ReadonlyMap<number, DayDraft>>(new Map());

  forDay(dayId: number): DayDraft {
    return this.days().get(dayId) ?? EMPTY_DAY_DRAFT;
  }

  setInput(dayId: number, exerciseId: number, setNo: number, input: SetInput): void {
    this.update(dayId, (draft) => ({
      ...draft,
      inputs: new Map(draft.inputs).set(setKey(exerciseId, setNo), input),
    }));
  }

  addSet(dayId: number, exerciseId: number): void {
    this.update(dayId, (draft) => ({
      ...draft,
      extraSets: new Map(draft.extraSets).set(
        exerciseId,
        (draft.extraSets.get(exerciseId) ?? 0) + 1,
      ),
    }));
  }

  /** Called when the day is saved, skipped or its draft discarded. */
  clearDay(dayId: number): void {
    this.days.update((days) => {
      const next = new Map(days);
      next.delete(dayId);
      return next;
    });
  }

  private update(dayId: number, change: (draft: DayDraft) => DayDraft): void {
    this.days.update((days) =>
      new Map(days).set(dayId, change(days.get(dayId) ?? EMPTY_DAY_DRAFT)),
    );
  }
}
