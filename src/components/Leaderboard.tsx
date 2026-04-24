import Image from 'next/image'
import Link from 'next/link'
import { FiList, FiMapPin } from 'react-icons/fi'
import { createSupabaseServerClient } from '@/lib/supabase-server'

interface Pizzeria {
  id: string
  name: string
  city: string
  google_photo_name: string | null
  avg_score: number
  latestVisitId: string | null
}

interface PizzeriaRelation {
  id: string
  name: string
  city: string
  google_photo_name: string | null
}

interface VisitRelation {
  id: string
  date: string
  scheduled_at: string | null
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
}

interface LeaderboardProps {
  city?: string
  cities: string[]
}

function getRankPalette(rank: number) {
  if (rank === 1) {
    return {
      ribbonStart: '#C89A24',
      ribbonEnd: '#E1B53C',
      rosetteStart: '#F0CB5D',
      rosetteEnd: '#B78619',
      fold: '#8F6713',
      centerFill: '#D4AF37',
      centerStroke: '#9D7A1A',
      ringStroke: '#B78619',
    }
  }

  if (rank === 2) {
    return {
      ribbonStart: '#9EA4AC',
      ribbonEnd: '#C7CDD3',
      rosetteStart: '#D7DCE1',
      rosetteEnd: '#8A919A',
      fold: '#737A82',
      centerFill: '#C0C0C0',
      centerStroke: '#7A7A7A',
      ringStroke: '#8A919A',
    }
  }

  if (rank === 3) {
    return {
      ribbonStart: '#B66E2B',
      ribbonEnd: '#D48B46',
      rosetteStart: '#DFA36A',
      rosetteEnd: '#9A5820',
      fold: '#7D451A',
      centerFill: '#CD7F32',
      centerStroke: '#8A4E17',
      ringStroke: '#9A5820',
    }
  }

  return {
    ribbonStart: '#B5BCC6',
    ribbonEnd: '#D4DAE2',
    rosetteStart: '#E2E6EC',
    rosetteEnd: '#A9B0BB',
    fold: '#8A929E',
    centerFill: '#D9DEE5',
    centerStroke: '#9CA5B2',
    ringStroke: '#A9B0BB',
  }
}

function TopRankBadge({ rank }: { rank: number }) {
  const palette = getRankPalette(rank)
  const idPrefix = `rank-${rank}`
  const ribbonLeftId = `${idPrefix}-ribbon-left`
  const ribbonRightId = `${idPrefix}-ribbon-right`
  const rosetteId = `${idPrefix}-rosette`

  return (
    <span className="relative inline-flex h-[38px] w-[38px] items-center justify-center">
      <svg viewBox="0 0 512 512" className="h-[38px] w-[38px]" aria-hidden="true">
        <defs>
          <linearGradient id={ribbonLeftId} x1="150" y1="330" x2="225" y2="505">
            <stop offset="0" stopColor={palette.ribbonStart} />
            <stop offset="1" stopColor={palette.ribbonEnd} />
          </linearGradient>
          <linearGradient id={ribbonRightId} x1="360" y1="330" x2="285" y2="505">
            <stop offset="0" stopColor={palette.ribbonStart} />
            <stop offset="1" stopColor={palette.ribbonEnd} />
          </linearGradient>
          <radialGradient id={rosetteId} cx="50%" cy="45%" r="55%">
            <stop offset="0" stopColor={palette.rosetteStart} />
            <stop offset="1" stopColor={palette.rosetteEnd} />
          </radialGradient>
        </defs>

        <path d="M163 300 L107 459 L169 430 L200 496 L246 325 Z" fill={`url(#${ribbonLeftId})`} />
        <path d="M349 300 L405 459 L343 430 L312 496 L266 325 Z" fill={`url(#${ribbonRightId})`} />
        <path
          d="M142 315 C164 343 189 336 206 351 C225 368 239 355 256 351 C273 355 287 368 306 351 C323 336 348 343 370 315 L360 350 C334 356 318 344 304 362 C286 384 270 370 256 366 C242 370 226 384 208 362 C194 344 178 356 152 350 Z"
          fill={palette.fold}
          opacity="0.72"
        />
        <path
          d="M256 18 C267 18 276 38 286 39 C297 40 310 24 320 27 C331 30 333 52 343 56 C354 60 371 48 380 54 C389 60 384 82 392 89 C401 96 422 90 428 99 C434 108 423 127 428 137 C433 147 455 150 458 161 C461 172 445 187 447 198 C449 209 469 219 469 230 C469 241 449 251 447 262 C445 273 461 288 458 299 C455 310 433 313 428 323 C423 333 434 352 428 361 C422 370 401 364 392 371 C384 378 389 400 380 406 C371 412 354 400 343 404 C333 408 331 430 320 433 C310 436 297 420 286 421 C276 422 267 442 256 442 C245 442 236 422 226 421 C215 420 202 436 192 433 C181 430 179 408 169 404 C158 400 141 412 132 406 C123 400 128 378 120 371 C111 364 90 370 84 361 C78 352 89 333 84 323 C79 313 57 310 54 299 C51 288 67 273 65 262 C63 251 43 241 43 230 C43 219 63 209 65 198 C67 187 51 172 54 161 C57 150 79 147 84 137 C89 127 78 108 84 99 C90 90 111 96 120 89 C128 82 123 60 132 54 C141 48 158 60 169 56 C179 52 181 30 192 27 C202 24 215 40 226 39 C236 38 245 18 256 18 Z"
          fill={`url(#${rosetteId})`}
        />
        <circle cx="256" cy="230" r="143" fill="white" />
        <circle cx="256" cy="230" r="125" fill="white" stroke={palette.ringStroke} strokeWidth="7" />
        <circle cx="256" cy="230" r="82" fill={palette.centerFill} stroke={palette.centerStroke} strokeWidth="9" />
      </svg>
      <span className="absolute text-xs font-bold text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)]">{rank}</span>
    </span>
  )
}

function getFirst<T>(value: T | T[]): T {
  return Array.isArray(value) ? value[0] : value
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
        pizzerias!inner(id, name, city, google_photo_name)
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

    const visit = getFirst(row.visits)
    const pizzeria = getFirst(visit.pizzerias)
    const visitTimestamp = visit.scheduled_at
      ? new Date(visit.scheduled_at).getTime()
      : new Date(`${visit.date}T23:59:59`).getTime()

    if (city && pizzeria.city !== city) continue

    if (!grouped[pizzeria.id]) {
      grouped[pizzeria.id] = {
        ...pizzeria,
        scores: [],
        latestVisitId: visit.id,
        latestVisitTimestamp: Number.isNaN(visitTimestamp) ? 0 : visitTimestamp,
      }
    } else if (!Number.isNaN(visitTimestamp) && visitTimestamp > grouped[pizzeria.id].latestVisitTimestamp) {
      grouped[pizzeria.id].latestVisitTimestamp = visitTimestamp
      grouped[pizzeria.id].latestVisitId = visit.id
    }

    grouped[pizzeria.id].scores.push(row.final_score)
  }

  const pizzerias: Pizzeria[] = Object.values(grouped)
    .map((pizzeria) => ({
      id: pizzeria.id,
      name: pizzeria.name,
      city: pizzeria.city,
      google_photo_name: pizzeria.google_photo_name,
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
          <Link href="/" className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm ${!city ? 'btn-primary' : 'btn-secondary'}`}>
            <FiList className="h-3.5 w-3.5" />
            Tutte
          </Link>
          {cities.map((cityOption) => (
            <Link
              key={cityOption}
              href={`/?city=${encodeURIComponent(cityOption)}`}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm ${city === cityOption ? 'btn-primary' : 'btn-secondary'}`}
            >
              <FiMapPin className="h-3.5 w-3.5" />
              {cityOption}
            </Link>
          ))}
        </div>
      </div>

      {pizzerias.length === 0 && <p className="page-subtitle">Nessuna recensione disponibile per la città selezionata.</p>}
      <div className="space-y-3">
        {pizzerias.map((pizzeria, index) => (
          <Link key={pizzeria.id} href={pizzeria.latestVisitId ? `/eventi/${pizzeria.latestVisitId}` : '/eventi'} className="block">
            <article className="glass-card flex items-center justify-between gap-3 p-4 transition hover:border-[var(--terracotta)] sm:p-5">
              <div className="flex items-center gap-4">
                {pizzeria.google_photo_name ? (
                  <Image
                    src={`/api/places/photo?name=${encodeURIComponent(pizzeria.google_photo_name)}&w=220`}
                    alt={pizzeria.name}
                    width={72}
                    height={72}
                    unoptimized
                    className="h-[72px] w-[72px] rounded-2xl object-cover"
                  />
                ) : (
                  <div className="flex h-[72px] w-[72px] items-center justify-center rounded-2xl bg-[rgba(255,255,255,0.7)] text-xs text-[var(--ink-soft)]">
                    N/A
                  </div>
                )}
                <div>
                  <h2 className="text-2xl">{pizzeria.name}</h2>
                  <p className="page-subtitle">{pizzeria.city}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <TopRankBadge rank={index + 1} />
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
