"use client";

import type { AppPreferences, UserProfile as CoreUserProfile } from "@mylife/core";
import { useLiveQuery } from "dexie-react-hooks";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import { defaultPrefs } from "@/lib/mylife/defaults";
import {
  db,
  saveProfile,
  wipeAllLocalData,
} from "@/lib/mylife/db";
import { ensureSeedData } from "@/lib/mylife/initDb";
import { exportDatabaseJson, importDatabaseJson } from "@/lib/mylife/lib/backup";
import { useThemePrefs } from "@/lib/mylife/theme/ThemeProvider";
import {
  accentHexForUi,
  categoryName,
  completionToLog,
  coreAgendaToUi,
  coreHabitToUi,
  coreFolderToUi,
  coreNoteToUi,
  coreProfileToUi,
  coreSportSessionToUi,
  coreTxToUi,
  defaultLifeflowUiBlob,
  hydrationRowsToLogs,
  mapFontSizeToTextScale,
  mergeAppSettings,
  milestoneToSubtask,
  moodDayToEntry,
  objectiveToUiGoal,
  prefsFromNotificationPatch,
  type LifeflowUiBlob,
  type StoredAgendaEvent,
  subtasksToMilestones,
  templateToActivity,
  uiAgendaToCore,
  uiFolderToCore,
  uiGoalToObjective,
  uiHabitToCore,
  uiNoteToCore,
  uiProfileToCore,
  uiTxToCore,
  uiThemeToPrefs,
} from "@/lib/mylife/ui-bridge";
import type {
  AgendaEvent,
  AppSettings,
  BalanceRecord,
  Goal,
  GoalMilestone,
  Habit,
  HabitLog,
  HydrationGoal,
  HydrationLog,
  MoodEntry,
  Note,
  NoteFolder,
  SportActivity,
  SportSession,
  Subscription,
  Transaction,
  UserProfile,
} from "@/lib/types";
import { useNavStore } from "@/lib/nav-store";

const LIFEFLOW_UI_KEY = "lifeflow_ui";

type LifeFlowDataContextValue = {
  profile: UserProfile | undefined;
  settings: AppSettings;
  setProfile: (profile: UserProfile) => void;
  updateProfile: (updates: Partial<UserProfile>) => void;
  updateSettings: (updates: Partial<AppSettings>) => void;
  setTheme: (theme: AppSettings["theme"]) => void;
  exportData: () => Promise<string>;
  importData: (json: string) => Promise<boolean>;
  resetData: () => Promise<void>;

  events: AgendaEvent[];
  addEvent: (event: Omit<AgendaEvent, "id" | "createdAt">) => void;
  updateEvent: (id: string, updates: Partial<AgendaEvent>) => void;
  deleteEvent: (id: string) => void;
  toggleEventComplete: (id: string) => void;

  habits: Habit[];
  habitLogs: HabitLog[];
  addHabit: (habit: Omit<Habit, "id" | "createdAt">) => void;
  updateHabit: (id: string, updates: Partial<Habit>) => void;
  deleteHabit: (id: string) => void;
  logHabit: (log: Omit<HabitLog, "id">) => void;

  sportActivities: SportActivity[];
  sportSessions: SportSession[];
  addSportSession: (session: Omit<SportSession, "id" | "createdAt">) => void;
  deleteSportSession: (id: string) => void;

  hydrationLogs: HydrationLog[];
  hydrationGoal: HydrationGoal;
  addHydration: (amount: number) => void;
  setHydrationGoal: (goal: number) => void;

  moodEntries: MoodEntry[];
  addMoodEntry: (entry: Omit<MoodEntry, "id" | "createdAt">) => void;
  updateMoodEntry: (id: string, updates: Partial<MoodEntry>) => void;

  transactions: Transaction[];
  financeCategories: import("@/lib/types").FinanceCategory[];
  addTransaction: (t: Omit<Transaction, "id" | "createdAt">) => void;
  updateTransaction: (id: string, updates: Partial<Transaction>) => void;
  deleteTransaction: (id: string) => void;
  addSubscription: (s: Omit<Subscription, "id">) => void;
  updateSubscription: (id: string, updates: Partial<Subscription>) => void;
  deleteSubscription: (id: string) => void;
  addBalanceRecord: (r: Omit<BalanceRecord, "id">) => void;

  goals: Goal[];
  goalMilestones: GoalMilestone[];
  addGoal: (goal: Omit<Goal, "id" | "createdAt" | "updatedAt">) => void;
  updateGoal: (id: string, updates: Partial<Goal>) => void;
  deleteGoal: (id: string) => void;
  addMilestone: (milestone: Omit<GoalMilestone, "id">) => void;
  toggleMilestone: (id: string) => void;

  notes: Note[];
  noteFolders: NoteFolder[];
  addNote: (note: Omit<Note, "id" | "createdAt" | "updatedAt">) => void;
  updateNote: (id: string, updates: Partial<Note>) => void;
  deleteNote: (id: string) => void;
  addFolder: (folder: Omit<NoteFolder, "id">) => void;
  deleteFolder: (id: string) => void;
};

const LifeFlowDataContext = createContext<LifeFlowDataContextValue | null>(null);

async function readUiBlob(): Promise<LifeflowUiBlob> {
  const row = await db.settings.get(LIFEFLOW_UI_KEY);
  return { ...defaultLifeflowUiBlob(), ...(row?.value as Partial<LifeflowUiBlob>) };
}

async function patchUiBlob(patch: Partial<LifeflowUiBlob>): Promise<void> {
  const cur = await readUiBlob();
  await db.settings.put({ key: LIFEFLOW_UI_KEY, value: { ...cur, ...patch } });
}

export function LifeFlowDataProvider({ children }: { children: ReactNode }) {
  const { prefs, setPrefs, refresh } = useThemePrefs();

  const settingsRows = useLiveQuery(() => db.settings.toArray(), []) ?? [];

  const uiBlob = useMemo(() => {
    const row = settingsRows.find((r) => r.key === LIFEFLOW_UI_KEY);
    return { ...defaultLifeflowUiBlob(), ...(row?.value as Partial<LifeflowUiBlob>) };
  }, [settingsRows]);

  const profileCore = settingsRows.find((r) => r.key === "profile")
    ?.value as CoreUserProfile | undefined;
  const profile = profileCore ? coreProfileToUi(profileCore) : undefined;

  const settings = useMemo(
    () => mergeAppSettings({ ...defaultPrefs, ...prefs }, uiBlob),
    [prefs, uiBlob]
  );

  const eventsRaw = useLiveQuery(() => db.events.toArray(), []) ?? [];
  const events = useMemo(
    () => eventsRaw.map((e) => coreAgendaToUi(e as StoredAgendaEvent)),
    [eventsRaw]
  );

  const habitsRaw = useLiveQuery(() => db.habits.toArray(), []) ?? [];
  const habits = useMemo(
    () => habitsRaw.filter((h) => !h.archived).map((h) => coreHabitToUi(h)),
    [habitsRaw]
  );

  const completionsRaw =
    useLiveQuery(() => db.habitCompletions.toArray(), []) ?? [];
  const habitLogs = useMemo(
    () => completionsRaw.map((c) => completionToLog(c)),
    [completionsRaw]
  );

  const templatesRaw =
    useLiveQuery(() => db.sportTemplates.orderBy("createdAt").toArray(), []) ?? [];
  const sportActivities = useMemo(
    () => templatesRaw.map((t) => templateToActivity(t)),
    [templatesRaw]
  );

  const sportSessionsRaw =
    useLiveQuery(() => db.sportSessions.orderBy("debut").reverse().toArray(), []) ?? [];
  const sportSessions = useMemo(
    () =>
      sportSessionsRaw.map((s) => coreSportSessionToUi(s, templatesRaw)),
    [sportSessionsRaw, templatesRaw]
  );

  const hydrationRows =
    useLiveQuery(() => db.hydrationDays.toArray(), []) ?? [];
  const hydrationLogs = useMemo(
    () => hydrationRowsToLogs(hydrationRows),
    [hydrationRows]
  );

  const moodRows = useLiveQuery(() => db.moodDays.toArray(), []) ?? [];
  const moodEntries = useMemo(
    () => moodRows.map((m) => moodDayToEntry(m)),
    [moodRows]
  );

  const transactionsRaw =
    useLiveQuery(() => db.transactions.toArray(), []) ?? [];
  const transactions = useMemo(
    () =>
      transactionsRaw.map((t) => coreTxToUi(t, uiBlob.financeCategories)),
    [transactionsRaw, uiBlob.financeCategories]
  );

  const objectivesRaw =
    useLiveQuery(() => db.objectives.toArray(), []) ?? [];
  const goals = useMemo(
    () => objectivesRaw.map((o) => objectiveToUiGoal(o)),
    [objectivesRaw]
  );
  const goalMilestones = useMemo(
    () => objectivesRaw.flatMap((o) => subtasksToMilestones(o)),
    [objectivesRaw]
  );

  const notesRaw = useLiveQuery(() => db.notes.toArray(), []) ?? [];
  const notes = useMemo(() => notesRaw.map((n) => coreNoteToUi(n)), [notesRaw]);

  const foldersRaw = useLiveQuery(() => db.noteFolders.toArray(), []) ?? [];
  const noteFolders = useMemo(
    () => foldersRaw.map((f) => coreFolderToUi(f)),
    [foldersRaw]
  );

  useEffect(() => {
    void ensureSeedData();
  }, []);

  const updateProfile = useCallback(
    async (updates: Partial<UserProfile>) => {
      const curUi =
        profile ??
        (profileCore ? coreProfileToUi(profileCore) : undefined);
      if (!curUi) return;
      const merged: UserProfile = { ...curUi, ...updates, updatedAt: new Date().toISOString() };
      await saveProfile(uiProfileToCore(merged));
    },
    [profile, profileCore]
  );

  const setProfile = useCallback(
    async (p: UserProfile) => {
      await saveProfile(uiProfileToCore(p));
    },
    []
  );

  const updateSettings = useCallback(
    async (updates: Partial<AppSettings>) => {
      const prefsPatch: Partial<AppPreferences> = {};
      if (updates.theme !== undefined) {
        prefsPatch.theme = uiThemeToPrefs(updates.theme);
      }
      if (updates.notifications) {
        Object.assign(
          prefsPatch,
          prefsFromNotificationPatch({ ...defaultPrefs, ...prefs }, updates.notifications)
        );
      }
      if (updates.fontSize !== undefined) {
        prefsPatch.textScale = mapFontSizeToTextScale(updates.fontSize);
      }
      if (updates.accentColor !== undefined) {
        prefsPatch.accentColor = accentHexForUi(updates.accentColor);
      }
      if (updates.pinEnabled !== undefined) {
        prefsPatch.pinEnabled = updates.pinEnabled;
      }
      if (Object.keys(prefsPatch).length) await setPrefs(prefsPatch);

      const uiPatch: Partial<LifeflowUiBlob> = {};
      if (updates.accentColor !== undefined) uiPatch.accentColor = updates.accentColor;
      if (updates.fontSize !== undefined) uiPatch.fontSize = updates.fontSize;
      if (updates.wallpaper !== undefined) uiPatch.wallpaper = updates.wallpaper;
      if (updates.notifications !== undefined) uiPatch.notifications = updates.notifications;
      if (updates.pinEnabled !== undefined) uiPatch.pinEnabled = updates.pinEnabled;
      if (updates.pin !== undefined) uiPatch.pin = updates.pin;
      if (Object.keys(uiPatch).length) await patchUiBlob(uiPatch);
    },
    [prefs, setPrefs]
  );

  const setTheme = useCallback(
    (theme: AppSettings["theme"]) => {
      void setPrefs({ theme: uiThemeToPrefs(theme) });
    },
    [setPrefs]
  );

  const exportData = useCallback(() => exportDatabaseJson(), []);

  const importData = useCallback(
    async (json: string) => {
      try {
        await importDatabaseJson(json);
        await refresh();
        return true;
      } catch {
        return false;
      }
    },
    [refresh]
  );

  const resetData = useCallback(async () => {
    await wipeAllLocalData();
    await ensureSeedData();
    useNavStore.getState().setCurrentTab("dashboard");
    await refresh();
  }, [refresh]);

  const addEvent = useCallback((event: Omit<AgendaEvent, "id" | "createdAt">) => {
    const id = crypto.randomUUID();
    void db.events.add(uiAgendaToCore(event, id) as StoredAgendaEvent);
  }, []);

  const updateEvent = useCallback(
    async (id: string, updates: Partial<AgendaEvent>) => {
      const row = await db.events.get(id);
      if (!row) return;
      const cur = coreAgendaToUi(row as StoredAgendaEvent);
      const merged = { ...cur, ...updates };
      await db.events.put(uiAgendaToCore(merged, id) as StoredAgendaEvent);
    },
    []
  );

  const deleteEvent = useCallback((id: string) => {
    void db.events.delete(id);
  }, []);

  const toggleEventComplete = useCallback(async (id: string) => {
    const row = (await db.events.get(id)) as StoredAgendaEvent | undefined;
    if (!row) return;
    await db.events.put({
      ...row,
      completedLocal: !row.completedLocal,
    } as StoredAgendaEvent);
  }, []);

  const addHabit = useCallback((habit: Omit<Habit, "id" | "createdAt">) => {
    const id = crypto.randomUUID();
    void db.habits.add(uiHabitToCore(habit, id));
  }, []);

  const updateHabit = useCallback(async (id: string, updates: Partial<Habit>) => {
    const row = await db.habits.get(id);
    if (!row) return;
    const ui = coreHabitToUi(row);
    void db.habits.put(uiHabitToCore({ ...ui, ...updates }, id));
  }, []);

  const deleteHabit = useCallback(async (id: string) => {
    await db.habits.delete(id);
    await db.habitCompletions.where("habitId").equals(id).delete();
  }, []);

  const logHabit = useCallback((log: Omit<HabitLog, "id">) => {
    const id = `${log.habitId}_${log.date}`;
    void db.habitCompletions.put({
      id,
      habitId: log.habitId,
      date: log.date,
      fait: log.completed,
      valeur: log.quantity,
      note: log.note,
    });
  }, []);

  const addSportSession = useCallback(
    async (session: Omit<SportSession, "id" | "createdAt">) => {
      const tpl = await db.sportTemplates.get(session.activityId);
      const [y, mo, d] = session.date.split("-").map(Number);
      const debut = new Date(y, mo - 1, d, 12, 0, 0, 0).getTime();
      const fin = debut + session.duration * 60_000;
      await db.sportSessions.add({
        id: crypto.randomUUID(),
        type: tpl?.type ?? "cardio",
        libelle: tpl?.nom ?? "Sport",
        debut,
        fin,
        intensite: tpl?.intensite ?? "moderee",
        calories: session.caloriesBurned,
        notes: session.notes,
        templateId: session.activityId,
        createdAt: Date.now(),
      });
    },
    []
  );

  const deleteSportSession = useCallback((id: string) => {
    void db.sportSessions.delete(id);
  }, []);

  const addHydration = useCallback(async (amount: number) => {
    const today = new Date().toISOString().split("T")[0];
    const row = await db.hydrationDays.get(today);
    const entries = row?.entries ? [...row.entries] : [];
    entries.push({ id: crypto.randomUUID(), ml: amount, at: Date.now() });
    await db.hydrationDays.put({ date: today, entries });
  }, []);

  const setHydrationGoal = useCallback(async (baseGoal: number) => {
    await patchUiBlob({
      hydrationGoal: { ...uiBlob.hydrationGoal, baseGoal },
    });
  }, [uiBlob.hydrationGoal]);

  const addMoodEntry = useCallback(
    async (entry: Omit<MoodEntry, "id" | "createdAt">) => {
      await db.moodDays.put({
        date: entry.date,
        score: entry.rating,
        note: entry.note,
        updatedAt: Date.now(),
      });
    },
    []
  );

  const updateMoodEntry = useCallback(
    async (id: string, updates: Partial<MoodEntry>) => {
      const row = await db.moodDays.get(id);
      if (!row) return;
      await db.moodDays.put({
        ...row,
        score: updates.rating ?? row.score,
        note: updates.note !== undefined ? updates.note : row.note,
        updatedAt: Date.now(),
      });
    },
    []
  );

  const addTransaction = useCallback(
    async (t: Omit<Transaction, "id" | "createdAt">) => {
      const id = crypto.randomUUID();
      const cats = uiBlob.financeCategories;
      await db.transactions.add(uiTxToCore(t, id, cats));
    },
    [uiBlob.financeCategories]
  );

  const updateTransaction = useCallback(
    async (id: string, updates: Partial<Transaction>) => {
      const row = await db.transactions.get(id);
      if (!row) return;
      const ui = coreTxToUi(row, uiBlob.financeCategories);
      const merged = { ...ui, ...updates };
      await db.transactions.put(
        uiTxToCore(
          {
            type: merged.type,
            amount: merged.amount,
            categoryId: merged.categoryId,
            description: merged.description,
            date: merged.date,
            isEssential: merged.isEssential,
            isRecurring: merged.isRecurring,
            recurringId: merged.recurringId,
          },
          id,
          uiBlob.financeCategories
        )
      );
    },
    [uiBlob.financeCategories]
  );

  const deleteTransaction = useCallback((id: string) => {
    void db.transactions.delete(id);
  }, []);

  const addGoal = useCallback((goal: Omit<Goal, "id" | "createdAt" | "updatedAt">) => {
    const id = crypto.randomUUID();
    void db.objectives.add(uiGoalToObjective(goal, id));
  }, []);

  const updateGoal = useCallback(async (id: string, updates: Partial<Goal>) => {
    const o = await db.objectives.get(id);
    if (!o) return;
    const ui = objectiveToUiGoal(o);
    const merged = { ...ui, ...updates };
    const next = uiGoalToObjective(merged, id);
    await db.objectives.put({
      ...next,
      sousObjectifs: o.sousObjectifs,
      journal: o.journal,
      createdAt: o.createdAt,
    });
  }, []);

  const deleteGoal = useCallback(async (id: string) => {
    await db.objectives.delete(id);
  }, []);

  const addMilestone = useCallback(async (milestone: Omit<GoalMilestone, "id">) => {
    const o = await db.objectives.get(milestone.goalId);
    if (!o) return;
    const sid = crypto.randomUUID();
    const sub = milestoneToSubtask(milestone, sid);
    await db.objectives.put({
      ...o,
      sousObjectifs: [...o.sousObjectifs, sub],
    });
  }, []);

  const toggleMilestone = useCallback(async (id: string) => {
    const all = await db.objectives.toArray();
    for (const o of all) {
      const idx = o.sousObjectifs.findIndex((s) => s.id === id);
      if (idx < 0) continue;
      const next = [...o.sousObjectifs];
      next[idx] = { ...next[idx], fait: !next[idx].fait };
      await db.objectives.put({ ...o, sousObjectifs: next });
      return;
    }
  }, []);

  const addNote = useCallback((note: Omit<Note, "id" | "createdAt" | "updatedAt">) => {
    const id = crypto.randomUUID();
    void db.notes.add(uiNoteToCore(note, id));
  }, []);

  const updateNote = useCallback(async (id: string, updates: Partial<Note>) => {
    const row = await db.notes.get(id);
    if (!row) return;
    const ui = coreNoteToUi(row);
    const merged: Note = {
      ...ui,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    const core = uiNoteToCore(merged, id);
    await db.notes.put({ ...row, ...core, createdAt: row.createdAt });
  }, []);

  const deleteNote = useCallback((id: string) => {
    void db.notes.delete(id);
  }, []);

  const addFolder = useCallback((folder: Omit<NoteFolder, "id">) => {
    const id = crypto.randomUUID();
    void db.noteFolders.add(uiFolderToCore(folder, id));
  }, []);

  const deleteFolder = useCallback(async (id: string) => {
    await db.noteFolders.delete(id);
    const notes = await db.notes.filter((n) => n.dossierId === id).toArray();
    for (const n of notes) {
      await db.notes.update(n.id, { dossierId: undefined });
    }
  }, []);

  const hydrationGoal = uiBlob.hydrationGoal;

  const value: LifeFlowDataContextValue = {
    profile,
    settings,
    setProfile,
    updateProfile,
    updateSettings,
    setTheme,
    exportData,
    importData,
    resetData,

    events,
    addEvent,
    updateEvent,
    deleteEvent,
    toggleEventComplete,

    habits,
    habitLogs,
    addHabit,
    updateHabit,
    deleteHabit,
    logHabit,

    sportActivities,
    sportSessions,
    addSportSession,
    deleteSportSession,

    hydrationLogs,
    hydrationGoal,
    addHydration,
    setHydrationGoal,

    moodEntries,
    addMoodEntry,
    updateMoodEntry,

    transactions,
    financeCategories: uiBlob.financeCategories,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    addSubscription: () => {},
    updateSubscription: () => {},
    deleteSubscription: () => {},
    addBalanceRecord: () => {},

    goals,
    goalMilestones,
    addGoal,
    updateGoal,
    deleteGoal,
    addMilestone,
    toggleMilestone,

    notes,
    noteFolders,
    addNote,
    updateNote,
    deleteNote,
    addFolder,
    deleteFolder,
  };

  return (
    <LifeFlowDataContext.Provider value={value}>{children}</LifeFlowDataContext.Provider>
  );
}

export function useLifeFlowData() {
  const ctx = useContext(LifeFlowDataContext);
  if (!ctx) throw new Error("LifeFlowDataProvider manquant");
  return ctx;
}
