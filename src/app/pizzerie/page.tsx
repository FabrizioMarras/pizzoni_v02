import Nav from '@/components/Nav'
import PizzeriaManager from '@/components/PizzeriaManager'
import { mapRowsToPizzerias } from '@/lib/data/pizzeria-mapper'
import { PIZZERIA_WITH_VISITS_SELECT } from '@/lib/data/pizzeria-queries'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import type { PizzeriaRow } from '@/lib/types/pizzeria'

export default async function PizzeriasPage() {
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase
    .from('pizzerias')
    .select(PIZZERIA_WITH_VISITS_SELECT)
    .order('created_at', { ascending: false })
    .returns<PizzeriaRow[]>()
  const initialPizzerias = mapRowsToPizzerias(data ?? [], { visitMode: 'all' })

  return (
    <div className="app-shell">
      <Nav />
      <main className="page-wrap">
        <h1 className="page-title">Pizzerie</h1>
        <p className="page-subtitle mb-6">Crea e consulta i locali testati dal gruppo.</p>
        <PizzeriaManager initialPizzerias={initialPizzerias} />
      </main>
    </div>
  )
}
