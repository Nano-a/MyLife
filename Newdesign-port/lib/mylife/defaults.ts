import type { AppPreferences, UserProfile } from "@mylife/core";

export const defaultProfile: UserProfile = {
  prenom: "Utilisateur",
  sexe: "homme",
  age: 30,
  poidsKg: 75,
  tailleCm: 175,
  activiteHabituelle: "modere",
  heureLever: "07:00",
  heureCoucher: "23:00",
};

export const defaultPrefs: AppPreferences = {
  theme: "dark",
  accentColor: "#7c3aed",
  fontFamily: "inter",
  textScale: "normal",
  language: "fr",
  appDisplayName: "MyLife",
  pinEnabled: false,
  biometricEnabled: false,
  lockTimeoutMin: 1,
  notifHydration: true,
  notifHabits: true,
  notifAgenda: true,
  notifSport: true,
  notifFinance: true,
  notifGoals: true,
  notifWindowStart: "07:00",
  notifWindowEnd: "22:00",
  dndPeriods: [
    { id: "dnd-nuit", label: "Nuit", start: "22:00", end: "07:00", enabled: true },
  ],
  notifSoundId: "defaut",
};
