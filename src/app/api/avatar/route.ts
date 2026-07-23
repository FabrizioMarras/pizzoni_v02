import { NextResponse } from 'next/server'

// Google's avatar CDN sometimes triggers Chrome's Opaque Response Blocking (ORB)
// when hotlinked directly from the browser (cross-origin, no CORS headers on
// some responses). Proxying server-side avoids that entirely.
const ALLOWED_HOSTNAME = /(^|\.)googleusercontent\.com$/

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const rawUrl = searchParams.get('url')?.trim() ?? ''

  let target: URL
  try {
    target = new URL(rawUrl)
  } catch {
    return NextResponse.json({ error: 'Invalid url' }, { status: 400 })
  }

  if (target.protocol !== 'https:' || !ALLOWED_HOSTNAME.test(target.hostname)) {
    return NextResponse.json({ error: 'Host not allowed' }, { status: 400 })
  }

  const upstream = await fetch(target.toString(), { cache: 'no-store' })

  if (!upstream.ok || !upstream.body) {
    return NextResponse.json({ error: 'Upstream fetch failed' }, { status: 502 })
  }

  return new NextResponse(upstream.body, {
    status: 200,
    headers: {
      'Content-Type': upstream.headers.get('content-type') ?? 'image/jpeg',
      'Cache-Control': 'public, max-age=86400',
    },
  })
}
