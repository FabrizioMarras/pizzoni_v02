'use client'

import { useEffect } from 'react'
import { FiX } from 'react-icons/fi'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}

export default function Modal({ open, onClose, title, children }: ModalProps) {
  useEffect(() => {
    if (!open) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] bg-[rgba(43,31,26,0.45)]" onClick={onClose}>
      <div
        className="h-full w-full bg-[rgba(247,240,228,0.98)] md:mx-auto md:mt-[8vh] md:h-auto md:max-h-[84vh] md:w-[min(760px,100%-2rem)] md:rounded-2xl md:border md:border-[var(--panel-border)] md:bg-[rgba(255,251,246,0.98)] md:shadow-[0_18px_42px_rgba(43,31,26,0.28)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--panel-border)] px-5 py-4">
          <h2 className="text-3xl">{title}</h2>
          <button type="button" onClick={onClose} className="btn-secondary inline-flex items-center gap-1.5 px-3 py-1.5 text-sm">
            <FiX className="h-4 w-4 shrink-0" />
            Chiudi
          </button>
        </div>

        <div className="max-h-[calc(100vh-84px)] overflow-y-auto px-5 py-5 md:max-h-[calc(84vh-84px)]">
          {children}
        </div>
      </div>
    </div>
  )
}
