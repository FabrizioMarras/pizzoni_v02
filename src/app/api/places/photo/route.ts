import { NextResponse } from 'next/server'
import { getPizzeriaPlaceholder } from '@/lib/pizzeria-image'

function isValidPhotoName(photoName: string) {
  return photoName.startsWith('places/') && photoName.includes('/photos/')
}

function encodePathPreservingSlashes(value: string) {
  return value
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/')
}

function placeIdFromPhotoName(photoName: string): string | null {
  const match = photoName.match(/^places\/([^/]+)\/photos\//)
  return match ? match[1] : null
}

function buildMediaEndpoint(photoName: string, maxWidthPx: number, apiKey: string) {
  return `https://places.googleapis.com/v1/${encodePathPreservingSlashes(photoName)}/media?maxWidthPx=${maxWidthPx}&key=${apiKey}`
}

// Google Places photo resource names expire, so a stored name can become invalid.
// When that happens we re-resolve a current photo name from the place itself.
async function resolveFreshPhotoName(placeId: string, apiKey: string): Promise<string | null> {
  const response = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`, {
    method: 'GET',
    headers: {
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': 'photos',
    },
    cache: 'no-store',
  })

  if (!response.ok) return null

  const data = (await response.json()) as { photos?: Array<{ name?: string }> }
  return data.photos?.[0]?.name ?? null
}

export async function GET(request: Request) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'Missing GOOGLE_MAPS_API_KEY' }, { status: 500 })
  }

  const { searchParams } = new URL(request.url)
  const rawPhotoName = searchParams.get('name')?.trim() ?? ''
  const photoName = rawPhotoName.replace(/^\/+/, '')
  const widthRaw = Number(searchParams.get('w') ?? '480')
  const maxWidthPx = Number.isFinite(widthRaw) ? Math.max(120, Math.min(1200, Math.floor(widthRaw))) : 480

  if (!photoName || !isValidPhotoName(photoName)) {
    return NextResponse.json({ error: 'Invalid photo name' }, { status: 400 })
  }

  let upstream = await fetch(buildMediaEndpoint(photoName, maxWidthPx, apiKey), {
    method: 'GET',
    cache: 'no-store',
  })

  // Self-heal: if the stored photo name has expired, fetch a fresh one for the same place.
  if (!upstream.ok || !upstream.body) {
    const placeId = placeIdFromPhotoName(photoName)
    if (placeId) {
      const freshPhotoName = await resolveFreshPhotoName(placeId, apiKey)
      if (freshPhotoName) {
        upstream = await fetch(buildMediaEndpoint(freshPhotoName, maxWidthPx, apiKey), {
          method: 'GET',
          cache: 'no-store',
        })
      }
    }
  }

  // Still no image: fall back to a placeholder instead of surfacing a 502 / broken image.
  if (!upstream.ok || !upstream.body) {
    return NextResponse.redirect(new URL(getPizzeriaPlaceholder(photoName), request.url), 302)
  }

  return new NextResponse(upstream.body, {
    status: 200,
    headers: {
      'Content-Type': upstream.headers.get('content-type') ?? 'image/jpeg',
      'Cache-Control': 'public, max-age=86400',
    },
  })
}
