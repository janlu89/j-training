import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Session } from '../models';
import { EntityRepository } from './entity.repository';

@Injectable({ providedIn: 'root' })
export class SessionRepository extends EntityRepository<Session> {
  protected get table() {
    return this.db.sessions;
  }

  /** Sessions of a phase, most recent first; the id breaks ties between equal start times. */
  async getByPhase(phaseId: number): Promise<Session[]> {
    const sessions = await this.table.where('phaseId').equals(phaseId).toArray();
    return sessions.sort((a, b) => b.startedAt - a.startedAt || b.id - a.id);
  }

  watchByPhase(phaseId: number): Observable<Session[]> {
    return this.watch(() => this.getByPhase(phaseId));
  }
}
