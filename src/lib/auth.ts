import { createSupabaseServerClient } from '@/lib/supabase-server'

export interface Profile {
  id: string
  email: string | null
  name: string | null
  avatar_url: string | null
  pizza_emoji: string | null
  is_admin: boolean
  is_member: boolean
}

export async function getCurrentUserProfile() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { user: null, profile: null }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, email, name, avatar_url, pizza_emoji, is_admin, is_member')
    .eq('id', user.id)
    .maybeSingle<Profile>()

  return { user, profile: profile ?? null }
}
