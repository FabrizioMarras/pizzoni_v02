import Nav from '@/components/Nav'
import Skeleton from '@/components/ui/Skeleton'

export default function PizzerieLoading() {
  return (
    <div className="app-shell">
      <Nav />
      <main className="page-wrap">
        <Skeleton className="mb-4 h-9 w-40" />
        <section className="glass-card space-y-3 p-6">
          <Skeleton className="h-10 w-full" />
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="surface-card flex h-full flex-col gap-3 px-3 py-3">
                <Skeleton className="h-36 w-full" />
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-3.5 w-1/2" />
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}
