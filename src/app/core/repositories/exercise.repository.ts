import { Injectable } from '@angular/core';
import Dexie from 'dexie';
import { Observable } from 'rxjs';
import { Exercise } from '../models';
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
}
