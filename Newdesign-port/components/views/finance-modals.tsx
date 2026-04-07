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
  const j = sub.jourPrelevement
  if (sub.period === 'daily') {
    if (sub.moisActifs?.length) {
      return `Chaque jour, sur les mois que tu as choisis — tout est calculé à partir de cette fiche, sans ressaisie.`
    }
    return `Chaque jour — une seule configuration, le total du mois est dérivé automatiquement.`
  }
  if (sub.period === 'yearly') {
    const d = new Date(sub.dateDebut + 'T12:00:00')
    const monthName = MOIS_COURTS[d.getMonth()]
    return `Une fois par an en ${monthName}, le ${j}. Reconduit tout seul chaque année${sub.sansFin ? '' : ` jusqu’au ${sub.finLe}`}.`
  }
  if (!sub.moisActifs?.length) {
    return `Chaque mois, le ${j} — comme un forfait : tu ne le retapes pas.`
  }
  const labels = [...sub.moisActifs].sort((a, b) => a - b).map((m) => MOIS_COURTS[m])
  return `Chaque année, les mêmes mois : ${labels.join(', ')}, le ${j}. Ex. transport scolaire (sept.–juin) : une saisie suffit, ça revient chaque année.`
}

export type SubscriptionPrefill = {
  libelle?: string
  montant?: string
  categorie?: string
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
            Pour un achat ponctuel aujourd’hui, enregistre ici. Pour quelque chose qui revient tout seul (forfait,
            loyer…), utilise le bouton ci-dessous : tu ne le resaisiras plus.
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
  const prefillAppliedRef = useRef(false)

  useEffect(() => {
    if (!open) {
      prefillAppliedRef.current = false
      return
    }
    if (!prefill || prefillAppliedRef.current) return
    prefillAppliedRef.current = true
    if (prefill.libelle != null) setLibelle(prefill.libelle)
    if (prefill.montant != null) setMontant(prefill.montant)
    if (prefill.categorie != null) setCategorie(prefill.categorie)
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
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Prélèvement automatique</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Tu remplis cette fiche <strong>une seule fois</strong>. L’application réapplique la même règle chaque mois ou
          chaque année (forfait SFR tous les mois, SNCF septembre–juin chaque année, etc.) — pas besoin de recréer la
          dépense à la main.
        </p>

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
            placeholder="Montant prélevé à chaque fois (€)"
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
              'Le mois du prélèvement est celui de l’« échéance de référence » à l’étape 4 (modifie cette date pour changer le mois).'}
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
            <label className="text-xs font-medium text-muted-foreground">Échéance de référence (première prise en compte)</label>
            <Input type="date" className="mt-1" value={dateDebut} onChange={(e) => setDateDebut(e.target.value)} />
            <p className="mt-1 text-xs text-muted-foreground">
              Sert de point de départ dans le calendrier ; en mode annuel, le <strong>mois</strong> de cette date fixe le
              mois du prélèvement annuel.
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
