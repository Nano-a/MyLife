import type { ActivityLevel, Intensity, Sex, UserProfile } from "./types.js";

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

/** IMC (kg/m²) — pour ajustement léger des besoins en eau. */
export function profileBmi(profile: UserProfile): number {
  const h = profile.tailleCm / 100;
  if (h <= 0 || profile.poidsKg <= 0) return 22;
  return profile.poidsKg / (h * h);
}

/**
 * Facteur multiplicatif selon IMC et âge (surpoids / obésité, mineurs, seniors).
 * Reste proche de 1 pour un profil « standard ».
 */
export function hydrationProfileFactor(profile: UserProfile): number {
  let f = 1;
  const b = profileBmi(profile);
  if (b >= 30) f += 0.1;
  else if (b >= 25) f += 0.05;
  if (profile.age > 0 && profile.age < 18) f += 0.07;
  if (profile.age >= 65) f += 0.05;
  return f;
}

/**
 * Heures de sport du jour pour le surplus hydratation (faible → moitié du modéré).
 */
export function sportHydrationHoursFromSessions(
  sessions: { debut: number; fin: number; intensite: Intensity }[]
): { heuresSportModere: number; heuresSportIntense: number } {
  let heuresSportModere = 0;
  let heuresSportIntense = 0;
  for (const s of sessions) {
    const h = Math.max(0, (s.fin - s.debut) / 3_600_000);
    if (s.intensite === "faible") heuresSportModere += h * 0.5;
    else if (s.intensite === "moderee") heuresSportModere += h;
    else heuresSportIntense += h;
  }
  return { heuresSportModere, heuresSportIntense };
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
 * Objectif hydratation journalier (ml) — poids, sexe, activité générale, IMC/âge, sport du jour.
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
  const personal = hydrationProfileFactor(profile);
  return Math.round(base * factor * personal + sportExtra);
}

/** Pas d’EMA : chaque jour compte un peu — plusieurs semaines pour monter vers des scores élevés. */
export const HYDRATION_BODY_INDEX_ALPHA = 0.012;

/**
 * Indice 0–100 de « régularité d’hydratation » sur la durée (plusieurs semaines / mois).
 * Les pourcentages sont ceux du jour (bu / objectif), plafonnés à 100.
 * Ce n’est pas une mesure clinique du TBW, mais une visualisation de constance.
 */
export function computeHydrationBodyIndex(dailyScoresPercentOldestFirst: number[]): number {
  if (dailyScoresPercentOldestFirst.length === 0) return 0;
  let state = 12;
  const alpha = HYDRATION_BODY_INDEX_ALPHA;
  for (const raw of dailyScoresPercentOldestFirst) {
    const day = Math.max(0, Math.min(100, raw));
    state = state * (1 - alpha) + day * alpha;
  }
  return Math.round(Math.min(100, Math.max(0, state)));
}

export function hydrationBodyIndexLabel(index: number): { label: string; detail: string } {
  if (index < 25) {
    return {
      label: "Hydratation régulière faible",
      detail:
        "Peu de jours récents atteignent l’objectif. En visant l’objectif quotidien plus souvent, cet indicateur montera progressivement.",
    };
  }
  if (index < 45) {
    return {
      label: "En progression",
      detail:
        "Ton corps « apprend » une meilleure routine : continue sur plusieurs semaines pour renforcer l’habitude.",
    };
  }
  if (index < 70) {
    return {
      label: "Bonne régularité",
      detail:
        "Beaucoup de jours sont proches ou au-dessus de l’objectif. C’est cohérent avec une bonne hydratation quotidienne.",
    };
  }
  if (index < 88) {
    return {
      label: "Très bonne régularité",
      detail:
        "Tu bois de façon soutenue dans le temps. Garde ce rythme ; l’indicateur se stabilisera vers le haut.",
    };
  }
  return {
    label: "Excellente constance",
    detail:
      "Indicateur élevé : tu atteins souvent ton objectif sur le long terme. Reste à l’écoute de ta soif et adapte si l’activité ou la chaleur augmente.",
  };
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
 * Indicateur court terme 0–100 (régularité sur N jours) — moyenne des % journaliers plafonnés.
 */
export function hydrationLongTermScore(dailyPercentages: number[]): number {
  if (dailyPercentages.length === 0) return 0;
  let acc = 0;
  for (const p of dailyPercentages) acc += Math.min(100, Math.max(0, p));
  return Math.round(acc / dailyPercentages.length);
}
