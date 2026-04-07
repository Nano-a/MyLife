'use client'

import { useState, useMemo } from 'react'
import { useStore } from '@/lib/store'
import { AnimatedCard, ProgressRing } from '@/components/animated-card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import {
  CheckSquare,
  Plus,
  Trash2,
  X,
  Flame,
  TrendingUp,
} from 'lucide-react'

const habitIcons = ['🏃', '📚', '💪', '🧘', '💊', '🍎', '💧', '🎯', '✍️', '🛏️', '🚭', '💰']
const habitColors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899']

export function HabitsView() {
  const { habits, habitLogs, addHabit, deleteHabit, logHabit } = useStore()
  const [showAddModal, setShowAddModal] = useState(false)
  const [newHabit, setNewHabit] = useState({
    name: '',
    icon: '🎯',
    color: '#3b82f6',
    type: 'boolean' as const,
  })
  
  const today = new Date().toISOString().split('T')[0]
  
  // Get last 7 days
  const last7Days = useMemo(() => {
    const days: string[] = []
    for (let i = 6; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      days.push(date.toISOString().split('T')[0])
    }
    return days
  }, [])
  
  // Calculate stats
  const stats = useMemo(() => {
    const todayLogs = habitLogs.filter((l) => l.date === today && l.completed)
    const todayProgress = habits.length > 0 ? (todayLogs.length / habits.length) * 100 : 0
    
    // Streak calculation (consecutive days with all habits completed)
    let streak = 0
    const sortedDates = [...new Set(habitLogs.map((l) => l.date))].sort().reverse()
    for (const date of sortedDates) {
      const dayLogs = habitLogs.filter((l) => l.date === date && l.completed)
      if (dayLogs.length === habits.length && habits.length > 0) {
        streak++
      } else {
        break
      }
    }
    
    // Weekly completion rate
    const weekLogs = habitLogs.filter((l) => last7Days.includes(l.date) && l.completed)
    const weeklyRate = habits.length > 0 
      ? (weekLogs.length / (habits.length * 7)) * 100 
      : 0
    
    return { todayCompleted: todayLogs.length, todayProgress, streak, weeklyRate }
  }, [habits, habitLogs, today, last7Days])
  
  const handleAddHabit = () => {
    if (!newHabit.name.trim()) return
    
    addHabit({
      name: newHabit.name,
      icon: newHabit.icon,
      color: newHabit.color,
      type: newHabit.type,
      frequency: 'daily',
    })
    
    setNewHabit({ name: '', icon: '🎯', color: '#3b82f6', type: 'boolean' })
    setShowAddModal(false)
  }
  
  const toggleHabit = (habitId: string, date: string) => {
    const existing = habitLogs.find((l) => l.habitId === habitId && l.date === date)
    logHabit({
      habitId,
      date,
      completed: !existing?.completed,
    })
  }
  
  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 animate-fade-up">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Habitudes</h1>
          <p className="text-muted-foreground">Suivez vos habitudes quotidiennes</p>
        </div>
        <Button onClick={() => setShowAddModal(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Nouvelle habitude</span>
        </Button>
      </div>
      
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <AnimatedCard delay={100} className="text-center">
          <ProgressRing progress={stats.todayProgress} size={80} strokeWidth={6} color="primary">
            <p className="text-lg font-bold">{Math.round(stats.todayProgress)}%</p>
          </ProgressRing>
          <p className="text-sm text-muted-foreground mt-2">Aujourd&apos;hui</p>
        </AnimatedCard>
        
        <AnimatedCard delay={200} className="flex flex-col items-center justify-center">
          <div className="flex items-center gap-2 text-chart-5">
            <Flame className="w-6 h-6" />
            <span className="text-2xl font-bold">{stats.streak}</span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">Jours consécutifs</p>
        </AnimatedCard>
        
        <AnimatedCard delay={300} className="flex flex-col items-center justify-center">
          <p className="text-2xl font-bold">{stats.todayCompleted}/{habits.length}</p>
          <p className="text-sm text-muted-foreground mt-1">Complétées aujourd&apos;hui</p>
        </AnimatedCard>
        
        <AnimatedCard delay={400} className="flex flex-col items-center justify-center">
          <div className="flex items-center gap-2 text-chart-2">
            <TrendingUp className="w-5 h-5" />
            <span className="text-2xl font-bold">{Math.round(stats.weeklyRate)}%</span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">Cette semaine</p>
        </AnimatedCard>
      </div>
      
      {/* Habits List */}
      {habits.length === 0 ? (
        <AnimatedCard delay={500} className="text-center py-12">
          <CheckSquare className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-semibold mb-2">Aucune habitude</h3>
          <p className="text-muted-foreground mb-4">
            Commencez par créer votre première habitude à suivre
          </p>
          <Button onClick={() => setShowAddModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Créer une habitude
          </Button>
        </AnimatedCard>
      ) : (
        <div className="space-y-4">
          {/* Week view header */}
          <AnimatedCard delay={500}>
            <div className="overflow-x-auto">
              <div className="min-w-[600px]">
                {/* Day headers */}
                <div className="grid grid-cols-[1fr_repeat(7,48px)] gap-2 mb-4 px-2">
                  <div />
                  {last7Days.map((date) => {
                    const d = new Date(date)
                    const isToday = date === today
                    return (
                      <div
                        key={date}
                        className={cn(
                          'text-center py-2 rounded-lg',
                          isToday && 'bg-primary/10'
                        )}
                      >
                        <p className="text-xs text-muted-foreground">
                          {d.toLocaleDateString('fr-FR', { weekday: 'short' })}
                        </p>
                        <p className={cn(
                          'text-sm font-medium',
                          isToday && 'text-primary'
                        )}>
                          {d.getDate()}
                        </p>
                      </div>
                    )
                  })}
                </div>
                
                {/* Habits rows */}
                <div className="space-y-2">
                  {habits.map((habit, index) => (
                    <div
                      key={habit.id}
                      className="grid grid-cols-[1fr_repeat(7,48px)] gap-2 items-center px-2 py-2 rounded-xl hover:bg-muted/50 transition-colors animate-fade-up"
                      style={{ animationDelay: `${600 + index * 100}ms` }}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
                          style={{ backgroundColor: `${habit.color}20` }}
                        >
                          {habit.icon}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium truncate">{habit.name}</p>
                          <p className="text-xs text-muted-foreground">Quotidien</p>
                        </div>
                        <button
                          onClick={() => deleteHabit(habit.id)}
                          className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      
                      {last7Days.map((date) => {
                        const log = habitLogs.find(
                          (l) => l.habitId === habit.id && l.date === date
                        )
                        const isCompleted = log?.completed || false
                        
                        return (
                          <button
                            key={date}
                            onClick={() => toggleHabit(habit.id, date)}
                            className={cn(
                              'w-10 h-10 rounded-xl mx-auto flex items-center justify-center transition-all duration-300',
                              isCompleted
                                ? 'text-white scale-100'
                                : 'bg-muted hover:bg-muted-foreground/20 scale-90 hover:scale-100'
                            )}
                            style={{
                              backgroundColor: isCompleted ? habit.color : undefined,
                              boxShadow: isCompleted ? `0 0 20px ${habit.color}40` : undefined,
                            }}
                          >
                            {isCompleted && <CheckSquare className="w-5 h-5" />}
                          </button>
                        )
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </AnimatedCard>
        </div>
      )}
      
      {/* Add Habit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            onClick={() => setShowAddModal(false)}
          />
          <AnimatedCard className="relative w-full max-w-md z-10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Nouvelle habitude</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-2 rounded-lg hover:bg-muted"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Nom</label>
                <Input
                  value={newHabit.name}
                  onChange={(e) => setNewHabit((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Ex: Méditer 10 minutes"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">Icône</label>
                <div className="flex flex-wrap gap-2">
                  {habitIcons.map((icon) => (
                    <button
                      key={icon}
                      onClick={() => setNewHabit((prev) => ({ ...prev, icon }))}
                      className={cn(
                        'w-10 h-10 rounded-xl text-lg flex items-center justify-center transition-all',
                        newHabit.icon === icon
                          ? 'bg-primary/20 ring-2 ring-primary'
                          : 'bg-muted hover:bg-muted-foreground/20'
                      )}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">Couleur</label>
                <div className="flex flex-wrap gap-2">
                  {habitColors.map((color) => (
                    <button
                      key={color}
                      onClick={() => setNewHabit((prev) => ({ ...prev, color }))}
                      className={cn(
                        'w-8 h-8 rounded-full transition-all',
                        newHabit.color === color && 'ring-2 ring-offset-2 ring-offset-background'
                      )}
                      style={{ backgroundColor: color, boxShadow: newHabit.color === color ? `0 0 20px ${color}` : undefined }}
                    />
                  ))}
                </div>
              </div>
              
              <div className="flex gap-3 pt-2">
                <Button variant="outline" onClick={() => setShowAddModal(false)} className="flex-1">
                  Annuler
                </Button>
                <Button onClick={handleAddHabit} className="flex-1">
                  Créer
                </Button>
              </div>
            </div>
          </AnimatedCard>
        </div>
      )}
    </div>
  )
}
