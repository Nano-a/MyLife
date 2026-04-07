import type { SportSession, UserProfile } from "@mylife/core";
import { computeDailyWaterTargetMl, sportHydrationHoursFromSessions, totalDrunkMl } from "@mylife/core";
import type { HydrationRow } from "../db";
import { dateISOFromLocalDate, dateISOFromTimestamp } from "./dateUtils";

export type HydrationByDate = Map<string, HydrationRow | undefined>;

export function waterTargetForDate(
  profile: UserProfile,
  dateISO: string,
  allSessions: SportSession[]
): number {
  const daySessions = allSessions.filter((s) => dateISOFromTimestamp(s.debut) === dateISO);
  const { heuresSportModere, heuresSportIntense } = sportHydrationHoursFromSessions(daySessions);
  return computeDailyWaterTargetMl(profile, {
    activiteDuJour: profile.activiteHabituelle,
    heuresSportModere,
    heuresSportIntense,
  });
}

/** Série des % journaliers (0–100+) sur `daysBack` jours, du plus ancien au plus récent, pour l’indice « corps ». */
export function buildHydrationBodyIndexSeries(
  profile: UserProfile,
  hydrationByDate: HydrationByDate,
  sportSessions: SportSession[],
  daysBack: number
): number[] {
  const scores: number[] = [];
  const today = new Date();
  for (let i = daysBack - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const iso = dateISOFromLocalDate(d);
    const target = waterTargetForDate(profile, iso, sportSessions);
    const row = hydrationByDate.get(iso);
    const drunk = totalDrunkMl(row?.entries ?? []);
    scores.push(target > 0 ? Math.min(120, (drunk / target) * 100) : 0);
  }
  return scores;
}
