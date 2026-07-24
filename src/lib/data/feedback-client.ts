import type { SupabaseClient } from '@supabase/supabase-js'

export type FeedbackPriority = 'high' | 'mid' | 'low'

export interface Feedback {
  id: string
  author_id: string
  content: string
  is_done: boolean
  priority: FeedbackPriority | null
  created_at: string
  updated_at: string
  author: {
    name: string | null
    avatar_url: string | null
    pizza_emoji: string | null
  } | null
}

const FEEDBACK_SELECT = 'id, author_id, content, is_done, priority, created_at, updated_at, author:profiles(name, avatar_url, pizza_emoji)'

type SB = SupabaseClient

export async function fetchFeedback(supabase: SB) {
  const { data } = await supabase
    .from('feedback')
    .select(FEEDBACK_SELECT)
    .order('created_at', { ascending: false })
    .returns<Feedback[]>()

  return data ?? []
}

export async function createFeedback(supabase: SB, authorId: string, content: string) {
  return supabase.from('feedback').insert({ author_id: authorId, content }).select(FEEDBACK_SELECT).single<Feedback>()
}

export async function updateFeedbackContent(supabase: SB, id: string, content: string) {
  return supabase.rpc('update_feedback_content', { p_feedback_id: id, p_content: content })
}

export async function updateFeedbackStatus(supabase: SB, id: string, isDone: boolean, priority: FeedbackPriority | null) {
  return supabase.rpc('update_feedback_status', { p_feedback_id: id, p_is_done: isDone, p_priority: priority })
}

export async function deleteFeedback(supabase: SB, id: string) {
  return supabase.from('feedback').delete().eq('id', id)
}

export async function deleteFeedbackMany(supabase: SB, ids: string[]) {
  return supabase.from('feedback').delete().in('id', ids)
}

export async function deleteAllFeedback(supabase: SB) {
  return supabase.from('feedback').delete().not('id', 'is', null)
}
