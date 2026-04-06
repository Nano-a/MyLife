import Dexie, { type EntityTable } from "dexie";
import type {
  AgendaEvent,
  AppPreferences,
  FinanceBalanceSnapshot,
  FinanceBudget,
  FinanceSubscription,
  FinanceTransaction,
  Habit,
  HabitCompletion,
  HydrationDayEntry,
  MoodDay,
  NoteFolder,
  RichNote,
  Objective,
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
  subscriptions!: EntityTable<FinanceSubscription, "id">;
  objectives!: EntityTable<Objective, "id">;
  noteFolders!: EntityTable<NoteFolder, "id">;
  notes!: EntityTable<RichNote, "id">;
  hydrationDays!: EntityTable<HydrationRow, "date">;
  moodDays!: EntityTable<MoodDay, "date">;

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

    this.version(3)
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
        subscriptions: "id, createdAt",
        objectives: "id, status, createdAt",
        noteFolders: "id, parentId, createdAt",
        notes: "id, updatedAt, epingle, dossierId",
        hydrationDays: "date",
      })
      .upgrade(async (tx) => {
        const rows = await tx.table("transactions").toArray();
        for (const t of rows as FinanceTransaction[]) {
          if (t.type !== "abonnement") continue;
          const j = parseInt(String(t.date).slice(8, 10), 10) || 1;
          await tx.table("subscriptions").add({
            id: crypto.randomUUID(),
            libelle: String(t.commentaire || t.categorie || "Abonnement").slice(0, 120),
            montant: t.montant,
            categorie: t.categorie,
            commentaire: t.commentaire,
            jourPrelevement: j,
            period: t.frequenceMois && t.frequenceMois >= 12 ? "yearly" : "monthly",
            moisActifs: undefined,
            sansFin: true,
            dateDebut: t.date,
            createdAt: typeof t.createdAt === "number" ? t.createdAt : Date.now(),
          });
          await tx.table("transactions").delete(t.id);
        }
      });

    this.version(4)
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
        subscriptions: "id, createdAt",
        objectives: "id, status, createdAt",
        noteFolders: "id, parentId, createdAt",
        notes: "id, updatedAt, epingle, dossierId",
        hydrationDays: "date",
        moodDays: "date",
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

/** Efface toutes les données locales (spec : suppression avec confirmation). */
export async function wipeAllLocalData(): Promise<void> {
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
    }
  );
}
