'use client'

export default function OfflinePage() {
  return (
    <main className="page-wrap flex min-h-[70vh] flex-col items-center justify-center text-center">
      <div className="surface-card max-w-sm space-y-3 p-6">
        <div className="text-4xl">🍕</div>
        <h1 className="text-lg font-semibold text-[var(--ink)]">Sei offline</h1>
        <p className="text-sm text-[var(--ink-soft)]">
          Non riesci a connetterti a internet in questo momento. Controlla la connessione e riprova.
        </p>
        <button type="button" onClick={() => window.location.reload()} className="btn-primary w-full">
          Riprova
        </button>
      </div>
    </main>
  )
}
