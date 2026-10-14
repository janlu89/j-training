import { inject } from '@angular/core';
import { Table, UpdateSpec, liveQuery } from 'dexie';
import { Observable, from } from 'rxjs';
import { AppDatabase } from '../db/app-database';
import { Entity, NewEntity } from '../models';

/**
 * Common data access for one table. Reads that must stay in sync with the UI are exposed
 * through `watch`: a Dexie live query re-emits whenever the underlying data changes,
 * and components convert it with `toSignal`.
 */
export abstract class EntityRepository<T extends Entity> {
  protected readonly db = inject(AppDatabase);

  protected abstract get table(): Table<T, number, NewEntity<T>>;

  getById(id: number): Promise<T | undefined> {
    return this.table.get(id);
  }

  getAll(): Promise<T[]> {
    return this.table.toArray();
  }

  add(entity: NewEntity<T>): Promise<number> {
    return this.table.add(entity);
  }

  /** Returns false when no record with the given id exists. */
  async update(id: number, changes: Partial<NewEntity<T>>): Promise<boolean> {
    const updated = await this.table.update(id, changes as UpdateSpec<NewEntity<T>>);
    return updated === 1;
  }

  protected watch<R>(query: () => Promise<R>): Observable<R> {
    return from(liveQuery(query));
  }
}
