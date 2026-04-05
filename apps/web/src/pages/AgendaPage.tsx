import { useLiveQuery } from "dexie-react-hooks";
import { useMemo, useRef, useState } from "react";
import { db } from "../db";
import type { AgendaEvent, EventCategory, RecurrenceType } from "@mylife/core";
import { Modal } from "../components/Modal";
import { toast } from "../lib/toastStore";

type View = "jour" | "semaine" | "mois";

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
  // mois
  const start = new Date(y, m, 1).getTime();
  const end   = new Date(y, m + 1, 1).getTime();
  return { start, end };
}

/* ═══════════════════════════════════ Page ═══════════════════════════════ */
export function AgendaPage() {
  const [view, setView]   = useState<View>("semaine");
  const [refDate, setRef] = useState(() => new Date());
  const [addOpen, setAddOpen] = useState(false);
  const [editEvent, setEditEvent] = useState<AgendaEvent | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  const rawEvents = useLiveQuery(() => db.events.orderBy("debut").toArray(), []) ?? [];
  const { start, end } = useMemo(() => getWindowBounds(view, refDate), [view, refDate]);

  /* Expansion récurrences */
  const events = useMemo(() =>
    rawEvents.flatMap((e) => expandEvent(e, start, end)), [rawEvents, start, end]);

  const sortedEvents = useMemo(() =>
    [...events].sort((a, b) => a.debut - b.debut), [events]);

  function navigate(dir: -1 | 1) {
    const d = new Date(refDate);
    if (view === "jour")    d.setDate(d.getDate() + dir);
    if (view === "semaine") d.setDate(d.getDate() + dir * 7);
    if (view === "mois")    d.setMonth(d.getMonth() + dir);
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
    return refDate.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  }, [view, refDate, start]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => navigate(-1)}
            className="grid h-8 w-8 place-items-center rounded-full border border-border bg-elevated hover:bg-[var(--elevated2)] active:scale-95">
            ‹
          </button>
          <h1 className="text-base font-semibold">{headerLabel}</h1>
          <button type="button" onClick={() => navigate(1)}
            className="grid h-8 w-8 place-items-center rounded-full border border-border bg-elevated hover:bg-[var(--elevated2)] active:scale-95">
            ›
          </button>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => setRef(new Date())}
            className="rounded-xl border border-border bg-elevated px-3 py-1.5 text-sm text-muted hover:text-[var(--text)] active:scale-95">
            Aujourd'hui
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
      <div className="flex gap-1 rounded-xl border border-border bg-elevated p-1">
        {(["jour","semaine","mois"] as View[]).map((v) => (
          <button key={v} type="button" onClick={() => setView(v)}
            className={["flex-1 rounded-lg py-1.5 text-sm font-medium capitalize",
              view === v ? "bg-accent text-white" : "text-muted hover:text-[var(--text)]"].join(" ")}>
            {v}
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
      {view === "mois" && <MonthView events={rawEvents} refDate={refDate} onDayClick={(d) => { setRef(d); setView("jour"); }} />}

      {/* Liste compacte (toujours visible) */}
      {view !== "mois" && sortedEvents.length === 0 && (
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
      recurrence,
      recurrenceEnd: recEnd ? new Date(recEnd).getTime() : undefined,
      createdAt: now,
    };
    await db.events.add(ev);
    toast.ok(`« ${ev.titre} » ajouté 📅`);
    setTitre(""); setDebut(""); setFin(""); setLieu(""); setDesc(""); setRec("once"); setRecEnd("");
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
            <label className="text-xs text-muted">Fin de répétition (optionnel)</label>
            <input type="date"
              className="mt-1 w-full rounded-xl border border-border bg-[var(--surface)] px-3 py-2"
              value={recEnd} onChange={(e) => setRecEnd(e.target.value)} />
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

/* ═══════════ Modal édition événement ═════════════════════════════════════ */
function EditEventModal({
  event, onClose, onDelete,
}: { event: AgendaEvent; onClose: () => void; onDelete: () => void }) {
  const now = Date.now();
  const inProgress = event.debut <= now && event.fin >= now;
  const pct = inProgress ? Math.round(((now - event.debut) / (event.fin - event.debut)) * 100) : 0;

  return (
    <Modal open onClose={onClose} title={event.titre}>
      <div className="space-y-4">
        {/* Barre progression si en cours */}
        {inProgress && (
          <div>
            <div className="h-2 overflow-hidden rounded-full bg-[var(--surface)]">
              <div className="h-full transition-all duration-1000" style={{ width: `${pct}%`, background: event.couleur }} />
            </div>
            <p className="mt-1 text-sm font-medium" style={{ color: event.couleur }}>
              En cours · {pct}% · {new Date(event.fin).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })} fin prévue
            </p>
          </div>
        )}

        <div className="space-y-2 rounded-xl border border-border bg-[var(--surface)] p-3 text-sm">
          <p><span className="text-muted">Catégorie :</span> {event.categorie}</p>
          <p>
            <span className="text-muted">Horaire : </span>
            {event.journeeEntiere ? "Journée entière" :
              `${new Date(event.debut).toLocaleString("fr-FR", { weekday:"short", day:"numeric", month:"short", hour:"2-digit", minute:"2-digit" })} → ${new Date(event.fin).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`}
          </p>
          {event.lieu && <p><span className="text-muted">Lieu :</span> 📍 {event.lieu}</p>}
          {event.description && <p className="text-muted">{event.description}</p>}
          {event.recurrence !== "once" && (
            <p><span className="text-muted">Répétition :</span> 🔄 {RECURRENCE_LABELS[event.recurrence]}</p>
          )}
        </div>

        <button type="button" onClick={onDelete}
          className="w-full rounded-xl border border-[var(--red)]/30 py-2 text-sm text-[var(--red)] active:scale-95">
          🗑 Supprimer cet événement
        </button>
      </div>
    </Modal>
  );
}
