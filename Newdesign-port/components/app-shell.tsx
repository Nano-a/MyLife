'use client'

import { useEffect, useState } from 'react'
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
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background with Overlays for Readability */}
      <div className="fixed inset-0 -z-10">
        {/* Background Image (if set) */}
        {wallpaper && (
          <div 
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url("${wallpaper}")` }}
          />
        )}
        
        {/* Dark overlay for text readability */}
        <div className={`absolute inset-0 ${wallpaper ? 'bg-black/60' : 'bg-gradient-to-br from-[oklch(0.08_0.03_150)] via-[oklch(0.06_0.02_150)] to-[oklch(0.04_0.015_150)]'}`} />
        
        {/* Gradient overlay for depth and color harmony */}
        <div className="absolute inset-0 bg-gradient-to-br from-[oklch(0.08_0.03_150/0.5)] via-transparent to-[oklch(0.05_0.02_150/0.4)]" />
        
        {/* Subtle animated glow */}
        <div className="absolute top-[20%] right-[10%] w-[40%] h-[40%] rounded-full bg-[oklch(0.4_0.15_145/0.1)] blur-[80px] animate-pulse" style={{ animationDuration: '10s' }} />
        <div className="absolute bottom-[30%] left-[5%] w-[30%] h-[30%] rounded-full bg-[oklch(0.35_0.12_150/0.08)] blur-[60px] animate-pulse" style={{ animationDuration: '12s', animationDelay: '3s' }} />
      </div>
      
      {/* Desktop Sidebar */}
      <Sidebar />
      
      {/* Mobile Header */}
      <MobileHeader />
      
      {/* Main Content */}
      <main className="md:ml-64 min-h-screen relative z-10">
        <div className="pt-16 pb-20 md:pt-0 md:pb-0">
          {renderView()}
        </div>
      </main>
      
      {/* Mobile Bottom Navigation */}
      <BottomNavigation />
    </div>
  )
}
