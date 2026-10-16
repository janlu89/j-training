import { Injectable } from '@angular/core';
import Dexie from 'dexie';
import { Observable } from 'rxjs';
import { Exercise, Phase } from '../models';
import { EntityRepository } from './entity.repository';

@Injectable({ providedIn: 'root' })
export class ExerciseRepository extends EntityRepository<Exercise> {
  protected get table() {
    return this.db.exercises;
  }

  /** Exercises of a day in plan order; soft-deleted ones (`rimosso`) are excluded. */
  getVisibleByDay(dayId: number): Promise<Exercise[]> {
    return this.table
      .where('[dayId+ordine]')
      .between([dayId, Dexie.minKey], [dayId, Dexie.maxKey])
      .filter((exercise) => exercise.stato !== 'rimosso')
      .toArray();
  }

  watchVisibleByDay(dayId: number): Observable<Exercise[]> {
    return this.watch(() => this.getVisibleByDay(dayId));
  }

  /**
   * One exercise per name across every plan, alphabetically: the choices for an exercise done in
   * place of another. A name found in several plans takes the exercise of the active plan, else
   * of the most recent one, so it comes with the latest sets, reps and rest.
   */
  getChoices(): Promise<Exercise[]> {
    const { db } = this;
    return db.transaction('r', db.phases, db.exercises, async () => {
      const phases = new Map((await db.phases.toArray()).map((phase) => [phase.id, phase]));
      const newest = new Map<string, Exercise>();
      for (const exercise of await this.table.toArray()) {
        const current = newest.get(exercise.esercizio);
        if (!current || preferred(exercise, current, phases)) {
          newest.set(exercise.esercizio, exercise);
        }
      }
      return [...newest.values()].sort((a, b) => a.esercizio.localeCompare(b.esercizio));
    });
  }

  watchChoices(): Observable<Exercise[]> {
    return this.watch(() => this.getChoices());
  }
}

/** Active plan first, then the most recently imported, then the most recently added exercise. */
function preferred(a: Exercise, b: Exercise, phases: ReadonlyMap<number, Phase>): boolean {
  const rank = (exercise: Exercise) => {
    const phase = phases.get(exercise.phaseId);
    return [phase?.status === 'active' ? 1 : 0, phase?.importedAt ?? 0, exercise.id];
  };
  const [first, second] = [rank(a), rank(b)];
  const index = first.findIndex((value, i) => value !== second[i]);
  return index >= 0 && first[index] > second[index];
}
