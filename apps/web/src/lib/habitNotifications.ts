import type { AppPreferences, Habit, HabitCompletion } from "@mylife/core";
import { habitsDueToday } from "./habitsDue";
import {
  habitNotifResolved,
  habitWantsPersistentNotif,
  hasPassedFirstReminder,
  isNowInHabitWindow,
} from "./habitWindow";
import { inAnyDnd, inNotifWindow } from "./notifications";
import { playNotificationSound } from "./playNotifSound";

const firedHabitBuckets = new Map<string, number>();

function bucketKey(habitId: string, dateISO: string): string {
  return `${habitId}_${dateISO}_${Math.floor(Date.now() / 300_000)}`;
}

/**
 * Rappels habitudes : dans la fenêtre horaire de l’habitude, tant que la journée
 * n’est pas résolue (fait ou « pas fait » + motif). Le navigateur peut toujours
 * fermer la notification ; on renvoie un rappel toutes les ~5 min avec le même tag.
 */
export function tickHabitReminders(
  prefs: AppPreferences | undefined,
  habits: Habit[],
  completionsToday: (HabitCompletion & { id: string })[],
  dateISO: string,
  now = new Date()
): void {
  if (!prefs?.notifHabits || typeof Notification === "undefined" || Notification.permission !== "granted") {
    return;
  }
  if (!inNotifWindow(prefs, now) || inAnyDnd(prefs, now)) return;

  const completionByHabit = new Map<string, HabitCompletion>();
  for (const c of completionsToday) {
    if (c.date === dateISO) completionByHabit.set(c.habitId, c);
  }

  const dow = now.getDay();
  const due = habitsDueToday(
    habits.filter((h) => !h.archived),
    dow
  );

  for (const h of due) {
    if (!habitWantsPersistentNotif(h)) continue;
    if (!isNowInHabitWindow(h, now) || !hasPassedFirstReminder(h, now)) continue;
    const c = completionByHabit.get(h.id);
    if (habitNotifResolved(c)) continue;

    const key = bucketKey(h.id, dateISO);
    if (firedHabitBuckets.get(key)) continue;
    firedHabitBuckets.set(key, 1);
    if (firedHabitBuckets.size > 800) firedHabitBuckets.clear();

    try {
      const base = import.meta.env.BASE_URL || "/";
      const icon =
        typeof window !== "undefined"
          ? `${window.location.origin}${base.endsWith("/") ? base : `${base}/`}icon-192.png`
          : undefined;
      playNotificationSound(prefs);
      const tag = `habit-${h.id}-${dateISO}`;
      new Notification(`${h.icone} ${h.nom}`, {
        body: "Ouvre l’app : j’ai fini ou je ne l’ai pas fait (avec motif).",
        tag,
        requireInteraction: true,
        ...(icon ? { icon } : {}),
      });
    } catch {
      /* ignore */
    }
  }
}
