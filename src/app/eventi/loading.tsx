import Nav from '@/components/Nav'
import Skeleton from '@/components/ui/Skeleton'

export default function EventiLoading() {
  return (
    <div className="app-shell">
      <Nav />
      <main className="page-wrap space-y-6">
        <Skeleton className="mb-1 h-9 w-40" />

        <section className="glass-card p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-stretch md:min-h-60">
            <Skeleton className="h-52 w-full sm:h-64 md:h-auto md:w-[42%] md:shrink-0" />
            <div className="flex flex-1 flex-col gap-3 py-2">
              <Skeleton className="h-6 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-1/3" />
            </div>
          </div>
        </section>

        <section className="glass-card space-y-3 p-6">
          <Skeleton className="h-7 w-48" />
          <div className="surface-card space-y-3 px-4 py-4">
            <Skeleton className="h-5 w-1/3" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-56 w-full" />
          </div>
        </section>

        <section className="glass-card space-y-3 p-6">
          <Skeleton className="h-7 w-48" />
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="surface-card space-y-2 px-4 py-3">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3.5 w-1/4" />
            </div>
          ))}
        </section>
      </main>
    </div>
  )
}
