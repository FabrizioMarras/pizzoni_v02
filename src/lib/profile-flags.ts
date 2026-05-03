import type { SupabaseClient } from '@supabase/supabase-js'

export async function getProfileMembershipFlags(supabase: SupabaseClient, userId: string) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin, is_member')
    .eq('id', userId)
    .maybeSingle<{ is_admin: boolean; is_member: boolean }>()

  return {
    isAdmin: Boolean(profile?.is_admin),
    isMember: Boolean(profile?.is_member),
  }
}
