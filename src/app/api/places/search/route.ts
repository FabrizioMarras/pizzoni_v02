import { NextResponse } from 'next/server'

interface SearchRequestBody {
  query?: string
  latitude?: number
  longitude?: number
}

interface AddressComponent {
  longText?: string
  shortText?: string
  types?: string[]
}

interface GooglePlace {
  id?: string
  formattedAddress?: string
  displayName?: { text?: string }
  addressComponents?: AddressComponent[]
}

function extractCity(place: GooglePlace): string {
  const components = place.addressComponents ?? []
  const cityComponent = components.find((component) => component.types?.includes('locality'))
  if (cityComponent?.longText) return cityComponent.longText

  const adminComponent = components.find((component) => component.types?.includes('administrative_area_level_3'))
  if (adminComponent?.longText) return adminComponent.longText

  const formatted = place.formattedAddress ?? ''
  const chunks = formatted
    .split(',')
    .map((chunk) => chunk.trim())
    .filter(Boolean)

  if (chunks.length >= 2) {
    return chunks[chunks.length - 2]
  }

  return 'Citta non specificata'
}

export async function POST(request: Request) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'Missing GOOGLE_MAPS_API_KEY' }, { status: 500 })
  }

  const body = (await request.json()) as SearchRequestBody
  const query = body.query?.trim()

  if (!query) {
    return NextResponse.json({ error: 'Missing query' }, { status: 400 })
  }

  const payload: Record<string, unknown> = {
    textQuery: query,
    languageCode: 'it',
    maxResultCount: 8,
  }

  if (typeof body.latitude === 'number' && typeof body.longitude === 'number') {
    payload.locationBias = {
      circle: {
        center: {
          latitude: body.latitude,
          longitude: body.longitude,
        },
        radius: 10000.0,
      },
    }
  }

  const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.addressComponents',
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const errorText = await response.text()
    return NextResponse.json({ error: errorText || 'Google Places request failed' }, { status: 502 })
  }

  const result = (await response.json()) as { places?: GooglePlace[] }
  const places = (result.places ?? []).map((place) => ({
    id: place.id ?? '',
    name: place.displayName?.text ?? 'Senza nome',
    address: place.formattedAddress ?? '',
    city: extractCity(place),
  }))

  return NextResponse.json({ places })
}
