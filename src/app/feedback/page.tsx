import Nav from '@/components/Nav'
import FeedbackBoard from '@/components/FeedbackBoard'
import { fetchFeedback } from '@/lib/data/feedback-client'
import { getCurrentUserProfile } from '@/lib/auth'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export default async function FeedbackPage() {
  const { user, profile } = await getCurrentUserProfile()

  if (!user || !profile) {
    return (
      <div className="app-shell">
        <Nav />
        <main className="page-wrap">
          <div className="glass-card p-6 text-[var(--ink-soft)]">Impossibile caricare i feedback.</div>
        </main>
      </div>
    )
  }

  const supabase = await createSupabaseServerClient()
  const initialFeedback = await fetchFeedback(supabase)

  return (
    <div className="app-shell">
      <Nav />
      <main className="page-wrap space-y-6">
        <h1 className="page-title">Feedback</h1>
        <FeedbackBoard initialFeedback={initialFeedback} userId={user.id} isAdmin={profile.is_admin} />
      </main>
    </div>
  )
}
