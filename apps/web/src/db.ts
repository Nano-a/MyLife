import Dexie, { type EntityTable } from "dexie";
import type {
  AgendaEvent,
  AppPreferences,
  FinanceBalanceSnapshot,
  FinanceBudget,
  FinanceTransaction,
  Habit,
  HabitCompletion,
  HydrationDayEntry,
  NoteFolder,
  Objective,
  RichNote,
  SportSession,
  SportTemplate,
  UserProfile,
} from "@mylife/core";

export interface SettingsRow {
  key: string;
  value: unknown;
}

export interface HydrationRow {
  date: string;
  entries: HydrationDayEntry[];
}

export class MyLifeDB extends Dexie {
  settings!: EntityTable<SettingsRow, "key">;
  habits!: EntityTable<Habit, "id">;
  habitCompletions!: EntityTable<HabitCompletion & { id: string }, "id">;
  events!: EntityTable<AgendaEvent, "id">;
  sportSessions!: EntityTable<SportSession, "id">;
  sportTemplates!: EntityTable<SportTemplate, "id">;
  transactions!: EntityTable<FinanceTransaction, "id">;
  balanceSnapshots!: EntityTable<FinanceBalanceSnapshot, "id">;
  budgets!: EntityTable<FinanceBudget, "id">;
  objectives!: EntityTable<Objective, "id">;
  noteFolders!: EntityTable<NoteFolder, "id">;
  notes!: EntityTable<RichNote, "id">;
  hydrationDays!: EntityTable<HydrationRow, "date">;

  constructor() {
    super("mylife_db");

    this.version(1).stores({
      settings: "key",
      habits: "id, createdAt",
      habitCompletions: "id, habitId, date",
      events: "id, debut, fin",
      sportSessions: "id, debut",
      transactions: "id, date, type",
      balanceSnapshots: "id, date",
      objectives: "id, status, createdAt",
      notes: "id, updatedAt, epingle",
      hydrationDays: "date",
    });

    this.version(2)
      .stores({
        settings: "key",
        habits: "id, createdAt, archived",
        habitCompletions: "id, habitId, date",
        events: "id, debut, fin",
        sportSessions: "id, debut, templateId",
        sportTemplates: "id, createdAt",
        transactions: "id, date, type",
        balanceSnapshots: "id, date",
        budgets: "id, categorie",
        objectives: "id, status, createdAt",
        noteFolders: "id, parentId, createdAt",
        notes: "id, updatedAt, epingle, dossierId",
        hydrationDays: "date",
      })
      .upgrade((tx) => {
        // Migration notes : ajouter bgColor si absent
        return tx
          .table("notes")
          .toCollection()
          .modify((note) => {
            if (!note.bgColor) note.bgColor = "#18181f";
            if (!note.tags) note.tags = [];
          });
      });
  }
}

export const db = new MyLifeDB();

const PROFILE_KEY = "profile";
const PREFS_KEY = "prefs";

export async function getProfile(): Promise<UserProfile | null> {
  const row = await db.settings.get(PROFILE_KEY);
  return (row?.value as UserProfile) ?? null;
}

export async function saveProfile(p: UserProfile): Promise<void> {
  await db.settings.put({ key: PROFILE_KEY, value: p });
}

export async function getPrefs(): Promise<AppPreferences | null> {
  const row = await db.settings.get(PREFS_KEY);
  return (row?.value as AppPreferences) ?? null;
}

export async function savePrefs(p: AppPreferences): Promise<void> {
  await db.settings.put({ key: PREFS_KEY, value: p });
}
