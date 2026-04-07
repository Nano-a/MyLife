'use client'

import { useMemo } from 'react'
import { useStore } from '@/lib/store'
import { AnimatedCard, StatCard, ProgressRing } from '@/components/animated-card'
import {
  Calendar,
  CheckSquare,
  Dumbbell,
  Droplets,
  Smile,
  Wallet,
  Target,
  TrendingUp,
  Sun,
  Moon,
  Flame,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export function Dashboard() {
  const {
    events,
    habits,
    habitLogs,
    sportSessions,
    hydrationLogs,
    hydrationGoal,
    moodEntries,
    transactions,
    goals,
    setCurrentTab,
    addHydration,
    addMoodEntry,
    logHabit,
  } = useStore()
  
  const today = new Date().toISOString().split('T')[0]
  const currentHour = new Date().getHours()
  
  // Calculate today's stats
  const todayStats = useMemo(() => {
    // Events today
    const todayEvents = events.filter((e) => e.date === today)
    const completedEvents = todayEvents.filter((e) => e.completed).length
    
    // Habits today
    const todayHabitLogs = habitLogs.filter((l) => l.date === today)
    const completedHabits = todayHabitLogs.filter((l) => l.completed).length
    const totalHabits = habits.length
    const habitsProgress = totalHabits > 0 ? (completedHabits / totalHabits) * 100 : 0
    
    // Sport today
    const todaySport = sportSessions.filter((s) => s.date === today)
    const todayCalories = todaySport.reduce((sum, s) => sum + s.caloriesBurned, 0)
    const todayMinutes = todaySport.reduce((sum, s) => sum + s.duration, 0)
    
    // Hydration today
    const todayHydration = hydrationLogs.filter((l) => l.date === today)
    const todayWater = todayHydration.reduce((sum, l) => sum + l.amount, 0)
    const waterProgress = (todayWater / hydrationGoal.baseGoal) * 100
    
    // Mood today
    const todayMood = moodEntries.find((m) => m.date === today)
    
    // Finances this month
    const currentMonth = today.substring(0, 7)
    const monthTransactions = transactions.filter((t) => t.date.startsWith(currentMonth))
    const monthIncome = monthTransactions
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0)
    const monthExpenses = monthTransactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0)
    
    // Goals progress
    const activeGoals = goals.filter((g) => !g.completed)
    const avgGoalProgress = activeGoals.length > 0
      ? activeGoals.reduce((sum, g) => {
          if (g.targetValue) {
            return sum + (g.currentValue / g.targetValue) * 100
          }
          return sum
        }, 0) / activeGoals.length
      : 0
    
    return {
      todayEvents: todayEvents.length,
      completedEvents,
      completedHabits,
      totalHabits,
      habitsProgress,
      todayCalories,
      todayMinutes,
      todayWater,
      waterProgress,
      todayMood,
      monthIncome,
      monthExpenses,
      activeGoals: activeGoals.length,
      avgGoalProgress,
    }
  }, [events, habits, habitLogs, sportSessions, hydrationLogs, hydrationGoal, moodEntries, transactions, goals, today])
  
  // Greeting based on time
  const greeting = useMemo(() => {
    if (currentHour < 12) return 'Bonjour'
    if (currentHour < 18) return 'Bon après-midi'
    return 'Bonsoir'
  }, [currentHour])
  
  const moodLabels = ['', 'Très mal', 'Mal', 'Neutre', 'Bien', 'Très bien']
  const moodColors = ['', 'text-destructive', 'text-chart-5', 'text-muted-foreground', 'text-chart-2', 'text-chart-4']
  
  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header with glass effect */}
      <div className="animate-fade-up glass-subtle rounded-2xl p-6 md:p-8">
        <div className="flex items-center gap-2 text-muted-foreground mb-2">
          {currentHour < 18 ? <Sun className="w-5 h-5 text-chart-4" /> : <Moon className="w-5 h-5 text-chart-2" />}
          <span className="text-sm font-medium">
            {new Date().toLocaleDateString('fr-FR', { 
              weekday: 'long', 
              day: 'numeric', 
              month: 'long' 
            })}
          </span>
        </div>
        <h1 className="text-3xl md:text-5xl font-bold tracking-tight">
          {greeting}<span className="gradient-text">,</span>
        </h1>
        <p className="text-muted-foreground mt-2 text-lg">
          Voici un apercu de votre journee
        </p>
      </div>
      
      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={CheckSquare}
          title="Habitudes"
          value={`${todayStats.completedHabits}/${todayStats.totalHabits}`}
          progress={todayStats.habitsProgress}
          color="primary"
          onClick={() => setCurrentTab('habits')}
          delay={100}
        />
        <StatCard
          icon={Droplets}
          title="Hydratation"
          value={`${todayStats.todayWater} ml`}
          subtitle={`Objectif: ${hydrationGoal.baseGoal} ml`}
          progress={todayStats.waterProgress}
          color="chart-2"
          onClick={() => setCurrentTab('hydration')}
          delay={200}
        />
        <StatCard
          icon={Flame}
          title="Calories"
          value={todayStats.todayCalories}
          subtitle={`${todayStats.todayMinutes} min d'activité`}
          color="chart-5"
          onClick={() => setCurrentTab('sport')}
          delay={300}
        />
        <StatCard
          icon={Calendar}
          title="Événements"
          value={todayStats.todayEvents}
          subtitle={`${todayStats.completedEvents} terminés`}
          color="chart-3"
          onClick={() => setCurrentTab('agenda')}
          delay={400}
        />
      </div>
      
      {/* Main Cards Row */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Hydration Ring */}
        <AnimatedCard delay={500} className="flex flex-col items-center justify-center py-6">
          <h3 className="text-sm font-medium text-muted-foreground mb-4">Hydratation du jour</h3>
          <ProgressRing
            progress={Math.min(100, todayStats.waterProgress)}
            size={140}
            strokeWidth={10}
            color="chart-2"
          >
            <div className="text-center">
              <Droplets className="w-6 h-6 mx-auto text-chart-2 mb-1" />
              <p className="text-2xl font-bold">{Math.round(todayStats.waterProgress)}%</p>
            </div>
          </ProgressRing>
          <div className="flex gap-4 mt-4">
            <button
              onClick={() => {
                addHydration(250)
              }}
              className="px-4 py-2 rounded-xl bg-chart-2/10 text-chart-2 text-sm font-medium hover:bg-chart-2/20 transition-all"
            >
              +250 ml
            </button>
            <button
              onClick={() => {
                addHydration(500)
              }}
              className="px-4 py-2 rounded-xl bg-chart-2/10 text-chart-2 text-sm font-medium hover:bg-chart-2/20 transition-all"
            >
              +500 ml
            </button>
          </div>
        </AnimatedCard>
        
        {/* Mood Card */}
        <AnimatedCard delay={600} className="flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-muted-foreground">Humeur du jour</h3>
            <Smile className="w-5 h-5 text-chart-4" />
          </div>
          
          {todayStats.todayMood ? (
            <div className="flex-1 flex flex-col items-center justify-center">
              <div className={cn('text-5xl mb-2', moodColors[todayStats.todayMood.rating])}>
                {['', '😢', '😕', '😐', '😊', '😄'][todayStats.todayMood.rating]}
              </div>
              <p className={cn('font-medium', moodColors[todayStats.todayMood.rating])}>
                {moodLabels[todayStats.todayMood.rating]}
              </p>
              {todayStats.todayMood.note && (
                <p className="text-sm text-muted-foreground mt-2 text-center">
                  {todayStats.todayMood.note}
                </p>
              )}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center">
              <p className="text-muted-foreground text-sm mb-4">Comment vous sentez-vous ?</p>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((rating) => (
                  <button
                    key={rating}
                    onClick={() => {
                      addMoodEntry({
                        date: today,
                        rating: rating as 1 | 2 | 3 | 4 | 5,
                      })
                    }}
                    className="text-2xl hover:scale-125 transition-transform"
                  >
                    {['', '😢', '😕', '😐', '😊', '😄'][rating]}
                  </button>
                ))}
              </div>
            </div>
          )}
        </AnimatedCard>
        
        {/* Goals Overview */}
        <AnimatedCard delay={700} className="flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-muted-foreground">Objectifs</h3>
            <Target className="w-5 h-5 text-chart-3" />
          </div>
          
          <div className="flex-1 flex flex-col items-center justify-center">
            <ProgressRing
              progress={todayStats.avgGoalProgress}
              size={100}
              strokeWidth={8}
              color="chart-3"
            >
              <p className="text-xl font-bold">{Math.round(todayStats.avgGoalProgress)}%</p>
            </ProgressRing>
            <p className="text-sm text-muted-foreground mt-3">
              {todayStats.activeGoals} objectif{todayStats.activeGoals !== 1 ? 's' : ''} en cours
            </p>
          </div>
          
          <button
            onClick={() => setCurrentTab('goals')}
            className="mt-4 text-sm text-primary hover:underline text-center"
          >
            Voir tous les objectifs
          </button>
        </AnimatedCard>
      </div>
      
      {/* Finances Summary */}
      <AnimatedCard delay={800}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-chart-4" />
            <h3 className="font-medium">Finances du mois</h3>
          </div>
          <button
            onClick={() => setCurrentTab('finances')}
            className="text-sm text-primary hover:underline"
          >
            Détails
          </button>
        </div>
        
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-4 rounded-xl bg-chart-2/10">
            <TrendingUp className="w-5 h-5 mx-auto text-chart-2 mb-2" />
            <p className="text-lg font-bold text-chart-2">
              +{todayStats.monthIncome.toLocaleString('fr-FR')} €
            </p>
            <p className="text-xs text-muted-foreground">Revenus</p>
          </div>
          <div className="text-center p-4 rounded-xl bg-chart-5/10">
            <TrendingUp className="w-5 h-5 mx-auto text-chart-5 mb-2 rotate-180" />
            <p className="text-lg font-bold text-chart-5">
              -{todayStats.monthExpenses.toLocaleString('fr-FR')} €
            </p>
            <p className="text-xs text-muted-foreground">Dépenses</p>
          </div>
          <div className="text-center p-4 rounded-xl bg-muted">
            <Wallet className="w-5 h-5 mx-auto text-foreground mb-2" />
            <p className={cn(
              'text-lg font-bold',
              todayStats.monthIncome - todayStats.monthExpenses >= 0 ? 'text-chart-2' : 'text-chart-5'
            )}>
              {(todayStats.monthIncome - todayStats.monthExpenses).toLocaleString('fr-FR')} €
            </p>
            <p className="text-xs text-muted-foreground">Solde</p>
          </div>
        </div>
      </AnimatedCard>
      
      {/* Today's Habits Preview */}
      {habits.length > 0 && (
        <AnimatedCard delay={900}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-primary" />
              <h3 className="font-medium">Habitudes du jour</h3>
            </div>
            <button
              onClick={() => setCurrentTab('habits')}
              className="text-sm text-primary hover:underline"
            >
              Tout voir
            </button>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {habits.slice(0, 4).map((habit, index) => {
              const log = habitLogs.find(
                (l) => l.habitId === habit.id && l.date === today
              )
              const isCompleted = log?.completed || false
              
              return (
                <button
                  key={habit.id}
                  onClick={() => {
                    logHabit({
                      habitId: habit.id,
                      date: today,
                      completed: !isCompleted,
                    })
                  }}
                  className={cn(
                    'p-4 rounded-xl transition-all duration-300',
                    isCompleted
                      ? 'bg-primary/10 border-2 border-primary'
                      : 'bg-muted hover:bg-muted/80 border-2 border-transparent'
                  )}
                  style={{ animationDelay: `${900 + index * 100}ms` }}
                >
                  <div
                    className={cn(
                      'w-10 h-10 rounded-full mx-auto flex items-center justify-center mb-2 transition-all',
                      isCompleted ? 'bg-primary text-primary-foreground scale-110' : 'bg-muted-foreground/20'
                    )}
                    style={{ backgroundColor: isCompleted ? habit.color : undefined }}
                  >
                    {isCompleted ? (
                      <CheckSquare className="w-5 h-5" />
                    ) : (
                      <span className="text-lg">{habit.icon}</span>
                    )}
                  </div>
                  <p className="text-sm font-medium text-center truncate">{habit.name}</p>
                </button>
              )
            })}
          </div>
        </AnimatedCard>
      )}
      
      {/* Sport Summary */}
      {todayStats.todayMinutes > 0 && (
        <AnimatedCard delay={1000}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Dumbbell className="w-5 h-5 text-chart-5" />
              <h3 className="font-medium">Activité sportive</h3>
            </div>
            <button
              onClick={() => setCurrentTab('sport')}
              className="text-sm text-primary hover:underline"
            >
              Détails
            </button>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-chart-5/10 flex items-center justify-center">
                <Flame className="w-6 h-6 text-chart-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{todayStats.todayCalories}</p>
                <p className="text-sm text-muted-foreground">calories brûlées</p>
              </div>
            </div>
            <div className="h-12 w-px bg-border" />
            <div>
              <p className="text-2xl font-bold">{todayStats.todayMinutes}</p>
              <p className="text-sm text-muted-foreground">minutes d'activité</p>
            </div>
          </div>
        </AnimatedCard>
      )}
    </div>
  )
}
