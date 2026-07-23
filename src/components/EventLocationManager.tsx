'use client'

import { useEffect, useMemo, useState } from 'react'
import { FiCheck, FiEdit2, FiList, FiMapPin, FiNavigation, FiSearch } from 'react-icons/fi'
import { createPizzeria, type ExistingPizzeria } from '@/lib/data/event-votes-client'
import { supabase } from '@/lib/supabase'
import { getCurrentPosition, searchPlaces, type PlaceSuggestion } from '@/lib/places'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import SearchBar from '@/components/ui/SearchBar'
import { useToast } from '@/components/ui/ToastProvider'

interface CurrentPizzeria {
  id: string
  name: string
  location: string
  city: string
}

interface EventLocationManagerProps {
  visitId: string
  currentPizzeria: CurrentPizzeria
  initialPizzerias: ExistingPizzeria[]
  canManage: boolean
}

function normalizeKey(value: string) {
  return value.trim().toLocaleLowerCase('it-IT').replace(/\s+/g, ' ')
}

function findMatchingPizzeria(pizzerias: ExistingPizzeria[], place: PlaceSuggestion) {
  if (place.id) {
    const byPlaceId = pizzerias.find((pizzeria) => pizzeria.google_place_id === place.id)
    if (byPlaceId) return byPlaceId
  }

  const name = normalizeKey(place.name)
  const city = normalizeKey(place.city)
  const address = normalizeKey(place.address)
  if (!name || !city) return null

  // Same name in the same city can be different pizzerias (different branches),
  // so the address must also match to be considered the same place.
  return (
    pizzerias.find(
      (pizzeria) =>
        normalizeKey(pizzeria.name) === name &&
        normalizeKey(pizzeria.city) === city &&
        normalizeKey(pizzeria.location) === address
    ) ?? null
  )
}

export default function EventLocationManager({ visitId, currentPizzeria, initialPizzerias, canManage }: EventLocationManagerProps) {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<'existing' | 'new'>('existing')
  const [pizzerias, setPizzerias] = useState<ExistingPizzeria[]>(initialPizzerias)
  const [listSearch, setListSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [placeQuery, setPlaceQuery] = useState('')
  const [searchResults, setSearchResults] = useState<PlaceSuggestion[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [pickedPlace, setPickedPlace] = useState<PlaceSuggestion | null>(null)
  const [geo, setGeo] = useState<{ latitude: number; longitude: number } | null>(null)
  const [geoLoading, setGeoLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const toast = useToast()

  useEffect(() => {
    if (!open || mode !== 'new') return

    const query = placeQuery.trim()
    if (query.length < 2) {
      return
    }

    const timeout = window.setTimeout(() => {
      setSearchLoading(true)
      void searchPlaces({ query, latitude: geo?.latitude, longitude: geo?.longitude })
        .then((results) => setSearchResults(results))
        .catch((error: unknown) => {
          toast.error(error instanceof Error ? error.message : 'Ricerca Google non disponibile.')
          setSearchResults([])
        })
        .finally(() => setSearchLoading(false))
    }, 300)

    return () => window.clearTimeout(timeout)
  }, [open, mode, placeQuery, geo, toast])

  const filteredPizzerias = useMemo(() => {
    const query = normalizeKey(listSearch)
    return pizzerias.filter((pizzeria) => {
      if (!query) return true
      return normalizeKey(`${pizzeria.name} ${pizzeria.city} ${pizzeria.location}`).includes(query)
    })
  }, [listSearch, pizzerias])

  if (!canManage) return null

  const closeModal = () => {
    setOpen(false)
    setListSearch('')
    setSelectedId(null)
    setPlaceQuery('')
    setSearchResults([])
    setSearchLoading(false)
    setPickedPlace(null)
  }

  const enableGeolocation = async () => {
    setGeoLoading(true)
    try {
      const current = await getCurrentPosition()
      setGeo(current)
      toast.success('Geolocalizzazione attiva: risultati ordinati vicino a te.')
    } catch (error) {
      toast.warning(error instanceof Error ? error.message : 'Geolocalizzazione non disponibile.')
    } finally {
      setGeoLoading(false)
    }
  }

  const resolveTargetPizzeriaId = async (): Promise<string | null> => {
    if (mode === 'existing') {
      if (!selectedId) {
        toast.warning('Seleziona una pizzeria dalla lista.')
        return null
      }
      return selectedId
    }

    if (!pickedPlace) {
      toast.warning('Cerca e seleziona una pizzeria su Google.')
      return null
    }

    const existing = findMatchingPizzeria(pizzerias, pickedPlace)
    if (existing) return existing.id

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      toast.error('Non hai effettuato l’accesso.')
      return null
    }

    const { data: created, error } = await createPizzeria(supabase, {
      name: pickedPlace.name.trim(),
      location: pickedPlace.address.trim(),
      city: pickedPlace.city.trim(),
      google_place_id: pickedPlace.id || null,
      google_maps_uri: pickedPlace.mapsUri || null,
      google_photo_name: pickedPlace.photoName || null,
      latitude: pickedPlace.latitude,
      longitude: pickedPlace.longitude,
      created_by: user.id,
    })

    if (error || !created) {
      toast.error(error?.message ?? 'Impossibile creare la pizzeria.')
      return null
    }

    setPizzerias((current) => [...current, created])
    return created.id
  }

  const saveLocation = async () => {
    setSaving(true)
    const targetId = await resolveTargetPizzeriaId()
    if (!targetId) {
      setSaving(false)
      return
    }

    if (targetId === currentPizzeria.id) {
      setSaving(false)
      toast.info('Questa è già la location dell’evento.')
      return
    }

    const { error } = await supabase.from('visits').update({ pizzeria_id: targetId }).eq('id', visitId)
    setSaving(false)

    if (error) {
      toast.error(error.message)
      return
    }

    toast.success('Location evento aggiornata.')
    window.location.reload()
  }

  return (
    <>
      <Button
        type="button"
        onClick={() => setOpen(true)}
        variant="secondary"
        className="px-4 py-2 text-sm"
        icon={<FiEdit2 className="h-4 w-4" />}
      >
        Modifica luogo
      </Button>

      <Modal open={open} onClose={closeModal} title="Modifica luogo evento">
        <div className="space-y-4">
          <p className="text-sm text-[var(--ink-soft)]">
            Location attuale: <span className="font-semibold text-[var(--ink)]">{currentPizzeria.name}</span> · {currentPizzeria.city}
          </p>

          <div className="flex flex-wrap gap-2 text-xs">
            <Button
              type="button"
              onClick={() => setMode('existing')}
              variant={mode === 'existing' ? 'primary' : 'secondary'}
              className="px-3 py-1.5"
              icon={<FiList className="h-3.5 w-3.5" />}
            >
              Pizzerie esistenti
            </Button>
            <Button
              type="button"
              onClick={() => setMode('new')}
              variant={mode === 'new' ? 'primary' : 'secondary'}
              className="px-3 py-1.5"
              icon={<FiSearch className="h-3.5 w-3.5" />}
            >
              Cerca nuova (Google)
            </Button>
          </div>

          {mode === 'existing' && (
            <div className="space-y-3">
              <SearchBar
                value={listSearch}
                onChange={setListSearch}
                ariaLabel="Cerca pizzeria"
                placeholder="Cerca per nome, città o indirizzo"
                resultCount={filteredPizzerias.length}
                totalCount={pizzerias.length}
              />
              <div className="max-h-72 space-y-2 overflow-auto pr-1">
                {filteredPizzerias.length === 0 && (
                  <p className="page-subtitle">Nessuna pizzeria corrisponde alla ricerca.</p>
                )}
                {filteredPizzerias.map((pizzeria) => {
                  const isSelected = selectedId === pizzeria.id
                  const isCurrent = currentPizzeria.id === pizzeria.id
                  return (
                    <button
                      key={pizzeria.id}
                      type="button"
                      onClick={() => setSelectedId(pizzeria.id)}
                      className={`block w-full rounded-xl border px-3 py-2 text-left text-sm transition ${
                        isSelected
                          ? 'border-[var(--olive)] bg-[rgba(var(--olive-rgb),0.12)]'
                          : 'border-[var(--panel-border)] bg-[var(--surface-solid)]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-[var(--ink)]">{pizzeria.name}</span>
                        {isCurrent && <span className="text-xs text-[var(--ink-soft)]">Attuale</span>}
                        {isSelected && <FiCheck className="h-4 w-4 text-[var(--olive)]" />}
                      </div>
                      <div className="text-[var(--ink-soft)]">{pizzeria.city} · {pizzeria.location}</div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {mode === 'new' && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-[var(--ink-soft)]">Cerca su Google Maps e crea la pizzeria se non esiste.</p>
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
              <input
                value={placeQuery}
                onChange={(event) => {
                  setPlaceQuery(event.target.value)
                  setPickedPlace(null)
                  if (event.target.value.trim().length < 2) setSearchResults([])
                }}
                placeholder="Nome pizzeria e città"
                className="field-input"
              />
              {searchLoading && <p className="text-xs text-[var(--ink-soft)]">Ricerca in corso...</p>}
              {!searchLoading && searchResults.length > 0 && (
                <div className="max-h-60 space-y-2 overflow-auto pr-1">
                  {searchResults.map((place) => {
                    const isPicked = pickedPlace?.id === place.id
                    return (
                      <button
                        key={place.id}
                        type="button"
                        onClick={() => setPickedPlace(place)}
                        className={`block w-full rounded-xl border px-3 py-2 text-left text-xs transition ${
                          isPicked
                            ? 'border-[var(--olive)] bg-[rgba(var(--olive-rgb),0.12)]'
                            : 'border-[var(--panel-border)] bg-[var(--surface-solid)]'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 font-semibold text-[var(--ink)]">
                          <FiMapPin className="h-3.5 w-3.5" />
                          {place.name}
                          {isPicked && <FiCheck className="ml-auto h-4 w-4 text-[var(--olive)]" />}
                        </div>
                        <div className="text-[var(--ink-soft)]">{place.city} · {place.address}</div>
                      </button>
                    )
                  })}
                </div>
              )}
              {pickedPlace && findMatchingPizzeria(pizzerias, pickedPlace) && (
                <p className="text-xs text-[var(--ink-soft)]">Questa pizzeria è già nel sistema: verrà riutilizzata.</p>
              )}
            </div>
          )}

          <div className="flex justify-end">
            <Button
              type="button"
              onClick={() => void saveLocation()}
              disabled={saving}
              variant="primary"
              className="px-4 py-2 text-sm"
              icon={<FiCheck className="h-4 w-4" />}
            >
              {saving ? 'Salvataggio...' : 'Salva luogo'}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}
