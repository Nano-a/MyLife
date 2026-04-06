import { useLiveQuery } from "dexie-react-hooks";
import { db, getProfile } from "../db";
import { totalDrunkMl, computeDayScore, type HabitCompletion, type UserProfile, type Habit, type AgendaEvent } from "@mylife/core";
import { todayISO } from "../lib/dateUtils";
import { waterTargetForDate } from "../lib/hydrationTarget";
import { habitsDueToday } from "../lib/habitsDue";
import { useMemo, useState, useEffect } from "react";
import { toast } from "../lib/toastStore";
import { MoodWidget } from "../components/MoodWidget";

function greeting(): string {
  const h = new Date().getHours();
  if (h < 6)  return "Bonne nuit";
  if (h < 12) return "Bonjour";
  if (h < 18) return "Bon après-midi";
  return "Bonsoir";
}

function completionStreak(
  habits: Habit[],
  rows: (HabitCompletion & { id: string })[]
): number {
  const byKey = new Map<string, boolean>();
  for (const r of rows) {
    if (r.fait) byKey.set(`${r.habitId}_${r.date}`, true);
  }
  const d = new Date();
  let streak = 0;
  for (let i = 0; i < 400; i++) {
    const iso = d.toISOString().slice(0, 10);
    const dow = d.getDay();
    const due = habitsDueToday(habits, dow);
    if (due.length === 0) { d.setDate(d.getDate() - 1); continue; }
    const ok = due.every((h) => byKey.get(`${h.id}_${iso}`));
    if (!ok) break;
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

function ScoreRing({ score }: { score: number }) {
  const r = 38;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - score / 100);
  return (
    <svg width={90} height={90} viewBox="0 0 90 90" className="-rotate-90 shrink-0">
      <circle cx={45} cy={45} r={r} fill="none" stroke="var(--border)" strokeWidth={7} />
      <circle
        cx={45} cy={45} r={r}
        fill="none"
        stroke={score >= 80 ? "var(--green)" : "var(--accent)"}
        strokeWidth={7}
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        className="ring-progress"
      />
      <text
        x={45} y={45}
        textAnchor="middle"
        dominantBaseline="central"
        className="rotate-90"
        style={{
          transform: "rotate(90deg)",
          transformOrigin: "45px 45px",
          fill: "var(--text)",
          fontSize: 18,
          fontWeight: 700,
          fontFamily: "var(--font-app)",
        }}
      >
        {score}%
      </text>
    </svg>
  );
}

export function Dashboard() {
  const date = todayISO();
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    void getProfile().then(setProfile);
  }, []);

  const habits = useLiveQuery(() => db.habits.toArray(), []) ?? [];
  const completions =
    useLiveQuery(() => db.habitCompletions.where("date").equals(date).toArray(), [date]) ?? [];
  const allCompletions = useLiveQuery(() => db.habitCompletions.toArray(), []) ?? [];
  const hydRow = useLiveQuery(() => db.hydrationDays.get(date), [date]);
  const events = useLiveQuery(() => db.events.toArray(), []) ?? [];
  const balances =
    useLiveQuery(() => db.balanceSnapshots.orderBy("date").reverse().toArray(), []) ?? [];
  const sportSessions = useLiveQuery(() => db.sportSessions.toArray(), []) ?? [];

  const targetMl = useMemo(() => {
    if (!profile) return 2500;
    return waterTargetForDate(profile, date, sportSessions);
  }, [profile, date, sportSessions]);

  const drunk = totalDrunkMl(hydRow?.entries ?? []);
  const hydPct = targetMl > 0 ? Math.min(100, Math.round((drunk / targetMl) * 100)) : 0;
  const dayScore = computeDayScore(habits, completions, date);
  const streak = completionStreak(habits, allCompletions);

  const nextEvent = useMemo(() => {
    const now = Date.now();
    const upcoming = (events as AgendaEvent[]).filter((e) => e.fin > now);
    upcoming.sort((a, b) => a.debut - b.debut);
    return upcoming[0];
  }, [events]);

  const solde = balances[0]?.solde ?? null;

  async function quickAddWater(ml: number) {
    const row = (await db.hydrationDays.get(date)) ?? { date, entries: [] };
    await db.hydrationDays.put({
      date,
      entries: [...row.entries, { id: crypto.randomUUID(), ml, at: Date.now() }],
    });
    toast.ok(`+${ml} ml 💧`);
  }

  const dow = new Date().getDay();
  const due = habitsDueToday(habits, dow);
  const doneCnt = due.filter((h) =>
    completions.some((c) => c.id === `${h.id}_${date}` && c.fait)
  ).length;

  return (
    <div className="space-y-5">
      {/* En-tête */}
      <header>
        <p className="text-sm text-muted">{greeting()},</p>
        <h1 className="text-2xl font-bold">{profile?.prenom ?? "Bienvenue"} 👋</h1>
      </header>

      <MoodWidget />

      {/* Score + streak */}
      <section className="flex gap-3">
        <div className="flex flex-1 items-center gap-3 rounded-2xl border border-border bg-elevated p-4">
          <ScoreRing score={dayScore} />
          <div>
            <p className="font-semibold">Journée</p>
            <p className="text-sm text-muted">{doneCnt}/{due.length} habitudes</p>
          </div>
        </div>
        <div className="flex w-24 flex-col items-center justify-center rounded-2xl border border-border bg-elevated p-3 text-center">
          <span className="flame-icon text-2xl" aria-hidden>🔥</span>
          <span className="text-xl font-bold">{streak}</span>
          <span className="text-xs text-muted">jours</span>
        </div>
      </section>

      {/* Hydratation — rapide */}
      <section className="rounded-2xl border border-border bg-elevated p-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="font-semibold">Eau</p>
            <p className="text-sm text-muted">
              {drunk} / {targetMl} ml — {hydPct}%
            </p>
          </div>
          <div
            className="relative h-12 w-12 shrink-0"
            title={`${hydPct}% hydraté`}
            aria-label={`Hydratation ${hydPct}%`}
          >
            <svg viewBox="0 0 48 48" className="h-full w-full">
              <circle cx={24} cy={24} r={20} fill="var(--border)" />
              <circle
                cx={24} cy={24} r={20}
                fill="none"
                stroke="var(--accent)"
                strokeWidth={4}
                strokeLinecap="round"
                strokeDasharray={`${125.7 * hydPct / 100} 125.7`}
                strokeDashoffset={31.4}
                style={{ transition: "stroke-dasharray 700ms cubic-bezier(0.22,1,.36,1)" }}
              />
              <text x={24} y={24} textAnchor="middle" dominantBaseline="central"
                style={{ fill: "var(--text)", fontSize: 11, fontWeight: 700, fontFamily: "var(--font-app)" }}>
                {hydPct}%
              </text>
            </svg>
          </div>
        </div>
        <div className="flex gap-2">
          {[150, 250, 500].map((ml) => (
            <button
              key={ml}
              type="button"
              onClick={() => void quickAddWater(ml)}
              className="flex-1 rounded-xl border border-border bg-[var(--surface)] py-2 text-sm font-medium hover:border-accent hover:bg-[var(--accent-dim)] active:scale-95"
            >
              +{ml} ml
            </button>
          ))}
        </div>
      </section>

      {/* Prochain event */}
      <section className="rounded-2xl border border-border bg-elevated p-4">
        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted">
          Prochain événement
        </p>
        {nextEvent ? (
          <div>
            <p className="font-semibold">{nextEvent.titre}</p>
            <p className="text-sm text-muted">
              {new Date(nextEvent.debut).toLocaleString("fr-FR", {
                weekday: "short",
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted">Aucun événement à venir</p>
        )}
      </section>

      {/* Finances */}
      {solde !== null && (
        <section className="rounded-2xl border border-border bg-elevated p-4">
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted">Solde</p>
          <p className="text-2xl font-bold">{solde.toLocaleString("fr-FR")} €</p>
        </section>
      )}
    </div>
  );
}
