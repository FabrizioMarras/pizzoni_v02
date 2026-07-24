import Nav from '@/components/Nav'
import Skeleton from '@/components/ui/Skeleton'

export default function FeedbackLoading() {
  return (
    <div className="app-shell">
      <Nav />
      <main className="page-wrap space-y-6">
        <section className="glass-card space-y-3 p-6">
          <Skeleton className="h-9 w-56" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-9 w-32" />
        </section>
        <section className="glass-card space-y-3 p-6">
          <Skeleton className="h-9 w-48" />
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="surface-card flex flex-col gap-2 p-3">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3.5 w-1/3" />
            </div>
          ))}
        </section>
      </main>
    </div>
  )
}
