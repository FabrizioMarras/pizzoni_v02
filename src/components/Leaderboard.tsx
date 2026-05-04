import Image from 'next/image'
import Link from 'next/link'
import { FiList, FiMapPin } from 'react-icons/fi'
import ButtonLink from '@/components/ui/ButtonLink'
import RankBadge from '@/components/ui/RankBadge'
import { getPizzeriaImageSrc } from '@/lib/pizzeria-image'
import { firstOrThrow } from '@/lib/supabase-relations'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { getVisitTimestamp } from '@/lib/visit-time'

interface Pizzeria {
  id: string
  name: string
  city: string
  location: string
  google_photo_name: string | null
  custom_image_url: string | null
  latest_event_photo_url: string | null
  avg_score: number
  latestVisitId: string | null
}

interface PizzeriaRelation {
  id: string
  name: string
  city: string
  location: string
  google_photo_name: string | null
  custom_image_url: string | null
}

interface VisitRelation {
  id: string
  date: string
  scheduled_at: string | null
  photos:
    | {
        url: string
        is_pizza_of_night: boolean
        created_at: string
      }[]
    | null
  pizzerias: PizzeriaRelation | PizzeriaRelation[]
}

interface ReviewRow {
  user_id: string
  final_score: number | null
  profiles:
    | {
        name: string | null
      }
    | {
        name: string | null
      }[]
  visits: VisitRelation | VisitRelation[]
}

interface GroupedPizzeria extends PizzeriaRelation {
  scores: number[]
  memberVotes: { reviewerName: string; score: number }[]
  latestVisitId: string | null
  latestVisitTimestamp: number
  latestEventPhotoUrl: string | null
  latestEventPhotoTimestamp: number
}

interface LeaderboardProps {
  city?: string
  cities: string[]
}

interface MemberVote {
  reviewerName: string
  score: number
}

function formatMemberVote(value: number) {
  if (!Number.isFinite(value)) return '-'
  return value.toFixed(1)
}

export default async function Leaderboard({ city, cities }: LeaderboardProps) {
  const supabase = await createSupabaseServerClient()

  const { data, error } = await supabase
    .from('reviews')
    .select(
      `
      user_id,
      final_score,
      profiles(name),
      visits!inner(
        id,
        date,
        scheduled_at,
        photos(url, is_pizza_of_night, created_at),
        pizzerias!inner(id, name, city, location, google_photo_name, custom_image_url)
      )
    `
    )
    .returns<ReviewRow[]>()

  if (error) {
    return <div className="glass-card p-6 text-[var(--terracotta)]">Impossibile caricare la classifica.</div>
  }

  const grouped: Record<string, GroupedPizzeria> = {}

  for (const row of data ?? []) {
    if (row.final_score === null) continue

    const visit = firstOrThrow(row.visits)
    const pizzeria = firstOrThrow(visit.pizzerias)
    const visitTimestamp = getVisitTimestamp(visit)

    if (city && pizzeria.city !== city) continue

    if (!grouped[pizzeria.id]) {
      grouped[pizzeria.id] = {
        ...pizzeria,
        scores: [],
        memberVotes: [],
        latestVisitId: visit.id,
        latestVisitTimestamp: Number.isNaN(visitTimestamp) ? 0 : visitTimestamp,
        latestEventPhotoUrl: null,
        latestEventPhotoTimestamp: 0,
      }
    } else if (!Number.isNaN(visitTimestamp) && visitTimestamp > grouped[pizzeria.id].latestVisitTimestamp) {
      grouped[pizzeria.id].latestVisitTimestamp = visitTimestamp
      grouped[pizzeria.id].latestVisitId = visit.id
    }

    const photoOfNight = (visit.photos ?? []).find((photo) => photo.is_pizza_of_night)
    if (photoOfNight) {
      const photoTimestamp = new Date(photoOfNight.created_at).getTime()
      if (!Number.isNaN(photoTimestamp) && photoTimestamp >= grouped[pizzeria.id].latestEventPhotoTimestamp) {
        grouped[pizzeria.id].latestEventPhotoTimestamp = photoTimestamp
        grouped[pizzeria.id].latestEventPhotoUrl = photoOfNight.url
      }
    }

    const reviewProfile = firstOrThrow(row.profiles)
    grouped[pizzeria.id].memberVotes.push({
      reviewerName: reviewProfile.name?.trim() || 'Membro',
      score: row.final_score,
    })
    grouped[pizzeria.id].scores.push(row.final_score)
  }

  const pizzerias: Pizzeria[] = Object.values(grouped)
    .map((pizzeria) => ({
      id: pizzeria.id,
      name: pizzeria.name,
      city: pizzeria.city,
      location: pizzeria.location,
      google_photo_name: pizzeria.google_photo_name,
      custom_image_url: pizzeria.custom_image_url,
      latest_event_photo_url: pizzeria.latestEventPhotoUrl,
      avg_score: pizzeria.scores.reduce((sum, score) => sum + score, 0) / pizzeria.scores.length,
      latestVisitId: pizzeria.latestVisitId,
    }))
    .sort((a, b) => b.avg_score - a.avg_score)

  const votesByPizzeria = Object.fromEntries(
    Object.values(grouped).map((entry) => [entry.id, entry.memberVotes])
  ) as Record<string, MemberVote[]>

  return (
    <section className="glass-card space-y-4 p-5">
      <div>
        <h1 className="page-title !mb-1">Classifica</h1>
        <p className="text-sm page-subtitle">Classifica delle migliori pizzerie in base alla media recensioni del gruppo.</p>
      </div>

      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.12em] text-[var(--ink-soft)]">Filtra per città</p>
        <div className="flex flex-wrap gap-2">
          <ButtonLink
            href="/"
            variant={!city ? 'primary' : 'secondary'}
            className="px-3 py-1.5 text-sm"
            icon={<FiList className="h-3.5 w-3.5" />}
          >
            Tutte
          </ButtonLink>
          {cities.map((cityOption) => (
            <ButtonLink
              key={cityOption}
              href={`/?city=${encodeURIComponent(cityOption)}`}
              variant={city === cityOption ? 'primary' : 'secondary'}
              className="px-3 py-1.5 text-sm"
              icon={<FiMapPin className="h-3.5 w-3.5" />}
            >
              {cityOption}
            </ButtonLink>
          ))}
        </div>
      </div>

      {pizzerias.length === 0 && <p className="page-subtitle">Nessuna recensione disponibile per la città selezionata.</p>}
      <div className="space-y-3">
        {pizzerias.map((pizzeria, index) => {
          const rank = index + 1

          return (
            <article key={pizzeria.id} className="glass-card flex flex-col gap-3 p-4 transition hover:border-[var(--terracotta)] sm:p-5 md:flex-row md:items-center md:justify-between">
              <div className="flex-1">
                <Link href={pizzeria.latestVisitId ? `/eventi/${pizzeria.latestVisitId}` : '/eventi'} className="block">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
                    <Image
                      src={getPizzeriaImageSrc({
                        id: pizzeria.id,
                        name: pizzeria.name,
                        city: pizzeria.city,
                        customImageUrl: pizzeria.custom_image_url,
                        latestEventPhotoUrl: pizzeria.latest_event_photo_url,
                        googlePhotoName: pizzeria.google_photo_name,
                        width: 220,
                      })}
                      alt={pizzeria.name}
                      width={72}
                      height={72}
                      unoptimized
                      className="h-40 w-full rounded-2xl object-cover md:h-[72px] md:w-[72px]"
                    />
                    <div>
                      <h2 className="text-2xl">{pizzeria.name}</h2>
                      <p className="text-xs text-[var(--ink-soft)]">{pizzeria.location}</p>
                      <p className="page-subtitle">{pizzeria.city}</p>
                    </div>
                  </div>
                </Link>
                <details name="leaderboard-votes" className="mt-1">
                  <summary className="cursor-pointer text-xs font-medium text-[var(--ink-soft)] hover:text-[var(--ink)]">
                    {votesByPizzeria[pizzeria.id]?.length ?? 0} voti
                  </summary>
                  <ul className="mt-1 inline-flex w-auto flex-col space-y-1 text-xs text-[var(--ink)]">
                    {(votesByPizzeria[pizzeria.id] ?? []).map((vote, voteIndex) => (
                      <li key={`${vote.reviewerName}-${voteIndex}`} className="inline-flex w-auto items-center gap-2">
                        <span>{vote.reviewerName}</span>
                        <span className="shrink-0 font-semibold tabular-nums">{formatMemberVote(vote.score)}</span>
                      </li>
                    ))}
                  </ul>
                </details>
              </div>
              <div className="flex items-center gap-2 self-end md:self-auto">
                {rank <= 3 ? (
                  <RankBadge rank={rank} size={38} />
                ) : (
                  <span className="inline-flex h-[38px] min-w-[38px] items-center justify-center text-sm font-bold tabular-nums text-[var(--ink-soft)]">
                    {rank}
                  </span>
                )}
                <div className="rounded-full border border-[var(--paper-border)] bg-[rgba(255,255,255,0.86)] px-4 py-2 text-2xl font-bold text-[var(--ink)]">
                  {pizzeria.avg_score.toFixed(1)}
                </div>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
