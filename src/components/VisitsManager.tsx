'use client'
/* eslint-disable react-hooks/set-state-in-effect */

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { FiArrowUpRight } from 'react-icons/fi'
import { supabase } from '@/lib/supabase'

interface Visit {
  id: string
  date: string
  scheduled_at: string | null
  notes: string | null
  pizzerias: {
    name: string
    city: string
    google_photo_name: string | null
  } | null
}

export default function VisitsManager() {
  const [visits, setVisits] = useState<Visit[]>([])

  const getVisitTimestamp = (visit: Pick<Visit, 'date' | 'scheduled_at'>) => {
    if (visit.scheduled_at) return new Date(visit.scheduled_at).getTime()
    return new Date(`${visit.date}T23:59:59`).getTime()
  }

  const loadData = async () => {
    const { data: visitsData } = await supabase
      .from('visits')
      .select('id, date, scheduled_at, notes, pizzerias(name, city, google_photo_name)')
      .order('date', { ascending: false })

    const now = Date.now()
    const doneVisits = ((visitsData as Visit[] | null) ?? [])
      .filter((visit) => getVisitTimestamp(visit) <= now)
      .sort((a, b) => getVisitTimestamp(b) - getVisitTimestamp(a))

    setVisits(doneVisits)
  }

  useEffect(() => {
    void loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="space-y-6">
      <section className="glass-card space-y-3 p-6">
        <h2 className="text-3xl">Storico Eventi</h2>
        {visits.length === 0 && <p className="page-subtitle">Nessun evento concluso disponibile.</p>}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {visits.map((visit) => (
            <article key={visit.id} className="surface-card flex h-full flex-col px-3 py-3">
              {visit.pizzerias?.google_photo_name && (
                <div className="mb-3 overflow-hidden rounded-2xl border border-[var(--paper-border)]">
                  <Image
                    src={`/api/places/photo?name=${encodeURIComponent(visit.pizzerias.google_photo_name)}&w=900`}
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
                  ? new Date(visit.scheduled_at).toLocaleString('it-IT', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      timeZone: 'Europe/Amsterdam',
                    })
                  : visit.date}
              </div>
              {visit.notes && <p className="mt-1 pb-4 text-sm text-[var(--ink)]">{visit.notes}</p>}
              <Link href={`/eventi/${visit.id}`} className="btn-secondary mt-auto inline-flex items-center gap-1.5 px-3 py-1.5 text-xs">
                <FiArrowUpRight className="h-3.5 w-3.5" />
                Apri evento
              </Link>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}
