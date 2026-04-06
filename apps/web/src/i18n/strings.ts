import type { AppLanguage } from "@mylife/core";

const FR = {
  tabHome: "Accueil",
  tabAgenda: "Agenda",
  tabHabits: "Habitudes",
  tabSport: "Sport",
  tabFinance: "Finances",
  tabGoals: "Objectifs",
  tabNotes: "Notes",
  tabSettings: "Réglages",
  skipToContent: "Aller au contenu",
  searchPlaceholder: "Rechercher…",
  searchTitle: "Recherche globale",
  noResults: "Aucun résultat",
  moodToday: "Humeur du jour",
  moodNote: "Note (optionnel)",
  offlineNotes: "Données locales — tout est enregistré sur cet appareil.",
} as const;

const EN: Record<keyof typeof FR, string> = {
  tabHome: "Home",
  tabAgenda: "Calendar",
  tabHabits: "Habits",
  tabSport: "Sport",
  tabFinance: "Finance",
  tabGoals: "Goals",
  tabNotes: "Notes",
  tabSettings: "Settings",
  skipToContent: "Skip to content",
  searchPlaceholder: "Search…",
  searchTitle: "Global search",
  noResults: "No results",
  moodToday: "Mood today",
  moodNote: "Note (optional)",
  offlineNotes: "Local data — everything is stored on this device.",
};

export type StringKey = keyof typeof FR;

export function t(key: StringKey, lang: AppLanguage | undefined): string {
  const l = lang ?? "fr";
  return l === "en" ? EN[key] : FR[key];
}
