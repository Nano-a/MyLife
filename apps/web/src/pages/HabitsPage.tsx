import { useLiveQuery } from "dexie-react-hooks";
import { useRef, useState } from "react";
import { db } from "../db";
import type { Habit, HabitCompletion } from "@mylife/core";
import { computeDayScore } from "@mylife/core";
import { todayISO } from "../lib/dateUtils";
import { habitsDueToday } from "../lib/habitsDue";
import { HydrationSection } from "../components/HydrationSection";
import { Modal } from "../components/Modal";
import { toast } from "../lib/toastStore";

type HabitTab = "aujourdhui" | "toutes" | "archives";

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
  const nomRef = useRef<HTMLInputElement>(null);

  const dow   = new Date().getDay();
  const active = habits.filter((h) => !h.archived);
  const archived = habits.filter((h) => h.archived);
  const due   = habitsDueToday(active, dow);
  const score = computeDayScore(habits, completions, date);
  const doneCnt = due.filter((h) =>
    completions.some((c) => c.id === `${h.id}_${date}` && c.fait)).length;

  /* ── Ajouter ── */
  async function addHabit(
    nom: string,
    icone: string,
    couleur: string,
    frequence: Habit["frequence"],
    jours?: number[],
    linkedObjectiveId?: string
  ) {
    const h: Habit = {
      id: crypto.randomUUID(),
      nom: nom.trim(),
      icone,
      couleur,
      type: "oui_non",
      frequence,
      joursSemaine: frequence === "jours_specifiques" ? jours : undefined,
      categorie: "perso",
      linkedObjectiveId: linkedObjectiveId || undefined,
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

  const displayedHabits = tab === "toutes" ? active : tab === "archives" ? archived : due;

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
      <div className="flex gap-1 rounded-xl elevated-surface p-1">
        {([["aujourdhui","Aujourd'hui"],["toutes","Toutes"],["archives","Archives"]] as [HabitTab,string][]).map(([t,l]) => (
          <button key={t} type="button" onClick={() => setTab(t)}
            className={["flex-1 rounded-lg py-1.5 text-sm font-medium transition-colors",
              tab === t ? "bg-accent text-white" : "text-muted hover:text-[var(--text)]"].join(" ")}>
            {l}
          </button>
        ))}
      </div>

      {/* Liste */}
      {displayedHabits.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center">
          <p className="text-2xl">✨</p>
          <p className="mt-2 text-sm text-muted">
            {tab === "archives" ? "Aucune habitude archivée." : "Aucune habitude — crée-en une avec le bouton +"}
          </p>
        </div>
      ) : (
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
                onEdit={() => setEditHabit(h)}
                onStats={() => setStatsHabit(h)}
                onArchive={() => void toggleArchive(h)}
                onDelete={() => void deleteHabit(h)}
              />
            );
          })}
        </ul>
      )}

      {/* Modals */}
      <AddHabitModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        nomRef={nomRef}
        objectives={objectives}
        onAdd={addHabit}
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
    </div>
  );
}

/* ═══════════ Ligne habitude ════════════════════════════════════════════ */
function HabitRow({
  habit, done, streak, showToggle, showArchived,
  onToggle, onEdit, onStats, onArchive, onDelete,
}: {
  habit: Habit; done: boolean; streak: number;
  showToggle: boolean; showArchived: boolean;
  onToggle: () => void; onEdit: () => void; onStats: () => void;
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

      <button type="button" onClick={onStats} className="flex-1 text-left">
        <p className={["font-medium leading-tight", done ? "text-muted line-through" : ""].join(" ")}>
          {habit.nom}
        </p>
        {streak > 0 && (
          <p className="text-xs text-muted">
            <span className="flame-icon inline-block">🔥</span> {streak} j
          </p>
        )}
      </button>

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
  onAdd: (
    nom: string,
    icone: string,
    couleur: string,
    frequence: Habit["frequence"],
    jours?: number[],
    linkedObjectiveId?: string
  ) => void;
}) {
  const [nom, setNom]         = useState("");
  const [icone, setIcone]     = useState("✅");
  const [couleur, setCouleur] = useState("#7c3aed");
  const [frequence, setFrequence] = useState<Habit["frequence"]>("quotidien");
  const [jours, setJours]     = useState<number[]>([1,2,3,4,5]);
  const [linkedObjectiveId, setLinkedObjectiveId] = useState("");

  const COULEURS = ["#7c3aed","#2563eb","#059669","#dc2626","#d97706","#db2777","#0891b2","#65a30d"];
  const JOURS_LABELS = ["D","L","M","M","J","V","S"];

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!nom.trim()) return;
    onAdd(nom, icone, couleur, frequence, jours, linkedObjectiveId || undefined);
    setNom(""); setIcone("✅"); setLinkedObjectiveId("");
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

        <div>
          <label className="text-xs text-muted">Lier à un objectif (optionnel)</label>
          <select
            className="mt-1 w-full rounded-xl border border-border bg-[var(--surface)] px-3 py-2"
            value={linkedObjectiveId}
            onChange={(e) => setLinkedObjectiveId(e.target.value)}
          >
            <option value="">— Aucun —</option>
            {objectives.map((o) => (
              <option key={o.id} value={o.id}>{o.titre}</option>
            ))}
          </select>
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
  const [nom, setNom]     = useState(habit.nom);
  const [icone, setIcone] = useState(habit.icone);
  const [couleur, setCouleur] = useState(habit.couleur);
  const [linkedObjectiveId, setLinkedObjectiveId] = useState(habit.linkedObjectiveId ?? "");
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
        <div>
          <label className="text-xs text-muted">Objectif lié</label>
          <select
            className="mt-1 w-full rounded-xl border border-border bg-[var(--surface)] px-3 py-2"
            value={linkedObjectiveId}
            onChange={(e) => setLinkedObjectiveId(e.target.value)}
          >
            <option value="">— Aucun —</option>
            {objectives.map((o) => (
              <option key={o.id} value={o.id}>{o.titre}</option>
            ))}
          </select>
        </div>
        <button type="button"
          onClick={() => {
            if (nom.trim()) {
              onSave({
                nom: nom.trim(),
                icone,
                couleur,
                linkedObjectiveId: linkedObjectiveId || undefined,
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
  const rate  = total > 0 ? Math.round((done / total) * 100) : 0;

  /* Heatmap 12 semaines (84 jours) */
  const today = new Date();
  const cells: { date: string; fait: boolean }[] = [];
  for (let i = 83; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const iso = d.toISOString().slice(0, 10);
    cells.push({ date: iso, fait: mine.some((c) => c.date === iso && c.fait) });
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

        {/* Heatmap 12 semaines */}
        <div>
          <p className="mb-2 text-sm font-medium">12 dernières semaines</p>
          <div className="grid gap-0.5" style={{ gridTemplateColumns: "repeat(12, 1fr)" }}>
            {cells.map(({ date, fait }) => (
              <div
                key={date}
                title={date}
                className="aspect-square rounded-sm transition-all"
                style={{ background: fait ? habit.couleur : "var(--border)" }}
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
