'use client'

import type { ReactNode } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

/** Modal plein écran mobile-friendly, même rôle que l’ancien `Modal` MyLife. */
export function LifeModal({
  open,
  onClose,
  title,
  titleRight,
  children,
  className,
}: {
  open: boolean
  onClose: () => void
  title: string
  /** Ex. menu ⋮ à droite du titre */
  titleRight?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className={
          className ??
          'max-h-[min(90vh,720px)] overflow-y-auto sm:max-w-lg'
        }
      >
        <DialogHeader className="flex flex-row items-start justify-between gap-2 space-y-0 text-left">
          <DialogTitle className="min-w-0 flex-1 leading-tight">{title}</DialogTitle>
          {titleRight ? <div className="shrink-0 pt-0.5">{titleRight}</div> : null}
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  )
}
