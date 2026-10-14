import { Injectable } from '@angular/core';
import Dexie from 'dexie';
import { Observable } from 'rxjs';
import { SetLog } from '../models';
import { EntityRepository } from './entity.repository';

@Injectable({ providedIn: 'root' })
export class SetLogRepository extends EntityRepository<SetLog> {
  protected get table() {
    return this.db.setLogs;
  }

  /** History of an exact exercise name across all phases, oldest first. */
  getByExerciseName(esercizio: string): Promise<SetLog[]> {
    return this.table
      .where('[esercizio+date]')
      .between([esercizio, Dexie.minKey], [esercizio, Dexie.maxKey])
      .toArray();
  }

  watchByExerciseName(esercizio: string): Observable<SetLog[]> {
    return this.watch(() => this.getByExerciseName(esercizio));
  }

  getBySession(sessionId: number): Promise<SetLog[]> {
    return this.table.where('sessionId').equals(sessionId).toArray();
  }
}
