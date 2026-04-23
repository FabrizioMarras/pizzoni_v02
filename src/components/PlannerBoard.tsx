'use client'
/* eslint-disable react-hooks/set-state-in-effect */

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Modal from '@/components/ui/Modal'
import { getCurrentPosition, searchPlaces, type PlaceSuggestion } from '@/lib/places'

interface AgendaPoll {
  id: string
  owner_id: string
  status: 'open' | 'closed'
  pizzeria_name: string
  location: string
  city: string
  notes: string | null
  final_date: string | null
  visit_id: string | null
  created_at: string
}

interface AgendaDateOption {
  id: string
  poll_id: string
  option_date: string
}

interface AgendaVote {
  id: string
  poll_id: string
  date_option_id: string
  user_id: string
  availability: 'available' | 'not_available'
}

interface CurrentProfile {
  id: string
  is_admin: boolean
}

interface ExistingPizzeria {
  id: string
  name: string
  location: string
  city: string
}

interface PlannerBoardProps {
  hideClosedPolls?: boolean
}

function formatDate(dateValue: string) {
  return new Date(`${dateValue}T12:00:00Z`).toLocaleDateString('it-IT', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

export default function PlannerBoard({ hideClosedPolls = false }: PlannerBoardProps) {
  const [userId, setUserId] = useState('')
  const [profile, setProfile] = useState<CurrentProfile | null>(null)
  const [existingPizzerias, setExistingPizzerias] = useState<ExistingPizzeria[]>([])
  const [polls, setPolls] = useState<AgendaPoll[]>([])
  const [options, setOptions] = useState<AgendaDateOption[]>([])
  const [votes, setVotes] = useState<AgendaVote[]>([])
  const [selectedPizzeriaId, setSelectedPizzeriaId] = useState('')

  const [pizzeriaName, setPizzeriaName] = useState('')
  const [location, setLocation] = useState('')
  const [city, setCity] = useState('')
  const [notes, setNotes] = useState('')

  const [dateDraft, setDateDraft] = useState('')
  const [dateOptions, setDateOptions] = useState<string[]>([])
  const [pollModalOpen, setPollModalOpen] = useState(false)
  const [searchResults, setSearchResults] = useState<PlaceSuggestion[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [geo, setGeo] = useState<{ latitude: number; longitude: number } | null>(null)
  const [geoLoading, setGeoLoading] = useState(false)

  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const loadData = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return

    setUserId(user.id)

    const [{ data: profileData }, { data: pollData }, { data: optionsData }, { data: voteData }, { data: pizzeriaData }] = await Promise.all([
      supabase.from('profiles').select('id, is_admin').eq('id', user.id).maybeSingle<CurrentProfile>(),
      supabase.from('agenda_polls').select('*').order('created_at', { ascending: false }),
      supabase.from('agenda_poll_date_options').select('id, poll_id, option_date').order('option_date', { ascending: true }),
      supabase.from('agenda_poll_date_votes').select('id, poll_id, date_option_id, user_id, availability'),
      supabase.from('pizzerias').select('id, name, location, city').order('name', { ascending: true }),
    ])

    setProfile(profileData ?? null)
    setPolls((pollData as AgendaPoll[] | null) ?? [])
    setOptions((optionsData as AgendaDateOption[] | null) ?? [])
    setVotes((voteData as AgendaVote[] | null) ?? [])
    setExistingPizzerias((pizzeriaData as ExistingPizzeria[] | null) ?? [])
  }

  useEffect(() => {
    void loadData()
  }, [])

  useEffect(() => {
    if (!pollModalOpen || selectedPizzeriaId) return

    const query = [pizzeriaName.trim(), city.trim()].filter(Boolean).join(' ')
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
  }, [pollModalOpen, selectedPizzeriaId, pizzeriaName, city, geo])

  const openPoll = useMemo(() => polls.find((poll) => poll.status === 'open') ?? null, [polls])
  const closedPolls = useMemo(() => polls.filter((poll) => poll.status === 'closed'), [polls])
  const canFinalizeOpenPoll = Boolean(openPoll && (openPoll.owner_id === userId || profile?.is_admin))
  const openPollOptions = useMemo(
    () => (openPoll ? options.filter((option) => option.poll_id === openPoll.id) : []),
    [openPoll, options]
  )

  const addDateOptionDraft = () => {
    const normalized = dateDraft.trim()
    if (!normalized) return
    if (dateOptions.includes(normalized)) {
      setMessage('Data gia aggiunta.')
      return
    }
    setDateOptions((current) => [...current, normalized].sort())
    setDateDraft('')
  }

  const removeDateOptionDraft = (dateValue: string) => {
    setDateOptions((current) => current.filter((value) => value !== dateValue))
  }

  const onSelectExistingPizzeria = (pizzeriaId: string) => {
    setSelectedPizzeriaId(pizzeriaId)
    if (!pizzeriaId) {
      setSearchResults([])
      return
    }

    const selected = existingPizzerias.find((pizzeria) => pizzeria.id === pizzeriaId)
    if (!selected) return

    setPizzeriaName(selected.name)
    setLocation(selected.location)
    setCity(selected.city)
    setSearchResults([])
  }

  const enableGeolocation = async () => {
    setGeoLoading(true)
    setSearchError('')
    try {
      const current = await getCurrentPosition()
      setGeo(current)
      setMessage('Geolocalizzazione attiva: suggerimenti ordinati vicino a te.')
    } catch (error) {
      const nextError = error instanceof Error ? error.message : 'Geolocalizzazione non disponibile.'
      setSearchError(nextError)
    } finally {
      setGeoLoading(false)
    }
  }

  const pickPlace = (place: PlaceSuggestion) => {
    setPizzeriaName(place.name)
    setLocation(place.address)
    setCity(place.city)
    setSearchResults([])
  }

  const createPoll = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!userId) return
    if (openPoll) {
      setMessage("Esiste gia una votazione aperta. Chiudila prima di crearne una nuova.")
      return
    }
    if (dateOptions.length < 2) {
      setMessage('Aggiungi almeno due opzioni data.')
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
      const { data: insertedPizzeria, error: pizzeriaError } = await supabase
        .from('pizzerias')
        .insert({
          name: normalizedName,
          location: normalizedLocation,
          city: normalizedCity,
          created_by: userId,
        })
        .select('id, name, location, city')
        .single<ExistingPizzeria>()

      if (pizzeriaError || !insertedPizzeria) {
        setMessage(pizzeriaError?.message ?? 'Errore durante la creazione della pizzeria.')
        return
      }

      ensuredPizzeria = insertedPizzeria
      setExistingPizzerias((current) => [...current, insertedPizzeria].sort((a, b) => a.name.localeCompare(b.name, 'it')))
    }

    setSubmitting(true)
    setMessage('')

    const { data: pollRow, error: pollError } = await supabase
      .from('agenda_polls')
      .insert({
        owner_id: userId,
        pizzeria_name: ensuredPizzeria.name,
        location: ensuredPizzeria.location,
        city: ensuredPizzeria.city,
        notes: notes.trim() || null,
      })
      .select('id')
      .single<{ id: string }>()

    if (pollError || !pollRow) {
      setSubmitting(false)
      setMessage(pollError?.message ?? 'Errore durante la creazione della votazione.')
      return
    }

    const { error: optionError } = await supabase.from('agenda_poll_date_options').insert(
      dateOptions.map((optionDate) => ({
        poll_id: pollRow.id,
        option_date: optionDate,
        created_by: userId,
      }))
    )

    setSubmitting(false)

    if (optionError) {
      setMessage(optionError.message)
      return
    }

    setPizzeriaName('')
    setLocation('')
    setCity('')
    setNotes('')
    setSelectedPizzeriaId('')
    setDateOptions([])
    setDateDraft('')
    setSearchResults([])
    setSearchError('')
    setPollModalOpen(false)
    setMessage('Nuovo evento creato: votazione avviata con successo.')
    void loadData()
  }

  const voteOnOption = async (option: AgendaDateOption, availability: 'available' | 'not_available') => {
    if (!userId || !openPoll) return

    const { error } = await supabase.from('agenda_poll_date_votes').upsert(
      {
        poll_id: openPoll.id,
        date_option_id: option.id,
        user_id: userId,
        availability,
      },
      { onConflict: 'date_option_id,user_id' }
    )

    setMessage(error ? error.message : 'Voto salvato.')
    void loadData()
  }

  const finalizePoll = async (optionId: string) => {
    if (!openPoll || !canFinalizeOpenPoll) return

    const { data, error } = await supabase.rpc('finalize_agenda_poll', {
      p_poll_id: openPoll.id,
      p_option_id: optionId,
    })

    if (error) {
      setMessage(error.message)
      return
    }

    setMessage(`Data evento confermata. Evento creato: ${data}`)
    void loadData()
  }

  const countVotes = (optionId: string, availability: 'available' | 'not_available') =>
    votes.filter((vote) => vote.date_option_id === optionId && vote.availability === availability).length

  const myVote = (optionId: string) => votes.find((vote) => vote.date_option_id === optionId && vote.user_id === userId)?.availability

  return (
    <div className="space-y-6">
      {message && <p className="glass-card px-4 py-2 text-sm text-[var(--ink-soft)]">{message}</p>}

      {!openPoll && (
        <section className="glass-card space-y-4 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-3xl">Nuovo Evento</h2>
              <p className="page-subtitle">Crea una nuova votazione per scegliere la prossima uscita.</p>
            </div>
            <button type="button" onClick={() => setPollModalOpen(true)} className="btn-primary px-4 py-2 text-sm">
              + Aggiungi
            </button>
          </div>
        </section>
      )}

      <Modal open={pollModalOpen} onClose={() => setPollModalOpen(false)} title="Nuovo Evento">
        <form onSubmit={createPoll} className="space-y-3">
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

          <input value={pizzeriaName} onChange={(event) => setPizzeriaName(event.target.value)} placeholder="Nome pizzeria" className="field-input" required />
          {!selectedPizzeriaId && (
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
          )}
          <input value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Indirizzo" className="field-input" required />
          <input value={city} onChange={(event) => setCity(event.target.value)} placeholder="Citta" className="field-input" required />
          <textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Note (opzionale)" className="field-input min-h-[80px]" />

          <div className="rounded-xl bg-[rgba(255,255,255,0.66)] p-3">
            <p className="mb-2 text-sm font-semibold text-[var(--ink)]">Opzioni data</p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input type="date" value={dateDraft} onChange={(event) => setDateDraft(event.target.value)} className="field-input" />
              <button type="button" onClick={addDateOptionDraft} className="btn-secondary px-4 py-2 text-sm">
                Aggiungi data
              </button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {dateOptions.length === 0 && <span className="text-xs text-[var(--ink-soft)]">Nessuna data aggiunta.</span>}
              {dateOptions.map((optionDate) => (
                <button
                  key={optionDate}
                  type="button"
                  onClick={() => removeDateOptionDraft(optionDate)}
                  className="rounded-full bg-[rgba(178,74,47,0.14)] px-3 py-1 text-xs text-[var(--terracotta-deep)]"
                >
                  {formatDate(optionDate)} ×
                </button>
              ))}
            </div>
          </div>

          <button className="btn-primary px-4 py-2 text-sm" type="submit" disabled={submitting}>
            {submitting ? 'Creazione...' : 'Crea Evento'}
          </button>
        </form>
      </Modal>

      {openPoll && (
        <section className="glass-card space-y-3 p-6">
          <h2 className="text-3xl">Votazione Aperta</h2>
          <article className="surface-card space-y-3 px-4 py-4">
            <div className="text-lg font-semibold text-[var(--ink)]">{openPoll.pizzeria_name}</div>
            <div className="text-sm text-[var(--ink-soft)]">{openPoll.city} · {openPoll.location}</div>
            {openPoll.notes && <p className="text-sm text-[var(--ink)]">{openPoll.notes}</p>}

            <div className="space-y-2">
              {openPollOptions.map((option) => {
                const available = countVotes(option.id, 'available')
                const notAvailable = countVotes(option.id, 'not_available')
                const mine = myVote(option.id)
                return (
                  <div key={option.id} className="rounded-xl bg-[rgba(255,255,255,0.66)] p-3">
                    <div className="mb-2 text-sm font-semibold text-[var(--ink)]">{formatDate(option.option_date)}</div>
                    <div className="mb-2 text-xs text-[var(--ink-soft)]">Disponibili: {available} · Non disponibili: {notAvailable}</div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => void voteOnOption(option, 'available')}
                        className={`rounded-full px-3 py-1 text-xs ${mine === 'available' ? 'bg-[var(--olive)] text-white' : 'bg-[rgba(81,100,58,0.15)] text-[var(--olive)]'}`}
                      >
                        Disponibile
                      </button>
                      <button
                        type="button"
                        onClick={() => void voteOnOption(option, 'not_available')}
                        className={`rounded-full px-3 py-1 text-xs ${mine === 'not_available' ? 'bg-[var(--terracotta)] text-white' : 'bg-[rgba(178,74,47,0.15)] text-[var(--terracotta-deep)]'}`}
                      >
                        Non disponibile
                      </button>
                      {canFinalizeOpenPoll && (
                        <button type="button" onClick={() => void finalizePoll(option.id)} className="btn-primary px-3 py-1 text-xs">
                          Conferma data evento
                        </button>
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
          {closedPolls.length === 0 && <p className="page-subtitle">Nessuna votazione chiusa.</p>}
          {closedPolls.slice(0, 8).map((poll) => (
            <article key={poll.id} className="surface-card px-4 py-3">
              <div className="font-semibold text-[var(--ink)]">{poll.pizzeria_name}</div>
              <div className="text-sm text-[var(--ink-soft)]">
                {poll.final_date ? `Data scelta: ${formatDate(poll.final_date)}` : 'Data non presente'}
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {poll.visit_id && (
                  <Link href={`/eventi/${poll.visit_id}`} className="btn-secondary px-3 py-1 text-xs">
                    Apri evento creato
                  </Link>
                )}
              </div>
            </article>
          ))}
        </section>
      )}
    </div>
  )
}
