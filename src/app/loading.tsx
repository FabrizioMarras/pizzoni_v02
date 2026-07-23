import Nav from '@/components/Nav'
import Skeleton from '@/components/ui/Skeleton'

export default function HomeLoading() {
  return (
    <div className="app-shell">
      <Nav />
      <main className="page-wrap space-y-6">
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

        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <article key={index} className="glass-card flex flex-col gap-3 p-4 sm:p-5 md:flex-row md:items-center">
              <Skeleton className="h-40 w-full md:h-[90px] md:w-[112px] md:shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-1/2" />
                <Skeleton className="h-3.5 w-1/3" />
                <Skeleton className="h-3.5 w-1/4" />
              </div>
            </article>
          ))}
        </div>
      </main>
    </div>
  )
}
