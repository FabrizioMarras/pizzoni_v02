'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function Login() {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const signInWithGoogle = async () => {
    setLoading(true)
    setMessage('')

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      setLoading(false)
      setMessage(error.message)
    }
  }

  return (
    <div className="app-shell flex items-center justify-center px-4 py-10">
      <div className="glass-card w-full max-w-lg p-8 sm:p-10">
        <h1 className="mb-2 text-center text-4xl">Benvenuto a Pizzoni</h1>
        <p className="mb-6 text-center text-sm page-subtitle">Accedi con Google. Solo gli utenti invitati possono entrare.</p>

        <button
          type="button"
          onClick={() => void signInWithGoogle()}
          disabled={loading}
          className="btn-primary mb-2 flex w-full items-center justify-center px-4 py-2.5 text-sm"
        >
          Continua con Google
        </button>
        {message && <p className="mt-4 rounded-xl bg-[rgba(255,255,255,0.7)] px-3 py-2 text-center text-sm text-[var(--ink-soft)]">{message}</p>}
      </div>
    </div>
  )
}
