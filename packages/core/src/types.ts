/** Profil pour calculs hydratation / sport */
export type Sex = "homme" | "femme" | "autre";
export type ActivityLevel = "sedentaire" | "modere" | "intense";

export interface UserProfile {
  prenom: string;
  photoUrl?: string;
  sexe: Sex;
  age: number;
  poidsKg: number;
  tailleCm: number;
  activiteHabituelle: ActivityLevel;
  heureLever: string; // "07:00"
  heureCoucher: string; // "23:00"
}

export type ThemeId = "dark" | "light" | "amoled" | "custom";

/** Une période de silence (Ne Pas Déranger) */
export interface DndPeriod {
  id: string;
  label: string;    // ex. "Nuit", "Réunion", "Repas"
  start: string;    // "HH:MM"
  end: string;      // "HH:MM"
  enabled: boolean;
}

export interface AppPreferences {
  theme: ThemeId;
  accentColor: string;
  fontFamily: "system" | "inter" | "source" | "atkinson";
  textScale: "petit" | "normal" | "grand";
  appDisplayName: string;
  pinEnabled: boolean;
  pinHash?: string;
  biometricEnabled: boolean;
  lockTimeoutMin: 0 | 1 | 5;
  notifHydration: boolean;
  notifHabits: boolean;
  notifAgenda: boolean;
  notifSport: boolean;
  notifFinance: boolean;
  notifGoals: boolean;
  /** Plage horaire pendant laquelle les notifications sont autorisées */
  notifWindowStart: string; // "HH:MM"
  notifWindowEnd: string;   // "HH:MM"
  /** Périodes Ne Pas Déranger (silencieuses même dans la plage active) */
  dndPeriods: DndPeriod[];
  /** @deprecated — gardé pour compatibilité ascendante */
  dndStart?: string;
  dndEnd?: string;
}

/* ══════════ HABITUDES ══════════ */
export type HabitType = "oui_non" | "quantite";
export type HabitFrequency = "quotidien" | "jours_specifiques";

export interface Habit {
  id: string;
  nom: string;
  icone: string;
  couleur: string;
  type: HabitType;
  frequence: HabitFrequency;
  joursSemaine?: number[]; // 0=dim
  heureRappel?: string;
  categorie: string;
  objectifQuantite?: number;
  uniteQuantite?: string;
  archived?: boolean;
  createdAt: number;
}

export interface HabitCompletion {
  habitId: string;
  date: string; // YYYY-MM-DD
  fait: boolean;
  valeur?: number;
  note?: string;
}

/* ══════════ AGENDA ══════════ */
export type EventCategory =
  | "cours"
  | "travail"
  | "sport"
  | "perso"
  | "priere"
  | "autre";

export type RecurrenceType =
  | "once"
  | "daily"
  | "weekly"
  | "monthly"
  | "yearly"
  | "weekdays"
  | "forever";

export interface AgendaEvent {
  id: string;
  titre: string;
  description?: string;
  lieu?: string;
  debut: number; // timestamp ms
  fin: number;
  journeeEntiere: boolean;
  couleur: string;
  categorie: EventCategory;
  rappelMinutes?: number;
  notificationPersistante: boolean;
  recurrence: RecurrenceType;
  recurrenceEnd?: number;
  recurrenceGroupId?: string; // pour modifier/supprimer une série
  createdAt: number;
}

/* ══════════ SPORT ══════════ */
export type SportType = "cardio" | "musculation" | "combat" | "manuel";
export type Intensity = "faible" | "moderee" | "intense";

export interface SportSession {
  id: string;
  type: SportType;
  libelle: string;
  debut: number;
  fin: number;
  intensite: Intensity;
  calories?: number;
  notes?: string;
  equipement?: string;
  templateId?: string;
  createdAt: number;
}

export interface SportTemplate {
  id: string;
  nom: string;
  type: SportType;
  intensite: Intensity;
  dureeMinutes: number;
  description?: string;
  icone: string;
  createdAt: number;
}

/* ══════════ FINANCES ══════════ */
export type FinanceTxType =
  | "depense"
  | "revenu"
  | "abonnement"
  | "gain"
  | "epargne";

export interface FinanceTransaction {
  id: string;
  type: FinanceTxType;
  montant: number;
  categorie: string;
  commentaire?: string;
  date: string; // YYYY-MM-DD
  superflue?: boolean;
  recurrentId?: string; // lien vers FinanceBudget/abonnement récurrent
  frequenceMois?: number;
  prochainPrelevement?: string;
  createdAt: number;
}

export interface FinanceBalanceSnapshot {
  id: string;
  date: string;
  solde: number;
}

export interface FinanceBudget {
  id: string;
  categorie: string;
  plafondMensuel: number;
  couleur: string;
  actif: boolean;
  createdAt: number;
}

/* ══════════ OBJECTIFS ══════════ */
export interface GoalSubtask {
  id: string;
  titre: string;
  fait: boolean;
  deadline?: string;
  note?: string;
}

export interface GoalJournalEntry {
  id: string;
  contenu: string;
  at: number;
}

export type GoalPriority = "haute" | "normale" | "basse";
export type GoalStatus = "actif" | "termine" | "abandonne" | "expire";

export interface Objective {
  id: string;
  titre: string;
  description?: string;
  categorie: string;
  couleur?: string;
  deadline?: string;
  sousObjectifs: GoalSubtask[];
  journal: GoalJournalEntry[];
  progressionManuelle?: number; // 0-100
  priorite: GoalPriority;
  status: GoalStatus;
  noteEchec?: string;
  completedAt?: number;
  createdAt: number;
}

/* ══════════ NOTES ══════════ */
export interface NoteFolder {
  id: string;
  nom: string;
  description?: string;
  parentId?: string; // undefined = racine
  bgColor: string;   // couleur du dossier
  icone: string;
  createdAt: number;
}

export interface RichNote {
  id: string;
  titre: string;
  contenu: string; // HTML TipTap
  dossierId?: string; // null = racine
  bgColor: string;   // couleur de fond de la note
  tags: string[];
  epingle: boolean;
  updatedAt: number;
  createdAt: number;
}

/* ══════════ HYDRATATION ══════════ */
export interface HydrationDayEntry {
  id: string;
  ml: number;
  at: number;
}

export interface HydrationDay {
  date: string;
  entries: HydrationDayEntry[];
}
