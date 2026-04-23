import { NextResponse } from 'next/server'

function isValidPhotoName(photoName: string) {
  return photoName.startsWith('places/') && photoName.includes('/photos/')
}

function encodePathPreservingSlashes(value: string) {
  return value
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/')
}

export async function GET(request: Request) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'Missing GOOGLE_MAPS_API_KEY' }, { status: 500 })
  }

  const { searchParams } = new URL(request.url)
  const photoName = searchParams.get('name')?.trim() ?? ''
  const widthRaw = Number(searchParams.get('w') ?? '480')
  const maxWidthPx = Number.isFinite(widthRaw) ? Math.max(120, Math.min(1200, Math.floor(widthRaw))) : 480

  if (!photoName || !isValidPhotoName(photoName)) {
    return NextResponse.json({ error: 'Invalid photo name' }, { status: 400 })
  }

  const encodedPhotoPath = encodePathPreservingSlashes(photoName)
  const endpoint = `https://places.googleapis.com/v1/${encodedPhotoPath}/media?maxWidthPx=${maxWidthPx}&key=${apiKey}`

  const upstream = await fetch(endpoint, {
    method: 'GET',
    cache: 'no-store',
  })

  if (!upstream.ok || !upstream.body) {
    const errorText = await upstream.text()
    return NextResponse.json({ error: errorText || 'Google photo request failed' }, { status: 502 })
  }

  return new NextResponse(upstream.body, {
    status: 200,
    headers: {
      'Content-Type': upstream.headers.get('content-type') ?? 'image/jpeg',
      'Cache-Control': 'public, max-age=86400',
    },
  })
}
