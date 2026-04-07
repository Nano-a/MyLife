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

export type AppLanguage = "fr" | "en";

export interface AppPreferences {
  theme: ThemeId;
  accentColor: string;
  fontFamily: "system" | "inter" | "source" | "atkinson";
  textScale: "petit" | "normal" | "grand";
  appDisplayName: string;
  /** Langue UI (i18n) */
  language?: AppLanguage;
  /** True après le premier flux d’accueil */
  onboardingCompleted?: boolean;
  pinEnabled: boolean;
  pinHash?: string;
  biometricEnabled: boolean;
  /** Identifiants WebAuthn (JSON stringifié) pour déverrouillage */
  webAuthnCredentialIds?: string;
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
  /** Son des notifications navigateur */
  notifSoundId?: "defaut" | "goutte" | "bip" | "aucun";
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
  /** Lien optionnel vers un objectif (suivi croisé) */
  linkedObjectiveId?: string;
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

/** Période de facturation d’un abonnement enregistré une seule fois */
export type SubscriptionBillingPeriod = "daily" | "monthly" | "yearly";

/**
 * Abonnement / prélèvement automatique : tu le configures une fois,
 * l’app calcule les prochains prélèvements (mois choisis, fin ou pour toujours).
 */
export interface FinanceSubscription {
  id: string;
  libelle: string;
  montant: number;
  categorie: string;
  commentaire?: string;
  /**
   * `debit` (défaut) = argent qui sort chaque mois / an (forfait, loyer).
   * `credit` = argent qui entre de façon récurrente (salaire, pension, aide).
   */
  flow?: "debit" | "credit";
  /** Jour du mois (1–31) pour mensuel / annuel */
  jourPrelevement: number;
  period: SubscriptionBillingPeriod;
  /** Mois 0–11 où le prélèvement a lieu (vide = tous les mois). Ex. SNCF sept–juin : [8,9,10,11,0,1,2,3,4,5] */
  moisActifs?: number[];
  sansFin: boolean;
  /** Dernier jour possible (YYYY-MM-DD), si sansFin = false */
  finLe?: string;
  /** Date d’ancrage du contrat (premier prélèvement connu) */
  dateDebut: string;
  createdAt: number;
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

/** Pièce jointe légère (data URL), stockée localement */
export interface RichNoteAttachment {
  id: string;
  fileName: string;
  mimeType: string;
  dataUrl: string;
}

export interface RichNote {
  id: string;
  titre: string;
  contenu: string; // HTML TipTap
  dossierId?: string; // null = racine
  bgColor: string;   // couleur de fond de la note
  tags: string[];
  epingle: boolean;
  /** Images / fichiers petits encodés en data URL (hors ligne) */
  attachments?: RichNoteAttachment[];
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

/** Humeur / ressenti du jour (1 = très bas · 5 = très bien) */
export interface MoodDay {
  date: string; // YYYY-MM-DD
  score: 1 | 2 | 3 | 4 | 5;
  note?: string;
  updatedAt: number;
}
