'use client'
/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface Invite {
  id: string
  email: string
  accepted_at: string | null
}

export default function InviteManager() {
  const [email, setEmail] = useState('')
  const [invites, setInvites] = useState<Invite[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')

  const loadInvites = async () => {
    const { data, error } = await supabase.from('invites').select('id, email, accepted_at').order('created_at', { ascending: false })
    if (!error) setInvites(data ?? [])
  }

  useEffect(() => {
    void loadInvites()
  }, [])

  const createInvite = async (event: React.FormEvent) => {
    event.preventDefault()
    setSubmitting(true)
    setMessage('')

    const normalized = email.trim().toLowerCase()

    const { error } = await supabase.from('invites').upsert({ email: normalized }, { onConflict: 'email' })

    setSubmitting(false)

    if (error) {
      setMessage(error.message)
      return
    }

    setEmail('')
    setMessage(`Invito preparato per ${normalized}`)
    void loadInvites()
  }

  return (
    <section className="glass-card space-y-4 p-6">
      <h2 className="text-3xl">Inviti Admin</h2>
      <form onSubmit={createInvite} className="flex flex-col gap-2 sm:flex-row">
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="field-input"
          placeholder="member@example.com"
          required
        />
        <button type="submit" disabled={submitting} className="btn-primary px-4 py-2 text-sm">
          {submitting ? 'Aggiunta...' : 'Invita'}
        </button>
      </form>
      {message && <p className="text-sm text-[var(--ink-soft)]">{message}</p>}
      <ul className="space-y-2">
        {invites.map((invite) => (
          <li key={invite.id} className="surface-card px-3 py-2 text-sm text-[var(--ink)]">
            <div className="font-medium">{invite.email}</div>
            <div className="text-[var(--ink-soft)]">{invite.accepted_at ? `Accettato: ${new Date(invite.accepted_at).toLocaleString()}` : 'In attesa'}</div>
          </li>
        ))}
      </ul>
    </section>
  )
}
