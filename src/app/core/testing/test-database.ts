import { TestBed } from '@angular/core/testing';
import { AppDatabase } from '../db/app-database';

/**
 * Deletes the in-memory database (fake-indexeddb) after each test, so every test starts empty.
 * The database is resolved lazily: specs stay free to configure TestBed in their own beforeEach.
 */
export function useTestDatabase(): () => AppDatabase {
  const database = () => TestBed.inject(AppDatabase);

  afterEach(async () => {
    await database().delete();
  });

  return database;
}
