import type { Table } from "dexie";
import { db } from "../db";

const EXPORT_VERSION = 4;

/** Export JSON de toutes les tables locales (sauvegarde / migration). */
export async function exportDatabaseJson(): Promise<string> {
  const payload = {
    mylifeExport: true,
    version: EXPORT_VERSION,
    exportedAt: Date.now(),
    settings: await db.settings.toArray(),
    habits: await db.habits.toArray(),
    habitCompletions: await db.habitCompletions.toArray(),
    events: await db.events.toArray(),
    sportSessions: await db.sportSessions.toArray(),
    sportTemplates: await db.sportTemplates.toArray(),
    transactions: await db.transactions.toArray(),
    balanceSnapshots: await db.balanceSnapshots.toArray(),
    budgets: await db.budgets.toArray(),
    subscriptions: await db.subscriptions.toArray(),
    objectives: await db.objectives.toArray(),
    noteFolders: await db.noteFolders.toArray(),
    notes: await db.notes.toArray(),
    hydrationDays: await db.hydrationDays.toArray(),
    moodDays: await db.moodDays.toArray(),
  };
  return JSON.stringify(payload, null, 0);
}

/** Remplace toutes les données par le contenu d’un export (⚠️ destructif). */
export async function importDatabaseJson(json: string): Promise<void> {
  const data = JSON.parse(json) as Record<string, unknown>;
  if (!data.mylifeExport || typeof data.version !== "number") {
    throw new Error("Fichier d’export invalide");
  }

  await db.transaction(
    "rw",
    [
      db.settings,
      db.habits,
      db.habitCompletions,
      db.events,
      db.sportSessions,
      db.sportTemplates,
      db.transactions,
      db.balanceSnapshots,
      db.budgets,
      db.subscriptions,
      db.objectives,
      db.noteFolders,
      db.notes,
      db.hydrationDays,
      db.moodDays,
    ],
    async () => {
      await db.moodDays.clear();
      await db.hydrationDays.clear();
      await db.notes.clear();
      await db.noteFolders.clear();
      await db.objectives.clear();
      await db.subscriptions.clear();
      await db.budgets.clear();
      await db.balanceSnapshots.clear();
      await db.transactions.clear();
      await db.sportTemplates.clear();
      await db.sportSessions.clear();
      await db.events.clear();
      await db.habitCompletions.clear();
      await db.habits.clear();
      await db.settings.clear();

      const putAll = async <T>(table: Table<T>, rows: unknown) => {
        if (Array.isArray(rows) && rows.length) await table.bulkPut(rows as T[]);
      };

      await putAll(db.settings, data.settings as never[]);
      await putAll(db.habits, data.habits as never[]);
      await putAll(db.habitCompletions, data.habitCompletions as never[]);
      await putAll(db.events, data.events as never[]);
      await putAll(db.sportSessions, data.sportSessions as never[]);
      await putAll(db.sportTemplates, data.sportTemplates as never[]);
      await putAll(db.transactions, data.transactions as never[]);
      await putAll(db.balanceSnapshots, data.balanceSnapshots as never[]);
      await putAll(db.budgets, data.budgets as never[]);
      await putAll(db.subscriptions, data.subscriptions as never[]);
      await putAll(db.objectives, data.objectives as never[]);
      await putAll(db.noteFolders, data.noteFolders as never[]);
      await putAll(db.notes, data.notes as never[]);
      await putAll(db.hydrationDays, data.hydrationDays as never[]);
      await putAll(db.moodDays, data.moodDays as never[]);
    }
  );
}
