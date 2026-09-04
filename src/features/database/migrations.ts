import { SQLiteDatabase } from 'expo-sqlite';

type Migration = {
  version: number;
  description: string;
  up: (db: SQLiteDatabase) => Promise<void>;
};

const migrations: Migration[] = [
  {
    version: 1,
    description: 'initial schema: life_items, reminders, completion_history, app_settings',
    up: async (db) => {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS life_items (
          id TEXT PRIMARY KEY NOT NULL,
          title TEXT NOT NULL,
          category TEXT NOT NULL CHECK (category IN ('document','vehicle','home','digital','money','travel')),
          due_date TEXT NOT NULL,
          anchor_day INTEGER NOT NULL CHECK (anchor_day BETWEEN 1 AND 31),
          recurrence TEXT NOT NULL DEFAULT 'none' CHECK (recurrence IN ('none','monthly','quarterly','yearly')),
          recurrence_mode TEXT NOT NULL DEFAULT 'fixed_schedule' CHECK (recurrence_mode IN ('fixed_schedule','from_completion')),
          note TEXT NOT NULL DEFAULT '',
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          completed_at TEXT,
          last_completed_at TEXT
        );

        CREATE TABLE IF NOT EXISTS reminders (
          id TEXT PRIMARY KEY NOT NULL,
          item_id TEXT NOT NULL REFERENCES life_items(id) ON DELETE CASCADE,
          days_before INTEGER NOT NULL CHECK (days_before >= 0),
          notification_id TEXT,
          UNIQUE (item_id, days_before)
        );

        CREATE TABLE IF NOT EXISTS completion_history (
          id TEXT PRIMARY KEY NOT NULL,
          item_id TEXT NOT NULL REFERENCES life_items(id) ON DELETE CASCADE,
          scheduled_date TEXT NOT NULL,
          completed_at TEXT NOT NULL,
          note TEXT
        );

        CREATE TABLE IF NOT EXISTS app_settings (
          key TEXT PRIMARY KEY NOT NULL,
          value TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_life_items_due_date ON life_items(due_date);
        CREATE INDEX IF NOT EXISTS idx_life_items_completed_at ON life_items(completed_at);
        CREATE INDEX IF NOT EXISTS idx_reminders_item_id ON reminders(item_id);
        CREATE INDEX IF NOT EXISTS idx_completion_history_item ON completion_history(item_id);
      `);
    },
  },
  {
    version: 2,
    description: 'completion_history: capture previous state so Undo can restore it exactly',
    up: async (db) => {
      // Checked per-column (rather than one blind ALTER TABLE block) so a
      // v0.3.1 install that crashed mid-migration — columns added but
      // user_version never bumped — can still complete cleanly on retry
      // instead of failing on "duplicate column name".
      const columns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(completion_history);');
      const existing = new Set(columns.map((c) => c.name));
      const required: [string, string][] = [
        ['previous_due_date', 'TEXT'],
        ['previous_anchor_day', 'INTEGER'],
        ['previous_completed_at', 'TEXT'],
        ['previous_last_completed_at', 'TEXT'],
      ];
      for (const [name, type] of required) {
        if (!existing.has(name)) {
          await db.execAsync(`ALTER TABLE completion_history ADD COLUMN ${name} ${type};`);
        }
      }
    },
  },
];

export async function runMigrations(db: SQLiteDatabase): Promise<void> {
  await db.execAsync('PRAGMA foreign_keys = ON;');
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version;');
  let current = row?.user_version ?? 0;
  const pending = migrations.filter((m) => m.version > current).sort((a, b) => a.version - b.version);
  for (const migration of pending) {
    // The schema change and the user_version bump must commit together —
    // otherwise a crash between them leaves the DB one version ahead of
    // what user_version claims, and the next launch re-runs work it already did.
    await db.withTransactionAsync(async () => {
      await migration.up(db);
      await db.execAsync(`PRAGMA user_version = ${migration.version};`);
    });
    current = migration.version;
  }
}
