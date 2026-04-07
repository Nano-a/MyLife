import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useMemo, useState } from "react";
import { BookMarked, ChevronLeft, ChevronRight, Printer } from "lucide-react";
import { useThemePrefs } from "../theme/ThemeProvider";
import { db } from "../db";
import { todayISO, formatFrDate, formatFrDateLong } from "../lib/dateUtils";
import {
  dayHasAnyRecord,
  eventsForLocalDay,
  financeTxForDay,
  habitLinesForDay,
  habitScoreForDay,
  isoFromYmd,
  monthDayMeta,
  sportSessionsForDay,
  yearSummary,
} from "../lib/dayJournal";
import { downloadDayJournalPdf, downloadMonthJournalPdf, downloadYearJournalPdf } from "../lib/journalPdfExport";
import { totalDrunkMl } from "@mylife/core";
import { toast } from "../lib/toastStore";

type Tab = "jour" | "mois" | "annee";

const MOIS_COURTS = ["janv", "fév", "mar", "avr", "mai", "juin", "juil", "août", "sep", "oct", "nov", "déc"];

function statusLabel(status: string): string {
  switch (status) {
    case "fait":
      return "Fait";
    case "quantite":
      return "Quantité";
    case "skip_legit":
      return "Non fait — légitime";
    case "skip_excuse":
      return "Non fait — excuse";
    default:
      return "Pas de saisie";
  }
}

export function DayJournalPage() {
  const { prefs } = useThemePrefs();
  const appName = prefs.appDisplayName || "MyLife";
  const [tab, setTab] = useState<Tab>("jour");
  const [dateISO, setDateISO] = useState(todayISO);
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [month, setMonth] = useState(() => new Date().getMonth() + 1);

  const habits = useLiveQuery(() => db.habits.toArray(), []) ?? [];
  const completions = useLiveQuery(() => db.habitCompletions.toArray(), []) ?? [];
  const events = useLiveQuery(() => db.events.toArray(), []) ?? [];
  const sportSessions = useLiveQuery(() => db.sportSessions.toArray(), []) ?? [];
  const txs = useLiveQuery(() => db.transactions.toArray(), []) ?? [];
  const moodRows = useLiveQuery(() => db.moodDays.toArray(), []) ?? [];
  const hydRows = useLiveQuery(() => db.hydrationDays.toArray(), []) ?? [];

  const moodByDate = useMemo(() => new Map(moodRows.map((r) => [r.date, r])), [moodRows]);
  const hydByDate = useMemo(() => new Map(hydRows.map((r) => [r.date, r])), [hydRows]);

  const mood = moodByDate.get(dateISO);
  const hyd = hydByDate.get(dateISO);
  const hLines = useMemo(
    () => habitLinesForDay(dateISO, habits, completions),
    [dateISO, habits, completions]
  );
  const score = useMemo(
    () => habitScoreForDay(dateISO, habits, completions),
    [dateISO, habits, completions]
  );
  const dayEvents = useMemo(() => eventsForLocalDay(dateISO, events), [dateISO, events]);
  const daySport = useMemo(() => sportSessionsForDay(dateISO, sportSessions), [dateISO, sportSessions]);
  const dayTx = useMemo(() => financeTxForDay(dateISO, txs), [dateISO, txs]);

  const hasData = dayHasAnyRecord(
    dateISO,
    habits,
    completions,
    mood,
    hyd,
    events,
    sportSessions,
    txs
  );

  const monthMeta = useMemo(
    () => monthDayMeta(year, month, habits, completions, moodByDate, hydByDate),
    [year, month, habits, completions, moodByDate, hydByDate]
  );

  const ySummary = useMemo(
    () => yearSummary(year, habits, completions, moodByDate, hydByDate),
    [year, habits, completions, moodByDate, hydByDate]
  );

  function printJournal() {
    document.documentElement.dataset.printJournal = "1";
    requestAnimationFrame(() => {
      window.print();
    });
  }

  useEffect(() => {
    const done = () => {
      delete document.documentElement.dataset.printJournal;
    };
    window.addEventListener("afterprint", done);
    return () => window.removeEventListener("afterprint", done);
  }, []);

  function shiftDay(delta: number) {
    const [y, m, d] = dateISO.split("-").map(Number);
    const dt = new Date(y, m - 1, d);
    dt.setDate(dt.getDate() + delta);
    const ny = dt.getFullYear();
    const nm = dt.getMonth() + 1;
    const nd = dt.getDate();
    setDateISO(isoFromYmd(ny, nm, nd));
  }

  const firstDowMonday0 = useMemo(() => {
    const first = new Date(year, month - 1, 1).getDay();
    return (first + 6) % 7;
  }, [year, month]);

  return (
    <div className="space-y-5 pb-6">
      <header className="flex items-start gap-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-accent/15 text-accent">
          <BookMarked className="h-6 w-6" aria-hidden />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Carnet de vie</h1>
          <p className="text-sm text-muted">
            Tout ce que tu enregistres (habitudes, humeur, eau, agenda, sport, finances) est relié à une date. Retrouve un
            jour précis, un mois ou une année, puis exporte en PDF.
          </p>
        </div>
      </header>

      <div className="no-print flex flex-wrap gap-1 rounded-xl elevated-surface p-1">
        {(
          [
            ["jour", "Jour"],
            ["mois", "Mois"],
            ["annee", "Année"],
          ] as [Tab, string][]
        ).map(([t, l]) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={[
              "flex-1 rounded-lg py-2 text-sm font-medium",
              tab === t ? "bg-accent text-white" : "text-muted hover:text-[var(--text)]",
            ].join(" ")}
          >
            {l}
          </button>
        ))}
      </div>

      {tab === "jour" && (
        <div className="no-print flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => shiftDay(-1)}
            className="rounded-xl border border-border p-2 hover:border-accent"
            aria-label="Jour précédent"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <input
            type="date"
            value={dateISO}
            onChange={(e) => e.target.value && setDateISO(e.target.value)}
            className="rounded-xl border border-border bg-[var(--surface)] px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={() => shiftDay(1)}
            className="rounded-xl border border-border p-2 hover:border-accent"
            aria-label="Jour suivant"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => setDateISO(todayISO())}
            className="rounded-xl border border-border px-3 py-2 text-sm text-muted hover:border-accent"
          >
            Aujourd’hui
          </button>
        </div>
      )}

      {tab === "mois" && (
        <div className="no-print flex flex-wrap items-center gap-3">
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="rounded-xl border border-border bg-[var(--surface)] px-3 py-2"
          >
            {MOIS_COURTS.map((label, i) => (
              <option key={label} value={i + 1}>
                {label}
              </option>
            ))}
          </select>
          <input
            type="number"
            min={2000}
            max={2100}
            value={year}
            onChange={(e) => setYear(Number(e.target.value) || year)}
            className="w-24 rounded-xl border border-border bg-[var(--surface)] px-3 py-2"
          />
        </div>
      )}

      {tab === "annee" && (
        <div className="no-print flex flex-wrap items-center gap-3">
          <label className="text-sm text-muted">Année</label>
          <input
            type="number"
            min={2000}
            max={2100}
            value={year}
            onChange={(e) => setYear(Number(e.target.value) || year)}
            className="w-28 rounded-xl border border-border bg-[var(--surface)] px-3 py-2"
          />
          <button
            type="button"
            className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white"
            onClick={() => {
              try {
                downloadYearJournalPdf(
                  year,
                  habits,
                  completions,
                  moodByDate,
                  hydByDate,
                  events,
                  sportSessions,
                  txs,
                  appName
                );
                toast.ok("PDF annuel généré");
              } catch {
                toast.info("Erreur lors de l’export PDF.");
              }
            }}
          >
            Télécharger l’année en PDF
          </button>
        </div>
      )}

      {tab === "mois" && (
        <div className="no-print">
          <button
            type="button"
            className="mb-3 rounded-xl border border-border px-4 py-2 text-sm font-medium hover:border-accent"
            onClick={() => {
              try {
                downloadMonthJournalPdf(
                  year,
                  month,
                  habits,
                  completions,
                  moodByDate,
                  hydByDate,
                  events,
                  sportSessions,
                  txs,
                  appName
                );
                toast.ok("PDF du mois généré");
              } catch {
                toast.info("Erreur PDF.");
              }
            }}
          >
            PDF de ce mois
          </button>
          <div className="grid grid-cols-7 gap-1 text-center text-[0.65rem] font-medium uppercase text-muted">
            <span>L</span>
            <span>M</span>
            <span>M</span>
            <span>J</span>
            <span>V</span>
            <span>S</span>
            <span>D</span>
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {Array.from({ length: firstDowMonday0 }).map((_, i) => (
              <div key={`e-${i}`} className="aspect-square rounded-lg bg-transparent" />
            ))}
            {monthMeta.map((cell) => (
              <button
                key={cell.date}
                type="button"
                onClick={() => {
                  setDateISO(cell.date);
                  setTab("jour");
                }}
                className={[
                  "aspect-square rounded-lg border text-xs font-medium transition-colors",
                  cell.hasData
                    ? "border-accent/50 bg-accent/15 text-[var(--text)]"
                    : "border-border bg-[var(--surface)] text-muted",
                  dateISO === cell.date ? "ring-2 ring-accent" : "",
                ].join(" ")}
                title={`${formatFrDate(cell.date)} · habitudes ${cell.score}%`}
              >
                <span className="block pt-1">{Number(cell.date.slice(8, 10))}</span>
                {cell.mood != null && <span className="text-[0.55rem] opacity-80">😊{cell.mood}</span>}
              </button>
            ))}
          </div>
        </div>
      )}

      {tab === "annee" && (
        <div className="no-print grid gap-2 sm:grid-cols-2">
          {ySummary.map((row) => (
            <button
              key={row.month}
              type="button"
              onClick={() => {
                setMonth(row.month);
                setTab("mois");
              }}
              className="rounded-xl border border-border bg-[var(--surface)] p-3 text-left text-sm hover:border-accent"
            >
              <p className="font-semibold capitalize">{MOIS_COURTS[row.month - 1]} {year}</p>
              <p className="mt-1 text-xs text-muted">
                {row.daysWithData} jour(s) avec données · score moy. {row.avgScoreWhenDue}% · {row.moodDays} humeur(s)
              </p>
            </button>
          ))}
        </div>
      )}

      <div className="no-print flex flex-wrap gap-2 border-t border-border pt-4">
        <button
          type="button"
          onClick={() => printJournal()}
          className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-medium hover:border-accent"
        >
          <Printer className="h-4 w-4" />
          Imprimer / PDF (navigateur)
        </button>
        <button
          type="button"
          onClick={() => {
            try {
              downloadDayJournalPdf(
                dateISO,
                habits,
                completions,
                mood,
                hyd,
                events,
                sportSessions,
                txs,
                appName
              );
              toast.ok("PDF du jour téléchargé");
            } catch {
              toast.info("Erreur PDF.");
            }
          }}
          className="rounded-xl border border-border px-4 py-2 text-sm font-medium hover:border-accent"
        >
          PDF du jour affiché
        </button>
      </div>

      {/* Zone imprimable + lecture */}
      <article
        id="carnet-print-area"
        className="space-y-6 rounded-2xl border border-border bg-[var(--surface)] p-4 sm:p-6"
      >
        <h2 className="text-lg font-bold border-b border-border pb-2">
          {tab === "jour" && formatFrDateLong(dateISO)}
          {tab === "mois" &&
            `${MOIS_COURTS[month - 1]?.replace(/^./, (c) => c.toUpperCase())} ${year} — vue mensuelle (clique un jour pour le détail)`}
          {tab === "annee" && `Année ${year} — synthèse`}
        </h2>

        {tab === "annee" && (
          <ul className="space-y-2 text-sm">
            {ySummary.map((row) => (
              <li key={row.month}>
                <strong className="capitalize">{MOIS_COURTS[row.month - 1]}</strong> : {row.daysWithData} jour(s) avec
                trace · score habitudes moyen {row.avgScoreWhenDue}% (sur jours avec habitudes prévues) · {row.moodDays}{" "}
                jour(s) d’humeur notée
              </li>
            ))}
          </ul>
        )}

        {tab === "mois" && (
          <p className="text-sm text-muted">
            Calendrier ci-dessus : les cases marquées contiennent au moins une donnée (habitude, humeur ou eau). Clique
            une date pour lire le détail dans l’onglet Jour.
          </p>
        )}

        {tab === "jour" && (
          <>
            {!hasData ? (
              <p className="text-sm text-muted">Aucune donnée enregistrée pour ce jour.</p>
            ) : (
              <>
                <section>
                  <h3 className="mb-2 text-sm font-semibold text-accent">Habitudes ({score}% ce jour)</h3>
                  {hLines.length === 0 ? (
                    <p className="text-sm text-muted">Aucune habitude prévue ce jour-là.</p>
                  ) : (
                    <ul className="space-y-2 text-sm">
                      {hLines.map((l) => (
                        <li key={l.habitId} className="rounded-lg border border-border/60 bg-[var(--elevated)] px-3 py-2">
                          <span className="font-medium">
                            {l.icone} {l.nom}
                          </span>
                          <span className="text-muted"> — {statusLabel(l.status)}</span>
                          {l.detail && <p className="mt-1 text-xs text-muted">{l.detail}</p>}
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                {(mood || (hyd && hyd.entries.length > 0)) && (
                  <section>
                    <h3 className="mb-2 text-sm font-semibold text-accent">Bien-être</h3>
                    {mood && (
                      <p className="text-sm">
                        Humeur : <strong>{mood.score}/5</strong>
                        {mood.note ? ` — ${mood.note}` : ""}
                      </p>
                    )}
                    {hyd && hyd.entries.length > 0 && (
                      <p className="mt-1 text-sm">
                        Eau : <strong>{(totalDrunkMl(hyd.entries) / 1000).toFixed(2)} L</strong> ({hyd.entries.length}{" "}
                        prises)
                      </p>
                    )}
                  </section>
                )}

                {dayEvents.length > 0 && (
                  <section>
                    <h3 className="mb-2 text-sm font-semibold text-accent">Agenda</h3>
                    <ul className="space-y-1 text-sm">
                      {dayEvents.map((e) => (
                        <li key={e.id}>
                          {new Date(e.debut).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })} —{" "}
                          <strong>{e.titre}</strong>
                          {e.lieu ? ` · ${e.lieu}` : ""}
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                {daySport.length > 0 && (
                  <section>
                    <h3 className="mb-2 text-sm font-semibold text-accent">Sport</h3>
                    <ul className="space-y-1 text-sm">
                      {daySport.map((s) => (
                        <li key={s.id}>
                          <strong>{s.libelle}</strong> — {Math.round((s.fin - s.debut) / 60000)} min · {s.intensite}
                          {s.notes ? ` · ${s.notes}` : ""}
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                {dayTx.length > 0 && (
                  <section>
                    <h3 className="mb-2 text-sm font-semibold text-accent">Finances</h3>
                    <ul className="space-y-1 text-sm">
                      {dayTx.map((t) => (
                        <li key={t.id}>
                          {t.type} · <strong>{t.montant} €</strong> — {t.categorie}
                          {t.commentaire ? ` (${t.commentaire})` : ""}
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
              </>
            )}
          </>
        )}
      </article>
    </div>
  );
}
