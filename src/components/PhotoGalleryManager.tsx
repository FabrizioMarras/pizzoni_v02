'use client'
/* eslint-disable react-hooks/set-state-in-effect, @next/next/no-img-element */

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface Photo {
  id: string
  url: string
  is_pizza_of_night: boolean
}

interface PhotoGalleryManagerProps {
  visitId: string
}

export default function PhotoGalleryManager({ visitId }: PhotoGalleryManagerProps) {
  const [photos, setPhotos] = useState<Photo[]>([])
  const [uploading, setUploading] = useState(false)
  const [pizzaOfNight, setPizzaOfNight] = useState(false)
  const [message, setMessage] = useState('')

  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET

  const loadPhotos = async () => {
    const { data } = await supabase.from('photos').select('id, url, is_pizza_of_night').eq('visit_id', visitId).order('created_at', { ascending: false })
    setPhotos(data ?? [])
  }

  useEffect(() => {
    void loadPhotos()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visitId])

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!cloudName || !uploadPreset) {
      setMessage('Mancano le variabili Cloudinary: NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME e NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET')
      return
    }

    setUploading(true)
    setMessage('')

    const formData = new FormData()
    formData.append('file', file)
    formData.append('upload_preset', uploadPreset)
    formData.append('folder', 'pizzoni')

    const uploadResponse = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: 'POST',
      body: formData,
    })

    if (!uploadResponse.ok) {
      setUploading(false)
      setMessage('Caricamento Cloudinary fallito.')
      return
    }

    const uploadResult = (await uploadResponse.json()) as { secure_url?: string }

    if (!uploadResult.secure_url) {
      setUploading(false)
      setMessage('Cloudinary non ha restituito alcun URL.')
      return
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setUploading(false)
      setMessage('Non hai effettuato l’accesso.')
      return
    }

    const { error } = await supabase.from('photos').insert({
      visit_id: visitId,
      url: uploadResult.secure_url,
      uploaded_by: user.id,
      is_pizza_of_night: pizzaOfNight,
    })

    setUploading(false)
    setMessage(error ? error.message : 'Foto caricata.')
    event.target.value = ''
    setPizzaOfNight(false)
    void loadPhotos()
  }

  return (
    <section className="glass-card space-y-4 p-6">
      <h2 className="text-3xl">Foto</h2>
      <div className="space-y-2 rounded-xl bg-[rgba(255,255,255,0.66)] p-3">
        <label className="flex items-center gap-2 text-sm text-[var(--ink)]">
          <input type="checkbox" checked={pizzaOfNight} onChange={(event) => setPizzaOfNight(event.target.checked)} />
          Segna come pizza della serata
        </label>
        <input type="file" accept="image/*" onChange={handleFile} disabled={uploading} className="field-input" />
        {message && <p className="text-sm text-[var(--ink-soft)]">{message}</p>}
      </div>

      {photos.length === 0 && <p className="page-subtitle">Nessuna foto disponibile.</p>}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {photos.map((photo) => (
          <a key={photo.id} href={photo.url} target="_blank" rel="noreferrer" className="group relative overflow-hidden rounded-xl border border-[rgba(132,92,66,0.28)]">
            <img src={photo.url} alt="Foto della visita" className="h-32 w-full object-cover transition duration-300 group-hover:scale-105" />
            {photo.is_pizza_of_night && (
              <span className="absolute left-1 top-1 rounded-full bg-[rgba(255,225,155,0.95)] px-2 py-1 text-xs font-medium text-[var(--ink)]">
                Pizza della serata
              </span>
            )}
          </a>
        ))}
      </div>
    </section>
  )
}
