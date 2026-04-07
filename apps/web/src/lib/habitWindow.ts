import type { Habit, HabitCompletion } from "@mylife/core";

export function timeToMin(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

/** Fenêtre [start,end] en minutes depuis minuit ; null si non configurée */
export function habitWindowMinutes(h: Habit): { start: number; end: number } | null {
  const a = h.rappelFenetreDebut;
  const b = h.rappelFenetreFin;
  if (!a || !b) return null;
  return { start: timeToMin(a), end: timeToMin(b) };
}

/**
 * Habitude avec fenêtre « normale » (fin > début, même jour).
 * Les fenêtres overnight sont ignorées pour la v1.
 */
export function hasSimpleHabitWindow(h: Habit): boolean {
  const w = habitWindowMinutes(h);
  return w != null && w.end > w.start;
}

/** Heure courante en minutes depuis minuit */
export function nowMinutes(d = new Date()): number {
  return d.getHours() * 60 + d.getMinutes();
}

export function isNowInHabitWindow(h: Habit, now = new Date()): boolean {
  const w = habitWindowMinutes(h);
  if (!w || w.end <= w.start) return false;
  const cur = nowMinutes(now);
  return cur >= w.start && cur <= w.end;
}

/** Minute du premier rappel (bornée dans la fenêtre) */
export function firstReminderMinute(h: Habit): number | null {
  const w = habitWindowMinutes(h);
  if (!w || w.end <= w.start) return null;
  const r = h.heureRappel ? timeToMin(h.heureRappel) : w.start;
  return Math.min(Math.max(r, w.start), w.end);
}

export function hasPassedFirstReminder(h: Habit, now = new Date()): boolean {
  const first = firstReminderMinute(h);
  if (first == null) return false;
  return nowMinutes(now) >= first;
}

/** Complétion = fait, ou déclaration « pas fait » avec motif */
export function habitNotifResolved(c: HabitCompletion | undefined): boolean {
  if (!c) return false;
  if (c.fait) return true;
  return Boolean(c.skipReason?.trim() && c.skipKind);
}

export function habitWantsPersistentNotif(h: Habit): boolean {
  return Boolean(h.notifJusquaResolution && hasSimpleHabitWindow(h));
}

/** Bannière in-app : à partir du début de la fenêtre jusqu’à résolution (même après la fin de fenêtre). */
export function shouldShowInAppNudge(h: Habit, now = new Date()): boolean {
  if (!habitWantsPersistentNotif(h)) return false;
  const w = habitWindowMinutes(h);
  if (!w || w.end <= w.start) return false;
  return nowMinutes(now) >= w.start;
}
