import type { PostgrestError, SupabaseClient } from '@supabase/supabase-js'

export interface EventVote {
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

export interface EventDateOption {
  id: string
  poll_id: string
  option_date: string
}

export interface EventAvailabilityVote {
  id: string
  poll_id: string
  date_option_id: string
  user_id: string
  availability: 'available' | 'not_available'
  voter?: {
    name: string | null
    avatar_url: string | null
    pizza_emoji: string | null
  } | null
}

export interface ExistingPizzeria {
  id: string
  name: string
  location: string
  city: string
  google_place_id: string | null
  google_maps_uri: string | null
  google_photo_name: string | null
  latitude: number | null
  longitude: number | null
}

export interface PlannerSnapshot {
  userId: string
  isAdmin: boolean
  eventVotes: EventVote[]
  dateChoices: EventDateOption[]
  availabilityVotes: EventAvailabilityVote[]
  existingPizzerias: ExistingPizzeria[]
}

type SB = SupabaseClient

export async function fetchPlannerData(supabase: SB) {
  const [{ data: eventVotes }, { data: dateChoices }, { data: availabilityVotes }, { data: existingPizzerias }] = await Promise.all([
    supabase.from('agenda_polls').select('*').order('created_at', { ascending: false }).returns<EventVote[]>(),
    supabase.from('agenda_poll_date_options').select('id, poll_id, option_date').order('option_date', { ascending: true }).returns<EventDateOption[]>(),
    supabase.from('agenda_poll_date_votes').select('id, poll_id, date_option_id, user_id, availability, voter:profiles(name, avatar_url, pizza_emoji)').returns<EventAvailabilityVote[]>(),
    supabase.from('pizzerias').select('id, name, location, city, google_place_id, google_maps_uri, google_photo_name, latitude, longitude').order('name', { ascending: true }).returns<ExistingPizzeria[]>(),
  ])

  return {
    eventVotes: eventVotes ?? [],
    dateChoices: dateChoices ?? [],
    availabilityVotes: availabilityVotes ?? [],
    existingPizzerias: existingPizzerias ?? [],
  }
}

export async function fetchPlannerSnapshot(supabase: SB): Promise<PlannerSnapshot | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const [{ data: profileData }, plannerData] = await Promise.all([
    supabase.from('profiles').select('id, is_admin').eq('id', user.id).maybeSingle<{ id: string; is_admin: boolean }>(),
    fetchPlannerData(supabase),
  ])

  return {
    userId: user.id,
    isAdmin: Boolean(profileData?.is_admin),
    eventVotes: plannerData.eventVotes,
    dateChoices: plannerData.dateChoices,
    availabilityVotes: plannerData.availabilityVotes,
    existingPizzerias: plannerData.existingPizzerias,
  }
}

export async function createPizzeria(
  supabase: SB,
  payload: {
    name: string
    location: string
    city: string
    google_place_id: string | null
    google_maps_uri: string | null
    google_photo_name: string | null
    latitude: number | null
    longitude: number | null
    created_by: string
  }
) {
  return supabase
    .from('pizzerias')
    .insert(payload)
    .select('id, name, location, city, google_place_id, google_maps_uri, google_photo_name, latitude, longitude')
    .single<ExistingPizzeria>()
}

export async function createEventVoteWithDates(
  supabase: SB,
  payload: {
    owner_id: string
    pizzeria_name: string
    location: string
    city: string
    notes: string | null
    dateOptions: string[]
  }
) : Promise<{ eventVoteError: PostgrestError | null; dateOptionsError: PostgrestError | null }> {
  const { data: eventVote, error: eventVoteError } = await supabase
    .from('agenda_polls')
    .insert({
      owner_id: payload.owner_id,
      pizzeria_name: payload.pizzeria_name,
      location: payload.location,
      city: payload.city,
      notes: payload.notes,
    })
    .select('id')
    .single<{ id: string }>()

  if (eventVoteError || !eventVote) return { eventVoteError, dateOptionsError: null }

  const { error: dateOptionsError } = await supabase.from('agenda_poll_date_options').insert(
    payload.dateOptions.map((optionDate) => ({
      poll_id: eventVote.id,
      option_date: optionDate,
      created_by: payload.owner_id,
    }))
  )

  return { eventVoteError: null, dateOptionsError }
}

export async function upsertAvailabilityVote(
  supabase: SB,
  payload: {
    poll_id: string
    date_option_id: string
    user_id: string
    availability: 'available' | 'not_available'
  }
) {
  return supabase.from('agenda_poll_date_votes').upsert(payload, { onConflict: 'date_option_id,user_id' })
}

export async function finalizeEventVote(supabase: SB, pollId: string, optionId: string) {
  return supabase.rpc('finalize_agenda_poll', {
    p_poll_id: pollId,
    p_option_id: optionId,
  })
}
