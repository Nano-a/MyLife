'use client'

import { useState, useMemo } from 'react'
import { useStore } from '@/lib/store'
import { AnimatedCard } from '@/components/animated-card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import {
  StickyNote,
  Plus,
  Trash2,
  X,
  Pin,
  PinOff,
  Folder,
  Search,
  FolderPlus,
  Edit3,
} from 'lucide-react'

const noteColors = ['#ffffff', '#fef3c7', '#dcfce7', '#dbeafe', '#f3e8ff', '#fce7f3', '#fed7d7']

export function NotesView() {
  const { notes, noteFolders, addNote, updateNote, deleteNote, addFolder, deleteFolder } = useStore()
  const [selectedNote, setSelectedNote] = useState<string | null>(null)
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showFolderModal, setShowFolderModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  
  const [newNote, setNewNote] = useState({
    title: '',
    content: '',
    color: '#ffffff',
  })
  
  const [newFolder, setNewFolder] = useState({ name: '', color: '#3b82f6' })
  
  // Filter and sort notes
  const filteredNotes = useMemo(() => {
    let result = [...notes]
    
    // Filter by folder
    if (selectedFolder) {
      result = result.filter((n) => n.folderId === selectedFolder)
    }
    
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (n) =>
          n.title.toLowerCase().includes(query) ||
          n.content.toLowerCase().includes(query) ||
          n.tags.some((t) => t.toLowerCase().includes(query))
      )
    }
    
    // Sort: pinned first, then by updated date
    result.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1
      if (!a.pinned && b.pinned) return 1
      return b.updatedAt.localeCompare(a.updatedAt)
    })
    
    return result
  }, [notes, selectedFolder, searchQuery])
  
  const selectedNoteData = selectedNote ? notes.find((n) => n.id === selectedNote) : null
  
  const handleAddNote = () => {
    if (!newNote.title.trim()) return
    
    addNote({
      title: newNote.title,
      content: newNote.content,
      color: newNote.color,
      folderId: selectedFolder || undefined,
      tags: [],
      pinned: false,
    })
    
    setNewNote({ title: '', content: '', color: '#ffffff' })
    setShowAddModal(false)
  }
  
  const handleAddFolder = () => {
    if (!newFolder.name.trim()) return
    
    addFolder({
      name: newFolder.name,
      color: newFolder.color,
    })
    
    setNewFolder({ name: '', color: '#3b82f6' })
    setShowFolderModal(false)
  }
  
  const handleUpdateNote = (updates: Partial<typeof notes[0]>) => {
    if (!selectedNote) return
    updateNote(selectedNote, updates)
  }
  
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
    })
  }
  
  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 animate-fade-up">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Notes</h1>
          <p className="text-muted-foreground">Organisez vos idées et pensées</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowFolderModal(true)}>
            <FolderPlus className="w-4 h-4" />
          </Button>
          <Button onClick={() => setShowAddModal(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Nouvelle note</span>
          </Button>
        </div>
      </div>
      
      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher dans les notes..."
            className="pl-10"
          />
        </div>
        
        <div className="flex gap-2 overflow-x-auto pb-2">
          <button
            onClick={() => setSelectedFolder(null)}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all',
              !selectedFolder
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted hover:bg-muted-foreground/20'
            )}
          >
            Toutes
          </button>
          {noteFolders.map((folder) => (
            <button
              key={folder.id}
              onClick={() => setSelectedFolder(folder.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all',
                selectedFolder === folder.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted hover:bg-muted-foreground/20'
              )}
            >
              <Folder className="w-4 h-4" style={{ color: selectedFolder === folder.id ? undefined : folder.color }} />
              {folder.name}
            </button>
          ))}
        </div>
      </div>
      
      {/* Notes Grid */}
      {filteredNotes.length === 0 ? (
        <AnimatedCard delay={100} className="text-center py-12">
          <StickyNote className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            {searchQuery ? 'Aucun résultat' : 'Aucune note'}
          </h3>
          <p className="text-muted-foreground mb-4">
            {searchQuery
              ? 'Essayez une autre recherche'
              : 'Créez votre première note pour commencer'}
          </p>
          {!searchQuery && (
            <Button onClick={() => setShowAddModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Créer une note
            </Button>
          )}
        </AnimatedCard>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredNotes.map((note, index) => (
            <AnimatedCard
              key={note.id}
              delay={100 + index * 50}
              className={cn(
                'cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all relative overflow-hidden',
                note.pinned && 'ring-2 ring-chart-4/50'
              )}
              onClick={() => {
                setSelectedNote(note.id)
                setIsEditing(false)
              }}
              style={{
                backgroundColor: note.color !== '#ffffff' ? `${note.color}20` : undefined,
              }}
            >
              {note.pinned && (
                <Pin
                  className="absolute top-3 right-3 w-4 h-4 text-chart-4"
                  style={{ fill: 'currentColor' }}
                />
              )}
              
              <h3 className="font-semibold mb-2 pr-6">{note.title}</h3>
              
              {note.content && (
                <p className="text-sm text-muted-foreground line-clamp-3 mb-3">
                  {note.content.replace(/<[^>]*>/g, '')}
                </p>
              )}
              
              {note.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {note.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 rounded-full bg-muted text-xs"
                    >
                      #{tag}
                    </span>
                  ))}
                  {note.tags.length > 3 && (
                    <span className="text-xs text-muted-foreground">
                      +{note.tags.length - 3}
                    </span>
                  )}
                </div>
              )}
              
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{formatDate(note.updatedAt)}</span>
                {note.folderId && (
                  <span className="flex items-center gap-1">
                    <Folder className="w-3 h-3" />
                    {noteFolders.find((f) => f.id === note.folderId)?.name}
                  </span>
                )}
              </div>
            </AnimatedCard>
          ))}
        </div>
      )}
      
      {/* Note Detail/Edit Modal */}
      {selectedNote && selectedNoteData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            onClick={() => setSelectedNote(null)}
          />
          <AnimatedCard
            className="relative w-full max-w-2xl z-10 max-h-[80vh] overflow-y-auto"
            style={{
              backgroundColor: selectedNoteData.color !== '#ffffff' ? `${selectedNoteData.color}30` : undefined,
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleUpdateNote({ pinned: !selectedNoteData.pinned })}
                  className={cn(
                    'p-2 rounded-lg transition-colors',
                    selectedNoteData.pinned
                      ? 'bg-chart-4/10 text-chart-4'
                      : 'hover:bg-muted text-muted-foreground'
                  )}
                >
                  {selectedNoteData.pinned ? (
                    <PinOff className="w-5 h-5" />
                  ) : (
                    <Pin className="w-5 h-5" />
                  )}
                </button>
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className={cn(
                    'p-2 rounded-lg transition-colors',
                    isEditing
                      ? 'bg-primary/10 text-primary'
                      : 'hover:bg-muted text-muted-foreground'
                  )}
                >
                  <Edit3 className="w-5 h-5" />
                </button>
              </div>
              <button
                onClick={() => setSelectedNote(null)}
                className="p-2 rounded-lg hover:bg-muted"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {isEditing ? (
              <div className="space-y-4">
                <Input
                  value={selectedNoteData.title}
                  onChange={(e) => handleUpdateNote({ title: e.target.value })}
                  placeholder="Titre"
                  className="text-lg font-semibold"
                />
                
                <textarea
                  value={selectedNoteData.content}
                  onChange={(e) => handleUpdateNote({ content: e.target.value })}
                  placeholder="Contenu de la note..."
                  className="w-full h-64 p-3 rounded-lg bg-muted/50 resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                />
                
                <div>
                  <label className="text-sm font-medium mb-2 block">Couleur</label>
                  <div className="flex gap-2">
                    {noteColors.map((color) => (
                      <button
                        key={color}
                        onClick={() => handleUpdateNote({ color })}
                        className={cn(
                          'w-8 h-8 rounded-full border-2 transition-all',
                          selectedNoteData.color === color
                            ? 'ring-2 ring-offset-2 ring-offset-background ring-primary'
                            : 'border-border'
                        )}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <>
                <h2 className="text-2xl font-bold mb-4">{selectedNoteData.title}</h2>
                
                {selectedNoteData.content ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none mb-4">
                    <p className="whitespace-pre-wrap">{selectedNoteData.content}</p>
                  </div>
                ) : (
                  <p className="text-muted-foreground italic mb-4">Cette note est vide</p>
                )}
                
                <div className="text-sm text-muted-foreground">
                  Modifié le {formatDate(selectedNoteData.updatedAt)}
                </div>
              </>
            )}
            
            <div className="flex gap-3 mt-6 pt-4 border-t border-border">
              <Button
                variant="destructive"
                onClick={() => {
                  deleteNote(selectedNoteData.id)
                  setSelectedNote(null)
                }}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Supprimer
              </Button>
            </div>
          </AnimatedCard>
        </div>
      )}
      
      {/* Add Note Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            onClick={() => setShowAddModal(false)}
          />
          <AnimatedCard className="relative w-full max-w-md z-10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Nouvelle note</h2>
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
                  value={newNote.title}
                  onChange={(e) => setNewNote((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="Titre de la note"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium mb-1 block">Contenu</label>
                <textarea
                  value={newNote.content}
                  onChange={(e) => setNewNote((prev) => ({ ...prev, content: e.target.value }))}
                  placeholder="Contenu de la note..."
                  className="w-full h-32 p-3 rounded-lg bg-muted resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">Couleur</label>
                <div className="flex gap-2">
                  {noteColors.map((color) => (
                    <button
                      key={color}
                      onClick={() => setNewNote((prev) => ({ ...prev, color }))}
                      className={cn(
                        'w-8 h-8 rounded-full border-2 transition-all',
                        newNote.color === color
                          ? 'ring-2 ring-offset-2 ring-offset-background ring-primary'
                          : 'border-border'
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
                <Button onClick={handleAddNote} className="flex-1">
                  Créer
                </Button>
              </div>
            </div>
          </AnimatedCard>
        </div>
      )}
      
      {/* Add Folder Modal */}
      {showFolderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            onClick={() => setShowFolderModal(false)}
          />
          <AnimatedCard className="relative w-full max-w-sm z-10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Nouveau dossier</h2>
              <button
                onClick={() => setShowFolderModal(false)}
                className="p-2 rounded-lg hover:bg-muted"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Nom</label>
                <Input
                  value={newFolder.name}
                  onChange={(e) => setNewFolder((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Nom du dossier"
                />
              </div>
              
              <div className="flex gap-3 pt-2">
                <Button variant="outline" onClick={() => setShowFolderModal(false)} className="flex-1">
                  Annuler
                </Button>
                <Button onClick={handleAddFolder} className="flex-1">
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
