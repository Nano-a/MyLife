import { useLiveQuery } from "dexie-react-hooks";
import { useMemo, useRef, useState } from "react";
import { db } from "../db";
import type { Habit, HabitCompletion } from "@mylife/core";
import { computeDayScore } from "@mylife/core";
import { dateISOFromTimestamp, formatFrDate, todayISO } from "../lib/dateUtils";
import { buildHabitStackSeries } from "../lib/habitDiagram";
import { habitsDueToday } from "../lib/habitsDue";
import { HydrationSection } from "../components/HydrationSection";
import { HabitSkipModal } from "../components/HabitSkipModal";
import { Modal } from "../components/Modal";
import { toast } from "../lib/toastStore";

type HabitTab = "aujourdhui" | "toutes" | "archives" | "diagramme";

/* ═══════════════════════════════════════ Page principale ════════════════ */
export function HabitsPage() {
  const date   = todayISO();
  const habits = useLiveQuery(() => db.habits.toArray(), []) ?? [];
  const objectives = useLiveQuery(() => db.objectives.toArray(), []) ?? [];
  const completions = useLiveQuery(
    () => db.habitCompletions.where("date").equals(date).toArray(), [date]) ?? [];
  const allCompletions = useLiveQuery(() => db.habitCompletions.toArray(), []) ?? [];

  const [tab, setTab]         = useState<HabitTab>("aujourdhui");
  const [addOpen, setAddOpen] = useState(false);
  const [editHabit, setEditHabit] = useState<Habit | null>(null);
  const [statsHabit, setStatsHabit] = useState<Habit | null>(null);
  const [skipHabit, setSkipHabit] = useState<Habit | null>(null);
  const nomRef = useRef<HTMLInputElement>(null);

  const dow   = new Date().getDay();
  const active = habits.filter((h) => !h.archived);
  const archived = habits.filter((h) => h.archived);
  const due   = habitsDueToday(active, dow);
  const score = computeDayScore(habits, completions, date);
  const doneCnt = due.filter((h) =>
    completions.some((c) => c.id === `${h.id}_${date}` && c.fait)).length;

  /* ── Ajouter ── */
  async function addHabit(payload: {
    nom: string;
    icone: string;
    couleur: string;
    frequence: Habit["frequence"];
    jours?: number[];
    linkedObjectiveId?: string;
    linkedEventId?: string;
    rappelFenetreDebut: string;
    rappelFenetreFin: string;
    heureRappel: string;
    notifJusquaResolution: boolean;
  }) {
    const h: Habit = {
      id: crypto.randomUUID(),
      nom: payload.nom.trim(),
      icone: payload.icone,
      couleur: payload.couleur,
      type: "oui_non",
      frequence: payload.frequence,
      joursSemaine: payload.frequence === "jours_specifiques" ? payload.jours : undefined,
      categorie: "perso",
      linkedObjectiveId: payload.linkedObjectiveId || undefined,
      linkedEventId: payload.linkedEventId || undefined,
      rappelFenetreDebut: payload.rappelFenetreDebut,
      rappelFenetreFin: payload.rappelFenetreFin,
      heureRappel: payload.heureRappel,
      notifJusquaResolution: payload.notifJusquaResolution,
      createdAt: Date.now(),
    };
    await db.habits.add(h);
    toast.ok(`Habitude « ${h.nom} » ajoutée`);
    setAddOpen(false);
  }

  /* ── Modifier ── */
  async function saveEdit(patch: Partial<Habit>) {
    if (!editHabit) return;
    await db.habits.update(editHabit.id, patch);
    toast.ok("Habitude mise à jour");
    setEditHabit(null);
  }

  /* ── Archiver / désarchiver ── */
  async function toggleArchive(h: Habit) {
    await db.habits.update(h.id, { archived: !h.archived });
    toast.info(h.archived ? `« ${h.nom} » restaurée` : `« ${h.nom} » archivée`);
  }

  /* ── Supprimer définitivement ── */
  async function deleteHabit(h: Habit) {
    if (!confirm(`Supprimer définitivement « ${h.nom} » et tout son historique ?`)) return;
    await db.habits.delete(h.id);
    await db.habitCompletions.where("habitId").equals(h.id).delete();
    toast.info(`« ${h.nom} » supprimé`);
  }

  /* ── Toggler complétion ── */
  async function toggle(h: Habit) {
    const id  = `${h.id}_${date}`;
    const existing = await db.habitCompletions.get(id);
    const next = !existing?.fait;
    await db.habitCompletions.put({ id, habitId: h.id, date, fait: next });
    if (next) toast.ok(`${h.icone} ${h.nom} — fait !`);
  }

  const diagramSeries = useMemo(
    () => buildHabitStackSeries(habits, allCompletions, 21),
    [habits, allCompletions]
  );
  const maxDiagramDue = Math.max(...diagramSeries.map((d) => d.totalDue), 1);

  const displayedHabits = tab === "toutes" ? active : tab === "archives" ? archived : tab === "diagramme" ? [] : due;

  return (
    <div className="space-y-5">
      {/* Header */}
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Habitudes</h1>
          <p className="text-sm text-muted">
            {doneCnt}/{due.length} aujourd'hui · {active.length} habitude{active.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={() => { setAddOpen(true); setTimeout(() => nomRef.current?.focus(), 80); }}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-xl text-white shadow-lg shadow-accent/30 hover:opacity-90 active:scale-90"
          aria-label="Nouvelle habitude"
        >
          +
        </button>
      </header>

      <HydrationSection />

      {/* Score + anneau */}
      <div className="flex items-center gap-4 rounded-2xl elevated-surface p-4">
        <ScoreRing score={score} size={56} stroke={5} />
        <div>
          <p className="font-semibold">Score du jour</p>
          <p className="text-sm text-muted">{doneCnt} sur {due.length} habitudes complétées</p>
        </div>
      </div>

      {/* Onglets */}
      <div className="flex flex-wrap gap-1 rounded-xl elevated-surface p-1">
        {([["aujourdhui","Aujourd'hui"],["toutes","Toutes"],["diagramme","Diagramme"],["archives","Archives"]] as [HabitTab,string][]).map(([t,l]) => (
          <button key={t} type="button" onClick={() => setTab(t)}
            className={["min-w-0 flex-1 rounded-lg py-1.5 text-sm font-medium transition-colors",
              tab === t ? "bg-accent text-white" : "text-muted hover:text-[var(--text)]"].join(" ")}>
            {l}
          </button>
        ))}
      </div>

      {tab === "diagramme" && (
        <div className="space-y-4 rounded-2xl elevated-surface p-4">
          <div>
            <p className="font-semibold">Diagramme (21 jours)</p>
            <p className="mt-1 text-xs text-muted">
              Chaque colonne = habitudes prévues ce jour. Vert = fait · Orange = pas fait, motif légitime · Rouge = excuse · Gris = pas encore répondu.
            </p>
          </div>
          <div className="flex h-[200px] gap-1">
            {diagramSeries.map((day) => {
              const colH = day.totalDue > 0 ? (day.totalDue / maxDiagramDue) * 100 : 8;
              return (
                <div key={day.date} className="flex min-w-0 flex-1 h-full flex-col justify-end gap-1" title={formatFrDate(day.date)}>
                  <div
                    className="flex w-full min-h-[6px] flex-col overflow-hidden rounded-t bg-[var(--border)]"
                    style={{ height: `${Math.max(colH, 8)}%` }}
                  >
                    {day.totalDue === 0 ? null : (
                      <>
                        {day.excuse > 0 && (
                          <div className="min-h-[2px] w-full shrink-0 bg-red-600" style={{ flex: day.excuse }} />
                        )}
                        {day.legitime > 0 && (
                          <div className="min-h-[2px] w-full shrink-0 bg-amber-600" style={{ flex: day.legitime }} />
                        )}
                        {day.pending > 0 && (
                          <div className="min-h-[2px] w-full shrink-0 bg-zinc-500/40" style={{ flex: day.pending }} />
                        )}
                        {day.done > 0 && (
                          <div className="min-h-[2px] w-full shrink-0 bg-accent" style={{ flex: day.done }} />
                        )}
                      </>
                    )}
                  </div>
                  <span className="text-[0.55rem] text-muted leading-none">{day.date.slice(8)}</span>
                </div>
              );
            })}
          </div>
          <div className="flex flex-wrap gap-3 text-xs text-muted">
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-accent" /> Fait</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-zinc-500/50" /> En attente</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-amber-600" /> Légitime</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-red-600" /> Excuse</span>
          </div>
        </div>
      )}

      {/* Liste */}
      {tab !== "diagramme" && displayedHabits.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center">
          <p className="text-2xl">✨</p>
          <p className="mt-2 text-sm text-muted">
            {tab === "archives" ? "Aucune habitude archivée." : "Aucune habitude — crée-en une avec le bouton +"}
          </p>
        </div>
      ) : tab !== "diagramme" ? (
        <ul className="space-y-2">
          {displayedHabits.map((h) => {
            const cid  = `${h.id}_${date}`;
            const done = tab === "aujourdhui"
              ? completions.some((c) => c.id === cid && c.fait)
              : false;
            const streak = computeStreak(h, allCompletions, dow);
            return (
              <HabitRow
                key={h.id}
                habit={h}
                done={done}
                streak={streak}
                showToggle={tab === "aujourdhui"}
                showArchived={tab === "archives"}
                onToggle={() => void toggle(h)}
                onSkip={() => setSkipHabit(h)}
                onEdit={() => setEditHabit(h)}
                onStats={() => setStatsHabit(h)}
                onArchive={() => void toggleArchive(h)}
                onDelete={() => void deleteHabit(h)}
              />
            );
          })}
        </ul>
      ) : null}

      {/* Modals */}
      <AddHabitModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        nomRef={nomRef}
        objectives={objectives}
        onAdd={(p) => void addHabit(p)}
      />
      {editHabit && (
        <EditHabitModal
          key={editHabit.id}
          habit={editHabit}
          onClose={() => setEditHabit(null)}
          onSave={saveEdit}
        />
      )}
      {statsHabit && (
        <HabitStatsModal habit={statsHabit} completions={allCompletions} onClose={() => setStatsHabit(null)} />
      )}
      <HabitSkipModal habit={skipHabit} open={Boolean(skipHabit)} onClose={() => setSkipHabit(null)} />
    </div>
  );
}

/* ═══════════ Ligne habitude ════════════════════════════════════════════ */
function HabitRow({
  habit, done, streak, showToggle, showArchived,
  onToggle, onSkip, onEdit, onStats, onArchive, onDelete,
}: {
  habit: Habit; done: boolean; streak: number;
  showToggle: boolean; showArchived: boolean;
  onToggle: () => void; onSkip: () => void; onEdit: () => void; onStats: () => void;
  onArchive: () => void; onDelete: () => void;
}) {
  const [pop, setPop] = useState(false);

  function handleToggle() {
    if (!done) { setPop(true); setTimeout(() => setPop(false), 350); }
    onToggle();
  }

  return (
    <li
      className={["flex items-center gap-3 rounded-2xl border px-4 py-3 transition-colors",
        done ? "border-accent/30 bg-accent/5" : "border-border bg-elevated"].join(" ")}
      style={done ? {} : { borderLeftWidth: 3, borderLeftColor: habit.couleur }}
    >
      {showToggle && (
        <button type="button" onClick={handleToggle}
          aria-label={done ? "Décocher" : "Cocher"}
          className={["grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 transition-all",
            done ? "border-accent bg-accent text-white" : "border-border bg-[var(--surface)] text-transparent",
            pop ? "check-pop" : ""].join(" ")}
        >
          <svg viewBox="0 0 12 10" width="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="1,5 4.5,9 11,1" />
          </svg>
        </button>
      )}

      <span className="text-xl leading-none shrink-0" aria-hidden>{habit.icone}</span>

      <button type="button" onClick={onStats} className="flex-1 min-w-0 text-left">
        <p className={["font-medium leading-tight", done ? "text-muted line-through" : ""].join(" ")}>
          {habit.nom}
        </p>
        {habit.rappelFenetreDebut && habit.rappelFenetreFin && (
          <p className="text-[0.65rem] text-muted">
            Fenêtre {habit.rappelFenetreDebut}–{habit.rappelFenetreFin}
            {habit.notifJusquaResolution ? " · rappels insistants" : ""}
          </p>
        )}
        {streak > 0 && (
          <p className="text-xs text-muted">
            <span className="flame-icon inline-block">🔥</span> {streak} j
          </p>
        )}
      </button>

      {showToggle && !done && (
        <button
          type="button"
          onClick={onSkip}
          className="shrink-0 rounded-lg border border-border px-2 py-1 text-xs text-muted hover:border-amber-500/50 hover:text-[var(--text)]"
        >
          Pas fait
        </button>
      )}

      {/* Actions compactes */}
      <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity [li:hover_&]:opacity-100">
        {!showArchived && (
          <ActionBtn onClick={onEdit} label="Modifier" icon="✏️" />
        )}
        <ActionBtn onClick={onArchive} label={showArchived ? "Restaurer" : "Archiver"} icon={showArchived ? "↩" : "📦"} />
        {showArchived && (
          <ActionBtn onClick={onDelete} label="Supprimer" icon="🗑" danger />
        )}
      </div>
    </li>
  );
}

function ActionBtn({ onClick, label, icon, danger }: { onClick: () => void; label: string; icon: string; danger?: boolean }) {
  return (
    <button type="button" title={label} onClick={onClick}
      className={["grid h-7 w-7 place-items-center rounded-full text-sm",
        danger ? "text-muted hover:text-[var(--red)]" : "text-muted hover:text-[var(--text)]"].join(" ")}>
      {icon}
    </button>
  );
}

/* ═══════════ Modal ajouter ═══════════════════════════════════════════════ */
function AddHabitModal({
  open, onClose, nomRef, objectives,
  onAdd,
}: {
  open: boolean;
  onClose: () => void;
  nomRef: React.RefObject<HTMLInputElement | null>;
  objectives: { id: string; titre: string }[];
  onAdd: (payload: {
    nom: string;
    icone: string;
    couleur: string;
    frequence: Habit["frequence"];
    jours?: number[];
    linkedObjectiveId?: string;
    linkedEventId?: string;
    rappelFenetreDebut: string;
    rappelFenetreFin: string;
    heureRappel: string;
    notifJusquaResolution: boolean;
  }) => void;
}) {
  const events = useLiveQuery(() => db.events.orderBy("debut").reverse().limit(80).toArray(), []) ?? [];
  const [nom, setNom]         = useState("");
  const [icone, setIcone]     = useState("✅");
  const [couleur, setCouleur] = useState("#7c3aed");
  const [frequence, setFrequence] = useState<Habit["frequence"]>("quotidien");
  const [jours, setJours]     = useState<number[]>([1,2,3,4,5]);
  const [linkObj, setLinkObj] = useState(false);
  const [linkedObjectiveId, setLinkedObjectiveId] = useState("");
  const [linkAgenda, setLinkAgenda] = useState(false);
  const [linkedEventId, setLinkedEventId] = useState("");
  const [rappelFenetreDebut, setRappelFenetreDebut] = useState("08:00");
  const [rappelFenetreFin, setRappelFenetreFin] = useState("21:00");
  const [heureRappel, setHeureRappel] = useState("09:00");
  const [notifJusquaResolution, setNotifJusquaResolution] = useState(false);

  const COULEURS = ["#7c3aed","#2563eb","#059669","#dc2626","#d97706","#db2777","#0891b2","#65a30d"];
  const JOURS_LABELS = ["D","L","M","M","J","V","S"];

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!nom.trim()) return;
    onAdd({
      nom,
      icone,
      couleur,
      frequence,
      jours: frequence === "jours_specifiques" ? jours : undefined,
      linkedObjectiveId: linkObj ? linkedObjectiveId || undefined : undefined,
      linkedEventId: linkAgenda ? linkedEventId || undefined : undefined,
      rappelFenetreDebut,
      rappelFenetreFin,
      heureRappel,
      notifJusquaResolution,
    });
    setNom("");
    setIcone("✅");
    setLinkedObjectiveId("");
    setLinkedEventId("");
    setLinkObj(false);
    setLinkAgenda(false);
    setNotifJusquaResolution(false);
  }

  return (
    <Modal open={open} onClose={onClose} title="Nouvelle habitude">
      <form onSubmit={submit} className="space-y-4">
        <div className="flex gap-2">
          <input ref={nomRef}
            className="flex-1 rounded-xl border border-border bg-[var(--surface)] px-3 py-2.5 outline-none focus:border-accent"
            value={nom} onChange={(e) => setNom(e.target.value)}
            placeholder="Méditation, lecture, sport…"
          />
          <input className="w-14 rounded-xl border border-border bg-[var(--surface)] px-2 py-2.5 text-center text-xl"
            value={icone} onChange={(e) => setIcone(e.target.value)} aria-label="Icône" />
        </div>

        <div className="flex flex-wrap gap-2">
          {["📚","🏃","🧘","💊","🥦","✍️","🎸","🌿","🙏","💤","🧹","🚿","🧠","💧","🎯","🏋️"].map((em) => (
            <button key={em} type="button" onClick={() => setIcone(em)}
              className={`rounded-xl p-2 text-xl ${icone === em ? "bg-accent/20 ring-1 ring-accent" : "bg-[var(--surface)]"}`}>
              {em}
            </button>
          ))}
        </div>

        {/* Couleur */}
        <div>
          <p className="mb-2 text-xs text-muted">Couleur de l'indicateur</p>
          <div className="flex flex-wrap gap-2">
            {COULEURS.map((c) => (
              <button key={c} type="button" onClick={() => setCouleur(c)}
                className="h-7 w-7 rounded-full border-2 transition-transform hover:scale-110"
                style={{ background: c, borderColor: couleur === c ? "var(--text)" : "transparent" }} />
            ))}
          </div>
        </div>

        {/* Fréquence */}
        <div className="grid grid-cols-2 gap-2">
          {([["quotidien","Tous les jours"],["jours_specifiques","Jours spécifiques"]] as [Habit["frequence"],string][]).map(([f,l]) => (
            <button key={f} type="button" onClick={() => setFrequence(f)}
              className={["rounded-xl border py-2 text-sm", frequence === f ? "border-accent bg-accent/10 text-accent" : "border-border text-muted"].join(" ")}>
              {l}
            </button>
          ))}
        </div>

        {frequence === "jours_specifiques" && (
          <div className="flex justify-between gap-1">
            {JOURS_LABELS.map((l, i) => (
              <button key={i} type="button" onClick={() => setJours((prev) =>
                prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i])}
                className={["flex-1 rounded-lg py-2 text-sm font-medium",
                  jours.includes(i) ? "bg-accent text-white" : "bg-[var(--surface)] text-muted"].join(" ")}>
                {l}
              </button>
            ))}
          </div>
        )}

        <div className="rounded-xl border border-border bg-[var(--surface)] p-3 space-y-2">
          <p className="text-xs font-medium text-muted">Fenêtre du jour (faire l’habitude entre…)</p>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 text-sm">
              <span className="text-muted">De</span>
              <input
                type="time"
                value={rappelFenetreDebut}
                onChange={(e) => setRappelFenetreDebut(e.target.value)}
                className="rounded-lg border border-border bg-[var(--surface)] px-2 py-1.5"
              />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <span className="text-muted">à</span>
              <input
                type="time"
                value={rappelFenetreFin}
                onChange={(e) => setRappelFenetreFin(e.target.value)}
                className="rounded-lg border border-border bg-[var(--surface)] px-2 py-1.5"
              />
            </label>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <span className="text-muted">Premier rappel à</span>
            <input
              type="time"
              value={heureRappel}
              onChange={(e) => setHeureRappel(e.target.value)}
              className="rounded-lg border border-border bg-[var(--surface)] px-2 py-1.5"
            />
          </label>
          <label className="flex cursor-pointer items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={notifJusquaResolution}
              onChange={(e) => setNotifJusquaResolution(e.target.checked)}
              className="mt-1"
            />
            <span>
              Rappels insistants jusqu’à ce que j’ouvre l’app et que je réponde (fait / pas fait + motif).
              <span className="block text-xs text-muted">Le navigateur peut toujours fermer la notification ; un nouveau rappel est renvoyé tant que ce n’est pas réglé dans l’app.</span>
            </span>
          </label>
        </div>

        <div>
          <p className="text-xs text-muted mb-2">Cette tâche est-elle liée à un objectif ?</p>
          <div className="flex gap-2 mb-2">
            <button type="button" onClick={() => setLinkObj(true)}
              className={["flex-1 rounded-xl border py-2 text-sm", linkObj ? "border-accent bg-accent/10 text-accent" : "border-border text-muted"].join(" ")}>Oui</button>
            <button type="button" onClick={() => { setLinkObj(false); setLinkedObjectiveId(""); }}
              className={["flex-1 rounded-xl border py-2 text-sm", !linkObj ? "border-accent bg-accent/10 text-accent" : "border-border text-muted"].join(" ")}>Non</button>
          </div>
          {linkObj && (
            <select
              className="w-full rounded-xl border border-border bg-[var(--surface)] px-3 py-2"
              value={linkedObjectiveId}
              onChange={(e) => setLinkedObjectiveId(e.target.value)}
            >
              <option value="">— Choisir un objectif —</option>
              {objectives.map((o) => (
                <option key={o.id} value={o.id}>{o.titre}</option>
              ))}
            </select>
          )}
        </div>

        <div>
          <p className="text-xs text-muted mb-2">Est-elle liée à un événement d’agenda ?</p>
          <div className="flex gap-2 mb-2">
            <button type="button" onClick={() => setLinkAgenda(true)}
              className={["flex-1 rounded-xl border py-2 text-sm", linkAgenda ? "border-accent bg-accent/10 text-accent" : "border-border text-muted"].join(" ")}>Oui</button>
            <button type="button" onClick={() => { setLinkAgenda(false); setLinkedEventId(""); }}
              className={["flex-1 rounded-xl border py-2 text-sm", !linkAgenda ? "border-accent bg-accent/10 text-accent" : "border-border text-muted"].join(" ")}>Non</button>
          </div>
          {linkAgenda && (
            <select
              className="w-full rounded-xl border border-border bg-[var(--surface)] px-3 py-2 text-sm"
              value={linkedEventId}
              onChange={(e) => setLinkedEventId(e.target.value)}
            >
              <option value="">— Choisir un événement —</option>
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {formatFrDate(dateISOFromTimestamp(ev.debut))} · {ev.titre}
                </option>
              ))}
            </select>
          )}
        </div>

        <button type="submit" className="w-full rounded-xl bg-accent py-3 font-semibold text-white active:scale-95">
          Créer l'habitude
        </button>
      </form>
    </Modal>
  );
}

/* ═══════════ Modal modifier ══════════════════════════════════════════════ */
function EditHabitModal({
  habit, onClose, onSave,
}: { habit: Habit; onClose: () => void; onSave: (p: Partial<Habit>) => void }) {
  const objectives = useLiveQuery(() => db.objectives.toArray(), []) ?? [];
  const events = useLiveQuery(() => db.events.orderBy("debut").reverse().limit(80).toArray(), []) ?? [];
  const [nom, setNom]     = useState(habit.nom);
  const [icone, setIcone] = useState(habit.icone);
  const [couleur, setCouleur] = useState(habit.couleur);
  const [linkObj, setLinkObj] = useState(Boolean(habit.linkedObjectiveId));
  const [linkedObjectiveId, setLinkedObjectiveId] = useState(habit.linkedObjectiveId ?? "");
  const [linkAgenda, setLinkAgenda] = useState(Boolean(habit.linkedEventId));
  const [linkedEventId, setLinkedEventId] = useState(habit.linkedEventId ?? "");
  const [rappelFenetreDebut, setRappelFenetreDebut] = useState(habit.rappelFenetreDebut ?? "08:00");
  const [rappelFenetreFin, setRappelFenetreFin] = useState(habit.rappelFenetreFin ?? "21:00");
  const [heureRappel, setHeureRappel] = useState(habit.heureRappel ?? "09:00");
  const [notifJusquaResolution, setNotifJusquaResolution] = useState(Boolean(habit.notifJusquaResolution));
  const COULEURS = ["#7c3aed","#2563eb","#059669","#dc2626","#d97706","#db2777","#0891b2","#65a30d"];

  return (
    <Modal open onClose={onClose} title="Modifier l'habitude">
      <div className="space-y-4">
        <div className="flex gap-2">
          <input autoFocus
            className="flex-1 rounded-xl border border-border bg-[var(--surface)] px-3 py-2.5 outline-none focus:border-accent"
            value={nom} onChange={(e) => setNom(e.target.value)} />
          <input className="w-14 rounded-xl border border-border bg-[var(--surface)] px-2 py-2.5 text-center text-xl"
            value={icone} onChange={(e) => setIcone(e.target.value)} />
        </div>
        <div className="flex flex-wrap gap-2">
          {COULEURS.map((c) => (
            <button key={c} type="button" onClick={() => setCouleur(c)}
              className="h-7 w-7 rounded-full border-2 transition-transform hover:scale-110"
              style={{ background: c, borderColor: couleur === c ? "var(--text)" : "transparent" }} />
          ))}
        </div>

        <div className="rounded-xl border border-border bg-[var(--surface)] p-3 space-y-2">
          <p className="text-xs font-medium text-muted">Fenêtre du jour & rappels</p>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 text-sm">
              <span className="text-muted">De</span>
              <input type="time" value={rappelFenetreDebut} onChange={(e) => setRappelFenetreDebut(e.target.value)}
                className="rounded-lg border border-border bg-[var(--surface)] px-2 py-1.5" />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <span className="text-muted">à</span>
              <input type="time" value={rappelFenetreFin} onChange={(e) => setRappelFenetreFin(e.target.value)}
                className="rounded-lg border border-border bg-[var(--surface)] px-2 py-1.5" />
            </label>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <span className="text-muted">Premier rappel à</span>
            <input type="time" value={heureRappel} onChange={(e) => setHeureRappel(e.target.value)}
              className="rounded-lg border border-border bg-[var(--surface)] px-2 py-1.5" />
          </label>
          <label className="flex cursor-pointer items-start gap-2 text-sm">
            <input type="checkbox" checked={notifJusquaResolution} onChange={(e) => setNotifJusquaResolution(e.target.checked)} className="mt-1" />
            <span>Rappels insistants jusqu’à réponse dans l’app</span>
          </label>
        </div>

        <div>
          <p className="text-xs text-muted mb-2">Liée à un objectif ?</p>
          <div className="flex gap-2 mb-2">
            <button type="button" onClick={() => setLinkObj(true)}
              className={["flex-1 rounded-xl border py-2 text-sm", linkObj ? "border-accent bg-accent/10 text-accent" : "border-border text-muted"].join(" ")}>Oui</button>
            <button type="button" onClick={() => { setLinkObj(false); setLinkedObjectiveId(""); }}
              className={["flex-1 rounded-xl border py-2 text-sm", !linkObj ? "border-accent bg-accent/10 text-accent" : "border-border text-muted"].join(" ")}>Non</button>
          </div>
          {linkObj && (
            <select className="w-full rounded-xl border border-border bg-[var(--surface)] px-3 py-2"
              value={linkedObjectiveId} onChange={(e) => setLinkedObjectiveId(e.target.value)}>
              <option value="">— Choisir —</option>
              {objectives.map((o) => (
                <option key={o.id} value={o.id}>{o.titre}</option>
              ))}
            </select>
          )}
        </div>

        <div>
          <p className="text-xs text-muted mb-2">Liée à l’agenda ?</p>
          <div className="flex gap-2 mb-2">
            <button type="button" onClick={() => setLinkAgenda(true)}
              className={["flex-1 rounded-xl border py-2 text-sm", linkAgenda ? "border-accent bg-accent/10 text-accent" : "border-border text-muted"].join(" ")}>Oui</button>
            <button type="button" onClick={() => { setLinkAgenda(false); setLinkedEventId(""); }}
              className={["flex-1 rounded-xl border py-2 text-sm", !linkAgenda ? "border-accent bg-accent/10 text-accent" : "border-border text-muted"].join(" ")}>Non</button>
          </div>
          {linkAgenda && (
            <select className="w-full rounded-xl border border-border bg-[var(--surface)] px-3 py-2 text-sm"
              value={linkedEventId} onChange={(e) => setLinkedEventId(e.target.value)}>
              <option value="">— Choisir un événement —</option>
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {formatFrDate(dateISOFromTimestamp(ev.debut))} · {ev.titre}
                </option>
              ))}
            </select>
          )}
        </div>

        <button type="button"
          onClick={() => {
            if (nom.trim()) {
              onSave({
                nom: nom.trim(),
                icone,
                couleur,
                linkedObjectiveId: linkObj ? linkedObjectiveId || undefined : undefined,
                linkedEventId: linkAgenda ? linkedEventId || undefined : undefined,
                rappelFenetreDebut,
                rappelFenetreFin,
                heureRappel,
                notifJusquaResolution,
              });
            }
          }}
          className="w-full rounded-xl bg-accent py-3 font-semibold text-white active:scale-95">
          Enregistrer
        </button>
      </div>
    </Modal>
  );
}

/* ═══════════ Modal statistiques par habitude ═════════════════════════════ */
function HabitStatsModal({
  habit, completions, onClose,
}: { habit: Habit; completions: (HabitCompletion & { id: string })[]; onClose: () => void }) {
  const mine = completions.filter((c) => c.habitId === habit.id);
  const total = mine.length;
  const done  = mine.filter((c) => c.fait).length;
  const skipsLegit = mine.filter((c) => !c.fait && c.skipKind === "legitime").length;
  const skipsExcuse = mine.filter((c) => !c.fait && c.skipKind === "excuse").length;
  const rate  = total > 0 ? Math.round((done / total) * 100) : 0;

  /* Heatmap 12 semaines (84 jours) */
  const today = new Date();
  const cells: { date: string; tone: "fait" | "legitime" | "excuse" | "vide" }[] = [];
  for (let i = 83; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const iso = d.toISOString().slice(0, 10);
    const row = mine.find((c) => c.date === iso);
    let tone: "fait" | "legitime" | "excuse" | "vide" = "vide";
    if (row?.fait) tone = "fait";
    else if (row?.skipKind === "legitime") tone = "legitime";
    else if (row?.skipKind === "excuse") tone = "excuse";
    cells.push({ date: iso, tone });
  }

  /* Streak actuel */
  const streak = computeStreak(habit, completions, today.getDay());

  return (
    <Modal open onClose={onClose} title={`${habit.icone} ${habit.nom}`}>
      <div className="space-y-5">
        {/* KPIs */}
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl bg-[var(--surface)] p-3 text-center">
            <p className="text-2xl font-bold text-accent">{streak}</p>
            <p className="text-xs text-muted">Jours de suite</p>
          </div>
          <div className="rounded-xl bg-[var(--surface)] p-3 text-center">
            <p className="text-2xl font-bold">{rate}%</p>
            <p className="text-xs text-muted">Taux global</p>
          </div>
          <div className="rounded-xl bg-[var(--surface)] p-3 text-center">
            <p className="text-2xl font-bold">{done}</p>
            <p className="text-xs text-muted">Fois complété</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-amber-600/15 p-3 text-center">
            <p className="text-xl font-bold text-amber-600">{skipsLegit}</p>
            <p className="text-xs text-muted">Pas fait · légitime</p>
          </div>
          <div className="rounded-xl bg-red-600/15 p-3 text-center">
            <p className="text-xl font-bold text-red-600">{skipsExcuse}</p>
            <p className="text-xs text-muted">Pas fait · excuse</p>
          </div>
        </div>

        {/* Heatmap 12 semaines */}
        <div>
          <p className="mb-2 text-sm font-medium">12 dernières semaines</p>
          <div className="grid gap-0.5" style={{ gridTemplateColumns: "repeat(12, 1fr)" }}>
            {cells.map(({ date, tone }) => (
              <div
                key={date}
                title={date}
                className="aspect-square rounded-sm transition-all"
                style={{
                  background:
                    tone === "fait"
                      ? habit.couleur
                      : tone === "legitime"
                        ? "#d97706"
                        : tone === "excuse"
                          ? "#dc2626"
                          : "var(--border)",
                }}
              />
            ))}
          </div>
          <div className="mt-1 flex justify-between text-[0.6rem] text-muted">
            <span>−12 sem</span>
            <span>Aujourd'hui</span>
          </div>
        </div>
      </div>
    </Modal>
  );
}

/* ═══════════ Score ring ══════════════════════════════════════════════════ */
function ScoreRing({ score, size, stroke }: { score: number; size: number; stroke: number }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0 -rotate-90">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--border)" strokeWidth={stroke} />
      <circle cx={size/2} cy={size/2} r={r} fill="none"
        stroke="var(--accent)" strokeWidth={stroke} strokeLinecap="round"
        strokeDasharray={circ} strokeDashoffset={circ * (1 - score / 100)}
        className="ring-progress" />
    </svg>
  );
}

/* ═══════════ Calcul streak par habitude ═══════════════════════════════════ */
function computeStreak(
  habit: Habit,
  rows: (HabitCompletion & { id: string })[],
  _todayDow: number
): number {
  const byDate = new Map<string, boolean>();
  for (const r of rows) {
    if (r.habitId === habit.id && r.fait) byDate.set(r.date, true);
  }
  const d = new Date();
  let streak = 0;
  for (let i = 0; i < 400; i++) {
    const iso = d.toISOString().slice(0, 10);
    const dow = d.getDay();
    const due = habitsDueToday([habit], dow);
    if (due.length === 0) { d.setDate(d.getDate() - 1); continue; }
    if (!byDate.get(iso)) break;
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}
