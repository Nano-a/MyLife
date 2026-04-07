'use client'

import { useState, useMemo } from 'react'
import { useStore } from '@/lib/store'
import { AnimatedCard } from '@/components/animated-card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import {
  Dumbbell,
  Plus,
  Flame,
  Clock,
  TrendingUp,
  X,
  Trash2,
  PersonStanding,
  Bike,
  Waves,
  Activity,
} from 'lucide-react'

const activityIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  running: PersonStanding,
  walking: PersonStanding,
  bike: Bike,
  swimming: Waves,
  dumbbell: Dumbbell,
  yoga: Activity,
}

export function SportView() {
  const { sportActivities, sportSessions, addSportSession, deleteSportSession } = useStore()
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedActivity, setSelectedActivity] = useState<string | null>(null)
  const [duration, setDuration] = useState('30')
  
  const today = new Date().toISOString().split('T')[0]
  
  // Calculate stats
  const stats = useMemo(() => {
    const todaySessions = sportSessions.filter((s) => s.date === today)
    const todayCalories = todaySessions.reduce((sum, s) => sum + s.caloriesBurned, 0)
    const todayMinutes = todaySessions.reduce((sum, s) => sum + s.duration, 0)
    
    // This week
    const weekStart = new Date()
    weekStart.setDate(weekStart.getDate() - weekStart.getDay())
    const weekStartStr = weekStart.toISOString().split('T')[0]
    
    const weekSessions = sportSessions.filter((s) => s.date >= weekStartStr)
    const weekCalories = weekSessions.reduce((sum, s) => sum + s.caloriesBurned, 0)
    const weekMinutes = weekSessions.reduce((sum, s) => sum + s.duration, 0)
    
    // This month
    const monthStart = today.substring(0, 7)
    const monthSessions = sportSessions.filter((s) => s.date.startsWith(monthStart))
    const monthCalories = monthSessions.reduce((sum, s) => sum + s.caloriesBurned, 0)
    
    return {
      todayCalories,
      todayMinutes,
      todaySessions: todaySessions.length,
      weekCalories,
      weekMinutes,
      weekSessions: weekSessions.length,
      monthCalories,
    }
  }, [sportSessions, today])
  
  // Recent sessions
  const recentSessions = useMemo(() => {
    return [...sportSessions]
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
      .slice(0, 10)
  }, [sportSessions])
  
  const handleAddSession = () => {
    if (!selectedActivity || !duration) return
    
    const activity = sportActivities.find((a) => a.id === selectedActivity)
    if (!activity) return
    
    const durationNum = parseInt(duration)
    const caloriesBurned = Math.round((activity.caloriesPerHour / 60) * durationNum)
    
    addSportSession({
      activityId: selectedActivity,
      date: today,
      duration: durationNum,
      caloriesBurned,
    })
    
    setSelectedActivity(null)
    setDuration('30')
    setShowAddModal(false)
  }
  
  const getActivityById = (id: string) => sportActivities.find((a) => a.id === id)
  
  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 animate-fade-up">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Sport</h1>
          <p className="text-muted-foreground">Suivez votre activité physique</p>
        </div>
        <Button onClick={() => setShowAddModal(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Ajouter</span>
        </Button>
      </div>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <AnimatedCard delay={100} className="text-center">
          <Flame className="w-8 h-8 mx-auto text-chart-5 mb-2" />
          <p className="text-2xl font-bold">{stats.todayCalories}</p>
          <p className="text-sm text-muted-foreground">Calories aujourd&apos;hui</p>
        </AnimatedCard>
        
        <AnimatedCard delay={200} className="text-center">
          <Clock className="w-8 h-8 mx-auto text-primary mb-2" />
          <p className="text-2xl font-bold">{stats.todayMinutes}</p>
          <p className="text-sm text-muted-foreground">Minutes aujourd&apos;hui</p>
        </AnimatedCard>
        
        <AnimatedCard delay={300} className="text-center">
          <TrendingUp className="w-8 h-8 mx-auto text-chart-2 mb-2" />
          <p className="text-2xl font-bold">{stats.weekCalories}</p>
          <p className="text-sm text-muted-foreground">Calories cette semaine</p>
        </AnimatedCard>
        
        <AnimatedCard delay={400} className="text-center">
          <Dumbbell className="w-8 h-8 mx-auto text-chart-3 mb-2" />
          <p className="text-2xl font-bold">{stats.weekSessions}</p>
          <p className="text-sm text-muted-foreground">Séances cette semaine</p>
        </AnimatedCard>
      </div>
      
      {/* Quick Add Activities */}
      <AnimatedCard delay={500} className="mb-6">
        <h3 className="font-semibold mb-4">Ajouter rapidement</h3>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          {sportActivities.map((activity) => {
            const Icon = activityIcons[activity.icon] || Dumbbell
            return (
              <button
                key={activity.id}
                onClick={() => {
                  setSelectedActivity(activity.id)
                  setShowAddModal(true)
                }}
                className="p-4 rounded-xl bg-muted hover:bg-muted-foreground/20 transition-all hover:scale-105 group"
              >
                <div
                  className="w-12 h-12 rounded-xl mx-auto mb-2 flex items-center justify-center transition-all group-hover:scale-110"
                  style={{ backgroundColor: `${activity.color}20` }}
                >
                  <span style={{ color: activity.color }}>
                    <Icon className="w-6 h-6" />
                  </span>
                </div>
                <p className="text-sm font-medium text-center">{activity.name}</p>
                <p className="text-xs text-muted-foreground text-center">
                  {activity.caloriesPerHour} cal/h
                </p>
              </button>
            )
          })}
        </div>
      </AnimatedCard>
      
      {/* Recent Sessions */}
      <AnimatedCard delay={600}>
        <h3 className="font-semibold mb-4">Séances récentes</h3>
        
        {recentSessions.length === 0 ? (
          <div className="text-center py-8">
            <Dumbbell className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">Aucune séance enregistrée</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentSessions.map((session) => {
              const activity = getActivityById(session.activityId)
              if (!activity) return null
              
              const Icon = activityIcons[activity.icon] || Dumbbell
              const sessionDate = new Date(session.date)
              const isToday = session.date === today
              
              return (
                <div
                  key={session.id}
                  className="flex items-center gap-4 p-3 rounded-xl hover:bg-muted/50 transition-colors group"
                >
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${activity.color}20` }}
                  >
                    <span style={{ color: activity.color }}>
                    <Icon className="w-6 h-6" />
                  </span>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{activity.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {isToday ? "Aujourd'hui" : sessionDate.toLocaleDateString('fr-FR', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                      })}
                    </p>
                  </div>
                  
                  <div className="text-right">
                    <p className="font-medium">{session.duration} min</p>
                    <p className="text-sm text-chart-5">{session.caloriesBurned} cal</p>
                  </div>
                  
                  <button
                    onClick={() => deleteSportSession(session.id)}
                    className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </AnimatedCard>
      
      {/* Add Session Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            onClick={() => setShowAddModal(false)}
          />
          <AnimatedCard className="relative w-full max-w-md z-10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Nouvelle séance</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-2 rounded-lg hover:bg-muted"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Activité</label>
                <div className="grid grid-cols-3 gap-2">
                  {sportActivities.map((activity) => {
                    const Icon = activityIcons[activity.icon] || Dumbbell
                    const isSelected = selectedActivity === activity.id
                    
                    return (
                      <button
                        key={activity.id}
                        onClick={() => setSelectedActivity(activity.id)}
                        className={cn(
                          'p-3 rounded-xl transition-all',
                          isSelected
                            ? 'ring-2 ring-primary'
                            : 'bg-muted hover:bg-muted-foreground/20'
                        )}
                        style={{
                          backgroundColor: isSelected ? `${activity.color}20` : undefined,
                        }}
                      >
                        <span
                          className="mx-auto mb-1 block w-6 h-6"
                          style={{ color: activity.color }}
                        >
                          <Icon className="w-6 h-6" />
                        </span>
                        <p className="text-xs font-medium text-center truncate">
                          {activity.name}
                        </p>
                      </button>
                    )
                  })}
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-1 block">Durée (minutes)</label>
                <Input
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  min="1"
                  max="480"
                />
                {selectedActivity && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Estimation: {Math.round(
                      ((getActivityById(selectedActivity)?.caloriesPerHour || 0) / 60) * parseInt(duration || '0')
                    )} calories
                  </p>
                )}
              </div>
              
              <div className="flex gap-3 pt-2">
                <Button variant="outline" onClick={() => setShowAddModal(false)} className="flex-1">
                  Annuler
                </Button>
                <Button onClick={handleAddSession} className="flex-1" disabled={!selectedActivity}>
                  Enregistrer
                </Button>
              </div>
            </div>
          </AnimatedCard>
        </div>
      )}
    </div>
  )
}
