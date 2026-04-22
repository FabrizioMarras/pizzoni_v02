'use client'
/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface ReviewFormProps {
  visitId: string
}

interface ReviewRow {
  id: string
  pizza_quality: number | null
  ambience: number | null
  service: number | null
  value: number | null
  final_score: number | null
}

export default function ReviewForm({ visitId }: ReviewFormProps) {
  const [pizzaQuality, setPizzaQuality] = useState(8)
  const [ambience, setAmbience] = useState(8)
  const [service, setService] = useState(8)
  const [value, setValue] = useState(8)
  const [myReview, setMyReview] = useState<ReviewRow | null>(null)
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)

  const loadMyReview = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return

    const { data } = await supabase
      .from('reviews')
      .select('id, pizza_quality, ambience, service, value, final_score')
      .eq('visit_id', visitId)
      .eq('user_id', user.id)
      .maybeSingle<ReviewRow>()

    if (!data) return

    setMyReview(data)
    setPizzaQuality(data.pizza_quality ?? 8)
    setAmbience(data.ambience ?? 8)
    setService(data.service ?? 8)
    setValue(data.value ?? 8)
  }

  useEffect(() => {
    void loadMyReview()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visitId])

  const submitReview = async (event: React.FormEvent) => {
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

    const payload = {
      visit_id: visitId,
      user_id: user.id,
      pizza_quality: pizzaQuality,
      ambience,
      service,
      value,
    }

    const { error } = await supabase.from('reviews').upsert(payload, { onConflict: 'visit_id,user_id' })

    setSaving(false)
    setMessage(error ? error.message : 'Recensione salvata.')
    void loadMyReview()
  }

  return (
    <section className="glass-card space-y-4 p-6">
      <h2 className="text-3xl">La Tua Recensione</h2>
      {myReview?.final_score !== null && myReview?.final_score !== undefined && (
        <p className="page-subtitle">Punteggio finale attuale: {myReview.final_score.toFixed(1)}</p>
      )}
      <form onSubmit={submitReview} className="space-y-3">
        {[
          ['Qualità pizza', pizzaQuality, setPizzaQuality],
          ['Atmosfera', ambience, setAmbience],
          ['Servizio', service, setService],
          ['Prezzo', value, setValue],
        ].map(([label, valueNumber, setter]) => (
          <label key={label as string} className="block rounded-xl bg-[rgba(255,255,255,0.66)] p-3">
            <span className="mb-1 block text-sm font-semibold text-[var(--ink)]">{label as string}: {valueNumber as number}</span>
            <input
              type="range"
              min={0}
              max={10}
              value={valueNumber as number}
              onChange={(event) => (setter as (v: number) => void)(Number(event.target.value))}
              className="w-full accent-[var(--terracotta)]"
            />
          </label>
        ))}
        <button type="submit" disabled={saving} className="btn-primary px-4 py-2 text-sm">
          {saving ? 'Salvataggio...' : 'Salva Recensione'}
        </button>
      </form>
      {message && <p className="text-sm text-[var(--ink-soft)]">{message}</p>}
    </section>
  )
}
