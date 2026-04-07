'use client'

import { useState, useRef, useEffect } from 'react'
import { toast } from 'sonner'
import { imageFileToDataUrl } from '@/lib/wallpaperImage'
import { useStore } from '@/lib/store'
import type { UserProfile as UserProfileType } from '@/lib/types'
import { AnimatedCard } from '@/components/animated-card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import {
  Settings,
  User,
  Palette,
  Bell,
  Download,
  Upload,
  Trash2,
  Moon,
  Sun,
  Smartphone,
  Check,
  AlertTriangle,
  ImageIcon,
  Camera,
  X,
  Pencil,
  ChevronRight,
} from 'lucide-react'

const ACTIVITY_LABELS: Record<string, string> = {
  sedentary: 'Sédentaire',
  light: 'Léger',
  moderate: 'Modéré',
  active: 'Actif',
  very_active: 'Très actif',
}

const accentColors = [
  { id: 'blue', color: '#3b82f6', label: 'Bleu' },
  { id: 'teal', color: '#14b8a6', label: 'Turquoise' },
  { id: 'purple', color: '#8b5cf6', label: 'Violet' },
  { id: 'pink', color: '#ec4899', label: 'Rose' },
  { id: 'orange', color: '#f97316', label: 'Orange' },
  { id: 'green', color: '#22c55e', label: 'Vert' },
]

export function SettingsView() {
  const {
    profile,
    settings,
    setProfile,
    updateProfile,
    updateSettings,
    setTheme,
    exportData,
    importData,
    resetData,
  } = useStore()
  
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const wallpaperInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  
  const [editProfile, setEditProfile] = useState({
    name: profile?.name || '',
    age: profile?.age?.toString() || '',
    weight: profile?.weight?.toString() || '',
    height: profile?.height?.toString() || '',
    activityLevel: profile?.activityLevel || 'moderate',
    sleepHours: profile?.sleepHours?.toString() || '8',
  })

  const hasSavedProfile = Boolean(profile && (profile.name ?? '').trim().length > 0)
  const [profileEditing, setProfileEditing] = useState(false)
  const showProfileForm = !hasSavedProfile || profileEditing

  useEffect(() => {
    if (!profile) return
    setEditProfile({
      name: profile.name || '',
      age: profile.age?.toString() || '',
      weight: profile.weight?.toString() || '',
      height: profile.height?.toString() || '',
      activityLevel: profile.activityLevel || 'moderate',
      sleepHours: profile.sleepHours?.toString() || '8',
    })
  }, [profile])

  const persistProfile = () => {
    const profileData = {
      id: profile?.id || Math.random().toString(36).substring(2, 15),
      name: editProfile.name,
      age: parseInt(editProfile.age) || 25,
      weight: parseFloat(editProfile.weight) || 70,
      height: parseInt(editProfile.height) || 170,
      activityLevel: editProfile.activityLevel as UserProfileType['activityLevel'],
      sleepHours: parseInt(editProfile.sleepHours) || 8,
      createdAt: profile?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    if (profile) {
      updateProfile(profileData)
    } else {
      setProfile(profileData)
    }
  }

  const handleValidateProfile = () => {
    persistProfile()
    toast.success('Profil enregistré')
    setProfileEditing(false)
  }

  const openProfileEditor = () => {
    if (profile) {
      setEditProfile({
        name: profile.name || '',
        age: profile.age?.toString() || '',
        weight: profile.weight?.toString() || '',
        height: profile.height?.toString() || '',
        activityLevel: profile.activityLevel || 'moderate',
        sleepHours: profile.sleepHours?.toString() || '8',
      })
    }
    setProfileEditing(true)
  }
  
  const handleExport = async () => {
    const data = await exportData()
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `lifeflow-backup-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }
  
  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    
    const reader = new FileReader()
    reader.onload = async (e) => {
      const content = e.target?.result as string
      const success = await importData(content)
      setImportStatus(success ? 'success' : 'error')
      setTimeout(() => setImportStatus('idle'), 3000)
    }
    reader.readAsText(file)
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }
  
  const applyWallpaperFile = async (file: File | undefined) => {
    if (!file?.type.startsWith('image/')) {
      toast.error('Choisis une image.')
      return
    }
    try {
      const dataUrl = await imageFileToDataUrl(file)
      if (dataUrl.length > 2_500_000) {
        toast.error('Image trop lourde pour le stockage local.')
        return
      }
      updateSettings({ wallpaper: dataUrl })
      toast.success('Fond d’écran enregistré')
    } catch {
      toast.error('Impossible de traiter l’image')
    }
  }

  const handleWallpaperPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    await applyWallpaperFile(file)
  }

  const handleReset = async () => {
    await resetData()
    setShowResetConfirm(false)
    setEditProfile({
      name: '',
      age: '',
      weight: '',
      height: '',
      activityLevel: 'moderate',
      sleepHours: '8',
    })
  }
  
  return (
    <div
      className={cn(
        'p-4 md:p-8 max-w-3xl mx-auto',
        showProfileForm && 'pb-28 md:pb-8'
      )}
    >
      {/* Header */}
      <div className="mb-6 animate-fade-up">
        <h1 className="text-2xl md:text-3xl font-bold">Paramètres</h1>
        <p className="text-muted-foreground">
          Profil en carte d’identité ; apparence et notifications en dessous.
        </p>
      </div>
      
      {/* Profile Section */}
      <AnimatedCard delay={100} className="mb-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <User className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">Profil</h2>
          </div>
          {hasSavedProfile && !profileEditing ? (
            <Button type="button" variant="outline" size="sm" onClick={openProfileEditor}>
              <Pencil className="mr-1.5 h-4 w-4" />
              Modifier
            </Button>
          ) : null}
        </div>

        {!showProfileForm && hasSavedProfile && profile ? (
          <button
            type="button"
            onClick={openProfileEditor}
            className="group w-full rounded-2xl text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <div className="relative overflow-hidden rounded-2xl border-2 border-primary/35 bg-gradient-to-br from-card via-card to-primary/10 p-6 shadow-md transition group-hover:border-primary/55 group-hover:shadow-lg">
              <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary/10" />
              <div className="pointer-events-none absolute -bottom-10 -left-10 h-36 w-36 rounded-full bg-chart-3/10" />
              <div className="relative flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-3">
                  <div>
                    <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-muted-foreground">
                      Carte profil
                    </p>
                    <p className="mt-1 text-2xl font-bold tracking-tight">{profile.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Mis à jour le{' '}
                      {new Date(profile.updatedAt).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                  <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="text-muted-foreground">Âge</dt>
                      <dd className="font-medium">{profile.age} ans</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Taille</dt>
                      <dd className="font-medium">{profile.height} cm</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Poids</dt>
                      <dd className="font-medium">{profile.weight} kg</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Sommeil</dt>
                      <dd className="font-medium">{profile.sleepHours} h / nuit</dd>
                    </div>
                  </dl>
                  <p className="text-sm text-muted-foreground">
                    Activité :{' '}
                    <span className="font-medium text-foreground">
                      {ACTIVITY_LABELS[profile.activityLevel] ?? profile.activityLevel}
                    </span>
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2 self-end text-sm font-medium text-primary sm:self-center sm:flex-col sm:items-end">
                  <span className="hidden sm:inline">Toucher pour modifier</span>
                  <ChevronRight className="h-6 w-6 transition group-hover:translate-x-0.5" />
                </div>
              </div>
            </div>
          </button>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Nom</label>
              <Input
                value={editProfile.name}
                onChange={(e) => setEditProfile((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Votre nom"
              />
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Âge</label>
                <Input
                  type="number"
                  value={editProfile.age}
                  onChange={(e) => setEditProfile((prev) => ({ ...prev, age: e.target.value }))}
                  placeholder="25"
                  min="1"
                  max="120"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Poids (kg)</label>
                <Input
                  type="number"
                  value={editProfile.weight}
                  onChange={(e) => setEditProfile((prev) => ({ ...prev, weight: e.target.value }))}
                  placeholder="70"
                  min="1"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Taille (cm)</label>
                <Input
                  type="number"
                  value={editProfile.height}
                  onChange={(e) => setEditProfile((prev) => ({ ...prev, height: e.target.value }))}
                  placeholder="170"
                  min="1"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Sommeil (h)</label>
                <Input
                  type="number"
                  value={editProfile.sleepHours}
                  onChange={(e) => setEditProfile((prev) => ({ ...prev, sleepHours: e.target.value }))}
                  placeholder="8"
                  min="1"
                  max="24"
                />
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Niveau d&apos;activité</label>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'sedentary', label: 'Sédentaire' },
                  { id: 'light', label: 'Léger' },
                  { id: 'moderate', label: 'Modéré' },
                  { id: 'active', label: 'Actif' },
                  { id: 'very_active', label: 'Très actif' },
                ].map((level) => (
                  <button
                    key={level.id}
                    type="button"
                    onClick={() =>
                      setEditProfile((prev) => ({
                        ...prev,
                        activityLevel: level.id as UserProfileType['activityLevel'],
                      }))
                    }
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-sm transition-all',
                      editProfile.activityLevel === level.id
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted hover:bg-muted-foreground/20'
                    )}
                  >
                    {level.label}
                  </button>
                ))}
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Thème et notifications s’appliquent tout de suite ; ce bouton enregistre et valide surtout
              ton <strong className="text-foreground">profil</strong> (hydratation, calculs).
            </p>

            <div className="hidden md:block">
              <Button type="button" onClick={handleValidateProfile} className="w-full">
                <Check className="mr-2 h-4 w-4" />
                Enregistrer et valider le profil
              </Button>
            </div>
          </div>
        )}
      </AnimatedCard>

      {showProfileForm ? (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-md md:hidden">
          <Button type="button" onClick={handleValidateProfile} className="w-full shadow-lg">
            <Check className="mr-2 h-4 w-4" />
            Enregistrer et valider le profil
          </Button>
        </div>
      ) : null}
      
      {/* Appearance Section */}
      <AnimatedCard delay={200} className="mb-6">
        <div className="flex items-center gap-3 mb-4">
          <Palette className="w-5 h-5 text-chart-3" />
          <h2 className="text-lg font-semibold">Apparence</h2>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Thème</label>
            <div className="flex gap-2">
              <button
                onClick={() => setTheme('light')}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 p-3 rounded-xl transition-all',
                  settings.theme === 'light'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted hover:bg-muted-foreground/20'
                )}
              >
                <Sun className="w-5 h-5" />
                <span>Clair</span>
              </button>
              <button
                onClick={() => setTheme('dark')}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 p-3 rounded-xl transition-all',
                  settings.theme === 'dark'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted hover:bg-muted-foreground/20'
                )}
              >
                <Moon className="w-5 h-5" />
                <span>Sombre</span>
              </button>
              <button
                onClick={() => setTheme('amoled')}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 p-3 rounded-xl transition-all',
                  settings.theme === 'amoled'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted hover:bg-muted-foreground/20'
                )}
              >
                <Smartphone className="w-5 h-5" />
                <span>AMOLED</span>
              </button>
            </div>
          </div>
          
          <div>
            <label className="text-sm font-medium mb-2 block">Couleur d&apos;accent</label>
            <div className="flex flex-wrap gap-3">
              {accentColors.map((accent) => (
                <button
                  key={accent.id}
                  onClick={() => updateSettings({ accentColor: accent.id as typeof settings.accentColor })}
                  className={cn(
                    'w-10 h-10 rounded-full transition-all',
                    settings.accentColor === accent.id && 'ring-2 ring-offset-2 ring-offset-background'
                  )}
                  style={{ backgroundColor: accent.color }}
                  title={accent.label}
                />
              ))}
            </div>
          </div>
          
          <div>
            <label className="text-sm font-medium mb-2 block">Taille du texte</label>
            <div className="flex gap-2">
              {[
                { id: 'small', label: 'Petit' },
                { id: 'medium', label: 'Moyen' },
                { id: 'large', label: 'Grand' },
              ].map((size) => (
                <button
                  key={size.id}
                  onClick={() => updateSettings({ fontSize: size.id as typeof settings.fontSize })}
                  className={cn(
                    'flex-1 px-3 py-2 rounded-lg text-sm transition-all',
                    settings.fontSize === size.id
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted hover:bg-muted-foreground/20'
                  )}
                >
                  {size.label}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-border/60 bg-muted/20 p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <label className="text-sm font-medium block">Fond d&apos;écran</label>
                <p className="text-xs text-muted-foreground mt-1">
                  Image derrière l’app (stockage local). Tu peux la retirer à tout moment.
                </p>
              </div>
              {settings.wallpaper ? (
                <div
                  className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-border bg-cover bg-center"
                  style={{ backgroundImage: `url("${settings.wallpaper}")` }}
                  role="img"
                  aria-label="Aperçu du fond d’écran"
                />
              ) : null}
            </div>
            <input
              ref={wallpaperInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleWallpaperPick}
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleWallpaperPick}
            />
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => wallpaperInputRef.current?.click()}>
                <ImageIcon className="mr-1.5 h-4 w-4" />
                Galerie
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => cameraInputRef.current?.click()}>
                <Camera className="mr-1.5 h-4 w-4" />
                Appareil photo
              </Button>
              {settings.wallpaper ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    updateSettings({ wallpaper: undefined })
                    toast.success('Fond d’écran retiré')
                  }}
                >
                  <X className="mr-1.5 h-4 w-4" />
                  Retirer
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      </AnimatedCard>
      
      {/* Notifications Section */}
      <AnimatedCard delay={300} className="mb-6">
        <div className="flex items-center gap-3 mb-4">
          <Bell className="w-5 h-5 text-chart-4" />
          <h2 className="text-lg font-semibold">Notifications</h2>
        </div>
        
        <div className="space-y-3">
          {[
            { key: 'enabled', label: 'Activer les notifications' },
            { key: 'water', label: 'Rappels hydratation' },
            { key: 'habits', label: 'Rappels habitudes' },
            { key: 'agenda', label: 'Rappels agenda' },
            { key: 'sport', label: 'Rappels sport' },
            { key: 'goals', label: 'Rappels objectifs' },
          ].map((item) => (
            <div key={item.key} className="flex items-center justify-between">
              <span className="text-sm">{item.label}</span>
              <button
                onClick={() => {
                  const key = item.key as keyof typeof settings.notifications
                  updateSettings({
                    notifications: {
                      ...settings.notifications,
                      [key]: !settings.notifications[key],
                    },
                  })
                }}
                className={cn(
                  'w-12 h-6 rounded-full transition-all relative',
                  settings.notifications[item.key as keyof typeof settings.notifications]
                    ? 'bg-primary'
                    : 'bg-muted'
                )}
              >
                <div
                  className={cn(
                    'absolute top-1 w-4 h-4 rounded-full bg-white transition-all',
                    settings.notifications[item.key as keyof typeof settings.notifications]
                      ? 'left-7'
                      : 'left-1'
                  )}
                />
              </button>
            </div>
          ))}
        </div>
      </AnimatedCard>
      
      {/* Data Management */}
      <AnimatedCard delay={400} className="mb-6">
        <div className="flex items-center gap-3 mb-4">
          <Settings className="w-5 h-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Données</h2>
        </div>
        
        <div className="space-y-3">
          <Button variant="outline" onClick={handleExport} className="w-full justify-start">
            <Download className="w-4 h-4 mr-2" />
            Exporter les données (JSON)
          </Button>
          
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleImport}
            className="hidden"
          />
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              'w-full justify-start',
              importStatus === 'success' && 'border-chart-2 text-chart-2',
              importStatus === 'error' && 'border-destructive text-destructive'
            )}
          >
            <Upload className="w-4 h-4 mr-2" />
            {importStatus === 'success' && 'Import réussi !'}
            {importStatus === 'error' && 'Erreur d\'import'}
            {importStatus === 'idle' && 'Importer des données'}
          </Button>
          
          <div className="pt-4 border-t border-border">
            <Button
              variant="destructive"
              onClick={() => setShowResetConfirm(true)}
              className="w-full"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Réinitialiser toutes les données
            </Button>
          </div>
        </div>
      </AnimatedCard>
      
      {/* App Info */}
      <AnimatedCard delay={500}>
        <div className="text-center text-sm text-muted-foreground">
          <p className="font-semibold text-foreground mb-1">MyLife v1.0.0</p>
          <p>Application de suivi de vie personnelle</p>
          <p className="mt-2">Données stockées localement sur votre appareil</p>
        </div>
      </AnimatedCard>
      
      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            onClick={() => setShowResetConfirm(false)}
          />
          <AnimatedCard className="relative w-full max-w-sm z-10">
            <div className="flex items-center gap-3 mb-4 text-destructive">
              <AlertTriangle className="w-6 h-6" />
              <h2 className="text-lg font-semibold">Confirmer la réinitialisation</h2>
            </div>
            
            <p className="text-muted-foreground mb-6">
              Cette action supprimera définitivement toutes vos données. 
              Pensez à exporter une sauvegarde avant de continuer.
            </p>
            
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setShowResetConfirm(false)} className="flex-1">
                Annuler
              </Button>
              <Button variant="destructive" onClick={handleReset} className="flex-1">
                Réinitialiser
              </Button>
            </div>
          </AnimatedCard>
        </div>
      )}
    </div>
  )
}
