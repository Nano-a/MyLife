import type { Intensity, UserProfile } from "./types.js";

/** Recommandations OMS simplifiées (adultes / enfants) — indicatif, pas un avis médical. */
export interface WeeklyActivityGuideline {
  /** Minutes d’équivalent modéré à viser sur la semaine (adultes : 150 min). */
  moderateMinutesWeeklyTarget: number;
  /** Alternative : minutes vigoureuses (adultes : 75 min). */
  vigorousMinutesWeeklyAlternative: number;
  /** 5–17 ans : minutes par jour en moyenne à viser. */
  childMinutesPerDay?: number;
  summaryFr: string;
  sourceFr: string;
}

export function weeklyActivityGuideline(profile: UserProfile): WeeklyActivityGuideline {
  const a = profile.age;
  if (a > 0 && a < 5) {
    return {
      moderateMinutesWeeklyTarget: 0,
      vigorousMinutesWeeklyAlternative: 0,
      summaryFr:
        "Les tout-petits bougent par le jeu : pas de quota chiffré ici, privilégie des moments actifs chaque jour.",
      sourceFr: "OMS — activité ludique",
    };
  }
  if (a >= 5 && a < 18) {
    return {
      moderateMinutesWeeklyTarget: 420,
      vigorousMinutesWeeklyAlternative: 210,
      childMinutesPerDay: 60,
      summaryFr:
        "Enfants et ados : en moyenne au moins 60 min par jour d’activité modérée à vigoureuse (jeu, sport, marche rapide…).",
      sourceFr: "OMS, 5–17 ans",
    };
  }
  return {
    moderateMinutesWeeklyTarget: 150,
    vigorousMinutesWeeklyAlternative: 75,
    summaryFr:
      "Adultes : au moins 150 min d’activité modérée par semaine (ou 75 min vigoureuse), et 2 séances de renforcement musculaire.",
    sourceFr: "OMS, adultes 18–64 ans et plus",
  };
}

/**
 * Convertit une séance en minutes « équivalent modéré » (1 min vigoureuse ≈ 2 min modérées, OMS).
 */
export function sessionToModerateEquivalentMinutes(s: {
  debut: number;
  fin: number;
  intensite: Intensity;
}): number {
  const min = Math.max(0, (s.fin - s.debut) / 60_000);
  if (s.intensite === "faible") return min * 0.5;
  if (s.intensite === "moderee") return min;
  return min * 2;
}

export function weeklyModerateEquivalentMinutes(
  sessions: { debut: number; fin: number; intensite: Intensity }[],
  weekStartMs: number,
  weekEndMs: number
): number {
  let t = 0;
  for (const s of sessions) {
    if (s.debut >= weekStartMs && s.debut < weekEndMs) {
      t += sessionToModerateEquivalentMinutes(s);
    }
  }
  return Math.round(t);
}
