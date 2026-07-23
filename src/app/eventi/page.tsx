import Nav from '@/components/Nav'
import NextEventCard, { type VisitRow } from '@/components/NextEventCard'
import PlannerBoard from '@/components/PlannerBoard'
import VisitsManager from '@/components/VisitsManager'
import { fetchPlannerData } from '@/lib/data/event-votes-client'
import { VISIT_EVENTS_PAGE_SELECT } from '@/lib/data/visit-queries'
import type { EventAvailabilityVote, EventDateOption, EventVote, ExistingPizzeria, PollMember } from '@/lib/data/event-votes-client'
import { getProfileMembershipFlags } from '@/lib/profile-flags'
import { firstOrThrow } from '@/lib/supabase-relations'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { getNowTimestamp, getVisitTimestamp, isDoneVisit, isUpcomingVisit } from '@/lib/visit-time'

export default async function VisitsPage() {
  const supabase = await createSupabaseServerClient()
  const now = getNowTimestamp()

  const { data } = await supabase
    .from('visits')
    .select(VISIT_EVENTS_PAGE_SELECT)
    .order('date', { ascending: true })
    .limit(120)
    .returns<VisitRow[]>()

  const nextVisit =
    (data ?? [])
      .filter((visit) => isUpcomingVisit(visit, now))
      .sort((a, b) => getVisitTimestamp(a) - getVisitTimestamp(b))[0] ?? null

  const doneVisits = (data ?? [])
    .filter((visit) => isDoneVisit(visit, now))
    .sort((a, b) => getVisitTimestamp(b) - getVisitTimestamp(a))
    .map((visit) => {
      const pizzeria = firstOrThrow(visit.pizzerias)
      return {
        id: visit.id,
        date: visit.date,
        scheduled_at: visit.scheduled_at,
        photos: visit.photos,
        pizzerias: {
          id: pizzeria.id ?? `unknown-${visit.id}`,
          name: pizzeria.name,
          city: pizzeria.city,
          google_photo_name: pizzeria.google_photo_name,
          custom_image_url: pizzeria.custom_image_url,
        },
      }
    })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const currentUserId = user?.id ?? ''
  let isAdmin = false
  let eventVotes: EventVote[] = []
  let dateChoices: EventDateOption[] = []
  let availabilityVotes: EventAvailabilityVote[] = []
  let existingPizzerias: ExistingPizzeria[] = []
  let members: PollMember[] = []

  if (currentUserId) {
    const [{ isAdmin: profileIsAdmin }, plannerData] = await Promise.all([
      getProfileMembershipFlags(supabase, currentUserId),
      fetchPlannerData(supabase),
    ])

    isAdmin = profileIsAdmin
    eventVotes = plannerData.eventVotes
    dateChoices = plannerData.dateChoices
    availabilityVotes = plannerData.availabilityVotes
    existingPizzerias = plannerData.existingPizzerias
    members = plannerData.members
  }

  return (
    <div className="app-shell">
      <Nav />
      <main className="page-wrap space-y-6">
        <h1 className="page-title mb-1">Eventi</h1>
        <NextEventCard showCreateAction={false} visit={nextVisit} />
        <PlannerBoard
          userId={currentUserId}
          isAdmin={isAdmin}
          initialEventVotes={eventVotes}
          initialDateChoices={dateChoices}
          initialAvailabilityVotes={availabilityVotes}
          initialPizzerias={existingPizzerias}
          initialMembers={members}
          hideClosedPolls
          hideCreateSection
          showTopAddButton
        />
        <VisitsManager visits={doneVisits} />
      </main>
    </div>
  )
}
