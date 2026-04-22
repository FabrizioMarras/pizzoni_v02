'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

interface ProfileEditorProps {
  name: string
  avatarUrl: string
  pizzaEmoji: string
}

export default function ProfileEditor({ name, avatarUrl, pizzaEmoji }: ProfileEditorProps) {
  const [formName, setFormName] = useState(name)
  const [formAvatarUrl, setFormAvatarUrl] = useState(avatarUrl)
  const [formPizzaEmoji, setFormPizzaEmoji] = useState(pizzaEmoji)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setMessage('')

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setSaving(false)
      setMessage('Non hai effettuato l’accesso.')
      return
    }

    const { error } = await supabase
      .from('profiles')
      .update({
        name: formName.trim(),
        avatar_url: formAvatarUrl.trim() || null,
        pizza_emoji: formPizzaEmoji.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)

    setSaving(false)
    setMessage(error ? error.message : 'Profilo salvato.')
  }

  return (
    <form onSubmit={onSubmit} className="glass-card space-y-4 p-6">
      <h2 className="text-3xl">Il Mio Profilo</h2>
      <label className="block">
        <span className="label-text">Nome</span>
        <input value={formName} onChange={(event) => setFormName(event.target.value)} className="field-input" required />
      </label>
      <label className="block">
        <span className="label-text">URL Avatar</span>
        <input
          value={formAvatarUrl}
          onChange={(event) => setFormAvatarUrl(event.target.value)}
          className="field-input"
          placeholder="https://..."
        />
      </label>
      <label className="block">
        <span className="label-text">Emoji Pizza</span>
        <input
          value={formPizzaEmoji}
          onChange={(event) => setFormPizzaEmoji(event.target.value)}
          className="field-input"
          placeholder="🍕"
        />
      </label>
      <button type="submit" disabled={saving} className="btn-primary px-4 py-2 text-sm">
          {saving ? 'Salvataggio...' : 'Salva Profilo'}
        </button>
      {message && <p className="text-sm text-[var(--ink-soft)]">{message}</p>}
    </form>
  )
}
