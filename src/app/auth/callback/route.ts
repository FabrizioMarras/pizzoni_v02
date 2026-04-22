import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'

function normalizeNextPath(nextParam: string | null): string {
  if (!nextParam || !nextParam.startsWith('/') || nextParam.startsWith('//')) {
    return '/'
  }

  return nextParam
}

function redirectBaseUrl(request: Request, origin: string): string {
  const forwardedHost = request.headers.get('x-forwarded-host')
  const isLocalEnv = process.env.NODE_ENV === 'development'

  if (!isLocalEnv && forwardedHost) {
    return `https://${forwardedHost}`
  }

  return origin
}

function toAuthErrorUrl(origin: string, code: string, description?: string) {
  const params = new URLSearchParams({ error_code: code })
  if (description) {
    params.set('error_description', description)
  }

  return `${origin}/auth/auth-code-error?${params.toString()}`
}

async function finalizeInviteOnlySignIn(nextPath: string, request: Request, origin: string) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user?.email) {
    await supabase.auth.signOut()
    return NextResponse.redirect(toAuthErrorUrl(origin, 'invalid_user'))
  }

  const normalizedEmail = user.email.toLowerCase()
  const now = new Date().toISOString()

  const { data: ownProfile } = await supabase
    .from('profiles')
    .select('id, is_member')
    .eq('id', user.id)
    .maybeSingle<{ id: string; is_member: boolean }>()

  const { data: invite } = await supabase
    .from('invites')
    .select('id, email, accepted_at')
    .ilike('email', normalizedEmail)
    .maybeSingle<{ id: string; email: string; accepted_at: string | null }>()

  if (!invite) {
    if (ownProfile?.is_member) {
      return NextResponse.redirect(`${redirectBaseUrl(request, origin)}${nextPath}`)
    }

    const { count: memberCount } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('is_member', true)

    if ((memberCount ?? 0) === 0) {
      await supabase
        .from('profiles')
        .update({
          email: normalizedEmail,
          is_member: true,
          is_admin: true,
          updated_at: now,
        })
        .eq('id', user.id)

      await supabase.from('invites').upsert(
        {
          email: normalizedEmail,
          accepted_at: now,
          invited_by: user.id,
        },
        {
          onConflict: 'email',
        }
      )

      return NextResponse.redirect(`${redirectBaseUrl(request, origin)}${nextPath}`)
    }

    await supabase.auth.signOut()
    return NextResponse.redirect(toAuthErrorUrl(origin, 'not_invited'))
  }

  await supabase
    .from('profiles')
    .update({
      email: normalizedEmail,
      is_member: true,
      updated_at: now,
    })
    .eq('id', user.id)

  if (!invite.accepted_at) {
    await supabase.from('invites').update({ accepted_at: now }).eq('id', invite.id)
  }

  return NextResponse.redirect(`${redirectBaseUrl(request, origin)}${nextPath}`)
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const nextPath = normalizeNextPath(searchParams.get('next'))

  const supabase = await createSupabaseServerClient()

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return finalizeInviteOnlySignIn(nextPath, request, origin)
    }

    return NextResponse.redirect(toAuthErrorUrl(origin, 'oauth_exchange_failed', error.message))
  }

  return NextResponse.redirect(toAuthErrorUrl(origin, 'invalid_callback_params'))
}
