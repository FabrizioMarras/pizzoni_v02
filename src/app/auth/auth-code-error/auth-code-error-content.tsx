'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { FiArrowLeft, FiRefreshCw } from 'react-icons/fi'
import Button from '@/components/ui/Button'

function getErrorMessage(searchParams: URLSearchParams): string {
  const error = searchParams.get('error')
  const errorCode = searchParams.get('error_code')
  const errorDescription = searchParams.get('error_description')

  if (errorCode === 'not_invited') {
    return "La tua email non è ancora invitata. Chiedi a un admin di aggiungerti prima di accedere."
  }

  if (errorDescription) {
    return errorDescription.replace(/\+/g, ' ')
  }

  if (error) {
    return `Errore di autenticazione: ${error}`
  }

  return 'Si è verificato un errore di autenticazione. Riprova.'
}

export default function AuthCodeErrorContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const errorMessage = getErrorMessage(new URLSearchParams(searchParams.toString()))

  return (
    <div className="app-shell flex min-h-screen items-center justify-center px-4 py-10">
      <div className="glass-card w-full max-w-lg p-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[rgba(178,74,47,0.15)]">
          <svg className="h-7 w-7 text-[var(--terracotta)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
        </div>
        <h2 className="text-4xl">Errore di Autenticazione</h2>
        <p className="mt-3 page-subtitle">{errorMessage}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Link href="/accedi" className="btn-primary inline-flex items-center gap-1.5 px-5 py-2 text-sm">
            <FiRefreshCw className="h-4 w-4" />
            Riprova
          </Link>
          <Button
            onClick={() => router.back()}
            variant="secondary"
            className="px-5 py-2 text-sm"
            icon={<FiArrowLeft className="h-4 w-4" />}
          >
            Indietro
          </Button>
        </div>
      </div>
    </div>
  )
}
