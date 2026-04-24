'use client'
/* eslint-disable react-hooks/set-state-in-effect, @next/next/no-img-element */

import { useEffect, useRef, useState } from 'react'
import { FiCamera, FiImage, FiRefreshCw, FiStar, FiTrash2, FiUpload, FiX } from 'react-icons/fi'
import { supabase } from '@/lib/supabase'
import Button from '@/components/ui/Button'
import Checkbox from '@/components/ui/Checkbox'
import { useToast } from '@/components/ui/ToastProvider'

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
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [cameraOpen, setCameraOpen] = useState(false)
  const [cameraError, setCameraError] = useState('')
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const cameraFallbackInputRef = useRef<HTMLInputElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const toast = useToast()

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
      let detail = ''
      try {
        const errorBody = (await uploadResponse.json()) as { error?: { message?: string } }
        detail = errorBody?.error?.message ?? ''
      } catch {
        detail = await uploadResponse.text()
      }
      throw new Error(detail ? `Caricamento Cloudinary fallito: ${detail}` : 'Caricamento Cloudinary fallito.')
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

  useEffect(() => {
    const video = videoRef.current
    const stream = streamRef.current
    if (!cameraOpen || !video || !stream) return

    video.srcObject = stream
    void video.play().catch(() => {
      setCameraError('Impossibile avviare l’anteprima camera.')
    })
  }, [cameraOpen])

  useEffect(() => {
    return () => {
      const stream = streamRef.current
      if (stream) {
        stream.getTracks().forEach((track) => track.stop())
        streamRef.current = null
      }
    }
  }, [])

  const handleFileSelection = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    setSelectedFile(file)
    setCameraError('')
  }

  const closeCamera = () => {
    const stream = streamRef.current
    if (stream) {
      stream.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    setCameraOpen(false)
  }

  const openCamera = async () => {
    setCameraError('')

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      toast.info('Camera non supportata dal browser: apro la selezione file.')
      cameraFallbackInputRef.current?.click()
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      })
      streamRef.current = stream
      setCameraOpen(true)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Accesso camera non consentito.'
      setCameraError(message)
      toast.warning('Impossibile usare la camera dal browser: seleziona una foto dal dispositivo.')
      cameraFallbackInputRef.current?.click()
    }
  }

  const captureFromCamera = async () => {
    const video = videoRef.current
    if (!video) {
      setCameraError('Anteprima camera non disponibile.')
      return
    }

    const width = video.videoWidth || 1280
    const height = video.videoHeight || 720
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height

    const context = canvas.getContext('2d')
    if (!context) {
      setCameraError('Impossibile acquisire la foto.')
      return
    }

    context.drawImage(video, 0, 0, width, height)

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.92))
    if (!blob) {
      setCameraError('Impossibile acquisire la foto.')
      return
    }

    const file = new File([blob], `camera-${Date.now()}.jpg`, { type: 'image/jpeg' })
    setSelectedFile(file)
    closeCamera()
  }

  const uploadSelectedFile = async () => {
    if (!selectedFile) {
      toast.info('Seleziona o scatta prima una foto.')
      return
    }

    setUploading(true)

    let secureUrl = ''
    try {
      secureUrl = await uploadToCloudinary(selectedFile)
    } catch (error) {
      setUploading(false)
      toast.error(error instanceof Error ? error.message : 'Errore caricamento immagine.')
      return
    }

    const currentUserId = userId || (await getCurrentUserId())

    if (!currentUserId) {
      setUploading(false)
      toast.error('Non hai effettuato l’accesso.')
      return
    }

    const { data: insertedPhoto, error } = await supabase
      .from('photos')
      .insert({
        visit_id: visitId,
        url: secureUrl,
        uploaded_by: currentUserId,
        is_pizza_of_night: false,
      })
      .select('id')
      .single<{ id: string }>()

    setUploading(false)
    if (error) {
      toast.error(error.message)
    } else if (pizzaOfNight && insertedPhoto?.id) {
      const { error: tagError } = await supabase.rpc('set_pizza_of_night', {
        p_visit_id: visitId,
        p_photo_id: insertedPhoto.id,
      })
      if (tagError) {
        toast.error(tagError.message)
      } else {
        toast.success('Foto caricata e tag foto della serata assegnato.')
      }
    } else {
      toast.success('Foto caricata.')
    }
    setSelectedFile(null)
    setPizzaOfNight(false)
    void loadPhotos()
  }

  const assignPizzaOfNight = async (photo: Photo) => {
    setBusyPhotoId(photo.id)

    try {
      const { error } = await supabase.rpc('set_pizza_of_night', {
        p_visit_id: visitId,
        p_photo_id: photo.id,
      })

      setBusyPhotoId('')
      if (error) {
        toast.error(error.message)
      } else {
        toast.success('Foto della serata assegnata.')
      }
      void loadPhotos()
    } catch (err) {
      setBusyPhotoId('')
      toast.error(err instanceof Error ? err.message : 'Errore assegnazione tag.')
    }
  }

  const deletePhoto = async (photo: Photo) => {
    setBusyPhotoId(photo.id)

    const { error } = await supabase.from('photos').delete().eq('id', photo.id)

    setBusyPhotoId('')
    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Foto eliminata.')
    }
    void loadPhotos()
  }

  const replacePhoto = async (photo: Photo, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setBusyPhotoId(photo.id)

    let secureUrl = ''
    try {
      secureUrl = await uploadToCloudinary(file)
    } catch (error) {
      setBusyPhotoId('')
      toast.error(error instanceof Error ? error.message : 'Errore sostituzione immagine.')
      return
    }

    const { error } = await supabase
      .from('photos')
      .update({ url: secureUrl })
      .eq('id', photo.id)

    setBusyPhotoId('')
    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Foto sostituita.')
    }
    event.target.value = ''
    void loadPhotos()
  }

  return (
    <section className="glass-card space-y-4 p-6">
      <h2 className="text-3xl">Foto</h2>

      <section className="space-y-3 rounded-2xl border border-[var(--paper-border)] bg-[rgba(255,255,255,0.7)] p-4">
        <div>
          <h3 className="text-lg font-semibold text-[var(--ink)]">Aggiungi nuova foto</h3>
          <p className="text-xs text-[var(--ink-soft)]">Seleziona o scatta una foto, poi conferma con il bottone Aggiungi.</p>
        </div>
        <div className="space-y-2 rounded-xl bg-[rgba(255,255,255,0.66)] p-3">
          <Checkbox checked={pizzaOfNight} onChange={(event) => setPizzaOfNight(event.target.checked)} label="Segna come foto della serata" />
          <div className="flex flex-wrap gap-2">
            <label className="btn-secondary cursor-pointer px-3 py-1.5 text-xs">
              <FiImage className="mr-1 inline h-3.5 w-3.5" />
              Scegli dalla galleria
              <input type="file" accept="image/*" onChange={handleFileSelection} disabled={uploading} className="hidden" />
            </label>
            <Button
              type="button"
              onClick={() => void openCamera()}
              variant="secondary"
              className="px-3 py-1.5 text-xs"
              disabled={uploading}
              icon={<FiCamera className="h-3.5 w-3.5" />}
            >
              Scatta foto
            </Button>
            <input
              ref={cameraFallbackInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileSelection}
              disabled={uploading}
              className="hidden"
            />
            <Button
              type="button"
              onClick={() => void uploadSelectedFile()}
              disabled={uploading || !selectedFile}
              variant="primary"
              className="px-3 py-1.5 text-xs"
              icon={<FiUpload className="h-3.5 w-3.5" />}
            >
              {uploading ? 'Caricamento...' : 'Aggiungi'}
            </Button>
          </div>
          {cameraError && <p className="text-xs text-[var(--terracotta-deep)]">{cameraError}</p>}
          <p className="text-xs text-[var(--ink-soft)]">
            {selectedFile ? `File selezionato: ${selectedFile.name}` : 'Nessuna foto selezionata.'}
          </p>
        </div>
      </section>

      {cameraOpen && (
        <div className="fixed inset-0 z-[120] bg-[rgba(43,31,26,0.65)] p-4" onClick={closeCamera}>
          <div
            className="mx-auto relative flex h-full w-full max-w-2xl overflow-hidden rounded-2xl border border-[var(--paper-border)] bg-black"
            onClick={(event) => event.stopPropagation()}
          >
            <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-black/70 via-black/35 to-transparent px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-8">
              <Button
                type="button"
                onClick={closeCamera}
                variant="secondary"
                className="pointer-events-auto px-3 py-1.5 text-sm"
                icon={<FiX className="h-4 w-4" />}
              >
                Annulla
              </Button>
              <Button
                type="button"
                onClick={() => void captureFromCamera()}
                variant="primary"
                className="pointer-events-auto px-4 py-2 text-sm"
                icon={<FiCamera className="h-4 w-4" />}
              >
                Scatta
              </Button>
            </div>
          </div>
        </div>
      )}

      <section className="space-y-3 rounded-2xl border border-[var(--paper-border)] bg-[rgba(255,255,255,0.7)] p-4">
        <div>
          <h3 className="text-lg font-semibold text-[var(--ink)]">Foto gia caricate</h3>
          <p className="text-xs text-[var(--ink-soft)]">Galleria dell’evento con gestione tag e modifiche.</p>
        </div>

        {photos.length === 0 && <p className="page-subtitle">Nessuna foto disponibile.</p>}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {photos.map((photo) => (
            <div key={photo.id} className="group relative overflow-hidden rounded-xl border border-[rgba(132,92,66,0.28)] bg-white">
              <a href={photo.url} target="_blank" rel="noreferrer">
                <img src={photo.url} alt="Foto della visita" className="h-64 w-full object-cover transition duration-300 group-hover:scale-105" />
                {photo.is_pizza_of_night && (
                  <span className="absolute left-1 top-1 rounded-full bg-[rgba(255,225,155,0.95)] px-2 py-1 text-xs font-medium text-[var(--ink)] flex items-center gap-1">
                    <FiStar className="h-3 w-3" />
                    Foto della serata
                  </span>
                )}
              </a>
              {photo.uploaded_by === userId && (
                <div className="absolute inset-x-0 bottom-0 flex flex-wrap gap-1 bg-gradient-to-t from-black/50 to-transparent p-2">
                  {!photo.is_pizza_of_night && (
                    <Button
                      type="button"
                      onClick={() => void assignPizzaOfNight(photo)}
                      disabled={busyPhotoId === photo.id}
                      variant="secondary"
                      className="px-2 py-1 text-[11px]"
                      icon={<FiStar className="h-3 w-3" />}
                    >
                      foto della serata
                    </Button>
                  )}
                  <label className="btn-secondary cursor-pointer px-2 py-1 text-[11px]">
                    <FiRefreshCw className="mr-1 inline h-3 w-3" />
                    Sostituisci
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(event) => void replacePhoto(photo, event)}
                      disabled={busyPhotoId === photo.id}
                    />
                  </label>
                  <Button
                    type="button"
                    onClick={() => void deletePhoto(photo)}
                    disabled={busyPhotoId === photo.id}
                    variant="secondary"
                    className="px-2 py-1 text-[11px]"
                    icon={<FiTrash2 className="h-3 w-3" />}
                  >
                    Elimina
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </section>
  )
}
