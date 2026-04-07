'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { useStore } from '@/lib/store'
import { Sidebar, BottomNavigation, MobileHeader } from './navigation'
import { Dashboard } from './views/dashboard'
import { AgendaView } from './views/agenda'
import { HabitsView } from './views/habits'
import { SportView } from './views/sport'
import { HydrationView } from './views/hydration'
import { MoodView } from './views/mood'
import { FinancesView } from './views/finances'
import { GoalsView } from './views/goals'
import { NotesView } from './views/notes'
import { SettingsView } from './views/settings'

export function AppShell() {
  const [mounted, setMounted] = useState(false)
  const { currentTab, settings } = useStore()
  
  // Handle client-side mounting
  useEffect(() => {
    setMounted(true)
  }, [])
  
  const renderView = () => {
    switch (currentTab) {
      case 'dashboard':
        return <Dashboard />
      case 'agenda':
        return <AgendaView />
      case 'habits':
        return <HabitsView />
      case 'sport':
        return <SportView />
      case 'hydration':
        return <HydrationView />
      case 'mood':
        return <MoodView />
      case 'finances':
        return <FinancesView />
      case 'goals':
        return <GoalsView />
      case 'notes':
        return <NotesView />
      case 'settings':
        return <SettingsView />
      default:
        return <Dashboard />
    }
  }
  
  // Show loading screen during hydration
  if (!mounted) {
    return (
      <div className="min-h-screen bg-[oklch(0.08_0.02_240)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-2 border-[oklch(0.7_0.15_180)] border-t-transparent animate-spin" />
          <p className="text-[oklch(0.6_0_0)] text-sm">Chargement...</p>
        </div>
      </div>
    )
  }
  
  const wallpaper = settings.wallpaper

  return (
    <div
      className={cn('relative min-h-screen overflow-hidden', !wallpaper && 'bg-background')}
      data-wallpaper={wallpaper ? 'true' : undefined}
    >
      {/* Calque de fond : avec photo = léger voile + verre sur les cartes ; sans photo = dégradés d’origine */}
      <div className="pointer-events-none fixed inset-0 z-0" aria-hidden>
        {wallpaper ? (
          <>
            <div
              className="absolute inset-0 bg-cover bg-center bg-no-repeat"
              style={{ backgroundImage: `url("${wallpaper}")` }}
            />
            {/* Voile léger (maquette type Gemini) : le bambou reste visible, le texte reste lisible */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/10 to-black/35" />
          </>
        ) : (
          <>
            <div className="absolute inset-0 bg-gradient-to-br from-[oklch(0.08_0.03_150)] via-[oklch(0.06_0.02_150)] to-[oklch(0.04_0.015_150)]" />
            <div className="absolute inset-0 bg-gradient-to-br from-[oklch(0.08_0.03_150/0.5)] via-transparent to-[oklch(0.05_0.02_150/0.4)]" />
            <div
              className="absolute top-[20%] right-[10%] h-[40%] w-[40%] animate-pulse rounded-full bg-[oklch(0.4_0.15_145/0.1)] blur-[80px]"
              style={{ animationDuration: '10s' }}
            />
            <div
              className="absolute bottom-[30%] left-[5%] h-[30%] w-[30%] animate-pulse rounded-full bg-[oklch(0.35_0.12_150/0.08)] blur-[60px]"
              style={{ animationDuration: '12s', animationDelay: '3s' }}
            />
          </>
        )}
      </div>
      
      {/* Desktop Sidebar */}
      <Sidebar />
      
      {/* Mobile Header */}
      <MobileHeader />
      
      {/* Main Content */}
      <main className="relative z-10 min-h-screen bg-transparent md:ml-64">
        <div className="pt-16 pb-20 md:pt-0 md:pb-0">
          {renderView()}
        </div>
      </main>
      
      {/* Mobile Bottom Navigation */}
      <BottomNavigation />
    </div>
  )
}
