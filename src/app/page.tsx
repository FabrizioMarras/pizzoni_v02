import Link from 'next/link'
import Leaderboard from '@/components/Leaderboard'
import Nav from '@/components/Nav'
import NextEventCard from '@/components/NextEventCard'
import { createSupabaseServerClient } from '@/lib/supabase-server'

interface HomePageProps {
  searchParams: Promise<{ city?: string }>
}

export default async function Home({ searchParams }: HomePageProps) {
  const params = await searchParams
  const city = params.city?.trim() || ''
  const supabase = await createSupabaseServerClient()

  const { data: cityRows } = await supabase.from('pizzerias').select('city').order('city', { ascending: true })

  const cities = Array.from(new Set((cityRows ?? []).map((row) => row.city))).filter(Boolean)

  return (
    <div className="app-shell">
      <Nav />
      <main className="page-wrap">
        <h1 className="page-title mb-4">Classifica</h1>
        <NextEventCard />
        <section className="glass-card mb-5 p-5">
          <h2 className="mb-1 text-2xl" style={{ fontFamily: 'var(--font-display)' }}>
            Filtra per città
          </h2>
          <p className="mb-3 text-sm page-subtitle">Mostra solo le pizzerie della città selezionata.</p>
          <div className="flex flex-wrap gap-2">
            <Link href="/" className={`px-3 py-1.5 text-sm ${city === '' ? 'btn-primary' : 'btn-secondary'}`}>
              Tutte
            </Link>
            {cities.map((cityOption) => (
              <Link
                key={cityOption}
                href={`/?city=${encodeURIComponent(cityOption)}`}
                className={`px-3 py-1.5 text-sm ${city === cityOption ? 'btn-primary' : 'btn-secondary'}`}
              >
                {cityOption}
              </Link>
            ))}
          </div>
        </section>

        <Leaderboard city={city || undefined} />
      </main>
    </div>
  )
}
