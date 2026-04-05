import type { ActivityLevel, Sex, UserProfile } from "./types.js";

/** ml/kg/jour selon spéc (OMS/EFSA simplifié) */
const ML_PER_KG: Record<Sex, number> = {
  homme: 35,
  femme: 31,
  autre: 33,
};

function sportSurplusMl(heuresModere: number, heuresIntense: number): number {
  return heuresModere * 500 + heuresIntense * 750;
}

function parseHHmm(s: string): { h: number; m: number } {
  const [h, m] = s.split(":").map(Number);
  return { h: h || 0, m: m || 0 };
}

/** Heures d'éveil entre lever et coucher (approximation même jour) */
export function wakingHours(profile: UserProfile): number {
  const a = parseHHmm(profile.heureLever);
  const b = parseHHmm(profile.heureCoucher);
  const start = a.h + a.m / 60;
  const end = b.h + b.m / 60;
  if (end <= start) return 24 - start + end;
  return Math.max(1, end - start);
}

/**
 * Objectif hydratation journalier (ml) — formule spec + sport du jour.
 */
export function computeDailyWaterTargetMl(
  profile: UserProfile,
  options: {
    activiteDuJour: ActivityLevel;
    heuresSportModere?: number;
    heuresSportIntense?: number;
  }
): number {
  const base = ML_PER_KG[profile.sexe] * profile.poidsKg;
  const sportExtra = sportSurplusMl(
    options.heuresSportModere ?? 0,
    options.heuresSportIntense ?? 0
  );
  let factor = 1;
  if (options.activiteDuJour === "modere") factor = 1.05;
  if (options.activiteDuJour === "intense") factor = 1.1;
  return Math.round(base * factor + sportExtra);
}

/** Intervalle entre rappels (minutes) pour répartir sur les heures d'éveil */
export function hydrationReminderIntervalMinutes(
  targetMl: number,
  alreadyDrunkMl: number,
  wakingH: number
): number {
  const remaining = Math.max(0, targetMl - alreadyDrunkMl);
  const roughIntervals = Math.max(4, Math.ceil(wakingH * 2));
  const minutes = Math.round((wakingH * 60) / roughIntervals);
  void remaining;
  return Math.min(180, Math.max(30, minutes));
}

export function mlToGlasses(ml: number, glassMl = 250): number {
  return Math.round((ml / glassMl) * 10) / 10;
}

export function totalDrunkMl(entries: { ml: number }[]): number {
  let s = 0;
  for (const e of entries) s += e.ml;
  return s;
}

/**
 * Indicateur long terme 0–100 (régularité sur N jours) — O(n), n = jours.
 */
export function hydrationLongTermScore(
  dailyPercentages: number[]
): number {
  if (dailyPercentages.length === 0) return 0;
  let acc = 0;
  for (const p of dailyPercentages) acc += Math.min(100, Math.max(0, p));
  return Math.round(acc / dailyPercentages.length);
}
