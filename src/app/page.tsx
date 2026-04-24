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
      <main className="page-wrap space-y-6">
        <NextEventCard />
        <Leaderboard city={city || undefined} cities={cities} />
      </main>
    </div>
  )
}
