'use client'

import { useStore } from '@/lib/store'
import type { NavigationTab } from '@/lib/types'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Calendar,
  CheckSquare,
  Dumbbell,
  Droplets,
  Smile,
  Wallet,
  Target,
  StickyNote,
  Settings,
} from 'lucide-react'

const navItems: { tab: NavigationTab; label: string; icon: typeof LayoutDashboard }[] = [
  { tab: 'dashboard', label: 'Accueil', icon: LayoutDashboard },
  { tab: 'agenda', label: 'Agenda', icon: Calendar },
  { tab: 'habits', label: 'Habitudes', icon: CheckSquare },
  { tab: 'sport', label: 'Sport', icon: Dumbbell },
  { tab: 'hydration', label: 'Eau', icon: Droplets },
  { tab: 'mood', label: 'Humeur', icon: Smile },
  { tab: 'finances', label: 'Finances', icon: Wallet },
  { tab: 'goals', label: 'Objectifs', icon: Target },
  { tab: 'notes', label: 'Notes', icon: StickyNote },
  { tab: 'settings', label: 'Paramètres', icon: Settings },
]

export function BottomNavigation() {
  const { currentTab, setCurrentTab } = useStore()
  
  // Show only main tabs on mobile bottom nav
  const mobileNavItems = navItems.slice(0, 5)
  
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass-strong border-t-0 md:hidden safe-area-bottom rounded-t-3xl">
      <div className="flex items-center justify-around px-2 py-3">
        {mobileNavItems.map(({ tab, label, icon: Icon }) => {
          const isActive = currentTab === tab
          return (
            <button
              key={tab}
              onClick={() => setCurrentTab(tab)}
              className={cn(
                'flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all duration-300',
                isActive
                  ? 'text-primary bg-primary/10 scale-105'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              )}
            >
              <Icon
                className={cn(
                  'w-5 h-5 transition-all duration-300',
                  isActive && 'drop-shadow-[0_0_8px_var(--primary)]'
                )}
              />
              <span className="text-xs font-medium">{label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}

export function Sidebar() {
  const { currentTab, setCurrentTab } = useStore()
  
  return (
    <aside className="hidden md:flex flex-col w-64 h-screen fixed left-0 top-0 glass-strong border-r-0 z-40">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-6 border-b border-border">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center glow-sm">
          <span className="text-lg font-bold text-primary-foreground">LF</span>
        </div>
        <div>
          <h1 className="text-lg font-semibold gradient-text">LifeFlow</h1>
          <p className="text-xs text-muted-foreground">Suivi de vie</p>
        </div>
      </div>
      
      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        {navItems.map(({ tab, label, icon: Icon }, index) => {
          const isActive = currentTab === tab
          return (
            <button
              key={tab}
              onClick={() => setCurrentTab(tab)}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 animate-fade-up',
                isActive
                  ? 'bg-primary/10 text-primary glow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
                `stagger-${index % 8 + 1}`
              )}
            >
              <Icon
                className={cn(
                  'w-5 h-5 transition-all duration-300',
                  isActive && 'drop-shadow-[0_0_8px_var(--primary)]'
                )}
              />
              <span className="font-medium">{label}</span>
              {isActive && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              )}
            </button>
          )
        })}
      </nav>
      
      {/* Footer */}
      <div className="px-6 py-4 border-t border-border">
        <p className="text-xs text-muted-foreground text-center">
          v1.0.0 - Stockage local
        </p>
      </div>
    </aside>
  )
}

export function MobileHeader() {
  const { currentTab, setCurrentTab } = useStore()
  const currentItem = navItems.find((item) => item.tab === currentTab)
  const Icon = currentItem?.icon || LayoutDashboard
  
  // Additional tabs for mobile menu
  const additionalTabs = navItems.slice(5)
  
  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass-strong border-b-0 md:hidden safe-area-top">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <span className="text-sm font-bold text-primary-foreground">LF</span>
          </div>
          <div className="flex items-center gap-2">
            <Icon className="w-5 h-5 text-primary" />
            <h1 className="text-lg font-semibold">{currentItem?.label}</h1>
          </div>
        </div>
        
        {/* Additional tabs dropdown */}
        <div className="flex items-center gap-1">
          {additionalTabs.map(({ tab, icon: TabIcon }) => {
            const isActive = currentTab === tab
            return (
              <button
                key={tab}
                onClick={() => setCurrentTab(tab)}
                className={cn(
                  'p-2 rounded-lg transition-all duration-300',
                  isActive
                    ? 'text-primary bg-primary/10'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                )}
              >
                <TabIcon className="w-5 h-5" />
              </button>
            )
          })}
        </div>
      </div>
    </header>
  )
}
