import { useLiveQuery } from "dexie-react-hooks";
import { db, getProfile } from "../db";
import {
  totalDrunkMl,
  computeDayScore,
  type HabitCompletion,
  type UserProfile,
  type Habit,
  type AgendaEvent,
} from "@mylife/core";
import { todayISO } from "../lib/dateUtils";
import { waterTargetForDate } from "../lib/hydrationTarget";
import { habitsDueToday } from "../lib/habitsDue";
import { useMemo, useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import {
  Bell,
  BookMarked,
  Calendar,
  CheckCircle2,
  Dumbbell,
  Droplets,
  FileText,
  Home,
  Settings,
  Smile,
  Target,
  Wallet,
} from "lucide-react";
import { toast } from "../lib/toastStore";
import { MoodWidget } from "../components/MoodWidget";
import { requestNotificationPermission } from "../lib/notifications";
import { useThemePrefs } from "../theme/ThemeProvider";

function longDateFr(): string {
  return new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
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
    if (due.length === 0) {
      d.setDate(d.getDate() - 1);
      continue;
    }
    const ok = due.every((h) => byKey.get(`${h.id}_${iso}`));
    if (!ok) break;
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

const MODULES = [
  { to: "/app/carnet", label: "Carnet", desc: "Historique jour par jour · PDF", icon: BookMarked, iconClass: "icon-objectifs" },
  { to: "/app/agenda", label: "Agenda", desc: "Événements et rappels", icon: Calendar, iconClass: "icon-agenda" },
  { to: "/app/habitudes", label: "Habitudes", desc: "Suivi quotidien", icon: CheckCircle2, iconClass: "icon-habitudes" },
  { to: "/app/sport", label: "Sport", desc: "Séances d’entraînement", icon: Dumbbell, iconClass: "icon-sport" },
  { to: "/app/accueil", label: "Hydratation", desc: "Eau sur l’accueil", icon: Droplets, iconClass: "icon-hydratation" },
  { to: "/app/accueil", label: "Humeur", desc: "Note du jour ici", icon: Smile, iconClass: "icon-humeur" },
  { to: "/app/finances", label: "Finances", desc: "Budget et dépenses", icon: Wallet, iconClass: "icon-finances" },
  { to: "/app/objectifs", label: "Objectifs", desc: "Projets et buts", icon: Target, iconClass: "icon-objectifs" },
  { to: "/app/notes", label: "Notes", desc: "Idées et listes", icon: FileText, iconClass: "icon-notes" },
] as const;

function ScoreRingSmall({ score }: { score: number }) {
  const r = 32;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - score / 100);
  const stroke = score >= 80 ? "var(--green)" : "hsl(var(--gradient-orange))";
  return (
    <svg width={76} height={76} viewBox="0 0 76 76" className="-rotate-90 shrink-0 text-kimi-ink">
      <circle cx={38} cy={38} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={6} />
      <circle
        cx={38}
        cy={38}
        r={r}
        fill="none"
        stroke={stroke}
        strokeWidth={6}
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        className="ring-progress"
      />
      <text
        x={38}
        y={38}
        textAnchor="middle"
        dominantBaseline="central"
        className="rotate-90"
        style={{
          transform: "rotate(90deg)",
          transformOrigin: "38px 38px",
          fill: "currentColor",
          fontSize: 15,
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
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const { prefs } = useThemePrefs();
  const appName = prefs.appDisplayName || "MyLife";
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
  const moodRow = useLiveQuery(() => db.moodDays.get(date), [date]);

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

  const hydLiters = (drunk / 1000).toFixed(1);
  const motionProps = reduceMotion
    ? {}
    : { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 } };

  return (
    <div className="space-y-6 pb-4">
      <header className="flex items-center justify-between gap-2 px-1 pt-2">
        <div className="min-w-0 flex-1">
          <motion.h1
            {...(reduceMotion ? {} : { initial: { opacity: 0, y: -12 }, animate: { opacity: 1, y: 0 } })}
            className="truncate text-2xl font-bold gradient-text sm:text-3xl"
          >
            {appName}
          </motion.h1>
          <p className="mt-1 text-sm capitalize text-kimi-muted">{longDateFr()}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            className="text-kimi-ink grid h-10 w-10 place-items-center rounded-full bg-white/5 opacity-80 transition-colors hover:bg-white/10"
            aria-label="Notifications"
            onClick={() =>
              void requestNotificationPermission().then((p) => {
                if (p === "granted") toast.ok("Notifications autorisées");
                else toast.info("Permission refusée ou indisponible");
              })
            }
          >
            <Bell className="h-5 w-5" />
          </button>
          <Link
            to="/app/parametres"
            className="text-kimi-ink grid h-10 w-10 place-items-center rounded-full bg-white/5 opacity-80 transition-colors hover:bg-white/10"
            aria-label="Réglages"
          >
            <Settings className="h-5 w-5" />
          </Link>
        </div>
      </header>

      <motion.section {...motionProps} transition={{ delay: 0.05 }} className="rounded-2xl border border-white/5 bg-gradient-to-br from-orange-500/20 via-purple-500/20 to-blue-500/20 p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm text-kimi-soft">Bonjour !</p>
            <h2 className="text-kimi-ink mt-1 text-lg font-semibold">
              {profile?.prenom ?? "Bienvenue"}, prêt·e à avancer sur tes objectifs ?
            </h2>
            <p className="mt-2 text-sm text-kimi-muted">
              {due.length === 0
                ? "Aucune habitude prévue aujourd’hui."
                : `${doneCnt}/${due.length} habitudes complétées aujourd’hui.`}
            </p>
            {nextEvent && (
              <p className="mt-2 text-xs text-kimi-soft">
                Prochain : {nextEvent.titre} —{" "}
                {new Date(nextEvent.debut).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
              </p>
            )}
          </div>
          <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full p-[3px] gradient-ring">
            <div className="flex h-full w-full items-center justify-center rounded-full bg-zinc-950 [html[data-theme=light]_&]:bg-white">
              <Home className="text-kimi-ink h-7 w-7" />
            </div>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {[150, 250, 500].map((ml) => (
            <button
              key={ml}
              type="button"
              onClick={() => void quickAddWater(ml)}
              className="text-kimi-ink rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs font-medium backdrop-blur-sm hover:border-orange-400/40 active:scale-95 [html[data-theme=light]_&]:bg-white/40"
            >
              +{ml} ml
            </button>
          ))}
        </div>
      </motion.section>

      <motion.div
        {...motionProps}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 gap-4"
      >
        <div className="kimi-glass-card rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <div className="icon-hydration flex h-10 w-10 items-center justify-center rounded-xl">
              <Droplets className="h-5 w-5" />
            </div>
            <div>
              <p className="text-kimi-ink text-2xl font-bold">{hydLiters}L</p>
              <p className="text-xs text-kimi-muted">Hydratation · {hydPct}%</p>
            </div>
          </div>
        </div>
        <div className="kimi-glass-card rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <div className="icon-humeur flex h-10 w-10 items-center justify-center rounded-xl">
              <Smile className="h-5 w-5" />
            </div>
            <div>
              <p className="text-kimi-ink text-2xl font-bold">
                {moodRow?.score != null ? `${moodRow.score}/5` : "—"}
              </p>
              <p className="text-xs text-kimi-muted">Humeur</p>
            </div>
          </div>
        </div>
      </motion.div>

      <motion.section
        {...motionProps}
        transition={{ delay: 0.12 }}
        className="kimi-glass-card flex items-center gap-3 rounded-2xl p-4"
      >
        <ScoreRingSmall score={dayScore} />
        <div className="flex-1">
          <p className="text-kimi-ink font-semibold">Score journée</p>
          <p className="text-sm text-kimi-muted">Série : {streak} jours 🔥</p>
        </div>
        {solde !== null && (
          <div className="text-right">
            <p className="text-xs text-kimi-soft">Solde</p>
            <p className="font-bold text-emerald-400">{solde.toLocaleString("fr-FR")} €</p>
          </div>
        )}
      </motion.section>

      <motion.h3 {...motionProps} transition={{ delay: 0.15 }} className="text-kimi-ink text-lg font-semibold">
        Modules
      </motion.h3>
      <div className="grid grid-cols-2 gap-4">
        {MODULES.map((m, index) => {
          const Icon = m.icon;
          return (
            <motion.button
              key={`${m.to}-${m.label}`}
              type="button"
              {...(reduceMotion ? {} : { initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 } })}
              transition={{ delay: 0.15 + index * 0.04 }}
              onClick={() => navigate(m.to)}
              className="kimi-glass-card hover-lift rounded-2xl p-5 text-left"
            >
              <div className={`mb-3 flex h-12 w-12 items-center justify-center rounded-xl ${m.iconClass}`}>
                <Icon className="h-6 w-6" />
              </div>
              <h4 className="text-kimi-ink font-semibold">{m.label}</h4>
              <p className="mt-1 text-xs text-kimi-muted">{m.desc}</p>
            </motion.button>
          );
        })}
      </div>

      <div className="kimi-glass-card rounded-2xl p-1">
        <MoodWidget />
      </div>
    </div>
  );
}
