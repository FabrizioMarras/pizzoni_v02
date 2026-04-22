import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'

function formatDateForIcs(value: string | Date) {
  const date = typeof value === 'string' ? new Date(value) : value
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'ID mancante' }, { status: 400 })
  }

  const supabase = await createSupabaseServerClient()
  const { data: visit } = await supabase
    .from('visits')
    .select('id, date, pizzerias(name, location, city)')
    .eq('id', id)
    .maybeSingle<{
      id: string
      date: string
      pizzerias:
        | {
            name: string
            location: string
            city: string
          }
        | {
            name: string
            location: string
            city: string
          }[]
    }>()

  if (!visit) {
    return NextResponse.json({ error: 'Visita non trovata' }, { status: 404 })
  }

  const pizzeria = Array.isArray(visit.pizzerias) ? visit.pizzerias[0] : visit.pizzerias
  if (!pizzeria) {
    return NextResponse.json({ error: 'Pizzeria non trovata per questa visita' }, { status: 404 })
  }

  const start = new Date(`${visit.date}T00:00:00Z`)
  const end = new Date(`${visit.date}T00:00:00Z`)
  end.setUTCDate(end.getUTCDate() + 1)

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Pizzoni//Agenda//IT',
    'BEGIN:VEVENT',
    `UID:${visit.id}@pizzoni`,
    `DTSTAMP:${formatDateForIcs(new Date())}`,
    `DTSTART;VALUE=DATE:${start.toISOString().slice(0, 10).replace(/-/g, '')}`,
    `DTEND;VALUE=DATE:${end.toISOString().slice(0, 10).replace(/-/g, '')}`,
    `SUMMARY:Visita Pizzoni - ${pizzeria.name}`,
    `LOCATION:${pizzeria.location}, ${pizzeria.city}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')

  return new NextResponse(ics, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="pizzoni-${visit.id}.ics"`,
    },
  })
}
