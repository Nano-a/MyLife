import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useMemo, useRef, useState } from "react";
import { db, getProfile } from "../db";
import type { UserProfile } from "@mylife/core";
import {
  computeHydrationBodyIndex,
  hydrationBodyIndexLabel,
  hydrationLongTermScore,
  totalDrunkMl,
} from "@mylife/core";
import { dateISOFromTimestamp, todayISO } from "../lib/dateUtils";
import {
  buildHydrationBodyIndexSeries,
  type HydrationByDate,
  waterTargetForDate,
} from "../lib/hydrationTarget";
import { BottleFill } from "./BottleFill";
import { BodyHydrationVisual } from "./BodyHydrationVisual";
import { toast } from "../lib/toastStore";

const QUICK_ML = [150, 250, 330, 500] as const;

export function HydrationSection() {
  const date = todayISO();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [customMl, setCustomMl] = useState("");
  const [ripple, setRipple] = useState<number | null>(null);
  const rippleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hydRow = useLiveQuery(() => db.hydrationDays.get(date), [date]);
  const hydrationRows =
    useLiveQuery(() => db.hydrationDays.orderBy("date").reverse().limit(120).toArray(), []) ?? [];
  const sportSessions = useLiveQuery(() => db.sportSessions.toArray(), []) ?? [];

  useEffect(() => {
    void getProfile().then(setProfile);
  }, []);

  const hydMap: HydrationByDate = useMemo(() => {
    const m: HydrationByDate = new Map();
    for (const r of hydrationRows) m.set(r.date, r);
    return m;
  }, [hydrationRows]);

  const targetMl = useMemo(() => {
    if (!profile) return 2500;
    return waterTargetForDate(profile, date, sportSessions);
  }, [profile, date, sportSessions]);

  const drunk = totalDrunkMl(hydRow?.entries ?? []);
  const pct = targetMl > 0 ? Math.min(100, Math.round((drunk / targetMl) * 100)) : 0;

  const bodyIndexSeries90 = useMemo(() => {
    if (!profile) return [];
    return buildHydrationBodyIndexSeries(profile, hydMap, sportSessions, 90);
  }, [profile, hydMap, sportSessions]);

  const bodyIndex = useMemo(
    () => computeHydrationBodyIndex(bodyIndexSeries90),
    [bodyIndexSeries90]
  );

  const bodyLabel = useMemo(() => hydrationBodyIndexLabel(bodyIndex), [bodyIndex]);

  const longTerm14 = useMemo(() => {
    if (!profile) return 0;
    const series = buildHydrationBodyIndexSeries(profile, hydMap, sportSessions, 14);
    return hydrationLongTermScore(series);
  }, [profile, hydMap, sportSessions]);

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

  const sportTodayMin = useMemo(() => {
    const dayS = sportSessions.filter((s) => dateISOFromTimestamp(s.debut) === date);
    return Math.round(dayS.reduce((acc, s) => acc + (s.fin - s.debut) / 60_000, 0));
  }, [sportSessions, date]);

  return (
    <section className="overflow-hidden rounded-2xl elevated-surface">
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
          {sportTodayMin > 0 && (
            <p className="mt-0.5 text-xs text-muted">
              Objectif ajusté (sport du jour : ~{sportTodayMin} min)
            </p>
          )}
          <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-[var(--surface)]">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${pct}%`,
                background:
                  pct >= 100
                    ? "var(--green)"
                    : `linear-gradient(90deg, var(--accent), #a855f7)`,
              }}
            />
          </div>
          <div className="mt-1.5 flex items-center justify-between text-xs text-muted">
            <span>{pct}% de l&apos;objectif aujourd&apos;hui</span>
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
          <p className="mt-1 text-xs text-muted">Moyenne sur 14 j : {longTerm14}% de l&apos;objectif</p>
        </div>
        <BottleFill percent={pct} className="shrink-0" />
      </div>

      {/* Indice « corps » + silhouette */}
      <div className="mx-5 mt-5 rounded-2xl border border-border bg-[var(--surface)] p-4">
        <div className="flex flex-col items-stretch gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">Hydratation dans le temps</p>
            <p className="mt-1 text-xs leading-relaxed text-muted">
              Indice calculé sur <strong>90 jours</strong> : il monte quand tu atteins souvent ton objectif
              (poids, taille, âge, activité et sport du jour sont pris en compte). Ce n&apos;est{" "}
              <strong>pas</strong> une mesure médicale d&apos;eau dans les organes, mais une façon de voir ta{" "}
              <strong>régularité</strong>.
            </p>
            <p className="mt-3 text-sm font-medium" style={{ color: "var(--accent)" }}>
              {bodyLabel.label}
            </p>
            <p className="mt-1 text-xs text-muted">{bodyLabel.detail}</p>
          </div>
          <BodyHydrationVisual percent={bodyIndex} className="shrink-0 self-center sm:self-start" />
        </div>
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

      <form onSubmit={handleCustom} className="flex items-center gap-2 px-5 pb-5 pt-3">
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
