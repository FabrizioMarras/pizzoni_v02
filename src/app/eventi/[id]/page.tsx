import Nav from '@/components/Nav'
import AttendeesManager from '@/components/AttendeesManager'
import PhotoGalleryManager from '@/components/PhotoGalleryManager'
import ReviewForm from '@/components/ReviewForm'
import { createSupabaseServerClient } from '@/lib/supabase-server'

interface VisitPageProps {
  params: Promise<{
    id: string
  }>
}

interface VisitDetails {
  id: string
  date: string
  notes: string | null
  pizzerias:
    | {
        name: string
        location: string
        city: string
      }
    | {
        name: string
        location: string
        city: string
      }[]
}

interface ReviewSummary {
  id: string
  final_score: number | null
  profiles:
    | {
        name: string | null
        pizza_emoji: string | null
      }
    | {
        name: string | null
        pizza_emoji: string | null
      }[]
}

function getFirst<T>(value: T | T[]): T {
  return Array.isArray(value) ? value[0] : value
}

export default async function VisitDetailsPage({ params }: VisitPageProps) {
  const { id } = await params
  const supabase = await createSupabaseServerClient()

  const [{ data: visit }, { data: reviewSummaries }] = await Promise.all([
    supabase.from('visits').select('id, date, notes, pizzerias(name, location, city)').eq('id', id).single<VisitDetails>(),
    supabase.from('reviews').select('id, final_score, profiles(name, pizza_emoji)').eq('visit_id', id).returns<ReviewSummary[]>(),
  ])

  if (!visit) {
    return (
      <div className="app-shell">
        <Nav />
        <main className="page-wrap">
          <div className="glass-card p-6 text-[var(--ink-soft)]">Visita non trovata.</div>
        </main>
      </div>
    )
  }

  const pizzeria = getFirst(visit.pizzerias)

  return (
    <div className="app-shell">
      <Nav />
      <main className="page-wrap space-y-6">
        <section className="glass-card p-6">
          <h1 className="page-title mb-2">{pizzeria.name}</h1>
          <p className="page-subtitle">{visit.date} · {pizzeria.city}</p>
          <p className="text-sm text-[var(--ink-soft)]">{pizzeria.location}</p>
          {visit.notes && <p className="mt-3 text-[var(--ink)]">{visit.notes}</p>}
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${pizzeria.name} ${pizzeria.location}`)}`}
            target="_blank"
            rel="noreferrer"
            className="btn-secondary mt-4 inline-block px-4 py-2 text-sm"
          >
            Apri in Google Maps
          </a>
        </section>

        <ReviewForm visitId={id} />
        <AttendeesManager visitId={id} />

        <section className="glass-card space-y-3 p-6">
          <h2 className="text-3xl">Tutte le Recensioni</h2>
          {(reviewSummaries ?? []).length === 0 && <p className="page-subtitle">Ancora nessuna recensione.</p>}
          {(reviewSummaries ?? []).map((review) => {
            const profile = getFirst(review.profiles)
            return (
              <div key={review.id} className="surface-card px-3 py-2 text-sm text-[var(--ink)]">
                <span className="font-medium">{profile.pizza_emoji ?? '🍕'} {profile.name ?? 'Membro'}</span>
                <span className="ml-2">Punteggio: {review.final_score?.toFixed(1) ?? '-'}</span>
              </div>
            )
          })}
        </section>

        <PhotoGalleryManager visitId={id} />
      </main>
    </div>
  )
}
