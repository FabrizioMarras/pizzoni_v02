import Link from 'next/link'
import { FiCalendar, FiExternalLink } from 'react-icons/fi'
import { formatDateLabel, formatDateTimeLabel } from '@/lib/date-format'
import { getEventImageSrc } from '@/lib/pizzeria-image'
import { createSupabaseServerClient } from '@/lib/supabase-server'

interface VisitRow {
  id: string
  date: string
  scheduled_at: string | null
  pizzerias:
    | {
        name: string
        city: string
        location: string
        google_photo_name: string | null
        custom_image_url: string | null
      }
    | {
        name: string
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
              pizza_emoji: string | null
              email: string | null
            }
          | {
              name: string | null
              pizza_emoji: string | null
              email: string | null
            }[]
          | null
      }[]
    | null
}

function getFirst<T>(value: T | T[]): T {
  return Array.isArray(value) ? value[0] : value
}

function getVisitTimestamp(visit: Pick<VisitRow, 'date' | 'scheduled_at'>) {
  if (visit.scheduled_at) return new Date(visit.scheduled_at).getTime()
  return new Date(`${visit.date}T23:59:59`).getTime()
}

interface NextEventCardProps {
  showCreateAction?: boolean
}

export default async function NextEventCard({ showCreateAction = true }: NextEventCardProps) {
  const supabase = await createSupabaseServerClient()
  const now = new Date().getTime()

  const { data } = await supabase
    .from('visits')
    .select('id, date, scheduled_at, pizzerias(name, city, location, google_photo_name, custom_image_url), photos(url, is_pizza_of_night), visit_attendees(user_id, profiles(name, pizza_emoji, email))')
    .order('date', { ascending: true })
    .limit(100)
    .returns<VisitRow[]>()

  const nextVisit = (data ?? [])
    .filter((visit) => getVisitTimestamp(visit) > now)
    .sort((a, b) => getVisitTimestamp(a) - getVisitTimestamp(b))[0]

  if (!nextVisit) {
    return (
      <section className="glass-card p-5">
        <h2 className="mb-1 text-2xl" style={{ fontFamily: 'var(--font-display)' }}>
          Prossimo Evento Pizzoni
        </h2>
        <p className="page-subtitle">Nessun evento confermato al momento.</p>
        {showCreateAction && (
          <Link href="/eventi" className="btn-secondary mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-sm">
            <FiCalendar className="h-4 w-4" />
            Crea nuovo evento
          </Link>
        )}
      </section>
    )
  }

  const pizzeria = getFirst(nextVisit.pizzerias)
  const photoOfNight = (nextVisit.photos ?? []).find((photo) => photo.is_pizza_of_night)?.url ?? null
  const attendees = (nextVisit.visit_attendees ?? []).map((attendee) => {
    const profile = attendee.profiles ? getFirst(attendee.profiles) : null
    return {
      id: attendee.user_id,
      label: `${profile?.pizza_emoji ?? '🍕'} ${profile?.name ?? profile?.email ?? 'Membro'}`,
    }
  })

  return (
    <section className="glass-card p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-stretch">
        <div className="relative overflow-hidden rounded-2xl border border-[var(--paper-border)] md:w-[42%] md:shrink-0 md:self-stretch">
          {/* Use plain img to keep this server component simple and avoid client wrappers for next/image */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
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

          <div className="mt-3">
            <p className="text-xs uppercase tracking-[0.1em] text-[var(--ink-soft)]">Partecipanti ({attendees.length})</p>
            {attendees.length === 0 ? (
              <p className="mt-1 text-sm page-subtitle">Nessuno ancora confermato.</p>
            ) : (
              <div className="mt-2 flex flex-wrap gap-2">
                {attendees.map((attendee) => (
                  <span key={attendee.id} className="rounded-full bg-[rgba(255,255,255,0.75)] px-3 py-1 text-xs text-[var(--ink)]">
                    {attendee.label}
                  </span>
                ))}
              </div>
            )}
          </div>

          <Link
            href={`/eventi/${nextVisit.id}`}
            className="btn-primary mt-4 inline-flex w-full items-center justify-center gap-1.5 px-3 py-1.5 text-center text-sm md:mt-auto md:ml-auto md:w-auto"
          >
            <FiExternalLink className="h-4 w-4" />
            Apri dettaglio evento
          </Link>
        </div>
      </div>
    </section>
  )
}
