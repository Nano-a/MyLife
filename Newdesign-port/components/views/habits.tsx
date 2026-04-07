'use client'

import { useLiveQuery } from 'dexie-react-hooks'
import type { RefObject } from 'react'
import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { computeDayScore } from '@mylife/core'
import type { Habit, HabitCompletion } from '@mylife/core'
import { AnimatedCard } from '@/components/animated-card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { LifeModal } from '@/components/life-modal'
import { db } from '@/lib/mylife/db'
import { todayISO } from '@/lib/mylife/lib/dateUtils'
import { habitsDueToday } from '@/lib/mylife/lib/habitsDue'
import { useStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import { Droplets, Plus } from 'lucide-react'

type HabitTab = 'aujourdhui' | 'toutes' | 'archives'

const COULEURS = [
  '#7c3aed',
  '#2563eb',
  '#059669',
  '#dc2626',
  '#d97706',
  '#db2777',
  '#0891b2',
  '#65a30d',
]

function ScoreRing({ score, size, stroke }: { score: number; size: number; stroke: number }) {
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0 -rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        className="stroke-border"
        strokeWidth={stroke}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        className="stroke-primary"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={circ * (1 - score / 100)}
      />
    </svg>
  )
}

function computeStreak(
  habit: Habit,
  rows: (HabitCompletion & { id: string })[],
  _todayDow: number
): number {
  const byDate = new Map<string, boolean>()
  for (const r of rows) {
    if (r.habitId === habit.id && r.fait) byDate.set(r.date, true)
  }
  const d = new Date()
  let streak = 0
  for (let i = 0; i < 400; i++) {
    const iso = d.toISOString().slice(0, 10)
    const dow = d.getDay()
    const due = habitsDueToday([habit], dow)
    if (due.length === 0) {
      d.setDate(d.getDate() - 1)
      continue
    }
    if (!byDate.get(iso)) break
    streak++
    d.setDate(d.getDate() - 1)
  }
  return streak
}

function HabitRow({
  habit,
  done,
  streak,
  showToggle,
  showArchived,
  date,
  completion,
  onToggle,
  onEdit,
  onStats,
  onArchive,
  onDelete,
  onQuantiteChange,
}: {
  habit: Habit
  done: boolean
  streak: number
  showToggle: boolean
  showArchived: boolean
  date: string
  completion: (HabitCompletion & { id: string }) | undefined
  onToggle: () => void
  onEdit: () => void
  onStats: () => void
  onArchive: () => void
  onDelete: () => void
  onQuantiteChange: (n: number) => void
}) {
  const [pop, setPop] = useState(false)

  function handleToggle() {
    if (!done) {
      setPop(true)
      setTimeout(() => setPop(false), 350)
    }
    onToggle()
  }

  return (
    <li
      className={cn(
        'flex items-center gap-3 rounded-2xl border px-4 py-3 transition-colors',
        done ? 'border-primary/30 bg-primary/5' : 'border-border bg-card/40'
      )}
      style={done ? {} : { borderLeftWidth: 3, borderLeftColor: habit.couleur }}
    >
      {showToggle && habit.type === 'oui_non' && (
        <button
          type="button"
          onClick={handleToggle}
          aria-label={done ? 'Décocher' : 'Cocher'}
          className={cn(
            'grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 transition-all',
            done ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background text-transparent',
            pop && 'scale-110'
          )}
        >
          <svg
            viewBox="0 0 12 10"
            width="12"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="1,5 4.5,9 11,1" />
          </svg>
        </button>
      )}

      {showToggle && habit.type === 'quantite' && (
        <div className="flex shrink-0 items-center gap-1">
          <Input
            type="number"
            min={0}
            className="h-8 w-16 px-1 text-center text-sm"
            value={completion?.valeur ?? ''}
            placeholder="0"
            onChange={(e) => {
              const v = Number(e.target.value)
              if (!Number.isNaN(v)) onQuantiteChange(v)
            }}
          />
          <span className="text-xs text-muted-foreground">
            / {habit.objectifQuantite ?? '?'} {habit.uniteQuantite ?? ''}
          </span>
        </div>
      )}

      <span className="shrink-0 text-xl leading-none" aria-hidden>
        {habit.icone}
      </span>

      <button type="button" onClick={onStats} className="min-w-0 flex-1 text-left">
        <p className={cn('font-medium leading-tight', done && 'text-muted-foreground line-through')}>
          {habit.nom}
        </p>
        {streak > 0 && (
          <p className="text-xs text-muted-foreground">
            <span className="inline-block">🔥</span> {streak} j
          </p>
        )}
      </button>

      <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity [li:hover_&]:opacity-100">
        {!showArchived && (
          <button
            type="button"
            title="Modifier"
            onClick={onEdit}
            className="grid h-7 w-7 place-items-center rounded-full text-sm text-muted-foreground hover:text-foreground"
          >
            ✏️
          </button>
        )}
        <button
          type="button"
          title={showArchived ? 'Restaurer' : 'Archiver'}
          onClick={onArchive}
          className="grid h-7 w-7 place-items-center rounded-full text-sm text-muted-foreground hover:text-foreground"
        >
          {showArchived ? '↩' : '📦'}
        </button>
        {showArchived && (
          <button
            type="button"
            title="Supprimer"
            onClick={onDelete}
            className="grid h-7 w-7 place-items-center rounded-full text-sm text-muted-foreground hover:text-destructive"
          >
            🗑
          </button>
        )}
      </div>
    </li>
  )
}

function AddHabitModal({
  open,
  onClose,
  nomRef,
  objectives,
  onAdd,
}: {
  open: boolean
  onClose: () => void
  nomRef: RefObject<HTMLInputElement | null>
  objectives: { id: string; titre: string }[]
  onAdd: (
    nom: string,
    icone: string,
    couleur: string,
    frequence: Habit['frequence'],
    jours: number[] | undefined,
    linkedObjectiveId: string | undefined,
    type: Habit['type'],
    objectifQuantite: number | undefined,
    uniteQuantite: string | undefined,
    heureRappel: string | undefined,
    categorie: string
  ) => void
}) {
  const [nom, setNom] = useState('')
  const [icone, setIcone] = useState('✅')
  const [couleur, setCouleur] = useState(COULEURS[0]!)
  const [frequence, setFrequence] = useState<Habit['frequence']>('quotidien')
  const [jours, setJours] = useState<number[]>([1, 2, 3, 4, 5])
  const [linkedObjectiveId, setLinkedObjectiveId] = useState('')
  const [type, setType] = useState<Habit['type']>('oui_non')
  const [objectifQuantite, setObjectifQuantite] = useState('8')
  const [uniteQuantite, setUniteQuantite] = useState('verres')
  const [heureRappel, setHeureRappel] = useState('')
  const [categorie, setCategorie] = useState('perso')
  const JOURS_LABELS = ['D', 'L', 'M', 'M', 'J', 'V', 'S']
  const CATS = ['perso', 'santé', 'travail', 'sport', 'études', 'spiritualité', 'autre']

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!nom.trim()) return
    const oq =
      type === 'quantite' ? Math.max(1, Number(objectifQuantite.replace(',', '.')) || 1) : undefined
    onAdd(
      nom,
      icone,
      couleur,
      frequence,
      frequence === 'jours_specifiques' ? jours : undefined,
      linkedObjectiveId || undefined,
      type,
      oq,
      type === 'quantite' ? uniteQuantite.trim() || 'unités' : undefined,
      heureRappel.trim() || undefined,
      categorie
    )
    setNom('')
    setIcone('✅')
    setLinkedObjectiveId('')
    onClose()
  }

  return (
    <LifeModal open={open} onClose={onClose} title="Nouvelle habitude">
      <form onSubmit={submit} className="space-y-4">
        <div className="flex gap-2">
          <Input
            ref={nomRef}
            className="flex-1"
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            placeholder="Méditation, lecture, sport…"
          />
          <Input
            className="w-14 text-center text-xl"
            value={icone}
            onChange={(e) => setIcone(e.target.value)}
            aria-label="Icône"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {['📚', '🏃', '🧘', '💊', '🥦', '✍️', '🎸', '🌿', '🙏', '💤', '🧹', '🚿', '🧠', '💧', '🎯', '🏋️'].map(
            (em) => (
              <button
                key={em}
                type="button"
                onClick={() => setIcone(em)}
                className={cn(
                  'rounded-xl p-2 text-xl',
                  icone === em ? 'bg-primary/20 ring-1 ring-primary' : 'bg-muted'
                )}
              >
                {em}
              </button>
            )
          )}
        </div>

        <div>
          <p className="mb-2 text-xs text-muted-foreground">Type</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setType('oui_non')}
              className={cn(
                'rounded-xl border py-2 text-sm',
                type === 'oui_non' ? 'border-primary bg-primary/10 text-primary' : 'border-border'
              )}
            >
              Oui / non
            </button>
            <button
              type="button"
              onClick={() => setType('quantite')}
              className={cn(
                'rounded-xl border py-2 text-sm',
                type === 'quantite' ? 'border-primary bg-primary/10 text-primary' : 'border-border'
              )}
            >
              Quantité
            </button>
          </div>
        </div>

        {type === 'quantite' && (
          <div className="flex gap-2">
            <Input
              type="number"
              min={1}
              className="flex-1"
              value={objectifQuantite}
              onChange={(e) => setObjectifQuantite(e.target.value)}
              placeholder="Objectif"
            />
            <Input
              className="flex-1"
              value={uniteQuantite}
              onChange={(e) => setUniteQuantite(e.target.value)}
              placeholder="Unité (verres, pages…)"
            />
          </div>
        )}

        <div>
          <p className="mb-2 text-xs text-muted-foreground">Catégorie</p>
          <div className="flex flex-wrap gap-2">
            {CATS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategorie(c)}
                className={cn(
                  'rounded-xl border px-3 py-1.5 text-sm capitalize',
                  categorie === c ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground'
                )}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs text-muted-foreground">Rappel (optionnel)</label>
          <Input
            type="time"
            className="mt-1"
            value={heureRappel}
            onChange={(e) => setHeureRappel(e.target.value)}
          />
        </div>

        <div>
          <p className="mb-2 text-xs text-muted-foreground">Couleur</p>
          <div className="flex flex-wrap gap-2">
            {COULEURS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCouleur(c)}
                className="h-7 w-7 rounded-full border-2 transition-transform hover:scale-110"
                style={{ background: c, borderColor: couleur === c ? 'hsl(var(--foreground))' : 'transparent' }}
              />
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {(
            [
              ['quotidien', 'Tous les jours'],
              ['jours_specifiques', 'Jours spécifiques'],
            ] as const
          ).map(([f, l]) => (
            <button
              key={f}
              type="button"
              onClick={() => setFrequence(f)}
              className={cn(
                'rounded-xl border py-2 text-sm',
                frequence === f ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground'
              )}
            >
              {l}
            </button>
          ))}
        </div>

        {frequence === 'jours_specifiques' && (
          <div className="flex justify-between gap-1">
            {JOURS_LABELS.map((l, i) => (
              <button
                key={i}
                type="button"
                onClick={() =>
                  setJours((prev) => (prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]))
                }
                className={cn(
                  'flex-1 rounded-lg py-2 text-sm font-medium',
                  jours.includes(i) ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                )}
              >
                {l}
              </button>
            ))}
          </div>
        )}

        <div>
          <label className="text-xs text-muted-foreground">Lier à un objectif (optionnel)</label>
          <select
            className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2"
            value={linkedObjectiveId}
            onChange={(e) => setLinkedObjectiveId(e.target.value)}
          >
            <option value="">— Aucun —</option>
            {objectives.map((o) => (
              <option key={o.id} value={o.id}>
                {o.titre}
              </option>
            ))}
          </select>
        </div>

        <Button type="submit" className="w-full">
          Créer l&apos;habitude
        </Button>
      </form>
    </LifeModal>
  )
}

function EditHabitModal({
  habit,
  onClose,
  onSave,
}: {
  habit: Habit
  onClose: () => void
  onSave: (p: Partial<Habit>) => void
}) {
  const objectives = useLiveQuery(() => db.objectives.toArray(), []) ?? []
  const [nom, setNom] = useState(habit.nom)
  const [icone, setIcone] = useState(habit.icone)
  const [couleur, setCouleur] = useState(habit.couleur)
  const [linkedObjectiveId, setLinkedObjectiveId] = useState(habit.linkedObjectiveId ?? '')

  return (
    <LifeModal open onClose={onClose} title="Modifier l'habitude">
      <div className="space-y-4">
        <div className="flex gap-2">
          <Input className="flex-1" value={nom} onChange={(e) => setNom(e.target.value)} autoFocus />
          <Input
            className="w-14 text-center text-xl"
            value={icone}
            onChange={(e) => setIcone(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {COULEURS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCouleur(c)}
              className="h-7 w-7 rounded-full border-2 transition-transform hover:scale-110"
              style={{ background: c, borderColor: couleur === c ? 'hsl(var(--foreground))' : 'transparent' }}
            />
          ))}
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Objectif lié</label>
          <select
            className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2"
            value={linkedObjectiveId}
            onChange={(e) => setLinkedObjectiveId(e.target.value)}
          >
            <option value="">— Aucun —</option>
            {objectives.map((o) => (
              <option key={o.id} value={o.id}>
                {o.titre}
              </option>
            ))}
          </select>
        </div>
        <Button
          type="button"
          className="w-full"
          onClick={() => {
            if (nom.trim()) {
              onSave({
                nom: nom.trim(),
                icone,
                couleur,
                linkedObjectiveId: linkedObjectiveId || undefined,
              })
            }
          }}
        >
          Enregistrer
        </Button>
      </div>
    </LifeModal>
  )
}

function HabitStatsModal({
  habit,
  completions,
  onClose,
}: {
  habit: Habit
  completions: (HabitCompletion & { id: string })[]
  onClose: () => void
}) {
  const mine = completions.filter((c) => c.habitId === habit.id)
  const total = mine.length
  const done = mine.filter((c) => c.fait).length
  const rate = total > 0 ? Math.round((done / total) * 100) : 0
  const today = new Date()
  const cells: { date: string; fait: boolean }[] = []
  for (let i = 83; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const iso = d.toISOString().slice(0, 10)
    cells.push({ date: iso, fait: mine.some((c) => c.date === iso && c.fait) })
  }
  const streak = computeStreak(habit, completions, today.getDay())

  return (
    <LifeModal open onClose={onClose} title={`${habit.icone} ${habit.nom}`}>
      <div className="space-y-5">
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl bg-muted/50 p-3 text-center">
            <p className="text-2xl font-bold text-primary">{streak}</p>
            <p className="text-xs text-muted-foreground">Jours de suite</p>
          </div>
          <div className="rounded-xl bg-muted/50 p-3 text-center">
            <p className="text-2xl font-bold">{rate}%</p>
            <p className="text-xs text-muted-foreground">Taux global</p>
          </div>
          <div className="rounded-xl bg-muted/50 p-3 text-center">
            <p className="text-2xl font-bold">{done}</p>
            <p className="text-xs text-muted-foreground">Complétions</p>
          </div>
        </div>
        <div>
          <p className="mb-2 text-sm font-medium">12 dernières semaines (idéal vs réel)</p>
          <div className="grid gap-0.5" style={{ gridTemplateColumns: 'repeat(12, 1fr)' }}>
            {cells.map(({ date: dt, fait }) => (
              <div
                key={dt}
                title={dt}
                className="aspect-square rounded-sm"
                style={{
                  background: fait ? habit.couleur : 'hsl(var(--border))',
                  opacity: fait ? 1 : 0.35,
                }}
              />
            ))}
          </div>
          <div className="mt-1 flex justify-between text-[0.6rem] text-muted-foreground">
            <span>−12 sem.</span>
            <span>Aujourd&apos;hui</span>
          </div>
        </div>
      </div>
    </LifeModal>
  )
}

export function HabitsView() {
  const { setCurrentTab } = useStore()
  const date = todayISO()
  const habits = useLiveQuery(() => db.habits.toArray(), []) ?? []
  const objectives = useLiveQuery(() => db.objectives.toArray(), []) ?? []
  const completions =
    useLiveQuery(() => db.habitCompletions.where('date').equals(date).toArray(), [date]) ?? []
  const allCompletions = useLiveQuery(() => db.habitCompletions.toArray(), []) ?? []

  const [tab, setTab] = useState<HabitTab>('aujourdhui')
  const [addOpen, setAddOpen] = useState(false)
  const [editHabit, setEditHabit] = useState<Habit | null>(null)
  const [statsHabit, setStatsHabit] = useState<Habit | null>(null)
  const nomRef = useRef<HTMLInputElement>(null)

  const dow = new Date().getDay()
  const active = habits.filter((h) => !h.archived)
  const archived = habits.filter((h) => h.archived)
  const due = habitsDueToday(active, dow)
  const score = computeDayScore(habits, completions, date)
  const doneCnt = due.filter((h) =>
    completions.some((c) => c.id === `${h.id}_${date}` && c.fait)
  ).length

  async function addHabit(
    nom: string,
    icone: string,
    couleur: string,
    frequence: Habit['frequence'],
    jours: number[] | undefined,
    linkedObjectiveId: string | undefined,
    type: Habit['type'],
    objectifQuantite: number | undefined,
    uniteQuantite: string | undefined,
    heureRappel: string | undefined,
    categorie: string
  ) {
    const h: Habit = {
      id: crypto.randomUUID(),
      nom: nom.trim(),
      icone,
      couleur,
      type,
      frequence,
      joursSemaine: frequence === 'jours_specifiques' ? jours : undefined,
      categorie,
      linkedObjectiveId: linkedObjectiveId || undefined,
      objectifQuantite: type === 'quantite' ? objectifQuantite : undefined,
      uniteQuantite: type === 'quantite' ? uniteQuantite : undefined,
      heureRappel: heureRappel || undefined,
      createdAt: Date.now(),
    }
    await db.habits.add(h)
    toast.success(`Habitude « ${h.nom} » ajoutée`)
    setAddOpen(false)
  }

  async function saveEdit(patch: Partial<Habit>) {
    if (!editHabit) return
    await db.habits.update(editHabit.id, patch)
    toast.success('Habitude mise à jour')
    setEditHabit(null)
  }

  async function toggleArchive(h: Habit) {
    await db.habits.update(h.id, { archived: !h.archived })
    toast.info(h.archived ? `« ${h.nom} » restaurée` : `« ${h.nom} » archivée`)
  }

  async function deleteHabit(h: Habit) {
    if (!confirm(`Supprimer définitivement « ${h.nom} » et tout son historique ?`)) return
    await db.habits.delete(h.id)
    await db.habitCompletions.where('habitId').equals(h.id).delete()
    toast.info(`« ${h.nom} » supprimé`)
  }

  async function toggle(h: Habit) {
    const id = `${h.id}_${date}`
    const existing = await db.habitCompletions.get(id)
    const next = !existing?.fait
    await db.habitCompletions.put({ id, habitId: h.id, date, fait: next })
    if (next) toast.success(`${h.icone} ${h.nom} — fait !`)
  }

  async function setQuantite(h: Habit, valeur: number) {
    const id = `${h.id}_${date}`
    const obj = h.objectifQuantite ?? 1
    const fait = valeur >= obj
    await db.habitCompletions.put({ id, habitId: h.id, date, fait, valeur })
  }

  const displayedHabits = tab === 'toutes' ? active : tab === 'archives' ? archived : due

  return (
    <div className="mx-auto max-w-7xl space-y-5 p-4 md:p-8">
      <header className="flex animate-fade-up items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">Habitudes</h1>
          <p className="text-sm text-muted-foreground">
            {doneCnt}/{due.length} aujourd&apos;hui · {active.length} habitude{active.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            className="rounded-full"
            title="Hydratation"
            onClick={() => setCurrentTab('hydration')}
          >
            <Droplets className="h-5 w-5" />
          </Button>
          <Button
            size="icon"
            className="rounded-full"
            onClick={() => {
              setAddOpen(true)
              setTimeout(() => nomRef.current?.focus(), 80)
            }}
            aria-label="Nouvelle habitude"
          >
            <Plus className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <AnimatedCard className="flex items-center gap-4 p-4">
        <ScoreRing score={score} size={56} stroke={5} />
        <div>
          <p className="font-semibold">Score du jour</p>
          <p className="text-sm text-muted-foreground">
            {doneCnt} sur {due.length} habitudes complétées
          </p>
        </div>
      </AnimatedCard>

      <div className="flex gap-1 rounded-xl border border-border bg-muted/30 p-1">
        {(
          [
            ['aujourdhui', "Aujourd'hui"],
            ['toutes', 'Toutes'],
            ['archives', 'Archives'],
          ] as const
        ).map(([t, l]) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              'flex-1 rounded-lg py-2 text-sm font-medium transition-colors',
              tab === t ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {l}
          </button>
        ))}
      </div>

      {displayedHabits.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center">
          <p className="text-2xl">✨</p>
          <p className="mt-2 text-sm text-muted-foreground">
            {tab === 'archives'
              ? 'Aucune habitude archivée.'
              : 'Aucune habitude — crée-en une avec le bouton +'}
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {displayedHabits.map((h) => {
            const cid = `${h.id}_${date}`
            const completion = allCompletions.find((c) => c.id === cid)
            const done =
              tab === 'aujourdhui'
                ? completions.some((c) => c.id === cid && c.fait)
                : false
            const streak = computeStreak(h, allCompletions, dow)
            return (
              <HabitRow
                key={h.id}
                habit={h}
                done={done}
                streak={streak}
                date={date}
                completion={completion}
                showToggle={tab === 'aujourdhui'}
                showArchived={tab === 'archives'}
                onToggle={() => void toggle(h)}
                onQuantiteChange={(n) => void setQuantite(h, n)}
                onEdit={() => setEditHabit(h)}
                onStats={() => setStatsHabit(h)}
                onArchive={() => void toggleArchive(h)}
                onDelete={() => void deleteHabit(h)}
              />
            )
          })}
        </ul>
      )}

      <AddHabitModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        nomRef={nomRef}
        objectives={objectives.map((o) => ({ id: o.id, titre: o.titre }))}
        onAdd={addHabit}
      />
      {editHabit && (
        <EditHabitModal key={editHabit.id} habit={editHabit} onClose={() => setEditHabit(null)} onSave={saveEdit} />
      )}
      {statsHabit && (
        <HabitStatsModal
          habit={statsHabit}
          completions={allCompletions}
          onClose={() => setStatsHabit(null)}
        />
      )}
    </div>
  )
}
