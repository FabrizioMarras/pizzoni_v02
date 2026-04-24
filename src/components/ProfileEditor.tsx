'use client'

import { useState } from 'react'
import { FiSave } from 'react-icons/fi'
import { supabase } from '@/lib/supabase'
import Button from '@/components/ui/Button'
import { useToast } from '@/components/ui/ToastProvider'

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
  const toast = useToast()

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setSaving(true)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setSaving(false)
      toast.error('Non hai effettuato l’accesso.')
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
    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Profilo salvato.')
    }
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
      <Button
        type="submit"
        disabled={saving}
        variant="primary"
        className="px-4 py-2 text-sm"
        icon={<FiSave className="h-4 w-4" />}
      >
          {saving ? 'Salvataggio...' : 'Salva Profilo'}
      </Button>
    </form>
  )
}
