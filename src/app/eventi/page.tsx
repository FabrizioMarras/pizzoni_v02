import Nav from '@/components/Nav'
import NextEventCard, { type VisitRow } from '@/components/NextEventCard'
import PlannerBoard from '@/components/PlannerBoard'
import VisitsManager from '@/components/VisitsManager'
import { firstOrThrow } from '@/lib/supabase-relations'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { getVisitTimestamp, isDoneVisit, isUpcomingVisit } from '@/lib/visit-time'

export default async function VisitsPage() {
  const supabase = await createSupabaseServerClient()
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now()

  const { data } = await supabase
    .from('visits')
    .select('id, date, scheduled_at, pizzerias(id, name, city, location, google_photo_name, custom_image_url), photos(url, is_pizza_of_night), visit_attendees(user_id, profiles(name, avatar_url, email))')
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

  return (
    <div className="app-shell">
      <Nav />
      <main className="page-wrap space-y-6">
        <h1 className="page-title mb-1">Eventi</h1>
        <p className="page-subtitle">Prossimo evento in evidenza + storico degli eventi conclusi.</p>
        <NextEventCard showCreateAction={false} visit={nextVisit} />
        <PlannerBoard hideClosedPolls hideCreateSection showTopAddButton />
        <VisitsManager visits={doneVisits} />
      </main>
    </div>
  )
}
