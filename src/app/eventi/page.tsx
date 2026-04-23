import Nav from '@/components/Nav'
import NextEventCard from '@/components/NextEventCard'
import PlannerBoard from '@/components/PlannerBoard'
import VisitsManager from '@/components/VisitsManager'

export default function VisitsPage() {
  return (
    <div className="app-shell">
      <Nav />
      <main className="page-wrap space-y-6">
        <h1 className="page-title mb-1">Eventi</h1>
        <p className="page-subtitle">Archivio cronologico degli eventi Pizzoni, passati e futuri.</p>
        <PlannerBoard hideClosedPolls />
        <NextEventCard showCreateAction={false} />
        <VisitsManager />
      </main>
    </div>
  )
}
