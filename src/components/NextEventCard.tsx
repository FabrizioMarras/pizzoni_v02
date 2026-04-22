import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/supabase-server'

interface VisitRow {
  id: string
  date: string
  pizzerias:
    | {
        name: string
        city: string
        location: string
      }
    | {
        name: string
        city: string
        location: string
      }[]
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

function formatDate(value: string) {
  return new Date(`${value}T12:00:00Z`).toLocaleDateString('it-IT', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

export default async function NextEventCard() {
  const supabase = await createSupabaseServerClient()
  const today = new Date().toISOString().slice(0, 10)

  const { data } = await supabase
    .from('visits')
    .select('id, date, pizzerias(name, city, location), visit_attendees(user_id, profiles(name, pizza_emoji, email))')
    .gte('date', today)
    .order('date', { ascending: true })
    .limit(1)
    .returns<VisitRow[]>()

  const nextVisit = data?.[0]

  if (!nextVisit) {
    return (
      <section className="glass-card mb-5 p-5">
        <h2 className="mb-1 text-2xl" style={{ fontFamily: 'var(--font-display)' }}>
          Prossimo Evento Pizzoni
        </h2>
        <p className="page-subtitle">Nessun evento confermato al momento.</p>
        <Link href="/eventi" className="btn-secondary mt-3 inline-block px-3 py-1.5 text-sm">
          Crea nuova poll
        </Link>
      </section>
    )
  }

  const pizzeria = getFirst(nextVisit.pizzerias)
  const attendees = (nextVisit.visit_attendees ?? []).map((attendee) => {
    const profile = attendee.profiles ? getFirst(attendee.profiles) : null
    return {
      id: attendee.user_id,
      label: `${profile?.pizza_emoji ?? '🍕'} ${profile?.name ?? profile?.email ?? 'Membro'}`,
    }
  })

  return (
    <section className="glass-card mb-5 p-5">
      <h2 className="mb-1 text-2xl" style={{ fontFamily: 'var(--font-display)' }}>
        Prossimo Evento Pizzoni
      </h2>
      <p className="text-sm text-[var(--ink)]">
        <span className="font-semibold">{pizzeria.name}</span> · {formatDate(nextVisit.date)}
      </p>
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

      <Link href={`/eventi/${nextVisit.id}`} className="btn-primary mt-4 inline-block px-3 py-1.5 text-sm">
        Apri dettaglio evento
      </Link>
    </section>
  )
}
