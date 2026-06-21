import { ImageResponse } from 'next/og'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import { firstOrNull } from '@/lib/supabase-relations'

interface OgPizzeria {
  name: string
  location: string
  city: string
  google_photo_name: string | null
  custom_image_url: string | null
}

interface OgPhoto {
  url: string
  is_pizza_of_night: boolean
}

interface OgVisit {
  date: string
  scheduled_at: string | null
  pizzerias: OgPizzeria | OgPizzeria[]
  photos: OgPhoto[] | null
}

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

function encodePathPreservingSlashes(value: string) {
  return value.split('/').map(encodeURIComponent).join('/')
}

function formatOgDate(scheduledAt: string | null, date: string): string {
  const tz = 'Europe/Amsterdam'
  if (scheduledAt) {
    const d = new Date(scheduledAt)
    const datePart = new Intl.DateTimeFormat('it-IT', { timeZone: tz, day: 'numeric', month: 'long', year: 'numeric' }).format(d)
    const timePart = new Intl.DateTimeFormat('it-IT', { timeZone: tz, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(d)
    return `${datePart} · ${timePart}`
  }
  return new Intl.DateTimeFormat('it-IT', { timeZone: tz, day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(`${date}T12:00:00Z`))
}

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  let pizzeriaName = 'Pizzoni'
  let pizzeriaCity = ''
  let pizzeriaLocation = ''
  let imageUrl: string | null = null
  let dateLabel = ''

  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const adminSupabase = createSupabaseAdminClient()
    const { data: visit } = await adminSupabase
      .from('visits')
      .select('date, scheduled_at, pizzerias(name, location, city, google_photo_name, custom_image_url), photos(url, is_pizza_of_night)')
      .eq('id', id)
      .maybeSingle<OgVisit>()

    if (visit) {
      const pizzeria = firstOrNull(visit.pizzerias)
      pizzeriaName = pizzeria?.name ?? 'Pizzoni'
      pizzeriaCity = pizzeria?.city ?? ''
      pizzeriaLocation = pizzeria?.location ?? ''
      dateLabel = formatOgDate(visit.scheduled_at, visit.date)

      const photos = visit.photos ?? []
      const photoOfNight = photos.find((p) => p.is_pizza_of_night)?.url ?? null
      const googlePhotoName = pizzeria?.google_photo_name ?? null
      const customImageUrl = pizzeria?.custom_image_url ?? null

      if (photoOfNight) {
        imageUrl = photoOfNight
      } else if (googlePhotoName && process.env.GOOGLE_MAPS_API_KEY) {
        imageUrl = `https://places.googleapis.com/v1/${encodePathPreservingSlashes(googlePhotoName)}/media?maxWidthPx=1200&key=${process.env.GOOGLE_MAPS_API_KEY}`
      } else if (customImageUrl) {
        imageUrl = customImageUrl
      }
    }
  }

  const locationLine = [pizzeriaCity, pizzeriaLocation].filter(Boolean).join(' · ')

  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          display: 'flex',
          position: 'relative',
          backgroundColor: '#2B1F1A',
          fontFamily: 'sans-serif',
        }}
      >
        {imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt=""
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              opacity: 0.65,
            }}
          />
        )}

        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'linear-gradient(to bottom, rgba(43,31,26,0.05) 0%, rgba(43,31,26,0.65) 45%, rgba(43,31,26,0.97) 100%)',
          }}
        />

        <div
          style={{
            position: 'absolute',
            top: 40,
            left: 52,
            display: 'flex',
            color: 'rgba(255,255,255,0.92)',
            fontSize: 19,
            fontWeight: 700,
            letterSpacing: '0.14em',
            backgroundColor: 'rgba(43,31,26,0.55)',
            padding: '6px 18px',
            borderRadius: 24,
          }}
        >
          PIZZONI
        </div>

        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            padding: '0 52px 48px',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          <div style={{ fontSize: 58, fontWeight: 800, color: 'white', lineHeight: 1.1 }}>
            {pizzeriaName}
          </div>

          {dateLabel && (
            <div style={{ fontSize: 28, fontWeight: 500, color: 'rgba(255,237,210,0.92)' }}>
              {dateLabel}
            </div>
          )}

          {locationLine && (
            <div style={{ fontSize: 22, fontWeight: 400, color: 'rgba(255,255,255,0.52)' }}>
              {locationLine}
            </div>
          )}
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  )
}
