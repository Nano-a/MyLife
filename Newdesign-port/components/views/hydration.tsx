'use client'

import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import {
  computeHydrationBodyIndex,
  hydrationBodyIndexLabel,
  hydrationLongTermScore,
  totalDrunkMl,
} from '@mylife/core'
import type { UserProfile as CoreUserProfile } from '@mylife/core'
import { AnimatedCard, ProgressRing } from '@/components/animated-card'
import { BodyHydrationVisual } from '@/components/hydration/BodyHydrationVisual'
import { BottleFill } from '@/components/hydration/BottleFill'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { db } from '@/lib/mylife/db'
import { dateISOFromTimestamp, todayISO } from '@/lib/mylife/lib/dateUtils'
import {
  buildHydrationBodyIndexSeries,
  type HydrationByDate,
  waterTargetForDate,
} from '@/lib/mylife/lib/hydrationTarget'
import { useStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import {
  Droplets,
  Plus,
  TrendingUp,
  Clock,
  Target,
  Undo2,
} from 'lucide-react'

const QUICK_ML = [150, 250, 330, 500, 750, 1000] as const

function hydrationJourneyHint(index: number): string {
  if (index >= 88) {
    return 'Tu es au sommet de l’échelle de l’app : la constance sur le long terme est excellente.'
  }
  if (index >= 70) {
    return 'En gardant le même rythme pendant encore quelques semaines, l’indice peut se rapprocher du maximum.'
  }
  if (index >= 45) {
    return 'L’indice monte surtout quand tu atteins souvent ton objectif sur plusieurs semaines d’affilée.'
  }
  return 'Les premières semaines comptent : chaque jour proche de l’objectif fait monter cet indicateur peu à peu.'
}

export function HydrationView() {
  const date = todayISO()
  const { hydrationGoal, setHydrationGoal, updateHydrationGoalSettings } = useStore()
  const [customMl, setCustomMl] = useState('')
  const [ripple, setRipple] = useState<number | null>(null)
  const rippleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const settingsRows = useLiveQuery(() => db.settings.toArray(), []) ?? []
  const profileCore = settingsRows.find((r) => r.key === 'profile')?.value as
    | CoreUserProfile
    | undefined

  const hydRow = useLiveQuery(() => db.hydrationDays.get(date), [date])
  const hydrationRows =
    useLiveQuery(() => db.hydrationDays.orderBy('date').reverse().limit(120).toArray(), []) ?? []
  const sportSessionsRaw = useLiveQuery(() => db.sportSessions.toArray(), []) ?? []

  const hydMap: HydrationByDate = useMemo(() => {
    const m: HydrationByDate = new Map()
    for (const r of hydrationRows) m.set(r.date, r)
    return m
  }, [hydrationRows])

  const targetMl = useMemo(() => {
    if (!profileCore) return hydrationGoal.baseGoal
    if (!hydrationGoal.adjustForActivity) return hydrationGoal.baseGoal
    return waterTargetForDate(profileCore, date, sportSessionsRaw)
  }, [profileCore, date, sportSessionsRaw, hydrationGoal.baseGoal, hydrationGoal.adjustForActivity])

  const drunk = totalDrunkMl(hydRow?.entries ?? [])
  const pct = targetMl > 0 ? Math.min(100, Math.round((drunk / targetMl) * 100)) : 0

  const bodyIndexSeries90 = useMemo(() => {
    if (!profileCore) return []
    return buildHydrationBodyIndexSeries(profileCore, hydMap, sportSessionsRaw, 90)
  }, [profileCore, hydMap, sportSessionsRaw])

  const bodyIndex = useMemo(
    () => computeHydrationBodyIndex(bodyIndexSeries90),
    [bodyIndexSeries90]
  )
  const bodyLabel = useMemo(() => hydrationBodyIndexLabel(bodyIndex), [bodyIndex])

  const last30DailyPct = useMemo(() => bodyIndexSeries90.slice(-30), [bodyIndexSeries90])

  const journeyHint = useMemo(() => hydrationJourneyHint(bodyIndex), [bodyIndex])

  const longTerm14 = useMemo(() => {
    if (!profileCore) return 0
    const series = buildHydrationBodyIndexSeries(profileCore, hydMap, sportSessionsRaw, 14)
    return hydrationLongTermScore(series)
  }, [profileCore, hydMap, sportSessionsRaw])

  const sportTodayMin = useMemo(() => {
    const dayS = sportSessionsRaw.filter((s) => dateISOFromTimestamp(s.debut) === date)
    return Math.round(dayS.reduce((acc, s) => acc + (s.fin - s.debut) / 60_000, 0))
  }, [sportSessionsRaw, date])

  const lastAt = hydRow?.entries.at(-1)?.at

  async function addMl(ml: number, idx?: number) {
    if (rippleTimer.current) clearTimeout(rippleTimer.current)
    setRipple(idx ?? -1)
    rippleTimer.current = setTimeout(() => setRipple(null), 520)

    const row = (await db.hydrationDays.get(date)) ?? { date, entries: [] }
    const entries = [...row.entries, { id: crypto.randomUUID(), ml, at: Date.now() }]
    await db.hydrationDays.put({ date, entries })
    toast.success(`+${ml} ml ajouté`)
  }

  async function removeLast() {
    const row = await db.hydrationDays.get(date)
    if (!row || row.entries.length === 0) return
    const entries = row.entries.slice(0, -1)
    await db.hydrationDays.put({ date, entries })
    toast.message('Dernière entrée supprimée')
  }

  function handleCustom(e: React.FormEvent) {
    e.preventDefault()
    const ml = Number(customMl.replace(',', '.'))
    if (!ml || ml <= 0) return
    void addMl(ml)
    setCustomMl('')
  }

  const today = date
  const stats = useMemo(() => {
    const todayLogs =
      hydRow?.entries.map((e) => ({
        id: e.id,
        date,
        amount: e.ml,
        time: new Date(e.at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      })) ?? []

    const last7Days: { date: string; amount: number }[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().split('T')[0]
      const row = hydMap.get(dateStr)
      const dayTotal = totalDrunkMl(row?.entries ?? [])
      last7Days.push({ date: dateStr, amount: dayTotal })
    }

    const weekTotal = last7Days.reduce((sum, x) => sum + x.amount, 0)
    const weekAverage = Math.round(weekTotal / 7)
    const daysReached = last7Days.filter((d) => d.amount >= hydrationGoal.baseGoal).length

    return {
      todayLogs,
      last7Days,
      weekAverage,
      daysReached,
      todayProgress: (drunk / Math.max(1, targetMl)) * 100,
    }
  }, [hydRow, date, hydMap, hydrationGoal.baseGoal, drunk, targetMl])

  const goalOptions = [1500, 2000, 2500, 3000, 3500]

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <div className="mb-6 animate-fade-up">
        <h1 className="text-2xl md:text-3xl font-bold">Hydratation</h1>
        <p className="text-muted-foreground">
          Objectif du jour, puis <strong className="text-foreground/90">indice d’hydratation du corps</strong> sur
          plusieurs semaines (régularité, pas mesure médicale).
        </p>
      </div>

      <AnimatedCard delay={50} className="mb-6 border-primary/20 bg-gradient-to-b from-primary/5 to-transparent">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1 space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                Sur le long terme
              </p>
              <h2 className="mt-1 text-xl font-bold md:text-2xl">Hydratation du corps</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Ce pourcentage résume ta <strong className="text-foreground/90">régularité</strong> sur environ{' '}
                <strong>90 jours</strong> par rapport à ton objectif (profil, activité, sport). Ce n’est pas la
                quantité d’eau « dans les organes » — c’est une façon visuelle de voir si tu bois assez souvent
                comme prévu, jour après jour.
              </p>
            </div>

            {!profileCore ? (
              <p className="rounded-xl border border-dashed border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
                Complète ton <strong className="text-foreground">profil</strong> dans Paramètres pour calculer cet
                indice et l’objectif personnalisé.
              </p>
            ) : (
              <>
                <div>
                  <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                    <span className="text-sm font-semibold text-foreground">{bodyLabel.label}</span>
                    <span className="text-xs tabular-nums text-muted-foreground">
                      Indice actuel : <strong className="text-primary">{bodyIndex}</strong> / 100
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{bodyLabel.detail}</p>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{journeyHint}</p>
                  <div className="mt-4">
                    <div className="mb-1 flex justify-between text-[0.65rem] text-muted-foreground">
                      <span>Moins régulier·ère</span>
                      <span>Très régulier·ère</span>
                    </div>
                    <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-chart-2 via-chart-3 to-chart-1 transition-all duration-700"
                        style={{ width: `${Math.min(100, bodyIndex)}%` }}
                      />
                    </div>
                    <div className="mt-1 flex justify-between text-[0.6rem] tabular-nums text-muted-foreground/80">
                      <span>0</span>
                      <span>50</span>
                      <span>100</span>
                    </div>
                  </div>
                </div>

                {last30DailyPct.length > 0 && (
                  <div>
                    <p className="mb-2 text-xs font-medium text-muted-foreground">
                      30 derniers jours — hauteur = % de l’objectif atteint ce jour-là
                    </p>
                    <div
                      className="flex h-14 gap-px sm:gap-0.5"
                      role="img"
                      aria-label="Histogramme des 30 derniers jours"
                    >
                      {last30DailyPct.map((dayPct, i) => {
                        const h = Math.min(100, Math.max(0, dayPct))
                        const isToday = i === last30DailyPct.length - 1
                        const barH = Math.max(3, Math.round((h / 100) * 56))
                        return (
                          <div
                            key={i}
                            className="flex min-w-0 flex-1 flex-col justify-end"
                            title={`Jour ${i + 1}: ${Math.round(h)} %`}
                          >
                            <div
                              className={cn(
                                'mx-auto w-full max-w-[7px] rounded-t-sm transition-colors',
                                isToday ? 'bg-primary' : h >= 100 ? 'bg-chart-2' : 'bg-chart-2/55'
                              )}
                              style={{ height: barH }}
                            />
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {profileCore ? (
            <BodyHydrationVisual percent={bodyIndex} size="lg" className="shrink-0 lg:pt-2" />
          ) : (
            <div className="flex h-48 w-full shrink-0 items-center justify-center rounded-2xl border border-dashed border-border bg-muted/20 lg:w-56">
              <Droplets className="h-16 w-16 text-muted-foreground/40" />
            </div>
          )}
        </div>
      </AnimatedCard>

      <AnimatedCard delay={100} className="mb-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-stretch">
          <div className="flex flex-1 flex-col items-center justify-center gap-2">
            <div className="flex w-full flex-col items-center gap-4 sm:flex-row sm:justify-center sm:gap-8">
              <div className="text-center sm:text-left">
                <div className="mt-1 flex items-baseline justify-center gap-1 sm:justify-start">
                  <span className="text-3xl font-bold text-primary">{drunk}</span>
                  <span className="text-sm text-muted-foreground">/ {targetMl} ml</span>
                </div>
                {sportTodayMin > 0 && hydrationGoal.adjustForActivity && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Objectif ajusté (sport ~{sportTodayMin} min aujourd’hui)
                  </p>
                )}
                <div className="mx-auto mt-3 h-2.5 max-w-xs overflow-hidden rounded-full bg-muted sm:mx-0">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-chart-2 to-chart-3 transition-all duration-700"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  {pct}% de l’objectif aujourd’hui
                  {lastAt && (
                    <span className="ml-2">
                      · Dernière :{' '}
                      {new Date(lastAt).toLocaleTimeString('fr-FR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  )}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Moyenne 14 j : {longTerm14}% de l’objectif
                </p>
              </div>
              <BottleFill percent={pct} className="shrink-0" />
            </div>
          </div>

          <div className="flex flex-1 flex-col items-center border-t border-border pt-6 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
            <ProgressRing
              progress={Math.min(100, stats.todayProgress)}
              size={160}
              strokeWidth={14}
              color="chart-2"
            >
              <div className="text-center">
                <Droplets className="mx-auto mb-1 h-7 w-7 text-chart-2" />
                <p className="text-2xl font-bold">{Math.round(stats.todayProgress)}%</p>
              </div>
            </ProgressRing>
          </div>
        </div>
      </AnimatedCard>

      <AnimatedCard delay={200} className="mb-6">
        <h3 className="mb-4 font-semibold">Ajouter rapidement</h3>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {QUICK_ML.map((ml, i) => (
            <div key={ml} className="relative overflow-hidden rounded-xl">
              {ripple === i && (
                <span className="pointer-events-none absolute inset-0 animate-ping rounded-xl bg-chart-2/20" />
              )}
              <button
                type="button"
                onClick={() => void addMl(ml, i)}
                className="relative z-10 flex w-full flex-col items-center gap-1 rounded-xl border border-border bg-muted/40 py-3 text-sm font-medium transition-all hover:border-primary/50 hover:bg-muted active:scale-95"
              >
                <span className="text-lg" aria-hidden>
                  {ml <= 150 ? '🥃' : ml <= 250 ? '🥤' : ml <= 330 ? '🧋' : ml <= 500 ? '🍶' : '💧'}
                </span>
                <span>{ml} ml</span>
              </button>
            </div>
          ))}
        </div>
        <form onSubmit={handleCustom} className="mt-4 flex flex-wrap items-center gap-2">
          <input
            type="number"
            inputMode="numeric"
            className="min-w-[140px] flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            placeholder="Autre quantité (ml)"
            value={customMl}
            onChange={(e) => setCustomMl(e.target.value)}
          />
          <Button type="submit" size="sm">
            Ajouter
          </Button>
          {hydRow && hydRow.entries.length > 0 && (
            <Button type="button" variant="outline" size="sm" onClick={() => void removeLast()}>
              <Undo2 className="mr-1 h-4 w-4" />
              Annuler dernière
            </Button>
          )}
        </form>
      </AnimatedCard>

      <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-border bg-card/40 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Switch
            id="hydro-auto"
            checked={hydrationGoal.adjustForActivity}
            onCheckedChange={(v) => updateHydrationGoalSettings({ adjustForActivity: v })}
          />
          <Label htmlFor="hydro-auto" className="text-sm">
            Objectif auto (profil + sport du jour)
          </Label>
        </div>
        <p className="text-xs text-muted-foreground">
          Sinon : objectif fixe ci-dessous. Complète ton profil dans Paramètres pour un calcul précis.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <AnimatedCard delay={250}>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold">Cette semaine</h3>
            <TrendingUp className="h-5 w-5 text-chart-2" />
          </div>
          <div className="space-y-3">
            {stats.last7Days.map(({ date: dStr, amount }) => {
              const d = new Date(dStr)
              const isToday = dStr === today
              const progress = (amount / Math.max(1, targetMl)) * 100
              const reachedGoal = amount >= hydrationGoal.baseGoal
              return (
                <div key={dStr} className="flex items-center gap-3">
                  <div
                    className={cn(
                      'w-20 text-sm',
                      isToday ? 'font-semibold text-chart-2' : 'text-muted-foreground'
                    )}
                  >
                    {isToday ? "Aujourd'hui" : d.toLocaleDateString('fr-FR', { weekday: 'short' })}
                  </div>
                  <div className="h-3 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all duration-500',
                        reachedGoal ? 'bg-chart-2' : 'bg-chart-2/50'
                      )}
                      style={{ width: `${Math.min(100, progress)}%` }}
                    />
                  </div>
                  <div
                    className={cn('w-20 text-right text-sm', reachedGoal && 'font-medium text-chart-2')}
                  >
                    {amount} ml
                  </div>
                </div>
              )
            })}
          </div>
          <div className="mt-4 flex justify-between border-t border-border pt-4 text-sm">
            <span className="text-muted-foreground">Moyenne : {stats.weekAverage} ml/j</span>
            <span className="text-chart-2">{stats.daysReached}/7 jours objectif atteint</span>
          </div>
        </AnimatedCard>

        <AnimatedCard delay={300}>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold">Journal du jour</h3>
            <Clock className="h-5 w-5 text-muted-foreground" />
          </div>
          {stats.todayLogs.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <Droplets className="mx-auto mb-3 h-12 w-12 opacity-40" />
              <p>Aucune entrée aujourd’hui</p>
            </div>
          ) : (
            <div className="max-h-[300px] space-y-2 overflow-y-auto">
              {[...stats.todayLogs]
                .sort((a, b) => b.time.localeCompare(a.time))
                .map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between rounded-lg bg-muted/50 p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-chart-2/10">
                        <Droplets className="h-4 w-4 text-chart-2" />
                      </div>
                      <div>
                        <p className="font-medium">{log.amount} ml</p>
                        <p className="text-xs text-muted-foreground">{log.time}</p>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </AnimatedCard>
      </div>

      <AnimatedCard delay={400} className="mt-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Objectif de base (ml)</h3>
          </div>
          <span className="text-sm text-muted-foreground">
            Utilisé si auto désactivé, ou comme plancher
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {goalOptions.map((goal) => (
            <Button
              key={goal}
              variant={hydrationGoal.baseGoal === goal ? 'default' : 'outline'}
              onClick={() => setHydrationGoal(goal)}
            >
              {goal} ml
            </Button>
          ))}
        </div>
      </AnimatedCard>
    </div>
  )
}
