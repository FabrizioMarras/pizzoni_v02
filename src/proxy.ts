import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { getProfileMembershipFlags } from '@/lib/profile-flags'

const CRAWLER_UA = /WhatsApp|Telegram|facebookexternalhit|Twitterbot|Slackbot|LinkedInBot|Discordbot/i

// PWA assets: must be reachable pre-login so the manifest, icons, and service
// worker resolve correctly while a visitor is still sitting on /accedi — none
// of these expose any user data.
const PWA_PATHS = new Set(['/manifest.webmanifest', '/icon', '/apple-icon', '/icon-192', '/icon-512', '/sw.js', '/offline'])

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // OG image routes and known social crawlers bypass auth so link previews work.
  // The image route returns only a PNG; the page HTML exposes only OG meta tags
  // (generated via the admin client) — page content is still RLS-protected.
  if (pathname.endsWith('/opengraph-image')) return NextResponse.next({ request })
  const ua = request.headers.get('user-agent') ?? ''
  if (CRAWLER_UA.test(ua)) return NextResponse.next({ request })

  // Called by Vercel Cron (never an authenticated browser session); protected
  // by its own CRON_SECRET check inside the route, not by login.
  if (pathname === '/api/keepalive') return NextResponse.next({ request })

  if (PWA_PATHS.has(pathname)) return NextResponse.next({ request })

  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isAuthRoute = pathname.startsWith('/auth/') || pathname === '/accedi'

  if (!user && !isAuthRoute) {
    return NextResponse.redirect(new URL('/accedi', request.url))
  }

  if (user) {
    const profile = await getProfileMembershipFlags(supabase, user.id)

    if (!profile.isMember && !isAuthRoute) {
      return NextResponse.redirect(new URL('/auth/auth-code-error?error_code=not_invited', request.url))
    }

    if (profile.isMember && pathname === '/accedi') {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
