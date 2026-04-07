'use client'

import { useLiveQuery } from 'dexie-react-hooks'
import type { RefObject } from 'react'
import { useRef, useState } from 'react'
import { toast } from 'sonner'
import type { GoalJournalEntry, GoalPriority, GoalStatus, GoalSubtask, Objective } from '@mylife/core'
import { AnimatedCard } from '@/components/animated-card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { LifeModal } from '@/components/life-modal'
import { db } from '@/lib/mylife/db'
import { cn } from '@/lib/utils'

function progressFor(o: Objective): number {
  if (o.progressionManuelle != null) return o.progressionManuelle
  const subs = o.sousObjectifs
  if (subs.length === 0) return 0
  return Math.round((subs.filter((s) => s.fait).length / subs.length) * 100)
}

const PRIORITY_STYLE: Record<GoalPriority, string> = {
  haute: 'bg-red-500/15 text-red-500',
  normale: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  basse: 'bg-green-500/15 text-green-600 dark:text-green-400',
}
const STATUS_EMOJI: Record<GoalStatus, string> = {
  actif: '🎯',
  termine: '✅',
  abandonne: '❌',
  expire: '⏰',
}
const GOAL_COLORS = [
  '#7c3aed',
  '#2563eb',
  '#059669',
  '#dc2626',
  '#d97706',
  '#db2777',
  '#0891b2',
  '#65a30d',
  '#ea580c',
  '#8b5cf6',
]

type ObjTab = 'actif' | 'termine' | 'abandonne'

function GoalCard({ goal, onOpen }: { goal: Objective; onOpen: () => void }) {
  const p = progressFor(goal)
  return (
    <li
      className="cursor-pointer rounded-2xl border border-border bg-card/50 p-4 transition-all hover:-translate-y-0.5 hover:bg-card/80 active:scale-[0.99]"
      style={goal.couleur ? { borderLeftWidth: 3, borderLeftColor: goal.couleur } : undefined}
      onClick={onOpen}
    >
      <div className="flex items-start gap-3">
        <div className="relative h-12 w-12 shrink-0">
          <svg width={48} height={48} viewBox="0 0 48 48" className="-rotate-90 text-border">
            <circle cx={24} cy={24} r={18} fill="none" stroke="currentColor" strokeWidth={5} />
            <circle
              cx={24}
              cy={24}
              r={18}
              fill="none"
              stroke={p >= 100 ? 'hsl(var(--chart-2))' : goal.couleur ?? 'hsl(var(--primary))'}
              strokeWidth={5}
              strokeLinecap="round"
              strokeDasharray={`${(113 * p) / 100} 113`}
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-xs font-bold">{p}%</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-2">
            <p className="font-semibold leading-tight">{goal.titre}</p>
            <span className={cn('rounded-full px-2 py-0.5 text-xs', PRIORITY_STYLE[goal.priorite])}>
              {goal.priorite}
            </span>
          </div>
          {goal.deadline && <p className="text-sm text-muted-foreground">Échéance : {goal.deadline}</p>}
          <p className="text-xs text-muted-foreground">
            {goal.sousObjectifs.filter((s) => s.fait).length}/{goal.sousObjectifs.length} étapes
            {goal.journal.length > 0 &&
              ` · ${goal.journal.length} note${goal.journal.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <span className="shrink-0 text-muted-foreground">›</span>
      </div>
    </li>
  )
}

function GoalDetailModal({ goalId, onClose }: { goalId: string; onClose: () => void }) {
  const goalRaw = useLiveQuery(() => db.objectives.get(goalId), [goalId])
  const [journalText, setJournalText] = useState('')
  const [subtaskTitle, setSubtaskTitle] = useState('')

  if (!goalRaw) return null
  const goal = goalRaw
  const p = progressFor(goal)

  async function addSubtask(e: React.FormEvent) {
    e.preventDefault()
    if (!subtaskTitle.trim()) return
    const subs: GoalSubtask[] = [
      ...goal.sousObjectifs,
      { id: crypto.randomUUID(), titre: subtaskTitle.trim(), fait: false },
    ]
    await db.objectives.update(goalId, { sousObjectifs: subs })
    setSubtaskTitle('')
  }

  async function toggleSub(id: string) {
    const subs = goal.sousObjectifs.map((s) => (s.id === id ? { ...s, fait: !s.fait } : s))
    const allDone = subs.length > 0 && subs.every((s) => s.fait)
    await db.objectives.update(goalId, {
      sousObjectifs: subs,
      status: allDone ? 'termine' : 'actif',
      completedAt: allDone ? Date.now() : undefined,
    })
    if (allDone) toast.success(`🎉 « ${goal.titre} » terminé !`)
  }

  async function deleteSub(id: string) {
    await db.objectives.update(goalId, {
      sousObjectifs: goal.sousObjectifs.filter((s) => s.id !== id),
    })
  }

  async function addJournalEntry(e: React.FormEvent) {
    e.preventDefault()
    if (!journalText.trim()) return
    const entry: GoalJournalEntry = {
      id: crypto.randomUUID(),
      contenu: journalText.trim(),
      at: Date.now(),
    }
    await db.objectives.update(goalId, { journal: [entry, ...goal.journal] })
    setJournalText('')
    toast.success('Note ajoutée au journal')
  }

  async function deleteJournalEntry(id: string) {
    await db.objectives.update(goalId, { journal: goal.journal.filter((e) => e.id !== id) })
  }

  async function changeStatus(status: GoalStatus) {
    await db.objectives.update(goalId, {
      status,
      completedAt: status === 'termine' ? Date.now() : undefined,
    })
    if (status === 'termine') toast.success(`🎉 « ${goal.titre} » terminé !`)
    else if (status === 'abandonne') toast.info('Objectif marqué abandonné')
    else toast.success('Objectif réactivé')
  }

  async function deleteGoal() {
    if (!confirm(`Supprimer définitivement « ${goal.titre} » ?`)) return
    await db.objectives.delete(goalId)
    toast.info('Objectif supprimé')
    onClose()
  }

  return (
    <LifeModal open onClose={onClose} title={`${STATUS_EMOJI[goal.status]} ${goal.titre}`} className="max-h-[min(85vh,800px)] overflow-y-auto sm:max-w-lg">
      <div className="max-h-[70vh] space-y-5 overflow-y-auto pr-1">
        <div>
          <div className="mb-1 flex justify-between text-sm">
            <span className="text-muted-foreground">Progression</span>
            <span className="font-semibold">{p}%</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${p}%`,
                background: p >= 100 ? 'hsl(var(--chart-2))' : goal.couleur ?? 'hsl(var(--primary))',
              }}
            />
          </div>
        </div>

        <div>
          <p className="mb-2 font-medium">
            Étapes ({goal.sousObjectifs.filter((s) => s.fait).length}/{goal.sousObjectifs.length})
          </p>
          <ul className="space-y-2">
            {goal.sousObjectifs.map((s) => (
              <li key={s.id} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void toggleSub(s.id)}
                  className={cn(
                    'grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 transition-all',
                    s.fait ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-transparent'
                  )}
                >
                  <svg
                    viewBox="0 0 12 10"
                    width="10"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="1,5 4.5,9 11,1" />
                  </svg>
                </button>
                <span className={cn('flex-1 text-sm', s.fait && 'text-muted-foreground line-through')}>
                  {s.titre}
                </span>
                <button
                  type="button"
                  onClick={() => void deleteSub(s.id)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
          <form onSubmit={addSubtask} className="mt-2 flex gap-2">
            <Input
              className="flex-1"
              placeholder="Nouvelle étape…"
              value={subtaskTitle}
              onChange={(e) => setSubtaskTitle(e.target.value)}
            />
            <Button type="submit" size="sm">
              +
            </Button>
          </form>
        </div>

        <div>
          <p className="mb-2 font-medium">Journal</p>
          <form onSubmit={addJournalEntry} className="flex gap-2">
            <Input
              className="flex-1"
              placeholder="Ajoute une note de progression…"
              value={journalText}
              onChange={(e) => setJournalText(e.target.value)}
            />
            <Button type="submit" size="sm">
              +
            </Button>
          </form>
          {goal.journal.length > 0 && (
            <ul className="mt-3 space-y-2">
              {goal.journal.map((e) => (
                <li key={e.id} className="rounded-xl border border-border bg-muted/30 p-3 text-sm">
                  <div className="flex justify-between gap-2">
                    <p>{e.contenu}</p>
                    <button
                      type="button"
                      onClick={() => void deleteJournalEntry(e.id)}
                      className="shrink-0 text-muted-foreground hover:text-destructive"
                    >
                      ✕
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {new Date(e.at).toLocaleString('fr-FR', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex flex-wrap gap-2 border-t border-border pt-4">
          {goal.status !== 'termine' && (
            <Button type="button" variant="outline" className="flex-1 border-green-600/40 text-green-600" onClick={() => void changeStatus('termine')}>
              ✅ Marquer terminé
            </Button>
          )}
          {goal.status !== 'abandonne' && goal.status !== 'termine' && (
            <Button type="button" variant="outline" className="flex-1" onClick={() => void changeStatus('abandonne')}>
              Abandonner
            </Button>
          )}
          {(goal.status === 'termine' || goal.status === 'abandonne') && (
            <Button type="button" variant="outline" className="flex-1" onClick={() => void changeStatus('actif')}>
              ↩ Réactiver
            </Button>
          )}
          <Button type="button" variant="outline" className="text-destructive" onClick={deleteGoal}>
            🗑
          </Button>
        </div>
      </div>
    </LifeModal>
  )
}

function AddGoalModal({
  open,
  onClose,
  titreRef,
  onAdd,
}: {
  open: boolean
  onClose: () => void
  titreRef: RefObject<HTMLInputElement | null>
  onAdd: (data: {
    titre: string
    categorie: string
    deadline?: string
    priorite: GoalPriority
    couleur: string
    description?: string
  }) => void
}) {
  const [titre, setTitre] = useState('')
  const [categorie, setCategorie] = useState('perso')
  const [deadline, setDeadline] = useState('')
  const [priorite, setPriorite] = useState<GoalPriority>('normale')
  const [couleur, setCouleur] = useState(GOAL_COLORS[0]!)
  const [description, setDesc] = useState('')

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!titre.trim()) return
    onAdd({
      titre: titre.trim(),
      categorie,
      deadline: deadline || undefined,
      priorite,
      couleur,
      description: description.trim() || undefined,
    })
    setTitre('')
    setDeadline('')
    setDesc('')
  }

  const CATS = ['perso', 'études', 'sport', 'finance', 'santé', 'spiritualité', 'professionnel', 'autre']

  return (
    <LifeModal open={open} onClose={onClose} title="Nouvel objectif">
      <form onSubmit={submit} className="space-y-4">
        <Input ref={titreRef} placeholder="Mon objectif…" value={titre} onChange={(e) => setTitre(e.target.value)} />
        <textarea
          className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          placeholder="Description (optionnel)"
          rows={2}
          value={description}
          onChange={(e) => setDesc(e.target.value)}
        />
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
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-muted-foreground">Priorité</label>
            <div className="mt-1 flex gap-1">
              {(['haute', 'normale', 'basse'] as GoalPriority[]).map((pr) => (
                <button
                  key={pr}
                  type="button"
                  onClick={() => setPriorite(pr)}
                  className={cn(
                    'flex-1 rounded-xl border py-1.5 text-xs capitalize',
                    priorite === pr
                      ? pr === 'haute'
                        ? 'border-red-500 bg-red-500/10 text-red-500'
                        : pr === 'normale'
                          ? 'border-amber-500 bg-amber-500/10 text-amber-600'
                          : 'border-green-500 bg-green-500/10 text-green-600'
                      : 'border-border text-muted-foreground'
                  )}
                >
                  {pr}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Échéance</label>
            <Input
              type="date"
              className="mt-1"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {GOAL_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCouleur(c)}
              className="h-7 w-7 rounded-full border-2 transition-transform hover:scale-110"
              style={{ background: c, borderColor: couleur === c ? 'hsl(var(--foreground))' : 'transparent' }}
            />
          ))}
        </div>
        <Button type="submit" className="w-full">
          Créer
        </Button>
      </form>
    </LifeModal>
  )
}

export function GoalsView() {
  const goals = useLiveQuery(() => db.objectives.orderBy('createdAt').reverse().toArray(), []) ?? []
  const [tab, setTab] = useState<ObjTab>('actif')
  const [addOpen, setAddOpen] = useState(false)
  const [detailGoal, setDetailGoal] = useState<Objective | null>(null)
  const titreRef = useRef<HTMLInputElement>(null)

  const byTab = goals.filter((g) => {
    if (tab === 'actif') return g.status === 'actif' || g.status === 'expire'
    if (tab === 'termine') return g.status === 'termine'
    return g.status === 'abandonne'
  })

  async function addGoal(data: {
    titre: string
    categorie: string
    deadline?: string
    priorite: GoalPriority
    couleur: string
    description?: string
  }) {
    const o: Objective = {
      id: crypto.randomUUID(),
      ...data,
      sousObjectifs: [],
      journal: [],
      status: 'actif',
      createdAt: Date.now(),
    }
    await db.objectives.add(o)
    toast.success(`Objectif « ${o.titre} » créé 🎯`)
    setAddOpen(false)
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5 p-4 md:p-8">
      <header className="flex animate-fade-up items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">Objectifs</h1>
          <p className="text-sm text-muted-foreground">
            {goals.filter((g) => g.status === 'actif').length} actif
            {goals.filter((g) => g.status === 'actif').length !== 1 ? 's' : ''}
            {' · '}
            {goals.filter((g) => g.status === 'termine').length} terminé
            {goals.filter((g) => g.status === 'termine').length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button
          size="icon"
          className="rounded-full"
          onClick={() => {
            setAddOpen(true)
            setTimeout(() => titreRef.current?.focus(), 80)
          }}
          aria-label="Nouvel objectif"
        >
          +
        </Button>
      </header>

      <div className="flex gap-1 rounded-xl border border-border bg-muted/30 p-1">
        {(
          [
            ['actif', 'Actifs'],
            ['termine', 'Terminés'],
            ['abandonne', 'Abandonnés'],
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

      {byTab.length === 0 ? (
        <AnimatedCard className="p-10 text-center">
          <p className="text-3xl">
            {STATUS_EMOJI[tab === 'actif' ? 'actif' : tab === 'termine' ? 'termine' : 'abandonne']}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {tab === 'actif'
              ? 'Aucun objectif actif — crée-en un !'
              : tab === 'termine'
                ? "Aucun objectif terminé pour l'instant."
                : 'Aucun objectif abandonné.'}
          </p>
        </AnimatedCard>
      ) : (
        <ul className="space-y-3">
          {byTab.map((g) => (
            <GoalCard key={g.id} goal={g} onOpen={() => setDetailGoal(g)} />
          ))}
        </ul>
      )}

      <AddGoalModal open={addOpen} onClose={() => setAddOpen(false)} titreRef={titreRef} onAdd={addGoal} />
      {detailGoal && (
        <GoalDetailModal goalId={detailGoal.id} onClose={() => setDetailGoal(null)} />
      )}
    </div>
  )
}
