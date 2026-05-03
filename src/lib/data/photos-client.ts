import type { SupabaseClient } from '@supabase/supabase-js'

export interface VisitPhoto {
  id: string
  url: string
  is_pizza_of_night: boolean
  uploaded_by: string
}

type SB = SupabaseClient

export async function fetchVisitPhotos(supabase: SB, visitId: string) {
  return supabase
    .from('photos')
    .select('id, url, is_pizza_of_night, uploaded_by')
    .eq('visit_id', visitId)
    .order('created_at', { ascending: false })
}

export async function insertVisitPhoto(supabase: SB, payload: { visit_id: string; url: string; uploaded_by: string }) {
  return supabase
    .from('photos')
    .insert({
      ...payload,
      is_pizza_of_night: false,
    })
    .select('id')
    .single<{ id: string }>()
}

export async function setVisitPhotoAsFeatured(supabase: SB, visitId: string, photoId: string) {
  return supabase.rpc('set_pizza_of_night', {
    p_visit_id: visitId,
    p_photo_id: photoId,
  })
}

export async function deleteVisitPhoto(supabase: SB, photoId: string) {
  return supabase.from('photos').delete().eq('id', photoId)
}

export async function updateVisitPhotoUrl(supabase: SB, photoId: string, nextUrl: string) {
  return supabase.from('photos').update({ url: nextUrl }).eq('id', photoId)
}
