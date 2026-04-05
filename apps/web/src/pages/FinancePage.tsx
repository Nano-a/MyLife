import { useLiveQuery } from "dexie-react-hooks";
import { useMemo, useRef, useState } from "react";
import { db } from "../db";
import type { FinanceBudget, FinanceTransaction, FinanceTxType } from "@mylife/core";
import { Modal } from "../components/Modal";
import { toast } from "../lib/toastStore";

/* ─── Constantes ───────────────────────────────────────────────────────── */
const CAT_DEPENSE  = ["alimentation","loisirs","transport","abonnement","soin","vêtements","logement","autre"];
const CAT_REVENU   = ["salaire","freelance","vente","cadeau","investissement","autre"];
const EMOJI_TYPE: Record<FinanceTxType, string> = {
  depense: "💸", revenu: "💰", abonnement: "🔄", gain: "📈", epargne: "🏦",
};
const BUDGET_COLORS = ["#7c3aed","#2563eb","#059669","#dc2626","#d97706","#db2777","#0891b2","#65a30d","#ea580c"];

type Tab = "transactions" | "budgets" | "abonnements";

/* ─── Page principale ──────────────────────────────────────────────────── */
export function FinancePage() {
  const txs   = useLiveQuery(() => db.transactions.orderBy("date").reverse().toArray(), []) ?? [];
  const snaps = useLiveQuery(() => db.balanceSnapshots.orderBy("date").reverse().toArray(), []) ?? [];
  const buds  = useLiveQuery(() => db.budgets.toArray(), []) ?? [];

  const [tab, setTab]       = useState<Tab>("transactions");
  const [addTxOpen, setAddTxOpen]     = useState(false);
  const [addBudOpen, setAddBudOpen]   = useState(false);
  const [soldeOpen, setSoldeOpen]     = useState(false);
  const [filterCat, setFilterCat]     = useState("");
  const [filterType, setFilterType]   = useState<FinanceTxType | "">("");
  const montantRef = useRef<HTMLInputElement>(null);

  const currentMonth = new Date().toISOString().slice(0, 7);

  const soldeReel       = snaps[0]?.solde ?? null;
  const txsThisMonth    = txs.filter((t) => t.date.startsWith(currentMonth));
  const depMois         = txsThisMonth.reduce((s, t) => s + (t.type === "depense" || t.type === "abonnement" ? t.montant : 0), 0);
  const revMois         = txsThisMonth.reduce((s, t) => s + (t.type === "revenu" || t.type === "gain" ? t.montant : 0), 0);
  const superfluSum     = useMemo(() =>
    txs.reduce((s, t) => s + (t.type === "depense" && t.superflue ? t.montant : 0), 0), [txs]);
  const soldeSansSuperflu = soldeReel != null ? soldeReel + superfluSum : null;

  /* Budget usage ce mois */
  const budgetUsage = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of txsThisMonth) {
      if (t.type === "depense") map.set(t.categorie, (map.get(t.categorie) ?? 0) + t.montant);
    }
    return map;
  }, [txsThisMonth]);

  /* Graphe 6 mois */
  const byMonth = useMemo(() => {
    const m = new Map<string, { dep: number; rev: number }>();
    for (const t of txs) {
      const key = t.date.slice(0, 7);
      const cur = m.get(key) ?? { dep: 0, rev: 0 };
      if (t.type === "depense" || t.type === "abonnement") cur.dep += t.montant;
      if (t.type === "revenu" || t.type === "gain") cur.rev += t.montant;
      m.set(key, cur);
    }
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0])).slice(-6);
  }, [txs]);

  /* Abonnements */
  const abonnements = txs.filter((t) => t.type === "abonnement");
  const abonMensuel = abonnements.reduce((s, t) => {
    const mois = t.frequenceMois ?? 1;
    return s + t.montant / mois;
  }, 0);
  const abonAnnuel = abonMensuel * 12;

  /* Filtres transactions */
  const filtered = useMemo(() => {
    let list = txs;
    if (filterCat) list = list.filter((t) => t.categorie === filterCat);
    if (filterType) list = list.filter((t) => t.type === filterType);
    return list;
  }, [txs, filterCat, filterType]);

  async function deleteTransaction(id: string) {
    await db.transactions.delete(id);
    toast.info("Transaction supprimée");
  }

  async function deleteBudget(id: string) {
    if (!confirm("Supprimer ce budget ?")) return;
    await db.budgets.delete(id);
    toast.info("Budget supprimé");
  }

  return (
    <div className="space-y-5">
      {/* En-tête */}
      <header className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Finances</h1>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setSoldeOpen(true)}
            className="rounded-xl border border-border bg-elevated px-3 py-2 text-sm text-muted hover:text-[var(--text)] active:scale-95"
          >
            Solde
          </button>
          <button
            type="button"
            onClick={() => { setAddTxOpen(true); setTimeout(() => montantRef.current?.focus(), 80); }}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-xl text-white shadow-lg shadow-accent/30 hover:opacity-90 active:scale-90"
            aria-label="Nouvelle transaction"
          >
            +
          </button>
        </div>
      </header>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard label="Solde relevé"    value={soldeReel != null ? `${soldeReel.toLocaleString("fr-FR")} €` : "—"} />
        <KpiCard label="Sans superflus"  value={soldeSansSuperflu != null ? `${soldeSansSuperflu.toLocaleString("fr-FR")} €` : "—"} color="var(--green)" />
        <KpiCard label="Dépenses / mois" value={`${depMois.toLocaleString("fr-FR")} €`} color="var(--red)" />
        <KpiCard label="Revenus / mois"  value={`${revMois.toLocaleString("fr-FR")} €`} color="var(--green)" />
      </div>

      {/* Graphe */}
      {byMonth.length > 0 && (
        <div className="rounded-2xl border border-border bg-elevated p-4">
          <p className="mb-3 text-sm font-semibold">6 derniers mois</p>
          <div className="flex h-28 items-end gap-1">
            {byMonth.map(([mois, v]) => {
              const maxV = Math.max(...byMonth.map(([, x]) => Math.max(x.dep, x.rev)), 1);
              return (
                <div key={mois} className="flex flex-1 flex-col items-center gap-1">
                  <div className="flex h-24 w-full items-end justify-center gap-0.5">
                    <div className="w-3 rounded-t-sm bg-red-400/70 transition-all" style={{ height: `${(v.dep/maxV)*100}%` }} title={`Dépenses ${v.dep} €`} />
                    <div className="w-3 rounded-t-sm bg-emerald-400/70 transition-all" style={{ height: `${(v.rev/maxV)*100}%` }} title={`Revenus ${v.rev} €`} />
                  </div>
                  <span className="text-[0.6rem] text-muted">{mois.slice(5)}</span>
                </div>
              );
            })}
          </div>
          <div className="mt-2 flex gap-4 text-xs text-muted">
            <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-sm bg-red-400/70" />Dépenses</span>
            <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-sm bg-emerald-400/70" />Revenus</span>
          </div>
        </div>
      )}

      {/* Onglets */}
      <div className="flex gap-1 rounded-xl border border-border bg-elevated p-1">
        {([["transactions","Transactions"],["budgets","Budgets"],["abonnements","Abonnements"]] as [Tab,string][]).map(([t,l]) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={["flex-1 rounded-lg py-1.5 text-sm font-medium transition-colors",
              tab === t ? "bg-accent text-white" : "text-muted hover:text-[var(--text)]"].join(" ")}
          >
            {l}
          </button>
        ))}
      </div>

      {/* ── Onglet Transactions ── */}
      {tab === "transactions" && (
        <div className="space-y-3">
          {/* Filtres */}
          <div className="flex flex-wrap gap-2">
            <select
              className="rounded-xl border border-border bg-elevated px-3 py-1.5 text-sm"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as FinanceTxType | "")}
            >
              <option value="">Tous types</option>
              {(["depense","revenu","abonnement","gain","epargne"] as FinanceTxType[]).map((t) => (
                <option key={t} value={t}>{EMOJI_TYPE[t]} {t}</option>
              ))}
            </select>
            <select
              className="rounded-xl border border-border bg-elevated px-3 py-1.5 text-sm"
              value={filterCat}
              onChange={(e) => setFilterCat(e.target.value)}
            >
              <option value="">Toutes catégories</option>
              {[...CAT_DEPENSE, ...CAT_REVENU].map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            {(filterCat || filterType) && (
              <button type="button" onClick={() => { setFilterCat(""); setFilterType(""); }}
                className="rounded-xl border border-border px-3 py-1.5 text-sm text-muted">
                Réinitialiser
              </button>
            )}
          </div>

          {filtered.length === 0 ? (
            <EmptyState icon="💸" msg="Aucune transaction" />
          ) : (
            <ul className="space-y-2">
              {filtered.map((t) => (
                <TxRow key={t.id} tx={t} onDelete={() => void deleteTransaction(t.id)} />
              ))}
            </ul>
          )}
        </div>
      )}

      {/* ── Onglet Budgets ── */}
      {tab === "budgets" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setAddBudOpen(true)}
              className="flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white active:scale-95"
            >
              + Nouveau budget
            </button>
          </div>
          {buds.length === 0 ? (
            <EmptyState icon="🎯" msg="Définis des budgets par catégorie pour suivre tes dépenses" />
          ) : (
            <ul className="space-y-3">
              {buds.map((b) => {
                const spent = budgetUsage.get(b.categorie) ?? 0;
                const pct   = b.plafondMensuel > 0 ? Math.min(100, Math.round((spent / b.plafondMensuel) * 100)) : 0;
                const over  = spent > b.plafondMensuel;
                return (
                  <li key={b.id} className="rounded-2xl border border-border bg-elevated p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded-full" style={{ background: b.couleur }} />
                        <span className="font-medium capitalize">{b.categorie}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-semibold ${over ? "text-[var(--red)]" : ""}`}>
                          {spent.toLocaleString("fr-FR")} / {b.plafondMensuel.toLocaleString("fr-FR")} €
                        </span>
                        <button
                          type="button"
                          onClick={() => void deleteBudget(b.id)}
                          className="text-muted hover:text-[var(--red)]"
                        >✕</button>
                      </div>
                    </div>
                    <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-[var(--surface)]">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${pct}%`,
                          background: over ? "var(--red)" : b.couleur,
                        }}
                      />
                    </div>
                    <p className="mt-1 text-xs text-muted">
                      {over
                        ? `⚠️ Dépassé de ${(spent - b.plafondMensuel).toLocaleString("fr-FR")} €`
                        : `Reste ${(b.plafondMensuel - spent).toLocaleString("fr-FR")} € (${pct}% utilisé)`}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {/* ── Onglet Abonnements ── */}
      {tab === "abonnements" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <KpiCard label="Total / mois"  value={`${Math.round(abonMensuel).toLocaleString("fr-FR")} €`} />
            <KpiCard label="Total / an"    value={`${Math.round(abonAnnuel).toLocaleString("fr-FR")} €`} />
          </div>
          {abonnements.length === 0 ? (
            <EmptyState icon="🔄" msg="Aucun abonnement enregistré" />
          ) : (
            <ul className="space-y-2">
              {abonnements.map((t) => (
                <li key={t.id} className="flex items-center gap-3 rounded-xl border border-border bg-elevated px-4 py-3">
                  <span className="text-xl">🔄</span>
                  <div className="flex-1">
                    <p className="font-medium">{t.commentaire ?? t.categorie}</p>
                    <p className="text-sm text-muted">
                      {t.montant.toLocaleString("fr-FR")} € / {t.frequenceMois === 12 ? "an" : "mois"}
                      {t.prochainPrelevement && ` · Prochain : ${t.prochainPrelevement}`}
                    </p>
                  </div>
                  <button type="button" onClick={() => void deleteTransaction(t.id)}
                    className="text-muted hover:text-[var(--red)]">✕</button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Modals */}
      <AddTxModal open={addTxOpen} onClose={() => setAddTxOpen(false)} montantRef={montantRef} />
      <AddBudgetModal open={addBudOpen} onClose={() => setAddBudOpen(false)} />
      <UpdateBalanceModal open={soldeOpen} current={soldeReel ?? 0} onClose={() => setSoldeOpen(false)} />
    </div>
  );
}

/* ─── Composants utilitaires ────────────────────────────────────────────── */
function KpiCard({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-elevated p-3">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-lg font-bold truncate" style={color ? { color } : {}}>
        {value}
      </p>
    </div>
  );
}

function EmptyState({ icon, msg }: { icon: string; msg: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border p-8 text-center">
      <p className="text-3xl">{icon}</p>
      <p className="mt-2 text-sm text-muted">{msg}</p>
    </div>
  );
}

function TxRow({ tx, onDelete }: { tx: FinanceTransaction; onDelete: () => void }) {
  return (
    <li className="flex items-center gap-3 rounded-xl border border-border bg-elevated px-4 py-3">
      <span className="text-xl shrink-0">{EMOJI_TYPE[tx.type]}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="font-semibold">
            {(tx.type === "depense" || tx.type === "abonnement") ? "−" : "+"}
            {tx.montant.toLocaleString("fr-FR")} €
          </span>
          {tx.superflue && (
            <span className="rounded bg-amber-500/15 px-1.5 text-xs text-amber-400">superflu</span>
          )}
        </div>
        <p className="truncate text-sm text-muted">
          {tx.categorie}{tx.commentaire ? ` · ${tx.commentaire}` : ""} · {tx.date}
        </p>
      </div>
      <div className="flex shrink-0 gap-1 items-center">
        {tx.type === "depense" && (
          <button
            type="button"
            title="Marquer/démarquer superflu"
            onClick={() => void db.transactions.update(tx.id, { superflue: !tx.superflue })}
            className={["rounded-lg px-2 py-1 text-xs transition-colors",
              tx.superflue ? "bg-amber-500/20 text-amber-400" : "bg-[var(--surface)] text-muted hover:text-amber-400"].join(" ")}
          >
            ⚡
          </button>
        )}
        <button type="button" onClick={onDelete}
          className="rounded-full p-1 text-muted opacity-0 hover:text-[var(--red)] [li:hover_&]:opacity-100">✕</button>
      </div>
    </li>
  );
}

/* ─── Modal transaction ─────────────────────────────────────────────────── */
function AddTxModal({
  open, onClose, montantRef,
}: {
  open: boolean;
  onClose: () => void;
  montantRef: React.RefObject<HTMLInputElement | null>;
}) {
  const [type, setType]           = useState<FinanceTxType>("depense");
  const [montant, setMontant]     = useState("");
  const [categorie, setCategorie] = useState("alimentation");
  const [commentaire, setComment] = useState("");
  const [frequence, setFrequence] = useState(1);
  const [prochain, setProchain]   = useState("");

  const cats = type === "revenu" || type === "gain" ? CAT_REVENU : CAT_DEPENSE;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const m = Number(montant.replace(",", "."));
    if (!m || m <= 0) return;
    await db.transactions.add({
      id: crypto.randomUUID(),
      type,
      montant: m,
      categorie,
      commentaire: commentaire.trim() || undefined,
      date: new Date().toISOString().slice(0, 10),
      frequenceMois: type === "abonnement" ? frequence : undefined,
      prochainPrelevement: type === "abonnement" && prochain ? prochain : undefined,
      createdAt: Date.now(),
    });
    toast.ok(`${EMOJI_TYPE[type]} ${m.toLocaleString("fr-FR")} € enregistré`);
    setMontant(""); setComment(""); onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Nouvelle transaction">
      <form onSubmit={submit} className="space-y-4">
        {/* Type */}
        <div className="flex flex-wrap gap-2">
          {(["depense","revenu","gain","epargne","abonnement"] as FinanceTxType[]).map((ty) => (
            <button key={ty} type="button"
              onClick={() => { setType(ty); setCategorie(ty === "revenu" || ty === "gain" ? "salaire" : "alimentation"); }}
              className={["flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-sm",
                type === ty ? "border-accent bg-accent/10 text-accent" : "border-border text-muted"].join(" ")}
            >
              {EMOJI_TYPE[ty]}{" "}
              {ty === "abonnement" ? "Abonnement" : ty === "depense" ? "Dépense" :
               ty === "revenu" ? "Revenu" : ty === "epargne" ? "Épargne" : "Gain"}
            </button>
          ))}
        </div>

        <input
          ref={montantRef}
          type="number" inputMode="decimal"
          className="w-full rounded-xl border border-border bg-[var(--surface)] px-3 py-2.5 text-lg font-semibold outline-none focus:border-accent"
          placeholder="Montant (€)"
          value={montant}
          onChange={(e) => setMontant(e.target.value)}
        />

        {/* Catégorie */}
        <div className="flex flex-wrap gap-2">
          {cats.map((c) => (
            <button key={c} type="button" onClick={() => setCategorie(c)}
              className={["rounded-xl border px-3 py-1.5 text-sm capitalize",
                categorie === c ? "border-accent bg-accent/10 text-accent" : "border-border text-muted"].join(" ")}>
              {c}
            </button>
          ))}
        </div>

        <input
          className="w-full rounded-xl border border-border bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-accent"
          placeholder="Commentaire (ex: Leclerc, Netflix…)"
          value={commentaire}
          onChange={(e) => setComment(e.target.value)}
        />

        {/* Champs abonnement */}
        {type === "abonnement" && (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-muted">Fréquence</label>
              <select
                className="mt-1 w-full rounded-xl border border-border bg-[var(--surface)] px-3 py-2"
                value={frequence}
                onChange={(e) => setFrequence(Number(e.target.value))}
              >
                <option value={1}>Mensuel</option>
                <option value={3}>Trimestriel</option>
                <option value={12}>Annuel</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-muted">Prochain prélèvement</label>
              <input
                type="date"
                className="mt-1 w-full rounded-xl border border-border bg-[var(--surface)] px-3 py-2"
                value={prochain}
                onChange={(e) => setProchain(e.target.value)}
              />
            </div>
          </div>
        )}

        <button type="submit" className="w-full rounded-xl bg-accent py-3 font-semibold text-white active:scale-95">
          Enregistrer
        </button>
      </form>
    </Modal>
  );
}

/* ─── Modal budget ──────────────────────────────────────────────────────── */
function AddBudgetModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [categorie, setCategorie] = useState("alimentation");
  const [plafond, setPlafond]     = useState("");
  const [couleur, setCouleur]     = useState(BUDGET_COLORS[0]!);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const p = Number(plafond.replace(",", "."));
    if (!p || p <= 0) return;
    const budget: FinanceBudget = {
      id: crypto.randomUUID(),
      categorie,
      plafondMensuel: p,
      couleur,
      actif: true,
      createdAt: Date.now(),
    };
    await db.budgets.add(budget);
    toast.ok(`Budget ${categorie} : ${p} €/mois créé`);
    setPlafond("");
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Nouveau budget mensuel">
      <form onSubmit={submit} className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {CAT_DEPENSE.map((c) => (
            <button key={c} type="button" onClick={() => setCategorie(c)}
              className={["rounded-xl border px-3 py-1.5 text-sm capitalize",
                categorie === c ? "border-accent bg-accent/10 text-accent" : "border-border text-muted"].join(" ")}>
              {c}
            </button>
          ))}
        </div>
        <input
          type="number" inputMode="decimal"
          className="w-full rounded-xl border border-border bg-[var(--surface)] px-3 py-2.5 text-lg font-semibold outline-none focus:border-accent"
          placeholder="Plafond mensuel (€)"
          value={plafond}
          onChange={(e) => setPlafond(e.target.value)}
          autoFocus
        />
        <div className="flex flex-wrap gap-2">
          {BUDGET_COLORS.map((c) => (
            <button key={c} type="button" onClick={() => setCouleur(c)}
              className="h-8 w-8 rounded-full border-2 transition-transform hover:scale-110"
              style={{ background: c, borderColor: couleur === c ? "var(--text)" : "transparent" }} />
          ))}
        </div>
        <button type="submit" className="w-full rounded-xl bg-accent py-3 font-semibold text-white active:scale-95">
          Créer le budget
        </button>
      </form>
    </Modal>
  );
}

/* ─── Modal solde ───────────────────────────────────────────────────────── */
function UpdateBalanceModal({ open, current, onClose }: { open: boolean; current: number; onClose: () => void }) {
  const [v, setV] = useState(String(current));
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const solde = Number(v.replace(",", "."));
    if (Number.isNaN(solde)) return;
    await db.balanceSnapshots.add({ id: crypto.randomUUID(), date: new Date().toISOString().slice(0, 10), solde });
    toast.ok(`Solde mis à jour : ${solde.toLocaleString("fr-FR")} €`);
    onClose();
  }
  return (
    <Modal open={open} onClose={onClose} title="Solde actuel">
      <form onSubmit={submit} className="space-y-4">
        <input
          type="number" inputMode="decimal" autoFocus
          className="w-full rounded-xl border border-border bg-[var(--surface)] px-3 py-2.5 text-lg font-semibold outline-none focus:border-accent"
          value={v}
          onChange={(e) => setV(e.target.value)}
          placeholder="Solde (€)"
        />
        <button type="submit" className="w-full rounded-xl bg-accent py-3 font-semibold text-white active:scale-95">
          Enregistrer
        </button>
      </form>
    </Modal>
  );
}
