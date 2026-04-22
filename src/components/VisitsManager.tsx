'use client'
/* eslint-disable react-hooks/set-state-in-effect */

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface Visit {
  id: string
  date: string
  notes: string | null
  pizzerias: {
    name: string
    city: string
  } | null
}

export default function VisitsManager() {
  const [visits, setVisits] = useState<Visit[]>([])

  const loadData = async () => {
    const { data: visitsData } = await supabase
      .from('visits')
      .select('id, date, notes, pizzerias(name, city)')
      .order('date', { ascending: false })

    setVisits((visitsData as Visit[] | null) ?? [])
  }

  useEffect(() => {
    void loadData()
  }, [])

  return (
    <div className="space-y-6">
      <section className="glass-card space-y-3 p-6">
        <h2 className="text-3xl">Lista Eventi</h2>
        {visits.length === 0 && <p className="page-subtitle">Nessun evento disponibile.</p>}
        {visits.map((visit) => (
          <article key={visit.id} className="surface-card px-3 py-3">
            <div className="text-lg font-semibold text-[var(--ink)]">{visit.pizzerias?.name ?? 'Pizzeria sconosciuta'}</div>
            <div className="text-sm text-[var(--ink-soft)]">{visit.pizzerias?.city ?? '-'} · {visit.date}</div>
            {visit.notes && <p className="mt-1 text-sm text-[var(--ink)]">{visit.notes}</p>}
            <Link href={`/eventi/${visit.id}`} className="btn-secondary mt-2 inline-block px-3 py-1.5 text-xs">
              Apri evento
            </Link>
          </article>
        ))}
      </section>
    </div>
  )
}
