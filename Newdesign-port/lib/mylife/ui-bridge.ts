import type {
  AgendaEvent as CoreAgendaEvent,
  AppPreferences,
  FinanceTransaction,
  GoalSubtask,
  Habit as CoreHabit,
  HabitCompletion,
  MoodDay,
  NoteFolder as CoreNoteFolder,
  Objective,
  RichNote,
  SportSession as CoreSportSession,
  SportTemplate,
  UserProfile as CoreUserProfile,
} from "@mylife/core";
import type {
  AgendaEvent as UiAgendaEvent,
  AppSettings,
  FinanceCategory,
  Goal as UiGoal,
  GoalMilestone,
  Habit as UiHabit,
  HabitLog,
  HydrationGoal,
  HydrationLog,
  MoodEntry,
  Note as UiNote,
  NoteFolder as UiNoteFolder,
  SportActivity,
  SportSession as UiSportSession,
  Transaction as UiTransaction,
  UserProfile as UiUserProfile,
} from "@/lib/types";

/** Champ local Dexie (non présent dans le type core strict). */
export type StoredAgendaEvent = CoreAgendaEvent & { completedLocal?: boolean };

const GOAL_META = "<!--mylife_goal_meta:";

export const DEFAULT_FINANCE_CATEGORIES: FinanceCategory[] = [
  { id: "1", name: "Salaire", icon: "briefcase", color: "#22c55e", type: "income" },
  { id: "2", name: "Freelance", icon: "laptop", color: "#3b82f6", type: "income" },
  { id: "3", name: "Alimentation", icon: "shopping-cart", color: "#f97316", type: "expense", budget: 400 },
  { id: "4", name: "Transport", icon: "car", color: "#8b5cf6", type: "expense", budget: 150 },
  { id: "5", name: "Logement", icon: "home", color: "#06b6d4", type: "expense", budget: 800 },
  { id: "6", name: "Loisirs", icon: "gamepad", color: "#ec4899", type: "expense", budget: 200 },
  { id: "7", name: "Santé", icon: "heart", color: "#ef4444", type: "expense", budget: 100 },
  { id: "8", name: "Shopping", icon: "shopping-bag", color: "#eab308", type: "expense", budget: 150 },
];

const ACT_COLOR: Record<string, string> = {
  running: "#ef4444",
  walking: "#22c55e",
  bike: "#3b82f6",
  swimming: "#06b6d4",
  dumbbell: "#8b5cf6",
  yoga: "#ec4899",
};

const CAL_PER_H: Record<string, number> = {
  running: 600,
  walking: 280,
  bike: 500,
  swimming: 550,
  dumbbell: 400,
  yoga: 200,
};

export const DEFAULT_SPORT_TEMPLATES: SportTemplate[] = [
  {
    id: "1",
    nom: "Course",
    type: "cardio",
    intensite: "moderee",
    dureeMinutes: 30,
    icone: "running",
    createdAt: Date.now(),
  },
  {
    id: "2",
    nom: "Marche",
    type: "cardio",
    intensite: "faible",
    dureeMinutes: 45,
    icone: "walking",
    createdAt: Date.now(),
  },
  {
    id: "3",
    nom: "Cyclisme",
    type: "cardio",
    intensite: "moderee",
    dureeMinutes: 45,
    icone: "bike",
    createdAt: Date.now(),
  },
  {
    id: "4",
    nom: "Natation",
    type: "cardio",
    intensite: "intense",
    dureeMinutes: 30,
    icone: "swimming",
    createdAt: Date.now(),
  },
  {
    id: "5",
    nom: "Musculation",
    type: "musculation",
    intensite: "moderee",
    dureeMinutes: 45,
    icone: "dumbbell",
    createdAt: Date.now(),
  },
  {
    id: "6",
    nom: "Yoga",
    type: "cardio",
    intensite: "faible",
    dureeMinutes: 60,
    icone: "yoga",
    createdAt: Date.now(),
  },
];

export type LifeflowUiBlob = {
  financeCategories: FinanceCategory[];
  accentColor: AppSettings["accentColor"];
  fontSize: AppSettings["fontSize"];
  wallpaper?: string;
  notifications: AppSettings["notifications"];
  hydrationGoal: HydrationGoal;
  pinEnabled: boolean;
  pin?: string;
};

export const defaultLifeflowUiBlob = (): LifeflowUiBlob => ({
  financeCategories: DEFAULT_FINANCE_CATEGORIES,
  accentColor: "blue",
  fontSize: "medium",
  wallpaper: "/images/background.jpg",
  notifications: {
    enabled: true,
    water: true,
    habits: true,
    agenda: true,
    sport: false,
    finances: false,
    goals: true,
    quietHoursStart: "22:00",
    quietHoursEnd: "08:00",
    sound: "default",
  },
  hydrationGoal: { baseGoal: 2000, adjustForActivity: true },
  pinEnabled: false,
});

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function timeFromMs(ms: number): string {
  const d = new Date(ms);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function dateISOFromMs(ms: number): string {
  return new Date(ms).toISOString().split("T")[0];
}

export function coreAgendaToUi(e: StoredAgendaEvent): UiAgendaEvent {
  return {
    id: e.id,
    title: e.titre,
    description: e.description,
    date: dateISOFromMs(e.debut),
    startTime: timeFromMs(e.debut),
    endTime: timeFromMs(e.fin),
    reminder: e.rappelMinutes,
    color: e.couleur,
    completed: Boolean(e.completedLocal),
    createdAt: new Date(e.createdAt).toISOString(),
  };
}

export function uiAgendaToCore(
  input: Omit<UiAgendaEvent, "id" | "createdAt">,
  id: string
): StoredAgendaEvent {
  const [y, mo, d] = input.date.split("-").map(Number);
  const [sh, sm] = input.startTime.split(":").map(Number);
  const endStr = input.endTime || input.startTime;
  const [eh, em] = endStr.split(":").map(Number);
  const debut = new Date(y, mo - 1, d, sh, sm ?? 0, 0, 0).getTime();
  let fin = new Date(y, mo - 1, d, eh, em ?? 0, 0, 0).getTime();
  if (fin <= debut) fin = debut + 60 * 60 * 1000;
  return {
    id,
    titre: input.title,
    description: input.description,
    debut,
    fin,
    journeeEntiere: false,
    couleur: input.color || "#6366f1",
    categorie: "perso",
    lieu: undefined,
    rappelMinutes: input.reminder,
    notificationPersistante: false,
    recurrence: "once",
    createdAt: Date.now(),
    completedLocal: input.completed,
  };
}

export function coreHabitToUi(h: CoreHabit): UiHabit {
  return {
    id: h.id,
    name: h.nom,
    icon: h.icone,
    color: h.couleur,
    type: h.type === "quantite" ? "quantity" : "boolean",
    targetQuantity: h.objectifQuantite,
    unit: h.uniteQuantite,
    frequency: h.frequence === "quotidien" ? "daily" : "custom",
    customDays: h.joursSemaine,
    reminder: h.heureRappel,
    createdAt: new Date(h.createdAt).toISOString(),
  };
}

export function uiHabitToCore(
  input: Omit<UiHabit, "id" | "createdAt">,
  id: string
): CoreHabit {
  const freq =
    input.frequency === "daily"
      ? ("quotidien" as const)
      : ("jours_specifiques" as const);
  return {
    id,
    nom: input.name.trim(),
    icone: input.icon,
    couleur: input.color,
    type: input.type === "quantity" ? "quantite" : "oui_non",
    frequence: freq,
    joursSemaine:
      freq === "jours_specifiques"
        ? input.customDays ?? [0, 1, 2, 3, 4, 5, 6]
        : undefined,
    heureRappel: input.reminder,
    categorie: "perso",
    objectifQuantite: input.targetQuantity,
    uniteQuantite: input.unit,
    createdAt: Date.now(),
  };
}

export function completionToLog(c: HabitCompletion & { id: string }): HabitLog {
  return {
    id: c.id,
    habitId: c.habitId,
    date: c.date,
    completed: c.fait,
    quantity: c.valeur,
    note: c.note,
  };
}

export function templateToActivity(t: SportTemplate): SportActivity {
  return {
    id: t.id,
    name: t.nom,
    icon: t.icone,
    caloriesPerHour: CAL_PER_H[t.icone] ?? 400,
    color: ACT_COLOR[t.icone] ?? "#6366f1",
  };
}

export function coreSportSessionToUi(s: CoreSportSession, templates: SportTemplate[]): UiSportSession {
  const tpl = templates.find((x) => x.id === s.templateId);
  const date = dateISOFromMs(s.debut);
  const duration = Math.max(1, Math.round((s.fin - s.debut) / 60_000));
  const calories =
    s.calories ??
    Math.round(((tpl ? CAL_PER_H[tpl.icone] ?? 400 : 400) / 60) * duration);
  return {
    id: s.id,
    activityId: s.templateId || tpl?.id || "1",
    date,
    duration,
    caloriesBurned: calories,
    notes: s.notes,
    createdAt: new Date(s.createdAt).toISOString(),
  };
}

export function uiProfileToCore(p: UiUserProfile): CoreUserProfile {
  const levelMap: Record<string, CoreUserProfile["activiteHabituelle"]> = {
    sedentary: "sedentaire",
    light: "sedentaire",
    moderate: "modere",
    active: "intense",
    very_active: "intense",
  };
  const h = Math.max(1, Math.min(12, Math.round(p.sleepHours)));
  const coucher = `${pad2(Math.min(23, 6 + h))}:00`;
  return {
    prenom: p.name || "Utilisateur",
    sexe: "autre",
    age: p.age,
    poidsKg: p.weight,
    tailleCm: p.height,
    activiteHabituelle: levelMap[p.activityLevel] ?? "modere",
    heureLever: "07:00",
    heureCoucher: coucher,
  };
}

export function coreProfileToUi(p: CoreUserProfile): UiUserProfile {
  const rev: Record<CoreUserProfile["activiteHabituelle"], UiUserProfile["activityLevel"]> = {
    sedentaire: "sedentary",
    modere: "moderate",
    intense: "very_active",
  };
  return {
    id: "profile",
    name: p.prenom,
    age: p.age,
    weight: p.poidsKg,
    height: p.tailleCm,
    activityLevel: rev[p.activiteHabituelle] ?? "moderate",
    sleepHours: 8,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function prefsThemeToUi(t: AppPreferences["theme"]): AppSettings["theme"] {
  if (t === "light") return "light";
  if (t === "amoled") return "amoled";
  if (t === "custom") return "dark";
  return "dark";
}

export function uiThemeToPrefs(t: AppSettings["theme"]): AppPreferences["theme"] {
  return t;
}

export function mergeAppSettings(prefs: AppPreferences, ui: LifeflowUiBlob): AppSettings {
  const notif = ui.notifications;
  return {
    theme: prefsThemeToUi(prefs.theme),
    accentColor: ui.accentColor,
    fontSize: ui.fontSize,
    pinEnabled: prefs.pinEnabled || ui.pinEnabled,
    pin: ui.pin,
    notifications: notif,
    language: "fr",
    wallpaper: ui.wallpaper,
  };
}

export function prefsFromNotificationPatch(
  _prev: AppPreferences,
  n: AppSettings["notifications"]
): Partial<AppPreferences> {
  return {
    notifHydration: n.water,
    notifHabits: n.habits,
    notifAgenda: n.agenda,
    notifSport: n.sport,
    notifFinance: n.finances,
    notifGoals: n.goals,
    notifWindowStart: n.quietHoursStart,
    notifWindowEnd: n.quietHoursEnd,
    notifSoundId:
      n.sound === "gentle"
        ? "goutte"
        : n.sound === "alert"
          ? "bip"
          : n.sound === "none"
            ? "aucun"
            : "defaut",
  };
}

export function mapFontSizeToTextScale(
  fs: AppSettings["fontSize"]
): AppPreferences["textScale"] {
  if (fs === "small") return "petit";
  if (fs === "large") return "grand";
  return "normal";
}

export function mapTextScaleToFontSize(
  ts: AppPreferences["textScale"]
): AppSettings["fontSize"] {
  if (ts === "petit") return "small";
  if (ts === "grand") return "large";
  return "medium";
}

const ACCENT_HEX: Record<AppSettings["accentColor"], string> = {
  blue: "#3b82f6",
  teal: "#14b8a6",
  purple: "#8b5cf6",
  pink: "#ec4899",
  orange: "#f97316",
  green: "#22c55e",
};

export function accentHexForUi(id: AppSettings["accentColor"]): string {
  return ACCENT_HEX[id] ?? "#7c3aed";
}

export function nearestAccentId(hex: string): AppSettings["accentColor"] {
  const h = hex.toLowerCase();
  let best: AppSettings["accentColor"] = "blue";
  let bestDist = Infinity;
  (Object.keys(ACCENT_HEX) as AppSettings["accentColor"][]).forEach((k) => {
    const v = ACCENT_HEX[k].toLowerCase();
    const d = Math.abs(
      parseInt(h.slice(1, 3), 16) - parseInt(v.slice(1, 3), 16)
    );
    if (d < bestDist) {
      bestDist = d;
      best = k;
    }
  });
  return best;
}

function stripGoalMeta(description: string | undefined): string {
  if (!description) return "";
  const i = description.indexOf(GOAL_META);
  if (i < 0) return description.trim();
  return description.slice(0, i).trim();
}

function parseGoalMeta(description: string | undefined): {
  targetValue?: number;
  currentValue: number;
  unit?: string;
} {
  if (!description?.includes(GOAL_META)) {
    return { currentValue: 0 };
  }
  const start = description.indexOf(GOAL_META) + GOAL_META.length;
  const end = description.indexOf("-->", start);
  if (end < 0) return { currentValue: 0 };
  try {
    const j = JSON.parse(description.slice(start, end)) as {
      targetValue?: number;
      currentValue?: number;
      unit?: string;
    };
    return {
      targetValue: j.targetValue,
      currentValue: j.currentValue ?? 0,
      unit: j.unit,
    };
  } catch {
    return { currentValue: 0 };
  }
}

function withGoalMeta(
  userDescription: string | undefined,
  targetValue: number | undefined,
  currentValue: number,
  unit: string | undefined
): string {
  const base = (userDescription ?? "").trim();
  const meta = `${GOAL_META}${JSON.stringify({
    targetValue,
    currentValue,
    unit,
  })}-->`;
  return base ? `${base}\n\n${meta}` : meta;
}

export function objectiveToUiGoal(o: Objective): UiGoal {
  const meta = parseGoalMeta(o.description);
  const pct = o.progressionManuelle ?? 0;
  const tgt = meta.targetValue;
  const cur =
    tgt != null && tgt > 0 ? Math.round((pct / 100) * tgt) : meta.currentValue;
  return {
    id: o.id,
    title: o.titre,
    description: stripGoalMeta(o.description) || undefined,
    targetValue: tgt,
    currentValue: cur,
    unit: meta.unit,
    deadline: o.deadline,
    color: o.couleur || "#3b82f6",
    completed: o.status === "termine",
    createdAt: new Date(o.createdAt).toISOString(),
    updatedAt: new Date(o.createdAt).toISOString(),
  };
}

export function subtasksToMilestones(o: Objective): GoalMilestone[] {
  return o.sousObjectifs.map((s) => ({
    id: s.id,
    goalId: o.id,
    title: s.titre,
    completed: s.fait,
    completedAt: s.deadline,
  }));
}

export function uiGoalToObjective(
  input: Omit<UiGoal, "id" | "createdAt" | "updatedAt">,
  id: string
): Objective {
  const pct =
    input.targetValue && input.targetValue > 0
      ? Math.min(100, Math.round((input.currentValue / input.targetValue) * 100))
      : 0;
  return {
    id,
    titre: input.title,
    description: withGoalMeta(
      input.description,
      input.targetValue,
      input.currentValue,
      input.unit
    ),
    categorie: "perso",
    couleur: input.color,
    deadline: input.deadline,
    sousObjectifs: [],
    journal: [],
    priorite: "normale",
    status: input.completed ? "termine" : "actif",
    progressionManuelle: pct,
    createdAt: Date.now(),
  };
}

export function milestoneToSubtask(m: Omit<GoalMilestone, "id">, id: string): GoalSubtask {
  return {
    id,
    titre: m.title,
    fait: m.completed,
    deadline: m.completedAt,
  };
}

export function coreNoteToUi(n: RichNote): UiNote {
  return {
    id: n.id,
    title: n.titre,
    content: n.contenu,
    folderId: n.dossierId,
    color: n.bgColor,
    tags: n.tags ?? [],
    pinned: n.epingle,
    createdAt: new Date(n.createdAt).toISOString(),
    updatedAt: new Date(n.updatedAt).toISOString(),
  };
}

export function uiNoteToCore(
  input: Omit<UiNote, "id" | "createdAt" | "updatedAt">,
  id: string
): RichNote {
  const now = Date.now();
  return {
    id,
    titre: input.title,
    contenu: input.content,
    dossierId: input.folderId,
    bgColor: input.color || "#18181f",
    tags: input.tags ?? [],
    epingle: input.pinned,
    createdAt: now,
    updatedAt: now,
  };
}

export function coreFolderToUi(f: CoreNoteFolder): UiNoteFolder {
  return {
    id: f.id,
    name: f.nom,
    color: f.bgColor,
    parentId: f.parentId,
  };
}

export function uiFolderToCore(
  input: Omit<UiNoteFolder, "id">,
  id: string
): CoreNoteFolder {
  return {
    id,
    nom: input.name,
    bgColor: input.color,
    parentId: input.parentId,
    description: undefined,
    icone: "folder",
    createdAt: Date.now(),
  };
}

export function moodDayToEntry(m: MoodDay): MoodEntry {
  return {
    id: m.date,
    date: m.date,
    rating: m.score,
    note: m.note,
    createdAt: new Date(m.updatedAt).toISOString(),
  };
}

export function hydrationRowsToLogs(
  rows: { date: string; entries: { id: string; ml: number; at: number }[] }[]
): HydrationLog[] {
  const out: HydrationLog[] = [];
  for (const row of rows) {
    for (const e of row.entries) {
      out.push({
        id: e.id,
        date: row.date,
        amount: e.ml,
        time: timeFromMs(e.at),
      });
    }
  }
  return out.sort((a, b) => `${b.date}T${b.time}`.localeCompare(`${a.date}T${a.time}`));
}

export function categoryName(cats: FinanceCategory[], id: string): string {
  return cats.find((c) => c.id === id)?.name ?? "Divers";
}

export function uiTxToCore(
  input: Omit<UiTransaction, "id" | "createdAt">,
  id: string,
  cats: FinanceCategory[]
): FinanceTransaction {
  const cat = categoryName(cats, input.categoryId);
  return {
    id,
    type: input.type === "income" ? "revenu" : "depense",
    montant: input.amount,
    categorie: cat,
    commentaire: input.description,
    date: input.date,
    superflue: input.type === "expense" ? !input.isEssential : undefined,
    createdAt: Date.now(),
  };
}

export function coreTxToUi(t: FinanceTransaction, cats: FinanceCategory[]): UiTransaction {
  const match = cats.find((c) => c.name === t.categorie);
  return {
    id: t.id,
    type: t.type === "revenu" ? "income" : "expense",
    amount: t.montant,
    categoryId: match?.id ?? cats[0]?.id ?? "1",
    description: t.commentaire ?? "",
    date: t.date,
    isEssential: t.superflue === undefined ? true : !t.superflue,
    isRecurring: false,
    createdAt: new Date(t.createdAt).toISOString(),
  };
}
