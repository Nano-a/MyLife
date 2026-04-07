'use client'

import { useState, useMemo } from 'react'
import { useStore } from '@/lib/store'
import { AnimatedCard } from '@/components/animated-card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import {
  Calendar,
  Plus,
  Clock,
  Check,
  Trash2,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react'

export function AgendaView() {
  const { events, addEvent, updateEvent, deleteEvent, toggleEventComplete } = useStore()
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [showAddModal, setShowAddModal] = useState(false)
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    startTime: '09:00',
    endTime: '10:00',
  })
  
  const dateStr = selectedDate.toISOString().split('T')[0]
  
  // Get events for selected date
  const dayEvents = useMemo(() => {
    return events
      .filter((e) => e.date === dateStr)
      .sort((a, b) => a.startTime.localeCompare(b.startTime))
  }, [events, dateStr])
  
  // Calendar days for current month
  const calendarDays = useMemo(() => {
    const year = selectedDate.getFullYear()
    const month = selectedDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startOffset = firstDay.getDay()
    
    const days: { date: Date; isCurrentMonth: boolean }[] = []
    
    // Previous month days
    for (let i = startOffset - 1; i >= 0; i--) {
      const date = new Date(year, month, -i)
      days.push({ date, isCurrentMonth: false })
    }
    
    // Current month days
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const date = new Date(year, month, i)
      days.push({ date, isCurrentMonth: true })
    }
    
    // Next month days to fill grid
    const remaining = 42 - days.length
    for (let i = 1; i <= remaining; i++) {
      const date = new Date(year, month + 1, i)
      days.push({ date, isCurrentMonth: false })
    }
    
    return days
  }, [selectedDate])
  
  const handleAddEvent = () => {
    if (!newEvent.title.trim()) return
    
    addEvent({
      title: newEvent.title,
      description: newEvent.description,
      date: dateStr,
      startTime: newEvent.startTime,
      endTime: newEvent.endTime,
      completed: false,
    })
    
    setNewEvent({ title: '', description: '', startTime: '09:00', endTime: '10:00' })
    setShowAddModal(false)
  }
  
  const navigateMonth = (direction: number) => {
    setSelectedDate((prev) => {
      const newDate = new Date(prev)
      newDate.setMonth(newDate.getMonth() + direction)
      return newDate
    })
  }
  
  const today = new Date().toISOString().split('T')[0]
  
  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 animate-fade-up">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Agenda</h1>
          <p className="text-muted-foreground">Gérez vos événements et rendez-vous</p>
        </div>
        <Button onClick={() => setShowAddModal(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Ajouter</span>
        </Button>
      </div>
      
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <AnimatedCard className="lg:col-span-2" delay={100}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">
              {selectedDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigateMonth(-1)}
                className="p-2 rounded-lg hover:bg-muted transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => setSelectedDate(new Date())}
                className="px-3 py-1.5 text-sm rounded-lg hover:bg-muted transition-colors"
              >
                Aujourd&apos;hui
              </button>
              <button
                onClick={() => navigateMonth(1)}
                className="p-2 rounded-lg hover:bg-muted transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
          
          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'].map((day) => (
              <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
                {day}
              </div>
            ))}
          </div>
          
          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map(({ date, isCurrentMonth }, index) => {
              const dayStr = date.toISOString().split('T')[0]
              const isSelected = dayStr === dateStr
              const isToday = dayStr === today
              const hasEvents = events.some((e) => e.date === dayStr)
              
              return (
                <button
                  key={index}
                  onClick={() => setSelectedDate(date)}
                  className={cn(
                    'aspect-square p-1 rounded-lg text-sm transition-all duration-200 relative',
                    isCurrentMonth ? 'text-foreground' : 'text-muted-foreground/50',
                    isSelected && 'bg-primary text-primary-foreground',
                    !isSelected && isToday && 'bg-accent/50',
                    !isSelected && 'hover:bg-muted'
                  )}
                >
                  <span>{date.getDate()}</span>
                  {hasEvents && !isSelected && (
                    <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
                  )}
                </button>
              )
            })}
          </div>
        </AnimatedCard>
        
        {/* Events for selected day */}
        <AnimatedCard delay={200}>
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5 text-primary" />
            <h2 className="font-semibold">
              {selectedDate.toLocaleDateString('fr-FR', { 
                weekday: 'long', 
                day: 'numeric', 
                month: 'long' 
              })}
            </h2>
          </div>
          
          {dayEvents.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">Aucun événement</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAddModal(true)}
                className="mt-3"
              >
                <Plus className="w-4 h-4 mr-2" />
                Ajouter un événement
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {dayEvents.map((event) => (
                <div
                  key={event.id}
                  className={cn(
                    'p-3 rounded-xl border transition-all',
                    event.completed
                      ? 'bg-muted/50 border-transparent'
                      : 'bg-card border-border hover:border-primary/50'
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <button
                        onClick={() => toggleEventComplete(event.id)}
                        className={cn(
                          'w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all mt-0.5',
                          event.completed
                            ? 'bg-primary border-primary text-primary-foreground'
                            : 'border-muted-foreground hover:border-primary'
                        )}
                      >
                        {event.completed && <Check className="w-3 h-3" />}
                      </button>
                      <div>
                        <p className={cn(
                          'font-medium',
                          event.completed && 'line-through text-muted-foreground'
                        )}>
                          {event.title}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                          <Clock className="w-3 h-3" />
                          <span>{event.startTime}</span>
                          {event.endTime && (
                            <>
                              <span>-</span>
                              <span>{event.endTime}</span>
                            </>
                          )}
                        </div>
                        {event.description && (
                          <p className="text-sm text-muted-foreground mt-2">
                            {event.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => deleteEvent(event.id)}
                      className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </AnimatedCard>
      </div>
      
      {/* Add Event Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            onClick={() => setShowAddModal(false)}
          />
          <AnimatedCard className="relative w-full max-w-md z-10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Nouvel événement</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-2 rounded-lg hover:bg-muted"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Titre</label>
                <Input
                  value={newEvent.title}
                  onChange={(e) => setNewEvent((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="Ex: Réunion d'équipe"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium mb-1 block">Description (optionnel)</label>
                <Input
                  value={newEvent.description}
                  onChange={(e) => setNewEvent((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Détails de l'événement"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Début</label>
                  <Input
                    type="time"
                    value={newEvent.startTime}
                    onChange={(e) => setNewEvent((prev) => ({ ...prev, startTime: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Fin</label>
                  <Input
                    type="time"
                    value={newEvent.endTime}
                    onChange={(e) => setNewEvent((prev) => ({ ...prev, endTime: e.target.value }))}
                  />
                </div>
              </div>
              
              <div className="flex gap-3 pt-2">
                <Button variant="outline" onClick={() => setShowAddModal(false)} className="flex-1">
                  Annuler
                </Button>
                <Button onClick={handleAddEvent} className="flex-1">
                  Ajouter
                </Button>
              </div>
            </div>
          </AnimatedCard>
        </div>
      )}
    </div>
  )
}
