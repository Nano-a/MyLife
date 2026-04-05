import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useMemo, useRef, useState } from "react";
import { db, getProfile } from "../db";
import type { UserProfile } from "@mylife/core";
import { computeDailyWaterTargetMl, totalDrunkMl, hydrationLongTermScore } from "@mylife/core";
import { todayISO } from "../lib/dateUtils";
import { BottleFill } from "./BottleFill";
import { toast } from "../lib/toastStore";

const QUICK_ML = [150, 250, 330, 500] as const;

export function HydrationSection() {
  const date = todayISO();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [customMl, setCustomMl] = useState("");
  const [ripple, setRipple] = useState<number | null>(null);
  const rippleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hydRow = useLiveQuery(() => db.hydrationDays.get(date), [date]);
  const recentDays = useLiveQuery(
    () => db.hydrationDays.orderBy("date").reverse().limit(14).toArray(), []
  ) ?? [];

  useEffect(() => {
    void getProfile().then(setProfile);
  }, []);

  const targetMl = useMemo(() => {
    if (!profile) return 2500;
    return computeDailyWaterTargetMl(profile, {
      activiteDuJour: profile.activiteHabituelle,
      heuresSportModere: 0,
      heuresSportIntense: 0,
    });
  }, [profile]);

  const drunk = totalDrunkMl(hydRow?.entries ?? []);
  const pct = targetMl > 0 ? Math.min(100, Math.round((drunk / targetMl) * 100)) : 0;

  const longTerm = useMemo(() => {
    if (!profile) return 0;
    const dailyPct = recentDays.map((d) => {
      const t = computeDailyWaterTargetMl(profile, {
        activiteDuJour: profile.activiteHabituelle,
        heuresSportModere: 0,
        heuresSportIntense: 0,
      });
      const consumed = totalDrunkMl(d.entries);
      return t > 0 ? (consumed / t) * 100 : 0;
    });
    return hydrationLongTermScore(dailyPct);
  }, [recentDays, profile]);

  const lastAt = hydRow?.entries.at(-1)?.at;

  async function addMl(ml: number, idx?: number) {
    if (rippleTimer.current) clearTimeout(rippleTimer.current);
    setRipple(idx ?? -1);
    rippleTimer.current = setTimeout(() => setRipple(null), 520);

    const row = (await db.hydrationDays.get(date)) ?? { date, entries: [] };
    const entries = [...row.entries, { id: crypto.randomUUID(), ml, at: Date.now() }];
    await db.hydrationDays.put({ date, entries });
    toast.ok(`+${ml} ml ajouté 💧`);
  }

  async function removeLast() {
    const row = await db.hydrationDays.get(date);
    if (!row || row.entries.length === 0) return;
    const entries = row.entries.slice(0, -1);
    await db.hydrationDays.put({ date, entries });
    toast.info("Dernière entrée supprimée");
  }

  async function handleCustom(e: React.FormEvent) {
    e.preventDefault();
    const ml = Number(customMl.replace(",", "."));
    if (!ml || ml <= 0) return;
    await addMl(ml);
    setCustomMl("");
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-elevated">
      {/* En-tête avec bouteille */}
      <div className="flex items-center justify-between gap-4 px-5 pt-5">
        <div className="flex-1">
          <h2 className="text-lg font-semibold">Hydratation</h2>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-3xl font-bold" style={{ color: "var(--accent)" }}>
              {drunk}
            </span>
            <span className="text-sm text-muted"> / {targetMl} ml</span>
          </div>
          {/* Progress bar */}
          <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-[var(--surface)]">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${pct}%`,
                background: pct >= 100
                  ? "var(--green)"
                  : `linear-gradient(90deg, var(--accent), #a855f7)`,
              }}
            />
          </div>
          <div className="mt-1.5 flex items-center justify-between text-xs text-muted">
            <span>{pct}% de l'objectif</span>
            {lastAt && (
              <span>
                Dernière gorgée{" "}
                {new Date(lastAt).toLocaleTimeString("fr-FR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-muted">
            Régularité 14 j : {longTerm}%
          </p>
        </div>
        <BottleFill percent={pct} className="shrink-0" />
      </div>

      {/* Boutons rapides */}
      <div className="mt-4 grid grid-cols-4 gap-1.5 px-5">
        {QUICK_ML.map((ml, i) => (
          <div key={ml} className="relative overflow-hidden rounded-2xl">
            {ripple === i && <span className="ripple-ring" />}
            <button
              type="button"
              onClick={() => void addMl(ml, i)}
              className="relative z-10 flex w-full flex-col items-center gap-0.5 rounded-2xl border border-border bg-[var(--surface)] py-3 text-sm font-medium hover:border-accent hover:bg-[var(--accent-dim)] active:scale-95"
            >
              <span className="text-xl" aria-hidden>
                {ml <= 150 ? "🥃" : ml <= 250 ? "🥤" : ml <= 330 ? "🧋" : "🍶"}
              </span>
              <span>{ml} ml</span>
            </button>
          </div>
        ))}
      </div>

      {/* Saisie libre + annuler */}
      <form
        onSubmit={handleCustom}
        className="flex items-center gap-2 px-5 pb-5 pt-3"
      >
        <input
          type="number"
          inputMode="numeric"
          className="flex-1 rounded-xl border border-border bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-accent"
          placeholder="Autre quantité (ml)"
          value={customMl}
          onChange={(e) => setCustomMl(e.target.value)}
        />
        <button
          type="submit"
          className="rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 active:scale-95"
        >
          +
        </button>
        {hydRow && hydRow.entries.length > 0 && (
          <button
            type="button"
            onClick={() => void removeLast()}
            title="Annuler la dernière entrée"
            className="rounded-xl border border-border px-3 py-2 text-sm text-muted hover:text-[var(--text)] active:scale-95"
          >
            ↩
          </button>
        )}
      </form>
    </section>
  );
}
