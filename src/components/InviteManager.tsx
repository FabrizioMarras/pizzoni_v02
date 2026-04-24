'use client'
/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState } from 'react'
import { FiMail, FiSend } from 'react-icons/fi'
import { formatDateTimeLabel } from '@/lib/date-format'
import { supabase } from '@/lib/supabase'
import Button from '@/components/ui/Button'
import { useToast } from '@/components/ui/ToastProvider'

interface Invite {
  id: string
  email: string
  accepted_at: string | null
}

export default function InviteManager() {
  const [email, setEmail] = useState('')
  const [invites, setInvites] = useState<Invite[]>([])
  const [submitting, setSubmitting] = useState(false)
  const toast = useToast()

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

    const normalized = email.trim().toLowerCase()

    const { error } = await supabase.from('invites').upsert({ email: normalized }, { onConflict: 'email' })

    setSubmitting(false)

    if (error) {
      toast.error(error.message)
      return
    }

    setEmail('')
    toast.success(`Invito preparato per ${normalized}`)
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
        <Button
          type="submit"
          disabled={submitting}
          variant="primary"
          className="px-4 py-2 text-sm"
          icon={<FiSend className="h-4 w-4" />}
        >
          {submitting ? 'Aggiunta...' : 'Invita'}
        </Button>
      </form>
      <ul className="space-y-2">
        {invites.map((invite) => (
          <li key={invite.id} className="surface-card px-3 py-2 text-sm text-[var(--ink)]">
            <div className="font-medium"><FiMail className="mr-1 inline h-4 w-4" />{invite.email}</div>
            <div className="text-[var(--ink-soft)]">{invite.accepted_at ? `Accettato: ${formatDateTimeLabel(invite.accepted_at)}` : 'In attesa'}</div>
          </li>
        ))}
      </ul>
    </section>
  )
}
