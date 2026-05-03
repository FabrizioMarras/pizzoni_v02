import Image from 'next/image'
import ButtonLink from '@/components/ui/ButtonLink'
import { FiArrowUpRight } from 'react-icons/fi'
import { formatDateLabel, formatDateTimeLabel } from '@/lib/date-format'
import { getEventImageSrc } from '@/lib/pizzeria-image'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { getVisitTimestamp, isDoneVisit } from '@/lib/visit-time'

interface Visit {
  id: string
  date: string
  scheduled_at: string | null
  photos: {
    url: string
    is_pizza_of_night: boolean
  }[] | null
  pizzerias: {
    id: string
    name: string
    city: string
    google_photo_name: string | null
    custom_image_url: string | null
  } | null
}

interface VisitsManagerProps {
  visits?: Visit[]
}

export default async function VisitsManager({ visits }: VisitsManagerProps) {
  let doneVisits = visits ?? []
  if (!visits) {
    const supabase = await createSupabaseServerClient()
    const { data: visitsData } = await supabase
      .from('visits')
      .select('id, date, scheduled_at, photos(url, is_pizza_of_night), pizzerias(id, name, city, google_photo_name, custom_image_url)')
      .order('date', { ascending: false })

    // eslint-disable-next-line react-hooks/purity
    const now = Date.now()
    doneVisits = ((visitsData as Visit[] | null) ?? [])
      .filter((visit) => isDoneVisit(visit, now))
      .sort((a, b) => getVisitTimestamp(b) - getVisitTimestamp(a))
  }

  return (
    <div className="space-y-6">
      <section className="glass-card space-y-3 p-6">
        <h2 className="text-3xl">Storico Eventi</h2>
        {doneVisits.length === 0 && <p className="page-subtitle">Nessun evento concluso disponibile.</p>}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {doneVisits.map((visit) => (
            <article key={visit.id} className="surface-card flex h-full flex-col px-3 py-3">
              {visit.pizzerias && (
                <div className="mb-3 overflow-hidden rounded-2xl border border-[var(--paper-border)]">
                  <Image
                    src={getEventImageSrc({
                      photoOfNightUrl: (visit.photos ?? []).find((photo) => photo.is_pizza_of_night)?.url ?? null,
                      id: visit.pizzerias.id,
                      name: visit.pizzerias.name,
                      city: visit.pizzerias.city,
                      customImageUrl: visit.pizzerias.custom_image_url,
                      googlePhotoName: visit.pizzerias.google_photo_name,
                      width: 900,
                    })}
                    alt={visit.pizzerias?.name ?? 'Pizzeria'}
                    width={900}
                    height={500}
                    unoptimized
                    className="h-36 w-full object-cover"
                  />
                </div>
              )}
              <div className="text-lg font-semibold text-[var(--ink)]">{visit.pizzerias?.name ?? 'Pizzeria sconosciuta'}</div>
              <div className="text-sm text-[var(--ink-soft)]">
                {visit.pizzerias?.city ?? '-'} ·{' '}
                {visit.scheduled_at
                  ? formatDateTimeLabel(visit.scheduled_at)
                  : formatDateLabel(`${visit.date}T12:00:00`)}
              </div>
              <div className="pb-4" />
              <ButtonLink href={`/eventi/${visit.id}`} variant="secondary" className="mt-auto px-3 py-1.5 text-xs" icon={<FiArrowUpRight className="h-3.5 w-3.5" />}>
                Apri evento
              </ButtonLink>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}
