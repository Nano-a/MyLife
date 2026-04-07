'use client'

import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import type { FinanceTransaction, FinanceTxType } from '@mylife/core'
import {
  describeSubscriptionPeriod,
  nextChargeDate,
  subscriptionAmountForMonth,
} from '@mylife/core'
import { AnimatedCard } from '@/components/animated-card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { db } from '@/lib/mylife/db'
import {
  CAT_DEPENSE,
  CAT_REVENU,
  EMOJI_TYPE,
  FinanceBalanceDialog,
  FinanceBudgetDialog,
  FinanceSubscriptionDialog,
  FinanceTxDialog,
} from '@/components/views/finance-modals'
import { FileSpreadsheet, FileText, Plus, Wallet } from 'lucide-react'

type Tab = 'transactions' | 'budgets' | 'abonnements'

type BalanceDualPoint = { date: string; label: string; reel: number; parfait: number }

function BalanceDualChart({ data }: { data: BalanceDualPoint[] }) {
  const w = 320
  const h = 140
  const padL = 36
  const padR = 8
  const padT = 22
  const padB = 24
  const innerW = w - padL - padR
  const innerH = h - padT - padB
  const minY = Math.min(...data.map((d) => Math.min(d.reel, d.parfait)))
  const maxY = Math.max(...data.map((d) => Math.max(d.reel, d.parfait)))
  const span = maxY - minY || 1
  const n = data.length
  const xAt = (i: number) => padL + (n <= 1 ? innerW / 2 : (i / (n - 1)) * innerW)
  const yAt = (v: number) => padT + innerH - ((v - minY) / span) * innerH
  const pathReel = data
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${xAt(i).toFixed(1)} ${yAt(d.reel).toFixed(1)}`)
    .join(' ')
  const pathParfait = data
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${xAt(i).toFixed(1)} ${yAt(d.parfait).toFixed(1)}`)
    .join(' ')
  const tickIdx = [0, Math.floor((n - 1) / 2), n - 1].filter((i, j, a) => a.indexOf(i) === j)

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="max-h-44 w-full text-muted-foreground" aria-hidden>
      <text x={padL} y={14} className="fill-current text-[9px]">
        {minY.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} –{' '}
        {maxY.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €
      </text>
      {tickIdx.map((i) => (
        <text key={data[i]!.date} x={xAt(i)} y={h - 6} textAnchor="middle" className="fill-current text-[8px]">
          {data[i]!.label}
        </text>
      ))}
      <path
        d={pathReel}
        fill="none"
        stroke="hsl(var(--chart-1))"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d={pathParfait}
        fill="none"
        stroke="hsl(var(--chart-2))"
        strokeWidth={2}
        strokeDasharray="5 4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function KpiMini({
  label,
  value,
  className,
}: {
  label: string
  value: string
  className?: string
}) {
  return (
    <AnimatedCard className="p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn('mt-1 truncate text-lg font-bold', className)}>{value}</p>
    </AnimatedCard>
  )
}

function EmptyFin({ icon, msg }: { icon: string; msg: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border p-8 text-center">
      <p className="text-3xl">{icon}</p>
      <p className="mt-2 text-sm text-muted-foreground">{msg}</p>
    </div>
  )
}

function TxRowFin({ tx, onDelete }: { tx: FinanceTransaction; onDelete: () => void }) {
  return (
    <li className="flex items-center gap-3 rounded-xl border border-border bg-card/50 px-4 py-3 transition-colors hover:bg-muted/40">
      <span className="shrink-0 text-xl">{EMOJI_TYPE[tx.type]}</span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-2">
          <span className="font-semibold">
            {tx.type === 'depense' || tx.type === 'abonnement' ? '−' : '+'}
            {tx.montant.toLocaleString('fr-FR')} €
          </span>
          {tx.superflue && (
            <span className="rounded bg-amber-500/15 px-1.5 text-xs text-amber-600 dark:text-amber-400">
              superflu
            </span>
          )}
        </div>
        <p className="truncate text-sm text-muted-foreground">
          {tx.categorie}
          {tx.commentaire ? ` · ${tx.commentaire}` : ''} · {tx.date}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {tx.type === 'depense' && (
          <button
            type="button"
            title="Marquer / démarquer superflu"
            onClick={() => void db.transactions.update(tx.id, { superflue: !tx.superflue })}
            className={cn(
              'rounded-lg px-2 py-1 text-xs transition-colors',
              tx.superflue
                ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                : 'bg-muted text-muted-foreground hover:text-amber-600 dark:hover:text-amber-400'
            )}
          >
            ⚡
          </button>
        )}
        <button
          type="button"
          onClick={onDelete}
          className="rounded-full p-1 text-muted-foreground opacity-0 transition-opacity hover:text-destructive [li:hover_&]:opacity-100"
        >
          ✕
        </button>
      </div>
    </li>
  )
}

export function FinancesView() {
  const txs = useLiveQuery(() => db.transactions.orderBy('date').reverse().toArray(), []) ?? []
  const snaps =
    useLiveQuery(() => db.balanceSnapshots.orderBy('date').reverse().toArray(), []) ?? []
  const buds = useLiveQuery(() => db.budgets.toArray(), []) ?? []
  const subs = useLiveQuery(() => db.subscriptions.toArray(), []) ?? []

  const [tab, setTab] = useState<Tab>('transactions')
  const [addTxOpen, setAddTxOpen] = useState(false)
  const [addSubOpen, setAddSubOpen] = useState(false)
  const [addBudOpen, setAddBudOpen] = useState(false)
  const [soldeOpen, setSoldeOpen] = useState(false)
  const [filterCat, setFilterCat] = useState('')
  const [filterType, setFilterType] = useState<FinanceTxType | ''>('')
  const [chartMonths, setChartMonths] = useState<3 | 6 | 12>(6)
  const montantRef = useRef<HTMLInputElement>(null)

  const currentMonth = new Date().toISOString().slice(0, 7)

  const soldeReel = snaps[0]?.solde ?? null
  const txsThisMonth = txs.filter((t) => t.date.startsWith(currentMonth))
  const depMois = txsThisMonth.reduce((s, t) => s + (t.type === 'depense' ? t.montant : 0), 0)
  const revMois = txsThisMonth.reduce(
    (s, t) => s + (t.type === 'revenu' || t.type === 'gain' ? t.montant : 0),
    0
  )
  const superfluSum = useMemo(
    () => txs.reduce((s, t) => s + (t.type === 'depense' && t.superflue ? t.montant : 0), 0),
    [txs]
  )
  const soldeSansSuperflu = soldeReel != null ? soldeReel + superfluSum : null

  const budgetUsage = useMemo(() => {
    const map = new Map<string, number>()
    for (const t of txsThisMonth) {
      if (t.type === 'depense') map.set(t.categorie, (map.get(t.categorie) ?? 0) + t.montant)
    }
    return map
  }, [txsThisMonth])

  const byMonth = useMemo(() => {
    const m = new Map<string, { dep: number; rev: number }>()
    for (const t of txs) {
      const key = t.date.slice(0, 7)
      const cur = m.get(key) ?? { dep: 0, rev: 0 }
      if (t.type === 'depense') cur.dep += t.montant
      if (t.type === 'revenu' || t.type === 'gain') cur.rev += t.montant
      m.set(key, cur)
    }
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0])).slice(-chartMonths)
  }, [txs, chartMonths])

  const balanceDualSeries = useMemo(() => {
    const ord = [...snaps].sort((a, b) => a.date.localeCompare(b.date))
    const superfluCumulJusque = (dateIso: string) =>
      txs
        .filter((t) => t.type === 'depense' && t.superflue && t.date <= dateIso)
        .reduce((s, t) => s + t.montant, 0)
    return ord.map((s) => ({
      date: s.date,
      label: s.date.slice(5),
      reel: s.solde,
      parfait: s.solde + superfluCumulJusque(s.date),
    }))
  }, [snaps, txs])

  const abonMensuel = useMemo(() => {
    const [ys, ms] = currentMonth.split('-').map(Number)
    return subs.reduce((s, sub) => s + subscriptionAmountForMonth(sub, ys!, ms! - 1), 0)
  }, [subs, currentMonth])
  const abonAnnuel = useMemo(() => {
    const y = Number(currentMonth.slice(0, 4))
    let total = 0
    for (const sub of subs) {
      for (let m0 = 0; m0 < 12; m0++) total += subscriptionAmountForMonth(sub, y, m0)
    }
    return total
  }, [subs, currentMonth])

  const filtered = useMemo(() => {
    let list = txs
    if (filterCat) list = list.filter((t) => t.categorie === filterCat)
    if (filterType) list = list.filter((t) => t.type === filterType)
    return list
  }, [txs, filterCat, filterType])

  async function deleteTransaction(id: string) {
    await db.transactions.delete(id)
    toast.info('Transaction supprimée')
  }

  async function deleteBudget(id: string) {
    if (!confirm('Supprimer ce budget ?')) return
    await db.budgets.delete(id)
    toast.info('Budget supprimé')
  }

  async function deleteSubscription(id: string) {
    if (!confirm('Supprimer cet abonnement récurrent ?')) return
    await db.subscriptions.delete(id)
    toast.info('Abonnement supprimé')
  }

  const stamp = new Date().toISOString().slice(0, 10)

  return (
    <div className="mx-auto max-w-7xl p-4 md:p-8">
      <header className="mb-6 flex animate-fade-up flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">Finances</h1>
          <p className="text-muted-foreground">Transactions, budgets et abonnements (données locales)</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" className="gap-1.5 rounded-xl" onClick={() => setSoldeOpen(true)}>
            <Wallet className="h-4 w-4" />
            Solde
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 rounded-xl"
            onClick={async () => {
              const { downloadFinanceReportPdf } = await import('@/lib/mylife/lib/exportReports')
              downloadFinanceReportPdf(txs, snaps, `mylife-finances-${stamp}.pdf`)
              toast.success('Rapport PDF téléchargé')
            }}
          >
            <FileText className="h-4 w-4" />
            PDF
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 rounded-xl"
            onClick={async () => {
              const { downloadFinanceReportXlsx } = await import('@/lib/mylife/lib/exportReports')
              downloadFinanceReportXlsx(txs, `mylife-finances-${stamp}.xlsx`)
              toast.success('Excel téléchargé')
            }}
          >
            <FileSpreadsheet className="h-4 w-4" />
            Excel
          </Button>
          <Button
            size="sm"
            className="gap-1.5 rounded-xl"
            onClick={() => {
              setAddTxOpen(true)
              setTimeout(() => montantRef.current?.focus(), 80)
            }}
          >
            <Plus className="h-4 w-4" />
            Transaction
          </Button>
        </div>
      </header>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiMini
          label="Solde relevé"
          value={soldeReel != null ? `${soldeReel.toLocaleString('fr-FR')} €` : '—'}
        />
        <KpiMini
          label="Sans superflus"
          value={soldeSansSuperflu != null ? `${soldeSansSuperflu.toLocaleString('fr-FR')} €` : '—'}
          className="text-chart-2"
        />
        <KpiMini label="Dépenses / mois" value={`${depMois.toLocaleString('fr-FR')} €`} className="text-destructive" />
        <KpiMini label="Revenus / mois" value={`${revMois.toLocaleString('fr-FR')} €`} className="text-chart-2" />
      </div>

      {balanceDualSeries.length >= 2 && (
        <AnimatedCard className="mb-6 p-4" delay={80}>
          <p className="mb-2 text-sm font-semibold">Solde relevé vs sans superflus</p>
          <p className="mb-3 text-xs text-muted-foreground">
            Courbe pleine : solde saisi · courbe pointillée : solde + dépenses superflues cumulées jusqu’à cette date
          </p>
          <BalanceDualChart data={balanceDualSeries} />
        </AnimatedCard>
      )}

      {byMonth.length > 0 && (
        <AnimatedCard className="mb-6 p-4" delay={100}>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold">Historique mensuel</p>
            <div className="flex gap-1 rounded-lg border border-border p-0.5 text-xs">
              {([3, 6, 12] as const).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setChartMonths(n)}
                  className={cn(
                    'rounded-md px-2 py-1 font-medium transition-colors',
                    chartMonths === n
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {n} m
                </button>
              ))}
            </div>
          </div>
          <div className="flex h-28 items-end gap-1">
            {byMonth.map(([mois, v]) => {
              const maxV = Math.max(...byMonth.map(([, x]) => Math.max(x.dep, x.rev)), 1)
              return (
                <div key={mois} className="flex flex-1 flex-col items-center gap-1">
                  <div className="flex h-24 w-full items-end justify-center gap-0.5">
                    <div
                      className="w-3 rounded-t-sm bg-chart-5/70 transition-all"
                      style={{ height: `${(v.dep / maxV) * 100}%` }}
                      title={`Dépenses ${v.dep} €`}
                    />
                    <div
                      className="w-3 rounded-t-sm bg-chart-2/70 transition-all"
                      style={{ height: `${(v.rev / maxV) * 100}%` }}
                      title={`Revenus ${v.rev} €`}
                    />
                  </div>
                  <span className="text-[0.6rem] text-muted-foreground">{mois.slice(5)}</span>
                </div>
              )
            })}
          </div>
          <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-sm bg-chart-5/70" />
              Dépenses
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-sm bg-chart-2/70" />
              Revenus
            </span>
          </div>
        </AnimatedCard>
      )}

      <div className="mb-6 flex gap-1 rounded-xl border border-border bg-muted/30 p-1">
        {(
          [
            ['transactions', 'Transactions'],
            ['budgets', 'Budgets'],
            ['abonnements', 'Abonnements'],
          ] as [Tab, string][]
        ).map(([t, l]) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              'flex-1 rounded-lg py-2 text-sm font-medium transition-colors',
              tab === t
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {l}
          </button>
        ))}
      </div>

      {tab === 'transactions' && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <select
              className="rounded-xl border border-border bg-background px-3 py-2 text-sm"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as FinanceTxType | '')}
            >
              <option value="">Tous types</option>
              {(['depense', 'revenu', 'gain', 'epargne'] as FinanceTxType[]).map((ty) => (
                <option key={ty} value={ty}>
                  {EMOJI_TYPE[ty]} {ty}
                </option>
              ))}
            </select>
            <select
              className="rounded-xl border border-border bg-background px-3 py-2 text-sm"
              value={filterCat}
              onChange={(e) => setFilterCat(e.target.value)}
            >
              <option value="">Toutes catégories</option>
              {[...CAT_DEPENSE, ...CAT_REVENU].map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            {(filterCat || filterType) && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="rounded-xl"
                onClick={() => {
                  setFilterCat('')
                  setFilterType('')
                }}
              >
                Réinitialiser
              </Button>
            )}
          </div>

          {filtered.length === 0 ? (
            <EmptyFin icon="💸" msg="Aucune transaction" />
          ) : (
            <ul className="space-y-2">
              {filtered.map((t) => (
                <TxRowFin key={t.id} tx={t} onDelete={() => void deleteTransaction(t.id)} />
              ))}
            </ul>
          )}
        </div>
      )}

      {tab === 'budgets' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button size="sm" className="rounded-xl" onClick={() => setAddBudOpen(true)}>
              + Nouveau budget
            </Button>
          </div>
          {buds.length === 0 ? (
            <EmptyFin
              icon="🎯"
              msg="Définis des budgets par catégorie pour suivre tes dépenses du mois"
            />
          ) : (
            <ul className="space-y-3">
              {buds.map((b) => {
                const spent = budgetUsage.get(b.categorie) ?? 0
                const pct = b.plafondMensuel > 0 ? Math.min(100, Math.round((spent / b.plafondMensuel) * 100)) : 0
                const over = spent > b.plafondMensuel
                return (
                  <li key={b.id}>
                    <AnimatedCard className="p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className="h-3 w-3 rounded-full" style={{ background: b.couleur }} />
                          <span className="font-medium capitalize">{b.categorie}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={cn('text-sm font-semibold', over && 'text-destructive')}>
                            {spent.toLocaleString('fr-FR')} / {b.plafondMensuel.toLocaleString('fr-FR')} €
                          </span>
                          <button
                            type="button"
                            onClick={() => void deleteBudget(b.id)}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                      <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{
                            width: `${pct}%`,
                            background: over ? 'hsl(var(--destructive))' : b.couleur,
                          }}
                        />
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {over
                          ? `Dépassé de ${(spent - b.plafondMensuel).toLocaleString('fr-FR')} €`
                          : `Reste ${(b.plafondMensuel - spent).toLocaleString('fr-FR')} € (${pct}% utilisé)`}
                      </p>
                    </AnimatedCard>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}

      {tab === 'abonnements' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button size="sm" className="rounded-xl" onClick={() => setAddSubOpen(true)}>
              + Abonnement récurrent
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Configure une seule fois (montant, jour, mois concernés, fin ou pour toujours). Les prochains prélèvements
            sont calculés automatiquement.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <KpiMini
              label="Engagé ce mois-ci"
              value={`${Math.round(abonMensuel).toLocaleString('fr-FR')} €`}
            />
            <KpiMini label="Sur l’année" value={`${Math.round(abonAnnuel).toLocaleString('fr-FR')} €`} />
          </div>
          {subs.length === 0 ? (
            <EmptyFin
              icon="🔄"
              msg="Aucun abonnement — ajoute par ex. ton forfait (chaque mois) ou un abonnement annuel avec mois actifs"
            />
          ) : (
            <ul className="space-y-2">
              {subs.map((sub) => {
                const next = nextChargeDate(sub)
                return (
                  <li key={sub.id}>
                    <AnimatedCard className="flex items-center gap-3 px-4 py-3">
                      <span className="text-xl">🔄</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{sub.libelle}</p>
                        <p className="text-sm text-muted-foreground">
                          {sub.montant.toLocaleString('fr-FR')} € · {describeSubscriptionPeriod(sub)}
                          {next && ` · Prochain : ${next}`}
                          {!next && ' · (terminé ou hors période)'}
                        </p>
                        {sub.commentaire && (
                          <p className="truncate text-xs text-muted-foreground">{sub.commentaire}</p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => void deleteSubscription(sub.id)}
                        className="shrink-0 text-muted-foreground hover:text-destructive"
                      >
                        ✕
                      </button>
                    </AnimatedCard>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}

      <FinanceTxDialog open={addTxOpen} onClose={() => setAddTxOpen(false)} montantRef={montantRef} />
      <FinanceSubscriptionDialog open={addSubOpen} onClose={() => setAddSubOpen(false)} />
      <FinanceBudgetDialog open={addBudOpen} onClose={() => setAddBudOpen(false)} />
      <FinanceBalanceDialog
        open={soldeOpen}
        current={soldeReel ?? 0}
        onClose={() => setSoldeOpen(false)}
      />
    </div>
  )
}
