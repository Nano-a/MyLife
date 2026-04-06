import type { Intensity, UserProfile } from "./types.js";

/**
 * Heures de récupération indicatives (simplifié ACSM/WHO) — pas un avis médical.
 * O(1)
 */
export function estimatedRecoveryHoursFull(
  profile: UserProfile,
  intensite: Intensity,
  dureeMinutes: number
): number {
  const ageFactor = profile.age < 30 ? 1 : profile.age < 50 ? 1.15 : 1.35;
  const massFactor =
    1 + Math.max(-0.06, Math.min(0.1, (profile.poidsKg - 70) * 0.002));
  const base =
    intensite === "faible"
      ? dureeMinutes * 0.02
      : intensite === "moderee"
        ? dureeMinutes * 0.04
        : dureeMinutes * 0.07;
  return Math.round(base * ageFactor * massFactor * 10) / 10;
}

export function recoveryPercentSinceSessionEnd(
  endedAt: number,
  recoveryHours: number,
  now = Date.now()
): number {
  if (recoveryHours <= 0) return 100;
  const elapsedH = (now - endedAt) / 3_600_000;
  return Math.min(100, Math.round((elapsedH / recoveryHours) * 100));
}
