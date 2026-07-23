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

export interface PollMember {
  id: string
  name: string | null
  avatar_url: string | null
  pizza_emoji: string | null
}

export interface PlannerSnapshot {
  userId: string
  isAdmin: boolean
  eventVotes: EventVote[]
  dateChoices: EventDateOption[]
  availabilityVotes: EventAvailabilityVote[]
  existingPizzerias: ExistingPizzeria[]
  members: PollMember[]
}

type SB = SupabaseClient

export async function fetchPlannerData(supabase: SB) {
  const [{ data: eventVotes }, { data: dateChoices }, { data: availabilityVotes }, { data: existingPizzerias }, { data: members }] = await Promise.all([
    supabase.from('agenda_polls').select('*').order('created_at', { ascending: false }).returns<EventVote[]>(),
    supabase.from('agenda_poll_date_options').select('id, poll_id, option_date').order('option_date', { ascending: true }).returns<EventDateOption[]>(),
    supabase.from('agenda_poll_date_votes').select('id, poll_id, date_option_id, user_id, availability, voter:profiles(name, avatar_url, pizza_emoji)').returns<EventAvailabilityVote[]>(),
    supabase.from('pizzerias').select('id, name, location, city, google_place_id, google_maps_uri, google_photo_name, latitude, longitude').order('name', { ascending: true }).returns<ExistingPizzeria[]>(),
    supabase.from('profiles').select('id, name, avatar_url, pizza_emoji').eq('is_member', true).order('name', { ascending: true }).returns<PollMember[]>(),
  ])

  return {
    eventVotes: eventVotes ?? [],
    dateChoices: dateChoices ?? [],
    availabilityVotes: availabilityVotes ?? [],
    existingPizzerias: existingPizzerias ?? [],
    members: members ?? [],
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
    members: plannerData.members,
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

export async function createEventVote(
  supabase: SB,
  payload: {
    owner_id: string
    pizzeria_name: string
    location: string
    city: string
    notes: string | null
  }
): Promise<{ eventVoteError: PostgrestError | null }> {
  const { error: eventVoteError } = await supabase.from('agenda_polls').insert({
    owner_id: payload.owner_id,
    pizzeria_name: payload.pizzeria_name,
    location: payload.location,
    city: payload.city,
    notes: payload.notes,
  })

  return { eventVoteError }
}

export async function updateEventVotePizzeria(
  supabase: SB,
  pollId: string,
  payload: {
    pizzeria_name: string
    location: string
    city: string
    notes: string | null
  }
): Promise<{ error: PostgrestError | null }> {
  const { error } = await supabase
    .from('agenda_polls')
    .update({
      pizzeria_name: payload.pizzeria_name,
      location: payload.location,
      city: payload.city,
      notes: payload.notes,
    })
    .eq('id', pollId)

  return { error }
}

export async function proposeDateAndVote(
  supabase: SB,
  payload: {
    poll_id: string
    user_id: string
    date: string
    existingOptionId?: string
  }
) {
  let optionId = payload.existingOptionId

  if (!optionId) {
    const { data: option, error: optionError } = await supabase
      .from('agenda_poll_date_options')
      .insert({ poll_id: payload.poll_id, option_date: payload.date, created_by: payload.user_id })
      .select('id')
      .single<{ id: string }>()

    if (optionError || !option) return { error: optionError }
    optionId = option.id
  }

  return supabase.from('agenda_poll_date_votes').upsert(
    {
      poll_id: payload.poll_id,
      date_option_id: optionId,
      user_id: payload.user_id,
      availability: 'available',
    },
    { onConflict: 'date_option_id,user_id' }
  )
}

export async function removeDateVote(supabase: SB, payload: { date_option_id: string; user_id: string }) {
  return supabase
    .from('agenda_poll_date_votes')
    .delete()
    .eq('date_option_id', payload.date_option_id)
    .eq('user_id', payload.user_id)
}

export async function finalizeEventVote(supabase: SB, pollId: string, optionId: string) {
  return supabase.rpc('finalize_agenda_poll', {
    p_poll_id: pollId,
    p_option_id: optionId,
  })
}

export async function cancelAgendaPoll(supabase: SB, pollId: string) {
  return supabase.from('agenda_polls').delete().eq('id', pollId).eq('status', 'open')
}
