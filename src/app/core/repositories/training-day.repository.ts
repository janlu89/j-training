import { Injectable } from '@angular/core';
import Dexie from 'dexie';
import { Observable } from 'rxjs';
import { TrainingDay } from '../models';
import { EntityRepository } from './entity.repository';

@Injectable({ providedIn: 'root' })
export class TrainingDayRepository extends EntityRepository<TrainingDay> {
  protected get table() {
    return this.db.days;
  }

  /** Days of a phase in plan order. */
  getByPhase(phaseId: number): Promise<TrainingDay[]> {
    return this.table
      .where('[phaseId+ordine]')
      .between([phaseId, Dexie.minKey], [phaseId, Dexie.maxKey])
      .toArray();
  }

  watchByPhase(phaseId: number): Observable<TrainingDay[]> {
    return this.watch(() => this.getByPhase(phaseId));
  }
}
