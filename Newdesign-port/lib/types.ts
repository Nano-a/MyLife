// LifeFlow Types - French Personal Life Tracker

export type Theme = 'light' | 'dark' | 'amoled'
export type AccentColor = 'blue' | 'teal' | 'purple' | 'pink' | 'orange' | 'green'

/** Famille visuelle (indépendante du mode clair / sombre / AMOLED). */
export type VisualStyle =
  | 'glassmorphism'
  | 'flat'
  | 'material'
  | 'skeuomorphism'
  | 'neumorphism'
  | 'minimalism'
  | 'dark_mode'
  | 'brutalism'
  | 'gradient'

// User Profile
export interface UserProfile {
  id: string
  name: string
  age: number
  weight: number // kg
  height: number // cm
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'
  sleepHours: number
  createdAt: string
  updatedAt: string
}

// Settings
export interface AppSettings {
  theme: Theme
  /** Style d’interface (flat, matière, verre, etc.) */
  visualStyle: VisualStyle
  accentColor: AccentColor
  fontSize: 'small' | 'medium' | 'large'
  pinEnabled: boolean
  pin?: string
  notifications: NotificationSettings
  language: 'fr' // French only for now
  wallpaper?: string // URL or base64 data URL for custom wallpaper
}

export interface NotificationSettings {
  enabled: boolean
  water: boolean
  habits: boolean
  agenda: boolean
  sport: boolean
  finances: boolean
  goals: boolean
  quietHoursStart: string // HH:mm
  quietHoursEnd: string // HH:mm
  sound: 'default' | 'gentle' | 'alert' | 'none'
}

// Agenda
export interface AgendaEvent {
  id: string
  title: string
  description?: string
  date: string // YYYY-MM-DD
  startTime: string // HH:mm
  endTime?: string // HH:mm
  reminder?: number // minutes before
  color?: string
  completed: boolean
  createdAt: string
}

// Habits
export interface Habit {
  id: string
  name: string
  icon: string
  type: 'boolean' | 'quantity'
  targetQuantity?: number
  unit?: string
  frequency: 'daily' | 'weekly' | 'custom'
  customDays?: number[] // 0-6 for Sun-Sat
  reminder?: string // HH:mm
  color: string
  createdAt: string
}

export interface HabitLog {
  id: string
  habitId: string
  date: string // YYYY-MM-DD
  completed: boolean
  quantity?: number
  note?: string
}

// Sport
export interface SportActivity {
  id: string
  name: string
  icon: string
  caloriesPerHour: number
  color: string
}

export interface SportSession {
  id: string
  activityId: string
  date: string // YYYY-MM-DD
  duration: number // minutes
  caloriesBurned: number
  notes?: string
  createdAt: string
}

// Hydration
export interface HydrationLog {
  id: string
  date: string // YYYY-MM-DD
  amount: number // ml
  time: string // HH:mm
}

export interface HydrationGoal {
  baseGoal: number // ml
  adjustForActivity: boolean
}

// Mood
export interface MoodEntry {
  id: string
  date: string // YYYY-MM-DD
  rating: 1 | 2 | 3 | 4 | 5
  note?: string
  createdAt: string
}

// Finances
export interface Transaction {
  id: string
  type: 'income' | 'expense'
  amount: number
  categoryId: string
  description: string
  date: string // YYYY-MM-DD
  isEssential: boolean
  isRecurring: boolean
  recurringId?: string
  createdAt: string
}

export interface FinanceCategory {
  id: string
  name: string
  icon: string
  color: string
  type: 'income' | 'expense'
  budget?: number // monthly budget for expense categories
}

export interface Subscription {
  id: string
  name: string
  amount: number
  frequency: 'monthly' | 'yearly'
  categoryId: string
  nextBillingDate: string
  active: boolean
}

export interface BalanceRecord {
  id: string
  date: string
  balance: number
  note?: string
}

// Goals
export interface Goal {
  id: string
  title: string
  description?: string
  targetValue?: number
  currentValue: number
  unit?: string
  deadline?: string
  color: string
  completed: boolean
  createdAt: string
  updatedAt: string
}

export interface GoalMilestone {
  id: string
  goalId: string
  title: string
  completed: boolean
  completedAt?: string
}

// Notes
export interface Note {
  id: string
  title: string
  content: string // Rich text HTML
  folderId?: string
  color?: string
  tags: string[]
  pinned: boolean
  createdAt: string
  updatedAt: string
}

export interface NoteFolder {
  id: string
  name: string
  color: string
  parentId?: string
}

// Data Store
export interface LifeFlowData {
  profile?: UserProfile
  settings: AppSettings
  
  // Agenda
  events: AgendaEvent[]
  
  // Habits
  habits: Habit[]
  habitLogs: HabitLog[]
  
  // Sport
  sportActivities: SportActivity[]
  sportSessions: SportSession[]
  
  // Hydration
  hydrationLogs: HydrationLog[]
  hydrationGoal: HydrationGoal
  
  // Mood
  moodEntries: MoodEntry[]
  
  // Finances
  transactions: Transaction[]
  financeCategories: FinanceCategory[]
  subscriptions: Subscription[]
  balanceRecords: BalanceRecord[]
  
  // Goals
  goals: Goal[]
  goalMilestones: GoalMilestone[]
  
  // Notes
  notes: Note[]
  noteFolders: NoteFolder[]
}

// Navigation
export type NavigationTab = 
  | 'dashboard'
  | 'agenda'
  | 'habits'
  | 'sport'
  | 'hydration'
  | 'mood'
  | 'finances'
  | 'goals'
  | 'notes'
  | 'settings'
