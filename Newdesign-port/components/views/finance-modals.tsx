'use client'

import type { ReactNode, RefObject } from 'react'
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
import { Separator } from '@/components/ui/separator'
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

/** Texte affiché dans la liste : pas de « prochaine date », focus sur la règle automatique. */
export function subscriptionFriendlyCaption(sub: FinanceSubscription): string {
  const inflow = sub.flow === 'credit'
  const j = sub.jourPrelevement
  const prefix = inflow ? 'Revenu récurrent : ' : ''
  if (sub.period === 'daily') {
    if (sub.moisActifs?.length) {
      return `${prefix}Chaque jour, sur les mois que tu as choisis — tout est calculé à partir de cette fiche, sans ressaisie.`
    }
    return `${prefix}Chaque jour — une seule configuration, le total du mois est dérivé automatiquement.`
  }
  if (sub.period === 'yearly') {
    const d = new Date(sub.dateDebut + 'T12:00:00')
    const monthName = MOIS_COURTS[d.getMonth()]
    return `${prefix}Une fois par an en ${monthName}, le ${j}. Reconduit tout seul chaque année${sub.sansFin ? '' : ` jusqu’au ${sub.finLe}`}.`
  }
  if (!sub.moisActifs?.length) {
    return `${prefix}Chaque mois, le ${j}${inflow ? ' — montant reçu automatiquement dans le calendrier.' : ' — comme un forfait : tu ne le retapes pas.'}`
  }
  const labels = [...sub.moisActifs].sort((a, b) => a - b).map((m) => MOIS_COURTS[m])
  return `${prefix}Chaque année, les mêmes mois : ${labels.join(', ')}, le ${j}. Ex. transport scolaire (sept.–juin) : une saisie suffit, ça revient chaque année.`
}

export type SubscriptionPrefill = {
  libelle?: string
  montant?: string
  categorie?: string
  flow?: 'debit' | 'credit'
}

function SectionTitle({ n, children }: { n: number; children: ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary/15 text-[0.65rem] text-primary">
        {n}
      </span>
      {children}
    </p>
  )
}

export function FinanceTxDialog({
  open,
  onClose,
  montantRef: montantRefProp,
  onSetupAutomaticDebit,
}: {
  open: boolean
  onClose: () => void
  montantRef?: RefObject<HTMLInputElement | null>
  /** Propose de basculer vers le prélèvement automatique (une seule config). */
  onSetupAutomaticDebit?: (payload: { montant: string; libelle: string; categorie: string }) => void
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
          <DialogTitle>Mouvement ponctuel (aujourd’hui)</DialogTitle>
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
          <div className="rounded-xl border border-border bg-muted/40 px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
            {type === 'depense' && (
              <>
                <strong className="text-foreground">Dépense</strong> : ce que tu as payé une fois aujourd’hui
                (courses, restaurant…). Pour un prélèvement <em>identique chaque mois</em>, va plutôt dans Finances →
                Abonnements → « Prélèvement ou revenu fixe ».
              </>
            )}
            {type === 'revenu' && (
              <>
                <strong className="text-foreground">Revenu</strong> : entrée d’argent ponctuelle que tu veux noter
                aujourd’hui (prime, remboursement…). Pour un salaire ou une aide <em>du même montant chaque mois</em>, utilise
                « Revenu chaque mois » dans l’onglet Abonnements.
              </>
            )}
            {type === 'gain' && (
              <>
                <strong className="text-foreground">Gain</strong> : même idée que revenu (autre libellé pour tes stats).
                Utile si tu sépares salaire régulier vs gains exceptionnels.
              </>
            )}
            {type === 'epargne' && (
              <>
                <strong className="text-foreground">Épargne</strong> : transfert vers l’épargne — comptabilisé à part pour
                voir ce qui sort du « compte courant » sans mélanger avec les dépenses courantes.
              </>
            )}
          </div>
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
          {type === 'depense' && onSetupAutomaticDebit && (
            <div
              className={cn(
                'rounded-xl border p-3',
                categorie === 'abonnement' ? 'border-primary/40 bg-primary/10' : 'border-border bg-muted/30'
              )}
            >
              <p className="text-sm font-medium">
                {categorie === 'abonnement'
                  ? 'C’est un prélèvement qui revient chaque mois ou chaque année ?'
                  : 'Ça se répète toujours aux mêmes dates ?'}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Tu renseignes une fois le montant, le jour et les mois concernés : l’app en déduit les mois suivants
                (ex. SFR chaque mois, SNCF seulement de septembre à juin, chaque année).
              </p>
              <Button
                type="button"
                variant={categorie === 'abonnement' ? 'default' : 'secondary'}
                className="mt-3 w-full"
                onClick={() => {
                  const m = montant.replace(',', '.').trim()
                  if (!m || Number(m) <= 0) {
                    toast.error('Indique d’abord un montant.')
                    return
                  }
                  onSetupAutomaticDebit({
                    montant,
                    libelle: commentaire.trim() || 'Prélèvement',
                    categorie,
                  })
                  onClose()
                }}
              >
                Configurer un prélèvement automatique (recommandé)
              </Button>
            </div>
          )}
          <Button type="submit" className="w-full">
            Enregistrer cette transaction seulement
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function FinanceSubscriptionDialog({
  open,
  onClose,
  prefill,
}: {
  open: boolean
  onClose: () => void
  prefill?: SubscriptionPrefill | null
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
  const [flow, setFlow] = useState<'debit' | 'credit'>('debit')
  const prefillAppliedRef = useRef(false)

  useEffect(() => {
    if (!open) {
      prefillAppliedRef.current = false
      return
    }
    if (!prefill) setFlow('debit')
    if (!prefill || prefillAppliedRef.current) return
    prefillAppliedRef.current = true
    if (prefill.libelle != null) setLibelle(prefill.libelle)
    if (prefill.montant != null) setMontant(prefill.montant)
    if (prefill.categorie != null) setCategorie(prefill.categorie)
    if (prefill.flow != null) {
      setFlow(prefill.flow)
      if (prefill.flow === 'credit' && prefill.categorie == null) {
        setCategorie((c) => ((CAT_DEPENSE as readonly string[]).includes(c) ? 'salaire' : c))
      }
    }
  }, [open, prefill])

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
    setPeriod('monthly')
    setMoisSel(new Set(MOIS_SCOLAIRE))
  }

  function presetForfaitMobile() {
    setTousLesMois(true)
    setPeriod('monthly')
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const m = Number(montant.replace(',', '.'))
    if (!libelle.trim() || !m || m <= 0) return
    if (!sansFin && !finLe) return
    if (period !== 'yearly' && !tousLesMois && moisSel.size === 0) return

    const moisActifs =
      period === 'yearly' ? undefined : tousLesMois ? undefined : [...moisSel].sort((a, b) => a - b)
    const sub: FinanceSubscription = {
      id: crypto.randomUUID(),
      libelle: libelle.trim(),
      montant: m,
      categorie,
      commentaire: commentaire.trim() || undefined,
      ...(flow === 'credit' ? { flow: 'credit' as const } : {}),
      jourPrelevement: period === 'daily' ? 1 : Math.min(31, Math.max(1, jour)),
      period,
      moisActifs,
      sansFin,
      finLe: sansFin ? undefined : finLe,
      dateDebut,
      createdAt: Date.now(),
    }
    await db.subscriptions.add(sub)
    toast.success(`« ${sub.libelle} » enregistré : les prochains mois sont déduits automatiquement.`)
    setLibelle('')
    setMontant('')
    setCommentaire('')
    setTousLesMois(true)
    setSansFin(true)
    setFinLe('')
    setDateDebut(new Date().toISOString().slice(0, 10))
    setFlow('debit')
    onClose()
  }

  const catChoices = flow === 'credit' ? [...CAT_REVENU] : [...CAT_DEPENSE]

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Argent récurrent (une seule saisie)</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Même principe pour les <strong>sorties</strong> (forfait, loyer) et les <strong>entrées</strong> (salaire,
          pension) : tu décris la règle une fois, l’app la répète chaque mois ou chaque année et l’affiche dans le
          calendrier.
        </p>

        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={() => {
              setFlow('debit')
              setCategorie((c) => ((CAT_REVENU as readonly string[]).includes(c) ? 'abonnement' : c))
            }}
            className={cn(
              'flex-1 rounded-xl border px-3 py-2.5 text-left text-sm transition-colors',
              flow === 'debit' ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground'
            )}
          >
            <span className="font-semibold text-foreground">Sort chaque mois / an</span>
            <span className="mt-0.5 block text-xs opacity-90">Forfait, loyer, prélèvement…</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setFlow('credit')
              setCategorie((c) => ((CAT_DEPENSE as readonly string[]).includes(c) ? 'salaire' : c))
            }}
            className={cn(
              'flex-1 rounded-xl border px-3 py-2.5 text-left text-sm transition-colors',
              flow === 'credit' ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground'
            )}
          >
            <span className="font-semibold text-foreground">Entre chaque mois / an</span>
            <span className="mt-0.5 block text-xs opacity-90">Salaire, aide, pension…</span>
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <SectionTitle n={1}>Qu’est-ce que c’est ?</SectionTitle>
          <Input
            placeholder="Nom (ex. Forfait SFR, Abonnement SNCF…)"
            value={libelle}
            onChange={(e) => setLibelle(e.target.value)}
          />
          <Input
            type="number"
            inputMode="decimal"
            placeholder={flow === 'credit' ? 'Montant reçu à chaque fois (€)' : 'Montant prélevé à chaque fois (€)'}
            value={montant}
            onChange={(e) => setMontant(e.target.value)}
            className="text-lg font-semibold"
          />
          <div className="flex flex-wrap gap-2">
            {catChoices.map((c) => (
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
            placeholder="Note interne (optionnel)"
            value={commentaire}
            onChange={(e) => setCommentaire(e.target.value)}
          />

          <Separator />

          <SectionTitle n={2}>À quelle fréquence ça se répète ?</SectionTitle>
          <select
            className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
            value={period}
            onChange={(e) => setPeriod(e.target.value as SubscriptionBillingPeriod)}
          >
            <option value="monthly">Chaque mois (même jour du mois) — idéal forfait, loyer</option>
            <option value="yearly">Une seule fois par an — même date chaque année</option>
            <option value="daily">Chaque jour (cas rare)</option>
          </select>
          <p className="text-xs text-muted-foreground">
            {period === 'monthly' &&
              'Ex. 49 € prélevés le 5 de chaque mois : tu ne retapes rien les mois suivants.'}
            {period === 'yearly' &&
              'En mode annuel, le mois du versement / prélèvement est le mois de la date « À partir de quelle date » (étape 4) — change cette date pour passer par ex. de juin à septembre.'}
            {period === 'daily' && 'Utile seulement si un montant est prélevé chaque jour.'}
          </p>

          <Separator />

          <SectionTitle n={3}>Quel jour du mois ?</SectionTitle>
          {period !== 'daily' ? (
            <>
              <label className="text-xs text-muted-foreground">Jour du prélèvement entre le 1 et le 31</label>
              <Input
                type="number"
                min={1}
                max={31}
                value={jour}
                onChange={(e) => setJour(Number(e.target.value) || 1)}
              />
            </>
          ) : (
            <p className="text-xs text-muted-foreground">Mode « chaque jour » : pas de jour fixe dans le mois.</p>
          )}

          <Separator />

          <SectionTitle n={4}>Quels mois de l’année ?</SectionTitle>
          {period === 'yearly' ? (
            <p className="text-sm text-muted-foreground">
              En mode « une fois par an », seul le mois de la date de référence (ci-dessous) compte. Pour un abonnement
              <strong> plusieurs mois par an</strong> (ex. SNCF de septembre à juin), choisis plutôt « Chaque mois » puis
              « Certains mois seulement » avec le préréglage scolaire.
            </p>
          ) : period === 'daily' ? (
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
          ) : (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" size="sm" onClick={presetForfaitMobile}>
                  Ex. forfait mobile : tous les mois
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={presetScolaire}>
                  Ex. SNCF / fac : sept. → juin chaque année
                </Button>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={tousLesMois}
                  onChange={(e) => setTousLesMois(e.target.checked)}
                />
                Tous les douze mois
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

          <div>
            <label className="text-xs font-medium text-muted-foreground">
              {period === 'yearly'
                ? 'À partir de quelle date (fixe aussi le mois annuel)'
                : 'À partir de quelle date on compte cette fiche'}
            </label>
            <Input type="date" className="mt-1" value={dateDebut} onChange={(e) => setDateDebut(e.target.value)} />
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {period === 'yearly' ? (
                <>
                  <strong className="text-foreground">Mode annuel</strong> : ce n’est pas une « échéance mystérieuse » —
                  c’est simplement <strong>le mois choisi ici</strong> qui dit « chaque année en septembre » (ou autre),
                  plus le jour saisi à l’étape 3. La date complète sert aussi à savoir à partir de quand l’app inclut cette
                  ligne dans tes totaux.
                </>
              ) : (
                <>
                  <strong className="text-foreground">Mode mensuel</strong> : en pratique, mets souvent{' '}
                  <strong>aujourd’hui</strong> ou la date du tout premier prélèvement / virement. Ça ancre la fiche dans le
                  temps ; le jour du mois qui compte pour les répétitions, c’est surtout le champ « jour du prélèvement »
                  ci-dessus.
                </>
              )}
            </p>
          </div>

          <Separator />

          <SectionTitle n={5}>Jusqu’à quand ?</SectionTitle>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={sansFin} onChange={(e) => setSansFin(e.target.checked)} />
            Pour toujours (ex. forfait tant que je ne résilie pas)
          </label>
          {!sansFin && (
            <>
              <label className="text-xs text-muted-foreground">Dernier prélèvement possible au plus tard le</label>
              <Input type="date" value={finLe} onChange={(e) => setFinLe(e.target.value)} />
            </>
          )}

          <Button type="submit" className="w-full">
            Enregistrer — je ne resaisirai plus ce prélèvement
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
