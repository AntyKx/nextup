import { openDatabaseAsync, SQLiteDatabase } from 'expo-sqlite';

import { runMigrations } from '@/features/database/migrations';

let dbPromise: Promise<SQLiteDatabase> | null = null;

export function getDatabase(): Promise<SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = openDatabaseAsync('nextup.db').then(async (db) => {
      await runMigrations(db);
      return db;
    });
  }
  return dbPromise;
}
