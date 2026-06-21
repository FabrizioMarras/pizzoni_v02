import Image from 'next/image'
import { FiCalendar, FiExternalLink } from 'react-icons/fi'
import NextEventAttendees from '@/components/NextEventAttendees'
import ButtonLink from '@/components/ui/ButtonLink'
import { VISIT_NEXT_EVENT_SELECT } from '@/lib/data/visit-queries'
import { formatDateLabel, formatDateTimeLabel } from '@/lib/date-format'
import { getEventImageSrc } from '@/lib/pizzeria-image'
import { firstOrThrow } from '@/lib/supabase-relations'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { getVisitTimestamp } from '@/lib/visit-time'

export interface VisitRow {
  id: string
  date: string
  scheduled_at: string | null
  pizzerias:
    | {
        name: string
        id?: string
        city: string
        location: string
        google_photo_name: string | null
        custom_image_url: string | null
      }
    | {
        name: string
        id?: string
        city: string
        location: string
        google_photo_name: string | null
        custom_image_url: string | null
      }[]
  photos:
    | {
        url: string
        is_pizza_of_night: boolean
      }[]
    | null
  visit_attendees:
    | {
        user_id: string
        profiles:
            | {
              name: string | null
              avatar_url: string | null
              email: string | null
            }
          | {
              name: string | null
              avatar_url: string | null
              email: string | null
            }[]
          | null
      }[]
    | null
}

interface NextEventCardProps {
  showCreateAction?: boolean
  visit?: VisitRow | null
}

export default async function NextEventCard({ showCreateAction = true, visit }: NextEventCardProps) {
  let nextVisit = visit ?? null
  if (!nextVisit) {
    const supabase = await createSupabaseServerClient()
    const now = new Date().getTime()
    const { data } = await supabase
      .from('visits')
      .select(VISIT_NEXT_EVENT_SELECT)
      .order('date', { ascending: true })
      .limit(100)
      .returns<VisitRow[]>()

    nextVisit = (data ?? [])
      .filter((entry) => getVisitTimestamp(entry) > now)
      .sort((a, b) => getVisitTimestamp(a) - getVisitTimestamp(b))[0] ?? null
  }

  if (!nextVisit) {
    return (
      <section className="glass-card p-5">
        <h2 className="mb-1 text-2xl" style={{ fontFamily: 'var(--font-display)' }}>
          Prossimo Evento Pizzoni
        </h2>
        <p className="page-subtitle">Nessun evento confermato al momento.</p>
        {showCreateAction && (
          <ButtonLink href="/eventi" variant="secondary" className="mt-3 px-3 py-1.5 text-sm" icon={<FiCalendar className="h-4 w-4" />}>
            Crea nuovo evento
          </ButtonLink>
        )}
      </section>
    )
  }

  const pizzeria = firstOrThrow(nextVisit.pizzerias)
  const photoOfNight = (nextVisit.photos ?? []).find((photo) => photo.is_pizza_of_night)?.url ?? null
  const attendees = (nextVisit.visit_attendees ?? []).map((attendee) => {
    const profile = attendee.profiles ? firstOrThrow(attendee.profiles) : null
    return {
      id: attendee.user_id,
      name: profile?.name ?? null,
      email: profile?.email ?? null,
      avatarUrl: profile?.avatar_url ?? null,
    }
  })

  return (
    <section className="glass-card p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-stretch md:min-h-60">
        <div className="relative overflow-hidden rounded-2xl border border-[var(--paper-border)] md:w-[42%] md:shrink-0 md:self-stretch">
          <Image
            src={getEventImageSrc({
              photoOfNightUrl: photoOfNight,
              id: nextVisit.id,
              name: pizzeria.name,
              city: pizzeria.city,
              customImageUrl: pizzeria.custom_image_url,
              googlePhotoName: pizzeria.google_photo_name,
              width: 1200,
            })}
            alt={pizzeria.name}
            width={1200}
            height={700}
            unoptimized
            className="h-52 w-full object-cover sm:h-64 md:absolute md:inset-0 md:h-full md:w-full"
          />
        </div>

        <div className="flex flex-1 flex-col">
          <h2 className="mb-1 text-2xl" style={{ fontFamily: 'var(--font-display)' }}>
            Prossimo Evento Pizzoni
          </h2>
          <p className="text-sm text-[var(--ink)]">
            <span className="font-semibold">{pizzeria.name}</span> ·{' '}
            {nextVisit.scheduled_at ? formatDateTimeLabel(nextVisit.scheduled_at) : formatDateLabel(`${nextVisit.date}T12:00:00`)}
          </p>
          {!nextVisit.scheduled_at && <p className="text-xs text-[var(--ink-soft)]">Orario da confermare</p>}
          <p className="text-sm text-[var(--ink-soft)]">{pizzeria.city} · {pizzeria.location}</p>

          <NextEventAttendees attendees={attendees} />

          <ButtonLink
            href={`/eventi/${nextVisit.id}`}
            variant="primary"
            className="mt-4 w-full px-3 py-1.5 text-center text-sm md:mt-auto md:ml-auto md:w-auto"
            icon={<FiExternalLink className="h-4 w-4" />}
          >
            Apri dettaglio evento
          </ButtonLink>
        </div>
      </div>
    </section>
  )
}
