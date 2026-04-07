'use client'

import { useMemo } from 'react'
import { useStore } from '@/lib/store'
import { AnimatedCard, ProgressRing } from '@/components/animated-card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  Droplets,
  Plus,
  TrendingUp,
  Clock,
  Target,
  Trash2,
} from 'lucide-react'

const quickAmounts = [150, 250, 330, 500, 750, 1000]

export function HydrationView() {
  const { hydrationLogs, hydrationGoal, addHydration, setHydrationGoal } = useStore()
  
  const today = new Date().toISOString().split('T')[0]
  
  // Calculate stats
  const stats = useMemo(() => {
    // Today
    const todayLogs = hydrationLogs.filter((l) => l.date === today)
    const todayTotal = todayLogs.reduce((sum, l) => sum + l.amount, 0)
    const todayProgress = (todayTotal / hydrationGoal.baseGoal) * 100
    
    // Last 7 days
    const last7Days: { date: string; amount: number }[] = []
    for (let i = 6; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      const dayLogs = hydrationLogs.filter((l) => l.date === dateStr)
      const dayTotal = dayLogs.reduce((sum, l) => sum + l.amount, 0)
      last7Days.push({ date: dateStr, amount: dayTotal })
    }
    
    const weekTotal = last7Days.reduce((sum, d) => sum + d.amount, 0)
    const weekAverage = Math.round(weekTotal / 7)
    
    // Days goal reached
    const daysReached = last7Days.filter((d) => d.amount >= hydrationGoal.baseGoal).length
    
    return {
      todayTotal,
      todayProgress,
      todayLogs,
      last7Days,
      weekAverage,
      daysReached,
    }
  }, [hydrationLogs, hydrationGoal, today])
  
  const goalOptions = [1500, 2000, 2500, 3000, 3500]
  
  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6 animate-fade-up">
        <h1 className="text-2xl md:text-3xl font-bold">Hydratation</h1>
        <p className="text-muted-foreground">Suivez votre consommation d&apos;eau</p>
      </div>
      
      {/* Main Progress */}
      <AnimatedCard delay={100} className="mb-6">
        <div className="flex flex-col md:flex-row items-center gap-8">
          <div className="flex-1 flex flex-col items-center">
            <ProgressRing
              progress={Math.min(100, stats.todayProgress)}
              size={200}
              strokeWidth={16}
              color="chart-2"
            >
              <div className="text-center">
                <Droplets className="w-8 h-8 mx-auto text-chart-2 mb-2" />
                <p className="text-3xl font-bold">{stats.todayTotal}</p>
                <p className="text-sm text-muted-foreground">/ {hydrationGoal.baseGoal} ml</p>
              </div>
            </ProgressRing>
            
            <div className="mt-6 text-center">
              <p className="text-lg font-semibold">
                {stats.todayProgress >= 100 ? (
                  <span className="text-chart-2">Objectif atteint !</span>
                ) : (
                  <span>Encore {hydrationGoal.baseGoal - stats.todayTotal} ml</span>
                )}
              </p>
            </div>
          </div>
          
          {/* Quick Add Buttons */}
          <div className="flex-1 w-full">
            <h3 className="font-semibold mb-4 text-center md:text-left">Ajouter rapidement</h3>
            <div className="grid grid-cols-3 gap-3">
              {quickAmounts.map((amount) => (
                <button
                  key={amount}
                  onClick={() => addHydration(amount)}
                  className="p-4 rounded-xl bg-chart-2/10 hover:bg-chart-2/20 transition-all hover:scale-105 group"
                >
                  <Plus className="w-5 h-5 mx-auto text-chart-2 mb-1 group-hover:scale-110 transition-transform" />
                  <p className="text-sm font-medium text-chart-2">{amount} ml</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </AnimatedCard>
      
      <div className="grid md:grid-cols-2 gap-6">
        {/* Weekly Overview */}
        <AnimatedCard delay={200}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Cette semaine</h3>
            <TrendingUp className="w-5 h-5 text-chart-2" />
          </div>
          
          <div className="space-y-3">
            {stats.last7Days.map(({ date, amount }) => {
              const d = new Date(date)
              const isToday = date === today
              const progress = (amount / hydrationGoal.baseGoal) * 100
              const reachedGoal = amount >= hydrationGoal.baseGoal
              
              return (
                <div key={date} className="flex items-center gap-3">
                  <div className={cn(
                    'w-20 text-sm',
                    isToday ? 'font-semibold text-chart-2' : 'text-muted-foreground'
                  )}>
                    {isToday ? "Aujourd'hui" : d.toLocaleDateString('fr-FR', { weekday: 'short' })}
                  </div>
                  <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all duration-500',
                        reachedGoal ? 'bg-chart-2' : 'bg-chart-2/50'
                      )}
                      style={{ width: `${Math.min(100, progress)}%` }}
                    />
                  </div>
                  <div className={cn(
                    'w-20 text-sm text-right',
                    reachedGoal && 'text-chart-2 font-medium'
                  )}>
                    {amount} ml
                  </div>
                </div>
              )
            })}
          </div>
          
          <div className="mt-4 pt-4 border-t border-border flex justify-between text-sm">
            <span className="text-muted-foreground">Moyenne: {stats.weekAverage} ml/jour</span>
            <span className="text-chart-2">{stats.daysReached}/7 objectifs atteints</span>
          </div>
        </AnimatedCard>
        
        {/* Today's Log */}
        <AnimatedCard delay={300}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Journal du jour</h3>
            <Clock className="w-5 h-5 text-muted-foreground" />
          </div>
          
          {stats.todayLogs.length === 0 ? (
            <div className="text-center py-8">
              <Droplets className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">Aucune entrée aujourd&apos;hui</p>
              <p className="text-sm text-muted-foreground">
                Utilisez les boutons ci-dessus pour enregistrer votre consommation
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {[...stats.todayLogs]
                .sort((a, b) => b.time.localeCompare(a.time))
                .map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-chart-2/10 flex items-center justify-center">
                        <Droplets className="w-4 h-4 text-chart-2" />
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
      
      {/* Goal Setting */}
      <AnimatedCard delay={400} className="mt-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">Objectif quotidien</h3>
          </div>
          <span className="text-sm text-muted-foreground">Actuel: {hydrationGoal.baseGoal} ml</span>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {goalOptions.map((goal) => (
            <Button
              key={goal}
              variant={hydrationGoal.baseGoal === goal ? 'default' : 'outline'}
              onClick={() => setHydrationGoal(goal)}
              className={cn(
                hydrationGoal.baseGoal === goal && 'glow-sm'
              )}
            >
              {goal} ml
            </Button>
          ))}
        </div>
        
        <p className="text-sm text-muted-foreground mt-3">
          Conseil: 2000-2500 ml par jour est recommandé pour un adulte moyen. 
          Augmentez si vous faites du sport ou par temps chaud.
        </p>
      </AnimatedCard>
    </div>
  )
}
