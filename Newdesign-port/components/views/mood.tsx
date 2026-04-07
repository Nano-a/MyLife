'use client'

import { useState, useMemo } from 'react'
import { useStore } from '@/lib/store'
import { AnimatedCard } from '@/components/animated-card'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import {
  Smile,
  TrendingUp,
  Calendar,
} from 'lucide-react'

const moodEmojis = ['', '😢', '😕', '😐', '😊', '😄']
const moodLabels = ['', 'Très mal', 'Mal', 'Neutre', 'Bien', 'Très bien']
const moodColors = ['', 'text-destructive', 'text-chart-5', 'text-muted-foreground', 'text-chart-2', 'text-chart-4']
const moodBgColors = ['', 'bg-destructive/10', 'bg-chart-5/10', 'bg-muted', 'bg-chart-2/10', 'bg-chart-4/10']

export function MoodView() {
  const { moodEntries, addMoodEntry, updateMoodEntry } = useStore()
  const [note, setNote] = useState('')
  
  const today = new Date().toISOString().split('T')[0]
  const todayMood = moodEntries.find((m) => m.date === today)
  
  // Calculate stats
  const stats = useMemo(() => {
    // Last 30 days
    const last30Days: { date: string; rating: number | null }[] = []
    for (let i = 29; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      const entry = moodEntries.find((m) => m.date === dateStr)
      last30Days.push({ date: dateStr, rating: entry?.rating || null })
    }
    
    // Average mood
    const ratedDays = last30Days.filter((d) => d.rating !== null)
    const averageMood = ratedDays.length > 0
      ? ratedDays.reduce((sum, d) => sum + (d.rating || 0), 0) / ratedDays.length
      : 0
    
    // Mood distribution
    const distribution = [0, 0, 0, 0, 0, 0]
    moodEntries.forEach((m) => {
      distribution[m.rating]++
    })
    
    // Streak of good days (rating >= 4)
    let goodStreak = 0
    for (let i = last30Days.length - 1; i >= 0; i--) {
      if (last30Days[i].rating && last30Days[i].rating! >= 4) {
        goodStreak++
      } else if (last30Days[i].rating !== null) {
        break
      }
    }
    
    return { last30Days, averageMood, distribution, goodStreak, trackedDays: ratedDays.length }
  }, [moodEntries])
  
  const handleMoodSelect = (rating: 1 | 2 | 3 | 4 | 5) => {
    if (todayMood) {
      updateMoodEntry(todayMood.id, { rating, note: note || todayMood.note })
    } else {
      addMoodEntry({ date: today, rating, note: note || undefined })
    }
  }
  
  const handleNoteChange = (newNote: string) => {
    setNote(newNote)
    if (todayMood) {
      updateMoodEntry(todayMood.id, { note: newNote || undefined })
    }
  }
  
  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6 animate-fade-up">
        <h1 className="text-2xl md:text-3xl font-bold">Humeur</h1>
        <p className="text-muted-foreground">Suivez comment vous vous sentez au quotidien</p>
      </div>
      
      {/* Today's Mood */}
      <AnimatedCard delay={100} className="mb-6">
        <h3 className="font-semibold mb-4 text-center">Comment vous sentez-vous aujourd&apos;hui ?</h3>
        
        <div className="flex justify-center gap-3 md:gap-6 mb-6">
          {[1, 2, 3, 4, 5].map((rating) => {
            const isSelected = todayMood?.rating === rating
            return (
              <button
                key={rating}
                onClick={() => handleMoodSelect(rating as 1 | 2 | 3 | 4 | 5)}
                className={cn(
                  'flex flex-col items-center gap-2 p-3 md:p-4 rounded-2xl transition-all duration-300',
                  isSelected
                    ? `${moodBgColors[rating]} ring-2 ring-offset-2 ring-offset-background`
                    : 'hover:bg-muted hover:scale-105'
                )}
                style={{
                  boxShadow: isSelected ? `0 0 30px ${rating >= 4 ? 'var(--chart-2)' : rating <= 2 ? 'var(--destructive)' : 'var(--muted)'}40` : undefined
                }}
              >
                <span className={cn(
                  'text-4xl md:text-5xl transition-transform duration-300',
                  isSelected && 'scale-125'
                )}>
                  {moodEmojis[rating]}
                </span>
                <span className={cn(
                  'text-xs md:text-sm font-medium',
                  isSelected ? moodColors[rating] : 'text-muted-foreground'
                )}>
                  {moodLabels[rating]}
                </span>
              </button>
            )
          })}
        </div>
        
        {/* Note input */}
        <div>
          <label className="text-sm font-medium mb-2 block text-center">
            Note (optionnel)
          </label>
          <Input
            value={note || todayMood?.note || ''}
            onChange={(e) => handleNoteChange(e.target.value)}
            placeholder="Comment s'est passée votre journée ?"
            className="max-w-md mx-auto"
          />
        </div>
      </AnimatedCard>
      
      <div className="grid md:grid-cols-3 gap-6">
        {/* Stats */}
        <AnimatedCard delay={200}>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">Statistiques</h3>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Humeur moyenne</span>
              <div className="flex items-center gap-2">
                <span className="text-2xl">{moodEmojis[Math.round(stats.averageMood)] || '😐'}</span>
                <span className="font-semibold">{stats.averageMood.toFixed(1)}/5</span>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Jours suivis (30j)</span>
              <span className="font-semibold">{stats.trackedDays}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Série de bons jours</span>
              <span className="font-semibold text-chart-2">{stats.goodStreak} jours</span>
            </div>
          </div>
        </AnimatedCard>
        
        {/* Distribution */}
        <AnimatedCard delay={300}>
          <div className="flex items-center gap-2 mb-4">
            <Smile className="w-5 h-5 text-chart-4" />
            <h3 className="font-semibold">Répartition</h3>
          </div>
          
          <div className="space-y-2">
            {[5, 4, 3, 2, 1].map((rating) => {
              const count = stats.distribution[rating]
              const total = moodEntries.length
              const percentage = total > 0 ? (count / total) * 100 : 0
              
              return (
                <div key={rating} className="flex items-center gap-3">
                  <span className="text-lg w-8">{moodEmojis[rating]}</span>
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all duration-500',
                        rating >= 4 ? 'bg-chart-2' : rating <= 2 ? 'bg-chart-5' : 'bg-muted-foreground'
                      )}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="text-sm text-muted-foreground w-8 text-right">{count}</span>
                </div>
              )
            })}
          </div>
        </AnimatedCard>
        
        {/* Recent entries */}
        <AnimatedCard delay={400}>
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5 text-chart-3" />
            <h3 className="font-semibold">Entrées récentes</h3>
          </div>
          
          {moodEntries.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              Aucune entrée enregistrée
            </p>
          ) : (
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {[...moodEntries]
                .sort((a, b) => b.date.localeCompare(a.date))
                .slice(0, 7)
                .map((entry) => {
                  const d = new Date(entry.date)
                  const isToday = entry.date === today
                  
                  return (
                    <div
                      key={entry.id}
                      className={cn(
                        'flex items-center gap-3 p-2 rounded-lg',
                        isToday && 'bg-muted'
                      )}
                    >
                      <span className="text-2xl">{moodEmojis[entry.rating]}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">
                          {isToday ? "Aujourd'hui" : d.toLocaleDateString('fr-FR', {
                            weekday: 'short',
                            day: 'numeric',
                            month: 'short',
                          })}
                        </p>
                        {entry.note && (
                          <p className="text-xs text-muted-foreground truncate">
                            {entry.note}
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })}
            </div>
          )}
        </AnimatedCard>
      </div>
      
      {/* Monthly Calendar View */}
      <AnimatedCard delay={500} className="mt-6">
        <h3 className="font-semibold mb-4">Calendrier des 30 derniers jours</h3>
        
        <div className="grid grid-cols-7 md:grid-cols-10 gap-2">
          {stats.last30Days.map(({ date, rating }) => {
            const d = new Date(date)
            const isToday = date === today
            
            return (
              <div
                key={date}
                className={cn(
                  'aspect-square rounded-lg flex flex-col items-center justify-center text-xs transition-all',
                  isToday && 'ring-2 ring-primary',
                  rating ? moodBgColors[rating] : 'bg-muted/50'
                )}
                title={`${d.toLocaleDateString('fr-FR')}: ${rating ? moodLabels[rating] : 'Non renseigné'}`}
              >
                {rating ? (
                  <span className="text-lg">{moodEmojis[rating]}</span>
                ) : (
                  <span className="text-muted-foreground">{d.getDate()}</span>
                )}
              </div>
            )
          })}
        </div>
      </AnimatedCard>
    </div>
  )
}
