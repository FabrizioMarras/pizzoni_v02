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
  final_score: number | null
  visits: VisitRelation | VisitRelation[]
}

interface GroupedPizzeria extends PizzeriaRelation {
  scores: number[]
  latestVisitId: string | null
  latestVisitTimestamp: number
  latestEventPhotoUrl: string | null
  latestEventPhotoTimestamp: number
}

interface LeaderboardProps {
  city?: string
  cities: string[]
}

export default async function Leaderboard({ city, cities }: LeaderboardProps) {
  const supabase = await createSupabaseServerClient()

  const { data, error } = await supabase
    .from('reviews')
    .select(
      `
      final_score,
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
        {pizzerias.map((pizzeria, index) => (
          <Link key={pizzeria.id} href={pizzeria.latestVisitId ? `/eventi/${pizzeria.latestVisitId}` : '/eventi'} className="block">
            <article className="glass-card flex items-center justify-between gap-3 p-4 transition hover:border-[var(--terracotta)] sm:p-5">
              <div className="flex items-center gap-4">
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
                  className="h-[72px] w-[72px] rounded-2xl object-cover"
                />
                <div>
                  <h2 className="text-2xl">{pizzeria.name}</h2>
                  <p className="text-xs text-[var(--ink-soft)]">{pizzeria.location}</p>
                  <p className="page-subtitle">{pizzeria.city}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <RankBadge rank={index + 1} size={38} />
                <div className="rounded-full border border-[var(--paper-border)] bg-[rgba(255,255,255,0.86)] px-4 py-2 text-2xl font-bold text-[var(--ink)]">
                  {pizzeria.avg_score.toFixed(1)}
                </div>
              </div>
            </article>
          </Link>
        ))}
      </div>
    </section>
  )
}
