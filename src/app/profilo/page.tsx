import Nav from '@/components/Nav'
import InviteManager from '@/components/InviteManager'
import ProfileEditor from '@/components/ProfileEditor'
import { getCurrentUserProfile } from '@/lib/auth'
import { createSupabaseServerClient } from '@/lib/supabase-server'

interface InviteRow {
  id: string
  email: string
  accepted_at: string | null
}

export default async function ProfilePage() {
  const { user, profile } = await getCurrentUserProfile()

  if (!user || !profile) {
    return (
      <div className="app-shell">
        <Nav />
        <main className="page-wrap">
          <div className="glass-card p-6 text-[var(--ink-soft)]">Impossibile caricare il profilo.</div>
        </main>
      </div>
    )
  }

  let initialInvites: InviteRow[] = []
  if (profile.is_admin) {
    const supabase = await createSupabaseServerClient()
    const { data } = await supabase
      .from('invites')
      .select('id, email, accepted_at')
      .order('created_at', { ascending: false })
      .returns<InviteRow[]>()
    initialInvites = data ?? []
  }

  return (
    <div className="app-shell">
      <Nav />
      <main className="page-wrap space-y-6">
        <h1 className="page-title">Profilo</h1>
        <ProfileEditor name={profile.name ?? ''} avatarUrl={profile.avatar_url ?? ''} />
        {profile.is_admin && <InviteManager initialInvites={initialInvites} />}
      </main>
    </div>
  )
}
