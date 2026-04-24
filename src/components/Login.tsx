'use client'

import { useState } from 'react'
import { FiLogIn } from 'react-icons/fi'
import { supabase } from '@/lib/supabase'
import Button from '@/components/ui/Button'
import { useToast } from '@/components/ui/ToastProvider'

export default function Login() {
  const [loading, setLoading] = useState(false)
  const toast = useToast()

  const signInWithGoogle = async () => {
    setLoading(true)

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      setLoading(false)
      toast.error(error.message)
    }
  }

  return (
    <div className="app-shell flex items-center justify-center px-4 py-10">
      <div className="glass-card w-full max-w-lg p-8 sm:p-10">
        <h1 className="mb-2 text-center text-4xl">Benvenuto a Pizzoni</h1>
        <p className="mb-6 text-center text-sm page-subtitle">Accedi con Google. Solo gli utenti invitati possono entrare.</p>

        <Button
          type="button"
          onClick={() => void signInWithGoogle()}
          disabled={loading}
          variant="primary"
          className="mb-2 flex w-full items-center justify-center px-4 py-2.5 text-sm"
          icon={<FiLogIn className="h-4 w-4" />}
        >
          Continua con Google
        </Button>
      </div>
    </div>
  )
}
