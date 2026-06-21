'use client'

import { useEffect, useMemo, useState } from 'react'
import { FiCalendar, FiCheck, FiExternalLink, FiMapPin, FiNavigation, FiPlus, FiTrash2, FiX } from 'react-icons/fi'
import { formatDateLabel } from '@/lib/date-format'
import { supabase } from '@/lib/supabase'
import {
  cancelAgendaPoll,
  createEventVoteWithDates,
  createPizzeria,
  fetchPlannerSnapshot,
  finalizeEventVote as finalizeEventVoteRpc,
  type EventAvailabilityVote,
  type EventDateOption,
  type EventVote,
  type ExistingPizzeria,
  upsertAvailabilityVote,
} from '@/lib/data/event-votes-client'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import ButtonLink from '@/components/ui/ButtonLink'
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

  const [dateDraft, setDateDraft] = useState('')
  const [dateOptions, setDateOptions] = useState<string[]>([])
  const [eventVoteModalOpen, setEventVoteModalOpen] = useState(false)
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

  const loadData = async () => {
    const snapshot = await fetchPlannerSnapshot(supabase)
    if (!snapshot) return
    setEventVotes(snapshot.eventVotes)
    setDateChoices(snapshot.dateChoices)
    setAvailabilityVotes(snapshot.availabilityVotes)
    setExistingPizzerias(snapshot.existingPizzerias)
  }

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

  const addDateOptionDraft = () => {
    if (!dateDraft) {
      toast.warning('Seleziona una data.')
      return
    }

    if (dateOptions.includes(dateDraft)) {
      toast.info('Data gia aggiunta.')
      return
    }
    setDateOptions((current) => [...current, dateDraft].sort())
    setDateDraft('')
  }

  const removeDateOptionDraft = (dateValue: string) => {
    setDateOptions((current) => current.filter((value) => value !== dateValue))
  }

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

  const createEventVote = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!userId) return
    if (openEventVote) {
      toast.warning("Esiste gia una votazione aperta. Chiudila prima di crearne una nuova.")
      return
    }
    if (dateOptions.length < 2) {
      toast.warning('Aggiungi almeno due opzioni data.')
      return
    }

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
        return
      }

      ensuredPizzeria = insertedPizzeria
      setExistingPizzerias((current) => [...current, insertedPizzeria].sort((a, b) => a.name.localeCompare(b.name, 'it')))
    }

    setSubmitting(true)

    const { eventVoteError, dateOptionsError } = await createEventVoteWithDates(supabase, {
      owner_id: userId,
      pizzeria_name: ensuredPizzeria.name,
      location: ensuredPizzeria.location,
      city: ensuredPizzeria.city,
      notes: notes.trim() || null,
      dateOptions,
    })

    if (eventVoteError) {
      setSubmitting(false)
      toast.error(eventVoteError.message ?? 'Errore durante la creazione della votazione.')
      return
    }

    setSubmitting(false)

    if (dateOptionsError) {
      toast.error(dateOptionsError.message)
      return
    }

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
    setDateOptions([])
    setDateDraft('')
    setSearchResults([])
    setEventVoteModalOpen(false)
    toast.success('Nuovo evento creato: votazione avviata con successo.')
    void loadData()
  }

  const voteOnOption = async (option: EventDateOption, availability: 'available' | 'not_available') => {
    if (!userId || !openEventVote) return

    const { error } = await upsertAvailabilityVote(supabase, {
      poll_id: openEventVote.id,
      date_option_id: option.id,
      user_id: userId,
      availability,
    })

    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Voto salvato.')
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

  const countVotes = (optionId: string, availability: 'available' | 'not_available') =>
    availabilityVotes.filter((vote) => vote.date_option_id === optionId && vote.availability === availability).length

  const getVoters = (optionId: string, availability: 'available' | 'not_available') =>
    availabilityVotes.filter((vote) => vote.date_option_id === optionId && vote.availability === availability)

  const myVote = (optionId: string) => availabilityVotes.find((vote) => vote.date_option_id === optionId && vote.user_id === userId)?.availability

  return (
    <div className="space-y-6">
      {showTopAddButton && !openEventVote && (
        <div className="flex justify-end">
          <Button
            type="button"
            onClick={() => setEventVoteModalOpen(true)}
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
              onClick={() => setEventVoteModalOpen(true)}
              variant="primary"
              className="px-4 py-2 text-sm"
              icon={<FiPlus className="h-4 w-4" />}
            >
              Aggiungi
            </Button>
          </div>
        </section>
      )}

      <Modal open={eventVoteModalOpen} onClose={() => setEventVoteModalOpen(false)} title="Nuovo Evento">
        <form onSubmit={createEventVote} className="space-y-3">
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

          <div className="rounded-xl bg-[rgba(255,255,255,0.66)] p-3">
            <p className="mb-2 text-sm font-semibold text-[var(--ink)]">Opzioni data</p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                type="date"
                value={dateDraft}
                onChange={(event) => setDateDraft(event.target.value)}
                className="field-input"
              />
              <Button
                type="button"
                onClick={addDateOptionDraft}
                variant="secondary"
                className="px-4 py-2 text-sm"
                icon={<FiCalendar className="h-4 w-4" />}
              >
                Aggiungi data
              </Button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {dateOptions.length === 0 && <span className="text-xs text-[var(--ink-soft)]">Nessuna data aggiunta.</span>}
              {dateOptions.map((optionDate) => (
                <Button
                  key={optionDate}
                  type="button"
                  onClick={() => removeDateOptionDraft(optionDate)}
                  variant="unstyled"
                  className="rounded-full bg-[rgba(178,74,47,0.14)] px-3 py-1 text-xs text-[var(--terracotta-deep)]"
                  icon={<FiX className="h-3 w-3" />}
                  iconPosition="right"
                >
                  {formatDate(optionDate)}
                </Button>
              ))}
            </div>
          </div>

          <Button
            variant="primary"
            className="px-4 py-2 text-sm"
            type="submit"
            disabled={submitting}
            icon={<FiCheck className="h-4 w-4" />}
          >
            {submitting ? 'Creazione...' : 'Crea Evento'}
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
          <article className="surface-card space-y-3 px-4 py-4">
            <div className="text-lg font-semibold text-[var(--ink)]">{openEventVote.pizzeria_name}</div>
            <div className="text-sm text-[var(--ink-soft)]">{openEventVote.city} · {openEventVote.location}</div>
            {openEventVote.notes && <p className="text-sm text-[var(--ink)]">{openEventVote.notes}</p>}

            <div className="space-y-2">
              {openEventDateChoices.map((option) => {
                const available = countVotes(option.id, 'available')
                const notAvailable = countVotes(option.id, 'not_available')
                const mine = myVote(option.id)
                const availableVoters = getVoters(option.id, 'available')
                const notAvailableVoters = getVoters(option.id, 'not_available')
                return (
                  <div key={option.id} className="rounded-xl bg-[rgba(255,255,255,0.66)] p-3">
                    <div className="mb-2 text-sm font-semibold text-[var(--ink)]">{formatDate(option.option_date)}</div>
                    {availableVoters.length > 0 && (
                      <div className="mb-1.5">
                        <span className="text-xs text-[var(--ink-soft)]">Disponibili ({available})</span>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {availableVoters.map((vote) => (
                            <span key={vote.id} className="inline-flex items-center gap-1 rounded-full bg-[rgba(81,100,58,0.12)] px-2 py-0.5 text-xs text-[var(--olive)]">
                              <span>{vote.voter?.pizza_emoji ?? vote.voter?.name?.[0] ?? '?'}</span>
                              <span>{vote.voter?.name ?? 'Utente'}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {notAvailableVoters.length > 0 && (
                      <div className="mb-2">
                        <span className="text-xs text-[var(--ink-soft)]">Non disponibili ({notAvailable})</span>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {notAvailableVoters.map((vote) => (
                            <span key={vote.id} className="inline-flex items-center gap-1 rounded-full bg-[rgba(178,74,47,0.1)] px-2 py-0.5 text-xs text-[var(--terracotta-deep)]">
                              <span>{vote.voter?.pizza_emoji ?? vote.voter?.name?.[0] ?? '?'}</span>
                              <span>{vote.voter?.name ?? 'Utente'}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {available === 0 && notAvailable === 0 && (
                      <div className="mb-2 text-xs text-[var(--ink-soft)]">Nessun voto ancora.</div>
                    )}
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        onClick={() => void voteOnOption(option, 'available')}
                        variant="unstyled"
                        className={`rounded-full px-3 py-1 text-xs ${mine === 'available' ? 'bg-[var(--olive)] text-white' : 'bg-[rgba(81,100,58,0.15)] text-[var(--olive)]'}`}
                        icon={<FiCheck className="h-3.5 w-3.5" />}
                      >
                        Disponibile
                      </Button>
                      <Button
                        type="button"
                        onClick={() => void voteOnOption(option, 'not_available')}
                        variant="unstyled"
                        className={`rounded-full px-3 py-1 text-xs ${mine === 'not_available' ? 'bg-[var(--terracotta)] text-white' : 'bg-[rgba(178,74,47,0.15)] text-[var(--terracotta-deep)]'}`}
                        icon={<FiX className="h-3.5 w-3.5" />}
                      >
                        Non disponibile
                      </Button>
                      {canFinalizeOpenEventVote && (
                        <Button
                          type="button"
                          onClick={() => void finalizeEventVote(option.id)}
                          variant="primary"
                          className="px-3 py-1 text-xs"
                          icon={<FiCheck className="h-3.5 w-3.5" />}
                        >
                          Conferma data evento
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
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
