import type { SQLiteDatabase } from 'expo-sqlite';

import { DATABASE_VERSION, INITIAL_SCHEMA_SQL } from '@/db/schema';

export const DATABASE_NAME = 'offline-study-coach.db';

type UserVersionRow = {
  user_version: number;
};

export async function migrateDatabase(db: SQLiteDatabase) {
  // Journal mode cannot be changed while a transaction is active.
  await db.execAsync('PRAGMA journal_mode = WAL;');
  await db.execAsync('PRAGMA foreign_keys = ON;');

  const versionRow = await db.getFirstAsync<UserVersionRow>('PRAGMA user_version');
  const currentVersion = versionRow?.user_version ?? 0;

  if (currentVersion > DATABASE_VERSION) {
    throw new Error(
      `Database version ${currentVersion} is newer than supported version ${DATABASE_VERSION}.`
    );
  }

  if (currentVersion === 0) {
    await db.withTransactionAsync(async () => {
      await db.execAsync(INITIAL_SCHEMA_SQL);
      await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION}`);
    });
  }
}
