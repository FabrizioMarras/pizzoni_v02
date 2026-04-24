'use client'

import { useState } from 'react'
import { FiSave } from 'react-icons/fi'
import { supabase } from '@/lib/supabase'
import Button from '@/components/ui/Button'
import { useToast } from '@/components/ui/ToastProvider'

interface ProfileEditorProps {
  name: string
  avatarUrl: string
}

function getInitial(name: string) {
  const trimmed = name.trim()
  if (!trimmed) return 'P'
  return trimmed[0]?.toUpperCase() ?? 'P'
}

export default function ProfileEditor({ name, avatarUrl }: ProfileEditorProps) {
  const [formName, setFormName] = useState(name)
  const [formAvatarUrl, setFormAvatarUrl] = useState(avatarUrl)
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
      <div className="flex items-center gap-3 rounded-xl bg-[rgba(255,255,255,0.66)] p-3">
        {formAvatarUrl.trim() ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={formAvatarUrl.trim()} alt={formName || 'Avatar'} className="h-14 w-14 rounded-full object-cover" />
        ) : (
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-[rgba(81,100,58,0.18)] text-lg font-semibold text-[var(--olive)]">
            {getInitial(formName)}
          </div>
        )}
        <div>
          <p className="text-sm font-semibold text-[var(--ink)]">Anteprima avatar</p>
          <p className="text-xs text-[var(--ink-soft)]">Se l’URL non e valido, verrà mostrata l’iniziale del nome.</p>
        </div>
      </div>
      <label className="block">
        <span className="label-text">Nome</span>
        <input value={formName} onChange={(event) => setFormName(event.target.value)} className="field-input" required />
      </label>
      <label className="block">
        <span className="label-text">URL Avatar (opzionale)</span>
        <input
          value={formAvatarUrl}
          onChange={(event) => setFormAvatarUrl(event.target.value)}
          className="field-input"
          placeholder="https://..."
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
