import Image from 'next/image'
import { FiMapPin } from 'react-icons/fi'
import Nav from '@/components/Nav'
import AttendeesManager from '@/components/AttendeesManager'
import EventNotesManager from '@/components/EventNotesManager'
import EventScheduleManager from '@/components/EventScheduleManager'
import PhotoGalleryManager from '@/components/PhotoGalleryManager'
import ReviewForm from '@/components/ReviewForm'
import ButtonLink from '@/components/ui/ButtonLink'
import MemberIdentity from '@/components/ui/MemberIdentity'
import RankBadge from '@/components/ui/RankBadge'
import { formatDateLabel, formatDateTimeLabel } from '@/lib/date-format'
import { getEventImageSrc } from '@/lib/pizzeria-image'
import { firstOrThrow } from '@/lib/supabase-relations'
import { createSupabaseServerClient } from '@/lib/supabase-server'

interface VisitPageProps {
  params: Promise<{
    id: string
  }>
}

interface VisitDetails {
  id: string
  date: string
  scheduled_at: string | null
  created_by: string
  pizzerias:
    | {
        id: string
        name: string
        location: string
        city: string
        google_photo_name: string | null
        custom_image_url: string | null
        google_maps_uri: string | null
      }
    | {
        id: string
        name: string
        location: string
        city: string
        google_photo_name: string | null
        custom_image_url: string | null
        google_maps_uri: string | null
      }[]
}

interface ReviewSummary {
  id: string
  final_score: number | null
  profiles:
    | {
        name: string | null
        avatar_url: string | null
      }
    | {
        name: string | null
        avatar_url: string | null
      }[]
}

interface PhotoSummary {
  url: string
  is_pizza_of_night: boolean
}

interface LeaderboardReviewRow {
  final_score: number | null
  visits:
    | {
        pizzerias:
          | {
              id: string
            }
          | {
              id: string
            }[]
      }
    | {
        pizzerias:
          | {
              id: string
            }
          | {
              id: string
            }[]
      }[]
}

export default async function VisitDetailsPage({ params }: VisitPageProps) {
  const { id } = await params
  const supabase = await createSupabaseServerClient()

  const [{ data: visit }, { data: reviewSummaries }, { data: leaderboardRows }, { data: photos }] = await Promise.all([
    supabase
      .from('visits')
      .select('id, date, scheduled_at, created_by, pizzerias(id, name, location, city, google_photo_name, custom_image_url, google_maps_uri)')
      .eq('id', id)
      .single<VisitDetails>(),
    supabase.from('reviews').select('id, final_score, profiles(name, avatar_url)').eq('visit_id', id).returns<ReviewSummary[]>(),
    supabase
      .from('reviews')
      .select(
        `
        final_score,
        visits!inner(
          pizzerias!inner(id)
        )
      `
      )
      .returns<LeaderboardReviewRow[]>(),
    supabase.from('photos').select('url, is_pizza_of_night').eq('visit_id', id).returns<PhotoSummary[]>(),
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

  const pizzeria = firstOrThrow(visit.pizzerias)
  const groupedScores: Record<string, number[]> = {}
  for (const row of leaderboardRows ?? []) {
    if (row.final_score === null) continue
    const visitRow = firstOrThrow(row.visits)
    const pizzeriaRow = firstOrThrow(visitRow.pizzerias)
    if (!groupedScores[pizzeriaRow.id]) groupedScores[pizzeriaRow.id] = []
    groupedScores[pizzeriaRow.id].push(row.final_score)
  }

  const ranking = Object.entries(groupedScores)
    .map(([pizzeriaId, scores]) => ({
      pizzeriaId,
      avg: scores.reduce((sum, score) => sum + score, 0) / scores.length,
    }))
    .sort((a, b) => b.avg - a.avg)

  const rank = ranking.findIndex((entry) => entry.pizzeriaId === pizzeria.id) + 1
  const score = ranking.find((entry) => entry.pizzeriaId === pizzeria.id)?.avg ?? null
  const photoOfNight = (photos ?? []).find((photo) => photo.is_pizza_of_night)?.url ?? null

  return (
    <div className="app-shell">
      <Nav />
      <main className="page-wrap space-y-6">
        <section className="glass-card relative p-6">
          <div className="mb-4 overflow-hidden rounded-2xl border border-[var(--paper-border)]">
            <Image
              src={getEventImageSrc({
                photoOfNightUrl: photoOfNight,
                id: pizzeria.id,
                name: pizzeria.name,
                city: pizzeria.city,
                customImageUrl: pizzeria.custom_image_url,
                googlePhotoName: pizzeria.google_photo_name,
                width: 1200,
              })}
              alt={pizzeria.name}
              width={1200}
              height={680}
              unoptimized
              className="h-52 w-full object-cover sm:h-64"
            />
          </div>
          {rank > 0 && (
            <div className="absolute right-3 top-3 z-10 flex items-center gap-2 md:bottom-4 md:right-4 md:top-auto">
              {score !== null && (
                <div className="rounded-full border border-[var(--paper-border)] bg-[rgba(255,255,255,0.92)] px-3 py-1 text-sm font-semibold text-[var(--ink)]">
                  {score.toFixed(1)}
                </div>
              )}
              <RankBadge rank={rank} size={76} idPrefix="visit-rank" />
            </div>
          )}

          <h1 className="page-title mb-1">{pizzeria.name}</h1>
          <p className="text-sm text-[var(--ink-soft)]">{pizzeria.location}</p>

          <p className="mt-2 page-subtitle">
            {visit.scheduled_at
              ? formatDateTimeLabel(visit.scheduled_at)
              : `${formatDateLabel(`${visit.date}T12:00:00`)} · Orario da confermare`}
            {' · '}
            {pizzeria.city}
          </p>

          <ButtonLink
            href={pizzeria.google_maps_uri || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${pizzeria.name} ${pizzeria.location}`)}`}
            target="_blank"
            rel="noreferrer"
            variant="secondary"
            className="mt-4 px-4 py-2 text-sm"
            icon={<FiMapPin className="h-4 w-4" />}
          >
            Apri in Google Maps
          </ButtonLink>
        </section>

        <EventScheduleManager visitId={id} visitOwnerId={visit.created_by} initialDate={visit.date} initialScheduledAt={visit.scheduled_at} />
        <ReviewForm visitId={id} />
        <EventNotesManager visitId={id} />
        <AttendeesManager visitId={id} />

        <section className="glass-card space-y-3 p-6">
          <h2 className="text-3xl">Tutte le Recensioni</h2>
          {(reviewSummaries ?? []).length === 0 && <p className="page-subtitle">Ancora nessuna recensione.</p>}
          {(reviewSummaries ?? []).map((review) => {
            const profile = firstOrThrow(review.profiles)
            return (
              <div key={review.id} className="surface-card px-3 py-2 text-sm text-[var(--ink)]">
                <span className="font-medium">
                  <MemberIdentity name={profile.name} avatarUrl={profile.avatar_url} />
                </span>
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
