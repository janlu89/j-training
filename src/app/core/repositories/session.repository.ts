import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Session } from '../models';
import { EntityRepository } from './entity.repository';

@Injectable({ providedIn: 'root' })
export class SessionRepository extends EntityRepository<Session> {
  protected get table() {
    return this.db.sessions;
  }

  /** Sessions of a phase, most recent first. */
  async getByPhase(phaseId: number): Promise<Session[]> {
    const sessions = await this.table.where('phaseId').equals(phaseId).sortBy('startedAt');
    return sessions.reverse();
  }

  watchByPhase(phaseId: number): Observable<Session[]> {
    return this.watch(() => this.getByPhase(phaseId));
  }
}
