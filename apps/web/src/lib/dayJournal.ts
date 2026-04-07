import type {
  AgendaEvent,
  FinanceTransaction,
  Habit,
  HabitCompletion,
  HydrationDay,
  MoodDay,
  SportSession,
} from "@mylife/core";
import { computeDayScore, totalDrunkMl } from "@mylife/core";
import { habitsDueToday } from "./habitsDue";
import { dateISOFromTimestamp } from "./dateUtils";

export type HabitDayStatus = "fait" | "skip_legit" | "skip_excuse" | "non_saisi" | "quantite";

export type HabitDayLine = {
  habitId: string;
  nom: string;
  icone: string;
  status: HabitDayStatus;
  detail?: string;
};

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function daysInMonth(year: number, month1to12: number): number {
  return new Date(year, month1to12, 0).getDate();
}

export function isoFromYmd(y: number, m: number, d: number): string {
  return `${y}-${pad2(m)}-${pad2(d)}`;
}

/** Lignes d’habitudes prévues ce jour-là (état lisible). */
export function habitLinesForDay(
  dateISO: string,
  habits: Habit[],
  completions: (HabitCompletion & { id: string })[]
): HabitDayLine[] {
  const t = new Date(`${dateISO}T12:00:00`);
  const dow = t.getDay();
  const due = habitsDueToday(
    habits.filter((h) => !h.archived),
    dow
  );
  const map = new Map<string, HabitCompletion>();
  for (const c of completions) {
    if (c.date === dateISO) map.set(c.habitId, c);
  }

  return due.map((h) => {
    const c = map.get(h.id);
    if (h.type === "quantite" && h.objectifQuantite && c?.fait) {
      return {
        habitId: h.id,
        nom: h.nom,
        icone: h.icone,
        status: "quantite" as const,
        detail: `${c.valeur ?? 0} / ${h.objectifQuantite} ${h.uniteQuantite ?? ""}`.trim(),
      };
    }
    if (c?.fait) return { habitId: h.id, nom: h.nom, icone: h.icone, status: "fait" as const };
    if (c?.skipKind === "legitime" && c.skipReason?.trim()) {
      return {
        habitId: h.id,
        nom: h.nom,
        icone: h.icone,
        status: "skip_legit" as const,
        detail: c.skipReason.trim(),
      };
    }
    if (c?.skipKind === "excuse" && c.skipReason?.trim()) {
      return {
        habitId: h.id,
        nom: h.nom,
        icone: h.icone,
        status: "skip_excuse" as const,
        detail: c.skipReason.trim(),
      };
    }
    return { habitId: h.id, nom: h.nom, icone: h.icone, status: "non_saisi" as const };
  });
}

export function eventsForLocalDay(dateISO: string, events: AgendaEvent[]): AgendaEvent[] {
  const [y, m, d] = dateISO.split("-").map(Number);
  if (!y || !m || !d) return [];
  const start = new Date(y, m - 1, d, 0, 0, 0, 0).getTime();
  const end = new Date(y, m - 1, d, 23, 59, 59, 999).getTime();
  return events.filter((e) => e.fin >= start && e.debut <= end).sort((a, b) => a.debut - b.debut);
}

export function sportSessionsForDay(dateISO: string, sessions: SportSession[]): SportSession[] {
  return sessions
    .filter((s) => dateISOFromTimestamp(s.debut) === dateISO)
    .sort((a, b) => a.debut - b.debut);
}

export function financeTxForDay(dateISO: string, txs: FinanceTransaction[]): FinanceTransaction[] {
  return txs.filter((t) => t.date === dateISO).sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
}

export function dayHasAnyRecord(
  dateISO: string,
  habits: Habit[],
  completions: (HabitCompletion & { id: string })[],
  mood: MoodDay | undefined,
  hyd: HydrationDay | undefined,
  events: AgendaEvent[],
  sport: SportSession[],
  txs: FinanceTransaction[]
): boolean {
  const lines = habitLinesForDay(dateISO, habits, completions);
  if (lines.some((l) => l.status !== "non_saisi")) return true;
  if (mood) return true;
  if (hyd && hyd.entries.length > 0) return true;
  if (eventsForLocalDay(dateISO, events).length > 0) return true;
  if (sportSessionsForDay(dateISO, sport).length > 0) return true;
  if (financeTxForDay(dateISO, txs).length > 0) return true;
  return false;
}

export function habitScoreForDay(
  dateISO: string,
  habits: Habit[],
  completions: (HabitCompletion & { id: string })[]
): number {
  const active = habits.filter((h) => !h.archived);
  const dayRows = completions.filter((c) => c.date === dateISO);
  return computeDayScore(active, dayRows, dateISO);
}

export function monthDayMeta(
  year: number,
  month1to12: number,
  habits: Habit[],
  completions: (HabitCompletion & { id: string })[],
  moodByDate: Map<string, MoodDay>,
  hydByDate: Map<string, HydrationDay>
): { date: string; score: number; hasData: boolean; mood?: number; hydMl: number }[] {
  const dim = daysInMonth(year, month1to12);
  const out: { date: string; score: number; hasData: boolean; mood?: number; hydMl: number }[] = [];
  for (let d = 1; d <= dim; d++) {
    const date = isoFromYmd(year, month1to12, d);
    const score = habitScoreForDay(date, habits, completions);
    const mood = moodByDate.get(date);
    const hyd = hydByDate.get(date);
    const hydMl = hyd ? totalDrunkMl(hyd.entries) : 0;
    const hasData =
      score > 0 ||
      Boolean(mood) ||
      hydMl > 0 ||
      habitLinesForDay(date, habits, completions).some((l) => l.status !== "non_saisi");
    out.push({
      date,
      score,
      hasData,
      mood: mood?.score,
      hydMl,
    });
  }
  return out;
}

export function yearSummary(
  year: number,
  habits: Habit[],
  completions: (HabitCompletion & { id: string })[],
  moodByDate: Map<string, MoodDay>,
  hydByDate: Map<string, HydrationDay>
): {
  month: number;
  daysWithData: number;
  avgScoreWhenDue: number;
  moodDays: number;
}[] {
  const months: {
    month: number;
    daysWithData: number;
    avgScoreWhenDue: number;
    moodDays: number;
  }[] = [];

  for (let m = 1; m <= 12; m++) {
    const meta = monthDayMeta(year, m, habits, completions, moodByDate, hydByDate);
    let daysWithData = 0;
    let scoreSum = 0;
    let scoreCount = 0;
    let moodDays = 0;
    for (const row of meta) {
      if (row.hasData) daysWithData++;
      if (row.mood != null) moodDays++;
      const due = habitLinesForDay(row.date, habits, completions).length;
      if (due > 0) {
        scoreSum += row.score;
        scoreCount++;
      }
    }
    months.push({
      month: m,
      daysWithData,
      avgScoreWhenDue: scoreCount > 0 ? Math.round(scoreSum / scoreCount) : 0,
      moodDays,
    });
  }
  return months;
}
