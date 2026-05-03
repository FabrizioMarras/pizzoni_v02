'use client'

import { useState } from 'react'
import { FiSave } from 'react-icons/fi'
import { supabase } from '@/lib/supabase'
import Avatar from '@/components/ui/Avatar'
import Button from '@/components/ui/Button'
import { useToast } from '@/components/ui/ToastProvider'

interface ProfileEditorProps {
  name: string
  avatarUrl: string
}

export default function ProfileEditor({ name, avatarUrl }: ProfileEditorProps) {
  const [formName, setFormName] = useState(name)
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
        <Avatar name={formName} avatarUrl={avatarUrl} size="lg" />
        <div>
          <p className="text-sm font-semibold text-[var(--ink)]">Anteprima avatar</p>
          <p className="text-xs text-[var(--ink-soft)]">Se l’URL non e valido, verrà mostrata l’iniziale del nome.</p>
        </div>
      </div>
      <label className="block">
        <span className="label-text">Nome</span>
        <input value={formName} onChange={(event) => setFormName(event.target.value)} className="field-input" required />
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
