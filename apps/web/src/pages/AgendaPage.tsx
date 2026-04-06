import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useMemo, useRef, useState } from "react";
import { db } from "../db";
import type { AgendaEvent, EventCategory, RecurrenceType } from "@mylife/core";
import { Modal } from "../components/Modal";
import { toast } from "../lib/toastStore";
import { buildPrintableAgendaHtml, downloadAgendaCsv, printAgendaWindow } from "../lib/agendaExport";
import {
  downloadAgendaPdf,
  downloadAgendaXlsx,
  type AgendaExportPeriod,
} from "../lib/exportReports";

type View = "jour" | "semaine" | "mois" | "annee";

const RAPPEL_SELECT: { value: string; label: string }[] = [
  { value: "", label: "Pas de rappel" },
  { value: "5", label: "5 min avant" },
  { value: "10", label: "10 min avant" },
  { value: "15", label: "15 min avant" },
  { value: "30", label: "30 min avant" },
  { value: "60", label: "1 h avant" },
  { value: "1440", label: "24 h avant" },
];

const CAT_COLOR: Record<EventCategory, string> = {
  cours: "#3b82f6", travail: "#8b5cf6", sport: "#22c55e",
  perso: "#f59e0b", priere: "#0ea5e9", autre: "#6b7280",
};
const RECURRENCE_LABELS: Partial<Record<RecurrenceType, string>> = {
  once: "Une fois", daily: "Tous les jours", weekly: "Toutes les semaines",
  monthly: "Tous les mois", yearly: "Tous les ans", weekdays: "Jours ouvrés", forever: "Toujours",
};

/* ── Génération occurrences répétées (simplifié) ── */
function expandEvent(base: AgendaEvent, windowStart: number, windowEnd: number): AgendaEvent[] {
  if (base.recurrence === "once") {
    if (base.debut < windowEnd && base.fin > windowStart) return [base];
    return [];
  }
  const results: AgendaEvent[] = [];
  const duration = base.fin - base.debut;
  let cursor = base.debut;
  const limit = base.recurrenceEnd ?? windowEnd;

  while (cursor < Math.min(limit, windowEnd)) {
    if (cursor + duration > windowStart) {
      results.push({ ...base, id: `${base.id}_${cursor}`, debut: cursor, fin: cursor + duration });
    }
    switch (base.recurrence) {
      case "daily": cursor += 86_400_000; break;
      case "weekly": cursor += 7 * 86_400_000; break;
      case "monthly": {
        const d = new Date(cursor);
        d.setMonth(d.getMonth() + 1);
        cursor = d.getTime();
        break;
      }
      case "yearly": {
        const d = new Date(cursor);
        d.setFullYear(d.getFullYear() + 1);
        cursor = d.getTime();
        break;
      }
      case "weekdays": {
        let next = new Date(cursor + 86_400_000);
        while (next.getDay() === 0 || next.getDay() === 6) next = new Date(next.getTime() + 86_400_000);
        cursor = next.getTime();
        break;
      }
      case "forever": cursor += 86_400_000; break;
      default: cursor = windowEnd; // stop
    }
    if (results.length > 500) break; // garde-fou
  }
  return results;
}

function getWindowBounds(view: View, refDate: Date): { start: number; end: number } {
  const y = refDate.getFullYear(), m = refDate.getMonth(), d = refDate.getDate();
  if (view === "jour") {
    const start = new Date(y, m, d, 0, 0, 0).getTime();
    return { start, end: start + 86_400_000 };
  }
  if (view === "semaine") {
    const dow = refDate.getDay();
    const start = new Date(y, m, d - dow, 0, 0, 0).getTime();
    return { start, end: start + 7 * 86_400_000 };
  }
  if (view === "mois") {
    const start = new Date(y, m, 1).getTime();
    const end   = new Date(y, m + 1, 1).getTime();
    return { start, end };
  }
  // année
  const start = new Date(y, 0, 1).getTime();
  const end   = new Date(y + 1, 0, 1).getTime();
  return { start, end };
}

/* ═══════════════════════════════════ Page ═══════════════════════════════ */
export function AgendaPage() {
  const [view, setView]   = useState<View>("semaine");
  const [refDate, setRef] = useState(() => new Date());
  const [addOpen, setAddOpen] = useState(false);
  const [editEvent, setEditEvent] = useState<AgendaEvent | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  const rawEvents = useLiveQuery(() => db.events.orderBy("debut").toArray(), []) ?? [];
  const { start, end } = useMemo(() => getWindowBounds(view, refDate), [view, refDate]);

  const monthExpandBounds = useMemo(() => {
    const y = refDate.getFullYear();
    const m = refDate.getMonth();
    return { mStart: new Date(y, m, 1).getTime(), mEnd: new Date(y, m + 1, 1).getTime() };
  }, [refDate]);

  /* Expansion récurrences */
  const events = useMemo(() =>
    rawEvents.flatMap((e) => expandEvent(e, start, end)), [rawEvents, start, end]);

  const monthExpandedEvents = useMemo(
    () => rawEvents.flatMap((e) => expandEvent(e, monthExpandBounds.mStart, monthExpandBounds.mEnd)),
    [rawEvents, monthExpandBounds.mStart, monthExpandBounds.mEnd]
  );

  const sortedEvents = useMemo(() =>
    [...events].sort((a, b) => a.debut - b.debut), [events]);

  function navigate(dir: -1 | 1) {
    const d = new Date(refDate);
    if (view === "jour") d.setDate(d.getDate() + dir);
    else if (view === "semaine") d.setDate(d.getDate() + dir * 7);
    else if (view === "mois") d.setMonth(d.getMonth() + dir);
    else d.setFullYear(d.getFullYear() + dir);
    setRef(d);
  }

  async function deleteEvent(e: AgendaEvent) {
    // Si id synthétique (récurrent), supprimer l'original
    const originalId = e.id.includes("_") ? e.id.split("_")[0]! : e.id;
    await db.events.delete(originalId);
    toast.info("Événement supprimé");
  }

  const headerLabel = useMemo(() => {
    if (view === "jour") return refDate.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    if (view === "semaine") {
      const endW = new Date(start + 6 * 86_400_000);
      return `${new Date(start).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} – ${endW.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}`;
    }
    if (view === "mois") return refDate.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
    return String(refDate.getFullYear());
  }, [view, refDate, start]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => navigate(-1)}
            className="grid h-8 w-8 place-items-center rounded-full elevated-surface hover:bg-[var(--elevated2)] active:scale-95">
            ‹
          </button>
          <h1 className="text-base font-semibold">{headerLabel}</h1>
          <button type="button" onClick={() => navigate(1)}
            className="grid h-8 w-8 place-items-center rounded-full elevated-surface hover:bg-[var(--elevated2)] active:scale-95">
            ›
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setRef(new Date())}
            className="rounded-xl elevated-surface px-3 py-1.5 text-sm text-muted hover:text-[var(--text)] active:scale-95">
            Aujourd'hui
          </button>
          <button
            type="button"
            onClick={() => downloadAgendaCsv(rawEvents, `mylife-agenda-${new Date().toISOString().slice(0, 10)}.csv`)}
            className="rounded-xl elevated-surface px-3 py-1.5 text-sm text-muted hover:text-[var(--text)] active:scale-95"
          >
            CSV
          </button>
          <button
            type="button"
            onClick={() => printAgendaWindow("Agenda MyLife", buildPrintableAgendaHtml(rawEvents))}
            className="rounded-xl elevated-surface px-3 py-1.5 text-sm text-muted hover:text-[var(--text)] active:scale-95"
          >
            Imprimer
          </button>
          <button
            type="button"
            onClick={() => setExportOpen(true)}
            className="rounded-xl elevated-surface px-3 py-1.5 text-sm text-muted hover:text-[var(--text)] active:scale-95"
          >
            PDF / Excel
          </button>
          <button
            type="button"
            onClick={() => { setAddOpen(true); setTimeout(() => titleRef.current?.focus(), 80); }}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-xl text-white shadow-lg shadow-accent/30 hover:opacity-90 active:scale-90"
            aria-label="Ajouter un événement"
          >
            +
          </button>
        </div>
      </header>

      {/* Sélecteur de vue */}
      <div className="flex gap-1 rounded-xl elevated-surface p-1">
        {(
          [
            ["jour", "jour"],
            ["semaine", "semaine"],
            ["mois", "mois"],
            ["annee", "année"],
          ] as [View, string][]
        ).map(([v, label]) => (
          <button key={v} type="button" onClick={() => setView(v)}
            className={["flex-1 rounded-lg py-1.5 text-sm font-medium capitalize",
              view === v ? "bg-accent text-white" : "text-muted hover:text-[var(--text)]"].join(" ")}>
            {label}
          </button>
        ))}
      </div>

      {/* ── Vue semaine ── */}
      {view === "semaine" && <WeekView events={sortedEvents} windowStart={start} onEdit={setEditEvent} />}

      {/* ── Vue jour ── */}
      {view === "jour" && (
        <DayView
          events={sortedEvents.filter((e) => {
            const midnight = new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate()).getTime();
            return e.debut < midnight + 86_400_000 && e.fin > midnight;
          })}
          onEdit={setEditEvent}
        />
      )}

      {/* ── Vue mois ── */}
      {view === "mois" && (
        <MonthView
          events={monthExpandedEvents}
          refDate={refDate}
          onDayClick={(d) => { setRef(d); setView("jour"); }}
        />
      )}

      {/* ── Vue année ── */}
      {view === "annee" && (
        <div className="space-y-4">
          <YearView
            year={refDate.getFullYear()}
            rawEvents={rawEvents}
            onPickMonth={(monthIndex) => {
              setRef(new Date(refDate.getFullYear(), monthIndex, 1));
              setView("mois");
            }}
          />
          {sortedEvents.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-8 text-center">
              <p className="text-2xl">📅</p>
              <p className="mt-2 text-sm text-muted">Aucun événement cette année</p>
            </div>
          ) : (
            <ul className="max-h-48 space-y-1 overflow-y-auto rounded-xl elevated-surface p-3 text-sm">
              {sortedEvents.slice(0, 80).map((e) => (
                <li key={e.id}>
                  <button type="button" className="w-full truncate rounded-lg px-2 py-1 text-left hover:bg-[var(--surface)]" onClick={() => setEditEvent(e)}>
                    <span className="text-muted">{new Date(e.debut).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}</span>{" "}
                    <span className="font-medium">{e.titre}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Liste compacte (toujours visible) */}
      {view !== "mois" && view !== "annee" && sortedEvents.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center">
          <p className="text-2xl">📅</p>
          <p className="mt-2 text-sm text-muted">Aucun événement sur cette période</p>
        </div>
      )}

      {/* Modals */}
      <AddEventModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        titleRef={titleRef}
      />
      {editEvent && (
        <EditEventModal
          event={rawEvents.find((e) => e.id === (editEvent.id.includes("_") ? editEvent.id.split("_")[0] : editEvent.id)) ?? editEvent}
          onClose={() => setEditEvent(null)}
          onDelete={() => { void deleteEvent(editEvent); setEditEvent(null); }}
        />
      )}

      <Modal open={exportOpen} onClose={() => setExportOpen(false)} title="Exporter l’agenda (PDF / Excel)">
        <AgendaExportPanel events={rawEvents} refDate={refDate} onClose={() => setExportOpen(false)} />
      </Modal>
    </div>
  );
}

function AgendaExportPanel({
  events,
  refDate,
  onClose,
}: {
  events: AgendaEvent[];
  refDate: Date;
  onClose: () => void;
}) {
  const [period, setPeriod] = useState<AgendaExportPeriod>("mois");

  function baseName() {
    return `mylife-agenda-${period}-${refDate.toISOString().slice(0, 10)}`;
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted">
        Choix de période (spec) : jour, semaine, mois, trimestre, semestre ou année — export PDF lisible ou tableur
        .xlsx.
      </p>
      <div>
        <label className="text-xs text-muted">Période</label>
        <select
          className="mt-1 w-full rounded-xl border border-border bg-[var(--surface)] px-3 py-2 text-sm"
          value={period}
          onChange={(e) => setPeriod(e.target.value as AgendaExportPeriod)}
        >
          <option value="jour">Jour</option>
          <option value="semaine">Semaine</option>
          <option value="mois">Mois</option>
          <option value="trimestre">Trimestre</option>
          <option value="semestre">Semestre</option>
          <option value="annee">Année</option>
        </select>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="flex-1 rounded-xl bg-accent py-2.5 text-sm font-semibold text-white active:scale-[0.99]"
          onClick={() => {
            downloadAgendaPdf(events, period, refDate, `${baseName()}.pdf`);
            toast.ok("PDF téléchargé");
            onClose();
          }}
        >
          Télécharger PDF
        </button>
        <button
          type="button"
          className="flex-1 rounded-xl border border-border py-2.5 text-sm font-medium active:scale-[0.99]"
          onClick={() => {
            downloadAgendaXlsx(events, period, refDate, `${baseName()}.xlsx`);
            toast.ok("Fichier Excel téléchargé");
            onClose();
          }}
        >
          Télécharger Excel
        </button>
      </div>
    </div>
  );
}

/* ═══════════ Vue année (aperçu par mois) ════════════════════════════════ */
function YearView({
  year,
  rawEvents,
  onPickMonth,
}: {
  year: number;
  rawEvents: AgendaEvent[];
  onPickMonth: (monthIndex: number) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
      {Array.from({ length: 12 }, (_, m) => {
        const mStart = new Date(year, m, 1).getTime();
        const mEnd = new Date(year, m + 1, 1).getTime();
        const count = rawEvents.reduce((acc, e) => acc + expandEvent(e, mStart, mEnd).length, 0);
        return (
          <button
            key={m}
            type="button"
            onClick={() => onPickMonth(m)}
            className="rounded-xl elevated-surface p-3 text-center transition-colors hover:border-accent"
          >
            <p className="text-xs capitalize text-muted">
              {new Date(year, m).toLocaleDateString("fr-FR", { month: "short" })}
            </p>
            <p className="text-xl font-bold">{count}</p>
            <p className="text-[0.65rem] text-muted">événements</p>
          </button>
        );
      })}
    </div>
  );
}

/* ═══════════ Vue semaine ════════════════════════════════════════════════ */
function WeekView({ events, windowStart, onEdit }: { events: AgendaEvent[]; windowStart: number; onEdit: (e: AgendaEvent) => void }) {
  const days = Array.from({ length: 7 }, (_, i) => new Date(windowStart + i * 86_400_000));
  const today = new Date().toDateString();

  return (
    <div className="grid grid-cols-7 gap-1 text-xs">
      {days.map((d, i) => {
        const dayEvents = events.filter((e) => {
          const ds = d.getTime();
          return e.debut < ds + 86_400_000 && e.fin > ds;
        });
        const isToday = d.toDateString() === today;
        return (
          <div key={i} className={["rounded-xl border p-1.5", isToday ? "border-accent/50 bg-accent/5" : "border-border bg-elevated"].join(" ")}>
            <p className={["text-center font-semibold", isToday ? "text-accent" : "text-muted"].join(" ")}>
              {d.toLocaleDateString("fr-FR", { weekday: "narrow" })}
            </p>
            <p className={["text-center text-base font-bold", isToday ? "text-accent" : ""].join(" ")}>
              {d.getDate()}
            </p>
            <div className="mt-1 space-y-0.5">
              {dayEvents.slice(0, 3).map((e) => (
                <button key={e.id} type="button" onClick={() => onEdit(e)}
                  className="block w-full truncate rounded px-1 py-0.5 text-left text-[0.6rem] text-white"
                  style={{ background: e.couleur }}>
                  {e.titre}
                </button>
              ))}
              {dayEvents.length > 3 && (
                <p className="text-center text-[0.6rem] text-muted">+{dayEvents.length - 3}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ═══════════ Vue jour ════════════════════════════════════════════════════ */
function DayView({ events, onEdit }: { events: AgendaEvent[]; onEdit: (e: AgendaEvent) => void }) {
  const now = Date.now();
  return (
    <ul className="space-y-2">
      {events.map((e) => {
        const inProgress = e.debut <= now && e.fin >= now;
        const pct = inProgress ? Math.round(((now - e.debut) / (e.fin - e.debut)) * 100) : 0;
        return (
          <li key={e.id} className="rounded-2xl border bg-elevated overflow-hidden"
            style={{ borderColor: inProgress ? e.couleur : "var(--border)" }}>
            {inProgress && (
              <div className="h-1 w-full bg-[var(--surface)]">
                <div className="h-full transition-all" style={{ width: `${pct}%`, background: e.couleur }} />
              </div>
            )}
            <button type="button" onClick={() => onEdit(e)} className="flex w-full items-start gap-3 p-4 text-left">
              <span className="mt-0.5 h-3 w-3 shrink-0 rounded-full" style={{ background: e.couleur }} />
              <div className="flex-1 min-w-0">
                <p className="font-semibold">{e.titre}</p>
                <p className="text-sm text-muted">
                  {e.journeeEntiere ? "Journée entière" :
                    `${new Date(e.debut).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })} → ${new Date(e.fin).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`}
                  {e.lieu && ` · 📍 ${e.lieu}`}
                </p>
                {inProgress && <p className="mt-0.5 text-xs font-medium" style={{ color: e.couleur }}>En cours · {pct}%</p>}
                {e.recurrence !== "once" && (
                  <p className="text-xs text-muted">🔄 {RECURRENCE_LABELS[e.recurrence] ?? e.recurrence}</p>
                )}
              </div>
              <span className="shrink-0 text-xs text-muted">{e.categorie}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/* ═══════════ Vue mois ════════════════════════════════════════════════════ */
function MonthView({ events, refDate, onDayClick }: { events: AgendaEvent[]; refDate: Date; onDayClick: (d: Date) => void }) {
  const y = refDate.getFullYear(), m = refDate.getMonth();
  const firstDay = new Date(y, m, 1).getDay();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const today = new Date();

  const eventsByDay = useMemo(() => {
    const map = new Map<number, AgendaEvent[]>();
    for (const e of events) {
      const d = new Date(e.debut).getDate();
      if (new Date(e.debut).getMonth() === m) {
        if (!map.has(d)) map.set(d, []);
        map.get(d)!.push(e);
      }
    }
    return map;
  }, [events, m]);

  const cells: (null | number)[] = [
    ...Array<null>(firstDay === 0 ? 6 : firstDay - 1).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div>
      <div className="mb-1 grid grid-cols-7 gap-1 text-center text-xs text-muted">
        {["L","M","M","J","V","S","D"].map((l, i) => <span key={i}>{l}</span>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (!day) return <div key={i} />;
          const evts = eventsByDay.get(day) ?? [];
          const isToday = today.getFullYear() === y && today.getMonth() === m && today.getDate() === day;
          return (
            <button key={i} type="button"
              onClick={() => onDayClick(new Date(y, m, day))}
              className={["aspect-square flex flex-col items-center justify-start rounded-xl border p-1 text-xs",
                isToday ? "border-accent bg-accent/10 font-bold text-accent" : "border-transparent hover:border-border"].join(" ")}>
              <span>{day}</span>
              <div className="mt-0.5 flex flex-wrap gap-0.5 justify-center">
                {evts.slice(0, 3).map((e) => (
                  <span key={e.id} className="h-1 w-1 rounded-full" style={{ background: e.couleur }} />
                ))}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════ Modal ajout événement ═══════════════════════════════════════ */
function AddEventModal({
  open, onClose, titleRef,
}: { open: boolean; onClose: () => void; titleRef: React.RefObject<HTMLInputElement | null> }) {
  const [titre, setTitre]         = useState("");
  const [categorie, setCategorie] = useState<EventCategory>("perso");
  const [debut, setDebut]         = useState("");
  const [fin, setFin]             = useState("");
  const [lieu, setLieu]           = useState("");
  const [desc, setDesc]           = useState("");
  const [couleur, setCouleur]     = useState("#7c3aed");
  const [recurrence, setRec]      = useState<RecurrenceType>("once");
  const [recEnd, setRecEnd]       = useState("");
  const [journee, setJournee]     = useState(false);
  const [persist, setPersist]     = useState(false);
  const [rappel, setRappel]       = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!titre.trim() || (!journee && (!debut || !fin))) return;
    const now = Date.now();
    const ev: AgendaEvent = {
      id: crypto.randomUUID(),
      titre: titre.trim(),
      description: desc.trim() || undefined,
      lieu: lieu.trim() || undefined,
      debut: journee ? new Date(debut || new Date().toISOString().slice(0, 10)).getTime() : new Date(debut).getTime(),
      fin: journee ? new Date(debut || new Date().toISOString().slice(0, 10)).getTime() + 86_399_000 : new Date(fin).getTime(),
      journeeEntiere: journee,
      couleur: couleur || CAT_COLOR[categorie],
      categorie,
      notificationPersistante: persist,
      rappelMinutes: rappel ? Number(rappel) : undefined,
      recurrence,
      recurrenceEnd: recEnd
        ? (() => {
            const x = new Date(recEnd + "T12:00:00");
            x.setHours(23, 59, 59, 999);
            return x.getTime();
          })()
        : undefined,
      createdAt: now,
    };
    await db.events.add(ev);
    toast.ok(`« ${ev.titre} » ajouté 📅`);
    setTitre(""); setDebut(""); setFin(""); setLieu(""); setDesc(""); setRec("once"); setRecEnd(""); setRappel("");
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Nouvel événement">
      <form onSubmit={submit} className="max-h-[70vh] space-y-3 overflow-y-auto pr-1">
        <input ref={titleRef}
          className="w-full rounded-xl border border-border bg-[var(--surface)] px-3 py-2.5 outline-none focus:border-accent"
          placeholder="Titre" value={titre} onChange={(e) => setTitre(e.target.value)} />

        {/* Catégorie */}
        <div className="flex flex-wrap gap-2">
          {(Object.keys(CAT_COLOR) as EventCategory[]).map((c) => (
            <button key={c} type="button" onClick={() => { setCategorie(c); setCouleur(CAT_COLOR[c]); }}
              className={["flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-sm capitalize",
                categorie === c ? "border-accent bg-accent/10 text-accent" : "border-border text-muted"].join(" ")}>
              {c}
            </button>
          ))}
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={journee} onChange={(e) => setJournee(e.target.checked)} />
          Journée entière
        </label>

        {journee ? (
          <input type="date"
            className="w-full rounded-xl border border-border bg-[var(--surface)] px-3 py-2"
            value={debut} onChange={(e) => setDebut(e.target.value)} />
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-muted">Début</label>
              <input type="datetime-local"
                className="mt-1 w-full rounded-xl border border-border bg-[var(--surface)] px-3 py-2"
                value={debut} onChange={(e) => setDebut(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-muted">Fin</label>
              <input type="datetime-local"
                className="mt-1 w-full rounded-xl border border-border bg-[var(--surface)] px-3 py-2"
                value={fin} onChange={(e) => setFin(e.target.value)} />
            </div>
          </div>
        )}

        <input
          className="w-full rounded-xl border border-border bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-accent"
          placeholder="Lieu (optionnel)" value={lieu} onChange={(e) => setLieu(e.target.value)} />
        <textarea rows={2}
          className="w-full resize-none rounded-xl border border-border bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-accent"
          placeholder="Description (optionnel)" value={desc} onChange={(e) => setDesc(e.target.value)} />

        <div>
          <label className="text-xs text-muted">Rappel avant le début</label>
          <select
            className="mt-1 w-full rounded-xl border border-border bg-[var(--surface)] px-3 py-2"
            value={rappel}
            onChange={(e) => setRappel(e.target.value)}
          >
            {RAPPEL_SELECT.map((o) => (
              <option key={o.value || "none"} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {/* Récurrence */}
        <div>
          <label className="text-xs text-muted">Répétition</label>
          <select
            className="mt-1 w-full rounded-xl border border-border bg-[var(--surface)] px-3 py-2"
            value={recurrence} onChange={(e) => setRec(e.target.value as RecurrenceType)}>
            {(Object.entries(RECURRENCE_LABELS) as [RecurrenceType, string][]).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
        {recurrence !== "once" && (
          <div>
            <label className="text-xs text-muted">Dernier jour inclus (optionnel)</label>
            <input type="date"
              className="mt-1 w-full rounded-xl border border-border bg-[var(--surface)] px-3 py-2"
              value={recEnd} onChange={(e) => setRecEnd(e.target.value)} />
            <p className="mt-1 text-xs text-muted">
              Ex. emploi du temps : « Toutes les semaines » puis la date du dernier cours avant les vacances — les répétitions s’arrêtent après ce jour.
            </p>
          </div>
        )}

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-sm text-muted">Couleur</label>
            <input type="color" value={couleur} onChange={(e) => setCouleur(e.target.value)}
              className="h-8 w-10 cursor-pointer rounded-lg border-0 bg-transparent p-0.5" />
          </div>
          <label className="flex flex-1 items-center gap-2 text-sm">
            <input type="checkbox" checked={persist} onChange={(e) => setPersist(e.target.checked)} />
            Notif. persistante
          </label>
        </div>

        <button type="submit" className="w-full rounded-xl bg-accent py-3 font-semibold text-white active:scale-95">
          Créer l'événement
        </button>
      </form>
    </Modal>
  );
}

function toDatetimeLocalValue(ms: number): string {
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

function toDateOnlyInput(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/* ═══════════ Modal édition événement ═════════════════════════════════════ */
function EditEventModal({
  event, onClose, onDelete,
}: { event: AgendaEvent; onClose: () => void; onDelete: () => void }) {
  const now = Date.now();
  const inProgress = event.debut <= now && event.fin >= now;
  const pct = inProgress ? Math.round(((now - event.debut) / (event.fin - event.debut)) * 100) : 0;

  const [titre, setTitre]         = useState(event.titre);
  const [categorie, setCategorie] = useState<EventCategory>(event.categorie);
  const [debut, setDebut]         = useState(
    event.journeeEntiere ? toDateOnlyInput(event.debut) : toDatetimeLocalValue(event.debut)
  );
  const [fin, setFin]             = useState(
    event.journeeEntiere ? "" : toDatetimeLocalValue(event.fin)
  );
  const [lieu, setLieu]           = useState(event.lieu ?? "");
  const [desc, setDesc]           = useState(event.description ?? "");
  const [couleur, setCouleur]     = useState(event.couleur);
  const [recurrence, setRec]      = useState<RecurrenceType>(event.recurrence);
  const [recEnd, setRecEnd]       = useState(
    event.recurrenceEnd != null ? toDateOnlyInput(event.recurrenceEnd) : ""
  );
  const [journee, setJournee]     = useState(event.journeeEntiere);
  const [persist, setPersist]     = useState(event.notificationPersistante ?? false);
  const [rappel, setRappel]       = useState(
    event.rappelMinutes != null && event.rappelMinutes > 0 ? String(event.rappelMinutes) : ""
  );

  useEffect(() => {
    setTitre(event.titre);
    setCategorie(event.categorie);
    setDebut(event.journeeEntiere ? toDateOnlyInput(event.debut) : toDatetimeLocalValue(event.debut));
    setFin(event.journeeEntiere ? "" : toDatetimeLocalValue(event.fin));
    setLieu(event.lieu ?? "");
    setDesc(event.description ?? "");
    setCouleur(event.couleur);
    setRec(event.recurrence);
    setRecEnd(event.recurrenceEnd != null ? toDateOnlyInput(event.recurrenceEnd) : "");
    setJournee(event.journeeEntiere);
    setPersist(event.notificationPersistante ?? false);
    setRappel(event.rappelMinutes != null && event.rappelMinutes > 0 ? String(event.rappelMinutes) : "");
  }, [event.id]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!titre.trim() || (!journee && (!debut || !fin))) return;
    const updated: AgendaEvent = {
      ...event,
      titre: titre.trim(),
      description: desc.trim() || undefined,
      lieu: lieu.trim() || undefined,
      debut: journee
        ? new Date(debut || new Date().toISOString().slice(0, 10)).getTime()
        : new Date(debut).getTime(),
      fin: journee
        ? new Date(debut || new Date().toISOString().slice(0, 10)).getTime() + 86_399_000
        : new Date(fin).getTime(),
      journeeEntiere: journee,
      couleur: couleur || CAT_COLOR[categorie],
      categorie,
      notificationPersistante: persist,
      rappelMinutes: rappel ? Number(rappel) : undefined,
      recurrence,
      recurrenceEnd: recEnd
        ? (() => {
            const x = new Date(recEnd + "T12:00:00");
            x.setHours(23, 59, 59, 999);
            return x.getTime();
          })()
        : undefined,
    };
    await db.events.put(updated);
    toast.ok("Événement mis à jour");
    onClose();
  }

  return (
    <Modal open onClose={onClose} title="Modifier l’événement">
      <form onSubmit={submit} className="max-h-[70vh] space-y-3 overflow-y-auto pr-1">
        {inProgress && (
          <div>
            <div className="h-2 overflow-hidden rounded-full bg-[var(--surface)]">
              <div className="h-full transition-all duration-1000" style={{ width: `${pct}%`, background: event.couleur }} />
            </div>
            <p className="mt-1 text-sm font-medium" style={{ color: event.couleur }}>
              En cours · {pct}% · fin prévue{" "}
              {new Date(event.fin).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>
        )}

        <input
          className="w-full rounded-xl border border-border bg-[var(--surface)] px-3 py-2.5 outline-none focus:border-accent"
          placeholder="Titre"
          value={titre}
          onChange={(e) => setTitre(e.target.value)}
        />

        <div className="flex flex-wrap gap-2">
          {(Object.keys(CAT_COLOR) as EventCategory[]).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => {
                setCategorie(c);
                setCouleur(CAT_COLOR[c]);
              }}
              className={[
                "flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-sm capitalize",
                categorie === c ? "border-accent bg-accent/10 text-accent" : "border-border text-muted",
              ].join(" ")}
            >
              {c}
            </button>
          ))}
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={journee} onChange={(e) => setJournee(e.target.checked)} />
          Journée entière
        </label>

        {journee ? (
          <input
            type="date"
            className="w-full rounded-xl border border-border bg-[var(--surface)] px-3 py-2"
            value={debut}
            onChange={(e) => setDebut(e.target.value)}
          />
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-muted">Début</label>
              <input
                type="datetime-local"
                className="mt-1 w-full rounded-xl border border-border bg-[var(--surface)] px-3 py-2"
                value={debut}
                onChange={(e) => setDebut(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-muted">Fin</label>
              <input
                type="datetime-local"
                className="mt-1 w-full rounded-xl border border-border bg-[var(--surface)] px-3 py-2"
                value={fin}
                onChange={(e) => setFin(e.target.value)}
              />
            </div>
          </div>
        )}

        <input
          className="w-full rounded-xl border border-border bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-accent"
          placeholder="Lieu (optionnel)"
          value={lieu}
          onChange={(e) => setLieu(e.target.value)}
        />
        <textarea
          rows={2}
          className="w-full resize-none rounded-xl border border-border bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-accent"
          placeholder="Description (optionnel)"
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
        />

        <div>
          <label className="text-xs text-muted">Rappel avant le début</label>
          <select
            className="mt-1 w-full rounded-xl border border-border bg-[var(--surface)] px-3 py-2"
            value={rappel}
            onChange={(e) => setRappel(e.target.value)}
          >
            {RAPPEL_SELECT.map((o) => (
              <option key={o.value || "none"} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs text-muted">Répétition</label>
          <select
            className="mt-1 w-full rounded-xl border border-border bg-[var(--surface)] px-3 py-2"
            value={recurrence}
            onChange={(e) => setRec(e.target.value as RecurrenceType)}
          >
            {(Object.entries(RECURRENCE_LABELS) as [RecurrenceType, string][]).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
        {recurrence !== "once" && (
          <div>
            <label className="text-xs text-muted">Dernier jour inclus (optionnel)</label>
            <input
              type="date"
              className="mt-1 w-full rounded-xl border border-border bg-[var(--surface)] px-3 py-2"
              value={recEnd}
              onChange={(e) => setRecEnd(e.target.value)}
            />
          </div>
        )}

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-sm text-muted">Couleur</label>
            <input
              type="color"
              value={couleur}
              onChange={(e) => setCouleur(e.target.value)}
              className="h-8 w-10 cursor-pointer rounded-lg border-0 bg-transparent p-0.5"
            />
          </div>
          <label className="flex flex-1 items-center gap-2 text-sm">
            <input type="checkbox" checked={persist} onChange={(e) => setPersist(e.target.checked)} />
            Notif. persistante
          </label>
        </div>

        <button type="submit" className="w-full rounded-xl bg-accent py-3 font-semibold text-white active:scale-95">
          Enregistrer
        </button>

        <button
          type="button"
          onClick={onDelete}
          className="w-full rounded-xl border border-[var(--red)]/30 py-2 text-sm text-[var(--red)] active:scale-95"
        >
          🗑 Supprimer cet événement
        </button>
      </form>
    </Modal>
  );
}
