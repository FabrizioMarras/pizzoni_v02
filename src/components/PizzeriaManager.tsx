'use client'
/* eslint-disable react-hooks/set-state-in-effect */

import Image from 'next/image'
import { useEffect, useState } from 'react'
import { FiCheck, FiExternalLink, FiFilter, FiList, FiMapPin, FiNavigation, FiPlus } from 'react-icons/fi'
import { supabase } from '@/lib/supabase'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import { getCurrentPosition, searchPlaces, type PlaceSuggestion } from '@/lib/places'
import { useToast } from '@/components/ui/ToastProvider'

interface Pizzeria {
  id: string
  name: string
  location: string
  city: string
  google_maps_uri: string | null
  google_photo_name: string | null
  visited: boolean
  visitsCount: number
}

interface PizzeriaRow {
  id: string
  name: string
  location: string
  city: string
  google_maps_uri: string | null
  google_photo_name: string | null
  visits: { id: string; date: string; scheduled_at: string | null }[] | null
}

export default function PizzeriaManager() {
  const [name, setName] = useState('')
  const [location, setLocation] = useState('')
  const [city, setCity] = useState('')
  const [pizzerias, setPizzerias] = useState<Pizzeria[]>([])
  const [filter, setFilter] = useState<'all' | 'visited' | 'not_visited'>('all')
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
  const [saving, setSaving] = useState(false)
  const toast = useToast()

  const loadPizzerias = async () => {
    const now = Date.now()

    const { data } = await supabase
      .from('pizzerias')
      .select('id, name, location, city, google_maps_uri, google_photo_name, visits(id, date, scheduled_at)')
      .order('created_at', { ascending: false })

    const normalized = ((data as PizzeriaRow[] | null) ?? []).map((row) => {
      const pastVisits = (row.visits ?? []).filter((visit) => {
        const visitTimestamp = visit.scheduled_at ? new Date(visit.scheduled_at).getTime() : new Date(`${visit.date}T23:59:59`).getTime()
        return visitTimestamp <= now
      })
      const count = pastVisits.length
      return {
        id: row.id,
        name: row.name,
        location: row.location,
        city: row.city,
        google_maps_uri: row.google_maps_uri,
        google_photo_name: row.google_photo_name,
        visited: count > 0,
        visitsCount: count,
      }
    })

    setPizzerias(normalized)
  }

  useEffect(() => {
    void loadPizzerias()
  }, [])

  useEffect(() => {
    if (!addModalOpen) return

    const query = [name.trim(), city.trim()].filter(Boolean).join(' ')
    if (query.length < 2) {
      setSearchResults([])
      setSearchLoading(false)
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

  const createPizzeria = async (event: React.FormEvent) => {
    event.preventDefault()
    setSaving(true)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      toast.error('Non hai effettuato l’accesso.')
      setSaving(false)
      return
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
  }

  const filteredPizzerias = pizzerias.filter((pizzeria) => {
    if (filter === 'visited') return pizzeria.visited
    if (filter === 'not_visited') return !pizzeria.visited
    return true
  })

  const visitedCount = pizzerias.filter((pizzeria) => pizzeria.visited).length
  const notVisitedCount = pizzerias.length - visitedCount

  return (
    <div className="space-y-6">
      <section className="glass-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-3xl">Gestione Pizzerie</h2>
            <p className="mt-1 page-subtitle">Aggiungi nuovi locali e controlla cosa avete gia visitato.</p>
          </div>
          <Button
            type="button"
            onClick={() => setAddModalOpen(true)}
            variant="primary"
            className="px-4 py-2 text-sm"
            icon={<FiPlus className="h-4 w-4" />}
          >
            + Aggiungi
          </Button>
        </div>
      </section>

      <Modal open={addModalOpen} onClose={() => setAddModalOpen(false)} title="Aggiungi Pizzeria">
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
          <input value={city} onChange={(event) => setCity(event.target.value)} placeholder="Città" className="field-input" required />
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
              onClick={() => setFilter('all')}
              variant={filter === 'all' ? 'primary' : 'secondary'}
              className="px-3 py-1.5"
              icon={<FiList className="h-3.5 w-3.5" />}
            >
              Tutte ({pizzerias.length})
            </Button>
            <Button
              type="button"
              onClick={() => setFilter('visited')}
              variant={filter === 'visited' ? 'primary' : 'secondary'}
              className="px-3 py-1.5"
              icon={<FiCheck className="h-3.5 w-3.5" />}
            >
              Visitate ({visitedCount})
            </Button>
            <Button
              type="button"
              onClick={() => setFilter('not_visited')}
              variant={filter === 'not_visited' ? 'primary' : 'secondary'}
              className="px-3 py-1.5"
              icon={<FiFilter className="h-3.5 w-3.5" />}
            >
              Da visitare ({notVisitedCount})
            </Button>
          </div>
        </div>

        {filteredPizzerias.length === 0 && <p className="page-subtitle">Nessuna pizzeria per questo filtro.</p>}
        {filteredPizzerias.length > 0 && (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {filteredPizzerias.map((pizzeria, index) => (
              <article key={pizzeria.id} className="surface-card flex h-full flex-col px-3 py-3">
                {pizzeria.google_photo_name && (
                  <div className="mb-3 overflow-hidden rounded-2xl border border-[var(--paper-border)]">
                    <Image
                      src={`/api/places/photo?name=${encodeURIComponent(pizzeria.google_photo_name)}&w=800`}
                      alt={pizzeria.name}
                      width={800}
                      height={450}
                      unoptimized
                      loading={index === 0 ? 'eager' : 'lazy'}
                      className="h-36 w-full object-cover"
                    />
                  </div>
                )}
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
                <a
                  href={pizzeria.google_maps_uri || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${pizzeria.name} ${pizzeria.location}`)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-secondary mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-sm"
                >
                  <FiMapPin className="h-4 w-4" />
                  Google Maps
                </a>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
