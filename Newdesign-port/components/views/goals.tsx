'use client'

import { useState } from 'react'
import { useStore } from '@/lib/store'
import { AnimatedCard, ProgressRing } from '@/components/animated-card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import {
  Target,
  Plus,
  Trash2,
  X,
  Check,
  ChevronRight,
  Trophy,
} from 'lucide-react'

const goalColors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899']

export function GoalsView() {
  const { goals, goalMilestones, addGoal, updateGoal, deleteGoal, addMilestone, toggleMilestone } = useStore()
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null)
  const [newGoal, setNewGoal] = useState({
    title: '',
    description: '',
    targetValue: '',
    unit: '',
    color: '#3b82f6',
  })
  const [newMilestone, setNewMilestone] = useState('')
  
  const activeGoals = goals.filter((g) => !g.completed)
  const completedGoals = goals.filter((g) => g.completed)
  
  const handleAddGoal = () => {
    if (!newGoal.title.trim()) return
    
    addGoal({
      title: newGoal.title,
      description: newGoal.description || undefined,
      targetValue: newGoal.targetValue ? parseFloat(newGoal.targetValue) : undefined,
      currentValue: 0,
      unit: newGoal.unit || undefined,
      color: newGoal.color,
      completed: false,
    })
    
    setNewGoal({ title: '', description: '', targetValue: '', unit: '', color: '#3b82f6' })
    setShowAddModal(false)
  }
  
  const handleAddMilestone = (goalId: string) => {
    if (!newMilestone.trim()) return
    
    addMilestone({
      goalId,
      title: newMilestone,
      completed: false,
    })
    
    setNewMilestone('')
  }
  
  const handleUpdateProgress = (goalId: string, value: number) => {
    const goal = goals.find((g) => g.id === goalId)
    if (!goal) return
    
    const newValue = Math.max(0, Math.min(value, goal.targetValue || Infinity))
    const completed = goal.targetValue ? newValue >= goal.targetValue : false
    
    updateGoal(goalId, { currentValue: newValue, completed })
  }
  
  const getGoalProgress = (goal: typeof goals[0]) => {
    if (!goal.targetValue) return 0
    return (goal.currentValue / goal.targetValue) * 100
  }
  
  const selectedGoalData = selectedGoal ? goals.find((g) => g.id === selectedGoal) : null
  const selectedGoalMilestones = selectedGoal
    ? goalMilestones.filter((m) => m.goalId === selectedGoal)
    : []
  
  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 animate-fade-up">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Objectifs</h1>
          <p className="text-muted-foreground">Suivez vos projets et objectifs personnels</p>
        </div>
        <Button onClick={() => setShowAddModal(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Nouvel objectif</span>
        </Button>
      </div>
      
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <AnimatedCard delay={100} className="text-center">
          <Target className="w-8 h-8 mx-auto text-primary mb-2" />
          <p className="text-2xl font-bold">{activeGoals.length}</p>
          <p className="text-sm text-muted-foreground">En cours</p>
        </AnimatedCard>
        
        <AnimatedCard delay={200} className="text-center">
          <Trophy className="w-8 h-8 mx-auto text-chart-4 mb-2" />
          <p className="text-2xl font-bold">{completedGoals.length}</p>
          <p className="text-sm text-muted-foreground">Terminés</p>
        </AnimatedCard>
        
        <AnimatedCard delay={300} className="text-center">
          <p className="text-2xl font-bold">
            {activeGoals.length > 0
              ? Math.round(activeGoals.reduce((sum, g) => sum + getGoalProgress(g), 0) / activeGoals.length)
              : 0}%
          </p>
          <p className="text-sm text-muted-foreground">Progression moyenne</p>
        </AnimatedCard>
        
        <AnimatedCard delay={400} className="text-center">
          <p className="text-2xl font-bold">
            {goalMilestones.filter((m) => m.completed).length}/{goalMilestones.length}
          </p>
          <p className="text-sm text-muted-foreground">Étapes terminées</p>
        </AnimatedCard>
      </div>
      
      {/* Goals Grid */}
      {goals.length === 0 ? (
        <AnimatedCard delay={500} className="text-center py-12">
          <Target className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-semibold mb-2">Aucun objectif</h3>
          <p className="text-muted-foreground mb-4">
            Définissez vos objectifs pour suivre votre progression
          </p>
          <Button onClick={() => setShowAddModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Créer un objectif
          </Button>
        </AnimatedCard>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {activeGoals.map((goal, index) => {
            const progress = getGoalProgress(goal)
            const milestones = goalMilestones.filter((m) => m.goalId === goal.id)
            const completedMilestones = milestones.filter((m) => m.completed).length
            
            return (
              <AnimatedCard
                key={goal.id}
                delay={500 + index * 100}
                className="cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all"
                onClick={() => setSelectedGoal(goal.id)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${goal.color}20` }}
                  >
                    <Target className="w-5 h-5" style={{ color: goal.color }} />
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </div>
                
                <h3 className="font-semibold mb-1">{goal.title}</h3>
                {goal.description && (
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                    {goal.description}
                  </p>
                )}
                
                {goal.targetValue && (
                  <>
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-muted-foreground">Progression</span>
                      <span className="font-medium">
                        {goal.currentValue} / {goal.targetValue} {goal.unit}
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(100, progress)}%`,
                          backgroundColor: goal.color,
                        }}
                      />
                    </div>
                  </>
                )}
                
                {milestones.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <p className="text-xs text-muted-foreground">
                      {completedMilestones}/{milestones.length} étapes terminées
                    </p>
                  </div>
                )}
              </AnimatedCard>
            )
          })}
          
          {/* Completed goals section */}
          {completedGoals.length > 0 && (
            <div className="md:col-span-2 lg:col-span-3">
              <h3 className="text-lg font-semibold mb-3 mt-6 text-muted-foreground">
                Objectifs terminés
              </h3>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {completedGoals.map((goal) => (
                  <AnimatedCard key={goal.id} className="opacity-70">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-chart-2/10 flex items-center justify-center">
                        <Trophy className="w-5 h-5 text-chart-2" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium line-through">{goal.title}</h4>
                        <p className="text-xs text-muted-foreground">Terminé</p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteGoal(goal.id)
                        }}
                        className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </AnimatedCard>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Goal Detail Modal */}
      {selectedGoal && selectedGoalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            onClick={() => setSelectedGoal(null)}
          />
          <AnimatedCard className="relative w-full max-w-lg z-10 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: `${selectedGoalData.color}20` }}
                >
                  <Target className="w-5 h-5" style={{ color: selectedGoalData.color }} />
                </div>
                <h2 className="text-lg font-semibold">{selectedGoalData.title}</h2>
              </div>
              <button
                onClick={() => setSelectedGoal(null)}
                className="p-2 rounded-lg hover:bg-muted"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {selectedGoalData.description && (
              <p className="text-muted-foreground mb-4">{selectedGoalData.description}</p>
            )}
            
            {/* Progress */}
            {selectedGoalData.targetValue && (
              <div className="mb-6">
                <div className="flex items-center justify-center mb-4">
                  <ProgressRing
                    progress={getGoalProgress(selectedGoalData)}
                    size={120}
                    strokeWidth={10}
                    color="primary"
                  >
                    <p className="text-xl font-bold">
                      {Math.round(getGoalProgress(selectedGoalData))}%
                    </p>
                  </ProgressRing>
                </div>
                
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={selectedGoalData.currentValue}
                    onChange={(e) => handleUpdateProgress(selectedGoalData.id, parseFloat(e.target.value) || 0)}
                    className="flex-1"
                    min="0"
                    max={selectedGoalData.targetValue}
                  />
                  <span className="text-muted-foreground">
                    / {selectedGoalData.targetValue} {selectedGoalData.unit}
                  </span>
                </div>
              </div>
            )}
            
            {/* Milestones */}
            <div className="border-t border-border pt-4">
              <h4 className="font-medium mb-3">Étapes</h4>
              
              <div className="space-y-2 mb-4">
                {selectedGoalMilestones.map((milestone) => (
                  <div
                    key={milestone.id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50"
                  >
                    <button
                      onClick={() => toggleMilestone(milestone.id)}
                      className={cn(
                        'w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all',
                        milestone.completed
                          ? 'bg-chart-2 border-chart-2'
                          : 'border-muted-foreground hover:border-primary'
                      )}
                    >
                      {milestone.completed && <Check className="w-3 h-3 text-white" />}
                    </button>
                    <span className={cn(
                      milestone.completed && 'line-through text-muted-foreground'
                    )}>
                      {milestone.title}
                    </span>
                  </div>
                ))}
              </div>
              
              <div className="flex gap-2">
                <Input
                  value={newMilestone}
                  onChange={(e) => setNewMilestone(e.target.value)}
                  placeholder="Nouvelle étape..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddMilestone(selectedGoalData.id)
                  }}
                />
                <Button onClick={() => handleAddMilestone(selectedGoalData.id)} size="icon">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
            
            <div className="flex gap-3 mt-6 pt-4 border-t border-border">
              <Button
                variant="destructive"
                onClick={() => {
                  deleteGoal(selectedGoalData.id)
                  setSelectedGoal(null)
                }}
                className="flex-1"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Supprimer
              </Button>
              {!selectedGoalData.completed && selectedGoalData.targetValue && (
                <Button
                  onClick={() => {
                    updateGoal(selectedGoalData.id, {
                      currentValue: selectedGoalData.targetValue,
                      completed: true,
                    })
                    setSelectedGoal(null)
                  }}
                  className="flex-1"
                >
                  <Trophy className="w-4 h-4 mr-2" />
                  Marquer terminé
                </Button>
              )}
            </div>
          </AnimatedCard>
        </div>
      )}
      
      {/* Add Goal Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            onClick={() => setShowAddModal(false)}
          />
          <AnimatedCard className="relative w-full max-w-md z-10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Nouvel objectif</h2>
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
                  value={newGoal.title}
                  onChange={(e) => setNewGoal((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="Ex: Apprendre l'espagnol"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium mb-1 block">Description (optionnel)</label>
                <Input
                  value={newGoal.description}
                  onChange={(e) => setNewGoal((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Décrivez votre objectif"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Valeur cible</label>
                  <Input
                    type="number"
                    value={newGoal.targetValue}
                    onChange={(e) => setNewGoal((prev) => ({ ...prev, targetValue: e.target.value }))}
                    placeholder="100"
                    min="0"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Unité</label>
                  <Input
                    value={newGoal.unit}
                    onChange={(e) => setNewGoal((prev) => ({ ...prev, unit: e.target.value }))}
                    placeholder="leçons, km, €..."
                  />
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">Couleur</label>
                <div className="flex flex-wrap gap-2">
                  {goalColors.map((color) => (
                    <button
                      key={color}
                      onClick={() => setNewGoal((prev) => ({ ...prev, color }))}
                      className={cn(
                        'w-8 h-8 rounded-full transition-all',
                        newGoal.color === color && 'ring-2 ring-offset-2 ring-offset-background'
                      )}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
              
              <div className="flex gap-3 pt-2">
                <Button variant="outline" onClick={() => setShowAddModal(false)} className="flex-1">
                  Annuler
                </Button>
                <Button onClick={handleAddGoal} className="flex-1">
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
