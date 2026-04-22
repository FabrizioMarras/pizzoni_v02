import Nav from '@/components/Nav'
import InviteManager from '@/components/InviteManager'
import ProfileEditor from '@/components/ProfileEditor'
import { getCurrentUserProfile } from '@/lib/auth'

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

  return (
    <div className="app-shell">
      <Nav />
      <main className="page-wrap space-y-6">
        <h1 className="page-title">Profilo</h1>
        <ProfileEditor name={profile.name ?? ''} avatarUrl={profile.avatar_url ?? ''} pizzaEmoji={profile.pizza_emoji ?? ''} />
        {profile.is_admin && <InviteManager />}
      </main>
    </div>
  )
}
