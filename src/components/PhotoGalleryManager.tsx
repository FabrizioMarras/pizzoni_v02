'use client'
/* eslint-disable react-hooks/set-state-in-effect, @next/next/no-img-element */

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface Photo {
  id: string
  url: string
  is_pizza_of_night: boolean
  uploaded_by: string
}

interface PhotoGalleryManagerProps {
  visitId: string
}

export default function PhotoGalleryManager({ visitId }: PhotoGalleryManagerProps) {
  const [photos, setPhotos] = useState<Photo[]>([])
  const [userId, setUserId] = useState('')
  const [uploading, setUploading] = useState(false)
  const [busyPhotoId, setBusyPhotoId] = useState('')
  const [pizzaOfNight, setPizzaOfNight] = useState(false)
  const [message, setMessage] = useState('')

  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET

  const getCurrentUserId = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    setUserId(user?.id ?? '')
    return user?.id ?? ''
  }

  const uploadToCloudinary = async (file: File) => {
    if (!cloudName || !uploadPreset) {
      throw new Error('Mancano le variabili Cloudinary: NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME e NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET')
    }

    const formData = new FormData()
    formData.append('file', file)
    formData.append('upload_preset', uploadPreset)
    formData.append('folder', 'pizzoni')

    const uploadResponse = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: 'POST',
      body: formData,
    })

    if (!uploadResponse.ok) {
      throw new Error('Caricamento Cloudinary fallito.')
    }

    const uploadResult = (await uploadResponse.json()) as { secure_url?: string }
    if (!uploadResult.secure_url) {
      throw new Error('Cloudinary non ha restituito alcun URL.')
    }

    return uploadResult.secure_url
  }

  const loadPhotos = async () => {
    const { data } = await supabase
      .from('photos')
      .select('id, url, is_pizza_of_night, uploaded_by')
      .eq('visit_id', visitId)
      .order('created_at', { ascending: false })
    setPhotos(data ?? [])
  }

  useEffect(() => {
    void getCurrentUserId()
    void loadPhotos()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visitId])

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setUploading(true)
    setMessage('')

    let secureUrl = ''
    try {
      secureUrl = await uploadToCloudinary(file)
    } catch (error) {
      setUploading(false)
      setMessage(error instanceof Error ? error.message : 'Errore caricamento immagine.')
      return
    }

    const currentUserId = userId || (await getCurrentUserId())

    if (!currentUserId) {
      setUploading(false)
      setMessage('Non hai effettuato l’accesso.')
      return
    }

    const { error } = await supabase.from('photos').insert({
      visit_id: visitId,
      url: secureUrl,
      uploaded_by: currentUserId,
      is_pizza_of_night: pizzaOfNight,
    })

    setUploading(false)
    setMessage(error ? error.message : 'Foto caricata.')
    event.target.value = ''
    setPizzaOfNight(false)
    void loadPhotos()
  }

  const togglePizzaOfNight = async (photo: Photo) => {
    setBusyPhotoId(photo.id)
    setMessage('')

    const { error } = await supabase
      .from('photos')
      .update({ is_pizza_of_night: !photo.is_pizza_of_night })
      .eq('id', photo.id)

    setBusyPhotoId('')
    setMessage(error ? error.message : 'Foto aggiornata.')
    void loadPhotos()
  }

  const deletePhoto = async (photo: Photo) => {
    setBusyPhotoId(photo.id)
    setMessage('')

    const { error } = await supabase.from('photos').delete().eq('id', photo.id)

    setBusyPhotoId('')
    setMessage(error ? error.message : 'Foto eliminata.')
    void loadPhotos()
  }

  const replacePhoto = async (photo: Photo, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setBusyPhotoId(photo.id)
    setMessage('')

    let secureUrl = ''
    try {
      secureUrl = await uploadToCloudinary(file)
    } catch (error) {
      setBusyPhotoId('')
      setMessage(error instanceof Error ? error.message : 'Errore sostituzione immagine.')
      return
    }

    const { error } = await supabase
      .from('photos')
      .update({ url: secureUrl })
      .eq('id', photo.id)

    setBusyPhotoId('')
    setMessage(error ? error.message : 'Foto sostituita.')
    event.target.value = ''
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
          <div key={photo.id} className="group relative overflow-hidden rounded-xl border border-[rgba(132,92,66,0.28)] bg-white">
            <a href={photo.url} target="_blank" rel="noreferrer">
              <img src={photo.url} alt="Foto della visita" className="h-32 w-full object-cover transition duration-300 group-hover:scale-105" />
              {photo.is_pizza_of_night && (
                <span className="absolute left-1 top-1 rounded-full bg-[rgba(255,225,155,0.95)] px-2 py-1 text-xs font-medium text-[var(--ink)]">
                  Pizza della serata
                </span>
              )}
            </a>
            {photo.uploaded_by === userId && (
              <div className="flex flex-wrap gap-1 border-t border-[var(--paper-border)] p-2">
                <button
                  type="button"
                  onClick={() => void togglePizzaOfNight(photo)}
                  disabled={busyPhotoId === photo.id}
                  className="btn-secondary px-2 py-1 text-[11px]"
                >
                  {photo.is_pizza_of_night ? 'Rimuovi tag' : 'Pizza della serata'}
                </button>
                <label className="btn-secondary cursor-pointer px-2 py-1 text-[11px]">
                  Sostituisci
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) => void replacePhoto(photo, event)}
                    disabled={busyPhotoId === photo.id}
                  />
                </label>
                <button
                  type="button"
                  onClick={() => void deletePhoto(photo)}
                  disabled={busyPhotoId === photo.id}
                  className="btn-secondary px-2 py-1 text-[11px]"
                >
                  Elimina
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}
