'use client'

import { useEffect, useState } from 'react'
import { FiSave, FiTrash2 } from 'react-icons/fi'
import { formatDateLabel, formatDateTimeLabel, parseTimeToIso } from '@/lib/date-format'
import { supabase } from '@/lib/supabase'
import Button from '@/components/ui/Button'
import { useToast } from '@/components/ui/ToastProvider'

interface EventScheduleManagerProps {
  visitId: string
  visitOwnerId: string
  initialDate: string
  initialScheduledAt: string | null
}

interface ProfileRow {
  is_admin: boolean
}

function toDateAndTimeValues(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return { date: '', time: '' }
  const pad = (num: number) => String(num).padStart(2, '0')
  const year = date.getFullYear()
  const month = pad(date.getMonth() + 1)
  const day = pad(date.getDate())
  const hour = pad(date.getHours())
  const minute = pad(date.getMinutes())
  return { date: `${year}-${month}-${day}`, time: `${hour}:${minute}` }
}

export default function EventScheduleManager({ visitId, visitOwnerId, initialDate, initialScheduledAt }: EventScheduleManagerProps) {
  const [userId, setUserId] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [canManage, setCanManage] = useState(false)
  const [saving, setSaving] = useState(false)
  const initialDateInput = initialScheduledAt ? toDateAndTimeValues(initialScheduledAt).date : initialDate
  const initialTimeInput = initialScheduledAt ? toDateAndTimeValues(initialScheduledAt).time : ''
  const [dateInput, setDateInput] = useState(initialDateInput)
  const [timeInput, setTimeInput] = useState(initialTimeInput)
  const toast = useToast()

  useEffect(() => {
    const loadUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      setUserId(user.id)
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .maybeSingle<ProfileRow>()

      const admin = Boolean(profile?.is_admin)
      setIsAdmin(admin)
      setCanManage(admin || user.id === visitOwnerId)
    }

    void loadUser()
  }, [visitOwnerId])

  const saveSchedule = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!canManage) {
      toast.error('Non hai permessi per modificare l’orario.')
      return
    }

    if (!dateInput) {
      toast.warning('Seleziona una data.')
      return
    }

    const isoTime = parseTimeToIso(timeInput)
    if (!isoTime) {
      toast.warning('Inserisci un orario valido nel formato HH:mm.')
      return
    }

    const localDate = new Date(`${dateInput}T${isoTime}:00`)
    if (Number.isNaN(localDate.getTime())) {
      toast.error('Data/ora non valida.')
      return
    }

    const nextScheduledAt = localDate.toISOString()
    const nextDate = dateInput

    setSaving(true)
    const { error } = await supabase
      .from('visits')
      .update({
        scheduled_at: nextScheduledAt,
        date: nextDate,
      })
      .eq('id', visitId)

    setSaving(false)
    if (error) {
      toast.error(error.message)
      return
    }

    toast.success('Orario evento aggiornato.')
    window.location.reload()
  }

  const clearSchedule = async () => {
    if (!canManage) {
      toast.error('Non hai permessi per modificare l’orario.')
      return
    }

    setSaving(true)
    const { error } = await supabase
      .from('visits')
      .update({ scheduled_at: null })
      .eq('id', visitId)

    setSaving(false)
    if (error) {
      toast.error(error.message)
      return
    }

    toast.success('Orario rimosso. Evento in attesa di conferma orario.')
    window.location.reload()
  }

  if (!userId) return null

  const selectedIsoTime = parseTimeToIso(timeInput)
  const selectedDateTimeLabel = dateInput && selectedIsoTime
    ? formatDateTimeLabel(new Date(`${dateInput}T${selectedIsoTime}:00`))
    : null
  const fallbackDateLabel = formatDateLabel(`${initialDate}T12:00:00`)

  return (
    <section className="glass-card space-y-3 p-6">
      <h2 className="text-3xl">Orario Evento</h2>
      {!canManage && (
        <p className="page-subtitle">Solo il creatore evento o un admin possono impostare/modificare l’orario.</p>
      )}
      {canManage && (
        <form onSubmit={saveSchedule} className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-[var(--ink)]">Data prenotazione</span>
            <input
              type="date"
              value={dateInput}
              onChange={(event) => setDateInput(event.target.value)}
              className="field-input"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-[var(--ink)]">Ora prenotazione</span>
            <input type="time" value={timeInput} onChange={(event) => setTimeInput(event.target.value)} className="field-input" />
            <span className="mt-1 block text-xs text-[var(--ink-soft)]">
              {selectedDateTimeLabel ? `Formato evento: ${selectedDateTimeLabel}` : `Data evento attuale: ${fallbackDateLabel} · Orario da confermare`}
            </span>
          </label>
          <div className="flex flex-wrap gap-2">
            <Button
              type="submit"
              disabled={saving}
              variant="primary"
              className="px-4 py-2 text-sm"
              icon={<FiSave className="h-4 w-4" />}
            >
              {saving ? 'Salvataggio...' : 'Salva orario'}
            </Button>
            {(dateInput || timeInput) && (
              <Button
                type="button"
                onClick={() => void clearSchedule()}
                disabled={saving}
                variant="secondary"
                className="px-4 py-2 text-sm"
                icon={<FiTrash2 className="h-4 w-4" />}
              >
                Rimuovi orario
              </Button>
            )}
          </div>
        </form>
      )}
      {isAdmin && canManage && (
        <p className="text-xs text-[var(--ink-soft)]">Permesso admin attivo.</p>
      )}
    </section>
  )
}
