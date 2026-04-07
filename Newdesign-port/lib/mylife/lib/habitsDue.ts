import type { Habit } from "@mylife/core";

/** Habitudes dues ce jour — O(habits) */
export function habitsDueToday(habits: Habit[], dayOfWeek: number): Habit[] {
  const out: Habit[] = [];
  for (const h of habits) {
    if (h.frequence === "quotidien") {
      out.push(h);
      continue;
    }
    if (h.frequence === "jours_specifiques" && h.joursSemaine?.includes(dayOfWeek)) {
      out.push(h);
    }
  }
  return out;
}
