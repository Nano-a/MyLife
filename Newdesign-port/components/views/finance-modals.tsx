'use client'

import type { RefObject } from 'react'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import type {
  FinanceBudget,
  FinanceSubscription,
  FinanceTxType,
  SubscriptionBillingPeriod,
} from '@mylife/core'
import { MOIS_COURTS } from '@mylife/core'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { db } from '@/lib/mylife/db'
import { cn } from '@/lib/utils'

export const CAT_DEPENSE = [
  'alimentation',
  'loisirs',
  'transport',
  'abonnement',
  'soin',
  'vêtements',
  'logement',
  'autre',
] as const
export const CAT_REVENU = ['salaire', 'freelance', 'vente', 'cadeau', 'investissement', 'autre'] as const
export const MOIS_SCOLAIRE = [8, 9, 10, 11, 0, 1, 2, 3, 4, 5]
export const EMOJI_TYPE: Record<FinanceTxType, string> = {
  depense: '💸',
  revenu: '💰',
  abonnement: '🔄',
  gain: '📈',
  epargne: '🏦',
}
export const BUDGET_COLORS = [
  '#7c3aed',
  '#2563eb',
  '#059669',
  '#dc2626',
  '#d97706',
  '#db2777',
  '#0891b2',
  '#65a30d',
  '#ea580c',
]

export function FinanceTxDialog({
  open,
  onClose,
  montantRef: montantRefProp,
}: {
  open: boolean
  onClose: () => void
  montantRef?: RefObject<HTMLInputElement | null>
}) {
  const innerRef = useRef<HTMLInputElement>(null)
  const montantRef = montantRefProp ?? innerRef
  const [type, setType] = useState<FinanceTxType>('depense')
  const [montant, setMontant] = useState('')
  const [categorie, setCategorie] = useState('alimentation')
  const [commentaire, setComment] = useState('')
  const [superflue, setSuperflue] = useState(false)

  const cats =
    type === 'revenu' || type === 'gain' ? [...CAT_REVENU] : [...CAT_DEPENSE]

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const m = Number(montant.replace(',', '.'))
    if (!m || m <= 0) return
    await db.transactions.add({
      id: crypto.randomUUID(),
      type,
      montant: m,
      categorie,
      commentaire: commentaire.trim() || undefined,
      date: new Date().toISOString().slice(0, 10),
      createdAt: Date.now(),
      ...(type === 'depense' && superflue ? { superflue: true } : {}),
    })
    toast.success(`${EMOJI_TYPE[type]} ${m.toLocaleString('fr-FR')} € enregistré`)
    setMontant('')
    setComment('')
    setSuperflue(false)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nouvelle transaction</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {(['depense', 'revenu', 'gain', 'epargne'] as FinanceTxType[]).map((ty) => (
              <button
                key={ty}
                type="button"
                onClick={() => {
                  setType(ty)
                  setCategorie(
                    ty === 'revenu' || ty === 'gain' ? 'salaire' : 'alimentation'
                  )
                }}
                className={cn(
                  'flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-sm',
                  type === ty
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground'
                )}
              >
                {EMOJI_TYPE[ty]}{' '}
                {ty === 'depense'
                  ? 'Dépense'
                  : ty === 'revenu'
                    ? 'Revenu'
                    : ty === 'epargne'
                      ? 'Épargne'
                      : 'Gain'}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Prélèvement récurrent → onglet <strong>Abonnements</strong>.
          </p>
          <Input
            ref={montantRef}
            type="number"
            inputMode="decimal"
            placeholder="Montant (€)"
            value={montant}
            onChange={(e) => setMontant(e.target.value)}
            className="text-lg font-semibold"
          />
          <div className="flex flex-wrap gap-2">
            {cats.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategorie(c)}
                className={cn(
                  'rounded-xl border px-3 py-1.5 text-sm capitalize',
                  categorie === c
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground'
                )}
              >
                {c}
              </button>
            ))}
          </div>
          <Input
            placeholder="Commentaire (ex. Leclerc, Netflix…)"
            value={commentaire}
            onChange={(e) => setComment(e.target.value)}
          />
          {type === 'depense' && (
            <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={superflue}
                onChange={(e) => setSuperflue(e.target.checked)}
                className="rounded border-border"
              />
              Dépense superflue (hors besoin essentiel)
            </label>
          )}
          <Button type="submit" className="w-full">
            Enregistrer
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function FinanceSubscriptionDialog({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const today = new Date().toISOString().slice(0, 10)
  const [libelle, setLibelle] = useState('')
  const [montant, setMontant] = useState('')
  const [categorie, setCategorie] = useState('abonnement')
  const [commentaire, setCommentaire] = useState('')
  const [period, setPeriod] = useState<SubscriptionBillingPeriod>('monthly')
  const [jour, setJour] = useState(5)
  const [tousLesMois, setTousLesMois] = useState(true)
  const [moisSel, setMoisSel] = useState<Set<number>>(() => new Set(MOIS_SCOLAIRE))
  const [sansFin, setSansFin] = useState(true)
  const [finLe, setFinLe] = useState('')
  const [dateDebut, setDateDebut] = useState(today)

  function toggleMois(m: number) {
    setMoisSel((prev) => {
      const n = new Set(prev)
      if (n.has(m)) n.delete(m)
      else n.add(m)
      return n
    })
  }

  function presetScolaire() {
    setTousLesMois(false)
    setMoisSel(new Set(MOIS_SCOLAIRE))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const m = Number(montant.replace(',', '.'))
    if (!libelle.trim() || !m || m <= 0) return
    if (!sansFin && !finLe) return
    if (!tousLesMois && moisSel.size === 0) return

    const moisActifs = tousLesMois ? undefined : [...moisSel].sort((a, b) => a - b)
    const sub: FinanceSubscription = {
      id: crypto.randomUUID(),
      libelle: libelle.trim(),
      montant: m,
      categorie,
      commentaire: commentaire.trim() || undefined,
      jourPrelevement: period === 'daily' ? 1 : Math.min(31, Math.max(1, jour)),
      period,
      moisActifs,
      sansFin,
      finLe: sansFin ? undefined : finLe,
      dateDebut,
      createdAt: Date.now(),
    }
    await db.subscriptions.add(sub)
    toast.success(`Abonnement « ${sub.libelle} » enregistré`)
    setLibelle('')
    setMontant('')
    setCommentaire('')
    setTousLesMois(true)
    setSansFin(true)
    setFinLe('')
    setDateDebut(new Date().toISOString().slice(0, 10))
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Abonnement récurrent</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <Input
            placeholder="Libellé (ex. Forfait, SNCF…)"
            value={libelle}
            onChange={(e) => setLibelle(e.target.value)}
          />
          <Input
            type="number"
            inputMode="decimal"
            placeholder="Montant (€)"
            value={montant}
            onChange={(e) => setMontant(e.target.value)}
            className="text-lg font-semibold"
          />
          <div className="flex flex-wrap gap-2">
            {CAT_DEPENSE.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategorie(c)}
                className={cn(
                  'rounded-xl border px-3 py-1.5 text-sm capitalize',
                  categorie === c
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground'
                )}
              >
                {c}
              </button>
            ))}
          </div>
          <Input
            placeholder="Note (optionnel)"
            value={commentaire}
            onChange={(e) => setCommentaire(e.target.value)}
          />
          <div>
            <label className="text-xs text-muted-foreground">Rythme</label>
            <select
              className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
              value={period}
              onChange={(e) => setPeriod(e.target.value as SubscriptionBillingPeriod)}
            >
              <option value="monthly">Chaque mois (même jour)</option>
              <option value="yearly">Une fois par an</option>
              <option value="daily">Chaque jour</option>
            </select>
          </div>
          {period !== 'daily' && (
            <div>
              <label className="text-xs text-muted-foreground">Jour du prélèvement (1–31)</label>
              <Input
                type="number"
                min={1}
                max={31}
                className="mt-1"
                value={jour}
                onChange={(e) => setJour(Number(e.target.value) || 1)}
              />
            </div>
          )}
          <div>
            <label className="text-xs text-muted-foreground">Date de début / référence</label>
            <Input
              type="date"
              className="mt-1"
              value={dateDebut}
              onChange={(e) => setDateDebut(e.target.value)}
            />
          </div>
          {period !== 'daily' && (
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
                  <Button type="button" variant="outline" size="sm" onClick={presetScolaire}>
                    Préréglage sept. → juin
                  </Button>
                  <div className="flex flex-wrap gap-1.5">
                    {MOIS_COURTS.map((label, m0) => (
                      <button
                        key={m0}
                        type="button"
                        onClick={() => toggleMois(m0)}
                        className={cn(
                          'rounded-lg border px-2 py-1 text-xs',
                          moisSel.has(m0)
                            ? 'border-primary bg-primary/15 text-primary'
                            : 'border-border text-muted-foreground'
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
          {period === 'daily' && (
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
                      className={cn(
                        'rounded-lg border px-2 py-1 text-xs',
                        moisSel.has(m0)
                          ? 'border-primary bg-primary/15 text-primary'
                          : 'border-border text-muted-foreground'
                      )}
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
            Sans date de fin
          </label>
          {!sansFin && (
            <Input type="date" value={finLe} onChange={(e) => setFinLe(e.target.value)} />
          )}
          <Button type="submit" className="w-full">
            Enregistrer l’abonnement
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function FinanceBudgetDialog({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const [categorie, setCategorie] = useState('alimentation')
  const [plafond, setPlafond] = useState('')
  const [couleur, setCouleur] = useState(BUDGET_COLORS[0]!)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const p = Number(plafond.replace(',', '.'))
    if (!p || p <= 0) return
    const budget: FinanceBudget = {
      id: crypto.randomUUID(),
      categorie,
      plafondMensuel: p,
      couleur,
      actif: true,
      createdAt: Date.now(),
    }
    await db.budgets.add(budget)
    toast.success(`Budget ${categorie} : ${p} €/mois`)
    setPlafond('')
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouveau budget mensuel</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {CAT_DEPENSE.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategorie(c)}
                className={cn(
                  'rounded-xl border px-3 py-1.5 text-sm capitalize',
                  categorie === c
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground'
                )}
              >
                {c}
              </button>
            ))}
          </div>
          <Input
            type="number"
            inputMode="decimal"
            placeholder="Plafond mensuel (€)"
            value={plafond}
            onChange={(e) => setPlafond(e.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            {BUDGET_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCouleur(c)}
                className="h-8 w-8 rounded-full border-2 transition-transform hover:scale-110"
                style={{
                  background: c,
                  borderColor: couleur === c ? 'var(--foreground)' : 'transparent',
                }}
              />
            ))}
          </div>
          <Button type="submit" className="w-full">
            Créer le budget
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function FinanceBalanceDialog({
  open,
  current,
  onClose,
}: {
  open: boolean
  current: number
  onClose: () => void
}) {
  const [v, setV] = useState(String(current))

  useEffect(() => {
    if (open) setV(String(current))
  }, [open, current])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const solde = Number(v.replace(',', '.'))
    if (Number.isNaN(solde)) return
    await db.balanceSnapshots.add({
      id: crypto.randomUUID(),
      date: new Date().toISOString().slice(0, 10),
      solde,
    })
    toast.success(`Solde mis à jour : ${solde.toLocaleString('fr-FR')} €`)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Solde actuel</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <Input
            type="number"
            inputMode="decimal"
            value={v}
            onChange={(e) => setV(e.target.value)}
            placeholder="Solde (€)"
            className="text-lg font-semibold"
          />
          <Button type="submit" className="w-full">
            Enregistrer
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
