import type { Habit, HabitCompletion } from "@mylife/core";
import { habitsDueToday } from "./habitsDue";

export type DayHabitStack = {
  date: string;
  done: number;
  legitime: number;
  excuse: number;
  pending: number;
  totalDue: number;
};

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Agrégat sur N jours pour le diagramme (habitudes actives seulement) */
export function buildHabitStackSeries(
  habits: Habit[],
  completions: (HabitCompletion & { id: string })[],
  days: number
): DayHabitStack[] {
  const active = habits.filter((h) => !h.archived);
  const byDateHabit = new Map<string, Map<string, HabitCompletion>>();
  for (const c of completions) {
    let m = byDateHabit.get(c.date);
    if (!m) {
      m = new Map();
      byDateHabit.set(c.date, m);
    }
    m.set(c.habitId, c);
  }

  const out: DayHabitStack[] = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const date = isoDate(d);
    const dow = d.getDay();
    const due = habitsDueToday(active, dow);
    const map = byDateHabit.get(date) ?? new Map<string, HabitCompletion>();

    let done = 0;
    let legitime = 0;
    let excuse = 0;
    let pending = 0;

    for (const h of due) {
      const c = map.get(h.id);
      if (c?.fait) {
        done++;
        continue;
      }
      if (c && !c.fait && c.skipKind === "legitime" && c.skipReason?.trim()) {
        legitime++;
        continue;
      }
      if (c && !c.fait && c.skipKind === "excuse" && c.skipReason?.trim()) {
        excuse++;
        continue;
      }
      pending++;
    }

    out.push({
      date,
      done,
      legitime,
      excuse,
      pending,
      totalDue: due.length,
    });
  }
  return out;
}
