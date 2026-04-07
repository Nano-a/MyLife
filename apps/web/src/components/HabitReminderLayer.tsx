import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { AppPreferences, Habit } from "@mylife/core";
import { db } from "../db";
import { todayISO } from "../lib/dateUtils";
import { habitsDueToday } from "../lib/habitsDue";
import { habitNotifResolved, shouldShowInAppNudge } from "../lib/habitWindow";
import { tickHabitReminders } from "../lib/habitNotifications";
import { HabitSkipModal } from "./HabitSkipModal";

export function HabitReminderLayer() {
  const date = todayISO();
  const prefsRow = useLiveQuery(() => db.settings.get("prefs"), []);
  const prefs = prefsRow?.value as AppPreferences | undefined;
  const habits = useLiveQuery(() => db.habits.toArray(), []) ?? [];
  const completionsToday =
    useLiveQuery(() => db.habitCompletions.where("date").equals(date).toArray(), [date]) ?? [];

  const [skipHabit, setSkipHabit] = useState<Habit | null>(null);

  useEffect(() => {
    const run = () => tickHabitReminders(prefs, habits, completionsToday, date);
    run();
    const id = window.setInterval(run, 25_000);
    return () => window.clearInterval(id);
  }, [prefs, habits, completionsToday, date]);

  const nudges = useMemo(() => {
    const dow = new Date().getDay();
    const due = habitsDueToday(
      habits.filter((h) => !h.archived),
      dow
    );
    const map = new Map(completionsToday.map((c) => [c.habitId, c]));
    return due.filter(
      (h) => shouldShowInAppNudge(h) && !habitNotifResolved(map.get(h.id))
    );
  }, [habits, completionsToday]);

  const first = nudges[0];

  return (
    <>
      {nudges.length > 0 && first && (
      <div
        className="fixed left-4 right-4 z-40 rounded-2xl border border-amber-500/40 bg-amber-950/90 p-3 shadow-lg backdrop-blur-md [html[data-theme=light]_&]:border-amber-600/50 [html[data-theme=light]_&]:bg-amber-50/95"
        style={{ bottom: "calc(5.5rem + env(safe-area-inset-bottom))" }}
      >
        <p className="text-xs font-medium text-amber-200 [html[data-theme=light]_&]:text-amber-900">
          {nudges.length === 1
            ? "Une habitude attend ta réponse dans l’app :"
            : `${nudges.length} habitudes attendent ta réponse :`}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold [html[data-theme=light]_&]:text-zinc-900">
            {first.icone} {first.nom}
          </span>
          <button
            type="button"
            onClick={() => setSkipHabit(first)}
            className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-black hover:bg-amber-400"
          >
            Répondre
          </button>
          <Link
            to="/app/habitudes"
            className="text-xs text-amber-200/90 underline [html[data-theme=light]_&]:text-amber-800"
          >
            Voir les habitudes
          </Link>
        </div>
      </div>
      )}
      <HabitSkipModal habit={skipHabit} open={Boolean(skipHabit)} onClose={() => setSkipHabit(null)} />
    </>
  );
}
