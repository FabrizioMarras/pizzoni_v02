'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { FiCheck, FiEdit2, FiExternalLink, FiMapPin, FiNavigation, FiPlus, FiTrash2, FiX } from 'react-icons/fi'
import { formatDateLabel } from '@/lib/date-format'
import { supabase } from '@/lib/supabase'
import {
  cancelAgendaPoll,
  createEventVote as createEventVoteRequest,
  createPizzeria,
  fetchPlannerSnapshot,
  finalizeEventVote as finalizeEventVoteRpc,
  proposeDateAndVote,
  removeDateVote,
  updateEventVotePizzeria,
  type EventAvailabilityVote,
  type EventDateOption,
  type EventVote,
  type ExistingPizzeria,
} from '@/lib/data/event-votes-client'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import ButtonLink from '@/components/ui/ButtonLink'
import AvailabilityCalendar from '@/components/AvailabilityCalendar'
import { getCurrentPosition, searchPlaces, type PlaceSuggestion } from '@/lib/places'
import { useToast } from '@/components/ui/ToastProvider'

interface PlannerBoardProps {
  userId: string
  isAdmin: boolean
  initialEventVotes: EventVote[]
  initialDateChoices: EventDateOption[]
  initialAvailabilityVotes: EventAvailabilityVote[]
  initialPizzerias: ExistingPizzeria[]
  hideClosedPolls?: boolean
  hideCreateSection?: boolean
  showTopAddButton?: boolean
}

function formatDate(dateValue: string) {
  return formatDateLabel(`${dateValue}T12:00:00`)
}

export default function PlannerBoard({
  userId,
  isAdmin,
  initialEventVotes,
  initialDateChoices,
  initialAvailabilityVotes,
  initialPizzerias,
  hideClosedPolls = false,
  hideCreateSection = false,
  showTopAddButton = false,
}: PlannerBoardProps) {
  const [existingPizzerias, setExistingPizzerias] = useState<ExistingPizzeria[]>(initialPizzerias)
  const [eventVotes, setEventVotes] = useState<EventVote[]>(initialEventVotes)
  const [dateChoices, setDateChoices] = useState<EventDateOption[]>(initialDateChoices)
  const [availabilityVotes, setAvailabilityVotes] = useState<EventAvailabilityVote[]>(initialAvailabilityVotes)
  const [selectedPizzeriaId, setSelectedPizzeriaId] = useState('')

  const [pizzeriaName, setPizzeriaName] = useState('')
  const [location, setLocation] = useState('')
  const [city, setCity] = useState('')
  const [notes, setNotes] = useState('')

  const [eventVoteModalOpen, setEventVoteModalOpen] = useState(false)
  const [isEditingPizzeria, setIsEditingPizzeria] = useState(false)
  const [searchResults, setSearchResults] = useState<PlaceSuggestion[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [geo, setGeo] = useState<{ latitude: number; longitude: number } | null>(null)
  const [geoLoading, setGeoLoading] = useState(false)
  const [googlePlaceId, setGooglePlaceId] = useState('')
  const [googleMapsUri, setGoogleMapsUri] = useState('')
  const [googlePhotoName, setGooglePhotoName] = useState('')
  const [latitude, setLatitude] = useState<number | null>(null)
  const [longitude, setLongitude] = useState<number | null>(null)

  const [submitting, setSubmitting] = useState(false)
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const toast = useToast()

  const loadData = useCallback(async () => {
    const snapshot = await fetchPlannerSnapshot(supabase)
    if (!snapshot) return
    setEventVotes(snapshot.eventVotes)
    setDateChoices(snapshot.dateChoices)
    setAvailabilityVotes(snapshot.availabilityVotes)
    setExistingPizzerias(snapshot.existingPizzerias)
  }, [])

  useEffect(() => {
    let refreshTimeout: number | undefined

    const scheduleRefresh = () => {
      if (refreshTimeout) window.clearTimeout(refreshTimeout)
      refreshTimeout = window.setTimeout(() => {
        void loadData()
      }, 300)
    }

    const channel = supabase
      .channel('planner-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'agenda_polls' }, scheduleRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'agenda_poll_date_options' }, scheduleRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'agenda_poll_date_votes' }, scheduleRefresh)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'pizzerias' }, scheduleRefresh)
      .subscribe()

    return () => {
      if (refreshTimeout) window.clearTimeout(refreshTimeout)
      void supabase.removeChannel(channel)
    }
  }, [loadData])

  useEffect(() => {
    if (!eventVoteModalOpen || selectedPizzeriaId) return

    const query = [pizzeriaName.trim(), city.trim()].filter(Boolean).join(' ')
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
  }, [eventVoteModalOpen, selectedPizzeriaId, pizzeriaName, city, geo, toast])

  const openEventVote = useMemo(() => eventVotes.find((poll) => poll.status === 'open') ?? null, [eventVotes])
  const closedEventVotes = useMemo(() => eventVotes.filter((poll) => poll.status === 'closed'), [eventVotes])
  const canFinalizeOpenEventVote = Boolean(openEventVote && (openEventVote.owner_id === userId || isAdmin))
  const openEventDateChoices = useMemo(
    () => (openEventVote ? dateChoices.filter((option) => option.poll_id === openEventVote.id) : []),
    [openEventVote, dateChoices]
  )

  const onSelectExistingPizzeria = (pizzeriaId: string) => {
    setSelectedPizzeriaId(pizzeriaId)
    if (!pizzeriaId) {
      setGooglePlaceId('')
      setGoogleMapsUri('')
      setGooglePhotoName('')
      setLatitude(null)
      setLongitude(null)
      setSearchResults([])
      return
    }

    const selected = existingPizzerias.find((pizzeria) => pizzeria.id === pizzeriaId)
    if (!selected) return

    setPizzeriaName(selected.name)
    setLocation(selected.location)
    setCity(selected.city)
    setGooglePlaceId(selected.google_place_id ?? '')
    setGoogleMapsUri(selected.google_maps_uri ?? '')
    setGooglePhotoName(selected.google_photo_name ?? '')
    setLatitude(selected.latitude)
    setLongitude(selected.longitude)
    setSearchResults([])
  }

  const enableGeolocation = async () => {
    setGeoLoading(true)
    try {
      const current = await getCurrentPosition()
      setGeo(current)
      toast.success('Geolocalizzazione attiva: suggerimenti ordinati vicino a te.')
    } catch (error) {
      const nextError = error instanceof Error ? error.message : 'Geolocalizzazione non disponibile.'
      toast.warning(nextError)
    } finally {
      setGeoLoading(false)
    }
  }

  const pickPlace = (place: PlaceSuggestion) => {
    setPizzeriaName(place.name)
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
    setPizzeriaName(value)
    setGooglePlaceId('')
    setGoogleMapsUri('')
    setGooglePhotoName('')
    setLatitude(null)
    setLongitude(null)
    setSearchResults([])
    setSearchLoading(false)
  }

  const onCityChange = (value: string) => {
    setCity(value)
    setSearchResults([])
    setSearchLoading(false)
  }

  const resetPizzeriaForm = () => {
    setPizzeriaName('')
    setLocation('')
    setCity('')
    setGooglePlaceId('')
    setGoogleMapsUri('')
    setGooglePhotoName('')
    setLatitude(null)
    setLongitude(null)
    setNotes('')
    setSelectedPizzeriaId('')
    setSearchResults([])
  }

  const openCreateModal = () => {
    resetPizzeriaForm()
    setIsEditingPizzeria(false)
    setEventVoteModalOpen(true)
  }

  const openEditPizzeriaModal = () => {
    if (!openEventVote) return
    const matched = existingPizzerias.find(
      (pizzeria) =>
        pizzeria.name.toLowerCase() === openEventVote.pizzeria_name.toLowerCase() && pizzeria.city.toLowerCase() === openEventVote.city.toLowerCase()
    )

    setSelectedPizzeriaId(matched?.id ?? '')
    setPizzeriaName(openEventVote.pizzeria_name)
    setLocation(openEventVote.location)
    setCity(openEventVote.city)
    setNotes(openEventVote.notes ?? '')
    setGooglePlaceId(matched?.google_place_id ?? '')
    setGoogleMapsUri(matched?.google_maps_uri ?? '')
    setGooglePhotoName(matched?.google_photo_name ?? '')
    setLatitude(matched?.latitude ?? null)
    setLongitude(matched?.longitude ?? null)
    setSearchResults([])
    setIsEditingPizzeria(true)
    setEventVoteModalOpen(true)
  }

  const closePizzeriaModal = () => {
    setEventVoteModalOpen(false)
    setIsEditingPizzeria(false)
  }

  const resolveEnsuredPizzeria = async (): Promise<ExistingPizzeria | null> => {
    const normalizedName = pizzeriaName.trim()
    const normalizedLocation = location.trim()
    const normalizedCity = city.trim()

    let ensuredPizzeria: ExistingPizzeria | null = null
    if (selectedPizzeriaId) {
      ensuredPizzeria = existingPizzerias.find((pizzeria) => pizzeria.id === selectedPizzeriaId) ?? null
    }

    if (!ensuredPizzeria) {
      ensuredPizzeria = existingPizzerias.find(
        (pizzeria) => pizzeria.name.toLowerCase() === normalizedName.toLowerCase() && pizzeria.city.toLowerCase() === normalizedCity.toLowerCase()
      ) ?? null
    }

    if (!ensuredPizzeria) {
      const { data: insertedPizzeria, error: pizzeriaError } = await createPizzeria(supabase, {
        name: normalizedName,
        location: normalizedLocation,
        city: normalizedCity,
        google_place_id: googlePlaceId || null,
        google_maps_uri: googleMapsUri || null,
        google_photo_name: googlePhotoName || null,
        latitude,
        longitude,
        created_by: userId,
      })

      if (pizzeriaError || !insertedPizzeria) {
        toast.error(pizzeriaError?.message ?? 'Errore durante la creazione della pizzeria.')
        return null
      }

      ensuredPizzeria = insertedPizzeria
      setExistingPizzerias((current) => [...current, insertedPizzeria].sort((a, b) => a.name.localeCompare(b.name, 'it')))
    }

    return ensuredPizzeria
  }

  const submitPizzeriaForm = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!userId) return

    if (isEditingPizzeria) {
      if (!openEventVote) return

      const ensuredPizzeria = await resolveEnsuredPizzeria()
      if (!ensuredPizzeria) return

      setSubmitting(true)
      const { error } = await updateEventVotePizzeria(supabase, openEventVote.id, {
        pizzeria_name: ensuredPizzeria.name,
        location: ensuredPizzeria.location,
        city: ensuredPizzeria.city,
        notes: notes.trim() || null,
      })
      setSubmitting(false)

      if (error) {
        toast.error(error.message ?? "Errore durante l'aggiornamento della pizzeria.")
        return
      }

      resetPizzeriaForm()
      setEventVoteModalOpen(false)
      setIsEditingPizzeria(false)
      toast.success('Pizzeria aggiornata.')
      void loadData()
      return
    }

    if (openEventVote) {
      toast.warning("Esiste gia una votazione aperta. Chiudila prima di crearne una nuova.")
      return
    }

    const ensuredPizzeria = await resolveEnsuredPizzeria()
    if (!ensuredPizzeria) return

    setSubmitting(true)

    const { eventVoteError } = await createEventVoteRequest(supabase, {
      owner_id: userId,
      pizzeria_name: ensuredPizzeria.name,
      location: ensuredPizzeria.location,
      city: ensuredPizzeria.city,
      notes: notes.trim() || null,
    })

    setSubmitting(false)

    if (eventVoteError) {
      toast.error(eventVoteError.message ?? 'Errore durante la creazione della votazione.')
      return
    }

    resetPizzeriaForm()
    setEventVoteModalOpen(false)
    toast.success('Nuovo evento creato: votazione avviata con successo.')
    void loadData()
  }

  const toggleCalendarDate = async (date: string, existingOptionId: string | undefined, hasMyVote: boolean) => {
    if (!userId || !openEventVote) return

    const { error } = hasMyVote && existingOptionId
      ? await removeDateVote(supabase, { date_option_id: existingOptionId, user_id: userId })
      : await proposeDateAndVote(supabase, {
          poll_id: openEventVote.id,
          user_id: userId,
          date,
          existingOptionId,
        })

    if (error) {
      toast.error(error.message)
    }
    void loadData()
  }

  const cancelPoll = async () => {
    if (!openEventVote || !isAdmin) return
    setCancelling(true)
    const { error } = await cancelAgendaPoll(supabase, openEventVote.id)
    setCancelling(false)
    if (error) {
      toast.error(error.message)
      return
    }
    setCancelConfirmOpen(false)
    toast.success('Votazione cancellata.')
    void loadData()
  }

  const finalizeEventVote = async (optionId: string) => {
    if (!openEventVote || !canFinalizeOpenEventVote) return

    const { data, error } = await finalizeEventVoteRpc(supabase, openEventVote.id, optionId)

    if (error) {
      toast.error(error.message)
      return
    }

    toast.success(`Data evento confermata. Evento creato: ${data}`)
    void loadData()
  }

  return (
    <div className="space-y-6">
      {showTopAddButton && !openEventVote && (
        <div className="flex justify-end">
          <Button
            type="button"
            onClick={openCreateModal}
            variant="primary"
            className="px-4 py-2 text-sm"
            icon={<FiPlus className="h-4 w-4" />}
          >
            Aggiungi
          </Button>
        </div>
      )}

      {!openEventVote && !hideCreateSection && (
        <section className="glass-card space-y-4 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-3xl">Nuovo Evento</h2>
              <p className="page-subtitle">Crea una nuova votazione per scegliere la prossima uscita.</p>
            </div>
            <Button
              type="button"
              onClick={openCreateModal}
              variant="primary"
              className="px-4 py-2 text-sm"
              icon={<FiPlus className="h-4 w-4" />}
            >
              Aggiungi
            </Button>
          </div>
        </section>
      )}

      <Modal open={eventVoteModalOpen} onClose={closePizzeriaModal} title={isEditingPizzeria ? 'Modifica Pizzeria' : 'Nuovo Evento'}>
        <form onSubmit={submitPizzeriaForm} className="space-y-3">
          <div className="rounded-xl bg-[rgba(255,255,255,0.66)] p-3">
            <label className="mb-1 block text-sm font-semibold text-[var(--ink)]">Pizzeria esistente (opzionale)</label>
            <select value={selectedPizzeriaId} onChange={(event) => onSelectExistingPizzeria(event.target.value)} className="field-input">
              <option value="">Nuova pizzeria</option>
              {existingPizzerias.map((pizzeria) => (
                <option key={pizzeria.id} value={pizzeria.id}>
                  {pizzeria.name} · {pizzeria.city}
                </option>
              ))}
            </select>
          </div>

          <input value={pizzeriaName} onChange={(event) => onNameChange(event.target.value)} placeholder="Nome pizzeria" className="field-input" required />
          {!selectedPizzeriaId && (
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
          )}
          <input value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Indirizzo" className="field-input" required />
          <input value={city} onChange={(event) => onCityChange(event.target.value)} placeholder="Città" className="field-input" required />
          <textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Note (opzionale)" className="field-input min-h-[80px]" />

          {!isEditingPizzeria && (
            <p className="text-xs text-[var(--ink-soft)]">Dopo la creazione, ognuno potrà segnare le proprie date disponibili sul calendario.</p>
          )}

          <Button
            variant="primary"
            className="px-4 py-2 text-sm"
            type="submit"
            disabled={submitting}
            icon={<FiCheck className="h-4 w-4" />}
          >
            {isEditingPizzeria ? (submitting ? 'Salvataggio...' : 'Salva modifiche') : submitting ? 'Creazione...' : 'Crea Evento'}
          </Button>
        </form>
      </Modal>

      <Modal open={cancelConfirmOpen} onClose={() => setCancelConfirmOpen(false)} title="Cancella votazione">
        <p className="text-sm text-foreground">
          Sei sicuro di voler cancellare la votazione per <strong>{openEventVote?.pizzeria_name}</strong>? Tutti i voti e le opzioni data verranno eliminati. Questa azione è irreversibile.
        </p>
        <div className="mt-4 flex gap-2">
          <Button
            type="button"
            onClick={() => void cancelPoll()}
            disabled={cancelling}
            variant="unstyled"
            className="rounded-full bg-[rgba(178,74,47,0.85)] px-4 py-2 text-sm text-white"
            icon={<FiTrash2 className="h-4 w-4" />}
          >
            {cancelling ? 'Cancellazione...' : 'Sì, cancella'}
          </Button>
          <Button
            type="button"
            onClick={() => setCancelConfirmOpen(false)}
            variant="secondary"
            className="px-4 py-2 text-sm"
            icon={<FiX className="h-4 w-4" />}
          >
            Annulla
          </Button>
        </div>
      </Modal>

      {openEventVote && (
        <section className="glass-card space-y-3 p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-3xl">Votazione Aperta</h2>
            <div className="flex gap-2">
              {canFinalizeOpenEventVote && (
                <Button
                  type="button"
                  onClick={openEditPizzeriaModal}
                  variant="unstyled"
                  className="rounded-full bg-[rgba(81,100,58,0.1)] px-3 py-1 text-xs text-[var(--olive)]"
                  icon={<FiEdit2 className="h-3.5 w-3.5" />}
                >
                  Modifica pizzeria
                </Button>
              )}
              {isAdmin && (
                <Button
                  type="button"
                  onClick={() => setCancelConfirmOpen(true)}
                  variant="unstyled"
                  className="rounded-full bg-[rgba(178,74,47,0.1)] px-3 py-1 text-xs text-(--terracotta-deep)"
                  icon={<FiTrash2 className="h-3.5 w-3.5" />}
                >
                  Cancella votazione
                </Button>
              )}
            </div>
          </div>
          <article className="surface-card space-y-3 px-4 py-4">
            <div className="text-lg font-semibold text-[var(--ink)]">{openEventVote.pizzeria_name}</div>
            <div className="text-sm text-[var(--ink-soft)]">{openEventVote.city} · {openEventVote.location}</div>
            {openEventVote.notes && <p className="text-sm text-[var(--ink)]">{openEventVote.notes}</p>}

            <AvailabilityCalendar
              dateChoices={openEventDateChoices}
              availabilityVotes={availabilityVotes}
              userId={userId}
              canFinalize={canFinalizeOpenEventVote}
              onToggleDate={(date, existingOptionId, hasMyVote) => void toggleCalendarDate(date, existingOptionId, hasMyVote)}
              onFinalize={(optionId) => void finalizeEventVote(optionId)}
            />
          </article>
        </section>
      )}

      {!hideClosedPolls && (
        <section className="glass-card space-y-3 p-6">
          <h2 className="text-3xl">Votazioni Chiuse</h2>
          {closedEventVotes.length === 0 && <p className="page-subtitle">Nessuna votazione chiusa.</p>}
          {closedEventVotes.slice(0, 8).map((poll) => (
            <article key={poll.id} className="surface-card px-4 py-3">
              <div className="font-semibold text-[var(--ink)]">{poll.pizzeria_name}</div>
              <div className="text-sm text-[var(--ink-soft)]">
                {poll.final_date ? `Data scelta: ${formatDate(poll.final_date)}` : 'Data non presente'}
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {poll.visit_id && (
                  <ButtonLink
                    href={`/eventi/${poll.visit_id}`}
                    variant="secondary"
                    className="px-3 py-1 text-xs"
                    icon={<FiExternalLink className="h-3.5 w-3.5" />}
                  >
                    Apri evento creato
                  </ButtonLink>
                )}
              </div>
            </article>
          ))}
        </section>
      )}
    </div>
  )
}
