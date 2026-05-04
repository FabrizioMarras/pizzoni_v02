'use client'

import Image from 'next/image'
import { useCallback, useMemo, useState } from 'react'
import { FiArrowUpRight } from 'react-icons/fi'
import { formatDateLabel, formatDateTimeLabel } from '@/lib/date-format'
import { getEventImageSrc } from '@/lib/pizzeria-image'
import ButtonLink from '@/components/ui/ButtonLink'
import ScrollPagination from '@/components/ui/ScrollPagination'
import SearchBar from '@/components/ui/SearchBar'

export interface VisitHistoryItem {
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

interface VisitHistoryListProps {
  visits: VisitHistoryItem[]
}

const BATCH_SIZE = 9

function getVisitDateLabel(visit: VisitHistoryItem) {
  return visit.scheduled_at ? formatDateTimeLabel(visit.scheduled_at) : formatDateLabel(`${visit.date}T12:00:00`)
}

export default function VisitHistoryList({ visits }: VisitHistoryListProps) {
  const [search, setSearch] = useState('')
  const [visibleCount, setVisibleCount] = useState(BATCH_SIZE)
  const filteredVisits = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('it-IT')
    if (!query) return visits

    return visits.filter((visit) => {
      const pizzeria = visit.pizzerias

      return [
        pizzeria?.name ?? 'Pizzeria sconosciuta',
        pizzeria?.city ?? '',
        getVisitDateLabel(visit),
      ]
        .join(' ')
        .toLocaleLowerCase('it-IT')
        .includes(query)
    })
  }, [search, visits])
  const visibleVisits = filteredVisits.slice(0, visibleCount)
  const hasMoreVisits = visibleCount < filteredVisits.length

  const onSearchChange = useCallback((value: string) => {
    setSearch(value)
    setVisibleCount(BATCH_SIZE)
  }, [])

  const loadMoreVisits = useCallback(() => {
    setVisibleCount((current) => Math.min(current + BATCH_SIZE, filteredVisits.length))
  }, [filteredVisits.length])

  return (
    <>
      <SearchBar
        value={search}
        onChange={onSearchChange}
        label="Cerca nello storico"
        placeholder="Cerca per pizzeria, citta o data"
        resultCount={filteredVisits.length}
        totalCount={visits.length}
      />

      {filteredVisits.length === 0 && (
        <p className="page-subtitle">
          {search.trim() ? 'Nessun evento corrisponde alla ricerca.' : 'Nessun evento concluso disponibile.'}
        </p>
      )}

      {filteredVisits.length > 0 && (
        <>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {visibleVisits.map((visit) => (
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
                  {visit.pizzerias?.city ?? '-'} · {getVisitDateLabel(visit)}
                </div>
                <div className="pb-4" />
                <ButtonLink href={`/eventi/${visit.id}`} variant="secondary" className="mt-auto px-3 py-1.5 text-xs" icon={<FiArrowUpRight className="h-3.5 w-3.5" />}>
                  Apri evento
                </ButtonLink>
              </article>
            ))}
          </div>
          <ScrollPagination key={search} hasMore={hasMoreVisits} onLoadMore={loadMoreVisits} />
        </>
      )}
    </>
  )
}
