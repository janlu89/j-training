import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Phase } from '../models';
import { EntityRepository } from './entity.repository';

@Injectable({ providedIn: 'root' })
export class PhaseRepository extends EntityRepository<Phase> {
  protected get table() {
    return this.db.phases;
  }

  getActive(): Promise<Phase | undefined> {
    return this.table.where('status').equals('active').first();
  }

  watchActive(): Observable<Phase | undefined> {
    return this.watch(() => this.getActive());
  }
}
