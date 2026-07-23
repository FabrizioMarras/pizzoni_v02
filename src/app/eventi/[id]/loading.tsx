import Nav from '@/components/Nav'
import Skeleton from '@/components/ui/Skeleton'

const PANEL_TITLES = ['Orario Evento', 'Partecipazione', 'La Tua Recensione', 'Note Evento', 'Foto']

export default function VisitDetailsLoading() {
  return (
    <div className="app-shell">
      <Nav />
      <main className="page-wrap space-y-4">
        <section className="glass-card p-6">
          <Skeleton className="mb-4 h-52 w-full sm:h-64" />
          <Skeleton className="mb-2 h-8 w-2/3" />
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="mt-2 h-4 w-1/2" />
        </section>

        {PANEL_TITLES.map((title) => (
          <div key={title} className="glass-card flex items-center justify-between px-6 py-5">
            <span className="text-3xl text-transparent">{title}</span>
            <Skeleton className="h-5 w-5 shrink-0 rounded-full" />
          </div>
        ))}
      </main>
    </div>
  )
}
