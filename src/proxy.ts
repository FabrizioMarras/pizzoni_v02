import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
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

  const { pathname } = request.nextUrl
  const isAuthRoute = pathname.startsWith('/auth/') || pathname === '/accedi' || pathname === '/login'

  if (!user && !isAuthRoute) {
    return NextResponse.redirect(new URL('/accedi', request.url))
  }

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_member')
      .eq('id', user.id)
      .maybeSingle<{ is_member: boolean }>()

    if (!profile?.is_member && !isAuthRoute) {
      return NextResponse.redirect(new URL('/auth/auth-code-error?error_code=not_invited', request.url))
    }

    if (profile?.is_member && (pathname === '/accedi' || pathname === '/login')) {
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
