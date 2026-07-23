'use client'

import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { FiX } from 'react-icons/fi'
import Button from '@/components/ui/Button'

type ToastType = 'success' | 'warning' | 'error' | 'info'

interface ToastItem {
  id: string
  type: ToastType
  message: string
}

interface ToastContextValue {
  showToast: (type: ToastType, message: string) => void
  success: (message: string) => void
  warning: (message: string) => void
  error: (message: string) => void
  info: (message: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

function getToastClasses(type: ToastType) {
  if (type === 'success') {
    return 'border-[rgba(var(--olive-rgb),0.35)] bg-[var(--toast-success-bg)] text-[var(--olive)]'
  }

  if (type === 'warning') {
    return 'border-[rgba(var(--warning-rgb),0.35)] bg-[var(--toast-warning-bg)] text-[var(--warning-deep)]'
  }

  if (type === 'error') {
    return 'border-[rgba(var(--terracotta-rgb),0.35)] bg-[var(--toast-error-bg)] text-[var(--terracotta-deep)]'
  }

  return 'border-[var(--panel-border)] bg-[var(--toast-neutral-bg)] text-[var(--ink-soft)]'
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const removeToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const showToast = useCallback(
    (type: ToastType, message: string) => {
      const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`
      const nextToast: ToastItem = { id, type, message }

      setToasts((current) => [...current, nextToast].slice(-4))

      const timeoutMs = type === 'error' ? 6500 : 4200
      window.setTimeout(() => removeToast(id), timeoutMs)
    },
    [removeToast]
  )

  const value = useMemo<ToastContextValue>(
    () => ({
      showToast,
      success: (message) => showToast('success', message),
      warning: (message) => showToast('warning', message),
      error: (message) => showToast('error', message),
      info: (message) => showToast('info', message),
    }),
    [showToast]
  )

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-3 top-3 z-[120] flex w-[min(94vw,380px)] flex-col gap-2 sm:right-4 sm:top-4">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto rounded-xl border px-3 py-2 text-sm shadow-[0_10px_24px_rgba(var(--scrim-rgb),0.16)] backdrop-blur ${getToastClasses(
              toast.type
            )}`}
          >
            <div className="flex items-start justify-between gap-2">
              <p>{toast.message}</p>
              <Button
                type="button"
                onClick={() => removeToast(toast.id)}
                variant="secondary"
                className="h-6 min-w-6 px-0 text-xs leading-none"
                aria-label="Chiudi notifica"
                icon={<FiX className="h-3.5 w-3.5" />}
              >
                <span className="sr-only">Chiudi</span>
              </Button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used inside ToastProvider')
  }

  return context
}
