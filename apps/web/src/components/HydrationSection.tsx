import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useMemo, useRef, useState } from "react";
import { db, getProfile } from "../db";
import type { UserProfile } from "@mylife/core";
import { totalDrunkMl } from "@mylife/core";
import { todayISO } from "../lib/dateUtils";
import {
  chronicDurationEncouragement,
  DUREE_PIRE_CAS_JOURS,
  defaultHydrationChronicJourney,
  getHydrationChronicJourney,
  healingDailyTargetMl,
  healingEncouragementMessage,
  type HydrationChronicJourney,
  replayChronicHealing,
  saveHydrationChronicJourney,
  severityNote,
  type ChronicDehydrationDuration,
  type ChronicSymptomSeverity,
} from "../lib/chronicHydrationHealing";
import type { HydrationByDate } from "../lib/hydrationTarget";
import { BottleFill } from "./BottleFill";
import { BodyHydrationVisual } from "./BodyHydrationVisual";
import { Modal } from "./Modal";
import { toast } from "../lib/toastStore";

const QUICK_ML = [150, 250, 330, 500] as const;

export function HydrationSection() {
  const date = todayISO();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [journey, setJourney] = useState<HydrationChronicJourney | null>(null);
  const [customMl, setCustomMl] = useState("");
  const [ripple, setRipple] = useState<number | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const rippleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hydRow = useLiveQuery(() => db.hydrationDays.get(date), [date]);
  const hydrationRows = useLiveQuery(() => db.hydrationDays.orderBy("date").toArray(), []) ?? [];

  useEffect(() => {
    void getProfile().then(setProfile);
  }, []);

  useEffect(() => {
    void getHydrationChronicJourney(date).then(setJourney);
  }, [date]);

  const hydMap: HydrationByDate = useMemo(() => {
    const m: HydrationByDate = new Map();
    for (const r of hydrationRows) m.set(r.date, r);
    return m;
  }, [hydrationRows]);

  const targetMl = useMemo(() => {
    if (!journey) return 2500;
    return healingDailyTargetMl(profile, journey);
  }, [profile, journey]);

  const drunk = totalDrunkMl(hydRow?.entries ?? []);
  const pctDaily = targetMl > 0 ? Math.min(100, Math.round((drunk / targetMl) * 100)) : 0;

  const healing = useMemo(() => {
    if (!journey) return null;
    return replayChronicHealing(journey, hydMap, profile, date);
  }, [journey, hydMap, profile, date]);

  const displayHealing = healing?.displayPercent ?? 0;
  const healingOver100 = displayHealing > 100;
  const bodyFillPercent = Math.min(100, displayHealing);

  const last7 = useMemo(() => {
    const out: { iso: string; ml: number; pct: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const iso = d.toISOString().slice(0, 10);
      const row = hydMap.get(iso);
      const ml = totalDrunkMl(row?.entries ?? []);
      out.push({
        iso,
        ml,
        pct: targetMl > 0 ? Math.min(150, Math.round((ml / targetMl) * 100)) : 0,
      });
    }
    return out;
  }, [hydMap, targetMl]);

  async function persistJourney(next: HydrationChronicJourney) {
    await saveHydrationChronicJourney(next);
    setJourney(next);
  }

  async function addMl(ml: number, idx?: number) {
    if (rippleTimer.current) clearTimeout(rippleTimer.current);
    setRipple(idx ?? -1);
    rippleTimer.current = setTimeout(() => setRipple(null), 520);

    const row = (await db.hydrationDays.get(date)) ?? { date, entries: [] };
    const entries = [...row.entries, { id: crypto.randomUUID(), ml, at: Date.now() }];
    await db.hydrationDays.put({ date, entries });
    toast.ok(`+${ml} ml ajouté 💧`);
  }

  async function removeSip() {
    if (!journey) return;
    const sip = journey.sipMl;
    const row = await db.hydrationDays.get(date);
    if (!row?.entries.length) return;
    const entries = [...row.entries];
    const last = entries[entries.length - 1]!;
    if (last.ml <= sip) {
      entries.pop();
    } else {
      entries[entries.length - 1] = { ...last, ml: last.ml - sip };
    }
    await db.hydrationDays.put({ date, entries });
    toast.info(`−${sip} ml (une gorgée)`);
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

  /** Nouvelle date de départ pour la jauge ; l’historique des ml bus reste dans l’app. */
  async function resetJourneyOnly() {
    if (
      !confirm(
        "Réinitialiser uniquement la jauge de guérison ?\n\nL’historique des quantités bues sera conservé, mais seuls les jours à partir d’aujourd’hui compteront pour le programme sur 12 mois."
      )
    ) {
      return;
    }
    const next = {
      ...(journey ?? defaultHydrationChronicJourney(date)),
      journeyStartISO: date,
      onboardingShown: true,
    };
    await persistJourney(next);
    toast.ok("Jauge réinitialisée — l’historique des boissons est inchangé 💧");
  }

  /** Efface tout l’historique d’hydratation + repart à zéro (nouveau programme). */
  async function resetFullProgram() {
    if (
      !confirm(
        "Tout réinitialiser à zéro ?\n\n" +
          "• Toutes les quantités d’eau enregistrées seront effacées\n" +
          "• La jauge de guérison repart à 0 %\n" +
          "• Un nouveau programme commence aujourd’hui\n\n" +
          "Les réglages (gorgée, sport, canicule, etc.) sont conservés.\n" +
          "Cette action ne peut pas être annulée."
      )
    ) {
      return;
    }
    await db.hydrationDays.clear();
    const j = journey ?? defaultHydrationChronicJourney(date);
    const fresh: HydrationChronicJourney = {
      ...defaultHydrationChronicJourney(date),
      onboardingShown: true,
      sipMl: j.sipMl,
      boostSport: j.boostSport,
      boostHeat: j.boostHeat,
      boostPregnancy: j.boostPregnancy,
      symptomSeverity: j.symptomSeverity,
    };
    await persistJourney(fresh);
    toast.ok("Tout est à zéro — bon courage pour votre nouveau programme 💧");
  }

  const lastAt = hydRow?.entries.at(-1)?.at;

  if (!journey) {
    return (
      <section className="overflow-hidden rounded-2xl elevated-surface p-6">
        <p className="text-sm text-muted">Chargement de l’hydratation…</p>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-2xl elevated-surface">
      <Modal
        open={!journey.onboardingShown}
        onClose={() => void persistJourney({ ...journey, onboardingShown: true })}
        title="Déshydratation chronique"
      >
        <p className="text-sm leading-relaxed text-muted">
          Cette section est pensée pour un suivi bienveillant sur le <strong>long terme</strong> (jusqu’à{" "}
          {DUREE_PIRE_CAS_JOURS} jours). Ce n’est pas un avis médical.
        </p>
        <p className="mt-3 text-sm font-medium text-[var(--text)]">
          Depuis combien de temps souffrez-vous de déshydratation chronique ? (facultatif)
        </p>
        <div className="mt-3 flex flex-col gap-2">
          {(
            [
              ["under_1y", "Moins d’un an"],
              ["1_3y", "1 à 3 ans"],
              ["3_5y", "3 à 5 ans"],
              ["over_5y", "Plus de 5 ans"],
              ["unknown", "Je ne sais pas / passer"],
            ] as [ChronicDehydrationDuration, string][]
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              className="rounded-xl border border-border bg-[var(--surface)] px-4 py-3 text-left text-sm hover:border-accent"
              onClick={() =>
                void persistJourney({
                  ...journey,
                  chronicDuration: key,
                  onboardingShown: true,
                })
              }
            >
              {label}
            </button>
          ))}
        </div>
        <p className="mt-4 text-xs leading-relaxed text-muted">{chronicDurationEncouragement(journey.chronicDuration)}</p>
      </Modal>

      {/* Tableau de bord */}
      <div className="flex items-center justify-between gap-4 px-5 pt-5">
        <div className="flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">Hydratation</h2>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                className="rounded-lg border border-destructive/50 bg-[var(--surface)] px-2.5 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10"
                onClick={() => void resetFullProgram()}
              >
                Nouveau programme (tout à zéro)
              </button>
              <button
                type="button"
                className="text-xs text-muted underline-offset-2 hover:underline"
                onClick={() => setSettingsOpen((o) => !o)}
              >
                Réglages
              </button>
            </div>
          </div>
          <p className="mt-1 text-xs text-muted">
            Aujourd’hui :{" "}
            <span className="font-semibold text-[var(--text)]">
              {(drunk / 1000).toFixed(2)} L / {(targetMl / 1000).toFixed(2)} L
            </span>
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 active:scale-95"
              onClick={() => void addMl(journey.sipMl)}
            >
              + gorgée ({journey.sipMl} ml)
            </button>
            <button
              type="button"
              className="rounded-xl border border-border bg-[var(--surface)] px-4 py-2 text-sm hover:border-accent active:scale-95"
              onClick={() => void removeSip()}
            >
              − gorgée
            </button>
          </div>
          <p className="mt-2 text-xs text-muted">
            Objectif du jour : 35 ml/kg (min. 1,5 L — max. 4 L), selon votre profil et les options cochées.
          </p>
          <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-[var(--surface)]">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${pctDaily}%`,
                background:
                  pctDaily >= 100
                    ? "var(--green)"
                    : `linear-gradient(90deg, rgb(14 165 233), rgb(59 130 246))`,
              }}
            />
          </div>
          <div className="mt-1.5 flex flex-wrap items-center justify-between gap-1 text-xs text-muted">
            <span>{pctDaily}% de l&apos;objectif aujourd&apos;hui</span>
            {lastAt && (
              <span>
                Dernière prise{" "}
                {new Date(lastAt).toLocaleTimeString("fr-FR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            )}
          </div>
        </div>
        <BottleFill percent={pctDaily} className="shrink-0" />
      </div>

      {/* Guérison long terme (365 j) */}
      <div className="mx-5 mt-5 rounded-2xl border border-border bg-[var(--surface)] p-4">
        <div className="flex flex-col items-stretch gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">Guérison sur le long terme</p>
            <p className="mt-1 text-xs leading-relaxed text-muted">
              Indication prudente sur <strong>{DUREE_PIRE_CAS_JOURS} jours</strong> (pire cas). La guérison complète d’une
              déshydratation chronique sévère peut prendre <strong>6 à 12 mois</strong> ou plus — chaque personne est
              différente.
            </p>
            <p className="mt-2 text-sm">
              Guérison :{" "}
              <span className="font-bold tabular-nums" style={{ color: healingOver100 ? "rgb(217 119 6)" : "var(--accent)" }}>
                {displayHealing.toFixed(1)}%
              </span>{" "}
              <span className="text-muted">(sur 12 mois maximum)</span>
            </p>
            <div className="mt-2 h-3 overflow-hidden rounded-full bg-[var(--bg)]">
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{
                  width: `${Math.min(100, (displayHealing / 120) * 100)}%`,
                  background: healingOver100
                    ? "linear-gradient(90deg, rgb(251 191 36), rgb(245 158 11), rgb(217 119 6))"
                    : "linear-gradient(90deg, rgb(14 165 233), rgb(37 99 235))",
                }}
              />
            </div>
            {healingOver100 && (
              <p className="mt-2 text-sm font-medium text-amber-600 dark:text-amber-400">
                Guérison accomplie ! Vous avez dépassé vos objectifs — bravo !
              </p>
            )}
            <p className="mt-3 text-sm text-[var(--text)]">{healingEncouragementMessage(displayHealing)}</p>
            <p className="mt-2 text-xs italic text-muted">
              Ne vous comparez pas aux autres. Votre corps a son propre rythme. Certaines personnes voient des résultats à
              3 mois, d&apos;autres à 9 mois. L&apos;important est de continuer.
            </p>
            {severityNote(journey.symptomSeverity) && (
              <p className="mt-2 text-xs text-muted">{severityNote(journey.symptomSeverity)}</p>
            )}
          </div>
          <BodyHydrationVisual
            percent={bodyFillPercent}
            subtitle="guérison (indicatif)"
            className="shrink-0 self-center sm:self-start"
          />
        </div>
      </div>

      {settingsOpen && (
        <div className="mx-5 mt-4 space-y-3 rounded-2xl border border-dashed border-border bg-[var(--surface)] p-4 text-sm">
          <p className="font-medium">Réglages objectif &amp; parcours</p>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={journey.boostSport}
              onChange={(e) => void persistJourney({ ...journey, boostSport: e.target.checked })}
            />
            Activité sportive régulière (+0,5 L / jour)
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={journey.boostHeat}
              onChange={(e) => void persistJourney({ ...journey, boostHeat: e.target.checked })}
            />
            Période chaude / canicule (+0,5 L / jour)
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={journey.boostPregnancy}
              onChange={(e) => void persistJourney({ ...journey, boostPregnancy: e.target.checked })}
            />
            Grossesse ou allaitement (+0,5 L / jour)
          </label>
          <div>
            <span className="text-xs text-muted">Sévérité des symptômes (affichage, pas plus d&apos;eau forcée)</span>
            <select
              className="mt-1 w-full rounded-xl border border-border bg-[var(--bg)] px-3 py-2"
              value={journey.symptomSeverity}
              onChange={(e) =>
                void persistJourney({ ...journey, symptomSeverity: e.target.value as ChronicSymptomSeverity })
              }
            >
              <option value="leger">Légers</option>
              <option value="modere">Modérés</option>
              <option value="severe">Sévères</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-muted">Taille d&apos;une gorgée (ml)</label>
            <input
              type="number"
              min={25}
              max={500}
              step={25}
              className="mt-1 w-full rounded-xl border border-border bg-[var(--bg)] px-3 py-2"
              value={journey.sipMl}
              onChange={(e) => {
                const v = Math.round(Number(e.target.value));
                if (v >= 25 && v <= 500) void persistJourney({ ...journey, sipMl: v });
              }}
            />
          </div>
          <p className="text-xs text-muted">
            Rappels : selon les préférences de l&apos;application (notifications hydratation).
          </p>
          <button
            type="button"
            className="w-full rounded-xl border border-border py-2 text-sm hover:bg-[var(--bg)]"
            onClick={() => void resetJourneyOnly()}
          >
            Réinitialiser la jauge seulement (garder l’historique des boissons)
          </button>
          <button
            type="button"
            className="w-full rounded-xl border border-destructive/40 py-2 text-destructive hover:bg-destructive/10"
            onClick={() => void resetFullProgram()}
          >
            Tout effacer — même effet que « Nouveau programme »
          </button>
        </div>
      )}

      {/* Historique 7 j */}
      <div className="mx-5 mt-4">
        <p className="mb-2 text-xs font-medium text-muted">7 derniers jours</p>
        <div className="grid grid-cols-7 gap-1 text-center">
          {last7.map((d) => (
            <div key={d.iso} className="rounded-lg bg-[var(--surface)] px-0.5 py-2">
              <div className="text-[0.65rem] text-muted">
                {new Date(d.iso + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "narrow" })}
              </div>
              <div className="text-[0.65rem] font-medium">{d.ml > 0 ? `${Math.round(d.ml)}` : "—"}</div>
              <div className="relative mx-auto mt-1 h-9 w-2 rounded-full bg-[var(--bg)]">
                <div
                  className="absolute bottom-0 left-0 right-0 rounded-full bg-accent transition-all"
                  style={{ height: `${Math.min(100, d.pct)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quantités rapides */}
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

      <form onSubmit={handleCustom} className="flex items-center gap-2 px-5 pb-4 pt-3">
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

      <p className="border-t border-border px-5 py-3 text-[0.65rem] leading-relaxed text-muted">
        Optimisme prudent : taux plafonné à 120 % pour ne pas décourager les cas sévères tout en récompensant les progrès
        rapides. En cas de symptômes inquiétants, consultez un professionnel de santé.
      </p>
    </section>
  );
}
