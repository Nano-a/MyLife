'use client'

import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useMemo, useState } from 'react'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { db } from '@/lib/mylife/db'
import type { NavigationTab } from '@/lib/types'
import { useStore } from '@/lib/store'
import { Search } from 'lucide-react'

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

type Hit = { id: string; tab: NavigationTab; icon: string; title: string; sub?: string }

export function GlobalSearchControl() {
  const { setCurrentTab } = useStore()
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')

  const events = useLiveQuery(() => db.events.toArray(), []) ?? []
  const notes = useLiveQuery(() => db.notes.toArray(), []) ?? []
  const goals = useLiveQuery(() => db.objectives.toArray(), []) ?? []
  const txs = useLiveQuery(() => db.transactions.toArray(), []) ?? []
  const habits = useLiveQuery(() => db.habits.toArray(), []) ?? []

  useEffect(() => {
    if (!open) setQ('')
  }, [open])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const hits = useMemo(() => {
    const needle = q.trim().toLowerCase()
    if (needle.length < 2) return []
    const out: Hit[] = []

    for (const e of events) {
      const hay = `${e.titre} ${e.description ?? ''} ${e.lieu ?? ''}`.toLowerCase()
      if (hay.includes(needle))
        out.push({
          id: `ev-${e.id}`,
          tab: 'agenda',
          icon: '📅',
          title: e.titre,
          sub: new Date(e.debut).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }),
        })
    }
    for (const n of notes) {
      const hay = `${n.titre} ${stripHtml(n.contenu)}`.toLowerCase()
      if (hay.includes(needle))
        out.push({
          id: `note-${n.id}`,
          tab: 'notes',
          icon: '📓',
          title: n.titre || '(Sans titre)',
        })
    }
    for (const g of goals) {
      if (`${g.titre} ${g.description ?? ''}`.toLowerCase().includes(needle))
        out.push({
          id: `goal-${g.id}`,
          tab: 'goals',
          icon: '🎯',
          title: g.titre,
        })
    }
    for (const x of txs) {
      if (`${x.categorie} ${x.commentaire ?? ''}`.toLowerCase().includes(needle))
        out.push({
          id: `tx-${x.id}`,
          tab: 'finances',
          icon: '💰',
          title: `${x.montant} € · ${x.categorie}`,
          sub: x.date,
        })
    }
    for (const h of habits) {
      if (h.nom.toLowerCase().includes(needle))
        out.push({
          id: `hab-${h.id}`,
          tab: 'habits',
          icon: '✅',
          title: h.nom,
        })
    }
    return out.slice(0, 40)
  }, [q, events, notes, goals, txs, habits])

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed right-4 top-[max(0.75rem,env(safe-area-inset-top))] z-[60] grid h-10 w-10 place-items-center rounded-full border border-border bg-card/80 text-lg shadow-md backdrop-blur-md hover:bg-muted md:right-6"
        aria-label="Recherche globale"
        title="Recherche (Ctrl+K)"
      >
        <Search className="h-5 w-5 opacity-80" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg overflow-hidden p-0">
          <DialogHeader className="sr-only">
            <DialogTitle>Recherche globale</DialogTitle>
            <DialogDescription>Agenda, notes, objectifs, finances, habitudes</DialogDescription>
          </DialogHeader>
          <Command shouldFilter={false}>
            <CommandInput placeholder="Au moins 2 caractères…" value={q} onValueChange={setQ} />
            <CommandList>
              <CommandEmpty>
                {q.trim().length < 2 ? 'Tape au moins 2 lettres.' : 'Aucun résultat.'}
              </CommandEmpty>
              {hits.length > 0 && (
                <CommandGroup heading="Résultats">
                  {hits.map((h) => (
                    <CommandItem
                      key={h.id}
                      value={h.id}
                      onSelect={() => {
                        setCurrentTab(h.tab)
                        setOpen(false)
                      }}
                    >
                      <span className="mr-2">{h.icon}</span>
                      <span className="flex flex-col">
                        <span>{h.title}</span>
                        {h.sub && <span className="text-xs text-muted-foreground">{h.sub}</span>}
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>
    </>
  )
}
