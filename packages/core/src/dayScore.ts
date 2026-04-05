import type { Habit, HabitCompletion } from "./types.js";

/** Score journée 0–100 — une passe O(habits) + O(completions) avec Map */
export function computeDayScore(
  habits: Habit[],
  completions: HabitCompletion[],
  date: string
): number {
  if (habits.length === 0) return 0;
  const map = new Map<string, HabitCompletion>();
  for (const c of completions) {
    if (c.date === date) map.set(c.habitId, c);
  }
  let points = 0;
  let max = 0;
  for (const h of habits) {
    max += 1;
    const c = map.get(h.id);
    if (!c || !c.fait) continue;
    if (h.type === "quantite" && h.objectifQuantite) {
      const v = c.valeur ?? 0;
      points += Math.min(1, v / h.objectifQuantite);
    } else {
      points += 1;
    }
  }
  if (max === 0) return 0;
  return Math.round((points / max) * 100);
}
