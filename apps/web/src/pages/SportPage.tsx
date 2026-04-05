import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useMemo, useRef, useState } from "react";
import { db, getProfile } from "../db";
import type { Intensity, SportSession, SportTemplate, SportType, UserProfile } from "@mylife/core";
import { estimatedRecoveryHoursFull, recoveryPercentSinceSessionEnd } from "@mylife/core";
import { Modal } from "../components/Modal";
import { toast } from "../lib/toastStore";

type SportTab = "historique" | "templates" | "stats";

const TYPE_EMOJI: Record<SportType, string> = {
  cardio: "🏃", musculation: "🏋️", combat: "🥋", manuel: "⚡",
};
const INTENS_COLOR: Record<Intensity, string> = {
  faible: "text-green-400 bg-green-400/10",
  moderee: "text-amber-400 bg-amber-400/10",
  intense: "text-red-400 bg-red-400/10",
};

/* ═══════════════════════════════════ Page ═══════════════════════════════ */
export function SportPage() {
  const sessions  = useLiveQuery(() => db.sportSessions.orderBy("debut").reverse().toArray(), []) ?? [];
  const templates = useLiveQuery(() => db.sportTemplates.orderBy("createdAt").reverse().toArray(), []) ?? [];
  const [profile, setProfile]     = useState<UserProfile | null>(null);
  const [tab, setTab]             = useState<SportTab>("historique");
  const [addOpen, setAddOpen]     = useState(false);
  const [tplOpen, setTplOpen]     = useState(false);
  const [startFrom, setStartFrom] = useState<SportTemplate | null>(null);
  const labelRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void getProfile().then(setProfile);
  }, []);

  /* Stats */
  const totalMinutes = useMemo(() =>
    sessions.reduce((s, x) => s + (x.fin - x.debut) / 60_000, 0), [sessions]);
  const thisWeek = useMemo(() => {
    const since = Date.now() - 7 * 86_400_000;
    return sessions.filter((s) => s.debut >= since);
  }, [sessions]);
  const byType = useMemo(() => {
    const m = new Map<SportType, number>();
    for (const s of sessions) m.set(s.type, (m.get(s.type) ?? 0) + 1);
    return m;
  }, [sessions]);

  /* Récupération dernière séance */
  const last = sessions[0];
  const recoveryH   = last && profile
    ? estimatedRecoveryHoursFull(profile, last.intensite, (last.fin - last.debut) / 60_000)
    : 0;
  const recoveryPct = last ? recoveryPercentSinceSessionEnd(last.fin, recoveryH) : 100;

  async function deleteSession(id: string) {
    await db.sportSessions.delete(id);
    toast.info("Séance supprimée");
  }

  async function deleteTemplate(id: string) {
    if (!confirm("Supprimer ce template ?")) return;
    await db.sportTemplates.delete(id);
    toast.info("Template supprimé");
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Sport</h1>
          <p className="text-sm text-muted">
            {sessions.length} séance{sessions.length !== 1 ? "s" : ""} · {Math.round(totalMinutes / 60)} h au total
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => setTplOpen(true)}
            className="rounded-xl border border-border bg-elevated px-3 py-2 text-sm text-muted hover:text-[var(--text)] active:scale-95">
            📋 Template
          </button>
          <button type="button"
            onClick={() => { setStartFrom(null); setAddOpen(true); setTimeout(() => labelRef.current?.focus(), 80); }}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-xl text-white shadow-lg shadow-accent/30 hover:opacity-90 active:scale-90"
            aria-label="Nouvelle séance">
            +
          </button>
        </div>
      </header>

      {/* Récupération */}
      {last && (
        <RecoveryCard session={last} pct={recoveryPct} hours={recoveryH} />
      )}

      {/* Onglets */}
      <div className="flex gap-1 rounded-xl border border-border bg-elevated p-1">
        {([["historique","Historique"],["templates","Templates"],["stats","Stats"]] as [SportTab,string][]).map(([t,l]) => (
          <button key={t} type="button" onClick={() => setTab(t)}
            className={["flex-1 rounded-lg py-1.5 text-sm font-medium",
              tab === t ? "bg-accent text-white" : "text-muted hover:text-[var(--text)]"].join(" ")}>
            {l}
          </button>
        ))}
      </div>

      {/* ── Historique ── */}
      {tab === "historique" && (
        sessions.length === 0 ? (
          <EmptyState icon="💪" msg="Aucune séance — enregistre ta première activité" />
        ) : (
          <ul className="space-y-2">
            {sessions.map((s) => (
              <SessionRow key={s.id} session={s} onDelete={() => void deleteSession(s.id)} />
            ))}
          </ul>
        )
      )}

      {/* ── Templates ── */}
      {tab === "templates" && (
        <div className="space-y-3">
          {templates.length === 0 ? (
            <EmptyState icon="📋" msg="Crée des templates pour démarrer une séance en 2 taps" />
          ) : (
            <ul className="space-y-2">
              {templates.map((t) => (
                <li key={t.id} className="flex items-center gap-3 rounded-2xl border border-border bg-elevated p-4">
                  <span className="text-2xl">{t.icone}</span>
                  <div className="flex-1">
                    <p className="font-semibold">{t.nom}</p>
                    <p className="text-sm text-muted">
                      {TYPE_EMOJI[t.type]} {t.type} · {t.dureeMinutes} min · {t.intensite}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button type="button"
                      onClick={() => { setStartFrom(t); setAddOpen(true); setTimeout(() => labelRef.current?.focus(), 80); }}
                      className="rounded-xl bg-accent px-3 py-1.5 text-sm text-white active:scale-95">
                      ▶ Démarrer
                    </button>
                    <button type="button" onClick={() => void deleteTemplate(t.id)}
                      className="rounded-xl border border-border px-2 py-1.5 text-muted hover:text-[var(--red)]">✕</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* ── Stats ── */}
      {tab === "stats" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="Séances total"  value={String(sessions.length)} />
            <StatCard label="Cette semaine"  value={String(thisWeek.length)} />
            <StatCard label="Heures total"   value={`${Math.round(totalMinutes / 60)} h`} />
            <StatCard label="Moy. par séance" value={sessions.length > 0 ? `${Math.round(totalMinutes / sessions.length)} min` : "—"} />
          </div>

          {/* Répartition par type */}
          <div className="rounded-2xl border border-border bg-elevated p-4">
            <p className="mb-3 font-medium">Par type d'activité</p>
            <div className="space-y-2">
              {([...byType.entries()]).map(([type, count]) => {
                const pct = sessions.length > 0 ? Math.round((count / sessions.length) * 100) : 0;
                return (
                  <div key={type}>
                    <div className="flex justify-between text-sm mb-1">
                      <span>{TYPE_EMOJI[type]} {type}</span>
                      <span className="text-muted">{count} ({pct}%)</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-[var(--surface)]">
                      <div className="h-full rounded-full bg-accent transition-all duration-700" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Fréquence 8 semaines */}
          <WeeklyChart sessions={sessions} />
        </div>
      )}

      {/* Modals */}
      <AddSessionModal
        open={addOpen}
        onClose={() => { setAddOpen(false); setStartFrom(null); }}
        template={startFrom}
        labelRef={labelRef}
      />
      <AddTemplateModal open={tplOpen} onClose={() => setTplOpen(false)} />
    </div>
  );
}

/* ═══════════ Récupération ═══════════════════════════════════════════════ */
function RecoveryCard({ session, pct, hours }: { session: SportSession; pct: number; hours: number }) {
  return (
    <div className="rounded-2xl border border-border bg-elevated p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="font-semibold">{session.libelle}</p>
          <p className="text-sm text-muted">
            {new Date(session.fin).toLocaleString("fr-FR", { weekday: "short", day: "numeric", month: "short" })}
            {" · "}{Math.round((session.fin - session.debut) / 60_000)} min
          </p>
        </div>
        <div className="relative h-14 w-14 shrink-0">
          <svg viewBox="0 0 56 56" className="h-full w-full -rotate-90">
            <circle cx={28} cy={28} r={22} fill="none" stroke="var(--border)" strokeWidth={5} />
            <circle cx={28} cy={28} r={22} fill="none"
              stroke={pct >= 100 ? "var(--green)" : "var(--accent)"}
              strokeWidth={5} strokeLinecap="round"
              strokeDasharray={`${138.2 * pct / 100} 138.2`}
              className="ring-progress" />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-sm font-bold">{pct}%</span>
        </div>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--surface)]">
        <div className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: pct >= 100 ? "var(--green)" : "var(--accent)" }} />
      </div>
      <p className="mt-1.5 text-xs text-muted">
        {pct >= 100 ? "✅ Récupération complète" : `~${hours.toFixed(1)} h pour récupération totale (indicatif)`}
      </p>
    </div>
  );
}

/* ═══════════ Ligne séance ════════════════════════════════════════════════ */
function SessionRow({ session, onDelete }: { session: SportSession; onDelete: () => void }) {
  return (
    <li className="flex items-center gap-3 rounded-xl border border-border bg-elevated px-4 py-3">
      <span className="text-2xl shrink-0">{TYPE_EMOJI[session.type]}</span>
      <div className="flex-1 min-w-0">
        <p className="truncate font-medium">{session.libelle}</p>
        <p className="text-sm text-muted">
          {new Date(session.debut).toLocaleString("fr-FR", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
          {" · "}{Math.round((session.fin - session.debut) / 60_000)} min
        </p>
      </div>
      <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${INTENS_COLOR[session.intensite]}`}>
        {session.intensite === "moderee" ? "Modérée" : session.intensite.charAt(0).toUpperCase() + session.intensite.slice(1)}
      </span>
      <button type="button" onClick={onDelete}
        className="rounded-full p-1 text-muted opacity-0 hover:text-[var(--red)] [li:hover_&]:opacity-100">✕</button>
    </li>
  );
}

/* ═══════════ Graphe hebdomadaire ════════════════════════════════════════ */
function WeeklyChart({ sessions }: { sessions: SportSession[] }) {
  const weeks = useMemo(() => {
    const data: { label: string; count: number }[] = [];
    for (let w = 7; w >= 0; w--) {
      const start = Date.now() - (w + 1) * 7 * 86_400_000;
      const end   = Date.now() - w * 7 * 86_400_000;
      const count = sessions.filter((s) => s.debut >= start && s.debut < end).length;
      const d = new Date(end);
      data.push({ label: `S${d.getMonth() + 1}/${d.getDate()}`, count });
    }
    return data;
  }, [sessions]);

  const maxCount = Math.max(...weeks.map((w) => w.count), 1);

  return (
    <div className="rounded-2xl border border-border bg-elevated p-4">
      <p className="mb-3 font-medium">Séances / semaine (8 sem)</p>
      <div className="flex h-28 items-end gap-2">
        {weeks.map(({ label, count }) => (
          <div key={label} className="flex flex-1 flex-col items-center gap-1">
            <div className="flex h-24 w-full items-end justify-center">
              <div className="w-full rounded-t-lg bg-accent/70 transition-all"
                style={{ height: `${(count / maxCount) * 100}%`, minHeight: count > 0 ? 4 : 0 }} />
            </div>
            <span className="text-[0.6rem] text-muted">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════ Stat card ══════════════════════════════════════════════════ */
function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-elevated p-3 text-center">
      <p className="text-xl font-bold">{value}</p>
      <p className="text-xs text-muted">{label}</p>
    </div>
  );
}

/* ═══════════ Empty state ════════════════════════════════════════════════ */
function EmptyState({ icon, msg }: { icon: string; msg: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border p-8 text-center">
      <p className="text-3xl">{icon}</p>
      <p className="mt-2 text-sm text-muted">{msg}</p>
    </div>
  );
}

/* ═══════════ Modal séance ════════════════════════════════════════════════ */
function AddSessionModal({
  open, onClose, template, labelRef,
}: {
  open: boolean;
  onClose: () => void;
  template: SportTemplate | null;
  labelRef: React.RefObject<HTMLInputElement | null>;
}) {
  const [libelle, setLibelle]     = useState(template?.nom ?? "");
  const [type, setType]           = useState<SportType>(template?.type ?? "cardio");
  const [intensite, setIntensite] = useState<Intensity>(template?.intensite ?? "moderee");
  const [dureeMin, setDureeMin]   = useState(template?.dureeMinutes ?? 45);
  const [notes, setNotes]         = useState("");

  useEffect(() => {
    if (template) {
      setLibelle(template.nom);
      setType(template.type);
      setIntensite(template.intensite);
      setDureeMin(template.dureeMinutes);
    }
  }, [template]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const now = Date.now();
    const s: SportSession = {
      id: crypto.randomUUID(),
      type, libelle: libelle.trim() || "Séance",
      debut: now - dureeMin * 60_000,
      fin: now, intensite,
      notes: notes.trim() || undefined,
      templateId: template?.id,
      createdAt: now,
    };
    await db.sportSessions.add(s);
    toast.ok(`Séance « ${s.libelle} » enregistrée 💪`);
    setNotes(""); onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={template ? `▶ ${template.nom}` : "Nouvelle séance"}>
      <form onSubmit={submit} className="space-y-4">
        <input ref={labelRef}
          className="w-full rounded-xl border border-border bg-[var(--surface)] px-3 py-2.5 outline-none focus:border-accent"
          placeholder="Nom de la séance" value={libelle} onChange={(e) => setLibelle(e.target.value)} />

        <div className="grid grid-cols-4 gap-2">
          {(["cardio","musculation","combat","manuel"] as SportType[]).map((t) => (
            <button key={t} type="button" onClick={() => setType(t)}
              className={["flex flex-col items-center gap-1 rounded-xl border py-3 text-sm",
                type === t ? "border-accent bg-accent/10 text-accent" : "border-border bg-[var(--surface)] text-muted"].join(" ")}>
              <span className="text-xl">{TYPE_EMOJI[t]}</span>
              <span className="text-[0.65rem] capitalize">{t}</span>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-2">
          {(["faible","moderee","intense"] as Intensity[]).map((iv) => (
            <button key={iv} type="button" onClick={() => setIntensite(iv)}
              className={["rounded-xl border py-2 text-sm",
                intensite === iv
                  ? iv === "intense" ? "border-red-500 bg-red-500/10 text-red-400"
                    : iv === "moderee" ? "border-amber-400 bg-amber-400/10 text-amber-400"
                    : "border-green-500 bg-green-500/10 text-green-400"
                  : "border-border bg-[var(--surface)] text-muted"].join(" ")}>
              {iv === "moderee" ? "Modérée" : iv.charAt(0).toUpperCase() + iv.slice(1)}
            </button>
          ))}
        </div>

        <div>
          <div className="mb-1 flex justify-between">
            <label className="text-sm text-muted">Durée</label>
            <span className="font-semibold">{dureeMin} min</span>
          </div>
          <input type="range" min={5} max={240} step={5} value={dureeMin}
            onChange={(e) => setDureeMin(Number(e.target.value))}
            className="w-full accent-[var(--accent)]" />
          <div className="mt-1 flex justify-between text-xs text-muted">
            <span>5 min</span><span>4 h</span>
          </div>
        </div>

        <textarea rows={2} className="w-full resize-none rounded-xl border border-border bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-accent"
          placeholder="Notes (optionnel)" value={notes} onChange={(e) => setNotes(e.target.value)} />

        <button type="submit" className="w-full rounded-xl bg-accent py-3 font-semibold text-white active:scale-95">
          Enregistrer la séance
        </button>
      </form>
    </Modal>
  );
}

/* ═══════════ Modal template ══════════════════════════════════════════════ */
function AddTemplateModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [nom, setNom]             = useState("");
  const [type, setType]           = useState<SportType>("cardio");
  const [intensite, setIntensite] = useState<Intensity>("moderee");
  const [duree, setDuree]         = useState(45);
  const [icone, setIcone]         = useState("🏋️");
  const [description, setDesc]    = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!nom.trim()) return;
    const t: SportTemplate = {
      id: crypto.randomUUID(),
      nom: nom.trim(),
      type, intensite,
      dureeMinutes: duree,
      icone,
      description: description.trim() || undefined,
      createdAt: Date.now(),
    };
    await db.sportTemplates.add(t);
    toast.ok(`Template « ${t.nom} » créé`);
    setNom(""); setDesc(""); onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Nouveau template">
      <form onSubmit={submit} className="space-y-4">
        <div className="flex gap-2">
          <input autoFocus
            className="flex-1 rounded-xl border border-border bg-[var(--surface)] px-3 py-2.5 outline-none focus:border-accent"
            placeholder="Nom du template" value={nom} onChange={(e) => setNom(e.target.value)} />
          <input className="w-14 rounded-xl border border-border bg-[var(--surface)] px-2 py-2.5 text-center text-xl"
            value={icone} onChange={(e) => setIcone(e.target.value)} />
        </div>
        <div className="flex flex-wrap gap-2">
          {["🏋️","🏃","🚴","🏊","🥋","🤸","⚽","🎾","🧘","💪","🔥","⚡"].map((em) => (
            <button key={em} type="button" onClick={() => setIcone(em)}
              className={`rounded-xl p-2 text-xl ${icone === em ? "bg-accent/20 ring-1 ring-accent" : "bg-[var(--surface)]"}`}>
              {em}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-4 gap-1">
          {(["cardio","musculation","combat","manuel"] as SportType[]).map((t) => (
            <button key={t} type="button" onClick={() => setType(t)}
              className={["flex flex-col items-center gap-1 rounded-xl border py-2 text-xs",
                type === t ? "border-accent bg-accent/10 text-accent" : "border-border text-muted"].join(" ")}>
              {TYPE_EMOJI[t]}<span className="capitalize">{t}</span>
            </button>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-2">
          {(["faible","moderee","intense"] as Intensity[]).map((iv) => (
            <button key={iv} type="button" onClick={() => setIntensite(iv)}
              className={["rounded-xl border py-2 text-sm",
                intensite === iv
                  ? iv === "intense" ? "border-red-500 bg-red-500/10 text-red-400"
                    : iv === "moderee" ? "border-amber-400 bg-amber-400/10 text-amber-400"
                    : "border-green-500 bg-green-500/10 text-green-400"
                  : "border-border text-muted"].join(" ")}>
            {iv === "moderee" ? "Modérée" : iv.charAt(0).toUpperCase() + iv.slice(1)}
            </button>
          ))}
        </div>
        <div>
          <div className="mb-1 flex justify-between">
            <label className="text-sm text-muted">Durée par défaut</label>
            <span className="font-semibold">{duree} min</span>
          </div>
          <input type="range" min={5} max={180} step={5} value={duree}
            onChange={(e) => setDuree(Number(e.target.value))} className="w-full accent-[var(--accent)]" />
        </div>
        <textarea rows={2}
          className="w-full resize-none rounded-xl border border-border bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-accent"
          placeholder="Description (optionnel)" value={description} onChange={(e) => setDesc(e.target.value)} />
        <button type="submit" className="w-full rounded-xl bg-accent py-3 font-semibold text-white active:scale-95">
          Créer le template
        </button>
      </form>
    </Modal>
  );
}
