'use client'
/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Modal from '@/components/ui/Modal'
import { getCurrentPosition, searchPlaces, type PlaceSuggestion } from '@/lib/places'

interface Pizzeria {
  id: string
  name: string
  location: string
  city: string
  visited: boolean
  visitsCount: number
}

interface PizzeriaRow {
  id: string
  name: string
  location: string
  city: string
  visits: { id: string }[] | null
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
  const [searchError, setSearchError] = useState('')
  const [geo, setGeo] = useState<{ latitude: number; longitude: number } | null>(null)
  const [geoLoading, setGeoLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)

  const loadPizzerias = async () => {
    const { data } = await supabase
      .from('pizzerias')
      .select('id, name, location, city, visits(id)')
      .order('created_at', { ascending: false })

    const normalized = ((data as PizzeriaRow[] | null) ?? []).map((row) => {
      const count = row.visits?.length ?? 0
      return {
        id: row.id,
        name: row.name,
        location: row.location,
        city: row.city,
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
      setSearchError('')
      setSearchLoading(false)
      return
    }

    const timeout = window.setTimeout(() => {
      setSearchLoading(true)
      setSearchError('')

      void searchPlaces({
        query,
        latitude: geo?.latitude,
        longitude: geo?.longitude,
      })
        .then((results) => setSearchResults(results))
        .catch((error: unknown) => {
          const nextError = error instanceof Error ? error.message : 'Ricerca Google non disponibile.'
          setSearchError(nextError)
          setSearchResults([])
        })
        .finally(() => setSearchLoading(false))
    }, 300)

    return () => window.clearTimeout(timeout)
  }, [addModalOpen, name, city, geo])

  const createPizzeria = async (event: React.FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setMessage('')

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setMessage('Non hai effettuato l’accesso.')
      setSaving(false)
      return
    }

    const { error } = await supabase.from('pizzerias').insert({
      name: name.trim(),
      location: location.trim(),
      city: city.trim(),
      created_by: user.id,
    })

    setSaving(false)

    if (error) {
      setMessage(error.message)
      return
    }

    setName('')
    setLocation('')
    setCity('')
    setAddModalOpen(false)
    setMessage('Pizzeria aggiunta.')
    void loadPizzerias()
  }

  const enableGeolocation = async () => {
    setGeoLoading(true)
    setSearchError('')
    try {
      const current = await getCurrentPosition()
      setGeo(current)
      setMessage('Geolocalizzazione attiva: risultati ordinati vicino a te.')
    } catch (error) {
      const nextError = error instanceof Error ? error.message : 'Geolocalizzazione non disponibile.'
      setSearchError(nextError)
    } finally {
      setGeoLoading(false)
    }
  }

  const pickPlace = (place: PlaceSuggestion) => {
    setName(place.name)
    setLocation(place.address)
    setCity(place.city)
    setSearchResults([])
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
          <button type="button" onClick={() => setAddModalOpen(true)} className="btn-primary px-4 py-2 text-sm">
            + Aggiungi
          </button>
        </div>
        {message && <p className="mt-3 text-sm text-[var(--ink-soft)]">{message}</p>}
      </section>

      <Modal open={addModalOpen} onClose={() => setAddModalOpen(false)} title="Aggiungi Pizzeria">
        <form onSubmit={createPizzeria} className="space-y-4">
          <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Nome" className="field-input" required />
          <div className="space-y-2 rounded-xl bg-[rgba(255,255,255,0.66)] p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-[var(--ink-soft)]">Suggerimenti Google Maps</p>
              <button type="button" onClick={() => void enableGeolocation()} disabled={geoLoading} className="btn-secondary px-3 py-1 text-xs">
                {geoLoading ? 'Attivo...' : geo ? 'Geolocalizzazione attiva' : 'Usa la mia posizione'}
              </button>
            </div>
            {searchLoading && <p className="text-xs text-[var(--ink-soft)]">Ricerca in corso...</p>}
            {searchError && <p className="text-xs text-[var(--terracotta-deep)]">{searchError}</p>}
            {!searchLoading && !searchError && searchResults.length > 0 && (
              <div className="max-h-48 space-y-2 overflow-auto pr-1">
                {searchResults.map((place) => (
                  <button
                    key={place.id}
                    type="button"
                    onClick={() => pickPlace(place)}
                    className="block w-full rounded-xl bg-white px-3 py-2 text-left text-xs text-[var(--ink)]"
                  >
                    <div className="font-semibold">{place.name}</div>
                    <div className="text-[var(--ink-soft)]">{place.city} · {place.address}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
          <input value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Indirizzo" className="field-input" required />
          <input value={city} onChange={(event) => setCity(event.target.value)} placeholder="Città" className="field-input" required />
          <button type="submit" disabled={saving} className="btn-primary px-4 py-2 text-sm">
            {saving ? 'Salvataggio...' : 'Crea'}
          </button>
        </form>
      </Modal>

      <section className="glass-card space-y-3 p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-3xl">Tutte le Pizzerie</h2>
          <div className="flex flex-wrap gap-2 text-xs">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 ${filter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
            >
              Tutte ({pizzerias.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('visited')}
              className={`px-3 py-1.5 ${filter === 'visited' ? 'btn-primary' : 'btn-secondary'}`}
            >
              Visitate ({visitedCount})
            </button>
            <button
              type="button"
              onClick={() => setFilter('not_visited')}
              className={`px-3 py-1.5 ${filter === 'not_visited' ? 'btn-primary' : 'btn-secondary'}`}
            >
              Da visitare ({notVisitedCount})
            </button>
          </div>
        </div>

        {filteredPizzerias.length === 0 && <p className="page-subtitle">Nessuna pizzeria per questo filtro.</p>}
        {filteredPizzerias.map((pizzeria) => (
          <article key={pizzeria.id} className="surface-card px-3 py-3">
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
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${pizzeria.name} ${pizzeria.location}`)}`}
              target="_blank"
              rel="noreferrer"
              className="btn-secondary mt-2 inline-block px-3 py-1.5 text-xs"
            >
              Apri su Google Maps
            </a>
          </article>
        ))}
      </section>
    </div>
  )
}
