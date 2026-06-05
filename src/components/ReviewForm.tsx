'use client'

import { useState } from 'react'
import { FiSave } from 'react-icons/fi'
import { supabase } from '@/lib/supabase'
import Button from '@/components/ui/Button'
import { useToast } from '@/components/ui/ToastProvider'

interface ReviewFormProps {
  visitId: string
  userId: string
  initialReview: ReviewRow | null
}

interface ReviewRow {
  id: string
  pizza_quality: number | null
  ambience: number | null
  service: number | null
  value: number | null
  final_score: number | null
}

interface ScoreField {
  label: string
  value: number
  setValue: (value: number) => void
}

export default function ReviewForm({ visitId, userId, initialReview }: ReviewFormProps) {
  const [pizzaQuality, setPizzaQuality] = useState(initialReview?.pizza_quality ?? 8)
  const [ambience, setAmbience] = useState(initialReview?.ambience ?? 8)
  const [service, setService] = useState(initialReview?.service ?? 8)
  const [value, setValue] = useState(initialReview?.value ?? 8)
  const [myReview, setMyReview] = useState<ReviewRow | null>(initialReview)
  const [saving, setSaving] = useState(false)
  const toast = useToast()
  const scoreFields: ScoreField[] = [
    { label: 'Qualità pizza', value: pizzaQuality, setValue: setPizzaQuality },
    { label: 'Atmosfera', value: ambience, setValue: setAmbience },
    { label: 'Servizio', value: service, setValue: setService },
    { label: 'Prezzo', value, setValue: setValue },
  ]

  const loadMyReview = async () => {
    const { data } = await supabase
      .from('reviews')
      .select('id, pizza_quality, ambience, service, value, final_score')
      .eq('visit_id', visitId)
      .eq('user_id', userId)
      .maybeSingle<ReviewRow>()

    if (!data) {
      setMyReview(null)
      return
    }

    setMyReview(data)
    setPizzaQuality(data.pizza_quality ?? 8)
    setAmbience(data.ambience ?? 8)
    setService(data.service ?? 8)
    setValue(data.value ?? 8)
  }

  const submitReview = async (event: React.FormEvent) => {
    event.preventDefault()
    setSaving(true)

    const payload = {
      visit_id: visitId,
      user_id: userId,
      pizza_quality: pizzaQuality,
      ambience,
      service,
      value,
    }

    const { error } = await supabase.from('reviews').upsert(payload, { onConflict: 'visit_id,user_id' })

    setSaving(false)
    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Recensione salvata.')
    }
    void loadMyReview()
  }

  return (
    <div className="space-y-4">
      {myReview?.final_score !== null && myReview?.final_score !== undefined && (
        <p className="page-subtitle">Punteggio finale attuale: {myReview.final_score.toFixed(1)}</p>
      )}
      <form onSubmit={submitReview} className="space-y-3">
        {scoreFields.map((field) => (
          <label key={field.label} className="block rounded-xl bg-[rgba(255,255,255,0.66)] p-3">
            <span className="mb-1 block text-sm font-semibold text-[var(--ink)]">{field.label}: {field.value}</span>
            <input
              type="range"
              min={0}
              max={10}
              step={0.5}
              value={field.value}
              onChange={(event) => field.setValue(Number(event.target.value))}
              className="w-full accent-[var(--terracotta)]"
            />
          </label>
        ))}
        <Button
          type="submit"
          disabled={saving}
          variant="primary"
          className="px-4 py-2 text-sm"
          icon={<FiSave className="h-4 w-4" />}
        >
          {saving ? 'Salvataggio...' : 'Salva Recensione'}
        </Button>
      </form>
    </div>
  )
}
