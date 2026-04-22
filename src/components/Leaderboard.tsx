import { createSupabaseServerClient } from '@/lib/supabase-server'

interface Pizzeria {
  id: string
  name: string
  city: string
  avg_score: number
}

interface PizzeriaRelation {
  id: string
  name: string
  city: string
}

interface VisitRelation {
  pizzerias: PizzeriaRelation | PizzeriaRelation[]
}

interface ReviewRow {
  final_score: number | null
  visits: VisitRelation | VisitRelation[]
}

interface GroupedPizzeria extends PizzeriaRelation {
  scores: number[]
}

interface LeaderboardProps {
  city?: string
}

function getFirst<T>(value: T | T[]): T {
  return Array.isArray(value) ? value[0] : value
}

export default async function Leaderboard({ city }: LeaderboardProps) {
  const supabase = await createSupabaseServerClient()

  const { data, error } = await supabase
    .from('reviews')
    .select(
      `
      final_score,
      visits!inner(
        pizzerias!inner(id, name, city)
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

    if (city && pizzeria.city !== city) continue

    if (!grouped[pizzeria.id]) {
      grouped[pizzeria.id] = { ...pizzeria, scores: [] }
    }

    grouped[pizzeria.id].scores.push(row.final_score)
  }

  const pizzerias: Pizzeria[] = Object.values(grouped)
    .map((pizzeria) => ({
      id: pizzeria.id,
      name: pizzeria.name,
      city: pizzeria.city,
      avg_score: pizzeria.scores.reduce((sum, score) => sum + score, 0) / pizzeria.scores.length,
    }))
    .sort((a, b) => b.avg_score - a.avg_score)

  return (
    <section className="space-y-4">
      {pizzerias.length === 0 && <p className="page-subtitle">Nessuna recensione disponibile per la città selezionata.</p>}
      <div className="space-y-3">
        {pizzerias.map((pizzeria, index) => (
          <article key={pizzeria.id} className="glass-card flex items-center justify-between gap-3 p-4 sm:p-5">
            <div className="flex items-center gap-4">
              <span className="badge-pill px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em]">#{index + 1}</span>
              <div>
                <h2 className="text-2xl">{pizzeria.name}</h2>
                <p className="page-subtitle">{pizzeria.city}</p>
              </div>
            </div>
            <div className="rounded-full bg-[rgba(178,74,47,0.14)] px-4 py-2 text-2xl font-bold text-[var(--terracotta-deep)]">
              {pizzeria.avg_score.toFixed(1)}
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
