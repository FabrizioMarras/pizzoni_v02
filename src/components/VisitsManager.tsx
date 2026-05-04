import { VISIT_HISTORY_CARD_SELECT } from '@/lib/data/visit-queries'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { getNowTimestamp, getVisitTimestamp, isDoneVisit } from '@/lib/visit-time'
import VisitHistoryList, { type VisitHistoryItem } from '@/components/VisitHistoryList'

interface VisitsManagerProps {
  visits?: VisitHistoryItem[]
}

export default async function VisitsManager({ visits }: VisitsManagerProps) {
  let doneVisits = visits ?? []
  if (!visits) {
    const supabase = await createSupabaseServerClient()
    const { data: visitsData } = await supabase
      .from('visits')
      .select(VISIT_HISTORY_CARD_SELECT)
      .order('date', { ascending: false })
      .returns<VisitHistoryItem[]>()

    const now = getNowTimestamp()
    doneVisits = (visitsData ?? [])
      .filter((visit) => isDoneVisit(visit, now))
      .sort((a, b) => getVisitTimestamp(b) - getVisitTimestamp(a))
  }

  return (
    <div className="space-y-6">
      <section className="glass-card space-y-3 p-6">
        <h2 className="text-3xl">Storico Eventi</h2>
        <VisitHistoryList visits={doneVisits} />
      </section>
    </div>
  )
}
