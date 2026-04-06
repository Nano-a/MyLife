import { useLiveQuery } from "dexie-react-hooks";
import { useMemo, useRef, useState } from "react";
import { db } from "../db";
import type {
  FinanceBudget,
  FinanceSubscription,
  FinanceTransaction,
  FinanceTxType,
  SubscriptionBillingPeriod,
} from "@mylife/core";
import {
  describeSubscriptionPeriod,
  MOIS_COURTS,
  nextChargeDate,
  subscriptionAmountForMonth,
} from "@mylife/core";
import { Modal } from "../components/Modal";
import { toast } from "../lib/toastStore";
import { downloadFinanceReportPdf, downloadFinanceReportXlsx } from "../lib/exportReports";

/* ─── Constantes ───────────────────────────────────────────────────────── */
const CAT_DEPENSE  = ["alimentation","loisirs","transport","abonnement","soin","vêtements","logement","autre"];
const CAT_REVENU   = ["salaire","freelance","vente","cadeau","investissement","autre"];
/** Septembre → juin (année scolaire), indices 0–11 */
const MOIS_SCOLAIRE = [8, 9, 10, 11, 0, 1, 2, 3, 4, 5];
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
  const subs  = useLiveQuery(() => db.subscriptions.toArray(), []) ?? [];

  const [tab, setTab]       = useState<Tab>("transactions");
  const [addTxOpen, setAddTxOpen]     = useState(false);
  const [addSubOpen, setAddSubOpen]   = useState(false);
  const [addBudOpen, setAddBudOpen]   = useState(false);
  const [soldeOpen, setSoldeOpen]     = useState(false);
  const [filterCat, setFilterCat]     = useState("");
  const [filterType, setFilterType]   = useState<FinanceTxType | "">("");
  const [chartMonths, setChartMonths] = useState<3 | 6 | 12>(6);
  const montantRef = useRef<HTMLInputElement>(null);

  const currentMonth = new Date().toISOString().slice(0, 7);

  const soldeReel       = snaps[0]?.solde ?? null;
  const txsThisMonth    = txs.filter((t) => t.date.startsWith(currentMonth));
  const depMois         = txsThisMonth.reduce((s, t) => s + (t.type === "depense" ? t.montant : 0), 0);
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
      if (t.type === "depense") cur.dep += t.montant;
      if (t.type === "revenu" || t.type === "gain") cur.rev += t.montant;
      m.set(key, cur);
    }
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0])).slice(-chartMonths);
  }, [txs, chartMonths]);

  /** Double courbe : solde relevé vs solde « sans superflus » (spec). */
  const balanceDualSeries = useMemo(() => {
    const ord = [...snaps].sort((a, b) => a.date.localeCompare(b.date));
    const superfluCumulJusque = (dateIso: string) =>
      txs
        .filter((t) => t.type === "depense" && t.superflue && t.date <= dateIso)
        .reduce((s, t) => s + t.montant, 0);
    return ord.map((s) => ({
      date: s.date,
      label: s.date.slice(5),
      reel: s.solde,
      parfait: s.solde + superfluCumulJusque(s.date),
    }));
  }, [snaps, txs]);

  const abonMensuel = useMemo(() => {
    const [ys, ms] = currentMonth.split("-").map(Number);
    return subs.reduce((s, sub) => s + subscriptionAmountForMonth(sub, ys!, ms! - 1), 0);
  }, [subs, currentMonth]);
  const abonAnnuel = useMemo(() => {
    const y = Number(currentMonth.slice(0, 4));
    let total = 0;
    for (const sub of subs) {
      for (let m0 = 0; m0 < 12; m0++) total += subscriptionAmountForMonth(sub, y, m0);
    }
    return total;
  }, [subs, currentMonth]);

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

  async function deleteSubscription(id: string) {
    if (!confirm("Supprimer cet abonnement récurrent ?")) return;
    await db.subscriptions.delete(id);
    toast.info("Abonnement supprimé");
  }

  return (
    <div className="space-y-5">
      {/* En-tête */}
      <header className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Finances</h1>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSoldeOpen(true)}
            className="rounded-xl elevated-surface px-3 py-2 text-sm text-muted hover:text-[var(--text)] active:scale-95"
          >
            Solde
          </button>
          <button
            type="button"
            onClick={() => {
              downloadFinanceReportPdf(txs, snaps, `mylife-finances-${new Date().toISOString().slice(0, 10)}.pdf`);
              toast.ok("Rapport PDF téléchargé");
            }}
            className="rounded-xl elevated-surface px-3 py-2 text-sm text-muted hover:text-[var(--text)] active:scale-95"
          >
            Rapport PDF
          </button>
          <button
            type="button"
            onClick={() => {
              downloadFinanceReportXlsx(txs, `mylife-finances-${new Date().toISOString().slice(0, 10)}.xlsx`);
              toast.ok("Excel téléchargé");
            }}
            className="rounded-xl elevated-surface px-3 py-2 text-sm text-muted hover:text-[var(--text)] active:scale-95"
          >
            Excel
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

      {/* Double courbe soldes (spec) */}
      {balanceDualSeries.length >= 2 && (
        <div className="rounded-2xl elevated-surface p-4">
          <p className="mb-2 text-sm font-semibold">Solde relevé vs sans superflus</p>
          <p className="mb-3 text-xs text-muted">
            Ligne bleue : solde saisi · ligne verte pointillée : même solde + dépenses superflues cumulées jusqu’à cette date
          </p>
          <BalanceDualChart data={balanceDualSeries} />
        </div>
      )}

      {/* Graphe */}
      {byMonth.length > 0 && (
        <div className="rounded-2xl elevated-surface p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold">Historique mensuel</p>
            <div className="flex gap-1 rounded-lg border border-border p-0.5 text-xs">
              {([3, 6, 12] as const).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setChartMonths(n)}
                  className={[
                    "rounded-md px-2 py-1 font-medium",
                    chartMonths === n ? "bg-accent text-white" : "text-muted hover:text-[var(--text)]",
                  ].join(" ")}
                >
                  {n} m
                </button>
              ))}
            </div>
          </div>
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
      <div className="flex gap-1 rounded-xl elevated-surface p-1">
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
              className="rounded-xl elevated-surface px-3 py-1.5 text-sm"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as FinanceTxType | "")}
            >
              <option value="">Tous types</option>
              {(["depense","revenu","gain","epargne"] as FinanceTxType[]).map((t) => (
                <option key={t} value={t}>{EMOJI_TYPE[t]} {t}</option>
              ))}
            </select>
            <select
              className="rounded-xl elevated-surface px-3 py-1.5 text-sm"
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
                  <li key={b.id} className="rounded-2xl elevated-surface p-4">
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
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setAddSubOpen(true)}
              className="flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white active:scale-95"
            >
              + Abonnement récurrent
            </button>
          </div>
          <p className="text-sm text-muted">
            Tu le configures une seule fois (montant, jour, mois concernés, fin ou pour toujours). Les prochains prélèvements sont calculés automatiquement.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <KpiCard label="Engagé ce mois-ci" value={`${Math.round(abonMensuel).toLocaleString("fr-FR")} €`} />
            <KpiCard label="Sur l’année" value={`${Math.round(abonAnnuel).toLocaleString("fr-FR")} €`} />
          </div>
          {subs.length === 0 ? (
            <EmptyState icon="🔄" msg="Aucun abonnement — ajoute par ex. ton forfait (chaque mois) ou la SNCF (sept. → juin, chaque année)" />
          ) : (
            <ul className="space-y-2">
              {subs.map((sub) => {
                const next = nextChargeDate(sub);
                return (
                  <li key={sub.id} className="flex items-center gap-3 rounded-xl elevated-surface px-4 py-3">
                    <span className="text-xl">🔄</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{sub.libelle}</p>
                      <p className="text-sm text-muted">
                        {sub.montant.toLocaleString("fr-FR")} € · {describeSubscriptionPeriod(sub)}
                        {next && ` · Prochain : ${next}`}
                        {!next && " · (terminé ou hors période)"}
                      </p>
                      {sub.commentaire && <p className="text-xs text-muted truncate">{sub.commentaire}</p>}
                    </div>
                    <button
                      type="button"
                      onClick={() => void deleteSubscription(sub.id)}
                      className="shrink-0 text-muted hover:text-[var(--red)]"
                    >
                      ✕
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {/* Modals */}
      <AddTxModal open={addTxOpen} onClose={() => setAddTxOpen(false)} montantRef={montantRef} />
      <AddSubscriptionModal open={addSubOpen} onClose={() => setAddSubOpen(false)} />
      <AddBudgetModal open={addBudOpen} onClose={() => setAddBudOpen(false)} />
      <UpdateBalanceModal open={soldeOpen} current={soldeReel ?? 0} onClose={() => setSoldeOpen(false)} />
    </div>
  );
}

/* ─── Composants utilitaires ────────────────────────────────────────────── */
type BalanceDualPoint = { date: string; label: string; reel: number; parfait: number };

function BalanceDualChart({ data }: { data: BalanceDualPoint[] }) {
  const w = 320;
  const h = 140;
  const padL = 36;
  const padR = 8;
  const padT = 22;
  const padB = 24;
  const innerW = w - padL - padR;
  const innerH = h - padT - padB;
  const minY = Math.min(...data.map((d) => Math.min(d.reel, d.parfait)));
  const maxY = Math.max(...data.map((d) => Math.max(d.reel, d.parfait)));
  const span = maxY - minY || 1;
  const n = data.length;
  const xAt = (i: number) => padL + (n <= 1 ? innerW / 2 : (i / (n - 1)) * innerW);
  const yAt = (v: number) => padT + innerH - ((v - minY) / span) * innerH;
  const pathReel = data.map((d, i) => `${i === 0 ? "M" : "L"} ${xAt(i).toFixed(1)} ${yAt(d.reel).toFixed(1)}`).join(" ");
  const pathParfait = data.map((d, i) => `${i === 0 ? "M" : "L"} ${xAt(i).toFixed(1)} ${yAt(d.parfait).toFixed(1)}`).join(" ");
  const tickIdx = [0, Math.floor((n - 1) / 2), n - 1].filter((i, j, a) => a.indexOf(i) === j);

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full max-h-44 text-[var(--muted)]" aria-hidden>
      <text x={padL} y={14} className="fill-current text-[9px]">
        {minY.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} – {maxY.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} €
      </text>
      {tickIdx.map((i) => (
        <text key={data[i]!.date} x={xAt(i)} y={h - 6} textAnchor="middle" className="fill-current text-[8px]">
          {data[i]!.label}
        </text>
      ))}
      <path d={pathReel} fill="none" stroke="#2563eb" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <path
        d={pathParfait}
        fill="none"
        stroke="#059669"
        strokeWidth={2}
        strokeDasharray="5 4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function KpiCard({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded-2xl elevated-surface p-3">
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
    <li className="flex items-center gap-3 rounded-xl elevated-surface px-4 py-3">
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
          {(["depense","revenu","gain","epargne"] as FinanceTxType[]).map((ty) => (
            <button key={ty} type="button"
              onClick={() => { setType(ty); setCategorie(ty === "revenu" || ty === "gain" ? "salaire" : "alimentation"); }}
              className={["flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-sm",
                type === ty ? "border-accent bg-accent/10 text-accent" : "border-border text-muted"].join(" ")}
            >
              {EMOJI_TYPE[ty]}{" "}
              {ty === "depense" ? "Dépense" :
               ty === "revenu" ? "Revenu" : ty === "epargne" ? "Épargne" : "Gain"}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted">
          Pour un prélèvement automatique (forfait, abonnement, etc.), utilise l’onglet <strong>Abonnements</strong>.
        </p>

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

        <button type="submit" className="w-full rounded-xl bg-accent py-3 font-semibold text-white active:scale-95">
          Enregistrer
        </button>
      </form>
    </Modal>
  );
}

function AddSubscriptionModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const today = new Date().toISOString().slice(0, 10);
  const [libelle, setLibelle]         = useState("");
  const [montant, setMontant]         = useState("");
  const [categorie, setCategorie]     = useState("abonnement");
  const [commentaire, setCommentaire] = useState("");
  const [period, setPeriod]           = useState<SubscriptionBillingPeriod>("monthly");
  const [jour, setJour]             = useState(5);
  const [tousLesMois, setTousLesMois] = useState(true);
  const [moisSel, setMoisSel]       = useState<Set<number>>(() => new Set(MOIS_SCOLAIRE));
  const [sansFin, setSansFin]         = useState(true);
  const [finLe, setFinLe]           = useState("");
  const [dateDebut, setDateDebut]     = useState(today);

  function toggleMois(m: number) {
    setMoisSel((prev) => {
      const n = new Set(prev);
      if (n.has(m)) n.delete(m);
      else n.add(m);
      return n;
    });
  }

  function presetScolaire() {
    setTousLesMois(false);
    setMoisSel(new Set(MOIS_SCOLAIRE));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const m = Number(montant.replace(",", "."));
    if (!libelle.trim() || !m || m <= 0) return;
    if (!sansFin && !finLe) return;
    if (!tousLesMois && moisSel.size === 0) return;

    const moisActifs = tousLesMois ? undefined : [...moisSel].sort((a, b) => a - b);
    const sub: FinanceSubscription = {
      id: crypto.randomUUID(),
      libelle: libelle.trim(),
      montant: m,
      categorie,
      commentaire: commentaire.trim() || undefined,
      jourPrelevement: period === "daily" ? 1 : Math.min(31, Math.max(1, jour)),
      period,
      moisActifs,
      sansFin,
      finLe: sansFin ? undefined : finLe,
      dateDebut,
      createdAt: Date.now(),
    };
    await db.subscriptions.add(sub);
    toast.ok(`Abonnement « ${sub.libelle} » enregistré`);
    setLibelle("");
    setMontant("");
    setCommentaire("");
    setTousLesMois(true);
    setSansFin(true);
    setFinLe("");
    setDateDebut(new Date().toISOString().slice(0, 10));
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Abonnement récurrent">
      <form onSubmit={submit} className="max-h-[75vh] space-y-3 overflow-y-auto pr-1">
        <input
          className="w-full rounded-xl border border-border bg-[var(--surface)] px-3 py-2.5 font-medium outline-none focus:border-accent"
          placeholder="Libellé (ex. Forfait SFR, Pass SNCF…)"
          value={libelle}
          onChange={(e) => setLibelle(e.target.value)}
          autoFocus
        />
        <input
          type="number"
          inputMode="decimal"
          className="w-full rounded-xl border border-border bg-[var(--surface)] px-3 py-2.5 text-lg font-semibold outline-none focus:border-accent"
          placeholder="Montant (€)"
          value={montant}
          onChange={(e) => setMontant(e.target.value)}
        />
        <div className="flex flex-wrap gap-2">
          {CAT_DEPENSE.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategorie(c)}
              className={[
                "rounded-xl border px-3 py-1.5 text-sm capitalize",
                categorie === c ? "border-accent bg-accent/10 text-accent" : "border-border text-muted",
              ].join(" ")}
            >
              {c}
            </button>
          ))}
        </div>
        <input
          className="w-full rounded-xl border border-border bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-accent"
          placeholder="Note (optionnel)"
          value={commentaire}
          onChange={(e) => setCommentaire(e.target.value)}
        />

        <div>
          <label className="text-xs text-muted">Rythme</label>
          <select
            className="mt-1 w-full rounded-xl border border-border bg-[var(--surface)] px-3 py-2"
            value={period}
            onChange={(e) => setPeriod(e.target.value as SubscriptionBillingPeriod)}
          >
            <option value="monthly">Chaque mois (même jour)</option>
            <option value="yearly">Une fois par an (mois = date de référence ci-dessous)</option>
            <option value="daily">Chaque jour (montant / jour)</option>
          </select>
        </div>

        {period !== "daily" && (
          <div>
            <label className="text-xs text-muted">Jour du prélèvement dans le mois (1–31)</label>
            <input
              type="number"
              min={1}
              max={31}
              className="mt-1 w-full rounded-xl border border-border bg-[var(--surface)] px-3 py-2"
              value={jour}
              onChange={(e) => setJour(Number(e.target.value) || 1)}
            />
          </div>
        )}

        <div>
          <label className="text-xs text-muted">Date de début / référence</label>
          <input
            type="date"
            className="mt-1 w-full rounded-xl border border-border bg-[var(--surface)] px-3 py-2"
            value={dateDebut}
            onChange={(e) => setDateDebut(e.target.value)}
          />
          {period === "yearly" && (
            <p className="mt-1 text-xs text-muted">Le mois de cette date fixe le mois annuel du prélèvement.</p>
          )}
        </div>

        {period !== "daily" && (
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={tousLesMois}
                onChange={(e) => setTousLesMois(e.target.checked)}
              />
              Tous les mois de l’année
            </label>
            {!tousLesMois && (
              <>
                <button
                  type="button"
                  onClick={presetScolaire}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted hover:text-[var(--text)]"
                >
                  Préréglage rentrée : sept. → juin (hors juil. / août)
                </button>
                <div className="flex flex-wrap gap-1.5">
                  {MOIS_COURTS.map((label, m0) => (
                    <button
                      key={m0}
                      type="button"
                      onClick={() => toggleMois(m0)}
                      className={[
                        "rounded-lg border px-2 py-1 text-xs",
                        moisSel.has(m0) ? "border-accent bg-accent/15 text-accent" : "border-border text-muted",
                      ].join(" ")}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {period === "daily" && (
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={tousLesMois}
                onChange={(e) => setTousLesMois(e.target.checked)}
              />
              Tous les mois
            </label>
            {!tousLesMois && (
              <div className="flex flex-wrap gap-1.5">
                {MOIS_COURTS.map((label, m0) => (
                  <button
                    key={m0}
                    type="button"
                    onClick={() => toggleMois(m0)}
                    className={[
                      "rounded-lg border px-2 py-1 text-xs",
                      moisSel.has(m0) ? "border-accent bg-accent/15 text-accent" : "border-border text-muted",
                    ].join(" ")}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={sansFin} onChange={(e) => setSansFin(e.target.checked)} />
          Sans date de fin (toute la vie / contrat indéterminé)
        </label>
        {!sansFin && (
          <div>
            <label className="text-xs text-muted">Dernier prélèvement possible</label>
            <input
              type="date"
              className="mt-1 w-full rounded-xl border border-border bg-[var(--surface)] px-3 py-2"
              value={finLe}
              onChange={(e) => setFinLe(e.target.value)}
            />
          </div>
        )}

        <button type="submit" className="w-full rounded-xl bg-accent py-3 font-semibold text-white active:scale-95">
          Enregistrer l’abonnement
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
