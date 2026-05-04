'use client'

import Image from 'next/image'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { FiCheck, FiEye, FiEyeOff, FiImage, FiList, FiMapPin, FiNavigation, FiPlus } from 'react-icons/fi'
import { mapRowsToPizzerias } from '@/lib/data/pizzeria-mapper'
import { PIZZERIA_WITH_VISITS_SELECT } from '@/lib/data/pizzeria-queries'
import { supabase } from '@/lib/supabase'
import { getPizzeriaImageSrc } from '@/lib/pizzeria-image'
import type { Pizzeria, PizzeriaRow } from '@/lib/types/pizzeria'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import ButtonLink from '@/components/ui/ButtonLink'
import FileButton from '@/components/ui/FileButton'
import ScrollPagination from '@/components/ui/ScrollPagination'
import SearchBar from '@/components/ui/SearchBar'
import { getCurrentPosition, searchPlaces, type PlaceSuggestion } from '@/lib/places'
import { useToast } from '@/components/ui/ToastProvider'

interface PizzeriaManagerProps {
  initialPizzerias: Pizzeria[]
}

const PIZZERIA_BATCH_SIZE = 9

function normalizeDuplicateKey(value: string) {
  return value.trim().toLocaleLowerCase('it-IT').replace(/\s+/g, ' ')
}

function findDuplicatePizzeria(pizzerias: Pizzeria[], nextName: string, nextCity: string) {
  const normalizedName = normalizeDuplicateKey(nextName)
  const normalizedCity = normalizeDuplicateKey(nextCity)

  if (!normalizedName || !normalizedCity) return null

  return pizzerias.find((pizzeria) => (
    normalizeDuplicateKey(pizzeria.name) === normalizedName &&
    normalizeDuplicateKey(pizzeria.city) === normalizedCity
  )) ?? null
}

export default function PizzeriaManager({ initialPizzerias }: PizzeriaManagerProps) {
  const [name, setName] = useState('')
  const [location, setLocation] = useState('')
  const [city, setCity] = useState('')
  const [pizzerias, setPizzerias] = useState<Pizzeria[]>(initialPizzerias)
  const [filter, setFilter] = useState<'all' | 'visited' | 'not_visited'>('all')
  const [listSearch, setListSearch] = useState('')
  const [visibleCount, setVisibleCount] = useState(PIZZERIA_BATCH_SIZE)
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [searchResults, setSearchResults] = useState<PlaceSuggestion[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [geo, setGeo] = useState<{ latitude: number; longitude: number } | null>(null)
  const [geoLoading, setGeoLoading] = useState(false)
  const [googlePlaceId, setGooglePlaceId] = useState('')
  const [googleMapsUri, setGoogleMapsUri] = useState('')
  const [googlePhotoName, setGooglePhotoName] = useState('')
  const [latitude, setLatitude] = useState<number | null>(null)
  const [longitude, setLongitude] = useState<number | null>(null)
  const [customImageFile, setCustomImageFile] = useState<File | null>(null)
  const [customImagePreview, setCustomImagePreview] = useState('')
  const [saving, setSaving] = useState(false)
  const toast = useToast()
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET
  const closeAddModal = () => {
    setAddModalOpen(false)
    setSearchResults([])
    setSearchLoading(false)
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

  const loadPizzerias = async () => {
    const now = Date.now()

    const { data } = await supabase
      .from('pizzerias')
      .select(PIZZERIA_WITH_VISITS_SELECT)
      .order('created_at', { ascending: false })
      .returns<PizzeriaRow[]>()

    setPizzerias(mapRowsToPizzerias(data ?? [], { visitMode: 'past', now }))
  }

  useEffect(() => {
    if (!addModalOpen) return

    const query = [name.trim(), city.trim()].filter(Boolean).join(' ')
    if (query.length < 2) {
      return
    }

    const timeout = window.setTimeout(() => {
      setSearchLoading(true)

      void searchPlaces({
        query,
        latitude: geo?.latitude,
        longitude: geo?.longitude,
      })
        .then((results) => setSearchResults(results))
        .catch((error: unknown) => {
          const nextError = error instanceof Error ? error.message : 'Ricerca Google non disponibile.'
          toast.error(nextError)
          setSearchResults([])
        })
        .finally(() => setSearchLoading(false))
    }, 300)

    return () => window.clearTimeout(timeout)
  }, [addModalOpen, name, city, geo, toast])

  useEffect(() => {
    return () => {
      if (customImagePreview) {
        URL.revokeObjectURL(customImagePreview)
      }
    }
  }, [customImagePreview])

  const onCustomImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (customImagePreview) {
      URL.revokeObjectURL(customImagePreview)
    }
    setCustomImageFile(file)
    const localPreview = URL.createObjectURL(file)
    setCustomImagePreview(localPreview)
  }

  const clearCustomImage = () => {
    if (customImagePreview) {
      URL.revokeObjectURL(customImagePreview)
    }
    setCustomImageFile(null)
    setCustomImagePreview('')
  }

  const createPizzeria = async (event: React.FormEvent) => {
    event.preventDefault()

    const duplicatePizzeria = findDuplicatePizzeria(pizzerias, name, city)
    if (duplicatePizzeria) {
      toast.warning(`Pizzeria gia presente: ${duplicatePizzeria.name}, ${duplicatePizzeria.city}.`)
      return
    }

    setSaving(true)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      toast.error('Non hai effettuato l’accesso.')
      setSaving(false)
      return
    }

    let customImageUrl: string | null = null
    if (customImageFile) {
      try {
        customImageUrl = await uploadToCloudinary(customImageFile)
      } catch (error) {
        setSaving(false)
        toast.error(error instanceof Error ? error.message : 'Errore caricamento immagine.')
        return
      }
    }

    const { error } = await supabase.from('pizzerias').insert({
      name: name.trim(),
      location: location.trim(),
      city: city.trim(),
      google_place_id: googlePlaceId || null,
      google_maps_uri: googleMapsUri || null,
      google_photo_name: googlePhotoName || null,
      latitude,
      longitude,
      custom_image_url: customImageUrl,
      created_by: user.id,
    })

    setSaving(false)

    if (error) {
      toast.error(error.message)
      return
    }

    setName('')
    setLocation('')
    setCity('')
    setGooglePlaceId('')
    setGoogleMapsUri('')
    setGooglePhotoName('')
    setLatitude(null)
    setLongitude(null)
    clearCustomImage()
    setAddModalOpen(false)
    toast.success('Pizzeria aggiunta.')
    void loadPizzerias()
  }

  const enableGeolocation = async () => {
    setGeoLoading(true)
    try {
      const current = await getCurrentPosition()
      setGeo(current)
      toast.success('Geolocalizzazione attiva: risultati ordinati vicino a te.')
    } catch (error) {
      const nextError = error instanceof Error ? error.message : 'Geolocalizzazione non disponibile.'
      toast.warning(nextError)
    } finally {
      setGeoLoading(false)
    }
  }

  const pickPlace = (place: PlaceSuggestion) => {
    setName(place.name)
    setLocation(place.address)
    setCity(place.city)
    setGooglePlaceId(place.id)
    setGoogleMapsUri(place.mapsUri ?? '')
    setGooglePhotoName(place.photoName ?? '')
    setLatitude(place.latitude)
    setLongitude(place.longitude)
    setSearchResults([])
  }

  const onNameChange = (value: string) => {
    setName(value)
    setGooglePlaceId('')
    setGoogleMapsUri('')
    setGooglePhotoName('')
    setLatitude(null)
    setLongitude(null)
    setSearchResults([])
    setSearchLoading(false)
  }

  const filteredPizzerias = useMemo(() => {
    const query = listSearch.trim().toLocaleLowerCase('it-IT')

    return pizzerias.filter((pizzeria) => {
      if (filter === 'visited' && !pizzeria.visited) return false
      if (filter === 'not_visited' && pizzeria.visited) return false
      if (!query) return true

      return [pizzeria.name, pizzeria.city, pizzeria.location]
        .join(' ')
        .toLocaleLowerCase('it-IT')
        .includes(query)
    })
  }, [filter, listSearch, pizzerias])
  const visiblePizzerias = filteredPizzerias.slice(0, visibleCount)
  const hasMorePizzerias = visibleCount < filteredPizzerias.length

  const onListSearchChange = useCallback((value: string) => {
    setListSearch(value)
    setVisibleCount(PIZZERIA_BATCH_SIZE)
  }, [])

  const onFilterChange = useCallback((value: 'all' | 'visited' | 'not_visited') => {
    setFilter(value)
    setVisibleCount(PIZZERIA_BATCH_SIZE)
  }, [])

  const loadMorePizzerias = useCallback(() => {
    setVisibleCount((current) => Math.min(current + PIZZERIA_BATCH_SIZE, filteredPizzerias.length))
  }, [filteredPizzerias.length])

  const visitedCount = pizzerias.filter((pizzeria) => pizzeria.visited).length
  const notVisitedCount = pizzerias.length - visitedCount

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button
          type="button"
          onClick={() => setAddModalOpen(true)}
          variant="primary"
          className="px-4 py-2 text-sm"
          icon={<FiPlus className="h-4 w-4" />}
        >
          Aggiungi
        </Button>
      </div>

      <Modal open={addModalOpen} onClose={closeAddModal} title="Aggiungi Pizzeria">
        <form onSubmit={createPizzeria} className="space-y-4">
          <input value={name} onChange={(event) => onNameChange(event.target.value)} placeholder="Nome" className="field-input" required />
          <div className="space-y-2 rounded-xl bg-[rgba(255,255,255,0.66)] p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-[var(--ink-soft)]">Suggerimenti Google Maps</p>
              <Button
                type="button"
                onClick={() => void enableGeolocation()}
                disabled={geoLoading}
                variant="secondary"
                className="px-3 py-1 text-xs"
                icon={<FiNavigation className="h-3.5 w-3.5" />}
              >
                {geoLoading ? 'Attivo...' : geo ? 'Geolocalizzazione attiva' : 'Usa la mia posizione'}
              </Button>
            </div>
            {searchLoading && <p className="text-xs text-[var(--ink-soft)]">Ricerca in corso...</p>}
            {!searchLoading && searchResults.length > 0 && (
              <div className="max-h-48 space-y-2 overflow-auto pr-1">
                {searchResults.map((place) => (
                  <Button
                    key={place.id}
                    type="button"
                    onClick={() => pickPlace(place)}
                    variant="unstyled"
                    className="block w-full rounded-xl bg-white px-3 py-2 text-left text-xs text-[var(--ink)]"
                    icon={<FiMapPin className="mt-0.5 h-3.5 w-3.5" />}
                  >
                    <div className="font-semibold">{place.name}</div>
                    <div className="text-[var(--ink-soft)]">{place.city} · {place.address}</div>
                  </Button>
                ))}
              </div>
            )}
          </div>
          <input value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Indirizzo" className="field-input" required />
          <input
            value={city}
            onChange={(event) => {
              setCity(event.target.value)
              setSearchResults([])
              setSearchLoading(false)
            }}
            placeholder="Città"
            className="field-input"
            required
          />
          <div className="space-y-2 rounded-xl bg-[rgba(255,255,255,0.66)] p-3">
            <p className="text-xs text-[var(--ink-soft)]">Immagine pizzeria (opzionale)</p>
            {customImagePreview && (
              <Image
                src={customImagePreview}
                alt="Anteprima immagine pizzeria"
                width={640}
                height={360}
                unoptimized
                className="h-36 w-full rounded-xl object-cover"
              />
            )}
            <div className="flex flex-wrap gap-2">
              <FileButton
                onChange={onCustomImageChange}
                disabled={saving}
                className="px-3 py-1.5 text-xs"
                icon={<FiImage className="h-3.5 w-3.5" />}
              >
                Scegli immagine
              </FileButton>
              {customImagePreview && (
                <Button
                  type="button"
                  onClick={clearCustomImage}
                  variant="secondary"
                  className="px-3 py-1.5 text-xs"
                  icon={<FiCheck className="h-3.5 w-3.5" />}
                >
                  Rimuovi
                </Button>
              )}
            </div>
          </div>
          <Button
            type="submit"
            disabled={saving}
            variant="primary"
            className="px-4 py-2 text-sm"
            icon={<FiCheck className="h-4 w-4" />}
          >
            {saving ? 'Salvataggio...' : 'Crea'}
          </Button>
        </form>
      </Modal>

      <section className="glass-card space-y-3 p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-3xl">Tutte le Pizzerie</h2>
          <div className="flex flex-wrap gap-2 text-xs">
            <Button
              type="button"
              onClick={() => onFilterChange('all')}
              variant={filter === 'all' ? 'primary' : 'secondary'}
              className="px-3 py-1.5"
              icon={<FiList className="h-3.5 w-3.5" />}
            >
              Tutte ({pizzerias.length})
            </Button>
            <Button
              type="button"
              onClick={() => onFilterChange('visited')}
              variant={filter === 'visited' ? 'primary' : 'secondary'}
              className="px-3 py-1.5"
              icon={<FiEyeOff className="h-3.5 w-3.5" />}
            >
              Visitate ({visitedCount})
            </Button>
            <Button
              type="button"
              onClick={() => onFilterChange('not_visited')}
              variant={filter === 'not_visited' ? 'primary' : 'secondary'}
              className="px-3 py-1.5"
              icon={<FiEye className="h-3.5 w-3.5" />}
            >
              Da visitare ({notVisitedCount})
            </Button>
          </div>
        </div>

        <SearchBar
          value={listSearch}
          onChange={onListSearchChange}
          ariaLabel="Cerca nella lista"
          placeholder="Cerca per nome, citta o indirizzo"
          resultCount={filteredPizzerias.length}
          totalCount={pizzerias.length}
        />

        {filteredPizzerias.length === 0 && (
          <p className="page-subtitle">
            {listSearch.trim() ? 'Nessuna pizzeria corrisponde alla ricerca.' : 'Nessuna pizzeria per questo filtro.'}
          </p>
        )}
        {filteredPizzerias.length > 0 && (
          <>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {visiblePizzerias.map((pizzeria, index) => (
                <article key={pizzeria.id} className="surface-card flex h-full flex-col px-3 py-3">
                  <div className="mb-3 overflow-hidden rounded-2xl border border-[var(--paper-border)]">
                    <Image
                      src={getPizzeriaImageSrc({
                        id: pizzeria.id,
                        name: pizzeria.name,
                        city: pizzeria.city,
                        customImageUrl: pizzeria.custom_image_url,
                        latestEventPhotoUrl: pizzeria.latest_event_photo_url,
                        googlePhotoName: pizzeria.google_photo_name,
                        width: 800,
                      })}
                      alt={pizzeria.name}
                      width={800}
                      height={450}
                      unoptimized
                      loading={index === 0 ? 'eager' : 'lazy'}
                      className="h-36 w-full object-cover"
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="text-lg font-semibold text-[var(--ink)]">{pizzeria.name}</div>
                    {pizzeria.visited ? (
                      <span className="rounded-full bg-[rgba(81,100,58,0.15)] px-2 py-1 text-xs text-[var(--olive)]">
                        Visitata ({pizzeria.visitsCount})
                      </span>
                    ) : (
                      <span className="rounded-full bg-[rgba(178,74,47,0.15)] px-2 py-1 text-xs text-[var(--terracotta-deep)]">
                        Da visitare
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-[var(--ink-soft)]">{pizzeria.city} · {pizzeria.location}</div>
                  <div className="pb-3" />
                  <ButtonLink
                    href={pizzeria.google_maps_uri || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${pizzeria.name} ${pizzeria.location}`)}`}
                    target="_blank"
                    rel="noreferrer"
                    variant="secondary"
                    className="mt-auto px-4 py-2 text-sm"
                    icon={<FiMapPin className="h-4 w-4" />}
                  >
                    Google Maps
                  </ButtonLink>
                </article>
              ))}
            </div>
            <ScrollPagination key={`${filter}:${listSearch}`} hasMore={hasMorePizzerias} onLoadMore={loadMorePizzerias} />
          </>
        )}
      </section>
    </div>
  )
}
