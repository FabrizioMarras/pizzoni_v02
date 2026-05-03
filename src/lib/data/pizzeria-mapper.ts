import type { Pizzeria, PizzeriaRow } from '@/lib/types/pizzeria'

interface MapOptions {
  visitMode?: 'all' | 'past'
  now?: number
}

export function mapRowsToPizzerias(rows: PizzeriaRow[], options: MapOptions = {}): Pizzeria[] {
  const { visitMode = 'all', now = Date.now() } = options

  return rows.map((row) => {
    const scopedVisits =
      visitMode === 'past'
        ? (row.visits ?? []).filter((visit) => {
            const visitTimestamp = visit.scheduled_at ? new Date(visit.scheduled_at).getTime() : new Date(`${visit.date}T23:59:59`).getTime()
            return visitTimestamp <= now
          })
        : (row.visits ?? [])

    const count = scopedVisits.length

    const latestPhotoOfNight = (row.visits ?? [])
      .flatMap((visit) => (visit.photos ?? []).filter((photo) => photo.is_pizza_of_night))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]

    return {
      id: row.id,
      name: row.name,
      location: row.location,
      city: row.city,
      google_maps_uri: row.google_maps_uri,
      google_photo_name: row.google_photo_name,
      custom_image_url: row.custom_image_url,
      latest_event_photo_url: latestPhotoOfNight?.url ?? null,
      visited: count > 0,
      visitsCount: count,
    }
  })
}
